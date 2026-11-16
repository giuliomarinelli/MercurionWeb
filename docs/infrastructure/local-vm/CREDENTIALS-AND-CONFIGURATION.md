# Dove trovare credenziali, utenti e configurazione

**Nome richiesto dall'owner:** il database deve chiamarsi `mercurion`.
Le tabelle descrivono lo stato effettivo `mercurion_preview`, ancora visibile
nell'ultimo screenshot, non il nome desiderato. Nessuna modifica a codice o
database è autorizzata all'agente.

Questa pagina descrive **la configurazione implementata**, comprese le differenze
rispetto allo sviluppo. Non autorizza cambi di nomi, password o privilegi.
Per aprire un accesso usare [PORT-FORWARDING.md](PORT-FORWARDING.md).

## 1. Il file privato da aprire

Sull'host Windows della VM attuale:

```text
C:\Users\giuli\.mercurion\preview\configuration.json
```

Su un altro account Windows il percorso predefinito è
`%USERPROFILE%\.mercurion\preview\configuration.json`. È un file locale privato,
esterno al repository. Aprirlo **nel proprio editor**, senza incollarlo in chat,
ticket, log o Git. Le chiavi nelle tabelle seguenti sono percorsi JSON: per
esempio `postgresServer.adminPassword` significa campo `adminPassword` dentro
l'oggetto `postgresServer`. Qui non sono riportati valori segreti.

Il file raccoglie i valori privati, **ma non tutta la configurazione**: nomi
PostgreSQL, indirizzi dei servizi e altre impostazioni sono oggi fissati nel
codice di generazione. La sezione 4 identifica precisamente quei file.

## 2. Credenziali da inserire nei client

| Servizio / uso | Nome utente o identità | Dove recuperare la password o chiave |
| --- | --- | --- |
| PostgreSQL preview, accesso applicativo | `mercurion_preview`; database `mercurion_preview` | `applicationSecrets.SQL_DATABASE_PASSWORD` |
| PostgreSQL preview, amministrazione | `postgres`; scegliere esplicitamente il database da amministrare | `postgresServer.adminPassword` |
| Redis preview | `default` nel profilo attuale | `applicationSecrets.REDIS_PASSWORD` |
| NATS, consumer Nest | Valore di `applicationSecrets.APP_NATS_USERNAME` | `applicationSecrets.APP_NATS_PASSWORD` |
| NATS, consumer Tox21 | Valore di `tox21.username` | `tox21.password` |
| Meilisearch, amministrazione server/chiavi | Nessuno username; autenticazione API key Bearer | `meilisearchServer.masterKey` |
| Meilisearch, lettura dei dati molecolari | Nessuno username | `meilisearchClients.searchKey` |
| Meilisearch, scrittura dei log preview | Nessuno username | `meilisearchClients.logKey` |

**PostgreSQL sviluppo e VM non hanno gli stessi nomi.** In
`docker_sl/docker-compose.yml` lo sviluppo usa `app` / `mercurion`. Il bootstrap
VM ha introdotto `mercurion_preview` / `mercurion_preview` e il distinto
amministratore `postgres`. La divergenza è stata introdotta nell'implementazione,
non dal forwarding, e non va interpretata come una rinomina richiesta dall'owner.
Il nome `app` non è quindi un login garantito della VM. Non modificare ruoli,
database o password per seguire questa guida e non rilanciare l'inizializzazione.

Per pgAdmin/DBeaver, dopo il forward PostgreSQL:

| Campo del client | Valore |
| --- | --- |
| Host | `127.0.0.1`, esplicitamente IPv4 |
| Porta | `15432`, oppure quella scelta aprendo il tunnel |
| Database / Maintenance database | `mercurion_preview` |
| Username | `mercurion_preview` |
| Password | Copiare privatamente `applicationSecrets.SQL_DATABASE_PASSWORD` |
| SSH incorporato del client | Non necessario se il tunnel `ssh -L` è già aperto |

Un errore `password authentication failed` conferma che PostgreSQL è stato
raggiunto, ma non distingue password errata da ruolo inesistente. Controllare
username, campo della password e destinazione del tunnel; non dedurre che
serva creare un nuovo database. `localhost` può tentare anche `::1`: gli esempi
di forwarding di questa guida ascoltano su `127.0.0.1`.

### Accesso amministrativo e diagnosi senza cambiare password

Per pgAdmin con account amministrativo, usare la stessa destinazione
`127.0.0.1:15432`, maintenance database `mercurion_preview`, utente `postgres`
e password dal campo `postgresServer.adminPassword`. Reinserire privatamente
il valore corretto nel client; non usare la password del ruolo applicativo
con l'amministratore o viceversa.

