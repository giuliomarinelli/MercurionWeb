# Runbook operativo — da host e VM al primo bootstrap preview

**Aggiornato al 12 novembre 2026. Lingua: italiano.** Questa è la guida
sequenziale per un operatore umano. Non richiede chat, agenti AI, MCP, profili
browser dell'autore o script conservati soltanto sul suo computer. I programmi
necessari sono elencati sotto; i relativi sorgenti operativi sono nel repository.
Gli artifact sono output da produrre e conservare, non istruzioni nascoste.

**Traguardo attuale:** quattro server avviati privatamente sulla VM, quattro
indici log Meilisearch e due API key applicative a 90 giorni creati.
**Prossimo passo:** bootstrap applicativo privato.
Web, Tox21 persistente, dati ChEMBL, Cloudflare e produzione non sono avviati.

## 0. Leggere prima: nuova installazione oppure ripresa?

- **VM attuale già predisposta:** usare la sezione 12. Non ricreare rete,
  file privato, volumi, indici o bundle. Il bootstrap iniziale non è un comando
  giornaliero e non è un ripristino dopo perdita dei file tmpfs.
- **Nuovo host / nuova VM:** seguire 1–11 nell'ordine; la sezione 3 distingue
  l'installazione iniziale proposta dalla configurazione successivamente
  verificata. Non eseguire comandi di creazione sopra risorse esistenti.
- **Revisione/audit:** leggere anche [il registro delle evidenze](EXECUTION-RECORD.md).
  Le ricevute riportate qui sono metadati sanitizzati; nessun file di credenziali
  è necessario per comprendere la procedura.

Ogni blocco indica **dove** eseguirlo. I blocchi PowerShell non sono comandi
Bash. Eseguire una fase alla volta e controllarne il risultato. Un fallimento
richiede diagnosi dello stato conservato: non togliere filtri, non rigenerare
segreti e non ripetere una mutazione per tentativi.

## 1. Nomi, ambienti e confini

| Oggetto | Valore di riferimento |
| --- | --- |
| Repository Web | `https://github.com/giuliomarinelli/MercurionWeb.git` |
| Repository scientifico indipendente | `https://github.com/giuliomarinelli/MercurionTox21.git` |
| Directory esempio Web | `C:/.project_repo/MercurionWeb` |
| Branch operativo Web | `feature/infra-vm-docker-engine-architecture` |
| Branch operativo Tox21 | `feature/infra-vm-nats-client-auth` |
| VM Hyper-V / hostname Ubuntu | `Mercurion-Server` / `mercurion-server` |
| vNIC / MAC della baseline | `Scheda di rete` / `00155D00DD01` |
| Switch / tipo | `Mercurion-Internal` / **Internal** |
| Subnet / host / guest | `10.203.240.0/24` / `.1` / `.10` |
| NAT | `Mercurion-NAT`, nessun mapping statico |
| Alias SSH | `mercurion-server` |
| Identità preview | deployment `preview`, Nest `APP_ENV=staging`, Tox21 `PY_ENV=staging` |
| Hostname applicativo futuro | `preview.mercurion.app` |
| API amministrativa Meili sull'host | solo `http://127.0.0.1:17700`, via SSH |

Il vecchio nome deployment `beta` è stato sostituito da `preview`. Non rinominare
gli indici `logs_staging`: staging è l'identità applicativa e rimane corretta.

Non c'è uno switch External, bridge LAN, seconda vNIC guest, mapping router o
porta Docker pubblicata. L'host può iniziare SSH; il guest può rispondere a
quella sessione. Nuove connessioni guest/container verso Windows, LAN e router
sono vietate. Il NAT usa il collegamento Internet dell'host ma non autorizza
accesso ai servizi LAN. NAT, Kaspersky Pubblica e ACL sono controlli distinti.

Gli script ACL hanno intenzionalmente VM, subnet e MAC fissati. Su una replica
isolata usare la baseline esatta; su una rete diversa aggiornare e collaudare
il contratto come modifica esplicita. Non eliminare i controlli di identità
per aggirare un errore. Non assegnare lo stesso MAC a VM contemporaneamente
collegate allo stesso segmento.

## 2. Prerequisiti e terminali

| Postazione | Necessario | Verifica |
| --- | --- | --- |
| Host Windows | Windows 11 Pro con Hyper-V e virtualizzazione firmware attiva | `Get-VMHost` da terminale amministrativo |
| Host, terminale ordinario | Windows PowerShell **5.1 a 64 bit** | `$PSVersionTable`; `[Environment]::Is64BitProcess` |
| Host | Git, Python 3.10+ (baseline 3.12), Node 22.16.0/npm 10.9.2 | `git --version`; `python --version`; `node --version`; `npm --version` |
| Host | OpenSSH Client (`ssh.exe`, `scp.exe`, `ssh-keygen.exe`) e `curl.exe` | `Get-Command ssh.exe,scp.exe,ssh-keygen.exe,curl.exe`; `curl.exe --version` |
| Host build | Docker Desktop con engine Linux e contesto `desktop-linux` | `docker --context desktop-linux version`; `docker --context desktop-linux buildx version` |
| Host CI | GitHub CLI autenticata a un account autorizzato | `gh --version`; `gh api user --jq .login` |
| Guest | Ubuntu Server 26.04.1 LTS amd64, OpenSSH, Python 3, sudo | console: `cat /etc/os-release`; `python3 --version`; `sudo sshd -t` |
| Guest | Docker Engine 29.9.3, plugin Compose 5.7.0 osservati | `sudo docker version`; `sudo docker compose version` |
| Operatore | Password manager: passphrase chiave SSH, sblocco LUKS, sudo, provider | valori solo nei terminali/editor privati |

Queste sono versioni osservate, non una promessa che un repository APT o un
registry le mantenga indefinitamente. Archiviare anche installer/pacchetti,
manifest, modello e immagini verificati se serve una replica offline duratura.
Un nuovo finding CVE blocca la consegna: non riprodurre vulnerabilità per ottenere
un vecchio digest. La policy strict non ammette eccezioni, nemmeno LOW/UNKNOWN.

