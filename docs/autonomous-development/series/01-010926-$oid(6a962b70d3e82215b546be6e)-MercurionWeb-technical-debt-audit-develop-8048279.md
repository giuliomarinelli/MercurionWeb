# MercurionWeb — diagnosi deterministica del debito tecnico

**Repository:** `giuliomarinelli/MercurionWeb`  
**Branch:** `develop`  
**Commit congelato:** `8048279c1f7cf65b7d46149e19ad039c4e47c5f3` (`NG | cve fixes`, 2026-08-28)  
**Perimetro primario:** `MercurionWebNg` (Angular 20) e `MercurionWebNode` (Nest 11)  
**Tipo di analisi:** statica integrale, multi-pass, più build/test/lint reali  

## Esito esecutivo

La codebase non richiede un singolo refactoring, ma una normalizzazione coordinata su tre livelli:

1. **Sistema distribuito:** contratti REST/GraphQL/WebSocket, autenticazione, errori, configurazione e modelli sono replicati o divergenti tra client e server.
2. **Angular:** lo stato applicativo è distribuito tra signal, context, storage, cookie, socket e tick di refetch; l'interfaccia usa decine di varianti locali per le stesse primitive; alcuni componenti contengono intere feature.
3. **Nest:** moduli e provider hanno ownership ambigua, i domini principali sono accoppiati da cicli, le transazioni e gli effetti esterni non seguono una semantica unica, e varie policy infrastrutturali sono duplicate.

Il registro seguente contiene **220 task atomici**. Ogni Definition of Done descrive esclusivamente lo stato finale desiderato; non prescrive il processo di implementazione.

## Baseline verificata

| Indicatore | Risultato al commit congelato |
|---|---:|
| File nel perimetro dei due progetti | 897 |
| File TypeScript analizzati | 765 |
| File TypeScript di produzione | 494 |
| Righe TypeScript di produzione | 54.373 |
| Componenti Angular | 98 |
| Template Angular | 97 inline, 1 esterno |
| Bottoni nativi nei template | 143 |
| Firme statiche distinte delle classi dei bottoni | 93, di cui 74 usate una sola volta |
| Componenti Angular con `OnPush` | 38 su 98 |
| Chiamate `.subscribe()` Angular di produzione | 143 |
| Accessi `localStorage` / `sessionStorage` / cookie | 55 / 27 / 6 |
| Cloni rilevati da jscpd | 218, 4.516 righe duplicate (8,52%) |
| Duplicazione template email Handlebars | 2.712 righe, 86,65% |
| Documenti GraphQL client | 69 |
| Documenti GraphQL invalidi rispetto allo schema server | 7 |
| Rotte REST client/server | 58 / 71; 0 chiamate client senza rotta server |
| Operazioni GraphQL con nome duplicato | 4 gruppi |
| Dichiarazioni modello | 702; 101 nomi presenti in entrambi i progetti |
| Ciclo principale dei moduli Nest | 11 moduli applicativi |
| Violazioni ESLint Nest | 149: 58 errori, 91 warning |
| Build Angular production | compilazione riuscita, comando fallito sul budget iniziale: 1,38 MB > 1 MB |
| Build Nest | riuscita |
| Test Angular | falliti in compilazione |
| Test Nest | 113 suite stampano `PASS`, comando complessivo fallito per `process.exit(1)` nella validazione env |

## Registro dei task

### A. Contratti e coerenza del sistema distribuito — 22 task

| ID | Problema e perimetro | Definition of Done |
|---|---|---|
| SYS-001 | DTO REST replicati e divergenti tra `MercurionWebNg/src/app/Models` e i DTO Nest | Ogni payload REST pubblico è generato da una sola specifica OpenAPI o da un package di contratto versionato; il client non mantiene copie manuali dei DTO server. |
| SYS-002 | Documenti e tipi GraphQL scritti manualmente nel client | Schema, documenti e tipi Angular sono collegati da GraphQL Code Generator; nessun response type GraphQL è duplicato a mano. |
| SYS-003 | Sette documenti GraphQL client non validi rispetto a `MercurionWebNode/src/schema.graphql` | Tutti i documenti GraphQL, incluse entrambe le espansioni dei quattro template dinamici, validano senza errori contro lo schema distribuito. |
| SYS-004 | Quattro query/mutation molecule-item applicano fragment DTO a `MoleculeCollectionItemEntity`, tipo incompatibile | Il modello GraphQL molecule-item espone una shape discriminata coerente e le quattro operazioni usano fragment validi per quella shape. |
| SYS-005 | Le mutation Notebook `DeleteLabNotebook`, `DeleteChapter`, `DeleteSection` dichiarano `String!` dove lo schema richiede `ID!` | Le tre variabili hanno tipo `ID!` e superano la validazione dello schema e un test di esecuzione. |
| SYS-006 | Nomi operazione duplicati: `GetChapterById`, `MyMoleculeItems`, `UpdateMoleculeCollection`, `UpdateMoleculeItemLabel` | Ogni documento GraphQL possiede un nome globale univoco e semanticamente corrispondente all'operazione eseguita. |
| SYS-007 | Operazioni GraphQL disperse tra file centrali, stringhe inline e template dinamici | Esiste un catalogo unico di documenti `.graphql` staticamente analizzabili; le selezioni variabili sono fragment nominati e tipizzati. |
| SYS-008 | `schema.graphql` è committato senza una garanzia automatica di allineamento ai resolver | La CI rigenera lo schema Nest e fallisce su qualunque drift non committato. |
| SYS-009 | Eventi Socket.IO sono stringhe replicate tra client e server | Nomi evento, payload, ack ed errori Socket.IO derivano da un unico registro tipizzato e versionato. |
| SYS-010 | Stato sessione comunicato mediante convenzioni separate REST, cookie e socket | Esiste un protocollo di sessione documentato e tipizzato con stati, transizioni, cause di scadenza e semantica di riconnessione identici sui due lati. |
| SYS-011 | Envelope degli errori divergenti tra REST, GraphQL e WebSocket | Tutti i transport serializzano lo stesso errore applicativo tipizzato: codice stabile, stato, messaggio pubblico, dettagli consentiti e correlation ID. |
| SYS-012 | Client e server interpretano codici errore tramite stringhe e mapping indipendenti | Il catalogo dei codici di errore è unico, esaustivo e verificato a compile time da producer e consumer. |
| SYS-013 | Enum e union duplicate con casing/valori divergenti nei due progetti | Tutti gli enum di contratto sono generati dalla fonte canonica e non esistono equivalenti locali con valori diversi. |
| SYS-014 | Tipi fingerprint copiati integralmente nei due progetti | La fingerprint ha uno schema canonico, una sola definizione serializzabile e test di compatibilità backward/forward. |
| SYS-015 | DTO RDKit copiati tra Angular e Nest | Input e output RDKit sono definiti una volta, validati al boundary e consumati da entrambi i progetti senza copie manuali. |
| SYS-016 | Modelli API mescolati a stato UI (`collapse`, trigger di animazione, inferenze composte) | I DTO di trasporto sono immutabili e separati dai view model; nessun campo esclusivamente UI attraversa il boundary API. |
| SYS-017 | `Maybe` importato da un percorso interno di `graphql` in entrambi i progetti | Tutti i tipi nullish usano primitive TypeScript o un alias applicativo pubblico; nessun import dipende dagli internals di `graphql`. |
| SYS-018 | 14 rotte server non hanno consumer HTTP Angular, incluse documents, OAuth browser, admin e test | Ogni rotta server è classificata come browser/system API, consumer esterno documentato, feature UI attiva o endpoint da rimuovere; non restano API orfane senza ownership. |
| SYS-019 | Backend Synth completo senza consumer Angular | La feature Synth è esplicitamente inclusa nel prodotto con client e contract test oppure rimossa dal runtime e dallo schema; non resta codice zombie. |
| SYS-020 | Backend e frontend Notebook esistono, ma l'albero Angular non è raggiungibile dalle route | Notebook è una feature raggiungibile e coperta end-to-end oppure viene eliminato integralmente da client, schema e server. |
| SYS-021 | Compatibilità REST verificata solo implicitamente | Una suite contract esegue tutte le 58 chiamate Angular contro il contratto Nest e blocca mismatch di verbo, path, query, body, status o response. |
| SYS-022 | Versionamento dei payload non esplicito | Tutti i contratti pubblici incompatibili hanno una strategia di versionamento e deprecazione verificabile; client e server dichiarano la versione supportata. |

