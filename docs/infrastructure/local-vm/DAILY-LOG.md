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

### Preparazione H-04 — container verso host IPv4

Creati runner guest e wrapper PowerShell con ingresso unico, senza pull:
esportazione dell'immagine Python già presente su host, verifica hash prima
del load guest e identità immagine fissata. Due reti di prova: bridge predefinito
e bridge ordinario temporaneo. Controllo container → container prima e dopo
il tentativo verso il canary host; nessuna pubblicazione Docker o cambio policy.

Quattro unittest dei casi di errore passati. Prerequisiti wrapper verificati
con Windows PowerShell 5.1. Orchestrazione effettiva provata su Docker Desktop
per entrambe le reti, endpoint negativo loopback chiuso, controlli positivi e
rimozione di tutti i container e del bridge temporaneo riusciti. Nel primo
tentativo locale rilevato e corretto un errore nel codice del server sintetico;
nessun risultato invalido è contato come successo. Evidenze locali:
`h04-tool-validation-both.json`. Non è una prova di isolamento della VM.

Esecuzione Ubuntu ancora a cura dell'operatore per SSH/sudo interattivi.
[Procedura e limiti](NETWORK-PROBES.md). INF-VM-02 resta aperto; nessuna prova
LAN, IPv6, origine alternativa o egress Internet dichiarata da questa preparazione.

### Correzione wrapper H-04 dopo esecuzione operatore

Il trasferimento operatore è riuscito, ma il wrapper è fallito al binding di
`Tee-Object`: `-FilePath` e `-Variable` appartengono a parameter set alternativi.
Il precedente `-ValidateOnly` non eseguiva quel ramo e non poteva rilevarlo.
Separati i due impieghi in pipeline. Riprodotto il difetto con l'intero wrapper
in Windows PowerShell 5.1 e poi verificata la correzione con lo stesso fixture:
SSH/SCP/Docker simulati, listener canary reale, trascrizione e report coerenti,
chiusura con controllo positivo finale. Fixture locale `test_h04_wrapper.ps1`;
questo non è un test della VM. Il listener del tentativo reale
`h04-ipv4-0b1fa3c004c5448c8ad33a56ba2376d2` risulta chiuso normalmente nel
report host; nessun risultato guest acquisito, H-04 resta non verificato.

### H-04 IPv4 completato sulla VM, report recuperato senza riesecuzione

Run operatore `278ac618aa3a4cccba67d4a2ab54300e`, 18:28–18:29 UTC: runner
guest completato su bridge predefinito e bridge temporaneo. Entrambi i probe
Windows in timeout, controlli tra container positivi prima/dopo e 33 controlli
host positivi. Hash archivio e identità immagine confermati; nessun errore di
pulizia guest riportato. Listener Windows chiuso e assenza di ascolto verificata.

Corretto un secondo difetto del wrapper: assumeva il marcatore all'inizio della
riga, ma il PTY aveva anteposto testo. Recuperato il solo JSON dalla trascrizione
esistente senza nuova esecuzione guest. Nuovo parser con marcatore univoco,
runId e validazione JSON; test PowerShell 5.1 con tre varianti valide e quattro
casi invalidi. Wrapper completo provato con prefisso PTY sintetico, trasporti
simulati e listener reale. Nessun testo estraneo al payload inserito nei report
normalizzati o in Git. [Hash, evidenze e limiti](HOST-GUEST-READINESS.md).
INF-VM-02 resta aperto per LAN, IPv6, altre origini ed egress.

### Preparazione H-06 — DNS/HTTPS IPv4

Prossimo caso eseguibile con le risorse già presenti: guest e due bridge verso
`https://docs.python.org/3/`, richiesta HEAD senza credenziali, redirect o corpo
scaricato, verifica CA/hostname TLS e risoluzione IPv4 pubblica. Immagine H-04
riutilizzata dalla cache guest; nessun pull, trasferimento archivio o cambio
firewall. H-05 e LAN richiedono un altro punto di prova controllato; IPv6 resta
aperto, senza modificare rete o policy per creare una prova artificiale.

Quattro unittest passati: DNS privato non contattato, certificato invalido non
accettato, target inatteso respinto e pulizia dopo errore client. Verifica reale
dello strumento con HTTP 200 da Windows e dai due bridge Docker Desktop;
container e bridge temporaneo rimossi. Evidenza locale `h06-tool-validation.json`,
da non confondere con Ubuntu. Wrapper intero verificato in Windows PowerShell
5.1 con trasporto simulato, prefisso PTY e codici nativi zero/non zero; report
salvato anche in caso di errore. Fixture locale `test_h06_wrapper.ps1`.
Nessuna nuova prova VM ancora acquisita. [Procedura](NETWORK-PROBES.md).

### H-06 IPv4 acquisito sulla VM — 18:54 UTC

Esecuzione operatore completata, run `9449b2cd6e8647229c0646bf1890eb18`.
Il wrapper ha salvato correttamente il payload. Verificati report e tre origini:
processo guest, bridge Docker predefinito e bridge temporaneo; risoluzione IPv4
pubblica, HTTP 200 e TLS 1.3 per ciascuna, nessun errore di pulizia riportato.
Identità immagine e intervalli temporali coerenti. Nessun trasferimento immagine,
pull, listener o modifica firewall. [Evidenze e SHA-256](HOST-GUEST-READINESS.md).

H-06 smoke verso la destinazione scelta è verificato; non certifica tutti i
provider applicativi né IPv6. Restano per INF-VM-02 prove LAN, IPv6 e altre
origini amministrative. Nessun nuovo comando richiesto all'owner per validare
questo risultato; nessuna accettazione globale, merge o deployment.

### Preparazione H-02 IPv6 link-local

Verificata la disponibilità di un link-local IPv6 preferito sul Default Switch
Windows. Canary host reale riuscito con controlli locali positivi e chiusura;
evidenza locale `h02-ipv6-host-preflight-20261107`. Preparato ingresso unico
`Invoke-GuestIpv6Canary.ps1`, senza sudo o Docker. Lo scope guest è rilevato
tramite interfaccia uplink e route IPv6, senza riciclare l'indice Windows o
modificare la rete. Assenza di indirizzo/route e errori di percorso non sono
promossi a prove negative passate.

