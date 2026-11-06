# T21-00 — Vincoli di design e inventario delle regressioni

**6 novembre 2026 — analisi e specifica completate; implementazione da fare.** Consegna T21-00 della [roadmap](tox21-container-roadmap.md). Questo verbale fissa confini e casi da proteggere, senza certificare che il codice soddisfi già tutti i vincoli. Le decisioni applicative aperte sono esplicitate sotto.

**Seguito T21-02:** [contratto runtime e 54 test applicativi locali](tox21-runtime-qa.md). L’auth corrente è confermata tutto-o-nulla, con default pubblico e PEM singolo quando attiva; adozione della rotazione coordinata rinviata. Configurazione, import e lifecycle hanno ricevuto gli adeguamenti mirati documentati nel seguito. Le tabelle sotto restano l’inventario iniziale sullo SHA dichiarato, non la fotografia aggiornata del codice o delle lacune dopo T21-02.

**Seguito T21-03:** [pacchetto modello, ricalibrazione e dipendenze separate](tox21-model-package-qa.md). Coperti casi di package integrity/atomicità, checkpoint selezionato, fingerprint condiviso e inferenza isolata, con 74 test Linux e 63 nel runtime minimale. Restano lacune applicative T21-09 e verifiche scientifiche/operative distinte: i conteggi e i giudizi nelle tabelle storiche sotto non sono stati convertiti indiscriminatamente in «superato».

## Evidenza e metodo

Baseline Web: commit documentale `ebbe0dfa75eaa56991e37caa993cfa87849cf8de`, derivato da `827098ef063f74d4cd275c4785cba1aa2f50665a`. Baseline Tox21: `909466ad7876398d23e29c30a391f2fd0133eb46`; working tree Tox21 pulita. Lettura del codice e dei test, conteggio dei metodi tramite AST Python senza importare i moduli. Nessuna suite Python, inferenza, build container, connessione NATS o richiesta PubChem eseguita in T21-00. «Presente» significa test individuato e letto, non test passato oggi.