### B. Configurazione, autenticazione e stato Angular — 36 task

| ID | Problema e perimetro | Definition of Done |
|---|---|---|
| FE-001 | Dieci file importano direttamente `environment.development`, bypassando le file replacement | Tutto il codice applicativo importa esclusivamente `environment`; una regola statica impedisce import di file environment specifici. |
| FE-002 | Flag incoerenti: staging contiene `testing: true`; testing contiene `production: true` e `testing: false` | Ogni configurazione Angular soddisfa uno schema tipizzato con semantica non contraddittoria e un test verifica i valori generati per dev, test, staging e production. |
| FE-003 | URL, modalità beta/feedback e versione sono replicati negli environment | Endpoint e capability sono derivati da una configurazione runtime/build canonica; nessuna feature legge flag sovrapposti o versioni hard-coded. |
| FE-004 | Auth state distribuito tra `AuthService`, `UserContextService`, `SessionSyncService`, componenti, cookie e storage | Esiste un unico auth store/facade con una macchina a stati esplicita; ogni consumer legge stato derivato e invia comandi senza mutare persistenza direttamente. |
| FE-005 | Guard, app shell e session sync applicano criteri diversi per determinare il login | Un solo selector `authenticated` considera token, sessione, cookie, iniziali e scadenza; guard, UI e socket usano quel selector. |
| FE-006 | Componenti e servizi leggono/scrivono direttamente chiavi di storage e cookie | Persistenza auth e sessione è incapsulata in un adapter tipizzato; fuori dall'adapter non esistono accessi diretti a tali chiavi. |
| FE-007 | `login_firstStep` memorizza gli scope e subito dopo `logout()` elimina `scp` | Al completamento di ogni variante login gli scope validi sono presenti e coerenti; un test copre con e senza MFA e impedisce la regressione. |
| FE-008 | `BroadcastChannel` auth emette eventi ma non ha listener né flusso completo | Login/logout cross-tab usa un solo meccanismo bidirezionale verificato oppure il canale è rimosso; tutte le tab convergono allo stesso stato. |
| FE-009 | Logout elimina lo stato locale prima dell'esito server | Logout ha una semantica unica per successo, rete assente e rifiuto server; lo stato finale non può restare parzialmente autenticato. |
| FE-010 | Account recovery cancella integralmente `localStorage` e `sessionStorage` | Recovery rimuove solo chiavi Mercurion esplicitamente versionate; preferenze e dati non correlati restano intatti. |
| FE-011 | `redirect_to` e `redirectAfterLogin` hanno producer, consumer e sanitizzazione divergenti | Esiste un redirect store unico, one-shot e same-origin; ogni ingresso auth usa la stessa validazione e non può produrre open redirect. |
| FE-012 | Dati di pre-autorizzazione e MFA sono oggetti liberi in session storage | Lo stato pre-auth è una union discriminata con scadenza, schema di validazione e consumo atomico; payload invalidi conducono a uno stato sicuro. |
| FE-013 | `AuthInterceptor` e `AuthFallbackInterceptor` gestiscono entrambi l'invalidazione sessione | Un unico interceptor classifica l'errore auth e invia un solo evento allo store; nessuna risposta può provocare doppio logout o doppia navigazione. |
| FE-014 | `lastHttpErr`, errori MFA e mapping dei messaggi sono distribuiti | Errori auth sono stato effimero tipizzato con lifecycle esplicito; nessun errore obsoleto sopravvive a una nuova autenticazione. |
| FE-015 | Tre richieste auth inviano `X-Mock-IP: 91.122.12.8` dal client | Il browser non invia header di simulazione IP in build non di test; i mock sono confinati in fixture/interceptor di test. |
| FE-016 | Token access, token socket, cookie, scope e iniziali hanno lifecycle indipendenti | Un'unica session entity governa creazione, refresh, revoca e pulizia atomica di tutte le credenziali derivate. |
| FE-017 | Lock, polling e retry WebSocket sono implementati manualmente e dispersi | La connessione socket è una state machine cancellabile con backoff limitato, jitter, timeout e terminal state osservabile. |
| FE-018 | Event handler socket e subscription non sono centralmente rilasciati | Ogni listener socket appartiene a una connection scope e viene rimosso deterministicamente a logout, reconnect o destroy. |
| FE-019 | Policy di route pubbliche/riservate duplicate tra environment, guard e app component | Access policy e layout policy derivano dai `data` delle route; non esistono liste parallele di path pubblici. |
| FE-020 | Cache `providedEmail` di `AccountService` non è legata all'utente o al logout | Le cache account hanno owner, TTL e invalidazione espliciti; il cambio sessione non può mostrare dati del precedente account. |
| FE-021 | `AppComponent` contiene una macchina auth/route di 174 righe nel costruttore | L'app shell compone facade e outlet; non contiene orchestrazione auth, timer, storage o branching di navigazione. |
| FE-022 | `lastProgrammaticNav` può sopprimere navigazioni future verso lo stesso target | La prevenzione dei loop è transaction-scoped e si resetta sempre; una navigazione valida futura non viene mai ignorata. |
| FE-023 | Action overlay gestisce scope, pending state, timer e chiusure con transizioni implicite | L'overlay possiede una union di stati esaustiva; apertura, submit, successo, errore, annullamento e chiusura sono transizioni valide e testate. |
| FE-024 | `LoadingContextService` e `SearchContextService` duplicano flag e timeout non cancellati | Transizioni loading/search usano un unico controller cancellabile; l'ultima intenzione vince e nessun timeout obsoleto cambia lo stato. |
| FE-025 | Quattro action context e vari service usano tick globali per forzare refetch | Aggiornamenti di dominio producono eventi/comandi tipizzati o invalidazioni di query con payload; non esistono tick numerici anonimi. |
| FE-026 | `effect()` e subscription annidate producono richieste concorrenti non cancellate | Ogni pipeline asincrona dipendente dallo stato usa latest-wins, concat o exhaust in modo esplicito; non esistono subscription annidate. |
| FE-027 | Subscription a `valueChanges`, RDKit e Notebook non sono sempre legate al lifecycle | Ogni stream di componente termina con `takeUntilDestroyed`, async pipe o equivalente; il test lifecycle non rileva observer residui. |
| FE-028 | Listener DOM, timer e `requestAnimationFrame` hanno cleanup disomogeneo | Ogni risorsa browser ha un owner e cleanup deterministico; retry RAF e timer sono limitati e si arrestano se il target non compare. |
| FE-029 | Solo 38 componenti su 98 usano `OnPush` | Tutti i componenti di produzione usano OnPush o signal-compatible change detection; le eccezioni sono zero o documentate e testate. |
| FE-030 | API Angular moderne e legacy sono miste (`@Input`, EventEmitter, ViewChild, `inject`) | I componenti standalone adottano uniformemente input/output/query signal e injection funzionale secondo una convenzione automatizzata. |
| FE-031 | `AppContextService` aggrega global scroll ref, tick dashboard e segnali con ownership eterogenea | Scroll host, refresh di dominio e app-shell state hanno store/facade separati; `AppContextService` non è un contenitore globale generico. |
| FE-032 | Chiavi storage sono literal sparse e non hanno schema/versione/migrazione | Esiste un registry di chiavi namespaced e versionato con codec e migrazione; valori legacy/corrotti sono gestiti deterministicamente. |
| FE-033 | Produzione contiene `console.*` di debug e un `debugger` nel molecule-item service | Il bundle production non contiene debugger o log ad hoc; diagnostica consentita passa da un logger con livello e redazione dati. |
| FE-034 | Theme state e listener di preferenza sistema sono gestiti in più punti UI | Un solo theme store possiede preference, system fallback, DOM class e listener; header/footer consumano stato senza mutarlo. |
| FE-035 | Path, titoli, redirect e metadata di navigazione sono stringhe replicate | Un route manifest tipizzato è fonte unica per path generation, title, access policy e navigation metadata. |
| FE-036 | Action context conservano scope/payload globali e possono riaprire stato precedente | Ogni apertura action crea una sessione isolata con input immutabile e result one-shot; close/destroy elimina sempre payload e pending state. |

