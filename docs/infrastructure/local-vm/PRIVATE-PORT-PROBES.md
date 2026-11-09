# Probe sulle porte private ammesse soltanto verso Internet

9 novembre 2026. Strumento verificato localmente ed esecuzione reale su
Mercurion-Server acquisita dall'owner. Policy DnsHttps a 19 ACL già applicata
e verificata. Nessuna modifica della policy in questa prova.

## Esito reale acquisito

Run `private-ports-ipv4-b99564532a354dbcbe548472d8bcba56`: nove casi negativi,
63 controlli host tutti positivi, 21 per endpoint. Guest e due bridge hanno
superato anche i propri controlli client prima/dopo; route presenti nei namespace,
identificatori, finestra e tempi correlati. Un solo tentativo di readiness DNS,
riuscito prima dell'apertura della finestra. Runner guest attivo dalle
13:24:12.970108 alle 13:24:49.722737 UTC; controlli host dal primo delle
13:23:23.235497 all'ultimo delle 13:25:04.153947 UTC.

| Origine | TCP/443 → 10.203.240.1 | TCP/53 → 10.203.240.1 | UDP/53 → 172.27.0.1 |
| --- | --- | --- | --- |
| Guest | Non raggiungibile | Non raggiungibile | Non raggiungibile |
| Bridge predefinito | Non raggiungibile | Non raggiungibile | Non raggiungibile |
| Bridge temporaneo | Non raggiungibile | Non raggiungibile | Non raggiungibile |

Immagine attesa linux/amd64, nessun errore di pulizia, host controls-passed e
chiusura richiesta completata. Nessun listener TCP canary residuo al controllo
locale. Il servizio DNS ICS esistente rimane invariato. Correlazione ricalcolata
dall'agente sui file salvati; script trasferito identico al sorgente corrente.

| File locale del run | SHA-256 |
| --- | --- |
| private-port-probe.json | `bed4d9f8e8c66897fa56160f2ea0c2a67085443b3458d7468226c295e5b269ee` |
| host/result.json | `22adc2ed0d74996018341b6ac8fa81d360d6f8321d7b5e65b15cd50c6aac09d4` |
| correlation.json | `f756ece2529ad5f31850a43a56870b7292c495d14cddb93ba5227a967ed79535` |
| private_port_probe.py trasferito | `1fac2b1660c5243bbebbda58251cb8fbc0c70838540ad6375d1468f578b3ad84` |

È evidenza dei nove percorsi verso host specificati. Non attribuisce il blocco
a un singolo firewall, non copre tutti gli indirizzi privati o dispositivi LAN
e mantiene isolationAccepted false. Nessun segreto o report grezzo versionato.

## Bersagli e controlli positivi

| Trasporto | Bersaglio della baseline | Controllo |
| --- | --- | --- |
| TCP/443 | 10.203.240.1, Mercurion-Internal | Canary TCP temporaneo con marker del run |
| TCP/53 | 10.203.240.1, Mercurion-Internal | Canary TCP temporaneo con marker del run |
| UDP/53 | Indirizzo attuale host del Default Switch, osservato 172.27.0.1 | Risposta del DNS Windows ICS esistente, identificatore e domanda verificati |

Ricognizione iniziale: UDP/53 wildcard è già usata da SharedAccess (ICS).
Non sostituire quel listener, non fermare servizi e non cambiare WSL o Docker.
Sul solo IP interno 10.203.240.1 non è stato ottenuto un controllo UDP positivo;
quel bersaglio non viene usato per dichiarare un blocco riuscito. Il DNS ICS
sull'indirizzo del Default Switch risponde invece alle domande di controllo.
L'indirizzo viene riletto ad ogni avvio e deve ricadere nel prefisso privato
172.16.0.0/12 previsto da questa baseline; altre topologie richiedono review.

Il Default Switch serve esclusivamente come destinazione di una prova verso
un servizio host esistente: la vNIC guest resta su Mercurion-Internal e il suo
SSH/IP/gateway non cambiano. Non si creano dipendenze applicative dal DNS ICS.

TCP usa un marker, non una sessione HTTPS o DNS su TCP: si verifica il percorso
di rete alla porta indicata. UDP usa una domanda A per `<nonce>.invalid`, con
ID e domanda confrontati nella risposta; anche NXDOMAIN/SERVFAIL/REFUSED
correttamente correlati dimostrano la raggiungibilità del servizio. Una risposta
inaspettata non equivale a un blocco riuscito.

Le prime domande al DNS ICS sono risultate intermittenti nelle verifiche locali.
Prima della finestra di misura si attendono al massimo tre risposte di readiness,
con timeout di tre secondi e tentativi conservati separatamente. Seguono controlli
positivi obbligatori su tutti e tre gli endpoint. La finestra inizia solo dopo
questi controlli; successivamente non si ritenta un controllo fallito per far
passare la prova. Ogni fallimento durante la misura la invalida.

## Procedura passo per passo

