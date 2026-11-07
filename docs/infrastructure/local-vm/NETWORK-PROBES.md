# INF-VM-02 — Probe TCP controllate

**Stato:** H-02 TCP IPv4 eseguito sulla VM; H-04 preparato e verificato come
strumento locale, ancora da eseguire sulla VM.
La review ACL e la matrice sono in [HOST-GUEST-READINESS.md](HOST-GUEST-READINESS.md).

## Scopo e limiti

`scripts/infrastructure/network_canary.py` usa soltanto la libreria standard
Python. Non installa pacchetti né cambia firewall, ACL, switch o servizi.
Il server di prova prevede una finestra fino a 600 secondi per un solo endpoint TCP su un
indirizzo privato/loopback esplicito, scelto dalla baseline della macchina.
Per la prova reale usare soltanto l'indirizzo dell'adattatore virtuale host,
mai Wi-Fi/LAN o wildcard. Il sistema assegna una porta non privilegiata.

Il contenuto restituito è un identificatore pubblico casuale della prova,
non una credenziale. Nessun dato applicativo viene servito. Il server controlla
la propria raggiungibilità all'inizio, circa ogni cinque secondi e alla fine;
chiude socket e processo al termine (con pochi secondi di margine per i timeout
dei controlli). La cartella di output deve essere nuova,
fuori dal Git, per non sovrascrivere evidenze precedenti.
Un file `stop` nella sola directory della prova richiede la chiusura anticipata:
prima di chiudere viene comunque effettuato l'ultimo controllo positivo.

```powershell
python scripts/infrastructure/network_canary.py serve --bind <IP-virtuale-host> --output <nuova-directory-locale> --seconds 600
```

Solo dopo il primo controllo positivo viene scritto `ready.json`, con IP,
porta, nonce e finestra temporale. `result.json` contiene controlli e connessioni
osservate. I listener di prova non sono pubblicazioni Docker.

## Probe guest, senza privilegi amministrativi

Dopo aver copiato il medesimo script nel proprio home sul guest, eseguire con
Python 3 IP/porta/nonce della prova attualmente attiva:

```bash
python3 ~/inf-vm-02-canary.py probe --host <IP-virtuale-host> --port <porta-assegnata> --nonce <identificatore-pubblico>
```

Per evitare errori di copia tra più righe, l'entrypoint Windows operativo è
`powershell -NoProfile -File scripts/infrastructure/Invoke-GuestCanary.ps1`.
Il wrapper seleziona il run IPv4 attivo, valida dati/scadenza/adattatore host,
esegue SCP e SSH come due processi distinti (fermandosi se SCP fallisce) e salva
`guest-probe.json` nella cartella di prova. Le passphrase si inseriscono nel
terminale, non negli argomenti o nei file. `-ValidateOnly` controlla i dati senza
avviare SCP/SSH. La prima esecuzione completa dell'owner è riuscita per H-02 IPv4.

L'accesso SSH resta interattivo a cura dell'owner; il probe non richiede `sudo`.
Non installare Python se mancante senza prima registrare il requisito.
Con IPv6 link-local usare l'interfaccia locale del guest, per esempio `%eth0`,
non il numero di interfaccia Windows. Ripetere in una finestra dedicata per
ciascuna famiglia; un risultato IPv4 non dimostra isolamento IPv6.

| Esito | Significato |
| --- | --- |
| `reachable` | TCP e identificatore canary corretti: il percorso è aperto |
| `unexpected-service` | TCP raggiungibile ma identificatore non valido/assente; non è un blocco riuscito |
| `not-reachable` | Errore/timeout di connessione, da correlare con i controlli host |

Tutti gli output mantengono `isolationAccepted=false`: il codice non trasforma
una porta chiusa o un timeout in un test di sicurezza passato. Per H-02 servono
stesso nonce, IP/porta, probe dentro la finestra attiva e controlli host positivi
prima/dopo. Verificare la coerenza degli orologi. Non attribuire il blocco ad
ACL, Kaspersky o guest firewall senza ulteriore evidenza del livello interessato.

