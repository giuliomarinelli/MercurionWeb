# Meilisearch: indici, credenziali, UI e manutenzione

**Stato:** contratto applicativo dei log implementato nel branch; procedure VM ancora progettuali.

## Istanza e indici

**Una sola istanza server**, collegata alle reti `mercurion_stg_search` e `mercurion_prod_search`. I due backend non condividono per questo la rete dati o il broker NATS.

| Categoria | Indici runtime |
| --- | --- |
| ChEMBL condiviso | `molecule_previews_chembl_36`, `molecule_details_chembl_36` |
| Log di sistema preview | `logs_staging` |
| Audit di sicurezza preview | `security_logs_staging` |
| Log di sistema production | `logs_production` |
| Audit di sicurezza production | `security_logs_production` |
| Solo sviluppo/test locale | `logs_development`, `security_logs_development`, `logs_test`, `security_logs_test` |

Il nome `preview` del deployment corrisponde a `APP_ENV=staging`. I servizi `MeiliLoggerService` e `SecurityAuditService` acquisiscono da `Meilisearch.logIndexes` il nome indicizzato; il dispatcher outbox mantiene la destinazione registrata al momento dell'evento anche nei retry. Vedere [la correzione integrata](../../meilisearch-log-indices.md).

Gli indici `logs` e `security_logs` storici non vengono eliminati o migrati implicitamente. Nuove installazioni VM devono creare i quattro indici runtime prima di usare le API key applicative.

## Precreazione degli indici: solo curl amministrativo

**Decisione dell'owner:** non creare indici via UI, script automatici con master key persistente o bootstrap applicativo. L'operatore usa `curl` su una sessione amministrativa protetta, con una chiave a privilegi elevati **limitata allo stretto necessario** e custodita nel password manager Windows.

Procedura progettata, da rendere eseguibile solo dopo i test di rete/segreti:

1. Avviare il server Meilisearch con master key server consegnata dal bootstrap protetto; verificare `/health`.
2. Aprire una sessione SSH dall'host e inoltrare l'API sul loopback Windows `http://127.0.0.1:17700`; **non** pubblicare l'API verso LAN o Cloudflare.
3. Recuperare la chiave amministrativa dal password manager Windows per la sola operazione autorizzata. Non inserire valori reali nella riga di comando, nella cronologia PowerShell, nei file Compose, nei log o nei report.
4. Eseguire richieste `curl` `POST /indexes` per creare `logs_staging`, `security_logs_staging`, `logs_production` e `security_logs_production` con `primaryKey=id`. Verificare il risultato **asincrono** con il task Meilisearch prima di dichiarare completata la creazione.
5. Creare/validare le API key applicative tramite API `/keys` in una sessione amministrativa separata; scegliere azioni, pattern degli indici e scadenze consapevoli. Non confondere master key server e chiave amministrativa delegata.
6. Revocare o disabilitare ogni chiave di bootstrap non più necessaria quando compatibile con il contratto; rimuovere il materiale dalla sessione temporanea e chiudere il tunnel SSH.
7. Registrare **solo** esiti, identificatori non segreti, codici di stato e timestamp nel diario.

La creazione implicita durante `documents.add` esiste nel codice; **la strategia VM richiede la precreazione** per non concedere ordinariamente `indexes.create` ai writer dei log. Verificare che il dispatcher funzioni su indici già presenti con `documents.add` e senza permessi di creazione.

Le chiamate `curl` definitive dovranno usare un meccanismo di consegna dell'header che **non esponga il bearer token negli argomenti del processo** e non lo lasci nella cronologia shell. Non pubblicare snippet che invitino a scrivere la credenziale in chiaro accanto a `-H`.

## Separazione delle API key

