# BUG-AUTH-01 — challenge adattiva su account senza MFA configurata

- **Stato:** regressione segnalata dall'owner il 9 novembre 2026; causa runtime
  da confermare, analisi statica e storica eseguita. Nessun fix implementato.
- **Tipo:** bugfix trasversale autenticazione backend, identità IP/proxy,
  attendibilità device/fingerprint/posizione e contratto di navigazione Angular.
- **Base analizzata:** `105d6faf680cdf433409b1aef5e7126fa4cae7f0`, branch operativo
  `feature/infra-vm-docker-engine-architecture`.
- **Perimetro autorizzato:** documentazione, controlli mirati e storia Git.
  Nessun login reale, accesso a DB/Redis, invio OTP, modifica auth o configurazione.
  Non è una ricetta autonomous-development né una modifica ai gate infrastrutturali.

## Segnalazione ed evidenza disponibile

L'owner riferisce un account con `users.mfa_strategies` contenente l'array vuoto:
nel debug `suspiciousAttempt=false`, ma `needsMfa=true`; dopo email/password
compare la verifica email per accesso insolito. Segnalato anche l'uso di
`127.0.0.1` in GeoIP dopo la scomparsa del mock IP locale.

Screenshot fornito in chat: `/login/mfa/EMAIL_OTP?trust_verify=true`, testo
«Abbiamo rilevato un accesso insolito», browser **InPrivate**. Non salvati
screenshot o dati dell'account nel repository. Il parametro reale è
`trust_verify`, non `tryst_verify`. Lo screenshot dimostra il ramo UI attivo,
non il valore finale restituito da `POST .../login/1`.

Da acquisire nella futura riproduzione: risposta HTTP dello stesso tentativo
e punto esatto del breakpoint, distinguendo il valore iniziale della variabile
da quello prima del return. Lo stato DB è dichiarato dall'owner, non riletto.

## Comportamento atteso e distinzione delle policy

MFA configurata dall'utente e challenge adattiva sono due motivi distinti.
L'assenza di strategie non implica da sola `suspiciousAttempt=false`.
Per l'account ordinario, sulla policy corrente:

| Strategie configurate | Fingerprint e posizione fidate, device noto | Esito finale atteso |
| --- | --- | --- |
| Nessuna | Tutti i segnali fidati | `needsMfa=false`, `suspiciousAttempt=false`, authenticated |
| Nessuna | Almeno un segnale non fidato | `needsMfa=true`, `suspiciousAttempt=true`, verifica email adattiva |
| Almeno una | Qualsiasi combinazione | `needsMfa=true`, `suspiciousAttempt=false`, MFA configurata |

L'eccezione dell'account locale di automazione è distinta e non va estesa agli
account ordinari. La posizione **entro** il raggio di una posizione fidata è
un segnale positivo: nel codice il rischio scatta se manca una corrispondenza,
non perché una corrispondenza esiste. Default del raggio: **20 km**.

Cookie `__device_id` assente/firma HMAC-SHA256 invalida: il bootstrap genera
un nuovo identificatore; se non noto per l'utente, il controllo device fallisce.
La schermata InPrivate rende questa pista particolarmente rilevante: non prova
che ogni tentativo segnalato fosse privato, ma un nuovo contesto senza cookie
è un caso storicamente previsto per la challenge, anche senza MFA configurata.

## Riscontri sul codice corrente

1. [CredentialLoginHandler](../../MercurionWebNode/src/app_modules/auth/application/credential-authentication.handlers.ts)
   inizializza `needsMfa` dalla lunghezza delle strategie. Per l'account ordinario
   senza MFA, il predicato `!inWhiteList || !trustedCurrentLocation || unknownDeviceId`
   forza `needsMfa=true`. Più avanti lo **stesso predicato**, con gli stessi input
   e lo snapshot `isMfaEnabledBySettings`, imposta `suspiciousAttempt=true` e
   `enabledMfaStrategies=['EMAIL_OTP']`. Fra i blocchi c'è un `await` per il telefono:
   fermarsi prima del secondo blocco può mostrare uno stato ancora intermedio.
   Nel risultato finale ordinario con strategie vuote, la combinazione
   `needsMfa=true / suspiciousAttempt=false` non deriva da questi due blocchi.
   Non è confermata una regressione booleana del return.
