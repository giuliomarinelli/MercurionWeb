# JWT: variabili d’ambiente, segreti e kid

27 ottobre 2026. Distinguere configurazione attuale, runtime multi-chiave già implementato e integrazione del provider ancora da completare. Questo documento non richiede di modificare ora .env o chiavi reali.

## Situazione attuale

Senza configurazione locale esplicita, `createApplicationModule()` conserva il percorso legacy. In development/test è ora disponibile l’adapter locale tramite `JWT_LOCAL_KEYS_CONFIG`, dopo migrazione controllata degli input esistenti: [procedura di sviluppo](jwt-local-development.md). Il nuovo percorso emette kid e non richiede più i 13 JWT_SECRETS_* nel .env principale. La migrazione dei dati reali non è stata eseguita.

| Dato | Oggi | Modello di destinazione |
|---|---|---|
| Ambiente | APP_ENV | Resta configurazione non segreta; deve coincidere con il manifest e con l’ambiente del provider |
| Audience | JWT_AUD_API, JWT_AUD_WS, JWT_AUD_AUTH | Restano configurazione non segreta |
| Issuer | Deriva da APP_PROJECT_NAME e APP_PROJECT_ID | Preservare l’identità configurata; nessuna nuova JWT_ISSUER introdotta qui |
| TTL | JWT_EXPIRATION_*, MFA_CHANGE_TIME | Restano configurazione; la finestra di mantenimento delle chiavi copre anche il rinnovo delle sessioni HTTP |
| Private RSA HTTP/WS | PEM locali in sviluppo; vecchio provider prod-like legge le rispettive variabili *_B64 | Staging/prod: Secret Manager, recupero runtime e decodifica esclusivamente in memoria; coppie HTTP/WS distinte |
| Secret HMAC | 13 variabili JWT_SECRETS_* distinte per scopo | 13 domini distinti nel manager, con versioni sovrapposte durante la rotazione; niente unico secret HS512 globale |
| Pubbliche RSA | File/variabili del vecchio provider | Anche nel manifest non segreto, per verificare senza interrogare il manager |
| kid attivo, stati, revoche | Nessuna gestione nel bootstrap legacy | Nel manifest versionato su volume, non in una variabile di processo |
| Riferimento/versione materiale | Una configurazione per dominio | Binding logico immutabile nel manifest, risolto dall’adapter fidato verso la versione effettiva nel manager |

## kid non è una credenziale

È l’identificatore pubblico della chiave nell’header JOSE, protetto dalla firma. Non sostituisce il segreto e non viene inserito nel payload come claim applicativo. Il runtime lo sceglie dal manifest; l’utente e il client non selezionano la chiave di firma.

Estratto illustrativo, non un manifest completo:

```json
{
  "purpose": "AccessToken",
  "algorithm": "RS256",
  "activeKid": "staging-http-2026-11",
  "keys": [{
    "kid": "staging-http-2026-11",
    "material": { "reference": "jwt-access-http", "version": "v2" },
    "state": "active"
  }]
}
```

L’adapter associa `jwt-access-http`/`v2` a materiale ammesso per staging. Gli alias non sono URL, percorsi, credenziali o istruzioni di download ricevute dal token. Il kid è unico e non viene riutilizzato con materiale diverso. Non è stata introdotta una variabile JWT_ACTIVE_KID: cambiarla richiederebbe un riavvio e creerebbe una seconda autorità rispetto al registro a caldo.

## Sviluppo locale

Adapter e bootstrap locale sono implementati, con opt-in `JWT_LOCAL_KEYS_CONFIG=.local/jwt-keys/development/settings.json`. Eseguire prima anteprima/applicazione della migrazione mediante `jwt:local init`, poi impostare il flag e riavviare Nest. La [guida completa](jwt-local-development.md) copre finestre legacy/rinnovo HTTP, generazione e rotazione a caldo. Senza flag restano le impostazioni precedenti.

Lo store ignorato da Git contiene mapping non segreto, HMAC versionate in material.env e PEM versionati. Il materiale HMAC locale non viene caricato in process.env. Dopo attivazione verificata, i 13 JWT_SECRETS_* diventano rimovibili dal .env principale; gli altri segreti applicativi restano invariati. kid/stato/revoche vivono nel manifest, non nel flag. Una sola variabile sovrascritta per scopo non basta a conservare le vecchie chiavi. Staging/produzione rifiutano il flag locale; non è un fallback del futuro manager.

I byte legacy HMAC rimangono UTF-8 letterali: non reinterpretare una stringa già usata come se fosse Base64. Le nuove HMAC usano Base64 canonico e almeno 64 byte decodificati. Nessuna valutazione delle chiavi reali è stata eseguita; una legacy incompatibile richiede una decisione esplicita di migrazione.

## Staging e produzione sulla VPS

In Compose e nel processo restano i dati non segreti necessari a identificare ambiente e configurazione; i nomi definitivi dei locator del provider e dei percorsi del registro appartengono al bootstrap INF-01A. Non sono state introdotte nuove variabili obbligatorie in questa consegna.

Private RSA e HMAC verranno recuperate dal Secret Manager tramite una materialSource fidata e mantenute in memoria. Non vanno spostate in un JSON sul volume né trasformate in un’unica variabile con tutte le chiavi. Base64 è un encoding, non una protezione del segreto. Non si conserva una copia .env/PEM come fallback prod-like.

Il manifest conserva solo metadati/pubbliche e reference/version. La disponibilità di un secret già caricato non scavalca lo stato del manifest; cancellare un secret dal manager non revoca automaticamente JWT già emessi. La revoca si esegue nel registro; la rimozione del materiale dal manager avviene con un’operazione separata dopo il periodo di verifica/rinnovo.

Il kid qui seleziona la chiave di firma JWT. Non ruota APP_USER_ID_AES_ENCRYPTION_SECRET, la cifratura applicativa o le firme di cookie/sessione: cambiare insieme quei segreti interromperebbe altri contratti. Il loro trasferimento nel manager va censito separatamente in INF-01A.

Restano due integrazioni esplicite prima del rollout:

1. Provider/adapter e configurazione pre-bootstrap, eliminando anche la copia di segreti validati in process.env effettuata dall’attuale ConfigModule. La prova QA con configurazione programmatica non certifica questo percorso del bootstrap completo.
2. Identità della macchina dopo un riavvio: un token statico del manager in .env/Compose ricreerebbe il problema. Distinguiamo bootstrap protetto/cifrato da sblocco dell’operatore; il modello va scelto e provato in INF-01A.

## Rotazione operativa

Creare materiale nuovo nel manager, aggiungere un nuovo binding/kid come prepared, validarlo e distribuirlo ai verificatori, attivarlo e mantenere la precedente in verify-only fino alla fine delle finestre concordate. Per emergenza revocare il kid nel manifest; il controllo non dipende dal manager. Le versioni non vengono sostituite sotto lo stesso kid e non occorre cambiare un kid in .env a ogni rotazione.

Riferimenti: [operazioni B2](jwt-key-operations.md), [manifest/runtime](jwt-key-manifest.md), [roadmap infrastrutturale](../../docs/infrastructure/vps-deployment-roadmap.md).
