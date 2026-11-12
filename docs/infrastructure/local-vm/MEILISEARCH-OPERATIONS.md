# Meilisearch: indici, credenziali, UI e manutenzione

**Stato, 12 novembre:** server privato recuperato e quattro indici log persistenti
verificati. Due chiavi client dedicate create con successo, validità 90 giorni,
quattro negazioni read-only riuscite e aggiornamento dei soli campi client nel
file privato. Nessun valore stampato. Procedure e ricevute nel
[runbook](RUNBOOK.md#11-operazioni-curl-delloperatore) e nel
[registro](EXECUTION-RECORD.md). La UI non è stata distribuita.

## Istanza e indici

**Una sola istanza server** prevista per le reti `mercurion_stg_search` e
`mercurion_prod_search`. Nel bootstrap oggi eseguito è collegata soltanto alla
rete preview `mercurion_stg_search`; produzione non è avviata. I due backend
non devono condividere per questo la rete dati o il broker NATS.

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

Procedura operativa, resa eseguibile dopo i pilot di rete/segreti. Per la
sequenza completa usare il runbook; i passi 1–4 sotto sono ora verificati:

1. Avviare il server Meilisearch con master key server consegnata dal bootstrap protetto; verificare `/health`.
2. Aprire una sessione SSH dall'host e inoltrare l'API sul loopback Windows `http://127.0.0.1:17700`; **non** pubblicare l'API verso LAN o Cloudflare.
3. Recuperare la chiave amministrativa dal password manager Windows per la sola operazione autorizzata. Non inserire valori reali nella riga di comando, nella cronologia PowerShell, nei file Compose, nei log o nei report.
4. Eseguire richieste `curl` `POST /indexes` per creare `logs_staging`, `security_logs_staging`, `logs_production` e `security_logs_production` con `primaryKey=id`. Verificare il risultato **asincrono** con il task Meilisearch prima di dichiarare completata la creazione.
5. Creare/validare le API key applicative tramite API `/keys` in una sessione amministrativa separata; scegliere azioni, pattern degli indici e scadenze consapevoli. Non confondere master key server e chiave amministrativa delegata.
6. Revocare o disabilitare ogni chiave di bootstrap non più necessaria quando compatibile con il contratto; rimuovere il materiale dalla sessione temporanea e chiudere il tunnel SSH.
7. Registrare **solo** esiti, identificatori non segreti, codici di stato e timestamp nel diario.

La creazione implicita durante `documents.add` esiste nel codice; **la strategia VM richiede la precreazione** per non concedere ordinariamente `indexes.create` ai writer dei log. Verificare che il dispatcher funzioni su indici già presenti con `documents.add` e senza permessi di creazione.

I due script operatore versionati sono
[Invoke-PreviewMeiliLogIndexes.ps1](../../../scripts/infrastructure/Invoke-PreviewMeiliLogIndexes.ps1)
e [Invoke-PreviewMeiliClientKeys.ps1](../../../scripts/infrastructure/Invoke-PreviewMeiliClientKeys.ps1).
Usano `curl.exe --config -`: header via stdin, master raccolta dal password
manager con prompt sicuro, mai negli argomenti o in un nuovo file persistente.
Non pubblicare snippet che mettano la credenziale letterale accanto a `-H`.
La seconda procedura aggiorna soltanto le due chiavi nel file privato del
processo owner, con backup e sostituzione atomica; è stata eseguita con successo il 12 novembre
con credenziali operative. Scelta approvata: `-Expiry 90Days`, senza rinnovo
implicito o grant aggiuntive. I QA opt-in sono disponibili nel repository.

## Chiavi predefinite e chiavi dedicate

Meilisearch genera inizialmente `Default Admin API Key` e `Default Search API Key`.
Le due chiavi dedicate create per Mercurion si aggiungono a quelle predefinite:
non le sostituiscono e lo script non le elimina. La master key server rimane
separata dalle API key e non viene consegnata ai client applicativi.

Mercurion usa `searchKey` sui soli due indici ChEMBL e `logKey` per aggiungere
documenti ai soli log staging. Hanno UID distinti e scadenza di 90 giorni.
Questi vincoli espliciti motivano il provisioning dedicato anziché il riuso
delle due chiavi predefinite. [Specifiche ufficiali Meilisearch](https://specs.meilisearch.dev/specifications/text/0085-api-keys.html).

## Separazione delle API key

- **Search**: `search` e, solo se necessario, `documents.get` / `indexes.get` sui due indici ChEMBL. Nessun diritto di modifica o gestione chiavi.
- **Writer preview**: `documents.add` soltanto su `logs_staging` e `security_logs_staging`, senza scrittura ai ChEMBL o agli indici production.
- **Writer production**: analogo sui due indici production.
- **Viewer UI**: `search`, `documents.get`, `indexes.get`, eventuali `settings.get`/`stats.get` solo se richiesti dalla UI e limitabili nella versione in uso. Nessun `documents.add`, `indexes.create`, `indexes.update`, `indexes.delete`, `keys.*` o wildcard.
- **Operatore curl**: permessi amministrativi circoscritti, utilizzati effimeramente, non nel runtime.

**Prerequisito applicativo implementato, 8 novembre:** il modulo Nest espone due
client distinti. `MEILISEARCH_CLIENT` resta ai servizi molecolari e usa il nome
legacy `MEILISEARCH_MASTER_KEY` (`Meilisearch.masterKey`);
`MEILISEARCH_LOG_CLIENT` è iniettato nel dispatcher outbox e usa
`MEILISEARCH_LOG_KEY` (`Meilisearch.logKey`). Tutte le mutazioni outbox, inclusi
upsert/delete generici, usano il writer; nessuna scrittura passa al client search.
La chiave limitata VM non autorizza delete o mutazioni generiche fuori dai log.
Non risultano produttori applicativi degli upsert/delete generici nel codice
ispezionato; le API esistenti restano disponibili, subordinate ai permessi reali.

Per compatibilità, se `MEILISEARCH_LOG_KEY` è omessa il secondo client riusa la
chiave legacy, in tutti gli ambienti. Un valore esplicitamente vuoto è invalido;
una chiave configurata ma rifiutata dal server non provoca fallback. La
configurazione VM deve fornire entrambe le credenziali ristrette: il fallback
non dimostra separazione dei privilegi e Nest non verifica le grant al bootstrap.
L'[adattatore da file](NEST-SECRET-FILE-ADAPTER.md) accetta il nuovo nome tramite
lo schema canonico. Nessuna master key del server va fornita ai client.

### Verifica locale dei permessi

```powershell
node scripts/smoke-meili-client-permissions.mjs
```

Prova su Docker Desktop `desktop-linux`, con le sole immagini locali fissate per
digest: Meilisearch `sha256:8cd411ba5d9ec2dfce02e241305208eebacce0fd74a72bece21cadd03dc566ce`
e Node `sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202`.
Nessun pull, porta host o volume persistente; rete interna e due container non-root
temporanei, rimossi con ownership per run-id. Solo dati e credenziali sintetici,
creati nell'istanza della prova. Non contatta il server personale o la VM.
L'indicizzatore è limitato esplicitamente a 64 MB e un thread: il default del
digest vede la memoria host, superiore al limite del container.

Esito 8 novembre: **8 letture molecolari, 8 scritture/replay dei log e 40 rifiuti
HTTP 403 `invalid_api_key`** verificati. Le chiavi search hanno `search` e
`documents.get` sui due ChEMBL; i writer soltanto `documents.add` sui due indici
del proprio ambiente, precreati dal client amministrativo sintetico. Verificati
divieti di scrittura ChEMBL, accesso ai log con search, lettura/delete con writer,
gestione chiavi/creazione indici e accesso all'altro ambiente. Un errore di rete o
un task fallito non è contato come negazione di autorizzazione. I task di scrittura
sono attesi dal client amministrativo della prova, non dal writer limitato.
La [specifica delle API key](https://specs.meilisearch.dev/specifications/text/0085-api-keys.html)
definisce separatamente azioni e indici; la prova verifica il digest locale.

Test Nest con container DI reale verificano credenziali distinte e instradamento
di tutti e quattro i tipi di mutazione outbox al writer, con SDK simulato per
le chiamate. Test di configurazione coprono override/fallback nei quattro
ambienti e rifiuto del valore vuoto. Queste prove non sono un bootstrap Nest
completo né accettazione VM: provisioning, manifest operativi e grant reali
rimangono aperti (VM-020).

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
