# 16K-A — Analisi della rotazione JWT

25 ottobre 2026. Analisi iniziale su MercurionWeb a `9f2dff0ed17b2c1a321048e55169a074a4443abc`; Tox21 letto nel checkout locale, senza modificarlo. **B1a implementato, in review:** schema/port e validazione tramite provider; firma/verifica corrente ancora invariata. Contratto e prove in [jwt-key-manifest.md](../../../MercurionWebNode/docs/jwt-key-manifest.md). Questo documento approfondisce [AUTH-02](JWT-KEY-ROTATION.md).

## Decisioni confermate dall’utente

- Revoca **a caldo**, senza attendere riavvii coordinati.
- VPS con **Docker Compose**, una istanza Nest e una Tox21 per ambiente; nessuna replica prevista. I manifest Kubernetes restano materiale del case study, non la topologia da assumere per questo intervento.
- **Manifest persistente senza segreti su volume**, aggiornato atomicamente tramite CLI e letto a caldo dai servizi.
- Socket con chiave revocata rimossi dalle room private e **disconnessi entro 5 secondi**. Limite approvato dall’utente, da verificare nell’implementazione.
- Vincoli staging/production del [piano VPS, D-12–D-14 e INF-01A](../../../docs/infrastructure/vps-deployment-roadmap.md): recupero runtime tramite Secret Manager esterno, niente persistenza di segreti in .env/PEM/immagini/metadati Compose. Provider e bootstrap dell’identità macchina ancora da selezionare e provare.
- Restano RS256 per accesso HTTP e WS, con coppie distinte, e HS512 per gli altri token. La revoca di una chiave è distinta dalla revoca di JTI/sessione.

La scelta del registro su volume e il limite WS sono **confermati dall’utente**. Schema, dettagli della CLI, valori delle finestre legacy/rinnovo e prove operative restano da completare nei blocchi successivi; la conferma non attesta un’implementazione già funzionante.

## Inventario: 15 domini, non due sole chiavi

Il codice ha **15 TokenType: 2 domini RSA e 13 HMAC**. I 13 scopi HS512 mantengono materiale separato; il modello non li accorpa perché hanno lo stesso algoritmo/audience. La ricerca nel codice applicativo Nest trova firma e verifica crittografica soltanto in JwtToolsService; nessun secondo firmatario applicativo individuato. Sono esclusi dal censimento i token OAuth emessi da provider esterni.

| TokenType / dominio | Algoritmo / audience | Configurazione TTL corrente | Flusso da coprire |
|---|---|---|---|
| AccessToken | RS256 / Jwt.audience.access | JWT_EXPIRATION_ACCESS_TOKEN | Login, SSO, guard HTTP/GraphQL, rinnovo |
| ws_AccessToken | RS256 / Jwt.audience.ws | JWT_EXPIRATION_WS_ACCESS_TOKEN | Login, ws-refresh, handshake ed eventi WS |
| PreAuthorizationToken | HS512 / Jwt.audience.auth | JWT_EXPIRATION_PRE_AUTHORIZATION_TOKEN | Login/MFA, PAT corrente e device binding |
| ActivationToken | HS512 / auth | JWT_EXPIRATION_ACTIVATION_TOKEN | Attivazione account |
| EmailVerificationToken | HS512 / auth | JWT_EXPIRATION_EMAIL_VERIFICATION_TOKEN | Verifica/cambio e-mail |
| PhoneNumberVerificationToken | HS512 / auth | JWT_EXPIRATION_PHONE_NUMBER_VERIFICATION_TOKEN | Verifica/cambio telefono |
| EmailOtpMfaActivationToken | HS512 / auth | MFA_CHANGE_TIME | Attivazione MFA e-mail |
| SmsOtpMfaActivationToken | HS512 / auth | MFA_CHANGE_TIME | Attivazione MFA SMS |
| AppTotpMfaActivationToken | HS512 / auth | MFA_CHANGE_TIME | Attivazione TOTP |
| EmailOtpMfaInactivationToken | HS512 / auth | MFA_CHANGE_TIME | Disattivazione MFA e-mail |
| SmsOtpMfaInactivationToken | HS512 / auth | MFA_CHANGE_TIME | Disattivazione MFA SMS |
| AppTotpMfaInactivationToken | HS512 / auth | MFA_CHANGE_TIME | Disattivazione TOTP |
| ChangePasswordToken | HS512 / auth | JWT_EXPIRATION_CHANGE_PASSWORD | Reset password |
| AccountRecoveryToken | HS512 / auth | JWT_EXPIRATION_ACCOUNT_RECOVERY | Recupero account |
| SSO_PreAuthorizationToken | HS512 / auth | JWT_EXPIRATION_SSO_PRE_AUTHORIZATION_TOKEN | Completamento SSO |

