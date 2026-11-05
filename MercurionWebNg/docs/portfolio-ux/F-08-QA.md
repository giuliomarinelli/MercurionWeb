# F-08 — Diagnosi e riparazione della CI

5 novembre 2026. **Verificato in CI sul commit delle correzioni.** L’utente ha richiesto il recupero autonomo dei log. Branch di lavoro conservato, commit senza firma e nessun merge.

## Run iniziale verificato

[CI 42018404547](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/42018404547), avviata manualmente sull’esatto SHA `1a4f8762a8d03536e15613753908c4f4a73f48fa`. Recuperati i job e i log tramite GitHub; copie locali in `C:/Users/giuli/.codex/artifacts/mercurion-f08-job-0.log` (Windows), `mercurion-f08-job-1.log` (Linux), `mercurion-f08-job-2.log` (container Nest test).

- Prerequisiti Windows/Linux: installazione, lint, typecheck e GraphQL verdi; arresto nei controlli statici alla policy di composizione TestController. Cercava il testo dell’import con terminatore `;`, rimosso da TS-01.
- Container Nest test: 205 suite verdi e una fallita; il controllo della destinazione JWT non riconosceva il workspace fratello senza `.git` e leggeva le chiavi sintetiche del test prima di rifiutare l’operazione.
- Required gate rosso; test e build downstream dipendenti dai prerequisiti saltati. I container staging/production e Angular erano verdi, senza che questo rendesse verde l’intera CI.

## Correzioni e blocchi statici successivi

1. Policy TestController: riconoscimento dell’import con parser TypeScript, indipendente da terminatore, quote e ritorni a capo. Conservati i divieti di esposizione in moduli produttivi e i requisiti di registrazione; esclusi import commentati o solo di tipo. Quattro test di regressione, registrati nella policy architetturale.
2. CLI JWT locale: riconoscimento del confine del repository anche dal manifest npm dei workspace quando manca `.git`. Il workspace fratello resta vietato prima della lettura del materiale; la directory dedicata `.local` resta ammessa. Due prove con manifest sintetici e senza Git, oltre alla suite esistente; nessuna lettura delle chiavi dell’utente.
3. Igiene artefatti: dichiarata la proprietà del solo snapshot pubblico ChEMBL della demo, con README e validatore tracciati obbligatori. Il gate esegue il validatore; snapshot sconosciuti restano vietati, compresi file nella stessa cartella. Nessuna eccezione generica per directory o estensione.
4. Fixture Angular: `OnPush` sullo stub geometrico Turnstile, senza modifiche al widget reale. Quattro helper consumati soltanto dai test dichiarati nell’inventario non produttivo esistente; il controllo negativo continua a rifiutare gli orfani sconosciuti.
5. Inventario REST: rigenerato con lo strumento canonico e diff riesaminato. Due riferimenti di validazione telefonica passano da `Matches` a `Equals`, come nel codice già presente. Restano 69 chiamate client, 69 abbinate e 68 route Nest distinte; nessuna modifica della policy telefonica in questa riparazione.

## Evidenze locali

- `npm run ci:static` completo verde, dopo la correzione dei blocchi emersi progressivamente. Non eseguiti `npm ci` o `npm run ci:check` locali.
- Lint e typecheck dei file Nest modificati verdi; **34 test JWT** e **48 test login/layout** verdi.
- **4 test policy TestController**, **10 test demo**, gate igiene e test negativi, controlli di topologia/orfani e compatibilità REST con casi negativi verdi.
- Diff e controllo TS-01 senza candidati rimovibili. Nessun gate disabilitato, nessuna modifica agli esiti dei task numerati o a dipendenze/lockfile. Sessione e servizi dell’utente conservati.

Log aggiuntivi locali: `mercurion-f08-static-final.log`, `mercurion-f08-jwt-tests.log`, `mercurion-f08-login-tests.log`, `mercurion-f08-typecheck.log`, `mercurion-f08-angular-topology.json` e `mercurion-f08-semicolons.json`, nella cartella degli artefatti sopra indicata.

## Rilancio remoto

Correzioni nel commit `c205a2565` e [CI completa 42022148830](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/42022148830), con `validation_mode=full`. Prerequisiti Windows/Linux, sei container, suite Nest, E2E Nest, build/catalogo e supply chain verdi. Due fallimenti downstream, prima non eseguiti: test Angular del tooltip telefonico (1.281 successi su 1.282) e selettore obsoleto del titolo login nel percorso browser (13 successi, un fallimento).

Seguito: il test del tooltip ora usa un target a posizione nota nella viewport con focus senza scroll, conservando la tolleranza di 2 px e ripristinando lo scroll. Il titolo login atteso è «Accedi a Mercurion», confermato dallo snapshot DOM del run; la frase precedente è un paragrafo e viene controllata separatamente. Nessuna modifica del prodotto per adattarlo ai test.

La suite Angular locale successiva passa 1.282 test, ma il gate coverage segnala branch non coperte di AuthSessionRepository (0%, minimo già esistente 4%). Aggiunte otto prove su lease contese/scadute, ownership, scope HTTP/WS, claim TTL, rotazione/eventi/timeout e rimozione listener, con persistenza in memoria; nessun abbassamento delle soglie. Rilancio completo: **1.290 test Angular verdi e gate coverage verde** (branches 66.78%, functions 71.24%, lines 81.81%, statements 79.06%; sette regole high-risk invariate). Log `mercurion-f08-angular-coverage.log` e `mercurion-f08-angular-coverage-gate.log`.

Queste ulteriori correzioni sono nel commit **`149ab9b2900a1e883574f83fe7da5297269a83f9`**, verificato dalla [CI completa 42026147278](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/42026147278): workflow concluso con **success**, incluso il **Required gate**. Verificati prerequisiti Windows/Linux, sei container, suite Angular con coverage, suite Nest, E2E, percorsi browser, build/catalogo e supply chain. Non è un esito parziale o una deduzione dai controlli locali.

Metadati del run e job conservati localmente in `mercurion-f08-ci-42026147278.json` e `mercurion-f08-ci-42026147278-jobs.json`. Gli artefatti browser del run precedente confermano il titolo corrente nel suo snapshot DOM. I percorsi browser CI usano il proprio ambiente e fixture: non chiudono le prove reali di provider, sessioni indipendenti, recupero eventi, Safari fisico e accessibilità manuale rimaste nei TODO F-01–F-07. F-09 resta la review finale TS-01. L’eventuale commit successivo del solo verbale riceve una verifica CI distinta prima della consegna.