**Tre contesti:**

1. **PS-ADMIN:** PowerShell Windows aperta con «Esegui come amministratore»,
   per Hyper-V, IP, NAT e letture dei profili. Verificare con:

   ```powershell
   ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
   ```

2. **PS:** PowerShell Windows normale per build, SSH e wrapper operativi.
3. **UBUNTU:** console Hyper-V o shell ottenuta con `ssh mercurion-server`.
   `sudo` richiede la password dell'utente Linux, non la passphrase della chiave.

Avviare i comandi Hyper-V direttamente in PS-ADMIN. Se un wrapper eseguito in
un processo PowerShell figlio produce sezioni indisponibili, leggere
`executionContext` ed `errors` dell'inventario; provare l'invocazione diretta
`& .\scripts\infrastructure\Get-StaticNetworkMigrationInventory.ps1` nello
stesso terminale già elevato. Non dedurre che il terminale fosse ordinario.

### 2.1 Repository e directory di lavoro

Su una nuova postazione creare il contenitore dei checkout e clonare i due
repository separatamente. L'esempio non imposta submodule e non considera Tox21
una cartella di sorgenti Web:

```powershell
New-Item -ItemType Directory -Path C:/.project_repo -ErrorAction Stop
git clone --branch feature/infra-vm-docker-engine-architecture https://github.com/giuliomarinelli/MercurionWeb.git C:/.project_repo/MercurionWeb
git clone --branch feature/infra-vm-nats-client-auth https://github.com/giuliomarinelli/MercurionTox21.git C:/.project_repo/MercurionTox21
Set-Location C:/.project_repo/MercurionWeb
$taskRepo=(Get-Location).Path
$taskArtifacts=Join-Path ([Environment]::GetFolderPath('UserProfile')) '.mercurion/artifacts'
[void][IO.Directory]::CreateDirectory($taskArtifacts)
```

Se il contenitore esiste, saltare il solo `New-Item` dopo averne verificato il
contenuto; non cancellarlo. Se i rami sono stati integrati/rinominati in futuro,
selezionare una revisione documentata comprendente questa guida e gli script.
Non usare reset, merge o checkout forzati in un worktree sporco.
La cartella `.codex/artifacts` presente nella cronologia è soltanto il vecchio
luogo di archiviazione: nessun prodotto Codex è richiesto per leggere o usare
file contenuti lì. Le nuove procedure possono usare `$taskArtifacts`.

## 3. Creare o verificare il guest, senza confondere i due percorsi

**La VM dell'autore esisteva prima del lavoro documentato.** Sono stati verificati
Gen2, 8 vCPU, 16 GiB fissi, disco da circa 200 GiB e root LUKS/dm-crypt/LVM/ext4.
Non è disponibile una registrazione completa dell'installer originale. Il percorso
di nuova installazione seguente descrive i parametri da riprodurre, ma non è una
seconda installazione già collaudata. Non applicarlo alla VM esistente.

### 3.1 Nuova VM

1. Installare Hyper-V da «Attiva o disattiva funzionalità Windows»; riavviare
   Windows se richiesto. Scaricare Ubuntu Server 26.04.1 amd64 e verificarne
   SHA-256 contro il file checksum distribuito con la stessa ISO. Registrare
   nome ISO, hash e fonte nel proprio registro, senza assumere un hash di un'altra
   point release.
2. In Gestione Hyper-V creare `Mercurion-Server`, **generazione 2**, 16384 MiB
   fissi, VHDX nuovo di 200 GiB, inizialmente senza rete. Nelle impostazioni
   assegnare 8 processori virtuali. Non sovrascrivere dischi di un'altra VM.
3. Se Secure Boot è attivo, selezionare il template **Microsoft UEFI Certificate
   Authority** per Linux. Collegare l'ISO all'unità DVD e avviare dalla console.
4. Installare Ubuntu Server con hostname `mercurion-server`, un utente personale
   non-root abilitato a sudo e layout LVM **con cifratura LUKS**. Conservare
   separatamente la passphrase di sblocco. `/boot` ed EFI non sono attestati
   cifrati da questa scelta: la cifratura verificata riguarda root e i dati
   Docker che vi risiedono. Non abilitare sblocco automatico non progettato.
5. Mantenere la console come canale iniziale. Installare OpenSSH dall'installer
   se disponibile. La rete definitiva è quella della sezione 4, non un attach
   permanente al Default Switch per scaricare pacchetti.
6. Prima di usare gli script ACL, spegnere Ubuntu ordinatamente e impostare
   il MAC statico compatibile con la baseline, solo dopo aver escluso collisioni:

   ```powershell
   Get-VMNetworkAdapter -All | Select-Object VMName,Name,MacAddress,SwitchName
   Get-VMNetworkAdapter -VMName Mercurion-Server | Set-VMNetworkAdapter -StaticMacAddress 00155D00DD01
   ```

   Il secondo comando richiede PS-ADMIN. La vNIC deve essere una sola; leggere
   il suo nome reale. L'esempio dei comandi successivi usa `Scheda di rete`.

Riferimento tecnico supplementare: [creazione VM Hyper-V](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/get-started/create-a-virtual-machine-in-hyper-v).
Le istruzioni operative essenziali sono sopra; il link non sostituisce un passo.

### 3.2 VM già esistente

In PS-ADMIN leggere, senza riconfigurare:

```powershell
Get-VM -Name Mercurion-Server | Format-List Name,State,Generation,ProcessorCount,MemoryStartup,AutomaticStartAction,AutomaticStopAction
Get-VMNetworkAdapter -VMName Mercurion-Server | Format-List Name,SwitchName,MacAddress
& .\scripts\infrastructure\Get-StaticNetworkMigrationInventory.ps1
```

Baseline osservata: `AutomaticStartAction=StartIfRunning`,
`AutomaticStopAction=Save`, ritardo 0. Per la prova di riavvio host la VM fu
prima arrestata normalmente, non salvata in esecuzione. Non modificare queste
opzioni senza considerare LUKS e i file volatili della sezione 13.

## 4. Rete statica e firewall: prima dell'esposizione del guest

