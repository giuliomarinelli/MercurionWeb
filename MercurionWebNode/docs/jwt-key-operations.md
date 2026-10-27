# AUTH-02 / B2 — Registro persistente e operazioni JWT

27 ottobre 2026. Implementazione locale, in review. Questo documento descrive codice e prove con fixture sintetiche; non autorizza rotazioni, restore o modifiche agli ambienti reali. Contratto del [manifest e runtime](jwt-key-manifest.md); coordinamento [VPS INF-01A](../../docs/infrastructure/vps-deployment-roadmap.md).

## Composizione esplicita

Senza opt-in il bootstrap conserva .env/PEM e JWT precedenti. Development/test possono ora usare [adapter locale e migrazione controllata](jwt-local-development.md) tramite JWT_LOCAL_KEYS_CONFIG. Per il provider esterno, il bootstrap fidato compone:

```ts
const jwtKeys = JwtKeyRuntimeModule.fromFiles(
  { currentDirectory, historyDirectory },
  environment,
  materialSource,
)
const module = createApplicationModule({ configuration, jwtKeys })
```

Percorsi assoluti, fisici e separati: nessuna directory contiene l’altra, niente symlink/junction o percorsi dal token. Il runtime non crea un registro assente e non lo ricostruisce dal solo manifest corrente. Nessuna nuova variabile d’ambiente obbligatoria. I 13 JWT_SECRETS_* restano obbligatori senza opt-in locale; con adapter locale sono sostituiti dal materiale versionato. Recupero pre-bootstrap, adapter del Secret Manager e rimozione dei segreti da process.env negli ambienti prod-like spettano a INF-01A.

Montare **le directory**, non il singolo manifest sostituito. Nei container Nest entrambe sono in sola lettura; soltanto l’identità operativa del writer può scriverle sull’host. Permessi POSIX dei nuovi file 0640, directory 0750; proprietà, gruppi e mount readonly restano responsabilità del deployment. Windows non applica automaticamente gli stessi ACL.

## Layout e consistenza

- currentDirectory/manifest.json: snapshot corrente, soltanto metadati e chiavi pubbliche.
- historyDirectory/1.json, 2.json, …: revisioni immutabili, con snapshot, digest SHA-256 e digest precedente. L’operazione contiene operatore, motivo e timestamp UTC. La revisione è l’unità di audit.
- historyDirectory/.writer-lock: esclusione tra writer. Nessuna scadenza/rimozione automatica del lock.
- File temporanei nello stesso filesystem della rispettiva destinazione. Niente materiale RSA privato, HMAC, JWT o risposta del provider.

Scrittura: lock, expectedRevision, validazione delle transizioni/identità, file temporaneo con apertura esclusiva e fsync, pubblicazione della revisione con hard link senza sovrascrittura, fsync della directory, sostituzione atomica del manifest corrente e ulteriore fsync. Linux con filesystem locale e supporto a rename/hard link/fsync è il target; directory fsync non disponibile nel percorso Windows, che non certifica la durabilità dopo perdita di alimentazione.

Il reader rilegge e valida cronologia, concatenamento, continuità delle revisioni, ambiente e uguaglianza con lo snapshot corrente. Conserva i tombstone; rifiuta rimozione di kid storici, cambi di riferimenti/versioni, regressioni di stato, modifica delle date già registrate e riuso delle pubbliche RSA anche dopo il loro ritiro. Un restore del solo current non cancella le revoche della cronologia. Il digest rileva corruzione e disallineamento: **non autentica un amministratore host che riscriva entrambi gli archivi**.

Limiti espliciti: 256 KiB per documento e 512 revisioni; nessuna compattazione o eliminazione automatica. L’eventuale checkpoint/archiviazione futura deve mantenere identità e tombstone autorevoli, non consiste nel cancellare file. Il reader non mantiene una cache alternativa dello stato. Misurare letture e deadline sul dataset e filesystem di deployment; la prova locale include 20 revisioni, 15 domini e 34 chiavi.

