# Recupero preview dopo spegnimento o riavvio

**12 novembre 2026 — obiettivo: staging funzionante su `preview.mercurion.app`.**
L'operatore ha confermato che la VM è stata spenta o riavviata dopo il primo
bootstrap. La policy Cloudflare Access è predisposta sul dominio; tunnel,
collegamento all'origine e collaudo applicativo non sono attestati da questa nota.

## 1. Perché non ripetere il bootstrap

PostgreSQL, Redis e Meilisearch conservano i dati nei volumi Docker. I file di
configurazione e i segreti attivi erano invece in `/run/mercurion-preview/<runId>`:
la loro presenza non sopravvive al riavvio del guest. Le configurazioni Compose
rimangono nella release protetta sotto `/opt/mercurion/releases/server-<runId>`.

Il bootstrap iniziale richiede risorse nuove e rifiuta quelle già presenti.
Non è un comando di ripartenza. Non rigenerare il file privato, non creare
password nuove e non eliminare container/volumi per aggirare le collisioni.

## 2. Vincoli del recupero

- Riutilizzare la stessa release e gli stessi valori del file privato conservato
  dall'operatore. Nessuna rotazione delle credenziali durante questo intervento.
- Identificare i quattro container originali e i tre volumi persistenti prima
  di mutazioni. Un'identità mancante o inattesa richiede diagnosi.
- Riconsegnare i segreti soltanto nel tmpfs verificato, con proprietari e permessi
  previsti dal contratto originale; non salvarli nei report o sul disco guest.
- Conservare database, indici, immagini e configurazioni della release originale.
- Nessun port publishing, modifica ACL/firewall, avvio applicativo o esposizione
  Cloudflare è implicito nel recupero dei server.
- Il successo richiederà nuovamente readiness/autenticazione e controlli dei dati;
  l'esito dell'inventario qui sotto non è un recupero completato.

## 3. Primo passo: inventario dopo il riavvio

### 3.1 Preparare la sessione

1. Salvare il lavoro e avviare normalmente `Mercurion-Server` da Hyper-V se spenta.
2. Sbloccare LUKS dalla console e attendere Ubuntu. Non avviare Compose o container.
3. Usare PowerShell Windows ordinaria, dalla root del repository Web. Conservare
   il bundle pubblico originale e il file privato; questo comando non apre
   `configuration.json` e non richiede la master key Meilisearch.
4. Identificare il bundle del bootstrap riuscito nel proprio registro. Nella
   postazione originale è `C:/Users/giuli/.codex/artifacts/inf-vm-04/vm043-servers-ready`,
   run `6c3e72e2e4064b71bd3bbffcff4d629c`. Su altra postazione sostituire il percorso
   con quello della propria copia verificata; non fabbricare manifest o ricevute.

### 3.2 Validare il piano senza SSH

```powershell
$taskServerBundle='C:/Users/giuli/.codex/artifacts/inf-vm-04/vm043-servers-ready'
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewRecoveryInventory.ps1 -BundlePath $taskServerBundle
```

Attesi `status=inventory-plan`, run-id originale e `sshStarted=false`,
`credentialsRead=false`, `servicesStarted=false`. Il bundle viene verificato
localmente con i controlli esistenti. Un errore ferma il percorso; non usare un
nuovo bundle con un nuovo run-id al posto di quello installato.

### 3.3 Acquisire il report guest