2. [AuthenticationController](../../MercurionWebNode/src/app_modules/auth/controllers/authentication.controller.ts)
   copia entrambi i flag dal risultato senza ricalcolarli. [AuthFacade Angular](../../MercurionWebNg/src/app/services/auth.facade.ts)
   entra nel ramo MFA su `needsMfa`, ma aggiunge `trust_verify=true` **solo** su
   `response.suspiciousAttempt=true`. Se la risposta sul filo fosse davvero false,
   ricostruire risposta/sessione/navigazione effettive prima di attribuire il
   parametro al solo `needsMfa`.
3. [Pagina MFA](../../MercurionWebNg/src/app/pages/login/mfa/mfa.page.component.ts)
   pilota testo di accesso insolito e opzione del flow dal query parameter;
   [transport](../../MercurionWebNg/src/app/services/auth-transport.service.ts)
   lo inoltra agli endpoint successivi. Anche stato preauth/navigation obsoleto
   resta una pista da escludere, non una causa dimostrata.
4. [Context configurator](../../MercurionWebNode/src/bootstrap/configurators/cookies-request-context.configurator.ts)
   legge ancora `x-mock-ip`, solo in development/test; altrimenti usa `req.ip`.
   Il browser corrente non invia quel mock: è una decisione esplicita con
   [guardia statica](../../scripts/check-angular-mock-ip-policy.mjs), non un parametro
   dimenticato dal solo handler. La correttezza del `req.ip` effettivo dipende
   anche dalla catena proxy fidata, da verificare senza leggere env operativi.
5. [GeoIpService](../../MercurionWebNode/src/app_modules/auth/services/geo-ip.service.ts)
   restituisce coordinate null quando il lookup fallisce. Il cast `as GeoLocation`
   nel chiamante non valida i dati: Haversine riceve comunque i null e JavaScript
   può convertirli in zero durante l'aritmetica. Non esiste uno stato esplicito
   «geolocalizzazione non disponibile» nella decisione corrente.
6. [SessionService](../../MercurionWebNode/src/app_modules/auth/services/session.service.ts)
   non memorizza posizioni con coordinate null. Quindi loopback non localizzato,
   nessuna posizione valida registrabile e fingerprint/device già fidati possono
   comunque produrre una challenge ad ogni accesso. È una spiegazione plausibile
   del sintomo locale, **non** del flag finale false riportato.
   [Repository Redis](../../MercurionWebNode/src/app_modules/auth/repositories/redis-session.repository.ts):
   TTL 30 giorni per fingerprint/collezione posizioni; non equivale a un timestamp
   separato per ogni posizione. Una posizione già presente non riscrive la lista
   e non ne rinnova il TTL tramite `addTrustedLocation`: rivedere anche questo
   confine rispetto al requisito dei precedenti 30 giorni, senza presumere una
   regressione introdotta dal task corrente. Device noto è un controllo separato.

## Storia Git mirata

| Commit | Riscontro diagnostico |
| --- | --- |
| `a3760e812` — 27 ottobre 2025 | Aggiunge `unknownDeviceId` a entrambi i predicati adattivi. Il messaggio descrive esplicitamente il caso incognito come accesso insolito; rischio fingerprint/posizione preesistente. Non è una policy introdotta dal recente lavoro infra |
| `f22a8c04d` — 4 settembre 2026 | Rimuove l'header mock hard-coded dai tre percorsi Angular di login/MFA/SSO e introduce la guardia statica. È il cambiamento direttamente pertinente alla scomparsa del mock |
| `3ed3fcd49` — 12 settembre 2026 | Estrae il handler BE-008. Blame attribuisce a questo commit i blocchi attuali; il confronto con `authentication.service.ts` del parent mostra già lo snapshot `isMfaEnabledBySettings` e i due predicati equivalenti: l'estrazione non dimostra l'introduzione del difetto segnalato |
| `66850b149` — 12 settembre 2026 | Estrae il context configurator mantenendo il mock solo development/test; non elimina il supporto server |
| `464b52e9c` — 15 settembre 2026 | Elimina il fallback diretto a `cf-connecting-ip` dal hook in favore di `req.ip`, lasciando il mock locale. Rilevante per la catena proxy; non prova che il refactor MFA sia la causa |

La [ricetta storica FE-015 / 0037](../autonomous-development/task/0037-remove-client-side-x-mock-ip-from-real-auth-requests.md)
è marcata DONE e indica rimozione intenzionale del mock. Le note di esecuzione
ammettono però che la prova browser non fu possibile per indisponibilità del
runtime, pur avendo checkbox di accettazione spuntate: la compatibilità del
login locale senza mock non va dedotta da quel solo stato. Non modificati
ricetta, esiti terminali o documenti storici durante questo audit interattivo.