## CLI: anteprima e applicazione

Dal repository root:

```text
npm run jwt:keys --workspace mercurion_web_node -- inspect --current <directory-assoluta-current> --history <directory-assoluta-history> --env <ambiente>
npm run jwt:keys --workspace mercurion_web_node -- validate --current <directory-assoluta-current> --history <directory-assoluta-history> --env <ambiente>
```

Dopo la build è disponibile anche `node dist/src/jwt-keys.cli.js`, dalla directory MercurionWebNode; il comando amministrativo non avvia Nest, non legge .env e non apre porte. Non eseguirlo con le credenziali di produzione durante una verifica locale.

`change` riceve un file JSON **senza segreti**. Esempio di revoca dell’attiva con sospensione esplicita; revisione, alias e timestamp vanno ricavati dal proprio inspect e dall’operazione corrente:

```json
{
  "timestamp": "2026-10-27T09:00:00.000Z",
  "expectedRevision": 4,
  "operator": "operator-alias",
  "reason": "Revoca amministrativa autorizzata",
  "command": {
    "kind": "revoke",
    "purpose": "ws_AccessToken",
    "kid": "ws-v1",
    "suspendIssuance": true
  }
}
```

Il timestamp canonico deve essere corrente: non futuro e non più vecchio di cinque minuti. Non incollare token, credenziali o dettagli confidenziali in reason/operator/riferimenti. L’output mostra soltanto metadati autorizzati.

```text
npm run jwt:keys --workspace mercurion_web_node -- change --current <current> --history <history> --env <ambiente> --request <request.json>
```

Il primo comando produce un’anteprima con digest e non scrive. Dopo review si ripete **la stessa richiesta** aggiungendo `--apply <digest>`. Timestamp, perimetro e revisione fanno parte del digest. Digest errato, revisione cambiata, argomenti duplicati/sconosciuti e ambiente diverso vengono rifiutati. Non viene richiesta una conferma interattiva nascosta. Un fallimento ha exit code 1 e diagnostica senza percorsi o risposte del provider.

| Operazione | Vincoli |
|---|---|
| initialize | File manifest v1, anteprima/digest e applicazione esplicita. La CLI standalone ammette soltanto domini sospesi senza chiavi; non importa materiale o attive senza preflight |
| prepare | Aggiunge una prepared con kid/riferimento/versione nuovi. Controllo reale del materiale tramite la port prima della scrittura |
| activate | Solo prepared; distributionConfirmed=true esplicito, disponibilità del materiale e verifyUntil futura. Vecchia attiva in verify-only, nuova attiva unica; le finestre legacy devono restare compatibili |
| revoke | Qualsiasi chiave non già revocata; se attiva richiede suspendIssuance=true. Nessuna chiamata al provider. Per sostituirla preparare/attivare esplicitamente un’altra chiave |
| retire | Soltanto revoked: elimina l’eventuale pubblico dallo snapshot corrente, conserva identità/tombstone/audit. Non cancella il secret nel manager né gli snapshot storici |

**Binding del materiale:** runJwtKeysCli accetta la materialSource dalla composizione fidata oppure, soltanto in development/test, dall’adapter locale con `--local-config <settings.json>`. Quest’ultimo richiede che current/history coincidano esattamente con i percorsi del descriptor. La CLI applica così prepare/activate con preflight RSA/HMAC reale e materiale locale versionato. Senza adapter rimangono inspect/validate, seed sospeso, revoke/retire e recovery; prepare/activate non possono essere applicate. Collegare il provider selezionato per staging/produzione resta un gate INF-01A: nessun caricamento di moduli arbitrari o segreto in argv.

La verifica di isolamento HMAC controlla le chiavi non revocate disponibili durante il preflight; la produzione deve generare materiale nuovo per ogni binding/versione. Il registro non conserva digest dei segreti e non può provare da solo l’unicità di byte HMAC storici eliminati dal manager.

