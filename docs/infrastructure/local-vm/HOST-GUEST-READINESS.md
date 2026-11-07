# INF-VM-02 — Verifica di host, guest e isolamento

**7 novembre 2026 — in verifica, non concluso.** La VM è già predisposta
dall'owner: questa fase parte dall'esistente. Non reinstallare Docker/SSH,
creare un altro switch o cambiare ACL/firewall prima di esaminare la baseline.

## Evidenza acquisita

L'owner ha eseguito l'inventario guest con `sudo` via `ssh mercurion-server`.
Report locale del **7 novembre, 16:25:51 UTC**:
`C:/Users/giuli/.codex/artifacts/inf-vm-02/guest-inventory.txt`, SHA-256
`9a7e31ef68d2cd2464da36f00624526b4204d29bd198d68d056f29a23b6711c3`.
Il report è stato letto dall'agente; non è una sessione SSH autonoma dell'agente.
Non versionare report grezzi con indirizzi e dettagli operativi personali.

**Seconda raccolta acquisita:** host amministrativo alle 16:41:54 UTC e guest
alle 16:44:07 UTC. File locali `host-inventory-admin.json` e
`guest-inventory-v2.txt` nella stessa directory, rispettivamente SHA-256
`59bdf5397a5ab56ea52b6cf26bf3c884510b348bde62e426a670b2e446fd2a99` e
`33ab14d6df4d679c10dced1d07ae4cf9d4f8dd7c6ca9b5822b7b71e2c755e1ba`.
I risultati aggiornati sotto provengono da questi report dell'operatore.

| Voce | Osservazione | Limite |
| --- | --- | --- |
| Host/VM | Windows 11 Pro, 24 CPU logiche, circa 64 GiB RAM; `Mercurion-Server` generazione 2, 8 vCPU e 16 GiB fissi, Default Switch | Nessun ridimensionamento eseguito |
| Guest | Ubuntu 26.04.1 LTS, x86_64 | Raccolta eseguita dall'owner |
| Docker guest | Engine 29.9.3, Compose plugin 5.7.0, socket Unix locale | Diverso dal daemon Docker Desktop dell'host |
| Backend firewall Docker | Driver `iptables`, comandi iptables/ip6tables 1.8.11 basati su `nf_tables` | È il backend iptables con traduzione nft, non il backend nftables nativo Docker |
| Cifratura root | `crypto_LUKS` → dm-crypt → LVM → filesystem ext4 montato su `/` | `/boot` ed EFI risultano separati non cifrati; sblocco a freddo non testato |
| SSH | Login riuscito dall'host; `pubkeyauthentication yes`, password e keyboard-interactive `no`, root `no` | Restrizione dell'origine richiede review ACL e prove negative; eventuali `Match` richiedono verifica per connessione |
| Listener guest | SSH su IPv4 e IPv6; resolver DNS su loopback | Il bind SSH wildcard non dimostra da solo accessibilità dalla LAN |
| Container | Nessuno in esecuzione e nessuna porta pubblicata nel report; sole reti Docker predefinite | Snapshot, non prova di isolamento degli stack futuri |
| IPv4 | Route tramite switch virtuale; forwarding attivo; `FORWARD DROP` con chain Docker | Il dump nft acquisito mostra le chain Docker, senza un ulteriore filtro custom INPUT; policy Hyper-V separata |
| IPv6 | Solo route link-local; forwarding globale disattivo; `INPUT/FORWARD ACCEPT` | La sola assenza di route Internet non prova il blocco sul segmento locale |
| SSH forwarding | `gatewayports no`, `allowtcpforwarding yes`, `permitopen any` | Configurazione ampia per l'amministratore; non equivale a inoltri già aperti né alla futura UI approvata |