I valori dei TTL sono configurati per ambiente: **non letti né stimati da file .env**. Le proprietà expiresInMs sono millisecondi; SHORT_SESSION_LASTING e PERSISTENT_SESSION_LASTING vengono usati come secondi dal servizio sessioni. Il clockTolerance Nest è 60 secondi.

| Confine | Riscontro e dipendenze |
|---|---|
| Materiale RSA | JwtKeysProvider: file PEM in development/test; variabili raw/Base64 in staging/production. Una coppia HTTP e una WS caricate al bootstrap. Controllo corrente limitato ai marcatori PEM |
| Materiale HMAC | config.model/config.schema e constructor JwtToolsService: un secret per tipo, controllo testuale minimo di 48 caratteri |
| Emissione | AuthenticationSessionService, SsoAuthenticationHandler, RefreshWsAccessTokenHandler, LocalDummyAuthService, AccountFlowKernel, MfaService e SocialAuthService delegano a generateToken |
| Verifica | AccessTokenAuthenticationPolicy/GlobalGuard, handler SSO/MFA, AccountFlowKernel, MfaService, gateway e WsGuard delegano a verifyTokenAndGetPayload |
| Stato | SessionService/RedisSessionRepository: registrazione JTI, blacklist JTI, sessione/device; PAT attivo e relativo binding Redis separati |
| Decode non verificato | AuthenticationSessionService legge un token appena emesso per il PAT; AuthenticationFailurePolicy legge token in errore anche prima della verifica riuscita. Il secondo caso richiede particolare attenzione agli effetti di revoca |
| Angular | JwtHelperService, AuthSessionPersistenceService e RealtimeSocketService decodificano claim/scadenza; non verificano firme. Nessun materiale di firma nel client e nessun nuovo obbligo di interpretare kid lato UI |
| Tox21 | main.py: verificatore RS256 a chiave singola caricata da file, audience fissa mercurion-api. Nel sorgente corrente GLOBAL_SKIP_AUTH_FLAG=True; il verificatore non viene applicato ai normali RPC |

## Quattro vincoli che cambiano il lavoro

### 1. Il TTL HTTP non determina da solo il ritiro della chiave

AccessTokenAuthenticationPolicy, dopo il primo rifiuto, riprova la verifica con ignoreExpiration=true; SessionValidationPolicy verifica poi cookie, device e sessione Redis. Anche un browser rimasto inattivo può quindi rinnovare un JWT scaduto se la sessione è valida.

Rimuovere la vecchia chiave dopo il solo TTL JWT romperebbe questo percorso. **Proposta conservativa:** mantenerla verificabile, soltanto nei contesti autorizzati, fino a quando nessuna sessione associabile ai token precedenti può ancora essere valida. SessionService imposta expiresAt alla creazione e il touch del repository non lo estende, anche quando rinnova il TTL Redis delle sessioni brevi. Esiste quindi un limite superiore legato alla durata massima delle sessioni già create.

Il runbook deve calcolare il ritiro usando l’ultimo cutover di emissione effettivo, il massimo TTL access, la massima durata delle sessioni già emesse e lo skew. Non basta leggere il solo valore di configurazione nuovo se in precedenza era maggiore. Nessuna data di ritiro concreta è fissata in questa analisi. La stessa attenzione vale per la fine della compatibilità dei token HTTP **senza kid**.