Solo dopo il piano riuscito, con VM accesa e LUKS sbloccato:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewRecoveryInventory.ps1 -BundlePath $taskServerBundle -Execute
```

Passphrase SSH e password sudo si inseriscono esclusivamente nel terminale.
Il comando stampa subito un `inspectionId` nuovo e il percorso del report.
Esegue codice pubblico tramite SSH, senza installazioni o download immagini.
Legge il manifest protetto, il risultato originale del bootstrap e i metadati
Docker tramite il socket Unix locale. Verifica i quattro ID originali,
label di progetto/run, assenza di port publishing e identità runtime di base.
Gli ID abbreviati a 12 caratteri delle ricevute originali sono risolti negli ID
completi attuali soltanto con corrispondenza univoca di tutti e quattro i container.

Docker filtra i campi sul daemon: `Config.Env` e label arbitrarie non vengono
richiesti. Dei segreti si controlla soltanto la presenza/metadati della directory,
mai contenuti o hash. L'unica scrittura sul guest è una nuova ricevuta pubblica
`recovery-inventory-<inspectionId>.json` nella release; la copia host va nella
sottocartella `receipts` del bundle. Non modifica servizi, volumi o segreti.

Attesi `status=inventoried`, `servicesStarted=false`, `credentialsRead=false`
e `reportPath`. `coldRecoveryCandidate=true` indica soltanto: `/run` è tmpfs,
la directory del run non esiste e i quattro container originali sono fermi.
Non certifica ancora integrità dei dati, correttezza delle credenziali o
sicurezza dell'avvio. Leggere il report prima della fase successiva.

### 3.4 Interpretare problemi o interruzioni

| Esito | Azione |
| --- | --- |
| SSH timeout | Usare la diagnosi del runbook; controllare LUKS/IP/ACL, senza cambiare chiavi |
| Manifest diverso | Confrontare bundle host e release installata; non correggere l'hash a mano |
| Container originali mancanti o diversi | Conservare lo stato e diagnosticare; nessuna ricreazione automatica |
| `secretRunPresent=true` o container attivi | Analizzare lo stato parziale; non sovrascrivere file o fermare servizi alla cieca |
| `status=failed` | Leggere `code`/`errorType` del report sanitizzato; non ripetere il bootstrap |
| Report non scaricato | Conservare `inspectionId`; recuperare la ricevuta già prodotta, senza rieseguire la misura |

Per il solo recupero del report, usare i propri valori stampati dal comando:

```powershell
$taskRunId=Read-Host 'runId originale'
$taskInspectionId=Read-Host 'inspectionId della misura gia eseguita'
$taskRecovered=Join-Path $taskServerBundle ('receipts/recovered-recovery-inventory-'+$taskInspectionId+'.json')
if (Test-Path -LiteralPath $taskRecovered) { throw 'Destinazione gia esistente: conservarla.' }
scp -o StrictHostKeyChecking=yes "mercurion-server:/opt/mercurion/releases/server-$taskRunId/recovery-inventory-$taskInspectionId.json" $taskRecovered
if ($LASTEXITCODE -ne 0) { throw 'Recupero ricevuta fallito: conservare errore e identificatori.' }
```

## 4. Recuperare i quattro server esistenti

**Stato:** strumento implementato e verificato localmente; esecuzione sulla VM
ancora da acquisire. L'inventario owner del 12 novembre è riuscito, con
`inspectionId=8606c6dead7f4b32976e15371f840a5f`: quattro container originali
fermi, tre volumi con label corrette, directory del run assente e `/run` tmpfs.
Questa ricevuta autorizza la preparazione del recupero, non ne certifica il successo.

### 4.1 Prerequisiti e piano

- VM accesa nello **stesso avvio** dell'inventario. Se è stata riavviata ancora,
  acquisire prima un nuovo inventario e usare il suo `inspectionId`.
- Stesso bundle del bootstrap riuscito e stesso file privato originale
  `%USERPROFILE%/.mercurion/preview/configuration.json`, salvato e chiuso nell'editor.
  Non rigenerare né modificare i segreti interni. Il codice non possiede una
  copia storica dei valori e non può dimostrare da solo che l'operatore non li
  abbia cambiati: riutilizzare la copia stabile conservata dopo il bootstrap.
- Nessun container applicativo aggiunto ai due progetti durante il recupero.
- Segreti reali soltanto nel processo locale dell'operatore e nel tmpfs guest;
  mai in chat, argv, transcript o file di report. Non attivare log verbosi SSH.

Da PowerShell Windows ordinaria, root Web:

```powershell
$taskServerBundle='C:/Users/giuli/.codex/artifacts/inf-vm-04/vm043-servers-ready'
$taskInspectionId='8606c6dead7f4b32976e15371f840a5f'
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewColdRecovery.ps1 -BundlePath $taskServerBundle -InspectionId $taskInspectionId
```

Su una replica sostituire entrambi gli identificatori con quelli del proprio
bootstrap/inventario. Atteso `cold-recovery-plan`, stesso run-id, nessuna lettura
di configurazione privata, nessun SSH o avvio. Il piano non dimostra che la VM
sia ancora nello stato rilevato: il comando operativo lo ricontrolla.

### 4.2 Esecuzione esplicita

Dopo il piano riuscito, nel terminale dell'operatore:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewColdRecovery.ps1 -BundlePath $taskServerBundle -InspectionId $taskInspectionId -Execute
```

Il wrapper verifica le ACL private già previste dal bootstrap. Passphrase SSH
e password sudo vengono richieste nel terminale. Stampa un nuovo `attemptId` e
il percorso dello stato locale prima delle operazioni guest.

Le fasi, nell'ordine, sono:

1. **public-helper-staging:** consegna di soli helper pubblici in una directory
   nuova del profilo SSH, fissati da SHA-256; il codice privilegiato verifica
   proprietario, permessi e hash prima di eseguire i byte letti.
