# Blocco 14 — Regressione della shell dopo N3

25 ottobre 2026. **Implementato, in review.** Segue le prove storiche di [NAVIGATION-QA.md](NAVIGATION-QA.md); non certifica CI remota o accettazione finale.

## Difetto e correzione

Riprodotto un resize da telefono a desktop con drawer aperto: `window.innerWidth` e il servizio ViewportRuntimeService rilevavano 1366 px, mentre DesignService e la cache ViewportRuler CDK conservavano 375 px. Il drawer rimaneva aperto, lo scroll del documento bloccato e il gutter a 0. Questo distingue il difetto persistente dalla normale transizione desktop di 250 ms.

DesignService ora deriva larghezza e breakpoint dal ViewportRuntimeService già presente, unico proprietario delle misure runtime dell'applicazione. Rimossi la lettura della seconda cache e il relativo listener; soglie, API pubbliche e semantica min/max restano uguali. La tastiera/pinch zoom non diventano nuovi breakpoint: si usa la larghezza di layout, distinta da quella del visual viewport.

Dopo la correzione, lo stesso passaggio chiude il drawer, rilascia il lock e porta sidebar/gutter a 256 px. La rail conserva 64 px anche dopo la navigazione. Nessuna modifica a CSS, route, backend o flag.

## Evidenze browser

Chrome tramite Playwright, localhost:8888 e runtime esistenti riutilizzati. Una sola scheda dell'agente; nessun controllo della scheda dell'utente.

- 22 misure light/dark durante resize senza reload: 1366, 1280, 1279, 1024, 768, 767, 640, 639, 375, ritorno a 1280 e nuovamente 375 px. Gutter 256/0 e presenza della navigazione corrispondono ai media query; nessun overflow orizzontale. Considerata la larghezza client per gli ingombri, non confusa con la larghezza CSS del breakpoint.
- Header bottom e sidebar top coincidono a 54,5 px. La normale animazione desktop è misurata dopo l'assestamento; nessun offset residuo su mobile.
- Rail 64 px, cronologia nascosta, tooltip «Le mie molecole» visibile; collegamento a Le mie collezioni funzionante e selezione attiva conservata.
- Drawer: Tab/Shift+Tab restano al suo interno; Escape rilascia lo scroll e restituisce il focus al trigger. Il passaggio a desktop con drawer aperto chiude e sblocca correttamente. Quando il nodo focalizzato viene smontato al resize, il focus riparte dal documento: non si dichiara una conservazione dell'elemento equivalente fra sidebar e drawer.
- Ricerca molecolare dal drawer: campo focalizzato, backdrop presente, Escape funzionante; nessun risultato selezionato o dato salvato durante questa prova.
- IntersectionObserver della cronologia: 25 → 50 elementi dopo lo scroll del pannello, documento fermo. Selezionata FANS: riordinata in testa; riaprendo il drawer, scroll del pannello a 0 e documento ancora a 0.
- Viewport 375×320: navigazione scrollabile alta 209,5 px, account separato a y=263–320. Menu account alto 224 px, da y=32 a y=256, contenuto interno scrollabile (317 px). Non effettuati logout o modifiche account.

Le normali visite possono aggiornare la cronologia dell'account locale. Nessuna creazione, cancellazione o modifica di molecole/collezioni. Le catture sono prove locali, non immagini autorizzate per pubblicazione portfolio.

## Verifica locale

- Baseline prima delle modifiche: 52 test superati.
- Risultato finale: **63 test superati**, comprendendo shell, header/menu, sidenav/rail, cronologia, layout telefono, DesignService, ViewportRuntimeService e ScrollContextService.
- Nuove regressioni: gutter collegato alla larghezza live anche senza un evento window resize distinto; passaggio drawer → desktop con rilascio lock; resize del visual viewport con misura della larghezza di layout. Aggiornati i mock dei test telefono al proprietario viewport effettivo.
- Typecheck/template Angular, ESLint mirato, policy typing/styling/semantica, build production e gate bundle/lazy superati. Bundle iniziale 952.779 byte su 1.000.000; warning indicativi iniziale/CSS conservati, nessuna soglia cambiata.
- Nessun npm ci, aggregate CI locale, commit, push, merge, deploy o arresto dei runtime dell'utente.

Artefatti: `C:/Users/giuli/.codex/artifacts/mercurion-shell-block14-2026-10-25/` — matrici responsive, log e schermate disponibili. Tema automatico e viewport originale ripristinati, scheda dell'agente chiusa.

## Review residua e prossimo blocco

- Safari fisico, safe-area/tastiera e zoom reale 200%/400% restano aperti; resize ridotto non equivale a queste prove.
- Il precedente redirect di una route UUID salvata verso la variante numerica resta nel seguito PX-01/PX-23. Lettura statica: MoleculeDetailFacade.resolveDetail sceglie il ramo anonimo da isLoggedIn senza distinguere il ripristino della sessione. Va verificato il momento di risoluzione prima di intervenire sull'autenticazione; questo blocco non ne dichiara la correzione.
- Review manuale e regressione finale dei percorsi attivi restano necessarie prima del merge.

Prossimo blocco: **15A / PX-02 — Home e benvenuto**, con definizione del messaggio prima della riscrittura del copy; 15B aggiornerà welcome e schermate.
