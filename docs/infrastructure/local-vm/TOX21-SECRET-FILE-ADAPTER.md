# INF-VM-04-B — adattatore da file Tox21

8 novembre 2026. Implementato sul branch operativo
`feature/infra-vm-nats-client-auth`, commit `b6476dd`. L'owner ha confermato
che il lavoro successivo continua qui, come sul branch infra Web: nessun
merge su `develop` e nessun nuovo ramo per questo intervento.

## Contratto consumer

L'avvio opt-in è `python -m bootstrap_secrets`. Richiede il percorso assoluto
`MERCURION_BOOTSTRAP_FILE` e `PY_ENV=staging` oppure `production` già esterno.
Formato JSON coerente con Nest: `schemaVersion: 1`, `environment` corrispondente
all'ambiente esterno, `variables`. Nel Tox21 sono ammessi esattamente i due
campi `NATS_USERNAME` / `NATS_PASSWORD`, entrambi obbligatori nel documento.

La allowlist non include selector ambiente, controllo Python, URL broker,
policy JWT o chiavi. Il pubblico PEM resta montato separatamente attraverso
`JWT_PUBLIC_KEY_PATH`. Questo file consegna credenziali al consumer; non
sostituisce la validazione Pydantic o le altre impostazioni richieste.

UTF-8 rigoroso, BOM facoltativo, massimo 1 MiB, campi JSON duplicati rifiutati.
Valori letterali non vuoti/non composti solo da spazi, senza NUL o surrogate
isolate. Niente shell/interpolazione. Eventuali variabili già presenti, anche
uguali, causano rifiuto: il bundle ha una sola origine. L'intero documento è
validato prima di popolare l'ambiente del processo.

File regolare e non symlink; su Linux apertura no-follow/non-blocking e verifica
del descriptor. Group-write/execute e permessi others rifiutati, group-read
consentito. Lettura limitata anche se il file cresce; descriptor chiuso nei
fallimenti. Il consumer non cancella il file attivo. Errori con codici/motivi
costanti, senza contenuti, percorsi o eccezioni grezze. Import di `main` ritardato
fino alla validazione/iniezione; file assente non attiva un fallback.

Il CMD Docker resta `python -m main`. I due moduli sono aggiunti esplicitamente
a Dockerfile, allowlist del contesto e inventario del runtime; nessun nuovo
pacchetto, dato di training o materiale di firma. Nessun Compose operativo
attivato. Il futuro manifest sceglierà l'alternativa dopo il gate di avvio VM.

## Evidenze

- Suite applicativa: Linux **122 passati**, UID 10021; Windows **120 passati e
  due POSIX saltati**. Atomicità, collisioni, JSON/UTF-8, limiti/crescita, errori,
  permessi reali, symlink sostituito fra stat/open e chiusura descriptor.
- CLI in subprocess con app sentinella: file assente impedisce l'import;
  file valido inietta prima dell'avvio. È un test del launcher con sostituto,
  non un avvio completo del modello.
- Smoke NATS reale esteso: 8 letture di file sintetici, 10 RPC autenticati,
  5 legacy e 8 rifiuti auth espliciti; readiness falsa sui fallimenti e cleanup.
  Predizione/PubChem sostitutivi, RDKit reale. Questa prova compone il lettore
  con `main.run`; non è un nuovo end-to-end Nest → worker.
- Immagine dipendenze locale già presente e sorgenti selezionate in mount
  read-only: nessuna nuova release locale. CI costruisce/audita gli artifact
  aggiornati e ne esegue lo smoke. [CI sullo SHA esatto
  `b6476ddebd66f1879227d1debf6fa00705a6bbbb`](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42473032259)
  completata con successo, incluso Required gate.

Report fuori Git:
`C:/Users/giuli/.codex/artifacts/inf-vm-04/tox21-file-bootstrap/`.
Sorgenti e documentazione nel repository Tox21: `secret_bootstrap.py`,
`bootstrap_secrets.py`, `tests/test_secret_bootstrap.py`,
`docs/secret-file-bootstrap.md` al commit indicato.

## Residui

**9 novembre:** [ricevitore/apply Tox21 locale](SECRET-DELIVERY-PILOT.md)
implementato e verificato con dati sintetici, incluso questo lettore.
Questo chiude le primitive locali, non il trasporto e l'installazione guest.
I residui operativi sotto rimangono aperti.

È il consumer da file, non il ricevitore host/guest. Trasporto SSH senza PTY,
apply privilegiato, directory volatile, ownership dei mount e restart/recreate
restano da realizzare e verificare secondo [VM-028](BOOTSTRAP-CONTRACT.md).
Nessuna lettura di materiale operativo, operazione VM o cambio di autenticazione
SSH/sudo. Le variabili modificate dentro il processo non popolano Docker
`Config.Env`; memoria e root/Docker admin restano nel confine fidato.

INF-VM-02/03 operativi e INF-VM-04 restano aperti.
