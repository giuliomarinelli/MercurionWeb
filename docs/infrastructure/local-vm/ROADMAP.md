# Roadmap — deployment demo Hyper-V / Docker Engine

**Stato:** roadmap architetturale. Le fasi rappresentano risultati verificabili, non giorni di lavoro promessi; un blocco può richiedere più sessioni. Seguire [DAILY-LOG.md](DAILY-LOG.md) per esiti e limiti reali.

## INF-VM-01 — Documentazione e contratto

**Obiettivo:** una specifica comprensibile da sviluppatori/agenti senza inferire decisioni dalle vecchie manifestazioni Kubernetes.

- Consolidare situazione reale, decisioni owner, topologia, matrice di rete e privilegi.
- Registrare UI SSH/read-only, precreazione curl amministrativa e flusso degli artefatti.
- Individuare conflitti con schema deployment, overlay, Compose, Nginx e codice Nest.
- **Consegna:** documenti coerenti e linkati, questioni aperte e niente modifiche infrastrutturali eseguite.
- **Gate:** review owner; nessuna configurazione futura deve trasformare una `PROPOSTA` in `APPROVATA` senza verifica.

## INF-VM-02 — Host, guest e confini di rete

**Stato, 7 novembre:** in verifica. Guest già predisposto dall'owner; Ubuntu
26.04.1, Engine 29.9.3, Compose 5.7.0 e policy SSH acquisiti da inventario
operatore. Non reinstallare né sostituire switch/regole per ricreare la baseline.
[Evidenze e gate aperti](HOST-GUEST-READINESS.md): root LUKS, risorse guest e
backend firewall e ACL acquisiti; H-02 TCP IPv4 verificato con controllo positivo.
H-04 IPv4 verso Windows verificato da due bridge guest con controlli positivi.
H-06 smoke DNS/HTTPS IPv4 verso docs.python.org verificato su guest e due bridge.
H-02 IPv6 link-local guest → host verificato con route e controlli positivi.
Rimangono prove IPv6 container/globale, LAN e altre origini; lo smoke non copre tutti i provider
applicativi. INF-VM-02 non è dichiarato concluso.

**9 novembre:** cambio subnet Default Switch, alias SSH e ACL con indirizzi
precedenti, timeout anche sul nuovo IP. VM-032: [procedura statica passo per
passo](STATIC-NETWORK-MIGRATION.md), rete Internal e Kaspersky Pubblica,
divieto diretto LAN ↔ guest/container. Inventario amministrativo completo;
M-03 eseguito dall'owner: switch Internal ancora vuoto e IP host statico,
stato operativo Preferred e profilo Windows Public verificati. Prossimo passo:
classificazione Kaspersky prima di qualunque attach: owner ha ora confermato
Pubblica sulla nuova rete tramite screenshot; efficacia/persistenza aperte.
Default Switch osservato Locale, ripristino Pubblica richiesto mentre ancora
usato dal guest, causa del cambio profilo non provata. Preparare backup e ACL
prima della migrazione guest. Rivalidare isolamento
e reboot sulla nuova baseline; vecchie prove non certificano la rete futura.
Bootstrap sintetico sospeso fino al recupero dell'accesso amministrativo.

M-05: backup Netplan creato e VM spenta confermati dall'owner. [Script ACL
SSH-only](SSH-ONLY-ACL.md) disponibile con snapshot, guardie e quarantena;
16 scenari locali con API Hyper-V simulate passati. Apply reale non eseguito;
nessun egress pubblico aperto in questa prima fase, nessun NAT/attach/avvio VM.

**Dipende da:** INF-VM-01.  
Preparare Docker Engine e plugin Compose su Ubuntu, amministrazione SSH a chiave, policy host↔guest, firewall e regole IPv4/IPv6. Non introdurre bridge fisici della LAN. Definire test negativi dalla VM e dai container verso Windows/LAN e protezione della porta SSH.

**Accettazione:** raggiungibilità amministrativa necessaria, assenza di accessi proibiti, assenza di servizio Internet esposto; annotare versione Docker Engine (>=28 per la proiezione loopback candidata).

## INF-VM-03 — Compose base e reti senza applicazioni reali

**Dipende da:** INF-VM-02.  
**Eccezione circoscritta autorizzata dall'owner, 7 novembre:** anticipata la sola
preparazione statica locale. Tre manifest fixture e validator disponibili in
[deployment/local-vm](../../../deployment/local-vm/README.md), senza avvio VM.
Sintassi, 11 guardie topologia e 4 guardie matrice locali passate; listener TCP,
matrice da 33 casi e runner su fixture già avviate preparati. Dieci test locali
del probe/runner passati, Docker simulato. INF-VM-02 e matrice runtime restano
aperti. INF-VM-03 non è dichiarato completato.

Definire directory `shared`, `preview`, `production`; reti esterne, alias, `internal`, `egress`, volumi e confini. Evitare un solo Compose con molti flag. Iniziare con probe/fixture non sensibili.

**Accettazione:** `docker compose config` valido e matrice delle comunicazioni positive/negative verificata. Nessun servizio host pubblicato eccetto gli endpoint loopback operativi autorizzati.

## INF-VM-04 — Segreti e credenziali operative

