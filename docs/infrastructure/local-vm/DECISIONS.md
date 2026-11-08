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
| VM-029 | APPROVATA | Autenticazione NATS con user/password distinti per consumer e ambiente, separati dall'URL; scelta esplicita owner l'8 novembre. Nest implementato; Tox21 e provisioning broker ancora da allineare |

## Confini non negoziabili

Non assumere che un documento di architettura sia una configurazione eseguibile; non inventare chiavi, indirizzi o hostname. Non promuovere immagini non scansionate. Non esporre Meilisearch, Meilisearch UI, NATS, Redis o PostgreSQL verso Cloudflare/LAN. Non distribuire MercurionData o LandingFactory come servizi. Non rendere obbligatori Kubernetes, alta disponibilità, maintenance mode o rotazione JWT.

## Decisioni da riesaminare soltanto in presenza di evidenze

Se le reti `internal: true` non consentono il loopback administrato come previsto, sostituire il meccanismo di accesso operativo senza pubblicare porte esterne. Se la UI richiede privilegi di modifica, non elevarle la key: valutare visualizzazione ridotta o altro strumento. Se `v0.15.3-lite` ha CVE rilevate, non fissare quell'immagine attiva nel deployment; esaminare un'altra versione o non distribuire la UI.
