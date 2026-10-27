# JWT key manifest v1 e runtime multi-chiave — B1a/B1b

27 ottobre 2026. B1a/B1b e B2 locale implementati, in review. B2 aggiunge registro persistente, CLI e riconciliazione delle connessioni private; [operazioni, prove e limiti](jwt-key-operations.md). Il nuovo runtime è collegabile tramite composizione esplicita o, in development/test, con [adapter locale e flag JWT_LOCAL_KEYS_CONFIG](jwt-local-development.md), dopo migrazione controllata. Senza opt-in il bootstrap conserva il percorso precedente: nessun nuovo requisito obbligatorio per avviare lo sviluppo. Non è ancora il rollout della rotazione sugli ambienti reali.

Il parser canonico è [parseJwtKeyManifest](../src/app_modules/auth/keys/jwt-key-manifest.parser.ts); [modello e policy algoritmi](../src/app_modules/auth/keys/jwt-key-manifest.ts) e [port del materiale](../src/app_modules/auth/keys/jwt-key-material-source.port.ts) sono indipendenti da SDK, filesystem, ConfigService e bootstrap. Il parser riceve un valore JSON già decodificato e l’ambiente atteso dal chiamante fidato; non legge file, process.env, rete o orologio.

JwtKeysProvider espone validateManifest, che prende l’ambiente atteso da ConfigService (`App.env`) e delega al parser senza leggere materiale. JwtKeyRing applica lo stesso parser al nuovo percorso di JwtToolsService; getAccessKeyPair/getWsKeyPair rimangono disponibili per il bootstrap corrente. Nessuna eccezione aggiunta al controllo di raggiungibilità del codice.

## Formato e invarianti

Tutti gli oggetti sono chiusi: campi sconosciuti rifiutati, anche nei riferimenti e nei dati operativi. Gli identificatori kid/reference/version/operator sono alias ASCII di 1–128 caratteri: primo alfanumerico, successivi alfanumerici, punto, trattino o underscore. Non sono URL o percorsi. I riferimenti sono logici: l’adapter locale o il futuro adapter del provider li associano al materiale autorizzato, senza costruire richieste da header JWT non verificati.

| Livello | Campi e vincoli |
|---|---|
| Manifest | schemaVersion=1; environment uguale a quello atteso; revision intera sicura positiva; previousRevision=null per 1, altrimenti revision−1; updatedAt UTC canonico; lastOperation; domains |
| lastOperation | kind initialize/prepare/activate/revoke/retire; initialize solo per revision 1; operator alias; reason non vuoto, massimo 512 caratteri, esclusivamente testo operativo non confidenziale |
| domains | Esattamente una voce per ciascuno dei 15 TokenType: nessun duplicato, omissione o tipo sconosciuto |
| Dominio | purpose, algorithm, issuance enabled/suspended, activeKid stringa/null, keys; legacy facoltativo |
| Algoritmo | AccessToken e ws_AccessToken: RS256; ciascuno degli altri 13 tipi: HS512. Policy esplicita ed esaustiva, non scelta dal manifest/token |
| Stato di emissione | enabled richiede una sola chiave active e activeKid corrispondente; suspended richiede activeKid=null e nessuna active. Può avere zero chiavi mentre attende provisioning |
| Chiave | kid, material {reference,version}, createdAt, state e date dipendenti dallo stato; publicKeyPem solo RSA |
| Identità | kid unico nell’intero manifest; coppia reference/version unica, anche tra domini. Lo stesso riferimento con una versione nuova è ammesso |
| Materiale pubblico | RSA non revocate richiedono publicKeyPem SPKI pubblico, RSA ≥2048 bit. Revocate possono conservarlo o ometterlo. Private PEM, chiavi EC/RSA corte e campi di materiale HMAC inline rifiutati. Stessa chiave pubblica RSA sotto kid/riferimenti diversi rifiutata, anche tra HTTP/WS |
| legacy | kid esistente nello stesso dominio, acceptUntil UTC; refreshUntil solo AccessToken e non precedente ad acceptUntil. Per verify-only le finestre non superano verifyUntil. Un mapping a una revocata può restare come metadato: **non la rende valida** |

Date nel formato del repository `YYYY-MM-DDTHH:mm:ss.sssZ`, con calendario valido. createdAt e date di transizione non possono superare updatedAt; ordine dei passaggi coerente. Il parser controlla l’ordine, **non** la scadenza rispetto all’istante corrente.

| state | Date richieste e ammesse |
|---|---|
| prepared | Solo createdAt |
| active | createdAt e activatedAt |
| verify-only | createdAt, activatedAt, signingStoppedAt e verifyUntil, in quest’ordine |
| revoked | createdAt e revokedAt; può conservare activatedAt, signingStoppedAt e verifyUntil come storia coerente. Lo stop richiede l’attivazione e la deadline richiede lo stop; la revoca non deve attendere la precedente deadline |

