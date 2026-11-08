# Sicurezza, configurazione e segreti della VM

**Principio:** applicazione portfolio con superficie di attacco reale. Semplicità operativa non equivale a segreti nei repository o servizi esposti inutilmente.

## Modello di fiducia

- Host Windows: macchina amministrativa dell'operatore e sede del password manager. Non è previsto installare il password manager nella VM.
- Guest Ubuntu: ambiente Docker non privilegiato rispetto all'host; SSH per amministrazione, accessibile soltanto dal percorso approvato e con chiavi SSH dedicate.
- Cloudflare: TLS pubblico, tunnel e policy Access. `cloudflared` comunica con Nginx edge HTTP su rete Docker privata. Non importare certificati origin Kubernetes.
- Nginx edge: ingresso applicativo unico; validare host, forwarding IP/protocollo e `APP_TRUSTED_PROXY_CIDRS` in base agli hop **reali** cloudflared/Nginx.
- Docker: container, reti e volumi separati. Le reti non sostituiscono firewall guest/Hyper-V.
- Meilisearch: motore condiviso; credenziali separate per operatore, ambienti e consultazione UI.

## Materiale e privilegi distinti

| Materiale | Accesso | Custodia/impiego |
| --- | --- | --- |
| `MEILI_MASTER_KEY` **del server** | root del servizio Meilisearch; necessaria all'avvio protetto | Generata/custodita sul computer host, iniettata durante bootstrap controllato; mai ai backend; **non** versione in Git |
| Chiave amministrativa Meilisearch per `curl` | precreazione indici, amministrazione di chiavi e configurazione strettamente necessaria | Password manager Windows, usata soltanto durante una sessione operativa e rimossa dalla sessione al termine |
| `MEILISEARCH_MASTER_KEY` **del client Nest** | nome legacy di configurazione | Nella VM contiene una **API key applicativa a privilegi limitati**, mai la master key del server |
| `MEILISEARCH_LOG_KEY` del client writer Nest | scrittura nei soli indici log autorizzati | Differenziata per preview e production; distinta dalla key search legacy. Omissione compatibile riusa la key legacy, ma non soddisfa il contratto VM |
| Chiave API della UI | sola lettura su indici ammessi | Nessun mount nel container UI; inserita nel browser attraverso SSH e conservata nel password manager Windows |
| PostgreSQL, Redis | credenziali per singolo ambiente | Separazione completa, no esempi `root` riciclati dal Compose di sviluppo |
| NATS: `APP_NATS_USERNAME` / `APP_NATS_PASSWORD` Nest; `NATS_USERNAME` / `NATS_PASSWORD` Tox21 | utente/password distinti per consumer/ambiente, fuori dall'URL | Coppie opzionali per compatibilità; contratto VM richiede autenticazione. Adapter consumer da file disponibili; trasporto, mount e broker da predisporre: [contratto e prove](NATS-CLIENT-AUTH.md) |
| OAuth/SSO, Twilio, email, Dropbox/R2, Turnstile, HMAC applicative | credenziali esterne e di cifratura | Inventario per ambiente; non incluse negli artifact OCI |
| JWT RS256 e HS512 | firme e verifica dei token | Chiavi separate per ambiente/scopo; nessuna rotazione operativa a caldo richiesta |

**Nome ingannevole non significa privilegio elevato:** conservare `MEILISEARCH_MASTER_KEY` per compatibilità dei contratti Nest. Un cambio di nome non è una misura di sicurezza. Al contrario, verificare con le API Meilisearch che la chiave runtime non possa amministrare le chiavi, modificare gli indici molecolari o leggere gli indici di un altro ambiente.

## Master key del server versus chiavi amministrative

[Audit e contratto proposto INF-VM-04](BOOTSTRAP-CONTRACT.md): capacità dei
consumer verificate nei sorgenti, adattamenti mancanti e ciclo di vita proposto.
È progettazione, non un meccanismo di provisioning già implementato o approvato.

