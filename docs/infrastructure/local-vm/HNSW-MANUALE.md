# HNSW: risorse, rilancio e avanzamento manuale

**Scopo:** costruire l'indice dalla tua sessione pgAdmin, usando le risorse
previste. Non richiede i precedenti script di caricamento o manutenzione.
I comandi sono documentati per l'operatore: l'agente non li esegue.

**Non basta `docker update`.** Ci sono tre livelli distinti:

| Livello | Cosa controlla | Profilo discusso per la VM da 14 vCPU / 28 GiB |
| --- | --- | --- |
| Docker | Limiti CPU e RAM del container | 12 CPU, 24 GiB RAM |
| Container | Capacità di `/dev/shm` | 22 GiB, compresi nei consumi RAM del container |
| PostgreSQL | Memoria del build e worker | `maintenance_work_mem=20GB`, massimo 11 worker più il leader |

Sono obiettivi da verificare, non valori già attestati sulla VM. I 20 GiB
devono lasciare spazio entro i 24 GiB a `shared_buffers` e agli altri consumi
PostgreSQL. La VM deve conservare RAM per sistema e altri servizi: il limite
Docker non riserva memoria né garantisce che sia disponibile.

## 1. Leggi le risorse effettive

**Terminale Ubuntu.** La prima riga è un'assegnazione Bash, senza sudo.
Usa questo ID solo se è ancora il PostgreSQL attivo; altrimenti leggilo con
`sudo docker ps`.

```bash
pg=2bd6b76b887da491e3071da56640df4779ab624c99ea887ed20ea380a7963415
sudo docker inspect --format 'NanoCPU={{.HostConfig.NanoCpus}} RAM_bytes={{.HostConfig.Memory}} SHM_bytes={{.HostConfig.ShmSize}}' "$pg"
sudo docker exec "$pg" df -h /dev/shm
sudo docker stats --no-stream "$pg"
```

Per il profilo sopra: `NanoCPU=12000000000`, `RAM_bytes=25769803776`,
`SHM_bytes=23622320128`. Una capacità `/dev/shm` di 64 MiB non è sufficiente
per il build parallelo con 20 GiB di manutenzione.

**pgAdmin, Query Tool collegato al database che contiene la tabella:**

```sql
SELECT current_database(), current_user;
SELECT name, current_setting(name) AS valore, context, pending_restart
FROM pg_settings
WHERE name IN ('shared_buffers', 'maintenance_work_mem',
               'max_worker_processes', 'max_parallel_workers',
               'max_parallel_maintenance_workers');
```

Questo legge la sessione corrente, non i parametri di una query già avviata
in un'altra scheda. Non confrontare un semplice valore CPU% con il limite:
il limite autorizza l'uso, non obbliga PostgreSQL a consumarlo.

## 2. Adegua solo ciò che manca, prima del nuovo build

**CPU/RAM, senza ricreare il container — terminale Ubuntu:**

```bash
sudo docker update --cpus 12 --memory 24g --memory-swap 24g "$pg"
```

Ripeti il readback del punto 1. Questo comando **non** cambia `/dev/shm`,
memoria SQL o worker. Swap uguale alla RAM significa nessuna quota swap aggiuntiva.

**Se `/dev/shm` è troppo piccolo o servono più processi PostgreSQL:** occorre
una modifica della configurazione di creazione/avvio e un riavvio controllato.
`max_worker_processes` non si aumenta con un SET nella sessione.
Prima attendi o annulla consapevolmente la query precedente; non ricreare
PostgreSQL mentre vuoi mantenerla in esecuzione.

Nel servizio `postgres-preview` del **Compose effettivamente usato**, i campi
per questo profilo sono i seguenti. È un frammento JSON da integrare nel
servizio esistente, non un file Compose completo:

```json
{
  "cpus": 12,
  "mem_limit": "24g",
  "memswap_limit": "24g",
  "shm_size": "22g",
  "command": ["postgres", "-c", "max_worker_processes=12", "-c", "max_parallel_workers=12"]
}
```

Conserva immagine, utente, reti e soprattutto i mount/volumi esistenti. Se
`command` contiene già altri parametri necessari, integra questi due `-c`
senza perdere quelli precedenti. Non usare il template della release iniziale.
Per la generazione registrata, il file server risolto è quello sotto:

```bash
file_compose=/opt/mercurion/releases/upgrade-6d019947800b4578bc2b5d40791f5132/preview-servers.json
sudoedit "$file_compose"
```

Dopo le modifiche, quando scegli di applicarle:

```bash
sudo docker compose --env-file /dev/null -f "$file_compose" config --quiet
```

Prosegui **solo se il controllo termina senza errori**:

```bash
sudo docker compose --env-file /dev/null -f "$file_compose" up -d --no-deps postgres-preview
sudo docker compose --env-file /dev/null -f "$file_compose" ps -q postgres-preview
```

