# INF-VM-02 — migrazione alla rete interna statica

**9 novembre 2026 — procedura progressiva in italiano.** Inventario completato;
switch e IP host creati dall'owner; guest statico e SSH confermati anche dopo
riavvio guest, ACL riverificate e Kaspersky ancora Pubblica. Router verificato
dall'owner; Mercurion-NAT creato e inventario post-creazione riletto.
Egress non aperto e isolamento LAN da collaudare.
Seguire i passi nell'ordine e aggiornare la tabella
di avanzamento: un comando documentato non è un comando già eseguito.
Il bootstrap sintetico rimane sospeso durante il collaudo della migrazione.

## Vincoli approvati dall'owner

1. **Nessun accesso diretto VM/container → LAN e LAN → VM/container**, IPv4 e IPv6.
   L'host Windows può iniziare solo l'amministrazione SSH autorizzata dalla
   propria interfaccia interna; il guest può rispondere a quella sessione.
   Il guest non può iniziare connessioni verso Windows, router o altri peer privati.
2. Nuovo switch **Internal**, mai External, mai bridge con Wi-Fi/Ethernet.
   Una sola scheda guest collegata: non affiancare una seconda via Default Switch.
3. Nuova rete classificata **Pubblica in Kaspersky**, come richiesto dall'owner
   anche per il Default Switch. Il profilo Windows non sostituisce quello Kaspersky.
4. Nessuna porta inoltrata dalla LAN, nessun mapping NAT statico, nessun UPnP
   o port forwarding del router. Non abilitare RRAS, bridge o routing generale
   sulle schede fisiche per fare funzionare la VM.
5. Internet pubblico resta necessario e passa dal NAT dell'host; questo usa
   fisicamente il collegamento host/router, ma non autorizza il guest a
   contattare servizi o indirizzi LAN. NAT e tipo Internal non sono firewall.
6. Nessuna disattivazione di Kaspersky/firewall/ACL per risolvere un errore.
   Console Hyper-V disponibile per recupero; nessun arresto forzato o reset VM.

Questi sono criteri da implementare e collaudare, non isolamento già dimostrato.

## Stato dei passi

| Passo | Risultato | Stato |
| --- | --- | --- |
| M-01 | Inventario host/Hyper-V/HNS e diagnosi del timeout | Completato |
| M-02 | Piano indirizzi e controlli sovrapposizione | Proposta verificata sullo snapshot, riservare prima dell'uso |
| M-03 | Creazione switch interno e IP host statico | Eseguito dall'owner: Internal e `10.203.240.1/24`; ActiveStore Preferred verificato |
| M-04 | Kaspersky Pubblica e profilo host verificati | Pubblica confermata anche dopo reboot guest; efficacia sui pacchetti e reboot host da provare |
| M-05 | Backup e policy ACL della sola vNIC Mercurion | Apply owner riuscito e Verify dopo collegamento confermato; traffico non collaudato |
| M-06 | Configurazione guest statica, NAT e collegamento | Mercurion-NAT riletto senza mapping, ACL SSH-only invariate; egress ancora chiuso |
| M-07 | SSH, egress e prove negative con controlli positivi | SSH riuscito; H-02/H-04 IPv4 verso host negativi con controlli nella fase SSH-only; LAN/egress aperti |
| M-08 | Riavvio a freddo, stabilità e nuova baseline | Riavvio guest: nuovo login, IP e gateway confermati; reboot host, profili e policy completa ancora aperti |

## M-01 — inventario, senza cambiare configurazioni

Da PowerShell **amministrativa**, anche da `C:/Windows/System32`:

```powershell
powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Get-StaticNetworkMigrationInventory.ps1
```

Lo [script](../../../scripts/infrastructure/Get-StaticNetworkMigrationInventory.ps1)
legge solo metadati rete, NAT, vNIC/ACL e servizi. Salva un report in directory
unica sotto il profilo utente `.codex/artifacts/inf-vm-02/static-network` e
stampa il percorso. Non contiene chiavi, password o dump di ambiente container.
`incomplete=true` richiede di completare le sezioni mancanti; `migrationReady`
e `isolationAccepted` restano false anche con inventario completo.

Eseguito dall'owner: report `dba96158ba044e3eb24c2822004fde31/inventory.json`,
`incomplete=false`. Evidenze: una sola vNIC `Scheda di rete`, MAC
`00:15:5d:00:dd:01`; VM running, Default Switch e WSL di tipo HNS **ICS**;
`Get-NetNat` e mapping statici vuoti. Docker Desktop: bridge `172.17.0.0/16`
e rete progetto `172.20.0.0/16`. WSL: `172.19.64.0/20`; LAN: `192.168.0.0/24`.
La presenza di ICS non equivale a un NAT WinNAT già creato con `New-NetNat`;
la coesistenza va comunque verificata nella migrazione, senza toccare ICS/WSL.

