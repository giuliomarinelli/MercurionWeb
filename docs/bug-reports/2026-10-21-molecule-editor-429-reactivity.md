# Editor molecolare: HTTP 429 su REST/GraphQL e aggiornamenti intermittenti dell’identità

## Scheda pronta per Trello

- **Titolo:** Editor molecolare — richieste REST/GraphQL in 429 durante il disegno e identità molecolare non sempre aggiornata.
- **Tipo:** Bug, con indagine tecnica preliminare necessaria.
- **Stato:** Correzione implementata e collaudata localmente il 22 ottobre 2026; dettagli ed evidenze nella sezione 19. Non ancora certificata dalla CI remota né integrata con commit.
- **Data della segnalazione:** 21 ottobre 2026, Europe/Rome.
- **Area:** Angular, integrazione Ketcher tramite iframe, canonicalizzazione remota, lookup GraphQL, rate limiting Nest/Fastify.
- **Impatto:** L’uso interattivo dell’editor può saturare le richieste consentite; nome e SMILES canonico possono fallire, restare non aggiornati o sembrare dipendenti da una nuova interazione con l’iframe.
- **Priorità suggerita:** Alta, da confermare nel triage; interessa il flusso principale di disegno. Non sono stati dimostrati perdita di dati o impatti in produzione.
- **Vincolo esplicito:** Non sostituire la canonicalizzazione remota con RDKit.js/WASM nel browser. La sua esclusione da questo percorso era intenzionale; la motivazione va acquisita prima di rivalutare tale scelta.

