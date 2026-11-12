# Schema SQL, dati ChEMBL e bootstrap degli scope — proposta

**12 novembre 2026. Stato: analisi e proposta, non una procedura di restore
già eseguita.** L'owner sta recuperando un archivio RAR con circa cinquanta
chunk SQL degli embedding. Attendere la sua disponibilità prima di inventario
dei file, trasferimenti, ricomposizione o restore. Nessun dump, backup, upgrade,
nuovo DDL o cambio di scope è stato eseguito durante questa analisi.

## 1. Meilisearch: versioni e supporto effettivo

**Correzione progettuale vincolante dell'owner:** le versioni dei servizi
server devono coincidere con lo sviluppo, non essere scelte indipendentemente
per la VM. Fonte di riferimento: `docker_sl/docker-compose.yml` e il suo
`Dockerfile.postgres`. Il confronto 1.14 → 1.56 qui sotto descrive una
divergenza riscontrata, non un percorso di aggiornamento approvato. Prima
del caricamento dati risolvere la parità descritta in
[SERVICE-VERSION-PARITY.md](SERVICE-VERSION-PARITY.md).

Letture eseguite senza aprire configurazioni private o modificare dati:

| Origine della verifica | Risultato |
| --- | --- |
| Container locale Windows/Docker Desktop `meilisearch_sl` | `meilisearch 1.14.0` |
| Binario nell'immagine predisposta per la VM, ID `sha256:9f83136051c0a11331e8d1d6e950adcaf426e0f5f27e1344f7294cd60730f58e` | `meilisearch 1.56.2` |
| Help del binario locale 1.14.0 | Presenti directory/import dump, directory/import snapshot e snapshot pianificate |

Sono verifiche dei binari, non un collaudo di esportazione/importazione dei
due indici reali. L'istanza locale è la candidata origine: i documenti e i
conteggi degli indici non sono stati interrogati con credenziali in questa fase.

Per ripetere la sola lettura della versione locale da PowerShell:

```powershell
docker --context desktop-linux exec meilisearch_sl /bin/meilisearch --version
```

```powershell
docker --context desktop-linux exec meilisearch_sl /bin/meilisearch --help
```

Per verificare la versione del medesimo artefatto destinato alla VM, se è
già caricato sul Docker host, senza dati, rete o avvio del server:

```powershell
docker --context desktop-linux run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges:true --entrypoint /bin/meilisearch sha256:9f83136051c0a11331e8d1d6e950adcaf426e0f5f27e1344f7294cd60730f58e --version
```

### Il dump esiste nella 1.14.0

