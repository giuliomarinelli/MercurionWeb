# Ricreare lo schema applicativo preview preservando gli embedding

## Cosa fa e cosa conserva

Questa procedura risolve il bootstrap incompleto da metadati TypeORM usando il
**DDL reale esportato da PostgreSQL sviluppo**, non uno schema ricostruito dalle
entity. È uno script SQL di provisioning esplicito, non un sistema di migration.

Perimetro approvato il 13 novembre 2026:

- ricreare 33 tabelle applicative con default, identity/sequenze, vincoli,
  indici, cinque funzioni trigger e relativi trigger;
- usare il DDL di sviluppo, conservando anche `storage_operations` dello schema
  preview perché richiesta dal codice corrente;
- escludere `lab_notebooks_old` e `typeorm_migrations`;
- **non eliminare, ricreare, troncare o indicizzare molecule_embeddings**;
  conservare tutti i suoi dati, PK, indice univoco e HNSW esistenti;
- lasciare intatto anche lo schema operativo `mercurion_ops`;
- creare `pg_trgm` in public se assente, necessario agli indici del DDL sviluppo;
  non aggiornare pgvector o la versione del server.

Il database rimane `mercurion_preview`; il ruolo rimane `mercurion_preview`.
`SET LOCAL ROLE mercurion_preview` conserva la proprietà applicativa dei nuovi
oggetti anche se il collegamento pgAdmin è amministrativo. Nessuna rinomina o
modifica di password. Gli export non contengono dati o credenziali.

**Distruttivo per le altre tabelle:** i loro dati vengono eliminati. La guardia
rifiuta il reset se `users` contiene anche un solo utente. Eventuali righe in
altre tabelle applicative (tentativi OAuth, reference data ecc.) vengono invece
eliminate secondo il reset autorizzato. Non usare per una preview già popolata
con dati da conservare.

## File e provenienza

| File | Uso |
| --- | --- |
| `development-schema.pg_dump.sql` | fonte dev originale: pg_sl / mercurion / PostgreSQL 16.10, schema-only, embedding esclusi |
| `preview-schema-before-rebuild-20261113.sql` | fotografia schema remoto PostgreSQL 16.16, acquisita prima del reset |
| `schema-comparison.json` | confronto iniziale, non prova di equivalenza semantica di tutti i cast |
| `rebuild-manifest.json` | elenco esatto delle 33 tabelle e SHA-256 dei due export |
| `10_create_application.sql` | DDL di creazione di riferimento; non è il reset da lanciare sulla preview |
| **`20_rebuild_preview_application.sql`** | **unico file completo da eseguire per il reset in pgAdmin** |
| `30_seed_countries.sql` | opzionale: 250 record countries del dataset già nel repository |
| `90_verify_application.sql` | sole letture di verifica dopo il reset |

I default users.created_at/updated_at nel dump remoto sono già presenti perché
l'operatore li aveva corretti manualmente. Il reset ricrea comunque il DDL
concordato, inclusi gli altri default mancanti. Non eseguire direttamente i dump
originali: contengono anche CREATE SCHEMA e metacomandi psql non adatti a pgAdmin.

## 1. Fermare chi scrive

VM accesa, LUKS sbloccato, PostgreSQL attivo e tunnel 15432 già aperto.
In VS Code: riprendere un eventuale processo in pausa, poi disconnettere il
debugger. Non avviare contemporaneamente un rollout o un nuovo bootstrap.

**Shell Ubuntu**:

```bash
sudo docker stop mercurion-preview-web-node-preview-1 mercurion-preview-tox21-preview-1
```

Nginx/Angular/cloudflared e i server dati restano attivi. Durante la pausa le
richieste API possono rispondere 502: è previsto finché Nest è fermo.
I nomi indicano i container applicativi correnti, non i vecchi server di rollback.

Prima del reset eseguire in pgAdmin `05_check_open_transactions.sql` (sola
lettura). Le transazioni aperte e i lock sulle tabelle public vanno identificati
prima di proseguire. Un backend in pausa nel debugger può mantenerli anche senza
un breakpoint visibile nel codice applicativo; altri Query Tool possono avere
transazioni aperte. Non terminare sessioni alla cieca. Se il reset riporta
`lock timeout` / SQLSTATE 55P03, eseguire ROLLBACK e questa lettura: non aumentare
il timeout o ripetere il reset prima di aver risolto la contesa.

## 2. Eseguire il reset in pgAdmin

