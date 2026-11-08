# INF-VM-04-C — autenticazione client NATS

**8 novembre 2026.** Scelta owner: user/password, credenziali distinte per
consumer e ambiente, separate dall'URL. Implementato il consumer Nest;
Tox21 allineato sul branch `feature/infra-vm-nats-client-auth`, commit `263ccbc`,
ancora da integrare. Provisioning del broker e consegna segreti restano separati.

## Contratto Nest

| Variabile | Regola |
| --- | --- |
| `APP_NATS_HOST` | URL host `nats://` o `tls://`, senza credenziali/porta/path; validazione esistente conservata |
| `APP_NATS_PORT` | Porta esplicita, validazione esistente conservata |
| `APP_NATS_USERNAME` | Opzionale; se presente richiede `APP_NATS_PASSWORD` |
| `APP_NATS_PASSWORD` | Opzionale e segreta; se presente richiede `APP_NATS_USERNAME` |

Entrambe omesse conservano il comportamento legacy, in tutti gli ambienti.
Coppia incompleta, valore vuoto o tipo errato producono `ConfigurationError`
prima dell'avvio dei transport, senza stampare i valori. I valori stringa sono
letterali, senza interpolazione o URL encoding: non vengono inseriti nell'URL.

Il builder espone `App.natsCredentials`; `createNatsTransportOptions` converte
la coppia nei campi SDK `user`/`pass`. Il listener NATS Nest e il client RPC
`MERCURION_AI_CLIENT` usano la stessa factory. Una coppia rifiutata dal broker
non attiva un tentativo anonimo. Il formatter di startup continua a mostrare il
solo endpoint; il redattore strutturato copre anche il nome SDK `pass`.

L'[adattatore da file](NEST-SECRET-FILE-ADAPTER.md) accetta i due nuovi nomi
tramite lo schema canonico. Le credenziali possono così essere consegnate al
processo Nest senza inserirle in `APP_NATS_HOST`, Compose `environment` o argv.
Questo non costituisce un provisioning VM già operativo.

## Verifica ripetibile

Dalla root, con le dipendenze esistenti:

```powershell
npm run build --workspace mercurion_web_node
node scripts/smoke-nats-client-auth.mjs
```

Lo smoke richiede il transport compilato aggiornato e le immagini già locali:
NATS `sha256:77a161c7d888a1791d5a46b50cd87a2f8466ce40a33cbb51238d227ace01e35a`,
Node `sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202`.
Usa soltanto Docker Desktop `desktop-linux`: tre broker effimeri, client
non-root, rete interna, nessuna porta host, pull o volume persistente. Config
temporanee contengono soltanto credenziali sintetiche; cleanup per run-id.

Il probe usa la factory Nest realmente compilata, `ServerNats` e
`ClientProxyFactory`: request/reply autenticato per staging e production,
compatibilità anonima su broker legacy, rifiuto per credenziali assenti,
password errata, utente ignoto o coppia dell'altro ambiente. Solo il codice
`AUTHORIZATION_VIOLATION` vale come negazione: timeout/DNS/refusal fanno fallire
la prova. Retry e timeout brevi appartengono al probe, non cambiano le policy app.

Esito locale dell'8 novembre: **2 request/reply autenticati, 1 legacy anonimo e
16 rifiuti espliciti `AUTHORIZATION_VIOLATION`**, per entrambi i transport Nest.
95 test unitari mirati passati, uno POSIX saltato su Windows; typecheck, build
e lint mirato passati. La prova non avvia l'app completa o il runtime Tox21.

## Allineamento Tox21, 8 novembre

Tox21 usa `NATS_USERNAME` e `NATS_PASSWORD`, coppia opzionale validata da
Pydantic prima del caricamento del modello/connessione. La password è un
`SecretStr`, mascherata nel modello; viene passata come opzione SDK `password`
(Nest usa `pass`). Omissione completa conserva legacy; valori vuoti/null/non-stringa
o coppia incompleta falliscono senza stampare contenuti. Le credenziali negli URL
sono ora rifiutate: migrare eventuali `NATS_URL` con userinfo ai due campi separati.
JWT dei servizi, namespace e forme dei messaggi restano invariati.

107 test applicativi passati sia su Windows sia su Linux. Prova reale del worker
su NATS isolato: 10 RPC autenticati sui cinque subject staging/production,
5 legacy anonimi e 8 negazioni esplicite, con readiness falsa e cleanup delle
connessioni sui fallimenti. RDKit reale; predizione e PubChem sostitutivi, nessuna
lettura di pesi/PEM o richiesta a provider. Il requester è nats-py: questa prova
e la precedente prova Nest restano evidenze distinte, non un nuovo end-to-end Web.

Prova locale con sole sorgenti selezionate montate sul runtime dipendenze
`sha256:e0e45c20f9b4a88d28ffe228bd3a420033386aa53fd981d349482940a197d568`:
non è una nuova immagine di release. Lo smoke è stato aggiunto alla CI Tox21
contro l'immagine appena costruita. [CI sullo SHA esatto
`263ccbc7429a85e1961b13d9a57038a46a07497a`](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42469399664)
completata con successo, incluso Required gate; integrazione riservata all'owner.
Dettagli nel repository Tox21: `docs/nats-client-auth.md` al commit sopra.

## Residui operativi

- La VM deve fornire entrambe le variabili, con utenti/password distinti per
  Nest/Tox21 e preview/production; l'omissione compatibile non prova protezione.
- Definire/configurare il broker con gli stessi materiali prima di abilitarne
  l'autenticazione; nessun broker esistente è stato modificato.
- Integrare il branch Tox21 dopo CI/review. `develop` Tox21 non è stato modificato.
  Tox21 consuma le credenziali come input di processo; consegna protetta da file
  ancora da predisporre, nessun supporto `_FILE` o ricevitore privilegiato implicito.
- Permessi publish/subscribe sui subject e TLS richiedono verifica dedicata:
  questo task aggiunge autenticazione senza modificare ACL, reti o protocolli.
- Le policy JWT dei cinque RPC scientifici restano indipendenti dalle credenziali
  del broker. Nessuna rotazione, NKey o infrastruttura di account aggiunta.

Riferimenti: [autenticazione NATS](https://docs.nats.io/learn/security/authentication-basics),
[transport Nest](../../../MercurionWebNode/src/nats-transport.ts),
[validazione](../../../MercurionWebNode/src/config/env-validation.ts).
