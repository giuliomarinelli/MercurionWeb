# INF-VM-02 — migrazione alla rete interna statica

**9 novembre 2026 — procedura progressiva in italiano.** Inventario completato;
switch vuoto e IP host creati dall'owner, guest non ancora migrato.
Seguire i passi nell'ordine e aggiornare la tabella
di avanzamento: un comando documentato non è un comando già eseguito.
Il bootstrap sintetico rimane sospeso fino al recupero dell'accesso amministrativo.

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
| M-03 | Switch interno vuoto e IP host statico | Eseguito dall'owner: Internal e `10.203.240.1/24`; ActiveStore Preferred verificato |
| M-04 | Kaspersky Pubblica e profilo host verificati | Classificazione attuale confermata da screenshot owner; efficacia regole/persistenza da provare |
| M-05 | Backup e policy ACL della sola vNIC Mercurion | Backup creato e VM spenta dichiarati dall'owner; script SSH-only testato localmente, Apply ancora da eseguire |
| M-06 | Configurazione guest statica, NAT e collegamento | Da eseguire dopo M-04/M-05 |
| M-07 | SSH, egress e prove negative con controlli positivi | Da eseguire |
| M-08 | Riavvio a freddo, stabilità e nuova baseline | Da eseguire |

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

Le regole a peso maggiore precedono quelle inferiori. In M-05 **nessuna
connessione viene iniziata dal guest**, neppure Internet. La successiva fase
egress dovrà restare sotto i deny privati e permettere risposte stateful, non
nuove connessioni inbound; aprire TCP/443 da solo consentirebbe altrimenti
di contattare HTTPS sulla LAN. ICMP non è aperto in questa proposta:
non usare il solo ping come prova di connettività. Limitazioni ulteriori delle
porte provider si valuteranno nel rispettivo task, senza aprire reti private.

Verificare l'intero ruleset e l'assenza di altri allow prima di collegare la VM.
Questa specifica **non è ancora una policy applicata o collaudata su Hyper-V**:
script disponibile, 16 scenari locali con API simulate passati; Apply/readback
owner e prove di traffico restano aperti. Due deny temporanei peso 10000
proteggono la sostituzione, con snapshot preventivo e recupero documentato.
Se la VM non è Off, le regole sono ambigue o manca il backup, fermarsi.

## M-06 — guest statico, NAT e collegamento

1. Solo dopo readback M-05 riuscito e nuova conferma Kaspersky Pubblica,
   collegare a VM spenta la sola vNIC esistente a `Mercurion-Internal`, senza
   cambiarne MAC/ACL. Non creare NAT o mapping in questa fase SSH-only.
2. Avviare/sbloccare LUKS da console. Il vecchio DHCP non trovera un lease:
   egress e DHCP sono chiusi; la console resta il percorso di amministrazione.
   Confrontare originale e backup con `cmp` prima di editarli. Verificare
   renderer/file reale e gestione cloud-init; non aggiungere un secondo file
   lasciando DHCP attivo nel primo.
3. Preparare la configurazione dell'interfaccia esistente con `10.203.240.10/24`,
   DHCPv4/v6 disattivati, gateway `10.203.240.1`, DNS pubblici esistenti
   `1.1.1.1` e `9.9.9.9` conservati.
   Non usare Windows o router LAN come server DNS. Validare renderer e versione;
   rifiutare RA/IPv6 link-local sul link amministrativo oltre ai deny Hyper-V.
4. Validare con `netplan generate`; applicare/provare solo dalla console quando
   il nuovo link protetto è pronto. NAT non serve per SSH locale. Usare allora
   `netplan try` e confermare dopo le
   verifiche, conservando il backup. Adattare file reale e cloud-init prima dell'uso.
5. Verificare IP/route e listener 22. Aggiornare solo `HostName` nell'alias
   SSH a `10.203.240.10`, senza cambiare chiavi/autenticazione/passphrase.
   Verificare un eventuale avviso host key dalla console, senza disabilitare
   host-key checking o cancellare known_hosts alla cieca. Provare SSH dall'host.
6. Dopo recupero SSH e review dell'egress, creare il NAT dedicato solo se non
   esiste un WinNAT incompatibile. M-05 non lo crea e mantiene egress chiuso:

```powershell
New-NetNat -Name 'Mercurion-NAT' -InternalIPInterfaceAddressPrefix 10.203.240.0/24
```

7. Nessun mapping statico o bridge. Aprire e verificare l'egress solo con i
   relativi deny e controlli LAN/WAN, poi eseguire M-07 sulla policy completa.

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
