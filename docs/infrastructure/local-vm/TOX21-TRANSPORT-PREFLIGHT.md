# VM-040 — Bundle Tox21 e preflight guest

## 1. Perimetro

Prosegue VM-039 sul branch operativo, senza merge. Si riusa il candidato
staging Tox21 `d506101ec27c985ef4ddb280266bfcdc4b6bf1c4`, con modello
`qa-6f19c86`, pesi e soglie invariati. Nessun rebuild o training.

Questo passaggio prepara sull'host il bundle e permette sole letture guest.
Non trasferisce il tar alla VM, non esegue `docker load`, non avvia servizi,
non consegna credenziali e non modifica rete, firewall o ACL.
`isolationAccepted` rimane `false`; H-05/A-05/A-30 restano aperti.

## 2. Bundle preparato sull'host

Directory esterna a Git:

```text
C:/Users/giuli/.codex/artifacts/inf-vm-04/vm040-transport
```

Run: `518aa79ae12d42b8b61d453c1ef4f628`.
`components/tox21` contiene soltanto `component.json`, `image.tar`, SBOM,
scansione, risultato policy, prova load host e audit runtime.
Sono aggiunti summary VM-039, manifest coordinato parziale, manifest di
trasporto con hash/dimensioni e la directory `preflight` di soli script/metadati.
Sorgenti, dotenv, PEM, dataset e materiali di training non vengono copiati.

- Archivio: `352377856` byte.
- SHA256 tar: `2f725f0eb31030bbed0eaeb458c60bb1713f5dead3c3e7f9246b227bdf92c9a8`.
- Config digest: `sha256:a00600b4e3ee005c6f33cf28686389c42d32a148c4f7195f64ed0379eb30a1b8`.
- Dimensione runtime dichiarata dall'audit: `1630179794` byte.
- Riserva richiesta per import successivo: `2871806418` byte liberi sia nel
  filesystem di staging sia in quello Docker. Formula conservativa:
  due archivi + runtime + 512 MiB, anche se i filesystem coincidono.

Il coordinatore esistente ricontrolla hash, identità OCI, modello, scan e
policy strict. Wolfi OS, target staging e piattaforma Linux/amd64 sono richiesti.
Qualsiasi finding, anche LOW/UNKNOWN, impedisce la preparazione.
`coordinated.json` registra `web-ng` e `web-node` mancanti e
`eligible_for_integrated_acceptance: false`: non è una release Web completa.
Gli hash provano integrità rispetto ai manifest locali; non sono una firma
esterna né una nuova scansione aggiornata al giorno del futuro deployment.

## 3. Ripetere preparazione e controllo locale

Da PowerShell nella root Web, per un nuovo bundle scegliere un percorso
inesistente. Il comando rifiuta destinazioni già presenti; non cancella nulla.

```powershell
python -B scripts/infrastructure/prepare_tox21_transport.py prepare --candidate C:/Users/giuli/.codex/artifacts/inf-vm-04/vm039-d0bdc5e4e70f4e71aa26391e7fce7208 --output C:/Users/giuli/.codex/artifacts/inf-vm-04/vm040-transport --web-revision fa59827160bc5b760bdbf9976157eb71dff4a64e
```

Il bundle sopra è già preparato. Per verificarlo senza SSH:

```powershell
powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Invoke-Tox21ArtifactPreflight.ps1 -BundlePath C:/Users/giuli/.codex/artifacts/inf-vm-04/vm040-transport
```

Attesi `transport-verified`, due componenti Web mancanti e nessuna azione VM.
Il Web SHA nel manifest identifica il coordinatore/base usata; la revisione
applicativa Tox21 e quella del modello rimangono distinte.

## 4. Eseguire il preflight guest

Avviare la VM e sbloccare LUKS dalla console Hyper-V, se necessario.
Da PowerShell Windows normale eseguire questa singola riga:

```powershell
powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Invoke-Tox21ArtifactPreflight.ps1 -BundlePath C:/Users/giuli/.codex/artifacts/inf-vm-04/vm040-transport -Execute
```

Il wrapper prima verifica tutto il bundle. Poi copia **solo** `preflight`
in una directory home guest univoca `vm040-preflight-<uuid>` e avvia il probe
con `sudo python3 -I -B`. SSH mantiene il controllo host key; passphrase e
password sudo si inseriscono esclusivamente nel terminale. Il flusso
interattivo non viene intercettato o salvato in un log.

Il probe verifica:

1. Ubuntu 26.04, architettura amd64/x86_64.
2. `eth0` con `10.203.240.10/24` e unica route default via `10.203.240.1`.
3. Baseline senza indirizzi IPv6 su eth0 o route default IPv6, senza dedurre
   da questo una prova di filtraggio IPv6.
4. Docker Linux/amd64 tramite il solo socket Unix locale, indipendentemente
   da eventuali variabili Docker remote ereditate; plugin Compose disponibile.
5. Spazio libero per lo staging/import successivo.

Non legge Config.Env di container, file di credenziali o configurazioni
applicative. Le sole scritture remote sono script/metadati trasferiti e il
nuovo report root leggibile via SCP. Nessuna risorsa Docker viene creata.

## 5. Interpretare l'esito

Attesi `status: ready`, `readyForArtifactTransfer: true`, `imageLoaded: false`,
`servicesStarted: false`, `isolationAccepted: false`. Il report viene scaricato
accanto al bundle come `vm040-preflight-<runId>.json`, con controlli dettagliati
e richiesta correlata a digest/dimensioni. Conservare il JSON finale.

Se fallisce, conservare report/ultima fase e non rilanciare automaticamente.
Il wrapper non sovrascrive il report locale; non cambiare filtri per superare
il controllo. Script e metadati guest rimangono per diagnosi: nessun segreto
è presente e non viene eseguita pulizia generica.

Il risultato positivo permette di pianificare il successivo trasferimento
del solo candidato, verifica hash e load. Non autorizza avvio applicativo,
tunnel o accettazione integrata. Prima di eseguirli definire e verificare
separatamente il perimetro e i residui.

## 6. Evidenze attuali

Bundle reale preparato e verificato sull'host; wrapper senza `-Execute`
eseguito con Windows PowerShell 5.1. Sette test stdlib passati: allowlist,
integrità, finding LOW, scope incompleto, readiness negativa e richieste
incoerenti. Anche il ciclo wrapper SCP/SSH/SCP è passato con trasporti
simulati su PS 5.1: caricati soltanto i due file preflight, comando remoto
e correlazione report verificati; non è una prova guest.
Test stdlib registrati nel gate CI container. Il guest preflight resta da
eseguire dal terminale dell'owner; TCP/22 risponde, senza login dell'agente.
