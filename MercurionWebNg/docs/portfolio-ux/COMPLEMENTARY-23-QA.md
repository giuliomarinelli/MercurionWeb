# Pagine complementari — blocco 23 / PX-17 e PX-18

30 ottobre 2026. **Implementazione pronta per review; QA browser ancora aperta.** Questo blocco riguarda feedback, contatti, 403/404, privacy e termini. Non modifica backend, policy legali, feature flag o segreti.

## Modifiche

### Feedback e valutazioni

- Introduzione più breve e distinzione esplicita fra suggerimenti e richieste di assistenza, con collegamento a `/help`.
- Rimossa l’affermazione «completamente anonimo»: il controller passa l’utente autenticato e `MercurionWebNode/src/app_modules/feedback/services/feedback.service.ts` assegna `feedback.userId = userId` prima del salvataggio. La UI dichiara ora che il feedback è associato all’account. Nessuna modifica alla raccolta dati o ai documenti legali.
- Campi facoltativi, almeno una valutazione o un testo; limite di 4000 caratteri coerente con il DTO backend. Invio con il pulsante condiviso e controlli disabilitati durante la richiesta.
- Corretto il pending che rimaneva attivo dopo un errore, perché il vecchio codice lo ripristinava solo in `complete`. Errore o risposta senza ID conservano tutti i valori; nessun retry automatico. Conferma esplicita prima di svuotare il form.
- Animazione originale di conferma conservata: il timer parte alla conferma, anziché all’avvio della richiesta. Nuovi input e distruzione cancellano il timer precedente. Reduced motion disabilita l’animazione.
- Valutazioni rappresentate da radio con etichette italiane, un solo punto di tabulazione per gruppo, frecce, Home/End e cancellazione. Target da 44 px e layout che consente al controllo di cancellazione di andare a capo. Conservati entrambi i tracciati SVG della stella, la stella introduttiva e l’effetto di scala; risorse del breve effetto possedute dal componente.

### Contatti e pagine di stato

- Canali di assistenza, email e PEC distinti e leggibili. L’utente autenticato raggiunge Supporto e Feedback; quello anonimo raggiunge Login con destinazione `/help`, oppure può usare l’email.
- Indirizzi originali conservati, con wrapping e link `mailto:`. Link alle policy senza separatori isolati su righe mobili.
- 403/404 nel normale flusso del documento, senza contenitore assoluto o sovrapposizione alla shell. Titoli e azioni si adattano a larghezze ridotte; conservati copia, codice, ritorno alla cronologia e destinazioni Home/Dashboard. Focus iniziale senza scroll nativo aggiuntivo.

### Documenti

- Larghezza di lettura, gerarchia dei titoli, spaziatura e link sempre riconoscibili tramite sottolineatura. I controlli Axe hanno rilevato link distinguibili solo dal colore: la correzione resta limitata a queste pagine, senza modificare il componente globale dei link.
- Sommario nativo espandibile ricavato dai titoli già presenti, con destinazioni reali e navigazione da tastiera.
- Direttiva condivisa `DocumentNavigationDirective` per privacy e termini, basata su `ScrollContextService`, `ShellLayoutService` e `BrowserResourceOwner` già esistenti. Conservati `#terms` e `#aup`; l’offset usa l’altezza reale dell’header. Focus sul frammento, attesa limitata della geometria, annullamento delle richieste obsolete e delle risorse alla distruzione.
- Testi, dati identificativi e date delle due policy **identici a HEAD**, escluso il nuovo sommario che ripete i titoli esistenti. Verifica eseguita sul testo normalizzato tramite parser HTML, senza affidarsi a una regex per i tag con attributi Tailwind. Entrambe le versioni restano `27/10/2026`.

Tailwind 4 per il nuovo layout; nessuna nuova dipendenza o design system. Il solo CSS locale del feedback riguarda l’animazione già presente e reduced motion.

## File principali