È possibile tentare l'accesso locale dalla **shell Ubuntu**, dopo avere
individuato l'ID del PostgreSQL ordinario running come nella guida forwarding:

```bash
sudo docker exec -it ID_CONTAINER_POSTGRES psql -X -U postgres -d mercurion_preview
```

Questo usa il socket Unix e la policy locale del cluster, non il tunnel TCP.
Non garantisce l'accesso se quella policy è stata modificata. Non visualizza
password e non cambia utenti. Se si ottiene il prompt psql, leggere:

```sql
SELECT current_user, current_database();
SELECT rolname, rolcanlogin, rolsuper
FROM pg_roles
WHERE rolname IN ('app', 'mercurion_preview', 'postgres');
```

Per uscire usare `\q`. Se il socket locale funziona ma pgAdmin no, verificare
che tunnel e client puntino allo stesso container e che usino la coppia
utente/password appropriata. Non modificare `pg_hba.conf`, ruoli, password o
autenticazione per aggirare l'errore. Dopo i primi login falliti, lo screenshot
dell'owner con CREATE INDEX in esecuzione conferma l'accesso pgAdmin riuscito.

## 3. Altri segreti e identità: non confonderli

| Elemento | Dove si recupera | A cosa serve |
| --- | --- | --- |
| Utente e chiave SSH | Blocco `Host mercurion-server` in `%USERPROFILE%\.ssh\config`, campi `User` e `IdentityFile` | Collegarsi a Ubuntu; non è l'utente PostgreSQL |
| Passphrase della chiave SSH | Password manager / custodia personale dell'operatore | Sbloccare la chiave privata SSH; non è nel JSON preview |
| Password sudo | Credenziale dell'utente Ubuntu, custodita dall'operatore | Elevazione locale nel guest; distinta dalla passphrase SSH |
| Accesso al daemon Docker nella VM | Comandi `sudo docker ...` | Usa sudo dell'utente Ubuntu, non username/password PostgreSQL. Le assegnazioni Bash come `pg=...` si eseguono invece senza sudo |
| Passphrase LUKS | Custodia personale dell'operatore | Sblocco del disco dalla console Hyper-V; non è nel JSON preview |
| SMTP | `providers.EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_SECURE`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`, `EMAIL_DEFAULT_FROM` | Invio email dell'applicazione |
| SMS Twilio | `providers.TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | Provider SMS |
| OAuth/OIDC applicativo | Campi `providers.GOOGLE_*`, `GITHUB_*`, `LINKEDIN_*`, `DISCORD_*`, `ORCID_*`; anche `providers.ORCID_ISSUER` | Autenticazione SSO dentro Mercurion |
| Turnstile server | `providers.CLOUDFLARE_SECRET_KEY` | Validazione del widget; distinta dalla site key pubblica nel frontend |
| Dropbox | `providers.DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET` | Campi del generatore, benché il runtime previsto non usi Dropbox |
| JWT HTTP RS256 | `applicationSecrets.JWT_RS256_PRIVATE_KEY` e `JWT_RS256_PUBLIC_KEY` | Firma e verifica HTTP; chiave pubblica Tox21 consegnata come PEM |
| JWT WebSocket RS256 | `applicationSecrets.JWT_WS_RS256_PRIVATE_KEY` e `JWT_WS_RS256_PUBLIC_KEY` | Firma e verifica WebSocket |
| AES, HMAC, pepper, cookie e sessioni | Altri campi di `applicationSecrets`, inclusi `JWT_SECRETS_*` | Materiale crittografico applicativo; non credenziali per client database |
| Account dell'applicazione Mercurion | Record utenti nel database e relativo flusso di registrazione/login | Non coincide con l'utente PostgreSQL o con le credenziali SMTP |
| Cloudflare Access e futuro tunnel | Configurazione Cloudflare custodita dall'owner | Access esterno; il JSON preview non è l'inventario dei segreti del pannello Cloudflare |

OAuth Google di Cloudflare Access e OAuth Google dell'applicazione sono due
configurazioni con responsabilità differenti: non presumere che abbiano lo
stesso client, callback o segreto.

### Tipi JSON e limiti del validatore corrente

`EMAIL_SMTP_PORT` può essere un numero JSON intero e `EMAIL_SMTP_SECURE` un
booleano JSON. Il generatore li converte in stringhe soltanto al confine con
le variabili runtime. Gli altri campi provider sono stringhe.