Cambiare il rinnovo per renderlo indipendente dal vecchio JWT è una alternativa più ampia, con nuova analisi del protocollo e della protezione dei cookie: **non è inclusa nella proposta iniziale**. Una chiave revocata viene comunque rifiutata anche nel rinnovo; la conservazione per continuità riguarda solo rotazioni ordinarie.

### 2. Errori del registro e revoca non devono distruggere sessioni per errore

Oggi JwtToolsService racchiude tutte le cause nell’errore generico di token invalido/scaduto. AuthenticationFailurePolicy può risolvere un utente da decodeUnsafe e usare quel dato per una distruzione della sessione. Il registro introduce nuove cause: chiave revocata, kid sconosciuto e configurazione temporaneamente non leggibile.

L’integrazione deve distinguere internamente indisponibilità operativa e credenziale respinta, rispettando gli envelope esistenti. Un guasto di lettura non deve cancellare sessioni valide o essere presentato come password errata. I dati decodificati senza verifica non devono autorizzare revoche di sessione; usare esclusivamente un principal già verificato o un percorso amministrativo autorizzato. ignoreExpiration e skipRevocationCheck continuano a riguardare scadenza/JTI, **mai** lo stato della chiave.

### 3. Un socket silenzioso riceve ancora eventi senza rifare il guard

WsGuard verifica il token per gli eventi privati in ingresso; il gateway associa inoltre il socket alle room utente/sessione dopo l’handshake. Il solo nuovo controllo kid nel guard non interromperebbe i push verso una connessione già associata.

**Requisito confermato:** alla revoca togliere le room private e disconnettere i socket interessati entro **5 secondi**. Proposta implementativa: associare il kid verificato alla connessione, usare il watch del registro come accelerazione e una riconciliazione periodica per non dipendere da un evento filesystem eventualmente perso. Il limite resta da misurare; nessuna promessa di annullare operazioni già autorizzate/in corso. La rotazione ordinaria non disconnette chi usa una chiave ancora ammessa in verifica. Il rinnovo WS esistente passa da HTTP e riconnessione con nuovo handshake.

### 4. Tox21 non può essere dichiarato protetto dalla revoca oggi

Il bypass è un riscontro sul sorgente locale, non una prova della configurazione effettiva in produzione. Inoltre i controller scientifici Nest sono pubblici e almeno la richiesta inferenza passa accessToken vuoto. Non è corretto attivare la verifica Python in modo indiscriminato: interromperebbe percorsi pubblici usati anche dalla presentazione dell’app.

Nel contratto per il repository Tox21 prevedere selezione della chiave HTTP tramite kid e stesso stato di revoca, algoritmo vincolato, issuer/audience/tipo attesi e claim temporali obbligatori. Non passare chiavi private, HMAC o chiave AES del sub. Le prove del verificatore possono usare chiavi sintetiche con bypass escluso nel test; **non provano enforcement del normale RPC se il bypass resta attivo**.

L’autenticazione dei flussi scientifici pubblici richiede una scelta di contratto distinta. Conservare intanto il comportamento pubblico; non aggiungere ora un nuovo token di servizio o modificare il bypass. 16K-C dovrà dichiarare separatamente compatibilità del verificatore e attivazione/enforcement, senza chiamare completa una revoca mai applicata dal consumer.

## Architettura proposta per la VPS

### Registro persistente su volume, senza nuovo servizio

Per la topologia confermata il registro è un **manifest JSON versionato e senza segreti**, amministrato con CLI sul server e condiviso tramite directory montata in sola lettura nei container. In staging/production le chiavi private/HMAC vengono recuperate dal Secret Manager e mantenute nella memoria Nest: **nessuna directory segreta persistente o PEM su volume**. File dotenv/PEM sono ammessi soltanto nel percorso locale development/test previsto dal repository. Il manifest può contenere chiavi pubbliche HTTP e metadati degli altri domini; Tox21 seleziona esclusivamente il dominio HTTP. I soli nomi/stati dei domini non danno accesso ai relativi segreti.