- `pages/feedback/feedback.page.component.ts` e relativi test; nuovo `complementary-layout.spec.ts`.
- `components/feedback/star-rating/star-rating.component.ts` e test.
- `pages/contacts/contacts.page.component.ts` e test.
- `pages/status-page/status-page.component.ts` e test.
- `pages/privacy/privacy.page.component.ts`, `pages/terms-and-policies/terms-and-policies.page.component.ts` e test.
- Nuova direttiva `components/common/document-navigation/document-navigation.directive.ts` e test.

I percorsi sono relativi a `MercurionWebNg/src/app`.

## Verifica locale

- **33 test mirati superati**, inclusi i 7 del setup canonico: invio/errore/conferma e timer, pending, bozza e distruzione, rating da tastiera, varianti contatti, destinazioni 403/404, sommari e navigazione ai frammenti. Le esecuzioni intermedie non vanno sommate.
- Geometria con DOM e CSS reali in iframe Karma: cinque superfici a 320, 375, 640, 768 e 1280 px nei due temi, per **50 combinazioni**. Altezza del frame 320 px; assenza di overflow orizzontale e azioni delle pagine di stato nel flusso. Non è una prova di tastiera mobile o di navigazione nel runtime completo.
- Axe sulle cinque superfici nei due temi: nomi, semantica e contrasto, senza escludere `link-in-text-block`. I due casi di tema fallivano prima della sottolineatura dei link e sono stati rieseguiti dopo la correzione.
- Lint mirato, typecheck, build production, gate bundle/lazy, styling e semantica interattiva superati. Bundle iniziale **949.948 / 1.000.000 byte**, 21 moduli CommonJS. Nessuna modifica alle soglie; warning preesistenti dei budget iniziale e CSS conservati.
- Confronto automatico con HEAD: contenuto delle policy identico, tutti i tracciati SVG delle due componenti feedback conservati.

Da `MercurionWebNg`:

```powershell
..\node_modules\.bin\ng.cmd test --watch=false --karma-config=karma.conf.js --include=src/app/pages/feedback/*.spec.ts --include=src/app/pages/contacts/*.spec.ts --include=src/app/pages/privacy/*.spec.ts --include=src/app/pages/terms-and-policies/*.spec.ts --include=src/app/pages/status-page/*.spec.ts --include=src/app/components/feedback/star-rating/*.spec.ts --include=src/app/components/common/document-navigation/*.spec.ts --include=src/app/services/feedback.service.spec.ts
```

Artefatti locali: `C:/Users/giuli/.codex/artifacts/mercurion-complementary-23-2026-10-30/`, con `focused-tests.log`, `production-build.log` e `preservation.json`.

## Playwright MCP e accettazione residua

Usato esclusivamente il canale Playwright MCP; nessun Computer Use, browser CLI, logout o invio reale di feedback. Tre chiamate hanno restituito timeout di 300 secondi, inclusa l’ultima prova dopo la riconnessione comunicata dall’utente; un ulteriore tentativo in attesa è stato interrotto. Questi timeout non sono attribuiti all’applicazione. **Nessuna accettazione visiva o screenshot runtime dichiarati.** Non è possibile confermare l’inventario delle schede attraverso il canale che non risponde.

Prima dell’accettazione:

1. Playwright sul runtime `http://localhost:8888`, con POST `/api/feedback` intercettate: errore, pending, successo ritardato, conferma e digitazione successiva; nessun invio reale come prova grafica.
2. Contatti autenticati e anonimi, destinazioni, contrasto e focus nei due temi.
3. 403/404 a 320 px e con poco spazio verticale; Home/Dashboard e ritorno indietro.
4. Footer → privacy/termini/AUP, sommario, focus, header sticky, accesso diretto con frammento e cronologia avanti/indietro.
5. Safari fisico, tastiera, zoom e review manuale; CI sul commit risultante.

Nessuna operazione Git di scrittura o modifica di processi dell’utente. Il blocco successivo pianificato è **24 / PX-20 — reattività percepita**, dopo la review e la verifica browser di questo intervento.
