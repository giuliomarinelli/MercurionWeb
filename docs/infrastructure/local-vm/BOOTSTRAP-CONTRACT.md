# INF-VM-04 — contratto di bootstrap dei segreti

**7 novembre 2026 — audit e proposta operativa, provisioning non implementato.**
L'[adattatore consumer Nest opt-in](NEST-SECRET-FILE-ADAPTER.md) è ora implementato
e testato con dati sintetici; l'avvio esistente resta invariato. INF-VM-02 e
runtime INF-VM-03 restano aperti. Nessuna lettura di env operativi/PEM, generazione
di segreti, helper privilegiato o operazione sulla VM.

## Contratti osservati

Web ispezionato sul branch infra dopo `cb2a3fdd`; Tox21 letto soltanto come
dipendenza, commit `2cbfcd467afa9e9643065c630f6b06f265f0ac5a`. Le sorgenti sono
evidenza del codice, non prova del bootstrap delle immagini sulla VM.

| Consumer | Input attuale | Conseguenza per il bootstrap |
| --- | --- | --- |
| Nest configurazione | `createConfigurationModule`, schema e `validateEnvironment` leggono ambiente; dotenv locale solo development/test | Un file Compose montato non popola automaticamente la configurazione staging/production; non esiste un adattatore generico `_FILE` |
| Nest RSA HTTP/WS | `JwtKeysProvider` prod-like legge `JWT_RS256_PRIVATE_KEY_B64`, `JWT_RS256_PUBLIC_KEY_B64`, `JWT_WS_RS256_PRIVATE_KEY_B64`, `JWT_WS_RS256_PUBLIC_KEY_B64`, con fallback alle varianti senza `_B64` | Preservare le due coppie distinte; base64 è un formato, non protezione crittografica |
| Nest HMAC | 13 variabili legacy `JWT_SECRETS_*` richieste senza adapter locale; `JWT_LOCAL_KEYS_CONFIG` vietato in staging/production | L'adapter di sviluppo non è un percorso di provisioning VM già pronto; nessuna rotazione a caldo aggiunta |
| Nest credenziali applicative | SQL/Redis/Meilisearch, sessione/cookie, pepper/cifratura, SMTP/Twilio/OAuth e altre integrazioni passano dalla configurazione | Consegnare solo al Nest del relativo ambiente; chiavi esterne e segreti persistenti hanno cicli di sostituzione diversi |
| Tox21 | `config.py` non legge dotenv in staging/production; `JWT_PUBLIC_KEY_PATH` indica un file RSA pubblico `.pem` | Montare la pubblica HTTP dell'ambiente, non la privata o la coppia WS. Il file è letto se almeno una policy risolta richiede JWT |
| NATS consumer Nest | `APP_NATS_HOST` rifiuta user/password; `createNatsTransportOptions` configura soltanto `servers` | Abilitare credenziali sul solo broker romperebbe Nest: manca il contratto di autenticazione client |
| NATS consumer Tox21 | `NATS_URL` passa a `nc.connect`; il validatore ammette URL del broker anche con userinfo | Non dedurre da questa sola capacità compatibilità del sistema completo o autorizzare credenziali negli URL/log |
| Meilisearch client Nest | `MEILISEARCH_CLIENT` usa `MEILISEARCH_MASTER_KEY` per ricerca; `MEILISEARCH_LOG_CLIENT` usa `MEILISEARCH_LOG_KEY` per outbox | Separazione implementata l'8 novembre; omissione della writer key riusa la legacy per compatibilità. VM richiede key distinte ristrette, mai la master server |
| Meilisearch server | Richiede la propria master key, distinta dalle key Nest e UI | Scegliere e verificare il trasporto della master key al processo; nessuna master key nei backend |

Riferimenti Web: [modulo configurazione](../../../MercurionWebNode/src/config/configuration.module.ts),
[schema](../../../MercurionWebNode/src/config/config.schema.ts),
[validazione](../../../MercurionWebNode/src/config/env-validation.ts),
[provider RSA](../../../MercurionWebNode/src/app_modules/auth/providers/jwt-keys.provider.ts),
[transport NATS](../../../MercurionWebNode/src/nats-transport.ts),
[client Meilisearch](../../../MercurionWebNode/src/app_modules/meilisearch/meilisearch.module.ts),
[dispatcher](../../../MercurionWebNode/src/app_modules/notification/services/outbox/notification-outbox-dispatcher.service.ts).
Per Tox21: `config.py`, `schemas/schemas.py`, `runtime.py`, `main.py` e Dockerfile
al commit sopra, senza leggere i file di materiale indicati da quei sorgenti.
Le policy `AUTH_*` sono configurazione non segreta: omissione → `disabled`
(eredita la policy globale), valori estranei ai tre ammessi → errore Pydantic.
Il bootstrap non deve trasformare `disabled` in bypass o aggiungere variabili
per modificare implicitamente il flag globale attuale.

## Inventario dei materiali, senza valori

