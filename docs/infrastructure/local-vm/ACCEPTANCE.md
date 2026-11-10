# Piano di accettazione della VM e dei componenti

**Stato:** matrice di test progettata. La presenza di una riga non indica esecuzione. Registrare per ogni caso data, commit/config SHA, comandi sanitizzati, risultato ed evidenza.

| ID | Categoria | Verifica | Esito attuale |
| --- | --- | --- | --- |
| A-01 | Baseline | `docker compose config` di `shared`, `preview` e `production` senza segreti esposti | Base fixture: tre config validi e uguali su host/VM, 12 guardie topologia e 4 matrice passate; configurazione applicativa operativa aperta |
| A-02 | Reti | DNS, collegamenti web/data/bus/search ammessi su stesso ambiente | Verificato sulle sole fixture VM: 15 allow passed nel run c2abe4b0e10248698a4e02a9ff584e5b; servizi reali non collaudati |
| A-03 | Reti negativa | preview non raggiunge PostgreSQL, Redis o NATS production e viceversa | Verificato sulle sole fixture VM: 18 deny passed con controlli, nove TCP non connessi e nove assenze di route; protocolli/servizi reali non collaudati |
| A-04 | Reti negativa | non sono raggiungibili da LAN/Internet Redis, NATS, Postgres, Meilisearch, UI | Non eseguito |
| A-05 | Host | container con egress non raggiungono Windows/LAN secondo policy, IPv4 e IPv6 | Parziale: percorsi host verificati e TCP da guest/due bridge verso Android LAN negativo con controlli; altre coperture LAN e IPv6 aperte |
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
| A-26 | Amministrazione guest | SSH da host con chiave, nessun login root/password, ACL delle origini verificate | Parziale: login/Verify e controllo SSH host riusciti; Android TCP/22 non connesso, route dall'altra origine e attribuzione alla whitelist non provate |
| A-27 | Cifratura guest | mount root sul dispositivo cifrato e percorso operativo di sblocco | Root su LUKS/dm-crypt/LVM verificato nel report v2; sblocco a freddo aperto |
| A-31 | Configurazione VM-034 | Reti Compose con IPv4 esplicito, IPv6 non assegnato; reti reali ed endpoint corrispondenti, deny vNIC IPv6 presente | VERIFICATO nel perimetro configurazione: host/guest del 10 novembre coerenti e run VM 2bcdfd57a75c4b2a979d2d2503351f5f con 13 readback IPv4-only, 33/33 passed, cleanup 16/13/7 senza errori. Kernel IPv6 disponibile. Non è prova di filtraggio IPv6 e non chiude A-05/A-30/H-05 |
| A-32 | Pilot VM-035 | Trasporto SSH sintetico preview: sei fasi, helper verificato, active tmpfs con proprietà attese, codice staged rimosso, nessun servizio avviato | VERIFICATO per il trasporto sintetico: ricevuta owner dfc1af5a416f4b1abc6e8dab99034dbb con sei fasi e helper hash validati. Nessuna seconda lettura live. Non comprende segreti reali, consumer avviato, mount, restart/recreate o cleanup dell'active |
| A-33 | VM-036 | Riconciliazione e ritiro selettivo del solo run sintetico completato, dati assenti e metadati contro il riuso conservati | VERIFICATO sul run dfc1af5a416f4b1abc6e8dab99034dbb: ricevuta owner con quattro fasi/hash validati, state retired e valuesAbsent/codeRemoved true. Nessuna seconda lettura live dell'agente. Non è un cleanup generico o retirement delle credenziali reali |
| A-34 | VM-037 | Lettore Tox21 UID 10021 su bind read-only, restart/recreate, UID errato/file assente/ambiente errato respinti, fixture rimosse e nuovo run ritirato | PENDENTE VM. 51 test Linux e 19 Windows passati, 32 Linux esclusi su Windows; Docker Desktop reale 6/6 con cleanup riuscito. [Procedura ed evidenze](SYNTHETIC-CONSUMER-MOUNT.md). Nessuna prova di restart applicativo o isolamento complessivo implicita |

## Risultati preesistenti da non confondere con questa matrice

**Gate VM-032:** A-28 — IP host/guest, NAT e ACL persistenti
dopo reboot host/guest, con SSH e WSL/Docker funzionanti; A-29 — nuova rete
Pubblica in Kaspersky prima dell'attach e dopo reboot; A-30 — isolamento
diretto LAN ↔ VM/container su IPv4/IPv6, anche via NAT/host, con controlli
positivi. [Procedura e limiti delle prove](STATIC-NETWORK-MIGRATION.md).
L'inventario completo non supera questi gate; smartphone senza origine
controllata non chiudono automaticamente le prove negative.

**M-08, prima verifica dopo riavvio Windows del 9 novembre:** inventario
amministrativo 3fb8cf6f765146e5a0631964ff62dbab completo e riletto. Nuovo boot
14:10:35 UTC; VM Off, identità vNIC/switch preservate, IP host statico anche
PersistentStore, route connessa, Windows Public, NAT senza mapping e 19 ACL
DnsHttps semanticamente corrispondenti. Default Switch nuovamente riallocato,
senza alterare l'IP Mercurion. Mancano ancora Verify live, Kaspersky e prove
guest dopo questo riavvio: [evidenza e prossimi passi](HOST-REBOOT-VERIFICATION.md).
A-28/A-29/A-30 non dichiarati superati.

