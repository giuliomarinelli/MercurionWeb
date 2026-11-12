# Primo avvio privato delle applicazioni preview

Questa procedura prosegue il [runbook](RUNBOOK.md) dopo il recupero dei quattro
server e la creazione delle due chiavi client Meilisearch. Installa Nest,
Angular, Tox21 e Nginx nei due progetti Compose esistenti. È una **prima
installazione**, non un comando di aggiornamento o di ripartenza quotidiana.
Non modifica ACL, router, DNS o Cloudflare e non pubblica porte.

## 1. Prerequisiti e file da conservare

Eseguire dalla root del repository Web, su Windows con PowerShell 5.1,
Python, OpenSSH, Git e Docker Desktop in modalità Linux. Per ricostruire
immagini usare prima [ARTIFACT-REPRODUCTION.md](ARTIFACT-REPRODUCTION.md):
sorgenti fissati a commit, nessuna copia di dotenv o overlay del worktree.

Servono:

1. VM accesa, LUKS sbloccato e alias `mercurion-server` funzionante.
2. PostgreSQL, Redis, NATS e Meilisearch già recuperati e verificati.
3. Bundle pubblico originale dei server, con `server-bootstrap.json` e
   ricevute. Non rigenerarlo per questo passaggio.
4. File privato nel profilo dell'operatore, creato seguendo il runbook,
   provider compilati e due chiavi applicative Meili distinte, non scadute.
   La master key rimane esclusivamente tra i segreti del server Meili.
5. Quattro export applicativi, ciascuno con SBOM, scansione strict senza
   vulnerabilità, audit runtime, identità e verifica load/save.
6. Commit degli strumenti pubblicato e CI `full`/`Required gate` riuscita
   sullo stesso SHA. Un risultato locale non sostituisce questa verifica.

I percorsi degli esempi possono essere cambiati, ma non i contenuti privati
né gli identificativi di una release già installata. `vm045-applications`
è una directory di output pubblico, non contiene programmi indispensabili:
tutti gli strumenti sono nel repository. Non versionare né condividere il
file di configurazione privata o i suoi backup.

## 2. Preparare i quattro export pubblici

Su una nuova macchina ricostruire prima le immagini dalla revisione prevista
tramite l'appendice artefatti. Su questa installazione i sorgenti applicativi
Web sono rimasti invariati dalla release
`d227dbf4216ce2ceb865a9b315ae52169c9e8c6e`; gli helper di bootstrap hanno invece
la revisione del nuovo commit (`toolRevision` nel manifest).

Impostare una directory nuova. Ogni comando va eseguito singolarmente; se
fallisce, conservare l'output e non proseguire con una scansione incompleta.

```powershell
$env:DOCKER_CONTEXT='desktop-linux'
$taskExports=Join-Path $env:USERPROFILE '.codex/artifacts/inf-vm-04/vm045-applications'
$taskRevision='d227dbf4216ce2ceb865a9b315ae52169c9e8c6e'
```

Gli export Web accettano ID immutabili delle immagini già costruite. Per la
release corrente i riferimenti sono quelli sotto; su una nuova build usare
gli ID verificati della propria build, senza inventare equivalenze tra ID
Docker e digest portabile della configurazione.

```powershell
python -B scripts/export-web-container.py --component web-ng --image sha256:c2c2613fb9aa53e6e97d2233b92e86ac96218ef588ce28cdf0a2d4defbc3cfdb --target staging --revision $taskRevision --version 1.0.0 --output "$taskExports/components/web-ng" --cache "$taskExports/scan-cache/web-ng"
```

```powershell
python -B scripts/export-web-container.py --component web-node --image sha256:0965a937eb5aec2e207d563e4085ff009100511dfa75a7e9ab394fb8e13798e1 --target staging --revision $taskRevision --version 1.0.0 --output "$taskExports/components/web-node" --cache "$taskExports/scan-cache/web-node"
```

Per l'edge usare l'export dei servizi, che controlla ruolo, UID e provenienza:

```powershell
python -B scripts/infrastructure/export_preview_service.py --role edge --image sha256:09f4c8488ca8502e04b64f43e4c0c45bcf63931ff390f5a9eb06f3be17e24d6e --revision $taskRevision --output "$taskExports/servers/edge" --cache "$taskExports/scan-cache/edge"
```

### 2.1 Aggiornamento OS Tox21 del 12 novembre

