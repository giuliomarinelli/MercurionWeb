# Mercurion — programma giornaliero per completare l’applicazione

**Proposta del 5 novembre 2026, da assegnare e adattare giorno per giorno.** Obiettivo: un caso studio per clienti software B2B che mostri codice, UX e comportamenti reali in modo ripetibile. I giorni sono sessioni indicative, non date o stime garantite. Un difetto rilevante può richiedere una sessione aggiuntiva prima di proseguire.

Il programma riguarda l’applicazione e la sua QA. La [VM locale](../../../docs/infrastructure/local-vm-deployment.md) è una progettazione separata, ancora preliminare. La roadmap e i report di QA restano la fonte dei dettagli; i test sintetici non diventano automaticamente accettazione finale.

## Giorno 1 — Percorso molecolare e salvataggio reale

- Leggere lo stato del working tree e le prove [editor](EDITOR-STATES-QA.md), [demo](demo/QA.md) e PX-09, preservando il lavoro in corso.
- Preparare fixture identificabili per una prova reale; percorrere ricerca → dettaglio → associazione a collezione → editor → salvataggio → refresh e riapertura. Rileggere i dati persistiti e controllare che nome e struttura corrispondano.
- Riprodurre e classificare l’anomalia del primo salvataggio PX-09; provare annullamento, errore e retry quando è possibile farlo in modo controllato. Correggere i difetti confermati nel perimetro e ripetere lo scenario.
- **Consegna:** esiti per passaggio, evidenze reali distinte da fixture o intercettazioni, eventuali difetti residui e prossima azione. Non marcare riuscite le prove non eseguite.

**Ripresa del 5 novembre:** [percorso persistente eseguito e verbale del Giorno 1](DAY-1-QA.md). Verificati creazione, associazione, editor, annullamento, controllo duplicati, errore di trasporto controllato e retry reale con riapertura. L’anomalia storica PX-09 non è riprodotta e non è dichiarata risolta; restano review e verifiche successive indicate nel verbale.

## Giorno 2 — Realtime e continuità delle sessioni

- Usare notifiche e, dove pertinente, collezioni per verificare aggiornamenti tra due schede; distinguere due schede della stessa sessione da due sessioni indipendenti.
- Provare disconnessione/riconnessione, recupero eventi e stato visibile, evitando perdita di lavoro o falsi successi. Verificare scadenza, logout/revoca e ritorno al login con account e dati di prova appropriati.
- **Consegna:** matrice delle prove effettive e uno scenario dimostrativo realtime con limiti dichiarati. Isolamento account e perdita di dati precedono le rifiniture estetiche.

## Giorno 3 — Flussi account, supporto e QA aperta

- Riprendere i residui pertinenti di login/MFA, aggiunta e rimozione telefono, supporto/ticket e pagine complementari del blocco 23. Verificare errori, focus e ritorno al lavoro.
- Distinguere test reali di invio e persistenza da risposte simulate; evitare messaggi reali non necessari. La prova SMS diretta già confermata dall’utente non sostituisce le prove dei singoli flussi OTP/MFA.
- **Consegna:** casi chiusi e aperti; correggere i problemi riprodotti nel perimetro della sessione.

## Giorno 4 — Compatibilità, accessibilità e demo B2B

- Ripercorrere i flussi principali nei due temi e alle larghezze rilevanti; verificare tastiera, focus, zoom e reduced motion. Coinvolgere l’utente per la prova fisica iPhone/Safari e tastiera virtuale, quando disponibile.
- Aggiornare il [copione B2B](demo/README.md) e selezionare schermate coerenti con il comportamento attuale. Separare demo con dati persistiti e anteprima con trasporto sintetico.
- **Consegna:** matrice browser/dispositivi realmente provati, difetti osservati e limiti residui; non equiparare viewport emulata e dispositivo fisico.

## Giorno 5 — Pulizia, review e bilancio

- Affrontare TS-01 sui file TypeScript manuali coinvolti nei refactor con strumenti consapevoli della sintassi, conservando i separatori necessari e le modifiche dell’utente. Se il perimetro o le verifiche richiedono più tempo, suddividere il lavoro senza anticipare la chiusura.
- Fare il bilancio dei diff e delle prove, rieseguire i controlli pertinenti dopo l’ultima modifica e preparare la review manuale estesa dell’utente. Distinguere gate locali e risultati CI effettivamente verificati.
- **Consegna:** difetti aperti, limiti da decidere insieme, documentazione aggiornata e risultato pronto per la review; nessun merge implicito.

## Cosa resta fuori da queste giornate

Notebook e Synthesis restano rinviati e disabilitati; anche l’integrazione object store/R2 è rinviata. Il loro eventuale completamento richiede attività e QA dedicate. Passkey è una proposta opzionale. Rotazione JWT e MeiliLogger hanno residui applicativi/di integrazione da rivalutare in base al perimetro dimostrativo concordato; la progettazione del loro deployment non viene anticipata qui. L’aggiornamento Angular/Node segue la sequenza già concordata dopo le macro-feature, salvo una nuova decisione dell’utente.

**Primo incarico consigliato per oggi:** Giorno 1, limitato al percorso molecolare con salvataggio e riapertura. Se emergono difetti critici, correggerli prima di allargare la sessione.
