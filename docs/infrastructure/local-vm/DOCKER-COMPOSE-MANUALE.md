# Usare Docker Compose sulla VM

**Per allocare risorse e rilanciare l'HNSW**, segui la
[procedura manuale completa](HNSW-MANUALE.md): verifica Docker e shared memory,
parametri SQL nella stessa sessione, avvio e monitoraggio.
Il solo aumento dei limiti Docker descritto sotto non completa la configurazione
del build PostgreSQL.

## Operazione richiesta ora: aumentare le risorse del PostgreSQL esistente

Per cambiare CPU/RAM del container già avviato **non occorre creare un nuovo
Compose né eseguire `up`**. Docker permette di applicare questi limiti a caldo,
senza ricreare il container. L'operazione resta manuale, eseguita dall'owner.

Nel **terminale Ubuntu**, usare l'ID del PostgreSQL attivo. Quello sotto è
l'ID registrato nell'ultima consegna; se il container è stato ricreato,
individuare prima quello attuale con `sudo docker ps`.

**Primo comando, senza sudo:** assegna l'ID a una variabile della shell.

```bash
pg=2bd6b76b887da491e3071da56640df4779ab624c99ea887ed20ea380a7963415
```

**Comandi successivi, con sudo:** applicano i limiti e leggono il risultato.

```bash
sudo docker update --cpus 12 --memory 24g --memory-swap 24g "$pg"
sudo docker inspect --format 'NanoCPU={{.HostConfig.NanoCpus}} RAM_bytes={{.HostConfig.Memory}}' "$pg"
sudo docker exec "$pg" df -h /dev/shm
```

La riga `pg=...` è un'assegnazione Bash: eseguirla senza `sudo`. I comandi
Docker sulla VM richiedono invece `sudo`; non anteporlo alla sola assegnazione.

Il risultato atteso è `NanoCPU=12000000000`, `RAM_bytes=25769803776`.
Il limite swap uguale al limite
RAM non aggiunge 24 GiB di swap. Questi comandi non sono stati eseguiti dall'agente.

Se è stato eseguito `sudo pg=...`, l'assegnazione non è avvenuta nella shell
corrente: ripetere il primo comando **senza sudo**. Se compare `permission denied`
sul socket `/var/run/docker.sock`, controllare che il comando inizi con
`sudo docker`, non con `docker` soltanto. Quel rifiuto non indica un errore
della password PostgreSQL o dei permessi del file Compose.

**Prima di rilanciare l'indice:** `docker update` non aumenta `/dev/shm` e non
imposta la memoria di manutenzione o i worker SQL. Un build HNSW parallelo con
molta memoria di manutenzione può quindi ancora fallire se `/dev/shm` è piccolo.
Leggere la capacità effettiva con il comando sopra e, nel Query Tool pgAdmin:

```sql
SELECT current_setting('maintenance_work_mem') AS maintenance_work_mem,
       current_setting('max_parallel_maintenance_workers') AS maintenance_workers,
       current_setting('max_parallel_workers') AS parallel_workers,
       current_setting('max_worker_processes') AS worker_processes;
```

Questa query legge i valori della sessione corrente. Le impostazioni del build
vanno applicate nella stessa sessione del CREATE INDEX. Il solo aumento dei
limiti Docker non rende disponibili automaticamente 20 GiB o 11 worker SQL.
La durata di un'ora è una stima dell'operatore, non una durata verificata.

## Consultazione successiva: gestione dei file Compose

Il resto della pagina riguarda soltanto la gestione futura dei Compose;
non è un prerequisito per il cambio a caldo di CPU e RAM descritto sopra.

Questa pagina riguarda **la VM già installata**. Tutti i comandi si eseguono
nel **terminale Ubuntu**, non in PowerShell Windows.

Il percorso principale qui sotto serve per **PostgreSQL, Redis e NATS**.
Gli altri servizi sono elencati in fondo.

## 1. Crea il tuo compose.yaml

Il Compose nella vecchia cartella `server-6c3e.../deployment/...` richiede
variabili mancanti. La configurazione usata dopo l'aggiornamento dei server
è invece già completa. Il comando seguente la converte in un normale YAML
nella tua home, senza avviare container.

**Solo la prima volta. Se hai già modificato il file di destinazione,
conservalo e passa al punto 2: non sovrascriverlo.**

