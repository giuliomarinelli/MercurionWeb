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

**Prerequisiti:** import `passed`, VM da 14 vCPU / 28 GiB, quattro server
recuperati dopo il riavvio e applicazioni ancora ferme. Il comando aggiornato
consegna un worker HNSW separato, fissato per SHA-256: non modifica il bundle
immutabile del carico dati e non ricarica i chunk.

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewEmbeddingImport.ps1 -BundlePath $taskImport -BuildIndex -Execute
```

Questa fase esegue separatamente `30_indexes.sql`: indice unico su molregno,
HNSW cosine su vector(768), `m=16`, `ef_construction=64`, ANALYZE. Verifica prima
che tutti i chunk del manifest siano registrati con i loro checksum e conteggi.
Non ricostruisce l'HNSW per ciascun chunk e non assume che un dump SQL conservi
le pagine fisiche dell'indice.

Il nuovo worker controlla CPU e RAM effettive, almeno 25 GiB disponibili,
import e journal completi, generazione PostgreSQL attiva e applicazioni ferme.
Quindi crea un container PostgreSQL di sola manutenzione, usando **la stessa
immagine e lo stesso volume dati** dell'istanza ordinaria. Lo avvia soltanto
dopo l'arresto pulito dell'istanza ordinaria e il controllo che il volume non
abbia altri container in esecuzione. Non esegue initdb: avvia direttamente
`postgres` sulla directory esistente.

Il container di manutenzione ha rete `none`, nessuna porta, UID 70, rootfs
read-only e nessuna capability. Usa le credenziali applicative già ricevute,
senza leggerle sull'host Windows. Il processo gira in background; il ritorno
iniziale `started` non significa che l'indice sia già pronto.

### Ridimensionamento concordato: VM 14 vCPU, 28 GiB

Profilo implementato; passaggio fra istanze e gestione dell'errore collaudati
su PostgreSQL locale reale. Il build sul dataset della VM resta da eseguire:

| Risorsa | Esercizio ordinario PostgreSQL | Costruzione HNSW |
| --- | --- | --- |
| Limite CPU container | 4 CPU | 12 CPU |
| Limite RAM container | 4 GiB | 24 GiB |
| `maintenance_work_mem`, sola sessione di build | valore ordinario invariato | 20 GiB |
| `max_parallel_maintenance_workers`, sola sessione | valore ordinario invariato | 11, oltre al leader |
| Capacità `/dev/shm` container | invariata, non usata per questo build | 22 GiB |

La capacità di `/dev/shm` non è RAM aggiuntiva rispetto ai 24 GiB: il suo uso
concorre al consumo del container. pgvector richiede una shared memory almeno
pari a `maintenance_work_mem` per il build HNSW parallelo; vedere la
[documentazione ufficiale Docker di pgvector](https://github.com/pgvector/pgvector#docker).
La shared memory è configurata alla creazione del solo container di manutenzione.
I limiti globali dei worker di questa istanza sono impostati a 12: gli 11 worker
richiesti dalla sessione sono un massimo, non un conteggio garantito. Il Compose
ordinario dichiara 4 CPU / 4 GiB; il build non usa quel profilo.

Sequenza obbligata per questo ridimensionamento:

1. Lasciare terminare il worker: attendere `status=passed`, 50 chunk e
   2.644.421 righe. Non spegnere la VM mentre risulta `running`.
2. Arrestare ordinatamente Ubuntu con `sudo shutdown -h now`.
3. A VM spenta, impostare in Hyper-V 14 processori virtuali e 28 GiB di RAM
   effettivamente disponibili; avviare e sbloccare LUKS.
4. Seguire [COLD-RECOVERY.md](COLD-RECOVERY.md) per ripristinare i quattro
   server e i loro segreti stabili su tmpfs. Lasciare le applicazioni ferme:
   i loro segreti tmpfs vanno ripristinati separatamente dopo il build.
   Non ripetere bootstrap, generazione credenziali o inizializzazione schema.
5. Eseguire `-BuildIndex -Execute` usando lo stesso `$taskImport`. Il wrapper
   installa il worker nuovo; quello del primo import rimane immutato.
6. Controllare lo stato con `-BuildIndex -Status`. Alla fine il worker ferma
   e rimuove il proprio container senza rimuovere volumi, imposta il container
   ordinario a **4 CPU / 4 GiB**, lo riavvia e ricontrolla il conteggio.

L'ID del PostgreSQL ordinario resta lo stesso: non occorre sostituire gli ID
nelle ricevute di recovery. `docker update` conserva il nuovo profilo dopo
successivi stop/start; i bundle storici rimangono immutati e non vanno usati
per ricreare arbitrariamente i container con vecchi limiti.

Se il build fallisce, il blocco finale prova comunque a ripristinare il server
ordinario. Se non può confermare l'arresto della manutenzione o trova un altro
writer, **non avvia l'istanza ordinaria sullo stesso volume**. Conservare report
e container; non forzare avvii o cancellazioni. Risolto il problema, un nuovo
tentativo richiede `-BuildIndex -Resume -Execute`; gli indici validi già creati
sono riutilizzati da `CREATE INDEX IF NOT EXISTS`.

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
python -B scripts/infrastructure/test_embedding_index.py
python -B scripts/infrastructure/qa_embedding_import.py --image mercurion-parity-postgres:16.16-source --report (Join-Path $env:USERPROFILE ('.mercurion/artifacts/embedding-qa-' + [Guid]::NewGuid().ToString('N') + '.json')) --execute
python -B scripts/infrastructure/qa_embedding_index.py --image mercurion-parity-postgres:16.16-source --report (Join-Path $env:USERPROFILE ('.mercurion/artifacts/index-qa-' + [Guid]::NewGuid().ToString('N') + '.json')) --execute
```

Il QA reale usa solo un container effimero con tmpfs e dati sintetici, nessuna
porta/volume esistente. Verifica la correzione della vecchia tabella, rollback
su SHA errato, commit dati/journal atomico, rifiuto duplicati, DDL ripetibile e
utilizzo HNSW. Non legge i chunk owner e non modifica la VM.

Il QA dell'indice usa un volume sintetico separato e due istanze PostgreSQL
in successione. Verifica i limiti effettivi di 12 CPU / 24 GiB e shared memory
22 GiB, il ritorno allo stesso ID ordinario con 4 CPU / 4 GiB, conservazione
delle 2.000 righe e ripristino dopo un errore di build. Per non allocare il
budget della VM sull'host, costruisce l'indice sintetico con 64 MB e due worker:
non dimostra durata o consumo del build reale con 20 GiB e 11 worker.

Per collaudare anche il launcher privilegiato in un filesystem Linux isolato:

```powershell
docker --context desktop-linux run --rm --pull never --network none --read-only --tmpfs /opt --tmpfs /nonexistent --tmpfs /tmp --env EMBEDDING_INDEX_LINUX_FIXTURE=1 --volume "${PWD}:/workspace:ro" --workdir /workspace python:3.11-slim-trixie python -B -m unittest discover -s scripts/infrastructure -p test_embedding_index.py
```

Richiede l'immagine Python locale indicata, senza download automatici. La fixture
usa un processo fittizio per verificare consegna, permessi, hash, conservazione
del manifest originale e rifiuto di un worker alterato; non avvia un indice.
Il riuso di un vecchio PID dell'import dopo reboot non blocca l'indice quando
la ricevuta del carico è già `passed`.