**Configurazione Hyper-V acquisita:** due ACL estese: deny outbound verso
`172.16.0.0/12`, peso 200; allow inbound SSH dal solo indirizzo virtuale host
corrente, peso 300, stateful, timeout 3600 secondi. Le sei ACL semplici, acquisite
dal terminale dell'owner dopo la correzione del collector, negano outbound verso
`127.0.0.0/8`, `169.254.0.0/16`, `100.64.0.0/10`, `::/0`, `192.168.0.0/16` e
`10.0.0.0/8`. Il campo locale è vuoto nella trascrizione. La combinazione copre
i blocchi IPv4 privati indicati e l'outbound IPv6; non è un divieto di tutto
l'egress IPv4 pubblico. La trascrizione normalizzata è conservata localmente
in `simple-acls-transcript.json`. Il difetto dei campi null riguardava soltanto
il vecchio collector, non regole mancanti sulla VM.

L'allow SSH stateful concorda con il login host osservato. Da solo non dimostra
che ogni altra origine sia negata: nei report acquisiti non compare un deny
inbound generale. Verificare il comportamento complessivo dei diversi livelli
con la prova negativa prima di dichiarare una whitelist esclusiva. Non applicare
regole di chiusura senza review e percorso di recupero console.

**Ancora dichiarato/non collaudato:** perimetro completo guest/container → host
e altre origini verso SSH, oltre ai casi H-02/H-04 IPv4 verificati sotto;
profilo pubblico/restrittivo
Default Switch in Kaspersky. Security Center elenca prodotti registrati, non
fornisce una dimostrazione della loro attività o della policy applicata.
Il vincolo host↔guest non viene interpretato come divieto indistinto di Internet.
Lo smoke H-06 sotto verifica DNS/HTTPS IPv4 verso una sola destinazione pubblica;
provider applicativi e IPv6 rimangono da collaudare.

L'indirizzo guest è DHCP e la regola SSH usa l'indirizzo host corrente: il
runbook di avvio a freddo dovrà verificarne la coerenza, senza presumere che il
Default Switch conservi sempre lo stesso prefisso.

La passphrase protegge la chiave privata sul client; il metodo SSH osservato è
`publickey`. Le opzioni del client `ssh -G` non descrivono la policy del server.
Non attivare ssh-agent, cambiare autenticazione o richiedere la passphrase in chat.

## Inventari ripetibili, senza modifiche alla macchina

- [Host PowerShell](../../../scripts/infrastructure/Get-LocalVmHostInventory.ps1):
  sistema, risorse, VM/switch/adattatori, ACL semplici/estese, NAT, indirizzi,
  route, profili Windows e prodotti firewall. Output JSON; privilegi mancanti
  producono sezioni `unavailable` e codice 2, non una VM «assente».
- [Guest Bash](../../../scripts/infrastructure/inspect-local-vm-guest.sh):
  OS, risorse, mount e tipi block device senza UUID/chiavi, SSH, route IPv4/IPv6,
  Docker locale, porte, immagini disponibili, iptables/ip6tables e nftables.
  Rifiuta OS non Ubuntu o endpoint Docker non Unix locale. Nessuna installazione,
  restart o lettura di chiavi, variabili segrete e `daemon.json`.

Codice 0 significa raccolta completata, **mai** isolamento accettato.
`isolationAccepted=false` rimane esplicito. Conservare i report fuori dal Git.
Il profilo di Windows Firewall non dimostra la policy Kaspersky; analogamente
un elenco `Get-NetNat` vuoto non descrive ogni meccanismo del Default Switch.

## Revisione prima di cambiare regole

1. Associare con certezza VM, adattatore e switch attraverso l'inventario host.
2. Leggere ACL semplici/estese e ordine/pesi, protocolli, direzioni, destinazioni,
   statefulness ed eventuali eccezioni. Verificare il perimetro IPv4 e IPv6.
3. Esaminare insieme nftables e iptables: la chain `DOCKER-USER` vuota non prova
   né isolamento efficace né assenza di filtri in altri livelli. Il backend
   nftables nativo Docker 29 ha un modello differente, senza quella chain.
4. Separare traffico destinato al guest (`INPUT`), traffico inoltrato dai
   container (`FORWARD`) e policy host/Hyper-V/Kaspersky. Non aggiungere `ACCEPT`
   o `DROP` generici per risolvere la diagnosi. Nessun flush delle chain Docker.