### C. Design system e normalizzazione UI Angular — 28 task

| ID | Problema e perimetro | Definition of Done |
|---|---|---|
| UI-001 | 143 bottoni producono 93 firme statiche di classi, 74 singleton | Esiste un `Button` stateless canonico con variant, size, icon placement, loading, disabled e button type tipizzati; tutti i bottoni applicativi lo usano. |
| UI-002 | Close button e icon-only button sono replicati negli action component | Esiste un `IconButton` accessibile con varianti e accessible name obbligatorio; nessun controllo icon-only duplica markup o classi. |
| UI-003 | Footer con primary/secondary action ripetuto nei form e negli overlay | Esiste un `ActionFooter` stateless che normalizza ordine, responsive layout, pending e disable state; tutti i flussi azione lo compongono. |
| UI-004 | Input text hanno 20 firme di classi, 16 singleton, e label/error markup divergente | Esiste un field text canonico con label, hint, error, required, prefix/suffix e stato disabilitato; form e validazione usano lo stesso contratto. |
| UI-005 | Textarea e contatori caratteri duplicano struttura e stile | Esiste una textarea canonica accessibile con resize policy, limite, contatore e messaggio errore; nessun feature component ne replica il markup. |
| UI-006 | Select, combo-select e multi-select implementano focus, filtro e opzioni separatamente | Esiste un select core accessibile con adattatori single/multi, ricerca, empty state e keyboard navigation; le varianti condividono logica e stile. |
| UI-007 | Search field, clear button e debounce sono ricostruiti in più pagine | Esiste un `SearchField` stateless con value/output, clear, pending e label accessibile; il debounce resta nella facade chiamante. |
| UI-008 | Checkbox, toggle e switch usano markup e colori non uniformi | Esiste una primitive selection-control canonica con semantica ARIA, label, description, checked, indeterminate e disabled. |
| UI-009 | Elementi cliccabili alternano `button`, anchor e handler su contenitori | Ogni azione usa `button`, ogni navigazione usa link/routerLink e nessun `div` interattivo resta privo di ruolo, tastiera e focus. |
| UI-010 | Modal, action overlay e pannelli dialog hanno shell divergenti | Esiste una dialog/overlay shell unica con focus trap, restore focus, Escape, backdrop policy, scroll lock, titolo e descrizione ARIA. |
| UI-011 | Sei action component replicano `action-card-close-btn` e struttura header/body | Esiste un action-card shell stateless; titolo, close, body, footer e larghezze responsive non sono duplicati nei singoli action. |
| UI-012 | Loading, empty, error e retry state sono rappresentati diversamente nelle feature | Esiste una page/section state primitive esaustiva che rende loading, empty, error, content e retry con semantica uniforme. |
| UI-013 | Spinner e skeleton legacy/nuovi coesistono e non rispettano sempre la geometria finale | Esiste un set unico di progress indicator e skeleton; ogni skeleton replica dimensioni/layout del contenuto e rispetta reduced motion. |
| UI-014 | Collection card e collection-select card duplicano presentazione e selezione | Esiste una collection card presentazionale unica con slot/action e stato selectable opzionale; route e overlay usano la stessa primitive. |
| UI-015 | Molecule item card, search result e varianti salvate divergono in azioni e metadati | Esiste una molecule summary card canonica alimentata da un view model discriminato; azioni e badge sono configurazioni, non fork di markup. |
| UI-016 | Paginazione, load-more e stato pagina sono implementati in ogni feature | Esiste una primitive pagination/infinite-load accessibile con un solo modello page/cursor e stato pending/error standard. |
| UI-017 | Tab e sezioni espandibili hanno indicatori/focus locali | Esistono tabs e disclosure canonici conformi ai pattern ARIA; keyboard navigation, active state e focus ring sono uniformi. |
| UI-018 | `ToastService` importa un tipo dal componente e crea il ciclo service ↔ component | Il modello toast vive in un modulo UI neutro; service e renderer dipendono dal modello e il ciclo di import è assente. |
| UI-019 | Colori, spacing, radius, shadow e typography sono codificati in classi locali | Esiste un set di design token semantici per tutte le proprietà visuali; componenti e pagine non usano valori raw salvo asset dichiarati. |
| UI-020 | Hex hard-coded, token duplicati e `219C6F` senza `#` causano divergenze di tema | Tutti i colori validano sintatticamente, appartengono alla palette semantica e producono contrasto WCAG verificato nei due temi. |
| UI-021 | Classi CSS deprecated dei bottoni convivono con utility raw | Le classi legacy sono eliminate dopo la migrazione alle primitive; il bundle CSS non contiene alias o regole di bottone inutilizzate. |
| UI-022 | Composizione di classi e variant è fatta con concatenazioni locali | Ogni primitive espone una variant API tipizzata e genera classi deterministicamente; nessun caller conosce dettagli Tailwind interni. |
| UI-023 | `drawer`, scrollbar e altre utility globali sono duplicate o invalide (`scrollbar-width: 3px`) | Ogni utility globale ha una sola definizione valida e cross-browser; duplicati e dichiarazioni CSS ignorate sono zero. |
| UI-024 | Refusi di classi come `dark:dark:bg` non sono rilevati | Build e lint CSS/Tailwind rifiutano utility invalide; tutte le classi dinamiche necessarie sono enumerabili e presenti nel CSS finale. |
| UI-025 | Accessibilità di form, icone, focus e live feedback varia per componente | Una suite axe/keyboard copre tutte le primitive e i flussi critici con zero violazioni bloccanti e focus order deterministico. |
| UI-026 | Layout overlay e viewport math sono calcolati localmente con listener multipli | Esiste un solo viewport/scroll adapter reattivo; overlay e drawer non replicano listener, breakpoints o calcoli di altezza. |
| UI-027 | Animazioni Angular legacy e `provideAnimations` sono ancora dipendenze applicative | Le transizioni usano CSS `animate.enter`/`animate.leave` o primitive equivalenti; `@angular/animations` e provider deprecati non sono richiesti. |
| UI-028 | Primitive UI non hanno un catalogo verificabile | Tutte le primitive canoniche sono documentate in un catalogo interattivo con stati, variant, accessibilità e regression test visuali. |

### D. Modularità, data flow e performance Angular — 28 task

