# JWT multi-chiave in sviluppo

27 ottobre 2026. Adapter locale e bootstrap implementati, in review. Questa guida attiva il percorso RS256 HTTP/WS e HS512 per gli altri 13 scopi, con `kid`, registro persistente e revoca a caldo. Le prove usano materiale sintetico: la migrazione dei file reali dell'utente non è stata eseguita.

## Configurazione e migrazione iniziale

Senza `JWT_LOCAL_KEYS_CONFIG`, o con valore vuoto, resta il comportamento precedente. Non cambiare i segreti esistenti per adottare il nuovo percorso: la migrazione conserva i byte delle chiavi, incluse le stringhe HMAC interpretate come UTF-8 letterale. Una stringa legacy che assomiglia a Base64 non viene decodificata. Materiale HMAC inferiore a 64 byte viene rifiutato indicando soltanto lo scopo; nessuna sostituzione o invalidazione automatica.

1. Arrestare il processo Nest che emette i token; mantenere invariati `.env` e PEM tra anteprima e applicazione. Le finestre di compatibilità partono dall'istante della migrazione, quindi il vecchio processo non deve continuare a emettere token durante il passaggio.
2. Dalla root del repository, con la configurazione di sviluppo corrente e il flag ancora assente/vuoto:

```powershell
$jwtPlan = npm run --silent jwt:local --workspace mercurion_web_node -- init | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Anteprima JWT non riuscita' }
$jwtPlan | ConvertTo-Json -Depth 8
npm run --silent jwt:local --workspace mercurion_web_node -- init --directory $jwtPlan.directory --at $jwtPlan.at --apply $jwtPlan.digest
if ($LASTEXITCODE -ne 0) { throw 'Migrazione JWT non riuscita: non abilitare il flag' }
```

L'anteprima non scrive file e non mostra segreti. Il digest lega anche i byte importati, oltre ai metadati: input cambiati richiedono una nuova anteprima. Timestamp UTC canonico, non futuro e vecchio al massimo cinque minuti; destinazione già esistente rifiutata. La CLI carica solo il modulo di configurazione, senza server, database, NATS o Redis. Nel repository accetta soltanto sottocartelle di `MercurionWebNode/.local`; è ammessa anche una cartella privata esterna ai repository Git. Non sovrascrive gli input originali.

La durata legacy ordinaria copre il TTL configurato più 60 secondi. Il rinnovo HTTP copre anche la durata massima delle sessioni più 60 secondi, perché un access token scaduto può ancora rinnovare una sessione valida. Se in passato TTL/sessioni erano più lunghi, estendere esplicitamente con `--legacy-accept-until <UTC>` e `--http-refresh-until <UTC>` **in entrambi i comandi**; non si possono accorciare le finestre calcolate. Rivedere `windows` nell'anteprima prima dell'applicazione.

3. Solo dopo un'applicazione riuscita, aggiungere in `MercurionWebNode/env/.env.development`:

```dotenv
JWT_LOCAL_KEYS_CONFIG=.local/jwt-keys/development/settings.json
```

4. Riavviare il consueto `npm run start:dev --workspace mercurion_web_node`. Il percorso relativo è risolto rispetto al working directory del workspace Nest. I nuovi JWT contengono il `kid`; i precedenti sono ammessi nelle finestre registrate. Un archivio configurato assente, invalido o senza materiale necessario impedisce l'avvio: nessun fallback alle vecchie chiavi.

Dopo la verifica dell'attivazione si possono rimuovere dal `.env` principale le 13 `JWT_SECRETS_*`: nel percorso locale non sono più obbligatorie. Restano issuer/audience, TTL, configurazione sessioni e gli altri segreti applicativi, cookie e cifratura. I PEM originali non vengono modificati. Non impostare `JWT_ACTIVE_KID`: non esiste una seconda autorità in `.env` per scegliere la chiave attiva.

## File generati