> **Aggiornamento decisivo del 22 ottobre:** il nuovo episodio è un `SCIENTIFIC_RPC_OVERLOADED`, con **395 richieste HTTP ancora disponibili su 400**. La causa del rifiuto è la capacità della coda scientifica, non l’esaurimento del bucket HTTP. Le sezioni 1–12 conservano il triage iniziale; le conclusioni aggiornate e le prove sono nelle [sezioni 13–18](#13-evidenza-decisiva-del-22-ottobre-2026).

## 1. Riferimento del codice e perimetro delle evidenze

Questo report descrive il codice dell’ultimo commit disponibile al momento della segnalazione:

```text
Repository: MercurionWeb
Commit: d9b09eb88c079e00e98efca40384208784288d89
Oggetto: NEST | GraphQL validation fixes
Data commit: 2026-10-21T16:32:35+02:00
Branch: feature/6ad835e6321fb8a8c5e6ad45-6a93bf97280aac615b016fbc-notebook-and-synth-implementation
```

I tentativi locali effettuati durante la diagnosi sono stati abbandonati su richiesta dell’utente. Le modifiche applicative e i test introdotti per quei tentativi sono stati rimossi, ripristinando i file al commit sopra indicato. Il report è il solo nuovo artefatto da conservare.

Occorre distinguere tre livelli di evidenza:

1. **Segnalazione e screenshot dell’utente:** documentano i sintomi e le rotte HTTP coinvolte.
2. **Lettura del codice al commit di riferimento:** documenta pipeline, frequenze configurate, gestione degli errori e policy di rate limiting.
3. **Ipotesi da verificare nel runtime:** identificano meccanismi plausibili, ma non costituiscono una root cause dimostrata.

Lo screenshot più recente è stato acquisito durante i tentativi locali poi abbandonati: prova che il problema persisteva e coinvolgeva GraphQL in quello stato, ma non sostituisce una nuova riproduzione sul commit pulito. Non è disponibile una cattura HAR del commit di riferimento, né una misura correlata frontend/backend dei contatori effettivi.

## 2. Ambiente e percorso interessato

- Ambiente locale di sviluppo Windows, browser Chrome.
- Origine pubblica di sviluppo: `http://localhost:8888`, tramite nginx.
- Pagina: `/molecules/editor`, protetta da autenticazione.
- Modalità esplicitamente visibile negli screenshot: `mode=duplicate`.
- Editor Ketcher incorporato tramite iframe e protocollo `postMessage`.
- Frontend Angular in modalità development; nello screenshot compare anche il warning NG0751 relativo a HMR e `@defer`.
- Servizi interessati dal percorso: Nest/Fastify, Redis per il rate limiter, GraphQL/Apollo e servizi scientifici remoti per la canonicalizzazione.

URL esemplificativo ricavato dalla barra del browser negli screenshot:

```text
http://localhost:8888/molecules/editor?mode=duplicate&smiles=CC(%3DO)C1%3DCCC%5BC@@H%5D2CC%5BC@H%5D1N2
```

Per la riproduzione è preferibile usare il link originale o un’azione di duplicazione nell’app; la stringa sopra è una trascrizione visiva, non un payload esportato da Network. Non è dimostrato che il difetto sia specifico di questa struttura, della modalità duplicazione o di una sola vista dell’editor.

## 3. Comportamento osservato

### 3.1 Prima evidenza: canonicalizzazione REST

Durante modifiche rapide della struttura, l’utente segnala frequenti errori 429. Il primo screenshot mostra ripetutamente:

```text
POST http://localhost:8888/api/rdkit-api/to-canonical-smiles
429 (Too Many Requests)

RDKitAPI canonical poll error
```

### 3.2 Seconda evidenza: GraphQL

Anche dopo i tentativi locali il problema persiste. Lo screenshot più recente mostra più risposte:

```text
POST http://localhost:8888/api/graphql
429 (Too Many Requests)

Molecule name lookup error
ApolloError
Http failure response for http://localhost:8888/api/graphql: 429 Too Many Requests
```

Questa evidenza impedisce di circoscrivere l’indagine alla sola canonicalizzazione REST. Lo screenshot non mostra `operationName`, variabili, header o body della risposta: non permette quindi di attribuire ogni POST GraphQL fallito a una specifica operazione. Il log applicativo identifica almeno un fallimento del lookup del nome.

Il codice di errore è stato confermato dall’utente come **429**. Il riferimento intermedio a 428 era una correzione poi rettificata e non è un secondo difetto da investigare.

### 3.3 Identità molecolare non sempre reattiva

L’utente segnala inoltre che il nome e/o lo SMILES canonico mostrati non si aggiornano sempre al termine della modifica. A volte sembra necessaria un’altra interazione che riporti il focus nell’iframe.

È un sintomo riferito dall’utente, non ancora isolato con una traccia temporale. Non è stabilito se dipenda da cache del bridge, ordine degli eventi Ketcher, richieste scartate/cancellate, mancato recupero dopo un errore, rendering Angular o da più fattori contemporaneamente.

## 4. Comportamento atteso

1. Disegnare o modificare rapidamente una molecola deve mantenere l’editor utilizzabile con una frequenza di richieste compatibile con le policy del backend.
2. Dopo l’ultima modifica, nome e SMILES canonico devono convergere alla struttura corrente senza richiedere click, focus o modifiche aggiuntive.
3. Una risposta tardiva relativa a una struttura precedente non deve sovrascrivere la struttura corrente né riabilitare erroneamente il salvataggio.
4. Una struttura vuota deve invalidare lo stato e le validazioni precedenti.
5. Dopo un errore transitorio o un 429 deve essere chiaro come e quando il sistema recupera; non deve restare silenziosamente fermo su un risultato vecchio o su un’identità non disponibile.
6. La soluzione deve considerare separatamente REST e il traffico aggregato sul singolo endpoint GraphQL.

## 5. Riproduzione da consolidare sul commit di riferimento

Questa è una procedura di indagine da eseguire nella sessione dedicata, non una riproduzione già certificata:

1. Avviare il runtime locale secondo `docs/autonomous-development/RUNTIME.md` e usare esclusivamente l’origine `http://localhost:8888` per l’app.
2. Autenticarsi con un account di sviluppo e aprire una molecola in duplicazione.
3. In DevTools Network abilitare la conservazione del log; registrare l’orario d’inizio, le schede aperte e l’eventuale traffico precedente. Pulire il pannello Network non azzera i contatori Redis.
4. Registrare il traffico a editor fermo per distinguere il polling locale dalle richieste HTTP effettive.
5. Eseguire una sequenza annotata di aggiunte/rimozioni di atomi e legami, alternando raffiche rapide e brevi pause. Conservare durata, numero indicativo di modifiche e prima comparsa del 429: questi valori non sono ancora misurati.
6. Separare i POST a `/api/rdkit-api/to-canonical-smiles` dai POST a `/api/graphql`; per GraphQL raggruppare per `operationName`.
7. Interrompere il disegno, attendere senza interagire con l’iframe e verificare la convergenza dell’identità. Poi confrontare l’effetto di un semplice click/focus con quello di una modifica reale.
8. Ripetere distinguendo vista Disegno e Analisi live, quota disponibile e quota già esaurita, singola scheda e più schede.
9. Verificare anche svuotamento, reset, cambio vista, ripristino della bozza e navigazione via dalla pagina mentre sono pendenti richieste.

Non svuotare Redis globalmente per facilitare la prova. L’eventuale preparazione di contatori di test va limitata a chiavi note e a un ambiente di sviluppo autorizzato, oppure si attende la scadenza documentata.

## 6. Flusso presente nel codice al commit di riferimento

### 6.1 Export locale dal frame

In `ketcher-frame.component.ts`, `ngOnInit()` avvia `interval(250)`. Se l’editor è pronto e non è in corso un export esplicito, `exhaustMap` richiede `session.exportStructure()` e ne pubblica il risultato tramite `exportPolledSmiles` e `molChange`.

L’adapter `ketcher-editor.adapter.ts` serializza `setStructure()` ed `exportStructure()` tramite una coda di Promise e traduce il protocollo del frame. Gli output del componente vengono emessi dentro `NgZone.run()`.

**Quattro tick al secondo non equivalgono a quattro richieste HTTP al secondo:** questo primo passaggio esporta dal frame; la pagina applica ulteriori filtri prima di contattare il backend.

### 6.2 Cache e segnali di modifica nel bridge

In `public/ketcher/index.html` il bridge conserva `lastSmiles`, `dirty` e `inFlight`.

- Gli eventi DOM `pointerup`, `pointerdown`, `keyup`, `input`, `paste` e `drop` impostano `dirty`.
- `refreshSmilesIfNeeded()` chiama `window.ketcher.getSmiles()` quando necessario.
- Al completamento aggiorna `lastSmiles` e imposta `dirty = false`.
- Alla ricezione di `getSmiles`, aggiorna la cache se `dirty` e risponde con `lastSmiles`.

Questo è il comportamento implementato; la sua relazione causale con il sintomo di focus richiede una prova dedicata.

### 6.3 Canonicalizzazione e duplicati nella pagina

`onSmilesPollExported()` alimenta `polledSmiles$`. La pipeline:

1. Normalizza lo SMILES e associa `validationRevision`.
2. Applica `distinctUntilChanged` sulla coppia SMILES/revisione.
3. Filtra gli SMILES vuoti.
4. Applica `debounceTime(300)`.
5. Usa `switchMap` per chiamare `RdKitApiService.toCanonicalSmiles()` via REST.
6. Filtra/deduplica il risultato canonico e la revisione.
7. Registra la bozza e aggiorna `currentCanonicalSmiles`.
8. Esegue `findOneCustomMoleculeByCanonicalSmiles_shortFetch()` via GraphQL per verificare duplicati e aggiornare il blocco del salvataggio.

La canonicalizzazione REST è usata anche in inizializzazione, cambio vista ed export esplicito prima del salvataggio. Occorre conteggiare tutti i percorsi, non solo il polling.

### 6.4 Nome della molecola

Un `effect` osserva `currentCanonicalSmiles`. Ogni esecuzione non vuota avvia un nuovo `of(null).pipe(exhaustMap(...))` per `getPreferredNameItByCanonicalSmiles()`; il cleanup dell’effetto disiscrive la sottoscrizione precedente.

Qui `exhaustMap` riceve un solo valore da una nuova sorgente per ciascuna esecuzione dell’effetto. Non costituisce un limite condiviso tra tutte le ricerche del nome.

La query autenticata è `MoleculeNameByCanonicalSmiles`, con policy `ephemeralLookup = no-cache`. La verifica dei duplicati usa `FindOneCustomMoleculeByCanonicalSmiles`, con `mutableSnapshot = network-only`. Non si può quindi presumere che Apollo eviti le chiamate di questi due percorsi grazie alla cache.

### 6.5 Vista Analisi live

Quando abilitata, `MoleculeEditorLiveAnalysisFacade` reagisce allo SMILES canonico e può aggiungere:

- POST `/api/mercurion-ai/tox-21/infer`;
- POST `/api/embedding/get-similar-by-smiles`;
- query GraphQL `MoleculePreviewsByMolregnos` se sono disponibili analoghi.

Sono presenti cache locali per risultati Tox21/analoghi e una policy `cache-first` per le anteprime. Il traffico aggiuntivo è quindi condizionale, non necessariamente presente a ogni variazione. Va comunque incluso nelle misure della vista live.

## 7. Rate limiting: dati statici confermati e verifica runtime mancante

La configurazione del backend registra `@fastify/rate-limit` con:

```text
hook: preHandler
timeWindow: 5 * 60 * 1000 ms
max: routeAwareMax
storage: Redis
namespace: ratelimit:
```

Per le rotte che ricadono nel ramo predefinito, `routeAwareMax()` restituisce `scale(100)`, dove `scale(n) = n * 4`: il massimo configurato è quindi **400 richieste per finestra di 5 minuti**. Il nome della costante `WINDOW_MIN = 4` non modifica la finestra effettiva di cinque minuti configurata altrove.

La chiave è costruita come:

```text
METODO:ROUTE_PATH|x-device-id|clientIp
```

`clientIp` usa `x-client-ip`, se presente, altrimenti `req.ip`. Il percorso usa `req.routeOptions.url` o, come fallback, `req.url`, normalizzato senza query string.

Non sono presenti rami specifici per la canonicalizzazione o per GraphQL nella funzione esaminata. Le diverse operazioni POST su `/api/graphql` con la medesima chiave client condividono dunque il bucket di quella rotta: `operationName` non compare nella chiave. Il bucket REST della canonicalizzazione è distinto.

**Deduzione da verificare con misure:** nome e duplicati possono produrre due POST GraphQL per ogni nuova identità validata, oltre agli altri consumer sullo stesso bucket. Se entrambe le chiamate raggiungessero sempre la rete, circa 200 aggiornamenti nella finestra consumerebbero da soli un budget di 400. Non è un conteggio osservato: cache, cancellazioni, durata delle operazioni, traffico concorrente e chiave effettiva devono essere misurati.

Restano da acquisire gli header e il body dei 429 per confermare la provenienza effettiva, la chiave applicata, l’eventuale `Retry-After` e la quota residua. La configurazione nel repository non prova da sola lo stato dei contatori nel runtime dello screenshot.

## 8. Punti di indagine, non root cause già accertate

### A. Volume aggregato delle richieste

Misurare la moltiplicazione degli export in canonicalizzazione, duplicati, nome e analisi live. Valutare il comportamento nell’intera finestra del rate limiter, non soltanto il numero di richieste contemporanee o una breve raffica.

`exhaustMap` ignora nuovi valori finché l’Observable interno è attivo; non annulla quello precedente. `switchMap` disiscrive il precedente. Nessuno dei due, da solo, impone un budget di richieste per finestra. Una richiesta già arrivata al rate limiter può essere stata conteggiata anche se il client successivamente si disiscrive. L’effettivo annullamento del trasporto Apollo/HttpClient va osservato, non dedotto dal solo operatore.

### B. Mancato recupero dopo errore con struttura invariata

Nella canonicalizzazione, l’errore viene trasformato in `EMPTY`, mentre `distinctUntilChanged` ha già memorizzato lo SMILES/revisione in ingresso. I successivi export identici vengono filtrati: la scadenza della quota sul server non provoca da sola un nuovo tentativo della stessa struttura.

Anche il lookup del nome, in caso di errore, azzera nome e tipo e chiude lo stato di caricamento. Se il segnale canonico non cambia, non esiste in quel percorso un trigger esplicito di recupero dopo la scadenza della quota.

Questi comportamenti statici sono candidati a spiegare un’identità che resta non disponibile; non dimostrano che siano la causa di tutti i casi riferiti come problema di focus.

### C. Ordine degli eventi e cache dell’iframe

Verificare almeno questi scenari con il vero Ketcher:

- Un evento DOM marca `dirty` prima che la modifica sia effettivamente esportabile da Ketcher.
- Una modifica successiva marca `dirty` mentre `getSmiles()` è pendente, ma il completamento precedente lo riporta a `false`.
- Un’operazione programmatica modifica la struttura senza uno degli eventi DOM sorvegliati.
- Un export incontra `inFlight`: verificare se e come l’uscita anticipata possa restituire la cache precedente, tenendo conto della coda seriale dell’adapter. Non assumere che export concorrenti siano presenti nel normale percorso.

Registrare separatamente evento, struttura corrente nel vendor, cache del bridge, messaggio ricevuto dalla pagina e testo renderizzato. Il componente usa già segnali Angular e `NgZone.run()` sugli output: non attribuire automaticamente il problema alla change detection senza verificare dove il dato diventa vecchio.

### D. Risposte obsolete e stato del salvataggio

Il filtro degli SMILES vuoti precede lo `switchMap` REST: una cancellazione del disegno non raggiunge quel punto come valore invalidante. Inoltre il controllo duplicati ha uno `switchMap` successivo, raggiunto solo dopo la canonicalizzazione. Verificare cosa accade a una vecchia verifica duplicati mentre la nuova canonicalizzazione è ancora pendente.

Controllare revisioni e risposte tardive durante reset/ripristino/cambio vista. Nel ramo di errore del controllo duplicati viene emesso `res: null`, lo stesso valore usato per assenza di duplicati: verificare che un errore di rete non venga interpretato come una validazione riuscita. Non è stato dimostrato un salvataggio scorretto nell’uso reale.

## 9. Dati da raccogliere nella sessione dedicata

| Dato | Scopo |
| --- | --- |
| Commit effettivamente servito da Angular/Nest e asset del bridge | Evitare confronti tra versioni diverse o cache del browser |
| HAR depurato da cookie, token e dati personali | Ricostruire sequenza, durata, stato e cancellazioni |
| `operationName` GraphQL e categoria della struttura richiesta | Separare nome, duplicati, anteprime e traffico estraneo all’editor |
| Header/body dei 429, `Retry-After` e header di quota se presenti | Identificare origine, finestra e recupero |
| Correlation/request ID e log server associati | Collegare invio client, ingresso nel limiter e gestione backend |
| Chiave effettiva e TTL del solo contatore Redis interessato | Verificare aggregazione tra operazioni, schede e client |
| Numero di richieste per rotta/operazione nell’intera finestra | Quantificare il consumo reale del budget |
| Traccia export Ketcher → raw SMILES → canonico → nome/duplicati | Localizzare il primo dato obsoleto o mancante |
| Ripresa dopo errore senza modificare la struttura | Distinguere quota scaduta da pipeline che non riparte |
| Effetto di click/focus senza modifica molecolare | Verificare il sintomo specifico riferito dall’utente |

Evitare di allegare header `Authorization`, cookie, credenziali o chiavi Redis contenenti identificativi personali non necessari. Gli screenshot della conversazione andranno allegati alla scheda Trello; questo Markdown ne riporta il contenuto rilevante ma non incorpora i file immagine.

## 10. Vincoli e approcci non validati

- Mantenere la canonicalizzazione remota come riferimento di partenza. Non reintrodurre RDKit.js/WASM in questo percorso senza discutere il motivo della scelta precedente con l’utente.
- Non considerare risolutivo un semplice cambio tra `exhaustMap` e `switchMap`.
- Non trattare l’aumento di debounce o l’aggiunta di un ritardo fisso come soluzione dimostrata: va verificato il rapporto tra reattività e budget completo REST/GraphQL.
- Non aumentare/disabilitare i limiti o escludere GraphQL dal rate limiter per nascondere il problema.
- Non introdurre retry indiscriminati: potrebbero aumentare il traffico. Un’eventuale strategia deve considerare quota, `Retry-After`, ultima struttura e cancellazione.
- Non interpretare una quota ancora esaurita dopo reload come prova che una nuova implementazione stia generando lo stesso volume: correlare sempre contatore e finestra.
- I tentativi precedenti di throttling/backoff, modifica del bridge e uso della canonicalizzazione locale non hanno ottenuto l’accettazione dell’utente e sono stati rimossi. Non costituiscono una patch da riprendere automaticamente.
- I test con mock passati su un tentativo precedente non certificano il comportamento del commit di riferimento né la risoluzione del bug nell’app reale.

## 11. Criteri di accettazione per una futura correzione

- [ ] Riproduzione e root cause documentate con evidenze sul commit di riferimento e confronto con la patch.
- [ ] Traffico REST e GraphQL misurato per una sessione di editing che copra almeno una finestra completa del limiter.
- [ ] Carico rappresentativo concordato e ripetibile; numero di modifiche, pause, vista e durata registrati.
- [ ] Nel carico concordato l’editor non satura le quote per effetto del proprio normale flusso di aggiornamento; eventuale traffico di altre schede viene distinto.
- [ ] L’ultima struttura produce identità e SMILES aggiornati senza focus/click supplementari; latenza misurata e soglia concordata, non inventata durante l’implementazione.
- [ ] Recupero da 429 e altri errori transitori verificato anche lasciando invariata la struttura, con comportamento esplicito e senza raffiche di retry.
- [ ] Risposte obsolete non sovrascrivono la struttura corrente; svuotamento, reset, cambio vista e distruzione della pagina invalidano correttamente il lavoro precedente.
- [ ] Errori nella verifica dei duplicati non sono trattati come esito positivo; salvataggio e validazioni restano coerenti.
- [ ] Verifica su Disegno e Analisi live, e sulle modalità create/edit/duplicate pertinenti.
- [ ] Test di regressione per i meccanismi effettivamente individuati, più verifica nel browser supportato con il vero iframe Ketcher e backend tramite nginx.
- [ ] Nessuna reintroduzione della canonicalizzazione RDKit.js/WASM nel browser senza autorizzazione esplicita.

## 12. Mappa dei sorgenti al commit di riferimento

I riferimenti sono relativi alla radice del repository; le righe si riferiscono al commit indicato nella sezione 1.

| File | Punto di interesse |
| --- | --- |
| `MercurionWebNg/src/app/components/chem/ketcher-frame/ketcher-frame.component.ts` | Poll locale a 250 ms, riga 163; export/output dentro `NgZone.run()`, riga 274 |
| `MercurionWebNg/src/app/chemistry/adapters/ketcher-editor.adapter.ts` | Coda operazioni, riga 55; protocollo e risoluzione export |
| `MercurionWebNg/public/ketcher/index.html` | Cache/dirty, riga 83; refresh, riga 95; eventi, riga 124; risposta `getSmiles`, riga 185 |
| `MercurionWebNg/src/app/pages/molecule-editor/molecule-editor.page.component.ts` | Effect nome, riga 219; ingresso poll, riga 304; canonicalizzazione init/salvataggio, righe 373/383; pipeline poll/duplicati, riga 647 |
| `MercurionWebNg/src/app/pages/molecule-editor/molecule-editor-live-analysis.facade.ts` | Effect di analisi, riga 35; inferenza, riga 70; analoghi/anteprime, righe 90/100 |
| `MercurionWebNg/src/app/services/rd-kit-api.service.ts` | POST di canonicalizzazione, riga 24 |
| `MercurionWebNg/src/app/services/graphql/molecule.service.ts` | Anteprime, riga 57; lookup nome, riga 71 |
| `MercurionWebNg/src/app/services/graphql/molecule-collection-item.service.ts` | Lookup duplicati, riga 255 |
| `MercurionWebNg/src/app/services/graphql/graphql-query-policy.ts` | Definizione di `network-only`, `no-cache` e `cache-first` |
| `MercurionWebNg/src/app/graphql/documents/molecule.graphql` | Operazioni anteprime/nome, righe 30/57/64 |
| `MercurionWebNg/src/app/graphql/documents/molecule-collection-item.graphql` | Operazione duplicati, riga 248 |
| `MercurionWebNode/src/bootstrap/configurators/rate-limit.configurator.ts` | Registrazione limiter, finestra, Redis e risposta 429 |
| `MercurionWebNode/src/config/rate-limit.config.ts` | Normalizzazione rotta, chiave client e budget per rotta |
| `docs/autonomous-development/RUNTIME.md` | Topologia e procedure del runtime locale |

**Esito del triage iniziale del 21 ottobre:** bug ancora aperto; ipotesi da verificare. Questo esito storico è integrato dall’analisi seguente.

## 13. Evidenza decisiva del 22 ottobre 2026

### 13.1 Risposta e header forniti dall’utente

L’utente ha riprodotto un errore dopo pochi click in modalità `duplicate`, sulla rotta REST di canonicalizzazione. Il body restituito contiene:

```json
{
  "code": "SCIENTIFIC_RPC_OVERLOADED",
  "category": "rate-limit",
  "status": 429,
  "message": "ScientificRpc::Overloaded",
  "correlationId": "0ba5762c-8164-4402-ae00-83fb70fd1149",
  "timestamp": "2026-10-21T22:14:02.132Z",
  "path": "/api/rdkit-api/to-canonical-smiles"
}
```

Estratto dei campi rilevanti, non copia integrale del body. L’orario corrisponde al **22 ottobre 2026, 00:14:02.132 Europe/Rome**. Lo screenshot Network mostra lo stesso correlation ID e:

| Header | Valore |
| --- | --- |
| `X-RateLimit-Limit` | `400` |
| `X-RateLimit-Remaining` | `395` |
| `X-RateLimit-Reset` | `287` |

**Conclusione dimostrata per questa richiesta:** il limiter HTTP ha ammesso la richiesta e la policy scientifica l’ha rifiutata. Il contatore HTTP aveva consumato cinque unità nella finestra, inclusa questa richiesta. `287` indica i secondi residui del bucket HTTP: non è il tempo di recupero della coda scientifica. Il semplice header `Server: nginx` non attribuisce a nginx la generazione dell’errore.

Il body non distingue coda piena da scadenza dell’attesa in coda. Non identifica quale operazione occupasse lo slot; non sono stati acquisiti log server correlati. Non si estende automaticamente questa attribuzione ai vecchi screenshot GraphQL, privi di body e header.

### 13.2 Versione e metodo di analisi

- HEAD analizzato: `a9b1dba5b7a0936718564ad748df0749860d73fe`; working tree inizialmente pulito.
- I percorsi editor/bridge, la policy scientifica e la configurazione dei limiti esaminati non presentano differenze rispetto al commit del triage per i file confrontati.
- Analisi interattiva, senza esecuzione di ricette autonome, modifiche applicative, installazioni, Git write o accessi a database/Redis.
- Nessuna nuova sessione browser/runtime avviata dall’agente. Le evidenze runtime di questa sezione provengono dall’utente; il commit effettivamente servito non è stato verificato.
- Prove isolate eseguite sul codice estratto dai sorgenti reali, con trasporti e dipendenze esterne simulati. Non equivalgono a collaudo Angular/Ketcher/Nest end-to-end.

## 14. Cause e meccanismi confermati

### 14.1 Capacità scientifica condivisa: causa del nuovo 429

`ScientificRpcPolicy` è un provider del modulo globale `MercurionAIModule`. `RDKitService`, `PcpService` e `MercurionAIService` usano la stessa policy. Il parametro `operation` serve per le metriche; non separa contatori o code.

I default in `config.schema.ts:325–328` sono:

| Parametro | Default | Effetto |
| --- | --- | --- |
| `APP_SCIENTIFIC_RPC_MAX_IN_FLIGHT` | `1` | Una RPC attiva per istanza della policy nel processo Nest |
| `APP_SCIENTIFIC_RPC_MAX_QUEUE` | `2` | Due RPC in attesa |
| `APP_SCIENTIFIC_RPC_QUEUE_WAIT_MS` | `250` | Una richiesta in coda scade dopo 250 ms |
| `APP_SCIENTIFIC_RPC_TIMEOUT_MS` | `3000` | Timeout della RPC dopo l’ammissione |

Sono default e valori delle prove isolate; eventuali override del processo dell’utente non sono stati letti. La ricetta storica `0147-apply-bounded-failure-policy-to-scientific-rpc-adapters.md:96` registra questi valori come policy di capacità approvata esplicitamente: la soluzione di base deve rispettarla.

In `acquire()` si emette `SCIENTIFIC_RPC_OVERLOADED` sia quando la coda è piena, sia quando scade l’attesa. `packages/rest-contracts/src/application-errors.ts` traduce questo codice in HTTP 429. Non occorre arrivare a 400 chiamate: **bastano due RPC se la prima mantiene lo slot oltre il tempo di attesa della seconda**.

Il percorso editor può creare questa contesa:

1. Canonicalizzazione di A riuscita; `currentCanonicalSmiles` cambia.
2. Parte il lookup del nome. Se ChEMBL e il catalogo personale non risolvono il nome, `getMoleculeName()` chiama PCP/PubChem attraverso la stessa policy scientifica.
3. L’utente modifica A in B. Dopo il debounce parte la canonicalizzazione di B, mentre PCP può essere ancora attivo.
4. B aspetta nella coda scientifica e può ricevere 429 dopo 250 ms. In Analisi live anche Tox21 compete per lo slot.

Questa sequenza è **riprodotta con dipendenze simulate**; PCP come occupante dello slot nello screenshot resta da confermare con log correlati. La policy è condivisa anche tra richieste di utenti differenti nello stesso processo Nest; i bucket HTTP REST/GraphQL, invece, sono distinti.

La disiscrizione RxJS o la cancellazione HTTP non annulla automaticamente una RPC già entrata in `ScientificRpcPolicy.execute()`. Il metodo attende `firstValueFrom(client.send(...))` e rilascia lo slot nel `finally`; non riceve un segnale di abort HTTP. Una nuova richiesta può quindi collidere con un lavoro che il browser considera già abbandonato. Anche il timeout Nest non garantisce l’interruzione di un’elaborazione già avviata in Python.

### 14.2 Mancato recupero: un rifiuto transitorio diventa stato permanente

La pipeline poll memorizza SMILES/revisione prima della richiesta. Se la canonicalizzazione fallisce, `catchError → EMPTY` termina quel tentativo, ma gli export identici vengono poi esclusi da `distinctUntilChanged`. Non c’è un timer di recupero. Lo script diagnostico conferma un solo tentativo anche continuando a esportare la stessa struttura per oltre cinque minuti.

Il nome ha un problema analogo: l’effetto si riattiva al cambio del canonico, non quando la capacità torna disponibile. Non distinguere un nome assente da una ricerca fallita nasconde inoltre il motivo dello stato incompleto.

Questa seconda causa è indipendente dall’origine del 429: si manifesta sia con overload scientifico sia con quota HTTP esaurita.

### 14.3 Revisioni incomplete e cancellazione insufficiente

`validationRevision` cresce su reset/storia/inizializzazione, non su ogni nuova struttura. Viene usata per deduplicare, ma non verificata contro lo stato corrente prima della pubblicazione dei risultati.

Sono riprodotti i seguenti difetti:

- **Svuotamento durante debounce o REST:** il filtro del vuoto impedisce di invalidare il lavoro precedente. La risposta di A può riapparire a editor vuoto e sbloccare il salvataggio.
- **A → vuoto → A:** il deduplicatore del canonico conserva A; la seconda A viene soppressa, lasciando identità vuota e salvataggio bloccato. Non è necessario un errore HTTP.
- **A → B con duplicati di A pendenti:** lo `switchMap` dei duplicati riceve B solo dopo la sua canonicalizzazione. Nel frattempo la risposta di A può sbloccare lo stato.
- **Incremento di revisione con richiesta pendente:** da solo non impedisce a una risposta precedente di aggiornare identità, bozza e validazione.
- Una nuova struttura non vuota non blocca immediatamente il salvataggio in `onSmilesPollExported()`; l’abilitazione può continuare a descrivere la revisione precedente.

### 14.4 Errori trasformati in risultati validi

Il controllo duplicati converte gli errori in `null` sia nella pipeline live sia in `checkDupe()` prima del salvataggio. Questo valore significa anche “nessun duplicato”. Le prove confermano che un 429 può sbloccare il pulsante e che il controllo esplicito può restituire un canonico utilizzabile nonostante la verifica fallita.

È dimostrata l’errata autorizzazione **client** a proseguire, non un duplicato persistito. La creazione backend ha un percorso `CustomMoleculeResolutionService` con canonicalizzazione, transazione e risoluzione dell’identità per proprietario; lo stato reale dei vincoli DB non è stato verificato e non si propone alcuna modifica a `pg_sl`.

`canonicalizeForEditor()` restituisce inoltre lo SMILES raw quando la canonicalizzazione fallisce. Inizializzazione/cambio vista possono così presentare come canonico un valore che il servizio remoto non ha confermato. Recuperare il disegno è corretto; attribuirgli una validazione riuscita non lo è.

### 14.5 Bridge Ketcher: perdita del segnale di modifica

Sequenza riprodotta eseguendo lo script reale del bridge con `getSmiles()` controllato:

1. Parte un export di A con `dirty = true`.
2. Mentre l’export è pendente, una modifica B chiama `markDirty()`.
3. L’export di A termina e assegna incondizionatamente `dirty = false`.
4. I poll successivi leggono A dalla cache senza esportare B.
5. Un ulteriore evento `pointerdown` può marcare nuovamente dirty e rendere visibile B.

È un meccanismo concreto compatibile con il sintomo “si aggiorna dopo un click”. La frequenza e la sequenza effettiva nel vero iframe restano da misurare. Non c’è evidenza per attribuirlo automaticamente alla change detection Angular o al warning HMR.

In aggiunta, `refreshSmilesIfNeeded()` intercetta e assorbe gli errori di export: il chiamante può ricevere la vecchia cache come normale risultato. La coda dell’adapter serializza i comandi, ma non protegge dalle modifiche interattive durante un export. I messaggi privi di request ID richiedono anche una protezione contro risposte arrivate dopo il timeout di un comando precedente.

### 14.6 Budget HTTP: problema distinto, ancora da gestire

Il nuovo episodio **non** è causato dal bucket di 400/5 minuti. Resta però dimostrabile che il flusso non rispetta un tetto per finestra: con input alternati ogni 500 ms, backend simulato immediato e nessun limiter, la pipeline produce **600 canonicalizzazioni e 600 lookup duplicati in 300 secondi**. Il nome può aggiungere altri 600 POST GraphQL; queste ultime chiamate sono una deduzione dal codice, non un conteggio dello script.

Un debounce di 300 ms riduce le raffiche ma non impone un budget e può anche rinviare indefinitamente il lavoro durante modifiche continue più ravvicinate. La sostenibilità richiede sia un limite di frequenza sia la consegna dell’ultima modifica.

Il device ID del bucket viene ricavato dal cookie firmato nel hook `onRequest`, non da un identificatore diverso per ogni scheda. Schede con lo stesso cookie/IP condividono il bucket. Il plugin installato espone per default `X-RateLimit-*` e, quando è il limiter HTTP a rifiutare, `Retry-After`; `X-RateLimit-Reset` può essere presente anche su un overload scientifico e non deve essere usato come suo tempo di attesa.

## 15. Prove eseguite e limiti delle conclusioni

Artefatto ripetibile: [diagnostics/molecule-editor-429-repro.cjs](diagnostics/molecule-editor-429-repro.cjs).

```powershell
node docs/bug-reports/diagnostics/molecule-editor-429-repro.cjs
```

**13/13 scenari diagnostici confermati.** Lo script estrae mediante AST TypeScript i metodi e la pipeline della pagina, esegue il bridge reale in un contesto isolato e verifica anche l’ammissione nella policy scientifica reale. Simula segnali, risposte HTTP/NATS e il tempo RxJS; non esegue Angular, il vendor Ketcher, Redis o il database. Nel caso RPC simula validatori/error factory e usa i valori di capacità sopra indicati. Conferma i difetti attuali: non è una suite di accettazione della futura soluzione e dovrà fallire o essere sostituito quando i difetti saranno corretti.

È stata eseguita anche la suite esistente della policy, **8/8 test superati**, inclusi overflow, scadenza della coda e rilascio dello slot:

```powershell
# Da MercurionWebNode
node ../node_modules/jest/bin/jest.js --config ./jest.config.js --runInBand --runTestsByPath src/app_modules/mercurion-ai/services/scientific-rpc.policy.spec.ts
```

Questi test confermano che la policy applica il contratto attuale. Il bug è nell’interazione fra quel contratto e il flusso editor, oltre ai difetti di sincronizzazione e gestione degli errori identificati. Non sono state eseguite verifiche CI complete né una certificazione browser della correzione.

## 16. Progetto della soluzione

### 16.1 Un coordinatore dell’identità, con revisione verificata in ogni fase

Introdurre una facade dell’editor che sia l’unico proprietario del flusso raw → canonico → validazione/arricchimenti. Poll, eventi Ketcher, inizializzazione, restore, reset, cambio vista e salvataggio devono usare questo percorso, eliminando le canonicalizzazioni parallele indipendenti.

Stato minimo proposto:

```text
sessionId + revision + rawSmiles
canonical: empty | pending | ready(value, revision) | invalid | error
duplicate: unknown | pending | absent(revision) | present(revision, id) | error
name: idle | pending | ready(revision, name, source) | absent(revision) | error
retry: none | waiting(cause, eligibleAt, attempt)
```

Ogni modifica della struttura invalida subito la validazione e incrementa la revisione, prima del debounce. Vuoto/reset/cambio contesto entrano nello stesso flusso come eventi invalidanti. Il risultato di una richiesta può essere applicato solo se coincidono sessione, revisione e identità di input. Controllo obbligatorio anche per `finally`, timer, bozza, cache, nome e analisi live.

Il canonico precedente può essere conservato internamente, ma non presentato come identità confermata della struttura corrente. Raw e canonico restano distinti: un errore non promuove mai il raw a canonico. La bozza del disegno va conservata anche durante errori remoti, usando il servizio/registry di storage esistente e preservando le chiavi pubbliche; non aggiungere accessi diretti a localStorage.

### 16.2 Coordinare la capacità scientifica prima di aumentare la frequenza

Il coordinatore mantiene **una richiesta scientifica inviata e una sola struttura più recente in attesa**, sostituendo quelle intermedie. Considerare scientifiche canonicalizzazione, lookup nome che può ricorrere a PCP, inferenza e proprietà; una query nome risolta da cache/catalogo può essere economica, ma non lo si può presumere prima della risposta.

- Le nuove modifiche invalidano i risultati precedenti, ma non liberano artificialmente lo slot client cancellando e rilanciando una HTTP già inviata. Attendere l’esito del lavoro in volo e poi elaborare l’ultima revisione.
- Canonicalizzazione e validazione corrente hanno precedenza sugli arricchimenti non ancora inviati. Nome e analisi live lavorano su snapshot confermati e hanno stati di errore indipendenti.
- Le operazioni opzionali già inviate possono terminare; se obsolete, non aggiornano la UI. Non fingere di poter interrompere PubChem/NATS con una semplice disiscrizione.
- Dopo timeout/errore di trasporto non è noto se il server abbia liberato risorse: usare un recupero limitato, senza lanciare subito una nuova raffica.
- Condividere l’ammissione dei lavori scientifici dell’editor tra istanze/schede, insieme alle attese del bucket HTTP. Un semplice broadcast non è un lock: l’arbitro deve avere mutua esclusione e scadenza del proprietario, con comportamento sicuro quando una scheda si chiude.
- Altri utenti/processi possono comunque consumare capacità: l’overload rimane una risposta lecita da gestire, non un evento eliminabile con una garanzia assoluta lato browser.

La policy globale `1/2/250/3000` resta il punto di partenza. Separare pool PCP/RDKit/inferenza, aumentare la concorrenza o allungare la coda sarebbe una nuova decisione di capacità, da valutare con misure del peer. Non è una correzione necessaria da applicare alla cieca. Il peer usa `asyncio.to_thread()` per PCP, ma questo non dimostra la capacità complessiva di tutte le operazioni scientifiche.

### 16.3 Due strategie di recupero diverse

| Errore | Azione proposta |
| --- | --- |
| `SCIENTIFIC_RPC_OVERLOADED` | Backoff breve crescente con jitter, massimo numero di tentativi; riprovare solo l’ultima revisione. Non aspettare il reset del bucket HTTP se la quota è disponibile |
| Rifiuto del limiter HTTP, quota esaurita | Sospendere il bucket della rotta fino a `Retry-After`; rispettare anche la propria quota client. Nessun retry a ogni poll |
| Timeout/503/rete | Retry limitato per le sole letture idempotenti, con stato visibile e conservazione del disegno |
| Struttura invalida/errore di contratto | Nessun retry automatico dello stesso input; mostrare l’errore pertinente |
| 401/403 | Seguire il flusso auth esistente, senza trasformarlo in indisponibilità chimica |

Proposta iniziale per overload: attese nominali 500, 1000 e 2000 ms con jitter non negativo, da verificare rispetto alle latenze reali; dopo l’esaurimento, errore visibile e comando Riprova. Un solo timer per revisione/categoria. Un cambio struttura durante l’attesa sostituisce il payload pendente senza azzerare il cooldown e il budget; distruzione, logout e cambio contesto cancellano i retry.

Il recupero è un comando distinto dalla deduplicazione dei dati. Lo stesso SMILES deve poter ripartire dopo errore, senza un click nell’iframe. Esporre “Servizio occupato, nuovo tentativo…” separatamente da “Molecola non identificata”. Non introdurre retry automatici delle mutation di salvataggio.

### 16.4 Controllare anche il costo HTTP aggregato

Applicare un tetto misurabile per rotta a tutti i percorsi dell’editor, includendo inizializzazione, cambio vista, nome, duplicati, anteprime e retry. Il debounce rimane un’ottimizzazione; non è il controllo della quota.

Una prima configurazione di prova può riservare all’insieme degli editor **al massimo 200 invii per 300 secondi per bucket**, con distanziamento e contatore su finestra mobile condiviso, lasciando margine rispetto a 400. È un parametro proposto per il collaudo, non una nuova policy approvata o una garanzia sul traffico degli altri consumer. Gli header reali possono imporre attese più lunghe. Non moltiplicare il budget per il numero delle schede e non usare il cookie firmato come dato leggibile dal client.

Possibile ottimizzazione successiva: una singola operazione GraphQL che chieda nome e duplicato usando i resolver esistenti, invece di due POST. Non è indispensabile per correggere la race; va valutato il costo di attendere PCP per ricevere anche il duplicato e la gestione degli errori parziali/non-null. Non adottarla senza una prova dei tempi e della semantica di errore. Se adottata, generare i tipi tramite il flusso GraphQL del repository.

Cache limitate e richieste identiche condivise possono ridurre il lavoro, ma:

- cache canonica indicizzata da raw, opzioni e versione della canonicalizzazione;
- nome/duplicato personale isolati per utente e invalidati con gli eventi dominio esistenti;
- errori e 429 non memorizzati come risultati negativi;
- verifica duplicati prima del salvataggio sempre autorevole e fresca;
- i cache hit del backend risparmiano lavoro scientifico, non le richieste già contate dal limiter HTTP.

### 16.5 Bridge basato su modifiche reali e revisioni monotone

Usare `ketcher.editor.subscribe('change', handler)` come segnale primario della modifica, con cleanup tramite `unsubscribe`. L’API è descritta nella [documentazione ufficiale Ketcher](https://github.com/epam/ketcher/blob/master/README.md#events) e i metodi sono presenti nel bundle vendorizzato `main.e47c48ad.js` dichiarato 3.18.0. Verificare sul vendor reale le operazioni undo/redo, paste e set programmatico; la documentazione del ramo master non sostituisce questa verifica.

Sostituire il booleano dirty con una revisione di struttura e una revisione dell’ultimo export. Se la struttura cambia durante l’export, il completamento non può dichiarare pulita la nuova revisione. Accodare l’export più recente e non pubblicare il risultato vecchio come corrente. La Promise dell’export in volo deve essere condivisa/attesa, non aggirata restituendo subito la cache.

Protocollo proposto: `sessionId`, `requestId`, `revision` nelle richieste/risposte, errore di export esplicito, verifica di source e origin. Un timeout invalida la richiesta; una risposta tardiva non può soddisfare il comando successivo. Inizializzazione e `setMolecule` devono avere una barriera di completamento prima di pubblicare la struttura. Eventuale polling locale di riconciliazione deve leggere davvero il vendor: interrogare solo la stessa cache non rileva un evento perso.

Questo modifica l’esportazione e la sincronizzazione, **non** sposta la canonicalizzazione RDKit nel browser.

### 16.6 Salvataggio legato alla revisione validata

Derivare l’abilitazione da uno stato verificabile: struttura corrente non vuota, canonico confermato per quella revisione, controllo duplicati riuscito e compatibile con la modalità, nessuna operazione di salvataggio già in corso. L’assenza di un nome non deve bloccare una struttura altrimenti valida; un errore duplicati deve bloccarla.

Al click acquisire uno snapshot aggiornato e verificare la sua revisione anche dopo ogni `await`. Se il disegno cambia durante la verifica, non salvare silenziosamente lo snapshot precedente: interrompere il tentativo e richiedere la validazione della struttura attuale. Congelare l’azione richiesta nel relativo contesto, evitando di leggere tardivamente una nuova `pendingAction`.

Il controllo client non sostituisce i vincoli del backend. Conservare le semantiche esistenti di creazione, riuso e modifica dell’identità per proprietario; nessuna migrazione o ridefinizione dell’unicità è autorizzata da questo report.

## 17. Piano di attuazione e accettazione

Ordine proposto, da tradurre in una successiva attività di implementazione:

1. **Correttezza dello stato:** revisioni, vuoto, invalidazione immediata, distinzione errore/assenza, protezione del salvataggio e rimozione del falso canonico di fallback.
2. **Coordinamento e recupero:** unificare i percorsi dell’editor, serializzare la capacità scientifica, conservare l’ultimo input, classificare i due 429, applicare retry e budget limitati.
3. **Bridge:** eventi Ketcher, revisione export, correlazione comandi, errore esplicito e teardown.
4. **Misurazione e collaudo integrato:** verificare reattività, quote e contesa con tutte le viste e più schede; ottimizzare cache/GraphQL solo quando serve e senza alterare i limiti per mascherare il problema.

| Caso obbligatorio | Criterio di successo |
| --- | --- |
| PCP lento e due modifiche ravvicinate, quota HTTP disponibile | Il client non sovrappone volontariamente i propri lavori scientifici; l’ultima struttura converge senza interazioni aggiuntive |
| Overload scientifico indotto da altro consumer | Errore classificato correttamente, retry limitati sull’ultima revisione, poi recupero o errore esplicito |
| Bucket HTTP esaurito | Nessun invio prima del tempo consentito; un solo lavoro corrente alla ripresa; nessuna raffica arretrata |
| Modifiche continue e pausa finale | Coda limitata; l’ultima modifica viene sempre considerata; nessuna starvation introdotta dal solo debounce |
| A → vuoto → A; reset/restore/cambio vista durante richiesta | Nessuna identità o validazione obsoleta; ritorno ad A correttamente rivalidato |
| Duplicati in 429/500; risposta di A dopo modifica B | Salvataggio bloccato fino a validazione positiva di B; errore distinto da assenza |
| Click Salva seguito da modifica/reset/navigazione | Nessuna mutation o apertura overlay basata inconsapevolmente su uno snapshot superato |
| Modifica durante `getSmiles()`, errore export, risposta dopo timeout | Nessuna perdita dell’ultima revisione e nessuna cache vecchia presentata come export corrente |
| Disegno, Analisi live, undo/redo e set programmatico | Identità e analisi convergono senza focus/click supplementari |
| Due schede, chiusura dell’arbitro, cambio utente | Nessuna moltiplicazione del budget, deadlock o riuso di dati personali di un altro utente |

Misurare separatamente: numero di richieste/rotta/operazione, latenza dall’ultima modifica, durata e profondità della coda scientifica, motivo del rifiuto, retry e risposte scartate. Una nuova struttura in presenza di un lavoro scientifico già attivo deve avere una latenza spiegabile come attesa residua + ammissione/budget + servizio; un obiettivo numerico UX va concordato dopo la misura delle dipendenze, non promesso senza dati.

Estendere le metriche di overload con ragione a cardinalità limitata (`queue-full` / `queue-wait-expired`) e mantenere la correlazione request → operazione. Non inserire SMILES, cookie, utente o correlation ID nelle label metriche. Per questo incidente cercare nei log il correlation ID della sezione 13 e le operazioni sovrapposte; non serve svuotare Redis.

La verifica finale deve usare il vero Ketcher e l’app su `http://localhost:8888`, secondo il runtime del repository, oltre a test RxJS di stato e test della policy. I 13 scenari diagnostici vanno trasformati in asserzioni del comportamento corretto nelle suite appropriate. Nessuna accettazione definitiva sulla sola base di test simulati.

## 18. Esito dell’analisi prima dell’implementazione

**Causa del nuovo 429 individuata con evidenza runtime:** rifiuto della policy scientifica condivisa, con quota HTTP quasi interamente disponibile. Resta da distinguere il ramo esatto del rifiuto e quale lavoro occupasse lo slot.

**Cause di mancata reattività caratterizzate nel codice e riprodotte in isolamento:** assenza di recupero, invalidazione incompleta delle richieste, errore duplicati trattato come successo, perdita del dirty durante export e fallback raw presentato come canonico.

**Soluzione progettata, non implementata né certificata:** coordinamento della capacità scientifica e delle revisioni lungo l’intero flusso, gestione distinta dei due 429, budget HTTP misurabile, bridge affidabile e salvataggio subordinato a una verifica corrente. Aumentare il debounce o i limiti, oppure scambiare soltanto `switchMap` ed `exhaustMap`, non copre queste cause.

## 19. Implementazione e collaudo locale — 22 ottobre 2026

Questa sezione supera lo stato pre-implementazione della sezione 18. Intervento autorizzato direttamente dall’utente sul branch di lavoro esistente, a partire da HEAD `a9b1dba5b7a0936718564ad748df0749860d73fe`. Nessun commit, push, merge o modifica del repository Tox21.

### 19.1 Correzione applicata

- **Ammissione comune delle letture dell’editor:** `EditorRequestScheduler` coordina canonicalizzazione, duplicati, nome, proprietà, inferenza e analoghi. Un Web Lock condiviso tra schede dello stesso origin mantiene un solo invio attivo. L’unsubscribe scarta il risultato, ma lascia terminare il trasporto già ammesso; i lavori ancora pendenti della vecchia revisione vengono eliminati. Identità e duplicati precedono nome e analisi live.
- **Budget HTTP condiviso:** massimo 200 invii per rotta in una finestra mobile di 300 secondi per gli editor cooperanti. Timestamp e cooldown passano dal descrittore `moleculeEditorRequestBudget` del `BrowserStorageRegistry`; non contiene strutture molecolari o dati personali. Un bucket in attesa non blocca una rotta diversa ancora eleggibile.
- **Recupero limitato:** massimo tre retry automatici. `SCIENTIFIC_RPC_OVERLOADED` usa 500/1000/2000 ms più jitter 0–99 ms; il 429 HTTP usa `Retry-After` e, se assente, una pausa conservativa di cinque minuti. Timeout/rete/503 hanno retry limitato; input invalido e 401/403 non vengono ritentati dal coordinatore. Il cooldown sopravvive alla sostituzione della struttura e all’esaurimento dei retry. Le mutation non vengono ritentate.
- **Revisione della struttura:** invalidazione immediata di identità e permesso di salvataggio, compreso il vuoto; `auditTime(300)` campiona anche durante modifiche continue. Risposte canoniche, duplicati e nomi superati non possono aggiornare lo stato. Il draft conserva il raw; solo la risposta remota conferma un canonico. Inizializzazione e cambio vista non generano una canonicalizzazione concorrente separata.
- **Bridge Ketcher:** evento vendor `change`, revisione monotona, rilettura effettiva durante il polling, export aggiornato se la struttura cambia durante `getSmiles()`. Comandi correlati con sessione e request ID, controllo source/origin, errori espliciti, barriera per `setMolecule`. Un export precedente a reset o ricreazione della sessione viene scartato.
- **Errori e salvataggio:** errore duplicati distinto da risultato assente; il salvataggio rimane bloccato fino a verifica riuscita. Prima di salvare si rilegge il disegno e si controllano duplicati e revisione dopo gli `await`. Una lettura Ketcher fallita mantiene il canvas e richiede un export fresco; il polling può recuperare senza altri click. Gli errori di nome sono distinti da “Molecola non identificata”; è disponibile “Riprova aggiornamento”.

La policy scientifica backend `1/2/250/3000`, le quote server e la canonicalizzazione remota restano invariate. Batching GraphQL e nuove cache non sono stati introdotti: sono ottimizzazioni separabili, non necessarie per la correttezza verificata. Il messaggio durante attesa/retry è quello generale di aggiornamento; non è stato aggiunto un conto alla rovescia della quota.

### 19.2 Test automatici

| Verifica | Risultato |
| --- | --- |
| Suite Angular mirate: pagina, analisi live, scheduler, adapter, frame, storage | **60/60 passati** in ChromeHeadless, senza watch |
| `node scripts/test-ketcher-bridge.mjs` | **4/4 passati**, sullo script del bridge realmente incluso nell’HTML |
| `npm run ci:typecheck:angular` | Passato |
| ESLint sui file TypeScript modificati e relativi test | Passato |
| `npm run ci:angular:typing` | Passato, compresi i controlli negativi |
| `node scripts/check-angular-browser-storage-registry.mjs` | Passato |
| `git diff --check` | Passato |
| Policy Nest scientifica, eseguita durante l’analisi | **8/8 passati**; codice backend non modificato |

Comando delle suite Angular, da `MercurionWebNg`:

```powershell
..\node_modules\.bin\ng.cmd test --watch=false --browsers=ChromeHeadless --karma-config=karma.conf.js --include=src/app/pages/molecule-editor/molecule-editor*.spec.ts --include=src/app/chemistry/adapters/ketcher-editor.adapter.spec.ts --include=src/app/chemistry/editor-request-scheduler.service.spec.ts --include=src/app/components/chem/ketcher-frame/ketcher-frame.component.spec.ts --include=src/app/services/browser-storage-registry.spec.ts
```

Il test Node del bridge è stato collegato a `ci:test:angular`, prima della suite Angular. Copre modifica durante export, errore esplicito, riconciliazione senza eventi DOM e serializzazione set/export con rifiuto dei messaggi estranei. Le regressioni Angular coprono anche cooldown dopo l’ultimo retry, sostituzione di input durante overload, quota, cambio sessione, risposta dopo timeout, reset durante export, vuoto/ridisegno e salvataggio dopo errore duplicati.

Lo script `docs/bug-reports/diagnostics/molecule-editor-429-repro.cjs` resta una **caratterizzazione storica**: legge con `git show` il commit `d9b09eb88c079e00e98efca40384208784288d89` della segnalazione. Conferma ancora 13/13 difetti del vecchio codice; non è un test di accettazione della correzione e non altera il checkout.

Un controllo aggiuntivo, `node scripts/check-angular-interactive-semantics.mjs`, fallisce sul `div contenteditable` di `MercurionWebNg/src/app/components/molecule-detail/my-molecule-custom-details/custom-details.component.ts:36`. Il file è identico a HEAD (`git diff --exit-code HEAD -- <file>` riuscito) e non appartiene a questa modifica. Non è quindi dichiarato verde l’insieme completo dei gate del repository.

### 19.3 Collaudo browser

Eseguito con **Playwright MCP nella sessione già autenticata**, su `http://localhost:8888`, in schede di prova dello stesso contesto. Questa scelta segue l’istruzione diretta dell’utente e sostituisce il precedente workflow con Chrome dedicato e nuovo login. Runtime già attivo dell’utente preservato. Nessuna mutation di salvataggio inviata al database.

| Scenario | Evidenza osservata |
| --- | --- |
| Canonicalizzazione e nome reali | `CCO` → canonico `CCO`, nome ALCOOL; risposte REST/GraphQL 200 |
| 429 scientifico iniettato con il codice dell’incidente e quota 395/400 | Secondo tentativo dopo circa **603 ms**, poi risposta reale riuscita; nessun click di recupero |
| 429 HTTP iniettato con `Retry-After: 2` | Secondo tentativo dopo circa **2123 ms**, poi successo |
| Errore GraphQL del controllo duplicati | Salvataggio disabilitato e messaggio esplicito; “Riprova aggiornamento” rivalida lo stesso input e recupera |
| Due schede modificano strutture contemporaneamente | Entrambe convergono; **massimo un lavoro inoltrato al server alla volta**, sei risposte 200 |
| Canonicalizzazione trattenuta, poi svuotamento | La risposta vecchia non ripristina l’identità; salvataggio disabilitato; ridisegnare la stessa struttura recupera |
| Disegno con mouse, undo, redo e focus fuori dall’iframe | Cicloesano → vuoto → cicloesano; canonico `C1CCCCC1` e nome CICLOESANO; save bloccato sul vuoto |
| Disegno → Analisi live → Disegno, poi reset | Struttura conservata nel cambio vista; quattro risultati Tox21 e tre analoghi reali; reset a vuoto senza identità residua |
| Nome trattenuto mentre si applicano sei nuove strutture a intervalli di circa 160 ms | Save disabilitato durante attesa; **massimo un lavoro server**, sei risposte 200 complessive per struttura iniziale e finale; ultimo canonico `CCCCCCN`, nome `hexan-1-amine` |
| `getSmiles()` temporaneamente in errore nel vendor reale | Save disabilitato, iframe conservato; ripristinato l’export, ritorno automatico al canonico `CCF` |

I 429 e gli errori di export/duplicati sono fault injection controllate e rimosse al termine. Le risposte successive e i risultati scientifici provengono dal backend locale reale. La misura di concorrenza usa `route.fetch()` e mantiene il contatore fino al completamento server; il semplice ordine degli eventi `requestfinished` di schede diverse non è una misura affidabile della concorrenza server. Alcuni tentativi Playwright sono stati ripetuti per timeout di interazione/attesa in schede non in primo piano; non sono contati come prove riuscite.

### 19.4 Confini della verifica

La correzione elimina la sovrapposizione evitabile degli editor cooperanti e gestisce l’overload residuo; non può garantire l’assenza di 429 causati da altri utenti/consumer o saturazione del peer. Il coordinamento Web Locks riguarda lo stesso origin e profilo browser; non è una prenotazione distribuita della capacità backend. Chiusura/crash di una scheda può rilasciare il lock mentre un lavoro server termina ancora: eventuale overload ricade nel recupero limitato. Il cambio sessione è coperto dai test unitari, non da logout/login nella sessione dell’utente.

Non eseguiti: stress test multiutente prolungato, crash della scheda durante RPC, matrice completa dei browser, mutation persistente di salvataggio, build di produzione e CI remota sull’esatto SHA della correzione. Il ramo specifico del rifiuto storico (`queue-full` oppure `queue-wait-expired`) e il lavoro concorrente al momento dell’incidente restano indeterminati senza i log correlati. Questi limiti non vengono sostituiti da una promessa di assenza assoluta di errori.

## 20. Regressione delle anteprime dei template — 22 ottobre 2026

> La correzione intermedia di questa sezione è stata ulteriormente modificata nella sezione 21: acquisire direttamente SMILES nell’evento di modifica poteva sovrapporre le conversioni del worker locale. Lo stato corrente usa snapshot KET e conversioni serializzate.

L’utente ha segnalato un caso non coperto dal primo collaudo: selezionare un template e portare il cursore sul canvas avviava già canonicalizzazione e nome, prima di applicare la struttura. Il click di inserimento avviava poi un secondo ciclo. La lettura incondizionata del modello vendor durante il polling, introdotta nella correzione della sezione 19, era responsabile di questa regressione.

### 20.1 Causa e correzione

Nel Ketcher vendorizzato 3.18.0 l’anteprima flottante fa parte di `editor.struct()`: prima del click, i sei atomi del benzene risultano già presenti, con `isPreview: true`. Anche `getSmiles()` li serializza. La presenza nel modello non equivale quindi a un inserimento confermato. Le anteprime agganciate possono modificare temporaneamente anche legami esistenti: filtrare soltanto gli atomi aggiunti non sarebbe sufficiente.

Il bridge ora controlla gli indicatori `isPreview` di atomi e legami e conserva la Promise dello snapshot confermato. Acquisisce lo snapshot sincronicamente all’avvio di `getSmiles()` nell’evento di modifica effettiva, prima che il tool inserisca un’altra anteprima; il formatter del bundle serializza la struttura prima di attendere la conversione asincrona. Il risultato resta associato alla revisione che l’ha prodotto.

Durante l’anteprima il polling e gli export espliciti leggono quello snapshot, senza esportare né rimuovere il modello temporaneo dal canvas. Un callback di modifica accompagnato da indicatori di anteprima non invalida l’identità. Dopo un inserimento il nuovo snapshot è disponibile anche se il cursore rimane nel canvas con l’anteprima successiva. Fuori dall’anteprima resta la riconciliazione con il vendor; gli errori di export mantengono la semantica esplicita e le risposte superate vengono scartate. `setMolecule` evita inoltre una seconda notifica quando il vendor ha già segnalato la modifica.

Questa integrazione dipende dagli indicatori del vendor statico installato: un aggiornamento di Ketcher deve ripetere il collaudo di anteprima, inserimento e annullamento. La canonicalizzazione autorevole continua a essere remota.

### 20.2 Evidenze

- **Prima della correzione, browser reale:** selezione del benzene e solo hover sul canvas → sei atomi `isPreview`, un POST di canonicalizzazione, una query duplicati e una query nome. Nessun inserimento era ancora avvenuto.
- **Dopo la correzione, Ketcher reale:** stessa anteprima → **zero richieste** e placeholder del disegno vuoto conservati. Inserimento seguito subito da un nuovo hover → **un solo POST canonico e una sola query per duplicati e nome**, canonico `c1ccccc1`, anche con sei atomi confermati e sei atomi di anteprima presenti contemporaneamente.
- La prova finale è stata ripetuta in una scheda di background della sessione autenticata, usando eventi DOM sintetici `mousemove`/`mousedown`/`mouseup` sui veri controlli del vendor e osservando le richieste reali. Gli input nativi di Playwright avevano prodotto timeout; non vengono presentati come un collaudo nativo riuscito. Una prova aggiuntiva tramite il metodo interno di anteprima su legame non ha prodotto una fixture stabile ed è esclusa dalle evidenze browser positive.
- **`node scripts/test-ketcher-bridge.mjs`: 6/6 passati.** I due nuovi casi proteggono l’anteprima flottante senza invalidazione/esportazione e l’ultima struttura confermata mentre un legame temporaneo di un’anteprima successiva è presente. Restano verdi modifica durante export, errore correlato, riconciliazione e barriera set/export.
- **Suite Angular mirate: 46/46 passate**, includendo pagina, analisi live, adapter e frame. Nessuna modifica ai limiti server o ai contratti HTTP/GraphQL in questo intervento.
- `git diff --check` passato. Nessuna mutation di salvataggio, commit, push o certificazione CI remota.

Il bridge è contenuto nell’HTML dell’iframe: una pagina dell’editor già aperta conserva la versione caricata fino alla ricreazione dell’iframe o al ricaricamento della pagina.

## 21. Blocco dell’export locale e barra di stato stabile — 22 ottobre 2026

### 21.1 Diagnosi riprodotta del nuovo blocco

La schermata segnalata dall’utente mostra un fallimento di lettura del disegno, precedente alla canonicalizzazione remota. L’indagine ha individuato un difetto distinto dai 429: il servizio standalone del Ketcher vendorizzato registra `EE.once(Convert, callback)` e controlla `inputData` **dentro** il callback. Se due conversioni di strutture diverse sono contemporanee, il primo messaggio consuma entrambi i listener; il callback con input diverso non risolve né rifiuta la propria Promise.

Riproduzione nel vendor reale, in una scheda di prova della sessione autenticata: due `structService.convert()` avviate nello stesso turno, con snapshot KET corrispondenti a `CC` e `CCC`. Prima della correzione, `CC` terminava e `CCC` non terminava entro la finestra di osservazione di due secondi. Dopo la correzione, entrambe terminano con il rispettivo SMILES.

L’implementazione intermedia della sezione 20 poteva creare quella sovrapposizione tra conversione all’evento di modifica e conversione del polling. Il timeout dell’adapter Angular interrompeva l’attesa esterna dopo tre secondi, ma la Promise ancora pendente teneva occupati `exporting` e `operationQueue` nell’iframe: ogni tentativo successivo restava dietro alla stessa operazione. I test precedenti non simulavano né la perdita del listener né una Promise che non termina.

### 21.2 Correzione corrente

- L’evento di modifica acquisisce **KET**, con `getKet()`: è una serializzazione sincrona del modello eseguita dal formatter locale, senza una chiamata al worker Indigo. Lo snapshot rimane immutabile e legato alla revisione, prima della successiva anteprima.
- La conversione KET → SMILES avviene su richiesta. Il risultato della stessa serializzazione viene riutilizzato; le revisioni intermedie superate durante un export vengono accorpate all’ultima. Il polling non riconverte continuamente uno snapshot identico.
- Il metodo condiviso `ketcher.structService.convert` è serializzato nel bridge, includendo i caller del vendor che usano quel servizio. La coda riparte anche dopo un errore. Questo evita la sovrapposizione responsabile della perdita dei listener, senza modificare il bundle vendorizzato.
- Conversione e comandi interni hanno deadline rispettivamente di 2000 e 2500 ms, inferiori al timeout esterno di 3000 ms. La scadenza rilascia le code gestite dal bridge, elimina i risultati falliti dalla cache e impedisce all’operazione scaduta di iniziare altre conversioni o pubblicare un risultato tardivo. Il timeout non equivale alla cancellazione fisica di un calcolo già iniziato nel worker.
- Restano la correlazione sessione/request ID, il controllo source/origin, l’esclusione delle anteprime, gli errori espliciti e il blocco del salvataggio fino a verifica corrente. In errore gli spinner dell’identità sono sostituiti da “Verifica necessaria”; il canvas non viene ricreato.

KET → SMILES è l’esportazione locale già necessaria al funzionamento di Ketcher. La canonicalizzazione autorevole resta sull’API RDKit remota; nessuna canonicalizzazione RDKit/WASM è stata aggiunta al browser.

### 21.3 Barra di stato approvata

La scheda riserva sempre una barra di 56 px sotto il canvas e sopra le azioni. Icona da 16 px, testo e spazio per “Riprova” occupano colonne stabili. Il pulsante non disponibile rimane invisibile e disabilitato, conservando lo spazio. Non viene usato un overlay `position: fixed`.

Gli stati sono “Disegna una struttura”, “Verifica della struttura…”, “Ricerca del nome…”, “Struttura pronta”, “Struttura già presente” ed errore con retry. I messaggi si aggiornano con `aria-live="polite"`; il testo di errore esteso non aggiunge più paragrafi o pulsanti al layout. Il nome mancante e il fallimento di verifica mantengono semantiche distinte.

### 21.4 Collaudo e confini

| Verifica | Evidenza |
| --- | --- |
| Due conversioni diverse contemporanee sul servizio reale | Prima: una sola Promise terminava; dopo: entrambe terminate, con `CC` e `CCC` corretti |
| 31 modifiche programmatiche ravvicinate nel vendor reale | Circa 4,4 secondi di modifiche; convergenza finale a `CCCCC`, nome PENTANO, stato pronto e salvataggio abilitato |
| Inserimenti con il vero strumento Single Bond, tramite eventi DOM | 18 inserimenti, due undo e un redo; 34 atomi confermati, canonico di 17 frammenti `CC`, stato pronto e save abilitato |
| Richiesta al worker intenzionalmente non inviata, tramite fault injection del trasporto | Errore esplicito senza spinner dell’identità, save disabilitato, stesso iframe; ripristino del trasporto e “Riprova” recuperano `CCCCCF` e il nome `1-fluoropentane` |
| Posizione delle azioni durante quel guasto e recupero | `top = 899.9453125` prima, durante e dopo: spostamento **0 px** |
| Layout mobile a viewport 390 px | Barra alta 56 px; larghezza documento/client 380/380 px, nessun overflow orizzontale esterno; screenshot desktop e mobile ispezionati |
| Test del bridge sullo script HTML reale | **9/9 passati**, inclusi modello `EE.once`, 50 revisioni durante una conversione, mancata risposta del worker, risposta tardiva e snapshot mai risolto |
| Test Angular mirati | **48/48 passati**, inclusi due nuovi casi di stabilità del footer a 320 e 1024 px, attraverso ready/busy/duplicate/error/ready |
| Typecheck, ESLint mirato, policy typing e styling | Passati, inclusi i relativi controlli negativi; `git diff --check` passato |

Le verifiche browser usano Playwright MCP nella sessione autenticata, in schede temporanee di background con sessionStorage separato. Gli inserimenti del tool sono stimolati tramite eventi DOM sintetici sui veri controlli Ketcher. Nessuna mutation di salvataggio; le schede temporanee sono state chiuse e la scheda attiva dell’utente è stata preservata. Nessun commit, push o nuovo risultato CI remota.

Le prove dimostrano il difetto di correlazione del convertitore e il recupero dei casi simulati; non certificano ogni possibile guasto interno del worker o tutti i browser. Un iframe che esegue ancora lo script precedente continua ad avere le vecchie Promise pendenti: il nuovo bridge entra in funzione al suo caricamento. Il contenuto del canvas attualmente bloccato non viene automaticamente ricaricato o sovrascritto dall’agente.

## 22. Spinner del nome dopo una risposta senza risultato — 22 ottobre 2026

La successiva segnalazione mostra SMILES e stato “Struttura pronta”, con lo spinner del nome ancora visibile. L’ispezione in sola lettura della scheda dell’utente conferma `moleculeNameLoading = false`, `currentMoleculeName = null`, `moleculeNameFailed = false`: la richiesta è terminata. Il template usava `moleculeNameLoading() || !currentMoleculeName()` e trattava quindi anche l’assenza definitiva del nome come caricamento.

Correzione: lo spinner compare durante la verifica della struttura o la ricerca del nome. Una risposta riuscita senza nome mostra **“Nome non disponibile”**; il fallimento mantiene il messaggio di errore e il retry. Il disegno vuoto conserva il proprio placeholder senza spinner. L’assenza del nome non impedisce di salvare una struttura validata.

Collaudo Playwright MCP nella sessione autenticata, in scheda temporanea, con lo stesso canonico segnalato (`CCCC1=CC2=NC(=O)C3(Cc4ccccc4C3)N2C=C1`): risposta GraphQL reale HTTP 200, `{ name: "", type: "iupac" }`; risultato “Nome non disponibile”, zero spinner del nome e salvataggio abilitato. Una seconda prova trattiene e poi rilascia la richiesta reale: uno spinner e “Ricerca del nome…” durante l’attesa, zero spinner e “Struttura pronta” dopo la risposta. Posizione delle azioni invariata (`899.9453125` px, spostamento **0 px**). Screenshot finale ispezionato. Nessuna mutation di salvataggio e nessun ricaricamento della scheda dell’utente.

Test Angular mirati: **51/51 passati**, comprendenti rendering delle risposte con nome `null` e stringa vuota, stato pendente, errore con retry e stabilità del footer. Typecheck Angular, ESLint mirato e `git diff --check` passati. Nessun nuovo risultato CI remota.

## 23. Audit preventivo degli edge case — 22 ottobre 2026

Richiesto dall’utente dopo la correzione dello spinner. L’audit non modifica il codice applicativo: distingue difetti riprodotti, problemi individuati nel codice e collaudi ancora necessari. I 51 test precedenti non costituiscono una prova di completezza.

### 23.1 Difetti riprodotti con dipendenze simulate

Tre nuove prove Angular, eseguite contro il codice corrente in ChromeHeadless, falliscono sui comportamenti desiderati. Nessuna chiamata di scrittura al backend:

| Priorità | Caso | Comportamento osservato | Correzione necessaria |
| --- | --- | --- | --- |
| Alta | Update in modalità modifica ancora pendente | `doSaveEdit()` attende le proprietà ma avvia la mutation con `subscribe()` e ritorna subito. Il `finally` di `onSmilesExported()` azzera `pendingAction` prima della risposta; il pulsante può tornare disponibile | L’operazione di salvataggio deve comprendere la risposta della mutation e impedire un secondo invio concorrente |
| Alta | Nuova struttura disegnata mentre un update precedente è in viaggio | La risposta precedente chiama comunque `drafts.clearCurrent()` e naviga al dettaglio. Riprodotto modificando `CCC` in `CCCC` prima della risposta simulata | Associare anche la mutation al contesto/revisione salvati. La conferma non deve cancellare una bozza successiva o navigare via da essa; annullare una subscription non equivale a cancellare una scrittura server già iniziata |
| Alta | Query duplicati con `data: {}` | Il vero `MoleculeCollectionItemService` converte `GqlDataError('NoData')` in `null`, come se fosse un risultato valido senza duplicati | Accettare soltanto il campo atteso esplicitamente presente e nullo. Payload assente/incompleto deve lasciare la verifica fallita e il salvataggio bloccato |

Esito del run diagnostico: **3 nuove prove fallite, 7 controlli globali passati**. Le prove sono archiviate in `diagnostics/molecule-editor-edge-audit.spec.ts.fixture`, fuori dalla scoperta automatica delle suite. Per ripeterle, copiarle temporaneamente in `MercurionWebNg/src/app/pages/molecule-editor/molecule-editor-edge-audit.temporary.spec.ts` e usare, dalla directory Angular:

```powershell
..\node_modules\.bin\ng.cmd test --watch=false --browsers=ChromeHeadless --karma-config=karma.conf.js --include=src/app/pages/molecule-editor/molecule-editor-edge-audit.temporary.spec.ts
```

Il file temporaneo è stato rimosso dalla directory dei test mediante archiviazione; non sono state modificate le suite esistenti per nascondere i fallimenti. Queste prove vanno trasformate in regressioni permanenti insieme alle rispettive correzioni.

### 23.2 Altri problemi individuati nel codice

- **Attesa del lock tra schede senza deadline.** Il timeout di 15 secondi dello scheduler è interno al callback di `navigator.locks.request()`. Non limita l’attesa per acquisire il lock. Se un altro detentore non lo rilascia, il job corrente può restare pendente senza errore né richiesta HTTP. Serve una scadenza dell’ammissione che annulli soltanto il waiter, senza rubare il lock o avviare richieste concorrenti. La revisione statica conferma l’assenza di deadline; una scheda realmente congelata non è stata riprodotta.
- **Cooldown presentato come normale caricamento.** Il budget è di 200 richieste per route in cinque minuti; un HTTP 429 senza `Retry-After` impone cinque minuti di attesa per tentativo. Il rispetto del limite è intenzionale, ma la UI non distingue coda, cooldown, trasporto e retry. Può quindi sembrare bloccata per diversi minuti. Lo scheduler deve esporre lo stato di attesa e l’istante di ripresa alla barra stabile, senza aumentare i limiti o avviare un nuovo tentativo al click prima della scadenza.
- **Errore nel caricamento iniziale edit e successivo cambio query params.** L’errore di `getCustomSmilesById()` raggiunge la subscription esterna e termina l’intero ascolto di `queryParamMap`. Un successivo URL valido, se Angular riusa il componente, non viene più elaborato. Occorre contenere l’errore nel ramo della singola richiesta. Caso individuato per revisione statica, non incluso nelle tre riproduzioni precedenti.

La concorrenza delle scritture tra schede richiede anche una garanzia server/database. Il controllo duplicati client e il lock delle letture non rendono atomico l’update. Il repository contiene un cutover futuro di identità/copy-on-write (`30_custom_identity_guard_pg16_NOT_YET_APPLY.sql`): non è stato applicato e lo stato degli indici del database reale non è stato verificato. Nessuna garanzia di unicità concorrente viene dedotta dai test frontend.

### 23.3 Matrice da completare prima della chiusura

Già presenti prove mirate per anteprima flottante/commit, modifica durante export, worker senza risposta e risposta tardiva, reset con vecchio export pendente, clear/redraw identico, errore REST/GraphQL esplicito, sostituzione della sessione nello scheduler e risposte live superate. Non equivalgono a collaudo completo di tutte le combinazioni.

Restano da aggiungere o eseguire esplicitamente: ciclo completo delle mutation (errore, mancata risposta, doppio invio, nuovo disegno e cambio route durante il salvataggio); attesa/cancellazione del lock e cooldown visibile; recupero dopo errore iniziale di route; selezione/spostamento/rotazione senza modifica chimica; stereochimica, cariche, frammenti multipli e strutture grandi rispetto alle deadline locali; input nativo e anteprime agganciate in tutti i browser supportati; scheda sospesa/ripresa e sessione scaduta durante una richiesta.

In questo audit una nuova navigazione Playwright è andata in timeout prima di `DOMContentLoaded`: non viene conteggiata come prova browser positiva. La scheda attiva e il disegno dell’utente sono stati preservati. Nessun commit, push, modifica del database o nuovo esito CI remota.

## 24. Correzione degli edge case autorizzata — 22 ottobre 2026

### 24.1 Ciclo del salvataggio

La pagina attende ora la risposta della mutation di update con `firstValueFrom`, mantenendo `pendingAction` fino al suo esito. I comandi ripetuti e gli export espliciti ripetuti vengono respinti mentre il salvataggio è in corso. Anche un errore del polling durante la mutation non libera prematuramente l’azione.

La conferma è associata alla revisione e all’identità edit salvate. Dopo un cambio contesto non modifica la nuova pagina. Se il contesto è lo stesso ma il disegno è cambiato, non cancella la bozza e non naviga: aggiorna la baseline confermata, conservando struttura e cronologia delle modifiche successive. `MoleculeEditorDraftService.acceptSavedBaseline()` verifica l’ID prima di aggiornare e persistere la baseline. Questo non cambia la politica preesistente dei query params `destroy_cache`/`smiles` per inizializzazione e ripristino.

La scrittura non passa attraverso i retry dello scheduler delle letture. Una risposta mancante scade dopo 15 secondi; un errore, timeout o risposta senza item produce lo stato esplicito “Salvataggio non confermato: verifica la molecola”. Il disegno rimane disponibile e un nuovo invio viene bloccato in quel contesto, anche cambiando vista. Un errore della navigazione successiva a una conferma valida non viene invece presentato come scrittura incerta. Il timeout del client non dimostra un rollback server: idempotenza e riconciliazione durevole delle scritture tra nuove pagine/sessioni richiedono garanzie backend ulteriori e non vengono dichiarate risolte da questa modifica frontend.

### 24.2 Verifica duplicati e recupero delle route

`findOneCustomMoleculeByCanonicalSmiles_shortFetch()` non converte più `GqlDataError('NoData')` in esito negativo. Soltanto un campo atteso esplicitamente nullo significa assenza di duplicati. Campo mancante/undefined, dati incompleti, valore falso e errori GraphQL causano un errore; gli oggetti restituiti devono avere ID e SMILES. I consumer applicativi del metodo sono i due percorsi della pagina editor, entrambi con gestione dell’errore che blocca il salvataggio.

L’errore del caricamento edit viene contenuto nel ramo della singola richiesta: un successivo query-param valido viene ancora elaborato dallo stesso componente. Una navigazione di cambio vista rifiutata o fallita libera lo stato pendente, conserva il disegno e mostra un errore gestito.

### 24.3 Attese visibili e bounded admission

Lo scheduler espone coda, attesa di un’altra scheda e pausa con orario di ripresa. La barra fissa mostra rispettivamente “Richiesta in coda…”, “In attesa di un’altra scheda…” e “Pausa richieste. Ripresa alle …”. I messaggi di errore già acquisiti non vengono nascosti da un successivo job di analisi in attesa.

L’acquisizione del Web Lock ha una deadline separata di 15 secondi. Alla scadenza viene cancellato soltanto il waiter; una callback arrivata dopo la scadenza non invia la richiesta. Non viene sottratto il lock a un altro detentore e non viene interrotto anticipatamente un trasporto già ammesso. Restano invariati budget, rispetto di `Retry-After` e serializzazione tra schede.

La barra mantiene 56 px, con testo limitato visivamente a due righe e messaggio completo disponibile nel titolo e nel contenuto accessibile. Le azioni non vengono spostate dall’aggiunta di messaggi o retry.

### 24.4 Test permanenti e prove browser

- **98/98 test Angular mirati passati:** pagina, ciclo save, layout, scheduler, draft, servizio GraphQL, adapter e frame. La suite include 11 casi del ciclo salvataggio/recupero route, cancellazione e scadenza del waiter, cooldown e payload duplicati malformati.
- Dopo l’ultima modifica alla precedenza degli errori nella barra, **21/21 test layout e controlli globali passati**. Typecheck Angular, ESLint mirato e policy typing/styling con fixture negative passati. `git diff --check` passato.
- **Browser, invio ritardato simulato:** caricamento edit con item di fixture; canonicalizzazione e proprietà reali; update intercettato e trattenuto. Tre click producono una sola mutation simulata, pulsante disabilitato durante l’attesa. Il successivo disegno `CCCC` rimane corrente dopo la conferma di `CCC`; bozza `CCCC`, baseline persistita `CCC`, nessuna navigazione. Posizione delle azioni `562.1484375` px prima e dopo: spostamento **0 px**.
- **Browser, errore di scrittura simulato:** reads e mutation di fixture per isolare il caso; un solo invio, save disabilitato dopo l’errore, bozza `CCC` conservata e messaggio esplicito. Screenshot mobile ispezionato.
- **Web Lock reale tra due schede:** lock trattenuto nella prima, editor nella seconda. Prima della scadenza appare l’attesa; alla scadenza save disabilitato e zero POST canonici. Rilascio del lock e click “Riprova” portano a stato pronto con un solo POST.
- **Due schede concorrenti, letture reali:** entrambe pronte per `CCO` e `CCN`; due POST canonici complessivi e massimo **una** canonicalizzazione contemporanea. La prova aggiunge 400 ms al trasporto intercettato per rendere osservabile un’eventuale sovrapposizione.
- **HTTP 429 simulato con `Retry-After`:** pausa visibile, ripresa della lettura reale e convergenza. Una risposta duplicati `data: {}` intercettata lascia il save bloccato; ripristino del payload e retry recuperano lo stato pronto.
- **Mobile a layout stabilizzato:** azioni a `522.09375` px durante pausa e dopo successo, stessa posizione di scroll, barra 56 px, identità alta 139 px in entrambi gli stati, documento/client 380/380 px. Le misure vengono raccolte senza uno screenshot full-page intermedio, che può alterare viewport/scroll durante la cattura.

Le prove usano Playwright MCP nella sessione esistente, con eventi DOM sui controlli reali e `setMolecule()` sul vero Ketcher. Le mutation sono intercettate: nessuna scrittura reale al backend o al database. I tentativi di startup andati in timeout sono esclusi dalle prove positive; una successiva ispezione mostra il normale passaggio loading → ready. Le schede temporanee sono chiuse, le schede dell’utente preservate, nessun nuovo login o processo applicativo avviato/arrestato. Nessun commit, push o certificazione CI remota.

Le prove diagnostiche archiviate nella sezione 23 descrivono il codice precedente; la protezione corrente è nelle suite permanenti. Restano fuori dalla certificazione la matrice completa di strutture/browser/input nativi e le garanzie di identità/scrittura atomica server/database già distinte nell’audit.
