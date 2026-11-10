# Inventario corrente e lacune della baseline

**Baseline ispezionata:** `feature/infra-vm-docker-engine-architecture` al commit `6431b5bd1e22b59edd27c7500a4025f15053dd10` (7 novembre 2026), con la correzione degli indici log integrata. La documentazione fotografa le evidenze disponibili, **non** certifica una VM già distribuita. Nuovi commit richiedono una verifica dei punti interessati.

## Inventario di ciò che esiste

**Preparazione documentale INF-VM-04:** [contratto bootstrap](BOOTSTRAP-CONTRACT.md)
con evidenze dei consumer e proposta di consegna effimera. Nest non consuma
genericamente `_FILE` in staging/prod; Tox21 consuma PEM pubblico. Auth NATS
Nest e Tox21 configurabili tramite coppie opzionali user/password separate
dall'URL; Tox21 prosegue sul branch operativo `feature/infra-vm-nats-client-auth`,
con [adapter da file opt-in](TOX21-SECRET-FILE-ADAPTER.md) in `b6476dd`.
Provisioning broker, trasporto/apply e lifecycle ancora aperti.
Client Meilisearch search/writer separati l'8 novembre, con nuova
`MEILISEARCH_LOG_KEY` opzionale e fallback legacy; grant/provisioning VM aperti.
[Adapter Nest opt-in](NEST-SECRET-FILE-ADAPTER.md) disponibile:
34 test Windows e 7 verifiche Linux isolate passati; lettura POSIX testata con
UID 10001, nessun bootstrap dell'app/VM o provisioning eseguito.

**Base statica INF-VM-03:** tre progetti Compose fixture in
[deployment/local-vm](../../../deployment/local-vm/README.md), 16 ruoli sintetici,
13 reti e 7 volumi. Listener TCP sintetici e matrice di 15 casi ammessi/18 vietati
preparati. Dieci test locali del probe/runner passati (TCP loopback reale, Docker
simulato), senza convalida runtime della topologia. Validazione locale e
11 guardie topologia più 4 guardie matrice passate con Compose
5.6.1 host. Nessun avvio, risorsa Docker creata o trasferimento VM: anticipo
statico autorizzato dall'owner, con gate operativo INF-VM-02 ancora aperto.

**Aggiornamento INF-VM-02, 7 novembre:** la VM non è più soltanto un'ipotesi.
Inventario guest eseguito dall'owner: Ubuntu 26.04.1 LTS, Docker Engine 29.9.3,
Compose 5.7.0, SSH public-key-only senza root login, nessun container/porta Docker
pubblicata nello snapshot. Seconda raccolta operatore: 8 vCPU/16 GiB RAM fissa,
Default Switch, root su LUKS/dm-crypt/LVM, backend firewall Docker iptables e
due ACL estese e sei deny outbound semplici acquisiti. Caso guest → host TCP
IPv4 non raggiungibile con canary attivo e controlli positivi verificati;
H-04 TCP IPv4 verso Windows verificato anche da container su due bridge guest.
H-06 DNS/HTTPS IPv4 verso docs.python.org verificato da guest e due bridge:
HTTP 200, TLS 1.3 e nessun errore di pulizia riportato.
H-02 IPv6 link-local guest → canary Windows verificato con route/scope coerenti,
timeout e controlli host positivi prima/dopo. Restano IPv6 container/globale,
LAN, altre origini e policy Kaspersky specifica.
L'accesso Hyper-V
dell'agente è negato; l'accesso guest avviene tramite l'operatore, senza fornire
passphrase alla chat. [Baseline aggiornata e limiti](HOST-GUEST-READINESS.md).

