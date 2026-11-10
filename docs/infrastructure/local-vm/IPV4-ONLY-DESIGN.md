# Policy IPv4-only e confine di blocco IPv6

9 novembre 2026 — VM-034, **proposta documentata**, non applicazione di nuove
configurazioni. L'owner richiede di conservare l'analisi emersa dal brainstorming.
L'obiettivo è ridurre il networking supportato al solo IPv4, adeguato al case
study e sostenibile da un solo manutentore. La verifica dell'isolamento rimane
necessaria: una scelta di protocollo non costituisce da sola un esito di test.

**10 novembre — prosecuzione autorizzata dall'owner («ok procediamo»):**
predisporre operativamente VM-034. Scelta applicata ai sorgenti: IPv4-only
esplicito sulle 13 reti Docker, conservando i deny IPv6 sulla vNIC già previsti.
Nessuna nuova scrittura Hyper-V/guest/router; acquisire nuovamente la baseline.
La disabilitazione del kernel IPv6 guest è rinviata: non serve per esprimere
questo contratto e non si altera loopback `::1` o il networking Windows/WSL.
Implementazione locale e accettazione runtime restano stati distinti.

## 1. Capire quale dispositivo vede il traffico

La VM usa Mercurion-Internal: host 10.203.240.1/24, guest 10.203.240.10/24,
gateway guest 10.203.240.1 e Mercurion-NAT. Il percorso IPv4 verso Internet è
container/guest → host Windows/WinNAT → router ZTE → Internet. WinNAT traduce
la sorgente IPv4 nella connessione dell'host: il router non riceve direttamente
la subnet 10.203.240.0/24 come rete separata amministrata dallo ZTE.

10.203.240.0/24 è un prefisso IPv4, non un selettore di sorgenti IPv6. Un filtro
IPv6 sul router richiederebbe un prefisso IPv6 o un'altra identità/interfaccia
che quel dispositivo possa riconoscere. Non dedurre dal NAT IPv4 un'analoga
traduzione IPv6. Le capacità specifiche del firmware ZTE MC888 Ultra non sono
state verificate; non prescrivere regole o percorsi UI ipotetici.

Le comunicazioni locali VM ↔ Windows sullo switch, comprese quelle IPv6
link-local, non attraversano lo ZTE. Anche traffico sullo stesso collegamento
LAN può non passare dal suo firewall di routing. Il router non può quindi
costituire l'unico punto di applicazione del requisito. Non introdurre bridge
fisici, VLAN o routing aggiuntivo verso la LAN per rendergli visibile la VM.

## 2. Imporre il requisito vicino alla VM

Direzione operativa selezionata per questo passo:

1. Supportare IPv4 per reti Docker, collegamenti applicativi e uscita Internet.
2. Mantenere sulla sola vNIC Hyper-V i deny IPv6 `::/0` Inbound e Outbound.
   Sono già definiti in `scripts/infrastructure/MercurionVmAcl.ps1`, peso 900,
   e fanno parte della policy DnsHttps il cui readback è stato acquisito.
   Readback della policy e prova di blocco del traffico sono evidenze distinte.
3. Nei tre Compose richiedere `enable_ipv4: true` e `enable_ipv6: false` su ogni
   rete posseduta dal progetto (7 shared, 3 preview, 3 production). Le reti
   external mantengono solo name/external: ereditano la configurazione dal
   proprietario shared e sono verificate dal readback runtime.
4. Conservare il divieto LAN ↔ VM/container, i deny IPv4 privati e la sola
   eccezione amministrativa SSH host → guest con risposte stateful.

Il collector guest corrente mostra eth0 senza unicast/default route IPv6,
Docker bridge senza EnableIPv6, ma kernel IPv6 disponibile e link-local docker0.
Quindi «IPv6 non usato dallo stack», «IPv6 filtrato sulla vNIC» e «IPv6
disabilitato nel guest» descrivono tre condizioni differenti.

## 3. Collegamento Cloudflare compatibile con IPv4

Per INF-VM-07 proporre `--edge-ip-version 4` (oppure
`TUNNEL_EDGE_IP_VERSION=4`) esplicito per cloudflared → Cloudflare; origin
interni raggiungibili via IPv4. Non configurare un edge-bind-address IPv6,
che avrebbe precedenza sulla selezione della famiglia. Il tratto utente →
Cloudflare può usare IPv6 indipendentemente dal trasporto IPv4 del tunnel.

Il tunnel richiede egress 7844: TCP per HTTP/2 oppure UDP per QUIC.
La policy attuale DNS/HTTPS (53/443) non basta. Scelta del trasporto,
destinazioni consentite e relativa modifica delle ACL appartengono a INF-VM-07;
non aprire porte durante il collaudo delle fixture. Nessun tunnel viene avviato
né si modificano DNS pubblici/Access per documentare questa proposta.

