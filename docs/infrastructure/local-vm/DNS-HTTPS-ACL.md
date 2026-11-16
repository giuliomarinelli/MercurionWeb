# Apertura controllata DNS/HTTPS sulla rete statica

9 novembre 2026. Implementazione, controlli locali e applicazione reale completati;
H-06, H-02 e H-04 runtime acquisiti, Verify finale riuscito.
Policy DnsHttps installata a guest spento.
Questa fase prepara H-06, non l'avvio degli stack o del tunnel pubblico.

**Piano reale acquisito dall'owner:** requestedPolicy DnsHttps, 14 ACL correnti
e 19 previste, internetEgressEnabled false, mutationsPerformed false, nessun
errore. Prerequisiti letti dal piano verificati; owner ha poi confermato VM Spenta.

**Apply reale acquisito:** settingsReadbackVerified true, policy DnsHttps,
19 regole, internetEgressEnabled true, isolationAccepted false, vmStarted false
e adapterMoved false. Snapshot locale
`static-network/acl/84feb5630d804fbf85399137248b29fc/before.json`: nome/MAC/switch
coerenti, zero ACL semplici e 14 estese precedenti uguali a SshOnly, verificato
dall'agente leggendo il report. Nessun login o test Internet attestato da questa
ricevuta. Il successivo avvio e accesso SSH sono confermati dall'esecuzione
H-06 dell'owner: guest e due bridge risolvono DNS e ottengono HTTP 200 con
TLS 1.3 verificato, pulizia riuscita. H-02 ripetuto con egress attivo: timeout
verso host con 23 controlli positivi e listener chiuso. H-04 aggiornato riuscito
su entrambi i bridge con 12 controlli host positivi, marker/tempi correlati e
pulizia completata. Verify finale owner: DnsHttps, settingsReadbackVerified
true, internetEgressEnabled true, isolationAccepted false. Nessun listener
canary residuo al controllo finale.
[Run, hash e limiti](HOST-GUEST-READINESS.md#prove-sulla-policy-dnshttps).

I canary negativi usano porte TCP effimere: non esercitano direttamente i
deny privati su TCP/443 o DNS/53. Le priorità sono coperte dal readback e dai
test di policy. Il successivo [run sulle porte private](PRIVATE-PORT-PROBES.md)
ha verificato nove percorsi verso host TCP/443, TCP/53 e UDP/53 con 63 controlli
positivi e cleanup riuscito. LAN/altre origini e reboot host restano da completare
prima dell'accettazione complessiva.

## Policy DnsHttps

Si conservano le 14 regole della [fase SSH-only](SSH-ONLY-ACL.md) e si aggiungono
cinque allow stateful. Totale: 19 ACL estese, zero semplici.

| Peso | Direzione | Protocollo/destinazione | Stato e timeout inattività |
| --- | --- | --- | --- |
| 100 | Outbound | TCP/443, IPv4 filtrato dai deny prioritari | Stateful, 300 s |
| 101–104 | Outbound | TCP e UDP/53 solo verso 1.1.1.1/32 e 9.9.9.9/32 | Stateful, 120 s |
| 201–209 | Outbound | Deny privati/locali/riservati della baseline | Invariati, prioritari sugli allow |
| 300 | Inbound | SSH dal solo 10.203.240.1 al guest, porta 22 | Invariato |
| 900 | Entrambe | Deny IPv6 | Invariato |
| 10 | Entrambe | Deny di tutto il resto | Invariato |

Gli allow nuovi richiedono IP locale guest 10.203.240.10/32. I bridge Docker
con masquerading attraversano questo stesso confine; H-06 deve provarlo.
TCP/443 non è un filtro per hostname: non limita le destinazioni al dominio
del probe. Non vengono aperti HTTP, QUIC, porte Cloudflare Tunnel o SMTP.
I resolver sono quelli già presenti in Netplan, senza DNS verso host o router.
L'effettivo passaggio delle risposte stateful richiede la prova runtime.

## Procedura operativa

1. Mantenere la console Hyper-V disponibile. Confermare la categoria Kaspersky
   Pubblica e preservare la configurazione router osservata: port forwarding,
   DMZ, UPnP e mapping disabilitati. Cambiamenti della topologia richiedono
   nuova review delle destinazioni LAN/VPN/WAN e delle prove negative.
2. Da PowerShell amministrativa eseguire il piano, senza modifiche:

   ```powershell
   powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Set-MercurionVmNetworkAcl.ps1 -Mode Plan -Policy DnsHttps
   ```

   Lo script richiede vNIC nota su Mercurion-Internal, policy corrente nota
   (SshOnly o DnsHttps), un solo WinNAT attivo Mercurion-NAT con prefisso
   10.203.240.0/24, zero mapping e Windows Public. Attesi inizialmente 14 ACL
   correnti e 19 previste; mutationsPerformed false e internetEgressEnabled false.
3. Salvare eventuale lavoro guest. Arrestare ordinatamente solo Ubuntu con
   `sudo shutdown -h now` o `sudo poweroff`; attendere VM Spenta in Hyper-V.
4. Solo a VM Spenta, applicare da PowerShell amministrativa:

   ```powershell
   powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Set-MercurionVmNetworkAcl.ps1 -Mode Apply -Policy DnsHttps
   ```

   Snapshot locale prima delle scritture, guardie deny prioritarie prima delle
   sostituzioni, readback prima e dopo il rilascio delle guardie. NAT/mapping
   e profilo Public vengono ricontrollati anche al termine. Qualunque errore
   lascia la VM spenta per diagnosi, senza retry o pulizia automatici.
   Il ripristino guardie dopo errore finale resta best effort come nella fase iniziale.
5. Verificare la ricevuta: policy DnsHttps, 19 ACL, settingsReadbackVerified
   true, internetEgressEnabled true e isolationAccepted false. Il flag egress
   descrive la policy impostata, non prova connettività Internet o isolamento.
6. Avviare normalmente il guest, sbloccare LUKS e verificare un nuovo login
   con `ssh mercurion-server`. Non modificare switch, NAT o autenticazione.
7. Dopo l'avvio usare sempre la policy esplicita per il readback:

   ```powershell
   powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Set-MercurionVmNetworkAcl.ps1 -Mode Verify -Policy DnsHttps
   ```

8. Eseguire H-06, quindi ripetere H-02/H-04 sulla policy con egress attivo e
   completare le prove LAN e altre origini ancora aperte. L'immagine Python
   verificata è già sul guest; nessun pull necessario:

   ```powershell
   powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Invoke-EgressProbe.ps1
   ```

   Tre origini: guest, bridge predefinito e bridge temporaneo. Controllare
   DNS IPv4 pubblico, TLS verificato, HTTP e cleanup; non estendere lo smoke
   a tutti i provider applicativi. Il ritardo del prompt sudo rimane un residuo
   operativo documentato in [NETWORK-PROBES.md](NETWORK-PROBES.md).

## Ritorno alla fase SSH-only e verifiche locali

Se serve chiudere nuovamente egress, fermare ordinatamente il guest e usare
lo stesso script con `-Mode Apply -Policy SshOnly`: ricostruisce le 14 regole
con snapshot/guardie. Non rimuovere deny individualmente. Quarantine rimane
disponibile a VM Spenta per errori parziali; nessun rollback ai vecchi allow.

```powershell
powershell -NoProfile -File scripts/infrastructure/Test-MercurionVmNetworkAcl.ps1
powershell -NoProfile -File scripts/infrastructure/Test-MercurionEgressPolicy.ps1
```

Windows PowerShell 5.1: 28 scenari lifecycle con API simulate e 26 decisioni
su pacchetti iniziali. Coprono priorità deny, DNS limitato, SSH autorizzato,
IPv6, egress non previsto, preflight, errore parziale, deriva NAT finale,
idempotenza e ritorno SSH-only. Non simulano conntrack né provano isolamento
reale. H-06: quattro unittest del runner passati e ValidateOnly Windows
riuscito, senza esecuzione guest in questa preparazione. Nessuna CI remota dichiarata.

Fonti: [Microsoft, priorità e ACL stateful](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/create-security-policies-extended-port-access-control-lists),
[parametri del cmdlet](https://learn.microsoft.com/en-us/powershell/module/hyper-v/add-vmnetworkadapterextendedacl).
La sintassi usa IdleSessionTimeout e Stateful booleano, confrontati con i cmdlet locali.