Cinque unittest passati. Wrapper completo verificato in Windows PowerShell 5.1
con listener IPv6 reale sul Default Switch, SSH/SCP simulati, prefisso PTY e
codici nativi zero/non zero; entrambi i report conservati e listener chiusi.
Fixture locale `test_h02_ipv6_wrapper.ps1`. Nessuna esecuzione guest ancora
acquisita; nessuna verifica IPv6 container/globale o LAN dichiarata.

### H-02 IPv6 link-local acquisito sulla VM — 19:25 UTC

Run operatore `452765bb0a6e4c6a9250caae3c495415`, senza sudo. Report salvato
correttamente dal wrapper. Confermati interfaccia `eth0`, link-local guest e
route kernel verso il canary Windows; scope applicato sul guest coerente.
Tentativo TCP in timeout, nove controlli host positivi e controlli adiacenti
prima/dopo il tentativo. Correlati indirizzo senza scope, porta, nonce e tempi;
script trasferito identico al repository. Listener chiuso, assenza di ascolto
verificata. [Hash ed evidenze](HOST-GUEST-READINESS.md).

Il percorso link-local guest → host provato è non raggiungibile; nessuna
attribuzione automatica a uno specifico filtro. Nessun cambiamento di policy
o route, nessun servizio persistente. INF-VM-02 resta aperto per LAN, altre
origini e perimetro IPv6 container/globale. Nessuna ulteriore esecuzione richiesta
all'owner per confermare questo risultato.

### Individuazione delle origini per le prove residue

Consolidati i prerequisiti LAN/H-05 e IPv6 container/globale nella readiness.
L'owner non ha un secondo PC, ma dispone di iPhone e Android sulla LAN.
Possibili origini controllate, con strumenti già disponibili e percorso verso
il Default Switch ancora da verificare. Non predisposti nuovi switch/VM,
forwarding, listener LAN sull'host o installazioni sugli smartphone. Un timeout
da un'origine priva di route non verrà usato come prova della whitelist SSH.
L'owner conferma che Android non ha app terminale/server. Documentata la proposta
di anticipare soltanto manifest e validazione statica INF-VM-03, mantenendo il
gate di avvio VM e i residui INF-VM-02 aperti; in alternativa predisporre Android
per le prove. Scelta da autorizzare esplicitamente, nessuna opzione applicata.

### INF-VM-03 — anticipo statico autorizzato e preparato

L'owner sceglie «Anticipa i manifest locali; prove residue aperte». Registrata
l'eccezione limitata: manifest e controlli locali, nessun avvio/trasferimento VM
né chiusura di INF-VM-02. Creati tre progetti in `deployment/local-vm/`, con
16 ruoli fixture inerti, 13 reti distinte e 7 volumi. Shared possiede le reti
trasversali; ambienti proprietari delle rispettive data/bus/egress e volumi.
Alias qualificati per ambiente, nessuna porta pubblicata o secret operativo.

Validator dedicato esegue soltanto Compose config con env vuoto tracciato e
confronta porte/identità runtime con schema e overlay canonici. Tre config validi
con Compose host 5.6.1; 11 mutazioni negative respinte. Gate canonico deployment
e relativi test negativi passati. Nessun install/build/pull/create/up, processo
applicativo o risorsa Docker avviati. Il modello statico non dimostra DNS o
isolamento runtime: fase INF-VM-03 ancora parziale.
[Perimetro e comando ripetibile](../../../deployment/local-vm/README.md).

### INF-VM-03 — listener sintetici, matrice e runner preparati

Su richiesta dell'owner, sostituiti gli sleep con listener TCP IPv4 sintetici
su 18080, identità JSON e durata massima 600 secondi. Bind mount del solo file
probe tracciato in lettura; porte canoniche `expose` restano metadati, nessuna
porta host pubblicata. Definiti 15 collegamenti ammessi e 18 negazioni, inclusi
database/Redis/NATS incrociati tra ambienti e limite UI → Meilisearch.

Runner senza Docker nel modo predefinito (solo piano). Modo runtime futuro su
fixture già avviate: non crea topologia, reti o volumi e non arresta fixture.
Crea/rimuove solo client temporanei con ownership verificata; DNS e TCP distinti,
probe diretti a tutti gli IP target, controlli positivi prima/dopo le negazioni.
Guasti DNS, servizi inattesi e target spenti non diventano prove negative passate.

Dieci test locali passati: listener loopback reale e chiusura, casi di errore,
orchestrazione completa dei 33 casi con Docker simulato, pulizia client e rifiuto
di rimozioni fuori ownership. Config Compose valido: 11 guardie topologia e
4 mutazioni matrice respinte. Nessun Docker runtime, pull, SSH o avvio VM eseguiti.
INF-VM-02 e accettazione runtime INF-VM-03 rimangono aperti.

### INF-VM-04 — audit consumer e proposta di bootstrap

Preparato [BOOTSTRAP-CONTRACT](BOOTSTRAP-CONTRACT.md), con soli sorgenti e
documentazione pubblica: nessuna lettura di env operativi, PEM o password manager.
Tox21 ispezionato in sola lettura al commit `2cbfcd467afa9e9643065c630f6b06f265f0ac5a`.
Confermati Nest env-only per configurazione ordinaria prod-like, RSA base64/raw,
13 HMAC legacy, adapter locale vietato in staging/prod; Tox21 con pubblico PEM.

Confermato il vincolo auth NATS: parser Nest senza credenziali e transport con
soli servers; non abilitare auth sul broker senza un task consumer coerente.
Riconfermata la lacuna Meilisearch già nota: search e dispatcher usano lo stesso
client/key, con separazione delle autorizzazioni ancora da chiudere.

Proposto flusso manuale prepare → receive senza PTY → apply, con sudo separato
dal trasporto dei valori; file per consumer su area volatile, permessi rispetto
all'UID reale, launcher compatibile file → env dentro il container ove necessario.
Ciclo di vita esplicito per pausa, restart, recreate, chiusura e reboot. Proposta
VM-028 da approvare: nessun helper, modifica app/Compose, provisioning, autenticazione
o riavvio eseguiti. Verifica documentale dei riferimenti; nessun nuovo test runtime.

