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

| Voce | Osservazione | Limite |
| --- | --- | --- |
| Host | Windows 11 Pro, hypervisor attivo, 24 CPU logiche, circa 64 GiB RAM | Risorse assegnate al guest non ancora raccolte |
| Guest | Ubuntu 26.04.1 LTS, x86_64 | Raccolta eseguita dall'owner |
| Docker guest | Engine 29.9.3, Compose plugin 5.7.0, socket Unix locale | Diverso dal daemon Docker Desktop dell'host |
| SSH | Login riuscito dall'host; `pubkeyauthentication yes`, password e keyboard-interactive `no`, root `no` | Restrizione dell'origine richiede review ACL e prove negative; eventuali `Match` richiedono verifica per connessione |
| Listener guest | SSH su IPv4 e IPv6; resolver DNS su loopback | Il bind SSH wildcard non dimostra da solo accessibilità dalla LAN |
| Container | Nessuno in esecuzione e nessuna porta pubblicata nel report; sole reti Docker predefinite | Snapshot, non prova di isolamento degli stack futuri |
| IPv4 | Route tramite switch virtuale; forwarding attivo; `FORWARD DROP` con chain Docker | `INPUT ACCEPT` e `DOCKER-USER` vuota: non osservati filtri aggiuntivi in quelle chain |
| IPv6 | Solo route link-local; forwarding globale disattivo; `INPUT/FORWARD ACCEPT` | La sola assenza di route Internet non prova il blocco sul segmento locale |
| SSH forwarding | `gatewayports no`, `allowtcpforwarding yes`, `permitopen any` | Configurazione ampia per l'amministratore; non equivale a inoltri già aperti né alla futura UI approvata |

**Dichiarato dall'owner, ancora da verificare:** ACL/firewall già configurati,
SSH iniziabile solo host → guest, guest → host ammesso come risposta stateful,
Default Switch classificato pubblico/restrittivo in Kaspersky, filesystem LUKS.
Il vincolo host↔guest non viene interpretato come divieto indistinto di Internet:
egress dei container e destinazioni esterne rimangono da provare.

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
| H-02 | Guest non inizia nuove connessioni al Windows host | Endpoint canary in ascolto sull'interfaccia di test, raggiungibile dal controllo locale host prima/dopo | Non eseguita |
| H-03 | Risposte guest a SSH iniziato dall'host funzionano | Connessione mantenuta durante la prova, senza allargare regole | SSH operatore riuscito; nessuna prova sotto modifica regole |
| H-04 | Container bridge/egress non raggiunge host e LAN fuori policy | Probe sintetico con endpoint espliciti e controlli positivi; nessuna scansione indiscriminata | Non eseguita |
| H-05 | Origine non autorizzata non raggiunge SSH né porte amministrative | Seconda origine controllata, servizi effettivamente attivi; coprire IPv4/IPv6 | Non eseguita |
| H-06 | Egress necessario funziona senza riaprire host/LAN | DNS e destinazione HTTPS di test autorizzata, guest/container distinti | Non eseguita |
| H-07 | Root filesystem ricondotto al volume cifrato dichiarato | Mount root e albero block device; nessun dump/header o materiale LUKS | Dichiarato; raccolta estesa da eseguire |

Un timeout verso una porta chiusa **non** valida H-02/H-04/H-05. Correlare
endpoint attivo, controllo positivo e regole/counter disponibili. Senza IPv6
globale va comunque verificato il link-local; nessun «passato» per omissione.
Le prove canary e le fixture dei futuri network devono rimanere non sensibili,
temporanee e distinguibili dai servizi applicativi.

**Gate verso INF-VM-03:** review della policy host/guest e prove pertinenti
documentate; nessuna dichiarazione di isolamento basata solo sulla sintassi.
La matrice applicativa di INF-VM-03 continuerà a verificare i bridge reali.

## Fonti consultate il 7 novembre 2026

- [Docker: iptables e DOCKER-USER](https://docs.docker.com/engine/network/firewall-iptables/)
- [Docker: backend nftables](https://docs.docker.com/engine/network/firewall-nftables/)
- [Microsoft: ACL estese Hyper-V](https://learn.microsoft.com/en-us/powershell/module/hyper-v/get-vmnetworkadapterextendedacl?view=windowsserver2025-ps)
