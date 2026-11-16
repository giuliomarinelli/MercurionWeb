# Supporto e nuovo ticket — blocco 21 / PX-16

29 ottobre 2026. Implementato, in review. Perimetro: elenco Help, filtro dei ticket caricati, card/skeleton e creazione di una richiesta. Conversazione, storico e composer di risposta restano nel blocco 22.

## Comportamento consegnato

- Help presenta descrizione, conteggio e azione Nuovo ticket senza offset negativi. Conservati i tab PrimeNG e la distinzione utente/supporto; la creazione di una richiesta personale è raggiungibile dalla sezione utente.
- Pill **Tutti / Non chiusi** applicate soltanto ai dati caricati, senza nuovi parametri GraphQL o caricamento preventivo di tutto il dataset. Il testo esplicita il limite. Un filtro senza corrispondenze mantiene disponibile Carica altri ticket; Tutti ripristina i record caricati senza nuova richiesta.
- Stato vuoto distinto dall’errore iniziale; retry in italiano e pagine già caricate conservate dopo errori successivi. Paginazione automatica mantenuta, con caricamento esplicito alternativo. Pagine sovrapposte vengono unite per ID senza duplicare card.
- Card con oggetto fino a due righe, ID, stato, date esplicitamente distinte e azioni accessibili con nomi univoci. Pending per ticket contro invii ripetuti; errori di chiusura/riapertura visibili sulla card, senza perdita della lista. Le operazioni di supporto restano vincolate allo scope esistente.
- Skeleton con la stessa griglia e le stesse altezze riservate delle card, anche per ticket chiusi e metadati supporto. Conservati tutti i quattro tracciati SVG originali di Help/card, confrontati con HEAD. Nessuna icona eliminata.
- Nuovo ticket usa ActionCard, ActionFooter e Button condivisi; scrollbar thin conservata. Etichette sul controllo Quill reale e sui suoi otto pulsanti, messaggi di aiuto, contrasto delle icone in dark mode, adattamento al contenitore e alla modalità compatta.
- Corretto un difetto dati: ngx-quill fornisce il documento completo in `event.content`, mentre `event.delta` contiene soltanto l’ultima modifica. La creazione invia ora il documento completo e l’oggetto senza spazi esterni.
- Invio serializzato, controlli e chiusura bloccati durante la richiesta, Escape/backdrop coordinati con la sessione dell’overlay. Una risposta priva di ID non chiude più il form. Errore e risultato non confermato conservano la bozza e invitano a controllare l’elenco prima di riprovare, perché il contratto non garantisce l’idempotenza della creazione. Nessun retry automatico introdotto.
- Distruzione e sessione successiva impediscono a una risposta tardiva di aprire un dettaglio al posto di un altro overlay. Il successo confermato continua a invalidare l’elenco e aprire TicketDetail in modalità User.

Layout e stati nuovi usano Tailwind 4; CSS locale mantenuto per l’integrazione con il DOM Quill generato da terze parti. Nessuna nuova dipendenza, modifica al backend, al contratto, ai feature flag, ai segreti o ai dati reali. Nessuna operazione Git di scrittura.

## Prove automatiche

Baseline: 11 test superati, inclusi i 7 del setup canonico. Cinque regressioni nuove fallivano prima delle correzioni: documento incrementale, risposta senza ID, chiusura durante pending, risposta di una sessione precedente e assenza di errore inline dopo errore di trasporto.

**53 test mirati superati in una sola esecuzione finale**, inclusi i 7 del setup. Suite: Help, nuovo ticket, card, skeleton, geometria card/skeleton, overlay, servizio GraphQL Help e controller di paginazione. I conteggi intermedi non vanno sommati.

- Geometria con CSS reali in iframe a 320, 375, 768 e 1280 px, nei due temi: 8 test coprono 64 combinazioni di stato/modalità. Altezza e larghezza card/skeleton differiscono al massimo di 1 px; nessun overflow orizzontale.
- Test del widget Quill attende il vero evento di inizializzazione, emesso dalla libreria dopo un frame, prima di verificare etichette e toolbar. Axe sul componente inizializzato: nessuna violazione serious/critical.
- Coperti filtro locale, pagina filtrata senza risultati, recupero degli errori, merge per ID, invio ripetuto, scoping delle operazioni e pending Escape/backdrop.
- Typecheck, lint mirato, build production, gate bundle/lazy e styling con quattro fixture negative superati. Bundle iniziale **952.033 / 1.000.000 byte**, 21 moduli CommonJS. Conservati i warning preesistenti dei budget CSS e la soglia warning iniziale di 500 kB; nessuna soglia modificata.