### INF-VM-04-B — adattatore Nest file → ambiente opt-in

Implementati lettore JSON limitato e nuovo entrypoint esplicito, lasciando
main/CMD esistenti invariati. Allowlist dai nomi canonici più RSA legacy,
ambiente staging/production esplicito, divieto override/variabili di controllo,
validazione completa prima dell'iniezione, dati letterali senza shell/expansion.
File regolare, apertura Linux no-follow/non-blocking, permessi e dimensione
controllati; errori costanti senza contenuti o percorsi. Nessuna eliminazione del
file attivo, ricevitore privilegiato o modifica a Compose/applicazioni esterne.

34 test Jest Windows passati, uno POSIX saltato; 7 controlli filesystem reali
su Linux isolato locale con UID 10001 passati (rete disattivata, dati sintetici,
container terminato/rimosso). Typecheck senza emissione, build Nest e lint mirato
passati; entrypoint compilato verificato in fail-closed senza file e senza avvio app.
Nessun avvio Nest, nuova immagine, lettura env/PEM reali o provisioning VM.
[Contratto, prove e limiti](NEST-SECRET-FILE-ADAPTER.md). INF-VM-04 resta parziale;
trasporto/ciclo di vita VM-028 e gate operativo restano separati.

## 8 novembre 2026 — INF-VM-04-C, separazione client Meilisearch

Introdotto un client writer dedicato al dispatcher outbox, alimentato dalla
variabile opzionale `MEILISEARCH_LOG_KEY`. Il client search conserva token e
nome legacy `MEILISEARCH_MASTER_KEY`. Omissione del nuovo valore mantiene la
compatibilità anche in staging/production; valore vuoto invalido, nessun
fallback alla chiave search dopo un rifiuto remoto. Payload, destinazioni e
retry dell'outbox rimangono invariati, incluse mutazioni generiche legacy.
Il contratto VM richiede esplicitamente due key ristrette e indici precreati.

97 test Nest mirati passati, uno POSIX saltato su Windows: configurazione nei
quattro ambienti, injection reale di due client distinti e consumer outbox,
ricerca molecolare, produttori dei log e adapter da file con entrambe le key.
Typecheck, build Nest e lint mirato passati. Dai controlli preliminari emerse
due omissioni del precedente adapter: eccezioni puntuali per il confine bootstrap
nella guardia `process.env` e registrazione del nuovo entrypoint nel grafo di
raggiungibilità. Corrette senza modificare gli script dei controlli. Guardie
architetturali con casi negativi, confine logger e documentazione passati.

Smoke Meilisearch reale su Docker Desktop locale, isolato, non-root e con soli
dati sintetici: 8 letture ChEMBL, 8 scritture/replay dei log e 40 negazioni HTTP
403 esplicite. Il primo tentativo è stato terminato dal limite memoria del
container: l'indicizzatore del digest considera la RAM host. Impostati soltanto
per la prova 64 MB e un thread; smoke finale passato. Nessun pull, porta host o
volume persistente; container/rete della prova rimossi. Nessun avvio dell'app
Nest completa, accesso ai materiali reali, SSH o operazione sulla VM.

[Contratto e comando ripetibile](MEILISEARCH-OPERATIONS.md). VM-020 mantiene
aperta la parte di provisioning/verifica sulla VM. INF-VM-04 rimane parziale:
auth NATS consumer, trasporto/ciclo di vita VM-028 e gate 02/03 ancora aperti.

### INF-VM-04-C — autenticazione dei transport NATS Nest

Scelta esplicita owner: user/password distinti per consumer e ambiente,
separati dall'URL (VM-029). Aggiunte `APP_NATS_USERNAME` e `APP_NATS_PASSWORD`
opzionali e da dichiarare insieme: omissione completa preserva legacy; coppia
incompleta, valori vuoti o tipi errati bloccano la validazione senza esporre valori.
La factory condivisa passa `user`/`pass` sia al listener Nest sia al client RPC;
endpoint, formatter di startup e policy JWT restano separati. Redazione
strutturata estesa al campo SDK `pass`; adapter da file accetta i nuovi nomi.

95 test mirati passati e uno POSIX saltato su Windows; typecheck, build e lint
mirato passati. Grafo moduli/configurazione e raggiungibilità Nest verificati.
Smoke reale locale con factory compilata e transport Nest: 2 request/reply
autenticati, 1 compatibilità anonima e 16 rifiuti `AUTHORIZATION_VIOLATION`
per assenza credenziali, password errata, utente ignoto e coppia dell'altro
ambiente. I guasti di rete non valgono come rifiuti auth.

Tre broker sintetici e un probe su Docker Desktop isolato, immagini locali
fissate per digest, senza pull/porte host/volumi persistenti; risorse Docker e
file temporanei rimossi. Nessun avvio app completa, SSH o modifica VM.
Tox21 letto soltanto al commit `2cbfcd467afa9e9643065c630f6b06f265f0ac5a`:
richiede un task dedicato per parametri separati e validazione Pydantic.
Non abilitare auth sul broker operativo prima dell'allineamento dei consumer.
[Contratto, comando e residui](NATS-CLIENT-AUTH.md). INF-VM-04 ancora parziale;
VM-028 e gate di avvio 02/03 invariati. CI remota distinta dalle prove locali.

### INF-VM-04-C — allineamento autenticazione broker Tox21

Su prosecuzione autorizzata dall'owner, creato il branch Tox21
`feature/infra-vm-nats-client-auth` da `develop` pulito (`2cbfcd4`). Commit e
push `263ccbc`, nessun merge. Variabili opzionali `NATS_USERNAME` /
`NATS_PASSWORD`, validate in coppia; `SecretStr` per mascherare la password;
inoltro esplicito a nats-py. URL con userinfo ora rifiutati, migrazione documentata.
JWT per servizio e contratti dei cinque RPC preservati. `develop` Tox21 invariato.

