# Topologia e matrice delle reti Docker

**Stato:** disegno proposto e concordato; base Compose fixture preparata e validata
staticamente in [deployment/local-vm](../../../deployment/local-vm/README.md),
non applicata alla VM. La topologia non sostituisce il firewall Hyper-V/guest.

## Reti di progetto

| Nome logico | Tipo previsto | Servizi ammessi | Scopo |
| --- | --- | --- | --- |
| `mercurion_edge` | bridge `internal: true` | cloudflared, nginx-edge | tunnel verso reverse proxy HTTP |
| `mercurion_tunnel_egress` | bridge con uscita | cloudflared | connessione Cloudflare in uscita |
| `mercurion_stg_web` | bridge `internal: true` | nginx-edge, web-ng-preview, web-node-preview | upstream web preview |
| `mercurion_prod_web` | bridge `internal: true` | nginx-edge, web-ng-production, web-node-production | upstream web production |
| `mercurion_stg_data` | bridge `internal: true` | web-node-preview, postgres-preview, redis-preview | persistenza/cache preview |
| `mercurion_prod_data` | bridge `internal: true` | web-node-production, postgres-production, redis-production | persistenza/cache produzione |
| `mercurion_stg_bus` | bridge `internal: true` | web-node-preview, nats-preview, tox21-preview | request/reply NATS preview |
| `mercurion_prod_bus` | bridge `internal: true` | web-node-production, nats-production, tox21-production | request/reply NATS produzione |
| `mercurion_stg_search` | bridge `internal: true` | web-node-preview, meilisearch | query e log preview |
| `mercurion_prod_search` | bridge `internal: true` | web-node-production, meilisearch | query e log produzione |
| `mercurion_stg_egress` | bridge con uscita | web-node-preview, tox21-preview **se necessario** | API esterne (OAuth, Twilio, PubChem ecc.) |
| `mercurion_prod_egress` | bridge con uscita | web-node-production, tox21-production **se necessario** | integrazioni esterne produzione |
| `mercurion_admin_ui` | bridge `internal: true` | meilisearch-ui | sola pubblicazione su loopback guest per il tunnel SSH |

`preview` è l'etichetta di distribuzione dell'ambiente che conserva `APP_ENV=staging` e `PY_ENV=staging`. I network `stg_*` non autorizzano un terzo ambiente runtime.

Nella base statica shared possiede le sette reti trasversali (edge, tunnel
egress, web/search dei due ambienti e admin UI). Preview/production consumano
web/search con `external: true` e possiedono ciascuno data/bus/egress: nessuna
dipendenza circolare nella creazione. Bootstrap operativo ancora da validare.
Meilisearch e nginx-edge appartengono a shared e non fungono da router L3.

## Connessioni ammesse e vietate

| Sorgente → destinazione | Ammessa? | Nota |
| --- | --- | --- |
| Cloudflare Tunnel → Nginx edge:80 | Sì | solo `edge`, HTTP interno |
| Nginx edge → web-ng e web-node dello stesso hostname | Sì | upstream per rete web corretta |
| web-node → PostgreSQL e Redis dello stesso ambiente | Sì | solo `data` |
| web-node → NATS dello stesso ambiente | Sì | solo `bus` |
| Tox21 → NATS dello stesso ambiente | Sì | no HTTP diretto dal frontend |
| web-node → Meilisearch condiviso | Sì | attraverso `stg_search` o `prod_search` |
| web-node/Tox21 → provider esterni necessari | Sì, limitato | reti `egress`; censire gli hostname e verificare nel guest |
| web-node preview → database/Redis/NATS produzione | **No** | prova negativa obbligatoria |
| Tox21 preview → NATS produzione | **No** | prova negativa |
| browser pubblico → Meilisearch:7700 o UI:24900 | **No** | mai Cloudflare/Nginx edge |
| UI → API Meilisearch tramite nome DNS Docker | Non necessario | è il **browser** a contattare l'API; vedere sotto |
| container → host Windows/LAN privata | **No**, salvo eccezioni documentate | isolamento da verificare a livello VM/firewall |

