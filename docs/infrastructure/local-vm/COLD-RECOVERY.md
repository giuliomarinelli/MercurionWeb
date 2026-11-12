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

## 4. Passi successivi, ancora da implementare e verificare

Dopo la lettura dell'inventario, preparare il recupero circoscritto della release:
verifica dei mount e volumi attesi, riconsegna degli stessi segreti, avvio dei
soli quattro server e prove di autenticazione/persistenza. Questa prima fase
non rende ancora eseguibile il cold recovery completo.

Solo dopo il recupero riuscito: riaprire il tunnel SSH amministrativo e completare
le due chiavi Meilisearch, poi bootstrap applicativo privato e collaudo. Il
collegamento pubblico Cloudflare rimane successivo alle verifiche richieste
in [ROADMAP.md](ROADMAP.md) e [ACCEPTANCE.md](ACCEPTANCE.md).

## 5. Verifiche ripetibili degli strumenti

Dalla root Web, senza VM e senza file privati:

```powershell
python -B -m unittest discover -s scripts/infrastructure -p test_preview_recovery_inventory.py
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