| Componente | Evidenza nel repository | Stato |
| --- | --- | --- |
| Ambienti | `deployment/README.md`, `deployment/deployment-schema.json`, `deployment/overlays/{preview,production}.json` | Contratto comune esistente. `preview` è nome del deployment; runtime `APP_ENV=staging` |
| Frontend | `MercurionWebNg/Dockerfile` | Build multi-target; Angular SPA servita dal Nginx **interno** dell'immagine, porta 3497 |
| Gateway | `MercurionWebNode/Dockerfile`, `src/main.ts`, moduli GraphQL/Socket.IO | NestJS/Fastify, REST, GraphQL, WebSocket, porta interna 8098 |
| Scientifico | Repository separato `MercurionTox21`, `Dockerfile` multi-target | Worker Python CPU, cinque subject NATS, nessun endpoint HTTP pubblico |
| Dati | `docker_sl/Dockerfile.postgres`, `docker_sl/docker-compose.yml` | PostgreSQL 16/pgvector previsto; Compose corrente è sviluppo, **non** deployment VM |
| Redis/NATS | `deployment/deployment-schema.json` e Compose sviluppo | Immagini con digest già dichiarati; configurazione e segmentazione VM ancora mancanti |
| Meilisearch | `deployment/deployment-schema.json` e servizi Nest | Una istanza nel progetto VM; due indici ChEMBL usati dai backend, quattro indici log runtime |
| Log | `docs/meilisearch-log-indices.md` e test correlati | Nuovi log indicizzati per `APP_ENV`; modifica integrata nel branch |
| Edge | `k8s/preview/nginx-edge-config.yaml`, `docker_sl/nginx_dev/` | Routing storico utile, non adatto come file da riutilizzare direttamente |
| Secrets/JWT | `docs/configuration.md`, `MercurionWebNode/docs/jwt-*.md` | Schema e runtime predisposti; provisioning sicuro VM e bootstrap prod-like da progettare |
| Consegna | `scripts/export-web-container.py`, `scripts/coordinate-delivery.py` | Export e verifica locale di archivi; CI non pubblica oggi i tar distribuibili |
| QA scientifica | `docs/infrastructure/tox21-integrated-acceptance-qa.md` | Integrazione reale Nest compilato → NATS → Tox21; non certifica l'intera app o la VM |
| CI | `.github/workflows/ci.yml` | Test e immagini Web verificati, diagnostici caricati come artifact; nessun deploy automatico |

La versione corrente di Tox21 ha override `allow` / `require-jwt` / `disabled` per i cinque RPC; l'abilitazione di `require-jwt` non va presunta compatibile con i consumer Nest che non inoltrano token. Il default storico del flag globale è permissivo all'interno del dominio NATS. Vedere `MercurionTox21/docs/service-auth.md`.

## Vincoli applicativi già stabiliti

1. **Unica origine applicativa HTTP/WS**: Cloudflare → Cloudflare Tunnel → Nginx edge → Angular o Nest. Nessun servizio scientifico parla HTTP con Angular.
2. **Due ambienti applicativi distinti**, stessi tipi di servizi, database e segreti differenti. `preview` è il nome deployment dello staging.
3. **Meilisearch unico**, con indici molecolari condivisi per ricerca e indici log differenziati; mai disponibile attraverso l'edge applicativo.
4. **MercurionData e MercurionLandingFactory non sono servizi della VM.** Operano esclusivamente in locale per preparazione/importazione o generazione di asset. Gli eventuali risultati statici necessari a runtime sono artefatti separati.
5. **JWT senza rotazione operativa a caldo**: il codice predisposto si conserva, ma un cambio di chiave è deliberatamente breaking e richiede ri-autenticazione. Non introdurre automaticamente registry/provider a più versioni.
6. **Nessuna master key Meilisearch ai backend VM**. Il nome legacy `MEILISEARCH_MASTER_KEY` identifica il punto di configurazione del client, non il privilegio della chiave fornita.
7. **Nginx edge senza TLS origin e senza maintenance mode Kubernetes**. Access gestisce le policy di accesso Cloudflare, non sostituisce healthcheck e comportamento di errore applicativo.
8. **La UI Meilisearch sarà solo operativa, solo SSH, sola lettura.** Mai publicata su Cloudflare.

## Lacune effettive da affrontare

