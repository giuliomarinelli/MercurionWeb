# Android come endpoint controllato per le prove LAN

## Stato e autorizzazione

Il 9 novembre 2026, dopo la verifica post-riavvio Windows, l'owner ha scelto
di predisporre Android per le prove LAN. Prima di questa scelta erano stati
anticipati soltanto manifest e verifiche locali. Questo documento prepara
il percorso; smoke locale e misura TCP guest/due bridge verso Android riusciti.
La direzione opposta e IPv6 restano aperti per A-30.

Strumento previsto: **Termux con Python**, senza root, ADB o server SSH sul
telefono. Owner conferma Android 16 aggiornato, Termux al prompt e Python
3.14.10. IPv4 Wi-Fi dichiarato `192.168.0.218`; host Windows riletto
`192.168.0.221/24`. Hash verificato sul telefono e canary locale funzionante.
Termux supporta il
percorso F-Droid qui proposto da Android 7; verificare la versione scelta. Non mescolare
app/plugin provenienti da distribuzioni diverse.

La scelta autorizza la preparazione del punto di prova; non modifica firewall,
ACL, router, NAT o instradamento dell'host. Non trasferire chiavi SSH della VM
o credenziali sul telefono. Nessun servizio applicativo Mercurion va esposto.

## 1. Preparare il telefono