107 test applicativi passati su Windows e Linux, dipendenze esistenti. Smoke
reale isolato: 10 RPC autenticati, 5 legacy anonimi e 8 rifiuti espliciti del
worker, readiness falsa e chiusura connessioni nei fallimenti. Inference e
PubChem sostitutivi, RDKit reale; nessun peso/PEM o provider esterno. Test con
sorgenti selezionate su immagine dipendenze locale, non nuova immagine release.
Smoke registrato nella CI Tox21 contro la sua immagine appena costruita;
workflow YAML e 53 sorgenti Python validati sintatticamente. [CI sullo SHA
`263ccbc7429a85e1961b13d9a57038a46a07497a`](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42469399664)
completata con successo: job Linux CPU application/containers e **Required gate
verdi sullo SHA esatto**. Branch Tox21 pronto per review/integrazione dell'owner.
Risorse Docker/file temporanei rimossi; nessun SSH o avvio VM.

Report fuori Git in `C:/Users/giuli/.codex/artifacts/inf-vm-04/tox21-nats-auth/`.
[Contratto e residui](NATS-CLIENT-AUTH.md): integrazione del branch Tox21,
consegna protetta delle credenziali al worker, config broker e gate VM ancora
aperti. VM-028 resta proposta; INF-VM-04 non è dichiarato completato.

### INF-VM-04-B — consumer Tox21 da file e continuità dei branch

L'owner conferma Tox21 `feature/infra-vm-nats-client-auth` come base operativa
persistente, con lo stesso criterio di Web `feature/infra-vm-docker-engine-architecture`.
Registrato VM-030: proseguire qui, nessun nuovo ramo per task compatibili e ogni
integrazione riservata all'owner. Nessun merge e `develop` invariati.

Commit Tox21 `b6476dd`: launcher opt-in `python -m bootstrap_secrets`, file JSON
da `MERCURION_BOOTSTRAP_FILE`, coppia NATS completa e allowlist ristretta.
Ambiente esterno esplicito staging/production; controllo UTF-8/JSON/dimensioni,
collisioni, atomicità, file/permessi/no-follow, descriptor e diagnostica costante.
Main caricato soltanto dopo la lettura. CMD esistente invariato; moduli aggiunti
alla whitelist Docker e all'inventario runtime. Nessuna dipendenza aggiunta.

Suite applicativa Linux UID 10021: 122 passati; Windows: 120 passati e 2 POSIX
saltati. CLI testato con sentinella, senza caricare app/modello. Smoke reale
NATS con 8 letture di file sintetici: 10 RPC autenticati, 5 legacy e 8 rifiuti
auth, con connessioni chiuse/readiness falsa sui fallimenti. RDKit reale;
inferenza e PubChem sostitutivi. Immagine dipendenze locale e sorgenti selezionate,
nessuna nuova release locale. 56 file Python validati sintatticamente.

Report in `C:/Users/giuli/.codex/artifacts/inf-vm-04/tox21-file-bootstrap/`.
[CI dello SHA `b6476ddebd66f1879227d1debf6fa00705a6bbbb`](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42473032259)
completata con successo: job Linux CPU application/containers e Required gate
verdi sullo SHA esatto. Risorse temporanee rimosse, nessun dato
operativo letto, SSH o avvio VM. [Contratto](TOX21-SECRET-FILE-ADAPTER.md).
Ricevitore/apply, consegna, ownership mount e lifecycle VM-028 ancora aperti.

## 9 novembre 2026

### INF-VM-04-A/B — pilot di ricezione e apply Tox21

Su prosecuzione autorizzata dall'owner, implementate le primitive Linux
`prepare` root, `receive` non-root via stdin e `apply` root. Envelope chiuso
Tox21/NATS, ambiente concorde con preparazione, namespace fisso su tmpfs,
identità risolte localmente, letture no-follow/limitate, pubblicazione atomica,
inbox sigillata e rifiuto del riuso. File finale UID 10021, modo 0400;
nessun percorso o comando scelto dal payload. Stati interrotti conservati
senza retry automatico; possibile residuo privato se crash dopo pubblicazione.

17 test Linux passati su Docker Desktop locale, senza rete/pull/porte/volumi:
identità reali root/65534/10021 e adapter Tox21 effettivo, ambiente e contratti
invalidi, replay, file impropri, lock occupato, limite consumer serializzato,
tmpfs mancante e fallimento prima della pubblicazione. Il primo harness
ristretto non disponeva di FOWNER per chmod dopo chown: aggiunta al solo test,
insieme alle altre capability necessarie, poi esecuzione completa riuscita.
Windows: quattro test contratto passati, tredici integrazioni Linux escluse.
Comando PowerShell 5.1 realmente eseguito; risorse effimere rimosse.
[Contratto, comando e residui](SECRET-DELIVERY-PILOT.md).

Nessun SSH, helper installato o dato operativo letto. Trasporto host, estensione
agli altri consumer, mount/restart/recreate e gestione operativa degli errori
restano aperti. INF-VM-02/03 e INF-VM-04 non chiusi; VM-028 non adottato sulla VM.

### Tox21 — correzione dei keyword type hint NATS

Segnalazione owner: `type: ignore` locale sulla chiamata a `nc.connect`.
Riprodotto con Pyright 1.1.414 già in cache, ambiente esistente e typeshed
Pylance locale. Il `dict[str, str]` del metodo credenziali perdeva i nomi delle
chiavi, generando venti errori nella chiamata isolata. Sostituito con TypedDict
opzionale `user`/`password`, mantenendo validazione runtime della coppia.
Rimossa la soppressione locale; `main.py` torna identico al commit precedente.
Prova isolata e analisi dei due sorgenti effettivi: zero errori/warning.
Suite applicativa Windows: 120 passati, due POSIX esclusi. Nessuna dipendenza
o regola del checker aggiunta. Report fuori Git sotto
`C:/Users/giuli/.codex/artifacts/inf-vm-04/nats-credential-typing/`.

### INF-VM-04 — orchestratore host sintetico