Il container può essere ricreato: aggiorna la variabile `pg` con l'ID restituito
e ricontrolla il punto 1. Anche il suo IP può cambiare: aggiorna il
[forward PostgreSQL](PORT-FORWARDING.md#postgresql) se necessario.
Le vecchie ricevute degli orchestratori non si aggiornano con queste modifiche.

## 3. Imposta i parametri nella stessa sessione del CREATE INDEX

Torna al **Query Tool pgAdmin** e riconnettiti se PostgreSQL è stato riavviato.
Verifica prima che l'indice non sia già costruito o in costruzione:

```sql
SELECT pid, phase FROM pg_stat_progress_create_index
WHERE datname = current_database()
  AND relid = 'public.molecule_embeddings'::regclass;

SELECT indexrelid::regclass AS indice, indisvalid, pg_get_indexdef(indexrelid)
FROM pg_index
WHERE indrelid = 'public.molecule_embeddings'::regclass;
```

Se c'è già un build attivo, non lanciarne un secondo. Se esiste già un HNSW
cosine valido sulla stessa colonna, non crearne una copia con un altro nome.

**Solo dopo le verifiche di RAM, shared memory e worker**, nella stessa scheda
che userai per il build, esegui e controlla:

```sql
SET maintenance_work_mem = '20GB';
SET max_parallel_maintenance_workers = 11;
SELECT current_setting('maintenance_work_mem') AS memoria_build,
       current_setting('max_parallel_maintenance_workers') AS worker_richiesti,
       current_setting('max_parallel_workers') AS limite_paralleli,
       current_setting('max_worker_processes') AS limite_processi;
```

Per richiedere 11 worker il pool deve permetterli; il profilo server sopra
imposta entrambi i limiti globali a 12. Il numero effettivo può essere inferiore
se i worker non sono disponibili. Impostare 11 nella sessione non aggira il pool.

Non cambiare scheda o connessione dopo i SET. Se il controllo è coerente e
l'indice è assente, esegui nella **stessa sessione** il comando dell'owner:

```sql
CREATE INDEX IF NOT EXISTS idx_me_hnsw_cos
ON public.molecule_embeddings USING hnsw (embedding vector_cosine_ops)
TABLESPACE pg_default;
```

`IF NOT EXISTS` controlla il nome, non certifica la definizione di un indice
già presente. Nessun DROP è previsto da questa guida. Le nuove impostazioni
non aumentano retroattivamente la memoria di un CREATE già in esecuzione.

## 4. Segui l'avanzamento da una seconda sessione

Apri un **secondo Query Tool pgAdmin**, collegato allo stesso database:

```sql
SELECT pid, phase, blocks_done, blocks_total,
       round(100.0 * blocks_done / nullif(blocks_total, 0), 1) AS percentuale
FROM pg_stat_progress_create_index
WHERE datname = current_database()
  AND relid = 'public.molecule_embeddings'::regclass;
```

Riesegui la SELECT per aggiornare. In psql puoi usare `\watch 2` dopo la
SELECT; `\watch` non è SQL e non va eseguito nel Query Tool pgAdmin.
Per HNSW pgvector documenta la percentuale sui **blocchi**, non sulle tuple.
Durante l'inizializzazione il totale può non essere disponibile.

Il NOTICE `hnsw graph no longer fits into maintenance_work_mem` significa che
il grafo ha superato la memoria di manutenzione: non prova che Docker abbia
rifiutato l'aumento RAM. Il build può continuare più lentamente. Non è una
misura della percentuale e non permette di promettere una durata di un'ora.

## 5. Verifica il risultato

La scomparsa dalla vista progresso non basta: controlla l'esito nella scheda
del CREATE e poi, senza modificare i dati:

```sql
SELECT indexrelid::regclass AS indice, indisvalid, indisready,
       pg_get_indexdef(indexrelid) AS definizione
FROM pg_index
WHERE indrelid = 'public.molecule_embeddings'::regclass;
```

Per `idx_me_hnsw_cos` sono attesi indice valido/pronto e definizione HNSW
cosine sulla colonna `embedding`. L'eventuale indice unico su `molregno` è
un'operazione distinta. Un CREATE annullato o fallito non è un completamento.
I SET sono di sessione; i limiti Docker restano applicati finché non li cambi.

## Fonti e livello di verifica

- [Docker: parametri modificabili con container update](https://docs.docker.com/reference/cli/docker/container/update/).
- [PostgreSQL 16: memoria e limiti dei worker](https://www.postgresql.org/docs/16/runtime-config-resource.html).
- [pgvector 0.8.7: build, shared memory e progresso HNSW](https://raw.githubusercontent.com/pgvector/pgvector/v0.8.7/README.md).
- [PostgreSQL 16: vista di avanzamento CREATE INDEX](https://www.postgresql.org/docs/16/progress-reporting.html#CREATE-INDEX-PROGRESS-REPORTING).

Questa è una procedura documentale verificata contro le fonti. Non è stata
eseguita dall'agente sulla VM e non attesta né le risorse effettive attuali
né il completamento del build dell'owner.