| ID | Problema e perimetro | Definition of Done |
|---|---|---|
| NG-001 | `sensitive-data-change.action.component.ts` contiene 1.558 righe e più workflow | Email, telefono, password, enable/config MFA e backup code sono use case/componenti indipendenti dietro una facade; il container non contiene form o branch specifici. |
| NG-002 | `settings.component.ts` contiene 1.112 righe e 32 metodi | Ogni pannello settings è una feature lazy autonoma con facade e presentational components; la pagina compone soltanto navigazione e sezioni. |
| NG-003 | `add-molecules-to-collection.action.component.ts` contiene 928 righe e logiche ripetute | Ricerca, selezione, chip, paginazione e submit sono moduli separati riusabili; l'action è un orchestratore sottile. |
| NG-004 | `header.component.ts` contiene 770 righe e 488 righe di template | Header, account menu, navigation, responsive menu e session indicator sono componenti presentazionali distinti alimentati da una sola facade. |
| NG-005 | Molecule detail concentra fetch, trasformazioni, inferenza e 146 righe in `fetchData` | Una facade compone query indipendenti e cancellabili; sezioni detail ricevono view model pronti e non orchestrano servizi. |
| NG-006 | Ticket detail mescola query, thread, composer, paginazione e ruoli | Thread, message item, composer e toolbar sono componenti separati; una ticket facade espone stato discriminato e comandi autorizzati. |
| NG-007 | Pagina MFA contiene una `ngOnInit` di 160 righe con molti rami | Ogni strategia MFA implementa lo stesso contratto di step; la pagina seleziona una strategia e rende una state machine esaustiva. |
| NG-008 | Login component combina form, fingerprint, redirect, SSO, MFA ed errori | Credential form, SSO chooser e login flow sono separati; una auth facade governa la state machine e il componente non accede a storage o HTTP. |
| NG-009 | Dashboard concentra caricamento, trasformazione grafici e rendering | Ogni widget ha un query/view-model adapter e un componente presentazionale lazy; il dashboard layout non elabora dataset. |
| NG-010 | Collection detail mescola routing, query, item actions, filtri e pagination | Esiste una collection-detail facade con stato unico; toolbar, grid e pagination sono componenti indipendenti senza refetch tick. |
| NG-011 | `AuthService` ha 451 righe e 38 metodi per transport, token, cache e flow | Transport auth, credential/session repository e orchestrazione sono servizi distinti con API pubbliche minime e ownership non sovrapposta. |
| NG-012 | `SessionSyncService` ha 430 righe e 22 metodi per socket, lock e persistenza | Connessione, protocollo socket e sincronizzazione sessione sono adapter separati; il service pubblico espone solo stato e comandi di sessione. |
| NG-013 | Molecule item GraphQL service unisce documenti, mapping e policy di cache | Document registry, generated client e mapper di view model sono separati; il service non costruisce query string né restituisce `any`. |
| NG-014 | Custom save, bind, select-collection e create-collection replicano picker e submit flow | Esiste un collection-picker feature module riusabile con modalità tipizzate; tutte le action condividono query, selezione e feedback. |
| NG-015 | Creazione nome, chip list e collision handling sono replicati negli action component | Esistono primitive/domain helpers unici per naming e selezione; validazione e messaggi sono identici in ogni caller. |
| NG-016 | Componenti condividono comportamento tramite classi base di pagination | La paginazione è composizione tramite facade/service tipizzato; nessun componente eredita stato o lifecycle da una base class UI. |
| NG-017 | Combo select e combo multiselect hanno cloni sostanziali | Un unico combobox core implementa filtro, focus, overlay e option model; single e multi sono adapter sottili. |
| NG-018 | Ketcher e RDKit sono conosciuti direttamente dai componenti | Editor e renderer chimici sono adapter lazy con lifecycle, error boundary e API applicativa stabile; i componenti non importano SDK vendor. |
| NG-019 | `MoleculeViewer` mantiene subscription RDKit senza ownership esplicita | Il viewer acquisisce e rilascia l'istanza RDKit deterministicamente e non conserva subscription dopo la distruzione. |
| NG-020 | Action overlay importa eager tutte le nove action e usa switch di stringhe | Un registry tipizzato associa scope a lazy loader, input e result; aggiungere un'action non richiede modificare switch centrali. |
| NG-021 | Error handling dei form HTTP è replicato tra login, register, recovery e account | Esiste un form-error adapter tipizzato che mappa field/global errors; i componenti non duplicano parsing o reset dei messaggi. |
| NG-022 | Pagine 403 e 404 duplicano 23 righe e hanno layout paralleli | Un unico status-page component riceve status, testo e call-to-action; 403 e 404 sono configurazioni di route. |
| NG-023 | Apollo usa prevalentemente `watchQuery(..., fetchPolicy: 'network-only')` per letture one-shot | Ogni query dichiara una policy cache/fetch motivata; letture one-shot non mantengono watcher e nessun refetch dipende da tick globali. |
| NG-024 | Cache Apollo non ha type policy, merge pagination o update mutation coerenti | Entity key, pagination merge, invalidazione e optimistic/update policy sono definite centralmente e coperte da test. |
| NG-025 | Bundle iniziale supera il budget e librerie pesanti entrano in chunk consistenti | Quill, RDKit, chart/dashboard e action non iniziali sono lazy; la build production rispetta i budget senza alzarli per mascherare il peso. |
| NG-026 | 98 occorrenze di `any`, non-null assertion e form parzialmente tipizzati | Codice Angular di produzione compila in strict mode senza `any` impliciti/espliciti non giustificati e usa typed non-nullable forms. |
| NG-027 | Due cicli di import: Toast e AddMolecules ↔ SearchResult | Il grafo Angular è aciclico; navigazione/selezione e modelli toast vivono in contratti neutrali senza dipendenze component-to-service inverse. |
| NG-028 | 31 file non raggiungibili dal grafo statico includono modal, redirect, spinner, Notebook e servizi legacy | Ogni file è collegato a un entrypoint esplicito o rimosso; la CI segnala nuovi moduli orfani e il grafo non contiene feature zombie. |

### E. Architettura e infrastruttura Nest — 35 task