5. Stabilire solo dopo questa review se serva una correzione mirata. Conservare
   accesso console Hyper-V e SSH verificato prima di qualsiasi modifica futura.

## Prove da eseguire per chiudere INF-VM-02

| ID | Prova | Controllo necessario | Stato |
| --- | --- | --- | --- |
| H-01 | Accesso host → SSH guest con chiave; autenticazioni vietate respinte | Host key già nota; policy server e contesto connessione | Login riuscito; raccolta policy globale acquisita |
| H-02 | Guest non inizia nuove connessioni al Windows host | Endpoint canary in ascolto sull'interfaccia di test, raggiungibile dal controllo locale host prima/dopo | TCP IPv4 verificato; probe IPv6 link-local preparato, esecuzione guest aperta |
| H-03 | Risposte guest a SSH iniziato dall'host funzionano | Connessione mantenuta durante la prova, senza allargare regole | SSH operatore riuscito; nessuna prova sotto modifica regole |
| H-04 | Container bridge/egress non raggiunge host e LAN fuori policy | Probe sintetico con endpoint espliciti e controlli positivi; nessuna scansione indiscriminata | IPv4 verso host verificato su bridge predefinito e temporaneo; LAN/IPv6 aperti |
| H-05 | Origine non autorizzata non raggiunge SSH né porte amministrative | Seconda origine controllata, servizi effettivamente attivi; coprire IPv4/IPv6 | Non eseguita |
| H-06 | Egress necessario funziona senza riaprire host/LAN | DNS e destinazione HTTPS di test autorizzata, guest/container distinti | Smoke IPv4 verso docs.python.org verificato su guest e due bridge; provider applicativi/IPv6 aperti |
| H-07 | Root filesystem ricondotto al volume cifrato dichiarato | Mount root e albero block device; nessun dump/header o materiale LUKS | Verificato nel report guest v2; prova di sblocco/restart separata |

Un timeout verso una porta chiusa **non** valida H-02/H-04/H-05. Correlare
endpoint attivo, controllo positivo e regole/counter disponibili. Senza IPv6
globale va comunque verificato il link-local; nessun «passato» per omissione.
Le prove canary e le fixture dei futuri network devono rimanere non sensibili,
temporanee e distinguibili dai servizi applicativi.

### H-02 IPv4 — prova reale del 7 novembre

Canary host sull'indirizzo dell'adattatore Default Switch, porta temporanea,
run locale `h02-ipv4-20261107-run2`. Dopo il controllo positivo iniziale,
l'owner ha eseguito il probe nel guest usando la chiave SSH già configurata:
timeout TCP di tre secondi, identificatore/IP/porta coerenti con la prova attiva.
I 69 controlli host sono tutti positivi; controllo precedente alle 17:18:33 UTC,
probe iniziato alle 17:18:37 UTC e controllo successivo al termine del probe
registrato in `review.json`. Chiusura controllata del listener alle 17:19:09 UTC.
Nessuna modifica di regole. Il risultato SSH tornato all'host conferma anche la
comunicazione sulla sessione iniziata dall'host durante il test.

Evidenze locali: `ready.json`, `guest-probe.json`, `result.json`, `review.json`
sotto `C:/Users/giuli/.codex/artifacts/inf-vm-02/h02-ipv4-20261107-run2/`.
SHA-256 del risultato host:
`71cbc59412327307a4c79f1792ac9a271745d247befc22d5c9f94129c0d9b081`.
Il primo run, fermato senza probe valido dopo un problema di copia dei comandi,
non è contato come prova negativa. La successiva esecuzione usa il wrapper
PowerShell, che tiene distinti SCP e SSH e salva il risultato automaticamente.
Il caso dimostra il blocco del percorso TCP IPv4 provato; non identifica da
solo il livello che ha filtrato né sostituisce H-04, H-05 o una prova IPv6.

### H-04 IPv4 — prova reale container del 7 novembre