| Elemento | Responsabilità proposta |
|---|---|
| Manifest | schemaVersion, environment, revision, domini, algoritmo vincolato, activeKid, stato di ogni kid, date, compatibilità legacy, fingerprint e metadati dell’operazione |
| Materiale server | Binding fidato da ambiente/dominio/kid a riferimento e versione logica del Secret Manager; risoluzione asincrona e materiale solo in memoria in staging/production. Nessun lookup remoto o percorso costruito dall’header ricevuto. Tox21 riceve soltanto il materiale pubblico HTTP |
| Loader | Validazione completa prima dell’uso; parsing PEM reale, RSA almeno 2048 bit e coppia coerente; nuove chiavi HS512 casuali di almeno 64 byte. Versioni/materiali non intercambiabili tra domini/ambienti |
| Lettura | A ogni firma/verifica leggere un nuovo snapshot atomico del manifest; nessuna cache di ammissione/revoca utilizzabile indefinitamente. Si possono conservare oggetti chiave già parsati, ma non saltare il controllo dello stato |
| Scrittura | CLI esterna al processo web, unico writer, lock/esclusione e controllo expectedRevision; validazione, scrittura temporanea, flush e sostituzione atomica sullo stesso filesystem. Montare la **directory**, non il singolo file che verrebbe sostituito |
| Audit | Snapshot/operazione con identità operatore, motivo, timestamp UTC, revisione precedente/nuova e soli kid/fingerprint autorizzati. Archiviare le revisioni e mantenere tombstone di revoca; niente secret/token negli output. Errore di archiviazione segnalato senza annullare una revoca già applicata |
| Reload guasto | Lettura assente, corrotta o ambiente errato: rifiutare le nuove operazioni protette; niente fallback automatico al registro precedente. Rilevare il problema nello stato operativo senza provocare logout massivi per un errore infrastrutturale |
| WS | Riconciliazione periodica dello stato anche senza traffico; errore del registro impedisce di mantenere indefinitamente room private con stato non più verificabile |

Il registro non richiede un nuovo database, endpoint JWKS pubblico, HTTP amministrativo, canale NATS di distribuzione o Meilisearch come autorità. Il **Secret Manager esterno previsto dalla roadmap VPS** conserva il materiale confidenziale, non sostituisce il manifest locale per l’ammissione/revoca JWT. Redis resta proprietario di sessioni/JTI/PAT. Il registro non viene memorizzato in una cache Redis che potrebbe perdere le revoche. Il materiale pubblico HTTP nel manifest evita due copie dello stato di revoca da sincronizzare.

Questa scelta è adatta a **un host, filesystem locale persistente e un solo writer**. Una futura distribuzione multi-host richiederà un’altra autorità/distribuzione, non la semplice copia asincrona del file. Il carico di lettura e la latenza vanno misurati sul dataset di chiavi previsto; non introdurre una cache di revoca per ottimizzazioni ipotetiche.

### Coordinamento con Secret Manager e bootstrap VPS

L’INF-01A qui citato appartiene alla **roadmap infrastrutturale VPS**; non è INF-01 / R2 della roadmap portfolio, che resta rinviato. Infisical e Bitwarden sono candidati del piano VPS, **nessuno è selezionato**. Questa revisione non sceglie SDK, acquista servizi, crea identità o esegue il PoC esterno.

| Piano | Autorità e contratto |
|---|---|
| Materiale crittografico | Secret Manager, con riferimenti amministrati e separati per ambiente/scopo/kid. Versione immutabile se disponibile e verificata nel provider scelto; altrimenti nomi distinti per ogni kid con divieto operativo di sovrascrivere il materiale sotto lo stesso identificatore |
| Stato JWT | Manifest locale: chi è attivo, ammesso in verifica, revocato o legacy. Eliminare un secret o revocare l’identità del provider **non equivale** a revocare i JWT già emessi o le chiavi già caricate in memoria |
| Codice JWT | Port asincrona per il materiale, indipendente dal vendor, risolta solo dopo lookup fidata nel manifest. Adapter/fake sintetico per i test; sorgente locale confinata a development/test; nessun fallback da un adapter remoto guasto a file o env persistenti in staging/production |
| Configurazione applicativa | Recupero autenticato prima del bootstrap/validazione Nest. Integrazione col percorso canonico createApplicationModule/configuration.environment, senza collocare valori in Docker environment, command line o immagini |
| Identità macchina | Bootstrap, rinnovo e recupero post-reboot posseduti da VPS INF-01A. Il manifest non contiene credenziali del manager e non risolve il problema di ottenere l’identità iniziale |