- SSH in timeout dopo cambio subnet Default Switch. Inventario amministrativo
  del 9 novembre acquisito; [migrazione statica](STATIC-NETWORK-MIGRATION.md)
  avviata dall'owner: switch/IP host creati, vNIC collegata e ACL riverificate;
  guest statico applicato/confermato con netplan try, TCP/22 e chiave server
  gia fidata verificati. Alias SSH aggiornato; owner conferma shell Ubuntu
  raggiunta sul nuovo indirizzo il 9 novembre, anche dopo riavvio guest:
  IP 10.203.240.10/24 e gateway statico 10.203.240.1 confermati.
  Verify ACL dopo riavvio guest riuscito; owner conferma Kaspersky ancora
  Pubblica. Riavvio host e prove di isolamento ancora aperti.
  Pubblica in Kaspersky e divieto LAN bidirezionale
  obbligatori; bootstrap ancora sospeso durante il collaudo della migrazione.
  Owner ha verificato sullo ZTE MC888 Ultra port forwarding, DMZ, UPnP e
  mapping: tutti disabilitati. Lettura amministrativa attuale WinNAT vuota;
  Mercurion-NAT creato con 10.203.240.0/24 e Active 1. Inventario post-creazione
  completo riletto: nessun mapping, 14 ACL SSH-only invariate, Windows Public,
  forwarding/weak-host disabilitati. TCP/22 nuovamente raggiungibile; nessun
  allow egress aggiunto. H-02 IPv4 sulla nuova rete: timeout guest → host con
  36 controlli host positivi prima/dopo e listener chiuso. H-04 eseguito su
  due bridge guest con controlli positivi e pulizia riuscita; riferimento owner
  5e97721d427d414ba8e36469f18efd93. LAN e policy completa con egress restano aperti.
  Transizione [DnsHttps](DNS-HTTPS-ACL.md) applicata poi dall'owner a VM Spenta:
  19 ACL confermate e snapshot della precedente policy verificato. Egress
  consentito dalla configurazione e H-06 riuscito da guest e due bridge
  (DNS, TLS 1.3, HTTP 200, cleanup). H-02 aggiornato negativo con 23 controlli
  positivi; H-04 aggiornato negativo su due bridge con 12 controlli host e
  pulizia riuscita. Verify finale DnsHttps riuscito; nessun listener residuo.
  Test privati 443/53 eseguiti nel run b99564532a354dbcbe548472d8bcba56:
  nove percorsi verso endpoint host non raggiungibili, 63 controlli positivi,
  route correlate e cleanup riuscito. Successivo reboot host eseguito: IP/NAT/ACL
  e profili persistenti, SSH/route guest confermati, H-06 e nove negazioni private
  ripetuti (81 controlli host positivi). [Evidenze M-08](HOST-REBOOT-VERIFICATION.md).
  Smoke funzionale distro Ubuntu WSL poi riuscito (DNS/HTTPS, HTTP 200),
  Docker Desktop verificato anche con due casi container locali. TCP verso
  Android LAN eseguito: tre origini negative e 18 controlli Windows positivi,
  route/correlazione e cleanup riusciti. [Evidenze LAN](ANDROID-LAN-PROBES.md).
  Chiusura Android confermata con controls-passed e closed true;
  Android → TCP/22 VM poi non connesso, host positivo prima/dopo; attribuzione
  alla whitelist non dimostrata senza route dall'altra origine. Restano H-05
  e copertura residua. Collector IPv6 guest completo: nessun unicast eth0 o
  default route, forwarding 0, bridge EnableIPv6 false/IPAM IPv4; kernel
  disponibile e link-local docker0 presente. Nessun test IPv6 negativo passato.
  [Review INF-VM-02](INF-VM-02-REVIEW.md): VM-033 approvata per le sole fixture,
  con [lifecycle controllato](FIXTURE-RUNTIME.md); misura VM inizialmente da acquisire.
  Nessuna accettazione completa dedotta.
  Primo tentativo VM poi acquisito: run 534be453d86e42329cad4686b522019a,
  preflight invalid, nessuna mutazione tentata e zero casi; ID immagine locale
  usato erroneamente come digest registry. Corretto il riferimento delle sole
  fixture, preservato il report e predisposta una nuova esecuzione distinta.
  Successivo run c2abe4b0e10248698a4e02a9ff584e5b riuscito: 33/33 casi sulle
  sole fixture VM, 15 allow e 18 deny, hash bundle/tree corrispondenti e cleanup
  16/13/7 senza errori/readback residui nel report guest. Decisioni negative
  ricalcolate sull'host. [Report, hash e limiti](FIXTURE-RUNTIME.md#7-collaudo-sulla-vm-riuscito).
  [VM-034](IPV4-ONLY-DESIGN.md) avviata il 10 novembre su indicazione owner:
  famiglie IPv4-only esplicite nelle 13 reti dei sorgenti Compose, guardie
  statiche e readback Docker/endpoint aggiunti. Kernel IPv6 guest conservato;
  nessuna scrittura Hyper-V/router. Inventario host attuale richiesto, revisione
  VM dei nuovi sorgenti ancora da acquisire; nessuna chiusura dei residui.
  Prima lettura host del 10 novembre incompleta per Hyper-V/HNS, benché IP/NAT
  e Public siano osservati; owner conferma Administrator True nella console,
  VM spenta e Kaspersky Pubblica. Collector ora registra contesto e messaggi
  completi: nuova lettura diretta richiesta, causa non ancora identificata.
  Lettura diretta poi riuscita: fb1a99fc2d9f49858e948c97019e5e1f completa,
  elevated true; review conferma 19 ACL DnsHttps identiche (due deny ::/0),
  vNIC/switch noti, IP persistente e NAT senza mapping, Windows Public.
  Nessuna riapplicazione; causa del precedente rifiuto non dimostrata.
  Consegnato passo avvio/LUKS e inventario guest read-only; A-31 runtime pendente.
