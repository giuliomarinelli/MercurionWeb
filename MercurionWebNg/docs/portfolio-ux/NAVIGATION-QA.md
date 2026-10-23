# N3 / PX-01 — Navigazione responsive

23 ottobre 2026 — branch `bugfix/6abfd27de7c18baf04198c71-technical-debt-recovery-2`.

**Stato: implementato, in review.** Accettazione manuale, Safari fisico e zoom browser reale 200%/400% ancora aperti. Questo report riguarda la navigazione; gli altri interventi PX-01 e la regressione shell del blocco 14 restano nella [roadmap](ROADMAP.md).

**Implementazione**

- Sidebar desktop permanente: 256 px espansa, 64 px collassata. Un solo token di larghezza per aside e offset del contenuto; transizioni coordinate e rispetto di reduced motion.
- Rail con quattro funzioni, nomi accessibili e tooltip PrimeNG su focus/hover, fuori dallo scroll container e con colori light/dark dedicati. Cronologia rimossa dal DOM in collapsed, con cleanup dell’observer; niente titoli o label visive residue.
- Toggle integrato e sticky, con label distinta e `aria-expanded`. Rimosso il padding sopra la superficie sticky; l'offset della sidebar usa l'altezza frazionaria dell'header (54,5 px nella prova), evitando anche l'arrotondamento che lasciava mezzo pixel scoperto.
- Unico scroll per funzioni e cronologia. La selezione esplicita di una voce storica riporta dolcemente in cima il pannello dopo il riordino e il rendering; aggiornamenti in background e rimozioni non avviano lo scroll. Riutilizzato ScrollContextService, incluso il rispetto di reduced motion; nessun fallback al documento. Selezione storica inizializzata dalla route anche quando history viene ricreata dopo l’espansione.
- Drawer con header, corpo flessibile e footer account separati. Lo spazio del corpo è riservato anche prima del caricamento. Pannello chiuso inert; trap CDK, focus iniziale, Escape, ritorno al trigger, backdrop e scroll lock condiviso. Il trap viene sospeso mentre la ricerca molecolare è aperta.
- Superficie della pagina nei due temi, bordo discreto, stati hover/selected/focus, indicatore attivo e scrollbar thin. Funzioni sempre espanse, badge 32 px e target almeno 44 px; dimensioni di testo/badge della history conservate.
- Corretto un difetto di resize: DesignService ascoltava a 10 ms prima dell’invalidazione della cache CDK a 20 ms. Ora usa il throttle predefinito CDK, senza cambiare soglie; test con il ViewportRuler reale e un singolo resize in entrambe le direzioni.
- Header: il badge realtime vuoto non genera più un flex item e un gap aggiuntivo prima della campanella. Rimossi i margini compensativi dei controlli: ricerca, notifiche, tema e account usano il gap comune. L'animazione del margine del contenuto è limitata al desktop, per evitare un margine residuo passando al drawer.
- Navigazione differita immediatamente sul desktop; drawer attivato all’apertura con prefetch idle. Tooltip e history restano fuori dal bundle iniziale, senza nuove dipendenze o modifica dei budget.

**File modificati**

| Area | File sotto `src/` |
|---|---|
| Shell e geometria condivisa | `app/app.component.ts`, relativo `.spec.ts` |
| Drawer, account e focus | `app/components/common/header/header.component.ts`, relativo `.spec.ts` |
| Spaziatura notifiche nell'header | `app/components/common/header/header-notifications.component.ts`, relativo `.spec.ts` |
| Navigation body e rail | `app/components/common/sidenav/sidenav.component.ts`, nuovo `.css`, relativo `.spec.ts` |
| History, scroll e ripristino selezione | `app/components/common/history/history.component.ts`, relativo `.spec.ts` |
| Stato attivo della history | `app/components/common/history-item/history-item.component.ts` |
| Stato expanded/collapsed | `app/services/context/sidenav-context.service.ts`, relativo `.spec.ts` |
| Allineamento resize/cache CDK | `app/services/design.service.ts`, relativo `.spec.ts` |
| Token e stili condivisi | `styles.css` |

Documentazione aggiornata: ROADMAP.md, DAILY-LOG.md e questo report. Backend, flag, route, dipendenze e pagine interne non modificati. Nessuna operazione Git di scrittura o arresto dei runtime esistenti.

**Prove in Chrome**

Controllo browser di Computer Use, su `http://localhost:8888`, con runtime esistenti già autorizzati. Le difficoltà del controllo nativo Windows non sono state usate come evidenza sulla UI. Una scheda dedicata ha permesso di riprendere la verifica; nessuna scheda preesistente dell’utente è stata chiusa.

12 larghezze CSS per tema: **375, 390, 639, 640, 767, 768, 820, 1024, 1279, 1280, 1400, 1536 px**. Le misure finali attendono il cambio effettivo di navigazione/account/ricerca, distinguendolo dai fotogrammi intermedi delle transizioni. Verificati anche resize continuo e caricamento iniziale.

| Larghezza CSS | Navigazione misurata | Account footer |
|---|---|---|
| 375 / 390 / 639 | 100% | Presente |
| 640 / 767 | 50% | Presente |
| 768 / 820 / 1024 / 1279 | 40% | Assente, account nell’header |
| 1280 / 1400 / 1536 | 256 px; rail 64 px verificata nei due temi | Assente |

Le 24 misure finali passano gli assert di larghezza (tolleranza 1 px), assenza di overflow orizzontale e assenza di sovrapposizione del footer sulla nav. La larghezza disponibile è `document.documentElement.clientWidth`, che può escludere la scrollbar del documento.

Ulteriori prove:

- Tooltip light: testo bianco su `rgb(34,43,59)`; dark: testo `rgb(21,26,39)` su `rgb(240,243,248)`. Padding 8×12 px; tooltip rimosso tornando expanded.
- Rail conservata durante la navigazione alle collezioni, con selezione aggiornata e nessuna history montata.
- Tab/Shift+Tab ciclici nel drawer; ricerca aperta da Strumenti con focus nel campo; chiusura ricerca con ritorno al comando; Escape del drawer con ritorno al trigger e pannello inert.
- Menu account mobile sopra il footer, quattro link previsti e backdrop. Nessun logout eseguito nella sessione condivisa.
- Apertura e annullamento del selettore Importa da ChEMBL; href editor conservato con `mode=create`. Non eseguiti import, salvataggi o cancellazioni live.
- History da 25 a 50 elementi scorrendo, pagina ferma e controllo sticky. Selezionando PORFIRINA lo scroll della sidebar passa da 679 a 0 px e la voce sale in testa con selezione e timestamp aggiornati; il documento resta a 0. Nell'offcanvas, selezionando (S)-VENLAFAXINA, il pannello si chiude e passa da 625 a 0 px: riaprendolo si riparte dalla cima.
- Sticky nei due temi: header bottom, nav top e sticky row top coincidono a 54,5 px con il pannello scorso di 624 px; sfondo opaco `rgb(10,10,10)` / `rgb(249,250,251)`.
- Header dopo le correzioni: 16 misure a 640, 767, 768, 820, 1023, 1024, 1279 e 1280 px nei due temi. Gap ricerca→campanella e campanella→tema uguali (da 4,80 a 9,59 px), senza controlli fuori dall'header. Dopo il passaggio desktop→820 px il margine del contenuto è subito 0, senza transizione residua; documento 810/810 px.
- Viewport 375×320: corpo nav di 210 px scrollabile, header e account fuori dallo scroll, nessun overflow orizzontale. Questa prova non simula una tastiera iOS reale.

**Controlli locali**

- `ngc --noEmit -p tsconfig.app.json`: TypeScript e template.
- ESLint sui file TS modificati: zero warning.
- Build Angular production con stats: superata; gate bundle sotto **1.000.000 byte** e chemistry lazy boundary superati.
- Styling, colori semantici/WCAG e policy di semantica interattiva: superati. Il controllo colori copre 23 coppie nei due temi; non equivale a un audit completo della navigazione con screen reader.
- **52 test passati**, includendo shell, sidenav, stato della rail, header/account/focus, notifiche, history/observer e layout telefono. Il runner comprende anche i controlli comuni di accessibilità. Regressioni per scroll dopo rendering sul root della nav, assenza di scroll sugli aggiornamenti successivi e gap delle notifiche con badge realtime nascosto/visibile.
- `git diff --check`: superato. Nessuna certificazione CI remota dichiarata.

Comando test, da `MercurionWebNg`:

```powershell
..\node_modules\.bin\ng.cmd test --watch=false --karma-config=karma.conf.js --include=src/app/app.component.spec.ts --include=src/app/components/common/sidenav/sidenav.component.spec.ts --include=src/app/services/context/sidenav-context.service.spec.ts --include=src/app/components/common/history/history.component.spec.ts --include=src/app/components/common/header/header.component.spec.ts --include=src/app/components/common/header/header-notifications.component.spec.ts --include=src/app/frontend-phone-layout.spec.ts --include=src/app/services/design.service.spec.ts
```

Restano i warning indicativi di build sulla soglia iniziale di 500 kB e sui CSS di editor, creazione collezioni e aggiunta molecole; i relativi file non sono stati modificati in questo intervento.

**Prove locali conservate**

`C:/Users/giuli/.codex/artifacts/mercurion-navigation-2026-10-23/`

- `responsive.json`: 24 misure responsive e viewport bassa. I dati storici di scroll in questo file precedono la richiesta di ritorno in cima e sono superati da `queued-fixes.json`.
- `queued-fixes.json`: scroll selezione sidebar/drawer, 16 misure dell'header e geometria sticky delle correzioni finali; `resize-cache.json`: prova del singolo resize 1279→1280.
- `desktop-light-expanded.jpg`, `desktop-light-rail.jpg`, `desktop-dark-expanded.jpg`, `desktop-dark-rail.jpg`.
- `phone-light.jpg`, `phone-dark.jpg`, `phone-short-dark.jpg`, `phone-account-dark.jpg`, `desktop-sticky-history.jpg`.
- `sticky-light-final.jpg`, `sticky-dark-final.jpg`, `header-tablet-final.jpg`: prove delle correzioni segnalate durante la review. Tema automatico e viewport originale ripristinati alla fine.
- `tests.log`, `build.log`: esecuzioni finali.

Le schermate comprendono fixture e dati dell’account locale: sono prove di review, non materiale già preparato per pubblicazione portfolio.

**Da completare nella review**

- iPhone 13 mini / Safari iOS 18.7.1: safe-area, rotazione e tastiera, seguendo anche [KEYBOARD-QA.md](KEYBOARD-QA.md).
- Zoom reale 200% e 400%: le scorciatoie del controllo browser non hanno applicato lo zoom Chrome. Le viewport ridotte sono verificate, ma non vengono dichiarate equivalenti a questa prova.
- Riprodotto il punto PX-01/PX-23 già registrato: ricaricando direttamente un dettaglio salvato UUID si può arrivare alla route numerica ChEMBL. La navigazione interna apre il dettaglio salvato. La causa nel ripristino/auth non è stata investigata in N3; routing e autenticazione non sono stati modificati.
- Review manuale delle icone collapse/expand e del codice; regressione finale della shell e punti PX-01/PX-23 già aperti nella roadmap.

Prossimo blocco di implementazione: **13 / PX-08 — editor: stati e percorso finale**. Nessuna accettazione, merge o rilascio impliciti.