**Conferma successiva post-Restart:** owner riporta Verify live DnsHttps con
settingsReadbackVerified true, internetEgressEnabled true e isolationAccepted
false. Conferma inoltre la voce 10.203.240.1/24 Mercurion-Internal ancora
Rete pubblica in Kaspersky. **A-29 superato nel perimetro della classificazione
e della sua persistenza**; l'efficacia del filtro è verificata dai casi di
traffico separati. Successivamente guest avviato: shell SSH raggiunta,
IP/route statici confermati dall'owner. H-06 post-Restart riletto nel run
c149b357dc5040038b4a26682309dbd0: DNS/HTTPS IPv4 riuscito su guest e due bridge,
cleanup senza errori. Negazioni post-Restart poi acquisite nel run
32b00ebc17a246b881b95fff19c13dc3: nove casi non raggiungibili, 81 controlli
host positivi e controlli client/route correlati, cleanup e chiusura riusciti.
A-28: persistenza rete e runtime Docker guest verificati; Docker Desktop
risponde, reti preservate e due casi container locali con route/controlli e
cleanup riusciti nel collaudo dello strumento LAN. Smoke successivo Ubuntu
WSL riuscito: avvio, DNS IPv4 e HTTPS con certificato validato, HTTP 200,
exit 0. **A-28 superato nel perimetro della persistenza rete e del funzionamento
base SSH/WSL/Docker**, non recovery dell'intero stack applicativo (A-23).

**Avanzamento A-30 LAN:** run 2e5b54bfac1a4ff782f7cd33891ae49f, TCP verso
Android 192.168.0.218:53483: guest e due bridge non raggiungibili, route presenti,
controlli client prima/dopo e 18 controlli Windows tutti positivi. Correlazione
ricalcolata e pulizia container/rete riuscita; owner conferma chiusura Android
con controls-passed e closed true.
Tentativo LAN → VM TCP/22 poi acquisito: Android non connesso in tre secondi,
controlli banner SSH host positivi prima/dopo. Non dimostrata route Android
verso Internal né attribuzione alla whitelist: H-05 resta parziale.
Copertura IPv6 ancora aperta; nessuna generalizzazione
a tutte le porte/dispositivi. [Evidenze e hash](ANDROID-LAN-PROBES.md).
Inventario IPv6 guest successivamente completo: eth0 senza unicast IPv6,
nessuna default route, bridge EnableIPv6 false e IPAM IPv4, forwarding 0;
kernel disponibile e link-local docker0 presente. È configurazione osservata,
non un test negativo IPv6 passato. [Review e residui](INF-VM-02-REVIEW.md).

**Avanzamento rete statica del 9 novembre:** Netplan try accettato; TCP/22
dal solo IP host interno e identità server verificati; owner conferma shell
Ubuntu raggiunta tramite alias aggiornato anche dopo riavvio guest. Output
owner: eth0 UP con 10.203.240.10/24 e default via 10.203.240.1 proto static.
IP host Preferred/Manual e Windows Public riletti; Verify ACL post-riavvio
riuscito. Owner conferma Kaspersky ancora Pubblica. Successivamente creato
Mercurion-NAT sul prefisso 10.203.240.0/24 con Active 1; inventario post-creazione
completo riletto: nessun mapping e ACL SSH-only invariate. TCP/22 nuovamente
raggiungibile dopo NAT; nuova H-02 IPv4 eseguita con timeout guest → host,
36 controlli positivi e listener chiuso. H-04 nuova rete eseguito su due bridge
guest nel run owner 5e97721d427d414ba8e36469f18efd93: controlli container/host
positivi (16 host) e pulizia riuscita.
Egress chiuso, reboot host non eseguito; A-28/A-30 restano aperti.

**Transizione successiva DnsHttps:** piano e Apply reali acquisiti dall'owner,
quest'ultimo a guest spento. Confermate 19 ACL, snapshot precedente coerente,
internetEgressEnabled true e isolationAccepted false. Egress ora consentito
dalla policy e H-06 riuscito da guest/due bridge: DNS, TLS 1.3, HTTP 200,
pulizia riuscita. H-02 aggiornato negativo con 23 controlli positivi; H-04
aggiornato negativo su due bridge con 12 controlli host e cleanup riuscito.
Verify finale owner DnsHttps riuscito, nessun listener canary residuo.
Successivamente acquisiti i [probe privati 443/53](PRIVATE-PORT-PROBES.md):
nove percorsi guest/due bridge verso host non raggiungibili, 63 controlli
positivi e route correlate, pulizia e chiusura canary riuscite. Questo colma
il limite delle porte effimere per i soli endpoint host dichiarati.
Gate di isolamento ancora aperti.

**Controllo router:** il 9 novembre l'owner riferisce port forwarding, DMZ,
UPnP e mapping disabilitati sullo ZTE MC888 Ultra. Nessun cambio di impostazioni
richiesto. Non chiude A-30: è una verifica di configurazione, non di traffico.

**Avanzamento A-29:** screenshot owner conferma la nuova rete `10.203.240.0/24`
Pubblica in Kaspersky; Windows Public già verificato. Vecchio Default Switch
invece rilevato Locale dopo cambio subnet, ripristino Pubblica richiesto ma
non confermato. Owner conferma nuova rete ancora Pubblica dopo riavvio guest;
La conferma successiva post-Restart è registrata sopra; resta distinto il
collaudo dell'isolamento sui pacchetti.

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