Il manifest contiene solo metadati, eventuali chiavi **pubbliche** e riferimenti non credenziali: niente valori Base64 di private/HMAC, token di accesso al manager o snapshot segreti. Base64 non rende un segreto adatto al volume. Le revisioni archiviate e l’audit della CLI rispettano lo stesso vincolo.

Per RSA mantenere il contratto `_B64` di staging/production e decodificare in memoria; censire/validare nel modello canonico le quattro voci HTTP/WS già nominate dal provider. Il supporto a più versioni estende tale contratto con binding espliciti per kid; non serializza tutte le chiavi in una variabile Compose. Eliminare il fallback raw-PEM prod-like quando si applica il nuovo contratto, preservando i file locali development/test. Per HMAC conservare i byte legacy e l’encoding esplicito, senza reinterpretazioni automatiche.

Riscontro aggiuntivo sulla configurazione installata: ConfigModule.forRoot richiama assignVariablesToProcess anche sul risultato del validatore. Passare un oggetto environment in memoria **non garantisce da solo** che i valori restino esclusivamente nella DI. Prima di dichiarare il trasporto accettato, verificare/correggere l’eventuale copia in process.env e l’eredità dei processi figli, oltre a Docker metadata, log e cache su disco dell’SDK. Non confondere l’ambiente interno del processo con i metadati iniziali del container; sono superfici differenti.

**Rotazione:** creare materiale nuovo nel manager; risolverlo e validarlo in memoria; pubblicare la parte pubblica/metadati come preparata e provare la disponibilità dei consumer; solo dopo attivare il nuovo kid. Non recuperare materiale remoto su ogni JWT: caricamento/preparazione e cache del materiale sono distinti dalla lettura locale dello stato di revoca a ogni operazione. Riferimenti ammessi, timeout e richieste concorrenti devono essere limitati; l’header del token non può provocare richieste arbitrarie al provider.

**Outage:** bootstrap senza materiale/configurazione validi non parte. Un processo già attivo può usare materiale già caricato e ancora ammesso dal manifest; caricamento di nuovo materiale mancante fallisce senza scegliere altre chiavi. La revoca locale e il controllo WS di 5 secondi devono funzionare **anche durante indisponibilità del manager**, senza attendere una chiamata SDK nella riconciliazione. La memoria non è un’autorità alternativa per lo stato di revoca e non viene riversata su disco per il recovery.

**Confine di consegna:** 16K-B1 può sviluppare schema, port, validazione e firma/verifica con fixture sintetiche senza aver scelto il vendor. Provider reale, recupero runtime prima di Nest, bootstrap macchina e prove di non persistenza sono integrazione coordinata con VPS INF-01A e gate prima del rollout staging/production. Non introdurre un adapter prod-like fittizio come se il requisito fosse soddisfatto. Il verificatore Tox21 usa il materiale pubblico dal manifest; le sue altre credenziali, per esempio NATS, restano nel censimento infrastrutturale per servizio.

### Operazioni e coerenza

Interfaccia CLI proposta: inspect/validate/prepare/activate/revoke/retire, con anteprima delle modifiche e revisione attesa. La CLI non riceve materiale crittografico come argomento da lasciare nella shell history. Amministrazione tramite accesso operativo alla VPS; nessuna UI amministrativa esposta.