2. **existing-resources-and-prepare:** controllo del manifest installato, hash
   del codice/configurazioni originali, ricevuta load/save e Compose originali.
   Rilegge container, immagini, mount, reti e volumi e confronta il boot-id.
   Rifiuta progetti con membri aggiuntivi, reti non private/IPv4 e volumi con
   driver/opzioni o proprietari logici inattesi. Non carica immagini.
3. Prima di qualunque avvio, verifica i marcatori già presenti: cluster
   PostgreSQL 16 (`PG_VERSION`, `global/pg_control`), manifest AOF Redis e
   directory dati Meilisearch non vuota. Un volume vuoto blocca il percorso:
   non si inizializza un database nuovo al suo posto. Questi marcatori non
   sostituiscono una prova completa di integrità o un backup/restore.
4. Riserva un solo tentativo per quel boot-id nella release protetta e prepara
   un nuovo inbox tmpfs sul **run-id originale**. La ricevuta `prepare` è
   scaricata sull'host. Nessun server è ancora avviato.
5. **stable-secrets-receive:** riconsegna via stdin SSH dei soli documenti dei
   quattro server, derivati dal file privato stabile. Provider, JWT e chiavi
   client non sono consegnati in questa fase.
6. **original-server-start-and-readiness:** ricontrolla risorse e dati, applica
   i file con UID/GID e permessi originali e rimuove il payload dall'inbox.
   Esegue `docker start` soltanto sugli stessi quattro ID: niente Compose up,
   create, pull, recreate, rimozione container/volumi o cambio credenziali.
7. Verifica ruolo applicativo PostgreSQL/vector, autenticazione Redis e
   keyevents, rifiuto anonimo NATS e accesso dei due consumer, health Meili,
   API amministrativa protetta e presenza dei quattro indici log con primary key
   `id`. Il controllo degli indici usa la master key solo nel processo guest;
   non crea indici o API key e non stampa il valore.
8. Scarica la ricevuta finale e rimuove i soli helper pubblici di questo tentativo.
   I segreti attivi rimangono su tmpfs; dati, immagini e ID originali restano.

Attesi `status=passed`, `servicesStarted=true`, `originalVolumesReused=true`,
`applicationServicesStarted=false`, `publishedPorts=false`, `reportPath` e
`meilisearchAddress`. La ricevuta guest contiene sei controlli riusciti,
quattro ID originali e i tre nomi di volume. `isolationAccepted=false` rimane:
questo recupero non chiude i residui di rete.

### 4.3 Errori, interruzioni e ricevute

Non rilanciare il comando completo dopo un fallimento. Conservare `attemptId`,
ultima fase, stato host `receipts/recovery-<attemptId>-state.json` e ricevute.
La prenotazione guest impedisce un secondo tentativo nello stesso avvio:
non cancellarla per forzare una ripartenza.

- Se fallisce **prepare**, leggere `recovery-<attemptId>-prepare.json`: una
  divergenza di dati, mount o identità non va risolta eliminando i controlli.
- Se fallisce **activate**, uno o più server potrebbero essere già avviati.
  La ricevuta `recovery-<attemptId>-activate.json` riporta i container attivi
  rilevati, oppure `resourceReadback=unavailable`. Non rimuove dati e non
  esegue rollback automatico: diagnosticare lo stato parziale prima di riprendere.
- Se fallisce soltanto il download o la pulizia degli helper, il recupero può
  essere già riuscito. Recuperare la ricevuta prima di qualsiasi nuovo avvio.

Per scaricare una ricevuta già prodotta, senza eseguire il recupero:

```powershell
$taskRunId=Read-Host 'runId originale'
$taskAttemptId=Read-Host 'attemptId stampato dal recupero'
$taskPhase=Read-Host 'Fase della ricevuta: prepare oppure activate'
if ($taskPhase -notin @('prepare','activate')) { throw 'Fase non ammessa.' }
$taskReceiptName='recovery-'+$taskAttemptId+'-'+$taskPhase+'.json'
$taskRecovered=Join-Path $taskServerBundle ('receipts/recovered-'+$taskReceiptName)
if (Test-Path -LiteralPath $taskRecovered) { throw 'Destinazione gia esistente: conservarla.' }
scp -o StrictHostKeyChecking=yes "mercurion-server:/opt/mercurion/releases/server-$taskRunId/$taskReceiptName" $taskRecovered
if ($LASTEXITCODE -ne 0) { throw 'Recupero ricevuta fallito: conservare output e identificatori.' }
```

### 4.4 Dopo il successo

