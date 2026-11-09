# INF-VM-02 — Probe TCP controllate

**Stato:** H-02 TCP IPv4 e IPv6 link-local, H-04 TCP IPv4 verso Windows eseguiti
sulla VM; LAN, IPv6 container/globale e altre origini restano aperti.
Evidenze nella readiness: esecuzioni del 7 novembre sulla vecchia topologia.
Non certificano la rete statica Mercurion-Internal introdotta il 9 novembre.
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

**Migrazione statica del 9 novembre:** il wrapper H-02 IPv4 ora accetta soltanto
`10.203.240.1/24` Preferred sull'interfaccia `vEthernet (Mercurion-Internal)`.
Nessun fallback al Default Switch. Le evidenze vecchie conservano i loro IP.
Sette scenari PowerShell 5.1 verificano preflight valido, rifiuto del vecchio
bersaglio, indirizzo assente/duplicato, prefisso errato, indirizzo tentative e
scadenza: letture simulate, nessun trasporto. Tre test Python del canary passati.
ValidateOnly passato anche contro il vero canary IPv4 sulla rete nuova;
esecuzione guest ancora pendente. Il listener temporaneo usa solo l'IP interno
e controlli positivi, con chiusura tramite file stop o scadenza massima.

```powershell
powershell -NoProfile -File scripts/infrastructure/Test-GuestCanaryStaticNetwork.ps1
```

I wrapper H-04 e H-02 IPv6 descritti sotto conservano ancora riferimenti al
Default Switch: adattarli e verificarli prima di nuove esecuzioni. Sul guest
statico IPv6 link-local è disabilitato; non riabilitarlo soltanto per ripetere
il vecchio test. L'assenza di una route non dimostra un blocco del firewall.

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

## H-02 IPv6 link-local: guest → host Windows

Entrypoint unico dalla root, PowerShell normale:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-GuestIpv6Canary.ps1
```

Usa soltanto il link-local IPv6 preferito dell'adattatore Default Switch,
verificato in modo univoco. Il canary riutilizza i controlli positivi periodici
e finali dello strumento TCP, con finestra massima di 600 secondi. Trasferisce
probe, canary e configurazione, poi esegue Python guest via SSH, **senza sudo,
Docker, download o modifiche a rete/firewall**. Listener limitato a quell'indirizzo,
chiuso dal wrapper anche in caso di errore.

Lo scope Windows serve solo al bind host. Alla VM viene passato l'indirizzo
senza `%indice`: il probe seleziona l'interfaccia dell'unica route IPv4 default,
ne verifica stato UP e presenza di link-local IPv6 utilizzabile, legge la route
IPv6 verso il canary con `ip -j -6 route get ... oif ...` e applica lo scope
guest al socket. Interfacce ambigue, indirizzi mancanti/tentative, finestra
scaduta o route non valida impediscono il tentativo. Non viene creata una route
IPv6 per rendere artificialmente eseguibile il test.

Il report distingue la non raggiungibilità TCP osservata dagli errori di
percorso: assenza di route, rete non raggiungibile e servizi raggiungibili
richiedono review, non un esito di isolamento passato. Anche un timeout valido
va correlato con i controlli host prima/dopo, stesso IP privo di scope, porta,
nonce e finestra temporale. Non attribuisce il blocco a uno specifico firewall
o ACL, né lo estende a IPv6 globale, container o LAN.

Evidenze Windows in `.codex/artifacts/inf-vm-02/h02-ipv6-<runId>/`: report guest
`guest-ipv6-probe.json`, trascrizione e controlli nella directory `host`.
Il risultato è salvato prima di gestire un exit code guest non zero;
`isolationAccepted=false` resta sempre esplicito.

Verifica locale: canary realmente attivo sull'IPv6 del Default Switch,
controlli positivi e chiusura riusciti. Wrapper completo Windows PowerShell 5.1
provato con canary reale e trasporti simulati: prefisso PTY, exit code zero/non
zero, report conservati e listener chiuso. Cinque unittest coprono selezione
dello scope, input/route mancanti o ambigui, configurazione scaduta e risultati
da revisionare. Questo non verifica i comandi `ip` o il percorso sulla VM:
l'esecuzione Ubuntu è stata poi acquisita alle 19:25 UTC del 7 novembre:
route e scope validi, timeout TCP con nove controlli host positivi e listener
chiuso. [Run, hash e limiti](HOST-GUEST-READINESS.md).

```powershell
python -B scripts/infrastructure/test_guest_ipv6_probe.py
```

Riferimenti: [scope IPv6 nei socket Python](https://docs.python.org/3/library/socket.html#socket-families),
[lettura della route e interfaccia di uscita](https://man7.org/linux/man-pages/man8/ip-route.8.html).

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

Il parser Windows tollera testo PTY prima del marcatore sulla stessa riga,
estraendo soltanto il JSON. Marcatori duplicati, JSON invalido e runId diverso
sono errori. Regression test eseguibile senza SSH o Docker:

```powershell
powershell -NoProfile -File scripts/infrastructure/Test-ContainerCanaryReport.ps1
```

## H-06 IPv4: DNS e HTTPS in uscita

Entrypoint unico dalla root, in PowerShell normale:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-EgressProbe.ps1
```

