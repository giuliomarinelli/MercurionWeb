# Accesso locale ai servizi della VM tramite SSH

Questa guida consente di aprire e chiudere manualmente i forward, senza script
di orchestrazione, chat o agenti. Non cambia Compose, firewall, ACL o container.
Il client SSH Windows deve già poter accedere con `ssh mercurion-server`.

## 1. Individuare il container e il suo IP attuale

Da **PowerShell Windows**:

```powershell
ssh mercurion-server
```

Nella **shell Ubuntu**, elencare soltanto i container attualmente in esecuzione:

```bash
sudo docker ps --format 'table {{.ID}}\t{{.Names}}\t{{.Label "com.docker.compose.service"}}\t{{.Status}}'
```

Scegliere il servizio dalla tabella seguente. Copiare il suo ID e sostituire
`ID_CONTAINER` nel comando sotto, sempre nella **shell Ubuntu**:

```bash
sudo docker inspect --format '{{range $name, $net := .NetworkSettings.Networks}}{{printf "%s: %s\n" $name $net.IPAddress}}{{end}}' ID_CONTAINER
```

Per i container con più reti scegliere l'indirizzo della rete indicata sotto.
Non usare un indirizzo vuoto né concatenare gli IP di più reti. Non copiare
vecchi indirizzi dalle ricevute: possono cambiare dopo stop/start o ricreazione.
Se il servizio non compare fra i container running, il forward non lo avvia.

| Servizio Compose | Rete da leggere | Porta nel container | Porta locale proposta |
| --- | --- | --- | --- |
| `nginx-edge` | `mercurion_stg_web` | 80 | 18888 |
| `postgres-preview` | `mercurion_stg_data` | 5432 | 15432 |
| `redis-preview` | `mercurion_stg_data` | 6379 | 16379 |
| `nats-preview` | `mercurion_stg_bus` | 4222 | 14222 |
| `meilisearch` | `mercurion_stg_search` | 7700 | 17700 |
| `web-node-preview` | `mercurion_stg_web` | 8098 | 18098 |
| `web-ng-preview` | `mercurion_stg_web` | 3497 | 13497 |
| `tox21-preview` | `mercurion_stg_bus` | Nessun listener TCP applicativo in questo avvio | Usare NATS |

Le porte derivano dai Compose operativi `shared` e `preview` nel repository.
Tox21 è avviato come worker NATS da `bootstrap_secrets` / `main.py`: non è un
server HTTP separato. La porta di monitoring NATS 8222 non è configurata da
questi manifest; non è compresa nei forward.

## 2. Aprire il forward desiderato

Aprire un **altro terminale PowerShell Windows**, lasciando eventualmente
aperta la shell Ubuntu per consultazione. Nei comandi seguenti sostituire
`IP_NGINX`, `IP_POSTGRES`, ecc. con gli indirizzi ottenuti al passo 1.
Sono segnaposto da sostituire, non nomi DNS configurati.

Ogni comando resta in primo piano: nessun nuovo prompt è normale. Tenerlo
aperto per tutta la connessione del browser o del client database.

### Nginx: applicazione attraverso l'edge

```powershell
ssh -N -T -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -L 127.0.0.1:18888:IP_NGINX:80 mercurion-server
```

Aprire `http://127.0.0.1:18888` oppure `http://localhost:18888` nel browser.
Il tunnel non adatta automaticamente cookie Secure, origin, OAuth o Turnstile
previsti per `https://preview.mercurion.app`: il trasporto funzionante non
certifica quei flussi. L'edge VM serve HTTP, senza certificati TLS locali.

### PostgreSQL

```powershell
ssh -N -T -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -L 127.0.0.1:15432:IP_POSTGRES:5432 mercurion-server
```

Configurare il client: host `127.0.0.1`, porta `15432`, database
`mercurion_preview`, utente `mercurion_preview`. Usare la password applicativa
PostgreSQL dal campo `applicationSecrets.SQL_DATABASE_PASSWORD` della
configurazione privata. Per accesso amministrativo, usare esplicitamente
l'utente `postgres` con `postgresServer.adminPassword`, che è distinta.
Il tunnel cifra il tratto SSH; non abilita TLS nel server PostgreSQL.

**Differenza effettiva rispetto allo sviluppo:** `docker_sl/docker-compose.yml`
usa utente `app` e database `mercurion`. Il bootstrap VM ha introdotto invece
il ruolo applicativo e il database `mercurion_preview` in
`deployment/local-vm/operational/postgres-init.sh`, commit `e79f09816`.
`preview_credentials.py` imposta gli stessi nomi per il backend. Non si tratta
di una rinomina effettuata dal tunnel e non implica che il ruolo `app` sia
presente sulla VM. Questa divergenza resta esplicitamente documentata;
la guida non cambia ruoli o password. Un errore di autenticazione per `app`
non si risolve ricreando lo schema o rilanciando il bootstrap.

Con `psql` installato su Windows, password richiesta interattivamente:

```powershell
psql -h 127.0.0.1 -p 15432 -U mercurion_preview -d mercurion_preview -W
```

### Redis

```powershell
ssh -N -T -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -L 127.0.0.1:16379:IP_REDIS:6379 mercurion-server
```

Client Redis: host `127.0.0.1`, porta `16379`, password Redis della
configurazione privata (`applicationSecrets.REDIS_PASSWORD`); non quella di PostgreSQL. Nel profilo attuale si usa
l'utente Redis `default`. Non inserire la password nell'URL del comando SSH.