Implementato launcher PowerShell 5.1 con default plan-only e `-Execute`
esplicito riservato alla prova operatore. Sei fasi: stage codice, prepare
sudo, receive senza PTY, apply sudo, inspect solo metadati e cleanup della
sola copia del codice. Il payload nasce in memoria, è esclusivamente
sintetico e non compare in argv, file host o ricevute. Stderr/passphrase e
terminali sudo non sono catturati; nessun transcript automatico.

Codice guest verificato per hash atteso e metadati, eseguendo gli stessi byte
letti prima del controllo: nessuna riapertura dopo hash e nessun helper root
permanente. Errori/timeout fermano il flusso senza retry o rimozione dell'active.
L'helper guest ora espone `inspect` non-root per ownership/permessi, senza
aprire il contenuto. [Contratto e comando](HOST-SYNTHETIC-DELIVERY.md).

26 test Linux locali passati: comandi guest e shell POSIX effettivi, identità
root/non-root reali, tampering del codice rifiutato, lettore Tox21, stop alle
fasi fallite e ricevute errate. Windows: 10 passati e 16 integrazioni escluse;
prova nativa di argomenti e stdin binario tra processi Windows riuscita.
Launcher plan-only realmente eseguito da PowerShell 5.1. Risorse Docker
effimere rimosse; nessun pull, rete, porta o volume creati.

Trasporto SSH simulato, sudo sostituito da identità di processo nel harness:
nessun SSH/PAM/passphrase/PTY remoto o filesystem VM verificato. Nessuna
operazione VM o lettura di materiale operativo, nessuna modifica Tox21.
INF-VM-02/03/04 restano aperti; prova operatore sintetica come passo successivo.

Verificata inoltre [CI Tox21 del fix tipi NATS](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42575718871):
SHA `5f3d837cf1356c6ccc875fea007d396684e3cc69`, completed/success. Non è evidenza
CI dell'orchestratore Web né collaudo VM.

### INF-VM-02 — timeout SSH e piano di rete statica

Owner: due consegne sintetiche fallite al primo collegamento SSH; anche SSH
ordinario in timeout. Alias ancora su `172.26.50.235`, Default Switch host
ora `172.27.0.1/20`; il vecchio IP è instradato sulla Wi-Fi. Console owner:
Ubuntu operativo, eth0 `172.27.1.64/20`, stesso MAC. TCP/22 sul nuovo IP ancora
in timeout; ACL owner conferma allow ancora da `172.26.48.1/32` e deny outbound
`172.16/12`. Evento preciso della riconfigurazione non provato.

VM-032: rete Internal/statica/NAT e vincolo owner di nessun accesso diretto
LAN bidirezionale, nuova rete Pubblica in Kaspersky. Scritta [procedura italiana
M-01…M-08](STATIC-NETWORK-MIGRATION.md), con stato, gate, filtri e recupero.
Nessuna modifica switch/NIC/NAT/SSH/firewall/Kaspersky/guest eseguita.

Collector read-only verificato su PowerShell 5.1: senza elevazione segnala
sezioni Hyper-V/HNS indisponibili; owner esegue elevato con `incomplete=false`.
Report locale `static-network/dba96158ba044e3eb24c2822004fde31/inventory.json`.
Due reti HNS ICS, nessun NetNat/mapping statico; reti Docker lette con contesto
esplicito e soli metadati. Raccolta forwarding/weak-host/adattatori aggiunta
per le repliche. Nessun dato sensibile in Git.

Proposto `10.203.240.0/24`, host `.1`, guest `.10`: nessun conflitto nei prefissi
osservati; future VPN/reti richiedono nuovo controllo. Prima del guest: switch
vuoto, Pubblica e regole verificate. M-01 completato; migrazione, test e reboot
aperti. Vecchie prove non certificano la nuova rete; INF-VM-02/03/04 non chiusi.

**Avanzamento owner M-03:** creato `Mercurion-Internal` di tipo Internal e
assegnato `10.203.240.1/24` all'host, interfaccia 68. Rilettura: ActiveStore
Preferred/Manual, configurazione presente anche nel PersistentStore, nessuna
default route IPv4 sulla nuova interfaccia, categoria Windows Public.
L'output iniziale Tentative/PersistentStore Invalid non è stato usato come
diagnosi di duplicazione: verificato separatamente lo stato operativo.
Guest non ancora migrato; nessuna modifica ACL/NAT da parte dell'agente.
M-04 pendente: classificazione Pubblica in Kaspersky prima dell'attach;
persistenza dopo reboot e isolamento restano non collaudati.

**Avanzamento M-04:** screenshot owner conferma Kaspersky Rete pubblica sulla
riga connessa `10.203.240.1/24` di Mercurion-Internal. Default Switch
`172.27.0.1/20` appare Rete locale, nonostante la precedente scelta esplicita
Pubblica riferita dall'owner. Ipotesi di nuovo profilo dopo cambio subnet,
non causa dimostrata né prova di modifica dello stesso record. Richiesto
ripristino Pubblica sul vecchio switch finché il guest vi resta collegato;
nessuna modifica WSL. Conferma del ripristino ancora assente.
Classificazione attuale verificata, efficacia dei filtri e reboot ancora aperti.
Richiesto elenco nomi/permessi Netplan da console per preparare M-05; nessuna
modifica guest, ACL o Kaspersky eseguita dall'agente.

**Preparazione M-05 da console owner:** screenshot mostra unico file attivo
`00-installer-config.yaml` root:root 0600 (374 byte) e `.yaml.bak` root:root
0600 (169 byte), da non sovrascrivere. Configurazione: networkd, match MAC
esistente/set-name eth0, DHCPv4 attivo, DHCPv6/RA disattivati, DNS pubblici
1.1.1.1/9.9.9.9 con DNS DHCP esclusi. Nessun segreto mostrato nello screenshot;
nessun contenuto guest copiato come file operativo nel repository.
Richiesto backup distinto `/root/netplan-pre-static.yaml` con `cp -anv`,
senza sovrascrittura, conferma ancora pendente. VM da lasciare accesa fino
alla conferma; nessuna modifica Netplan/ACL o attach eseguita.

