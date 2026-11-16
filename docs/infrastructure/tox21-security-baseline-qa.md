# Revisione baseline Tox21 — 7 novembre 2026

Task attivo richiesto dopo l'integrazione Web T21-06. La CI del merge Web
`6f8219f72fe3744a99f6f4706d7f2238900c62dd` è riuscita
([run 42350697347](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/42350697347)).
Nessun nuovo merge o deployment eseguito dall'agente.

## Perimetro e branch

- **Tox21 `feature/T21-BASELINE`** parte dal branch conservato T21-07, non ne
  riscrive la storia. Include quindi anche identità immagine, exporter e gate
  di sicurezza T21-07; integrare questo branch porterà anche quelle modifiche.
- **Web `feature/T21-BASELINE`** parte dal develop già integrato T21-06: contiene
  soltanto roadmap/specifica futura auth ed evidenze di questo intervento.
  Il coordinatore di consegna del branch Web T21-07 resta separato.

## Modifica minima verificata

| Elemento | Baseline precedente | Candidato |
| --- | --- | --- |
| Python | 3.10.11 | 3.11.18 |
| Debian | 11.7 | 13.7, trixie |
| Pillow | 12.3.0 | 13.0.0 |
| Torch CPU / NumPy / RDKit | 2.13.0+cpu / 1.24.4 / 2024.3.5 | Invariati |
| Altre versioni Python risolte | Profili T21-03 | Invariate |
| Cardinalità lock | Runtime 23, training/export 39 | Invariata |

