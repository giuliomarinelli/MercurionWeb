# INF-VM-04-A/B — ricevitore e apply locale

9 novembre 2026. Primo percorso implementato per **Tox21 / coppia NATS**.
Prove Linux locali su Docker Desktop, file sintetici e tmpfs. Nessun helper
installato sulla VM, connessione SSH, materiale reale o servizio avviato.

## Contratto

[secret_delivery.py](../../../scripts/infrastructure/secret_delivery.py) espone
`prepare`, `receive`, `apply` e `inspect`. Solo `receive` legge stdin; questa
fase e `inspect` richiedono un utente non-root. Preparazione e apply richiedono
root e ricevono esclusivamente metadati. Nessuna chiamata shell, Docker o SSH.
L'[orchestratore host sintetico](HOST-SYNTHETIC-DELIVERY.md) è implementato;
collaudo del trasporto reale e adozione VM restano aperti.

Envelope UTF-8 con esattamente questi campi; valori esclusivamente sintetici:

```json
{
  "schemaVersion": 1,
  "runId": "11111111111111111111111111111111",
  "environment": "preview",
  "consumer": "tox21",
  "variables": {
    "NATS_USERNAME": "synthetic-tox21",
    "NATS_PASSWORD": "synthetic-not-a-secret"
  }
}
```

- Run-id: 32 caratteri esadecimali minuscoli; nessun percorso nel payload.
- Ambiente: `preview` o `production`, concorde con quello fissato da `prepare`.
- Consumer: solo `tox21`; esattamente le due variabili NATS non vuote.
- Massimo 1 MiB sia in ingresso sia nel documento consumer serializzato.
  Rifiutati duplicati JSON, costanti non JSON, profondità eccessiva, NUL,
  surrogate isolate, tipi errati e campi aggiuntivi.
- UID/GID, percorsi, nomi file, comandi, policy JWT e PEM fuori dal payload.

Output consumer compatibile con l'adapter Tox21: `schemaVersion`,
`environment`, `variables`; `preview` diventa `staging`. Il pubblico PEM
rimane una consegna separata.

## Filesystem e identità

Namespace fisso `/run/mercurion-bootstrap/<runId>`, senza parametro di percorso.
Richiesti Linux, mount tmpfs effettivo su `/run`, directory root-owned protette
e assenza di mount annidati nel namespace. Questo non certifica swap, dump o
snapshot della VM. Root e amministratori Docker restano nel confine fidato.

| Oggetto | Proprietario / modo | Funzione |
| --- | --- | --- |
| Namespace e run | root / `0711` | Attraversabili ma non elencabili dall'utente SSH |
| `state.json` | root / `0600` | Ambiente e identità dell'account locale scelto dall'operatore |
| `inbox` prima dell'apply | utente SSH / `0700` | Ricezione non privilegiata |
| `inbox/payload.json` | utente SSH / `0600` | Creazione esclusiva |
| `applying` durante preparazione | root / `0700` | Prenotazione esclusiva e materiale non pubblicato |
| `active` finale | root / `0511` | Directory attraversabile dal consumer |
| `active/bootstrap.json` | `10021:10021` / `0400` | Lettura da UID Tox21 o root |
| `inbox` dopo apply | root / `0500` | Sigillata, payload eliminato |

`prepare` risolve un account locale non-root; identità mai ricevute dal payload.
Ricezione/apply usano un lock non bloccante. L'apply rilegge e rivalida il
contenuto, verifica ownership, modo, file regolare e singolo hard link.
Aperture no-follow/non-blocking, letture limitate anche in caso di crescita;
symlink, hard link e FIFO rifiutati. Pubblicazione con rename soltanto dopo
scrittura completa; nessuna sovrascrittura del materiale attivo.

Il futuro manifest monterà **solo il file/directory attivo del consumer in
sola lettura**. Un UID proprietario potrebbe altrimenti cambiare i permessi
del proprio file. Inbox e `applying` non sono sorgenti per mount applicativi.

## Errori e lifecycle

Ricevute: versione, run-id, consumer, fase; `servicesStarted=false` e
`isolationAccepted=false`. Errori CLI costanti, senza eccezioni grezze,
contenuti, percorsi o hash dei segreti.

Run-id non riutilizzabili nello stesso boot. Un apply interrotto conserva la
prenotazione e lo stato diagnostico: nessun retry automatico. Un crash tra
pubblicazione e rimozione può lasciare una copia nella inbox privata;
non si promette cleanup dopo ogni interruzione. La riconciliazione operativa
e la rimozione dei run non sono implementate.

I file attivi rimangono dopo l'uscita dell'helper. Reboot/perdita tmpfs richiedono
nuova consegna; niente fallback automatico. Prima di eliminare un run occorrerà
fermare i consumer interessati: [contratto lifecycle](BOOTSTRAP-CONTRACT.md).

## Prova locale ripetibile

Dalla root Web, comando realmente eseguito con PowerShell 5.1:

```powershell
powershell -NoProfile -File scripts/infrastructure/Test-SecretDelivery.ps1
```

[Script](../../../scripts/infrastructure/Test-SecretDelivery.ps1): contesto
`desktop-linux` locale su named pipe, immagine Python già presente fissata per
ID, nessun pull. Un container senza rete, sorgenti read-only, risorse limitate,
tmpfs effimeri e capability ristrette ai test di identità/proprietà/accesso root.
Il lettore `../MercurionTox21/secret_bootstrap.py` è montato read-only.
`-ValidateOnly` controlla i prerequisiti senza creare container.
Docker `--rm` rimuove container e tmpfs; nessuna rete, porta o volume creati.

**Prima consegna: 17 test Linux passati**, con processi root/UID 65534/UID 10021 distinti,
lettore Tox21 reale, negazione ad altro UID, replay, payload manomesso,
permessi/file impropri, lock occupato, limiti, assenza tmpfs e fallimento prima
della pubblicazione. Windows: 4 test contratto passati, 13 integrazioni escluse.

Estensione con orchestratore/inspect: **26 test Linux passati**; Windows 10
passati e 16 integrazioni escluse. Il harness ora include home tmpfs sintetica
per l'account di test; nessuna modifica al database degli utenti del container.

Le letture ripetute attestano permanenza dopo l'uscita dell'apply, non
restart/recreate di container applicativi, trasporto SSH, boot completo Tox21,
broker operativo o filesystem VM. Nessuna nuova immagine release costruita.

## Residui e ordine successivo

1. Orchestratore sintetico implementato/testato localmente: prova operatore
   del trasporto SSH e dei prompt prima di dichiarare la consegna VM verificata.
2. Review/prova VM esplicita, senza materiale reale, rispettando gate 02/03;
   verificare filesystem, mount, UID e riconciliazione degli stati interrotti.
3. Contratti per Nest/server, configurazioni broker e mount; restart/recreate
   reali. Nessuna allowlist generica per scrivere file arbitrari.

INF-VM-04 resta parziale; nessun provisioning o deployment implicito.