| Famiglia | Consumer ammessi | Vincoli |
| --- | --- | --- |
| RSA HTTP, RSA WS e 13 HMAC JWT | Nest dell'ambiente; Tox21 riceve solo la pubblica HTTP | Sostituzione JWT breaking, senza introdurre gestione multi-versione come requisito |
| `APP_SESSION_SIGNATURE_SECRET`, `APP_PASSWORD_PEPPER`, `APP_REDIS_ID_HMAC_SECRET`, `APP_DEVICE_ID_SIGNATURE_SECRET`, `SECURE_COOKIE_SECRET` | Nest dell'ambiente | Non trattare il cambio del pepper o degli identificatori come semplice logout |
| `APP_AES_SECRET`, `APP_USER_ID_AES_ENCRYPTION_SECRET` | Nest dell'ambiente | Schema richiede base64 di almeno 32 byte; conservare il materiale necessario a leggere i dati persistiti |
| `TOTP_CONFIG_PEPPER`, `UM_FEEDBACK_ANON_AUTHOR_KEY` | Nest dell'ambiente | Sostituzione da valutare rispetto a MFA e identità già memorizzate |
| `SQL_DATABASE_PASSWORD`, `REDIS_PASSWORD` | Nest e relativo server, con nomi/adattatori appropriati | Stessi materiali coerenti tra client/server; ambienti separati |
| Master key server Meilisearch | Solo Meilisearch shared | Disponibilità a ogni avvio; custodia permanente sull'host |
| API key search/log e key amministrativa temporanea | Client specifici del relativo ambiente / operatore | Distinte dalla master key; separare azioni e indici come nel piano Meilisearch |
| SMTP, Twilio, OAuth, Dropbox, Turnstile | Nest dell'ambiente | `CLOUDFLARE_SECRET_KEY` nel Nest è Turnstile, non il token del tunnel; client ID/redirect sono configurazione distinta dai secret |
| Credenziale cloudflared | Solo cloudflared shared | Modalità tunnel e supporto file da verificare sull'immagine scelta prima di fissare flag o variabili |
| Key UI read-only | Browser operativo dell'owner | Nessuna variabile o mount nel viewer, nessuna key compilata nella SPA |

## Proposta: file effimeri per singolo servizio, compatibilità all'interno del container

**Da approvare e implementare separatamente.** Custodia permanente nel password
manager Windows; consegna solo all'avvio della sessione. Directory candidata
`/run/mercurion/<run-id>/{shared,preview,production}/<servizio>` sul guest:
prima di usarla, verificare il filesystem effettivamente volatile. Il nome
`/run` da solo non è un'attestazione; swap, snapshot e dump richiedono review.

