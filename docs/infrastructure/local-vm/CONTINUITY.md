# Punto di ripresa — aggiornamento 11 novembre 2026

La pausa è terminata per istruzione esplicita dell'owner. VM accesa/LUKS
sbloccato; scelti provider reali preparati dall'owner e hostname
`preview.mercurion.app`. Non leggere il file privato o dotenv/PEM operativi.
Master Meilisearch solo server; chiavi applicative create via curl.

La [preparazione VM-042](PREVIEW-BOOTSTRAP.md) documenta il lavoro corrente:
configurazione privata, manifest operativi, ricette server aggiornate,
export Web staging esteso alla CI e collaudo locale completo riuscito con
valori sintetici. Bootstrap reale guest ancora da completare; non avviare
Compose direttamente dai manifest preparatori. Le immagini Web QA non
sono le immagini definitive dal commit CI. La prova non chiude H-05/A-05/A-30.

Una modifica dell'owner alla site key pubblica Angular staging è apparsa
durante il lavoro: preservarla e concordarne l'inclusione. Preservare anche
il `__pycache__` preesistente. Nessun merge autorizzato. Registrare CI ed
export definitivi nei report esterni senza ripetere CI solo per una ricevuta.

## Snapshot storico della pausa del 10 novembre

Le sezioni seguenti descrivono lo stato **prima** della ripresa dell'11
novembre; decisioni aperte e modifiche non validate sono superate dal punto
di ripresa sopra e da PREVIEW-BOOTSTRAP.md.

**Pausa esplicita dell'owner: «riprendiamo domani».** Nessuna attività
in background o operazione VM da continuare durante la pausa.

## Ultima milestone conclusa

VM-041 verificata: Tox21/NATS reali sulla VM, load/save con digest coerenti,
tre lifecycle RPC, nove negazioni NATS, tre stop e cleanup senza errori.
Report recuperato separatamente dopo chiusura del primo SCP, senza
rieseguire il pilot. [Procedura ed evidenze](TOX21-VM-PILOT.md).

Web operativo: `feature/infra-vm-docker-engine-architecture`, SHA
`f3c4c4873e05f7e152d01ae2ecc5a869630ef7e8`, pubblicato.
[CI full 42880413194](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/42880413194)
verde, Required gate incluso. Tox21 operativo invariato:
`feature/infra-vm-nats-client-auth`, SHA
`d506101ec27c985ef4ddb280266bfcdc4b6bf1c4`, CI 42858304379 verde.
Nessun merge autorizzato all'agente; continuare dai branch operativi.

## Lavoro avviato verso lo stack preview (VM-042)

**Modifiche locali non ancora committate o validate dopo gli ultimi edit:**

- `MercurionWebNode/Dockerfile`: staging usa le dipendenze runtime già
  preparate per production e solo i package compilati; rimozione degli
  artefatti TypeScript/map e label esplicite dell'ambiente.
- `MercurionWebNg/Dockerfile`: label ambiente sui tre target.
- `scripts/export-web-container.py`: target staging/production esplicito,
  default production conservato; controlli di coerenza label/APP_ENV e
  verifica della presenza del launcher bootstrap Nest nell'audit.
- `scripts/test-coordinate-delivery.py`: due nuovi test per staging e
  impossibilità di scambiare target/frontend privi di provenienza.

Il precedente gate verde certifica f3c4c487, non questi edit. Nessuna nuova
CI o build Web eseguita; nessun container applicativo o servizio VM avviato
in questo task. Non dichiarare la preview pronta. Il `__pycache__` non
tracciato in `scripts/infrastructure` era già presente: preservarlo.

## Scansioni delle dipendenze infrastrutturali

Artefatti esterni a Git:

```text
C:/Users/giuli/.codex/artifacts/inf-vm-04/vm042-preview/
  initial-postgres/{image.tar,vulnerabilities.json,summary.json}
  initial-redis/{image.tar,vulnerabilities.json,summary.json}
  initial-meilisearch/{image.tar,vulnerabilities.json,summary.json}
  scan-initial-services.py
```

Scan Trivy fissato per digest, nessun ignore o esclusione di gravità:

| Immagine locale precedente | Finding (occorrenze, non CVE uniche) | Esito |
| --- | ---: | --- |
| PostgreSQL 16/pgvector `0d00971a33d0…` | 872 | Respinta |
| Redis `4521b581dbdd…` | 327 | Respinta |
| Meilisearch `8cd411ba5d9e…` | 62 | Respinta |

Le scansioni sono terminate. Nessuna immagine respinta trasferita alla VM.
Non riutilizzare i container o volumi di sviluppo per il nuovo deployment.
La policy strict resta invariata: tutte le gravità bloccano, senza deroghe.

Consultato anche l'indice ufficiale Wolfi: disponibili PostgreSQL 16 e
Meilisearch; il pacchetto pgvector per 16 osservato è vecchio rispetto a
quello per 18. È solo inventario, **nessuna migrazione a PostgreSQL 18 o
scelta alternativa di Redis approvata**. Selezionare e scansionare runtime
compatibili mantenendo PostgreSQL 16/pgvector e i contratti concordati.

## Decisione ancora da ricevere

È stato chiesto all'owner come gestire il primo bootstrap dei provider:
valori reali preparati dall'owner in un file locale, oppure primo collaudo
isolato con valori sintetici e provider rimandati. La risposta ricevuta è
la pausa, **non** una scelta fra le due opzioni. Non inferire un consenso
dal valore preselezionato della domanda.

Non leggere dotenv/PEM/credenziali personali o chiedere valori in chat.
SSH, passphrase e sudo restano nel terminale dell'owner. I segreti interni
per preview devono essere distinti da produzione e dai dati di sviluppo.

## Ripresa operativa

1. Rileggere questo checkpoint e verificare le modifiche dell'owner prima
   di riprendere gli edit. Conservare la base operativa e il lavoro locale.
2. Verificare i nuovi test dell'exporter e completare la scansione strict
   anche degli artefatti Web staging nel workflow: oggi gli export/scan
   completi sono registrati solo per i target production.
3. Risolvere le immagini infrastrutturali respinte, predisporre manifest
   reali e bootstrap riusando i contratti esistenti. Acquisire la scelta
   sui provider senza ripetere audit già disponibili.
4. Procedere per la milestone preview, con prove locali proporzionate e
   una CI finale per il blocco coerente. Non frammentare ogni ricevuta in
   un nuovo ciclo completo; conservare le evidenze fuori da Git.

H-05/A-05/A-30 e il tunnel pubblico restano separati e aperti. Nessun cambio
a firewall/ACL/router, Cloudflare, produzione o merge implicito.