Estratto di **un dominio HMAC**, non un manifest completo caricabile da solo:

```json
{
  "purpose": "PreAuthorizationToken",
  "algorithm": "HS512",
  "issuance": "enabled",
  "activeKid": "pat-v1",
  "keys": [{
    "kid": "pat-v1",
    "material": { "reference": "pat-signing", "version": "v1" },
    "createdAt": "2026-10-01T00:00:00.000Z",
    "state": "active",
    "activatedAt": "2026-10-02T00:00:00.000Z"
  }]
}
```

Il risultato è uno snapshot scollegato dall’input e congelato anche negli oggetti annidati. Gli errori JwtKeyManifestValidationError riportano soltanto percorso dello schema e codice fisso; non includono valori respinti, materiale, payload o errori OpenSSL.

Uno schema chiuso impedisce i campi di segreti previsti per il materiale; non può riconoscere ogni credenziale accidentalmente incollata in una reason o in un alias. L’operatore deve mantenere tali campi non confidenziali. Audit e CLI avranno lo stesso vincolo.

## Material source port

JWT_KEY_MATERIAL_SOURCE identifica il contratto degli adapter; quello locale è implementato, il provider remoto resta INF-01A. resolve riceve environment, purpose, kid, algoritmo atteso e riferimento/versione dal manifest validato; restituisce asincronamente materiale confidenziale:

- RSA: publicKey, privateKey facoltativa, encoding pem o base64-pem. Il loader B1b ammette pem soltanto in development/test e impone base64-pem in staging/production. Controlla RSA ≥2048 bit, SPKI pubblico corrispondente al manifest e private PKCS8/PKCS1 corrispondente al pubblico. Per firmare la privata è obbligatoria.
- HMAC: secret ed encoding utf8/base64. Base64 canonico per chiavi nuove; utf8 soltanto con mapping legacy esplicito, conservando i byte letterali. Minimo 64 byte effettivi anche per legacy. L’attuale validatore richiede solo 48 caratteri: non è stato letto materiale reale e non si applica un’eccezione automatica; chiavi legacy più corte richiedono una decisione di migrazione prima del rollout.

La port resta indipendente dal provider; JwtKeyMaterialLoader applica i controlli descritti. Senza opt-in non viene attivato alcun adapter; JWT_LOCAL_KEYS_CONFIG seleziona esclusivamente quello locale in development/test. La cache comprende ambiente, scopo, kid, algoritmo, riferimento/versione, parte pubblica e modalità legacy; massimo 128 elementi, 8 richieste concorrenti distinte e deduplicazione delle richieste identiche. Il loader rifiuta il riuso dello stesso materiale HMAC sotto scopi/kid diversi già osservati nel processo. Stato/revoca restano nel manifest e non diventano una proprietà del secret già in memoria.

JwtKeyMaterialSourceError distingue UNAVAILABLE/NOT_FOUND/INVALID_MATERIAL con messaggio costante e senza cause/provider response. Gli adapter futuri devono convertire gli errori SDK senza riversarvi il contenuto della risposta o i valori richiesti.

## Composizione e comportamento B1b

Il confine applicativo è `createApplicationModule({ jwtKeys: { manifestSource, materialSource } })`. JwtKeyRuntimeModule registra le due sorgenti tramite JWT_KEY_RUNTIME_OPTIONS; JwtToolsService riceve la configurazione opzionale e usa JwtKeyRing. Non esiste una variabile d’ambiente che attivi implicitamente questa modalità. Entrambe le sorgenti devono essere fornite; una configurazione incompleta viene rifiutata.

