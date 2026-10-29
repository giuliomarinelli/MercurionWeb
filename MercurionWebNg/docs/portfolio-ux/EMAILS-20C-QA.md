# E-mail transazionali — blocco 20C / PX-15D

29 ottobre 2026. Implementato e verificato localmente, in review. L’utente ha comunicato smoke test positivi delle notifiche 20B e autorizzato il blocco successivo. Nessun invio reale, cambio account, accesso ai segreti o operazione Git di scrittura eseguito in questo blocco.

## Inventario e collegamenti

Le 13 chiavi del [registro](../../../MercurionWebNode/src/app_modules/notification/email-template-registry.ts) passano dal [MailSenderService](../../../MercurionWebNode/src/app_modules/notification/services/mail-sender/mail-sender.service.ts) e dallo stesso adapter Handlebars deterministico. `Email.defaults.from` deriva da `EMAIL_DEFAULT_FROM`; destinazione del supporto da `App.supportEmail`, base dei collegamenti da `App.activationOrigin`. Verificata la mappatura nel codice, non il valore effettivo degli ambienti. Nessuna variazione a mittente, credenziali SMTP o destinatari configurati.

| Chiave | Destinatario e scopo | Dati/destinazione |
| --- | --- | --- |
| account-confirmation | Nuovo account | Nome, `/account/activate#t=…` |
| forgotten-password | Account che richiede il recupero | Nome, `/password-recovery#t=…` |
| email-verification | Nuovo indirizzo | Nome, codice OTP, periodo configurato |
| email-changed-new-contact | Nuovo indirizzo confermato | Nome e nuovo indirizzo |
| email-changed-old-contact | Indirizzo precedente | Nome, nuovo indirizzo, istruzioni per operazione non riconosciuta |
| password-changed | Account interessato | Nome e indicazioni di sicurezza |
| mfa-login-code | Account in preautenticazione | Nome, OTP e periodo |
| mfa-enable-code | Account che attiva MFA e-mail | Nome, OTP e periodo |
| mfa-disable-code | Account che disattiva MFA e-mail | Nome, OTP e periodo |
| help-ticket-opened-user | Utente del ticket | Nome, ID pubblico, `/help?m=user&t_id=…` |
| help-ticket-opened-support | Supporto | ID pubblico, testo del messaggio, `/help?m=support&t_id=…` |
| help-message-added | Supporto | ID pubblico, testo del messaggio, `/help?m=support&t_id=…` |
| help-support-replied | Utente del ticket | Nome, ID pubblico, `/help?m=user&t_id=…`; corpo nullo previsto dal servizio |

Il parametro `t_id` contiene l’UUID interno già usato dalla route, mentre il testo mostra l’ID pubblico `MTCK-…`. I fragment dei link account sono conservati nel rendering. Verificati nel codice i consumer Angular: attivazione e recupero leggono `#t`; Help legge modalità e ID e gestisce l’assenza della risorsa. Non aperti link account nel browser autenticato, perché quei percorsi effettuano logout e possono consumare token.

## Correzioni

- Titoli di tre messaggi di assistenza erroneamente impostati su MFA; nuovo ticket erroneamente descritto come risposta; oggetti e-mail dei messaggi di supporto corretti.
- Viewport dichiarato, contenitore dimensionato includendo padding e bordi, wrapping di indirizzi e URL lunghi, CTA senza larghezza minima che spinge fuori il contenitore. Contrasto di testo, footer e codici verificato nei due temi.
- CSS essenziale inserito negli attributi dal mailer già installato; conservati i fogli per media query e dark mode, che prevalgono sugli inline tramite `!important`. Nessun caricamento di fogli remoti. Questa è una superficie e-mail, senza compilazione Tailwind; il CSS è centralizzato nel partial esistente e scritto in forma leggibile.
- Codici OTP con classe condivisa, zero iniziale conservato, sfondo e colore leggibili nei due temi. Il testo descrive il periodo di rotazione configurato e invita a usarli subito, senza promettere una durata residua a partire dall’arrivo dell’e-mail. Generazione/verifica TOTP, finestre e revoca non cambiano.
- Eliminati dalle e-mail i tempi fissi di attivazione/reset non ricavati dalla configurazione; aggiunte indicazioni per link scaduto. I TTL server restano quelli di `Jwt.activationToken.expiresInMs` e `Jwt.changePasswordToken.expiresInMs`.
- Anteprima assistenza estratta dalle inserzioni testuali del Delta, poi sottoposta all’escaping Handlebars. Non viene più presentato `contentHtml` come testo con tag visibili. Delta JSON legacy supportati; dati non interpretabili o soli embed producono anteprima assente, mantenendo il collegamento al ticket. Le notifiche già accodate con un contesto HTML preesistente non vengono riscritte e restano escaped.
- Link Help costruiti con URL/searchParams e origine normalizzata per evitare il doppio slash. Modalità, route, ID, header di correlazione e selezione dei destinatari conservati. Paragrafo dell’anteprima omesso quando nullo, senza spazio vuoto artificiale.

