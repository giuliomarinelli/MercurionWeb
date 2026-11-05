# Giorno 3 — Account, supporto e pagine complementari

5 novembre 2026. **Verifiche eseguite, in review; prove con provider e invii reali residue.** Playwright MCP su `http://localhost:8888`, sessione e servizi dell’utente conservati. I casi aperti del Giorno 2 sono nei [TODO finali](FINAL-TODO.md) e non sono stati ritentati.

## Browser: pagine complementari

- **Feedback:** due POST intercettate nella sola Page QA, nessuna inoltrata al backend. Prima risposta HTTP 503: messaggio e valutazione Utilità 2/5 conservati, errore inline e retry abilitato. Seconda risposta trattenuta: form `aria-busy=true`, textarea e invio disabilitati. Conferma sintetica con ID: form svuotato; digitando una nuova bozza scompare la conferma precedente. Nessuna persistenza reale del feedback dichiarata. Handler rimosso al termine.
- **Rating da tastiera:** selezione con Spazio e avanzamento con Freccia destra; il payload intercettato conserva 2/5. Il controllo espone le etichette italiane delle cinque opzioni.
- **Contatti autenticati:** presenti i collegamenti a Supporto e Feedback, email/PEC e documenti. Nessun client email aperto. La variante anonima resta verificata nei test e da riprendere con F-01/F-04, senza terminare la sessione dell’utente.
- **AUP:** apertura da Contatti → `#aup`, focus al titolo e bordo superiore a 70.5 px con header a 54.5 px. Sommario → `#terms`, ritorno nella cronologia → `#aup`, focus coerente.
- **Privacy:** sommario → `#privacy-section-2`; dopo l’assestamento focus al titolo e medesimo offset di 16 px sotto l’header. La misura immediata prima dell’assestamento non è usata come esito finale.
- **403/404:** a 320×320, nessun overflow orizzontale; focus iniziale della pagina, ritorno indietro e comando autenticato verso `/dashboard` verificati. Il passaggio avanti nella cronologia ha raggiunto 404 ma l’attesa `load` di Playwright è scaduta; contenuto e azione sono stati verificati dopo il recupero, senza attribuire il timeout a un difetto applicativo.

### Correzione confermata — target delle azioni 403/404

Prima della modifica i due pulsanti misuravano **43 px** in altezza. Usata la variante `size="lg"` del pulsante esistente: **50 px** per entrambe le azioni, verificati nel browser su 403 chiaro e 404 scuro a 320×320. Nessuna modifica a testo, icone o destinazioni. Due test geometrici controllano il minimo di 48 px per entrambi i codici.

## Account/MFA e supporto

- Apertura reale del selettore MFA dell’account, senza attivare/disattivare metodi, generare QR o backup code, inviare OTP o modificare credenziali. A 320×320 dialogo contenuto e nessun overflow; Escape chiude e riporta il focus a «Configura metodi di autenticazione».
- Help → Nuovo ticket: focus iniziale su Oggetto, editor e toolbar disponibili, invio disabilitato con campi vuoti; Escape restituisce il focus al comando di apertura. Nessun ticket o messaggio creato, nessuna modifica dello stato di ticket esistenti.
- **225 test Angular mirati superati** per Settings, workflow sensibili, MFA/login, auth-state, countdown OTP e componenti/facade di supporto. Verificano stati, richieste, errori e conservazione delle bozze con trasporti simulati; non costituiscono consegna SMS/e-mail, autenticazione con provider o persistenza reale dei ticket.

La semantica corrente della preautorizzazione resta invariata: il countdown non ne rinnova la validità; un errore terminale esplicito del backend termina il flusso, un errore di rete rimane recuperabile. Non è stata introdotta una nuova policy di token o sessione.

## Verifiche e limiti

- **33 test complementari superati**, dopo la correzione dei target: feedback, contatti, privacy/termini, navigazione dei documenti, 403/404 e servizio feedback. Il conteggio è distinto dalla suite account/supporto e include il setup condiviso.
- Lint dei due file modificati, build Angular production, gate bundle/lazy, documentazione e diff check superati. Bundle iniziale 958259 / 1000000 byte, 21 CommonJS; warning indicativi preesistenti conservati. Nessuna CI remota dedotta dai controlli locali.
- Log locali: `C:/Users/giuli/.codex/artifacts/mercurion-day3-account-support-tests.log`, `mercurion-day3-complementary-tests.log` e `mercurion-day3-build.log`.
- Evidenze browser: DOM/accessibilità, interazioni, geometria e rete. Nessuna nuova cattura PNG accettata o prova Safari fisica. Emulazione del tema rimossa e viewport desktop ripristinata; chiusa soltanto la Page QA.

I residui reali di account/provider e ticket sono F-04/F-05 nei TODO finali. Il seguito della scaletta è **Giorno 4 — compatibilità, accessibilità e demo B2B**, con Safari fisico e review manuale da distinguere dalle prove Chrome.
