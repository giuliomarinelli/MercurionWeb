# QA tastiera mobile — regressione trasversale

Aggiornato: 7 ottobre 2026. Riferimento reale: iPhone 13 mini, iOS 18.7.1, Safari. Stato: correzioni implementate, verifica fisica aperta.

## Regola di composizione

Usare l'altezza effettivamente visibile, non presumere che la tastiera riduca anche il layout viewport. Il servizio viewport esistente governa la geometria degli overlay. Sotto 500 px di altezza visibile su mobile, ridurre il contenuto fisso e privilegiare il campo attivo e il compito corrente. Mantenere un proprietario dello scroll riconoscibile, senza introdurre scroll concorrenti nel corpo compatto.

La ricerca mantiene sorgente, campo e chiusura; titolo e aiuto restano accessibili ma non occupano righe visive. Negli ActionComponents i comandi secondari possono essere espansi, senza perdere selezioni. Il footer resta persistente quando c'è spazio; sotto 260 px torna nel flusso scrollabile. Ogni campo deve restare raggiungibile sotto l'header e sopra il footer. Non disabilitare lo zoom; campi touch almeno 16 px.

## Matrice dei blocchi già trattati

| Blocco / componente | Prova Chrome in questa revisione | Prova Safari fisico |
|---|---|---|
| 01 / CreateCollection | Campo bozza, aggiunta nome e azioni a 375×350 | Aperta |
| 02 / SelectCollectionThenRoute | Filtro Aro, opzione e azioni a 375×350 | Aperta |
| 02 / BindCollectionsToMolecule | Filtro Aro, elenco e selezione multipla espandibile a 375×350 | Aperta |
| 03 / AddMoleculesToCollection | Sorgente personale, filtro rosaram, card e footer a 375×350 | Aperta |
| 04 / MoleculeCollectionItemSave | Destinazione, nome bozza a 375×350; note a 375×220 | Aperta |
| 05 / SearchOverlay | Query Pr, 204 px per risultati a 375×350; apertura dettaglio, cambio sorgente, empty | Aperta |
| Riferimento settings / PX-13 | Revisione precedente disponibile; nuovo giro specifico con tastiera non completato in questa sessione | Aperta, includere tutti gli overlay di modifica con input |

Le misure Chrome e i test di visual viewport isolano geometrie e regressioni; non certificano la tastiera nativa Safari. Per settings, includere SensitiveDataChange, modifica profilo/contatti, credenziali e verifica OTP applicabili; osservare senza inviare cambiamenti reali all'account.

## Giro sul dispositivo, prima dell'accettazione

Per ogni riga:

1. Aprire il pannello in verticale con tastiera chiusa; mettere a fuoco il primo campo e digitare un valore rappresentativo.
2. Verificare campo, cursore, chiusura e azioni raggiungibili; per ricerca/selezione devono rimanere visibili e scrollabili i risultati. Controllare le selezioni dopo apertura dei comandi multipli.
3. Passare all'ultimo campo (nome lungo, etichetta e note per salvataggio); scorrere e verificare che header/footer non coprano il focus.
4. Chiudere con Fine e riaprire la tastiera: nessun salto fuori viewport, nessuna perdita di query, selezioni o bozza; altezza normale ripristinata.
5. Ripetere in orizzontale e nei due temi. Non inviare operazioni reali su dati o credenziali per una sola prova geometrica.
6. Registrare esito, componente, tema e screenshot se fallisce. La singola riga rimane aperta finché non supera il controllo sul dispositivo.

## Seconda segnalazione: campo nome coperto dal footer

Lo screenshot IMG_9685 mostra il nome della molecola con cursore sotto il footer e bordo dell'input non visibile. Il criterio è: tutta l'area del campo attivo, incluso il bordo/focus, deve stare sopra il bordo superiore delle azioni, non semplicemente dentro il pannello. Il test ActionCard verifica ora anche questa condizione con campo già attivo prima della contrazione della visual viewport e layout viewport invariata; suite mirata: 10 test superati.

L'utente ha confermato che la foto precede le ultime correzioni; non costituisce quindi evidenza di una nuova regressione sulla versione aggiornata. Rimane aperta la conferma su Safari dopo il caricamento di queste modifiche. Ripetere nome vuoto e compilato, passaggio alle note, chiusura/riapertura tastiera; controllare il bordo del campo rispetto al footer.

## Chiusura e continuità

La review manuale resta necessaria. Il prossimo blocco previsto è PX-05; il controllo tastiera entra anche nell'accettazione dei futuri blocchi con form, ricerca e overlay. Prima del merge, tutte le righe applicabili devono avere esito verificato, inclusi gli overlay settings. Il riscontro fisico va fatto sulla build che contiene queste modifiche, senza affidarsi a una scheda Safari rimasta sulla versione precedente.

Prove e limiti della sessione: [DAILY-LOG.md](DAILY-LOG.md). Fonte sul comportamento delle viewport: [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).
