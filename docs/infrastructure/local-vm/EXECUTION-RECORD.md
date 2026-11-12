# Registro riproducibile e punto di arresto — 11 novembre 2026

Questo registro integra il [runbook](RUNBOOK.md). Non contiene segreti e non
richiede accesso alla chat o alla cartella privata dell'autore. Le prove locali
non sono promosse a prove VM; una procedura pronta non viene marcata eseguita.

## Milestone osservate

### 12 novembre — preparazione applicazioni VM-045 (solo evidenza locale)

Export aggiornati dei quattro componenti applicativi con SBOM, audit runtime,
roundtrip load/save e zero vulnerabilità secondo policy strict. Tox21 parent
aveva quattro finding della stessa CVE glibc: export fallito conservato;
derivazione OS `2.44-r16` riuscita, senza modificare codice/modello/soglie.

Collaudo locale sintetico `80d9fe5be9a145b5acb98bd840f60ac6` passato:
schema vuoto, confronto compatibile, rifiuto di drift reale senza scritture,
cinque RPC Tox21, backend e SPA attraverso Nginx, roundtrip AES. Sette controlli,
nessun errore di cleanup. Ricevuta pubblica sotto
`.codex/artifacts/inf-vm-04/vm045-applications/final-application-qa.json`.
Fixture Linux tmpfs separate: due controlli su ricezione/UID/permessi/riuso e
copie pubbliche Windows passati. Procedura: [APPLICATION-BOOTSTRAP.md](APPLICATION-BOOTSTRAP.md).
**Nessuna prova del nuovo bootstrap sulla VM ancora eseguita.**

Il successivo tentativo owner VM-045 ha restituito l'errore generico prima di
qualsiasi fase. Verificati il piano pubblico valido e l'assenza di
`execution-state.json`: nessun trasporto SSH o avvio VM eseguito dal launcher.
Diagnosi della configurazione locale demandata al solo terminale owner; il
file privato non è stato letto dall'agente. Aggiunta diagnostica esplicita e
sanitizzata del rifiuto locale, con test di arresto prima di stato e trasporto.
La validazione owner ha poi segnalato `EMAIL_SMTP_PORT` e `EMAIL_SMTP_SECURE`
come mancanti benché presenti: il vecchio validatore richiedeva esclusivamente
stringhe. Corretto per accettare numero e booleano JSON nativi e serializzarli
solo al confine delle variabili d'ambiente. Il file privato resta invariato;
`false` non è un campo mancante. Test sintetici coprono anche il payload
consumer, la mancata mutazione del file e i tipi realmente invalidi.

Prima CI della preparazione, run `43227246601`, bloccata dal secret scanner:
una fixture negativa conteneva la sola intestazione PEM privata, senza chiave.
La fixture ora usa un valore non-PEM; nessuna esclusione o regola di scansione
è stata modificata. Gate supply-chain locale completo successivo passato:
2176 componenti, zero vulnerabilità a ogni severità. Occorre comunque la CI
completa sul nuovo SHA corretto prima dell'esecuzione owner.