Sorgenti Tox21 citati rispetto alla root del suo [repository autonomo](https://github.com/giuliomarinelli/MercurionTox21/tree/909466ad7876398d23e29c30a391f2fd0133eb46): `main.py`, `config.py`, `schemas/schemas.py`, `api/inference.py`, `api/rdkit.py`, `api/pcp.py`, `mercurion/model.py`, `mercurion/labels.py`, `mercurion/preprocessing.py`, `mercurion/train.py`, `mercurion/early_stopping.py` e `tests/`. Nessun file runtime ignorato o chiave personale letto.

## Vincoli di design

I vincoli definiscono il risultato richiesto al futuro intervento; la colonna sullo stato evita di confondere specifica e comportamento attuale. D-01/D-02 recepiscono requisiti esplicitamente confermati dall’utente. Gli altri formalizzano i confini della roadmap per i successivi refactor, conservando i contratti osservabili. Non richiedono un framework nuovo o un’architettura a livelli imposta.

| ID | Vincolo verificabile | Stato del codice osservato / destinazione |
| --- | --- | --- |
| D-01 | Runtime di sola inferenza: niente training, dataset o dipendenze esclusive del training nell’immagine finale; nessun retraining o scrittura dei pesi durante build, bootstrap o richieste | Il caricamento usa `state_dict`; i Dockerfile copiano oggi tutto il contesto. Separazione da attuare in T21-03/04 |
| D-02 | Pacchetto indivisibile: pesi, rete, fingerprint, label e soglie compatibili; pesi e soglie riferiti allo stesso checkpoint, identificabili e verificabili prima della readiness | Checkpoint scelto da early stopping e soglie aggiornate separatamente. Procedura di esportazione da correggere/verificare in T21-03; nessuna incoerenza dei file attuali misurata |
| D-03 | Import dei moduli verificabile senza configurazione personale, file modello/soglie o rete; bootstrap esplicito responsabile di configurazione, loader e connessioni | `api/inference.py` legge le soglie all’import; `main.py` legge configurazione e imposta Torch globalmente. Adeguamento mirato in T21-02/09 |
| D-04 | Subject, envelope e risposte compatibili con Web; nessuna normalizzazione indiscriminata dei cinque risultati | Contratti attuali sotto; verifica incrociata richiesta in T21-09/06 |
| D-05 | Validazione prima delle operazioni scientifiche; errore di richiesta distinto da errore interno; nessuna esposizione di token o successo inventato | Diversi casi coperti dai test handler; restano lacune sugli errori interni e sulle differenze tra operazioni |
| D-06 | Input di rete in `float32`, batch singolo di 2.048 bit Morgan radius 2; output di 12 logits mappati per nome, sigmoid, quattro label esposte e confronto `probability > threshold` | Presente in sorgente, non coperto da inferenza reale nei test handler; non cambiare fingerprint o ordine per effetto del refactor |
| D-07 | Inferenza con `eval()` e senza gradienti; output finiti e ripetibili entro tolleranze motivate per piattaforma; modello/soglie immutati | `eval()` e `no_grad()` presenti; mancano test diretti di queste proprietà e dei valori non finiti |
| D-08 | Trasporto e client esterni sostituibili ai confini; unit test senza rete e integrazioni reali esplicitamente separate | I test NATS attuali usano patch delle globali e interrompono il bootstrap; da rendere meno dipendenti dalla struttura interna senza rifare tutta l’applicazione |
| D-09 | Readiness dopo pacchetto valido e sottoscrizioni effettive; startup fallito e arresto rilasciano le risorse; interruzione NATS e riconnessione hanno un contratto verificato | Connessione prima del caricamento modello, loop infinito e nessun cleanup esplicito in `run`; politica di riconnessione non verificata. T21-02/09/05 |
| D-10 | Le prove applicative, native, NATS/container e scientifiche hanno esiti e prerequisiti separati; il test set finale non calibra le soglie | Oggi discovery mescola dipendenze native e test isolati; report e gruppi da esplicitare in T21-09/05/10 |

L’uguaglianza alla soglia produce oggi `is_positive=false`: conservarla salvo modifica di contratto esplicitamente decisa. «Indivisibile» non impone uno specifico formato archivio: formato, checksum e procedura atomica restano dettagli da scegliere in T21-03.

### Contenuto ammesso nel runtime finale

| Necessario per il servizio | Da lasciare fuori da staging/production |
| --- | --- |
| Entry point/bootstrap, configurazione e schemi delle richieste | `.env` personali, Git, virtualenv host, cache e strumenti di sviluppo |
| Handler NATS, operazioni RDKit e client PubChem | Notebook, dataset grezzi/preprocessati, grafici e copie storiche non selezionate del modello |
| Definizione della rete `MercurionMLP`, label e fingerprint di inferenza | `train.py`, preprocessing dei dataset, `EarlyStopping`, `FocalLoss` e dipendenze richieste soltanto da questi percorsi |
| Torch, NumPy, RDKit e altre dipendenze effettive dell’inferenza/servizio | Test e relativi strumenti/dati, ammessi negli stadi di test ma non copiati nel runtime finale |
| Pesi selezionati, soglie usate e metadati di compatibilità/provenienza | Addestramento o download implicito del modello in fase di build/avvio |

Non rimuovere la soglia globale finché `api/inference.py` la legge all’import, anche se il calcolo corrente usa quelle per-label. Non rimuovere Torch per il solo fatto che il training è esterno. La separazione tra dipendenze runtime e training deve essere dimostrata da avvio/inferenza con il solo ambiente runtime, non da una lista di import plausibile.

## Contratti di compatibilità Web

Riferimenti Web: [registro NATS](../../packages/rest-contracts/src/nats-contract-registry.ts), [test del registro](../../MercurionWebNode/src/contracts/nats-contract-registry.spec.ts), [contratti RDKit runtime](../../MercurionWebNode/src/contracts/rdkit-contract-runtime.spec.ts), [policy RPC](../../MercurionWebNode/src/app_modules/mercurion-ai/services/scientific-rpc.policy.ts) e [consumer PubChem](../../MercurionWebNode/src/app_modules/mercurion-ai/services/pcp.service.ts). La versione del registro osservata è `1.0.0`.

| Subject base | Campi operativi della richiesta | Risposta di successo Python da preservare |
| --- | --- | --- |
| `inference.tox21.smiles` | `smiles` | Oggetto diretto con `SR-ATAD5`, `NR-AhR`, `SR-MMP`, `SR-p53`; per label: `probability`, `threshold`, `is_positive` |
| `rdkit_api.get_molecule_properties` | `smiles` | `data` con `mwFreebase`, `alogp`, `hba`, `hbd`, `psa`, `rtb`; descriptor non disponibile può essere `null` |
| `rdkit_api.to_canonical_smiles` | `smiles`, `opts` opzionale | `data` stringa; default `isomeric=true`, `kekule=false`; `opts=null` usa i default |
| `rdkit_api.are_same_structure` | `a`, `b` | `data` booleano |
| `pcp_api.get_iupac_name_from_smiles` | `smiles` | `data` con `iupac_name` stringa, anche vuota quando non disponibile |

In produzione il subject non ha prefisso; negli altri ambienti è `<ambiente>.<subject base>`. Il worker accetta richiesta diretta e envelope Nest con campo `data`. Non aggiungere un secondo livello `data` a inferenza o cambiare il wire per uniformità estetica. L’assenza di `reply` non deve generare una risposta NATS.

Gli schemi Python limitano SMILES a 1–1.024 caratteri dopo trim; per `a`/`b` vale lo stesso. In modalità autenticata `accessToken` è richiesto e lungo 10–4.096 caratteri dopo trim; in modalità pubblica è ignorato. Campi extra respinti. Le opzioni RDKit richiedono booleani effettivi. La verifica dei due lati deve includere fixture condivise: leggere i tipi TypeScript non prova l’accordo con Python.

Errori correnti: oggetto `error` stringa; validazione con prefisso `Invalid request:`, autenticazione `Invalid or expired access token`, errori chimici mappati da alcuni handler a `Invalid SMILES`, composto assente `Compound not found in PubChem`, eccezione generica `InternalError`. Non fissare nei test l’intero testo Pydantic, che può cambiare con la libreria: proteggere categoria, struttura e assenza di valori sensibili.

L’inferenza ritorna attualmente `Invalid SMILES` tramite `predict`; il confronto strutturale non ha un catch dedicato per `InvalidSmilesError`. Prima di uniformare queste categorie in T21-02/09, introdurre un caso che evidenzi la differenza e decidere il comportamento desiderato. Il confronto non è già dimostrato equivalente agli altri handler sugli input chimicamente invalidi.

## Inventario dei test presenti

Conteggio AST: **29 metodi `unittest` in tre classi**. I `subTest` ampliano i casi ma non sono contati come metodi distinti. La funzione locale `test_open` del setup non è un caso `unittest` e non entra nel conteggio.

| File Tox21 / classe | Metodi | Che cosa esercita realmente | Limiti |
| --- | ---: | --- | --- |
| `tests/test_nats_requests.py` / `NatsRequestTests` | 18 | Handler e schemi reali; envelope, validazione, trim, auth pubblica/autenticata, errori selezionati, assenza di reply, PubChem spostato su thread | Config, Torch, rete NATS, modello, `predict` e operazioni scientifiche sostituiti; `StartupComplete` interrompe dopo cinque subscribe fittizi. Nessuna prova del broker o dei pesi |
| `tests/test_rdkit_api.py` / `RdkitApiTests` | 7 | RDKit reale su descrittori, canonicalizzazione, stereochimica ed equivalenza; fallback del peso e di InChI tramite patch | Non esercita il servizio NATS né l’inferenza MLP; casi di errore e input chimici da ampliare |
| `tests/test_training_pipeline.py` / `TrainingPipelineTests` | 4 | Preprocessing reale su CSV sintetico temporaneo, shape/dtype/label, colonne delle soglie, zero division e rifiuto di epoche non positive | Torch, rete e early stopping sostituiti. Non allena il modello, non verifica checkpoint reale né coerenza finale pesi/soglie |
| `tests/test_auc_score.py` | 0 | Funzioni di valutazione ROC-AUC e programma avviabile esplicitamente sul modello/dataset locali | Non è una classe `unittest`, nessuna assertion automatica di accettazione |
| `tests/test_roc_curves.py` | 0 | Programma esplicito per grafici ROC usando modello/dataset locali | Scrive grafici se avviato come script; non è una suite di regressione |

La discovery dei test importa anche moduli con dipendenze scientifiche: non chiamare «suite leggera senza Torch» una discovery generale. I gruppi devono avere comandi espliciti e separati. T21-00 non ha eseguito questi comandi né misurato coverage.

### Metodi degli handler: associazione precisa

| Gruppo | Metodi presenti in `NatsRequestTests` |
| --- | --- |
| Request/envelope | `test_valid_requests_accept_direct_and_nest_enveloped_payloads`, `test_invalid_payloads_are_rejected_before_authentication`, `test_both_comparison_smiles_are_validated` |
| Opzioni e decodifica | `test_canonical_options_defaults_and_explicit_booleans`, `test_invalid_canonical_options_are_rejected`, `test_malformed_json_and_utf8_are_request_errors` |
| Dati sensibili e normalizzazione | `test_validation_errors_do_not_echo_input_tokens`, `test_strings_are_trimmed_before_authentication_and_rdkit` |
| Auth | `test_invalid_jwt_still_blocks_rdkit`, `test_public_mode_is_enabled_by_default`, `test_public_mode_ignores_missing_and_invalid_tokens_on_all_endpoints`, `test_public_mode_preserves_payload_validation`, `test_authenticated_mode_requires_token_on_all_endpoints`, `test_jwt_verifier_rejects_missing_token_or_key_without_decoding` |
| Trasporto e errori applicativi | `test_pubsub_without_reply_does_not_attempt_response`, `test_invalid_chemical_smiles_are_request_errors`, `test_pubchem_not_found_is_distinct_from_invalid_smiles`, `test_pubchem_lookup_does_not_block_event_loop` |

Il test del verifier controlla la chiamata a `jwt.decode` con RS256/audience e casi senza token/chiave, ma il decode è sostituito: non dimostra verifica crittografica, scadenza, firma invalida o audience errata con token reali di test. Il test di non blocco PubChem sostituisce la funzione lookup e usa eventi/thread; non contatta PubChem.

## Matrice vincolo → prove e lacune

Stato basato sulla lettura: **parziale** indica test presenti che non coprono tutto il vincolo; **mancante** indica che non è stato trovato il caso indicato. Sono identificativi dei casi da progettare, non nuovi test già implementati.

| Caso / vincoli | Evidenza presente | Lacuna e prova da aggiungere | Livello / fase |
| --- | --- | --- | --- |
| R-01 / D-03, D-09 | Nessun test di `get_config` reale; setup handler lo sostituisce | **Mancante:** ambienti ammessi, precedenza, variabili mancanti, isolamento environment, import senza file/rete | Unitario, T21-02/09 |
| R-02 / D-04, D-05 | Request/envelope, opzioni, trim e malformed JSON/UTF-8 | **Parziale:** limiti validi esatti, envelope anomali, fixture Python consumate dai validatori Web | Unitario + contratto, T21-09/06 |
| R-03 / D-04, D-05 | Sei test auth e test sensibili sopra | **Parziale:** token reali di test per firma, audience e scadenza nella modalità che sarà approvata; nessuna chiave personale | Unitario, T21-02/09 |
| R-04 / D-04, D-09 | Callback registrati su ambiente development; Web prova alcuni subject con fixture proprie | **Parziale:** matrice completa ambienti × cinque subject sui due lati; configurazione invalida non crea subject arbitrari | Unitario + contratto, T21-02/09 |
| R-05 / D-02, D-06 | Test preprocessing shape/dtype e colonne delle soglie | **Parziale:** confronto bit-per-bit dei fingerprint training/inferenza, dtype al confine, dodici label e quattro output corretti | RDKit reale e fixture sintetiche, T21-03/09 |
| R-06 / D-06, D-07 | Solo codice di `predict`; nei test handler è sostituito | **Mancante:** sigmoid su logits noti, mapping, `>` e soglia esatta, output non finiti, `eval`/no-grad e immutabilità | Unitario + Torch reale, T21-09 |
| R-07 / D-02, D-09 | `torch.load`/rete sostituiti | **Mancante:** pesi reali, file assenti/corrotti, shape incompatibili, soglie/label/checksum errati e fallimento prima della readiness | Loader unitario + modello reale, T21-03/09 |
| R-08 / D-02, D-10 | Test della funzione di ricerca soglie, early stopping sostituito | **Mancante:** checkpoint migliore precedente all’ultima epoca, soglie esportate corrispondenti e pacchetto incompleto rifiutato; non usare il test set per calibrare | Pipeline con fixture piccole, T21-03/09; estensioni T21-10 |
| R-09 / D-05, D-08 | Sette test RDKit reali | **Parziale:** SMILES non vuoto ma chimicamente invalido, errori di canonicalizzazione e fallback dei singoli descrittori; risultato non inventato | RDKit reale, T21-09 |
| R-10 / D-05, D-08 | Handler PubChem: not-found, invalid-SMILES e non blocco | **Parziale:** client `pcp.get_compounds` al suo confine, composto senza nome, errore del client e canonicalizzazione; nessuna rete esterna obbligatoria | Unitario, T21-09 |
| R-11 / D-04, D-05 | Messaggi senza reply ed errori di richiesta selezionati | **Parziale:** eccezioni interne dei cinque handler, confronto con input chimico invalido, errori di risposta/pubblicazione; niente token nei diagnostici | Unitario asincrono, T21-02/09 |
| R-12 / D-08, D-09 | Connect/subscribe fittizi e startup interrotto intenzionalmente | **Mancante:** failure durante startup, cleanup, stop, perdita broker e riconnessione secondo contratto; risposta reale da ogni subject | Unitario + NATS effimero, T21-09/05/08 |
| R-13 / D-01, D-03 | Nessuna prova di isolamento del pacchetto runtime | **Mancante:** import e startup con soli file/dipendenze runtime, assenza training/dataset/test nel finale, nessuna scrittura dei pesi | Integrazione + ispezione immagine, T21-09/04/05 |
| R-14 / D-02, D-07, D-10 | Script post-training e metriche per epoca, non eseguiti qui | **Mancante:** riferimento predittivo controllato sul pacchetto reale e report scientifico separato per un nuovo modello | Integrazione inferenza T21-03/09; valutazione locale T21-10 |

Una fixture di logits noti controlla il mapping e la matematica; una predizione con pesi reali controlla loader e inferenza. Servono entrambe, senza confonderle con una misura della qualità scientifica.

## Decisioni aperte e classificazione degli interventi

| Punto | Classificazione | Sede della decisione / azione |
| --- | --- | --- |
| Modalità pubblica interna o autenticazione richiesta | **Decisione aperta.** Il default attuale è pubblico e ha un test esplicito; non cambiarlo come conseguenza del packaging | T21-02, con confini di rete e consumer; blocca solo il comportamento futuro dipendente da quella scelta |
| Formato e procedura di esportazione, provenienza del checkpoint | **Dettaglio tecnico da definire**, con coerenza pesi/soglie già obbligatoria | T21-03; non serve scegliere un nuovo formato di modello per rimuovere il training |
| Readiness, startup fallito e arresto | **Adeguamento necessario** a D-09; tempi, verifiche broker e politica di riconnessione da specificare | T21-02/09; evitare retry infiniti o esiti dedotti dal solo log |
| Classificazione di SMILES chimicamente invalido nel confronto | **Differenza attuale da decidere**, non da uniformare incidentalmente | T21-02/09, con test di caratterizzazione prima della modifica |
| Import con I/O e configurazione globale | **Adeguamento necessario** a D-03, con refactor mirato e contratti invariati | T21-02/09 |
| Fingerprint, ordine label, shape e risposte | **Compatibilità da conservare.** Cambiare parametri richiede valutazione del modello/consumer | T21-03/09; nessuna nuova decisione scientifica implicita |
| CPU/GPU, tolleranze, policy versioni e distribuzione | **Decisioni ancora aperte** nei rispettivi ambiti della roadmap | T21-03/07; non scegliere limiti prestazionali o registry in questo verbale |

I test delle modalità esistenti possono essere mantenuti anche mentre la scelta auth resta aperta. T21-00 è completo perché formalizza vincoli, evidenze, lacune e decisioni: non dichiara queste decisioni risolte o i relativi interventi eseguiti.

## Ordine di esecuzione successivo

1. **T21-01:** correggere le istruzioni di ingresso dei due repository usando questi confini; nessun refactor applicativo.
2. **T21-02:** specificare configurazione/auth/lifecycle, introdurre i casi di caratterizzazione pertinenti e soltanto dopo adeguare il bootstrap.
3. **T21-03:** contratto del pacchetto e prova dell’esportazione coerente, con fixture che seleziona un checkpoint non finale.
4. **T21-09:** completare la suite dalle lacune R-01–R-14, riusando i 29 metodi presenti; separare i gruppi e rendere espliciti i prerequisiti. Test che precedono un refactor accompagnano già T21-02/03, senza aspettare di aver cambiato tutto il servizio.
5. **T21-04/05:** packaging e CI, con le prove di confine runtime e NATS reale. Il training completo resta locale.

Non sono stati creati nuovi test o eseguite suite Python in questa fase. Nessun requisito browser per questa consegna documentale. Le verifiche applicative verranno registrate con comando, ambiente, SHA ed esito quando realmente eseguite.