- Prepare ammette materiale già recuperato/validato in memoria e parte pubblica distribuita per la verifica; activate seleziona una sola versione di emissione e porta la vecchia in sola verifica. Distribuzione/verifica della disponibilità precedono l’attivazione; la CLI non salva snapshot segreti nel volume.
- La firma usa materiale e kid dallo stesso snapshot. Ricontrolla lo stato prima di restituire il risultato; un cambio di versione richiede retry limitato o errore controllato. Non accettare materiale vecchio con kid nuovo.
- Revoke è irreversibile nel flusso operativo ordinario. Se colpisce l’attiva, occorre una sostituta preparata oppure sospensione esplicita dell’emissione del dominio: nessun fallback silenzioso. Un dominio sospeso è rappresentabile; non è una configurazione malformata con attiva mancante.
- La revoca diventa effettiva sui controlli che aprono il manifest dopo la sostituzione atomica. Richieste che avevano già superato il controllo e risposte in corso non vengono retroattivamente annullate. La riconciliazione WS copre le connessioni passive entro il limite concordato.
- Retire rimuove materiale non più necessario, dopo tutte le finestre di verifica/rinnovo, ma conserva i metadati di revoca/audit. Ripristinare una vecchia configurazione non deve riattivare chiavi revocate: CLI e controllo revisioni/tombstone devono impedirlo, incluso il ripristino da backup.

Il controllo monotono in memoria non basta dopo un riavvio. Il restore deve riconciliare il backup con la cronologia/tombstone corrente conservata separatamente; se questa prova manca, non riattivare automaticamente le vecchie chiavi e richiedere una procedura esplicita con nuovo materiale/riautenticazione. Il modello non pretende di proteggere da un amministratore host che riscriva sia registro sia audit: l’accesso operativo resta il confine fidato.

La revoca della chiave rifiuta i relativi JWT e chiude i WS interessati. **Proposta iniziale:** non distrugge implicitamente tutte le sessioni Redis; il rinnovo con quella chiave è comunque negato e può rendere necessaria una nuova autenticazione. L’eventuale invalidazione amministrativa delle sessioni per una compromissione resta un’operazione esplicita con perimetro dichiarato; l’indice JTI corrente non è un inventario affidabile di tutte le sessioni associate a un kid.

### Compatibilità del materiale e dei token

- Il materiale HMAC corrente è una stringa passata come tale alla libreria: Base64-decodificarla arbitrariamente cambierebbe la chiave. Il binding legacy deve conservarne esattamente i byte UTF-8. Per il materiale nuovo usare encoding esplicito e controllare byte decodificati, non lunghezza della rappresentazione. Se una chiave legacy non rispetta il nuovo minimo, serve una scelta di dismissione/finestra esplicita; nessuna eccezione silenziosa per le chiavi nuove.
- Token senza kid: mapping univoco e dichiarato per ciascun dominio alla sua versione legacy, con scadenza della compatibilità. Kid presente ma sconosciuto non usa quel mapping. Finestra HTTP dimensionata anche sul rinnovo delle sessioni inattive; gli altri scopi seguono TTL massimo effettivo e skew.
- Firma con kid, verifica con algoritmo atteso dal contesto e lookup chiusa per dominio; no URL/chiave inline dall’header e nessuna scansione di tutte le chiavi. Proposta kid: identificatore opaco ASCII con lunghezza limitata, non segreto né percorso.
- Conservare iss, aud, exp, typ del payload, scp, JTI e PAT attivo. Il typ del payload applicativo non va confuso con typ nell’header JOSE.
- APP_USER_ID_AES_ENCRYPTION_SECRET, cifratura opaca di sub e cookie firmati sono cicli di chiavi distinti: non ruotarli in questo intervento e non introdurre fallback plaintext.

## Consegne e stima

Stima di lavoro tecnico, non promessa di calendario; comprende test e documentazione, esclude attesa di credenziali/approvazioni, rilascio sugli ambienti e revisione manuale dell’utente. Con registro su volume e topologia dichiarata: **circa 4–6 giornate per il nucleo JWT**, distribuibili in blocchi quotidiani. La selezione/PoC del Secret Manager, identità macchina/reboot e integrazione concreta runtime di VPS INF-01A **non erano inclusi e vanno stimati dopo il PoC**. Non è una stima complessiva di messa in produzione del sistema segreti.