Run `278ac618aa3a4cccba67d4a2ab54300e`, Docker guest Linux amd64:
bridge predefinito e bridge temporaneo ordinario con egress. Tentativi TCP verso
il canary Windows alle 18:28:54–18:28:58 UTC e 18:28:59–18:29:02 UTC, entrambi
in timeout. Per ogni caso controlli container → container positivi prima/dopo;
33 controlli host tutti positivi, compresi quelli che precedono e seguono
ciascun tentativo. Identificatore/IP/porta e hash archivio correlati ai file
di configurazione. Nessun errore di rimozione container/rete nel report guest.
Listener host chiuso alle 18:29:03 UTC, assenza di ascolto verificata.

Il runner guest ha completato la prova, ma il wrapper Windows non riconosceva
il marcatore preceduto da testo PTY sulla stessa riga. JSON recuperato dalla
trascrizione già salvata, senza ripetere il test o aprire SSH. Il parser ora
estrae il solo payload, richiede un marcatore univoco e verifica il runId.
Il testo precedente al marcatore non fa parte del report normalizzato.

Evidenze locali sotto
`C:/Users/giuli/.codex/artifacts/inf-vm-02/h04-ipv4-278ac618aa3a4cccba67d4a2ab54300e/`:
`container-probe.json`, `host/result.json`, configurazione e `review.json`.
SHA-256 del report guest normalizzato:
`d82d89f204f640570a53e02676476f9047a165b8aa79cb58896cd44381beb642`.
SHA-256 del risultato host:
`3ffeb94e792b387985184233600166bb7a6c085ad86033753cd28f30eeadc554`.
Il risultato vale per i due percorsi TCP IPv4 verso l'host provati, non per
LAN, IPv6, future reti Compose o isolamento complessivo.

### H-06 IPv4 — prova reale DNS/HTTPS del 7 novembre

Run `9449b2cd6e8647229c0646bf1890eb18`, 18:54:45–18:54:47 UTC. Risoluzione
DNS pubblica IPv4 e risposta HTTP 200 a `HEAD https://docs.python.org/3/` da
processo guest, container sul bridge predefinito e container sul bridge temporaneo.
TLS 1.3 su tutte le origini, con verifica CA/hostname prevista dal probe;
nessun redirect seguito, corpo scaricato o credenziale applicativa utilizzata.
Immagine già importata riutilizzata con identità verificata. Nessun errore di
pulizia nel report guest; nessun listener o porta pubblicata per questa prova.

Report acquisito dal wrapper e verificato localmente per runId, tre origini,
target/metodo/famiglia, tempi coerenti, risultati DNS, HTTP/TLS e pulizia riportata.
Evidenze locali sotto
`C:/Users/giuli/.codex/artifacts/inf-vm-02/h06-ipv4-9449b2cd6e8647229c0646bf1890eb18/`:
`egress-probe.json`, script trasferito e `review.json`. SHA-256 del report:
`2e8a833635d63cf29f062eedfd4d515413edd892d29d3ee93400bb8264c9c799`.
L'esito dimostra questo smoke DNS/HTTPS IPv4, non l'accesso a tutti i provider
o il blocco completo host/LAN. Le evidenze negative H-02/H-04 restano distinte;
nessuna regola è stata allargata per ottenere il risultato.

**Gate verso INF-VM-03:** review della policy host/guest e prove pertinenti
documentate; nessuna dichiarazione di isolamento basata solo sulla sintassi.
La matrice applicativa di INF-VM-03 continuerà a verificare i bridge reali.

## Fonti consultate il 7 novembre 2026

- [Docker: iptables e DOCKER-USER](https://docs.docker.com/engine/network/firewall-iptables/)
- [Docker: backend nftables](https://docs.docker.com/engine/network/firewall-nftables/)
- [Microsoft: ACL estese Hyper-V](https://learn.microsoft.com/en-us/powershell/module/hyper-v/get-vmnetworkadapterextendedacl?view=windowsserver2025-ps)
- [Microsoft: ACL semplici Hyper-V](https://learn.microsoft.com/en-us/powershell/module/hyper-v/get-vmnetworkadapteracl?view=windowsserver2025-ps)
- [Microsoft: pesi, chiusura e statefulness delle ACL](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/create-security-policies-extended-port-access-control-lists)
