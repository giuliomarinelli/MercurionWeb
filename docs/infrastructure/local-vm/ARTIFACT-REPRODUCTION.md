# Riprodurre i materiali pubblici di build e consegna

Parte del [runbook](RUNBOOK.md), stato 11 novembre 2026. Tutti i comandi sono
**host Windows, PowerShell ordinaria, root MercurionWeb**. Nessun comando di
questa pagina legge `configuration.json`, dotenv operativi o PEM personali.
Nessuna build viene eseguita sulla VM. Non è necessario usare AI.

La preparazione originaria usava alcuni script monouso nel profilo dell'autore.
Le operazioni equivalenti sono ora nel repository in
`scripts/infrastructure/reproduce_preview_artifacts.py`: materializzazione Web,
export broker e assemblaggio. Gli exporter e il coordinatore originali rimangono
autorevoli per schema, SBOM, scan e identità. Questo consolidamento non cambia
le immagini già avviate sulla VM.

## 1. Identificare una release, prima di compilare

Per ripetere la revisione storica selezionata:

```powershell
$taskWebSha='d227dbf4216ce2ceb865a9b315ae52169c9e8c6e'
$taskToxSha='d506101ec27c985ef4ddb280266bfcdc4b6bf1c4'
$taskWebCi=42995928107
$taskToxCi=42858304379
$taskToxRepo='C:/.project_repo/MercurionTox21'
$taskRelease=Join-Path ([Environment]::GetFolderPath('UserProfile')) ('.mercurion/artifacts/reproduction-'+[Guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($taskRelease)
$taskPreviousDockerContext=$env:DOCKER_CONTEXT
$env:DOCKER_CONTEXT='desktop-linux'
```

Non assumere che `HEAD`, «ultimo push» e revisione del modello coincidano.
Per una nuova release scegliere nuovi SHA e run, mantenendo i due repository
indipendenti. Annotare la revisione degli strumenti con `git rev-parse HEAD`.
Quella corrente può essere più recente degli SHA delle immagini, perché contiene
questa documentazione e le correzioni della consegna.

Controllare i run autentici, non soltanto i badge della branch:

```powershell
gh run view $taskWebCi --repo giuliomarinelli/MercurionWeb --json headSha,status,conclusion,jobs,url
gh run view $taskToxCi --repo giuliomarinelli/MercurionTox21 --json headSha,status,conclusion,jobs,url
```

Richiedere SHA esatto, completed/success e Required gate. Web richiede il
percorso **full**, i prerequisiti Windows/Linux, test, build/browser, sei target
Web e quattro server. Un risultato metadata/duplicate da solo non certifica
una nuova build. Il comando assemble in fondo verifica questi esiti via GitHub
CLI. Se i run sono scaduti/non osservabili, ottenere una certificazione CI
nuova; non scrivere `ciVerification=passed` a mano per aggirare il controllo.
L'assemblatore non avvia o modifica CI, reti o VM.

## 2. Materializzare Web dai soli blob Git

```powershell
$taskWebSource=Join-Path $taskRelease 'web-source'
python -B scripts/infrastructure/reproduce_preview_artifacts.py materialize-web --revision $taskWebSha --output $taskWebSource
if ($LASTEXITCODE -ne 0) { throw 'Materializzazione Web fallita.' }
$taskWebVersion=(Get-Content -Raw -LiteralPath (Join-Path $taskWebSource 'package.json') | ConvertFrom-Json).version
```

Il contesto contiene solo percorsi Git consentiti della revisione: WebNg,
WebNode, packages, scripts e i tre file workspace. Esclude file env, PEM/key/PFX,
symlink e overlay del worktree. Il manifest `<directory>-manifest.json` registra
hash e `worktreeOverlay=false`. Il tool non copia `.env` ignorati e non richiede
un checkout temporaneo della branch. Non usare `Copy-Item -Recurse` del progetto
personale come equivalente.

Compilare i due target **staging**, non test o production:

