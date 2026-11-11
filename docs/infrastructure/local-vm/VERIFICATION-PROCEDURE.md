# Procedura delle verifiche di rete, fixture e segreti

Appendice eseguibile del [runbook](RUNBOOK.md). I test non si eseguono durante
una pausa operativa o come effetto collaterale della lettura di questo documento.
Le prove di reboot qui sono **precedenti al bootstrap persistente**: dopo
VM-043 leggere prima la sezione 13 del runbook sui file tmpfs.

## 1. Regole comuni e registrazione

Per ogni prova conservare data UTC, sorgente/destinazione/porta, run-id/nonce,
identità immagine/script, config applicata, controlli positivi prima/durante/dopo,
esito, percorso report e cleanup. Non registrare dialoghi di password o segreti.
L'ora `...+00:00` è UTC: l'11 novembre Roma è UTC+1. Per esempio 17:18:05 UTC
corrisponde a 18:18:05 locale, non 18:05. Non usare un nonce oltre expiresAtUtc.

`isolationAccepted=false` è intenzionale in questi report. Nessun singolo
timeout promuove l'accettazione complessiva. Errori nel controllo positivo
invalidano il confronto; non disabilitare il firewall per ottenere una risposta.

Root Web sul Windows host; comandi `powershell -File ...` eseguibili anche
come `& .\scripts\...` dentro Windows PowerShell 5.1. PS-ADMIN soltanto dove
esplicitato. L'alias SSH e il Netplan statico devono già essere corretti.

## 2. Inventari e SSH

In PS-ADMIN:

```powershell
& .\scripts\infrastructure\Get-LocalVmHostInventory.ps1
& .\scripts\infrastructure\Get-StaticNetworkMigrationInventory.ps1
& .\scripts\infrastructure\Set-MercurionVmNetworkAcl.ps1 -Mode Verify -Policy DnsHttps
```

Attesi inventario completo, IP host `.1/24`, vNIC unica sullo switch Internal,
MAC noto, NAT attivo senza mapping e 19 ACL della policy DnsHttps. In Kaspersky
confermare manualmente Pubblica sulla riga connessa dell'Internal.

In PS ordinaria:

```powershell
scp scripts/infrastructure/inspect-local-vm-guest.sh mercurion-server:inf-vm-02-inventory.sh
ssh -t mercurion-server 'sudo bash ~/inf-vm-02-inventory.sh'
```

Eseguire le **due righe separatamente**. La prima non include un secondo comando
ssh come argomento di scp. In Ubuntu leggere inoltre:

```bash
ip -brief address show eth0
ip -4 route show
sudo sshd -T
lsblk -f
```

Confrontare rete/gateway, auth SSH, root LUKS e forwarding con il runbook. Non
esportare header LUKS o materiale di chiavi. Non considerare Hyper-V IPAddresses
vuoto una prova che Ubuntu non abbia indirizzi.

## 3. H-02: nuova connessione guest → host

Servono due finestre PS normali. Nella prima avviare il canary sul solo IP
della vEthernet interna; il percorso ha il formato atteso dal runner:

```powershell
$taskCanary=Join-Path ([Environment]::GetFolderPath('UserProfile')) ('.codex/artifacts/inf-vm-02/h02-ipv4-'+[Guid]::NewGuid().ToString('N'))
python -B scripts/infrastructure/network_canary.py serve --bind 10.203.240.1 --output $taskCanary --seconds 600
```