Ogni servizio monta solo i propri file in lettura. Permessi e ownership vanno
preparati sul guest rispetto all'UID/GID reale dell'immagine: Nest 10001:10001,
Tox21 10021:10021 osservati nei Dockerfile; gli altri UID sono da verificare.
Con sorgenti file Compose non assumere che `uid`/`gid` nei secrets rimappino la
proprietà del bind mount. La separazione è per mount/container: root del guest
e amministratori Docker restano nel confine fidato, non sono esclusi dai segreti.
[Semantica Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/),
[limiti delle proprietà dei secrets da file](https://docs.docker.com/reference/compose-file/services/#secrets).

Per Nest è disponibile un launcher opt-in che legge file con formato dati
esplicito, valida una lista chiusa di nomi e carica Nest nello stesso processo
Node dopo averne popolato l'ambiente. Preserva i contratti legacy, senza
caricare i valori nella configurazione `environment` del Docker Engine.
Il formato non viene eseguito o valutato come shell: nessun `eval`/sourcing.
Mount, percorsi e nomi sono metadati; contenuti e valori non devono comparire
in argv, Compose renderizzato, `Config.Env` di Docker, log o report.

Questo riduce la persistenza nei metadati Docker, **non** rende invisibile il
materiale nel processo: memoria e `/proc` restano accessibili secondo i privilegi
host. Non promettere cancellazione forense della memoria. Il launcher non è
attivato dal CMD delle immagini: è un entrypoint compilabile separato e non
equivale a supporto `_FILE` nativo. Dettagli e prove in
[NEST-SECRET-FILE-ADAPTER](NEST-SECRET-FILE-ADAPTER.md).

| Server | Candidato compatibile | Verifica ancora necessaria |
| --- | --- | --- |
| PostgreSQL/pgvector | `POSTGRES_PASSWORD_FILE` supportato dall'entrypoint ufficiale | Confermare il digest dell'immagine custom e testare UID/permessi/bootstrap; la variabile di init non cambia da sola password di un database esistente |
| Redis | Config/ACL con materiale effimero montato, non password in argv | Formato, permessi, eventuali riscritture config e coerenza client/server |
| NATS | Config effimera con credenziali separate per ambiente | Prima estendere esplicitamente il client Nest; scelta user/password o token ancora aperta |
| Meilisearch | Config TOML effimera, oppure launcher file → env dentro il container | Capacità del digest scelto, lettura master key e restart; non inventare `MEILI_MASTER_KEY_FILE` |
| Tox21 | Mount pubblico PEM e `JWT_PUBLIC_KEY_PATH` non segreto | Fail bootstrap per PEM mancante/invalido quando richiesto; policy RPC e token Nest coerenti |

Queste sono possibilità progettuali, non immagini con bootstrap già provato.
Riferimenti: [entrypoint ufficiale PostgreSQL](https://github.com/docker-library/postgres/blob/master/docker-entrypoint.sh),
[configurazione Meilisearch](https://www.meilisearch.com/docs/resources/self_hosting/configuration/overview),
[autenticazione NATS](https://docs.nats.io/learn/security/authentication-basics).

## Proposta di trasferimento compatibile con SSH e sudo attuali

Un futuro helper host unico gestirà tre passaggi distinti; non sono implementati:

1. Preparazione guest tramite SSH interattivo e sudo: creare l'area volatile e
   l'inbox privata dell'utente SSH, verificare ownership e spazio. Solo metadati,
   senza valori da immettere nel terminale privilegiato.
2. Trasferimento dei dati tramite una connessione SSH **senza PTY**, su stdin,
   verso un ricevitore non privilegiato con inbox privata. Payload in memoria
   host, niente file permanente o argomento CLI contenente credenziali.
3. Applicazione tramite nuova sessione interattiva sudo: validare lo stesso
   run-id, separare i file per consumer, assegnare permessi, eliminare l'inbox e
   restituire una ricevuta senza contenuti. I file attivi rimangono disponibili.

Passphrase SSH e password sudo restano richieste nel terminale dell'owner;
il flusso dati non condivide stdin con la password sudo. Nessun cambio a
ssh-agent, sudoers o autenticazione è implicito. L'helper privilegiato dovrà
rifiutare symlink/path traversal, percorsi e nomi fuori allowlist, payload
oversize, ambiente mancante, run-id riusati o sostituzioni di materiale attivo.
Non scrive un percorso arbitrario ricevuto dal payload e non lancia comandi
ricevuti dal client. Errori riportati per nome del campo, mai per valore.

L'inbox è transitoria; i file necessari al servizio sono invece conservati
fino alla chiusura operativa della sessione. Un primo smoke si farà con dati
sintetici dopo autorizzazione, prima di considerare materiale reale.

## Ciclo di vita proposto

| Operazione | Regola proposta |
| --- | --- |
| Avvio a freddo VM | Sblocco LUKS e consegna manuale dei materiali; assenza di file blocca il bootstrap, nessun fallback development |
| Crash/restart container nello stesso boot | File attivi conservati; il consumer può rileggerli. Verificare realmente il comportamento del digest/launcher |
| Ricreazione container | Percorsi sorgente ancora presenti e permessi corretti; un precedente mount riuscito non basta |
| Pausa di preview | Conservare il materiale se si vuole riavviare la stessa sessione; shared/production continuano indipendenti |
| Chiusura definitiva della sessione | Fermare prima i consumer interessati, poi rimuovere solo i materiali del run; non eliminare quelli shared ancora usati |
| Reboot guest o perdita dell'area volatile | Nuova consegna dall'host; nessuna ripartenza protetta senza operatore prevista |
| Cambio credenziali | Operazione esplicita per client/server e dati persistenti; niente sostituzione sotto un mount attivo o rotazione JWT a caldo implicita |

Rimuovere immediatamente i file dopo il primo avvio renderebbe non ripetibile
il bootstrap al riavvio. La proprietà desiderata è assenza di una copia
permanente del materiale operativo sulla VM, non assenza dei dati in uso.
I database possono conservare verificatori di password e altri metadati di
autenticazione necessari al loro funzionamento: non si promette assenza di
qualsiasi derivato crittografico dai volumi persistenti.

## Interventi successivi e criteri di prova

| Passo | Risultato richiesto |
| --- | --- |
| 04-A | Approvare ciclo di vita e trasporto; definire formato dati e permessi senza valori reali |
| 04-B | Launcher Nest opt-in implementato e testato su dati sintetici; ricevitore/apply privilegiati e integrazione operativa ancora aperti |
| 04-C | Separazione client Meilisearch implementata/testata localmente; provisioning/grant VM ancora aperti. Auth NATS consumer ancora da risolvere, senza aggirare validatori o allargare privilegi |
| 04-D | Dopo review del gate VM, provare immagini fissate e restart/recreate con dati sintetici, verificando assenza del marker in argv, metadati Docker e log |
| 04-E | Solo dopo esiti precedenti, provisioning operativo e prove JWT/RPC/provider con materiali dell'owner |

Report di accettazione: esiti, codici, ambiente, run-id e identità degli artefatti;
mai valori o hash dei segreti a bassa entropia. Verificare che il cambio di
password file non sia scambiato per migrazione DB, che il Nest non riceva la
master key Meilisearch e che una key con search+write su tutti gli indici non
sostituisca la separazione prevista in [MEILISEARCH-OPERATIONS](MEILISEARCH-OPERATIONS.md).

Nessun KMS, daemon dedicato, alta disponibilità o rotazione coordinata aggiunto.
La proposta mantiene un bootstrap manuale per una sola persona, con limiti
osservabili e senza trasformare il progetto portfolio in un servizio gestito.
