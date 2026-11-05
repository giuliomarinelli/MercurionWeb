# Giorno 1 — Percorso molecolare e persistenza

5 novembre 2026. **Percorso reale eseguito, in review.** QA interattiva con Playwright MCP su `http://localhost:8888`, account autenticato dall’utente e servizi locali gestiti dall’utente. Nessuna modifica al codice applicativo da parte dell’agente in questa ripresa.

## Esiti

| Passaggio | Evidenza | Esito e limite |
| --- | --- | --- |
| Ricerca → dettaglio | Ricerca reale `aspirin`, sette risultati; apertura di ASPIRINA, CHEMBL25, `molregno` locale 1280 | Nome, SMILES `CC(=O)Oc1ccccc1C(=O)O`, struttura, proprietà e quattro endpoint Tox21 caricati |
| Collezione dedicata | Creata `Molecole di riferimento · Demo25`, inizialmente vuota; associazione dal dettaglio | Nuova apertura della collezione: una molecola ChEMBL presente |
| Editor e cambio vista | Duplica dalla card; Disegno → Analisi live | Identità e struttura disponibili; nessuna modifica dell’originale |
| Annullamento | Apertura Salva → Annulla → nuova apertura | Struttura conservata e nessuna scrittura in questo passaggio; il form non era stato compilato prima dell’annullamento |
| Prima creazione personale | `Copia personale ASPIRINA · Demo25 · Giorno1`, etichetta `Demo25-G1`, nota identificabile | Primo invio riuscito; nome, struttura, etichetta e nota riletti dopo refresh |
| Duplicato | Nuova duplicazione della copia personale senza modifiche | Stato «Struttura già presente», azione Salva disabilitata |
| Modifica nel canvas | Sostituzione di un atomo con lo strumento N di Ketcher | Nuovo nome remoto e SMILES `NC(=O)Oc1ccccc1C(=O)O`; salvata `Variante dimostrativa da editor · Demo25 · Giorno1` |
| Cambio destinazione | Demo25 → altra collezione → Demo25, senza invio intermedio | Nome ed etichetta conservati; la scrittura finale e l’appartenenza riletta riguardano soltanto Demo25 |
| Errore controllato | Seconda variante modificata nel canvas, SMILES `CNC(=O)Oc1ccccc1C(=O)O`; abort di una sola mutation `AddCustomMoleculeToCollection`, limitato alla Page QA | Errore di trasporto indotto prima dell’invio al backend, messaggio inline, nome/etichetta/nota/destinazione conservati e pulsante nuovamente disponibile |
| Retry con Invio | Handler rimosso; Invio nel campo Nome della stessa form | Risposta GraphQL reale HTTP 200, senza `errors`, con ID, nome, SMILES e proprietà della nuova molecola |
| Refresh → riapertura | Reload completo, risposta remota `MoleculeItem`, ritorno alla collezione e apertura dalla card | Nome, struttura, etichetta, nota, proprietà e join coerenti; quattro elementi nella collezione, nessun duplicato prodotto dal tentativo abortito |

Il retry persiste `Variante retry da editor · Demo25 · Giorno1`, etichetta `Demo25-G1-retry-verificato`, massa molare 195.17399, logP 1.103, HBA 3, HBD 2, PSA 75.63 e due legami rotabili. Le proprietà provengono dal servizio e dalla successiva lettura del record; non sono una validazione scientifica indipendente. `molFormula` è `null` nella risposta e non viene inventata una formula.

## Distinzione fra prove reali e controllate

Creazione, associazione, canonicalizzazione, nome remoto, analisi, scritture riuscite e letture dopo refresh sono reali. L’unico fallimento intenzionale riuscito è un abort di trasporto della mutation della seconda variante: non simula una scrittura riuscita e non prova il comportamento dopo un commit dal risultato incerto.

Un primo tentativo di configurare l’abort ha restituito `Route is already handled`: la richiesta è arrivata al backend e ha creato la prima variante. Questo tentativo è escluso dalla prova di errore. L’handler è stato rimosso; la successiva prova ha confermato un solo abort, messaggio di errore e retry reale. Nessun handler è rimasto attivo.

Le fixture sono identificabili: una collezione, un elemento ChEMBL e tre elementi personali. Gli ID effettivi sono nel verbale locale `C:/Users/giuli/.codex/artifacts/mercurion-day1-2026-11-05/fixtures.json`, escluso dal materiale portfolio. Le risorse sono conservate per la review; nessuna cancellazione o sovrascrittura di dati preesistenti. Questo è un seed QA circoscritto, non l’esecuzione completa del dataset demo con tre collezioni e tre riferimenti ChEMBL.

## PX-09 e residui

L’errore storico del primo salvataggio, registrato il 6 ottobre nel diario, **non è stato riprodotto né dichiarato risolto**. Due creazioni personali sono riuscite al primo invio effettivo; la terza dopo l’errore indotto. Anche il retry con Invio è riuscito. Questi esiti non identificano la causa dell’episodio precedente e non sostituiscono la sua risposta originale mancante.

Durante la prova sono comparsi errori 502 su recupero notifiche e disconnessioni WebSocket, seguiti da richieste molecolari riuscite. Causa non isolata; non vengono attribuiti al salvataggio né trasformati in un intervento sull’infrastruttura. Da riprendere nel Giorno 2 insieme alla riconnessione.

All’inizio Playwright riportava una scheda nascosta; dopo una nuova scheda e il ritorno in primo piano è stata rilevata una viewport 0×0. Impostata a 1366×900 prima delle interazioni decisive. I tentativi precedenti senza esito non valgono come prove di difetto applicativo. Catture PNG non ottenute per timeout del browser: nessuno screenshot nuovo viene dichiarato verificato. Le evidenze correnti sono DOM/accessibilità e risposte di rete; Safari fisico, compatibilità, temi e accettazione visiva completa restano al Giorno 4.

## Controlli e seguito

Nella stessa ripresa, prima del login, **81 test Angular mirati superati**: regressioni editor di salvataggio/validazione/cache identità, overlay di salvataggio, servizio GraphQL delle molecole e draft. Presenti alcuni avvisi `NG0953` su output dopo distruzione. Al controllo finale è comparsa anche una modifica concorrente a `molecule-summary-card.view-model.ts`, non effettuata dall’agente e preservata: il risultato precedente non certifica le modifiche successive del working tree. Nessuna prova Nest corrente o certificazione CI remota dedotta da questo risultato.

Snapshot della riapertura conservato in `C:/Users/giuli/.codex/artifacts/mercurion-day1-2026-11-05/reopened-retry.yml`. Contiene lo stato DOM/accessibilità della fixture, non una cattura visiva.

Comando da `MercurionWebNg`, con `NG_CLI_ANALYTICS=false` e `CI=true`, albero dipendenze esistente:

```powershell
..\node_modules\.bin\ng.cmd test --watch=false --karma-config=karma.conf.js --include='src/app/pages/molecule-editor/*regression.spec.ts' --include='src/app/components/action-components/custom-molecule-collection-item-save/custom-molecule-collection-item-save.component.spec.ts' --include='src/app/services/graphql/molecule-collection-item.service.spec.ts' --include='src/app/chemistry/molecule-editor-draft.service.spec.ts'
```

La consegna funzionale del Giorno 1 è documentata; PX-09 resta un’anomalia storica non riprodotta. Prossima sessione proposta: **Giorno 2 — realtime e continuità delle sessioni**, includendo la diagnosi degli errori di recupero osservati. Nessun merge, push o deploy. Servizi dell’utente lasciati attivi.
