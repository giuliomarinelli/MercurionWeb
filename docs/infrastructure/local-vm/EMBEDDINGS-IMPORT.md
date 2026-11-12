# Importare i chunk degli embedding nella preview

Procedura Windows → VM, senza AI, dopo l'
[adozione shared/preview](SERVICE-UPGRADE.md). Non eseguire i dump contro il
container PostgreSQL di rollback. Il programma identifica la generazione attiva
dal manifest verificato della release, senza nomi container copiati a memoria.

## Dataset verificato il 12 novembre 2026

| Proprietà | Valore effettivo |
| --- | --- |
| Directory owner | `MercurionWebNode/sql/bootstrap/embeddings/molecule_embeddings_dump_chunks` |
| File | 50, `molecule_embeddings-000.sql` … `molecule_embeddings-049.sql` |
| Dimensione | 25.523.353.951 byte |
| Righe | **2.644.421** |
| Vettore | **768** dimensioni |
| Modello | `seyonec/ChemBERTa-zinc-base-v1` |
| Formato | `COPY public.molecule_embeddings (...) FROM stdin`, una transazione per file |
| Colonne | stable_uuid, molregno, smiles, embedding, embedding_model, updated_at, preferred_name |

Ogni file è stato letto integralmente: checksum SHA-256, conteggio e struttura
verificati, senza stampare righe. Il dump non contiene DDL o indici; non è
necessario concatenarlo in un altro file di 25 GB. I dati `.sql` dei chunk
rimangono ignorati da Git, fuori dagli artifact di CI.

Il bootstrap iniziale aveva una tabella incompleta: mancava `preferred_name`,
già usata dalle query, e il tipo vector non dichiarava dimensioni. L'entity
e il DDL sono ora allineati al dump. Il DDL corregge soltanto la tabella vuota;
non converte silenziosamente una tabella popolata con un contratto differente.
L'applicazione ha `synchronize=false`: nessuna migrazione automatica al boot.

## 1. Manifest del dump

PowerShell ordinaria, root Web. Per una riproduzione scegliere un output nuovo:

```powershell
$taskDump = 'MercurionWebNode/sql/bootstrap/embeddings/molecule_embeddings_dump_chunks'
$taskManifest = Join-Path $env:USERPROFILE '.mercurion/artifacts/embedding-dump-manifest.json'
python -B scripts/infrastructure/embedding_dump_inventory.py --source $taskDump --output $taskManifest
if ($LASTEXITCODE -ne 0) { throw 'Dump non valido: nessun import autorizzato.' }
```

Il manifest della prima esecuzione è già disponibile in
`C:/Users/giuli/.codex/artifacts/inf-vm-04/vm048-embeddings/dump-manifest.json`.
Non ripetere l'inventario a ogni avvio: riusare il manifest se i file sono
immutati. Il caricatore confronta nuovamente il checksum prima del COMMIT.

## 2. Preparare il bundle del caricatore

Usare la ricevuta positiva della generazione attiva:

```powershell
$taskManifest = 'C:/Users/giuli/.codex/artifacts/inf-vm-04/vm048-embeddings/dump-manifest.json'
$taskUpgrade = 'C:/Users/giuli/.codex/artifacts/inf-vm-04/vm047-adoption/ready'
$taskImport = Join-Path $env:USERPROFILE ('.mercurion/artifacts/embeddings-' + [Guid]::NewGuid().ToString('N'))
python -B scripts/infrastructure/preview_embedding_import.py prepare --manifest $taskManifest --upgrade $taskUpgrade --output $taskImport
if ($LASTEXITCODE -ne 0) { throw 'Preparazione import fallita.' }
```

Il bundle contiene solo manifest, DDL e codice; non copia i 25 GB. Richiede
`upgrade-result.json` positivo e lega l'import al serverRunId e upgradeId
effettivi. Non legge credenziali Windows, dotenv o chiavi RSA. Conservare il
percorso `$taskImport`: servirà per stato, ripresa e indice.

