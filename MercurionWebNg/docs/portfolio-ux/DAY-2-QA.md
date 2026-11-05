# Giorno 2 — Realtime e continuità delle sessioni

5 novembre 2026. **Avviato: sincronizzazione fra schede verificata; riconnessione controllata e sessioni indipendenti ancora aperte.** Playwright MCP su `http://localhost:8888`, runtime dell’utente. Questa verifica segue la [correzione delle conferme distruttive](DESTRUCTIVE-ACTIONS-QA.md).

## Prove reali eseguite

Due Page QA nello stesso contesto autenticato: condividono la sessione. Nessuna estrazione o copia di cookie, token o credenziali. Nessun refresh manuale nella scheda osservatrice durante le prove di propagazione.

| Scenario | Evidenza | Esito |
| --- | --- | --- |
| A crea una collezione vuota QA | B riceve un evento `sv.pub.state_changed` e rilegge `PaginatedCollections`; la card compare | Verificato |
| A rinomina la collezione | B riceve un secondo evento e una nuova lettura; nome della card aggiornato | Verificato |
| B mantiene una bozza di rinomina non inviata, A salva un altro nome | Titolo di B aggiornato dal server; input conserva `Bozza locale non inviata · Giorno2` | Verificato: la bozza non viene sovrascritta dall’aggiornamento remoto |
| B annulla la bozza | L’intestazione mostra il nome remoto corrente | Verificato |
| A elimina la sola collezione QA vuota, dopo conferma | Mutation reale `deleteMoleculeCollection: true`; B lascia il dettaglio e apre la lista con avviso della rimozione remota | Verificato |

La collezione QA è stata creata come `Realtime · Giorno2 · 20261105`, rinominata due volte e infine eliminata; non conteneva molecole. Nessuna modifica alle fixture del Giorno 1 o a collezioni preesistenti. ID conservato soltanto nel verbale locale `C:/Users/giuli/.codex/artifacts/mercurion-day2-fixtures.json`.

Le prove descrivono eventi e letture effettivi, non messaggi di stato iniettati. Le risposte molecolari non sono state intercettate o simulate. Le schede QA sono state chiuse; scheda e servizi dell’utente conservati.

## Prove non eseguite e causa

- **Sessioni indipendenti:** la creazione di un contesto Playwright isolato restituisce `Protocol error (Target.createBrowserContext): Not allowed`. Non è stato creato un secondo contesto e le due schede non sono presentate come due sessioni indipendenti.
- **Interruzione e riconnessione WebSocket controllate:** `page.routeWebSocket`, con forwarding previsto verso il server reale e limitato alla Page QA, fallisce in `Runtime.addBinding` con `No tab found for sessionId`. Ripetuto anche su una Page nuova `about:blank`, stesso errore. Nessuna disconnessione controllata né recupero degli eventi persi viene dichiarato verificato. Le Page del tentativo sono state chiuse.
- **Scadenza, revoca selettiva e logout fra sessioni indipendenti:** non eseguiti. Non sono stati revocati gli accessi dell’utente per aggirare la mancanza di un secondo contesto.
- **Notifiche reali:** non è stato generato un evento di supporto, SMS o e-mail per produrre artificialmente notifiche. La fixture sintetica della preview resta distinta dalla persistenza reale.

I 502 del recupero notifiche e le disconnessioni spontanee osservati nel Giorno 1 restano senza causa isolata. Non diventano prove di riconnessione riuscita. Per completare il Giorno 2 serve un collegamento Playwright che consenta contesti indipendenti e controllo del trasporto della sola Page QA, oppure una prova manuale coordinata con la seconda sessione.

## Controlli locali e Git

**34 test Angular superati**, su `realtime-socket.service`, macchina a stati della connessione, `session-sync.service` e trasporto di sincronizzazione. Log: `C:/Users/giuli/.codex/artifacts/mercurion-day2-unit.log`. Questi test non sostituiscono le prove browser mancanti. Nessuna nuova modifica applicativa necessaria per gli scenari fra schede eseguiti.

Commit applicativo delle conferme: `d433054d5`, inviato al ramo di lavoro senza merge. Alla verifica GitHub Actions non risultavano run associati a quello SHA: nessuna dichiarazione di CI verde. Le verifiche locali della correzione sono documentate separatamente. Il seguito resta circoscritto ai casi aperti sopra; nessuna migrazione o operazione infrastrutturale avviata.
