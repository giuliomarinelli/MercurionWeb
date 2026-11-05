# TS-01 — Inventario completo e seconda passata

5 novembre 2026. **Pulizia applicata al perimetro manuale; accettazione finale aperta.** Seguito del [Giorno 5](DAY-5-QA.md), autorizzato dall’utente. Nessun merge, installazione, modifica delle dipendenze o accesso a dati applicativi.

## Perimetro ed esito meccanico

L’inventario ora parte da tutti i file Git TypeScript del repository, comprese le estensioni TSX/MTS/CTS quando presenti. **1.318 file manuali analizzati**; **21 esclusioni esplicite**: due artefatti GraphQL generati e 19 fixture di tooling/contratto. Sono comprese le fixture `MercurionWebNg/scripts/fixtures/inline-executable-gql.ts` e `MercurionWebNode/src/contracts/fixtures/fingerprint-contract.fixtures.ts`. Le esclusioni non sono dichiarate conformi: restano intenzionalmente sotto il controllo dei generatori o dei test che le consumano. Dipendenze, output ignorati e file non tracciati non entrano nella trasformazione.

| Area della seconda passata | File modificati | Terminatori rimossi |
| --- | --- | --- |
| MercurionData | 49 | 854 |
| MercurionLandingFactory | 9 | 40 |
| Contratti condivisi | 1 | 16 |
| Configurazione/suite Playwright | 3 | 57 |
| Totale | **62** | **967** |

Le due passate hanno quindi rimosso **16.370 terminatori in 689 file**. Il nuovo controllo globale trova **zero candidati rimovibili** e conserva 1.105 separatori/guardie che, rimossi, producono errori o cambiano l’albero sintattico. I delimitatori dei `for`, i corpi vuoti e i separatori di classe sono protetti a monte. I separatori fra istruzioni sulla stessa riga restano necessari senza una riformattazione, che non rientra nella passata.

Verificati contro i blob del commit iniziale: gli output dei 62 file corrispondono alla trasformazione deterministica, senza diff funzionali o commenti alterati. In due righe è stato necessario eliminare anche lo spazio che precedeva il terminatore per non introdurre trailing whitespace; lo strumento gestisce ora questo caso con un test dedicato. Stringhe, template, JSDoc e terminatori di riga conservati. Nessuna modifica a fixture o file generati in questa seconda passata.

Prettier allineato a `semi: false` per MercurionData e per la configurazione incorporata della landing. Aggiunta configurazione radice per contratti, Playwright e altri file senza override locale; verificata la configurazione effettivamente risolta nei quattro ambiti. Configurazioni Angular/Nest della prima passata conservate. Nessuna riformattazione generale o modifica dei manifest relativa alle dipendenze.

Il controllo ripetibile rimane:

```powershell
node --test scripts/typescript-semicolons.test.mjs
node scripts/typescript-semicolons.mjs
```

Ora copre tutto il perimetro descritto; senza `--write` non modifica file. **8 test del trasformatore superati**, inclusi esclusioni e spazi esposti dalla cancellazione.

## Controlli delle aree aggiunte

| Area / controllo | Evidenza |
| --- | --- |
| Landing, build production | Verde prima e dopo; **42 route prerenderizzate**. Eseguito anche il post-processing locale `__.mjs`; nessuna pubblicazione |
| Landing, unit test | Nessun file `.spec.ts`/`.test.ts` nel sorgente. Due invocazioni `ng test --watch=false`, la seconda con CI/analytics non interattivi, sono state interrotte senza esito o diagnostica; causa non accertata. Nessun test dichiarato superato |
| MercurionData, build | Verde dopo la pulizia; la build esclude i test |
| MercurionData, typecheck esteso | **4 errori già presenti prima**, identici dopo: tre import di classi rinominate nei test e uso non invocabile di Supertest nell’E2E |
| MercurionData, lint | **7 errori e 7 warning prima e dopo**, diagnostici identici: nomi inutilizzati e tipi non risolti nei test |
| MercurionData, unit test | **16 suite fallite e una passata su 17**, prima e dopo; quattro test falliti e uno passato fra quelli eseguibili. Presenti import non più esportati, alias non risolti e dipendenze dei test non fornite. Nessuna correzione funzionale introdotta per mascherare il baseline |
| MercurionData, E2E | Non eseguiti: la fixture inizializza il modulo applicativo con connessioni database reali. I test unitari non ne sostituiscono l’accettazione |
| REST/Socket contracts | Typecheck e build verdi, inclusi output CJS/ESM Socket; policy eventi e test negativi verdi |
| Contratti consumati dal backend | Typecheck dedicato e **11 suite / 81 test verdi** |
| Playwright, sorgenti delle suite e configurazione principale | Typecheck verde; nessun browser CLI avviato e nessuna mutazione della sessione dell’utente |
| Playwright, configurazione catalogo | Typecheck non verde: opzione `use.reducedMotion` non prevista dai tipi installati. Riprodotto anche compilando una copia del file dal commit precedente alla pulizia; errore preesistente. Non eseguiti test visuali e non aggiornati snapshot |

Gli errori MercurionData non sono attribuiti alla rimozione dei terminatori. Per typecheck e lint è stato confrontato anche il testo integrale dei diagnostici prima/dopo, risultato identico. L’errore del catalogo è confermato sulla versione Git precedente. Non sono stati abbassati i controlli né modificate regole lint per ottenere un verde.

La suite completa Angular/Nest della prima passata resta documentata nel Giorno 5; non è stata rieseguita e non viene presentata come nuova prova di queste aree. Servizi dell’utente conservati; tutte le esecuzioni di controllo possedute dalla prova sono terminate o state interrotte. Nessun nuovo runtime applicativo avviato.

## Residui per l’accettazione

La trasformazione e il formatter sono applicati all’intero perimetro manuale inventariato. **TS-01 resta in review**, senza dichiarazione di accettazione completa: occorre riesaminare le eccezioni, ripristinare i controlli non verdi delle aree aggiunte e verificare la CI dell’esatto SHA. [F-09/F-10 e F-08](FINAL-TODO.md) conservano questi confini. Restano separati i TODO runtime/provider/dispositivi dei Giorni 1–4.

Artefatti locali in `C:/Users/giuli/.codex/artifacts/`: `mercurion-day5b-before.json`, `mercurion-day5b-applied.json`, `mercurion-day5b-after.json`, `mercurion-day5b-transform-verification.json`; log `mercurion-day5b-data-*`, `mercurion-day5b-landing-*`, `mercurion-day5b-playwright-*` e `mercurion-day5b-contract-tests.log`. Le esecuzioni non verdi e interrotte restano registrate come tali, senza inferirne una causa non dimostrata.
