# VM-043 — Primo bootstrap dei server preview

**11 novembre 2026.** Prosecuzione privata di VM-042: PostgreSQL, Redis,
NATS e Meilisearch, senza porte pubblicate. Web, Tox21, nginx edge e tunnel
restano alla fase applicativa. Questa procedura non chiude H-05/A-05/A-30.

## 1. Prerequisiti e materiali

L'owner ha confermato il file locale creato, la correzione iniziale AES e
la compilazione dei provider. Il file resta sotto
`%USERPROFILE%/.mercurion/preview/`, con ACL utente/SYSTEM.
Dropbox, GitHub e LinkedIn inutilizzati possono usare `unused-preview`
nei sei campi key/id/secret: il bootstrap da file richiede stringhe non vuote.
I due provider SSO sono già vietati dal controller/registro esistente.
Le API key Meilisearch client restano vuote fino al curl amministrativo.

Le immagini provengono dal candidato VM-042 Web `d227dbf4`, CI
[42995928107](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/42995928107)
verde e otto scan aggiornati senza finding. Per questo passo si trasferiscono
solo i quattro archivi server. NATS conserva il broker corretto già collaudato
in VM-041; PostgreSQL resta 16.15/pgvector 0.8.7.

La revisione degli strumenti di consegna è distinta dalla revisione delle
immagini e registrata nel manifest. Un cambio del wrapper non richiede di
ricompilare applicazioni immutate. Prima dell'esecuzione serve la CI verde
sull'esatto commit degli strumenti, senza deroghe alla policy strict.

## 2. Preparare il bundle pubblico

Questo passo può essere eseguito dall'agente: non legge configurazioni private.
`preview_server_bundle.py prepare --candidate <candidato> --output <directory-nuova>`
verifica hash, provenance, SBOM/scan e revisione del candidato; copia solo un
insieme chiuso di file pubblici. Gli script guest sono prelevati dai blob Git
del commit degli strumenti. Il bundle riceve un run-id nuovo, senza segreti.

Il comando `Invoke-PreviewServerBootstrap.ps1 -BundlePath <bundle>` senza
`-Execute` verifica soltanto il bundle, senza leggere il file privato o aprire SSH.
Il percorso concreto del bundle viene fornito nella consegna del task.

## 3. Eseguire dal terminale dell'owner

Lasciare accesa la VM con LUKS sbloccato. Usare PowerShell Windows normale:

```powershell
powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Invoke-PreviewServerBootstrap.ps1 -BundlePath <percorso-del-bundle-verificato> -Execute
```

Sostituire soltanto il percorso con quello fornito per il run corrente.
Non incollare credenziali in chat: passphrase SSH e sudo restano nel terminale.
Il wrapper usa l'alias `mercurion-server`, host key checking obbligatorio e
il Docker Unix socket locale del guest. Le ACL del file privato vengono lette
e verificate, senza modificarle.

## 4. Fasi automatiche dello stesso comando

1. **Host:** verifica nuovamente il bundle e valida nel processo dell'owner
   la configurazione necessaria ai server. Riserva il run con un marker locale
   esclusivo: la stessa esecuzione non può essere rilanciata alla cieca.
2. **Trasferimento pubblico:** SCP porta archivi e codice nella home SSH.
   Un loader verifica manifest/hash, owner e file regolari senza symlink, poi copia
   sotto `/opt/mercurion/releases/server-<run-id>`, root-owned. Solo il codice
   già copiato/verificato viene eseguito come root. L'hook PostgreSQL usa LF
   ed è eseguibile, evitando il sourcing nella shell dell'entrypoint.
   Lo staging pubblico è considerato non fidato: SCP da Windows può produrre
   file `0664`/`0666`. Questi mode non autorizzano l'esecuzione; i byte sono
   autorizzati esclusivamente dagli hash del manifest fissato dall'host.
   Directory e file nella destinazione protetta restano root-owned e non
   scrivibili da gruppo/altri, indipendentemente dai mode della sorgente.
3. **Preflight guest:** verifica IP `10.203.240.10/24`, gateway `10.203.240.1`,
   Docker Linux amd64 locale, Compose, spazio e assenza di progetti/reti/volumi
   canonici già presenti. Carica i quattro archivi senza tag e ne verifica i
   config digest con roundtrip save; nessun tag preesistente viene spostato.
4. **Ricezione protetta:** il preflight prepara l'inbox su `/run` tmpfs.
   I soli documenti server viaggiano su stdin SSH in una connessione separata
   dal prompt sudo. Nessun valore passa da argv, SCP, artifact o `Config.Env`.
   SMTP/OAuth, JWT/RSA e chiavi client Meilisearch restano sull'host.
5. **Apply e avvio:** root applica file `0400` agli UID/GID dei consumer,
   su directory root-owned; elimina il payload dall'inbox e mantiene i file
   attivi per i bind read-only. Ricontrolla le collisioni e avvia i quattro
   server su tre reti interne IPv4, con volumi persistenti distinti.