## Controlli svolti e loro limite

- Quattro suite Jest esistenti, **22 test passati**: credential handler,
  authentication controller, GeoIP e transport-security policy. Nessun test
  nuovo scritto nel repository, nessun processo applicativo avviato.
- Le prove del handler usano segnali di fiducia mockati; la suite GeoIP verifica
  soltanto la costruzione del servizio. Il verde non riproduce il caso completo
  ordinario con cookie stabile, Redis e loopback non geolocalizzabile.
- Chiamato il GeoIpService corrente con logger sostitutivo, senza applicazione
  o provider esterni: lookup reale del dataset locale su `127.0.0.1` dà coordinate
  `[null,null]`; lista fidata vuota → false; punto sintetico `(45,9)` → false;
  punto `(0,0)` → **true** per coercizione dei null. Nessuna posizione reale
  dell'account letta; l'ultimo caso dimostra il problema di validazione, non la
  presenza di `(0,0)` in Redis.
- Guardia Angular mock IP passata. Nessuna nuova verifica browser, SMTP/OTP,
  persistenza, header reali o CI sul commit documentale.

## Analisi tecnica e possibile intervento futuro

Pista principale: rimozione intenzionale del mock, IP locale non localizzabile,
trattamento implicito dei null e mancata memorizzazione della posizione.
Pista concorrente nello screenshot: nuovo device in InPrivate. Prima del fix
registrare per lo stesso tentativo solo i tre esiti booleani, le strategie
risolte e i flag **al return e nella risposta HTTP**; niente cookie, token,
IP/fingerprint grezzi o segreti nei log/report. Distinguere istanza/build del
backend e bundle frontend realmente usati dai sorgenti del debugger.

Possibile miglioramento circoscritto, ancora da implementare: calcolare una
sola volta il motivo della challenge, derivando entrambi i flag dalla stessa
decisione. Schema che preserva la policy attuale:

```text
requiresTrustVerification = !localTestAccount && !mfaConfigured && riskDetected
needsMfa = mfaConfigured || requiresTrustVerification
suspiciousAttempt = requiresTrustVerification
```

Questa pulizia elimina duplicazione e stati intermedi fuorvianti, ma da sola
non risolve una geolocalizzazione sempre assente. Validare coordinate finite
e range prima del confronto, distinguendo dato indisponibile da posizione
effettivamente lontana. La policy per il segnale indisponibile va chiarita:
non trasformarlo automaticamente in posizione fidata, né rimettere un IP
fittizio in tutte le richieste Angular. Per prove deterministiche, simulazione
solo in fixture esplicite isolate, mantenendo esclusione da staging/production.

## Piano di bugfix e accettazione

1. Riprodurre con account ordinario senza MFA, browser normale e cookie stabile;
   rilevare flag al return/risposta e motivo effettivo del rischio. Confrontare
   poi finestra privata, nuovo device, fingerprint variata e trust scaduta.
2. Confermare il contratto per IP privati/loopback/lookup mancante e finestra
   temporale delle posizioni; tracciare origine dell'IP senza fidarsi di header
   arbitrari. Decidere prima di modificare la policy applicativa.
3. Implementare il fix minimo con decisione unica, coordinate validate e
   comportamento di indisponibilità esplicito, preservando sessioni, PAT,
   verifica OTP e vincoli del cookie. Nessun bypass MFA generalizzato.
4. Matrice automatica account ordinario: MFA off/on × device noto/ignoto ×
   fingerprint fidata/non fidata × posizione fidata/non fidata; aggiungere
   null/coordinate invalide, liste vuote, scadenza/rinnovo 30 giorni e IP mock
   ammesso solo nei test appropriati. Verificare anche controller/DTO e Angular:
   authenticated diretto oppure challenge con flag/query coerenti.
5. Runtime controllato normale/InPrivate attraverso nginx: nessuna richiesta
   di accesso insolito quando i segnali sono fidati e MFA è off; challenge
   email quando richiesto dalla policy confermata, MFA configurata preservata.
   Invii e materiali di prova soltanto nella futura fase autorizzata.

**Chiusura:** riproduzione spiegata, risposta HTTP e UI coerenti, policy per
geolocalizzazione assente documentata e prove di regressione pertinenti verdi.
Per ora il caso resta aperto. Dopo questa registrazione riprendere lo script
PowerShell del lavoro infra, senza applicare alcuna correzione auth implicita.
