# INF-VM-04 — orchestratore host sintetico

9 novembre 2026. Percorso host per il [pilot Tox21](SECRET-DELIVERY-PILOT.md).
Solo credenziali sintetiche generate in memoria; nessun input per password
manager, `.env`, PEM o segreti reali. Nessuna operazione VM durante lo sviluppo.

## Uso e confini

Dalla root Web, PowerShell 5.1:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-SyntheticSecretDelivery.ps1
```

Senza opzioni stampa **solo il piano**, senza SSH o file di credenziali host.
Comando realmente eseguito; runtime Python 3.10+, verificato su Python 3.12.
La prima prova VM rimane distinta e riservata all'operatore:

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-SyntheticSecretDelivery.ps1 -Execute
```

`-Execute` contatta `mercurion-server` e crea file sintetici nel namespace
guest del pilot. Non avvia container né modifica rete, firewall, SSH, agent,
sudoers o Compose. Default `preview`; `-Environment production` cambia solo
l'identità del pilot. I file attivi restano sul tmpfs guest. Nessun gate
INF-VM-02/03 è implicitamente superato.

Sorgenti: [launcher](../../../scripts/infrastructure/Invoke-SyntheticSecretDelivery.ps1),
[orchestratore](../../../scripts/infrastructure/synthetic_secret_delivery.py),
[test](../../../scripts/infrastructure/test_synthetic_secret_delivery.py).

## Fasi

| Fase | Identità e terminale | Risultato |
| --- | --- | --- |
| `staged` | Utente SSH, senza PTY | Helper via stdin in `~/.mercurion-infra/delivery-<runId>/secret_delivery.py` privato |
| `prepared` | sudo interattivo, PTY | Area volatile/inbox del vero utente SSH, solo metadati in argv |
| `received` | Utente SSH, senza PTY | Envelope sintetico su stdin, mai in argv o file host |
| `applied` | sudo interattivo, PTY | Validazione e pubblicazione del file consumer |
| `active` | Utente SSH, senza PTY | Verifica proprietà/permessi senza aprire le credenziali |
| `code-removed` | Utente SSH, senza PTY | Rimozione della sola copia del codice e sua directory vuota |

Le fasi sudo ereditano stdin/stdout/stderr del terminale, senza cattura.
Nei passaggi senza PTY si cattura solo stdout per la ricevuta; stderr rimane
sul terminale per la passphrase SSH. Il payload usa byte, senza pipeline
testuale PowerShell e senza condividere stdin con sudo. Non attivare transcript
o tee dell'intera sessione come parte del flusso.

Host key checking obbligatorio, forwarding disabilitato sulle connessioni
del pilot, timeout connessione e keepalive; massimo 300 secondi per fase.
Fase e run-id vengono mostrati prima delle operazioni. Ricevute validate per
versione, run-id, fase e campi attesi; solo metadati noti nel report finale.

## Codice privilegiato e interruzioni

La copia del sorgente nella home non è fidata automaticamente. Il loader
Python `-I` controlla tipo, proprietà, modo, singolo link, dimensione e hash
SHA-256 atteso del codice. Esegue **gli stessi byte già verificati**, senza
riaprire il file. La manomissione è rifiutata prima dell'esecuzione root.
Non si installa un helper root permanente; l'hash non riguarda credenziali.

In errore si interrompe la sequenza: nessun retry, sostituzione o cancellazione
automatica del run. La copia del codice può rimanere sulla home, senza segreti;
inbox/active seguono il lifecycle tmpfs del pilot. Timeout SSH non significa
che il processo remoto sia sicuramente terminato: conservare il run-id.

## Evidenze

Il [comando locale di test](../../../scripts/infrastructure/Test-SecretDelivery.ps1)
ha eseguito **26 test Linux passati**, in container effimero senza rete/pull:
intera sequenza host con comandi Python guest reali e shell POSIX, identità e
filesystem reali, codice manomesso, verifica metadata-only, lettore Tox21,
stop a ogni fase fallita, ricevute errate e separazione payload/terminale.

Windows: **10 passati, 16 integrazioni Linux escluse**. Inclusa prova nativa
degli argomenti e dei byte stdin tra processi Windows, senza file del payload.
SSH è simulato nei test host; su Linux sudo è sostituito da processi eseguiti
con le identità previste. **Handshake SSH, passphrase, sudo/PAM, PTY remoto
e filesystem VM non sono verificati.** Servirà la prova operatore prima di
dichiarare il trasporto VM funzionante. Nessun restart/recreate applicativo.

