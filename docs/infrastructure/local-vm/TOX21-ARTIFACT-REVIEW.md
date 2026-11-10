# VM-038 — Review artefatto Tox21 e bootstrap NATS

**10 novembre 2026 — review completata; nessuna nuova build o operazione VM.**
**Aggiornamento policy:** l'owner richiede ora [zero vulnerabilità a ogni gravità](../security-strict-2026-11-10.md).
I successi CI/policy della review riportata sotto sono storici, sotto la soglia
precedente. Il successivo rientro strict è completato: Web e364c00b e Tox21
d506101 hanno Required gate verdi. **VM-039 è ora eseguita sull'host**, con un
nuovo [candidato staging collaudato ed esportato a zero finding](TOX21-STAGING-CANDIDATE.md).
L'immagine storica della tabella resta distinta dal nuovo candidato.
Prosecuzione autorizzata dopo VM-037. Obiettivo: identificare il candidato
utilizzabile per il prossimo collaudo applicativo, mantenendo distinti
sorgenti, immagine, modello e archivio trasferibile.

## 1. Esito e identità

MercurionTox21 è un componente in repository indipendente, non una directory
implicita del deployment Web. Checkout letto sul proprio branch operativo
`feature/infra-vm-nats-client-auth`, HEAD
`5f3d837cf1356c6ccc875fea007d396684e3cc69`, pulito prima/dopo la review.
Web resta sul proprio branch infra; nessun merge o modifica Tox21.

| Oggetto | Evidenza | Esito |
| --- | --- | --- |
| Immagine locale `mercurion-t21-11-production` | ID `sha256:a89c91b0f511120adf0980320bc234fe009cf49df7cea2266ba72aed81ad4ccb`, revisione `16f818dc47127850df64afa87ed86d6034beab16` | Mancano entrambi i moduli bootstrap, revisione precedente |
| Immagine locale `mercurion-t21-08-tox21` | ID `sha256:e0e45c20f9b4a88d28ffe228bd3a420033386aa53fd981d349482940a197d568`, revisione `a99754c9e61051036153d3676b7ef5d568b0c1bc` | Stesso limite; precedenti smoke locali usavano source overlay |
| Revisione Tox21 corrente | [CI 42575718871](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42575718871), push sullo SHA esatto, job Linux e Required gate success | Immagini aggiornate costruite e collaudate in CI |
| Immagine production CI | ID/config digest riportato `sha256:38ac4e1cb414f3a56b35e935590ee6e5587d75f8ecf776cb73744325ded8a1b3` | Audit runtime/modello e policy passati; archivio non pubblicato |
| Immagine staging CI | ID riportato `sha256:a3fb8236b07c8edd2f0583e7a503cb91aacefd83d3d3ec044ad425e621c94067` | Audit runtime/modello passato; exporter/security del workflow eseguiti solo su production |

Nessuna immagine locale trovata con la label della revisione corrente. I due
candidati locali sono stati ispezionati copiando **solo file selezionati** da
container mai avviati e poi rimossi; niente sorgenti montati sopra l'immagine.
Il confronto conserva gli hash grezzi e normalizza CRLF → LF per i file Python:
una differenza dei terminatori non viene scambiata per una modifica logica.
`runtime.py` coincide dopo normalizzazione; launcher assenti e altre modifiche
sono invece reali. Non basta cambiare `PY_ENV` su una vecchia immagine.

## 2. Evidenze CI recuperate

L'API conferma due artifact non scaduti: report e pacchetto modello, retention
fino al 23 novembre. Scaricato il solo ZIP dei report, artifact `13655700096`,
SHA-256 `46d0b35a668718c07338c1fc2067b418ff7d76c12c4faf73c2d509cbc7367d13`,
coincidente con il digest GitHub. Inventario ZIP verificato: **nessun image.tar**.
Selezionati component, policy, runtime audit, audit staging e smoke NATS;
nessuna esecuzione o estrazione indiscriminata dei file dell'archivio.

La CI corrente attesta UID/GID 10021, root filesystem read-only, training
assente e inferenza ripetibile CPU. Smoke NATS senza source overlay: 10 RPC
autenticati, 5 legacy, 8 negazioni esplicite, 8 bootstrap da file; RDKit reale,
predizione/PubChem sostitutivi in quel particolare smoke. Le altre prove CI
del modello restano evidenze distinte, non un unico end-to-end con launcher.

La policy security esistente è passata sul candidato production: nessun
finding CRITICAL bloccante; restano 52 HIGH, 78 MEDIUM e 66 LOW nel report.
Non è una nuova scansione del 10 novembre né assenza di vulnerabilità. Nessuna
eccezione o modifica della policy. Il JSON component con checksum di image.tar
non sostituisce il tar mancante: **candidato non trasferibile nella forma attuale**.

## 3. Modello esistente, senza nuovo training

Verificato il pacchetto locale `qa-6f19c86`, export revision
`6f19c869a0d99209fc78eb6a909d1f45897118a8`, con i tre file runtime richiesti.

- `weights.pt`: `cbe915a168b83829e1766655dfd2d9d6ed7047638008f03e0759e0814f700104`.
- `thresholds.json`: `075e33c82c3ea86ef429513a582ce21d2c37094f10a91aedb59a957005c46606`.

