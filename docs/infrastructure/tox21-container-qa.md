# T21-04 — Container applicativi Tox21

6 novembre 2026. Intervento su `feature/T21-04`, derivato dai branch T21-09
non ancora integrati. Nessun merge, pubblicazione di immagini o deployment.

## Risultato e confini

Un solo Dockerfile Tox21 espone `test`, `staging`, `production` (default), con
base Python 3.10.11 fissata per digest e profili Linux amd64 CPU con hash.
Tutti i target avviano `python -m main` con UID/GID `10021:10021`; cambia
`PY_ENV`, quindi namespace NATS e politica di configurazione già concordati.
Staging/production non leggono dotenv. Il target test richiede il superamento
dei 99 test autonomi in uno stadio separato; nel runtime conserva solo un
marcatore dell'esito, senza sorgenti o dipendenze training/test.

La `.dockerignore` ammette esplicitamente sorgenti/lock/test necessari alla
build. Le copie finali selezionano soltanto bootstrap, API, schemi, rete,
fingerprint, label e caricamento del pacchetto. Dataset, notebook, output
storici, virtualenv host, Git, configurazioni e chiavi restano esclusi.
Pandas, scikit-learn, matplotlib e moduli di training/export non sono importabili
nelle immagini finali. Torch e setuptools restano dipendenze runtime; non è
stato aggiunto un compilatore. Pip è rimosso dal virtualenv e dal Python base.

Il pacchetto modello è un contesto BuildKit distinto `model_package`, dal quale
si copiano soltanto `weights.pt`, `thresholds.json`, `manifest.json`. Non viene
copiata l'intera cartella `outputs`. Ogni target carica il pacchetto ed esegue
una predizione reale durante la build; il percorso esplicito non ha fallback.
Versione non vuota e SHA completo sono obbligatori e registrati nelle label
OCI insieme al repository sorgente. Lo SHA è un input dichiarato: la verifica
richiede una build da sorgenti puliti, non basta assegnare una label.

Auth interna pubblica/all-or-nothing conservata. L'eventuale percorso RS256
richiede il PEM pubblico montato read-only, anche in staging/production.
Nessuna chiave nell'immagine e nessuna rotazione aggiunta.

## Snapshot e prove locali

Sorgente delle tre immagini: Tox21
`a3a408ae34fd380d13fa4d8d866bc8b961992ffd`, estratto con `git archive`;
versione esplicita `t21-04-qa`. Le modifiche documentali successive non cambiano
quel codice. Base:
`python:3.10.11-slim@sha256:fd86924ba14682eb11a3c244f60a35b5dfe3267cbf26d883fb5c14813ce926f1`.
Pacchetto QA T21-03 `qa-6f19c86`, 627 campioni di validazione, pesi SHA256
`cbe915a168b83829e1766655dfd2d9d6ed7047638008f03e0759e0814f700104`.
Non è un modello nuovo, un retraining, una release o una certificazione
della provenienza storica/qualità scientifica del modello.

| Target / tag locale | Image ID SHA256 | Dimensione riportata da Docker |
| --- | --- | ---: |
| `mercurion-t21-04-test` | `d5f21800f29c8a5e2495667e7692fcf52fc03e7f9208a85f6e3d7c9cd1c51e67` | 1633650679 byte |
| `mercurion-t21-04-staging` | `5ed2adf4da7eb50d125909bef37534dd2bc6f6849338a57004ab8c37f6126808` | 1633629566 byte |
| `mercurion-t21-04-production` | `1efab455b165620b2065788ea520f344adeaa9065734776cb858d56169469153` | 1633629578 byte |

Sono identità locali, non digest verificati dopo push/pull da registry. La
dimensione, circa 1,52 GiB per immagine, comprende Python, librerie native e
Torch CPU; il confine training/runtime verificato non implica un'immagine piccola.

- Tre build riuscite da snapshot pulito; il gate test ha eseguito **99 casi**.
- Tre audit offline con `scripts/check_container_image.py`: label, ambiente,
  architettura, comando, utente, contenuto previsto, assenza training/test/pip,
  due predizioni identiche `CCO`, quattro label con probabilità valide.
- Tre smoke con `scripts/smoke_container.py`: avvio mediante CMD predefinito,
  richiesta di inferenza reale sul namespace corretto, SIGTERM e uscita **0**.
  NATS fissato per digest, rete Docker interna dedicata, nessuna porta host.
- Tutti gli audit/smoke usano filesystem read-only, capability rimosse,
  `no-new-privileges` e `/tmp` temporaneo dedicato da 64 MiB; UID/GID 10021.
- Riferimento predittivo T21-09 passato separatamente nell'immagine production:
  quattro molecole, sedici predizioni, tolleranza probabilità `1e-6`, soglie e
  booleani esatti. Test/fixture montati read-only dall'esterno, non incorporati.
- Verifica effettiva del contesto con Dockerfile di audit esterno `FROM scratch`
  e `COPY . /context/`: **53 file, 156754 byte** ammessi. File sentinella
  sintetici in `.env`, chiavi, `.git`, `.venv`, dataset/output/notebook, cache e
  directory editor esclusi; nessun file personale usato per questa prova.
- Prove negative: soglie alterate → `ModelPackageError: Model package checksum
  mismatch: thresholds.json`; versione omessa e SHA abbreviato → build fallita
  con la rispettiva diagnostica. Nessun fallback.
- Compose Tox21 risolto con `--env-file` esplicitamente vuoto e variabili
  sintetiche: target, contesto modello, identità, broker e read-only coerenti.

Comandi ed esiti nel [manuale Tox21](https://github.com/giuliomarinelli/MercurionTox21/blob/eb1e47b0df6c4fc7ef7a5fa34121bbac7858805d/docs/containers.md).
Consegna Tox21: `eb1e47b0df6c4fc7ef7a5fa34121bbac7858805d`; rispetto allo SHA
immagini sopra, il commit successivo aggiunge soltanto documentazione.
Log, snapshot e risultati JSON locali in
`C:/Users/giuli/.codex/artifacts/t21-04/`. Container e rete QA rimossi dagli
smoke; immagini/cache conservate. Nessun processo/servizio dell'utente toccato.

## Residui distinti

T21-05 porta test/build/smoke in CI, con copertura del broker più ampia della
singola inferenza qui usata per provare CMD e arresto. Non è stata eseguita una
CI remota, né una prova PubChem reale, TLS/auth attiva o recovery del broker.
Le immagini non hanno porte o healthcheck HTTP fittizi.

Il Compose locale Tox21 ora richiede contesto modello, versione, SHA e URL
broker espliciti; usa ancora la rete esterna storica. Il Compose beta Web
riferisce ancora il vecchio percorso e `Dockerfile.staging`: **non è compatibile
con questa consegna**. La sua migrazione e l'inventario dei manifest restano
T21-06. Nessuna riscrittura implicita della topologia VM.

T21-07 assegna e registra la consegna coordinata; T21-08 prova l'integrazione
non produttiva. I TODO manuali Web e il limite degli import scientifici Windows
restano aperti. L'evidenza di questo task riguarda esclusivamente Linux CPU.

Seguito: **T21-05 completato**, con [CI sull'esatto SHA, tre build/audit e
cinque subject con recovery del broker](tox21-ci-qa.md). I residui CI indicati
sopra descrivono la consegna T21-04; sono ora coperti dal verbale successivo.
L'integrazione di distribuzione Web resta T21-06.