1. Confermare versione Android e fonte di installazione. Usare il percorso
   [F-Droid Termux](https://f-droid.org/packages/com.termux/) indicato dal
   [progetto Termux](https://github.com/termux/termux-app#installation).
   Se esiste già un'installazione, non disinstallarla o sostituirla alla cieca.
   Se F-Droid non è presente, la pagina offre anche il download diretto
   dell'APK Termux: non confonderlo con il pulsante per installare il client
   F-Droid. Il download diretto non fornisce notifiche automatiche di update;
   non introdurre per questo un secondo canale di aggiornamento della stessa app.
2. Aprire Termux e completare l'inizializzazione. Non servono plugin,
   accesso ai file condivisi, accessibilità o privilegi di amministrazione.
3. Aggiornare l'indice pacchetti, poi installare Python, come comandi separati:

   ```sh
   pkg update
   ```

   ```sh
   pkg install python
   ```

4. Verificare e riportare la versione:

   ```sh
   python --version
   ```

5. Collegare il telefono alla stessa LAN Wi-Fi del PC. Per la misura usare
   soltanto quel percorso, senza hotspot/tethering o VPN. Se non è possibile
   evitare un percorso alternativo, registrarlo e fermare la prova.
6. Leggere dalle impostazioni Wi-Fi l'IPv4 locale e il prefisso, se mostrato.
   Non servono SSID, password Wi-Fi, MAC o indirizzo pubblico. Non presumere
   l'indirizzo da precedenti snapshot del PC o dal solo nome della rete.

Se un comando fallisce, conservare l'errore e diagnosticare prima di
proseguire. Nessun aggiornamento generale dell'host Windows è richiesto.

## 2. Trasferire e verificare il canary

Riutilizzare `scripts/infrastructure/network_canary.py`: Python standard library,
marker pubblico casuale, listener legato a un singolo IP privato, porta effimera,
controlli locali periodici e durata massima 600 secondi. Nessun download o
esecuzione di codice non revisionato e nessun `curl | sh`.

File preparato dal commit `263708b3a7ef08648fdcfdbc5209dae59d292864`:
[network_canary.py fissato al commit](https://raw.githubusercontent.com/giuliomarinelli/MercurionWeb/263708b3a7ef08648fdcfdbc5209dae59d292864/scripts/infrastructure/network_canary.py).
Download HTTPS verificato dall'host, 6651 byte, identico al blob Git; SHA-256
`52b73178ea7394ba310259c10f93ee203c74bccb04e27466d07813605df0f01b`.
Confrontare questo hash sul telefono prima dell'esecuzione. Download host
verificato non significa file già trasferito o funzionante su Android.
Comando di trasferimento/verifica, da eseguire come singola riga in Termux:

```sh
python -c "import hashlib,urllib.request; data=urllib.request.urlopen('https://raw.githubusercontent.com/giuliomarinelli/MercurionWeb/263708b3a7ef08648fdcfdbc5209dae59d292864/scripts/infrastructure/network_canary.py',timeout=20).read(); assert hashlib.sha256(data).hexdigest()=='52b73178ea7394ba310259c10f93ee203c74bccb04e27466d07813605df0f01b','HASH_MISMATCH'; f=open('mercurion_network_canary.py','xb'); f.write(data); f.close(); print('CANARY_SHA256_OK')"
```

Eseguito con successo sull'host in una directory diagnostica nuova; l'hash
viene controllato prima della scrittura e `xb` impedisce sovrascritture. Non
esegue il sorgente scaricato né avvia listener. In caso di file già presente
o altro errore, conservarlo e diagnosticare senza cambiare opzioni. Conferma
Android ora confermato con CANARY_SHA256_OK. Il comando di avvio della misura
sarà consegnato dopo preparazione del probe VM, per non consumare prima la finestra.
Nessun server
HTTP Windows o apertura firewall è implicito nel trasferimento. I report
rimangono nello spazio privato Termux e fuori dal repository.

**Smoke Android acquisito da screenshot owner:** comando serve con bind
192.168.0.218, directory android-canary-smoke-01 e durata due secondi. Ready
9 novembre 16:57:48.561329 UTC, scadenza 16:57:50.561353 UTC, porta 57355;
messaggio finale controls-passed, isolationAccepted false, closed true.
È controllo locale del telefono, non ancora raggiungibilità Windows/LAN.

## 3. Misurare guest/container verso LAN

1. Avviare il canary sul solo IPv4 Wi-Fi Android, con directory nuova e
   finestra limitata. Non usare bind wildcard. Tenere Termux visibile durante
   la prova, senza introdurre avvii automatici o servizi persistenti.
2. Acquisire IP, porta, marker e finestra da ready.json. Dal PC Windows
   eseguire il controllo positivo verso lo stesso endpoint: se fallisce,
   non misurare la VM. Possibile isolamento client Wi-Fi va diagnosticato,
   non aggirato disabilitando protezioni del router.
3. Da guest e due bridge Docker eseguire un singolo tentativo per origine
   verso quel medesimo endpoint. Verificare route e controlli client del
   namespace prima/dopo; usare immagine già presente e risorse temporanee
   identificate. Nessun probe a porte casuali di router o altri dispositivi.
4. Ripetere il controllo positivo Windows dopo la misura e correlare i tempi
   con i controlli locali del telefono. Un endpoint sospeso o una finestra
   scaduta invalida la prova; timeout da solo non significa filtro superato.
5. Fermare il solo canary e verificare chiusura, cleanup dei container/rete
   temporanei e report. Conservare hash e risultati senza dati personali.

### Runner predisposto

`lan_canary_probe.py` e `Invoke-LanCanary.ps1` disponibili; riusano il runner
Docker H-04 e il protocollo del canary Android fissato al commit. La nuova
opzione `--require-route` nel client è opt-in: gli usi H-04 precedenti conservano
la loro interfaccia. In LAN route assente o ENETUNREACH/EHOSTUNREACH sono
invalid-path, non una negazione superata.

1. Dopo l'avvio della finestra Android, acquisire subito il JSON ready. L'agente
   prepara fuori da Git un config.json con runId nuovo e i campi originali
   address/port/nonce/readyAtUtc/expiresAtUtc. Non riusare i dati dello smoke
   di due secondi. Finestra massima nominale 600 secondi; il validatore tollera
   meno di un secondo per il campionamento separato dei due timestamp nel
   canary fissato al commit. Nessun prolungamento automatico della finestra.
2. Validare con `Invoke-LanCanary.ps1 -ConfigPath <config.json> -ValidateOnly`:
   controlla configurazione, peer nel /24 Wi-Fi host corrente e almeno 90
   secondi residui. Non apre connessioni. Altre topologie richiedono review.
3. Eseguire lo stesso comando senza ValidateOnly. Prima di SCP/SSH il monitor
   Windows deve ricevere il marker Android corretto. Lo ricontrolla ogni cinque
   secondi e prima di terminare. Nessun listener Windows, port publishing,
   pull/import immagine o modifica ai filtri.
4. SSH diretto alla console per i prompt. Sulla VM: guest e due bridge, stessa
   immagine Python locale verificata, client/container non privilegiati e
   risorse limitate. I controlli del namespace precedono e seguono il singolo
   tentativo verso Android. Pulizia solo degli ID creati dal run.
5. SCP recupera lan-guest.json; il finally ferma il monitor Windows e la
   correlazione richiede tre origini distinte, route, nonce/endpoint/finestra,
   controlli validi prima/dopo e cleanup riuscito. Qualunque errore mantiene
   il report e impedisce l'accettazione; nessun retry automatico.
6. Il canary Android rimane separato dal monitor Windows: attendere la sua
   chiusura automatica oppure, da una seconda sessione Termux, creare il file
   stop nella sua directory. Acquisire il messaggio finale e i report locali.
   Non usare Ctrl+C come sostituto della chiusura controllata con controllo finale.

Artifact Windows in `.codex/artifacts/inf-vm-02/lan-ipv4-<runId>/`, con hash dei
tre sorgenti trasferiti e stage contenente config, lan-control.json,
lan-guest.json e lan-correlation.json. Report guest 0600 restituito all'owner
sudo. Solo metadati diagnostici, nessuna trascrizione di passphrase/password.

**Validazione locale:** 12 unittest LAN (socket loopback reali, validazione,
scadenza, immagine errata, cleanup fallito e rigetto di 11 report incoerenti),
4 test H-04 e 3 test canary passati. Preflight reale PowerShell 5.1 passato
con lettura Wi-Fi reale e config di test, senza contatti remoti. Collaudo reale
Docker Desktop su due bridge: controlli positivi e route validi, porta chiusa
in container dedicato della fixture, cleanup senza errori. Artifact locale
lan-tool-validation/7110748a704046daa9c71e59f9b5aa11/result.json: verifica dello
strumento, non prova del firewall, della VM o della LAN. Misura Android acquisita sotto.

## Risultato TCP verso Android acquisito il 9 novembre

Run `2e5b54bfac1a4ff782f7cd33891ae49f`, sorgenti al commit `84adb554`.
Telefono `192.168.0.218:53483`; canary avviato alle 17:08:05 UTC, scadenza
17:18:05 UTC. Controllo iniziale Windows positivo alle 17:09:59 UTC; preflight
PS 5.1 sulla configurazione reale passato prima della consegna all'owner.

| Origine | Percorso TCP verso il telefono | Controlli del client | Route |
| --- | --- | --- | --- |
| Guest | Non raggiungibile, timeout | Positivi prima/dopo | eth0 via 10.203.240.1 |
| Bridge predefinito | Non raggiungibile, timeout | Positivi prima/dopo | eth0 via 172.17.0.1 |
| Bridge temporaneo | Non raggiungibile, timeout | Positivi prima/dopo | eth0 via 172.18.0.1 |

Guest attivo 17:11:34–17:11:46 UTC. Diciotto controlli Windows verso Android,
tutti positivi, dalle 17:10:40 alle 17:12:04 UTC, prima/dopo ogni tentativo.
Correlazione ricalcolata sui report salvati, namespace distinti, immagine
attesa linux/amd64, nessun errore di pulizia container/rete. Monitor Windows
terminato su stop richiesto. Hash dei tre sorgenti nel manifest locale
source-hashes.json corrispondenti alle copie trasferite e al tree del repository.

Artifact: `.codex/artifacts/inf-vm-02/lan-ipv4-2e5b54bfac1a4ff782f7cd33891ae49f/`,
stage `inf-vm-02-lan-2e5b54bfac1a4ff782f7cd33891ae49f`.

| File nello stage | SHA-256 |
| --- | --- |
| config.json | `026a57d462450d30614cfc09cce656909720030ec4e1be196c656ec5797881b7` |
| lan-guest.json | `d8ff85e35109c3e31c6731791c7391c90729901ea7ae801d957e95bac7a10aa5` |
| lan-control.json | `e79928bf6c71cf76c56343e7171c2c43c9e87ae8ce04b71539054f7ddc690b96` |
| lan-correlation.json | `7b3c1d76c3d2871454f969073d6ef4cd3de81c53a7a04570488c8cc86026229d` |

Chiusura automatica del canary Android richiesta all'owner, conferma finale
ancora pendente. La misura prova soltanto i tre percorsi TCP verso quel telefono
e quella porta: nessuna attribuzione al singolo firewall o estensione a tutte
le porte/dispositivi, alla direzione LAN → VM o a IPv6. isolationAccepted resta false.

## 4. Misurare LAN verso VM e distinguere i limiti

Android potrà essere anche origine diversa dall'host Windows autorizzato.
Il controllo positivo SSH dall'host va correlato al tentativo Android e alla
topologia effettiva. Un errore del browser verso TCP/22 non basta.

Se Android non ha una route verso `10.203.240.0/24`, il fallimento prova solo
quel percorso di raggiungibilità nella topologia presente: **non** attribuirlo
alla whitelist SSH Hyper-V. Non aggiungere route, port forwarding o bridge
LAN per costruire artificialmente il caso. Registrare la copertura ottenuta
e l'eventuale residuo H-05; nessuna deroga automatica.

IPv6 richiede indirizzi, scope e route realmente presenti sui partecipanti.
Assenza di IPv6 instradabile non è un test negativo passato; non abilitarlo
come effetto collaterale delle prove Android.

## Evidenze da registrare

Versioni Android/Termux/Python, fonte e hash script, IP locali e topologia,
inizio/fine, marker, controlli positivi e negativi, route, stop e cleanup.
Nessuna credenziale o identificatore personale. Aggiornare ACCEPTANCE e
DAILY-LOG soltanto dopo aver riletto i report. Nessuna conclusione di isolamento
completo dai soli percorsi misurati.