Timeout spiegato: alias `mercurion-server` ancora su `172.26.50.235`, guest
ora `172.27.1.64/20` e host `172.27.0.1`; ACL SSH ancora da `172.26.48.1/32`.
Nuovo IP TCP/22 anch'esso in timeout. Il cambio preciso che ha riconfigurato
lo switch non è provato dai log: non attribuirlo a una modifica applicativa.
`IPAddresses={}` in Hyper-V non ha dimostrato assenza di rete nel guest.

Lettura aggiuntiva host: forwarding e weak-host disabilitati sulle interfacce
osservate, servizio RemoteAccess fermo. Versione applicazione Kaspersky
osservata `21.27.6.532`; stato Pubblica del Default Switch dichiarato dall'owner.

## M-02 — riservare indirizzi e verificare conflitti

Piano proposto sullo snapshot corrente:

| Oggetto | Valore |
| --- | --- |
| Switch | `Mercurion-Internal` |
| NAT dedicato | `Mercurion-NAT` |
| Subnet amministrativa | `10.203.240.0/24` |
| Host/gateway | `10.203.240.1` |
| Guest Ubuntu | `10.203.240.10` |
| Alias SSH | `mercurion-server`, nome invariato |

Nessuna sovrapposizione con indirizzi/route specifiche, NAT, HNS e reti Docker
osservati. La route predefinita `0.0.0.0/0` non è una collisione di subnet.
Riservare il prefisso anche rispetto alle future reti Compose. VPN non attive
o reti future non sono censite da uno snapshot: ripetere il controllo se cambia
il contesto. Mai riusare il vecchio prefisso del Default Switch per abitudine.

Se compare un NAT WinNAT non nostro o un conflitto, fermarsi: niente rimozioni
globali `Get-NetNat | Remove-NetNat`, modifiche WSL o arresto di Docker Desktop.

## M-03 — creare lo switch ancora senza guest

Solo dopo M-02, da PowerShell amministrativa. Se il nome esiste già, non
ricrearlo: controllarne prima tipo, adattatore e indirizzi. Il primo comando:

```powershell
New-VMSwitch -Name 'Mercurion-Internal' -SwitchType Internal
```

Verificare che sia **Internal** e non associato alla scheda fisica:

```powershell
Get-VMSwitch -Name 'Mercurion-Internal' | Format-List Name,SwitchType,NetAdapterInterfaceDescription
```

Poi assegnare solo l'IP interno all'host, senza gateway/DNS su questa scheda:

```powershell
New-NetIPAddress -InterfaceAlias 'vEthernet (Mercurion-Internal)' -IPAddress 10.203.240.1 -PrefixLength 24
```

Il gateway Internet di Windows resta sulla sua interfaccia ordinaria.
**Non collegare ancora la VM e non creare mapping di porte.** Se uno dei
comandi fallisce, ispezionare lo stato parziale senza rilanciarli alla cieca.

## M-04 — classificare la rete in Kaspersky

**Avanzamento M-03:** owner ha creato lo switch Internal e assegnato l'IP.
Interfaccia osservata: indice 68. Controllo corrente: `10.203.240.1/24`, origine
Manual, ActiveStore **Preferred**, nessuna route IPv4 predefinita sulla nuova
interfaccia; profilo Windows **Public**. Il comando iniziale mostrava Tentative
e la voce PersistentStore Invalid: il dato operativo è stato riletto dopo la
verifica iniziale dell'indirizzo. Configurazione presente nel PersistentStore;
persistenza reale ancora da collaudare con M-08, nessuna cancellazione necessaria
in base al solo output iniziale. Successivamente confermata Kaspersky Pubblica
sulla nuova subnet tramite screenshot owner, come descritto sotto.

**Riscontro Kaspersky owner, 9 novembre:** la riga connessa
`10.203.240.1/24 (vEthernet (Mercurion-Internal))` è **Rete pubblica**.
La riga `172.27.0.1/20 (vEthernet (Default Switch))` è invece **Rete locale**,
nonostante l'owner l'avesse impostata esplicitamente Pubblica sulla rete precedente.
Verificare la riga con CIDR e stato Connesso, non la sola voce generica
dell'adattatore o una connessione Disconnessa.

