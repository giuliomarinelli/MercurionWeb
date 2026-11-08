# INF-VM-04-C — autenticazione client NATS

**8 novembre 2026.** Scelta owner: user/password, credenziali distinte per
consumer e ambiente, separate dall'URL. Implementato il consumer Nest;
provisioning del broker e allineamento Tox21 restano separati.

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

## Residui operativi

- La VM deve fornire entrambe le variabili, con utenti/password distinti per
  Nest/Tox21 e preview/production; l'omissione compatibile non prova protezione.
- Definire/configurare il broker con gli stessi materiali prima di abilitarne
  l'autenticazione; nessun broker esistente è stato modificato.
- Tox21 al commit `2cbfcd467afa9e9643065c630f6b06f265f0ac5a` passa ancora
  `NATS_URL` a `nc.connect`. Richiede un task dedicato per parametri user/password
  separati e validazione Pydantic; la sola capacità di inserire userinfo nell'URL
  non soddisfa il nuovo contratto. Repository letto soltanto.
- Permessi publish/subscribe sui subject e TLS richiedono verifica dedicata:
  questo task aggiunge autenticazione senza modificare ACL, reti o protocolli.
- Le policy JWT dei cinque RPC scientifici restano indipendenti dalle credenziali
  del broker. Nessuna rotazione, NKey o infrastruttura di account aggiunta.

Riferimenti: [autenticazione NATS](https://docs.nats.io/learn/security/authentication-basics),
[transport Nest](../../../MercurionWebNode/src/nats-transport.ts),
[validazione](../../../MercurionWebNode/src/config/env-validation.ts).
