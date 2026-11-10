# Registro decisionale infrastruttura VM

**Convenzione:** `APPROVATA` = indicazione esplicita dell'owner; `PROPOSTA` = direzione progettuale da validare con test/review; `APERTA` = scelta non ancora effettuata. La presenza qui non autorizza automaticamente modifica a sorgenti o servizi.

| ID | Stato | Decisione e motivazione |
| --- | --- | --- |
| VM-001 | APPROVATA | Mercurion è un portfolio case study, non SaaS con continuità 24/7. Self-hosting su Hyper-V/Ubuntu invece di VPS/Kubernetes costosi |
| VM-002 | APPROVATA | Due ambienti preview (= staging tecnico) e production; database, Redis, NATS, Tox21 e credenziali differenti |
| VM-003 | APPROVATA | Una sola istanza Meilisearch; indici ChEMBL comuni, log e audit distinti per ambiente |
| VM-004 | APPROVATA | Nginx edge unico ingresso HTTP/WS; TLS terminata in Cloudflare, Nginx origin HTTP dietro Cloudflare Tunnel |
| VM-005 | APPROVATA | Non adottare la vecchia maintenance mode Kubernetes; policy di accesso con Cloudflare Access |
| VM-006 | APPROVATA | `MercurionData` e `MercurionLandingFactory` esclusivamente locali, non servizi VM |
| VM-007 | APPROVATA | JWT senza rotazione operativa a caldo; cambio chiavi breaking con nuova autenticazione, codice evoluto conservato |
| VM-008 | APPROVATA | Nome `MEILISEARCH_MASTER_KEY` nel client Nest conservato come legacy, ma in VM passa chiave applicativa con privilegi limitati; master key del server fuori dalle credenziali Web |
| VM-009 | APPROVATA | Indici log corretti su `APP_ENV`; correzione integrata nel branch |
| VM-010 | APPROVATA | Precreare gli indici soltanto tramite `curl` amministrativo con chiave privilegiata custodita nel password manager Windows, uso effimero |
| VM-011 | APPROVATA | Aggiungere `eyeix/meilisearch-ui`, solo tramite SSH, API key Meilisearch di sola lettura; nessuna esposizione web pubblica |
| VM-012 | APPROVATA | Documentazione corrente in italiano |
| VM-013 | APPROVATA | Definire e registrare filiera di trasferimento/archiviazione artefatti GitHub Actions e rollback |
| VM-014 | PROPOSTA | Tre Compose (`shared`, `preview`, `production`) e reti funzionali `edge`, `web`, `data`, `bus`, `search`, `egress` per ambiente. Direzione già discussa; parametri specifici da testare |
| VM-015 | PROPOSTA | Cloudflared collegato a edge interno e rete egress dedicata; amministrazione UI/API via due localhost guest e due tunnel SSH |
| VM-016 | PROPOSTA | `eyeix/meilisearch-ui:v0.15.3-lite`, digest amd64 `sha256:5666932bab3db63552cd81537896d18f7fc5323c7afd7639d6d091f2e8306e92`. **NON APPROVATO** finché non esiste scan vulnerabilità e prova funzionale |
| VM-017 | PROPOSTA | Rilascio manuale verificato tramite artifact CI, archivio host + copia indipendente, `docker load` sulla VM; nessun registry obbligatorio |
| VM-018 | PROPOSTA | UI/container amministrativo opzionale avviato solo quando serve, con profilo Compose dedicato |
| VM-019 | APERTA | Implementazione concreta del provisioning segreti (host → guest → container) e gestione restart senza master key persistente |
| VM-020 | APERTA (residuo VM) | Client Nest search/writer separati e grant sintetiche testate localmente l'8 novembre; provisioning delle key, precreazione indici e verifica permessi sulla VM ancora da eseguire |
| VM-021 | APERTA | Modalità SSH, subnet e firewall Hyper-V/Ubuntu/Docker; test negativi IPv4/IPv6 e LAN obbligatori |
| VM-022 | APERTA | Dimensionamento dinamico RAM tra baseline 16 GiB e opzioni 24–26 GiB; limite indicativo 28 GiB, da misurare |
| VM-023 | APERTA | Trasferimento iniziale ChEMBL, backup e restore applicativi; nessuna esecuzione di MercurionData sulla VM |
| VM-024 | APERTA | Formato e retention degli artifact di release, canale persistente e modalità di ripristino a freddo |
| VM-025 | APERTA | Comportamento Tox21 con `require-jwt` per i consumer che non forniscono token, senza modifiche implicite al contratto |
| VM-026 | APERTA | Eventuali adeguamenti dello schema deployment canonico e validator CI ai nuovi servizi/reti senza interrompere i manifest storici |
| VM-027 | APPROVATA | Anticipare soltanto manifest e validazione statica INF-VM-03, mantenendo aperti i residui INF-VM-02 e il gate di avvio VM; nessuna installazione su Android o modifica operativa della rete |
| VM-028 | PROPOSTA | Bootstrap manuale con file per consumer su area volatile guest, consegna senza PTY separata da sudo, compatibilità env dentro il container e conservazione dei file fino alla chiusura della sessione; dettaglio in BOOTSTRAP-CONTRACT.md, nessun provisioning implementato |
| VM-029 | APPROVATA | Autenticazione NATS con user/password distinti per consumer e ambiente, separati dall'URL; scelta esplicita owner l'8 novembre. Nest e Tox21 implementati/testati localmente; branch Tox21 `263ccbc` da integrare, provisioning broker ancora aperto |
| VM-030 | APPROVATA | Basi operative persistenti: Web `feature/infra-vm-docker-engine-architecture`, Tox21 `feature/infra-vm-nats-client-auth`. Proseguire da qui, eventuali sotto-rami dalla rispettiva base; `develop` può restare indietro e ogni merge rimane dell'owner |
| VM-031 | APPROVATA (sviluppo locale) | Il 9 novembre l'owner autorizza INF-VM-04-A e preparazione del percorso sintetico. Primo ricevitore/apply limitato a Tox21/NATS, testato su Linux locale; nessuna operazione VM implicita. Trasporto SSH, altri consumer e residui VM-028 aperti; dettaglio in SECRET-DELIVERY-PILOT.md |
| VM-033 | APPROVATA (sole fixture), VERIFICATA su VM | Owner il 9 novembre: «Procedi con le sole fixture». Run c2abe4b0e10248698a4e02a9ff584e5b: 33/33 passed, cleanup 16/13/7, hash/report verificati. Nessun segreto, applicazione o port publishing; H-05/A-30 aperti. [Evidenze e perimetro](FIXTURE-RUNTIME.md), nessun deployment applicativo implicito |
| VM-034 | APPROVATA, VERIFICATA (configurazione, 10 novembre) | Owner: «ok procediamo». Host/guest coerenti, run VM 2bcdfd57a75c4b2a979d2d2503351f5f: 13 reti IPv4-only, 33/33 passed e cleanup 16/13/7. Deny IPv6 vNIC conservati e kernel guest disponibile. Tunnel IPv4 a INF-VM-07. [Evidenze, passi e rollback](IPV4-ONLY-DESIGN.md); H-05/A-05/A-30 parziali, nessuna deroga runtime/segreti implicita |
| VM-035 | APPROVATA ed eseguita dall'owner, VERIFICATA (trasporto sintetico) | Run preview dfc1af5a416f4b1abc6e8dab99034dbb del 10 novembre: sei fasi e helper hash validati dalla ricevuta owner, active metadata-only e code-removed completati. [Evidenza e limiti](HOST-SYNTHETIC-DELIVERY.md#esito-vm-035-del-10-novembre). Active su tmpfs conservato, riconciliazione/rimozione aperte. Nessun servizio/materiale reale o cambio rete; H-05/A-05/A-30 e INF-VM-02 complessivo aperti |
| VM-036 | APPROVATA, VERIFICATA sul singolo run sintetico | Run dfc1af5a416f4b1abc6e8dab99034dbb ritirato dall'owner, quattro fasi/hash validati e dati assenti. Restano soli metadati root contro il riuso, nessun altro run rimosso. [Procedura e ricevuta](SYNTHETIC-RUN-RETIREMENT.md#6-esito-vm-036-del-10-novembre). Non prova retirement di segreti reali o mount/restart applicativi |
| VM-037 | APPROVATA, VERIFICATA nel collaudo sintetico VM | Run preview af0b6eb4637940eb814acfd380e27f26: lettore Tox21 reale UID 10021 su bind read-only, restart/recreate e tre negativi, 6/6; cinque container/assets rimossi e run retired. Report automatico owner riletto e hash validati. [Evidenze](SYNTHETIC-CONSUMER-MOUNT.md#5-esito-vm-037-del-10-novembre). Nessun servizio/materiale reale, cambio rete o chiusura H-05/A-05/A-30 |
| VM-038 | APPROVATA, REVIEW VERIFICATA | Sorgenti Tox21 5f3d837 e CI esatta verde; due immagini locali precedenti prive dei launcher, tar CI non pubblicato. Pesi/soglie esistenti verificati e coincidenti con CI. [Audit ripetibile](TOX21-ARTIFACT-REVIEW.md), nessun avvio applicativo o operazione VM |
| VM-039 | APPROVATA, VERIFICATA sull'host | Owner: «sì riprendiamo», dopo CI strict verdi Web/Tox21. Candidato staging Tox21 d506101 costruito da Git isolato, modello riusato; vero bootstrap file/NATS, tre lifecycle, nove negazioni, stop/cleanup e scan a zero. Archivio/load/SBOM verificati, nessun source overlay o operazione VM. [Identità e passi ripetibili](TOX21-STAGING-CANDIDATE.md) |
| VM-040 | APPROVATA, BUNDLE LOCALE VERIFICATO; PREFLIGHT GUEST APERTO | Owner autorizza prosecuzione: riuso del candidato VM-039, bundle Tox21 con hash e coordinamento esplicitamente parziale; sole letture guest di rete/Docker/spazio tramite terminale owner. Nessun trasferimento tar, load o avvio applicativo. [Procedura italiana ed esiti](TOX21-TRANSPORT-PREFLIGHT.md) |
| SEC-STRICT-01 | APPROVATA, BONIFICA VERIFICATA il 10 novembre | Web e Tox21 bloccano qualsiasi vulnerabilità a ogni gravità, senza eccezioni, inclusi sviluppo/training/build e report incompleti. CI full Web e364c00b / Tox21 d506101 verdi, audit e immagini a zero. Policy v2 mantenuta; nuovo candidato VM-039 scansionato separatamente. [Contratto e prove](../security-strict-2026-11-10.md) |

## Confini non negoziabili

**VM-032 — APPROVATA come disegno, 9 novembre:** migrazione a rete Hyper-V
Internal dedicata e indirizzi statici con NAT controllato. Nessun accesso
diretto LAN ↔ VM/container; nuova rete Pubblica in Kaspersky. Unica eccezione
amministrativa host interno → guest SSH con risposte stateful. [Passi, piano
indirizzi proposto e recupero](STATIC-NETWORK-MIGRATION.md). Migrazione alla
rete statica eseguita e persistenza verificata; prove host e LAN IPv4 nei
perimetri documentati. Isolamento complessivo non ancora accettato: H-05 e
IPv6 restano parziali. Nessuna modifica a Default Switch/WSL per la migrazione.

Non assumere che un documento di architettura sia una configurazione eseguibile; non inventare chiavi, indirizzi o hostname. Non promuovere immagini non scansionate. Non esporre Meilisearch, Meilisearch UI, NATS, Redis o PostgreSQL verso Cloudflare/LAN. Non distribuire MercurionData o LandingFactory come servizi. Non rendere obbligatori Kubernetes, alta disponibilità, maintenance mode o rotazione JWT.

## Decisioni da riesaminare soltanto in presenza di evidenze

Se le reti `internal: true` non consentono il loopback administrato come previsto, sostituire il meccanismo di accesso operativo senza pubblicare porte esterne. Se la UI richiede privilegi di modifica, non elevarle la key: valutare visualizzazione ridotta o altro strumento. Se `v0.15.3-lite` ha CVE rilevate, non fissare quell'immagine attiva nel deployment; esaminare un'altra versione o non distribuire la UI.
