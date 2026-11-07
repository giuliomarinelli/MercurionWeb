# Compose VM — base statica INF-VM-03

**7 novembre 2026:** l'owner autorizza l'anticipo di manifest e validazione
locale; prove residue INF-VM-02 e gate di avvio VM restano aperti. Nessun
deployment, trasferimento operativo o collegamento Cloudflare autorizzato.

## Manifest e limiti

Tre progetti indipendenti: [shared](shared/compose.yaml),
[preview](preview/compose.yaml), [production](production/compose.yaml).
I nomi rappresentano i futuri ruoli, ma tutti usano **fixture Python inerti**
con il digest già usato in INF-VM-02. Il placeholder attende 600 secondi;
non implementa listener o protocolli. Non avvia database, broker, Meilisearch,
Nginx, cloudflared, UI, Nest, Angular o Tox21.

I profili `topology-fixture` e `admin-fixture` rendono esplicito l'uso opzionale.
Non sono una barriera di sicurezza: Compose può avviare un servizio nominato
esplicitamente anche senza attivarne il profilo. L'avvio resta fuori perimetro.
Le fixture hanno root filesystem read-only, UID non root, capability rimosse,
limiti CPU/memoria/PID, nessun restart automatico e pull disabilitato.

`expose` descrive porte interne previste dal contratto; non pubblica porte host
e non rende i placeholder servizi funzionanti. Nessuna eccezione loopback per
Meilisearch/UI è ancora applicata: verrà collaudata nella fase amministrativa.
I mount `/fixture-data` rappresentano proprietà dei volumi, non directory dei
futuri motori dati. Non usare questi percorsi con le immagini applicative.

## Proprietà delle reti

| Proprietario | Reti create dal progetto |
| --- | --- |
| shared | `mercurion_edge`, `mercurion_tunnel_egress`, `mercurion_stg_web`, `mercurion_prod_web`, `mercurion_stg_search`, `mercurion_prod_search`, `mercurion_admin_ui` |
| preview | `mercurion_stg_data`, `mercurion_stg_bus`, `mercurion_stg_egress` |
| production | `mercurion_prod_data`, `mercurion_prod_bus`, `mercurion_prod_egress` |

Web/search sono `external: true` nei due ambienti e hanno un solo proprietario,
shared. Il futuro bootstrap prevede shared prima degli ambienti, senza ciclo
di creazione. Preservare shared mentre un ambiente lo usa; arresto selettivo
e comportamento delle reti ancora in uso richiedono verifica runtime.

Solo `tunnel_egress` e le due reti `*_egress` hanno `internal: false`. Nessun
subnet/IP fisso, host networking o rete default implicita. La base non abilita
IPv6 né configura firewall. Egress non significa allowlist delle destinazioni.
Alias qualificati, ad esempio `web-node-preview`/`web-node-production`: il futuro
edge deve usare questi nomi. Una sola fixture Meilisearch su due reti search;
UI solo su admin. Volumi separati per PostgreSQL/Redis/NATS di ogni ambiente,
uno per Meilisearch. Meilisearch e edge non fungono da router tra ambienti.

## Contratti e differenze ancora da riconciliare

[Schema](../deployment-schema.json) e [overlay](../overlays/preview.json) restano
autoritativi. Il validator confronta ruoli, porte e ambiente tecnico: preview
conserva `APP_ENV=staging`/`PY_ENV=staging`. Tox21 mantiene un artefatto indipendente;
non occorre il checkout della sua repository per configurare queste fixture.
`x-mercurion-canonical-service` documenta il ruolo: Compose può ometterlo dal
modello normalizzato, perciò il validator verifica anche i nomi direttamente.

`nginx-edge` corrisponde al ruolo canonico `nginx`, ma descrive solo HTTP 80
della nuova architettura. Il vecchio schema include ancora HTTPS 443 e origin
TLS: non li abilitiamo qui né modifichiamo i manifest storici. La futura
proiezione operativa dovrà riconciliare esplicitamente la differenza.
Cloudflared/UI sono ruoli della specifica VM, non applicazioni aggiunte allo
schema canonico da questa base di fixture.

Nessuna credenziale, env-file operativo o chiave è caricata. Le variabili
presenti sono identità runtime non sensibili e il collegamento NATS previsto
come placeholder. `VERSION=topology-fixture` non identifica una release Tox21.
Bootstrap segreti, JWT, healthcheck/readiness, configurazioni e requisiti delle
immagini reali sono fuori da questa fase. Non esistono garanzie di startup
cross-project derivanti dai soli nomi delle reti.

## Validazione locale senza runtime

Dalla root, con Node e plugin Docker Compose:

```powershell
node scripts/check-local-vm-compose.mjs --self-test
```

Esegue soltanto `docker compose config --format json` sui tre file, includendo
tutti i profili e usando [input env vuoto tracciato](validation.env.example).
Non legge `.env` personali, non contatta il daemon, non risolve digest su
registry e non esegue pull/build/create/up. Non serve SSH. Non inserire
configurazione reale in `validation.env.example`.

Verifica proprietà reti/volumi, collegamenti dei ruoli, separazione ambienti,
alias, porte canoniche, overlay, immagine fixture fissata, assenza di porte
pubblicate/mount sensibili e limiti container. Gli 11 casi negativi modificano
copie in memoria, senza toccare sorgenti o Docker. Validator dedicato alla fase
fixture, separato dal gate CI canonico; non sostituisce `ci:deployment`.

## Accettazione aperta

La validazione statica non dimostra DNS o isolamento runtime. Restano connessioni
positive/negative, egress, loopback amministrativo e comportamento volumi.
Prima di avviare occorre review del gate INF-VM-02; serviranno poi fixture con
listener/protocolli di test al posto dei placeholder inerti.

Fonte progettuale: [topologia VM](../../docs/infrastructure/local-vm/NETWORK-TOPOLOGY.md).
Riferimenti: [reti Compose](https://docs.docker.com/reference/compose-file/networks/),
[config](https://docs.docker.com/reference/cli/docker/compose/config/),
[profili](https://docs.docker.com/compose/how-tos/profiles/).
