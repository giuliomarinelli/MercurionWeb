# Probe sulle porte private ammesse soltanto verso Internet

9 novembre 2026. Strumento preparato e verificato localmente; esecuzione
Mercurion-Server ancora pendente. Prerequisito: policy DnsHttps a 19 ACL,
già applicata e verificata dall'owner. Nessuna modifica della policy in questa prova.

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

Undici unittest Python, con socket loopback reali e rigetto di report invalidi;
tre scenari PowerShell 5.1 con listener host reali e SCP/SSH simulati: errore SCP,
runId errato e fallimento SSH non mascherato dal successivo recupero report.
Verificati chiusura e controlli finali anche su errore. Fixture fallite conservate
in directory Temp dedicate, distinte dalle evidenze runtime.
Collaudo Docker Desktop: sei casi container reali, controlli TCP/UDP validi e
pulizia riuscita; non è esecuzione su Mercurion-Server né accettazione VM.
Il timeout dei controlli positivi è allineato ai tre secondi dei client.

Fonti di protocollo: [formato DNS, RFC 1035](https://datatracker.ietf.org/doc/html/rfc1035#section-4.1),
[dominio riservato .invalid, RFC 2606](https://datatracker.ietf.org/doc/html/rfc2606#section-2).
