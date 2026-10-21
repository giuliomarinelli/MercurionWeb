# Editor molecolare: HTTP 429 su REST/GraphQL e aggiornamenti intermittenti dell’identità

## Scheda pronta per Trello

- **Titolo:** Editor molecolare — richieste REST/GraphQL in 429 durante il disegno e identità molecolare non sempre aggiornata.
- **Tipo:** Bug, con indagine tecnica preliminare necessaria.
- **Stato:** Aperto; risoluzione rinviata a una sessione dedicata.
- **Data della segnalazione:** 21 ottobre 2026, Europe/Rome.
- **Area:** Angular, integrazione Ketcher tramite iframe, canonicalizzazione remota, lookup GraphQL, rate limiting Nest/Fastify.
- **Impatto:** L’uso interattivo dell’editor può saturare le richieste consentite; nome e SMILES canonico possono fallire, restare non aggiornati o sembrare dipendenti da una nuova interazione con l’iframe.
- **Priorità suggerita:** Alta, da confermare nel triage; interessa il flusso principale di disegno. Non sono stati dimostrati perdita di dati o impatti in produzione.
- **Vincolo esplicito:** Non sostituire la canonicalizzazione remota con RDKit.js/WASM nel browser. La sua esclusione da questo percorso era intenzionale; la motivazione va acquisita prima di rivalutare tale scelta.

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

**Esito del triage:** bug ancora aperto. Il report non propone una soluzione approvata e non certifica una correzione; prepara un’indagine separata su volume delle richieste, recupero dopo errori e sincronizzazione dell’iframe.