Il server Meilisearch richiede la propria master key **all'avvio** per operare in modalità protetta; la decisione «non conservare la master key nella VM» richiede un meccanismo di bootstrap manuale che renda il valore disponibile al processo quando parte. Una chiave applicativa separata può eseguire operazioni amministrative circoscritte attraverso `curl`. La sola presenza della master key nel password manager Windows non avvia automaticamente il server.

**Meccanismo operativo ancora da definire/testare:** passaggio host → guest con canale protetto, materiale temporaneo su RAM/`tmpfs` quando appropriato, permessi di lettura minimi, pulizia dopo provisioning, comportamento dopo stop/restart e controllo dei punti di esposizione (argv, `docker inspect`, output shell, process environment, file temporanei, backup, swap e crash dump). Non affermare «mai presente in memoria della VM»: il processo deve poterla usare. Non introdurre un KMS o un daemon segreti a pagamento senza necessità.

`docker compose secrets` con file su Docker Engine standalone non fornisce automaticamente cifratura a riposo. `_FILE` è utilizzabile soltanto dalle immagini o dal codice che lo supportano. La scelta definitiva richiede una prova di bootstrap dei componenti, non soltanto una sintassi Compose.

## Cifratura del guest e sblocco

Il secondo inventario operatore conferma il percorso LUKS → dm-crypt → LVM →
filesystem root ext4; `/boot` ed EFI risultano separati non cifrati. Nessuna
chiave o header LUKS è stato letto/esportato. Lo sblocco dopo un avvio a freddo
va descritto nel runbook operativo; non abilitare sblocco automatico o riavviare
per prova senza pianificare console e presenza dell'operatore. La cifratura a
riposo non sostituisce isolamento di rete né gestione dei segreti a VM sbloccata.
Vedere [INF-VM-02](HOST-GUEST-READINESS.md).

## JWT: strategia portfolio approvata

La codebase ha predisposizioni per registro, `kid` e rotazione. **Non implementare come requisito del deployment la rotazione coordinata a caldo.** Per la demo adottare segreti stabili per ambiente/scopo; la loro sostituzione è deliberatamente *breaking* per i JWT già emessi. Il client deve mostrare sessione scaduta/invalidata e chiedere un nuovo login; verificare realmente access token, refresh, WebSocket e sessioni Redis. Non confondere sostituzione JWT con cambio di pepper password, cifratura dei dati, cookie o identificatori Redis: sono contratti distinti.

Il default di `createApplicationModule` e le 13 variabili legacy vanno ispezionati in fase di provisioning. Conservare il lavoro di rotazione senza adottare automaticamente adapter e history multi-versione previsti dalla vecchia roadmap VPS.

Per Tox21, gli override `require-jwt` esistono, ma i consumer Nest devono fornire token compatibili prima di abilitarli. Non introdurre per «sicurezza» un flag che interrompe i cinque subject senza il relativo contratto applicativo.

## Difese operative

- Immagini fissate per digest verificato; verifica della provenienza e scansioni registrate; nessuna immagine nuova ammessa solo perché `latest` esiste.
- Container non-root, root filesystem read-only, capability minime, `no-new-privileges` e `tmpfs` ove compatibili con la loro immagine.
- Nessun Docker socket montato nella UI o nei servizi applicativi.
- Niente `ports:` pubblici per HTTP/DB/NATS/Redis/Meilisearch; sola eccezione di loopback/SSH per l'amministrazione, da collaudare.
- Segreti distinti per ambiente; niente credenziali vere in `.env.example`, build-args, layer OCI, diagnosi CI, log o artifact.
- Backup dati distinto da archivi immagini. I backup contenenti dati utenti non sono artifact GitHub.
- Il disclaimer portfolio non elimina i doveri di protezione dei dati degli utenti che si registrano.

## Condizioni bloccanti

Host/guest non isolati, porte amministrative raggiungibili dalla LAN, master key o API key elevate nei file tracciati o nell'immagine, staging capace di accedere ai dati di produzione, token non invalidati in modo coerente dopo cambio firma, accesso Meilisearch con privilegi non necessari, impossibilità di ripristinare almeno la release precedente.
