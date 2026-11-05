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
| F-09 | TS-01: review finale dei separatori conservati e accettazione della pulizia | Seconda passata eseguita anche su Data, LandingFactory, contratti e Playwright: 16.370 terminatori rimossi nelle due passate; zero candidati nel perimetro allora inventariato di 1.318 file manuali, 1.105 separatori/guardie conservati. Due generati e 19 fixture esclusi. F-10 ripristinato localmente e F-08 verificato in CI; resta la review manuale, senza accettazione complessiva anticipata |

## Controlli completati

**F-08 — CI remota:** [verbale e log](F-08-QA.md). Correzioni verificate sullo SHA `149ab9b2900a1e883574f83fe7da5297269a83f9` dalla [CI 42026147278](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/42026147278), percorso full e Required gate verdi. Comprende prerequisiti Windows/Linux, sei container e job downstream. Nessun merge; non sostituisce F-01–F-07/F-09.

**F-10 — Ripristino validazione locale:** [verbale e limiti](F-10-QA.md). MercurionData: typecheck, lint senza warning, build, 19 unitari e 2 E2E HTTP isolati verdi. Landing: 4 test e build di 42 route verdi. Typecheck Playwright completo verde, senza nuova prova visuale o aggiornamento snapshot. Risultato locale in review; non sostituisce F-09 o le prove con provider reali.

Dettaglio delle prove eseguite e dei limiti: [Giorno 2](DAY-2-QA.md), [Giorno 3](DAY-3-QA.md), [Giorno 4](DAY-4-QA.md), [Giorno 5](DAY-5-QA.md) e [TS-01 completo](TS-01-QA.md). I casi aperti non sono dichiarati risolti: vengono mantenuti per la verifica finale mentre prosegue la scaletta. Gli altri residui dei singoli verbali mantengono il proprio stato e verranno ricapitolati nella review finale.
