# Evidenze demo portfolio — 25 / PX-21

**Aggiornamento del 5 novembre 2026:** il [Giorno 1](../DAY-1-QA.md) aggiunge una prova persistente reale con una collezione QA, ASPIRINA importata e tre copie/varianti personali. Il report seguente conserva le evidenze della preview del 30 ottobre; il dataset completo con tre collezioni non è stato interamente caricato nell’account. Le nuove prove non chiudono Safari, review visiva o l’anomalia storica PX-09.

30 ottobre 2026. **Preparato, in review; accettazione del percorso completo ancora aperta.** [Copione e uso delle fixture](README.md).

## Risultato verificato

- Tre record ChEMBL pubblici acquisiti dalla fonte ufficiale con URL/data, più una copia personale della struttura dell’aspirina. Nomi, formula e proprietà provengono dalla medesima fonte, senza riutilizzare la vecchia fixture cicloesano/piperidina.
- Tre collezioni coerenti, inclusa una vuota; nome e nota lunghi; proprietà assenti sulla sola copia dimostrativa; due messaggi sintetici per gli stati letto/non letto.
- Trasporto locale per liste e notifiche nella scheda Playwright dedicata. Nessun seed, associazione, salvataggio, invio o cancellazione di contenuti nell’account corrente. Normale bootstrap autenticato reale; non è un contesto di autenticazione separato.
- Screenshot dei componenti reali, con fixture, ritagliati per escludere account e cronologia. Nessun restyling della UI per le catture. Le miniature mostrano il ritaglio centrale previsto dalla variante `preview` del viewer; la struttura completa si consulta nel dettaglio.

## Difetto emerso e correzione

**D25-01 — MW mancante mostrato come zero.** Nel browser, il campione personale con `propertiesJson: null` mostrava «MW: 0». `Helpers.moleculeClientToCardConverter` usava `0` sia come fallback dopo il parsing fallito sia per il valore assente. Ora il valore resta `undefined`; la card omette il badge. Stesso trattamento per la proprietà ChEMBL assente. I valori numerici realmente forniti, incluso zero, sono conservati; nessuna modifica a icone, dimensioni o colori delle card.

Prova prima/dopo: i sei casi `null`, stringa vuota, oggetto vuoto, JSON `null`, JSON non valido e campo `mwFreebase: null` fallivano prima della modifica con «Expected 0 to be undefined». Dopo la modifica passano. Verifica browser sul quarto campione: nome e badge Personal presenti, nessun testo «MW:»; i tre campioni ChEMBL conservano i propri valori. La verifica visiva non è dedotta dal solo risultato Jasmine.

## Controlli eseguiti

**35 test Angular superati** in una sola esecuzione finale, inclusi i 7 test del setup condiviso. Suite: Helpers, MoleculeSummaryCardComponent, AllMyMoleculesPageComponent e MoleculeCollectionDetailFacade. **10 test Node superati** per il materiale demo: controlli positivi e negativi su identità chimica, riferimenti e blocco delle scritture, inclusi batch e nome di query contraffatto. Questi ultimi verificano il trasporto ausiliario, non la persistenza Nest/PostgreSQL.

Typecheck Angular, lint mirato, build production, gate bundle/lazy, styling e documentazione canonica superati. Warning già presenti sui budget iniziale/CSS conservati, soglie non modificate. Bundle iniziale 958.259 / 1.000.000 byte; 21 CommonJS, RDKit/Ketcher fuori dal main. Nessuna dipendenza aggiunta. Le fixture e il helper restano sotto `docs`, fuori dal codice applicativo.

Da root:

```powershell
node MercurionWebNg/docs/portfolio-ux/demo/validate.mjs
node --test MercurionWebNg/docs/portfolio-ux/demo/demo.test.mjs
node scripts/check-documentation.mjs
```

Da `MercurionWebNg`, con `NG_CLI_ANALYTICS=false` e `CI=true` per l’esecuzione non interattiva:

```powershell
..\node_modules\.bin\ng.cmd test --watch=false --karma-config=karma.conf.js --include=src/app/helpers.spec.ts --include=src/app/components/molecule-detail/molecule-summary-card/molecule-summary-card.component.spec.ts --include=src/app/pages/all-my-molecules/all-my-molecules.page.component.spec.ts --include=src/app/pages/molecule-collection-detail/molecule-collection-detail.facade.spec.ts
..\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.app.json
..\node_modules\.bin\eslint.cmd src/app/helpers.ts src/app/helpers.spec.ts --max-warnings=0
..\node_modules\.bin\ng.cmd build --configuration production --stats-json
```

Log locali: `C:/Users/giuli/.codex/artifacts/demo25-after.log` e `demo25-build.log`. Il primo tentativo non interattivo senza le variabili sopra non ha prodotto output ed è stato fermato identificando il solo processo di test creato dalla sessione; nessun runtime dell’utente è stato fermato. La prova rossa successiva è nell’output della sessione, non nel file vuoto del tentativo iniziale.

## Browser e catture

Solo **Playwright MCP** su `http://localhost:8888`. Trasporto sintetico limitato alla nuova Page, installato prima della navigazione. Due temi selezionati tramite il menu reale; preferenza iniziale automatica ripristinata al termine. Chiuse soltanto le schede create per le prove, conservate quelle dell’utente. Nessun Computer Use, browser CLI o accesso a segreti.

| Cattura | Superficie | Evidenza e limite |
| --- | --- | --- |
| [Collezioni, chiaro](screenshots/collections-light.png) | Lista con tre gruppi | Nomi e conteggi coerenti; nome lungo troncato dal componente corrente |
| [Collezioni, scuro](screenshots/collections-dark.png) | Stessa lista | Palette reale del secondo tema |
| [Molecole, chiaro](screenshots/molecules-light.png) | Quattro campioni | Campione personale senza falso MW zero |
| [Molecole, scuro](screenshots/molecules-dark.png) | Stessi campioni | Rendering delle quattro strutture e tema effettivo |
| [Compatto, chiaro](screenshots/molecules-mobile-light.png) | Larghezza viewport 375 px | Ritaglio visibile della lista, non acquisizione Safari |
| [Compatto, scuro](screenshots/molecules-mobile-dark.png) | Larghezza viewport 375 px | Contenuto largo 333 px; nessun overflow orizzontale del documento |

Alla ripresa autorizzata dall’utente sono state ripetute le viste desktop e compatta delle molecole in tema scuro con `visibilityState: visible`: quattro SVG presenti, campione personale senza badge MW, larghezza compatta 333 px e nessun overflow orizzontale. Chrome è poi tornato `hidden`. Le catture chiare e quelle finali delle collezioni sono ritagli statici con `page.screenshot`, con animazioni disabilitate soltanto durante l’acquisizione e verificati visivamente; non certificano transizioni, focus o tastiera. Scartati e sostituiti gli scatti presi durante la chiusura del menu tema o prima dell’assestamento del layout. Nessun bug responsive viene dedotto dagli scatti intermedi e nessuna animazione viene dichiarata verificata in background. Il tentativo aggiuntivo filtro → stato vuoto → ripristino non è arrivato all’interazione, quindi non viene dichiarato superato.

## Residui e passaggio al blocco 26

- Eseguire il percorso persistente concordato su un account di prova, con ricerca nel catalogo corrente e mapping degli ID reali; riaprire i dati dopo refresh. Gli UUID e i `molregno` sintetici del helper non devono essere inviati al backend.
- Catturare dettaglio, analisi live, salvataggio e notifiche dopo una prova reale ripetibile. Il helper è volutamente limitato alle liste: una navigazione sperimentale nel dettaglio collezione ha incontrato il blocco del comando di cronologia ed è esclusa dall’accettazione. Non è stata corretta la UI per aggirare questa protezione.
- Verificare Safari/iPhone 13 mini fisico, tastiera e rotazione; selezionare con l’utente le catture da pubblicare. Le catture presenti sono candidate alla review.
- Pubblico confermato dall’utente: clienti software B2B, qualità tecnica e UX. Copione B2B principale; R&D resta un approfondimento opzionale. Nessuna pubblicazione eseguita.
- Restano indipendenti QA aperta dei blocchi 23/24, review manuale e CI. Il completamento del dataset non le chiude.
