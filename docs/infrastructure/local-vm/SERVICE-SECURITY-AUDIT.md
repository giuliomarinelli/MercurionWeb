# Audit di sicurezza preliminare all'allineamento dei servizi

**12 novembre 2026.** Richiesta owner: correggere i Compose shared/preview e
caricarli sulla VM, prima sottoponendo le versioni di sviluppo ad audit di
sicurezza e correggendo i problemi senza introdurre regressioni. Resta valido
il vincolo di [parità delle versioni](SERVICE-VERSION-PARITY.md).

## Esito delle immagini attuali di sviluppo

Audit reale, non simulato, delle cinque immagini effettivamente usate dai
container definiti in `docker_sl/docker-compose.yml`. Ogni immagine coincide
con il riferimento Compose presente sul Docker host. Nessun pull, riavvio,
modifica a volumi/configurazioni dei servizi o accesso a segreti.

Scanner fissato:
`aquasec/trivy@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb`.
Per ogni immagine: archivio untagged, digest, SBOM CycloneDX, database di
vulnerabilità scaricato in una cache nuova e scansione senza filtri di severità
o esclusioni. Policy applicata a tutti i finding, inclusi UNKNOWN/unfixed.

| Servizio | Versione letta dal binario | Finding totali | Critical | High | Esito |
| --- | --- | ---: | ---: | ---: | --- |
| PostgreSQL | 16.10 | 896 | 19 | 255 | Bloccato |
| Redis | 8.2.2 | 336 | 7 | 61 | Bloccato |
| NATS | 2.12.1 | 85 | 1 | 42 | Bloccato |
| Meilisearch | 1.14.0 | 62 | 2 | 17 | Bloccato |
| Nginx edge | 1.27.5 | 219 | 3 | 67 | Bloccato |

I numeri sono **finding pacchetto/CVE**, non CVE uniche né prova che ogni
problema sia sfruttabile nella configurazione corrente. La policy strict non
li esclude in base all'uso di un modulo. Il report aggregato è `blocked`.
Le scansioni non sostituiscono la verifica degli advisory del motore: un
binario nativo senza inventario delle dipendenze può avere copertura diversa
da un pacchetto OS o Go.

Evidenze pubbliche locali:
`%USERPROFILE%/.codex/artifacts/inf-vm-04/vm046-service-parity/audit-20261112/`.
`audit.json` contiene identità/versioni/riepiloghi; ogni sottocartella conserva
`identity.json`, `image.tar`, SBOM, vulnerabilità e risultato della policy.
I log dello scanner e i metadati del suo database sono conservati. Nessun file
di credenziali viene copiato nell'audit.

## Come ripetere l'audit

Dalla root Web su Windows, con i cinque servizi di sviluppo già avviati e
Docker Desktop Linux disponibile. Scegliere una directory di output nuova:

```powershell
$taskAuditOutput = Join-Path $env:USERPROFILE '.codex/artifacts/inf-vm-04/vm046-service-parity/audit-ripetizione-01'
python -B scripts/infrastructure/audit_development_services.py --output $taskAuditOutput
```

Lo strumento usa il Compose con un env file temporaneo vuoto, senza caricare
dotenv ignorati. Legge solo identità e `--version` dai container. Salva e
scansiona le immagini senza eseguire i loro server o montare i volumi dati.
Due scansioni al massimo sono concorrenti. Codice di uscita 2 e `blocked`
sono l'esito atteso quando esistono finding; un errore di scansione non vale
zero vulnerabilità. Non cancellare output precedenti per mascherare un errore.

## Distinguere i fix di base dai fix del motore

- Redis: i 336 finding del report sono attribuiti ai pacchetti Debian della
  base. Questo non dimostra automaticamente che il binario Redis sia privo
  di problemi: vanno lette anche le
  [release note della linea 8.2](https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisos-8.2-release-notes/).
- Meili: i 62 finding esposti dallo scanner riguardano la base Alpine 3.20.6.
  Un aggiornamento della sola base può preservare il binario 1.14.0, ma deve
  essere costruito e verificato, inclusi dipendenze native e formato dei dati;
  non è già una correzione consegnata.
