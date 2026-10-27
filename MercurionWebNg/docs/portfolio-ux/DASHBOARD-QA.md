# Blocco 18 / PX-12 — Dashboard

27 ottobre 2026. **Implementato, in review.** Intervento limitato alla dashboard Angular; accettazione grafica manuale ancora aperta.

## Comportamento implementato

- Saluto, avatar con iniziali e colori originali conservati. Quattro contatori con descrizioni esplicite e numeri nel formato italiano, su quattro colonne desktop e due mobile.
- Composizione e attività affiancate da 1280 px, impilate sotto questo breakpoint. Conservate le tre categorie del grafico originale e le palette dei due temi.
- Legende con pulsanti nativi utilizzabili da tastiera, stato `aria-pressed` e valori esatti della composizione. Tabella espandibile con i dati giornalieri dell’attività, senza dipendere da hover o colore.
- L’attività rappresenta le **risorse distinte per giorno presenti nella cronologia negli ultimi sette giorni**: non il numero totale di operazioni. Verificata la deduplicazione backend per giorno, tipo e identificativo; mappers e contratti non modificati.
- Workspace vuoto e assenza di attività gestiti separatamente. L’unico accesso rapido aggiunto rimanda alla route esistente `/molecules` dal workspace vuoto.
- Skeleton iniziale e placeholder dei grafici con la stessa geometria delle card finali. Durante un aggiornamento restano visibili i dati precedenti; un errore mostra il retry e chiarisce che i valori non sono aggiornati. Evitate richieste accodate dopo la distruzione.
- Chart.js rimane differito. Un solo effetto dopo il rendering gestisce creazione/aggiornamento; visibilità delle serie conservata al cambio tema/dati e istanze distrutte in uscita.

Stili realizzati con Tailwind 4 e token esistenti, senza nuovi file CSS. Nessun intervento su SSO, backend, feature flag, segreti o impostazioni dell’ambiente.

## Verifica automatica

Baseline mirata: **12 test superati**. Finale: **29 test superati**, di cui 22 della dashboard e 7 canonici inclusi dalla configurazione Karma.

```powershell
# Da MercurionWebNg
..\node_modules\.bin\ng.cmd test --watch=false --karma-config=karma.conf.js --include=src/app/pages/profile/dashboard.page.component.spec.ts --include=src/app/pages/profile/dashboard/*.spec.ts
..\node_modules\.bin\ngc.cmd -p tsconfig.app.json --noEmit
```

Le suite esercitano il facade reale attraverso risposte del servizio, retry nativo, errori iniziali e di refresh, annullamento in uscita; Chart.js reale con dataset, legende, aggiornamenti e cleanup; geometria di skeleton e contenuto con CSS reale in iframe a 320, 375, 768 e 1280 px nei due temi. Incluse cifre elevate, nome lungo, stati vuoti e resize immediato desktop → mobile.

Durante lo sviluppo i controlli geometrici hanno rilevato quattro casi con una differenza di 6 px tra skeleton e card. Un’ulteriore prova di resize ha rilevato nei due temi **598 px di contenuto in 305 px disponibili**, prima del callback di ResizeObserver: canvas e griglia sono ora vincolati al contenitore. Conservati i log prima dei fix; comprendono anche errori intermedi delle asserzioni di test e non costituiscono una certificazione di ogni regressione possibile.

Typecheck/template, ESLint dei nove file TypeScript, formattazione coerente senza terminatori opzionali, styling con quattro fixture negative e controlli colori/token superati. I controlli colori/token coprono le coppie e i file governati dal repository, non ogni pixel della dashboard.

Production build riuscita; gate bundle e separazione lazy della chimica superati. Iniziale **951.540 byte / 1.000.000**. Restano i warning di budget iniziale da 500 kB e dei CSS di editor, creazione collezione e aggiunta molecole, esterni a questo intervento. Nessuna soglia modificata.

Karma è terminato con exit code 0 e 29 successi, ma ha emesso warning durante la chiusura di ChromeHeadless. Al controllo successivo non risultavano processi Chrome headless residui. Nessun runtime dell’utente fermato.

## Browser e prove

Chrome autenticato tramite Computer Use, su `http://localhost:8888/dashboard`, con i processi di sviluppo esistenti autorizzati dall’utente. Dataset reale: 20 molecole, di cui 1 personale e 19 ChEMBL, e 4 collezioni. Nessuna risorsa creata, aggiornata o eliminata per la prova.

Misurati 320, 375, 768 e 1280 px nei due temi: `scrollWidth <= clientWidth`, due plot alti 192 px e card da 496 px su mobile / 464 px da 640 px. Screenshot finali desktop e mobile ispezionati in entrambi i temi. Provati da tastiera il toggle della legenda e l’apertura/chiusura della tabella a sette righe, con focus visibile.

Artefatti locali: `C:/Users/giuli/.codex/artifacts/mercurion-dashboard-18-2026-10-27/`.

- `before-desktop.png`: stato iniziale.
- `desktop-light.png`, `desktop-dark.png`, `mobile-light.png`, `mobile-dark.png`: risultato finale.
- `activity-table-keyboard.png`: tabella e focus tastiera.
- `browser-measurements.json`: misure DOM delle viewport provate.
- Log di baseline, test finali, build, styling e prove geometriche prima dei fix.

Le catture contengono dati dell’account di sviluppo: materiale di verifica locale, da anonimizzare prima dell’uso pubblico nel portfolio.

## Limiti e seguito

Account nuovo, errori e aggiornamenti concorrenti verificati con fixture; non è stato provocato un guasto del backend reale. Le misure geometriche non sono una misura del CLS dell’intera applicazione. Safari su iPhone, zoom reale e accettazione manuale del design restano aperti. Nessuna CI remota, commit o merge eseguiti.

Prossimo blocco: **19 / PX-13 — Settings, fasi successive**, preservando il layout già scelto; flussi SMS subordinati al porting INF-02.