**M-05, backup e arresto confermati:** nuovo screenshot owner mostra copia
eseguita in `/root/netplan-pre-static.yaml`; warning coreutils su portabilita
di `-n`, non errore di copia. Il confronto con `cmp` resta prima della modifica
Netplan. Owner risponde «spenta» dopo arresto ordinato; `shutdown -h now` e
`poweroff` sono entrambi adatti sul guest systemd, distinto dal Turn Off forzato.

Preparati entrypoint/libreria/test per ACL della sola vNIC con MAC noto.
Default Plan read-only; Apply VM Off, preflight switch/IP, snapshot obbligatorio,
due deny temporanei e readback esatto prima del rilascio. Prima fase 14 ACL
estese, zero semplici, solo allow SSH dall'host interno; nessun allow egress.
Nessun attach/NAT/start o modifica guest da parte del codice. Quarantine
esplicita per il recupero; ripristino guardie dopo errore finale solo best effort,
mai accettazione implicita. [Comando e limiti](SSH-ONLY-ACL.md).

16 scenari passati su PowerShell 5.1 con API native simulate, inclusi errori
preflight/snapshot/aggiunta/readback, allow extra, start concorrente, idempotenza
e quarantena. Il Plan reale non elevato viene negato da Hyper-V senza scritture.
Nessun Apply reale eseguito dall'agente; compatibilita/readback Hyper-V e traffico
ancora da verificare con l'owner. Guida aggiornata: prima SSH protetto, poi
NAT/egress con review LAN/WAN; isolamento e reboot restano aperti.

**M-05, Apply reale owner:** ricevuta settingsReadbackVerified true, 14 ACL
estese, internetEgressEnabled false, isolationAccepted false, vmStarted e
adapterMoved false. Snapshot locale
`acl/cd8eef94c8b34013aea52a06258fec50/before.json` letto per sola identita e
conteggi: Mercurion-Server, Scheda di rete, MAC 00155D00DD01, Default Switch,
sei ACL semplici e due estese precedenti. Nessun backup grezzo in Git.
Primo Apply conferma compatibilita cmdlet/readback, non prove di traffico.
IP host interno ancora Preferred. Preparato comando con parametri nativi
verificati per spostare la sola vNIC; non eseguito dall'agente, VM da tenere
Off fino al riscontro. Poi rileggere ACL sul nuovo collegamento prima dell'avvio.

**M-06, solo collegamento:** owner esegue Connect-VMNetworkAdapter sulla sola
scheda esistente; output conferma Mercurion-Internal e MAC 00155D00DD01
invariato. Nessun avvio VM, modifica Netplan o NAT dichiarati. Richiesto
readback `-Mode Verify` delle ACL sul nuovo collegamento; esito ancora pendente,
VM da mantenere spenta. Isolamento e persistenza non collaudati.

**Readback dopo collegamento owner:** Verify restituisce settingsReadbackVerified
true, internetEgressEnabled false, isolationAccepted false. Confermata policy
conservata sul nuovo switch, senza scritture. Richiesto avvio normale/LUKS e
login console per confronto quiet con `cmp` fra Netplan e backup; BACKUP_OK
ancora pendente. Nessuna istruzione di modifica del file o apertura egress
consegnata in questo passaggio. Prove di traffico ancora aperte.

**Console guest e backup:** owner restituisce BACKUP_OK dal confronto con
`cmp` dopo il nuovo avvio, quindi file attivo e backup coincidono. Preparata
istruzione di modifica minimale nel solo YAML attivo: DHCPv4 disattivato,
link-local vuoto, IP 10.203.240.10/24, route default via 10.203.240.1; MAC,
set-name, networkd, override e DNS esistenti conservati. Richiesta sola
validazione con netplan generate e marker NETPLAN_OK prima dell'applicazione.
Nessuna modifica guest eseguita dall'agente; esito dell'editing/generate
ancora pendente. NAT/egress non aperti e isolamento non accettato.
Frammento YAML verificato con parser locale dopo estrazione dal Markdown;
questa prova sintattica non sostituisce generate sul Netplan del guest.

**Validazione reale guest:** dopo correzione manuale di spazio dopo trattino
e indentazione via, owner mostra YAML con parametri previsti e NETPLAN_OK
da `sudo netplan generate`. Nessun warning visibile nell'output fornito.
Non ancora applicato alla rete. Preparata prova console `netplan try --timeout
300` con richiesta di non confermare subito, per controllo TCP/22 host → nuovo
IP prima della conferma. Route host 10.203.240.0/24 sulla vEthernet interna
riletta. Try, conferma, SSH, LAN e persistenza ancora da verificare.

**Netplan applicato:** owner avvia try e segnala attesa. Controllo host immediato:
TCP/22 raggiungibile su 10.203.240.10 con origine 10.203.240.1, neighbor sullo
switch interno e MAC 00-15-5D-00-DD-01 atteso. Owner conferma poi configurazione
accettata. Non è un login né una prova LAN/persistenza.

Il client ssh-keyscan locale non produce chiavi per errore KEX non supportato
(sntrup761x25519-sha512@openssh.com), non per chiave server discordante.
Eseguito allora handshake con client ssh normale, autenticazioni utente tutte
disabilitate, StrictHostKeyChecking yes e HostKeyAlias temporaneo del vecchio
IP: il client conferma ED25519 coincidente con il record fidato precedente.
Permission denied finale atteso in questa sola prova senza autenticazione.
Nessuna modifica di algoritmi, known_hosts, credenziali o autenticazione server.

Aggiornato solo HostName dell'alias mercurion-server nel config SSH utente,
preservando contenuto restante e formato; copia protetta nella stessa .ssh
con ACL originali. Hostname effettivo riletto e confermato; nessuna chiave
privata letta nel contenuto. Vecchio record fidato preservato, nuovo IP non
ancora registrato: richiesto login interattivo owner con impronta gia verificata.
NAT/egress restano chiusi; rete LAN e reboot ancora da collaudare.