- Ricevitore/apply Tox21 disponibile come [pilot locale](SECRET-DELIVERY-PILOT.md),
  con 17 test Linux sintetici passati; non ancora installato sulla VM.
  Trasporto SSH, consegna reale, altri consumer e lifecycle operativo aperti.
  Orchestratore host sintetico implementato e testato localmente:
  [contratto e limite delle prove](HOST-SYNTHETIC-DELIVERY.md), 26 test Linux
  passati; handshake SSH, prompt e filesystem VM non verificati.
- I Compose `docker_sl/releases/preview` e `prod` sono **frammenti**: non definiscono una topologia VM completa, volumi e recovery.
- Il modello `deployment-schema.json` presenta ancora Nginx con porta HTTPS e secret origin TLS: **scostamento storico da riconciliare**, senza rompere i validator attuali prima di un task dedicato.
- Matrice VM delle sole fixture verificata; routing per due hostname via tunnel,
  servizi reali e accettazione complessiva dell'isolamento Hyper-V/Docker ancora aperti.
- La nomenclatura legacy del client Meilisearch non dimostra i privilegi realmente concessi. Client search/writer separati e permessi sintetici verificati su istanza locale effimera: 8 letture, 8 scritture/replay e 40 negazioni 403. Sulla VM restano da consegnare key distinte, precreare indici e verificare le grant effettive; il fallback legacy non basta. [Contratto e limiti](MEILISEARCH-OPERATIONS.md).
- Non esistono provisioning VM verificato della master key **del server Meilisearch**, delle altre credenziali o dell'eventuale PEM pubblico Tox21.
- I job CI costruiscono e verificano immagini, ma non forniscono ancora una filiera ordinaria per pubblicare, scaricare e archiviare i `image.tar`, in particolare separando staging/production e Web/Tox21.
- Manca il collaudo completo browser → Nginx → Nest → dati/RPC e la prova di ripristino su una VM pulita.
- Meilisearch UI: digest candidato noto, scansione vulnerabilità e test browser/CORS/SSH **non eseguiti**.
- Trasferimento iniziale degli indici ChEMBL: usare un metodo di export/import compatibile, verificato e separato da MercurionData, che resta locale.

## Riferimenti storici non autoritativi per la VM

`k8s/`, `docs/infrastructure/vps-deployment-roadmap.md`, `docker_sl/nginx_dev/nginx.prod.conf` e i Compose di sviluppo possono essere letti per recuperare comportamenti e contratti. Non vanno applicati alla VM o confusi con requisiti operativi approvati. Non sovrascrivere i materiali esistenti finché il nuovo contratto non è stato validato.