- **Search**: `search` e, solo se necessario, `documents.get` / `indexes.get` sui due indici ChEMBL. Nessun diritto di modifica o gestione chiavi.
- **Writer preview**: `documents.add` soltanto su `logs_staging` e `security_logs_staging`, senza scrittura ai ChEMBL o agli indici production.
- **Writer production**: analogo sui due indici production.
- **Viewer UI**: `search`, `documents.get`, `indexes.get`, eventuali `settings.get`/`stats.get` solo se richiesti dalla UI e limitabili nella versione in uso. Nessun `documents.add`, `indexes.create`, `indexes.update`, `indexes.delete`, `keys.*` o wildcard.
- **Operatore curl**: permessi amministrativi circoscritti, utilizzati effimeramente, non nel runtime.

**Lacuna da validare:** il modulo Nest attuale usa un client Meilisearch comune e la variabile legacy `MEILISEARCH_MASTER_KEY`. Il nome può restare invariato, ma non basta a separare le azioni `search` e `documents.add`: una sola key con entrambe le azioni su tutti gli indici potrebbe scrivere anche ChEMBL. Se le API richieste lo impongono, introdurre due client o due credenziali distinte con un task applicativo minimo e test; **mai risolvere concedendo privilegi eccessivi**.

## UI eyeix/meilisearch-ui

L'utente richiede questo servizio **solo via SSH e con API key di sola lettura**. La UI è una SPA: il JavaScript del browser contatta direttamente Meilisearch. La modalità `SINGLETON_MODE` con `SINGLETON_API_KEY` non va utilizzata, perché incorpora dati di connessione nel client; la variante `lite` senza singleton è sufficiente per consultazione e riduce il peso dell'immagine.

**Candidato al 7 novembre 2026:** `eyeix/meilisearch-ui:v0.15.3-lite`, manifest `linux/amd64` `sha256:5666932bab3db63552cd81537896d18f7fc5323c7afd7639d6d091f2e8306e92` (indice multi-arch `sha256:f843d5406571cbcee7f985b02ca3f267ba9a7f65b2312bc2e6f0dbedf843bffd`). **Non approvato:** manca scansione CVE reale. Non inserirlo come immagine attiva nel Compose prima del gate seguente.

Gate di approvazione dell'immagine:
1. Risolvere tag e digest dal registry, verificare architettura `linux/amd64` e fonte.
2. Scansionare l'immagine **esatta** con uno scanner aggiornato (per esempio Trivy), registrando versione dello scanner, data e DB vulnerabilità. L'owner chiede **assenza di vulnerabilità rilevate**, non soltanto assenza di CRITICAL: qualsiasi finding conosciuto va sottoposto a valutazione prima del via libera. Scanner privo di risultati non equivale a garanzia assoluta di assenza di falle, in particolare nel JavaScript bundle.
3. Se il gate passa, usare `eyeix/meilisearch-ui@sha256:<digest-verificato>` con annotazione della versione verificata; no `latest` mobile.
4. Testare un container effimero in rete privata, non-root se supportato, filesystem read-only se compatibile, nessun segreto e nessun collegamento al Docker socket.
5. Verificare accesso da Windows solo con SSH, origine browser `http://127.0.0.1:24900`, URL API `http://127.0.0.1:17700`, CORS e permessi di sola lettura; la UI non deve raggiungere la produzione per un percorso esterno non previsto.

**Attenzione al browser:** il progetto dichiara che le connessioni vengono conservate nel browser. Usare un profilo separato e non memorizzare la chiave amministrativa. Chiudere la sessione/profilo secondo la policy di manutenzione.

Fonti pubbliche: https://github.com/eyeix/meilisearch-ui ; https://hub.docker.com/r/eyeix/meilisearch-ui/tags

## Dati ChEMBL e recovery

`MercurionData` resta locale. Definire un formato supportato per esportare e importare gli indici molecolari su una versione Meilisearch compatibile, verificare struttura, checksum, volumi e risultati di ricerca. Non copiare la directory di dati da un'istanza accesa senza una procedura supportata. Dopo importazione, la UI e i backend avranno soltanto i privilegi necessari.

Meilisearch è anche destinazione di log/audit applicativi, non registro forense immutabile. Prevedere politiche proporzionate di conservazione/backup, senza attribuire garanzie di durabilità o retention automatica che non sono state implementate.