| ID | Problema e perimetro | Definition of Done |
|---|---|---|
| BE-001 | Auth, Help, History, Meili, MercurionAI, MoleculeCollection, Notification, OAuth2, Redis, SSO e User formano un solo SCC | I moduli di dominio dipendono da porte/API pubbliche direzionali; il grafo applicativo Nest non contiene cicli tra moduli. |
| BE-002 | `JwtToolsService`, Scope e User formano un ciclo di servizi | Identità, token e autorizzazione dipendono da interfacce unidirezionali; nessun service core usa `forwardRef` o injection circolare. |
| BE-003 | `config.ts`, `config.types.ts` e helper environment formano un ciclo | Il package config ha un grafo aciclico con schema, tipi derivati e factory che dipendono in una sola direzione. |
| BE-004 | Provider core sono dichiarati in più moduli (`JwtToolsService`, `SessionService`, `JwtService`, `ResponseService`, `RedisService`) | Ogni provider stateful ha un solo modulo owner e una sola istanza per application context; i consumer importano l'owner. |
| BE-005 | `SocketIoModule` è importato due volte in `AppModule` | Socket.IO è inizializzato esattamente una volta e i suoi provider/gateway hanno lifecycle univoco. |
| BE-006 | Moduli esportano `TypeOrmModule` e dipendono direttamente dai repository di altri domini | Ogni dominio esporta soltanto porte/use case pubblici; repository ed entity manager restano privati al modulo owner. |
| BE-007 | `AccountService` ha 1.047 righe, 43 metodi e 14 dipendenze | Registrazione, activation, profile, credential recovery e sensitive-data changes sono use case separati; nessuna classe applicativa supera un dominio di responsabilità. |
| BE-008 | Authentication service/controller combinano più step login, SSO, refresh, logout e session management | Ogni flow auth è un command handler/use case con input/output tipizzati; controller e resolver non orchestrano step di dominio. |
| BE-009 | MFA service ha 858 righe, 31 metodi e 13 dipendenze | Challenge issuance, delivery, verification, enable/disable e backup codes sono servizi distinti dietro un contratto di strategia comune. |
| BE-010 | `SessionService` ha 604 righe e 41 metodi per storage, indici, token e policy | Session domain service e Redis session repository sono separati; serializzazione, key schema e mutation atomiche non appartengono agli use case. |
| BE-011 | `GlobalGuard.canActivate` concentra 278 righe e complessità 62 | Estrazione credenziali, autenticazione, refresh, session validation e authorization scope sono guard/policy composabili e testate isolatamente. |
| BE-012 | Controller grandi gestiscono parsing Fastify, response shaping e dominio | Tutti i controller sono transport adapter sottili: validazione, chiamata a un use case e restituzione di un DTO, senza logica applicativa. |
| BE-013 | `http-status-map` contiene 1.033 righe e il filter interpreta stringhe/casi speciali | Eccezioni applicative sono classi/codici tipizzati con status associato; nessuna lookup table testuale gigante o parsing di messaggio decide lo status. |
| BE-014 | REST filter, GraphQL `errorFormatter` e socket error path duplicano mapping | Un solo error presenter produce le tre rappresentazioni di transport e preserva la stessa classificazione e observability metadata. |
| BE-015 | 37 file dipendono direttamente dal logging Meilisearch | Il codice applicativo dipende da una `LoggerPort` strutturata; Meili è un adapter sostituibile e nessun dominio importa il suo modulo. |
| BE-016 | Env class, config factory e coercion list duplicano oltre cento proprietà | Esiste uno schema config unico che valida, converte e genera tipi; ogni proprietà ha source, default consentito e vincolo dichiarati una volta. |
| BE-017 | La validazione env chiama `process.exit(1)` durante l'import e invalida i test | Importare moduli non termina il processo; un config error tipizzato viene sollevato solo al bootstrap e i test possono iniettare config isolata. |
| BE-018 | `APP_ENV` sconosciuto cade implicitamente su development | Valori environment non riconosciuti falliscono in modo chiuso; non esiste fallback silenzioso verso credenziali o policy development. |
| BE-019 | Porta NATS predefinita è 4223 in main/config e 4222 nel modulo MercurionAI | Endpoint NATS deriva da una sola proprietà validata e ogni producer/client usa lo stesso valore effettivo. |
| BE-020 | `main.ts` contiene 253 righe di plugin, parser, GraphQL, socket, asset e process handling | Bootstrap è composto da configuratori coesi e testabili; `main` crea l'app, applica configurazione canonica e avvia il listener. |
| BE-021 | Mancano shutdown hooks e la policy dei global process error si limita al log | SIGTERM/SIGINT e fatal error arrestano intake, chiudono HTTP/socket/NATS/Redis/DB e terminano entro un timeout osservabile. |
| BE-022 | `trustProxy: true`, CORS config e rate-limit fail-open non hanno una policy ambientale unica | Proxy hops/origins/rate-limit failure mode sono configurati e validati per ambiente; richieste non fidate non possono falsificare IP o origin. |
| BE-023 | Redis key, namespace e unità TTL sono stringhe sparse | Esiste un key builder tipizzato per dominio e TTL usa una sola unità esplicita; collisioni e scadenze errate sono bloccate da test. |
| BE-024 | Pub/sub Redis dipende da keyspace notifications e degrada a warning se assenti | Readiness verifica le capability Redis obbligatorie e impedisce traffico se la configurazione non supporta il protocollo di sessione. |
| BE-025 | `TestController` è registrato nell'applicazione di produzione | Route e provider di test sono esclusi dal graph production e possono essere abilitati soltanto da un test application module. |
| BE-026 | Naming divergente/refuso: `SercurityService`, `sercurity.service`, `recover-cretentials`, `Unauthanticated`, `DTO`, `Models`, `socket.IO` | File, simboli, error code e directory rispettano una convenzione unica; alias/refusi legacy non sono esportati. |
| BE-027 | TypeScript disabilita `noImplicitAny`, `useUnknownInCatchVariables`, `strictBindCallApply` e fallthrough check | Il progetto compila con strictness completa, catch `unknown`, bind sicuro e switch senza fallthrough implicito; nessuna eccezione globale li disattiva. |
| BE-028 | 16 file backend non raggiungibili includono DTO e interfacce legacy | Ogni file backend è importato da un entrypoint reale o eliminato; un controllo di dead-code impedisce nuove unità orfane. |
| BE-029 | Argomenti `page`/`limit` e forme di pagination sono replicati nei resolver | Esiste un input pagination unico con limiti min/max, default e ordinamento stabile; tutti i resolver restituiscono lo stesso page model. |
| BE-030 | Client OAuth/SSO usano Axios direttamente con mapping errori e timeout locali | Tutte le chiamate HTTP esterne passano da un adapter Nest condiviso con timeout, retry consentito, cancellation, metriche e errori tipizzati. |
| BE-031 | `TypeOrmUtils.addJoins` riceve alias divergenti dal query builder Synth (`step` vs `route`/`moleculeRefs`) | Il selection planner deriva alias e relation path da metadata tipizzati; tutte le projection Synth generano join validi e testati. |
| BE-032 | Subject NATS e payload RPC sono stringhe/shape locali | Esiste un registry NATS tipizzato con subject, request, response, timeout ed error contract; producer e consumer compilano contro la stessa definizione. |
| BE-033 | Chiamate MercurionAI/RDKit non condividono limiti, timeout e failure policy | Gli adapter scientifici validano dimensione/input, applicano timeout e circuit/backpressure policy e restituiscono errori applicativi stabili. |
| BE-034 | Timestamp usano forme `Date`, stringa e numero senza convenzione unica | Persistenza e API adottano un'unica semantica temporale UTC con tipo/precisione dichiarati e conversione solo ai boundary. |
| BE-035 | UUID/ID sono validati da pipe/scalar/regex non uniformi | Ogni ID pubblico usa un validator/scalar canonico per formato e versione; controller e resolver rifiutano gli stessi valori invalidi. |

### F. Persistenza, domini ed effetti esterni Nest — 37 task