Attesi JSON ready con port/nonce/readyAt/expiresAt e controlli locali positivi.
Non chiudere la finestra. Nella seconda, entro la finestra temporale:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-GuestCanary.ps1
```

Il runner seleziona il canary attivo, verifica IP/nonce/deadline, trasferisce
il solo probe e tenta TCP dalla VM. Atteso `not-reachable`; correlare con
`result.json` del server, atteso `controls-passed`, `closed=true`. Attendere la
chiusura automatica o usare il file `stop` nel percorso della propria prova,
senza terminare processi non identificati. Nessuna password viene catturata.

## 4. Immagine Python dei probe: input esplicito

H-04/06, fixture e alcuni test usano l'immagine tool Linux amd64 fissata:

```text
python@sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79
```

Non è l'immagine Tox21. Su una nuova postazione può essere recuperata dal
registry con quel digest o da un archivio verificato. I runner correnti
richiedono anche il corrispondente image ID locale; verificare:

```powershell
docker --context desktop-linux pull python@sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79
docker --context desktop-linux image inspect python@sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79 --format '{{.Id}} {{.Os}}/{{.Architecture}}'
```

Questa è una dipendenza tecnica da conservare, non un artifact generato da AI.
Prima di un nuovo impiego applicare la policy CVE vigente anche alla selezione
degli strumenti: non è allegata qui una nuova certificazione security di questa
vecchia immagine tool. Se un nuovo scan la respinge, oppure il daemon ricostruisce
un ID diverso, fermarsi e aggiornare deliberatamente le costanti dei runner e
le prove; non saltare la guardia o dichiarare eseguito H-04 con un'altra immagine.
I risultati storici restano riferiti alla selezione originaria.

## 5. H-04, poi H-06: container/host ed egress

H-04 esporta dall'host la Python già locale e la carica sul guest; va quindi
prima di H-06 su un guest nuovo che non ha ancora quell'immagine. Il runner
avvia da solo un canary host temporaneo, due container e un bridge temporaneo:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-ContainerCanary.ps1 -ValidateOnly
powershell -NoProfile -File scripts/infrastructure/Invoke-ContainerCanary.ps1
```

Passphrase e sudo nel terminale. Attesi due casi, controlli container prima/dopo
`reachable`, hostProbe `not-reachable`, cleanupErrors vuoti e controlli host
correlati. I bridge e i container sono soltanto quelli etichettati dal run;
il runner non cambia ACL e non pubblica porte sulla VM.

Poi DNS/HTTPS pubblico, da guest e due bridge:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-EgressProbe.ps1
```

Attesi tre `dns-https-reachable`, TLS verificato e HTTP 200 su
`https://docs.python.org/3/`, cleanup senza errori. Non certifica SMTP, SMS,
OAuth, PubChem o egress Cloudflare. Ripetere H-02/H-04 dopo ogni cambiamento
di policy che potrebbe alterare i confini privati.

## 6. Porte private già permesse verso Internet