```powershell
$taskWebExports=Join-Path $taskRelease 'web'
foreach ($taskRole in @('web-node','web-ng')) {
    $taskDockerfile=if ($taskRole -eq 'web-node') {'MercurionWebNode/Dockerfile'} else {'MercurionWebNg/Dockerfile'}
    $taskTag='mercurion-preview-'+$taskRole+':'+$taskWebSha.Substring(0,8)
    docker --context desktop-linux build --platform linux/amd64 --file (Join-Path $taskWebSource $taskDockerfile) --target staging --build-arg "BUILD_VERSION=$taskWebVersion" --build-arg "BUILD_REVISION=$taskWebSha" --tag $taskTag $taskWebSource
    if ($LASTEXITCODE -ne 0) { throw ('Build fallita: '+$taskRole) }
    python -B scripts/export-web-container.py --image $taskTag --component $taskRole --revision $taskWebSha --version $taskWebVersion --target staging --output (Join-Path $taskWebExports $taskRole) --cache (Join-Path $taskRelease 'trivy-cache')
    if ($LASTEXITCODE -ne 0) { throw ('Export o scan respinto: '+$taskRole) }
}
```

L'export produce `image.tar`, `component.json`, audit runtime, load.log,
CycloneDX, report vulnerabilità e policy-result. Verifica label e identità
compilata; per Nest controlla runtime/dependency inventory e assenza toolchain
dev, per Angular HTML/identità tramite loopback del proprio container effimero.
Non prova login, rendering browser o provider reali. Non è autorizzazione a
usare un archivio con finding: qualunque severity o report malformato blocca.

## 3. Modello Tox21 esistente: niente nuovo training

Serve una directory contenente **esattamente** `weights.pt`, `thresholds.json`,
`manifest.json`, non il solo checkpoint. Il manifest dichiara rete, dimensioni,
fingerprint, ordine delle label, versione ed export revision; soglie e checksum
sono verificati dal builder/runtime. Non copiare dataset o componenti di training
nel container finale.

Pacchetto storico riusato: versione `qa-6f19c86`, export revision
`6f19c869a0d99209fc78eb6a909d1f45897118a8`.

| File | SHA-256 selezionato |
| --- | --- |
| weights.pt | `cbe915a168b83829e1766655dfd2d9d6ed7047638008f03e0759e0814f700104` |
| thresholds.json | `075e33c82c3ea86ef429513a582ce21d2c37094f10a91aedb59a957005c46606` |

**Fonte primaria:** propria copia archiviata del pacchetto verificato. Alternativa
finché l'artifact esiste: scaricare dal run Tox21 scelto, con il nome che include
l'attempt del run, e controllare i file estratti:

```powershell
$taskModel=Join-Path $taskRelease 'model'
$taskToxAttempt=gh run view $taskToxCi --repo giuliomarinelli/MercurionTox21 --json attempt --jq .attempt
if ($LASTEXITCODE -ne 0) { throw 'Attempt CI Tox21 non disponibile.' }
gh run download $taskToxCi --repo giuliomarinelli/MercurionTox21 --name ('tox21-model-'+$taskToxSha+'-'+$taskToxAttempt) --dir $taskModel
if ($LASTEXITCODE -ne 0) { throw 'Pacchetto non disponibile: usare una copia archiviata e verificata.' }
Get-ChildItem -LiteralPath $taskModel -File | Select-Object Name,Length
if ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $taskModel 'weights.pt')).Hash.ToLowerInvariant() -ne 'cbe915a168b83829e1766655dfd2d9d6ed7047638008f03e0759e0814f700104') { throw 'Pesi diversi dal pacchetto selezionato.' }
if ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $taskModel 'thresholds.json')).Hash.ToLowerInvariant() -ne '075e33c82c3ea86ef429513a582ce21d2c37094f10a91aedb59a957005c46606') { throw 'Soglie diverse dal pacchetto selezionato.' }
```

Se l'artifact non è più disponibile, il repository non può ricreare da solo
i pesi selezionati: è un input scientifico da conservare, come l'ISO o i tar
di release. Non sostituirlo con il risultato di un nuovo training o ricalcolo
soglie fingendo la stessa identità. L'export di un altro modello è un'attività
distinta, coperta dal repository Tox21. I tar applicativi GitHub non contengono
necessariamente l'immagine trasferibile.

Il pacchetto esportato dal run corrente si chiama normalmente `ci-qa` e riporta
la revisione di quel run nel manifest. Anche quando i due hash coincidono,
**non è byte-identico** al manifest storico `qa-6f19c86`. Se si usa questa
alternativa, conservarne nome, manifest ed export revision reali nel candidato:
è una ricostruzione con lo stesso materiale numerico selezionato, non lo stesso
pacchetto storico. Per replicare esattamente quest'ultimo serve la sua copia
archiviata originale; non riscrivere manifest o soglie per simulare la provenienza.

