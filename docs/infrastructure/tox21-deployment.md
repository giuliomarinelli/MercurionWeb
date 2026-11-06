# T21-06 — Configurazioni Web per il componente Tox21

6 novembre 2026. Queste definizioni preparano gli input per Tox21, senza
scegliere una nuova topologia VM o autorizzare un deployment. Tox21 è un
componente Mercurion con repository, versione, SHA e CI propri.

## Immagine e build locale sono percorsi distinti

I Compose beta e production consumano un'immagine Tox21 per default: **nessun
checkout Tox21 è richiesto**. Gli altri servizi Web mantengono i propri build
esistenti; non si tratta di una conversione dell'intero stack a sole immagini.
Per Tox21 servono questi input di processo o in un env file scelto esplicitamente:

| Variabile | Significato |
| --- | --- |
| `REGISTRY_IMAGE_MT21` | Repository/nome dell'immagine preparata per il target scelto, anche locale |
| `TOX21_VERSION` | Versione dichiarata nella label OCI e nella configurazione dell'immagine |
| `TOX21_REVISION` | SHA completo di 40 caratteri del repository Tox21, indipendente da `BUILD_REVISION` Web |
| `TOX21_NATS_URL` | Broker raggiungibile dalla rete del container, `nats://` o `tls://` |

Il riferimento è `${REGISTRY_IMAGE_MT21}:${TOX21_VERSION}-${TOX21_REVISION}`;
`VERSION` usa la stessa variabile del tag. Il tag non è una prova crittografica
del contenuto: verificare le label dell'immagine prima di usarla. Un tag può
indicare una sola immagine; se le varianti staging/production coesistono,
usare nomi repository distinti per target o coordinate distinte concordate
nella consegna T21-07. Non sovrascrivere una variante con l'altra confidando
nel solo SHA sorgente comune. Nessun registry o tag pubblico è assegnato qui.

Il Compose beta imposta `PY_ENV=staging`, production `PY_ENV=production`;
namespace NATS rispettivamente `staging.*` e subject base. Usare un'immagine
del target corrispondente, controllando `org.mercurion.environment`, versione,
revision e source. Per esempio, la sola ispezione locale, senza avviare nulla:

```powershell
docker image inspect "$($env:REGISTRY_IMAGE_MT21):$($env:TOX21_VERSION)-$($env:TOX21_REVISION)" --format '{{json .Config.Labels}}'
```

I frammenti release non definiscono un broker NATS o la rete completa di
distribuzione. `TOX21_NATS_URL` deve essere risolvibile/raggiungibile nella
rete selezionata dall'operatore. Non usare automaticamente `localhost` come
indirizzo del broker in un altro container. Non è stata aggiunta una nuova
rete condivisa o modificata quella di sviluppo.

Per risolvere la configurazione (non avviare lo stack), fornire anche le
variabili Web già richieste dal frammento e usare un env file esplicito:

```powershell
docker compose --env-file C:/config/non-production.env -f docker_sl/releases/beta/docker-compose.yml config
```

I percorsi qui sono esempi da scegliere, non file forniti dal clone. La prova
automatica usa invece un env file vuoto e valori sintetici, senza leggere
configurazioni personali. Non inserire valori segreti nella documentazione.

La build locale è un override esplicito. Richiede inoltre:

- `TOX21_SOURCE_CONTEXT`: percorso **assoluto** di un checkout Tox21 compatibile;
  la vicinanza `../MercurionTox21` è soltanto una convenzione locale.
- `TOX21_MODEL_PACKAGE_CONTEXT`: percorso **assoluto** del pacchetto esportato
  con esattamente pesi, soglie e manifest, senza configurazioni personali.

```powershell
docker compose --env-file C:/config/non-production.env -f docker_sl/releases/beta/docker-compose.yml -f docker_sl/releases/beta/docker-compose.tox21-build.yml config
```

Per production sostituire `beta` con `prod` nei due percorsi. Non cambiare
implicitamente la variabile Web `BUILD_VERSION`/`BUILD_REVISION`: il Dockerfile
Tox21 riceve soltanto `BUILD_VERSION=TOX21_VERSION` e
`BUILD_REVISION=TOX21_REVISION`. Target `staging`/`production`, Dockerfile unico
e contesto nominato `model_package` seguono il contratto del repository Tox21.
Gli override non sono Compose standalone. Costruire soltanto il servizio
Tox21 desiderato, dopo aver verificato input e checkout pulito; nessuna build,
push di immagini o esecuzione di servizi viene eseguita da questi esempi `config`.

