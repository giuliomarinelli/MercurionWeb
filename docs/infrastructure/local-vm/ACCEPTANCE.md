# Piano di accettazione della VM e dei componenti

**Stato:** matrice di test progettata. La presenza di una riga non indica esecuzione. Registrare per ogni caso data, commit/config SHA, comandi sanitizzati, risultato ed evidenza.

| ID | Categoria | Verifica | Esito attuale |
| --- | --- | --- | --- |
| A-01 | Baseline | `docker compose config` di `shared`, `preview` e `production` senza segreti esposti | Base fixture: tre config validi, 11 guardie topologia e 4 matrice passate; configurazione applicativa operativa aperta |
| A-02 | Reti | DNS, collegamenti web/data/bus/search ammessi su stesso ambiente | Piano fixture e runner preparati; esecuzione Docker non effettuata |
| A-03 | Reti negativa | preview non raggiunge PostgreSQL, Redis o NATS production e viceversa | Negazioni e controlli positivi definiti nella matrice; esecuzione Docker non effettuata |
| A-04 | Reti negativa | non sono raggiungibili da LAN/Internet Redis, NATS, Postgres, Meilisearch, UI | Non eseguito |
| A-05 | Host | container con egress non raggiungono Windows/LAN secondo policy, IPv4 e IPv6 | Parziale: due bridge guest → Windows TCP IPv4 verificati; LAN/IPv6 aperti |
| A-06 | Ingresso | cloudflared esce verso Cloudflare, Nginx edge HTTP, due hostname corretti | Non eseguito |
| A-07 | Web | SPA Angular, Ketcher, REST, GraphQL e Socket.IO passano via Nginx edge | Non eseguito |
| A-08 | HTTP | header proxy/client IP e cookie/sessione corretti con la catena Cloudflare Tunnel | Non eseguito |
| A-09 | Access | preview limitato dalla policy autorizzata, produzione secondo regime concordato | Non eseguito |
| A-10 | Ricerca | entrambi i Nest leggono gli stessi indici ChEMBL, senza poterli modificare | Non eseguito |
| A-11 | Log | quattro indici log/audit, nessuna scrittura o lettura fuori perimetro | Non eseguito |
| A-12 | Amministrazione | `curl` precrea indici con key temporanea, task completati, nessun secret persistente | Non eseguito |
| A-13 | UI | UI ed API Meilisearch funzionano solo con doppio SSH local-forward; CORS valido | Non eseguito |
| A-14 | UI negativa | chiave read-only non può creare/eliminare/modificare indici o chiavi | Non eseguito |
| A-15 | Immagini | UI candidata scansionata per CVE, digest corretto e firma di approvazione owner | Non eseguito |
| A-16 | RPC | Nest ↔ NATS ↔ Tox21 con cinque subject e isolamento namespace | Non eseguito sulla VM |
| A-17 | RPC recovery | outage/restart NATS e worker, risposta propagata e recupero senza cross-talk | Non eseguito sulla VM |
| A-18 | Auth | login, MFA, refresh, WS, scadenza e logout con provider realmente scelti | Non eseguito sulla VM |
| A-19 | JWT | sostituzione breaking delle chiavi: vecchi token respinti e frontend chiede login | Non eseguito |
| A-20 | Persistenza | backup/restore Postgres, verifica volumi, import iniziale ChEMBL | Non eseguito |
| A-21 | Delivery | bundle staging/production completi, hash/label/model verificati dopo trasferimento | Non eseguito |
| A-22 | Rollback | ritorno a immagine precedente senza re-build e con DB compatibile | Non eseguito |
| A-23 | Recovery | restart guest/host e avvio su richiesta senza dipendenza da file credenziali persistenti | Non eseguito |
| A-24 | Risorse | memoria/CPU/disco misurati a riposo, in carico e con entrambi gli stack | Non eseguito |
| A-25 | Limiti portfolio | avviso di case study, dati personali e disponibilità rappresentati correttamente | Non eseguito |
| A-26 | Amministrazione guest | SSH da host con chiave, nessun login root/password, ACL delle origini verificate | Parziale: login operatore e policy globale acquisiti; ACL/prove negative aperte |
| A-27 | Cifratura guest | mount root sul dispositivo cifrato e percorso operativo di sblocco | Root su LUKS/dm-crypt/LVM verificato nel report v2; sblocco a freddo aperto |

## Risultati preesistenti da non confondere con questa matrice

**Nuovi gate VM-032, non eseguiti:** A-28 — IP host/guest, NAT e ACL persistenti
dopo reboot host/guest, con SSH e WSL/Docker funzionanti; A-29 — nuova rete
Pubblica in Kaspersky prima dell'attach e dopo reboot; A-30 — isolamento
diretto LAN ↔ VM/container su IPv4/IPv6, anche via NAT/host, con controlli
positivi. [Procedura e limiti delle prove](STATIC-NETWORK-MIGRATION.md).
L'inventario completo non supera questi gate; smartphone senza origine
controllata non chiudono automaticamente le prove negative.

- [INF-VM-02](HOST-GUEST-READINESS.md): inventario guest acquisito il 7 novembre
  dall'operatore. Nessuna porta Docker pubblicata nello snapshot; ciò non
  equivale al superamento di A-04/A-05. Eseguito H-02 TCP IPv4 guest → host
  con canary in ascolto e controlli positivi prima/dopo: percorso provato non
  raggiungibile. H-04 eseguito verso Windows TCP IPv4 da due bridge guest,
  con controlli container e host positivi. H-02 IPv6 link-local guest → Windows
  verificato con route valida e controlli host prima/dopo; restano LAN, altre
  origini e IPv6 container/globale.
  H-06 verifica inoltre DNS/HTTPS IPv4 verso docs.python.org da guest e due
  bridge, HTTP 200/TLS 1.3; non equivale alla verifica di tutti i provider.

- `docs/meilisearch-log-indices.md` registra unit/smoke per routing log in un Meilisearch effimero.
- `docs/infrastructure/tox21-integrated-acceptance-qa.md` registra integrazione reale delle classi Nest scientifiche e Tox21 via NATS, ma non bootstrap completo/HTTP/browser/deployment VM.
- I validator GitHub Actions attestano build e contratti nel loro perimetro, non la corretta politica firewall o Cloudflare della VM.

## Criteri di stop

Qualsiasi test negativo di rete non superato, credenziali elevate esposte, accesso amministrativo via Cloudflare, dati cross-environment, immagini non ammesse dalla policy o impossibilità di identificare la release effettiva interrompe la promozione. Annotare il difetto: non considerare il caso «non applicabile» per evitare la correzione.