## Restore e interruzioni

Una pubblicazione può interrompersi dopo l’audit e prima dello snapshot corrente. Il reader ritenta brevemente, poi nega l’accesso: non ripiega su un vecchio snapshot. La revisione già pubblicata non viene eliminata. Anche un fallimento di fsync successivo alla pubblicazione va trattato come esito da ispezionare, non come autorizzazione a sovrascrivere la revisione.

1. Fermare le operazioni del writer e conservare entrambi gli archivi. Verificare lock, processo proprietario e motivo dell’interruzione; mai cancellare automaticamente un lock.
2. Controllare la cronologia integra, continua e dell’ambiente corretto. Conservare separatamente storia/tombstone quando si ripristina current da backup.
3. Usare soltanto recovery **in avanti** verso la revisione massima già presente:

```text
npm run jwt:keys --workspace mercurion_web_node -- recover-latest --current <current> --history <history> --env <ambiente> --expected-revision <N> --apply revision-<N>
```

Il recovery rifiuta un head diverso, buchi o digest alterati. Non ricostruisce la cronologia da un backup vecchio. Senza storia/tombstone autorevoli serve una procedura esplicita di nuovo provisioning/riautenticazione; nessun ripristino automatico delle vecchie attive. Non usare questa funzione per riattivare una chiave compromessa.

## Socket già aperti

Gateway e WsGuard registrano il binding della chiave dopo la normale autenticazione; il guard conserva scope, sessione/device e JTI. La watch conserva kid/compatibilità legacy e callback, **mai il token**. Un solo listener di cleanup per socket; reautenticazione sostituisce la watch, disconnessione/shutdown la rilascia. I socket pubblici non vengono registrati.

Una lettura del manifest per lotto ogni secondo, timeout di un secondo, un solo retry dopo 250 ms per una pubblicazione interrotta. Nessuna chiamata al provider. Chiave revocata, fine della finestra di verifica/legacy o registro persistentemente illeggibile causano rimozione dalle room ws_user/ws_session/ws_client e disconnessione del trasporto. Un adapter asincrono non può ritardare la disconnessione. Il budget nominale massimo della riconciliazione è circa 3,25 secondi, entro i cinque concordati; blocchi dell’event loop o del sistema operativo richiedono la prova sul deployment reale.

Rotazione ordinaria con vecchia chiave ancora ammessa e semplice scadenza del JWT non disconnettono la sessione Redis. Nessuna sessionExpired o revoca implicita di sessioni/JTI per il solo fault del registro. Richieste già autorizzate e risposte già in corso non sono annullate retroattivamente.

## Evidenze e limiti

Test locali: filesystem temporaneo reale, RSA/HMAC sintetiche, CLI preview/apply, conflitti, corruzione, rollback dopo riavvio, crash tra audit e current, recovery in avanti, tombstone e riuso delle pubbliche ritirate. Timer simulati per race/outage; anche prova con file e timer reali della rimozione di una connessione inattiva con manager offline. Il 27 ottobre è stata completata anche la [QA Linux/Compose isolata](jwt-linux-qa.md): 27 controlli con HTTP, Socket.IO/Redis reali, UID separati, readonly/POSIX, SIGKILL del writer e adapter locale con migrazione/rotazione; WS revocato in 543 ms nell’ultima prova.

Risultati finali nel [diario](../../MercurionWebNg/docs/portfolio-ux/DAILY-LOG.md). Restano prova sul deployment e bootstrap completi, adapter/bootstrap INF-01A, finestre reali per ambiente e consumer Tox21/contratto scientifico. La fixture non certifica Secret Manager, autenticazione reale o Safari. Nessuna chiave/configurazione reale letta o ruotata, nessun servizio utente fermato e nessun Git write. [Variabili d’ambiente, segreti e kid](jwt-environment-and-secrets.md).