La [CI Tox21](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42575718871)
del fix tipi NATS `5f3d837cf1356c6ccc875fea007d396684e3cc69` è completata con
successo: evidenza distinta, non collaudo dell'orchestratore Web o della VM.

## Passi successivi

Prima prova owner con soli dati sintetici; condividere solo ricevuta finale
o ultima fase fallita, senza transcript grezzo, password o passphrase.
Poi completare riconciliazione/rimozione esplicita dei run, mount e
restart/recreate; estendere gli altri consumer con contratti specifici.
Consegna di materiali reali e password manager fuori da questo strumento.

## Ripresa operatore del 10 novembre — VM-035

[Review del gate e residui](INF-VM-02-REVIEW.md#review-dei-residui-del-10-novembre-e-ripresa-del-pilot)
completata dopo baseline host/guest e fixture IPv4-only. Proposta circoscritta
al pilot sintetico preview, già tentato prima del problema SSH: H-05/A-05/A-30
restano parziali; nessuna deroga per servizi o materiale reali.

Il codice esistente è invariato. Prove appena ripetute: 26 Linux locali passed,
10 Windows passed/16 integrazioni Linux skipped e piano senza Execute riuscito.
Helper SHA-256 `95819d5c7f12731aba6b94bc5f870984b091cd88fee69df6d18c87c0b4d10024`;
orchestratore SHA-256 `fb5858d009f6446f9e471cbae7a3cc7c90dbe661531a8158fdc341e48520b36d`.
Gli hash sono dei sorgenti, non delle credenziali. Handshake/PTY/sudo del pilot
restano da verificare sulla VM, separatamente dai test con SSH simulato.

1. VM già avviata/sbloccata, alias SSH funzionante e nessun altro pilot attivo.
   In PowerShell Windows normale, da qualunque directory:

   ```powershell
   powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Invoke-SyntheticSecretDelivery.ps1 -Environment preview -Execute
   ```

2. Inserire passphrase e sudo soltanto nel terminale; più richieste SSH sono
   previste perché ogni fase usa una connessione separata. Non catturare o
   inoltrare il transcript; payload e password sudo usano canali distinti.
3. Attesi, nell'ordine: staged, prepared, received, applied, active, code-removed.
   Le righe «Fase» annunciano l'operazione: la ricevuta finale ne attesta il
   completamento. Riportare soltanto il JSON finale con runId, ambiente,
   helperSha256 e phases; syntheticOnly true, servicesStarted false e
   isolationAccepted false. Non è previsto un reportPath da questo launcher.
4. Se fallisce, conservare runId/ultima fase/errore senza rilanciare. La copia
   del codice può restare nella home, i file per-run nel tmpfs; non cancellarli
   alla cieca. Se riesce, il solo codice staged viene rimosso; active resta
   nel tmpfs, con riconciliazione/rimozione esplicita da gestire successivamente.

## Esito VM-035 del 10 novembre

Owner esegue il comando preview con run `dfc1af5a416f4b1abc6e8dab99034dbb`.
Ricevuta finale fornita dall'owner, validata sull'host: schema/campi esatti,
ambiente preview, consumer tox21, helperSha256 coincidente con il sorgente
locale e sei fasi nell'ordine atteso fino a code-removed. syntheticOnly true,
servicesStarted false, isolationAccepted false. Le ricevute prepared/applied
sono inoltre visibili nell'output operatore; nessuna password acquisita.

Copia dei soli metadati finali, senza transcript o payload, in
`inf-vm-04/dfc1af5a416f4b1abc6e8dab99034dbb/operator-receipt.json`, SHA-256
`2ea8bf142641697ab46c31e8f89cc818927c7f42fde8338927455fe4a6479bb1`.
L'artifact registra provenienza owner e momento della registrazione; non è
un report indipendente letto dalla VM e non ricostruisce l'orario del run.

**A-32 verificato per il trasporto sintetico:** SSH con stdin senza PTY e fasi
sudo interattive completati sulla VM; ricezione/apply e inspect metadata-only
riusciti, copia del codice per-run rimossa. L'active sintetico viene conservato
nel tmpfs dal protocollo. Non è stata fatta una seconda lettura live né una
rimozione dei file attivi: riconciliazione/rimozione selettiva è il prossimo
task, prima di eventuali mount o consumer. Nessun Tox21/NATS reale avviato,
nessun segreto reale consegnato, nessun restart/recreate applicativo verificato.
