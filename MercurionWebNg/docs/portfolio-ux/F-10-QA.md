# F-10 — Ripristino della validazione Data, landing e catalogo

5 novembre 2026. **Completato localmente, in review.** Seguito autorizzato di [TS-01](TS-01-QA.md). Correzioni mirate ai controlli non verdi e alle fixture mancanti, sul branch di lavoro corrente. Nessuna installazione, modifica delle dipendenze, accesso a database/provider reali o merge.

## MercurionData

- Configurata la risoluzione Jest dell’alias `src/` per unitari ed E2E. Aggiornati i tre import delle classi rinominate; i test usano ora `PreferredNameSyncService`, `MeiliPreferredNameItPreviewSyncService` e `MoleculeNameI18nSeedService`.
- Le fixture dichiarano esplicitamente i provider richiesti dai costruttori: repository e datasource delle connessioni nominali, client Meilisearch e servizi dipendenti sono sostituti locali. Nessun caricamento del modulo applicativo con connessioni reali. Conservati i controlli di costruzione esistenti; non costituiscono copertura funzionale completa dei workflow.
- Corrette le asserzioni di riconciliazione dell’indice: usavano matcher Jasmine in una suite Jest. Conservata la verifica della ricercabilità/filtrabilità SMILES e della configurazione sia su indice esistente sia su indice nuovo.
- Il test del seeding verifica sorgente vuota senza scritture, suddivisione in batch e nomi contenenti apici mantenuti nei parametri anziché interpolati nel testo SQL. Query simulate: nessun seeding reale.
- Sostituito l’E2E iniziale `Hello World`, incoerente con l’applicazione, con una fixture HTTP isolata del controller reale `POST /molecule-name-i18n/seed`. Verificati risultato positivo e HTTP 500 senza falso successo o dettagli interni quando il servizio fallisce; applicazione di test chiusa al termine. Questa prova copre la route selezionata con servizio simulato, non l’intero AppModule o la persistenza.
- Rimossi import e direttive lint inutilizzati; il parametro dello stub embedding è esplicitamente consumato senza attivare il codice NATS commentato. Il comportamento dello stub rimane invariato. Nessuna regola lint disattivata per ottenere il verde.

**Risultato finale:** typecheck esteso, lint con `--max-warnings=0` e build verdi; **17 suite / 19 test unitari** e **1 suite / 2 test E2E HTTP isolati** verdi. Il punto di partenza aveva quattro errori typecheck, 7 errori/7 warning lint e 16 suite fallite. I log iniziali rimangono negli artefatti della seconda passata TS-01.

## LandingFactory

Aggiunta una suite Angular/Vitest che rende il componente Factory con route di prova. I quattro casi verificano codice valido 400, codice non numerico, codice numerico non riconosciuto e parametro assente. Controllati fallback 404, titolo renderizzato, title del documento e meta description/robots; stato del documento ripristinato dopo ogni test.

**4 test verdi**, eseguiti attraverso `ng test --watch=false --progress=false` in modalità non interattiva. Il runner ora termina con un esito verificabile; non viene attribuita una causa dimostrata alle precedenti attese senza test sorgente. Build production e post-processing locale verdi, **42 route prerenderizzate**. Nessuna modifica al rendering del prodotto o pubblicazione.

## Catalogo Playwright

L’opzione `reducedMotion` è stata spostata in `use.contextOptions`; `animations` nella configurazione `expect.toHaveScreenshot`. Sono le posizioni previste dai tipi dell’albero installato; le asserzioni screenshot esistenti e la soppressione delle animazioni nella fixture sono conservate.

**Typecheck dell’intero insieme Playwright verde**, inclusa la configurazione catalogo precedentemente esclusa dal giro verde parziale. Nessun browser CLI avviato, nessuna rigenerazione o approvazione di snapshot. Il risultato prova la configurazione tipizzata, non una nuova accettazione visuale del catalogo.

## Verifiche e consegna

Controlli svolti con gli eseguibili installati, senza `npm ci` né aggregati locali completi. I rilanci finali seguono le ultime modifiche dei test. Le suite complete Angular/Nest del Giorno 5 rimangono evidenze precedenti, distinte da questi controlli mirati.

Log locali in `C:/Users/giuli/.codex/artifacts/`: `mercurion-f10-data-typecheck.log`, `mercurion-f10-data-lint.log`, `mercurion-f10-data-tests.log`, `mercurion-f10-data-e2e.log`, `mercurion-f10-data-build.log`, `mercurion-f10-landing-tests.log`, `mercurion-f10-landing-build.log`, `mercurion-f10-landing-postprocess.log` e `mercurion-f10-playwright-typecheck.log`.

Verificati anche documentazione, diff e convenzione TS-01: **zero candidati rimovibili su 1.319 file manuali tracciati**, incluso il nuovo test landing; 8 test del trasformatore verdi. Le esecuzioni possedute dalla prova sono terminate; sessione e servizi dell’utente conservati. Commit/push senza firma, nessun merge. La successiva verifica CI è documentata in [F-08](F-08-QA.md); review delle eccezioni TS-01, accettazione manuale e TODO runtime/dispositivi restano separati.