**Login reale recuperato:** owner conferma «Shell Ubuntu raggiunta» dopo
`ssh mercurion-server` al nuovo IP statico. È evidenza di accesso amministrativo
riuscito, distinta dall'handshake diagnostico precedente. Documentata prima
prova parziale di riavvio guest con sblocco LUKS, nuovo login e lettura IP/route;
esecuzione ancora pendente. Nessun NAT o egress abilitato; reboot host,
persistenza Kaspersky e isolamento LAN bidirezionale restano aperti.

**Riavvio guest verificato dall'owner:** nuova shell SSH raggiunta; eth0 UP
con 10.203.240.10/24, route `default via 10.203.240.1 dev eth0 proto static`.
La virgola accidentale nel primo comando route ha prodotto solo errore di
sintassi; il comando corretto ha restituito il gateway atteso. L'agente rilegge
IP host 10.203.240.1/24 Preferred/Manual e profilo Windows Public. Nessun
riavvio host effettuato o richiesto in questa prova. Preparato controllo ACL
read-only e categoria Kaspersky dopo riavvio guest; ancora pendenti. NAT/egress
chiusi, isolamento LAN e accettazione complessiva ancora aperti.

**Readback ACL post-riavvio guest:** owner esegue Verify da PowerShell
amministrativa; settingsReadbackVerified true, internetEgressEnabled false,
isolationAccepted false. Nessuna modifica eseguita dal comando. Resta da
confermare la categoria Kaspersky; nessuna nuova prova di isolamento traffico.

**Categoria Kaspersky post-riavvio guest:** owner conferma «Sì, Rete pubblica»
per la voce 10.203.240.1/24 del Mercurion-Internal. Configurazione SSH-only
ricontrollata; reboot Windows, prove sui pacchetti e nuova fase NAT/egress
restano distinti e non eseguiti. Nessuna risorsa di rete modificata dall'agente.

**Prerequisito egress:** owner non conosce lo stato di port forwarding, DMZ e
mapping UPnP. Gateway host riletto 192.168.0.1 sulla Wi-Fi; nessuna impostazione
del router acquisita. Richiesti marca/modello e accessibilità del pannello per
preparare verifica guidata read-only. Egress lasciato chiuso, nessuna assunzione
di assenza di servizi LAN raggiungibili tramite endpoint pubblici.

**Router identificato:** ZTE MC888 Ultra, pannello accessibile all'owner.
Preparata procedura italiana read-only per port forwarding, DMZ e UPnP,
usando la guida dell'operatore HKBN per la famiglia MC888 e dichiarando il
limite rispetto al firmware Ultra effettivo. Esiti ancora pendenti; nessuna
credenziale acquisita, configurazione router o apertura egress eseguita.

**Esiti router owner:** port forwarding disabilitato, DMZ disabilitata,
UPnP disabilitato, mapping disabilitato. Nessuna modifica dichiarata.
Preparato passo WinNAT con lettura attuale prima della creazione nominata,
senza rimuovere NAT altrui e senza aprire egress. Sintassi New-NetNat e
Get-NetNat confrontata con cmdlet locali; limite WinNAT verificato nella
documentazione Microsoft. Richiesta all'owner sola lettura Get-NetNat con
output JSON esplicito anche quando vuoto. Creazione ancora non eseguita.

**WinNAT prima della creazione:** owner esegue Get-NetNat da PowerShell
amministrativa; output array vuoto, nessun WinNAT elencato. Richiesta sola
creazione Mercurion-NAT con prefisso 10.203.240.0/24; nessuna modifica ACL o
router. Esito ancora pendente; nessun allow outbound aggiunto.

**Creazione NAT owner:** New-NetNat restituisce Mercurion-NAT, prefisso
10.203.240.0/24 e Active 1. Nessuna modifica ACL richiesta. Richiesto nuovo
inventario amministrativo con lo script esistente per rileggere NAT, mapping,
ACL, forwarding/weak-host e HNS dopo questa modifica significativa. Report
ancora pendente; non è una prova di egress, isolamento o compatibilità WSL/Docker.

**Inventario dopo NAT riletto:** report completo 98fda47d2bc34bb0893a9b65ff3aeea8
alle 11:44 UTC. Un solo Mercurion-NAT corretto, nessun mapping, zero ACL semplici
e 14 estese semanticamente uguali alla policy SSH-only. Windows Public,
forwarding/weak-host disabilitati, RemoteAccess fermo. NIC/MAC/switch attesi;
reti Docker Desktop interrogabili. HNS espone metadato 172.23.112.0/20 per il
network Internal, senza corrispondente indirizzo/route host: nessuna modifica
o pulizia HNS. TCP/22 guest raggiungibile da 10.203.240.1 dopo creazione NAT.

**Preparazione H-02 statica:** wrapper IPv4 corretto dal vecchio Default Switch
al solo 10.203.240.1/24 Preferred su Mercurion-Internal. Sette scenari di
preflight sintetici Windows PowerShell 5.1 passati; tre test Python canary
passati. Listener temporaneo reale avviato sul solo IP interno, ValidateOnly
del wrapper riuscito; esecuzione guest richiesta all'owner, ancora pendente.
Run locale h02-ipv4-bd5212a11cb54b5281b49785de9bb04c, porta 62690, durata massima
600 secondi. Nessuna apertura firewall, ACL o egress e nessun nuovo login
SSH eseguito dall'agente. H-04/IPv6 non ancora adattati alla topologia statica.

**H-02 nuova rete eseguito:** file guest e output owner coincidenti, timeout
verso 10.203.240.1:62690 alle 11:50:47.819476 UTC. Identificatori e finestra
correlati con 36 controlli host tutti positivi, inclusi prima/dopo. Stop richiesto,
report controls-passed, processo 36256 terminato. Hash e limiti registrati in
HOST-GUEST-READINESS. Non è collaudo LAN o della futura policy egress.

**H-04 adattato:** wrapper ora vincolato al solo 10.203.240.1/24 Preferred su
Mercurion-Internal; preflight reale Windows PowerShell 5.1 passato con immagine
Docker Desktop già locale. Otto casi parser PTY passati, quattro unittest del
runner passati con Docker simulato. Richiesta all'owner esecuzione H-04 sulla
VM, ancora pendente. Nessuna modifica firewall/ACL o avvio applicazioni.

