# VM-041 — Trasferimento, load e prima prova RPC Tox21 sulla VM

## 1. Risultato atteso e perimetro

L'owner autorizza la prosecuzione verso Tox21 funzionante sulla VM.
Questo task accorpa trasporto, integrità, load e collaudo RPC reale.
Riutilizza il candidato staging VM-039 e il preflight VM-040; Tox21 e modello
rimangono invariati. Non è una release coordinata Web completa.

Il pilot usa NATS e Tox21 reali su una rete Docker temporanea `internal`,
senza porte pubblicate, egress, Cloudflare o credenziali operative. Due
credenziali sintetiche distinte sono generate nel guest e consegnate su
tmpfs a broker/worker/requester; non passano in argv, Config.Env o report.
Il worker esegue il vero launcher `python -m bootstrap_secrets`, senza
overlay dei sorgenti. Il requester è un client Python, non Nest.

La prova è autorizzata in questo perimetro circoscritto. H-05/A-05/A-30 e
accettazione complessiva dell'isolamento restano aperti. Nessuna modifica a
Netplan, ACL Hyper-V, router o Kaspersky. Lo stack operativo continuativo e
il traffico PubChem reale restano passi successivi.

## 2. Correzione necessaria al broker

La scansione del vecchio NATS 2.12.1 ha rilevato 84 finding (anche CRITICAL,
LOW e UNKNOWN): immagine respinta, non trasferita. La release ufficiale
[2.15.2](https://github.com/nats-io/nats-server/releases/tag/v2.15.2), digest
`b6c40dcfe5ae9174dcafa9c43f800afb93b8b0ffcde02ac00efc6b66031d9a50`,
riduce il risultato a un finding UNKNOWN: `GO-2026-5932` su x/crypto v0.58.0.
Anche questa immagine è respinta dalla policy strict.

La [ricetta locale](../../../deployment/local-vm/pilot/nats.Dockerfile)
ricompila la stessa release, con l'[intervento upstream crypto](https://github.com/golang/crypto/commit/2f1f834330b2d36ab3db8bfb33aaa1ac16794588)
che separa il modulo OpenPGP deprecato. Aggiornamento reale della dipendenza,
senza ignorare finding o rimuovere metadati dal binario/SBOM.

- Source NATS: `5a815f11a911efa2c88fd1dbfb18ed89a449bfc1`.
- Tar sorgente: `https://codeload.github.com/nats-io/nats-server/tar.gz/5a815f11a911efa2c88fd1dbfb18ed89a449bfc1`.
- SHA256 sorgente: `d67ddd88f4a0ba9482bd17cb1e5f4764e77cac365d13369d0e43ebe8bbadf8ed`.
- x/crypto: `v0.58.1-0.20261009181718-2f1f834330b2`.
- Builder Go 1.27.3 fissato per digest; moduli verificati con `go mod verify`.
- Runtime scratch, UID/GID 10021, versione `2.15.2-mercurion-crypto.1`.
- Config digest: `sha256:2523173dcd72c12fea4470cb7ca961f96d0ecbf5b7c269681893ccde9d23eb17`.
- ID Docker locale: `sha256:ca1d4783151aab46ae6b4e0d62d9bab3614fffc8b2dc1e557bac27b4490163df`.

SBOM CycloneDX e scan Trivy completi sul tar finale: target gobinary presente,
zero finding a tutte le gravità. Report respinti e finale sono conservati
separatamente sotto `inf-vm-04/vm041-tox21`; nessuna eccezione aggiunta.
La ricompilazione è un artefatto Mercurion derivato da upstream, non
un'immagine ufficiale NATS distribuita senza modifiche.

### Riprodurre build, export e scan del broker sull'host

Da root Web, PowerShell; scegliere una directory nuova. Il contesto contiene
soltanto il tar upstream verificato e il Dockerfile. La VM riceverà solo il
runtime finale, non builder, toolchain o sorgenti.

```powershell
$taskNatsRoot=Join-Path ([Environment]::GetFolderPath('UserProfile')) ('.codex/artifacts/nats-pilot-'+[Guid]::NewGuid().ToString('N'))
foreach ($taskPart in @('build','broker','cache')) { [void][IO.Directory]::CreateDirectory((Join-Path $taskNatsRoot $taskPart)) }
$taskSourceTar=Join-Path $taskNatsRoot 'build/nats-source.tar.gz'
Invoke-WebRequest -UseBasicParsing -Uri 'https://codeload.github.com/nats-io/nats-server/tar.gz/5a815f11a911efa2c88fd1dbfb18ed89a449bfc1' -OutFile $taskSourceTar
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $taskSourceTar).Hash.ToLowerInvariant() -ne 'd67ddd88f4a0ba9482bd17cb1e5f4764e77cac365d13369d0e43ebe8bbadf8ed') { throw 'Source checksum mismatch' }
Copy-Item -LiteralPath deployment/local-vm/pilot/nats.Dockerfile -Destination (Join-Path $taskNatsRoot 'build/Dockerfile')
docker --context desktop-linux build --platform linux/amd64 --tag mercurion-nats:2.15.2-crypto.1 (Join-Path $taskNatsRoot 'build')
if ($LASTEXITCODE -ne 0) { throw 'NATS build failed' }
$taskNatsId=docker --context desktop-linux image inspect mercurion-nats:2.15.2-crypto.1 --format '{{.Id}}'
if ($LASTEXITCODE -ne 0) { throw 'NATS image identity unavailable' }
docker --context desktop-linux save --output (Join-Path $taskNatsRoot 'broker/image.tar') $taskNatsId
if ($LASTEXITCODE -ne 0) { throw 'NATS export failed' }
$taskScanner='aquasec/trivy@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb'
docker --context desktop-linux run --rm --mount "type=bind,src=$taskNatsRoot/broker,dst=/evidence" --mount "type=bind,src=$taskNatsRoot/cache,dst=/cache" $taskScanner image --quiet --input /evidence/image.tar --cache-dir /cache --scanners vuln --ignorefile /dev/null --format json --output /evidence/vulnerabilities.json
if ($LASTEXITCODE -ne 0) { throw 'NATS scan failed' }
docker --context desktop-linux run --rm --mount "type=bind,src=$taskNatsRoot/broker,dst=/evidence" --mount "type=bind,src=$taskNatsRoot/cache,dst=/cache" $taskScanner image --quiet --input /evidence/image.tar --cache-dir /cache --format cyclonedx --output /evidence/sbom.cdx.json
if ($LASTEXITCODE -ne 0) { throw 'NATS SBOM failed' }
```

Poi il comando `prepare` del pilot verifica effettivamente zero finding,
SBOM e digest; il solo exit code Trivy senza `--exit-code` non è un gate.
Il config digest è l'identità da confrontare dopo una riproduzione; l'ID
manifest Docker può cambiare per i metadati di build/attestazione.

## 3. Prove host prima del trasferimento

Trentadue test mirati passati: coordinatore (13), candidato (7), trasporto
(7), pilot VM (5). Controllano anche finding LOW/UNKNOWN senza fix, hash,
path traversal, script alterati, preflight incoerente, load ambiguo e
config digest diverso dopo il roundtrip.

Load/save reali sull'host per entrambe le immagini verificano il digest
del config estratto dall'archivio risultante. Non si confronta il solo ID
Docker: il suo formato può differire fra engine/containerd.

Collaudo host con broker corretto, run `8f567f84c7d54b409a087025d60c0781`:
tre lifecycle, cinque subject per fase, nove negazioni NATS esplicite,
tre stop puliti e nessun errore di cleanup. Nessun servizio utente fermato.
Wrapper verificato su Windows PowerShell 5.1, sia senza Execute sia con
SCP/SSH/SCP simulati e controllo dei soli file consentiti.

## 4. Bundle e procedura owner

Bundle corrente, fuori da Git:

```text
C:/Users/giuli/.codex/artifacts/inf-vm-04/vm041-tox21/pilot-ready
```

Run trasporto: `715f719bb1b14a4b87fb1c42e1a54647`.
Contiene candidato VM-040, broker corretto con scan/SBOM, preflight acquisito
e cinque script verificati per hash. Nessun dotenv, PEM, dataset o segreto.
Per rigenerarlo usare `run_tox21_vm_pilot.py prepare` con directory di output
nuova: `--bundle`, `--preflight`, `--broker` e `--output` sono espliciti.
Nessuna build/download è eseguita dalla VM.

1. Avviare la VM e sbloccare LUKS, se necessario.
2. Da PowerShell Windows normale eseguire questa singola riga:

   ```powershell
   powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Invoke-Tox21VmPilot.ps1 -PilotPath C:/Users/giuli/.codex/artifacts/inf-vm-04/vm041-tox21/pilot-ready -Execute
   ```

3. Inserire passphrase SSH e password sudo soltanto nel terminale. Nessun
   reindirizzamento del dialogo interattivo; `StrictHostKeyChecking=yes`.
4. Attendere le fasi `loading-tox21`, `loading-nats`, `rpc-lifecycle`.
   Lo script rilegge hash e preflight corrente prima dei load. Dopo ogni
   load salva un archivio di readback e controlla il config digest.
   I tar senza tag non spostano riferimenti di immagini esistenti.
5. Il collaudo verifica inferenza reale, tre API RDKit, validazione PubChem
   su input incompleto, SMILES invalido e rifiuto esplicito delle credenziali
   NATS assenti/errate/utente sconosciuto, su initial/restart/recreate.
6. Il runner controlla stop e log, poi rimuove soltanto container, rete e
   volume tmpfs con la propria label/run ID, anche in caso di errore.
   Immagini e archivi rimangono disponibili; il pilot non resta in servizio.
7. Il wrapper recupera il report via SCP e stampa riepilogo e `reportPath`.
   Attesi `status: passed`, `phase: finished`, due roundtrip verificati,
   tre lifecycle, `cleanupErrors: []`, `publishedPorts: false`.
8. In caso di errore conservare report/ultima fase; non rilanciare, pulire
   risorse generiche o cambiare filtri per superarlo. Nessun retry automatico
   di trasporto/load. Solo l'attesa delle subscription ha retry limitato.

Se il guest ha già stampato `passed` e fallisce soltanto l'ultimo SCP,
recuperare il file esistente senza ripetere il pilot. Per il run corrente,
da PowerShell Windows (un solo comando, nessun sudo):

```powershell
scp -o StrictHostKeyChecking=yes mercurion-server:vm041-pilot-715f719bb1b14a4b87fb1c42e1a54647/pilot-result.json C:/Users/giuli/.codex/artifacts/inf-vm-04/vm041-tox21/vm041-recovered-715f719bb1b14a4b87fb1c42e1a54647.json
```

Il nome locale separato conserva eventuali output parziali del primo
download. Un errore nel trasporto del report non richiede un nuovo load,
una nuova rete o la rigenerazione delle credenziali sintetiche. La causa
di `Connection closed` non si può dedurre dal solo messaggio SCP.

I file e le immagini conservati sono una base per lo stack preview, non una
procedura di backup/retention completa. `realServicesStarted: true` significa
che il pilot ha eseguito applicazioni reali, non che siano ancora attive.
`vmDeployment: false` nel report RPC indica assenza di rollout persistente;
`executionHost: guest` distingue la prova VM da quella host.

## 5. Esito VM del 10 novembre

Run trasporto `715f719bb1b14a4b87fb1c42e1a54647`, RPC guest
`0dfd48410938471d806dc3240595639a`: **passed**. Report osservato alle
`2026-11-10T18:50:41.736757+00:00` (UTC).

Entrambe le immagini caricate e verificate con save/config digest,
identiche agli artefatti host. Otto controlli preflight passati.
Tre lifecycle RPC reali, nove negazioni NATS esplicite, tre stop exit 0,
file effimero invariato e `cleanupErrors: []`. Initial e restart usano lo
stesso container; recreate usa un ID diverso. Nessun publishing o overlay.

Il primo recupero SCP è terminato con `Connection closed` dopo che il guest
aveva già prodotto `passed`. Il solo report è stato poi scaricato dall'owner
e riletto/correlato dall'agente: nessuna riesecuzione di load o collaudo,
nessun cambiamento a SSH o filtri. Causa della chiusura non determinata.

Evidenza recuperata:

```text
C:/Users/giuli/.codex/artifacts/inf-vm-04/vm041-tox21/vm041-recovered-715f719bb1b14a4b87fb1c42e1a54647.json
```

SHA256 report: `d590a102d0a1d21df750ab18e325a5a812d887846bf490fc542a75108a139eee`.
SHA256 manifest pilot: `4658991bde855944c2914ec3e49effe97a243e6b639fa4a5b9a1610f1992b7f0`.
La correlazione è conservata in `completion-evidence.json` accanto al report;
le evidenze CI finali saranno associate allo SHA pubblicato senza alterare
la configurazione o rieseguire la prova VM.

A-37 verificato nel proprio perimetro. Tox21 ha elaborato richieste reali
sulla VM; il pilot temporaneo è terminato e le immagini/archivi sono
conservati. Prossima milestone: predisporre lo stack preview riusando questi
artefatti e i contratti bootstrap già verificati. A-16 richiede Nest reale;
A-17/A-21, H-05/A-05/A-30 e rollout persistente restano aperti.