H-05 richiede una seconda origine controllata e non è coperto dal solo test
guest → host.

## H-04 IPv4: container Docker guest → host Windows

Entrypoint unico dalla root, in PowerShell normale:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-ContainerCanary.ps1
```

L'operatore inserisce passphrase SSH e password sudo soltanto nel proprio
terminale. Il wrapper esporta da Docker Desktop l'immagine Python già locale
`python:3.11-slim-trixie`, identificata da
`sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79`;
non esegue pull. Dimensione immagine riportata da Docker circa 187 MB; archivio
trasferito nella prova operatore circa 46 MB. Serve spazio libero su host e
guest. Trasferisce archivio e script, avvia un nuovo canary Windows
sul solo Default Switch per massimo 600 secondi e invia la configurazione.
SCP e SSH sono invocazioni separate gestite dallo script.

Sul guest `probe_container_isolation.py` verifica Ubuntu, Docker Linux amd64
sul solo socket Unix locale, SHA-256 dell'archivio e identità dell'immagine
importata. Crea un bridge temporaneo ordinario con egress e prova sia quello
sia il bridge predefinito. In ogni caso un client container raggiunge un server
di controllo sulla stessa rete, tenta il canary Windows e ripete il controllo
positivo. Se il primo controllo fallisce, il tentativo Windows non viene fatto.
Un servizio raggiungibile con marker errato non è classificato come blocco.

Container non privilegiati, UID/GID 65534, capability rimosse, filesystem in
sola lettura e limiti CPU/memoria/PID. Nessun socket Docker montato nei container,
nessuna porta pubblicata, nessun mount di credenziali o sorgenti applicativi:
solo il probe Python in lettura. Il runner amministrativo usa Docker per creare
e rimuovere le proprie risorse; non cambia policy firewall/ACL/switch. La creazione
di reti richiede comunque le normali operazioni di rete gestite da Docker.

La pulizia usa gli ID restituiti dalla creazione, senza prune o rimozioni per
nome generico. Fallimenti di pulizia invalidano l'esito e riportano gli ID da
revisionare. Immagine importata, archivio e report restano disponibili: nessuna
cancellazione automatica dei dati dell'operatore. Se il processo remoto viene
interrotto bruscamente, controllare le risorse con label `mercurion.inf-vm-02`
del run prima di riprendere; non assumere che il `finally` sia stato eseguito.

Report sotto `.codex/artifacts/inf-vm-02/h04-ipv4-<runId>` nel profilo Windows:
`container-probe.json`, trascrizione guest e directory `host` con controlli e
risultato canary. Il wrapper arresta il listener anche in caso di errore.
Prima di accettare il caso correlare nonce/IP/porta, tempi guest/host e controlli
host prima/dopo ciascun tentativo. Tutti i report restano `isolationAccepted=false`:
questo caso non verifica LAN, IPv6, egress Internet o le future reti Compose.

`-ValidateOnly` verifica i prerequisiti host senza export, listener o SSH.
Quattro unittest coprono input scaduti/non validi, fallimento del controllo
positivo, servizio inatteso e pulizia fallita. Il percorso Docker reale è stato
provato su Docker Desktop, su entrambi i bridge, con un endpoint loopback chiuso:
serve a verificare lo strumento e la pulizia, non costituisce evidenza H-04 VM.

Riferimento per identità immagine, reti e vincoli dei container:
[Docker run](https://docs.docker.com/engine/containers/run/).

## Verifica dello strumento

```powershell
python -B scripts/infrastructure/test_network_canary.py
```

Tre metodi di test, con prove effettive sia su `127.0.0.1` sia su `::1`:
identificatore valido, identificatore errato, chiusura automatica, porta poi non
raggiungibile e permanenza di `isolationAccepted=false`. Altre prove rifiutano
wildcard, multicast, indirizzi pubblici, porte privilegiate e IPv6 link-local
senza scope. Verificata anche la chiusura anticipata richiesta tramite file,
con controllo positivo finale. Esito locale: passato. Le prove loopback non
sono un collaudo della rete Hyper-V; il caso reale è registrato nella readiness.