**H-04 confermato dall'owner e correlato:** run 5e97721d427d414ba8e36469f18efd93
(11:58:24–11:58:34 UTC), riferimento di accettazione. Bridge predefinito e
temporaneo, controlli container prima/dopo
raggiungibili, tentativi al canary 10.203.240.1 in timeout, nessun errore di
pulizia. Sedici controlli host tutti positivi, identificatori
e finestre correlati, listener chiusi; archivi e immagine attesa verificati.
Run e hash conservati in HOST-GUEST-READINESS. È collaudo del solo percorso
container → host IPv4 nella fase SSH-only, non LAN o egress. Nessuna apertura
outbound effettuata; prossimo passo apertura controllata per smoke DNS/HTTPS
e nuova verifica delle negazioni sulla policy completa.
Owner segnala ritardo nel mostrare il prompt sudo, poi autenticazione riuscita.
Documentato residuo UX e ipotesi buffering SSH/PTY da verificare; nessuna
modifica ad autenticazione/sudoers o richiesta di password. Nessun listener
canary residuo rilevato sull'host al controllo finale.

**Preparazione apertura DNS/HTTPS:** aggiunta selezione esplicita policy
DnsHttps alla libreria e all'entrypoint ACL; default SshOnly conservato.
Cinque allow stateful sotto i deny privati, 19 ACL complessive, DNS limitato
ai resolver Netplan e TCP/443 IPv4. Preflight rifiuta policy sconosciuta,
NAT/mapping o profilo incompatibili; ricontrollo finale e guardie best effort
anche su deriva NAT. Ventotto scenari lifecycle e 26 pacchetti iniziali
simulati passati su Windows PowerShell 5.1. Quattro unittest H-06 passati e
ValidateOnly Windows riuscito. Procedura italiana documentata; richiesto piano
amministrativo read-only, nessuna ACL reale modificata in questa preparazione.

**Piano DnsHttps amministrativo acquisito:** owner riporta 14 regole attuali,
19 previste, egress false e mutationsPerformed false, senza errori. Non è
un'installazione della policy. Richiesto arresto ordinato del solo guest prima
di Apply; stato Spenta ancora pendente.

**DnsHttps applicato dall'owner:** stato Spenta confermato dopo arresto ordinato;
Apply restituisce 19 ACL, settingsReadbackVerified true, internetEgressEnabled
true, isolationAccepted false, vmStarted false e adapterMoved false. Snapshot
84feb5630d804fbf85399137248b29fc acquisito e riletto dall'agente: identità vNIC
coerente, zero semplici e 14 estese precedenti uguali a SshOnly. Nessuna
connettività Internet dedotta dal flag. Richiesti avvio/LUKS e H-06 nel terminale
dell'owner; esiti ancora pendenti, poi ripetere le negazioni pertinenti.

**H-06 DnsHttps reale:** run owner 3a56cc9f09b74778b1224c738fe21e4b,
12:26:53–12:26:54 UTC. Report riletto: guest, bridge e bridge temporaneo
DNS IPv4 pubblico, TLS 1.3 verificato e HTTP 200 verso docs.python.org;
immagine attesa e cleanup senza errori. Dimostra quello smoke, non tutti i
provider né ogni resolver/trasporto DNS singolarmente.

**H-02 ripetuto con DnsHttps:** run 56664b9c8b2b465c89c93c213b485824,
10.203.240.1:52287, timeout owner alle 12:29:07.271508 UTC. Ventitré controlli
host tutti positivi, identificatori/finestra e controlli prima/dopo correlati.
Listener chiuso con stop, controls-passed. Run e hash registrati nella readiness.
Richiesto H-04 sulla stessa policy con egress attivo; ancora pendente.

**H-04 DnsHttps acquisito:** owner conferma run 7b517c3d29724aa0aaae6bde9559ef6c,
12:31:28–12:31:38 UTC. Report e archivio riletti: entrambi i bridge con
controlli container positivi e timeout al canary 10.203.240.1:61848, nessun
errore di pulizia. Dodici controlli host positivi, identificatori e finestre
correlati, host controls-passed con stop richiesto. Nessun listener residuo
e processo H-02 terminato. Hash registrati nella readiness.

**Verify finale owner:** DnsHttps, settingsReadbackVerified true,
internetEgressEnabled true, isolationAccepted false. Nessuna modifica eseguita
dal comando. Restano LAN/altre origini, IPv6, reboot host e controlli runtime
su porte private 443/53: gli H-02/H-04 attuali misurano porte TCP effimere.
Nessuna accettazione complessiva o avvio stack pubblico dedotti dagli smoke.

**Preparazione probe porte private:** aggiunti runner Python e wrapper unico
per TCP/443, TCP/53 su 10.203.240.1 e UDP/53 sul DNS ICS host del Default
Switch, indirizzo riletto dinamicamente (osservato 172.27.0.1). UDP wildcard
53 appartiene a SharedAccess: nessuna sostituzione o arresto. Controllo sul
solo IP interno non positivo, quindi escluso da affermazioni di blocco UDP.
Domande nonce.invalid con ID/question correlati, marker TCP, route Linux e
nove casi guest/bridge/bridge temporaneo. Readiness DNS limitata e registrata
prima della misura; ogni controllo fallito durante la misura invalida il run.
SSH diretto sulla console, report recuperato con SCP, niente trascrizione
del prompt; report guest 0600 assegnato al SUDO_UID/GID.

Undici unittest Python e tre scenari PowerShell 5.1 passati; preflight host
reale passato. Collaudo Docker Desktop: sei casi container con controlli
positivi e pulizia riuscita, quindici controlli host positivi; scope esclusivamente
verifica dello strumento, non evidenza VM. Prima iterazione locale con controllo
host fallito non accettata; timeout controlli poi allineato a tre secondi e
readiness esplicita prima dell'avvio. Richiesta all'owner prova VM, pendente.
Resta bytecode locale non versionato: rimozione rifiutata automaticamente con
motivo blocked by policy; escluso dal commit, nessun altro metodo di rimozione tentato.
