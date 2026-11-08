# BUG-SUPPORT-01 — notifiche operatori e toast della conversazione aperta

- **Tipo:** bugfix trasversale: logica backend, email/outbox, notifiche persistenti,
  UX e gestione condizionale dello stato frontend.
- **Stato:** segnalato dall'owner l'8 novembre 2026, da diagnosticare e correggere.
- **Ambiente osservato:** sviluppo locale, `/help` su `localhost:8888`, due sessioni
  utente/supporto. Screenshot fornito in chat, con conversazione e toast sullo
  stesso ticket. Nessuna nuova riproduzione runtime eseguita per questo report.
- **Base sorgenti letta:** Web `3c2d7829d`, branch operativo
  `feature/infra-vm-docker-engine-architecture`.
- **Perimetro di questa consegna:** documentazione e roadmap, non implementazione.
  Non è una nuova ricetta autonomous-development e non autorizza invii di prova.

## Sintomi ed esito atteso

| Evento / contesto | Osservazione dell'owner | Esito atteso |
| --- | --- | --- |
| Utente apre un ticket | Operatore con `Scope.HandleTickets` e `Scope.ViewUsers` non riceve notifica in-app né email | Operatore idoneo avvisato su entrambi i canali |
| Utente scrive/risponde al supporto | Email all'operatore apparentemente assente | Email ricevuta dall'operatore idoneo |
| Utente scrive/risponde al supporto | La notifica in-app della risposta sembra arrivare normalmente | Preservare questo percorso e verificarlo nella stessa riproduzione |
| Arriva un messaggio mentre è aperto il dettaglio dello stesso ticket | Compare anche il toast; screenshot mostra conversazione aggiornata e toast ridondante | Aggiornare la conversazione realtime senza quel toast |
| Arriva un evento su un altro ticket, o il dettaglio è chiuso | Caso di controllo da verificare | Toast ordinario conservato |

L'assenza email è una segnalazione da tracciare fino alla consegna: non prova da
sola un guasto SMTP. La notifica in-app della risposta è riportata come funzionante
con riserva; non va confusa con quella mancante alla creazione del ticket.

## Riscontri statici e piste di diagnosi

1. [HelpService](../../MercurionWebNode/src/app_modules/help/services/help.service.ts)
   accoda `TicketOpenedSupport` / `TicketOpenedUser` e pubblica cambiamenti della
   risorsa. L'aggiunta di un messaggio utente crea anche
   `SupportUserReplyReceived` per destinatario. Il
   [catalogo in-app](../../MercurionWebNode/src/app_modules/notification/models/in-app-notification-catalog.ts)
   non contiene un tipo dedicato all'apertura ticket lato operatore: verificare
   esplicitamente la creazione della notifica persistente, distinta dal realtime.
2. I destinatari realtime usano `HandleTickets`; quelli delle notifiche di
   risposta richiedono `ViewUsers` e `HandleTickets`, fra utenti verificati,
   escludendo l'autore. Verificare la selezione effettiva e preservare la distinzione
   fra autorizzazione operativa e accesso ai dati personali. Non ampliare scope
   né richiedere nuovi permessi per aggirare il difetto.
3. [MailSenderService](../../MercurionWebNode/src/app_modules/notification/services/mail-sender/mail-sender.service.ts)
   invia apertura/messaggi supporto a `App.supportEmail` (`APP_SUPPORT_EMAIL`),
   non a un elenco ricavato dagli account operatori. Questo può spiegare una
   differenza fra destinatario atteso e configurato, ma non dimostra la causa
   dell'episodio. Tracciare produzione evento, outbox, risoluzione destinatari,
   eventuali ritorni anticipati, retry e consegna. Coordinare il ruolo della
   casella supporto legacy con il requisito di avvisare gli operatori idonei.
4. [InAppNotificationService](../../MercurionWebNg/src/app/services/in-app-notification.service.ts)
   presenta i cambiamenti `created` deduplicati senza una condizione sul ticket
   attivo. Esiste già un
   [TicketDetailContextService](../../MercurionWebNg/src/app/services/context/action-context/ticket-detail-context.service.ts):
   verificare il lifecycle reale dell'overlay prima di usarne l'identificativo
   come indicatore di apertura. Un ultimo ticket selezionato non equivale a un
   dettaglio ancora aperto.

Questi riscontri orientano il lavoro; la root cause completa resta da dimostrare.

## Vincoli del bugfix

- Sopprimere soltanto la presentazione del toast riferito al ticket il cui
  dettaglio è effettivamente aperto, confrontando l'identità della risorsa,
  non il titolo, il numero formattato o la sola route `/help`.
- Conservare notifica persistente, recupero eventi/cursori, contatori e refresh
  realtime. Non introdurre implicitamente azioni segna-letto/visto/elimina.
- Nessun toast tardivo per il medesimo evento già gestito a dettaglio aperto;
  chiuso il dettaglio, nuovi eventi tornano a produrre il toast una sola volta.
- Altri ticket e notifiche non correlate mantengono il comportamento esistente.
  Coprire sia l'utente sia l'operatore e il passaggio da un ticket all'altro.
- Distinguere aggiornamento risorsa, record notifica, toast, accodamento mail e
  consegna email: uno non dimostra gli altri. Deduplica/retry vanno verificati
  per evento e destinatario, senza perdere operatori o inviare doppioni.
- Preservare controlli di autorizzazione e redazione; nessuna migrazione o
  ricostruzione automatica delle notifiche storiche dedotta dalla segnalazione.

## Scaletta e accettazione

1. **Riproduzione e diagnosi:** utente e operatore dedicati, con i due scope
   indicati; apertura ticket e successiva risposta. Correlare ID evento/risorsa,
   persistenza notifiche, outbox e destinatari email, senza registrare credenziali
   o testo privato dei messaggi. Verificare anche ruoli parziali/non idonei e autore
   con capability supporto, rispettando le policy esistenti.
2. **Backend:** correggere produzione/catalogo/instradamento delle notifiche di
   apertura e destinatari email di apertura/messaggio; adeguare contratti e
   navigazione del nuovo evento se necessari. Testare fan-out, esclusioni,
   idempotenza e retry per destinatario.
3. **Frontend:** coordinare toast e stato effettivo del dettaglio ticket, con
   test su stesso ticket, ticket diverso, chiusura/riapertura, cambio ticket,
   eventi duplicati, recovery e reset sessione. Non compromettere gli altri toast.
4. **Accettazione runtime:** entrambe le sessioni ricevono gli aggiornamenti
   previsti; operatore idoneo riceve in-app/email all'apertura ed email alla
   risposta utente; percorso in-app già funzionante preservato. Sul medesimo
   dettaglio aperto niente toast ridondante, altrove toast singolo. Verificare
   navigazione, focus, temi e viewport pertinenti. Invii reali soltanto con
   destinatari/test autorizzati; un sink SMTP dimostra il recapito al sink,
   non alla casella reale. Richiedere CI esatta e review prima dell'integrazione.

Riferimenti di pianificazione: [roadmap applicativa](../../MercurionWebNg/docs/portfolio-ux/ROADMAP.md),
PX-15/PX-16 e accettazione residua [F-05](../../MercurionWebNg/docs/portfolio-ux/FINAL-TODO.md).
È lavoro applicativo distinto dalla scaletta INF-VM; non modifica da solo i suoi gate.