| ID | Problema e perimetro | Definition of Done |
|---|---|---|
| DATA-001 | Non esistono migration TypeORM e lo schema dipende da `synchronize` configurabile | Ogni modifica schema è una migration versionata; `synchronize` è impossibile fuori da database development usa-e-getta e la CI verifica lo schema da zero. |
| DATA-002 | Vincoli e indici dipendono in parte da controlli applicativi | Foreign key, unique key, indici di lookup/ordinamento e check di dominio necessari sono dichiarati nello schema e coperti da test di integrità/concorrenza. |
| DATA-003 | Transazioni usano `dataSource.transaction`, manager di repository e `QueryRunner` con semantiche diverse | Esiste una unit-of-work canonica; tutto il lavoro di una transazione usa il suo manager e commit/rollback/release sono sempre awaited e automatici. |
| DATA-004 | `UserService.updateUser` legge tramite repository esterno e non attende rollback/release | L'update utente usa esclusivamente il transaction manager; successo, errore e rollback lasciano connessioni e dati in stato verificato. |
| DATA-005 | Onboarding di molecole/collection iniziali è copiato tra activation account e SSO | Esiste un solo workspace initializer idempotente usato da ogni modalità di registrazione e autenticazione iniziale. |
| DATA-006 | Creazione utente e onboarding possono essere ripetuti da retry concorrenti | Registration, activation e SSO callback hanno idempotency key/vincoli; lo stesso evento non crea utenti, collection o molecole duplicate. |
| DATA-007 | Lock, tentativi, cooldown e invio OTP sono ripetuti tra Account, MFA, Authentication e Feedback | Esiste una policy engine atomica per attempts/rate limits con contatori, finestre e lock tipizzati; commenti e valori runtime non possono divergere. |
| DATA-008 | `HelpService.createTicket` formatta `publicId` due volte e può restituire un ID casuale diverso dal persistito | Il public ID ticket è prodotto una sola volta da dati validi e resta identico in DB, API, email e log; input invalido fallisce senza fallback casuale. |
| DATA-009 | Help invia email dopo il commit e un errore mail può far fallire una richiesta già persistita | Creazione/messaggio/chiusura ticket registrano un evento outbox nella stessa transazione; retry mail è idempotente e non altera l'esito del command. |
| DATA-010 | Help muta entity TypeORM per nascondere campi e costruire viste | Entity persistence non sono mai restituite o mutate come response; presenter/mappers producono DTO user/support immutabili e tipizzati. |
| DATA-011 | Autorizzazione close/reopen e visibilità messaggi differiscono tra resolver user/support | Command e query ticket applicano una policy owner/role unica; tutte le entrypoint condividono gli stessi permessi verificati. |
| DATA-012 | I 13 template email Handlebars duplicano l'86,65% delle righe | Layout, header, footer, typography e blocchi comuni sono partial condivisi; i template contengono soltanto contenuto specifico e context tipizzato. |
| DATA-013 | Mail sender replica caricamento template, subject e context per metodo | Esiste un registry di template tipizzato con subject, context schema e renderer; inviare una mail non duplica orchestrazione o path asset. |
| DATA-014 | Asset email sono copiati con path e comandi diversi tra bootstrap e Dockerfile | Template/partial sono dichiarati una volta come build asset e presenti nello stesso path in dev, test, staging e production. |
| DATA-015 | LabNotebook, Chapter, Section e Page replicano CRUD/move/reorder | Esiste un ordered-tree domain/repository comune con adapter per livello; invarianti e operazioni di struttura non sono copiate tra quattro service. |
| DATA-016 | Reorder Notebook costruisce `CASE` SQL interpolando UUID | Tutti gli ID di reorder sono parametri bindati e nessun valore utente viene concatenato in SQL. |
| DATA-017 | Reorder/move non garantisce set completo, unicità e ownership degli ID | Ogni command valida duplicati, appartenenza, completezza e target parent in modo atomico; input parziale o cross-owner non modifica l'ordine. |
| DATA-018 | Posizioni `max + 1` e reorder concorrenti non hanno un'invariante DB esplicita | Ordine sibling è univoco e consistente sotto concorrenza grazie a vincolo/locking appropriato; test paralleli non producono collisioni o gap non previsti. |
| DATA-019 | Synth update/delete possono restituire successo con zero righe o convertire ogni errore in `false` | Ogni command Synth distingue updated/deleted, not found, forbidden e failure; nessun errore infrastrutturale è mascherato come esito business. |
| DATA-020 | Update dei riferimenti Synth propaga DTO con ID dentro entity e separa ownership/read/write | Patch Synth contiene solo colonne modificabili e applica ownership, existence e write nella stessa transazione. |
| DATA-021 | `MoleculeCollectionResolver.itemsCount` esegue una count per parent | Conteggi collection sono caricati in batch/aggregate o precomputati; il numero di query non cresce linearmente con il numero di collection. |
| DATA-022 | Join service molecule contiene un metodo bulk di 139 righe | Selection planning, ownership validation e write set sono unità separate; il command bulk ha complessità limitata e output tipizzato. |
| DATA-023 | Ownership di collection/item/molecule viene ricontrollata con query e messaggi diversi | Esiste una policy/repository ownership unica e batch-aware; tutti i command producono lo stesso risultato per owner, missing e forbidden. |
| DATA-024 | Operazioni `selectAll` non definiscono snapshot, limite e retry semantics | Ogni bulk command dichiara filtro/snapshot, massimo elementi, atomicità e idempotenza; retry non duplica join né agisce su righe comparse dopo lo snapshot. |
| DATA-025 | Profile registry esegue conteggi sequenziali e combina letture dentro/fuori transazione | Il profilo è una query projection coerente ottenuta con aggregate/batch sullo stesso snapshot e con un numero di query costante. |
| DATA-026 | Upload documenti effettua parsing multipart Fastify manuale in controller | Multipart è validato da un transport adapter/pipe con DTO tipizzato, limiti dimensione/MIME e streaming; il controller non analizza parti raw. |
| DATA-027 | Dropbox service concentra upload, metadata, DB e cleanup in 158 righe/10 parametri | Object storage è una porta; document command usa un input object tipizzato e separa storage, metadata e authorization. |
| DATA-028 | Fallimenti tra Dropbox e DB possono lasciare file orfani o metadata senza oggetto | Upload/delete implementano compensation/outbox idempotente; un reconciler rileva e risolve ogni divergenza tra database e storage. |
| DATA-029 | Indicizzazione Meili e security audit sono effetti sincroni/pervasivi nei domini | Mutazioni registrano eventi/outbox; indexer e audit consumer sono idempotenti, osservabili e non cambiano il commit del dominio su errore esterno. |
| DATA-030 | Sessioni Redis usano scansioni, hash e aggiornamenti multi-step non uniformemente atomici | Ogni utente/sessione possiede indici diretti e serialization schema; create/refresh/revoke sono operazioni atomiche senza `SCAN` nel request path. |
| DATA-031 | OAuth/SSO `state` ha lettura e cancellazione separabili sotto retry/concorrenza | Lo state OAuth è monouso, atomically consumed, TTL-bound e legato a provider/sessione/redirect; replay e cross-provider reuse falliscono. |
| DATA-032 | Lifecycle e protezione dei token OAuth provider non hanno un boundary unico | Token provider sono cifrati a riposo, minimizzati, owner-scoped, revocabili e cancellati secondo retention esplicita; non appaiono in log/DTO. |
| DATA-033 | History costruisce query/projection e mapping con pattern separati dal resto dei domini | Esiste un read model History paginato, stabile e batch-aware; query e presenter non caricano entity/relazioni non richieste. |
| DATA-034 | Email, notifiche, indexing e audit sono avviati con semantiche diverse rispetto al commit | Tutti gli effetti esterni conseguenti a una mutazione usano un event/outbox boundary comune, idempotente e osservabile. |
| DATA-035 | Public ID sono formattati e talvolta rigenerati dai service durante la lettura | Ogni public ID ha un value object/constraint canonico e viene persistito o derivato deterministicamente; nessun presenter inventa fallback. |
| DATA-036 | Più update propagano DTO/parziali direttamente nelle entity | Ogni command usa una allowlist di campi modificabili e mapper esplicito; ID, owner, audit field e relation non sono mass-assignable. |
| DATA-037 | Valori Redis sessione non hanno versioning/migrazione dello schema serializzato | Ogni record Redis porta una versione decodificata da codec validato; deploy rolling gestisce la compatibilità e scarta dati invalidi in modo osservabile. |

### G. Test, qualità, delivery e governo della repository — 34 task