Usare il **nuovo indirizzo Meilisearch della ricevuta** per riaprire il tunnel
amministrativo descritto nel runbook, sezione 10: Docker può riassegnare gli IP.
Completare quindi le due chiavi client a 90 giorni (sezione 11.2), ancora non
create. Il successivo task è il bootstrap applicativo privato con schema/dati
e verifiche di login/API/inferenza/realtime. Collegamento Cloudflare e collaudo
pubblico rimangono successivi ai gate documentati in roadmap/acceptance.

## 5. Verifiche ripetibili degli strumenti

Dalla root Web, senza VM e senza file privati:

```powershell
python -B -m unittest discover -s scripts/infrastructure -p test_preview_recovery_inventory.py
python -B -m unittest discover -s scripts/infrastructure -p test_preview_cold_recovery.py
python -B scripts/check-local-vm-runbook.py
```

Dieci test di contratto sono eseguiti normalmente. Due fixture sono opt-in:
una verifica i template reali sul Docker locale (crea e rimuove solo il proprio
container mai avviato e il proprio volume vuoto); l'altra verifica metadati
root e `/run` tmpfs in un contenitore Linux isolato. Richiedono l'immagine
`python:3.11-slim-trixie` già locale; nessun pull automatico.

```powershell
$env:PREVIEW_RECOVERY_DOCKER_FIXTURE='1'
try { python -B -m unittest discover -s scripts/infrastructure -p test_preview_recovery_inventory.py } finally { Remove-Item Env:PREVIEW_RECOVERY_DOCKER_FIXTURE }
docker --context desktop-linux run --rm --network none --read-only --tmpfs /run --tmpfs /opt --tmpfs /tmp --env PREVIEW_RECOVERY_FIXTURE=1 --volume "${PWD}:/workspace:ro" --workdir /workspace --pull never python:3.11-slim-trixie python -B -m unittest discover -s scripts/infrastructure -p test_preview_recovery_inventory.py
```

Queste prove locali non costituiscono evidenza della VM. La CI include i test
di contratto; le misure reali sono registrate soltanto dopo l'esecuzione owner.


Il recupero ha inoltre fixture opt-in ripetibili, sempre locali e sintetiche:

```powershell
$env:PREVIEW_COLD_DOCKER_FIXTURE='1'
try { python -B -m unittest discover -s scripts/infrastructure -p test_preview_cold_recovery.py } finally { Remove-Item Env:PREVIEW_COLD_DOCKER_FIXTURE }
docker --context desktop-linux run --rm --pull never --network none --read-only --tmpfs /run --tmpfs /opt --tmpfs /tmp --env PREVIEW_COLD_LINUX_FIXTURE=1 --volume "${PWD}:/workspace:ro" --workdir /workspace python:3.11-slim-trixie python -B -m unittest discover -s scripts/infrastructure -p test_preview_cold_recovery.py
```

La prima verifica il riavvio dello stesso container dopo sostituzione dell'inode
di un bind read-only; la seconda verifica il loader privilegiato con hash e
permessi reali, compreso il rifiuto di helper alterati. Nessuna usa la VM o
credenziali reali. Per verificare i marcatori con le immagini server effettive:

```powershell
$taskPostgres=(Get-Content -Raw (Join-Path $taskServerBundle 'servers/postgres/server.json') | ConvertFrom-Json).imageId
$taskRedis=(Get-Content -Raw (Join-Path $taskServerBundle 'servers/redis/server.json') | ConvertFrom-Json).imageId
$taskMeili=(Get-Content -Raw (Join-Path $taskServerBundle 'servers/meilisearch/server.json') | ConvertFrom-Json).imageId
$taskQaReport=Join-Path $taskServerBundle ('cold-marker-qa-'+[Guid]::NewGuid().ToString('N')+'.json')
python -B scripts/infrastructure/qa_preview_recovery_markers.py --postgres $taskPostgres --redis $taskRedis --meilisearch $taskMeili --report $taskQaReport
```

Serve anche l'immagine helper locale già fissata nello smoke esistente; in
assenza il test si ferma, non la scarica. Gli imageId sopra identificano il
Docker dell'host che ha esportato il bundle: su un altro daemon occorre prima
la consegna/load verificata e i suoi ID locali. La fixture crea solo risorse
proprie, credenziali sintetiche e volumi temporanei tmpfs; non pubblica porte.
Il suo lettore dei marcatori usa root con DAC_OVERRIDE soltanto nella fixture
per leggere directory di UID diversi, come sudo sul guest; i server mantengono
i propri UID e non acquisiscono privilegi aggiuntivi. Attesi report passed,
`checks.meilisearch.persistenceMarkers=true` e zero errori di cleanup.
