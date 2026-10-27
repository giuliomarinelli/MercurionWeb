# AUTH-02 — QA Linux/Compose isolata

27 ottobre 2026. **27 controlli superati**, con chiavi RSA/HMAC sintetiche, Redis e Socket.IO reali. Il percorso ordinario di sviluppo non è stato riconfigurato. Nessun .env/PEM reale, database applicativo, account o servizio dell’utente utilizzato.

## Ripetizione

Dal repository root, con Docker Linux disponibile e dipendenze locali già installate per la build Nest:

```powershell
./scripts/verify-jwt-linux.ps1 -ArtifactsDirectory "C:/percorso/risultati-jwt-qa"
```

Base pubblica predefinita: node:22.16.0-bookworm-slim. Il runner compila Nest e prepara un contesto temporaneo allowlist: soltanto JavaScript compilato, manifest/lockfile, contratti compilati e fixture. Non copia il workspace, env/, PEM o sourcemap. L’installazione npm avviene nell’immagine effimera, senza lifecycle script; il controllo conserva versioni, URL risolti, integrità e archi del lock. Sono ignorati soltanto i flag di classificazione d’installazione dev/devOptional/peer ricalcolati da npm; il lock originale viene ripristinato nell’immagine. Nessuna modifica al lock o a node_modules del workspace.

Compose usa progetto, immagine e volumi con nomi univoci, rete interna e nessuna porta pubblicata. Un Redis dedicato non usa AOF/snapshot. Il controller genera segreti in memoria e usa IPC per il provider sintetico: niente segreti in argv, env, file persistenti o log. La prova aggiuntiva dell’adapter locale usa materiale indipendente in tmpfs /tmp, eliminato al termine; material.env/PEM locali non finiscono nei volumi pubblici del registro. Writer UID 10002, reader UID 10001, gruppo 10001; il controller root serve solo a predisporre permessi e avviare i processi con identità diverse. Le directory current/history sono montate RW per il writer e mediante alias readonly per il reader.

Al termine il runner rimuove container/rete/volumi e immagine del proprio progetto; verifica il percorso prima di eliminare il contesto temporaneo. Non esegue prune globale e non tocca container o immagini preesistenti. I log e result.json rimangono nella cartella delle evidenze.

## Codice esercitato

La fixture carica il codice compilato del repository: JwtToolsService, JwtKeyRing, JwtKeyFileRegistry, JwtKeyAdministration, SecurityService, GlobalGuard e policy, SessionService, RedisSessionRepository/codec, SecureCookieService, WsGuard e SocketIOGateway con Redis adapter. Il trasporto HTTP è un server Node minimale con adapter ExecutionContext/reply; identità, scope e notifica del cambiamento sessione sono fixture. Non è il bootstrap completo Nest/GraphQL/nginx, un login reale o un test del database utenti/RBAC.

| Area | Riscontri |
|---|---|
| Permessi | Reader non privilegiato; scritture negate dal mount readonly (EROFS) e indipendentemente dai permessi POSIX sul mount RW (EACCES) |
| HTTP/Redis | Autenticazione con sessione Redis reale; vecchio JWT realmente scaduto verificato per rinnovo dopo rotazione; nuovo JWT con kid v2; niente cancellazione cookie/sessione |
| WS/rete | Connessioni Socket.IO reali private/pubbliche; session-init attraversa WsGuard con cookie firmati e sessione/device validati; rotazione ordinaria conserva la connessione |
| Revoca WS | Durante outage del provider, la vecchia connessione inattiva viene rimossa dalle room reali del Redis adapter e disconnessa; nuova chiave e connessione pubblica restano valide; zero richieste al provider |
| HS512 | Vecchia e nuova versione convivono; durante outage la revoca esclude solo la vecchia chiave, anche con materiale in cache |
| Outage | HTTP con chiave già caricata funziona; nuovo reader senza materiale non può avviarsi e non ripiega sui vecchi input |
| Restore | Ripristino del solo current rifiutato senza cookie cleanup/distruzione della sessione; recovery soltanto in avanti e tombstone conservati dopo riavvio |
| Crash | SIGKILL reale del writer dopo pubblicazione/fsync dell’audit e prima del rename di current; reader nega accesso; lock rimosso esplicitamente solo dopo exit del proprietario, recovery e nuovo reader riescono |
| Adapter locale | Migrazione di RSA/HMAC sintetiche senza cambiare i byte legacy; nuove chiavi generate, preparate e attivate a caldo con sorgente locale già avviata, in tmpfs e ambiente development |
| Persistenza | Documenti pubblici con mode 0640; niente private PEM, private Base64 o secret HMAC nel registro/audit, inclusi file temporanei rimasti dopo crash |

La prova SIGKILL verifica il crash del processo; non simula perdita di alimentazione, guasto del disco o restore di entrambi gli archivi da un backup vecchio. Il provider è un emulatore in memoria, non il Secret Manager selezionato.

## Risultato registrato

- 27/27 controlli; Node v22.16.0 su Linux.
- Nest common/core 11.2.7, JwtService 11.0.2, Socket.IO server/client 4.8.1, ioredis 5.8.2.
- Disconnessione WS con provider offline: **543 ms** nell’ultima prova, inferiore al limite concordato di cinque secondi. Il tempo dipende dalla fase del timer e dal carico; non è uno SLA della VPS.
- Tredici documenti pubblici verificati dopo rotazioni, revoche, restore e crash.
- Build Nest, sintassi CJS e parsing PowerShell riusciti. Nessuna certificazione di CI remota o merge dichiarata.

Ultime evidenze: `C:/Users/giuli/.codex/artifacts/mercurion-jwt-local-2026-10-27/linux/` (27 controlli); prova precedente in `C:/Users/giuli/.codex/artifacts/mercurion-jwt-linux-2026-10-27/` (26 controlli): result.json, compose-config.yml, build/install/Compose/cleanup log, identificatori delle immagini. Conservati anche i primi passaggi con base QA preesistente; il passaggio finale usa la base Node pubblica. L’avviso preesistente sul requisito Node >=24 di geoip-lite non è stato corretto qui: il percorso GeoIP non rientra nella fixture e la migrazione di piattaforma resta nella sua roadmap.

## Passaggi ancora aperti

Provider/adapter INF-01A, configurazione pre-bootstrap senza copie in process.env, identità della VPS dopo reboot, finestre reali per ambiente e contratto/verificatore Tox21. Ripetere i controlli sul deployment finale e con il bootstrap completo prima del rollout. La QA isolata non abilita automaticamente il nuovo percorso sui dati reali: l’opt-in locale richiede la [migrazione esplicita](jwt-local-development.md).

Vedi [gestione delle variabili, segreti e kid](jwt-environment-and-secrets.md), [runbook](jwt-key-operations.md) e [roadmap VPS](../../docs/infrastructure/vps-deployment-roadmap.md).
