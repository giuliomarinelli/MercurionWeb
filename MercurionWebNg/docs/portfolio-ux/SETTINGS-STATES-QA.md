# Settings OTP/MFA e preautenticazione login

27 ottobre 2026 — blocco 19 / PX-13 e integrazione richiesta nel login PX-03. Implementazione in review; accettazione con effetti reali ancora aperta.

## Interventi

- OTP con tastiera numerica, autocomplete one-time-code, focus sul campo quando viene inserito nel DOM, reinvio esplicito e ritorno al passo precedente. L'apertura di un campo nuovo non deve mostrare già l'errore obbligatorio. Distanza di 16 px fra istruzioni e pannello OTP nei flussi di attivazione/disattivazione MFA.
- Countdown condiviso in `components/common/otp-challenge-clock`: Settings e login e-mail/SMS usano `expiresAt` e `timestamp` della risposta, calcolando un intervallo relativo al server. Nessuna durata inventata se i metadati mancano. Indicazione approssimata, non validatore: il backend ammette una finestra TOTP e decide se il codice è valido. Nessun countdown dell'invio per app TOTP o backup code.
- Settings: niente invii o verifiche sovrapposti. Dopo un errore si può ricominciare con un nuovo token; un token consumato non viene riutilizzato automaticamente. Annullamento e distruzione cancellano richieste, aggiornamenti accodati, token, chiave manuale e QR dal componente. Questo cleanup locale non equivale a una revoca server: restano i TTL e le regole esistenti.
- Il fallimento della generazione dei codici di backup successivo all'attivazione non trasforma una MFA già attiva in un falso fallimento. Avviso distinto e rilettura dei metodi, senza rigenerazione automatica dei codici monouso. Rimuovendo l'ultimo metodo primario, anche BACKUP_CODE scompare dallo stato locale, come nel backend.
- QR e chiave manuale contenuti su mobile; codici di backup in griglia, copiabili. Conservati tutti i 24 tracciati SVG originali del workflow. Nessuna sostituzione delle icone scelte dall'utente.
- Corretto il quantificatore `{8, }` nel validatore della nuova password: ora `{8,}`, coerente con la regola già presente nella registrazione.

## PreAuthorizationToken nel login

La validità del codice e quella della preautorizzazione sono distinte. Il countdown OTP non rinnova il JWT.

Il frontend verifica la scadenza locale durante l'attesa, al ritorno sulla scheda e prima di cambiare metodo o verificare un codice. Alla scadenza cancella stato e marker della preautenticazione, richieste e codice, poi torna al login conservando l'intento di destinazione. Il controllo temporizzato è soggetto al throttling del browser; i controlli prima delle azioni e al ritorno sulla scheda restano necessari.

La revoca remota viene accertata dal backend alla richiesta successiva: non esiste un nuovo canale push o endpoint di polling per scoprirla immediatamente. Durante l'inizializzazione, un 401 rifiuta la preautorizzazione; durante la verifica sono terminali i codici stabili di preautorizzazione scaduta/non valida e di dispositivo diverso. Una risposta tardiva dopo la chiusura del flusso non installa una sessione nel client.

Il sorgente Nest attuale revoca il token **prima** del controllo di OTP e backup code. Anche un codice errato richiede pertanto un nuovo accesso: l'interfaccia non propone di riutilizzare lo stesso token. La regola backend non è stata modificata. Un errore di rete non viene presentato come prova di revoca; un successivo rifiuto esplicito del server termina il flusso. L'annullamento client non garantisce l'annullamento di un'operazione già ricevuta dal server.

## Prove e loro limiti

