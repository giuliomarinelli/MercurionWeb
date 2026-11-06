# T21-02 — Configurazione, bootstrap e lifecycle

**6 novembre 2026 — implementazione completata con verifiche locali mirate.** Seguito della [roadmap](tox21-container-roadmap.md) e dei [vincoli T21-00](tox21-design-test-inventory.md). Il codice è nel repository Tox21 sul branch `feature/T21-02`, derivato dalla documentazione `docs/T21-01`; gli aggiornamenti Web sono su `docs/tox21-container-roadmap`. Nessun merge o aggiornamento dei servizi in esecuzione.

**Seguito:** [T21-03 completato su Linux CPU](tox21-model-package-qa.md), con pacchetto coerente selezionabile tramite `MODEL_PACKAGE_DIR`, lock separati e ulteriori test. Il seguito copre parte dei residui citati sotto; questo verbale conserva esiti e limiti della fase T21-02.

Consegna Tox21: sorgenti nel commit `884e74fccd78dd8bb7cdcf8847b29c06551d709d`; HEAD con documentazione aggiornata `63b06943763dffb1766048f3762e449713973669`, entrambi pubblicati senza firma GPG. [Contratto runtime nel repository Tox21](https://github.com/giuliomarinelli/MercurionTox21/blob/63b06943763dffb1766048f3762e449713973669/docs/runtime-contract.md). Le verifiche locali riguardano questo sorgente; i due commit successivi modificano soltanto il verbale e il README.

## Perimetro concordato

Mercurion è un portfolio case study mantenuto da una persona con assistenza AI. Il risultato utile di questo intervento è un contratto runtime comprensibile, verificabile e sufficientemente robusto per dimostrare competenze applicate. Non si introduce un’infrastruttura di gestione delle chiavi solo per ampliare la dimostrazione.

- Auth Tox21 **tutto o nulla**, tramite `GLOBAL_SKIP_AUTH_FLAG`; default pubblico interno conservato. Nessuna modifica all’autenticazione degli utenti Web.
- Con auth attiva, un solo **file PEM pubblico RSA** letto al bootstrap, anche in staging/production. Nessuna chiave Base64 runtime, hot reload, key ring, provider o coordinamento automatico con Web.
- Adozione operativa della rotazione coordinata rinviata nel perimetro corrente; predisposizione opt-in, codice e prove storiche Web conservati. Non sono stati cambiati flag, chiavi, segreti o configurazioni reali.
- Il cambio della chiave di firma Web può rendere incompatibile il verificatore autenticato Tox21 finché usa il PEM precedente. Il formato PEM rispetto a Base64 riguarda la consegna del materiale: convertirne la rappresentazione non risolve il coordinamento. Un `kid` nuovo con la stessa chiave, da solo, non cambia la firma.

Il limite viene dichiarato, non mascherato con un esito di integrazione: non si dichiara il worker protetto dalla revoca delle chiavi Web. I flussi scientifici pubblici non vengono interrotti attivando indiscriminatamente l’auth.

## Contratto implementato

| Dominio | Comportamento |
| --- | --- |
| Ambiente | `development`, `test`, `staging`, `production` esatti; default development. Vuoto o sconosciuto fallisce senza caricare un file alternativo |
| Configurazione locale | Solo development/test leggono opzionalmente il rispettivo dotenv; process environment prevalente, valori letterali senza interpolazione, nessuna mutazione di `os.environ` |
| Staging/production | Nessuna lettura dotenv: `NATS_URL` e `VERSION` arrivano dal process environment. Cambiamento intenzionale da migrare nei Compose/manifest in T21-06 |
| Broker | Stringa non vuota `nats://` o `tls://`, host e porta valida; diagnostica senza valori sensibili |
| Auth attiva | `JWT_PUBLIC_KEY_PATH` indica un PEM pubblico RSA leggibile; default `public.<ambiente>.pem` o `public.pem` in produzione. Materiale invalido, privato, non RSA o assente impedisce l’avvio |
| Auth pubblica | Nessuna lettura PEM; payload ancora validati. Non è una policy commerciale di accesso pubblico al broker |
| Import | Nessun caricamento di configurazione, soglie, pesi o chiavi e nessuna connessione all’import di `main`; soglie non lette all’import di `api.inference`. Dipendenze scientifiche ancora presenti nell’ambiente |
| Bootstrap | Configurazione → eventuale PEM → modello/soglie → connessione → cinque sottoscrizioni → flush NATS entro 5 secondi → readiness locale |
| Connessione | Readiness rimossa alla disconnessione e ripristinata dal callback del client dopo riconnessione; default di retry `nats-py` conservati. Chiusura definitiva termina il worker con errore |
| Arresto/errore startup | Readiness rimossa; drain se connesso e chiusura garantita anche se il drain fallisce, con timeout distinti di 5 secondi. Supporto segnali dove disponibile; cancellazione KeyboardInterrupt su Windows |
| Compatibilità | Subject e shape dei cinque risultati conservati, inclusa inferenza senza wrapper `data`. Nessuna uniformazione incidentale delle categorie di errore chimico |

La readiness è un evento locale del processo, non un endpoint o una probe deployment già implementata. La gestione dei segnali e la riconnessione non sono state provate contro OS/broker reali. I timeout di cleanup non garantiscono l’interruzione forzata di una chiamata esterna già in corso su thread.

Le soglie vengono caricate al bootstrap e associate al predictor del servizio. La funzione `predict` conserva i tre argomenti posizionali precedenti; per chiamate dirette carica le soglie all’invocazione. Nessun retraining o modifica di pesi/soglie; coerenza dell’esportazione e inferenza con modello reale rimangono T21-03/09.

## Evidenze

Baseline prima delle modifiche: **25 test esistenti handler/RDKit passati**. Verifica finale nella virtualenv già presente, senza installazioni:

```powershell
.\.venv\Scripts\python.exe -B -m unittest tests.test_config tests.test_runtime tests.test_nats_requests tests.test_rdkit_api
```

**54 test passati**:

- 8 test di configurazione, inclusi i quattro ambienti, precedenze, dati mancanti/non validi, nessuna lettura dotenv in staging/production e matrice dei cinque subject.
- 21 test di PEM/import/lifecycle: chiavi RSA sintetiche e file temporanei, verifica RS256 effettiva, scadenza, audience, algoritmo errato, PEM rifiutati, bootstrap autenticato staging/production, startup incompleto, disconnessione/riconnessione simulata, stop, cancellazione e cleanup.
- 25 test handler/RDKit esistenti, conservati; adattato solo il setup degli handler al bootstrap esplicito.

Audit AST prima/dopo: invariati i corpi dei cinque callback, del verificatore JWT e dei tre helper wire. La maggior parte del diff di `main.py` deriva dall’inclusione delle sottoscrizioni in `try/finally`; non è un rifacimento della logica scientifica.

Prova isolata aggiuntiva sullo SHA sorgente Tox21 `884e74fccd78dd8bb7cdcf8847b29c06551d709d`: import di `main`, caricamento dei pesi/soglie tracciati tramite `load_inference_runtime` e predizione di `CCO` su CPU. Ottenute esattamente le quattro label attese con probabilità comprese tra 0 e 1, senza NATS o PubChem e senza modificare il pacchetto. Verificati così il nuovo percorso di import nativo e una predizione reale; nessuna conclusione sulla qualità scientifica, provenienza/coerenza checkpoint-soglie o copertura completa della regressione predittiva.

La prima verifica comprendente `tests.test_training_pipeline` è stata interrotta durante il caricamento dei moduli nativi pandas; il successivo tentativo diagnostico ha individuato quello stack ed è stato a sua volta fermato. Nessun risultato dei quattro test di training viene dichiarato ottenuto. Nessuna correzione delle dipendenze o della pipeline di training addebitata a T21-02.

Non eseguiti: installazione pulita, build container, broker reale, PubChem reale, browser o CI applicativa remota. La CI Tox21 resta T21-05. Le prove locali non certificano il deployment o la compatibilità scientifica del modello. Nessun processo applicativo dell’utente è stato avviato, fermato o riconfigurato.

## Lavoro successivo

**T21-03:** pacchetto modello e dipendenze riproducibili, con priorità alla coerenza tra checkpoint e soglie. **T21-09:** estensione della suite nelle lacune residue dell’inventario; i nuovi test T21-02 ne coprono già una parte. **T21-04/05/06:** isolamento del runtime, CI e adeguamento delle definizioni di avvio al nuovo contratto.

Rinviare la rotazione coordinata è una scelta di perimetro sostenibile per il caso portfolio: il valore dimostrabile resta nella progettazione, nei test e nella documentazione delle incompatibilità reali. La sua ripresa potrà essere un’attività separata con uno scopo concreto e criteri di accettazione propri. Non si modifica o cancella il lavoro già predisposto per far apparire conclusa l’integrazione.