1. Lasciare il guest acceso, sbloccato e raggiungibile via `ssh mercurion-server`.
   Non cambiare ACL, NAT o profili firewall. L'immagine Python verificata deve
   essere già presente sul guest; lo script non effettua pull o import.
2. Eventuale preflight locale, da PowerShell normale:

   ```powershell
   powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Invoke-PrivatePortProbe.ps1 -ValidateOnly
   ```

   Apre e chiude brevemente i due canary TCP e interroga il DNS ICS. Nessun SSH
   o container. Porte occupate e controlli falliti impediscono la prosecuzione.
3. Eseguire la prova con un solo comando, da PowerShell normale:

   ```powershell
   powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Invoke-PrivatePortProbe.ps1
   ```

4. Inserire passphrase e sudo solo nel terminale. SCP trasferisce script e
   configurazione, SSH esegue il runner, un ultimo SCP recupera il report.
   SSH scrive direttamente sulla console, senza Tee-Object o trascrizione
   del prompt. Il report diagnostico viene assegnato al SUDO_UID/GID e mantenuto
   0600; nessuna modifica a sudoers, metodi di login o credenziali.
5. Attendere il riepilogo finale e il percorso locale. Nove casi: guest,
   bridge Docker predefinito e bridge temporaneo, ciascuno sui tre endpoint.
   Ogni caso richiede controlli dello stesso client/protocollo prima e dopo.
   La route Linux del namespace è letta da `/proc/net/route`: assenza di route
   o errore di percorso non sono un blocco passato.
6. Il wrapper chiude i propri listener nel finally. La correlazione richiede
   tutti i nove casi distinti, marker e finestra corretti, controlli host positivi
   prima/dopo ciascun tentativo, immagine attesa e pulizia senza errori. Nessun
   retry automatico del run; conservare output e report in caso di fallimento.

Finestra host massima 600 secondi, controlli periodici ogni cinque secondi.
Listener TCP sul solo 10.203.240.1, con bind esclusivo Windows; nessun wildcard
sull'host. Nei container il server di controllo usa solo la rete della prova,
senza pubblicare porte. Client/server non privilegiati, capability rimosse,
filesystem read-only e limiti risorse. Pulizia solo per gli ID delle risorse create.

Artifact locali: `.codex/artifacts/inf-vm-02/private-ports-ipv4-<runId>/`, con
`host/ready.json`, `host/result.json`, `private-port-probe.json` e `correlation.json`.
L'opzione ArtifactRoot è usata per isolare le fixture dei test, fuori dai report VM.
Tutti i riepiloghi mantengono isolationAccepted false. Il successo chiude solo
i percorsi privati host testati: restano LAN bidirezionale, altre origini,
IPv6 e persistenza dopo reboot host.

## Verifiche dello strumento

```powershell
python -B scripts/infrastructure/test_private_port_probe.py
powershell -NoProfile -File scripts/infrastructure/Test-PrivatePortTransport.ps1
```

Tredici unittest Python, con socket loopback reali e rigetto di report invalidi;
tre scenari PowerShell 5.1 con listener host reali e SCP/SSH simulati: errore SCP,
runId errato e fallimento SSH non mascherato dal successivo recupero report.
Verificati chiusura e controlli finali anche su errore. Fixture fallite conservate
in directory Temp dedicate, distinte dalle evidenze runtime.
Collaudo Docker Desktop: sei casi container reali, controlli TCP/UDP validi e
pulizia riuscita; non è esecuzione su Mercurion-Server né accettazione VM.
Il timeout dei controlli positivi è allineato ai tre secondi dei client.

**Correzione post-riavvio del 9 novembre:** il run
`daed3aca799c4c6282080e302b059f58` si è fermato prima di SSH/listener: il wrapper
aveva rilevato correttamente il nuovo DNS Default Switch `192.168.160.1`, ma
il runner Python accettava solo `172.16.0.0/12`. Non era una misura di blocco
né un guasto della VM. Validazione ora estesa alle tre fasce private IPv4
RFC 1918; l'indirizzo resta quello riletto dall'adattatore nominato, non un
target LAN scelto arbitrariamente. Rigettati indirizzi pubblici, loopback,
link-local, CGNAT e IPv6. Test di regressione su validazione e correlazione
dei nove casi in tutte le tre fasce. Configurazione DNS rifiutata da serve-host
ora produce `host/result.json` invalid senza aprire listener; il run precedente
conserva il traceback originale e non è riclassificato.

Tredici test Python, tre scenari trasporto e preflight reale Windows PowerShell
5.1 sul nuovo indirizzo riusciti. Nessuna modifica a firewall, ACL o servizio
DNS ICS. Ripetizione VM dopo correzione ancora da eseguire.

Fonti di protocollo: [formato DNS, RFC 1035](https://datatracker.ietf.org/doc/html/rfc1035#section-4.1),
[dominio riservato .invalid, RFC 2606](https://datatracker.ietf.org/doc/html/rfc2606#section-2).