Fixture Angular con componenti e CSS reali, trasporti simulati: richieste duplicate, token sostitutivo al reinvio, errori 401/429, errore catalogo, fallimento backup dopo attivazione riuscita, rimozione ultimo metodo, QR invariato tornando indietro, cleanup dopo annullamento/distruzione, validazione password e focus iniziale. Geometria a 375/640/1280 px nei due temi, altezza 430 px: QR, OTP, loading e risultato con backup; assenza di overflow e spazio minimo del loader. Il test del tooltip preesistente ora mantiene il target visibile con spazio sopra: la precedente fixture provocava il legittimo ribaltamento del fumetto sotto il controllo.

Login attraversato con RouterTestingHarness e persistence reale: countdown e-mail/SMS, cambio metodo senza countdown TOTP residuo, rifiuto all'inizializzazione, token scaduto durante attesa/prima dell'invio, codice errato, dispositivo diverso, revoca segnalata dal server, risposta tardiva e errore di rete. Gli invii sono mock; il toast è simulato per isolare il flusso dalle sue animazioni e temporizzazioni.

Il primo gruppo di sei regressioni MFA falliva prima delle correzioni. Le successive prove ampliano la copertura; non vengono presentate come tutte dimostrate prima/dopo. I risultati automatici non costituiscono accettazione grafica o consegna SMS.

Browser Chrome autenticato via Computer Use su localhost:8888: apertura del selettore MFA, layout mobile chiaro 375×812, desktop scuro, Escape e ripristino del focus sul pulsante di apertura. Account osservato senza telefono e senza MFA; nessun invio o modifica di credenziali eseguiti dall'agente. Il nuovo login OTP è verificato con trasporto simulato, non con un accesso reale dell'agente.

Artefatti locali: `C:/Users/giuli/.codex/artifacts/mercurion-settings-19-2026-10-27/`. Prima di una pubblicazione portfolio rivedere e anonimizzare tutte le catture. I dati sintetici nei test non sono credenziali operative.

### Esiti finali

- **186 test superati** in una singola esecuzione mirata, inclusi i 7 test canonici caricati dal setup; i precedenti sottoinsiemi non si sommano a questo totale.
- Typecheck/template `ngc -p tsconfig.app.json --noEmit` e lint dei file TypeScript modificati superati.
- Build Angular production con stats, gate bundle e lazy boundary chimica superati: iniziale **953.040 / 1.000.000 byte**. Restano i warning preesistenti della soglia indicativa da 500 kB e dei tre budget CSS; nessuna soglia modificata.
- Controllo styling e quattro fixture negative superati; controllo documentazione e `git diff --check` superati. Nessuna CI remota eseguita.
- Cattura finale desktop scuro ispezionata (`after-chooser-final.png`); chiusura con Escape e focus nuovamente sul pulsante di apertura verificati anche dopo l'ultima build. Tema automatico e viewport originale ripristinati.

Comando della suite finale, da `MercurionWebNg`:

```powershell
..\node_modules\.bin\ng.cmd test --watch=false --karma-config=karma.conf.js --include=src/app/pages/settings/*.spec.ts --include=src/app/components/action-components/sensitive-data-change/*.spec.ts --include=src/app/components/common/mfa-strategy-card/*.spec.ts --include=src/app/testing/action-overlay-form-accessibility.spec.ts --include=src/app/pages/login/**/*.spec.ts --include=src/app/pages/login/*.spec.ts --include=src/app/services/auth-state.store.spec.ts --include=src/app/components/common/otp-challenge-clock/*.spec.ts
```

## Accettazione ancora aperta

- Smoke test reale dei singoli flussi e-mail/SMS, app TOTP e backup code con un account autorizzato; reinvio, errore, scadenza, revoca e nuovo login. La precedente prova diretta Twilio confermata dall'utente non copre automaticamente questi percorsi.
- Safari fisico su iPhone 13 mini con tastiera aperta, viewport basse, ritorno/focus e lettura completa del codice/QR.
- Varianti SSO, account con/senza telefono e MFA, aggiornamenti fra sessioni e tab, review manuale e CI sul commit definitivo.
- La revoca immediata del JWT dal server quando si abbandona soltanto la pagina non è un comportamento introdotto da questo intervento.
