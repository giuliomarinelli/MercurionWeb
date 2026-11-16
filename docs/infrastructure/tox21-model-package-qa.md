# T21-03 — Pacchetto modello coerente e dipendenze separate

**6 novembre 2026 — completato sul target Linux x86_64 / Python 3.10.11 / CPU.** Implementazione nel repository Tox21, branch `feature/T21-03`, commit `6f19c869a0d99209fc78eb6a909d1f45897118a8`, derivato dal T21-02 non ancora integrato. [Contratto, comandi e limiti Tox21](https://github.com/giuliomarinelli/MercurionTox21/blob/6f19c869a0d99209fc78eb6a909d1f45897118a8/docs/model-package.md). Aggiornamenti Web su `docs/tox21-container-roadmap`. Commit/push senza firma per comando; nessun merge, deployment o addestramento sul dataset tracciato.

## Cambiamento applicativo

Il comando locale `python -m mercurion.export_model` ricarica una copia del checkpoint selezionato, calcola le predizioni sul solo validation set e ricalibra soglie globali/per-label con la ricerca F1 già esistente. Usa copie coerenti dei byte di checkpoint, `X_val.npy` e `y_val.npy`; non legge training/test set e non modifica gli originali.

Pubblica in una nuova directory, dopo validazione e rename sullo stesso filesystem, un pacchetto di tre file:

| File | Contratto |
| --- | --- |
| `weights.pt` | Copia byte-per-byte del checkpoint usato per calibrare |
| `thresholds.json` | Soglia globale e soglie delle quattro label, ottenute da quel checkpoint |
| `manifest.json` | Schema, identità del modello, revisione dell’export, rete, fingerprint, label, versioni librerie e checksum di file/input di calibrazione |

Il runtime seleziona il pacchetto tramite `MODEL_PACKAGE_DIR`; verifica inventario, hash, schema, compatibilità di rete/fingerprint/label, metadati di calibrazione, soglie e versioni Torch/NumPy/RDKit. I pesi vengono poi caricati con `weights_only=True` e controllo dello state dict. Un pacchetto esplicito invalido impedisce l’avvio: nessun fallback ai vecchi file.

Se la variabile non è impostata, resta il percorso legacy per non invalidare gli artefatti esistenti. Questo percorso non acquisisce retroattivamente garanzie di coerenza o provenienza. Le immagini applicative runtime-only dovranno adottare esplicitamente il pacchetto in T21-04.

Anche la conclusione di `train_model` ora ricarica il checkpoint scelto da early stopping e ricalcola entrambe le soglie sulla validazione. La consegna atomica resta il pacchetto, non i singoli file legacy. Fingerprint e calibrazione sono riusati senza importare la pipeline di training nel servizio; nessuna variazione di algoritmo, ordine delle label, wire NATS o policy auth.

## Dipendenze e installazione pulita

Profili dedicati e lock con hash, mantenendo le versioni applicative esistenti:

- **23 distribuzioni** nel runtime Linux CPU.
- **39 distribuzioni** nel profilo locale training/export/valutazione, inclusivo del runtime.
- Backend setuptools fissato separatamente: NATS 2.9.0 è distribuito come sorgente. Installazione con `--require-hashes` e `--no-build-isolation`, dopo il backend verificato.

Base verificata: `python:3.10.11-slim@sha256:fd86924ba14682eb11a3c244f60a35b5dfe3267cbf26d883fb5c14813ce926f1`, target Linux x86_64. Torch usa la build CPU ufficiale della stessa versione; niente aggiornamento indiscriminato delle dipendenze. Download da PyPI/indice CPU PyTorch, seguito da installazione offline dai file verificati, `pip check` e import nativi riusciti in due ambienti puliti. Le dipendenze di ricerca opzionali, inclusa acquisizione dataset tramite DeepChem, restano nel precedente insieme di sviluppo e non sono dichiarate coperte dai nuovi profili core.

Creati soltanto per la verifica i tag locali `mercurion-t21-03-runtime-check` e `mercurion-t21-03-training-check`; non sono immagini applicative distribuite o pubblicate. I Dockerfile Tox21 esistenti non sono ancora consolidati né migrati ai profili: è il successivo lavoro T21-04. Script di generazione dei lock e procedura di riproduzione sono nel repository Tox21.

## Prove eseguite

| Ambiente | Esito e limite |
| --- | --- |
| Linux pulito, profilo training/export, rete disabilitata durante i test | **74 test passati**: include i test applicativi preesistenti, quattro test della pipeline, pacchetto, esportazione, inferenza e regressione checkpoint. Quest’ultima usa due minuscole epoche sintetiche in una directory temporanea, con primo checkpoint selezionato e modello finale diverso |
| Linux pulito, solo profilo e sorgenti runtime, rete disabilitata | **63 test passati**. Codice di training, exporter/calibrazione e dipendenze pandas/scikit-learn/matplotlib assenti |
| Virtualenv Windows esistente, gruppo applicativo/strutturale | **63 test passati**, senza reinstallare o modificare la virtualenv |
| Virtualenv Windows esistente, pacchetto reale prodotto su Linux | Loader e due predizioni identiche di `CCO` su CPU passati, con le quattro label attese; nessun broker o file di configurazione personale letto |
| Virtualenv Windows, gruppo scientifico esteso | Timeout diagnostico di 40 secondi durante import nativi scikit-learn; processo di test terminato. Nessun risultato positivo attribuito a quel gruppo, nessuna causa definitiva o riparazione dichiarata |

I gruppi si sovrappongono: i conteggi non si sommano. La pulizia degli ambienti Linux e l’assenza delle dipendenze training sono state verificate, non dedotte dai nomi dei file requirements. I contesti di prova contengono soltanto codice selezionato; nessun `.env`, PEM o virtualenv personale trasferito nei container.

## Esportazione reale isolata

Sul sorgente committato `6f19c869a0d99209fc78eb6a909d1f45897118a8` è stato esportato un pacchetto QA usando copie dei pesi selezionati e dei **627 campioni di validazione** tracciati. Il runtime minimale lo ha verificato e ha predetto due volte `CCO` con risultati identici e le quattro label attese, con probabilità in `[0, 1]`. Nessun NATS o PubChem; nessun codice o libreria di training nel processo di inferenza.

- Identificativo QA: `qa-6f19c86`; non è una release del modello assegnata al prodotto.
- Pacchetto locale: `C:/Users/giuli/.codex/artifacts/t21-03-packages/verified-6f19c86/`.
- Dimensione dei tre file: **4.469.311 byte**.
- SHA-256 dei pesi: `cbe915a168b83829e1766655dfd2d9d6ed7047638008f03e0759e0814f700104`, identico allo snapshot di input.
- Loader + prima inferenza isolata: **1,295 secondi** nel controllo finale. È una misura locale indicativa, non il tempo di readiness dell’intero servizio o uno SLO.

La revisione nel manifest identifica il codice di esportazione: non prova quale sorgente sia stato usato storicamente per addestrare i pesi esistenti. I checksum identificano gli input di calibrazione, senza dimostrarne l’indipendenza originale dal training. Non si certificano qualità scientifica, assenza di leakage storico o provenienza sconosciuta del modello. Hash/inventario rilevano alterazioni e consegne incomplete, non sostituiscono una firma autorevole del pacchetto.

I controlli sugli hash e sullo stato Git confermano che dataset, pesi, soglie e copie storiche originali sono rimasti invariati. Il nuovo pacchetto QA è fuori dai repository. `outputs/packages/` è ignorato per evitare commit accidentali di nuove esportazioni locali.

## Residui e prossima attività

Nessun nuovo training reale, supporto GPU, riparazione delle librerie native Windows, avvio completo del worker, test con broker esterno, provider, browser o CI remota. Restano i controlli di qualità scientifica T21-10, la suite applicativa residua T21-09, Dockerfile T21-04 e CI T21-05. L’auth e il rinvio della rotazione acquisiti in T21-02 restano invariati.

Prossimo intervento della sequenza: **T21-09**, chiusura delle lacune residue nella suite prima del refactor container; T21-03 ne ha già coperto pacchetto, calibrazione e una regressione di inferenza reale. In seguito T21-04 adotta profili e package mode nei target Docker.

Log, download, lock di verifica e contesti selezionati sono conservati in `C:/Users/giuli/.codex/artifacts/t21-03-dependencies/`, `t21-03-source/`, `t21-03-runtime-source/`, `t21-03-real-inputs/` e `t21-03-packages/`. Nessun servizio dell’utente fermato o riconfigurato; i container di prova sono stati rimossi con `--rm`.
