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
   powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Get-StaticNetworkMigrationInventory.ps1
   ```

   Conservare il nuovo report, senza modificare stato VM, switch o ACL.
   Controllare VM/vNIC nota su Mercurion-Internal, 19 ACL DnsHttps comprese
   entrambe le regole IPv6 ::/0, zero ACL semplici, NAT senza mapping, IP host
   persistente e profilo Windows Public. Confermare a parte Kaspersky Pubblica.
   Se incompleto o diverso dalla baseline, diagnosticare prima di proseguire.
2. **Readback semantico della policy.** Dopo la review dell'inventario, usare
   il comando esistente da PowerShell amministrativa:

   ```powershell
   powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Set-MercurionVmNetworkAcl.ps1 -Mode Verify -Policy DnsHttps
   ```

   Attesi settingsReadbackVerified true e isolationAccepted false. Non eseguire
   Apply: i deny richiesti fanno già parte della policy, se il readback coincide.
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
