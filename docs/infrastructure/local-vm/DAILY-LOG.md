# Mercurion VM — diario di progettazione e verifica

Roadmap: [ROADMAP.md](ROADMAP.md). Questo diario segue il criterio del [diario UX](../../../MercurionWebNg/docs/portfolio-ux/DAILY-LOG.md): **evidenze reali distinte da ipotesi e lavori rinviati**.

## Stati

- **Da affrontare:** contratto pianificato, nessuna implementazione.
- **In analisi:** ricognizione o decisioni in corso, senza esito operativo.
- **Documentato, da revisionare:** specifica scritta, non necessariamente approvata in tutti i dettagli.
- **Implementato, da verificare:** configurazioni cambiate, prove incomplete.
- **Verificato:** test eseguiti ed evidenze registrate, per uno specifico ambiente/SHA.
- **Accettato:** review owner conclusa; non implica automaticamente merge o deployment.

## 7 novembre 2026 — INF-VM-01, baseline documentale

**Stato:** documentato, da revisionare.

**Contesto:** l'owner ha creato `feature/infra-vm-docker-engine-architecture` e ha chiesto di studiare documentazione/sorgenti prima di modificare Compose, servizi o VM. Il modello proviene dallo schizzo su carta e dalle decisioni successive: due stack applicativi, Meilisearch unico, Nginx edge, Cloudflare Tunnel, Tox21/NATS, credenziali separate e perimetro portfolio.

**Ricognizione:** esaminati schema deployment, overlay, Compose preview/production, Dockerfile Web/Tox21, CI/exporter/coordinatore, guide JWT e Tox21, servizi Meilisearch. Baseline di lettura `6431b5bd1e22b59edd27c7500a4025f15053dd10`; log di sistema e audit già differenziati per ambiente.

**Decisioni aggiuntive ricevute:** master key Meilisearch riservata alla gestione del server/operazioni amministrative e non ai Nest VM; vecchia variabile client conservata come nome; niente TLS origin Nginx/maintenance mode Kubernetes; `MercurionData` e `MercurionLandingFactory` solo locali; documentazione in italiano. Accesso `eyeix/meilisearch-ui` soltanto SSH e key Meilisearch read-only; precreazione indici solo con `curl` e key amministrativa custodita nel password manager Windows; definire consegna e archivio artifact GitHub Actions.

**Evidenza esterna UI:** progetto ufficiale dichiara SPA con chiamate API dal browser; Docker Hub pubblica `v0.15.3-lite` e digest `linux/amd64`. Non è stata svolta una scansione delle CVE: immagine **non approvata**. Occorrono doppio inoltro SSH locale, prova CORS/privilegi e verifica del Docker Engine.

**Intervento di questa sessione:** redazione dei documenti architetturali e di accettazione sotto `docs/infrastructure/local-vm/`; aggiornamento dell'indice della vecchia nota VM. Nessuna modifica applicativa, Compose, CI, segreti reali o VM. Nessun test runtime eseguito durante la redazione.

**Prossimo intervento:** review delle decisioni e apertura INF-VM-02 (isolare host/guest) prima di configurare network Docker eseguibili. Le proposte rimangono proposte fino a verifica.

## 7 novembre 2026 — INF-VM-02, ricognizione host e guest

**Stato:** in verifica; nessuna chiusura del gate di isolamento.

**Host osservato dall'agente:** Windows 11 Pro, hypervisor attivo, 24 CPU
logiche e circa 64 GiB RAM. Le query Hyper-V su VM, switch e ACL sono negate
senza privilegi amministrativi. Docker Desktop locale e i suoi numeri di
versione non sono usati come evidenza del guest. Nessuna modifica al servizio
ssh-agent disabilitato, al Default Switch, al firewall o alle ACL.

**Aggiornamento owner:** VM già pronta, Ubuntu Server e Docker installati,
isolamento host↔guest già configurato, SSH iniziabile solo dall'host e risposte
stateful dal guest; Kaspersky classifica il Default Switch come pubblico.
Cifratura LUKS dichiarata. Queste impostazioni sono registrate come dichiarate
finché non ne viene acquisita l'evidenza specifica.

**Accesso:** primo tentativo con VM spenta rifiutato; successivo tentativo
non interattivo raggiunge SSH ma non autentica la chiave bloccata. L'owner sceglie
di eseguire personalmente l'inventario con SCP/SSH e `sudo`, senza condividere
passphrase. La trascrizione e il file locale del report confermano Ubuntu
26.04.1 LTS x86_64, Engine 29.9.3, Compose 5.7.0, policy SSH e stato Docker/rete.
Timestamp report: 16:25:51 UTC. [Riepilogo, hash e limiti](HOST-GUEST-READINESS.md).

**Lettura:** nessuna porta container pubblicata e nessun container avviato;
policy SSH globale senza password, keyboard-interactive o root. Chain utente
Docker vuote e policy INPUT permissive non bastano per concludere l'esito
dell'isolamento: mancano ACL Hyper-V/nftables e prove attive controllate.