Il numero di reti non è fine a se stesso. Questo modello privilegia l'isolamento per responsabilità; valutare accorpamenti soltanto dopo test e motivazione.

## Accesso Meilisearch UI esclusivamente tramite SSH

`eyeix/meilisearch-ui` è una SPA: serve HTML/JS, poi il browser chiama direttamente l'API Meilisearch. Pertanto serve **inoltrare due porte**, non soltanto quella della UI.

Proiezione candidata **da verificare sulla VM**, non un Compose già pronto:

- UI container porta interna `24900/tcp`; pubblicazione solo `127.0.0.1:24900:24900` **sul guest Ubuntu**.
- API Meilisearch porta interna `7700/tcp`; pubblicazione amministrativa solo `127.0.0.1:17700:7700` **sul guest Ubuntu**.
- Dal computer Windows usare OpenSSH con autenticazione a chiave SSH e inoltro locale:

```powershell
ssh -N -L 127.0.0.1:24900:127.0.0.1:24900 -L 127.0.0.1:17700:127.0.0.1:17700 <utente>@<ip-guest>
```

- Aprire `http://127.0.0.1:24900` nel browser Windows; configurare l'istanza Meilisearch come `http://127.0.0.1:17700`, con **API key di sola lettura** inserita interattivamente.
- Nessun `SINGLETON_API_KEY`, nessuna credenziale in query string o JavaScript generato. La UI può memorizzare dati nel browser: utilizzare un profilo dedicato e cancellarne lo stato se necessario.
- Validare CORS tra le origini loopback su porte differenti, funzioni visibili con permessi di sola lettura e assenza di operazioni amministrative abilitate.
- Unicamente l'utente SSH autorizzato potrà aprire gli inoltri; **la chiave SSH autentica l'accesso al guest, mentre la API key Meilisearch determina i privilegi di lettura.** Sono due credenziali distinte.

**Sicurezza importante:** la pubblicazione Docker su `127.0.0.1` è un'eccezione operativa alla regola generale «nessun `ports:`». Non usarla per altri container. Docker documenta che nelle versioni Engine anteriori alla **28.0.0** porte pubblicate su localhost potevano essere raggiungibili da host nello stesso segmento L2. Richiedere Engine aggiornato e una prova negativa da LAN/host; se l'isolamento non è dimostrato, non avviare la UI e progettare un gateway amministrativo alternativo. Verificare anche IPv6 e il comportamento specifico dei bridge `internal`: non dare per scontata la raggiungibilità guest-loopback senza prova reale.

Fonte: https://docs.docker.com/engine/network/port-publishing  
Fonte UI: https://github.com/eyeix/meilisearch-ui

## Confini VM e firewall

VM-032, 9 novembre: [migrazione a rete Hyper-V Internal statica](STATIC-NETWORK-MIGRATION.md)
approvata come disegno, non applicata. Nuova rete Pubblica in Kaspersky;
divieto diretto LAN ↔ VM/container, incluso il percorso attraverso NAT.
Solo l'interfaccia amministrativa host può iniziare SSH verso il guest.
Nessun bridge fisico, seconda vNIC o modifica alle reti WSL/Docker impliciti.

Docker bridge `internal: true` **non** è un firewall generale per la VM; un container che partecipa a una rete di egress ha accesso uscente e può tentare di raggiungere Windows/LAN. Progettare regole per Hyper-V, firewall guest e regole Docker compatibili (senza fare affidamento soltanto su UFW), includendo il percorso SSH dall'host autorizzato. Registrare test di connessione da ciascun tipo di container verso host, gateway virtuale, subnet LAN, DNS, IPv4 e IPv6.

Non modificare il `Default Switch` o il `WSL (Hyper-V firewall)` di Windows senza una decisione mirata. Nessun bridge esterno verso la LAN è implicitamente autorizzato.

## Criteri di validazione

`docker compose config`, `docker network inspect`, verifica di alias e DNS, probe dei servizi permessi, probe **negativi** incrociati, `ss -lntp` sul guest, controllo `docker ps --format` delle porte pubblicate, scansione porte dall'host/LAN, prova SSH local-forward, chiusura SSH e verifica che gli endpoint amministrativi non siano più accessibili dal browser locale.