### 3.1 Immagine Tox21 staging

```powershell
$taskToxSource=Join-Path $taskRelease 'tox21-source'
$taskToxExport=Join-Path $taskRelease 'tox21'
$taskToxVersion='vm039-'+$taskToxSha.Substring(0,12)
$taskToxTag='mercurion-preview-tox21:'+$taskToxSha.Substring(0,8)
python -B scripts/infrastructure/materialize_tox21_candidate.py --source $taskToxRepo --revision $taskToxSha --output $taskToxSource
if ($LASTEXITCODE -ne 0) { throw 'Materializzazione Tox21 fallita.' }
docker --context desktop-linux build --platform linux/amd64 --target staging --build-context "model_package=$taskModel" --build-arg "BUILD_VERSION=$taskToxVersion" --build-arg "BUILD_REVISION=$taskToxSha" --tag $taskToxTag $taskToxSource
if ($LASTEXITCODE -ne 0) { throw 'Build Tox21 fallita.' }
python -B (Join-Path $taskToxSource 'scripts/check_container_image.py') $taskToxTag --target staging --revision $taskToxSha --version $taskToxVersion
if ($LASTEXITCODE -ne 0) { throw 'Audit Tox21 fallito.' }
python -B (Join-Path $taskToxSource 'scripts/container_evidence.py') --image $taskToxTag --output $taskToxExport --cache (Join-Path $taskRelease 'trivy-cache')
if ($LASTEXITCODE -ne 0) { throw 'Export Tox21 respinto.' }
```

Il codice Tox21 può avere revisione diversa dall'export del modello. L'immagine
mantiene modello e runtime di inferenza, senza training. La readiness reale del
worker è RPC/NATS, non HTTP. Non montare sorgenti sopra l'immagine per compensare
moduli bootstrap mancanti.

## 4. Ricette server: copiare Git senza conversione di byte

Il seguente helper PowerShell copia un blob Git tramite Python, evitando la
ricodifica delle pipeline native PowerShell 5.1. Non usa file del worktree:

```powershell
function Copy-TaskGitBlob {
    param([string]$Revision,[string]$RepoFile,[string]$Destination)
    python -B -c "import pathlib,subprocess,sys; p=pathlib.Path(sys.argv[3]); p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(subprocess.check_output(['git','show',sys.argv[1]+':'+sys.argv[2]]))" $Revision $RepoFile $Destination
    if ($LASTEXITCODE -ne 0) { throw ('Copia blob fallita: '+$RepoFile) }
}
$taskServerBuild=Join-Path $taskRelease 'server-build'
Copy-TaskGitBlob $taskWebSha 'deployment/local-vm/runtime/Dockerfile' (Join-Path $taskServerBuild 'Dockerfile')
```

Scaricare il solo archivio pgvector fissato dalla ricetta e verificarlo prima
della build:

```powershell
$taskPgvector=Join-Path $taskServerBuild 'pgvector.tar.gz'
Invoke-WebRequest -UseBasicParsing -Uri 'https://codeload.github.com/pgvector/pgvector/tar.gz/f37c13f68b57d2c3472b2214fbcff699d6d34876' -OutFile $taskPgvector
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $taskPgvector).Hash.ToLowerInvariant() -ne '83d673c3b287cddbf3879f86215f043f2c2b56c69d37b2a77504910db1ed6e56') { throw 'Archivio pgvector inatteso.' }
$taskServerExports=Join-Path $taskRelease 'servers'
foreach ($taskRole in @('postgres','redis','meilisearch','edge')) {
    $taskTag='mercurion-preview-'+$taskRole+':'+$taskWebSha.Substring(0,8)
    docker --context desktop-linux build --platform linux/amd64 --target $taskRole --build-arg "BUILD_REVISION=$taskWebSha" --tag $taskTag $taskServerBuild
    if ($LASTEXITCODE -ne 0) { throw ('Build server fallita: '+$taskRole) }
    python -B scripts/infrastructure/export_preview_service.py --role $taskRole --image $taskTag --revision $taskWebSha --output (Join-Path $taskServerExports $taskRole) --cache (Join-Path $taskRelease 'trivy-cache')
    if ($LASTEXITCODE -ne 0) { throw ('Export server respinto: '+$taskRole) }
}
```