Non è necessario aggiornare l'origine per ottenere questa funzionalità. Il
[sorgente della release 1.14.0](https://github.com/meilisearch/meilisearch/blob/v1.14.0/crates/meilisearch/src/routes/dump.rs)
implementa `POST /dumps`, protetto dal permesso `dumps.create`, come operazione
asincrona. La presenza di `--import-dump` nel binario locale conferma anche
l'opzione di import all'avvio. Non è stato chiamato l'endpoint in questa fase.

La 1.14 scrive il formato dump V6, come dichiarato nel suo
[codice](https://github.com/meilisearch/meilisearch/blob/v1.14.0/crates/dump/src/lib.rs).
La 1.56.2 contempla V6 nel proprio
[lettore](https://github.com/meilisearch/meilisearch/blob/v1.56.2/crates/dump/src/reader/mod.rs).
Questo conferma il supporto del formato; non prova ancora l'import completo
delle impostazioni e dei documenti specifici di Mercurion. Il salto tra le
due versioni deve essere collaudato su una copia isolata, non sull'origine.

### Scegliere lo strumento per lo scopo corretto

| Modalità | Uso proposto | Limite |
| --- | --- | --- |
| Dump logico | Backup portabile e prova di import su nuova versione | Import con rielaborazione dei dati; non è copia dei file dell'indice già pronto |
| Snapshot | Recupero rapido dell'istanza sulla versione compatibile | Non è il percorso di migrazione 1.14 → 1.56 |
| Copia fisica del volume | Backup conservativo dell'origine, abbinato alla sua immagine/versione | Richiede una copia consistente; non è un database direttamente riutilizzabile con una versione arbitraria |
| Export selettivo di documenti e impostazioni | Popolare i soli due indici ChEMBL nello staging già esistente | Reindicizzazione e verifica esplicita di primary key, settings e conteggi |

Riferimenti: [dump](https://www.meilisearch.com/docs/resources/self_hosting/data_backup/dumps)
e [snapshot](https://www.meilisearch.com/docs/resources/self_hosting/data_backup/snapshots).
Il dump copre l'istanza e include impostazioni e metadati delle API key: non va
trattato come export dei soli due indici ChEMBL. I dati e i backup rimangono
privati, fuori da Git e dagli artifact pubblici di CI.

**Proposta, subordinata alla parità delle versioni:** preservare l'origine,
produrre in seguito un backup consistente e collaudarne il recupero
separatamente. Per lo staging, valutare il trasferimento selettivo dei soli indici
`molecule_previews_chembl_36` e `molecule_details_chembl_36`, incluse le loro
impostazioni, invece di sostituire l'intera istanza con un dump. I nomi vanno
confermati nell'inventario reale. Questo preserva le chiavi e i quattro indici
log appena configurati. Il percorso preciso sarà scelto dopo inventario e
valutazione dei tempi, senza imporre ora un upgrade all'origine.

La copia fisica non è esclusa per il backup: pianificarla con arresto ordinato
dell'origine oppure con un meccanismo di snapshot consistente verificato.
Non proporre una copia indiscriminata del volume live come backup ripristinabile.

## 2. Organizzazione proposta dei file SQL create

Usare il contenitore SQL già presente nel backend, evitando una seconda
gerarchia parallela. La seguente è la struttura **da realizzare**, non un
elenco di script attualmente eseguibili:

```text
MercurionWebNode/sql/bootstrap/
  README.md
  manifest.json
  00_preflight.sql
  10_application_tables.sql
  20_application_indexes.sql
  30_reference_data.sql
  90_verify_application.sql
  embeddings/
    README.md
    00_preflight.sql
    10_table.sql
    30_indexes.sql
    90_verify.sql
```

- `00_preflight`: versione PostgreSQL/pgvector, database/schema atteso, oggetti
  preesistenti e permessi. Nessun drop o reset.
- `10_application_tables`: baseline delle tabelle applicative con chiavi,
  vincoli, default, enum e dipendenze. La tabella `molecule_embeddings` resta
  separata. L'estensione vector è un prerequisito esplicito: oggi è già creata
  dal bootstrap PostgreSQL.
- `20_application_indexes`: indici applicativi ordinari, senza HNSW.
- `30_reference_data`: soli dati di riferimento necessari, dopo revisione
  degli SQL già presenti, incluso `MercurionWebNode/sql/countries.pg.sql`.
  Non include utenti o privilegi amministrativi preconfezionati.
- `90_verify_application`: controlli di sola lettura su tabelle, colonne,
  vincoli e indici, con esito comprensibile da un operatore.
- `embeddings/10_table`: definizione della tabella separata; precisione,
  dimensione del vettore e modello devono essere ricavati dal dump e dal
  contratto effettivo, non inventati dal solo tipo generico dell'entity.
- `embeddings/30_indexes`: indici del dataset, incluso HNSW con dimensione,
  operatore e parametri effettivi, da creare una sola volta dopo il carico dati.
- `embeddings/90_verify`: conteggi, null, duplicati, dimensioni/modello,
  definizione degli indici e query di similarità campione.

`manifest.json` dichiarerà ordine, checksum, revisione sorgente, versioni
richieste e requisiti transazionali degli script. I dump e i circa cinquanta
chunk restano nella directory privata scelta dall'owner: non entrano nella
cartella SQL del repository. Un manifest di trasferimento separato ne
descriverà ordine, dimensioni e checksum senza incorporarne i contenuti.

### Una baseline esplicita, non un framework di migrazioni

I prefissi definiscono l'ordine di creazione di un'installazione nuova. Non
costituiscono una sequenza di migrazioni da riprodurre a ogni avvio: niente
migration runner, tabella delle migrazioni o DDL automatico al boot.

La baseline deve essere derivata da uno schema pulito creato con l'immagine
applicativa fissata, confrontata con entity/contratti e revisionata. Non
copiarla alla cieca da un database di sviluppo stratificato. Gli script SQL
già in `sql/scientific-domain/` restano fonti da esaminare, non comandi da
eseguire automaticamente o confondere con la nuova installazione.

`IF NOT EXISTS` da solo non garantisce compatibilità: una tabella omonima con
colonne differenti deve fermare la procedura. Usare preflight e verifiche
esplicite. Documentare `ON_ERROR_STOP` e confini transazionali; eventuali
operazioni che richiedono esecuzione fuori transazione restano separate.

**Database attuale:** il precedente bootstrap TypeORM ha già inizializzato
lo schema applicativo. Non eseguire i futuri create su questa VM come se fosse
vuota. Il passaggio da `initialize-empty-schema.cjs` alla baseline SQL sarà un
intervento dedicato per le nuove installazioni, con verifica dell'esistente.
L'applicazione non deve avere due inizializzatori concorrenti.

## 3. Embedding: attività sospesa in attesa dei file

Quando l'owner comunica che l'estrazione RAR è conclusa, il primo passo sarà
leggere solo l'inventario della directory indicata: numero dei file, dimensioni,
nomi e natura dei chunk. Poi verificare se includono DDL, dati, transazioni,
indici e privilegi. Non concatenare automaticamente file ordinati per nome,
non eseguire tutti gli SQL trovati e non ricreare un indice per ogni chunk.

La ricetta dettagliata di trasferimento/restore dipende da quel risultato.
SCP/SFTP sullo SSH già funzionante è sufficiente come canale Windows → VM;
non serve un nuovo servizio di rete. Considerare RAM VM, limite PostgreSQL,
memoria di build e spazio temporaneo nella fase di indice, non adesso.

## 4. Tool proposto per generare scope cifrati di staging

**Requisito acquisito, implementazione e uso ancora da eseguire.** Non cambiare
scope utente durante questa pausa. Il contratto reale è:

- `users.scopes` è `jsonb`, un array di stringhe cifrate singolarmente.
- `ScopeService.encryptScopes` elimina duplicati, accetta i valori validi
  dell'enum `Scope` e richiama `SecurityService.encrypt_AES256_GCM`.
- La chiave usata è `APP_AES_SECRET`, decodificata da Base64; non è la chiave
  JWT RSA né quella distinta per cifrare gli user ID.
- Il formato corrente è AES-256-GCM con IV casuale di 12 byte e tag di 16:
  rappresentazione hex di `IV || tag || ciphertext` per ogni scope.
- La lettura utenti decifra questi valori e li confronta con l'enum reale.

### Interfaccia e comportamento proposti

CLI amministrativa separata dal server HTTP, eseguita nel container Nest
staging già predisposto, usando il suo bootstrap file e le stesse funzioni
di cifratura del runtime. Non duplicare l'algoritmo in uno script Python e
non richiedere di copiare la chiave su Windows, in chat, in argv o in nuove
variabili d'ambiente Docker. Non avviare l'intera applicazione Nest con i
client di posta/provider solo per cifrare una lista.

Input: nomi espliciti dell'enum, per esempio `ViewUsers`, `AssignScopes`,
`HandleTickets`, oppure un profilo di privilegi versionato e revisionato.
Rifiutare nomi sconosciuti senza ignorarli silenziosamente. Un'opzione per
tutti gli scope attuali deve essere esplicita: non presumere che una parola
"admin" autorizzi automaticamente ogni capacità presente o futura.

Output predefinito: un documento JSON privato con l'array cifrato e metadati
non segreti di ambiente/revisione/nomi richiesti. Nel terminale soltanto esito
e conteggio; chiave e documento applicativo non vengono stampati. Prima
dell'output verificare internamente il roundtrip con le funzioni del runtime.
IV nuovi rendono normale un ciphertext diverso a ogni generazione.

La generazione **non scrive il database**. L'eventuale assegnazione a un
account identificato univocamente sarà un passo separato, transazionale e
documentato, con controllo che la riga modificata sia esattamente una. Non
inserire ciphertext development nella VM: non è trasferibile alla diversa
chiave staging. Dopo un cambio scope considerare la coerenza con i claim
della sessione corrente; il semplice array cifrato non aggiorna i JWT emessi.

Prove richieste prima della consegna del tool: nomi validi/invalidi,
deduplicazione, roundtrip, IV distinti, errore con chiave diversa, rifiuto
dell'ambiente errato e assenza di chiavi nei log/errori/output. Usare solo
materiale sintetico nei test e non invocare il tool con chiavi reali da una
sessione agente.
