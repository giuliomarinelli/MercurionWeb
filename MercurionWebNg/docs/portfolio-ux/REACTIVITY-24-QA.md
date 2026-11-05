# Reattività percepita — blocco 24 / PX-20

30 ottobre 2026. **Implementato, in review.** Ambito: attese, caricamento differito, errori e recupero di ricerca, azioni, editor, dettaglio molecolare e dashboard. La QA browser ancora aperta del blocco 23 resta indipendente: la riconnessione Playwright avvenuta in questo blocco non la certifica retroattivamente.

## Misure iniziali

Playwright MCP sul runtime di sviluppo `http://localhost:8888`, con la sessione già autenticata e una scheda QA dedicata. Nessuna pulizia della cache browser o dei dati dell’utente. Tempi indicativi misurati nello stesso snippet dal comando UI/goto fino al controllo pronto; includono il costo del comando Playwright e, dove specificato, bootstrap e richieste dati. Campione di una prima apertura e una ripetizione: **non sono benchmark, Core Web Vitals o tempi di produzione**.

| Superficie | Prima prova valida | Ripetizione | Punto finale |
|---|---:|---:|---|
| Ricerca | 291 ms dialog, 321 ms input | 398 ms dialog, 427 ms input | Dialog visibile e input presente, poi due frame |
| Nuovo ticket | 1272 ms | 156 ms | Editor Quill reale con etichetta accessibile |
| Editor dalla navigazione | 4423 ms | 2393 ms | Iframe Ketcher con `aria-busy=false` |
| Dashboard, accesso diretto | 960 ms | 812 ms | Canvas del widget, portato nel viewport |
| Dettaglio molecolare | 1157 ms dal risultato di ricerca | 1088 ms da reload | SVG del viewer di dettaglio |

La ripetizione del dettaglio usa un ingresso diverso e non isola il costo della cache. Le prime aperture non equivalgono a cache HTTP fredda. Non è stato introdotto un budget di latenza sulla base di queste poche osservazioni. L’editor impiega alcuni secondi ma mostra già il proprio stato di caricamento; non sono stati modificati scheduler, canonicalizzazione, cache o servizi scientifici per inseguire il valore misurato.

Esclusi dalle misure: ingresso manuale nell’editor privo dei parametri previsti dalla navigazione, un timer iniziato dopo il click, una prova con un’altra scheda QA attiva e un’intercettazione di chunk che ha interferito col bootstrap anziché col singolo blocco differito.

## Interventi

- Ricerca e pannello azioni: feedback esplicito per `@loading` e `@error` prima che sia disponibile l’implementazione differita. La segnalazione iniziale è leggera e non modale: non anticipa un secondo dialog o un secondo focus trap; il dialog effettivo prende il controllo quando è pronto. Annullamento/chiusura ed Escape rimangono disponibili. Il reload è solo una scelta esplicita in caso di errore del modulo, mai automatico.
- Passaggio fra ActionComponents: il contenuto precedente resta montato per preservare la geometria, ma diventa `inert` durante il caricamento del successivo. Stato visibile e annullamento sostituiscono l’attesa senza feedback; non è possibile continuare a usare un form appartenente alla sessione precedente.
- Action loader: errore visibile, chiusura e **Riprova caricamento** nella stessa sessione. Il retry riguarda solo il caricamento dell’implementazione, non riesegue comandi o scritture. Le risposte obsolete restano ignorate. Focus sul controllo iniziale a caricamento concluso e sui controlli di recupero dopo un errore.
- Grafici della dashboard: `@error` esplicito, contatori conservati e azione di ricaricamento deliberata. La geometria del placeholder viene conservata anche nel ramo d’errore; la parte decorativa smette di pulsare e non viene annunciata come caricamento ancora attivo.
- Reduced motion: spin del viewer di dettaglio e pulse del caricamento Ketcher disattivati quando richiesto. Indicatore canonico, fade dei badge, transizioni esistenti e icone scelte dall’utente conservati.

Tailwind 4 per il nuovo layout. Nessuna nuova dipendenza o modifica al backend, ai feature flag o agli algoritmi scientifici.

## Verifiche

**67 test mirati superati in un’unica esecuzione finale**, inclusi i 7 del setup. Non sommare le esecuzioni intermedie.

