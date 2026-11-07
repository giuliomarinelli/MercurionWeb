# T21-09 — Suite applicativa e regressione dei contratti

**6 novembre 2026 — completato nel perimetro di test locale.** Seguito di [T21-00](tox21-design-test-inventory.md), [T21-02](tox21-runtime-qa.md) e [T21-03](tox21-model-package-qa.md). Lavoro su `feature/T21-09` in entrambi i repository, derivato dai rispettivi branch precedenti non integrati. Nessun merge, cambio auth, nuovo training reale o deployment.

Consegna Tox21: commit `b4c301cd685dbb169b7b4b0145bb517ba0a32777`, pubblicato senza firma GPG. [Gruppi e istruzioni nel repository Tox21](https://github.com/giuliomarinelli/MercurionTox21/blob/b4c301cd685dbb169b7b4b0145bb517ba0a32777/docs/application-testing.md). Fixture wire verificata identica nei due repository, SHA-256 `3a09bc0f027859b958707bd2749a8144026b8225d701864f272086dcfb965c3d`.

## Risultato

La suite ora ha gruppi espliciti basati su `unittest`, senza dipendenze da broker o servizi reali per il percorso ordinario:

| Gruppo Python | Casi | Perimetro |
| --- | ---: | --- |
| `application` (default) | 85 | Configurazione, PEM/JWT sintetici, handler, RDKit, client PubChem sostituito, inferenza a logits noti e struttura del pacchetto |
| `model` | 9 | Pesi sintetici reali, esportazione/calibrazione, corruzione del formato e incompatibilità del loader |
| `training` | 5 | Preprocessing sintetico, soglie e due piccole epoche in directory temporanea per la selezione del checkpoint |
| `all` | 99 | Gruppi precedenti senza duplicazioni; non richiede modello/dataset personali |
| `reference` | 1 | Pacchetto reale identificato da hash; quattro molecole e sedici risultati per label confrontati con il codice precedente |

Comando nel repository Tox21: `python -B scripts/run_tests.py application` oppure `all`, `model`, `training`, `reference`. Il gruppo reference è esplicito, fuori dalla discovery `test_*.py`, e richiede `MODEL_PACKAGE_DIR`: non viene saltato automaticamente in sua assenza. La discovery standard rimane utilizzabile per la suite autonoma sul profilo training. Documentazione e prerequisiti sono in `docs/application-testing.md` del repository Tox21.

## Due difetti riprodotti prima delle correzioni

1. Inferenza con logits non finiti, dimensioni errate o soglie legacy invalide poteva produrre dati inutilizzabili o errori tardivi. Ora viene rifiutata prima di restituire una predizione. Restano invariati sigmoid, mapping delle dodici label alle quattro esposte e confronto stretto `probability > threshold`.
2. Un errore nell’invio della risposta NATS veniva intercettato come errore applicativo e causava un secondo tentativo di invio `InternalError`. Il nuovo `ResponseDeliveryError` viene propagato senza seconda risposta, anche dagli handler dei cinque subject; cancellazione e fallimento della risposta di errore hanno casi dedicati. La serializzazione avviene prima del confine di trasporto e rifiuta NaN/inf: se il risultato non è serializzabile si può ancora inviare un solo `InternalError`. Non si introduce una policy di retry o un nuovo payload di errore.

I test numerici verificano valori attesi indipendenti su logits noti, soglia esatta, assenza di gradienti, dtype/shape e immutabilità di modello e soglie. I test sugli errori non permettono che dettagli sintetici riservati o token finiscano nella risposta. Questi interventi non cambiano i risultati validi o la politica auth acquisita in T21-02.

## Fixture condivisa e riferimento predittivo

La fixture sintetica `tox21-wire.json`, identica nei due repository, viene esercitata dagli handler Python e dai validatori Web per tutti i cinque contratti. In Web è un input di test tracciato in `MercurionWebNode/src/contracts/fixtures/`, consumato da `tox21-wire-fixture.spec.ts`: nessuna dipendenza della CI Web dal checkout sibling o da un servizio Tox21 attivo. Gli stub scientifici della prova Python non vengono presentati come inferenza o risposta PubChem reale.

La fixture predittiva `tests/fixtures/model-reference.json` di Tox21 è stata invece prodotta con **il sorgente precedente `6f19c869a0d99209fc78eb6a909d1f45897118a8`**, verificando contro Git i file usati, e il pacchetto reale QA di T21-03. Registra hash di pesi/soglie e tolleranza assoluta `1e-6` sulle probabilità; soglie e flag devono coincidere. Input: `CCO`, `c1ccccc1`, `CC(=O)O`, `C[C@H](O)F`. Il candidato non ha generato le proprie attese. Non è una valutazione scientifica o un certificato di accuratezza/provenienza del modello.

Le fixture non si aggiornano automaticamente al fallimento: prima distinguere regressione, modifica intenzionale del modello/contratto o differenza di piattaforma. I due snapshot wire vanno aggiornati insieme con revisione esplicita, conservando la provenienza; non viene introdotto un terzo repository di contratti o un fetch remoto obbligatorio.

## Matrice aggiornata delle lacune iniziali

Gli esiti sotto riguardano il livello di test dichiarato, non l’intera accettazione operativa del progetto. La [matrice T21-00](tox21-design-test-inventory.md) conserva le evidenze iniziali.

| Caso | Copertura locale acquisita | Residuo separato |
| --- | --- | --- |
| R-01 configurazione/import | Ambienti, precedenze, valori invalidi, isolamento, import senza file modello/chiavi/rete | Avvio effettivo del container applicativo T21-04/05 |
| R-02 envelope/confini | Limiti validi esatti, envelope anomali, payload non ripescato dai campi esterni, stessa fixture validata Python/Web | Trasporto reale T21-05/08 |
| R-03 auth | Modalità tutto-o-nulla preservata; firma/scadenza/audience/algoritmo e PEM sintetici in T21-02 | Nessuna rotazione coordinata introdotta; resta rinviata |
| R-04 namespace | Cinque subject nei quattro ambienti su entrambi i lati, più bootstrap simulato | Sottoscrizioni reali nel broker T21-05 |
| R-05 fingerprint/label | Bit condivisi, dtype e dimensione; mapping su logits noti e quattro predizioni reali di riferimento | Modelli/parametri nuovi richiedono una propria validazione |
| R-06 inferenza | Sigmoid, `>` alla soglia, NaN/inf, shape, no-grad e immutabilità; loader in eval | GPU e prestazioni non certificate |
| R-07 loader | File/hash/metadati, archivio corrotto anche con hash aggiornato, state dict incompatibile e versione libreria errata prima del caricamento | Distribuzione delle immagini T21-04/07 |
| R-08 checkpoint/soglie | Calibrazione sul checkpoint selezionato, esportazione atomica, assenza di lettura del test set in T21-03 | Qualità dei nuovi modelli T21-10 |
| R-09 RDKit | SMILES chimicamente invalidi, canonicalizzazione/fallback, descrittori null e confronto false | Nessuna riscrittura dell’algoritmo chimico |
| R-10 PubChem | Canonicalizzazione reale, client sostituito al confine, composto assente, nome assente ed errore del client; non blocco del loop | Provider reale con autorizzazione/prova dedicata |
| R-11 errori/risposte | Errori interni dei cinque handler, dati sensibili esclusi, fallimento di consegna senza doppio tentativo, cancellazione | Diagnostica del trasporto reale T21-05/08 |
| R-12 lifecycle | Startup incompleto, stop, cancellazione, reconnect/close simulati e cleanup in T21-02 | Interruzione/riconnessione NATS reale T21-05/08 |
| R-13 confine runtime | 85 test nel profilo/sorgenti runtime-only, assenza training già provata in T21-03; fixture modello fuori dal codice applicativo | Immagini finali consolidate e verifica del loro contenuto T21-04 |
| R-14 modello reale | Quattro molecole su pacchetto identificato, attese congelate sul parent, CPU Linux/Windows | Valutazione scientifica e nuovi modelli T21-10 |

**Precisazione sull’audit iniziale:** `are_same_structure` intercetta già gli errori di SMILES/canonicalizzazione e restituisce `False`. La precedente lettura del solo callback era incompleta; non è necessario convertirlo in `Invalid SMILES` o `InternalError`. Le nuove prove proteggono quel risultato esistente; nessuna decisione di prodotto è stata presa per uniformarlo agli altri handler.

## Verifiche e limiti

- Linux CPU nel profilo training/export isolato: **99 test passati**, anche con ordine dei casi invertito.
- Runtime-only Linux, senza sorgenti/dependenze training: **85 test passati**.
- Gruppo di riferimento reale: **1 test passato separatamente** su Linux e Windows, con quattro molecole ciascuno; pacchetto mancante → uscita 1 e nessuno skip.
- Virtualenv Windows esistente: **85 test applicativi passati**; nessuna reinstallazione o pretesa di risolvere il precedente problema degli import scientifici.
- Web: **47 test Jest mirati in tre suite passati**, build del pacchetto contratti e lint del nuovo test passati. Non è una verifica CI completa.

Gli ambienti Linux con dipendenze verificate sono quelli costruiti per T21-03 e riusati senza nuove installazioni; durante tutte queste prove Docker la rete è disabilitata. I gruppi si sovrappongono e non si sommano. Il controllo con discovery standard e quello con ordine invertito servono a verificare ripetibilità e assenza di dipendenze dall’ordine, non ad aumentare il numero di casi dichiarati.

Log e contesti di prova fuori dai repository: `C:/Users/giuli/.codex/artifacts/t21-09-*`. Nessuna modifica a dataset, pesi, soglie, lock delle dipendenze, servizi dell’utente o configurazioni personali. Nessuna CI remota, prova con broker esterno, container applicativo distribuito, browser o rotazione JWT dichiarata. Le prove operative residue restano nei task indicati nella matrice.

Seguito: **T21-04 completato localmente**, con [build dei tre target, audit delle immagini e smoke NATS/arresto](tox21-container-qa.md); **T21-05 completato in CI** con [gruppi, riferimento reale, cinque subject e recovery broker](tox21-ci-qa.md). I residui originariamente assegnati a quei task nella matrice sopra sono coperti ai livelli documentati; provider reale e accettazione integrata restano separati. Prossimo intervento: **T21-06**.