Base fissata per digest:
`python:3.11.18-slim-trixie@sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79`.
Python 3.11 è il passo minimo testato che consente Pillow 13 mantenendo i pin
scientifici: [metadati Pillow](https://pypi.org/pypi/pillow/13.0.0/json),
[ciclo Python](https://devguide.python.org/versions/).

Gli hash nativi cambiano per le wheel cp311, non perché sia stato aggiornato
indiscriminatamente lo stack. Sono conservati source hash NATS e backend di
build fissato; installazione con hash e `--no-build-isolation`, senza apt upgrade
o pacchetti di sistema flottanti. Il generatore dei lock dichiara ora il target
CPython 3.11; i percorsi di rimozione pip nel container sono coerenti.

Nessuna modifica a dati/pesi/soglie originali o al pacchetto QA. Nessun training
reale, installazione nel virtualenv Windows, variazione di auth, nuova chiave o
rotazione. L'umbrella research richiede ora Python >=3.11 per Pillow 13; ciò non
certifica tutti i tool opzionali come DeepChem o una compatibilità Windows/GPU.

## Prove locali

- Build validation pulita con **107 casi autonomi passati**, dipendenze native
  e `pip check` sui profili Linux CPU.
- Riferimento reale esplicito passato: quattro molecole/sedici predizioni,
  probabilità entro `1e-6`, soglie e booleani esatti; stesso pacchetto `qa-6f19c86`.
- PNG roundtrip Pillow e produzione PNG con Matplotlib Agg passati.
- Prova extra RDKit Draw: `libXrender.so.1` assente **sia prima sia dopo**.
  Limite preesistente di rendering opzionale, non usato dalle cinque API attive;
  nessuno stack grafico OS aggiunto per allargare il perimetro.
- Scan della sola nuova base: zero CRITICAL, 51 HIGH, 81 MEDIUM e 64 LOW;
  sistema rilevato Debian 13.7. Questo risultato non sostituisce lo scan
  dell'immagine applicativa completa.

Il candidato finale usa Tox21 SHA
`56d1b4e12ddcfa45b440280e025dac46f7ca2034`, versione locale `t21-baseline-qa`.
La verifica decisiva è la CI sull'esatto SHA e lo scan del relativo container
con policy critica invariata, nessuna eccezione o filtro ignore-unfixed.
Gli altri livelli di severità restano nei report; non si promette un'immagine
priva di vulnerabilità o una copertura scientifica completa.

Log, sorgenti puliti da git archive, distribuzioni scaricate, lock ed evidenze:
`C:/Users/giuli/.codex/artifacts/t21-baseline/`. Esiti remoti e finali sotto.

### CI sull'esatto SHA — esito verificato

[Run 42352132798](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42352132798),
SHA `56d1b4e12ddcfa45b440280e025dac46f7ca2034`: job applicativo e **Required gate
success**. Installazione pulita, 107 test, gruppi 93/9/5 senza skip, tre build/audit,
riferimento reale, cinque subject/recovery/arresto su tutti i target, SBOM/scan
e save/load verificati. Nessuna modifica del criterio bloccante per ottenere il verde.

Il container production completo passa da **18 a 0 occorrenze CRITICAL** rispetto
alla baseline esaminata in T21-07. Restano **52 HIGH, 78 MEDIUM, 63 LOW**, conservate
nel report e non dichiarate risolte. Questi sono i conteggi dell'immagine finale,
distinti da quelli della sola base sopra. SBOM: **142 componenti**.

Artifact del run scaricati e verificati, retention 14 giorni:

| Artifact | ID | Dimensione ZIP |
| --- | --- | ---: |
| `tox21-reports-56d1b4e12ddcfa45b440280e025dac46f7ca2034-1` | `13566520012` | 162876 byte |
| `tox21-model-56d1b4e12ddcfa45b440280e025dac46f7ca2034-1` | `13566271900` | 4136649 byte |

Il record del container riporta `archive_load_verified=true` e
`security_eligible=true`, digest config portabile
`sha256:739975baa01715cd49ad70dbf91e8de0ca1e188cac3f2c9ca611f8dea858f271`.
I checksum del modello scaricato sono stati ricontrollati: pesi
`cbe915a168b83829e1766655dfd2d9d6ed7047638008f03e0759e0814f700104`, soglie
`075e33c82c3ea86ef429513a582ce21d2c37094f10a91aedb59a957005c46606`:
uguali al riferimento precedente. L'export del manifest usa il nuovo SHA del
codice, senza ricostruire per supposizione la provenienza storica del training.

Lo smoke locale production sullo stesso sorgente è passato anche prima dello
scan: cinque subject, PubChem soltanto al confine di validazione, outage/recovery
senza riavvio worker, stop 0. Nessuna inferenza PubChem esterna o accettazione
Web distribuita viene dedotta da questi risultati.

Anche l'export locale completo è riuscito con uscita **0**: stesso conteggio
0/52/78/63 per CRITICAL/HIGH/MEDIUM/LOW e checksum degli evidence file
ricontrollati dopo il caricamento. Il pacchetto locale è sempre quello QA
precedente, mentre la CI esporta il proprio `ci-qa`: le due immagini hanno
identità distinte, non sono dichiarate byte-identiche.

| Evidenza locale | Valore |
| --- | --- |
| ID Docker | `sha256:c92888f2ff998070a84f4023ddf1ed6d8eec50115574fe182370e16e2bdd7fe1` |
| Digest config portabile | `sha256:31a6742450d5c881d3aa4e9207413309ffbbeba84a38a2a6368b527bc16dea5e` |
| SHA256 archivio (370035712 byte) | `757b8bd90ffc02e23aa37c1f8a2f761bbb58aa4813dd9e6b47231f18d366db0c` |
| SHA256 SBOM | `8f889d5ce5e3e66462741c1b7780dffa614007ee8b0612364b882b97add6530a` |

Container/reti QA rimossi; immagini, archivi e cache conservati. Nessun servizio
personale è stato arrestato o sostituito e nessun archivio immagine pubblicato.

## Futuro auth — solo documentazione

Inserito **T21-11** con la [specifica degli override JWT per servizio](tox21-service-auth-plan.md):
`allow` e `deny-withouth-access-token` prevalgono sul globale; `disabled`, anche
quando il flag è omesso, eredita il globale. Sono cinque flag indipendenti.
Nessun codice auth implementato o modifica nascosta al task corrente.

## Dopo la baseline

Completare gli artifact reali Web e il manifest coordinato di T21-07; soltanto
poi eseguire T21-08. Restano separati il CronJob PostgreSQL, la futura gestione
JWT granulare e T21-10 scientifico. La rinomina preview resta source of truth.
