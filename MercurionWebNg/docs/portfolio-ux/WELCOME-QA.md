# Blocco 15B — Welcome e schermate aggiornate

25 ottobre 2026. **Implementato, in review.** Segue [HOME-QA.md](HOME-QA.md); prossimo blocco 16 / PX-03, accesso.

## Perimetro e risultato

Conservati integralmente CSS della pagina welcome, immagini `bg-light.jpg` / `bg-dark.jpg`, veli e livelli decorativi di sfondo. Le modifiche alla pagina contenitore aggiungono soltanto import e rendering della nuova sezione editor. Nessuna modifica a home, autenticazione, backend o feature flag.

- Aggiornate le quattro immagini di ricerca e predizione, con catture reali della UI attuale nei due temi.
- Aggiunta una sezione dedicata all’editor in modalità **Analisi live**, con disegno, identità molecolare, quattro endpoint Tox21 e tre analoghi affiancati. La cattura proviene dal percorso Duplica di una molecola pubblica: nessun disegno salvato o record creato.
- Introdotto WelcomeScreenshotComponent, limitato alla presentazione delle catture: un solo elemento immagine per la variante attiva, dimensioni intrinseche corrette, lazy loading sotto la piega e hero eager. Riutilizzati ThemeManagerService e PublicPipe, incluso il supporto al base path.
- Ogni schermata è apribile a dimensione intera tramite un collegamento nativo, anche da tastiera. Annuncio della nuova scheda, `noopener noreferrer` e focus interno alla cornice per evitarne il taglio da overflow. Il testo dell’editor e la didascalia restano leggibili anche quando la cattura viene ridotta su telefono.
- CTA principali uniformate a m-button; link alla registrazione esplicito nella CTA finale. Le didascalie delle immagini sono in flusso e non coprono più i dati mostrati.
- Rimossi riferimenti a note/tag/annotazioni e workspace separati non dimostrati dal perimetro corrente; provider pubblicizzati allineati al chooser attuale Google/ORCID/Discord. Il vecchio valore AUC non documentato nella pagina è sostituito dal numero di endpoint effettivamente mostrati. Conservato il messaggio commerciale generale.

## Provenienza delle immagini

Chrome, localhost:8888, 1600×1000 CSS px. Ricerca ChEMBL «aspirina» e dettaglio pubblico **ASPIRINA / molregno 1280**; editor aperto tramite il collegamento Duplica di quel dettaglio. Risultati di predizione e analoghi reali, non ricostruiti. Catture dei soli pannelli: esclusi header, account, cronologia e collezioni personali.

| Coppia in public/welcome | Dimensioni per variante | Peso light / dark |
|---|---|---|
| prediction-light.png / prediction-dark.png | 960×672 | 68.588 / 68.093 byte |
| search-light.png / search-dark.png | 768×768 | 60.799 / 61.686 byte |
| editor-live-light.png / editor-live-dark.png | 1302×795 | 68.354 / 68.420 byte |

Totale delle sei immagini: **395.940 byte**. Il componente carica la variante del tema attivo; l’altra non è presente come immagine nascosta nel DOM. Nessuna modifica alle due immagini di sfondo.

L’utente ha effettuato login e logout per consentire rispettivamente cattura e QA della pagina pubblica. Le visite normali possono aggiornare la sua cronologia locale. Nessuna operazione di salvataggio, cancellazione o invio di moduli durante le prove.

## Verifica

- Baseline: **17 test superati**. Finale: **20 test superati**, fra pagina welcome e componenti di presentazione. Aggiunte regressioni su variante tema singola, link immagine sotto base path, dimensioni riservate prima del caricamento e integrazione della sezione editor nel contenuto anonimo.
- Typecheck/template Angular, ESLint mirato, policy typing/styling/semantica, build production e gate bundle/lazy riusciti. Bundle iniziale **952.342 byte / 1.000.000**; warning preesistenti iniziale/CSS conservati, nessuna soglia cambiata.
- Browser: 18 combinazioni light/dark — larghezze 320, 375, 639, 640, 767, 768, 1024, 1280 e 1440 px, incluse altezze 375 px. Nessun overflow orizzontale; titoli e link contenuti, proporzioni delle immagini coerenti con le dimensioni native.
- Prova con richieste PNG temporaneamente trattenute: tutte le immagini inizialmente non caricate; dopo rilascio e caricamento reale, **variazione massima di altezza e posizione verticale pari a 0 px**. La prova riguarda queste immagini, non certifica CLS zero dell’intera applicazione.
- Enter sul collegamento dell’editor apre la cattura reale a 1302×795 nella nuova scheda, poi chiusa. Focus visibile di 2 px con offset interno di −4 px nella cornice. Il collegamento «Guarda cosa puoi fare» porta a `#features`, sezione a y=85 px sotto l’header alto 54,5 px.
- Schermate finali desktop e telefono nei due temi ispezionate. Immagini di sfondo e regole CSS del contenitore confermate invariate dal diff.

Artefatti locali: `C:/Users/giuli/.codex/artifacts/mercurion-welcome-15b-2026-10-25/` — sei catture sorgente, pagina completa nei due temi, misure e log. Tema automatico e viewport 1600×775 ripristinati; chiusa soltanto la scheda creata dall’agente. Nessun processo dell’utente arrestato, nessuna operazione Git o CI remota.

## Review residua

Review manuale di composizione, copy e taglio delle schermate; Safari fisico e zoom reale restano parte della QA trasversale prima del merge. Le piccole scritte nelle catture desktop richiedono apertura a dimensione intera/zoom su telefono; i contenuti essenziali sono ripresi nel testo della sezione. Le prove Chrome responsive non equivalgono a una prova sul dispositivo.