**Consegna preparata:** inventari host/guest in sola lettura sotto
`scripts/infrastructure/`, raccolta estesa di ACL, block device e nftables,
formato LF per Bash, matrice H-01–H-07 e aggiornamento della baseline. Nessuna
installazione, nuova rete, modifica SSH/firewall, lettura di chiavi o deployment.
Controllo sintattico Bash in container locale isolato: prova di sintassi,
non accettazione di Ubuntu o della rete VM.

**Passo necessario:** inventario host in PowerShell amministrativa e seconda
raccolta guest estesa da parte dell'owner; poi review della policy e prove
negative con controllo positivo. INF-VM-03 non è ancora autorizzato dal solo
successo della raccolta.

### Seconda raccolta — host 16:41:54 UTC, guest 16:44:07 UTC

Report amministrativo host e inventario guest v2 acquisiti dall'owner e letti
dall'agente. Confermati VM `Mercurion-Server` generazione 2, 8 vCPU, 16 GiB fissi
e Default Switch; root ext4 su LUKS/dm-crypt/LVM. EFI e `/boot` separati non
cifrati; nessuna prova di sblocco a freddo. Driver firewall Docker `iptables`,
con frontend iptables/ip6tables su nf_tables: non confondere con backend nftables
nativo. Il dump nft mostra le chain Docker; nessuna ulteriore policy custom
INPUT nel report. Il registro Security Center non prova quali prodotti firewall
siano attualmente efficaci o quale profilo Kaspersky sia applicato.

Le due ACL estese mostrano deny outbound verso il blocco privato 172.16/12 e
allow inbound SSH stateful dall'indirizzo host corrente, con pesi 200/300 e
timeout 3600. Le prove negative restano non eseguite: l'eccezione host non viene
descritta come dimostrazione sufficiente di whitelist su tutte le origini.

**Difetto del collector corretto:** i tipi Hyper-V delle ACL semplici usano
`LocalAddress`/`RemoteAddress`; i nomi usati per le ACL estese non sono validi
su quel tipo. I sei deny outbound erano registrati, ma i relativi indirizzi
risultavano `null`. Corretto lo script e incrementato lo schema host a 2;
nessuna regola cambiata. Verificati i nomi sulle proprietà del tipo Hyper-V
installato e con fixture sintetica eseguita in Windows PowerShell 5.1: indirizzi
preservati senza interrogare VM. Parser PowerShell e link documentali passati.

**Prossimo dato richiesto:** solo un export mirato delle ACL semplici corrette,
senza ripetere l'inventario guest. Successivamente le prove host/guest/container
con canary e controllo positivo previste da H-02/H-04/H-05. Nessuna installazione,
modifica firewall, sblocco automatico o riavvio introdotto dalla review.

### Preparazione delle prove negative TCP

Preparati `network_canary.py`, relativi test e [runbook](NETWORK-PROBES.md).
Il canary ha finestra limitata, indirizzo esplicito, porta assegnata dal sistema,
identificatore pubblico e controlli positivi locali periodici. Il client
distingue raggiungibilità, porta non raggiungibile e servizio inatteso senza
promuovere alcun risultato a `isolationAccepted=true`.

Due metodi di test passati su loopback IPv4 e IPv6: server reale, marker
corretto/errato, chiusura automatica, successiva non raggiungibilità e rifiuto
dei target non ammessi. Nessun listener avviato sull'interfaccia VM durante
la preparazione; nessuna immagine scaricata sul guest o modifica di regole.
Probe Hyper-V non ancora eseguite. Export mirato ACL richiesto all'owner con
percorso assoluto dopo errore di trascrizione del percorso di output.

### H-02 IPv4 — prova operatore completata alle 17:18 UTC

Acquisite dal terminale le sei ACL semplici con i rispettivi CIDR; nessuna
regola modificata. Il wrapper `Invoke-GuestCanary.ps1`, compatibile con Windows
PowerShell 5.1, esegue SCP e SSH separatamente e salva il risultato senza
richiedere di copiare parametri o percorsi. Esecuzione completa dell'owner riuscita.

Il guest non raggiunge il canary TCP IPv4 host: timeout di tre secondi sul
percorso provato, con 69 controlli locali host positivi. Controlli adiacenti:
17:18:33 UTC prima, 17:18:43 UTC dopo il tentativo iniziato alle 17:18:37 UTC.
Listener chiuso alle 17:19:09 UTC; assenza del listener verificata. Evidenze e
hash in [HOST-GUEST-READINESS](HOST-GUEST-READINESS.md). Il primo run senza probe
valido non è contato. La risposta SSH è tornata sulla connessione iniziata
dall'host. Nessuna modifica firewall, installazione o pubblicazione applicativa.

Esteso il canary con arresto anticipato controllato e controllo positivo finale;
tre metodi unittest locali passati, inclusi loopback IPv4/IPv6 e chiusura.
Questi test locali non sostituiscono le prove della VM. INF-VM-02 resta aperto
per container, altre origini, IPv6 ed egress; nessuna accettazione globale o
CI applicativa dichiarata da questo checkpoint.
