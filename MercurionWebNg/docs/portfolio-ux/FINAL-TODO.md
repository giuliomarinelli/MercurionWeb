# TODO finali — accettazione residua

5 novembre 2026. Raccolta richiesta dall’utente per proseguire la scaletta senza ripetere i tentativi già bloccati dal canale browser. Questi casi restano aperti: non sono difetti corretti né prove superate.

| ID | Prova da completare | Prerequisito / evidenza attuale |
| --- | --- | --- |
| F-01 | Due sessioni indipendenti: isolamento, scadenza, revoca selettiva e ritorno al login | Playwright deve consentire un secondo contesto autenticato, oppure serve una prova manuale coordinata. Il collegamento corrente rifiuta `Target.createBrowserContext`. Due schede della stessa sessione sono già verificate |
| F-02 | Disconnessione/riconnessione controllata del solo client QA, recupero degli eventi persi e continuità delle bozze | Il controllo WebSocket della Page fallisce in `Runtime.addBinding`, anche su scheda nuova. Nessuna prova di recupero viene dedotta dagli errori spontanei |
| F-03 | Isolare i 502 del recupero notifiche e le disconnessioni spontanee osservati | Conservare diagnostica browser e servizi della stessa occorrenza; causa attualmente ignota. Le prove realtime riuscite non chiudono questo caso |
| F-04 | Account reali: singoli flussi OTP e-mail/SMS, TOTP/backup, aggiunta/rimozione telefono, scadenza/revoca, nuovo login e varianti SSO/anonime | Richiede identità e codici di prova gestiti in modo coordinato con l’utente. 225 test account/supporto e apertura/chiusura del selettore MFA verificati nel Giorno 3; nessun invio o modifica dei metodi eseguiti |
| F-05 | Ticket: invio/risposta, persistenza e notifiche reali, aggiornamento fra client indipendenti | Richiede un invio di prova esplicitamente autorizzato e coordinato, distinguendolo dalle fixture sintetiche. Nel Giorno 3 verificati apertura/chiusura del composer e test locali; nessun messaggio reale inviato |
| F-06 | iPhone 13 mini/Safari fisico, due temi, rotazione e tastiera su ricerca/salvataggio/settings; zoom reale 200/400% | Nel Giorno 4 verificate viewport Chrome, non dispositivo, tastiera nativa o zoom. Riprendere la matrice KEYBOARD-QA sulla build aggiornata |
| F-07 | Review accessibilità manuale: screen reader, contrasto/link non valutabili da Axe, attributi ARIA residui del supporto e iframe Ketcher | Matrice e risultati incompleti nel Giorno 4. Nessuna violazione rilevata nelle scansioni finali del documento principale non equivale a conformità WCAG |
| F-08 | Verificare la suite Angular completa e classificare gli errori SelectCore/ActionOverlay della prima esecuzione del Giorno 4 | Prima invocazione npm senza filtri effettivi, interrotta dopo 462/1281 test con 5 errori. Rilancio mirato diretto: 76 test verdi; non prova che gli errori della suite estesa siano risolti. Log locale conservato, nessuna CI remota verde dichiarata |

Dettaglio delle prove eseguite e dei limiti: [Giorno 2](DAY-2-QA.md), [Giorno 3](DAY-3-QA.md) e [Giorno 4](DAY-4-QA.md). I casi aperti non sono dichiarati risolti: vengono mantenuti per la verifica finale mentre prosegue la scaletta. Gli altri residui dei singoli verbali mantengono il proprio stato e verranno ricapitolati nella review finale.