Il Default Switch aveva cambiato subnet: alias SSH e allow stateful puntavano
ai vecchi indirizzi. Era un timeout di rete, non un errore della passphrase.
Si usa uno switch Internal con subnet riservata per evitare quella dipendenza.

### 4.1 Inventario, indirizzi e creazione

In PS-ADMIN eseguire l'inventario sopra. Leggere il JSON salvato al `reportPath`:
`incomplete=false` e `unavailableSections=[]` sono necessari; **non** significano
isolamento accettato. Confrontare `10.203.240.0/24` con LAN, VPN, route specifiche,
reti WSL/Docker/HNS e NAT. In caso di sovrapposizione serve un piano coerente
nuovo e nuovi test, non un cambio parziale dell'IP guest.

Solo su una nuova rete, in PS-ADMIN:

```powershell
New-VMSwitch -Name 'Mercurion-Internal' -SwitchType Internal
New-NetIPAddress -InterfaceAlias 'vEthernet (Mercurion-Internal)' -IPAddress 10.203.240.1 -PrefixLength 24
Get-VMSwitch -Name Mercurion-Internal | Format-List Name,SwitchType
Get-NetIPAddress -InterfaceAlias 'vEthernet (Mercurion-Internal)' -AddressFamily IPv4 | Format-Table IPAddress,PrefixLength,AddressState,PrefixOrigin
Get-NetConnectionProfile -InterfaceAlias 'vEthernet (Mercurion-Internal)' | Format-List InterfaceIndex,NetworkCategory
```

Attesi Internal, `10.203.240.1/24`, Preferred/Manual. Nessun gateway o DNS va
configurato sulla vEthernet host. Un iniziale Tentative richiede rilettura;
non cancellare l'IP in base alla sola riga PersistentStore Invalid iniziale.
Il gateway Internet Windows rimane sulla scheda ordinaria.

Se la categoria Windows osservata non è Public, impostare solo quel profilo:

```powershell
Set-NetConnectionProfile -InterfaceAlias 'vEthernet (Mercurion-Internal)' -NetworkCategory Public
```

In Kaspersky aprire Firewall → reti/connessioni e impostare **Rete pubblica**
sulla riga connessa `10.203.240.1/24 (vEthernet (Mercurion-Internal))`. Controllare
CIDR e stato, non soltanto una vecchia voce disconnessa. Il profilo Kaspersky
è distinto da Windows Public. Verificarli entrambi anche dopo riavvio host.
Non cambiare profili WSL/Wi-Fi e non creare allow generici per far passare SSH.

### 4.2 ACL SSH-only, VM spenta

Su un guest già configurato fare prima backup Netplan dalla console:

```bash
sudo cp -anv /etc/netplan/00-installer-config.yaml /root/netplan-pre-static.yaml
sudo shutdown -h now
```

Conservare ogni backup già presente. Il file può avere altro nome su una nuova
installazione: identificare con `ls -l /etc/netplan`, non creare YAML concorrenti.
Su una nuova installazione scollegata arrestare ugualmente il guest.

In PS-ADMIN, VM **Off**, pianificare e applicare:

```powershell
& .\scripts\infrastructure\Set-MercurionVmNetworkAcl.ps1 -Mode Plan -Policy SshOnly
& .\scripts\infrastructure\Set-MercurionVmNetworkAcl.ps1 -Mode Apply -Policy SshOnly
Connect-VMNetworkAdapter -VMName 'Mercurion-Server' -Name 'Scheda di rete' -SwitchName 'Mercurion-Internal' -Passthru | Format-List VMName,Name,SwitchName,MacAddress
& .\scripts\infrastructure\Set-MercurionVmNetworkAcl.ps1 -Mode Verify -Policy SshOnly
```

Attesi 14 regole estese e readback riuscito. Apply salva snapshot delle sole ACL
di quella vNIC, richiede VM spenta e usa guardie deny durante la sostituzione.
Non avvia il guest, non crea NAT, non modifica altre VM. Errori: lasciare Off
e conservare snapshot; non lanciare rimozioni globali di ACL.

| Priorità | Policy SSH-only |
| --- | --- |
| 900 | deny IPv6 `::/0` inbound e outbound |
| 300 | allow stateful host `.1` → guest `.10` TCP/22 |
| 201–209 | deny outbound reti private/locali/multicast riservate |
| 10 | deny del resto, in entrambe le direzioni |

I prefissi negati sono nel sorgente `MercurionVmAcl.ps1`: RFC1918, loopback,
link-local, CGNAT, 0/8 e multicast/riservati. Non è ammesso un allow guest → host.

### 4.3 Netplan dalla console

Avviare il guest, sbloccare LUKS e accedere dalla console Hyper-V. Su migrazione
confrontare prima il backup:

```bash
sudo cmp -s /etc/netplan/00-installer-config.yaml /root/netplan-pre-static.yaml && echo BACKUP_OK
```

Aprire `sudo nano /etc/netplan/00-installer-config.yaml`. Configurazione completa
di riferimento; l'identificatore `wth0` è logico, il nome Linux finale è `eth0`:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    wth0:
      match:
        macaddress: "00:15:5d:00:dd:01"
      set-name: eth0
      dhcp4: false
      dhcp6: false
      accept-ra: false
      link-local: []
      addresses: [10.203.240.10/24]
      routes:
        - to: default
          via: 10.203.240.1
      nameservers:
        addresses: [1.1.1.1, 9.9.9.9]