- Stati `Loading`/`Error` dei blocchi Angular controllati con `DeferBlockBehavior.Manual`: chiusura, errore, reload solo su click, contatori e geometria dei grafici.
- Loader delle azioni: inert sul vecchio contenuto, retry nella stessa sessione, recupero del focus, fasi di pending e dismiss invariati. Copertura precedente di viewer/Ketcher, cancellazioni, risposte obsolete, grafici e smooth resize rieseguita.
- Axe sul feedback differito nei due temi, senza esclusioni di contrasto o nomi accessibili.
- Typecheck, lint mirato, build production, gate bundle/lazy, styling e semantica interattiva superati. Soglie invariate; warning preesistenti iniziale/CSS conservati.
- Bundle iniziale **958.259 / 1.000.000 byte**, 21 moduli CommonJS. Rispetto al build del blocco 23: +8.311 byte per il feedback disponibile prima del caricamento dei pannelli. RDKit e Ketcher rimangono fuori dal main.

Da `MercurionWebNg`:

```powershell
..\node_modules\.bin\ng.cmd test --watch=false --karma-config=karma.conf.js --include=src/app/app-deferred-feedback.spec.ts --include=src/app/app.component.spec.ts --include=src/app/pages/profile/dashboard-deferred.spec.ts --include=src/app/pages/profile/dashboard.page.component.spec.ts --include=src/app/pages/profile/dashboard/dashboard-charts-widget.component.spec.ts --include=src/app/components/action-components/action-overlay/action-overlay.component.spec.ts --include=src/app/components/common/deferred-overlay-state/*.spec.ts --include=src/app/components/chem/molecule-viewer/molecule-viewer.component.spec.ts --include=src/app/components/chem/ketcher-frame/ketcher-frame.component.spec.ts --include=src/app/components/common/smooth-resize/smooth-resize.directive.spec.ts
```

## Browser: evidenza reale e limiti

Usato solo **Playwright MCP**, senza Computer Use o browser CLI. Nessun ticket, feedback, salvataggio molecolare, e-mail o SMS inviato. Navigazione e query reali usano l’account autorizzato, senza leggere o modificare credenziali. I normali effetti di navigazione dell’app, inclusa la cronologia, non sono una prova di scrittura di contenuti.

- Viewer: bloccato intenzionalmente il file WASM, osservato l’errore, ripristinata la rete e premuto **Riprova**. Rendering recuperato nella stessa pagina; differenza di altezza del contenitore **0 px**. Prova finale con scheda visibile.
- Reduced motion: caricamento WASM e documento Ketcher temporaneamente trattenuti; `animation-name: none` osservato sui due indicatori interessati, poi completamento regolare dopo il rilascio delle risorse.
- Nuovo ticket: focus iniziale su `new-ticket-subject` dopo l’arrivo del form; chiusura via Escape, senza invio.
- Ricerca a **375×320**: pannello largo 359 px, `scrollWidth=359`, estremi verticali 8–312 px. Screenshot finale scuro catturato dopo l’assestamento della transizione, con scheda visibile.
- La failure del solo chunk `@defer` non è stata isolata in modo affidabile nel dev server; il tentativo che interferiva col bootstrap è escluso. I nuovi rami di errore e caricamento sono verificati con il renderer Angular controllato e il build production, **non dichiarati come una prova runtime di produzione**.

Artefatti locali: `C:/Users/giuli/.codex/artifacts/mercurion-reactivity-24-2026-10-30/`:

- `browser-measurements.json`: misure e criteri di esclusione, senza header o dati delle richieste.
- `focused-tests.log`, `production-build.log`.
- `viewer-error-dark.png`, `detail-ready-dark.png`, `search-compact-dark.png`: screenshot ispezionati. Sono prove QA locali, non screenshot portfolio pronti alla pubblicazione; possono includere la cronologia dell’account.

Il tentativo di screenshot con tema modificato solo parzialmente e quello durante una transizione non sono evidenza di accettazione cromatica. La matrice completa dei temi non viene dedotta da quei tentativi.

## Residui prima dell’accettazione

- Build servita in condizioni rappresentative del rilascio: cache HTTP veramente fredda/calda, errori dei soli chunk, rete rallentata e campione ripetuto con la stessa modalità d’ingresso.
- Safari fisico, tastiera virtuale e zoom; review manuale e CI sul commit risultante.
- QA visiva del blocco 23 ancora aperta nel relativo rapporto.

Nessuna operazione Git di scrittura, modifica di processi o schede dell’utente. Prossimo blocco pianificato: **25 / PX-21 — dati e percorso dimostrativo portfolio**.
