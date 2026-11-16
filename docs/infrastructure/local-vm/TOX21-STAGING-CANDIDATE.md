# VM-039 — Candidato Tox21 staging locale

**10 novembre 2026 — candidato costruito, collaudato ed esportato sull'host.**
Il task riprende dopo le CI strict verdi di [Web e364c00b](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/42861033197)
e [Tox21 d506101](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42858304379).
Nessun accesso SSH, trasferimento o avvio di applicazioni sulla VM in questa fase.

## 1. Identità selezionate

| Oggetto | Identità |
| --- | --- |
| Sorgenti Tox21 | `d506101ec27c985ef4ddb280266bfcdc4b6bf1c4`, branch operativo `feature/infra-vm-nats-client-auth` |
| Target / ambiente | Docker `staging` / deployment `preview` |
| Versione immagine | `vm039-d506101ec27c` |
| Tag locale conservato | `mercurion-vm039-tox21-staging:d0bdc5e4e70f4e71aa26391e7fce7208` |
| Image ID locale | `sha256:e816fb97709fb05db82ecacaef69cb7c1e23389474d7cc7a7688d47d37a283d4` |
| Config digest archivio | `sha256:a00600b4e3ee005c6f33cf28686389c42d32a148c4f7195f64ed0379eb30a1b8` |
| SHA-256 image.tar | `2f725f0eb31030bbed0eaeb458c60bb1713f5dead3c3e7f9246b227bdf92c9a8` |
| Package modello riusato | `qa-6f19c86`, export revision `6f19c869a0d99209fc78eb6a909d1f45897118a8` |

L'image ID locale identifica l'indice BuildKit con attestazione; il config
digest identifica la configurazione nel tar effettivamente ricaricato.
Entrambe le identità sono conservate nel manifest, senza scambiarle.

Pesi `cbe915a168b83829e1766655dfd2d9d6ed7047638008f03e0759e0814f700104`
e soglie `075e33c82c3ea86ef429513a582ce21d2c37094f10a91aedb59a957005c46606`
sono quelli già verificati. Non è stato eseguito training o ricalcolo soglie;
la revisione dell'export modello resta distinta dalla revisione applicativa.

## 2. Prove eseguite e limiti

- Contesto isolato ricavato dai blob Git della revisione selezionata; niente
  dotenv, PEM, chiavi, virtualenv host, dataset o checkout modificato nella build.
- Build Linux amd64, audit UID/GID 10021, filesystem read-only, training/pip
  assenti e inferenza ripetibile CPU. Confronto dei sei sorgenti selezionati
  nell'immagine con Git: `source-matches`, nessun launcher mancante.
- Vero `python -m bootstrap_secrets`, file read-only proprietario 10021, modello
  baked nell'immagine. Nessun source overlay o sostituto di inferenza/RDKit.
- Tre fasi: avvio iniziale, stop/start dello stesso container con StartedAt
  differente, ricreazione con nuovo container ID e identico file attivo.
- Ogni fase verifica cinque subject staging: inferenza e tre RDKit reali;
  PubChem soltanto richiesta invalida respinta prima del provider. Inoltre
  SMILES invalido respinto da RDKit. Totale 18 request/reply, di cui 12 richieste
  scientifiche valide; nessuna prova di disponibilità del provider PubChem.
- Credenziali broker mancanti, password errata e utente sconosciuto respinti
  esplicitamente in ciascuna fase: nove rifiuti. Timeout/DNS non sono successi.
  Sono prove di autenticazione NATS, non una nuova certificazione JWT per RPC.
- Tre arresti con exit 0. File attivo invariato, tre fasi passate nel run
  `5f08a4e7ab1640a88b50e902560cdc26`; nessun errore di cleanup.
- Exporter Tox21: archivio senza tag, load verificato, SBOM e scan completo
  OS Wolfi/Python: **zero finding, security_eligible true**.

Il broker e i client usano una rete Docker `internal`, senza porte pubblicate.
Le sole password sintetiche sono generate in memoria, consegnate via stdin e
conservate in un volume locale **tmpfs**. Un keeper ne mantiene il mount durante
il collaudo; sottodirectory distinte sono montate read-only su broker, worker e
requester. Nessuna password in argv, Config.Env o report. Non si modificano i
flag globali o granulari JWT per ottenere lo smoke.

La pulizia seleziona soltanto risorse con la label del run: container prima,
rete e volume poi, con verifica finale. Il keeper e il tmpfs sono rimossi;
restano l'immagine e gli artefatti del candidato. I casi negativi di evidenza,
mount, source overlay, endpoint Docker remoto e cleanup parziale hanno sette
test stdlib, registrati anche nel job CI dei contratti container.

## 3. Artefatti conservati

Directory host relativa al profilo utente:
`.codex/artifacts/inf-vm-04/vm039-d0bdc5e4e70f4e71aa26391e7fce7208/`.