```

Conservare eventuali override DHCP preesistenti coerenti; con DHCP disattivato
non sono necessari al nuovo esempio. Se il file è gestito da cloud-init,
risolvere quella responsabilità prima di considerarlo persistente: non aggiungere
un secondo renderer/configuratore. Non disabilitare globalmente il kernel IPv6:
questa baseline usa link amministrativo senza IPv6 e deny Hyper-V.

Salvare con Ctrl+O/Invio, uscire Ctrl+X; poi:

```bash
sudo chmod 600 /etc/netplan/00-installer-config.yaml
sudo netplan generate && echo NETPLAN_OK
sudo netplan try --timeout 300
```

Il trattino richiede lo spazio in `- to:`; `via:` è allineato a `to:`, senza
un secondo trattino. `generate` non prova la rete. Durante il conto alla rovescia,
da PS host verificare `Test-NetConnection 10.203.240.10 -Port 22` se SSH è già
installato/attivo; dalla console verificare anche `ip -brief address show eth0`
e `ip -4 route show default`. Conservare la configurazione con Invio solo se
IP e route sono corretti; altrimenti lasciare scadere il tentativo. Attesi `.10/24`
e `default via 10.203.240.1 dev eth0`. Su nuova VM senza SSH, prima verificare
la configurazione da console; completare SSH alla sezione 5.

### 4.4 Router e NAT

Dal pannello del router verificare che port forwarding, DMZ, UPnP e mapping
siano disabilitati. Sullo ZTE MC888 Ultra il percorso osservato è Impostazioni
avanzate → Firewall; il firmware può chiamare diversamente le pagine. Non
serve esportare configurazioni, password o IP pubblico. Servizi LAN raggiungibili
via IP pubblico/NAT hairpin richiedono analisi separata: il deny RFC1918 da solo
non copre quel percorso.

In PS-ADMIN leggere tutti i NAT:

```powershell
ConvertTo-Json -InputObject @(Get-NetNat -ErrorAction Stop | Select-Object Name,InternalIPInterfaceAddressPrefix,Active)
```

Nella baseline iniziale era vuoto. Se esiste un NAT non nostro, fermarsi senza
cancellarlo: WSL/ICS/Docker possono avere dipendenze differenti. Per una nuova
installazione compatibile, creare solo:

```powershell
New-NetNat -Name 'Mercurion-NAT' -InternalIPInterfaceAddressPrefix 10.203.240.0/24 -ErrorAction Stop
Get-NetNatStaticMapping
```

Attesi un NAT attivo, prefisso /24, zero mapping. Non creare mapping per SSH
o per le porte dei server. Creare NAT non apre l'egress nelle ACL SSH-only.

### 4.5 Apertura controllata DNS/HTTPS

In PS-ADMIN eseguire `-Mode Plan -Policy DnsHttps`. Attesi 14 regole correnti e
19 previste, nessuna mutazione, NAT riconosciuto e Windows Public. Arrestare
Ubuntu dalla console, attendere Off; poi:

```powershell
& .\scripts\infrastructure\Set-MercurionVmNetworkAcl.ps1 -Mode Apply -Policy DnsHttps
& .\scripts\infrastructure\Set-MercurionVmNetworkAcl.ps1 -Mode Verify -Policy DnsHttps
```

Attesi `settingsReadbackVerified=true`, 19 regole e `internetEgressEnabled=true`.
Le cinque aggiunte consentono TCP/443 pubblico e TCP/UDP 53 esclusivamente
verso `1.1.1.1`/`9.9.9.9`, sotto i deny privati a priorità superiore. Non aprono
SMTP 465/587, HTTP 80 o Cloudflare 7844. Non dichiarare funzionanti provider
o tunnel non collaudati. Avviare il guest e verificare di nuovo SSH.

## 5. SSH e pacchetti del guest

Questa sezione serve alla replica nuova. Sul guest esistente i servizi sono già
installati: non reinstallarli o cambiare l'autenticazione durante la ripresa.

### 5.1 Chiave e accesso amministrativo

Su PS creare una chiave dedicata solo se non esiste già, scegliendo una
passphrase non vuota al prompt:

```powershell
ssh-keygen -t ed25519 -f (Join-Path ([Environment]::GetFolderPath('UserProfile')) '.ssh/mercurion_ed25519') -C mercurion-host-admin
```

La chiave privata rimane sull'host. Dalla console guest inserire **solo la riga
pubblica** del file `.pub` in `~/.ssh/authorized_keys` dell'utente Linux:

```bash
install -d -m 700 ~/.ssh
nano ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Sul guest, con console ancora disponibile, configurare OpenSSH affinché il
risultato effettivo sia:

```text
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
AllowTcpForwarding yes
GatewayPorts no
```

Usare `sudo nano /etc/ssh/sshd_config.d/00-mercurion.conf`; controllare gli altri
snippet/cloud-init perché OpenSSH può conservare il primo valore applicabile.
Prima di riavviare: `sudo sshd -t`, poi `sudo sshd -T` e leggere le sei voci.
Applicare con `sudo systemctl restart ssh`. I forward richiesti sono locali;
`GatewayPorts no` impedisce di trasformarli implicitamente in listener pubblici.
L'accesso al Docker socket resta root/sudo: non aggiungere l'utente al gruppo
`docker` come scorciatoia.

Nel file host `%USERPROFILE%/.ssh/config` aggiungere/adattare un solo blocco:

```sshconfig
Host mercurion-server
    HostName 10.203.240.10
    User <proprio-utente-ubuntu>
    IdentityFile ~/.ssh/mercurion_ed25519
    IdentitiesOnly yes
    ServerAliveInterval 15
    ServerAliveCountMax 2
```

Sostituire il segnaposto dell'utente, non incollare password. In console Ubuntu
leggere `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`; confrontare
il fingerprint con quello mostrato dal primo `ssh mercurion-server` sull'host.
Confermare solo se coincide. Una VM nuova avrà un fingerprint diverso da quello
storico dell'autore. Non usare `StrictHostKeyChecking=no` o cancellare known_hosts
per ignorare una variazione non spiegata. Aprire una nuova shell SSH ordinaria
prima di considerare completo l'accesso.

### 5.2 Docker Engine: installazione nuova, non ripetere sulla VM attuale

Con la rete DnsHttps attiva, i repository Ubuntu usati da APT devono usare
**HTTPS**: TCP/80 non è autorizzato. Controllare `/etc/apt/sources.list.d/ubuntu.sources`
e gli eventuali file legacy con l'editor; cambiare solo gli URI dei mirror
Ubuntu HTTP in equivalenti HTTPS supportati, senza alterare suite/firme.
Se il mirror non offre HTTPS, scegliere un mirror Ubuntu HTTPS autorizzato:
non aprire l'egress indiscriminatamente. Da console/SSH Ubuntu:

```bash
sudo apt update
sudo apt install ca-certificates curl python3 openssh-server
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Creare `/etc/apt/sources.list.d/docker.sources` con editor, usando architettura
`amd64` e suite `resolute` per Ubuntu 26.04:

```text
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: resolute
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
```

Poi `sudo apt update` e `apt-cache madison docker-ce docker-ce-cli` per conoscere
le versioni effettivamente disponibili. Su un'installazione nuova senza pacchetti
Docker concorrenti:

```bash
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker version
sudo docker compose version
```

Il comando installa la stable disponibile, non garantisce le versioni storiche.
Per un pin ripetibile registrare le stringhe APT complete selezionate e
archiviare i `.deb`; non inventare suffissi di versione o usare un'altra suite
per superare un errore. La procedura iniziale dell'autore non ha conservato quel
manifest APT: è un limite alla riproduzione binaria dell'OS, non un segreto da
recuperare. La nuova baseline deve superare gli stessi inventari/probe.
Non usare lo script convenience, socket TCP Docker o `chmod 666` sul socket.
Non rimuovere pacchetti/volumi di un sistema già usato per fare coincidere questo
esempio. Il [riferimento Docker](https://docs.docker.com/engine/install/ubuntu/)
conferma Ubuntu 26.04 supportata; i dettagli possono evolvere.

## 6. Verifiche prima del bootstrap reale

Le prove negative richiedono controlli positivi e route effettive. Un timeout
contro una porta chiusa o una subnet non instradata non prova il firewall.
I comandi usati e i risultati sono raccolti in
[VERIFICATION-PROCEDURE.md](VERIFICATION-PROCEDURE.md); è parte di questo runbook,
non un invito a ricostruire le prove dalla chat.

Ordine: inventario host/guest → SSH → H-02 guest→host → H-04 due bridge→host
(che consegna l'immagine tool) → H-06 DNS/HTTPS → nove casi porte private → Android LAN con controlli → reboot
host/guest e ripetizione → inventario IPv6 → fixture Compose 33 casi.
Usare sempre `-Policy DnsHttps` nei Verify dopo l'apertura egress.

La baseline ha superato quei percorsi nel perimetro registrato, ma **H-05,
A-05 e A-30 restano parziali**. Le prosecuzioni verso fixture, pilot sintetici
e server privati sono state autorizzate in modo limitato, non come accettazione
globale o via libera a un tunnel pubblico. Una replica non eredita le evidenze
di traffico del computer dell'autore.

## 7. Configurazione privata, una sola volta

Su PS, root Web, senza avviare applicazioni:

```powershell
powershell -NoProfile -File scripts/infrastructure/New-PreviewConfiguration.ps1
```

Atteso file `%USERPROFILE%/.mercurion/preview/configuration.json`, directory con
sole ACL utente corrente/SYSTEM e senza ereditarietà esterna. Se esiste già,
lo script si ferma: non cancellarlo, non rigenerare segreti per far proseguire
il comando. Custodire una copia privata secondo il proprio password manager.

Il generatore produce password interne indipendenti, HMAC e coppie RSA HTTP/WS
da 3072 bit. `APP_AES_SECRET` decodifica esattamente 32 byte per AES-256-GCM.
Se si replica il generatore corretto non serve alcuna riparazione. Solo sul
vecchio file iniziale da 64 byte, **prima del primo uso**, esiste:

```powershell
powershell -NoProfile -File scripts/infrastructure/Repair-PreviewGeneratedAes.ps1
```

Non è rotazione di un sistema già avviato. Il backup `.pre-aes32.backup` è
privato quanto il file attivo. Nell'installazione attuale la riparazione è già
stata eseguita e confermata: non ripeterla.

### 7.1 Campi da compilare nell'editor privato

Tutti i valori `providers` sono stringhe non vuote, compresi numero porta e
booleani rappresentati come testo. La validazione definitiva avviene tramite
script e schema Nest; non mettere `null` per aggirare un requisito.

| Famiglia | Campi nel file |
| --- | --- |
| Email | `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_SECURE`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`, `EMAIL_DEFAULT_FROM` |
| SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` |
| Turnstile | `CLOUDFLARE_SECRET_KEY`; la site key è pubblica nel build Angular |
| Google / Discord | rispettivi `*_CLIENT_ID`, `*_CLIENT_SECRET` |
| ORCID | `ORCID_CLIENT_ID`, `ORCID_CLIENT_SECRET`, `ORCID_ISSUER` coerente con registrazione reale/sandbox |
| Non usati in questo preview | `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`: ciascuno `unused-preview` |

Dropbox non viene usato nel runtime previsto; GitHub/LinkedIn sono già vietati
dal percorso SSO corrente. I placeholder soddisfano il contratto di bootstrap,
non attestano l'integrazione di quei provider. Non disabilitare Turnstile, auth
o cookie secure per un primo avvio.

Origin/callback derivati: `https://preview.mercurion.app`; percorsi
`/api/oauth2/sso/Google/callback`, `/Discord/callback`, `/ORCID/callback`
sotto lo stesso prefisso `/api/oauth2/sso`. Gli endpoint legacy inutilizzati
non richiedono nuove registrazioni provider. DNS e tunnel pubblico non sono
creati da questa configurazione. Non si dichiara verificato alcun provider reale.

`meilisearchServer.masterKey` è la master **server/root**, da conservare anche
nel password manager. I campi `meilisearchClients.searchKey` e `logKey` restano
vuoti fino alla sezione 11. La variabile Nest dal nome legacy
`MEILISEARCH_MASTER_KEY` riceverà **searchKey**, mai la master server.

Salvare e chiudere il file, poi validare soltanto la parte infrastrutturale:

```powershell
python -B scripts/infrastructure/preview_credentials.py validate --file (Join-Path ([Environment]::GetFolderPath('UserProfile')) '.mercurion/preview/configuration.json') --infrastructure-only
```

Atteso `status=valid`; nessun valore deve essere stampato. Non caricare il file
su Git, CI, chat, backup pubblico o in un contesto Docker. Gli script di build
leggono blob Git consentiti, non quel file, `.env` operativi o PEM personali.

