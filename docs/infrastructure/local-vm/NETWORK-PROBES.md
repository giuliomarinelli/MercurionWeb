# INF-VM-02 — Probe TCP controllate

**Stato:** strumento preparato e verificato localmente, non prova della VM.
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

Per H-04 servirà un probe equivalente **nel guest Docker**, su rete bridge/egress
di prova e con immagine verificata; Docker Desktop sull'host non vale come
evidenza. Il guest attualmente ha solo `hello-world`: nessuna immagine nuova è
stata scaricata o autorizzata da questo strumento. H-05 richiede una seconda
origine controllata e non è coperto dal solo test guest → host.

## Verifica dello strumento

```powershell
python -B scripts/infrastructure/test_network_canary.py
```

Due metodi di test, con prove effettive sia su `127.0.0.1` sia su `::1`:
identificatore valido, identificatore errato, chiusura automatica, porta poi non
raggiungibile e permanenza di `isolationAccepted=false`. Altre prove rifiutano
wildcard, multicast, indirizzi pubblici, porte privilegiate e IPv6 link-local
senza scope. Esito locale: passato. Non è un collaudo della rete Hyper-V.