```bash
file_sorgente=/opt/mercurion/releases/upgrade-6d019947800b4578bc2b5d40791f5132/preview-servers.json
mkdir -p ~/mercurion-compose/preview-servers
sudo docker compose --env-file /dev/null -f "$file_sorgente" config > ~/mercurion-compose/preview-servers/compose.yaml
```

Se compare un errore, fermati: il file di destinazione potrebbe essere vuoto.
Se il comando riesce, il file da aprire in **VS Code Remote SSH** è:

```text
~/mercurion-compose/preview-servers/compose.yaml
```

Appartiene al tuo utente: puoi modificarlo e salvarlo. Non devi cambiare i
permessi della release sotto `/opt`.

## 2. Controlla il file prima di applicarlo

- **CPU e RAM:** la copia conserva i valori del vecchio Compose. Imposta quelli che vuoi applicare; la RAM della VM non modifica da sola i limiti del container.
- **`name`:** conserva il nome del progetto esistente per gestire gli stessi servizi.
- **Volumi PostgreSQL e Redis:** conserva i nomi esistenti per usare i dati già caricati.
- **File montati:** devono esistere sulla VM. Vedi il caso del riavvio in fondo.

Le immagini sono già indicate nel file: questo percorso non richiede le
variabili `POSTGRES_IMAGE`, `REDIS_IMAGE` e `NATS_IMAGE` del vecchio template.
La copia è uno snapshot della configurazione salvata, non una rilevazione di
eventuali modifiche manuali successive ai container.

## 3. Usa Docker Compose normalmente

Entra nella tua cartella e controlla che il file sia valido:

```bash
cd ~/mercurion-compose/preview-servers
sudo docker compose config --quiet
```

Il controllo deve terminare senza errori. Non avvia servizi.

**Il comando seguente può ricreare PostgreSQL e interrompere una query in corso.
Se l'indice è ancora in costruzione, non applicarlo durante il build.**

Quando decidi di applicare la configurazione:

```bash
sudo docker compose up -d
```

Per vedere stato e log:

```bash
sudo docker compose ps -a
sudo docker compose logs --tail 100
```

Non serve eseguire i precedenti wrapper PowerShell. Non usare `down -v` per
risolvere un errore: rimuoverebbe i volumi gestiti dal progetto.

## Gli altri servizi

La precedente installazione è divisa in quattro progetti Compose:

| Servizi | File sorgente sulla VM |
| --- | --- |
| PostgreSQL, Redis, NATS | `/opt/mercurion/releases/upgrade-6d019947800b4578bc2b5d40791f5132/preview-servers.json` |
| Meilisearch | `/opt/mercurion/releases/upgrade-6d019947800b4578bc2b5d40791f5132/shared-servers.json` |
| Nest, Angular, Tox21 | `/opt/mercurion/releases/application-07fd750861be434b8de3c768bc9a6353/preview-applications.json` |
| Nginx | `/opt/mercurion/releases/application-07fd750861be434b8de3c768bc9a6353/shared-applications.json` |

Per un altro gruppo ripeti il punto 1 con il suo file sorgente e una
**cartella di destinazione distinta**. Mantieni separati i progetti e i loro
nomi. Compose legge anche i file JSON con `-f`: la conversione serve a darti
un YAML modificabile nella tua home.

## Se manca un file montato dopo un riavvio

I Compose salvati usano ancora le configurazioni sotto `/run/mercurion-preview/`
e `/run/mercurion-applications/`. Sono file su RAM: possono sparire al reboot.
`docker compose up -d` non ne ricrea correttamente il contenuto.

Posizioni, utenti e credenziali sono in
[Credenziali e configurazione](CREDENTIALS-AND-CONFIGURATION.md).

**Il nuovo caricamento manuale delle variabili che hai scelto non è ancora
implementato in questi Compose.** La guida ti permette di gestire la
configurazione esistente; non presenta il vecchio caricamento da file come
se fosse già stato sostituito.

## Cosa è stato verificato

Percorsi e struttura sono ricavati dai sorgenti dell'installazione. Questa
pagina non è una nuova prova di avvio: nessun comando Docker o SSH è stato
eseguito sulla VM durante la sua revisione. Se ricrei container, i loro ID
possono cambiare e le vecchie ricevute degli script non si aggiornano da sole.