I checksum effettivi coincidono con il manifest e con quelli del pacchetto
CI corrente. Si può riusare il pacchetto già esportato: preservare la sua
identità, senza attribuirgli retroattivamente lo SHA dei nuovi sorgenti.
La nuova immagine avrà il proprio BUILD_REVISION distinto dall'export_revision
del modello. Nessun training o ricalcolo delle soglie richiesto per questa fase.
La build/audit esistente dovrà comunque verificarne compatibilità e inferenza.

## 4. Contratto applicativo da collaudare

Il Dockerfile corrente include entrambi i moduli, mantiene CMD
`python -m main` e distingue i target staging/production. Il manifest operativo
dovrà scegliere esplicitamente `python -m bootstrap_secrets` (sostituzione del
command, non modifica globale del CMD). Il launcher valida/inietta la coppia
NATS prima di importare main, nello stesso processo.

Per preview: `PY_ENV=staging`, URL broker senza userinfo, file bootstrap
read-only UID 10021, `/app/model` già nell'immagine e `/tmp` scrivibile su tmpfs.
VERSION è già baked; non riscrivere l'identità compilata con un override env.
Credenziali diverse per worker e requester, broker con config sintetica
effimera montata, nessuna password in argv/Config.Env o nei report.

Il worker non ascolta HTTP: readiness tramite request/reply dopo subscriptions
e flush. Namespace preview `staging.<subject>`, production senza prefisso.
Autenticazione del broker e JWT degli RPC sono contratti distinti; non cambiare
GLOBAL_SKIP_AUTH_FLAG o AUTH_* per far passare lo smoke. Un PEM RSA pubblico
separato sarà necessario se almeno una policy risolta richiede JWT.

Primo collaudo applicativo proposto su rete interna senza egress/porte:
inferenza e tre RDKit reali; quinto subject PubChem verificato con richiesta
invalida respinta prima del provider, come nel probe esistente. Non dichiarare
provata una chiamata PubChem reale. Aggiungere restart/recreate con lo stesso
file attivo e rifiuti NATS espliciti: timeout/DNS non valgono come auth denied.
NATS non riceverà master key o PEM; niente broker persistente o dati reali.

## 5. Ripetere la review locale

Da PowerShell nella root Web, con Docker Desktop già disponibile:

1. Indicare il checkout indipendente e una nuova directory di soli metadati:

   ```powershell
   $taskTox21Source = 'C:/.project_repo/MercurionTox21'
   $taskReviewDir = Join-Path ([Environment]::GetFolderPath('UserProfile')) ('.codex/artifacts/inf-vm-04/artifact-review-' + [Guid]::NewGuid().ToString('N'))
   New-Item -ItemType Directory -Path $taskReviewDir | Out-Null
   ```

2. Usare l'image ID locale immutabile, senza pull, build o avvio:

   ```powershell
   python -B scripts/infrastructure/inspect_tox21_artifact.py --image sha256:a89c91b0f511120adf0980320bc234fe009cf49df7cea2266ba72aed81ad4ccb --source $taskTox21Source --output (Join-Path $taskReviewDir 'local-image.json')
   ```

3. Leggere status, missingFiles e cleanupVerified. Exit 0 significa acquisizione
   riuscita, **non** ammissione al deployment. `source-mismatch` è l'esito atteso
   sull'immagine storica. Il confronto usa Git HEAD committato, non file locali
   modificati/ignorati. Le copie tar sono lette in memoria, senza extractall.
4. Per la CI aprire il run linkato sopra: confrontare SHA e Required gate,
   scaricare il solo artifact reports e verificare checksum/inventario e record
   selezionati. Non interpretare report o pacchetto modello come immagine runtime.

Evidenze di questa review in `~/.codex/artifacts/inf-vm-04/` sotto
`artifact-review-ef2d5bd4d7e94472b7bf2e88c632b73e/`. Riepilogo
`review-summary.json`, SHA-256
`32cbd6daad7a59abe937c5c1903f2201ee8490cde135bd34ae9e8dd56ebbe703`.
Contiene hash dei report, provenienza CI e controlli del modello. Nessun
container avviato, accesso SSH, cambio rete o file Tox21 modificato.

## 6. VM-039 proposta — candidato preview locale prima della VM

1. Selezionare lo SHA Tox21 esatto e verde e materializzare i soli file Git
   tracciati in un contesto di build isolato sull'host; nessun `.env` o PEM.
2. Riutilizzare il pacchetto modello verificato, senza training; costruire il
   target **staging** con BUILD_REVISION completo e versione identificabile.
3. Eseguire audit offline esistente: identità, UID, training assente, modello,
   read-only e contenuto. Poi collaudo bootstrap/NATS sintetico locale nel
   perimetro sopra, senza source overlay e senza alterare i Compose fixture.
4. Riutilizzare `container_evidence.py`: archivio senza tag, load verificato,
   SBOM, scansione e policy del candidato esatto. Assicurare il contesto Docker
   locale anche nei subprocess dell'exporter, che oggi usa il contesto implicito.
5. Conservare immagine e record come candidato per il collaudo successivo;
   soltanto dopo definire bundle/trasferimento e preflight guest. Nessuna build
   sul guest, nuova pipeline CD, service deployment o cambio gate impliciti.

Questo è un sottoinsieme locale di INF-VM-06 necessario a proseguire INF-VM-04,
non l'implementazione di tutta la filiera release. Prima si può produrre il
candidato manualmente con gli strumenti presenti; pubblicare tar in CI resta
un intervento separato. A-21/A-16/A-17 e INF-VM-02/04/06 restano aperti.