| ID | Problema e perimetro | Definition of Done |
|---|---|---|
| QA-001 | Test Angular non compilano: spec app usa `title` inesistente e redirect component importa un service da path errato | `npm test -- --watch=false` compila ed esegue l'intera suite con exit code 0 su checkout pulito. |
| QA-002 | Test Nest importano AppModule e la validazione env termina Jest con `process.exit(1)` | `npm test` usa un test application context/config esplicito, non termina durante gli import e restituisce exit code 0. |
| QA-003 | 100 test Angular e 79 Nest sono smoke test quasi esclusivamente `should be created/defined` | Ogni unità mantenuta ha test di comportamento su input, output, errori e invarianti; smoke test senza asserzione di dominio non contano nella quality gate. |
| QA-004 | Macchina auth Angular, redirect, cross-tab e session sync non hanno copertura sistematica | Una suite deterministica copre tutte le transizioni auth/session, race, refresh, logout, storage corrotto e reconnect con fake clock/transport. |
| QA-005 | Overlay/action/form complessi non sono protetti da test di stato e accessibilità | Ogni action flow verifica pending, double-submit, cancel, server error, success, focus restoration e keyboard navigation. |
| QA-006 | Guard globale, auth, MFA e session Redis Nest hanno copertura insufficiente rispetto alla complessità | Test unitari/table-driven coprono ogni ramo di autenticazione, scope, refresh, revoca, lock e failure infrastrutturale. |
| QA-007 | Resolver Help, Notebook, Molecule e Synth hanno aree senza spec adiacenti | Ogni resolver pubblico ha test di authorization, validation, not-found, mapping errori e delega corretta al use case. |
| QA-008 | Invarianti transazionali e concorrenza non sono testate con un database reale | Test di integrazione verificano rollback, idempotenza, reorder concorrente, vincoli, outbox e retry su PostgreSQL compatibile con production. |
| QA-009 | Angular non ha un framework E2E configurato nonostante il README lo suggerisca | Esiste una suite browser E2E eseguibile in CI per login/MFA, collection/molecule, settings e help, con dati isolati e artefatti su failure. |
| QA-010 | E2E Nest è sostanzialmente bootstrap e non esercita i servizi esterni | La suite E2E avvia dipendenze isolate compatibili (Postgres, Redis, NATS/adapter) e verifica REST, GraphQL e WebSocket attraverso transport reali. |
| QA-011 | Compatibilità tra build frontend e backend non viene provata insieme | Una system test matrix avvia gli artefatti della stessa versione e completa i flussi critici senza mock di contratto. |
| QA-012 | Non esistono soglie di coverage orientate al rischio | CI impone branch/function coverage per auth, session, transaction, policy e mappers; esclusioni sono nominate e approvate, non globali. |
| QA-013 | Angular non espone uno script lint applicativo | `npm run lint` controlla TypeScript, template Angular, accessibilità e boundary imports con zero errori su tutta la produzione. |
| QA-014 | Script Nest lint applica `--fix` e il check read-only rileva 58 errori/91 warning | Esistono comandi separati `lint` read-only e `lint:fix`; la quality gate accetta zero errori e zero warning. |
| QA-015 | Regole architetturali (cicli, layer, import environment, accessi storage) sono convenzioni implicite | Static architecture tests bloccano cicli, dipendenze di layer inverse, import environment specifici e accessi browser persistence fuori dagli adapter. |
| QA-016 | Non sono presenti workflow `.github` per i due progetti | Una pipeline su PR/push esegue install locked, typecheck, lint, test, build, schema/contract validation e audit architetturali per Angular e Nest. |
| QA-017 | Budget Angular fallisce a 1,38 MB iniziali e CommonJS produce optimization bailout | CI conserva budget iniziale/lazy per configurazione e accetta zero bailout CommonJS non esplicitamente autorizzati. |
| QA-018 | Duplicazione jscpd è 8,52% totale e 86,65% nei template email | CI impone baseline e soglie decrescenti per TS/HTML/HBS; nessun nuovo clone oltre la soglia minima entra nel branch. |
| QA-019 | Dead code e dependency cycles sono stati rilevati solo da audit ad hoc | CI genera il grafo dei due progetti e fallisce su nuovi file orfani, cicli applicativi o dipendenze vietate. |
| QA-020 | Dockerfile Nest usa `npm install` nonostante il lockfile | Ogni image build usa `npm ci` con lockfile immutabile e fallisce se package manifest e lock divergono. |
| QA-021 | Container runtime girano come root; Dockerfile Nest production/staging non dichiarano un `CMD` | Ogni image ha utente non-root, entrypoint/CMD esplicito, filesystem/porte compatibili e smoke test dell'image standalone. |
| QA-022 | Sei Dockerfile duplicano quasi integralmente build dev/test/staging/prod | Angular e Nest hanno un Dockerfile parametrico per progetto con stage riusabili; differenze ambientali sono arg/config, non fork di istruzioni. |
| QA-023 | Runtime Nest copia l'intero `node_modules` di build con toolchain native/dev | L'image runtime contiene soltanto dipendenze production necessarie e asset dichiarati; SBOM e vulnerability scan descrivono il contenuto effettivo. |
| QA-024 | Dipendenze deprecate/legacy: Angular animations, Thumbmark v0, CommonJS Quill/RDKit path, `subscriptions-transport-ws`, `scmp`, vecchio `nats` | Ogni dipendenza deprecata è aggiornata/sostituita o ha owner, motivazione e scadenza; install/build non emettono warning deprecation non accettati. |
| QA-025 | `patch-package` modifica dipendenze senza un controllo esplicito di lifecycle | Ogni patch ha test, upstream reference, owner e condizione di rimozione; CI verifica che applichi pulita e che non sia rimasta dopo l'upgrade. |
| QA-026 | Repository contiene backup/snapshot/result manuali (`package.json.131225.bk`, `package@10Snapshot.json`, `jest-results.json`, `notebook.txt`, `docs.txt`) | Artefatti generati e backup locali sono rimossi e ignorati; ogni file committato ha un ruolo di sorgente, fixture o documentazione dichiarato. |
| QA-027 | README Angular è stock/stale e README Nest descrive stack/config non più corrispondenti | Documentazione root e per progetto riporta versioni reali, setup, ambienti, architettura, test, build e dipendenze infrastrutturali verificati dalla CI. |
| QA-028 | Versione compare in package, environment Angular, label image e release config con valori indipendenti | Un'unica release version alimenta client, server, image label e deployment; endpoint/UI espongono lo stesso build identifier e commit. |
| QA-029 | Variabili e immagini sono replicate tra Docker Compose, Dockerfile e manifest Kubernetes | Deployment config deriva da uno schema/overlay canonico; nomi, porte, env obbligatorie, secret reference e image version non divergono tra ambienti. |
| QA-030 | Probes e lifecycle deployment non sono collegati a readiness reale delle dipendenze/shutdown | Readiness segnala capacità di servire, liveness solo deadlock, startup copre bootstrap e termination grace completa lo shutdown senza richieste perse. |
| QA-031 | Logging e performance non hanno criteri di regressione sistemici | Ogni richiesta propaga correlation ID su HTTP/GraphQL/socket/NATS, metriche misurano query/cache/latency/error rate e benchmark bloccano regressioni concordate. |
| QA-032 | Branch `develop` non è protetto e non ha required checks | `develop` richiede PR, review e tutte le quality gate verdi; push diretto/merge con controlli falliti non sono consentiti. |
| QA-033 | Supply chain e segreti non hanno gate repository/image dichiarate | CI esegue secret scan, dependency/license scan, SBOM e image vulnerability scan; artifact release è firmato e riferito per digest. |
| QA-034 | Aggiornamenti dependency sono reattivi e non hanno finestra/owner | Ogni dipendenza ha update automation, policy di semver e owner; patch di sicurezza compatibili aprono PR verificate entro una finestra definita. |

## Difetti logici e di contratto confermati

Questi rilievi non sono inferenze basate soltanto sulla dimensione o sulla somiglianza del codice: la condizione è stata verificata direttamente nel flusso o con validatori/build.