Il validatore completo attuale richiede tutti i campi `providers` non vuoti,
anche per integrazioni non usate. Questa è una limitazione implementativa:
non documentare omissione, `null` o stringa vuota come supportati per Dropbox,
GitHub o LinkedIn. Non inventare credenziali per aggirare il controllo. Il
contenuto del file dell'owner non è stato letto per scrivere questa pagina.

## 4. Dove sono fissati i valori che non compaiono nel JSON

I riferimenti sono relativi alla root del repository Web.

| File | Responsabilità effettiva |
| --- | --- |
| `scripts/infrastructure/New-PreviewConfiguration.ps1` | Percorso privato predefinito, ACL Windows, invocazione del generatore; origin iniziale `https://preview.mercurion.app` |
| `scripts/infrastructure/preview_credentials.py`, `template()` | Struttura del JSON, generazione iniziale dei segreti e default degli utenti NATS |
| Stesso file, `public_defaults()` | Legge **l'esempio versionato** `MercurionWebNode/env/.env.example`, non il dotenv privato di sviluppo |
| Stesso file, `application_document()` | Genera le variabili Nest, incluso username/database `mercurion_preview`, host/porte dei servizi, cookie e callback |
| Stesso file, `server_documents()` | Genera configurazioni server Redis/NATS/Meili e file credenziali PostgreSQL; non modifica autonomamente un server già avviato |
| `deployment/local-vm/operational/postgres-init.sh` | Crea ruolo e database `mercurion_preview` solo su un cluster nuovo |
| `deployment/local-vm/operational/preview/compose.yaml` | Dichiara `POSTGRES_USER=postgres`, porte interne, mount, reti e risorse dei servizi preview |
| `deployment/local-vm/operational/shared/compose.yaml` | Mount, reti e risorse di Meilisearch/Nginx condivisi |
| `deployment/local-vm/operational/nginx.conf` | Virtual host `preview.mercurion.app`, routing HTTP e WebSocket; nessun TLS locale |

Non è sufficiente modificare una copia del JSON per cambiare un valore
hardcoded o una password già registrata nel database. Anche per i valori
effettivamente letti dal JSON, il file Windows non viene ricaricato da solo
dai processi in esecuzione. Una variazione richiede un intervento esplicito,
consegna coerente e gestione dei consumer; non è una procedura implicita di
questa guida.

## 5. Dove arrivano i valori sulla VM

| Destinazione guest | Contenuto / lettore |
| --- | --- |
| `/run/mercurion-preview/<serverRunId>/active/postgres/` | `admin-password` e `application-password`; nel container sono sotto `/run/mercurion/` |
| `/run/mercurion-preview/<serverRunId>/active/redis/server.conf` | Configurazione Redis contenente la password |
| `/run/mercurion-preview/<serverRunId>/active/nats/server.json` | Coppie username/password dei consumer |
| `/run/mercurion-preview/<serverRunId>/active/meilisearch/server.toml` | Configurazione server con la master key |
| `/run/mercurion-applications/<appRunId>/active/web-node/values.json` | Variabili applicative Nest, senza master key server Meili |
| `/run/mercurion-applications/<appRunId>/active/tox21/` | `values.json` NATS e `http-public.pem` pubblico |

Sono file con permessi dedicati su tmpfs: spariscono dopo spegnimento/riavvio
della VM. I dati nei volumi PostgreSQL/Redis/Meili persistono. I `serverRunId`
e `appRunId` si leggono nelle ricevute del proprio bundle; non vanno inventati.
Per la VM di riferimento: server `6c3e72e2e4064b71bd3bbffcff4d629c`, applicazioni
`07fd750861be434b8de3c768bc9a6353`. La generazione server adottata
`6d019947800b4578bc2b5d40791f5132` continua a usare il percorso segreti del
serverRunId originale.

Il cold recovery disponibile ripristina **i quattro server**, non le
applicazioni. Vedere [COLD-RECOVERY.md](COLD-RECOVERY.md). Non leggere o stampare
questi file guest per recuperare password in chat: il riferimento per
l'operatore rimane il file privato Windows e il password manager.

## 6. Backup privati e recupero

Nella directory privata possono esserci backup del JSON, fra cui
`configuration.json.pre-aes32.backup` e `configuration.json.pre-meili-keys.backup`.
Sono altrettanto sensibili e possono contenere valori precedenti o campi ancora
vuoti. **Non sostituiscono automaticamente il file attivo.**

Non rigenerare la configurazione, eseguire l'init SQL o cancellare volumi per
risolvere un login fallito. La perdita del JSON/password manager richiede un
recupero distinto: la documentazione non contiene copie dei segreti e non può
ricostruirli. Le chiavi Meilisearch applicative hanno scadenza 90 giorni dalla
creazione iniziale: il port-forward non ne estende la validità.