```text
MercurionWebNode/.local/jwt-keys/development/
  settings.json             # mapping reference/version e percorsi relativi
  material.env              # HMAC versionate, encoding Base64
  materials/                # coppie PEM HTTP/WS versionate
  current/manifest.json     # metadati, stati, pubbliche, kid attivo
  history/1.json, 2.json...  # revisioni immutabili e tombstone
```

La cartella `.local` è ignorata da Git. `material.env` è letto privatamente dall'adapter, senza copiarlo in `process.env`; Base64 è encoding, non cifratura. I file privati sono creati con mode 0600 e la cartella privata con 0700 su POSIX; current/history seguono i permessi 0750/0640 del registro; su Windows proteggere gli ACL della cartella utente. Backup e accessi devono includere sia il materiale sia i due archivi del registro e conservare tutte le versioni ancora necessarie.

L'importazione viene preparata in una nuova cartella privata `.preparing-<uuid>` e pubblicata dopo validazione. Un errore può lasciarla per ispezione manuale: non è ammessa dal runtime e non viene rimossa automaticamente. Non usare questa cartella come configurazione.

## Rotazione locale successiva

Generare una nuova chiave e il relativo file di richiesta pubblico, usando un `kid` mai utilizzato:

```powershell
$jwtSettings = 'C:/percorso/MercurionWeb/MercurionWebNode/.local/jwt-keys/development/settings.json'
npm run --silent jwt:local --workspace mercurion_web_node -- new-key --config $jwtSettings --purpose AccessToken --kid http-dev-v2 > "$env:TEMP/jwt-prepare.json"
```

`new-key` crea il materiale e un nuovo binding, senza ammettere o attivare la chiave. Non passare segreti in argv e verificare l'exit code prima del passo seguente. Le HMAC nuove contengono 64 byte casuali; RSA usa coppie distinte a 2048 bit. Per WS usare `ws_AccessToken`; per HS512 lo scopo specifico, ad esempio `ActivationToken`. Non cambiare file o alias sotto una coppia reference/version già esistente.

Usare quindi la [CLI amministrativa](jwt-key-operations.md) con i percorsi assoluti `current`/`history` dello stesso archivio e **`--local-config <settings.json>`**:

```text
npm run --silent jwt:keys --workspace mercurion_web_node -- change --current <current-assoluto> --history <history-assoluto> --env development --local-config <settings.json> --request <jwt-prepare.json>
```

Rivedere l'anteprima e ripetere la stessa richiesta con `--apply <digest>`. Preparazione e attivazione sono due operazioni distinte: dopo `prepare`, creare la richiesta `activate` con la nuova `expectedRevision`, timestamp corrente, `distributionConfirmed: true` e `verifyUntil` compatibile con rinnovo HTTP e token già emessi. L'adapter rilegge i nuovi binding; la rotazione non richiede di riavviare Nest né di cambiare il flag. La CLI verifica che i percorsi del registro coincidano con quelli del descriptor, non soltanto che abbiano contenuti simili.

Revoca, ritiro e recovery restano operazioni esplicite del runbook. Non cancellare le vecchie versioni o la cronologia dopo l'attivazione. La revoca nel manifest prevale sulla cache del materiale; la riconciliazione WS rimuove le connessioni private interessate entro il budget concordato di cinque secondi. Non viene eseguita una revoca generale delle sessioni Redis durante una rotazione ordinaria.

## Confine con staging e produzione

`JWT_LOCAL_KEYS_CONFIG` è ammesso soltanto in development/test. In staging/produzione è rifiutato: il futuro adapter Secret Manager, l'identità macchina e il recupero pre-bootstrap senza copie in `process.env` restano **VPS INF-01A**. L'adapter locale non certifica quel deployment o il consumer Tox21.

Verifiche: 32 test specifici, regressioni JWT/autenticazione/configurazione, compilazione Nest e [27 controlli Linux/Compose](jwt-linux-qa.md), incluso adapter locale con materiale sintetico in tmpfs. Nessuna attivazione, chiave o configurazione reale dell'utente usata nelle prove.