- PostgreSQL: 834 finding OS, inclusi quelli del pacchetto pgvector 0.8.5,
  e 62 nel tool Go `gosu`. Inoltre gli
  [advisory PostgreSQL 16](https://www.postgresql.org/support/security/16/)
  elencano correzioni del motore successive alla 16.10. Una pulizia dell'OS
  da sola non basta a dichiarare sicuro il server.
- NATS: il report contiene 14 finding sul modulo
  `github.com/nats-io/nats-server/v2` stesso, oltre a toolchain e dipendenze.
  Per esempio [CVE-2026-33216](https://github.com/nats-io/nats-server/security/advisories/GHSA-v722-jcv5-w7mc)
  è corretta nella linea 2.12 a partire da 2.12.6. Quel numero è solo un
  esempio di fix, non una selezione della versione finale né una prova che
  tutti i finding siano risolti.
- Nginx: la versione 1.27.5 rientra in intervalli riportati dagli
  [advisory ufficiali](https://nginx.org/en/security_advisories.html).
  L'assenza di TLS o maintenance mode nel file VM non rende nullo l'audit
  del binario e dei pacchetti.

## Contratto Nginx specifico della VM

Usare `deployment/local-vm/operational/nginx.conf`, separato dalla ConfigMap
Kubernetes. **Solo HTTP interno su porta 80, nessun certificato/TLS e nessun
maintenance mode.** Il TLS pubblico è terminato da Cloudflare. Mantenere
health, API, SPA e upgrade WebSocket del normale funzionamento applicativo.

Il validatore dei Compose verifica ora anche questo file. Test negativi
coprono listener TLS, certificati, maintenance mode, upstream HTTPS e riferimenti
a ConfigMap. Il file operativo corrente soddisfa il contratto; non necessita
di copiare la configurazione Kubernetes. Questo è distinto dall'idoneità
dell'immagine Nginx che dovrà essere scelta dopo l'audit.

## Perché il caricamento è ancora fermo

Non è sicuro sostituire i riferimenti nei Compose con queste immagini
vulnerabili per ottenere la sola parità. Non è nemmeno corretto modificare
silenziosamente soltanto le versioni VM per ottenere un report verde.

L'owner ha autorizzato **aggiornamenti coordinati sviluppo/staging nelle linee
compatibili, collaudati su copie isolate**. Non è un'autorizzazione a saltare
la scansione o montare i volumi attivi sotto un nuovo binario senza verifica.
Nessun Compose è stato caricato sulla VM e i server attivi restano invariati.

Dopo la scelta: costruire i candidati fissati per digest, ripetere tutte le
scansioni, collaudare su copie/fixture e confrontare API, autenticazione,
persistenza, RDB/AOF, SQL/pgvector e query Meili usate dall'applicazione.
Preparare backup e rollback dei volumi e riconciliazione degli ID del recovery
prima di sostituire i servizi. L'assenza di breaking change va sostenuta da
queste evidenze nei percorsi esercitati, non promessa in assoluto da una
scansione CVE o dal numero di versione.

## Candidati coordinati: preparazione e limiti

La directory `deployment/local-vm/coordinated/` conserva le nuove ricette,
separate da quelle storiche usate per il recovery delle release già consegnate.
Il runtime attivo non è ancora sostituito. Sono ora predisposti i Compose
shared/preview con versioni dichiarate e l'overlay coordinato di sviluppo;
seguire l'[adozione con dati, rollback e recovery](SERVICE-UPGRADE.md), senza
applicare singole immagini sui volumi originali.

| Componente | Candidato | Decisione tecnica |
| --- | --- | --- |
| Redis | 8.2.9 con pacchetti Alpine corretti e fissati | Resta nella linea 8.2 dello sviluppo, non la 7.2 degli artefatti VM precedenti |
| NATS | 2.12.15, toolchain Go 1.27.4 e patch crypto fissata | Resta nella linea 2.12; questa linea è EOL, non diventa supportata perché la scansione passa |
| Meilisearch | 1.14.0, nuova base Alpine | Binario originale preservato, nessuna adozione implicita della 1.56 VM |
| Nginx | 1.30.6, immagine corretta già preparata per la VM | La vecchia 1.27 non contiene tutti i fix; controllare separatamente i due file HTTP di sviluppo e VM |
| PostgreSQL | 16.16 dai sorgenti ufficiali | I tag ufficiali non sono ancora pubblicati; la ricetta locale riproduce la build upstream con sorgente 16.16 verificato, senza attendere il tag |

Fonti: [release Redis 8.2](https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisos-8.2-release-notes/),
[ciclo NATS](https://docs.nats.io/release-notes/),
[release NATS 2.12.15](https://github.com/nats-io/nats-server/releases/tag/v2.12.15),
[PostgreSQL 16.16](https://www.postgresql.org/docs/release/16.16/).
La 16.16 include correzioni CVE e indicazioni sui casi che richiedono REINDEX:
non presentare la 16.15 come soluzione finale solo perché un database scanner
potrebbe non aver ancora recepito gli advisory pubblicati oggi.

### 1. Materializzare un contesto pubblico nuovo

PowerShell ordinaria, root del repository, Docker Desktop Linux. Nessuna
lettura del file privato di configurazione o dei volumi applicativi. Per una
riproduzione usare una revisione Git che contenga le ricette e un worktree
pulito; registrare lo SHA, non etichettare una build locale come release CI.

```powershell
$taskRecipeRevision = git rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'Revisione Git non disponibile.' }
$taskCandidateRoot = Join-Path $env:USERPROFILE ('.mercurion/artifacts/coordinated-' + [Guid]::NewGuid().ToString('N'))
if (Test-Path -LiteralPath $taskCandidateRoot) { throw 'Directory gia presente.' }
[void][IO.Directory]::CreateDirectory($taskCandidateRoot)
Copy-Item -LiteralPath deployment/local-vm/coordinated/Dockerfile -Destination (Join-Path $taskCandidateRoot 'Dockerfile')
Copy-Item -LiteralPath deployment/local-vm/coordinated/nats.Dockerfile -Destination (Join-Path $taskCandidateRoot 'nats.Dockerfile')
$taskNatsSource = Join-Path $taskCandidateRoot 'nats-source.tar.gz'
Invoke-WebRequest -UseBasicParsing -Uri 'https://codeload.github.com/nats-io/nats-server/tar.gz/8460a428cf3b27c8627595d630f1ccad55786d13' -OutFile $taskNatsSource
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $taskNatsSource).Hash.ToLowerInvariant() -ne '0eb53a7b71a5a749224a42a117c4889982c9a015c648236d325d0b54c59f53eb') { throw 'Sorgente NATS inatteso.' }
```

### 2. Compilare senza modificare i servizi attivi

```powershell
foreach ($taskRole in @('redis','meilisearch')) {
    docker --context desktop-linux build --platform linux/amd64 --target $taskRole --build-arg "BUILD_REVISION=$taskRecipeRevision" --tag "mercurion-parity-${taskRole}:pinned-candidate" $taskCandidateRoot
    if ($LASTEXITCODE -ne 0) { throw ('Build fallita: ' + $taskRole) }
}
docker --context desktop-linux build --platform linux/amd64 --file (Join-Path $taskCandidateRoot 'nats.Dockerfile') --build-arg "BUILD_REVISION=$taskRecipeRevision" --tag mercurion-parity-nats:2.12.15-go1274 $taskCandidateRoot
if ($LASTEXITCODE -ne 0) { throw 'Build NATS fallita.' }
```

I tag sono solo nomi locali di candidati. Base OCI, sorgente NATS, patch crypto
e versioni APK selezionate sono fissati nelle ricette; se un pacchetto viene
rimosso dal repository upstream, la build deve fallire. Per conservare una
release esatta archiviare tar, SBOM e ricevute: una ricompilazione futura non
è automaticamente byte-identica, né automaticamente ancora priva di finding.

### 3. Scansione strict e identità

```powershell
$taskImages = @{}
foreach ($taskRole in @('redis','meilisearch','nats')) {
    $taskTag = if ($taskRole -eq 'nats') { 'mercurion-parity-nats:2.12.15-go1274' } else { "mercurion-parity-${taskRole}:pinned-candidate" }
    $taskImage = docker --context desktop-linux image inspect $taskTag --format '{{.Id}}'
    if ($LASTEXITCODE -ne 0) { throw ('Immagine assente: ' + $taskRole) }
    $taskImages[$taskRole] = $taskImage
    python -B scripts/infrastructure/scan_service_candidate.py --image $taskImage --role $taskRole --output (Join-Path $taskCandidateRoot ('scan-' + $taskRole))
    if ($LASTEXITCODE -ne 0) { throw ('Scansione respinta: ' + $taskRole) }
}
```

Ogni scansione conserva tar, SBOM, report completo, risultato strict e data
del database nuovo. `candidate.json` distingue l'ID immagine locale dal digest
del config contenuto nell'archivio: con lo storage OCI di Docker Desktop non
sono necessariamente uguali. Usare l'ID restituito da `image inspect` nei
collaudi locali, non sostituirlo manualmente con `configDigest`.
`securityEligible=true` non rende automaticamente veri
`compatibilityVerified` o `adoptionAuthorized`.

### 4. Collaudi isolati ripetibili

Redis crea due fixture con la vecchia immagine: stringhe, hash, sorted set,
stream e TTL. Salva RDB/AOF, arresta le proprie fixture e copia i dati in nuovi
volumi del solo test. Il candidato legge quelle copie, esegue Lua e restart;
la fixture originale mantiene i dati iniziali. Nessun volume `docker_sl_*`
viene montato o copiato. Nessuna porta viene pubblicata; cleanup solo delle
risorse create dal run.

```powershell
python -B scripts/infrastructure/smoke_redis_update.py --old-image sha256:4521b581dbddea6e7d81f8fe95ede93f5648aaa66a9dacd581611bf6fe7527bd --candidate-image $taskImages['redis'] --report (Join-Path $taskCandidateRoot 'redis-compatibility.json') --execute
if ($LASTEXITCODE -ne 0) { throw 'Collaudo Redis fallito.' }
python -B scripts/infrastructure/qa_preview_meili_indexes.py --execute --image $taskImages['meilisearch'] --output (Join-Path $taskCandidateRoot 'meili-indexes')
if ($LASTEXITCODE -ne 0) { throw 'Collaudo indici Meili fallito.' }
python -B scripts/infrastructure/qa_preview_meili_client_keys.py --execute --image $taskImages['meilisearch'] --output (Join-Path $taskCandidateRoot 'meili-keys')
if ($LASTEXITCODE -ne 0) { throw 'Collaudo chiavi Meili fallito.' }
```

Meili usa dati sintetici e listener effimeri solo su loopback Windows; verifica
task, primary key, riuso senza scritture, chiavi a 90 giorni e limiti dei permessi.
Non dimostra il restore dei due grandi indici ChEMBL. Il binario 1.14 preservato
ha SHA-256 `20e6a602cf1be28e7396d0e495501f194243b8e30448dca4056b7bb2e073bd35`.
Resta il limite della copertura del binario Rust: zero finding OS non equivale
a una garanzia su tutte le dipendenze interne del motore; gli advisory del
motore restano parte dell'analisi prima dell'adozione.

Per NATS riusare il [collaudo Tox21 reale](ARTIFACT-REPRODUCTION.md#6-collaudi-host-prima-della-consegna),
passando a `smoke_tox21_candidate.py` il parametro aggiuntivo
`--broker-image $taskImages['nats']`. Occorrono immagine Tox21 locale e relativi
SHA/versione verificati nella procedura citata; nessun training o source overlay.
Il test usa credenziali sintetiche e rete interna senza porte pubblicate.

### 5. Evidenze acquisite e lavoro residuo

Directory pubblica del collaudo del 12 novembre:
`%USERPROFILE%/.codex/artifacts/inf-vm-04/vm046-service-parity/coordinated-01/`.

| Candidato finale di questo collaudo | Finding scanner | Evidenze di compatibilità acquisite |
| --- | ---: | --- |
| Redis 8.2.9, APK fissati | 0 | RDB e AOF da fixture 8.2.2, readback, Lua, TTL, restart e fixture sorgente preservata |
| Meili 1.14.0, APK fissati | 0 | 5 casi indici e 9 casi chiavi reali su dati sintetici; hash binario invariato |
| NATS 2.12.15, Go 1.27.4 | 0 | 3 lifecycle Tox21 con RPC reali, negazioni auth e arresti puliti |
| Nginx 1.30.6 già costruito | 0 | Sintassi delle configurazioni di sviluppo e VM; nessuna nuova prova delle route reali |
| PostgreSQL 16.16 da sorgenti | 0 | Save/load verificato e 6 controlli SQL/auth/dump/restore/HNSW/restart, dettagli sotto |

Report: `scans/redis-pinned/candidate.json`,
`scans/meilisearch-pinned/candidate.json`, `scans/nats-go1274/candidate.json`,
`scans/edge/candidate.json`, `redis-compatibility-pinned.json`,
`meili-indexes-pinned/`, `meili-keys-pinned/`, `nats-tox21-rpc.json`.
Cleanup delle fixture: nessun errore e nessun container di test rimasto attivo.
Questi sono collaudi locali, non una certificazione CI o del deploy VM.

Le prime ricette esplorative sono conservate separatamente da quelle con APK
fissati; non cancellare i report falliti. NATS con Go 1.27.3 è stato respinto
per CVE-2026-97054: il candidato successivo usa Go 1.27.4. Il primo collaudo
Redis usava per errore il config digest al posto dell'ID locale e non ha
completato casi; corretto il riferimento, entrambi i formati passano.

Le verifiche completate non costituiscono il deploy coordinato. Prima di
aggiornare i Compose e trasferirli sulla VM servono ancora:

1. includere le evidenze PostgreSQL/pgvector della procedura sotto nell'insieme
   coordinato, distinguendo binario disponibile e versione nel catalogo;
2. verifica dei dati effettivi su copie/restore separati e backup ripristinabili,
   in particolare Meili 1.14 sviluppo contro 1.56 VM: nessun downgrade in-place;
3. selezione di un unico insieme di immagini per sviluppo e staging, modifica
   coordinata dei Compose e riconciliazione delle identità per il recovery;
4. consegna owner via SSH, verifica dei servizi e nuovo collaudo privato Nginx.

Nginx mantiene due configurazioni per ambiente: quella VM HTTP-only dedicata
non si ricava dalla ConfigMap Kubernetes. Il controllo sintattico sul file di
sviluppo richiede un mapping locale di `host.docker.internal` anche nel container
isolato; un errore di DNS del test non dimostra una regressione del proxy.
La verifica sintattica non sostituisce quella delle route sul runtime reale.

## PostgreSQL 16.16: build da sorgenti e verifica prima della sostituzione

L'assenza temporanea del tag Docker ufficiale non impedisce di gestire il
componente. `deployment/local-vm/coordinated/postgres.Dockerfile` deriva dalla
ricetta `docker-library/postgres` alla revisione
`9d15534160ade17f2b6c455a39ee967c49b1937d`. L'attribuzione e la licenza upstream
sono conservate in `postgres-upstream.LICENSE`.

Le modifiche alla ricetta sono esplicite: base Alpine fissata per digest;
sorgente 16.16 locale verificato; compilazione con due job e stesse opzioni
funzionali upstream (inclusi ICU, OpenSSL, GSSAPI e LLVM); assenza di `gosu`,
perché il runtime parte come UID/GID 70; pgvector e pacchetti OS corretti.
Non è un'immagine pubblicata dalla Docker Official Images: è una build locale
documentata dai sorgenti ufficiali. Le [release note 16.16](https://www.postgresql.org/docs/release/16.16/)
restano il riferimento per le correzioni del motore.

### 1. Preparare tutti gli input, senza Docker o segreti

```powershell
$taskPgRevision = git rev-parse HEAD
$taskPgBuild = Join-Path $env:USERPROFILE ('.mercurion/artifacts/postgres-1616-' + [Guid]::NewGuid().ToString('N'))
python -B scripts/infrastructure/prepare_postgres_candidate.py --output $taskPgBuild
if ($LASTEXITCODE -ne 0) { throw 'Preparazione PostgreSQL fallita.' }
```

Il tool scarica soltanto gli input pubblici elencati in `postgres-sources.json`
e rifiuta ogni hash diverso, file sovradimensionati o directory già esistente.
Conserva un manifest `build-inputs.json`. In particolare:

| Input | SHA-256 |
| --- | --- |
| postgresql-16.16.tar.bz2 | `9d5cd8633043b75740d5d59749c6b7365e6aeb53c47098b1a5e80bb18f87881a` |
| pgvector, revisione f37c13f68b57d2c3472b2214fbcff699d6d34876 | `83d673c3b287cddbf3879f86215f043f2c2b56c69d37b2a77504910db1ed6e56` |
| SQL pgvector 0.8.1 originale | `7fb5bb279ef83bf9204bfac7405bb5c9a05e49f5ac7d64d1eb4464d103b80f32` |

La ricetta installa il binario pgvector 0.8.7 e conserva anche lo script base
0.8.1. Questo permette di creare esplicitamente un catalogo 0.8.1 per un restore
senza eseguire `ALTER EXTENSION`; non cambia il catalogo di alcun DB esistente.
La compatibilità tra quel catalogo e la nuova libreria è verificata nel collaudo,
non dedotta dalla sola presenza dei file SQL.

### 2. Compilare, esportare e applicare la policy strict

```powershell
docker --context desktop-linux build --platform linux/amd64 --target postgres --file (Join-Path $taskPgBuild 'postgres.Dockerfile') --build-arg "BUILD_REVISION=$taskPgRevision" --tag mercurion-parity-postgres:16.16-source $taskPgBuild
if ($LASTEXITCODE -ne 0) { throw 'Build PostgreSQL fallita.' }
python -B scripts/infrastructure/export_preview_service.py --role postgres --image mercurion-parity-postgres:16.16-source --revision $taskPgRevision --output (Join-Path $taskPgBuild 'export') --cache (Join-Path $taskPgBuild 'scan-cache')
if ($LASTEXITCODE -ne 0) { throw 'Export o policy PostgreSQL respinti.' }
```

La prima build scarica una toolchain consistente e compila PostgreSQL completo:
può richiedere diversi minuti. La compilazione avviene sul Docker host Windows,
non sulla VM. L'exporter conserva archivio, SBOM, report vulnerabilità, identità,
database scanner e verifica save/load. Nessuna severità o finding è ignorato.
La rimozione della toolchain dall'immagine finale non sostituisce la scansione.

### 3. Collaudare il passaggio 16.10 → 16.16 su fixture isolate

Il test usa la vecchia immagine di sviluppo identificata dall'audit, mai il
container `pg_sl` né il suo volume. Se l'immagine non è più locale, caricarla
dal tar pubblico conservato durante l'audit; non ricostruirla con un APT corrente
spacciandola per la vecchia immagine identica. Il tar è un input da archiviare
insieme alle altre evidenze della baseline.

```powershell
$taskPgImage = docker --context desktop-linux image inspect mercurion-parity-postgres:16.16-source --format '{{.Id}}'
if ($LASTEXITCODE -ne 0) { throw 'Candidato PostgreSQL assente.' }
python -B scripts/infrastructure/smoke_postgres_update.py --old-image sha256:0d00971a33d03c8280be98883184673b3385e14a30975a3dca314b9de04dd405 --candidate-image $taskPgImage --legacy-sql (Join-Path $taskPgBuild 'vector--0.8.1.sql') --output (Join-Path $taskPgBuild 'compatibility') --execute
if ($LASTEXITCODE -ne 0) { throw 'Collaudo PostgreSQL fallito: conservare il report.' }
```

Il run crea due container e volumi nuovi con label univoche, senza rete esterna
o porte pubblicate. Nel vecchio server crea un catalogo pgvector 0.8.1, tabelle
con UUID/JSONB/timestamptz, 256 embedding sintetici a 384 dimensioni e indice
HNSW cosine. Verifica rollback e autenticazione SCRAM, poi esegue un vero
`pg_dump -Fc` e `pg_restore` sul candidato 16.16. Il catalogo vector è creato
esplicitamente a 0.8.1 prima del restore; la selezione TOC mantiene tutti gli
oggetti tabella/dati/indici senza ricreare l'estensione alla versione di default.

Controlla righe, tipi, primi vicini e distanze con tolleranza 1e-6, uso effettivo
dell'indice HNSW nel piano, restart e conservazione della fixture sorgente.
Un database nuovo separato verifica anche il default pgvector 0.8.7.
Il cleanup verifica la proprietà tramite label prima di eliminare esclusivamente
i container e volumi di quel run. Un errore resta nel report e non autorizza retry
contro i dati reali.

È un collaudo reale dei percorsi descritti, non un benchmark dei tre milioni di
embedding né una verifica di tutte le collazioni/estensioni del DB personale.
Per l'adozione sui dati effettivi resta necessario un restore su volumi separati:
il passaggio Debian → Alpine cambia anche librerie e collazioni; non riusare
alla cieca il data directory attivo. Il restore logico ricrea gli indici, senza
presumere integri gli indici preesistenti richiamati dagli advisory PostgreSQL.

### 4. Esito acquisito il 12 novembre

**PostgreSQL gestito e verificato:** motore compilato 16.16, libreria pgvector
0.8.7, esecuzione non root. Export con `archiveLoadVerified=true`, policy
`eligible=true`, `blocking=[]`, `counts={}`; scanner e database fresh registrati.

- Revisione della ricetta: `6e41cdf52941affebaf8c1718b40a3dd3dcc635a`.
- ID locale immagine: `sha256:4a6a0d1c6d7ed4948c222e138edf25413ded540234be5b9d22473b9e455153e1`.
- Digest config nell'archivio: `sha256:89668d3503b94bc5ba0cf8e016698542f7d9a1d700feab4fd6f9dc74733138d2`.
- SHA-256 archivio: `dbe2a842c558cc6c8ef6dcd5892adf92bff0427cc680e062a1b562323feb5d7f`.
- Run di compatibilità passato: `7726060ffd4143feb3dca68b221a683f`, sei controlli,
  cleanup senza errori, catalogo 0.8.1 preservato, default 0.8.7 verificato a parte.

Evidenze in `%USERPROFILE%/.codex/artifacts/inf-vm-04/vm046-postgres1616/`:
`reproduction-inputs/build-inputs.json`, `export/server.json`, archivio/SBOM/scan
ed `compatibility-scram/compatibility.json` con dump della sola fixture.
Nessun container di test rimasto attivo; nessun volume o servizio esistente
letto, fermato o modificato.

I primi run del collaudo sono conservati con esito fallito. Sono stati corretti
tre difetti della fixture: conversione del seed vector in array numerico,
readiness che intercettava il postmaster temporaneo di initdb e autenticazione
loopback lasciata trust da initdb. Il test definitivo attende PID 1 `postgres`
e imposta esplicitamente `--auth-host=scram-sha-256`; password corretta e
password errata sono state provate su entrambi i motori. Questi risultati
non sono stati sostituiti con un semplice retry del test invariato.

Il tag Docker ufficiale mancante non è più un impedimento per PostgreSQL.
Rimane separata la sostituzione coordinata dei servizi attivi e il restore
dei dati effettivi; non è stato effettuato alcun deploy o merge.