Da `MercurionWebNg`, comando finale:

```powershell
..\node_modules\.bin\ng.cmd test --watch=false --karma-config=karma.conf.js --include=src/app/pages/help/help.page.component.spec.ts --include=src/app/components/action-components/new-ticket/new-ticket.component.spec.ts --include=src/app/components/support/ticket-card/*.spec.ts --include=src/app/components/support/ticket-card-skeleton/*.spec.ts --include=src/app/components/action-components/action-overlay/action-overlay.component.spec.ts --include=src/app/services/graphql/help.service.spec.ts --include=src/app/services/pagination/pagination-controller.spec.ts
```

Log finale: `C:/Users/giuli/.codex/artifacts/mercurion-support-21-2026-10-29/focused-tests.log`.

## Browser: evidenze e limiti

Usato esclusivamente **Playwright MCP**, su una scheda QA con l’autenticazione di sviluppo esistente e `localhost:8888/help`. Le mutazioni GraphQL della scheda sono intercettate: nessuna richiesta di creazione/chiusura/riapertura inoltrata al backend e nessuna e-mail/SMS inviata.

Sul form reale sono stati osservati il payload con documento completo, un errore HTTP 503 e un secondo invio trattenuto prima di rispondere con `createTicket: null`. In pending: editor readonly, Annulla/Invia/chiusura disabilitati. Dopo gli errori: testo, oggetto e avviso di invio non confermato conservati. Il successo verso TicketDetail e i flussi di chiusura/riapertura restano verificati automaticamente, senza dichiarare una prova browser di persistenza reale.

La scheda ha alternato visible/hidden; una sonda ha confermato frame sospesi e il resize ha lasciato temporaneamente le variabili del visual viewport ai valori precedenti. I tentativi nativi di click/focus e quella matrice di resize **non vengono conteggiati come accettazione**. Per i passaggi funzionali sono stati usati anche `fill` con force e `dispatchEvent('click')` tramite Playwright: non certificano hit testing, animazioni o focus reali. Non sono stati invocati metodi del componente per simulare un successo.

Per l’ispezione visiva è stata copiata in una scheda isolata la sola UI QA renderizzata, con i suoi CSS, senza codice applicativo o servizi. Qui **12 combinazioni statiche** nei due temi a 320×568, 375×812, 375×320, 640×500, 768×500 e 1280×720 verificano contenimento, assenza di overflow e footer raggiungibile; la modalità compatta è esplicita nella fixture. Screenshot del pannello mobile scuro, desktop chiaro e lista sintetica ispezionati. Questa prova riguarda il layout: non sostituisce il resize del runtime o la tastiera iOS.

Artefatti locali nella cartella del log: `new-ticket-static-mobile-dark.png`, `new-ticket-static-desktop-light.png`, `help-static-desktop-light.png`. Le immagini contengono soltanto fixture; nessuno screenshot dei ticket reali è destinato al portfolio.

## Residui e prossimo blocco

**Review del 29 ottobre — badge desktop:** su richiesta dell’utente, il badge è ancorato al bordo destro interno dell’intera card da 768 px, anziché alla fine della colonna del testo. Disposizione mobile e posizione delle azioni conservate; placeholder dello skeleton allineato allo stesso bordo. Il test geometrico controlla esplicitamente l’inset destro nei due temi e per tutti gli stati. Esecuzione mirata: 15 test superati, inclusi i 7 del setup; lint e whitespace superati. Log: `badge-alignment-tests.log` nella cartella degli artefatti già indicata. Questa esecuzione non va sommata alle precedenti 53 prove.

Restano smoke test manuale sul runtime visibile, focus/animazioni native, Safari fisico con tastiera, varianti account e verifica CI sul commit finale. Creazione reale di un ticket e consegna e-mail richiedono una prova autorizzata distinta. Schede dell’utente e runtime preesistenti preservati; chiuse soltanto le due schede QA.

Prossimo blocco: **22 / PX-16 — conversazione ticket**, con storico, caricamento precedente, composer, nuovi messaggi e scrolling. Il blocco 21 non ne certifica già il comportamento.