| Condizione verificata | Impatto | Task che la chiude |
|---|---|---|
| Dieci import diretti di `environment.development` restano tali anche nelle build staging/production | Build production può mantenere `production: false`, `beta: true`, feedback staging e versione development | FE-001–FE-003 |
| `login_firstStep` scrive gli scope, poi invoca una pulizia che elimina `scp` | Login senza MFA può completare senza scope client coerenti | FE-004–FE-007 |
| Guard legge la sola chiave `login`; session sync richiede anche initials/cookie | UI, route e socket possono classificare la stessa tab in stati diversi | FE-004–FE-006, FE-016 |
| Interceptor auth e fallback reagiscono entrambi allo stesso errore fatale | Doppio side effect di logout/navigazione | FE-013 |
| Recovery usa `localStorage.clear()` e `sessionStorage.clear()` | Cancellazione di dati e preferenze non appartenenti al flow | FE-010 |
| `HelpService.createTicket` applica due volte il formatter a `publicId` | L'ID restituito può diventare casuale e differire dal valore stabile | DATA-008 |
| `UserService.updateUser` non attende rollback/release e legge fuori dal transaction manager | Letture non coerenti e cleanup concorrente della connessione | DATA-003–DATA-004 |
| Sette documenti GraphQL non validano contro lo schema committato | Errori GraphQL runtime deterministici per quelle operazioni | SYS-003–SYS-005 |
| Selection/join Synth passa alias non coerenti al builder (`step` vs `route`/`moleculeRefs`) | Join SQL potenzialmente costruiti su alias inesistente | BE-031, DATA-019–DATA-020 |
| `itemsCount` esegue una query count per collection | N+1 lineare nel resolver | DATA-021 |
| Test Nest importano env validation che chiama `process.exit(1)` | 113 suite stampano PASS ma il processo termina comunque in errore | BE-017, QA-002 |
| Build Angular emette bundle 1,38 MB contro budget massimo 1 MB | Artifact production non supera la quality gate corrente | NG-025, QA-017 |
| Dockerfile Nest production/staging terminano senza `CMD` | Image non è avviabile standalone senza override esterno | QA-021 |

## Hotspot strutturali coperti dal registro

| Area | Hotspot osservato | Normalizzazione coperta da |
|---|---|---|
| Angular | `sensitive-data-change.action.component.ts`: 1.558 righe, template 903 righe | NG-001, UI-003–UI-006, UI-011 |
| Angular | `settings.component.ts`: 1.112 righe, 32 metodi | NG-002 |
| Angular | `add-molecules-to-collection.action.component.ts`: 928 righe | NG-003, NG-014–NG-016 |
| Angular | `header.component.ts`: 770 righe | NG-004 |
| Angular | `molecule-detail.component.ts`: `fetchData` 146 righe, complessità 32 | NG-005, NG-018, NG-023–NG-025 |
| Angular | `app.component.ts`: costruttore 174 righe, complessità 56 | FE-004–FE-006, FE-019–FE-022 |
| Angular | `auth.service.ts`: 451 righe, 38 metodi | FE-004–FE-018, NG-011 |
| Angular | `session-sync.service.ts`: 430 righe, 22 metodi | FE-016–FE-018, NG-012 |
| Nest | `account.service.ts`: 1.047 righe, 43 metodi, 14 dipendenze | BE-007, DATA-005–DATA-007 |
| Nest | MFA service: 858 righe, 31 metodi, 13 dipendenze | BE-009, DATA-007 |
| Nest | `session.service.ts`: 604 righe, 41 metodi | BE-010, BE-023–BE-024, DATA-030 |
| Nest | User service: 560 righe | BE-002, DATA-003–DATA-004 |
| Nest | Help service: 541 righe | DATA-008–DATA-011 |
| Nest | Global guard: metodo 278 righe, complessità 62 | BE-011 |
| Nest | HTTP exception filter: handler RPC 103 righe, complessità 59 | BE-013–BE-014 |
| Nest | Dropbox upload: 158 righe e 10 parametri | DATA-026–DATA-028 |

## Famiglie di duplicazione coperte

| Famiglia rilevata | Evidenza | Task di destinazione |
|---|---:|---|
| Template email | 20 clone, 2.712 righe duplicate | DATA-012–DATA-014 |
| MFA enable/disable/challenge | 22 clone, 226 righe duplicate nel relativo hotspot | BE-009, DATA-007 |
| Help user/support | 10 clone, 110 righe duplicate | DATA-009–DATA-011 |
| Notebook chapter/section/page | 10 clone, 90 righe più strutture parallele | DATA-015–DATA-018 |
| Molecule item Angular | 12 clone, 116 righe nel service | SYS-002–SYS-007, NG-013 |
| Add-molecules action | 10 clone, 106 righe | NG-003, NG-014–NG-016 |
| Bind/select/save collection | flussi e markup paralleli | UI-014–UI-016, NG-014–NG-016 |
| Combo select/multi-select | 5 clone/53 righe per variante | UI-006, NG-017 |
| Login/SSO completion | blocco comune di 38 righe | FE-004–FE-018, NG-008 |
| 403/404 | 23 righe duplicate | NG-022 |
| Fingerprint cross-stack | 57 righe identiche | SYS-014 |
| RDKit DTO cross-stack | 20 righe identiche | SYS-015 |
| Provider OAuth Discord/LinkedIn | client e mapping paralleli | BE-030 |
| Seed account/SSO | onboarding duplicato | DATA-005–DATA-006 |

## Metodo di scansione

La diagnosi è stata eseguita sul commit congelato, materializzato dalla repository GitHub, con passate indipendenti e poi riconciliate:

1. inventario completo di file, estensioni, righe e configurazioni dei due progetti;
2. parsing AST di tutti i 765 file TypeScript, inclusi test, dichiarazioni, metodi, complessità e API sensibili;
3. grafo degli import con reachability, strongly connected components e file orfani;
4. scansione dei 98 componenti e di tutti i template Angular per tag, class signature, primitive UI e change detection;
5. scansione specifica dello stato Angular: subscription, effect, listener, timer, storage, cookie, route, auth e socket;
6. scansione GraphQL: estrazione di 69 documenti, espansione delle query dinamiche, validazione sullo schema e collisione dei nomi;
7. scansione REST: confronto normalizzato fra 58 chiamate client e 71 route server;
8. confronto strutturale di 702 dichiarazioni modello e dei nomi cross-project;
9. rilevazione cloni multi-linguaggio con jscpd, separando TypeScript e Handlebars;
10. scansione Nest per moduli/provider, controller/resolver, query builder, transaction, Redis, NATS, mail e storage esterno;
11. inventario e classificazione delle suite/spec e delle unità prive di test comportamentali;
12. install locked, build Angular/Nest, test Angular/Nest e lint Nest read-only.

### Confini della diagnosi

- Il registro descrive integralmente il codice presente nei due progetti al commit indicato e le configurazioni repository che ne governano build/deploy.
- I servizi esterni reali e i dati production non sono stati interrogati: gli incidenti dipendenti da dati, carico o configurazioni segrete non vengono presentati come fatti.
- Reachability statica è stata confrontata con route/config/build; i file caricati solo tramite meccanismi dinamici non dimostrabili sono stati classificati come da collegare o rimuovere, non dichiarati automaticamente inutili.
- Le 14 route senza chiamata `HttpClient` non sono tutte errori: OAuth browser, asset e health sono state mantenute come categorie esplicite nel task SYS-018.
- I task non includono stime, ordine di esecuzione o implementazione: ciascuna voce è intenzionalmente una condizione finale verificabile.

## Criterio di completamento del programma di normalizzazione

Il debito censito è saldato quando tutti i 220 task risultano soddisfatti sullo stesso commit candidato, le quality gate QA-001–QA-034 sono verdi su checkout pulito e non esistono deroghe non versionate ai contratti, ai boundary o alle regole architetturali definite nel registro.