6. **Readiness:** PostgreSQL autenticato con ruolo applicativo non-superuser
   e vector 0.8.7; Redis autenticato con eventi `Exg` e accesso anonimo respinto;
   NATS con auth richiesta/anonimo negato; Meilisearch healthy e API chiavi
   inaccessibile senza autorizzazione. Il wrapper non invia richieste di creazione
   indici o API key: quel provisioning resta all'operatore con curl.

La master key Meilisearch è nel solo TOML server. Il broker riceve le due
credenziali dei propri consumer; PostgreSQL riceve admin/app password; Redis
la propria password. Il ricevitore rifiuta ruoli/file aggiuntivi e configurazioni
estranee al formato previsto, inclusa la master Meili riusata dagli altri server.

## 5. Esito e gestione degli errori

Il riepilogo finale include `runId`, `status`, `reportPath`, indirizzo privato
Meilisearch e `publishedPorts=false`. Il report completo include le identità
caricate, i controlli e i container del run, senza valori di credenziali.
I report sono leggibili dall'owner e scaricati nella sottodirectory `receipts`.

In caso di errore conservare ultima fase, `execution-state.json` e ricevute.
Non rilanciare lo stesso bundle. Se fallisce solo SCP del report, recuperare
quel report con SCP: non ripetere load/avvio. Non vengono cancellati server,
volumi o segreti automaticamente; le risorse parziali richiedono review mirata.
Nessun reset DB o cambio password implicito. Le directory pubbliche e il
readback degli archivi restano per provenienza/ripresa.

### Ripresa del solo errore di copia pubblica VM-043

Il run `6c3e72e2e4064b71bd3bbffcff4d629c` si è fermato al controllo dei
permessi del manifest SCP, prima di creare la release protetta, caricare
immagini o consegnare segreti. Il vecchio bundle resta valido: la correzione
riguarda il loader inviato dall'host, non le immagini o gli script guest.

Dopo la verifica locale e CI degli strumenti corretti, usare lo stesso comando
del passo 3 aggiungendo `-ResumePublicCopy`. È una ripresa esplicita una tantum:
richiede marker `failed`, fase `guest-preflight-and-load`, nessun servizio avviato
e nessuna ricevuta locale; salta esclusivamente SCP dei file già trasferiti.
Il loader verifica di nuovo tutti gli hash e rifiuta una release protetta già
esistente prima di qualsiasi load. Non cancella o sovrascrive risorse parziali.
Un ulteriore errore richiede una nuova diagnosi, non un altro rilancio.

Senza `-Execute`, `-ResumePublicCopy` verifica solo l'ammissibilità locale
della ripresa e il bundle pubblico, senza leggere il file privato o aprire SSH.

I file attivi sono volatili: non sono un piano completo di cold recovery.
`restart: no` mantiene l'avvio su richiesta; il riavvio guest richiede una
successiva procedura esplicita di riconsegna dei materiali stabili.

## 6. Collaudi e passo successivo

**Aggiornamento a fine giornata:** bootstrap VM eseguito con successo sul run
`6c3e72e2e4064b71bd3bbffcff4d629c`, dopo la ripresa pubblica del loader corretta
nel commit ca14b03d, CI full/Required gate verdi. Quattro roundtrip e quattro
readiness true, nessun publishing, applicazioni ferme; Meili `172.18.0.2`.
Tunnel SSH e quattro indici log successivamente verificati. Chiavi client
rinviate, validità 90 giorni scelta dall'owner. Per riprendere seguire il
[runbook](RUNBOOK.md#12-punto-di-ripresa-concordato-per-il-giorno-successivo),
non rilanciare il bootstrap. [Ricevute complete sanitizzate](EXECUTION-RECORD.md).

- Test locali dei contratti: allowlist dei percorsi, payload senza provider/RSA,
  separazione master, proiezione di soli quattro server e stop su collisioni.
- Due prove reali in fixture Linux con `/run` tmpfs, rete assente e nessun Docker
  socket montato: copia pubblica root-owned/hook eseguibile, prepare/receive/apply,
  UID/GID/mode, inspect non-root e rifiuto del riuso.
- Docker Desktop, run `d18d14d922a24549bff09e277952e90f`:
  `server-projection-qa.json` in `.../.codex/artifacts/inf-vm-04/vm042-preview/`.
  Quattro server reali con valori sintetici; stesse funzioni di readiness,
  quattro esiti positivi e cleanup senza errori. Nessuna prova VM dedotta.
- Sintassi PowerShell 5.1 verificata; la prova concreta senza `-Execute`
  va registrata sul bundle definitivo. I test filesystem Linux sono locali,
  mentre la CI esegue i contratti e la validazione Compose.

Dopo l'esito guest: SSH local-forward sul solo loopback Windows verso
l'indirizzo Meilisearch restituito, operazioni **curl dell'owner** per indici
e API key ristrette, attesa dei task e inserimento delle key nel file privato.
Seguono bootstrap applicativo e dati ChEMBL. DNS, Cloudflare/Access, produzione
e merge restano fuori da questo comando.