## 8. Preparare e archiviare le immagini sull'host

Seguire [ARTIFACT-REPRODUCTION.md](ARTIFACT-REPRODUCTION.md), che contiene
selezione degli SHA e CI, modello Tox21 senza nuovo training, materializzazione
dei sorgenti, build Web/server/broker, export/SBOM/scan, assemblaggio e verifica.
Tutti gli script richiamati sono versionati, senza percorsi dell'autore obbligatori.
La VM non deve compilare sorgenti o scaricare immagini da registry.

Non basta scaricare gli artifact GitHub: i tar runtime completi non sono
pubblicati dalla CI attuale. L'esportazione sull'host è un passaggio necessario.
Archiviare il bundle pubblico con checksum e una copia indipendente, oltre al
pacchetto modello; conservare separatamente i segreti stabili e le ricevute.
Una ricostruzione futura deve superare uno scan aggiornato a zero, non limitarsi
al report storico allegato alla guida.

## 9. Primo bootstrap dei quattro server, solo su risorse nuove

Questa sezione è già completata sulla VM attuale. Il candidato a otto immagini
serve alla preparazione, ma il bundle server trasferisce **solo quattro** immagini.
In PS, selezionare `$taskCandidate` e `$taskServerBundle` prodotti dall'appendice:

```powershell
python -B scripts/infrastructure/preview_server_bundle.py prepare --candidate $taskCandidate --output $taskServerBundle
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewServerBootstrap.ps1 -BundlePath $taskServerBundle
```

Prima della seconda chiamata la directory deve essere nuova; la chiamata senza
`-Execute` verifica soltanto il bundle pubblico. Attesi `server-bundle-verified`
e `public-bundle-verified`, `privateConfigurationRead=false`, quattro server.
Le immagini e il codice di consegna possono avere revisioni distinte, entrambe
esplicitate: gli aggiornamenti dei wrapper non obbligano a ricompilare immagini
applicative immutate. Richiedere CI verde sull'esatto commit degli strumenti.

VM accesa e LUKS sbloccato, file privato chiuso nell'editor; eseguire da PS:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewServerBootstrap.ps1 -BundlePath $taskServerBundle -Execute
```

Passphrase SSH e sudo solo nel terminale. Non usare transcript/tee del dialogo
completo. Il wrapper esegue:

1. Validazione pubblica e marker host esclusivo; lettura del file privato
   soltanto nel processo dell'operatore.
2. SCP del bundle pubblico in `~/vm043-servers-<runId>`.
3. Manifest fissato per hash e copia verificata in
   `/opt/mercurion/releases/server-<runId>`, root-owned. I mode SCP `0664/0666`
   di Windows non danno fiducia al sorgente: ogni contenuto deve corrispondere
   agli hash, la destinazione protetta non è scrivibile da gruppo/altri.
4. Preflight di IP/route, Docker Unix socket locale, spazio e assenza di
   progetti/reti/volumi canonici preesistenti. Load/save dei quattro archivi,
   config digest confrontati; un Docker ID di un altro daemon non è sufficiente.
5. Solo documenti server via stdin SSH → `/run/mercurion-preview/<runId>`
   tmpfs. Provider, JWT/RSA e chiavi client restano sull'host. Root applica
   file `0400` per i consumer e rimuove il payload dall'inbox.
6. Avvio privato dei progetti `mercurion-shared`, `mercurion-preview` e verifiche:
   ruolo Postgres non-superuser/vector 0.8.7, Redis auth/Exg, NATS auth obbligatoria,
   Meili health e API amministrativa negata senza credenziale.

| Consumer | UID:GID | Materiale attivo / persistenza dati |
| --- | --- | --- |
| PostgreSQL | `70:70` | due password su tmpfs; volume `mercurion_preview_postgres` |
| Redis | `999:1000` | `server.conf` su tmpfs; volume `mercurion_preview_redis` |
| NATS | `10021:10021` | `server.json`, due credenziali consumer distinte; nessun volume JetStream previsto |
| Meilisearch | `10001:10001` | `server.toml` con master; volume `mercurion_shared_meili` |

I nomi effettivi dei volumi derivano dai manifest versionati; leggerli anche
nella ricevuta/proiezione prima di operare. L'hook PostgreSQL inizializza solo
un cluster nuovo; il modello di cold start Nest/schema applicativo è un passo
successivo, non una migrazione già avvenuta.

Attesi JSON `status=passed`, quattro `ownedContainers`, tutte le `checks=true`,
`publishedPorts=false`, `applicationServicesStarted=false`,
`isolationAccepted=false`, `reportPath` locale e `meilisearchAddress` privato.
Il report non contiene credenziali. Non aprire file server/segreti per diagnosticare
una fase se bastano stato, ricevute e identità pubbliche.

### 9.1 Fallimenti e recupero circoscritto

- **SCP del report fallisce dopo `passed`:** recuperare solo il JSON con SCP
  dalla release protetta, in una destinazione locale nuova. Non ripetere load/avvio.
- **Il loader fallisce prima di creare la release protetta:** esiste la ripresa
  esplicita `-ResumePublicCopy`, una sola volta, che riusa il trasferimento pubblico.
  Richiede marker failed in guest-preflight-and-load, nessuna ricevuta locale e
  `servicesStarted=false`; la destinazione guest già esistente blocca il loader.
  Non usare questa opzione su errori successivi o come cold recovery.
- **Creazione parziale / readiness fallita:** preservare volumi e risorse del run;
  correlare ultima fase e report. Nessun reset dati, nuova password o pulizia
  Docker globale. L'avvio iniziale non è automaticamente ritentabile.

La [procedura dettagliata VM-043](PREVIEW-SERVER-BOOTSTRAP.md) conserva il caso
reale del primo errore mode SCP e la sua ripresa riuscita.

## 10. Tunnel amministrativo Meilisearch

Ricavare l'IP dalla ricevuta del bootstrap, non dall'indirizzo di un container
QA. Nel run attuale è `172.18.0.2`. Non è un indirizzo statico garantito dopo
recreate o nuovo daemon. In una **finestra PS dedicata**:

```powershell
ssh -N -T -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -o ClearAllForwardings=no -L 127.0.0.1:17700:172.18.0.2:7700 mercurion-server
```

Sostituire solo l'IP privato quando una nuova ricevuta ne documenta uno diverso.
Dopo la passphrase è normale non avere output: `-N` non apre una shell. Lasciare
la finestra aperta; Ctrl+C chiude soltanto il forward. Non usare `-g` o bind
`0.0.0.0`. La porta deve essere libera prima dell'avvio; in caso di collisione
non terminare altri processi senza identificarli.

Nel **secondo PS**:

```powershell
curl.exe --silent --show-error --max-time 5 --noproxy '*' http://127.0.0.1:17700/health
curl.exe --silent --show-error --max-time 5 --noproxy '*' -o NUL -w '%{http_code}' http://127.0.0.1:17700/keys
```

Attesi `{"status":"available"}` e `401` senza autorizzazione. Nessuna master
in argv. Le due procedure curl della sezione 11 raccolgono la master con
`Read-Host -AsSecureString`, la consegnano a curl via stdin e ripuliscono il BSTR
alla fine. Un errore di permessi non è risolto inserendo la master in Compose,
nel frontend o fra i segreti Nest.

## 11. Operazioni curl dell'operatore

Non servono UI, AI, SDK o script locali fuori dal repository. Le procedure
versionate seguenti eseguono `curl.exe` nel terminale personale: la master non
è persistita dallo script e nessun output contiene chiavi applicative.

### 11.1 Quattro indici dei log — completato

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewMeiliLogIndexes.ps1
```