## 4. Verifiche e criterio di accettazione da concordare

1. Registrare decisione, configurazione attesa e rollback delle sole modifiche
   eventualmente scelte; conservare inventario e ACL precedenti.
2. Verificare readback dei deny IPv6, reti/interfacce guest e Docker e listener
   effettivi, anche dopo riavvio e creazione di nuove reti di test autorizzate.
3. Definire una prova controllata che distingua assenza di percorso da filtro
   efficace. Non abilitare IPv6 o creare route solo per costruire tale prova
   senza una modifica di perimetro esplicitamente autorizzata.
4. Confermare SSH, egress IPv4 e negazioni host/LAN; durante INF-VM-07 verificare
   separatamente trasporto IPv4 del tunnel e raggiungibilità degli origin.
5. Aggiornare A-05/A-30 e la review solo in base a evidenze: H-05 e i residui
   IPv6 attuali restano aperti. Se IPv6 diventa escluso dal supporto operativo,
   registrare comunque come è impedito sul confine e quali limiti sono accettati.

## Fonti e stato

[Topologia NAT Hyper-V Microsoft](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/setup-nat-network),
[parametri Cloudflare](https://developers.cloudflare.com/tunnel/reference/run-parameters/#edge-ip-version),
[requisiti di rete del tunnel](https://developers.cloudflare.com/tunnel/configuration/).
Baseline locale: [review INF-VM-02](INF-VM-02-REVIEW.md) e
[policy DnsHttps](DNS-HTTPS-ACL.md). Nessuna regola router/host/guest viene
modificata da questo documento; il collaudo VM-033 conserva il suo perimetro.

## 5. Procedura passo per passo del 10 novembre

1. **Baseline host attuale, sola lettura.** Da PowerShell amministrativa:

   ```powershell
   & 'C:/.project_repo/MercurionWeb/scripts/infrastructure/Get-StaticNetworkMigrationInventory.ps1'
   ```

   Conservare il nuovo report, senza modificare stato VM, switch o ACL.
   Eseguirlo direttamente nella PowerShell elevata corrente: il report registra
   elevation, versione/architettura del processo e messaggi delle letture negate.
   Controllare VM/vNIC nota su Mercurion-Internal, 19 ACL DnsHttps comprese
   entrambe le regole IPv6 ::/0, zero ACL semplici, NAT senza mapping, IP host
   persistente e profilo Windows Public. Confermare a parte Kaspersky Pubblica.
   Se incompleto o diverso dalla baseline, diagnosticare prima di proseguire.
2. **Readback semantico della policy.** Dopo la review dell'inventario, usare
   il comando esistente da PowerShell amministrativa se l'inventario è incompleto,
   non più attuale o non è stato confrontato integralmente con la policy attesa:

   ```powershell
   powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Set-MercurionVmNetworkAcl.ps1 -Mode Verify -Policy DnsHttps
   ```

   Attesi settingsReadbackVerified true e isolationAccepted false. Non eseguire
   Apply: i deny richiesti fanno già parte della policy, se il readback coincide.
   Un inventario completo appena acquisito, con confronto semantico delle 19
   regole e verifica degli stessi prerequisiti, evita una seconda lettura
   ridondante. Registrare quale delle due forme di evidenza è stata usata.
3. **Guest, sola lettura.** Con VM avviata e SSH disponibile, dopo i controlli
   precedenti, da PowerShell normale usare Invoke-Ipv6Readiness.ps1 già esistente.
   Passphrase/sudo nel terminale. Acquisire indirizzi, route, forwarding e reti;
   nessuna scrittura sysctl/Netplan. Un inventario non è una prova di traffico.
4. **Nuove fixture IPv4-only.** I sorgenti richiedono ora le famiglie esplicite;
   validator rifiuta flag mancanti, IPv6 attivo e IPv4 disattivato. Il runner
   legge EnableIPv4/EnableIPv6/IPAM di tutte le reti usate e controlla gli
   endpoint dei container prima dei casi. Famiglie inattese invalidano il run.
   Il lifecycle VM-033 conserva label, collision guard, no pull e cleanup.
   Una futura nuova esecuzione usa bundle/report nuovi; non reinterpretare il
   run VM del 9 novembre come prova del codice del 10 novembre.
5. **Conclusione misurata.** Registrare separatamente readback host, inventario
   guest e readback Docker/matrice. VM-034 non chiude automaticamente A-05/A-30
   o H-05: senza percorso positivo resta aperta la prova di filtraggio IPv6.
   Non creare route/indirizzi IPv6, non rimuovere deny e non aprire la LAN per
   fabbricare un controllo positivo all'interno di questa procedura.

## 6. Rollback circoscritto

Questa fase non cambia ACL, kernel guest o router, quindi non prevede comandi
di ripristino della rete host/guest. In caso di difformità fermare la progressione
e preservare inventario e report; niente Apply o quarantena automatica.

Per le fixture fallite usare la pulizia delle sole risorse con label del run
e verificare i relativi errori prima di ritentare. Se occorre ritirare il codice
VM-034, usare un normale commit correttivo concordato che ripristini insieme
manifest, validator e runner alla baseline VM-033 verificata, senza reset o
riscrittura di storia. Non cancellare reti/volumi preesistenti o alterare il
report originale; non abilitare IPv6 come rollback implicito.

Fonte Compose: [famiglie di indirizzi e reti external](https://docs.docker.com/reference/compose-file/networks/).
Fonte Hyper-V: [ACL estese sulla vNIC](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/create-security-policies-extended-port-access-control-lists).

## 7. Verifiche locali del 10 novembre

Validator: 15 guardie topologia + 4 matrice. Python: 15 test fixture/runner e
10 lifecycle passati. PowerShell 5.1: 28 scenari lifecycle ACL simulati e 26
decisioni iniziali egress, più 30 casi IPv6 che richiedono il match esplicito
::/0 al peso 900 nelle due direzioni (TCP, UDP, ICMPv6; globale, ULA, link-local,
multicast, IPv4-mapped). Non sono prove di traffico o conntrack Hyper-V.
Preflight trasporti PS 5.1 e controllo documentazione passati.

Collaudo Docker Desktop: run `eb828f142922415fa0844439732d4bfb`, 10 novembre
09:42:25–09:45:37 UTC (10:42–10:45 CET), 33/33 passed. Il nuovo readback registra
13 reti con IPv4 true, IPv6 false e subnet IPv4; endpoint fixture senza IPv6
globale/gateway. Cleanup 16 container/13 reti/7 volumi senza errori; ricerca
successiva per label senza risorse residue. Report host
`inf-vm-03/local-validation/c93a2be4961e490da5b44540f8854b0e/lifecycle.json`,
SHA-256 `82aed1a4b99d77438d1ce7f87bda83c4bdc1bee45110a5d7e5428471c1efe051`.

Nessuna esecuzione dei nuovi sorgenti sulla VM ancora acquisita. Inventario
host attuale richiesto all'owner; nessuna conclusione sulla baseline del
10 novembre dedotta dai report del giorno precedente. A-31 e isolamento
complessivo rimangono aperti, con i risultati locali registrati separatamente.

**Prima lettura host del 10 novembre incompleta:** report owner
`static-network/a928731080d5465ba7306387b03f5973/inventory.json`, 09:57:53 UTC,
SHA-256 `67c106857ef75b25d2afeab8e87a59e0650462afa9607990576ed94a1e69df73`.
VM/switch/ACL non osservabili (Get-VM e altri cmdlet restituiscono Unspecified),
HNS UnauthorizedAccessException; servizi vmms/hns risultano Running. IP host
10.203.240.1/24 Manual/Preferred, NAT attivo senza mapping e Windows Public
osservati. Owner conferma Kaspersky Pubblica e VM spenta.

Il controllo successivo nella console owner restituisce Administrator True.
Non attribuire quindi il problema a mancata elevazione: il vecchio report non
registrava il token del processo collector né il messaggio Hyper-V completo.
Collector arricchito con executionContext, categoria, tipo/HResult e messaggio
degli errori, anche nel riepilogo JSON. Nuova lettura diretta nella stessa
console necessaria per distinguere autorizzazione provider da contesto del
processo. Nessuna modifica di gruppi, WMI, UAC, Kaspersky o riavvio servizi.

Verifica PS 5.1: parsing e conservazione dell'errore UnauthorizedAccessException
sintetico passati; esecuzione reale dal processo agente non elevato genera
correttamente incomplete/exit 2 con contesto false e sei errori dettagliati.
Report di validazione `static-network/6982b35087834e538dd6c5b965bff3ab/inventory.json`;
non rappresenta la sessione elevata dell'owner o una diagnosi della sua causa.

## 8. Baseline host verificata il 10 novembre

Esecuzione diretta nella console owner: report
`static-network/fb1a99fc2d9f49858e948c97019e5e1f/inventory.json`,
10:38:58 UTC (11:38 CET), completo, nessuna sezione unavailable;
executionContext elevated true, PowerShell Desktop 5.1.26100.9711, processo x64.
SHA-256 `bf31cb35fd873363c3d78334d754daf1d198d1eadc5b7eda0164c5b3a6e50478`.

Review del report sull'host, senza scritture o nuovi cmdlet Hyper-V:

- VM Mercurion-Server Off, una sola vNIC Scheda di rete, MAC 00155D00DD01,
  identità invariata e switch Internal Mercurion-Internal atteso.
- Zero ACL semplici, 19 estese semanticamente identiche alla policy DnsHttps
  generata da MercurionVmAcl.ps1 (Test-MercurionAclRules true). Incluse le due
  regole Deny ::/0 Inbound/Outbound al peso 900, ANY protocollo/porta.
- Mercurion-NAT attivo sul prefisso 10.203.240.0/24, nessun mapping statico.
  IP host 10.203.240.1/24 Manual/Preferred e persistente; Windows Public.
  Forwarding e weak host disabilitati su IPv4/IPv6 dell'interfaccia Internal.
- Kaspersky Pubblica confermata dall'owner nella stessa fase.

Questa lettura soddisfa la verifica della configurazione host corrente; nessun
Apply né seconda Verify live necessari in assenza di modifiche intermedie.
La causa del precedente rifiuto non è dimostrata: la riuscita diretta non prova
che la console precedente fosse priva di privilegi o che il processo figlio
fosse la causa. Non effettuati cambi di autorizzazioni, servizi o antivirus.

Prossimo passo consegnato all'owner: avvio normale VM, sblocco LUKS e collector
guest IPv6 read-only esistente. Nuova matrice/readback Docker VM-034 ancora
da acquisire; A-31 e prove di traffico A-05/A-30/H-05 rimangono aperti.

## 9. Baseline guest verificata il 10 novembre

Collector read-only dopo avvio guest: run `0a4a324f8424486586dea762612d4caa`,
12:14:23 UTC (13:14 CET). Report completo, tutte le sezioni observed, hostname
mercurion-server; copia sorgente, manifest SHA e tree corrente corrispondenti.
Report `ipv6-readiness-0a4a324f8424486586dea762612d4caa/ipv6-readiness.json`,
SHA-256 `b01a0195920b7b9e9d0e1a77685f9538808593747250a0e432976d384ce48061`.

Indirizzi IPv6: soltanto ::1 su lo, nessun indirizzo eth0 o docker0 rilevato.
Route: locale ::1 e multicast ff00::/8 su eth0; nessuna default route IPv6.
Forwarding 0 e disable_ipv6 all/default/eth0 0: kernel disponibile, non disabilitato.
Docker presenta soltanto bridge/host/none; bridge EnableIPv6 false e IPAM
172.17.0.0/16, nessuna rete fixture residua nell'elenco acquisito.

Configurazione coerente con la scelta operativa, senza prova di traffico IPv6
né inferenza di filtraggio dal mancato percorso. Baseline host/guest acquisita;
consegnato ora il comando Invoke-TopologyFixtures.ps1 -Execute per un bundle
nuovo dei sorgenti VM-034 già collaudati localmente. Attesi 13 readback di rete
IPv4-only, 33 casi e cleanup selettivo; nuova evidenza VM ancora pendente.

## 10. VM-034 verificata sulla VM — perimetro configurazione

Run `2bcdfd57a75c4b2a979d2d2503351f5f`, 10 novembre 12:18:33–12:20:31 UTC
(13:18–13:20 CET). Report recuperato con SCP e riletto sull'host:
`inf-vm-03/d337c6b9c3ff492c8735dec64b4e2fcf/fixture-run.json`, SHA-256
`cd8e9065dfe04125518362ae39252f68bf9d318d5e2922fad8c42d430b37e658`.
RunId manifest/report coincidenti, hash bundle e sorgenti del tree esaminato
coerenti. Preflight immagine locale esatta e collisioni assenti.

Il report registra tutte le 13 reti attese con EnableIPv4 true, EnableIPv6 false
e subnet IPAM IPv4, senza nomi duplicati. Il runner ha verificato gli endpoint
dei 16 ruoli prima dei casi. **33/33 passed: 15 allow e 18 deny**; completezza
e unicità rispetto al piano verificate, decisioni negative ricalcolate sull'host.
Pulizia client e lifecycle senza errori, rimozione di 16 fixture, 13 reti e
7 volumi e readback guest senza residui della label. Nessuna seconda lettura
live SSH eseguita per questa review. Le subnet rilevate sono assegnazioni
dinamiche Docker, non nuovi prefissi statici di progetto.

Con baseline host/guest delle sezioni 8–9 e questo report, **A-31 è verificato
nel perimetro della configurazione VM-034**. Non significa prova sperimentale
del filtro IPv6: kernel disponibile, nessun percorso positivo esterno introdotto,
nessuna modifica ai deny Hyper-V. H-05 e A-05/A-30 restano parziali; il report
mantiene isolationAccepted false. Nessun servizio reale, segreto o tunnel
Cloudflare è stato avviato. Reboot/ripristino dell'applicazione e filtri sui
futuri servizi rimangono verifiche successive.

Prima di estendere il runtime oltre le fixture, riesaminare esplicitamente i
residui INF-VM-02 e il gate del pilot sintetico INF-VM-04. Il risultato di
configurazione non costituisce una deroga implicita alle dipendenze esistenti.
