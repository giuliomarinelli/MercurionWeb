# Compose VM — base statica INF-VM-03

**7 novembre 2026:** l'owner autorizza l'anticipo di manifest e validazione
locale; prove residue INF-VM-02 e gate di avvio VM restano aperti. Nessun
deployment, trasferimento operativo o collegamento Cloudflare autorizzato.
**Eccezione successiva, 9 novembre — VM-033 approvata:** l'owner autorizza
trasferimento, esecuzione e pulizia delle sole fixture sintetiche.
[Procedura completa](../../docs/infrastructure/local-vm/FIXTURE-RUNTIME.md).
Restano esclusi servizi reali, segreti, port publishing e Cloudflare.

## Manifest e limiti

Tre progetti indipendenti: [shared](shared/compose.yaml),
[preview](preview/compose.yaml), [production](production/compose.yaml).
I nomi rappresentano i futuri ruoli, ma tutti usano **fixture TCP sintetiche**
con l'ID immagine locale già usato in INF-VM-02 (`sha256:65bd3d9...`, non un
digest registry `python@sha256:...`). Il pin completo è nei tre Compose;
non richiede tag o RepoDigests dopo docker load. Ogni fixture ascolta in IPv4 sulla porta
non privilegiata 18080 per massimo 600 secondi e restituisce un'identità JSON.
Il bind wildcard resta nel namespace del container, senza pubblicazioni host.
Non implementa protocolli applicativi e non avvia database, broker, Meilisearch,
Nginx, cloudflared, UI, Nest, Angular o Tox21.

I profili `topology-fixture` e `admin-fixture` rendono esplicito l'uso opzionale.
Non sono una barriera di sicurezza: Compose può avviare un servizio nominato
esplicitamente anche senza attivarne il profilo. L'avvio delle sole fixture
è ora autorizzato nel perimetro VM-033.
Le fixture hanno root filesystem read-only, UID non root, capability rimosse,
limiti CPU/memoria/PID, nessun restart automatico e pull disabilitato.

`expose` descrive porte interne previste dal contratto; non pubblica porte host
e non significa che la fixture ascolti su quelle porte: il test usa sempre 18080.
Nessuna eccezione loopback per
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
Le sole fixture usano dns_opt ndots:1 per limitare le query A a etichetta
singola al DNS embedded: i nomi vietati non dipendono da resolver esterni.
Errori DNS temporanei continuano a invalidare un caso.
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
pubblicate/mount sensibili e limiti container. L'unico bind mount ammesso è il
file fixture tracciato in sola lettura. I 12 casi negativi di topologia e i
4 della matrice modificano copie in memoria, senza toccare sorgenti o Docker.
Validator dedicato alla fase fixture, separato dal gate CI canonico;
non sostituisce `ci:deployment`.

## Matrice e runner: collaudo locale e prova VM

[connectivity.json](connectivity.json) contiene 15 casi ammessi e 18 vietati:
ingresso edge, dipendenze dati/bus/search, RPC stesso ambiente, negazioni
incrociate preview/production e accessi fuori responsabilità di SPA/edge/UI.
I controlli statici richiedono copertura dei 16 ruoli e assenza di contraddizioni.

Per leggere il piano senza chiamare Docker:

```powershell
python -B scripts/infrastructure/run_vm_topology.py
```

Il modo runtime `--execute-existing-fixtures` richiede fixture già avviate
sulla VM Ubuntu. VM-033 autorizza ora l'orchestratore dedicato; il runner non avvia o arresta
i tre progetti, non crea reti/volumi e rifiuta servizi diversi dalle fixture
attese (immagine, comando, utente, filesystem e porte verificati). La UI fixture
deve essere presente per coprire anche le sue negazioni. Tutti i listener sono
temporanei: readiness e timeout devono rimanere validi durante l'intera prova.