Richiede l'immagine Python già importata da H-04: il runner ne verifica identità,
architettura e piattaforma Docker. Non trasferisce immagini, non esegue pull o
installazioni. Il wrapper copia soltanto `probe_egress.py`, poi invoca il runner
Ubuntu via SSH/sudo interattivi. Nessun listener Windows o porta Docker pubblicata.

Tre origini: processo guest, container su bridge predefinito, container su bridge
temporaneo con egress. Per ciascuna viene risolto `docs.python.org` in IPv4 e
inviata una sola richiesta `HEAD https://docs.python.org/3/`. Certificato TLS,
catena CA e hostname sono verificati; la connessione usa uno degli IP pubblici
appena risolti, con SNI coerente. Nessun proxy d'ambiente, token, cookie o corpo
applicativo; nessun redirect seguito o corpo della risposta letto. Risoluzioni
verso indirizzi non globali interrompono il tentativo. Budget del processo client
30 secondi, timeout socket 8 secondi. HTTP 2xx/3xx è un esito positivo di questo
smoke; altri status ed errori DNS/TLS richiedono review.

I container mantengono UID non root, capability rimosse, filesystem in lettura
e limiti CPU/memoria/PID. Il runner rimuove soltanto container e bridge creati,
usando i loro ID. Errori di pulizia invalidano il risultato. Nessun cambiamento
a firewall, ACL, switch o configurazione dei resolver; la rete temporanea usa
le normali operazioni Docker. Interruzioni brusche richiedono review delle risorse
con label del run prima di ripetere.

Report Windows: `.codex/artifacts/inf-vm-02/h06-ipv4-<runId>/egress-probe.json`
e `guest-terminal.txt`. Il payload normalizzato rimane disponibile anche se il
runner restituisce un errore; lo stesso marcatore robusto PTY introdotto per H-04
è riusato con un identificatore H-06 distinto. `-ValidateOnly` controlla soltanto
i prerequisiti locali, senza SSH o affermazioni sul guest.

**Verifica strumento, non accettazione VM:** quattro unittest dei casi di errore
passati; probe HTTPS reale con HTTP 200 da Windows e dai due bridge Docker Desktop,
pulizia locale riuscita. Wrapper completo eseguito in Windows PowerShell 5.1 con
SCP/SSH simulati, prefisso PTY e codici di uscita zero/non zero: trascrizione e
report conservati in entrambi i casi. Esecuzione Ubuntu acquisita alle 18:54 UTC
del 7 novembre: HTTP 200 e TLS 1.3 su tutte e tre le origini, pulizia senza
errori riportati. [Run, hash e limiti](HOST-GUEST-READINESS.md).

Questo smoke non certifica tutti i provider applicativi, DNS su ogni protocollo,
IPv6 o l'isolamento host/LAN. Il risultato non allarga la policy e conserva
`isolationAccepted=false`. H-02/H-04 restano le evidenze separate dei percorsi
negativi già provati; il blocco delle nuove connessioni a host/LAN non viene
dedotto dalla riuscita di HTTPS.

```powershell
python -B scripts/infrastructure/test_egress_probe.py
```

Fonti: [Python HTTPSConnection](https://docs.python.org/3/library/http.client.html#http.client.HTTPSConnection),
[Python TLS client e verifica hostname](https://docs.python.org/3/library/ssl.html#socket-creation).

## Verifica del canary TCP

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