| File | Contenuto |
| --- | --- |
| `plan.json`, `source-manifest.json` | Revisione, versione, contesto e hash dei blob selezionati |
| `build-staging.log` | Build dal contesto isolato |
| `runtime-audit.json`, `source-image-review.json` | Audit offline e confronto sorgenti immagine/Git |
| `bootstrap-smoke-verified.json` | Lifecycle, RPC, rifiuti broker e pulizia del run finale |
| `model-reference.log` | Confronto offline con le predizioni di riferimento |
| `export/component.json` | Manifest candidato, identità immagine/modello e checksum dei file |
| `export/image.tar` | Archivio trasferibile senza tag utente |
| `export/sbom.cdx.json`, `export/vulnerabilities.json`, `export/policy-result.json` | Inventario e policy strict |
| `candidate-summary.json` | Riepilogo correlato per immagine, report e checksum |

I primi due smoke locali sono conservati come evidenza intermedia; il run
finale è quello di `bootstrap-smoke-verified.json`. Il controllo dell'export
ricalcola i checksum dei file, compreso image.tar, prima di registrare il summary.

## 4. Riprodurre passo passo sull'host

Da PowerShell nella root Web. Usare Docker Desktop Linux già avviato, il broker
NATS fissato già locale e un nuovo nome di candidato. Non sono comandi guest.
Se una fase fallisce, conservare il report e fermarsi senza retry automatico.

1. Selezionare la revisione Tox21 completa con Required gate verde e preparare
   i riferimenti locali. Il seguente esempio ripete la revisione collaudata:

   ```powershell
   $taskCandidateSha = 'd506101ec27c985ef4ddb280266bfcdc4b6bf1c4'
   $taskCandidateId = [Guid]::NewGuid().ToString('N')
   $taskCandidateRoot = Join-Path ([Environment]::GetFolderPath('UserProfile')) ('.codex/artifacts/inf-vm-04/vm039-' + $taskCandidateId)
   $taskCandidateSource = Join-Path $taskCandidateRoot 'source'
   $taskCandidateModel = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex/artifacts/t21-03-packages/verified-6f19c86'
   $taskCandidateImage = 'mercurion-vm039-tox21-staging:' + $taskCandidateId
   $taskCandidateVersion = 'vm039-' + $taskCandidateSha.Substring(0, 12)
   ```

2. Materializzare i soli file Git ammessi. Lo script non legge i file di lavoro
   Tox21 e rifiuta destinazioni/manifest già presenti e oggetti Git non regolari:

   ```powershell
   python -B scripts/infrastructure/materialize_tox21_candidate.py --source C:/.project_repo/MercurionTox21 --revision $taskCandidateSha --output $taskCandidateSource
   ```

3. Verificare i tre file del modello con il manifest e i checksum selezionati.
   Non sostituire il package con una directory contenente dataset o chiavi.
   Costruire il target staging; il Dockerfile verifica il package e una predizione:

   ```powershell
   docker --context desktop-linux build --progress plain --target staging --build-context "model_package=$taskCandidateModel" --build-arg "BUILD_VERSION=$taskCandidateVersion" --build-arg "BUILD_REVISION=$taskCandidateSha" --tag $taskCandidateImage $taskCandidateSource
   ```

4. Impostare il contesto locale per i subprocess Python dell'audit/exporter,
   conservando il valore precedente da ripristinare al termine:

   ```powershell
   $taskPreviousDockerContext = $env:DOCKER_CONTEXT
   $env:DOCKER_CONTEXT = 'desktop-linux'
   ```

   ```powershell
   python -B (Join-Path $taskCandidateSource 'scripts/check_container_image.py') $taskCandidateImage --target staging --revision $taskCandidateSha --version $taskCandidateVersion
   ```

5. Eseguire il collaudo sintetico completo. Il runner rifiuta daemon remoti,
   immagini con identità diversa e un report già esistente:

   ```powershell
   python -B scripts/infrastructure/smoke_tox21_candidate.py --image $taskCandidateImage --revision $taskCandidateSha --version $taskCandidateVersion --report (Join-Path $taskCandidateRoot 'bootstrap-smoke.json')
   ```

   Attesi `status: passed`, tre fasi, tre rifiuti espliciti per fase,
   `cleanupErrors: []`, file invariato e tre stop puliti. I report indicano
   `vmDeployment: false` e `isolationAccepted: false`.

6. Produrre archivio e verifiche con l'exporter della medesima revisione:

   ```powershell
   python -B (Join-Path $taskCandidateSource 'scripts/container_evidence.py') --image $taskCandidateImage --output (Join-Path $taskCandidateRoot 'export') --cache (Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex/artifacts/trivy-cache')
   ```

   Richiedere exit 0, zero finding, `security_eligible: true` e
   `archive_load_verified: true`. Conservare tutti i file del manifest e
   controllarne gli hash prima di ogni trasferimento. Ripristinare il contesto:

   ```powershell
   $env:DOCKER_CONTEXT = $taskPreviousDockerContext
   ```

## 5. Passo successivo

VM-039 chiude la preparazione del solo candidato Tox21 sull'host. Segue la
definizione del bundle di trasporto e del preflight guest per il collaudo
applicativo circoscritto. L'archivio non costituisce una release coordinata Web
completa: i due componenti Web e i gate infrastrutturali restano distinti.
H-05/A-05/A-30, INF-VM-02/04/06 e accettazione complessiva dell'isolamento
restano aperti. Nessun servizio reale o tunnel viene avviato implicitamente.