## 3. Trasferire e iniziare il carico dati

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewEmbeddingImport.ps1 -BundlePath $taskImport -Execute
if ($LASTEXITCODE -ne 0) { throw 'Conservare runId e output; non cancellare tabella o journal.' }
```

Passphrase SSH e sudo sono inserite soltanto nel terminale. SCP usa lo stesso
canale host → guest già autorizzato, senza servizi SFTP aggiuntivi o nuove porte.
I chunk sono caricati sotto `~/.mercurion-embeddings/<runId>/chunks`, con
directory owner 0700. I comandi e lo stato sono installati root-owned in
`/opt/mercurion/imports/embeddings-<runId>`.

L'esito iniziale è **`started`**, non `passed`: il worker gira autonomamente
sulla VM e continua anche se termina la connessione SSH. Non mantiene aperta
una sessione interattiva per l'intero import. Esegue i chunk in ordine sul
volume PostgreSQL appena adottato; i container applicativi restano attivi.
Durante il caricamento il dataset è parziale e non va considerato accettato.

Prima del primo carico verifica lo spazio disponibile per dati/WAL/indice,
il database `mercurion_preview`, PostgreSQL 16.16, pgvector 0.8.7, schema,
tabella vuota oppure avanzamento coerente con il journal dello stesso dataset.
Non esegue TRUNCATE, DROP o un secondo bootstrap dell'applicazione.

### Atomicità e ripresa

`10_table.sql` definisce la tabella e `mercurion_ops.embedding_import_chunks`.
Quest'ultima è un registro di import dei dati, non un framework di migrazioni.
Per ogni file il worker invia COPY e marker di completamento nella **stessa
transazione**, con lock dedicato. Invia COMMIT solo dopo aver verificato hash,
numero di righe e trailer del file. Un file modificato o un'interruzione prima
del commit non registra un chunk completato.

Se il processo è interrotto dopo un commit ma prima dell'aggiornamento del
report, il registro SQL è autorevole: alla ripresa quel chunk è saltato.
Righe già presenti senza registro coerente bloccano la procedura. Le transazioni
già completate non vengono eliminate per nascondere un errore successivo.

Per controllare lo stato:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewEmbeddingImport.ps1 -BundlePath $taskImport -Status
```

Il JSON riporta `completedChunks`, `loadedRows`, `expectedRows`, `phase`,
`status` e `workerRunning`. Attesi alla fine: 50 chunk, 2.644.421 righe,
`status=passed`, `phase=data-loaded`, `indexBuilt=false`.

Solo dopo avere esaminato un errore, una ripresa esplicita riusa lo stesso run:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewEmbeddingImport.ps1 -BundlePath $taskImport -Resume -Execute
```

L'upload salta i file guest già corretti per dimensione e SHA-256. Il processo
rifiuta una seconda istanza concorrente; il journal evita ricaricamenti doppi.
Non creare un bundle nuovo per aggirare un import incompleto dello stesso dataset.

## 4. Costruire l'HNSW una sola volta, dopo il carico

**Fermo operativo per il run corrente:** non eseguire ancora `-BuildIndex`.
L'owner ha scelto 14 vCPU e 28 GiB RAM per la VM; prima occorre completare
l'import e adottare il profilo PostgreSQL descritto sotto. Il worker già
consegnato usa ancora i limiti precedenti: il solo resize Hyper-V non li cambia.

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewEmbeddingImport.ps1 -BundlePath $taskImport -BuildIndex -Execute
```

Questa fase esegue separatamente `30_indexes.sql`: indice unico su molregno,
HNSW cosine su vector(768), `m=16`, `ef_construction=64`, ANALYZE. Verifica prima
che tutti i chunk del manifest siano registrati con i loro checksum e conteggi.
Non ricostruisce l'HNSW per ciascun chunk e non assume che un dump SQL conservi
le pagine fisiche dell'indice.

Il worker attualmente consegnato richiede almeno 6 GiB **disponibili** e alza temporaneamente
il limite del solo container PostgreSQL a 10 GiB e 4 CPU, usa una sessione con
`maintenance_work_mem=4GB`, due worker di manutenzione, poi ripristina i limiti
originali nel blocco finale. Non riavvia PostgreSQL e non modifica la configurazione
persistente né le ACL. Se manca memoria, si ferma con un codice esplicito;
qualsiasi aumento della RAM Hyper-V è un intervento separato e non implicito.

### Ridimensionamento concordato: VM 14 vCPU, 28 GiB

Profilo da adottare e collaudare prima dell'indice, **non ancora applicato**:

| Risorsa | Esercizio ordinario PostgreSQL | Costruzione HNSW |
| --- | --- | --- |
| Limite CPU container | 4 CPU | 10 CPU |
| Limite RAM container | 4 GiB | 20 GiB |
| `maintenance_work_mem`, sola sessione di build | valore ordinario invariato | 16 GiB |
| `max_parallel_maintenance_workers`, sola sessione | valore ordinario invariato | 7, oltre al leader |
| Capacità `/dev/shm` container | da predisporre per il build | 18 GiB |

