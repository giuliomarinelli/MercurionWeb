# TODO finali — accettazione residua

5 novembre 2026. Raccolta richiesta dall’utente per proseguire la scaletta senza ripetere i tentativi già bloccati dal canale browser. Questi casi restano aperti: non sono difetti corretti né prove superate.

| ID | Prova da completare | Prerequisito / evidenza attuale |
| --- | --- | --- |
| F-01 | Due sessioni indipendenti: isolamento, scadenza, revoca selettiva e ritorno al login | Playwright deve consentire un secondo contesto autenticato, oppure serve una prova manuale coordinata. Il collegamento corrente rifiuta `Target.createBrowserContext`. Due schede della stessa sessione sono già verificate |
| F-02 | Disconnessione/riconnessione controllata del solo client QA, recupero degli eventi persi e continuità delle bozze | Il controllo WebSocket della Page fallisce in `Runtime.addBinding`, anche su scheda nuova. Nessuna prova di recupero viene dedotta dagli errori spontanei |
| F-03 | Isolare i 502 del recupero notifiche e le disconnessioni spontanee osservati | Conservare diagnostica browser e servizi della stessa occorrenza; causa attualmente ignota. Le prove realtime riuscite non chiudono questo caso |
| F-04 | Account reali: singoli flussi OTP e-mail/SMS, TOTP/backup, aggiunta/rimozione telefono, scadenza/revoca, nuovo login e varianti SSO/anonime | Richiede identità e codici di prova gestiti in modo coordinato con l’utente. 225 test account/supporto e apertura/chiusura del selettore MFA verificati nel Giorno 3; nessun invio o modifica dei metodi eseguiti |
| F-05 | Ticket: invio/risposta, persistenza e notifiche reali, aggiornamento fra client indipendenti | Richiede un invio di prova esplicitamente autorizzato e coordinato, distinguendolo dalle fixture sintetiche. Nel Giorno 3 verificati apertura/chiusura del composer e test locali; nessun messaggio reale inviato |

Dettaglio delle prove eseguite e dei limiti: [Giorno 2](DAY-2-QA.md) e [Giorno 3](DAY-3-QA.md). I casi aperti non sono dichiarati risolti: vengono mantenuti per la verifica finale mentre prosegue la scaletta. Gli altri residui dei singoli verbali mantengono il proprio stato e verranno ricapitolati nella review finale.
