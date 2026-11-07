# INF-VM-04-B — adattatore locale file → ambiente Nest

**7 novembre 2026 — implementato e testato su materiale sintetico.** Non è un
provisioner: non genera, trasferisce, aggiorna o elimina segreti. Nessuna
operazione VM o modifica al flusso SSH/sudo. La proposta di consegna e ciclo di
vita [VM-028](BOOTSTRAP-CONTRACT.md) resta separata dall'adattatore consumer.

## Attivazione esplicita

Il nuovo entrypoint compilato è `dist/src/bootstrap-secrets.cli.js`.
`MERCURION_BOOTSTRAP_FILE` indica un percorso assoluto al documento JSON da
leggere; il percorso è configurazione non segreta, non contiene i valori.
L'ambiente esterno deve avere già `APP_ENV=staging` oppure `production`.

Il CMD Docker esistente e `main.ts` non sono stati cambiati: i consumer attuali
continuano ad avviarsi come prima. Il futuro manifest applicativo potrà
scegliere il nuovo entrypoint solo dopo il gate operativo. Non è stato
aggiunto al Compose fixture, che continua a usare soltanto il probe TCP.

Il nuovo entrypoint non ha un fallback silenzioso: file non dichiarato,
relativo, mancante o non valido → errore e codice di uscita 1, senza avviare
Nest. L'import dei moduli applicativi è ritardato fino alla lettura e validazione
del documento. La validazione canonica di Nest continua poi normalmente.

## Documento dati versione 1

| Campo | Contratto |
| --- | --- |
| `schemaVersion` | Numero intero 1 |
| `environment` | `staging` oppure `production`, uguale all'`APP_ENV` esterno |
| `variables` | Oggetto non vuoto di coppie nome → stringa; nessun altro campo top-level |

Nomi ammessi derivati da `environmentSchema.sources`, con le quattro variabili
RSA HTTP/WS legacy e le relative varianti `_B64`. Sono rifiutati `APP_ENV`,
`NODE_ENV` e `JWT_LOCAL_KEYS_CONFIG`: restano configurazione esterna, senza
possibilità di spostare il processo su un ambiente o adapter locale diverso.
Sono respinti anche nomi estranei come `NODE_OPTIONS`, `PATH` e `__proto__`.

I valori devono essere stringhe non vuote/non composte solo da spazi e senza
NUL o surrogate Unicode isolate. Sono conservati letteralmente, comprese newline PEM e sequenze `${...}`:
niente dotenv expansion, shell, `eval` o sostituzioni. JSON UTF-8 strettamente
valido, BOM UTF-8 ammesso, dimensione complessiva massima 1 MiB.

Ogni variabile deve avere una sola origine: se è già presente nell'ambiente
del processo, il documento viene rifiutato anche a parità di valore. Si verifica
prima l'intero payload, poi si applicano le variabili: una voce successiva
invalida non lascia un'iniezione parziale. Non si sovrascrivono credenziali
esistenti per cercare di far partire il servizio.

Il file può contenere solo una parte della configurazione: non sostituisce
`validateEnvironment`, non rende opzionali le variabili richieste e non verifica
crittograficamente le chiavi. La semantica base64/PEM, i consumer JWT e la
configurazione applicativa restano quelli esistenti. I test con valori sintetici
non sono una prova di firma/verifica RSA o di avvio completo di Nest.

## Lettura e privilegi

Si accettano soltanto file regolari, non directory o symlink. Su Linux l'apertura
usa `O_NOFOLLOW` e `O_NONBLOCK`, poi ricontrolla il descriptor; group-write/execute
e ogni permesso per others sono rifiutati. Group-read è ammesso per il modello
root → GID del servizio. Il file deve essere realmente leggibile dall'UID del
consumer: dichiarare un percorso non modifica ownership o ACL.

Anche la lettura è limitata a 1 MiB più un byte, per rifiutare una crescita del
file oltre la misura iniziale. Il descriptor viene chiuso prima dell'uso dei
valori. Il consumer non cancella il file: conservazione per restart/recreate e
pulizia spettano al futuro gestore del ciclo di vita, dopo la decisione operativa.

L'adattatore modifica soltanto l'ambiente del processo Node già in esecuzione.
Non popola le variabili segrete del modello Docker `Config.Env`, non crea
file env e non passa valori in argv. Root/Docker admin e la memoria del processo
restano nel confine fidato. Non è una garanzia forense o una prova delle future
modalità di mount, swap, snapshot e restart sulla VM.

## Diagnostica

Gli errori dell'adattatore espongono `INVALID_SECRET_BOOTSTRAP` e un motivo
costante, senza contenuti, nomi arbitrari forniti dal documento o percorsi.
Il launcher usa `[SECRET_BOOTSTRAP_ERROR]` e non stampa l'eccezione originale.
Un errore inatteso propagato all'entrypoint è riportato come
`APPLICATION_START_FAILED/application-startup`.

Questo controllo riguarda l'adattatore e il suo reporter: la diagnostica interna
all'applicazione mantiene il proprio comportamento. Non viene dichiarata una
verifica completa dei log dei provider esterni o del bootstrap runtime.

## Prove eseguite

- Jest mirato su Windows: 34 casi passati, uno POSIX saltato; payload letterali,
  13 HMAC e nomi RSA, input invalidi, confini ambiente, collisioni, atomicità,
  limiti, BOM/PEM multilinea, errori file, ordine load/start e redazione.
- Container unitario Linux locale, senza rete e con filesystem root read-only,
  UID/GID 10001:10001: 7 verifiche reali per 0600/0400/0640, symlink, 0644/0660
  e file illeggibile. Codice derivato dai sorgenti, nessun avvio Nest, volume
  dati o materiale operativo. Container terminato e rimosso.
- Typecheck senza emissione, build Nest e lint mirato: passati. Verificato il
  file compilato del nuovo entrypoint: senza input restituisce exit 1 e diagnostica
  costante, prima di avviare l'applicazione.

Comando Jest ripetibile dalla root:

```powershell
node node_modules/jest/bin/jest.js --config MercurionWebNode/jest.config.js --runInBand --runTestsByPath MercurionWebNode/src/bootstrap/secret-file-environment.spec.ts
```

Le prove Linux isolate sono conservate localmente in
`C:/Users/giuli/.codex/artifacts/inf-vm-04/nest-secret-bootstrap-linux/`.
Nessuna lettura di `.env` personali o PEM reali. Ricevitore/apply privilegiati,
integrazione Docker operativa, auth NATS, separazione key Meilisearch e prova
restart/recreate restano aperti. INF-VM-04 non è completato.

Sorgenti: [lettore](../../../MercurionWebNode/src/bootstrap/secret-file-environment.ts),
[entrypoint](../../../MercurionWebNode/src/bootstrap-secrets.cli.ts),
[test](../../../MercurionWebNode/src/bootstrap/secret-file-environment.spec.ts).