### NATS

```powershell
ssh -N -T -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -L 127.0.0.1:14222:IP_NATS:4222 mercurion-server
```

Endpoint client `nats://127.0.0.1:14222`. Configurare separatamente username e
password del consumer autorizzato, presenti nella configurazione privata.
Il forward non disabilita autenticazione, permessi sui subject o validazione
JWT eventualmente richiesta dai singoli servizi Tox21. Non usare un browser
HTTP per verificare questa porta.

### Meilisearch

```powershell
ssh -N -T -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -L 127.0.0.1:17700:IP_MEILI:7700 mercurion-server
```

Endpoint `http://127.0.0.1:17700`. Fornire al client la chiave dedicata
all'operazione. La master key server serve soltanto per amministrazione;
non sostituirla alle chiavi applicative. Guida a indici e chiavi:
[MEILISEARCH-OPERATIONS.md](MEILISEARCH-OPERATIONS.md).

### Backend Nest diretto

```powershell
ssh -N -T -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -L 127.0.0.1:18098:IP_NODE:8098 mercurion-server
```

Endpoint `http://127.0.0.1:18098`. È un collegamento diretto al backend per
diagnosi: l'accesso applicativo ordinario passa da Nginx. Il tunnel non aggiunge
gli header del proxy fidato né modifica autenticazione e cookie.

### Frontend Angular diretto

```powershell
ssh -N -T -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -L 127.0.0.1:13497:IP_NG:3497 mercurion-server
```

Endpoint `http://127.0.0.1:13497`. Serve per ispezionare i file/frontend del
container; per API e realtime attraverso l'edge usare il forward Nginx.

## 3. Verificare e chiudere

Da un altro **PowerShell Windows**, esempio PostgreSQL:

```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 15432
```

`TcpTestSucceeded=True` verifica il listener locale; completare la verifica
con una connessione autenticata del client. Il listener SSH può accettare il
TCP locale anche se la destinazione remota non risponde.

Per chiudere, premere **Ctrl+C nel terminale del forward**. Questo chiude
soltanto quel tunnel; non arresta container o VM. Un tunnel per terminale
permette di chiuderli indipendentemente. I bind sono su `127.0.0.1`, senza
pubblicazione sulla LAN.

Se la porta locale è occupata (`Address already in use`), chiudere il proprio
forward precedente oppure cambiare la porta a sinistra del secondo `:` e
aggiornare il client. Per esempio `15433:IP_POSTGRES:5432`. Non terminare processi
altrui e non modificare firewall o Compose. `ExitOnForwardFailure` rileva i
problemi di apertura del listener, non la readiness della destinazione.

Se SSH mostra `connect failed: Connection refused`, verificare container
running, IP attuale e porta interna. Se segnala una host key diversa, non
cancellare `known_hosts` per aggirare il controllo. Un forward già aperto su
un vecchio IP va chiuso e riaperto dopo avere individuato il nuovo indirizzo.

## 4. Caso particolare: PostgreSQL di manutenzione HNSW

Il container temporaneo HNSW usa rete `none`: **non ha un IP utilizzabile per
il port-forward**. L'istanza ordinaria viene fermata durante il build; il suo
forward non mostra il processo dell'istanza di manutenzione.

Per individuare una manutenzione effettivamente in esecuzione, nella
**shell Ubuntu**:

```bash
sudo docker ps --filter label=mercurion.embedding.maintenance --format 'table {{.ID}}\t{{.Names}}\t{{.Status}}'
```

Soltanto se compare un container, sostituire `ID_MANUTENZIONE` ed entrare in psql:

```bash
sudo docker exec -it ID_MANUTENZIONE sh -c 'PGPASSWORD=$(cat /run/mercurion/application-password) || exit; export PGPASSWORD; exec psql -X -h 127.0.0.1 -U mercurion_preview -d mercurion_preview'
```

Dentro **psql**, monitorare senza modificare la sessione che costruisce l'indice:

```sql
SELECT pid, phase, tuples_done, tuples_total,
       round(100.0 * tuples_done / nullif(tuples_total, 0), 1) AS percentuale
FROM pg_stat_progress_create_index
WHERE relid = 'public.molecule_embeddings'::regclass;
\watch 2
```

Ctrl+C interrompe il monitor; `\q` esce dal client. Un risultato vuoto non
dimostra un build riuscito: potrebbe non essere iniziato o essere già terminato.
La percentuale può essere nulla nelle fasi senza conteggio. Se il container non
compare, non tentare `docker exec` contro un nome presunto e non avviare un'altra
istanza PostgreSQL sul volume: consultare il report del worker descritto in
[EMBEDDINGS-IMPORT.md](EMBEDDINGS-IMPORT.md).

## Stato verificato al passaggio di consegne

I comandi sono ricavati dai manifest operativi e sottoposti a verifica statica;
non sono stati aperti nuovi tunnel per scrivere questa guida. Il recupero dei
quattro server è passato, ma l'ultimo tentativo HNSW è **fallito in preflight**
con `embedding-index-needs-14-cpu-28-gib-and-25-gib-available`.
Non risultano da quel tentativo un container HNSW attivo o un indice costruito.
Il controllo di capacità e il monitor delle fasi preliminari non sono stati
modificati: restano lavoro aperto. Nessuna modifica a infrastruttura o credenziali.