La capacità di `/dev/shm` non è RAM aggiuntiva rispetto ai 20 GiB: il suo uso
concorre al consumo del container. pgvector richiede una shared memory almeno
pari a `maintenance_work_mem` per il build HNSW parallelo; vedere la
[documentazione ufficiale Docker di pgvector](https://github.com/pgvector/pgvector#docker).
I Compose correnti non dichiarano `shm_size`: verificare la capacità effettiva
del container, senza supporre che segua la RAM Hyper-V. Occorre predisporre
questa opzione alla creazione del container; non basta `docker update` di CPU/RAM.

Sequenza obbligata per questo ridimensionamento:

1. Lasciare terminare il worker: attendere `status=passed`, 50 chunk e
   2.644.421 righe. Non spegnere la VM mentre risulta `running`.
2. Arrestare ordinatamente Ubuntu con `sudo shutdown -h now`.
3. A VM spenta, impostare in Hyper-V 14 processori virtuali e 28 GiB di RAM
   effettivamente disponibili; avviare e sbloccare LUKS.
4. Ripristinare i segreti tmpfs con i valori stabili: il riavvio cancella sia
   quelli server sia quelli applicativi. Non ripetere il bootstrap iniziale,
   rigenerare credenziali o inizializzare lo schema.
5. Adottare i nuovi limiti nel Compose e nel container attivo, conservando il
   volume popolato e riconciliando l'identità registrata per il recovery.
   La procedura operativa di questa adozione deve essere completata e collaudata
   prima di eseguirla: non ricreare manualmente il container fuori dai manifest.
6. Verificare risorse effettive, shared memory e disponibilità dei worker;
   avviare l'indice con il caricatore aggiornato. Il bundle dell'import in corso
   resta immutato. Al termine tornare al profilo ordinario **4 CPU / 4 GiB**,
   senza ripristinare il vecchio limite di una CPU.

I valori sono un budget di lavoro, non una garanzia che il grafo completo
rimanga in memoria. Conteggi, validità dell'indice e piano della query restano
le verifiche finali; la misura sul dataset reale determina tempi e consumo.

Per leggere l'avanzamento dell'indice:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewEmbeddingImport.ps1 -BundlePath $taskImport -BuildIndex -Status
```

Il report include, quando disponibile, `pg_stat_progress_create_index` con
fase e tuple elaborate/totali. I tempi dipendono da RAM, disco e CPU: il test
sintetico non è una previsione di durata per 2,6 milioni di vettori.

Successo finale: `status=passed`, `phase=indexed-and-verified`,
`hnswPlanVerified=true`, `resourceLimitsRestored=true`. Il programma verifica
che gli indici siano validi e che EXPLAIN di una query cosine usi l'HNSW.
`90_verify.sql` contiene inoltre i controlli ripetibili di conteggi, dimensioni,
modello e definizioni degli indici. Non contiene scritture.

## 5. Dati e diagnostica

Il dump rimane sulla VM per ripresa; la rimozione successiva è separata e non
automatica. Il report è `<root>/import-result.json` o `index-result.json`;
`private-psql.log` e `*-worker.log` sono root privati e possono contenere
diagnostica COPY: non incollarli integralmente. Gli output di stato non stampano
vettori, SMILES, password o chiavi.

Il completamento del carico embedding non trasferisce i due indici ChEMBL di
Meili e non configura Cloudflare. Quelli restano passi successivi sullo stack
shared/preview già avviato e con volumi persistenti.

## Collaudo prima dell'import reale

```powershell
python -B scripts/infrastructure/test_embedding_import.py
python -B scripts/infrastructure/qa_embedding_import.py --image mercurion-parity-postgres:16.16-source --report (Join-Path $env:USERPROFILE ('.mercurion/artifacts/embedding-qa-' + [Guid]::NewGuid().ToString('N') + '.json')) --execute
```

Il QA reale usa solo un container effimero con tmpfs e dati sintetici, nessuna
porta/volume esistente. Verifica la correzione della vecchia tabella, rollback
su SHA errato, commit dati/journal atomico, rifiuto duplicati, DDL ripetibile e
utilizzo HNSW. Non legge i chunk owner e non modifica la VM.