Questo test serve a verificare che gli allow pubblici non superino i deny
privati per TCP/443 e TCP/UDP 53:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-PrivatePortProbe.ps1
```

Il runner rileva anche il DNS host sul Default Switch attuale, senza assumere
che la sua subnet sia rimasta uguale. Avvia i controlli host, verifica la loro
prontezza, poi esegue nove casi guest/due bridge e recupera il report. Attesi
`caseCount=9`, `observed-path-not-reachable`, controlli host positivi e cleanup
valido. Se `host/result.json` dice non pronto, nessun esito guest è passato;
diagnosticare quel report senza aprire porte o filtri. Il numero dei controlli
positivi dipende dalla durata, non deve coincidere con un run storico.

## 7. Endpoint LAN controllato con Android/Termux

Non serve un secondo PC o un agent. Il telefono deve essere sulla LAN
dell'host, non su rete mobile/VPN. Annotare il suo IPv4 dalle impostazioni
Wi-Fi, senza riportare SSID/password/MAC. Nella prova originaria era
`192.168.0.218`, ma non è un indirizzo prenotato per tutte le repliche.

1. Installare Termux dalla distribuzione F-Droid del pacchetto `com.termux`.
   Se è già installato da altra fonte, non sostituirlo automaticamente.
2. In Termux: `pkg update && pkg install python && python --version`.
3. Scaricare il canary pubblico fissato, verificandone i byte. Il seguente pin
   è la revisione realmente usata sul telefono, non «latest»:

   ```bash
   python -c "import hashlib,urllib.request; d=urllib.request.urlopen('https://raw.githubusercontent.com/giuliomarinelli/MercurionWeb/263708b3a7ef08648fdcfdbc5209dae59d292864/scripts/infrastructure/network_canary.py',timeout=20).read(); assert hashlib.sha256(d).hexdigest()=='52b73178ea7394ba310259c10f93ee203c74bccb04e27466d07813605df0f01b','HASH_MISMATCH'; f=open('mercurion_network_canary.py','xb'); f.write(d); f.close(); print('CANARY_SHA256_OK')"
   ```

   Il file non viene sovrascritto se esiste. In quel caso controllare il suo
   hash invece di aggiungere opzioni forzate. Il sorgente è leggibile anche
   dalla storia Git del repository, senza servizi AI.
4. Prova locale di due secondi, sostituendo l'IPv4 con quello effettivo:

   ```bash
   python -B mercurion_network_canary.py serve --bind 192.168.0.218 --output android-smoke-01 --seconds 2
   ```

   Attesi ready e poi `controls-passed`, `closed=true`. Output directory nuova.
5. Finestra di misura, tenendo Termux visibile:

   ```bash
   python -B mercurion_network_canary.py serve --bind 192.168.0.218 --output android-lan-01 --seconds 600
   ```

6. Dal JSON iniziale del telefono trascrivere esattamente porta, nonce e due
   timestamp UTC nel seguente configuratore PS. Gli identificatori sono
   pubblici, non credenziali. Non attendere che il canary finisca:

   ```powershell
   $taskLanDir=Join-Path ([Environment]::GetFolderPath('UserProfile')) ('.mercurion/artifacts/android-ready-'+[Guid]::NewGuid().ToString('N'))
   [void][IO.Directory]::CreateDirectory($taskLanDir)
   $taskLanConfig=@{runId=[Guid]::NewGuid().ToString('N');address=(Read-Host 'IPv4 Wi-Fi Android');port=[int](Read-Host 'Porta JSON Android');nonce=(Read-Host 'Nonce JSON Android');readyAtUtc=(Read-Host 'readyAtUtc JSON Android');expiresAtUtc=(Read-Host 'expiresAtUtc JSON Android')}
   $taskLanConfig | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $taskLanDir 'config.json')
   powershell -NoProfile -File scripts/infrastructure/Invoke-LanCanary.ps1 -ConfigPath (Join-Path $taskLanDir 'config.json')
   ```

   Il runner valida la finestra, il collegamento Wi-Fi Windows e il controllo
   positivo Windows→Android; poi guest e due bridge tentano TCP al canary.
   Attesi tre casi `observed-path-not-reachable` e controlli host correlati.
   Non conta l'assenza di route come negazione firewall equivalente.
7. Attendere in Termux `controls-passed`, `closed=true`; nessun processo server
   deve rimanere aperto. Conservare quel risultato, oltre ai report host.

Per la direzione Android→VM, il seguente probe tenta solo TCP/22, senza login:

```bash
python -c "import socket,json; s=socket.socket(); s.settimeout(3); c=s.connect_ex(('10.203.240.10',22)); print(json.dumps({'target':'10.203.240.10','port':22,'connectCode':c,'connected':c==0})); s.close()"
```

Correlare con SSH positivo dall'host prima/dopo. Se manca una route Android
verso la subnet Internal, il timeout **non prova** la whitelist delle origini
Hyper-V. Non creare bridge, route LAN o mapping per costruire artificialmente
il test. Questo limite mantiene H-05 parziale.

## 8. IPv6 e riavvio della baseline, non dello stack attivo

Il collector è read-only:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-Ipv6Readiness.ps1
```

Atteso inventario completo. Nella baseline il kernel IPv6 è disponibile ma eth0
non ha unicast IPv6, manca default route e i bridge hanno EnableIPv6 false.
Questo è un risultato di configurazione, non un test sperimentale di tutti i
filtri IPv6. Il vecchio `Invoke-GuestIpv6Canary.ps1` punta al **Default Switch**:
è storico e non va usato come certificazione dell'Internal attuale. Il firewall
router non vede necessariamente il traffico locale host/guest/container.