| Fase | Evidenza | Cosa dimostra / limite |
| --- | --- | --- |
| Host/guest iniziali | Ubuntu 26.04.1, Engine 29.9.3, Compose 5.7.0; Gen2 8 vCPU/16 GiB, root LUKS | Inventari operatore, non replica dell'installer originale |
| Rete statica | host 10.203.240.1/24, guest .10/24, Internal e Mercurion-NAT; 19 ACL DnsHttps | Configurazione persistita anche dopo reboot host e guest; profili Windows/Kaspersky Public |
| Egress post-reboot | run `c149b357dc5040038b4a26682309dbd0` | DNS/HTTPS da guest e due bridge, non tutti i provider |
| Nove porte private post-reboot | run `32b00ebc17a246b881b95fff19c13dc3` | 9 casi non raggiungibili, 81 controlli host; non tutta la LAN |
| LAN Android | run `2e5b54bfac1a4ff782f7cd33891ae49f` | Tre TCP guest/due bridge non raggiungibili, 18 controlli Windows→telefono, chiusura Android confermata |
| Android→SSH | run `0552d34e8d924b28a98790cc7c10721b` | TCP non connesso; route verso Internal non dimostrata, H-05 parziale |
| Fixture VM IPv4-only | run `2bcdfd57a75c4b2a979d2d2503351f5f` | 13 readback reti IPv4-only, 33 casi passed, cleanup; non filtraggio IPv6 completo |
| Consegna sintetica/retirement | `dfc1af5a416f4b1abc6e8dab99034dbb` | Sei fasi poi retirement; nessun servizio reale |
| Consumer mount sintetico | `af0b6eb4637940eb814acfd380e27f26` | Sei check, restart/recreate, cleanup e retired |
| Pilot RPC VM-041 | `715f719bb1b14a4b87fb1c42e1a54647` | Tox21/NATS reali, tre lifecycle, nove negazioni NATS, cleanup; requester Python, nessun Nest |
| Candidato VM-042 | Web d227dbf4, Tox21 d506101, otto immagini strict | Export host verificato; CI non pubblica tutti i tar distribuibili |
| Bootstrap VM-043 | `6c3e72e2e4064b71bd3bbffcff4d629c` | Quattro server attivi, quattro readiness vere, zero porte pubblicate, applicazioni ferme |
| Curl VM-044 indici | task 0, 1, 2, 3; `LOG_INDEXES_READY` | Quattro indici con primaryKey id riletti; nessuna API key creata |
| Curl VM-044 chiavi | **NON ESEGUITO** | Procedura preparata/QA locale; validità 90 giorni scelta dall'operatore, rinviata |

## Revisioni e CI sorgente

| Componente | SHA | CI esatta |
| --- | --- | --- |
| Immagini Web e ricette server | `d227dbf4216ce2ceb865a9b315ae52169c9e8c6e` | [42995928107, attempt 2, full success](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/42995928107) |
| Tox21 | `d506101ec27c985ef4ddb280266bfcdc4b6bf1c4` | [42858304379 success](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42858304379) |
| Strumenti bootstrap iniziale | `5a7688caa1e1dd2e028aa1224811de4c338970b0` | [43006073115 full success](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/43006073115) |
| Correzione SCP/ripresa | `ca14b03d8a52e9725bab3ad9b715615b5795bdab` | [43012518785 full success, Required gate success](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/43012518785) |

Il primo attempt della CI immagini ebbe un errore GitHub FinalizeArtifact
ECONNRESET: fu ripetuto il job fallito senza modificare codice. La distinzione
fra revisione strumenti e revisione immagini evita di ricostruire otto immagini
solo per un cambiamento della documentazione o del trasporto.

## Immagini realmente caricate nel guest per VM-043

| Ruolo | Config digest OCI | Image ID sul guest |
| --- | --- | --- |
| PostgreSQL | `sha256:89b92c0c9812fef73f674ada1017c8a8c5766968b13bdf6560311f1bf2dd811a` | `sha256:1f228cd64f4ef0b2117f846833b2e167256a2b9cd3a43102e2b0d009019e9358` |
| Redis | `sha256:64d06d6b90610b2c8b5ed542cd55d8856a307317bd57d0563075c79328642f79` | `sha256:a3f9074b57a1c04dda5a735e46560499b0f6edaea86707bffedf5a11145c6a2d` |
| Meilisearch | `sha256:5f293573a4b3ba49fcd88545f22739db67ce7cd6ba25ac01a22ee89606fdb91c` | `sha256:9f83136051c0a11331e8d1d6e950adcaf426e0f5f27e1344f7294cd60730f58e` |
| NATS | `sha256:2523173dcd72c12fea4470cb7ca961f96d0ecbf5b7c269681893ccde9d23eb17` | `sha256:ca1d4783151aab46ae6b4e0d62d9bab3614fffc8b2dc1e557bac27b4490163df` |

Tutti i roundtrip load/save sono true. Ricevuta guest osservata alle
`2026-11-11T11:41:54.565245+00:00`. I quattro check:
`postgresRoleAndVector`, `redisAuthAndKeyevents`, `natsAuthRequired`,
`meilisearchHealthAndAdminAuth`, tutti true. Server in quattro container;
Meili sul privato `172.18.0.2`, non un IP pubblico né un contratto statico futuro.