| Blocco proposto | Risultato | Impegno indicativo |
|---|---|---|
| 16K-B1 | Schema manifest/binding, port asincrona del materiale senza vendor, loader/validazione, firme/verifiche per 15 domini e legacy con fixture sintetiche | 1,5–2 giornate |
| 16K-B2 | CLI atomica, audit/revisioni, revoca a caldo, gestione errori/continuità HTTP e connessioni WS | 1,5–2 giornate |
| 16K-C | Adeguamento verificatore Tox21 in attività autorizzata nel suo repository, contratto, prova Compose, runbook e regressione | 1–2 giornate |

La scelta di abilitare l’autenticazione scientifica oggi bypassata non rientra in questa stima: richiede definire prima il contratto dei flussi pubblici. Nessuna replica, console amministrativa o rotazione della cifratura sub inclusa. La stima va aggiornata dopo VPS INF-01A e se cambia il modello del registro o si richiede annullamento di operazioni già in corso.

Registro su volume e limite WS di 5 secondi confermati. **B1a (schema del manifest, port asincrona e validazione legata all’ambiente) è implementato, in review**: 9 suite/156 test, typecheck, lint, build e policy architetturali riusciti. Nessun adapter o nuovo requisito .env; nessun JWT con kid emesso dal percorso attuale. **B1b è implementato, in review**: loader in memoria e runtime con kid collegato tramite composizione esplicita, validazione all’avvio, revoca prima/dopo le operazioni, compatibilità legacy/rinnovo HTTP e controlli JTI/PAT. Il bootstrap ordinario rimane legacy e la configurazione canonica non è ancora convertita al Secret Manager. **B2 locale è implementato, in review il 27 ottobre:** sorgente file, CLI con anteprima/digest, storia durevole e riconciliazione dei WS inattivi, provate con fixture sintetiche. [Operazioni e limiti](../../../MercurionWebNode/docs/jwt-key-operations.md). QA Linux/Compose isolata completata il 27 ottobre: [27 controlli](../../../MercurionWebNode/docs/jwt-linux-qa.md). Adapter locale e bootstrap development/test ora implementati con JWT_LOCAL_KEYS_CONFIG e migrazione preview/apply: [guida](../../../MercurionWebNode/docs/jwt-local-development.md). Nessun input reale migrato. Restano provider/INF-01A, deployment completo e consumer coordinati. [Contratto e limiti aggiornati](../../../MercurionWebNode/docs/jwt-key-manifest.md). Le finestre operative per ambiente vanno definite e verificate prima del rollout. Il punto Tox21 resta un limite esplicito per l’accettazione cross-service, non un motivo per modificare il suo flag senza autorizzazione.

## Piano di verifica e riscontri eseguiti nell’analisi 16K-A

Baseline locale sul sorgente invariato: **7 suite Jest, 78 test superati** — JwtToolsService, JwtKeysProvider, authentication-policies, GlobalGuard, WsGuard, SocketIoGateway e config-schema. I test JWT esistenti usano mock di signAsync/verifyAsync: attestano orchestrazione corrente, **non supporto multi-chiave**.

Prova aggiuntiva con le librerie installate e chiavi RSA/HMAC casuali soltanto in memoria: **10 controlli superati**. keyid emette kid per RS256/HS512; verifyAsync restituisce il payload verificato; audience/algoritmo/secret errati vengono rifiutati; ignoreExpiration consente la firma scaduta. Un kid arbitrario firmato con la chiave corretta viene accettato dalla libreria se le si fornisce quella chiave: lookup e revoca devono essere applicativi. Nessun token o materiale stampato/persistito.

Matrice di accettazione prevista dall’analisi; lo stato aggiornato di B1b è nel contratto e nel diario:

