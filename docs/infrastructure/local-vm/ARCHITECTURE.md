# Architettura logica della demo Mercurion

**Stato:** progetto approvato nei confini principali; configurazioni e test operativi non ancora implementati.

## Percorso di ingresso

```text
Browser / Internet
        |
   Cloudflare (TLS pubblico, Access dove richiesto)
        |
   Cloudflare Tunnel (connessione in uscita dalla VM)
        |
   Nginx edge (HTTP interno, nessun certificato origin)
        |
        +---- host preview ---- web-ng preview (Nginx SPA Angular)
        |                  \--- web-node preview (Nest/Fastify)
        |
        +---- host production - web-ng production (Nginx SPA Angular)
                           \--- web-node production (Nest/Fastify)

web-node ambiente -> PostgreSQL ambiente
                  -> Redis ambiente
                  -> NATS ambiente -- request/reply --> Tox21 ambiente
                  -> Meilisearch unico (search network ambiente)

PC Windows -- SSH --> Ubuntu VM -- localhost:24900 --> Meilisearch UI
                                 localhost:17700 --> Meilisearch API
             (solo per uso amministrativo, nessun percorso Cloudflare)
```

La TLS termina sul fronte pubblico Cloudflare. Il traffico **Cloudflare Tunnel → Nginx edge** rimane HTTP nella rete privata Docker. Non recuperare il vecchio `listen 443 ssl` e i certificati origin Kubernetes. Verificare comunque il confine Cloudflare, gli host ammessi e gli header proxy; HTTP interno non equivale a fidarsi di ogni sorgente.

## Servizi applicativi

- **Nginx edge:** unico reverse proxy di ingresso; routing per hostname, REST, GraphQL, Socket.IO, SPA, Ketcher, asset ed error pages. Nessuna configurazione maintenance-mode importata dai manifest Kubernetes.
- **MercurionWebNg:** l'immagine Angular contiene un secondo Nginx **non edge**, che serve la SPA compilata. Non espone HTTP direttamente all'esterno della VM.
- **MercurionWebNode:** NestJS/Fastify svolge il ruolo di gateway applicativo per HTTP REST, GraphQL CRUD, Socket.IO e integrazioni con Redis, PostgreSQL, Meilisearch e NATS. Non è un gateway autonomo di rete diverso dal backend.
- **MercurionTox21:** worker Python dal repository `MercurionTox21`, versione e SHA propri. Cinque RPC su NATS request/reply; nessun listener HTTP e nessun collegamento diretto al browser.
- **PostgreSQL 16/pgvector, Redis, NATS:** istanze distinte per preview e production, volumi, credenziali e risorse isolati.
- **Meilisearch:** **un solo processo/container** condiviso, collegato contemporaneamente a due reti di ricerca separate. Gli indici ChEMBL sono comuni; log/audit sono differenziati.
- **eyeix/meilisearch-ui:** viewer operativo opzionale e isolato; accesso browser solo tramite inoltro SSH, con API key Meilisearch di sola lettura. Non è un componente della superficie web pubblica.
- **cloudflared:** collegato all'edge e a una rete con uscita Internet. Non fornisce un accesso di amministrazione a Meilisearch.

## Esclusioni esplicite

`MercurionData` e `MercurionLandingFactory` esistono nel repository ma **non saranno eseguiti come container o processi residenti sul server**. Le loro operazioni di import/export, generazione di indici e build di asset avvengono fuori dalla VM; trasferire soltanto i risultati verificati necessari. Nessun componente di training PyTorch o tool di sviluppo deve entrare nell'immagine runtime Tox21.

Il modello ChemBL importato non è la medesima cosa del DB degli utenti. Non aggiungere automaticamente un servizio PostgreSQL ChEMBL runtime: la UI Web legge gli indici Meilisearch e il proprio database secondo i contratti applicativi osservati. Verificare i percorsi reali prima di dimensionare ogni volume.

## Distribuzione Compose prevista

- `shared`: reti a uso trasversale, `cloudflared`, Nginx edge, Meilisearch e la UI opzionale.
- `preview`: `web-ng`, `web-node`, PostgreSQL, Redis, NATS, Tox21 e reti private di proprietà del progetto. Target runtime e build: staging.
- `production`: speculare a preview, con immagini e segreti propri. Target runtime: production.

Ogni directory operativa avrà un `compose.yaml` autonomo e un `name:` stabile. Per i collegamenti con `shared` usare reti dichiarate `external: true` con nomi non ambigui; evitare `container_name` dove non richiesto. Il progetto `shared` viene avviato per primo; gli altri possono essere arrestati indipendentemente. Non usare un unico file con decine di override CLI come interfaccia ordinaria.

**Interazione con lo schema canonico:** `deployment/deployment-schema.json` e overlay rimangono autoritativi per l'identità dei servizi e degli ambienti. Le proiezioni VM devono esservi allineate o evolverlo con un intervento esplicito e aggiornamento dei validator. Non creare silenziosamente una seconda fonte di verità divergente.

## Disponibilità della demo e interfaccia utente

Mercurion è una demo, avviabile su richiesta; Access può limitare l'accesso a preview. La disattivazione del tunnel o della policy di accesso non equivale al requisito applicativo di maintenance mode; in caso di backend fermo l'edge deve comunque rispondere in modo prevedibile. Prima visita: avviso chiaro che l'app è un case study senza disponibilità continua o promessa di conservazione permanente dei dati.

## Verifiche obbligatorie prima del rilascio

Routing e WebSocket reali attraverso Cloudflare Tunnel; assenza di porte pubblicate verso LAN; CORS e proxy-trust corretti; isolamento preview/production; lettura ChEMBL da entrambi gli ambienti; scrittura log segregata; NATS request/reply; riavvio selettivo; sessioni/JWT; arresto senza perdita indebita di dati. Vedere [ACCEPTANCE.md](ACCEPTANCE.md).