Prima di un bootstrap reale: salvare lavoro, `sudo shutdown -h now`, attendere
Off, inventario host, riavviare Windows, inventario dopo. Verificare NAT/IP/ACL,
Windows Public e Kaspersky Pubblica; avviare la VM, sbloccare LUKS, verificare
SSH/IP/route e ripetere H-06 e nove porte private. Controllare anche WSL/Docker
Desktop, senza fermare o pulire servizi altrui. La prova storica ha verificato
questi passi; non è prova di cold recovery dello stack, allora non avviato.

## 9. Fixture Compose: 16 ruoli, 13 reti, 7 volumi

I file sotto `deployment/local-vm/{shared,preview,production}` sono **fixture**
Python e non applicazioni. Non confonderli con `operational/`. Con immagine
Python già presente sul guest, da PS:

```powershell
node scripts/check-local-vm-compose.mjs
powershell -NoProfile -File scripts/infrastructure/Invoke-TopologyFixtures.ps1 -ValidateOnly
powershell -NoProfile -File scripts/infrastructure/Invoke-TopologyFixtures.ps1 -Execute
```

Le validazioni statiche verificano topologia, matrice e mutazioni negative;
non sono prove di rete. L'esecuzione VM controlla identità immagini/assenza di
collisioni, modelli Compose e famiglie delle reti; avvia 16 fixture, misura
15 allow e 18 deny e rimuove soltanto risorse possedute dal run.
Attesi `status=passed`, `caseCount=33`, cleanup senza errori. Errori non
autorizzano a rimuovere risorse canoniche o rilanciare senza diagnosi.

## 10. Pilot dei segreti e RPC: distinto dalle credenziali reali

Questi passi sono stati eseguiti prima di VM-043. Servono alla riproduzione
delle prove, non vanno riavviati ora per proseguire con le API key:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-SyntheticSecretDelivery.ps1 -Environment preview -Execute
```

Annotare run-id e sei fasi fino a code-removed. Non avvia servizi. Ritirare
**solo quel run-id**, sostituendo il segnaposto con l'identificatore ricevuto:

```powershell
$taskSyntheticRunId=Read-Host 'Run-id della propria prova sintetica'
powershell -NoProfile -File scripts/infrastructure/Invoke-SyntheticRunRetirement.ps1 -RunId $taskSyntheticRunId -Execute
```

Attesi retired, valuesAbsent e codeRemoved true; i metadati root anti-riuso
rimangono. Il test successivo è indipendente e crea un proprio run sintetico:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-SyntheticConsumerMount.ps1 -Execute
```

Attesi sei check (lettore Tox21 reale, restart/recreate e tre rifiuti), cleanup
e retirement automatico dopo successo. Non consegna segreti dei provider.

La prova Tox21/NATS reale successiva ha usato il bundle esplicito VM-040/041;
[TOX21-STAGING-CANDIDATE.md](TOX21-STAGING-CANDIDATE.md),
[TOX21-TRANSPORT-PREFLIGHT.md](TOX21-TRANSPORT-PREFLIGHT.md) e
[TOX21-VM-PILOT.md](TOX21-VM-PILOT.md) contengono CLI, layout e ricevute.
Si tratta di un pilot temporaneo già concluso, non di un prerequisito da
rieseguire sullo stack server oggi attivo. Tutti i sorgenti di quel percorso
sono versionati nel repository.

## 11. Criterio di completamento delle verifiche

Aggiornare [ACCEPTANCE.md](ACCEPTANCE.md) solo con esiti realmente osservati.
Fixture, prove sintetiche, RPC pilot, bootstrap server e applicazione integrata
sono livelli diversi. H-05/A-05/A-30 non sono chiusi dalla sola assenza di IPv6,
dal timeout Android o dall'esistenza di quattro server senza porte pubblicate.
Un terzo sviluppatore può ripetere le misure con queste istruzioni, ma deve
registrare le evidenze della propria macchina anziché attribuirsi quelle storiche.
