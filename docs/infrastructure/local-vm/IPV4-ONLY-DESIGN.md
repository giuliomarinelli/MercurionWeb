# Ipotesi IPv4-only e confine di blocco IPv6

9 novembre 2026 — VM-034, **proposta documentata**, non applicazione di nuove
configurazioni. L'owner richiede di conservare l'analisi emersa dal brainstorming.
L'obiettivo è ridurre il networking supportato al solo IPv4, adeguato al case
study e sostenibile da un solo manutentore. La verifica dell'isolamento rimane
necessaria: una scelta di protocollo non costituisce da sola un esito di test.

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

Direzione proposta, da rendere una scelta operativa esplicita prima di cambiare
la configurazione:

1. Supportare IPv4 per reti Docker, collegamenti applicativi e uscita Internet.
2. Mantenere sulla sola vNIC Hyper-V i deny IPv6 `::/0` Inbound e Outbound.
   Sono già definiti in `scripts/infrastructure/MercurionVmAcl.ps1`, peso 900,
   e fanno parte della policy DnsHttps il cui readback è stato acquisito.
   Readback della policy e prova di blocco del traffico sono evidenze distinte.
3. Valutare se disabilitare IPv6 sulle interfacce guest pertinenti come ulteriore
   semplificazione. Definire prima effetto su Docker, nuove interfacce, listener
   e loopback `::1`; non cambiare globalmente IPv6 su Windows/WSL o sulla LAN.
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
