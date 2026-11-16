# Blocco 16 — Accesso

25 ottobre 2026. **Implementato, in review.** Il blocco 17 resta dedicato a registrazione e recupero; il prossimo intervento in ordine è 16K / AUTH-02, iniziando da architettura e stima.

## Risultato e perimetro

- Composizione comune per login, scelta SSO e presentazione MFA: larghezza massima 30rem, card desktop e layout mobile in flusso. Token, tema e controlli esistenti riutilizzati; nessun nuovo pacchetto.
- Azioni SSO e recupero coerenti, target di almeno 48 px, focus visibile, progressione e-mail/password esplicita e comando «Cambia e-mail». Preservati provider, redirect, informative e significato della preferenza di 30 giorni.
- Rimosso il blocco del form dopo un errore nella verifica e-mail: pending rilasciato anche in errore, invio ripetuto impedito e richiesta annullata lasciando la pagina. Errori del campo senza duplicazione dell’annuncio globale.
- Durante l’attesa, fieldset nativo disabilitato senza alterare valori o validatori dei controlli Angular; verificati blocco e riabilitazione del campo e-mail dopo errore.
- Ritorno all’e-mail con conservazione di indirizzo e preferenza e cancellazione di password/token. Prima del reset viene sincronizzato il blur nativo del campo: altrimenti poteva ripristinare nel controllo la password appena cancellata. Identità nativa dei campi e autocomplete conservati.
- MFA: rimossi offset manuali, label statica associata al codice, area errore riservata e descritta dal campo, azioni alternative uniformate. Sostituito l’import runtime dal pacchetto router/testing con RouterLink ordinario.
- Turnstile: contenitore senza overflow scrollabile e altezza intrinseca con minimo di 71 px, larghezza nativa di 300 px. Rimossa l’altezza fissa che poteva produrre la scrollbar segnalata. Aggiunti 8 px tra pulsante e widget oltre al gap del form. **L’utente ha confermato il widget intero e senza scrollbar dopo l’aggiornamento.**

Nessuna modifica a backend, feature flag, AuthFacade, strategie MFA, API, policy token, scadenze o verifica Cloudflare. Nessun accesso con passkey aggiunto. Gli stati MFA sintetici nei test non costituiscono autenticazione reale.

## Verifiche

| Prova | Esito ed estensione |
|---|---|
| Baseline login | 30 test superati |
| Suite finale login/MFA | **49 test superati**; pending/errore/retry, annullamento richiesta, ritorno al passo e-mail, focus, autofill, redirect SSO e presentazione MFA |
| Geometria nei test | Login a 320×568, 375×320, 375×812, 639×375, 640×375, 768×1024, 1440×900; MFA scelta/TOTP/backup a 320 e 640 px con altezza 320 px |
| Turnstile nei test | Test double da 300×78 px: controlla crescita oltre i 71 px, contenimento e assenza di overflow scrollabile, senza caricare challenge esterne |
| Browser | Chrome su localhost:8888, login anonimo nei due temi; larghezze 320, 375, 639, 640, 767, 768, 1280, 1440 px e viewport basse fino a 320 px |
| Contenimento browser | Controlli del login contenuti; nessun overflow orizzontale persistente. In alcune misure immediatamente dopo resize, transizione shell/scrollbar ancora in assestamento; ripetuta la misura a 320 px light dopo l’assestamento: clientWidth e scrollWidth entrambi 310 px |
| Validazione locale browser | E-mail sinteticamente non valida: «Continua» disabilitato; nessun invio al backend. Link dei tre provider presenti, senza avviare accessi esterni |
| Turnstile reale | Difetto segnalato dall’utente; correzione di scrollbar e spaziatura confermata dall’utente dopo reload |
| Controlli statici | Typecheck/template Angular, ESLint mirato, policy typing/styling/semantica e diff check riusciti |
| Build | Production e gate bundle/lazy riusciti; iniziale **950.463 byte / 1.000.000**. Warning preesistenti iniziale e CSS di editor/azioni conservati, soglie invariate |

Le prove geometriche usano il form reale; soltanto il widget esterno è sostituito nei test. I test di presentazione MFA non inviano codici. Le strategie e le regressioni di handoff esistenti restano nella suite mirata. La prova del widget reale è feedback manuale, distinta dalle misure del test double.

## File ed evidenze

Sorgenti: login.page.component.ts, login-credential-form.component.ts/css, login-sso-chooser.component.ts, auth-entry.css, mfa/mfa.page.component.ts/css e relativi test; fixture Turnstile in login-turnstile.testing.ts.

Artefatti locali: `C:/Users/giuli/.codex/artifacts/mercurion-login-16-2026-10-25/`, con schermate anonime desktop/telefono light/dark, misure e log. Ripristinati tema automatico e viewport 1600×775; chiusa soltanto la scheda dell’agente. Nessun processo dell’utente arrestato, operazione Git o CI remota.

## Review residua

- Login reale completo, eventuale MFA, scadenza della challenge e ritorno: l’agente non ha inviato password o codici e non certifica il percorso end-to-end. La conferma ricevuta riguarda il widget Turnstile.
- Handoff esterno Google/ORCID/Discord, password manager reali e QA fisica Safari/tastiera/zoom ancora da completare. Le prove Chrome responsive e gli iframe dei test non riproducono la tastiera di iOS.
- I percorsi SMS richiedono prima INF-02 / SMS Hosting; non usare l’account Twilio chiuso. Nessun SMS/e-mail inviato dall’agente.
- Registrazione/recupero nel blocco 17; passkey in 16P. Per 16K partire dal coordinamento architetturale JWT, senza rotazioni reali o decisioni operative implicite.
