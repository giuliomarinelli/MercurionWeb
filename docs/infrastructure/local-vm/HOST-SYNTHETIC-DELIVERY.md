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