Non è dimostrato che Kaspersky abbia modificato lo stesso record di rete:
potrebbe aver classificato un nuovo profilo dopo il cambio subnet. Mancano
eventi/versioni del record sufficienti per attribuire la causa. Finché il guest
usa ancora Default Switch, ripristinare Pubblica su quella riga; non modificare
WSL come effetto collaterale. Ripristino non ancora confermato dall'owner.
Lo screenshot conferma la classificazione attuale della rete nuova, non le
regole effettive sui pacchetti né la persistenza dopo reboot. M-07/M-08 restano aperti.

1. Aprire Kaspersky e le impostazioni del componente **Firewall**.
2. Aprire l'elenco delle reti/connessioni; individuare la rete corrispondente
   a `vEthernet (Mercurion-Internal)` e al prefisso `10.203.240.0/24`.
3. Impostare il tipo **Rete pubblica / Pubblica** e salvare. Mai Locale o Attendibile.
4. Verificare che il Firewall sia attivo e che le regole pacchetti restrittive
   si applichino a questa rete; non creare un allow generico per far passare SSH.
5. Registrare versione, nome connessione e stato osservato. Verificare anche
   dopo reboot: non dedurre la classificazione dal nome dello switch.

Le etichette UI vanno confermate sulla versione installata; se l'interfaccia
non compare o non è identificabile, fermarsi prima dell'attach. Non considerare
la sola categoria Windows una conferma Kaspersky. Per il profilo Windows:

```powershell
Get-NetConnectionProfile | Format-Table InterfaceAlias,InterfaceIndex,NetworkCategory
```

Se esiste un profilo per la nuova interfaccia, deve essere Public. La categoria
si imposta sul solo indice osservato, senza cambiare quella della Wi-Fi. Se
Windows non espone un profilo per la vEthernet, annotarlo; non inventare un indice.

## M-05 — proteggere la vNIC prima dell'attach

Questa fase richiede applicazione controllata delle regole, non copia di
comandi globali. Conservare il report precedente e una fotografia aggiornata
delle ACL della **sola** vNIC Mercurion. Dalla console Ubuntu preparare backup
dei file Netplan in directory root privata, senza esportarne i contenuti in Git,
poi arrestare ordinatamente il guest. Confermare VM Off e console disponibile.

**Ricognizione guest owner:** screenshot da console mostra
`/etc/netplan/00-installer-config.yaml`, root:root `0600`, 374 byte, e
`00-installer-config.yaml.bak`, root:root `0600`, 169 byte. Il `.bak` esistente
va preservato, non assunto come backup della configurazione attuale.
Contenuto mostrato: renderer `networkd`, match MAC `00:15:5d:00:dd:01`,
`set-name: eth0`, DHCPv4 true, DHCPv6 false, accept-ra false; DNS pubblici
`1.1.1.1` e `9.9.9.9`, DNS DHCP esclusi. Nessun nuovo resolver da scegliere
per M-06. Il mancato `cat` senza sudo è coerente con i permessi 0600.
Gestione cloud-init, IPv6 link-local e applicazione statica restano da verificare.

Primo comando di backup, dalla console Ubuntu con VM ancora accesa:

```bash
sudo cp -anv /etc/netplan/00-installer-config.yaml /root/netplan-pre-static.yaml
```

`-a` conserva metadati e permessi, `-n` evita sovrascritture, `-v` mostra
soltanto sorgente/destinazione. Atteso messaggio della copia. Se non compare
o c'è un errore, fermarsi e verificare il backup esistente senza usare `-f`.
Il file attivo e il `.bak` non vengono modificati. **Backup creato confermato
da screenshot owner:** la riga sorgente → `/root/netplan-pre-static.yaml`
conferma la copia. L'avviso di non portabilità di `-n` non è un errore; non
ripetere o sovrascrivere il backup per eliminarlo. Owner ha poi confermato VM
**Spenta** dopo arresto ordinato. `sudo shutdown -h now` è appropriato quanto
`sudo poweroff` su questo guest systemd; Turn Off forzato di Hyper-V è distinto.
Prima della modifica Netplan si confronteranno sorgente e copia con `cmp`;
non stampare contenuti o esportare il backup in Git.

Mantenere la vNIC esistente, nome/MAC e singolarità; non eliminare l'adattatore.
Sostituire le vecchie ACL con una policy unica ed esplicita, evitando regole
semplici/estese sovrapposte e l'allow al vecchio host. Prima fase **SSH-only**:
[script operativo, prove e recupero](SSH-ONLY-ACL.md). Il piano rimane soltanto
lettura senza `-Mode Apply`; lo script non avvia né sposta la VM e non crea NAT.
Specifiche finali della prima fase:

| Peso | Direzione | Azione | Corrispondenza |
| --- | --- | --- | --- |
| 900 | Entrambe, due regole | Deny | Tutto IPv6 `::/0` |
| 300 | Inbound | Allow stateful | Host `10.203.240.1/32` → guest `10.203.240.10/32`, TCP porta locale 22 |
| 201–209 | Outbound | Deny | Prefissi privati/locali, per qualsiasi protocollo |
| 10 | Entrambe, due regole | Deny | Tutto il resto |

Prefissi IPv4 da negare: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`,
`127.0.0.0/8`, `169.254.0.0/16`, `100.64.0.0/10`, `0.0.0.0/8`,
`224.0.0.0/4`, `240.0.0.0/4`; aggiungere eventuali prefissi LAN/VPN reali
che non ricadano già in questi intervalli. Nessuna eccezione guest → router/DNS LAN.
Verificare anche eventuali indirizzi pubblici del router o alias con NAT
hairpin verso servizi LAN: non sono coperti automaticamente dal deny RFC1918.
Se presenti, censirli e negarli prima dell'apertura egress generale; un cambio
di questi indirizzi richiede nuova verifica. Il NAT non certifica l'isolamento.
Le risposte SSH dipendono dall'eccezione stateful, non da un allow outbound verso host.

**Verifica router del 9 novembre:** gateway host riletto `192.168.0.1` sulla
Wi-Fi; owner identifica **ZTE MC888 Ultra**, accede al pannello e conferma
port forwarding, DMZ, UPnP e mapping disabilitati. Nessuna modifica al router
richiesta o dichiarata. È evidenza di configurazione osservata, non una prova
di traffico o una garanzia rispetto a futuri cambiamenti della rete.

**Controllo router ZTE, sola lettura**

1. Accedere personalmente al pannello del router, senza condividere password.
2. Cercare **Impostazioni avanzate → Firewall**. Percorso documentato nella
   [guida MC888 dell'operatore HKBN](https://blob.hkbn.net/es-aio-static/pdf-user-guides/hkbnes-zte-5g-cpe-mc888-configuration-guide-1.2-en.pdf),
   pagine 19–21: riferimento alla famiglia MC888, non verifica del firmware
   Ultra installato. Se le voci differiscono, riportare i nomi disponibili.
3. Aprire **Port Forwarding / Inoltro porte**: annotare stato e presenza di regole.
4. Aprire **DMZ**: annotare attiva/disattivata.
5. Aprire **UPnP**: annotare attivo/disattivato e mapping, se visibili.
6. Non cambiare selezioni né premere Applica. Riportare solo gli esiti, senza
   IP pubblico, credenziali o esportazioni complete della configurazione.

| Voce | Esito osservato sul router |
| --- | --- |
| Port forwarding | Disabilitato, dichiarato dall'owner il 9 novembre |
| DMZ | Disabilitata, dichiarato dall'owner il 9 novembre |
| UPnP e mapping visibili | Entrambi disabilitati, dichiarato dall'owner il 9 novembre |

Se UPnP è attivo e la tabella è vuota, l'assenza di mapping vale soltanto per
l'istante osservato. Se una voce non è disponibile, registrarla come non
verificata. Questo audit di configurazione non sostituisce le prove di traffico
LAN né autorizza da solo l'apertura egress; eventuali modifiche al router
richiedono una scelta esplicita separata.

Le regole a peso maggiore precedono quelle inferiori. In M-05 **nessuna
connessione viene iniziata dal guest**, neppure Internet. La successiva fase
egress dovrà restare sotto i deny privati e permettere risposte stateful, non
nuove connessioni inbound; aprire TCP/443 da solo consentirebbe altrimenti
di contattare HTTPS sulla LAN. ICMP non è aperto in questa proposta:
non usare il solo ping come prova di connettività. Limitazioni ulteriori delle
porte provider si valuteranno nel rispettivo task, senza aprire reti private.

Verificare l'intero ruleset e l'assenza di altri allow prima di collegare la VM.
**Apply reale owner riuscito:** ricevuta `settingsReadbackVerified=true`,
14 ACL estese, `internetEgressEnabled=false`, `isolationAccepted=false`;
VM non avviata e adattatore non spostato. Snapshot locale
`acl/cd8eef94c8b34013aea52a06258fec50/before.json`: identita vNIC/MAC coerenti,
sei ACL semplici e due estese originarie conservate. Compatibilita dei cmdlet
e readback verificati sulla macchina reale; traffico e persistenza non ancora
collaudati. I 16 scenari locali restano prove con API simulate. Due deny
temporanei peso 10000 proteggono la sostituzione secondo lo script.
Se la VM non è Off, le regole sono ambigue o manca il backup, fermarsi.

## M-06 — guest statico, NAT e collegamento

1. Solo dopo readback M-05 riuscito e nuova conferma Kaspersky Pubblica,
   collegare a VM spenta la sola vNIC esistente a `Mercurion-Internal`, senza
   cambiarne MAC/ACL. Non creare NAT o mapping in questa fase SSH-only.

   Da PowerShell amministrativa, comando del collegamento e relativa lettura:

   ```powershell
   Connect-VMNetworkAdapter -VMName 'Mercurion-Server' -Name 'Scheda di rete' -SwitchName 'Mercurion-Internal' -Passthru | Format-List VMName,Name,SwitchName,MacAddress
   ```

   **Eseguito dall'owner:** output conferma VM Mercurion-Server, scheda
   `Scheda di rete`, SwitchName `Mercurion-Internal`, MAC `00155D00DD01`.
   VM da tenere spenta; richiesta verifica delle ACL dopo il collegamento:

   ```powershell
   powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Set-MercurionVmNetworkAcl.ps1 -Mode Verify
   ```

   **Verify owner riuscito dopo il collegamento:** settingsReadbackVerified
   true, internetEgressEnabled false, isolationAccepted false. La verifica è
   read-only e non costituisce prova di traffico; autorizzato il passo console.

2. Avviare/sbloccare LUKS da console. Il vecchio DHCP non trovera un lease:
   egress e DHCP sono chiusi; la console resta il percorso di amministrazione.
   Confrontare originale e backup con `cmp` prima di editarli. Verificare
   renderer/file reale e gestione cloud-init; non aggiungere un secondo file
   lasciando DHCP attivo nel primo.

   Dopo avvio normale e login console, prima di cambiare il file:

   ```bash
   sudo cmp -s /etc/netplan/00-installer-config.yaml /root/netplan-pre-static.yaml && echo BACKUP_OK
   ```

   **Owner ha restituito BACKUP_OK:** file attivo e copia coincidono dopo
   l'avvio sul nuovo collegamento. In caso di errore/assenza del marker in una
   replica, fermarsi senza sovrascrivere file o backup.

3. Preparare la configurazione dell'interfaccia esistente con `10.203.240.10/24`,
   DHCPv4/v6 disattivati, gateway `10.203.240.1`, DNS pubblici esistenti
   `1.1.1.1` e `9.9.9.9` conservati.
   Non usare Windows o router LAN come server DNS. Validare renderer e versione;
   rifiutare RA/IPv6 link-local sul link amministrativo oltre ai deny Hyper-V.

   Aprire il solo file esistente:

   ```bash
   sudo nano /etc/netplan/00-installer-config.yaml
   ```

   Sostituire il blocco corrente `dhcp4`/`dhcp6`/`accept-ra` con questo, allo
   stesso livello di `set-name` (sei spazi nell'attuale file):

   ```yaml
         dhcp4: false
         dhcp6: false
         accept-ra: false
         link-local: []
         addresses: [10.203.240.10/24]
         routes:
           - to: default
             via: 10.203.240.1
   ```

   Usare spazi, non tab. Conservare renderer, identificatore logico della
   scheda, match MAC, set-name, override DHCP e nameservers esistenti. Non
   modificare `.bak` o backup root, non creare un secondo YAML. In nano salvare
   con Ctrl+O, Invio, poi Ctrl+X. Owner ha corretto battitura/indentazione del
   blocco routes e mostrato il file finale con IP e gateway previsti.

4. Validare con `netplan generate`; applicare/provare solo dalla console quando
   il nuovo link protetto è pronto. NAT non serve per SSH locale. Usare allora
   `netplan try` e confermare dopo le
   verifiche, conservando il backup. Adattare file reale e cloud-init prima dell'uso.

   Primo controllo, senza applicare ancora la rete:

   ```bash
   sudo netplan generate && echo NETPLAN_OK
   ```

   Acquisire marker ed eventuali warning/errori prima di passare a try/apply.
   Generate produce configurazioni del backend ma non le applica in questo
   uso manuale; non equivale a rete funzionante. Nessuna modifica cloud-init
   autorizzata implicitamente; persistenza dopo reboot rimane M-08.

   **NETPLAN_OK confermato da screenshot owner**, senza warning nell'output
   mostrato. Prossimo passo dalla console, senza chiuderla:

   ```bash
   sudo netplan try --timeout 300
   ```

   Quando compare la richiesta di conferma/conto alla rovescia, avvisare
   subito l'assistente e non premere ancora Invio. Nella finestra di cinque
   minuti controllare dall'host TCP/22 sul solo IP `10.203.240.10`, con route
   interna e MAC atteso; è un controllo di raggiungibilità, non login o prova
   LAN. Confermare nella console solo dopo il riscontro.
   **Eseguito:** TCP/22 raggiungibile da host `10.203.240.1` al guest
   `10.203.240.10`, neighbor sulla vEthernet interna con MAC atteso
   `00-15-5D-00-DD-01`; owner ha confermato «Configurazione accettata».
   Applicazione corrente verificata; successivo riavvio guest verificato in M-08.
   Se c'è errore o timeout, riportare l'esito e verificare stato effettivo da
   console: non presumere che runtime e file su disco siano tornati allo stato
   precedente e non riavviare alla cieca. Il backup root rimane disponibile.
   [Comportamento e limiti di netplan try](https://netplan.readthedocs.io/en/stable/netplan-try/).
5. Verificare IP/route e listener 22. Aggiornare solo `HostName` nell'alias
   SSH a `10.203.240.10`, senza cambiare chiavi/autenticazione/passphrase.
   Verificare un eventuale avviso host key dalla console, senza disabilitare
   host-key checking o cancellare known_hosts alla cieca. Provare SSH dall'host.

   **Alias aggiornato dall'agente:** modificato solo HostName del blocco
   univoco `mercurion-server` in `~/.ssh/config`, da vecchio IP a
   `10.203.240.10`. Copia prima della modifica nella stessa directory, con ACL
   copiate dall'originale: `config.before-mercurion-static-9bc0bad467784780833aeb5f188e1d7c.bak`.
   Nessun altro parametro, chiave privata o metodo di autenticazione modificato;
   `ssh -G` conferma il nuovo hostname. Config e backup restano fuori Git.

   Identita verificata con handshake SSH senza autenticazione utente,
   StrictHostKeyChecking yes e HostKeyAlias temporaneo del vecchio IP fidato:
   chiave ED25519 coincidente con quella gia presente in known_hosts.
   Impronta pubblica verificata:
   `SHA256:9IFgVd7PcpL7F9lBGIuKF6SDZRQvjQ4zKoUsCqtbd68`.
   Permission denied del solo controllo era atteso: autenticazione disabilitata
   appositamente in quell'invocazione. Nessun login utente provato dall'agente.

   Il nuovo indirizzo non era ancora in known_hosts. Primo login dell'owner:

   ```powershell
   ssh mercurion-server
   ```

   Confermare l'eventuale nuovo record solo se l'impronta coincide con quella
   verificata, poi inserire passphrase nel terminale. Non cancellare record
   esistenti o ignorare avvisi di chiave differente. **Eseguito:** owner conferma
   «Shell Ubuntu raggiunta» il 9 novembre. Accesso amministrativo recuperato;
   persistenza dopo riavvio guest verificata successivamente in M-08;
   riavvio host e isolamento LAN non ancora collaudati.
6. Predisporre il NAT mantenendo la policy SSH-only: **non aggiungere ancora
   alcun allow outbound**. Il NAT non sostituisce ACL e firewall. Prima della
   creazione, rileggere da PowerShell amministrativa i WinNAT esistenti:

   ```powershell
   ConvertTo-Json -InputObject @(Get-NetNat -ErrorAction Stop | Select-Object Name,InternalIPInterfaceAddressPrefix,Active)
   ```

   L'inventario precedente non mostrava WinNAT, ma non autorizza a presumere
   lo stato attuale. **Lettura amministrativa attuale eseguita dall'owner:**
   array vuoto `[]`, nessun WinNAT elencato. Preparata la sola creazione nominata:

   ```powershell
   New-NetNat -Name 'Mercurion-NAT' -InternalIPInterfaceAddressPrefix 10.203.240.0/24
   ```

   **Creazione eseguita dall'owner il 9 novembre:** ricevuta New-NetNat con
   Name `Mercurion-NAT`, prefisso `10.203.240.0/24`, Active `1`.
   Nessuna apertura ACL outbound richiesta. Acquisire ora la fotografia
   post-creazione, usando lo script già verificato da PowerShell amministrativa:

   ```powershell
   powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Get-StaticNetworkMigrationInventory.ps1
   ```

   Rivedere nel report: solo NAT nominato/prefisso atteso, mapping statici
   assenti, ACL SSH-only invariate, tipo/singolarità vNIC e switch, profili,
   forwarding/weak-host, servizi e reti HNS. **Inventario acquisito e riletto:**
   report locale `static-network/98fda47d2bc34bb0893a9b65ff3aeea8/inventory.json`,
   completo, del 9 novembre alle 11:44 UTC. Un solo Mercurion-NAT con prefisso
   atteso, zero mapping statici; zero ACL semplici e 14 estese coincidenti con
   la policy SSH-only. Unica vNIC/MAC e switch Internal corretti; Windows
   Public, forwarding e weak-host disabilitati su tutte le interfacce osservate,
   RemoteAccess fermo. Reti Docker Desktop interrogabili e prefissi preesistenti
   invariati; non è una prova di connettività applicativa WSL/Docker.
   TCP/22 guest nuovamente raggiungibile dall'IP host interno dopo il NAT,
   senza autenticazione utente in questo controllo.

   HNS riporta un metadato subnet `172.23.112.0/20` per il network di tipo
   Internal Mercurion: nello stesso inventario l'interfaccia ha solo IPv4
   `10.203.240.1/24` e non esistono route per quel prefisso HNS. Distinzione
   registrata, origine del metadato non accertata; nessuna pulizia HNS o
   modifica a WSL/Default Switch per uniformarlo. La validazione usa gli
   indirizzi e le route effettivi e mantiene aperto il controllo al reboot host.
   La ricevuta di creazione non prova isolamento o compatibilità WSL/Docker.
   Se in una replica futura esiste
   un altro WinNAT, fermarsi senza rimuoverlo: Microsoft documenta il limite
   di un prefisso interno WinNAT per host. Se esiste già Mercurion-NAT, leggere
   configurazione e mapping prima di riutilizzarlo; non creare duplicati.
   Default Switch e WSL/HNS restano risorse distinte da preservare: nessuna
   cancellazione, arresto servizi o pulizia globale come rimedio automatico.
   Dopo la creazione rileggere NAT/mapping, ACL e profili, quindi provare SSH
   e verificare WSL/Docker. Un conflitto o un readback inatteso richiede diagnosi,
   senza allentare i filtri o procedere all'apertura egress.

7. Nessun mapping statico o bridge. Proseguire con la [procedura DNS/HTTPS](DNS-HTTPS-ACL.md),
   che conserva i deny e richiede VM Spenta per la transizione. Implementazione
   e test locali pronti, applicazione ancora pendente; eseguire poi M-07 sulla
   policy completa. Nessuna apertura egress implicita nella creazione del NAT.

Il collegamento/avvio protetto e la configurazione statica precedono quindi
l'attivazione dell'egress. DNS/HTTPS pubblici non devono ancora riuscire nella
fase SSH-only: non rimuovere deny per soddisfare anticipatamente lo smoke.

Non abilitare routing generale host/weak-host/RRAS per risolvere problemi NAT.
Rileggere configurazioni, ACL e profili prima delle prove: l'installazione di un
NAT può modificare lo stato effettivo e va collaudata insieme a ICS/WSL/Docker.

## M-07 — accettazione: accessi ammessi e negati

| Origine → destinazione | Risultato richiesto |
| --- | --- |
| Host IP interno → guest TCP/22 | SSH a chiave riuscito, passphrase solo nel terminale |
| Guest → host: nuova connessione | Negata, inclusi IP interno e IP Wi-Fi dell'host |
| Guest e ciascun bridge container → LAN/router/peer privati | Negata, anche TCP/443 e DNS; target specifici controllati |
| LAN → guest, diretto o tramite host | Negata su IPv4/IPv6; nessun inoltro host o mapping NAT |
| Altra origine non autorizzata sul segmento interno → SSH | Negata |
| Guest e bridge con egress → DNS/HTTPS pubblici | Riuscita con risposte stateful, senza deroghe LAN |
| Nuove connessioni pubbliche → porte guest | Negate; eventuale Cloudflare è un percorso applicativo separato futuro |

Ogni prova negativa richiede un listener/servizio controllato e raggiungibile
dal controllo positivo prima/dopo, con route effettiva verificata: un timeout
contro una porta chiusa o senza route non certifica il filtro. Non scansionare
indiscriminatamente la LAN. Registrare configurazione e livello della prova.

Sono disponibili solo smartphone senza server/terminale: questo **non chiude**
automaticamente i test da seconda origine. Nessuna installazione implicita;
pianificare un'origine controllata o mantenere quei casi aperti. La categoria
Pubblica, le ACL lette e NAT senza mapping non sostituiscono la prova negativa.

Le evidenze del 7 novembre valgono per la vecchia rete: ripetere H-02/H-04/H-06
e i casi residui sulla nuova baseline. Finché l'isolamento LAN bidirezionale
non è accettato, niente esposizione pubblica o avvio stack reali sulla VM.

## M-08 — stabilità, recupero e ripresa

Prima verifica parziale, anticipata nella fase SSH-only, senza creare NAT:

1. Salvare il lavoro nella VM e mantenere disponibile la console Hyper-V.
2. Dalla shell Ubuntu riavviare ordinatamente **solo la VM**:

   ```bash
   sudo reboot
   ```

3. Sbloccare LUKS dalla console Hyper-V e attendere il completamento dell'avvio.
4. Da PowerShell normale riconnettersi con `ssh mercurion-server`, senza
   cambiare alias o ACL. Se compare un avviso di chiave differente, fermarsi.
5. Nella nuova shell eseguire `ip -brief address show eth0` e
   `ip -4 route show default`: attesi `10.203.240.10/24` e gateway
   `10.203.240.1`. Registrare output ed esito del login. Se SSH non risponde,
   usare la console per leggere lo stato senza modificare subito i filtri.

**Prima prova eseguita dall'owner il 9 novembre:** nuovo accesso SSH dopo il
riavvio guest; output forniti dalla shell Ubuntu:

```text
eth0             UP             10.203.240.10/24
default via 10.203.240.1 dev eth0 proto static
```

Un primo comando con virgola dopo `default` è stato corretto dall'owner;
l'output riportato deriva dal comando valido. Nessuna modifica correttiva
di rete dichiarata durante la prova. L'agente ha riletto inoltre IP host
`10.203.240.1/24` Preferred/Manual e profilo Windows Public. Non è una verifica
della categoria Kaspersky né un riavvio dell'host.

Questa prova copre soltanto il riavvio guest e non chiude M-08: NAT, reboot
host, profili e isolamento richiedono prove separate. Prima di aprire egress,
rileggere le ACL con `Set-MercurionVmNetworkAcl.ps1 -Mode Verify` da PowerShell
amministrativa e ricontrollare in Kaspersky la voce con CIDR `10.203.240.1/24`.
**ACL dopo riavvio guest verificate dall'owner:** ricevuta Verify con
`settingsReadbackVerified=true`, `internetEgressEnabled=false`,
`isolationAccepted=false`. È conferma del set di regole letto, non una prova
negativa di traffico. Owner conferma inoltre che la voce `10.203.240.1/24`
è ancora Rete pubblica in Kaspersky dopo il riavvio guest. Non equivale a
persistenza dopo riavvio Windows o a isolamento LAN collaudato.

Provare separatamente reboot guest e host con salvataggio del lavoro prima:
indirizzi fissi invariati, LUKS e SSH funzionanti, profilo Kaspersky ancora
Pubblica, ACL/NAT persistenti, WSL/Docker Desktop non danneggiati; ripetere le
prove negative pertinenti. Il solo restart del container non copre questo caso.

In caso di errore mantenere la VM scollegata o spenta ordinatamente e usare
la console. Ripristinare solo i file Netplan/ACL dell'adattatore identificato;
rimuovere soltanto risorse nuove esattamente nominate, dopo aver escluso altri
consumer. Nessuna pulizia globale di switch/NAT/firewall. Tornare al Default
Switch ripristina una rete dinamica: non garantisce da solo SSH, perché alias
e ACL originari erano già obsoleti. Non eliminare vecchie risorse durante la prova.

Aggiornare stato/decisioni/accettazione con evidenze; solo dopo riprendere il
[bootstrap sintetico](HOST-SYNTHETIC-DELIVERY.md), che usa l'alias invariato.

## Fonti tecniche

- [Microsoft: NAT su switch interno e indirizzi guest manuali](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/setup-nat-network).
- [Microsoft: ACL estese, pesi e regole stateful](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/create-security-policies-extended-port-access-control-lists).
- [Cmdlet ACL: parametri e famiglie IP](https://learn.microsoft.com/en-us/powershell/module/hyper-v/add-vmnetworkadapterextendedacl).
- [Kaspersky: tipi di rete nelle impostazioni Firewall](https://support.kaspersky.com/help/Kaspersky/Win21.7/en-US/201830.htm).
  Riferimento generale del prodotto, non attestazione della UI 21.27 installata.
- [Netplan: configurazione YAML](https://netplan.readthedocs.io/en/stable/netplan-yaml/).