Versioni della ricetta selezionata: PostgreSQL 16.15/pgvector 0.8.7, Redis
7.2.17, Meilisearch 1.56.2, nginx edge dalla base fissata nel Dockerfile.
Le immagini includono i fix dei pacchetti OS registrati nel sorgente, senza
rimozione di metadati per nascondere CVE. I quattro `server.json` includono
archivio/SBOM/scan, identità e prova load verificata. `edge` viene preparato
ma **non** avviato dal primo bootstrap server.

## 5. Broker NATS corretto

Il broker ufficiale selezionato aveva un finding UNKNOWN: non viene accettato
con deroga. La ricetta Mercurion ricompila NATS 2.15.2 con il fix crypto upstream
già fissato nel Dockerfile, mantenendo metadati Go/SBOM. Costruire sull'host:

```powershell
$taskNatsBuild=Join-Path $taskRelease 'nats-build'
Copy-TaskGitBlob $taskWebSha 'deployment/local-vm/pilot/nats.Dockerfile' (Join-Path $taskNatsBuild 'Dockerfile')
$taskNatsSource=Join-Path $taskNatsBuild 'nats-source.tar.gz'
Invoke-WebRequest -UseBasicParsing -Uri 'https://codeload.github.com/nats-io/nats-server/tar.gz/5a815f11a911efa2c88fd1dbfb18ed89a449bfc1' -OutFile $taskNatsSource
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $taskNatsSource).Hash.ToLowerInvariant() -ne 'd67ddd88f4a0ba9482bd17cb1e5f4764e77cac365d13369d0e43ebe8bbadf8ed') { throw 'Archivio NATS inatteso.' }
$taskNatsTag='mercurion-nats:2.15.2-crypto.1'
docker --context desktop-linux build --platform linux/amd64 --tag $taskNatsTag $taskNatsBuild
if ($LASTEXITCODE -ne 0) { throw 'Build NATS fallita.' }
$taskBroker=Join-Path $taskRelease 'broker'
python -B scripts/infrastructure/reproduce_preview_artifacts.py export-broker --image $taskNatsTag --output $taskBroker --cache (Join-Path $taskRelease 'trivy-cache')
if ($LASTEXITCODE -ne 0) { throw 'Export/scan/provenance broker respinti.' }
```

Il tool verifica provenance upstream NATS e crypto, target gobinary presente,
SBOM e **zero** finding prima di scrivere `securityEligible=true`. Il report
Trivy completo è autorevole: il solo exit 0 di Trivy senza policy non è un gate.
Ogni exporter usa un cache DB effimero nuovo; il precedente `NextUpdate` non
viene scambiato per refresh. Conservare scanner, UpdatedAt e DownloadedAt.

## 6. Collaudi host, prima della consegna

Per la prova Tox21 reale con credenziali sintetiche e rete privata:

```powershell
python -B scripts/infrastructure/smoke_tox21_candidate.py --image $taskToxTag --broker-image $taskNatsTag --revision $taskToxSha --version $taskToxVersion --report (Join-Path $taskRelease 'tox21-smoke.json')
```

Attesi tre lifecycle (start/restart/recreate), risposte scientifiche reali e nove
negazioni NATS, stop puliti e cleanup senza errori. PubChem in quel pilot verifica
la richiesta invalida, non il provider remoto. Non cambiare i flag JWT per far
passare il test. Per la precedente prova temporanea su VM leggere
[TOX21-VM-PILOT.md](TOX21-VM-PILOT.md): è distinta dal bootstrap persistente.

Le procedure curl hanno QA locale opt-in, con file esclusivamente sintetici:

```powershell
$taskQaImage='mercurion-preview-meilisearch:'+$taskWebSha.Substring(0,8)
python -B scripts/infrastructure/qa_preview_meili_indexes.py --execute --image $taskQaImage --output (Join-Path $taskRelease 'qa-meili-indexes')
python -B scripts/infrastructure/qa_preview_meili_client_keys.py --execute --image $taskQaImage --output (Join-Path $taskRelease 'qa-meili-keys')
```

Usano soltanto Docker Desktop locale, la propria immagine già verificata, un
listener effimero su loopback Windows e cleanup per label. Il QA chiavi crea
cartelle **QA** con ACL private nel percorso scelto; non legge il configuration.json
operativo. Non sono test obbligatori da rilanciare ogni giorno né operazioni
sulla VM. Gli output devono stare sotto il profilo dell'utente per le guardie.