Entrambe le varianti impostano UID/GID 10021, filesystem read-only, `/tmp`
temporaneo, nessuna capability, `no-new-privileges` e 15 secondi per l'arresto.
Auth Tox21 rimane pubblica interna/tutto-o-nulla. Se abilitata esplicitamente
nel sorgente, aggiungere un mount read-only del PEM pubblico RSA e
`JWT_PUBLIC_KEY_PATH`: nessuna chiave Base64, lettura dotenv staging/prod,
rotazione o fallback alla modalità pubblica è introdotto qui.

## Inventario e stato dei manifest

| Definizione | Stato nel perimetro attuale |
| --- | --- |
| `docker_sl/docker-compose.yml` | Dipendenze di sviluppo; nessun servizio Tox21 aggiunto, avvio locale separato preservato |
| `docker_sl/local-staging/docker-compose.yml` | Frammento test Web esistente; Tox21 resta disabilitato nell'overlay canonico, nessun nuovo avvio implicito |
| `docker_sl/releases/beta/docker-compose.yml` | Proiezione Tox21 staging mantenuta e corretta, immagine per default |
| `docker_sl/releases/prod/docker-compose.yml` | Proiezione production Tox21 aggiunta, coerente con l'overlay che già lo dichiarava abilitato |
| Due `docker-compose.tox21-build.yml` | Override opzionali mantenuti per build con input espliciti, fuori dal normale build Web |
| `k8s/beta/mercurion-tox21-deploy.yaml` | Template beta mantenuto: immagine/versione/SHA Tox21 parametrizzati, namespace staging, worker non-root/read-only e `/tmp` dedicato |
| Altri manifest beta/core | Conservati, senza scelta implicita di Kubernetes per la VM |
| `k8s/beta/pg-stack.yaml` | **Lacuna separata:** il CronJob `pg-backup` usa ancora un vecchio riferimento Tox21 per eseguire `pg_dump`. Non è un runtime Tox21 supportato; immagine/tooling e ripristino del backup richiedono un intervento PostgreSQL dedicato prima dell'uso |
| Compose nel repository Tox21 | Contratto locale T21-04 conservato; non serve al build/CI Web ordinario |

Nessun manifest è stato archiviato o cancellato. I template mantenuti sono
verificati come configurazioni, non come applicazioni già distribuite. Il
CronJob PostgreSQL e le lacune di topologia non vengono resi validi dal gate
statico generale. Non applicare indistintamente l'intera directory `k8s/`.

Il template Kubernetes Tox21, come gli equivalenti Web, contiene placeholder:
renderizzare soltanto le variabili nominate e validare prima di qualsiasi
eventuale applicazione. Non è stata eseguita una chiamata al cluster o una
validazione dello schema API Kubernetes. NATS conserva il service DNS beta
esistente; non sono aggiunte probe HTTP fittizie al worker.

## Verifiche T21-06

- `npm run ci:deployment`: schema, quattro overlay e venti artifact, con
  undici prove negative (cinque precedenti e sei nuove su identità/namespace/
  confini di build/pacchetto Tox21).
- `node scripts/test-tox21-compose.mjs`: Docker Compose risolve quattro varianti
  con dati sintetici e SHA Web/Tox21 differenti; dodici input mancanti respinti.
  Non legge env personali, non avvia/builda/pulla immagini e non accede al sibling.
  I percorsi dei contesti sono sintetici: questa prova verifica risoluzione e
  mapping, non ricostruisce il codice Tox21. Il check è agganciato al job CI
  container `angular-production`, dove Docker è già disponibile; il gate
  statico multipiattaforma non acquista una dipendenza da Docker o da Tox21.
- Tre suite Nest su fixture wire, registro NATS e contratti RDKit: **47 casi**.
  Coprono i cinque contratti e i namespace dei quattro ambienti senza broker.
- Template Kubernetes renderizzato con soli valori sintetici e parsing YAML
  locale; non è una prova di deployment o di schema lato cluster.

La CI Tox21 già verde resta quella dello SHA `1e295ce617ce0df3f374e84e094ead4ce0d569c0`;
nessun codice Tox21 è modificato da questo task. Il gate CI Web remoto non è
dichiarato verde dalle sole verifiche locali. Il seguito T21-07 definisce il
canale di consegna degli artifact; T21-08 prova integrazione e ripristino.