Partial del logo e sua visibilità preesistente conservati; nessuna icona rimossa. Nessuna nuova dipendenza, modifica a feature flag, schema dati, policy, durata dei token o regola d’invio. Il tempo di risposta supporto 48–72 ore preesistente è conservato: non è stata introdotta una nuova promessa commerciale.

## Verifiche ripetibili

Baseline: **21 test Nest superati**. Aggiunti cinque casi che fallivano prima delle correzioni: tre titoli, testo del nuovo ticket e assenza di stile inline della CTA. Esito finale: **50 test superati in una sola esecuzione**, nelle sei suite template, registro, sender, rendering con mailer reale/trasporto JSON, dispatcher outbox e schema configurazione. I conteggi intermedi non vanno sommati.

La prova con MailerModule reale conserva mittente e destinatario sintetici, oggetto, header di correlazione, fragment e codice con zero iniziale; JSON transport non contatta SMTP. Typecheck, lint mirato, build Nest e controllo dei 13 asset/4 partial compilati superati. Il controllo asset usa ora lo stesso adapter del runtime, anziché un rendering Handlebars che saltava l’inlining.

Playwright MCP su una scheda QA `about:blank`, senza navigare la scheda dell’utente o inviare richieste ai link:

- **104 combinazioni**: 13 template × 2 temi × 4 larghezze (320, 375, 768, 1280 px), con link lunghi, indirizzo lungo, caratteri speciali e codice `012345`.
- **13 fallback** a 375 px eliminando i tag `<style>`: contenuti e pulsanti restano leggibili con gli inline.
- Nessun overflow orizzontale, CTA alte almeno 44 px, destinazioni esatte, contrasto minimo misurato **6,70:1** sul testo controllato.
- Tab raggiunge la CTA; focus visibile con outline da 2 px nel tema scuro.
- Fixture negative: OTP scuro su sfondo scuro rilevato a **1,21:1**; min-width di 700 px rilevata come overflow nel viewport da 320 px.

Le stesse misure sono nel nuovo [test browser](../../../playwright/critical/email-templates.spec.js): 11 test registrati nella suite critical, caricamento verificato con `--list`. I 117 casi di rendering e i controlli focus/negativi sono stati eseguiti attraverso Playwright MCP usando la funzione di misura del test; non è stata lanciata una seconda automazione browser via CLI. L’esecuzione della suite con il runner e il gate CI sul commit finale restano da attestare. Screenshot OTP mobile scuro e assistenza chiara ispezionati.

Per produrre le anteprime dal build compilato, dalla root:

```powershell
npm run build --workspace mercurion_web_node
npm run ci:email-assets --workspace mercurion_web_node
npm run preview:emails --workspace mercurion_web_node
```

Aprire `MercurionWebNode/test-results/email-previews/index.html`. Sono esclusivamente dati sintetici; il comando non configura SMTP. Nella stessa cartella ignorata da Git: HTML, manifest, screenshot e `browser-check-summary.json` della verifica. Per le suite Nest usare i percorsi dei sei spec sopra con il runner Jest diretto; nessun aggregate CI locale necessario.

## Accettazione residua

- Prova nei client di posta effettivamente usati: Apple Mail/iOS, Gmail e Outlook, comprese trasformazioni del tema e CSS applicate dal provider. Il rendering Chrome e la rimozione di `<style>` non emulano quei client.
- Eventuali invii a destinatari di test richiedono autorizzazione esplicita; nessuna consegna, SPF/DKIM/DMARC, reputazione o casella ricevuta certificata da questi test.
- Registrazione e stato di errore attivazione Angular conservano il riferimento storico a **2 ore**. Verificarne la corrispondenza con il TTL di ciascun ambiente prima dell’accettazione del flusso; non dedotto dai segreti e non modificato come policy durante questo blocco.
- Review manuale del contenuto e degli oggetti. Date non aggiunte: i contesti correnti non forniscono timestamp dell’evento e non viene inventata una data nel rendering.

Stato: implementato, in review. Prossimo blocco pianificato: **21 / PX-16 — supporto e nuovo ticket**.