## 7. Assemblare il candidato, senza autenticazione AI

```powershell
$taskCandidate=Join-Path $taskRelease 'preview-candidate'
python -B scripts/infrastructure/reproduce_preview_artifacts.py assemble --revision $taskWebSha --web $taskWebExports --tox21 $taskToxExport --servers $taskServerExports --broker $taskBroker --web-ci $taskWebCi --tox21-ci $taskToxCi --output $taskCandidate --check-only
if ($LASTEXITCODE -ne 0) { throw 'Input o CI non validi.' }
python -B scripts/infrastructure/reproduce_preview_artifacts.py assemble --revision $taskWebSha --web $taskWebExports --tox21 $taskToxExport --servers $taskServerExports --broker $taskBroker --web-ci $taskWebCi --tox21-ci $taskToxCi --output $taskCandidate
if ($LASTEXITCODE -ne 0) { throw 'Assemblaggio candidato fallito.' }
$taskServerBundle=Join-Path $taskRelease 'servers-ready'
python -B scripts/infrastructure/preview_server_bundle.py prepare --candidate $taskCandidate --output $taskServerBundle
if ($LASTEXITCODE -ne 0) { throw 'Bundle server non valido.' }
$env:DOCKER_CONTEXT=$taskPreviousDockerContext
```

In caso di interruzione ripristinare comunque il solo valore di DOCKER_CONTEXT
del proprio terminale. Nessun `docker context use` globale è richiesto.
`--check-only` verifica input/CI senza scrivere output, trasferire o avviare VM.
Le destinazioni vere devono essere nuove: non assemblare sopra un vecchio run.

Struttura del candidato a otto immagini:

```text
preview-candidate/
  components/{web-ng,web-node,tox21}/
    image.tar, component.json, runtime-audit.json, load.log,
    sbom.cdx.json, vulnerabilities.json, policy-result.json
  servers/{postgres,redis,meilisearch,edge}/
    image.tar, server.json, sbom.cdx.json, vulnerabilities.json, policy-result.json
  servers/nats/
    image.tar, broker.json, sbom.cdx.json, vulnerabilities.json, policy-result.json
  coordinated.json
  deployment/local-vm/{operational/... ,runtime/Dockerfile,pilot/nats.Dockerfile}
  preview-candidate.json
```

Il bundle `servers-ready` seleziona solo postgres/redis/meili/nats e gli helper
guest autorizzati, con run-id nuovo, manifest e hash chiusi. Il suo `toolRevision`
è la revisione Git degli strumenti; `releaseRevision` quella delle immagini.
I componenti applicativi restano esclusi dall'avvio server iniziale.

## 8. Conservazione, nuove postazioni e limiti di riproducibilità

- Conservare pacchetto modello, tar pubblici, manifest e ricevute su disco host
  e su una copia indipendente. Gli artifact Actions hanno retention limitata.
- Conservare separatamente configurazione privata, backup privati e password
  manager. I tar pubblici non contengono quelle credenziali e non le ripristinano.
- Digest di config OCI, hash di image.tar, manifest/indice Docker e image ID
  locale sono identità diverse. La VM usa load/save roundtrip sul config, non
  presume che il suo Docker restituisca l'ID dell'host.
- Repository APT/Alpine/Go, registry e DB CVE possono evolvere: il pin del sorgente
  non garantisce ricostruzione byte-identica di tutti gli strati per sempre.
  Per conservare gli esatti bit servono gli archivi, oltre al sorgente.
- Se un vecchio pacchetto non è disponibile o un nuovo scan fallisce, preservare
  il risultato e aggiornare deliberatamente la ricetta. Non ignorare CVE o
  cambiare i metadati di provenance per presentare la stessa release.
- Il recupero da zero su una macchina priva di cache è ancora una verifica di
  accettazione aperta: la guida rende espliciti input e comandi, non inventa
  una prova di disaster recovery mai eseguita.

Tornare alla [sezione 9 del runbook](RUNBOOK.md#9-primo-bootstrap-dei-quattro-server-solo-su-risorse-nuove)
solo quando tutti i risultati della preparazione sono validi. Le applicazioni
complete non si avviano con un `compose up` manuale dei manifest preparatori.