- ManifestSource.read restituisce ogni volta metadati JSON freschi, senza ricevere token/header. B2 fornisce JwtKeyFileRegistry con directory current/history separate, lettura della cronologia e rifiuto di rollback o snapshot disallineati.
- All’inizializzazione Nest il nuovo percorso valida il manifest e carica le private attive RSA e le HMAC ammesse alla verifica, comprese le precedenti ancora valide. Materiale assente/incoerente o registro che cambia durante il caricamento impediscono l’avvio; nessun ripiego sulle vecchie variabili.
- Ogni firma sceglie materiale e kid dallo stesso snapshot, emette l’header protetto e ricontrolla lo stato prima di restituire il JWT. Cambio della chiave attiva durante l’operazione produce un errore controllato, senza restituire il token ormai superato.
- Ogni verifica vincola algoritmo e scopo al contesto atteso, esegue una lookup limitata e verifica firma, issuer, audience, scadenza e claim applicativi obbligatori. Rifiuta header con campi di chiavi/URL remoti, kid malformati/sconosciuti o chiavi revocate. La verifica RSA usa soltanto il pubblico del manifest; non interroga il Secret Manager.
- Lo stato viene riletto anche dopo la verifica crittografica. La cache conserva il materiale, non l’ammissione: registro indisponibile o invalido ne impedisce l’uso. Materiale già caricato e ancora ammesso resta utilizzabile durante un guasto del manager.
- Timeout del chiamante: 1 secondo per lettura del registro, 5 secondi per caricamento del materiale. Gli adapter reali devono anche limitare/annullare l’I/O sottostante: il timeout del chiamante non annulla automaticamente un’operazione SDK.
- Token senza kid ammessi solo con mapping legacy del dominio e prima di acceptUntil. Per rinnovo HTTP con ignoreExpiration si applica refreshUntil, se presente. VerifyUntil della chiave e revoca restano vincolanti anche con ignoreExpiration/skipRevocationCheck. Nessun fallback per kid presente ma sconosciuto.
- Revoca JTI, PAT MFA corrente, cifratura del sub e binding di sessione/device restano nei percorsi esistenti. I fault operativi del registro/materiale sono distinti dalle credenziali invalide: il guard HTTP non cancella cookie/sessioni e il guard WS nega l’evento senza dichiarare la sessione scaduta. Il solo decodeUnsafe non autorizza la distruzione di una sessione.

Il processo rifiuta revisioni inferiori, modifiche a parità di revisione, cambio del materiale di un kid già osservato, riuso di riferimenti/pubbliche sotto kid differenti e riattivazione di kid revocati osservati. Con una source generica questa storia è **solo in memoria**. La source file B2 rilegge invece revisioni e tombstone durevoli e li controlla anche dopo riavvio; richiede una cronologia integra e autorevole, non prova la sicurezza di un backup che abbia perso anch’essa. Confine di fiducia dell’operatore nel runbook.

Il bootstrap ordinario registra il modulo locale opzionale: flag assente/vuoto mantiene la configurazione esistente senza kid, flag configurato attiva il registro e il materiale versionato con kid, senza fallback. I 13 segreti JWT legacy non sono obbligatori nel secondo caso. Questa composizione **non sostituisce** il recupero pre-bootstrap e la rimozione dei segreti da process.env negli ambienti prod-like previsti da VPS INF-01A. Il Secret Manager, il suo adapter, l’identità macchina e le prove di non persistenza restano da realizzare.

## Verifiche e confine dei blocchi

- Baseline JwtToolsService/JwtKeysProvider: 2 suite, 7 test superati, prima delle modifiche.
- B1a: **9 suite, 156 test superati**, dei quali 78 nuovi sul manifest, diagnostica del materiale e binding dell’ambiente nel provider; incluse regressioni JWT, guard HTTP/WS, gateway e configurazione.
- Typecheck Nest, ESLint mirato senza warning, build Nest e controlli statici pertinenti; dettagli dei risultati nel diario portfolio.
- RSA sintetiche generate soltanto in memoria dai test: coppie HTTP/WS/rotazione distinte, anche casi RSA corta/EC/private PEM e tentativo di riutilizzo dello stesso materiale pubblico.

B1b: **17 suite/271 test superati**, con firme/verifiche RSA/HMAC reali per tutti i 15 domini, integrazione JwtToolsService, rotazione, legacy/rinnovo HTTP, revoca con cache calda, race durante firma/verifica, configurazione/encoding invalido, timeout e guasti senza logout. Incluse regressioni login/MFA/SSO/sessione, HTTP/WS, gateway e composizione applicativa. Comandi e controlli nel diario portfolio; nessuna prova browser/Compose/Secret Manager/ambiente reale o CI remota eseguita qui.

B2 locale implementato: sorgente file, CLI con anteprima/digest e revisione attesa, audit/tombstone e riconciliazione dei WS senza interrogare il provider. Il 27 ottobre è stata completata anche la [QA Linux/Compose isolata](jwt-linux-qa.md), 27 controlli con Redis/Socket.IO reali, crash del processo writer e adapter locale; non certifica il deployment o il provider finale. Preparazione/attivazione richiedono la materialSource fidata: la CLI standalone può collegare l’adapter locale con --local-config; senza sorgente non applica prepare/activate. Prossimi: adapter/bootstrap INF-01A, prova del deployment completo e consumer coordinati; finestre legacy reali e Tox21 ancora aperti. Piano [AUTH-02](../../MercurionWebNg/docs/portfolio-ux/JWT-KEY-ROTATION.md), [analisi](../../MercurionWebNg/docs/portfolio-ux/JWT-KEY-ROTATION-ANALYSIS.md) e [coordinamento VPS INF-01A](../../docs/infrastructure/vps-deployment-roadmap.md).
