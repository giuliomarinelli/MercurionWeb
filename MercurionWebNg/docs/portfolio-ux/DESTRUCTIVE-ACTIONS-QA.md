# Conferme delle azioni distruttive

5 novembre 2026. **Corretto, in review.** Richiesta emersa dagli smoke test dell’utente; nessuna modifica ai contratti backend o ai flussi di autenticazione.

## Inventario e intervento

| Ingresso | Prima | Ora |
| --- | --- | --- |
| Elimina dalla lista Le mie molecole | Mutation immediata | Conferma con nome e avvertenza sull’eliminazione da tutte le collezioni |
| Elimina dalla lista Le mie collezioni | Mutation immediata | Conferma delle conseguenze anche per le molecole presenti solo nella collezione |
| Cancella cronologia nella sidebar | Richiesta immediata | Conferma esplicita; molecole e collezioni non vengono cancellate |
| Termina una sessione / tutte le sessioni nelle impostazioni | Revoca immediata | Conferma con avviso di nuovo login, inclusione della sessione attuale e possibile perdita di modifiche non salvate |
| Dettaglio molecola, dettaglio collezione, rimozione dalla collezione, notifiche singole/tutte | Conferma già presente | Comportamento conservato |

Un componente condiviso usa il DialogShell e i pulsanti esistenti: focus iniziale su Annulla, etichette e descrizioni collegate, Escape/backdrop prima dell’invio, blocco dei doppi invii e della chiusura durante pending, errore inline con retry sullo stesso oggetto. Il dialogo viene montato mediante portal CDK nel body, per evitare i limiti di stacking della sidebar. Il portal viene rimosso alla chiusura e alla distruzione del componente. Le animazioni di scomparsa delle card sono conservate.

Il ripristino della struttura dell’editor conserva la cronologia Undo e non elimina il record remoto: non è stato trasformato in una cancellazione irreversibile. La rimozione telefono e i cambi MFA mantengono il proprio workflow di conferma/autenticazione. Notebook e funzionalità rinviate non sono stati abilitati.

## Verifiche

- 97 test Angular mirati superati nella prima esecuzione, comprendendo le modifiche UX precedenti. Dopo la correzione del portal: 42 test mirati superati su conferma condivisa, sidebar, entrambe le liste e facade di sicurezza. Inclusi annullamento senza richiesta, false/errori di trasporto, retry e invii ripetuti.
- ESLint mirato, build Angular production, gate bundle/lazy e styling superati. Bundle iniziale 958259 / 1000000 byte, 21 CommonJS. Conservati i warning indicativi di budget CSS/iniziale; soglie non modificate. Dieci test Node del materiale demo e controlli documentali superati.
- Playwright MCP sul runtime locale dell’utente: apertura e annullamento dalle due liste, dalla cronologia e dal comando di uscita da tutte le sessioni. Nessuna cancellazione o revoca a questi ingressi durante l’annullamento. Focus iniziale Annulla, nome accessibile del dialogo, Escape e ritorno del focus al comando iniziale verificati.
- Creata una collezione vuota dedicata `QA conferme · 20261105`: zero richieste prima della conferma; abort di una sola mutation di eliminazione dopo la conferma, errore inline e dialogo conservato; handler rimosso, retry reale con risposta GraphQL `deleteMoleculeCollection: true`. Assenza della sola fixture dopo refresh verificata. Nessuna eliminazione delle fixture del Giorno 1 o di contenuti preesistenti.
- A 375×812, in scuro automatico e chiaro: nessun overflow orizzontale, pannello chiaro largo 333 px entro il viewport, pulsanti alti 48/50 px. Tema automatico e viewport desktop ripristinati. L’uscita dalle sessioni non è stata realmente confermata in questa verifica; la revoca HTTP è coperta dai test della facade e sarà ripresa con sessioni indipendenti nel Giorno 2.

Log locali: `C:/Users/giuli/.codex/artifacts/mercurion-destructive-tests.log`, `mercurion-confirmation-final-tests.log` e `mercurion-confirmation-build.log`. La prima verifica del portal ha intercettato una ricreazione indesiderata al cambio pending, corretta isolando l’attach dai segnali della vista e ripetendo i test. La prima verifica browser ha intercettato il dialogo della sidebar sotto il contenuto; il portal è stato introdotto e la cliccabilità di Annulla riprovata.

## Limiti e seguito

Le prove browser sono DOM, rete e interazioni, senza nuove catture PNG accettate: i tentativi di screenshot hanno incontrato timeout. Nessuna prova Safari fisica o accettazione visiva completa dedotta dalla viewport Chrome. CI remota da distinguere dai controlli locali; nessun merge autorizzato. Proseguire con Giorno 2: aggiornamenti realtime, riconnessione e sessioni indipendenti.
