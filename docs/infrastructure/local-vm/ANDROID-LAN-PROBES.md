# Android come endpoint controllato per le prove LAN

## Stato e autorizzazione

Il 9 novembre 2026, dopo la verifica post-riavvio Windows, l'owner ha scelto
di predisporre Android per le prove LAN. Prima di questa scelta erano stati
anticipati soltanto manifest e verifiche locali. Questo documento prepara
il percorso; nessuna prova Android è ancora eseguita e A-30 rimane aperto.

Strumento previsto: **Termux con Python**, senza root, ADB o server SSH sul
telefono. Owner conferma Android 16 aggiornato e Termux aperto al prompt;
Python e funzionamento del canary sul dispositivo ancora da verificare. Termux supporta il
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
I comandi concreti di trasferimento/avvio verranno consegnati dopo la verifica
Python e dell'IP Wi-Fi. Nessun server
HTTP Windows o apertura firewall è implicito nel trasferimento. I report
rimangono nello spazio privato Termux e fuori dal repository.

Il riuso del sorgente non equivale a collaudo Android: verificare sul telefono
controllo locale e produzione di ready.json prima di qualsiasi prova negativa.

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

Runner e comandi operativi della misura devono essere verificati prima di
consegnarli all'owner. Questa sezione è il contratto della prova, non dichiara
che un orchestratore Android sia già disponibile o collaudato.

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