## Stato dei file e dei percorsi attuali

- Release guest protetta:
  `/opt/mercurion/releases/server-6c3e72e2e4064b71bd3bbffcff4d629c`.
- Materiali attivi volatili:
  `/run/mercurion-preview/6c3e72e2e4064b71bd3bbffcff4d629c/active`.
- Bundle pubblico host storico:
  `%USERPROFILE%/.codex/artifacts/inf-vm-04/vm043-servers-ready`.
- Ricevute pubbliche host in `receipts/preflight-result.json` e
  `receipts/bootstrap-result.json` sotto quel bundle.
- Configurazione privata stabile dell'operatore:
  `%USERPROFILE%/.mercurion/preview/configuration.json`; creata, AES corretto e
  provider compilati confermati. Non leggerla da una sessione agente. Le chiavi
  client sono ancora da creare, non dichiarate valide in base a un file aperto.

Il primo tentativo VM-043 si era fermato sul mode del manifest ricevuto da SCP,
prima del load e della consegna dei segreti. Correzione verificata localmente
con file 0644/0664/0666 e directory 0755/0775/0777; hash errati, symlink, owner
errato e destinazione protetta insicura respinti. Ripresa esplicita una tantum
con `-ResumePublicCopy`: nessun ritrasferimento di immagini, esito VM passed.
Non è autorizzazione a ripetere il bootstrap o la ripresa oggi.

## Quattro indici Meilisearch conclusi

L'operatore ha verificato prima `ADMIN_AUTH_OK; indexCount=0`, usando curl con
header su stdin. Poi ha eseguito il blocco ora versionato come
`Invoke-PreviewMeiliLogIndexes.ps1`. Ricevuta finale:

```json
{
  "status": "LOG_INDEXES_READY",
  "apiKeysCreated": false,
  "count": 4,
  "indexes": [
    {"uid":"logs_staging","primaryKey":"id","taskUid":0,"status":"ready"},
    {"uid":"security_logs_staging","primaryKey":"id","taskUid":1,"status":"ready"},
    {"uid":"logs_production","primaryKey":"id","taskUid":2,"status":"ready"},
    {"uid":"security_logs_production","primaryKey":"id","taskUid":3,"status":"ready"}
  ]
}
```

La creazione è asincrona: non è stato equiparato un POST accettato a un task
riuscito. I quattro indici non provano scritture del dispatcher Nest, grant
applicative o import ChEMBL. Non sono stati creati indici molecolari con un
primary key inventato.

## Collaudi locali delle procedure curl, distinti dalla VM

- Indici: cinque controlli, stessa immagine Meili, PowerShell 5.1/curl reali;
  creazione/task/readback, riuso senza mutazione, credenziale errata,
  credenziale malformata e primary key inattesa. Cleanup senza errori.
- Chiavi: nove controlli; grant e operazioni realmente ammesse/negate,
  aggiornamento atomico dei soli due campi, backup esatto, ACL, errori e blocco
  del riuso/rotazione. Provate entrambe le policy di expiry; quella scelta
  per l'esecuzione reale è 90Days. Nessuna configurazione privata dell'operatore
  letta durante il QA. Cleanup senza errori.

I due driver opt-in sono nel repository e possono essere ripetuti con
immagini locali già verificate; i report originali esterni non sono un input
necessario alla procedura. Le procedure curl originarie erano file pubblici
negli artifact del profilo; le copie versionate rimuovono questa dipendenza.

## Prossima azione autorizzata, ma rinviata

Pausa esplicita dell'operatore per il resto della giornata. Nessun comando
privato, accesso VM, modifica di rete o avvio di servizi aggiuntivi deve essere
eseguito da un agente durante questa pausa. Il lavoro documentale e di
conservazione dei sorgenti resta separato.