1. Collegarsi tramite il tunnel a `127.0.0.1:15432`, database
   **mercurion_preview**, con le credenziali già utilizzate. Non usare dev.
2. Aprire un nuovo Query Tool su quel database, **Auto-commit attivo** e nessuna
   transazione precedente lasciata aperta. Chiudere altri Query Tool con lock o
   modifiche non confermate sulle tabelle interessate.
3. File → Open: aprire
   `C:\.project_repo\MercurionWeb\MercurionWebNode\sql\bootstrap\application\20_rebuild_preview_application.sql`.
4. Rimuovere eventuali selezioni parziali ed eseguire **il file intero**.
5. Attendere il risultato finale:
   `APPLICATION_SCHEMA_REBUILT_EMBEDDINGS_PRESERVED`.

Il file comprende BEGIN/COMMIT: controlli e DDL sono in una sola transazione.
Non usa DROP SCHEMA o DROP CASCADE. Una dipendenza esterna inattesa, una tabella
non prevista o un lock oltre cinque secondi interrompono l'operazione.
Prima del COMMIT confronta OID e file fisici di tabella/indici embeddings,
definizioni e flag degli indici: non scansiona i 2,6 milioni di embedding e non
ricostruisce HNSW. I NOTICE «does not exist, skipping» per oggetti presenti solo
in sviluppo sono previsti, non equivalgono a errori.

**Se compare un ERROR:** non riavviare le applicazioni né rilanciare lo script.
Eseguire nello stesso Query Tool soltanto:

```sql
ROLLBACK;
```

Conservare il primo errore. Il reset non deve essere spezzato eseguendo singoli
DROP/CREATE fuori dalla transazione. Un errore prima del COMMIT conserva il
vecchio schema; non dichiarare successo senza la ricevuta finale.

## 3. Reference data countries e controlli

Dopo il COMMIT, aprire ed eseguire `90_verify_application.sql`.
Attesi 33 per `tabelle_applicative`, default dei timestamp utenti presenti,
indici embeddings ancora validi/pronti e stessa dimensione HNSW osservata prima.
La dimensione visualizzata non è da sola un controllo di integrità: il confronto
OID/file/definizioni è già stato eseguito dentro la transazione.

Le tabelle appena create sono vuote. Per ripristinare il selettore dei Paesi,
è disponibile **separatamente** `30_seed_countries.sql`, ricavato dai 250 INSERT
in `MercurionWebNode/sql/countries.pg.sql`. Non usa dati utente. Eseguirlo per
intero solo se si vuole caricare quel dataset: rifiuta una countries non vuota,
poi allinea la sequenza identity. Non eseguire il vecchio countries.pg.sql dopo
il reset perché contiene anche CREATE TABLE.

## 4. Riavviare e riprovare

**Shell Ubuntu**, solo dopo reset e verifiche riusciti:

```bash
sudo docker start mercurion-preview-tox21-preview-1 mercurion-preview-web-node-preview-1
```

Riprovarе registrazione e SSO ORCID. Questo corregge lo schema, non dimostra da
solo che qualunque errore frontend sia risolto. Se il backend era avviato in
modalità debug, tale modalità rimane: il tool non cambia il comando del container.
Nessun reset dei segreti è necessario se la VM non è stata riavviata.

## Collaudo locale eseguito e riproducibilità

Il collaudo usa un container Docker locale **disponibile**, PostgreSQL 16.16 con
pgvector, rete disabilitata, nessuna porta o volume del progetto montato. Importa
il dump remoto in un database usa-e-getta e aggiunge 17 embedding sintetici.
Verifica rifiuto di utenti/tabelle inattese/dipendenze esterne, rollback integro,
conservazione dati/OID/file degli indici embeddings, inserimento SSO senza
fornire timestamp e uguaglianza di colonne/default/constraint/indici/trigger/
funzioni/sequenze con il DDL approvato. Anche il seed countries è stato provato.
Non è un collaudo della VM né un test prestazionale su milioni di vettori.

Per rigenerare i file dal medesimo paio di export pubblici (**PowerShell Windows,
root repository**, nessuna connessione DB):

```powershell
python -B scripts/infrastructure/build_application_rebuild.py
```

Il generatore è opzionale per l'amministratore: il file 20 contiene tutto il SQL
e si legge/esegue direttamente in pgAdmin senza Python o AI. Prima di usare un
nuovo export occorre rivedere il manifest; il contratto delle 33 tabelle blocca
variazioni non revisionate.