La nuova scansione del precedente artefatto Tox21 ha rilevato
`CVE-2026-84243` in quattro pacchetti glibc `2.44-r15`, con correzione
`2.44-r16`. Non è stata introdotta un'eccezione alla policy. L'immagine
derivata conserva codice, modello, pesi, soglie e revisione applicativa
`d506101ec27c985ef4ddb280266bfcdc4b6bf1c4`; aggiorna solo i quattro pacchetti
OS. Il Dockerfile di derivazione è versionato in Web, senza modificare la
repository Tox21. Prima caricare l'archivio parent verificato della release
precedente, oppure ricostruirlo dalla sua procedura, verificandone l'identità.

```powershell
docker tag sha256:e816fb97709fb05db82ecacaef69cb7c1e23389474d7cc7a7688d47d37a283d4 mercurion-vm045-tox21-parent:e816fb97709f
```

```powershell
docker build --file deployment/local-vm/operational/Tox21Security.Dockerfile --tag mercurion-vm045-tox21:glibc-fixed deployment/local-vm/operational
```

Il riferimento `FROM` include il digest immutabile del parent. La disponibilità
futura dei pacchetti Wolfi non è garantita: conservare gli archivi verificati.
Se il pacchetto fissato non è più disponibile, aggiornare e riesaminare la
ricetta, non sostituirlo implicitamente con `latest`.

Eseguire l'export con lo strumento della repository Tox21, dopo averla
materializzata secondo l'appendice artefatti. Nell'esempio la repository
indipendente è già disponibile come directory sorella; non è un requisito
di layout del progetto: `$taskToxSource` può puntare alla copia materializzata.

```powershell
$taskToxSource='C:/.project_repo/MercurionTox21'
python -B (Join-Path $taskToxSource 'scripts/container_evidence.py') --image mercurion-vm045-tox21:glibc-fixed --output "$taskExports/components/tox21" --cache "$taskExports/scan-cache/tox21"
```

Atteso `security_eligible: true` e `counts: {}`. La scansione copre anche
l'OS; non usare `ignore-unfixed`, filtri di severità o file di esclusione.
Il manifest `component.json` conserva il digest esatto dell'immagine esportata.

Il primo export locale si era fermato per timeout di analisi SBOM, prima
della scansione. Per una macchina lenta si può preriscaldare **la sola cache
di analisi**, conservando il run fallito: montare la sua directory pubblica
come `/evidence` e la cache come `/cache`, quindi usare lo scanner fissato con
`image --input /evidence/image.tar --cache-dir /cache --timeout 15m --format
cyclonedx --output /evidence/sbom-long-timeout.cdx.json`. Rieseguire poi
l'export canonico in una directory nuova. Il file di preriscaldamento non
sostituisce nessuno dei documenti canonici, né un errore è un risultato verde.

## 3. Assemblare il bundle applicativo

Gli export sono pubblici e possono essere preparati senza aprire il file
privato o SSH. Usare strumenti committati: la preparazione copia gli helper
con `git show HEAD`, non prende modifiche non committate.

```powershell
$taskServers=Join-Path $env:USERPROFILE '.codex/artifacts/inf-vm-04/vm043-servers-ready'
python -B scripts/infrastructure/preview_application_bundle.py prepare --exports $taskExports --servers $taskServers --output "$taskExports/ready" --revision $taskRevision
```

Atteso `application-bundle-verified`, quattro immagini e un nuovo `runId`.
Il manifest lega gli export all'hash del manifest dei server originali e
contiene gli hash dei soli file ammessi. Non contiene segreti.

Controllo facoltativo del piano, senza esecuzione remota o lettura privata:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewApplicationBootstrap.ps1 -BundlePath "$taskExports/ready"
```

Attesi `application-plan`, `privateConfigurationRead: false`, `sshStarted:
false` e `servicesStarted: false`. Non tentare `prepare` sopra un output
esistente. Conservare la directory `ready` con i successivi report.

## 4. Eseguire un solo comando operativo

Salvare e chiudere il file privato nell'editor. La validazione completa e
il controllo delle sue ACL sono già nel comando: non serve una procedura
manuale distinta. Il tunnel amministrativo Meili non è usato dal bootstrap;
i controlli verso i server avvengono all'interno della VM.

Da PowerShell Windows normale, nella root di Web:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewApplicationBootstrap.ps1 -BundlePath "$taskExports/ready" -Execute
```

Passphrase SSH e password sudo si inseriscono soltanto nei prompt del
terminale. Il trasferimento riguarda quattro immagini, non ricarica quelle
dei server. Sono previste queste fasi:

1. `public-transfer`: copia esclusivamente artefatti, manifest e helper.
2. `load-server-checks-and-edge`: copia root protetta con verifica hash,
   controllo dei quattro server/volumi originali, spazio e collisioni;
   load/save delle immagini, creazione delle sole reti applicative, avvio
   dell'edge e rilevamento del suo IP reale su `mercurion_stg_web`.
3. `application-documents-receive`: costruzione in memoria dei due documenti
   applicativi e invio via stdin SSH. Nessun valore negli argv o nei report.
4. `schema-and-application-start`: file root/consumer su tmpfs, UID separati
   e modalità `0400`, bind read-only; schema inizializzato solo se vuoto,
   altrimenti confronto senza modifiche; avvio Nest, Angular e Tox21;
   readiness attraverso l'edge e RPC reali, quindi registrazione dei membri.
5. `finished`: ricevuta finale e percorso del report.

La root pubblica protetta è
`/opt/mercurion/releases/application-<runId>`; i segreti applicativi sono in
`/run/mercurion-applications/<runId>/active`. Il backend riceve le sole chiavi
Meili client, la password del ruolo PostgreSQL applicativo e le proprie
credenziali. Tox21 riceve credenziali NATS dedicate e la sola chiave JWT
pubblica PEM. La master Meili e la password PostgreSQL amministrativa non
entrano in questi documenti.

`APP_TRUSTED_PROXY_CIDRS` contiene esclusivamente l'IP dell'edge `/32`,
calcolato dopo il suo avvio. Non usare `0.0.0.0/0` per aggirare questo controllo.

## 5. Interpretare il risultato e gestire un errore

Esito atteso: `status: passed`, `applicationServicesStarted: true`,
`publishedPorts: false`, `publicAcceptance: false`, `isolationAccepted: false`.
Nel bundle rimangono `execution-state.json`, `receipts/preflight-result.json`
e `receipts/bootstrap-result.json`. La ricevuta guest distingue schema,
controlli e quattro membri; il server conserva un registro root protetto
`application-members.json`, necessario per riconoscere questi container
senza accettare membri Compose sconosciuti.

Lo schema usa le entity della vera immagine Nest. Il confronto normalizza
solo i default JSON letterali per eliminare l'equivalenza testuale tra
`'{}'::jsonb` e `{}`; non esegue le query di modifica proposte da TypeORM.
Una differenza effettiva blocca l'avvio e richiede revisione esplicita.

In caso di errore conservare runId, ultima fase e ricevute. Non rilanciare
il bootstrap, non rimuovere lo stato per forzarlo, non rigenerare i segreti
e non cancellare volumi. Potrebbero essere presenti l'edge o applicazioni
già avviate. Se il remoto riporta successo ma SCP fallisce, recuperare il
solo report dallo stesso percorso remoto; non ripetere il lavoro remoto.

## 6. Collaudo e limiti del traguardo

Il collaudo locale del 12 novembre, con valori sintetici e risorse temporanee,
ha verificato: schema vuoto, confronto immediato compatibile, rifiuto di un
default JSON realmente diverso senza mutarlo, cinque RPC Tox21, backend e
frontend attraverso l'edge e roundtrip AES. Le fixture tmpfs Linux provano
ricezione non-root, proprietà UID/GID, permessi, blocco del riuso e copia
pubblica da Windows con modalità normalizzate. Non sono prove sulla VM.

Questa consegna non dichiara ancora eseguito il bootstrap applicativo sulla
VM: il registro sarà aggiornato con la ricevuta dell'operatore. Anche un
bootstrap positivo non dimostra login, MFA, WebSocket, provider esterni,
dataset ChEMBL o accesso pubblico.

Dopo l'installazione iniziale, consolidare **prima dell'esposizione pubblica**
la ripartenza unificata di server e applicazioni dopo perdita del tmpfs. Il
recupero dei soli server riconosce i quattro membri applicativi registrati,
ma non ricrea i documenti applicativi né riavvia tali applicazioni.
Non usare questo installer come surrogato del recupero giornaliero.

Restano poi import ChEMBL, collaudo funzionale privato, revisione dei proxy
header/cookie HTTPS, e collegamento del tunnel con Access. La policy DnsHttps
attuale non apre automaticamente SMTP o la porta del tunnel: eventuali
necessità di egress vanno definite prima, senza allargare implicitamente
l'accesso alla LAN. Le prove H-05/A-05/A-30 restano parziali.