1. Firma/verifica crittografica per tutti i 15 domini, vecchio/nuovo concorrenti e collisioni tra scopi/ambienti.
2. Kid mancante, malformato, sconosciuto, alterato; alg errato; firma valida con chiave di altro dominio; legacy solo nella finestra autorizzata.
3. Lettura dopo revoca anche con ignoreExpiration/skipRevocationCheck; revoca dell’attiva; configurazione corrotta; revisione concorrente e rollback che tenta di resuscitare una chiave.
4. Browser inattivo con JWT HTTP scaduto e sessione valida durante rotazione; fine della finestra di rinnovo; fault del registro senza distruzione delle sessioni per dati non verificati.
5. WS senza eventi in ingresso: dopo revoca nessun mantenimento delle room oltre il limite concordato; reconnect/rinnovo e rotazione ordinaria senza logout spurio.
6. Replace atomico visto dai container tramite mount della directory; audit durevole, riavvio senza perdita di tombstone e permessi che impediscono ai reader di modificare il registro.
7. Tox21: verificatore reale con chiavi sintetiche, issuer/audience/tipo/scadenza e chiave revocata; prova RPC soltanto dopo aver definito come trattare i flussi pubblici.
8. Login, SSO, PAT/MFA, attivazione, recapiti, recupero, password e regressione Angular/sessione. Percorsi SMS reali subordinati a INF-02; usare test sintetici senza invii.
9. Contratto con VPS INF-01A: recupero pre-bootstrap, separazione degli ambienti e dei riferimenti per kid, validazione Base64/coppie RSA, manager indisponibile, revoca ancora efficace entro 5 secondi, zero snapshot segreti su volume/Compose/immagini/log e recovery senza resurrezione di chiavi revocate. Prove reali del provider e dell’identità macchina distinte dai fake di 16K-B1.

Non eseguiti: runtime/browser, container, collegamenti VPS, modifica configurazioni, generazione di chiavi per ambienti, rotazione/revoca reale o CI remota. Nessuna modifica applicativa o a Tox21. Log baseline locale in `C:/Users/giuli/.codex/artifacts/mercurion-jwt-16ka-2026-10-25/`.

## Riferimenti verificati

- [JwtToolsService](../../../MercurionWebNode/src/app_modules/auth/services/jwt-tools.service.ts), [JwtKeysProvider](../../../MercurionWebNode/src/app_modules/auth/providers/jwt-keys.provider.ts), [TokenType](../../../MercurionWebNode/src/app_modules/auth/models/enums/token-type.enum.ts), [config model](../../../MercurionWebNode/src/config/config.model.ts).
- [Rinnovo HTTP](../../../MercurionWebNode/src/app_modules/auth/guards/policies/access-token-authentication.policy.ts), [validazione sessione](../../../MercurionWebNode/src/app_modules/auth/guards/policies/session-validation.policy.ts), [errori e revoca](../../../MercurionWebNode/src/app_modules/auth/guards/policies/authentication-failure.policy.ts), [repository Redis](../../../MercurionWebNode/src/app_modules/auth/repositories/redis-session.repository.ts).
- [Gateway](../../../MercurionWebNode/src/app_modules/socket-io/socket.io.gateway.ts), [WsGuard](../../../MercurionWebNode/src/app_modules/socket-io/guards/ws.guard.ts), [inferenza pubblica](../../../MercurionWebNode/src/app_modules/mercurion-ai/controllers/mercurion-ai.controller.ts), [contratto sub](../../../MercurionWebNode/docs/jwt-subject-encryption.md). Tox21: main.py e config.py letti, nessun file PEM/.env aperto.
- API installate: @nestjs/jwt JwtService/signAsync/verifyAsync e tipi JwtSignOptions; jsonwebtoken SignOptions.keyid. Nessuna dipendenza nuova necessaria per header kid e lookup applicativa.
- [RFC 7515 §4.1.4](https://www.rfc-editor.org/rfc/rfc7515.html#section-4.1.4): kid nell’header; [RFC 8725 §3.1 e §3.12](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.1): algoritmo associato alla chiave e validazione distinta per tipo; [RFC 7518 §3.2–3.3](https://www.rfc-editor.org/rfc/rfc7518.html#section-3.2): dimensioni minime HMAC/RSA. Fonti primarie ricontrollate il 25 ottobre; nessuna valutazione del materiale reale.
