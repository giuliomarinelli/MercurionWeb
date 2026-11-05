# F-09 — Review tecnica e consegna del branch

5 novembre 2026. **Review tecnica TS-01 completata.** L’utente rinvia le ultime prove manuali/runtime a una fase successiva e gestisce personalmente `git flow bugfix finish`. Nessun merge eseguito dall’agente.

## Perimetro e risultato

Riesaminati 1.320 file TypeScript manuali tracciati: zero terminatori rimovibili dal controllo sintattico. Restano esclusi due file generati e 19 fixture, sotto il controllo dei rispettivi generatori o contratti di test. Configurazioni Prettier radice, Angular, Nest, Data e landing confermate con `semi: false`.

Riesaminati i blob prima/dopo dei commit `06d5e419` e `3ae96c16`: rispettivamente 627 file / 15.403 rimozioni e 62 file / 967 rimozioni. Per tutti i 689 file l’output coincide con la trasformazione deterministica e l’albero sintattico resta invariato. Un controllo separato conferma identici commenti, stringhe, template e regex. Nessun diff funzionale rilevato in queste due passate.

La review delle eccezioni distingue:

| Categoria | Quantità dopo F-09 | Motivazione |
| --- | ---: | --- |
| Separatori sulla stessa riga | 1.075 | Separano membri di tipi o istruzioni; eliminarli senza riformattare produce errori o modifica l’albero sintattico |
| Confini ASI | 31 | Impediscono di collegare l’espressione successiva alla precedente, per esempio il `Subject` seguito da una IIFE nei servizi Data |
| Delimitatori `for` | 52 | Parte della grammatica del ciclo |
| Istruzioni vuote protette | 3 | Guardie iniziali prima di espressioni parentetiche nei test `global.guard.spec.ts` e in `HelpService.stampTicket`; mantenute intenzionalmente dalla trasformazione conservativa. Non tutte sono strettamente necessarie nel contesto corrente |

La verifica indipendente di ogni separatore non protetto conferma che la sua eliminazione singola produce un errore di parsing o cambia la struttura sintattica. Nessun elemento vuoto di classe rilevato. Rimossa invece l’istruzione vuota superflua dopo `HttpErrorPage`: unica correzione sorgente di F-09, priva di effetto runtime. Le tre guardie esplicite sopra restano eccezioni accettate, senza dichiararle delimitatori obbligatori.

Verifiche ripetibili:

```powershell
node --test scripts/typescript-semicolons.test.mjs
node scripts/typescript-semicolons.mjs
git diff --check
```

Otto test del trasformatore superati. Audit esteso conservato fuori dal repository in `C:/Users/giuli/.codex/artifacts/mercurion-f09-review.mjs` e `mercurion-f09-review.json`: inventario, conteggi, esempi, confronto dei commit e nessuna anomalia. I conteggi storici di TS-01 restano riferiti alle rispettive passate; F-09 aggiunge una sola rimozione esplicita.

## CI e consegna

Baseline verificato sullo SHA `b0a5255fa64e354a7b30ac76d2a200931f7163b1`: [CI full 42028088753](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/42028088753) conclusa con successo, incluso Required gate. Le correzioni F-08 e i controlli locali F-10 restano documentati nei rispettivi verbali. Il commit di F-09 viene consegnato solo dopo push e verifica di un nuovo run full sul suo esatto SHA; l’esito finale e il link al run sono riportati nella consegna, evitando di confondere il baseline con il nuovo HEAD.

Git Flow AVH `1.12.4-dev0` disponibile; base configurata del bugfix: `develop`. Al controllo iniziale `origin/develop` era `4f5007fd77fda4d290a3bd6abe0beb25f2f866a1`, antenato di HEAD, senza commit entranti. Nessuna integrazione necessaria o eseguita dall’agente. Commit e push autorizzati, firma disabilitata per singolo comando; configurazione GPG persistente conservata.

Comando riservato all’utente, da eseguire dopo la consegna e tenendo conto di eventuali avanzamenti remoti successivi:

```powershell
git -c commit.gpgSign=false flow bugfix finish 6abfd27de7c18baf04198c71-technical-debt-recovery-2
```

## Accettazione rinviata per decisione dell’utente

F-01–F-07 restano aperti nei [TODO finali](FINAL-TODO.md), con le evidenze e i limiti originari. Per questa chiusura del bugfix sono rinviati e non bloccanti per esplicita decisione dell’utente del 5 novembre. Nessuna prova con provider reali, Safari fisico, screen reader, sessioni indipendenti o nuovo runtime viene dichiarata superata. Restano da diagnosticare i 502/disconnessioni F-03 e l’anomalia storica del primo salvataggio PX-09 non riprodotta; la review tecnica non ne dimostra la risoluzione. Nessuna dichiarazione di conformità WCAG o accettazione prodotto completa.