Ogni client temporaneo condivide il namespace di rete della fixture sorgente,
ha propri filesystem/PID e monta solo il probe in lettura. Le prove positive
richiedono DNS verso gli IP della destinazione e identità JSON corretta. Per
ogni negazione si verificano sorgente/destinazione su loopback prima e dopo,
si registra DNS e si prova TCP direttamente su tutti gli IP della destinazione.
Un guasto del resolver, una destinazione spenta o la sola mancata risoluzione
non superano il test. Un TCP aperto con identità errata è comunque un fallimento
della negazione, non un blocco riuscito.

Il runner rimuove soltanto i client creati dalla propria esecuzione: ID e label
casuale sono verificati prima della rimozione; ricerca anche creazioni parziali
con quella label dopo timeout. Nessun prune e nessuna rimozione di fixture,
reti o volumi. Errori di pulizia invalidano il risultato e riportano gli ID.
Il report runtime richiede un nuovo percorso fuori repository e conserva hash
del probe/matrice, ID delle fixture, misure, errori e `isolationAccepted=false`.
Non contiene env operativi o output Docker inspect completo.

Verifica locale, senza Docker runtime:

```powershell
python -B scripts/infrastructure/test_vm_topology.py
```

Tredici test passati: TCP loopback reale, identità, chiusura, DNS, guardie contro
falsi esiti e pulizia dopo timeout/ownership errata; l'intera matrice è percorsa
con Docker simulato. La simulazione non dimostra la topologia della VM.
Il lifecycle aggiunge dieci test di sicurezza: collisioni, integrità bundle,
immagine/config errate, bind estranei, ownership cambiata, avvio interrotto
e scrittura report fallita senza saltare la pulizia. I casi no-route della
matrice descrivono separazione topologica con evidenza kernel/route e controlli
attivi; non sono una prova del filtro host. Vedere FIXTURE-RUNTIME per i dettagli.

Regressione immagine: primo tentativo VM fermato al preflight, senza mutazioni
o casi. L'ID locale era stato usato erroneamente come digest registry; corretti
Compose/validator/runner, con test immagine locale senza RepoDigests e rifiuto
di ID effettivo container differente. Ora 13 test fixture/runner e 10 lifecycle;
la nuova esecuzione VM deve produrre un report distinto, senza riuso del bundle.

**Evidenza VM acquisita:** run c2abe4b0e10248698a4e02a9ff584e5b, 9 novembre:
33/33 casi passed (15 allow/18 deny), preflight/bundle verificati, cleanup
16 fixture/13 reti/7 volumi senza errori e readback guest senza residui del run.
[Report e limiti](../../docs/infrastructure/local-vm/FIXTURE-RUNTIME.md#7-collaudo-sulla-vm-riuscito).
Il perimetro delle fixture VM-033 è verificato; servizi reali, isolamento
host/LAN/IPv6 complessivo e accessi operativi loopback restano fuori dalla prova.
Collaudo reale Docker Desktop completato: 33/33 casi, cleanup di 16 fixture,
13 reti e 7 volumi senza errori. Report e hash nella procedura; prova VM ancora
da acquisire, nessuna promozione dell'esito locale.

## Accettazione aperta

La validazione statica non dimostra DNS o isolamento runtime. Restano connessioni
positive/negative, egress, loopback amministrativo e comportamento volumi.
La review del gate INF-VM-02 mantiene i residui aperti; VM-033 autorizza
soltanto il collaudo sintetico tramite l'orchestratore. Il risultato della VM
deve essere registrato separatamente dalla validazione locale.
I test non coprono protocolli/ACL applicativi, IPv6, host/LAN, Cloudflare o
persistenza dei motori dati; la fixture non è una sostituzione dei servizi reali.

Fonte progettuale: [topologia VM](../../docs/infrastructure/local-vm/NETWORK-TOPOLOGY.md).
Riferimenti: [reti Compose](https://docs.docker.com/reference/compose-file/networks/),
[config](https://docs.docker.com/reference/cli/docker/compose/config/),
[profili](https://docs.docker.com/compose/how-tos/profiles/).
Namespace dei client: [Docker container networks](https://docs.docker.com/engine/network/#container-networks).