Il giorno successivo: seguire [RUNBOOK.md, sezione 12](RUNBOOK.md#12-punto-di-ripresa-concordato-per-il-giorno-successivo),
riaprire soltanto il forward SSH se necessario e usare il comando chiavi
versionato con `-Expiry 90Days`. Se la VM ha perso tmpfs, fermarsi al limite
di recovery documentato. Non marcare questa fase eseguita prima della ricevuta.

H-05/A-05/A-30, cold recovery, grant reali delle nuove chiavi, applicazioni,
dati, provider e accesso pubblico restano aperti. Nessun merge effettuato.


## 12 novembre — inventario dopo riavvio e preparazione del recupero

Owner conferma spegnimento/riavvio. Inventario eseguito con successo sul run
originale `6c3e72e2e4064b71bd3bbffcff4d629c`, inspectionId
`8606c6dead7f4b32976e15371f840a5f`, ore `2026-11-12T10:33:28Z`:
quattro ID originali fermi, tre volumi con label originali, tmpfs vuoto,
`coldRecoveryCandidate=true`, nessun avvio o lettura di credenziali. Report
locale nella cartella `receipts` del bundle originale.

Cold recovery ora predisposto, non ancora eseguito sulla VM. Piano verificato
su PowerShell 5.1 senza SSH né file privato; confronto con ricevute/mount reali
riuscito. Test locali Windows/Linux, loader root e sostituzione inode del bind
verificati in fixture isolate. Fixture con immagini reali dei tre server:
run `80e9a54a0711475686d17a9cd1463b40`, passed, persistenceMarkers true,
zero errori cleanup. Queste sono prove locali sintetiche, non una ripartenza
VM già riuscita. [Procedura completa](COLD-RECOVERY.md).


## 12 novembre — server riavviati, verifica finale da completare

Tentativo owner `1250bedb66bb4415be4dea909207077e`: prepare e ricezione
conclusi, quattro container originali avviati, nessuna applicazione o porta
pubblicata. Activate termina con `server-readiness-timeout`; la ricevuta
elenca tutti e quattro gli ID ancora attivi ma non conserva il controllo
specifico fallito. Non è un recupero verificato e non va ripetuto da zero.

Riprodotto localmente l'errore del probe CONNECT NATS (`password` anziché
`pass`); corretto e verificato sul broker reale con due utenti e rifiuto di
password errata. Aggiunti esiti incrementali e diagnostica sanitizzata per
ogni controllo. Predisposta modalità `-VerifyAttemptId` senza lettura del
file privato host, riconsegna/applicazione di segreti o avvio container;
esito VM ancora atteso. [Ripresa circoscritta](COLD-RECOVERY.md#44-verificare-un-tentativo-che-ha-già-avviato-i-server).


## 12 novembre — ripartenza dei server confermata

Verifica owner `d2cfff6e2a204c27ac3362f4d9e59fbf`, collegata al tentativo
`1250bedb66bb4415be4dea909207077e`, osservata alle `2026-11-12T12:17:58Z`:
status passed e sei controlli true (PostgreSQL/vector, Redis auth/keyevents,
NATS anonimo negato, due consumer NATS autenticati, Meili health/admin protetta,
quattro indici log persistenti). Gli stessi quattro container e tre volumi
sono presenti e i server sono attivi; indirizzo Meili `172.18.0.2`.

Questa seconda operazione non ha avviato server, modificato risorse o letto
il file privato host. Ha concluso la verifica della ripartenza già eseguita;
non è un secondo avvio completo. La ricevuta fallita iniziale è conservata.
Helper pubblici del tentativo/verifica rimossi. Residui rete invariati,
applicazioni ancora ferme. Prossimo passo: tunnel SSH e chiavi client Meili
con scadenza 90 giorni, poi bootstrap applicativo privato.


## 12 novembre — chiavi client Meilisearch create

Ricevuta owner `MEILI_CLIENT_KEYS_READY`: keyCount 2, UID search
`6d3c5a97-a1be-5e5d-b595-b006d557b090`, UID writer
`16dbd72a-9663-542f-9220-63122b77a750`, expiryPolicy 90Days,
readOnly403Checks 4, otherFieldsChanged false, valuesPrinted false.
Backup privato `.pre-meili-keys.backup` conservato dall'operatore. Nessun
valore di chiave letto o riportato in questo registro. Le due API key default
restano distinte dalle due dedicate. Prossimo passo: bootstrap applicativo
privato; la sua validazione deve includere il file host completo, senza
richiederne la pubblicazione o la lettura da parte dell'agente.