**Dipende da:** INF-VM-03.  
**Preparazione documentale:** [audit consumer e contratto proposto](BOOTSTRAP-CONTRACT.md)
disponibili. Adattatori [Nest](NEST-SECRET-FILE-ADAPTER.md) e
[Tox21](TOX21-SECRET-FILE-ADAPTER.md) opt-in implementati/testati con materiale
sintetico, senza cambiare l'avvio esistente. Nessun
provisioning; trasporto e ciclo di vita da approvare. Client Meilisearch separati
e permessi sintetici verificati localmente l'8 novembre; [auth NATS Nest](NATS-CLIENT-AUTH.md)
implementata con coppia opzionale user/password; Tox21 allineato e mantenuto sul
proprio branch operativo, adapter file in `b6476dd`. Configurazione broker, consegna protetta
credenziali e grant reali VM restano aperti. L'esecuzione mantiene le dipendenze 02/03 e INF-VM-04 resta aperto.

**9 novembre:** [pilot ricevitore/apply Tox21](SECRET-DELIVERY-PILOT.md)
implementato con envelope chiuso, identità separate e pubblicazione su tmpfs;
17 test Linux locali passati, incluso lettore Tox21 reale. Trasporto SSH,
installazione VM, altri consumer e restart/recreate applicativi ancora aperti.

Orchestratore host sintetico ora implementato: [contratto e prova operatore](HOST-SYNTHETIC-DELIVERY.md).
26 test Linux locali passati, inclusi comandi guest effettivi e verifica del
codice prima dell'esecuzione privilegiata. Nessuna connessione SSH eseguita;
verifica trasporto/prompt e filesystem VM ancora aperta.

Progettare/implementare l'iniezione protetta dal password manager Windows al bootstrap VM, secret per ambiente, credenziali Meilisearch, PostgreSQL, Redis, NATS, OAuth, Twilio, cookie, JWT. Preservare nomi legacy compatibili. Rinviare rotazione a caldo.

**Accettazione:** nessun segreto in Git/layer/CI/log; riavvio e perdita dei materiali temporanei prevedibili; nessuna master key del server accessibile ai backend.

## INF-VM-05 — Meilisearch, indici e accesso SSH di consultazione

**Dipende da:** INF-VM-03 e 04.  
Avviare singola istanza Meilisearch; importare ChEMBL da artefatto locale verificato; precreare i quattro indici runtime esclusivamente con `curl` e chiave amministrativa temporanea; verificare permessi delle key. Valutare `eyeix/meilisearch-ui` **solo** dopo scansione CVE; configurare due forward SSH per UI e API, con credenziale read-only nel browser.

**Accettazione:** query ChEMBL da entrambi gli ambienti, log segregati, nessuna scrittura ChEMBL dalle key runtime, negazione API amministrative dalla UI, nessun accesso web pubblico.

## INF-VM-06 — Pipeline di consegna e archivio

**Dipende da:** INF-VM-01/03; coordinabile in parallelo con 04/05.  
Consolidare exporter e coordinatore esistenti per immagini staging e production Web/Tox21; pubblicare bundle completi di release approvata su Actions; scaricare/archiviare sull'host e su copia separata; verificare hash e `docker load` sulla VM. Non compilare sorgenti in produzione.

**Accettazione:** due release identificabili, un candidato e un precedente; manifest per ambiente, provenienza e rollback meccanico ripetibile; retention non dipendente da Actions.

## INF-VM-07 — Stack applicativi e tunnel Cloudflare

**Dipende da:** 03, 04, 05, 06.  
Avviare progressivamente PostgreSQL/Redis/NATS e backend/frontend/Tox21 per ambiente; recuperare routing utile da Nginx storico **senza** TLS origin/maintenance mode; configurare cloudflared, Access per preview, header forwarded, cookie, OAuth redirect e WebSocket.

**Accettazione:** end-to-end browser reale su entrambi gli hostname; nessuna API Meilisearch/SSH esposta, sessioni/autorizzazioni funzionanti, staging e production separati.

## INF-VM-08 — Recupero, dati demo, limiti e documentazione operativa

**Dipende da:** 07.  
Eseguire backup/restore dei dati e dei manifest, testare arresto e restart, log consultabili in sola lettura, rollback e ripristino a freddo. Misurare RAM/CPU/disco prima di salire da 16 GiB a 24–26 GiB o 28 GiB massimo indicativo. Preparare avviso pubblico di case study e guida operativa essenziale.

**Accettazione:** report completo e verificabile; gestione manuale realistica per una sola persona; nessun requisito artificiale di disponibilità 24/7.

## Backlog applicativo correlato

**BUG-AUTH-01 — Da diagnosticare e correggere:**
[challenge adattiva MFA, geolocalizzazione locale e coerenza login](../../bug-reports/2026-11-09-adaptive-login-mfa.md).
Segnalazione del 9 novembre, con controlli mirati della storia Git e analisi
tecnica. Lavoro applicativo distinto; solo documentazione, nessun cambiamento
auth, ordine INF-VM o gate. Dopo questa parentesi riprendere la prova PowerShell.

**BUG-SUPPORT-01 — Da affrontare:**
[notifiche ticket agli operatori e toast condizionale](../../bug-reports/2026-11-08-support-ticket-notifications.md).
Segnalazione dell'owner dell'8 novembre: bugfix trasversale backend/email e
UX/state management, tracciato nella roadmap applicativa PX-15/PX-16 e F-05.
Lavoro distinto da INF-VM: questa registrazione non ne cambia ordine o gate e
non costituisce implementazione del fix.

## Esclusioni dall'intera roadmap

Kubernetes, alta disponibilità, autoscaling, CI/CD sempre attivo, rotazione JWT a caldo, UI amministrativa esposta sul web, deployment MercurionData/LandingFactory e nuove feature chimiche non richieste alla demo.

## Criterio di arresto

Se un blocco non supera i gate di isolamento, permessi o integrità, **non** proseguire al tunnel pubblico. Annotare limite e motivazione nel diario; non risolvere con privilegi più ampi o disabilitando controlli.