Inserire al prompt la master generata, dal password manager. La procedura
controlla gli indici preesistenti, crea quelli mancanti con `primaryKey=id`,
attende i task `indexCreation` e rilegge ogni indice. Un indice già presente
con altra primary key blocca le scritture; non viene modificato o cancellato.

| Indice | Ambito |
| --- | --- |
| `logs_staging` | sistema preview |
| `security_logs_staging` | audit preview |
| `logs_production` | sistema production, senza avviare lo stack production |
| `security_logs_production` | audit production, senza avviare lo stack production |

Atteso `LOG_INDEXES_READY`, `count=4`, quattro record `ready`, `apiKeysCreated=false`.
Sul run attuale i task sono 0–3: sono evidenza di quel server, non costanti da
imporre a un'altra installazione. Non creare ancora ChEMBL con un primary key
presunto: import/schema devono essere definiti nel lavoro successivo.

### 11.2 Due chiavi client — completato il 12 novembre

**Completato sulla VM dell'autore:** MEILI_CLIENT_KEYS_READY, due chiavi a 90
giorni e quattro negazioni 403 riuscite. Non ripetere sulla configurazione
già compilata. Su una nuova installazione salvare e chiudere
il file privato nell'editor. Tunnel aperto, secondo PS nella root Web:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewMeiliClientKeys.ps1 -Expiry 90Days
```

L'operatore ha scelto **90 giorni dalla creazione iniziale**. Lo script:

1. Verifica percorso privato sotto il profilo Windows e ACL utente/SYSTEM.
   Rifiuta reparse point, campi client già compilati o materiali backup/pending
   precedenti, prima di proseguire. Non modifica automaticamente ACL.
2. Richiede la master al prompt ed effettua richieste curl con header su stdin.
3. Verifica i quattro indici; crea o rilegge due UID stabili, controllando
   identità, azioni, indici e validità. Il riuso non estende la scadenza.
4. Esegue quattro negazioni read-only (gestione chiavi e lettura log); non
   scrive documenti di prova nei log della VM.
5. Aggiorna solo `meilisearchClients.searchKey` e `logKey` nel file privato,
   con pending esclusivo, controllo di modifica concorrente e sostituzione
   atomica. Conserva `configuration.json.pre-meili-keys.backup`, anch'esso privato.

| Campo | Azioni | Indici | UID operativo |
| --- | --- | --- | --- |
| `searchKey` | `search`, `documents.get` | `molecule_previews_chembl_36`, `molecule_details_chembl_36` | `6d3c5a97-a1be-5e5d-b595-b006d557b090` |
| `logKey` | `documents.add` | `logs_staging`, `security_logs_staging` | `16dbd72a-9663-542f-9220-63122b77a750` |

Nessuna wildcard, `indexes.create`, gestione chiavi o accesso ai log production
nelle grant applicative. La master server non viene sostituita/ruotata; i default
interni di Meili non vengono eliminati implicitamente. La rotazione prima della
scadenza delle API key richiede un futuro intervento esplicito: non basta
rieseguire lo script sopra una configurazione già compilata.

Atteso `MEILI_CLIENT_KEYS_READY`, due UID, `expiryPolicy=90Days`,
`readOnly403Checks=4`, `otherFieldsChanged=false`, `valuesPrinted=false`.
Conservare solo quel JSON in un registro pubblico; non mostrare il file privato.
Un errore non autorizza retry/cancellazione/rotazione. Eventuali chiavi già create
sono identificabili dagli UID pubblici, mentre il file originale resta conservato.

Dopo un futuro esito positivo, validare la configurazione applicativa completa:

```powershell
python -B scripts/infrastructure/preview_credentials.py validate --file (Join-Path ([Environment]::GetFolderPath('UserProfile')) '.mercurion/preview/configuration.json')
```

Atteso `valid`; è validazione locale dello schema, non prova che provider reali,
callback, email, SMS o dati ChEMBL funzionino. Il bootstrap applicativo non è
ancora un comando consegnato da questo runbook.

## 12. Punto di ripresa concordato per il giorno successivo

**Aggiornamento 12 novembre:** ripartenza dei quattro server confermata, sei
controlli riusciti nella verifica `d2cfff6e2a204c27ac3362f4d9e59fbf`. Meili
è a `172.18.0.2`. Proseguire con tunnel amministrativo (sezione 10) e chiavi
client (11.2), senza ripetere il recupero.

1. Non ripetere generazione file, riparazione AES, bootstrap server o creazione
   indici: sono già conclusi. Anche le chiavi della sezione 11.2 sono state create il 12 novembre;
   il lavoro aperto è il bootstrap applicativo privato.
2. Se la **VM è rimasta accesa senza riavvio**, verificare la disponibilità SSH.
   Il forward può essere riaperto con la sezione 10; il tunnel non deve restare
   aperto durante la notte per conservare server o dati.
3. Se VM/host sono stati spenti, riavviati o hanno perso la RAM, **non assumere
   presenti i file tmpfs**. Leggere la sezione 13 prima di tentare qualsiasi avvio.
4. Con tunnel disponibile verificare `/health`. In caso di errore ripartire
   dalla diagnosi, non generare nuove credenziali o riavviare Compose a caso.
5. Il comando chiavi `-Expiry 90Days` è concluso sulla VM attuale. Non
   rieseguirlo per riprendere il bootstrap applicativo.

**Stato al momento della pausa:** quattro server e quattro indici pronti;
chiavi client create il 12 novembre; servizi applicativi spenti; nessuna porta pubblicata;
H-05/A-05/A-30 aperti; nessun merge autorizzato.

## 13. Arresto, file volatili e ripristino: limite operativo attuale

`restart: 'no'` rende l'avvio intenzionale. `/run/mercurion-preview/<runId>/active`
è **tmpfs**: dopo spegnimento/reboot guest il contenuto non è persistente. LUKS
protegge il disco, non trasforma tmpfs in un archivio. I volumi PostgreSQL/Redis/
Meili sopravvivono, ma le configurazioni montate e i segreti devono essere
riconsegnati con gli **stessi valori** prima di ricreare correttamente i container.

Il percorso di cold recovery dei server reali è ora predisposto in
[COLD-RECOVERY.md](COLD-RECOVERY.md), con ripartenza sulla VM verificata il
12 novembre (sei controlli riusciti; ricevute nel registro). Non mascherarlo con il bootstrap iniziale: i suoi controlli sulle
collisioni fermano correttamente il riuso di volumi/progetti esistenti. Non usare
`docker compose down -v`, `docker system prune`, password nuove o database vuoti
per ottenere un avvio apparentemente riuscito.

Se serve arrestare il guest: salvare il lavoro e usare `sudo shutdown -h now`;
evitare Turn Off forzato. Prima di avviare i server dopo un reboot, seguire l'inventario e il recupero
circoscritto documentati, usando il file privato stabile e la release originale.
Non considerare completata la verifica finché non è disponibile la ricevuta finale.
**Ripresa del 12 novembre:** l'operatore ha confermato spegnimento/riavvio.
Seguire [Recupero dopo riavvio](COLD-RECOVERY.md), iniziando dall'inventario
sanitizzato della release. Inventario, ripartenza e sei controlli di readiness/persistenza sono riusciti;
non ripeterli durante la sessione corrente per passare alle API key.

## 14. Diagnosi senza esporre segreti

| Sintomo | Lettura utile / azione |
| --- | --- |
| SSH timeout prima della passphrase | Console Hyper-V: LUKS, stato eth0/IP/route; host alias `ssh -G`, switch/ACL/NAT/profili. Non cambiare chiavi per un timeout |
| Fingerprint SSH diverso | Confrontare console con chiave fidata; fermarsi se la variazione non è spiegata |
| Passphrase ripetuta | OpenSSH usa connessioni separate per SCP/SSH. Il servizio ssh-agent non viene abilitato implicitamente |
| Prompt sudo in ritardo | Attendere il prompt; sudo e passphrase sono diversi. Non registrare il dialogo o passare password con argv/pipe |
| YAML `expected sequence` | Verificare `- to:` e indentazione di `via:`; generate prima di try, mai tab |
| Inventario `incomplete=true` | Leggere `errors` e `executionContext`, esecuzione diretta in PS-ADMIN; non dichiararlo un risultato di rete |
| Probe `not-reachable` | Correlare nonce/orari/controlli positivi; da solo non dimostra isolamento |
| Meili HTTP 401 con master | Rileggere dal proprio password manager il valore server, tunnel/IP e formato; non stamparlo |
| Writer HTTP 403 su gestione/lettura | Atteso con grant limitata; non fornire master all'app per superarlo |
| Fallimento API key a metà fase | Conservare UID pubblici, pending/backup e file originale. Review prima di una riconciliazione; niente cancellazioni automatiche |
| Report assente dopo remoto `passed` | Recuperare solo il file via SCP, senza rieseguire il task remoto |
| Bootstrap trova rete/volume esistente | Distinguere prima installazione da recovery; preservare i dati, non rimuovere guardie |

Non usare inspect completi, `cat` dei file segreti, `.env`, PEM o log grezzi
come prima diagnostica. Leggere stato/exit code, reti, immagini, mount metadata e
ricevute sanitizzate. La password amministrativa Meili non va nella cronologia,
in `-H` con valore letterale, negli artifact o nei file Compose.

## 15. Cosa resta fuori da questo traguardo

Il passaggio successivo è ora descritto in
[APPLICATION-BOOTSTRAP.md](APPLICATION-BOOTSTRAP.md): preparazione dei quattro
export, bundle applicativo e un solo comando di primo avvio privato, con
controlli incorporati. È collaudato localmente; l'esito sulla VM deve essere
registrato dopo l'esecuzione dell'operatore. Il recupero giornaliero dell'intero
stack e l'accesso pubblico restano successivi.

La guida arriva intenzionalmente al punto raggiunto: non descrive come completati
bootstrap Nest/Angular/Tox21 persistenti, inizializzazione dello schema applicativo,
import ChEMBL, login/MFA/WS/provider reali, configurazione proxy/header/cookie,
Cloudflare/Access/DNS, UI Meili, produzione, backup/restore dati o cold recovery.
Per questi lavori vedere [ROADMAP.md](ROADMAP.md) e [ACCEPTANCE.md](ACCEPTANCE.md).
Nessun requisito di «demo perfetta» sostituisce le verifiche dichiarate; nessun
risultato di questo runbook costituisce accettazione pubblica o forense.
