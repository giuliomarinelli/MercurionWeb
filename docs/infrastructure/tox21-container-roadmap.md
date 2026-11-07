# MercurionTox21 — roadmap container e consegna coordinata con MercurionWeb

**6 novembre 2026 — roadmap con esiti progressivi.** Derivata dall’audit esplorativo richiesto dall’utente; registra il lavoro documentale T21-00/01 e l’intervento T21-02 successivamente autorizzato. Il piano non autorizza da solo l’esecuzione delle voci residue, installazioni, pubblicazione di immagini o deployment. Gli identificativi T21 qui sotto sono voci di pianificazione, non ricette eseguibili del sistema autonomous-development.

## Risultato atteso

MercurionTox21 è un componente del progetto Mercurion, mantenuto nel repository autonomo [giuliomarinelli/MercurionTox21](https://github.com/giuliomarinelli/MercurionTox21). Il suo artefatto applicativo è un’immagine container che avvia `python -m main`, comprendendo codice runtime, dipendenze, modello selezionato e soglie necessarie. Training, dataset e notebook appartengono al percorso di sviluppo del modello e non devono essere inclusi automaticamente nel runtime.

**Precisazione concordata il 6 novembre:** il training resta locale. L’immagine applicativa finale deve contenere soltanto la parte di servizio e inferenza, con i pesi del modello esportato e i metadati necessari; esclude il codice e le dipendenze dedicati esclusivamente al training. La suite di regressione applicativa viene progettata dopo aver fissato i vincoli di design, prima della ristrutturazione dei container. Le verifiche scientifiche del modello restano un percorso distinto.

**Requisiti confermati dall’utente:** i soli pesi sono necessari ma non sufficienti; il runtime comprende anche definizione della rete, fingerprint, ordine delle label e soglie. Pesi e soglie devono essere esportati in modo coerente con il checkpoint selezionato. Questi due punti sono vincoli acquisiti, non decisioni ancora aperte; resta da definire e verificare la procedura concreta di esportazione.

Allineare Tox21 ai principi già applicati a Web: build riproducibile, target espliciti, configurazione esterna, identità verificabile, test e smoke test in CI, consegna tracciabile. I repository mantengono versioni e SHA propri. Una consegna coordinata registra entrambi e le rispettive immagini; non impone SHA identici o un’unica versione applicativa.

Questa roadmap prepara gli artefatti. La topologia della demo, la VM e la sua esposizione restano nella [pianificazione infrastrutturale locale](local-vm-deployment.md), ancora preliminare. I manifest Kubernetes esistenti costituiscono evidenza da inventariare, non una scelta implicita per la VM. Non viene ripristinata la precedente proposta VPS.

## Baseline dell’audit

| Repository | Branch osservato | SHA esaminato |
| --- | --- | --- |
| MercurionWeb | `develop` | `827098ef063f74d4cd275c4785cba1aa2f50665a` |
| MercurionTox21 | `develop` | `909466ad7876398d23e29c30a391f2fd0133eb46` |

Entrambe le working tree erano pulite. Il remoto `develop` Tox21 coincideva con lo SHA locale. Audit di sorgenti, configurazioni e storia Git; nessuna nuova prova di build o runtime. Versioni Python/dipendenze e compatibilità delle wheel devono essere verificate nella fase di implementazione, senza dedurle dal solo ambiente locale.

### Evidenze e limiti

- Web ha consolidato i Dockerfile nel commit `33d4375ed887cb2234128397c5697d9a0be71324` del 13 settembre 2026: [Angular](../../MercurionWebNg/Dockerfile) e [Nest](../../MercurionWebNode/Dockerfile) espongono `test`, `staging`, `production`. La [CI](../../.github/workflows/ci.yml) costruisce e verifica i sei target. Nel job container esaminato non pubblica le immagini su un registry: immagine verificata, evidenze CI e immagine distribuita sono risultati distinti.
- Tox21 conserva `Dockerfile.test` e `Dockerfile.staging`, entrambi con entrypoint `main`. Il target test attuale avvia il servizio, senza eseguire i test. Non esiste un Dockerfile production dedicato.
- I due Dockerfile Tox21 usano `COPY . .` senza `.dockerignore`: anche file ignorati da Git possono entrare nel contesto e nell’immagine locale. Lo staging usa un utente non-root; il test non lo dichiara.
- `config.py` seleziona l’ambiente con `PY_ENV`; `NATS_URL` e `VERSION` sono richiesti dal modello di configurazione. Il Compose Tox21 fornisce soltanto `PY_ENV=test`. Non c’è un contratto di avvio completo da clone pulito.
- Il [Compose preview Web](../../docker_sl/releases/preview/docker-compose.yml) riferisce il vecchio percorso `MercurionAI/MercurionTox21` e passa `APP_VERSION`, non consumato dal Dockerfile Tox21. Il [deployment Tox21](../../k8s/preview/mercurion-tox21-deploy.yaml) indica immagine `1.2026.3` e `VERSION=1.2026.2`.
- Tox21 non ha workflow applicativi tracciati; la verifica GitHub ha trovato soltanto Dependency Graph. Esistono test isolati NATS/RDKit e del preprocessing; alcuni test sostituiscono Torch, modello e trasporto, quindi non provano l’inferenza reale del container.
- Il README Tox21 contiene clone segnaposto e comando `python inference.py` obsoleto. Il [README Web](../../readme.md) presenta il percorso locale come identità del componente e parla impropriamente di virtualenv checked-in, che non è tracciato.
- `GLOBAL_SKIP_AUTH_FLAG=True` è un comportamento esplicito, coperto da test. Non è stato classificato come regressione né modificato. La descrizione README della verifica JWT sempre attiva non corrisponde al comportamento corrente.
- L’approfondimento del training conferma loss di training e validazione su `X_val`/`y_val` separati a ogni epoca, metriche F1/ROC-AUC e selezione delle soglie. Gli script post-training calcolano metriche/predizioni; queste verifiche non costituiscono da sole una suite di regressione applicativa. Esistono già test `unittest` su handler NATS, RDKit, preprocessing e soglie: vanno inventariati ed estesi, non duplicati.
- `EarlyStopping` salva i pesi quando migliora la validation loss; `train.py` scrive invece le soglie per-label a ogni epoca e la soglia globale a fine ciclo. Ne deriva un possibile disallineamento tra checkpoint selezionato e soglie esportate, da prevenire con un contratto e test dedicati. Non è stata misurata l’eventuale incoerenza degli artefatti attualmente tracciati.

## Vincoli di design da fissare prima dei test e dei refactor

Questi vincoli sono formalizzati nel [verbale T21-00 con inventario dei test e lacune](tox21-design-test-inventory.md). Il verbale distingue requisiti, comportamento corrente e decisioni aperte. Non prescrivono una nuova architettura a livelli o un framework aggiuntivo: riusare funzioni e moduli esistenti, introducendo soltanto i confini necessari per verificare il comportamento.

1. **Confine training/runtime:** il servizio usa un pacchetto esportato e non importa training, ottimizzatori, loss di addestramento, notebook o dataset. Non allena né modifica pesi/soglie durante build, avvio o richieste. Torch resta una dipendenza runtime finché l’inferenza usa `MercurionMLP`; togliere il training non elimina la necessità del motore di inferenza.
2. **Pacchetto modello indivisibile:** pesi, definizione/configurazione dell’architettura, algoritmo e parametri del fingerprint, ordine delle label e soglie devono essere compatibili e riconducibili allo stesso checkpoint. Con l’attuale `state_dict` i soli pesi non descrivono autonomamente la rete. I metadati possono risiedere nel codice o in file versionati; non serve portare l’intera pipeline di training.
3. **Bootstrap controllabile:** importare moduli di dominio/inferenza non apre NATS, non legge configurazioni personali, non carica obbligatoriamente pesi/soglie globali e non avvia task. Configurazione, caricamento del pacchetto e connessione avvengono nel bootstrap esplicito. L’avvio via `main` continua a orchestrare questi passi. Oggi esistono letture di soglie all’import in `api/inference.py` e configurazione globale in `main.py`: l’adeguamento è un intervento futuro, non un requisito già soddisfatto.
4. **Contratti osservabili:** preservare subject, envelope, payload, nomi/ordine delle label e distinzione degli errori attesi dai consumer Web. Prima di cambiare un comportamento ambiguo registrare quello attuale e decidere il contratto desiderato; i test non devono cristallizzare accidentalmente un difetto.
5. **Inferenza priva di training:** `eval()` e assenza di gradienti; stesso input e stesso pacchetto producono risultati ripetibili entro tolleranze definite per piattaforma. Specificare shape/dtype, output finiti, probabilità in `[0, 1]`, mapping delle label e confronto con le soglie, inclusa l’uguaglianza alla soglia. Gli esiti scientifici non si approvano con la sola stabilità numerica.
6. **Dipendenze esterne isolabili:** logica applicativa verificabile senza broker reale, PubChem, chiavi personali o dataset completo. Sostituire trasporto e client esterni ai loro confini; usare RDKit/Torch reali nei test che devono verificarne l’integrazione. Un modello finto non prova caricamento dei pesi o inferenza reale.
7. **Lifecycle ed errori:** readiness soltanto dopo caricamento valido e sottoscrizioni effettive; comportamento esplicito per configurazione/modello invalidi, NATS indisponibile, messaggi senza reply, richieste malformate e arresto. Nessuna risposta di successo ottenuta silenziando un errore; evitare dati sensibili nei diagnostici.
8. **Separazione delle prove:** unit test applicativi rapidi e senza rete, integrazione con librerie native e pacchetto reale, smoke test NATS/container, valutazione scientifica del modello. Ogni gruppo ha comando e prerequisiti propri; le prove scientifiche complete e il retraining locale non diventano requisiti a ogni modifica del servizio.

## Sequenza proposta

**T21-00 completato come analisi e specifica**, con [vincoli e inventario](tox21-design-test-inventory.md). **T21-01 completato come documentazione**, **T21-02 con 54 test applicativi locali**, **T21-03 sul target Linux CPU**, **T21-09 con 99 casi autonomi, 85 runtime-only e riferimento reale esplicito**, **T21-04 con tre immagini e smoke locali**, **T21-05 con CI remota verde sull'esatto SHA**, **T21-06 con proiezioni Web verificate localmente**: esiti e limiti sotto. Nessuna accettazione dell’applicazione distribuita dedotta dalle prove. Le altre voci sono **da fare**. La priorità determina l’ordine di lavoro, non certifica la gravità di un difetto runtime.

| ID | Intervento | Repository responsabile | Dipende da | Priorità |
| --- | --- | --- | --- | --- |
| T21-00 | Vincoli di design, confini e inventario dei comportamenti | Tox21, contratti condivisi con Web | — | P1 |
| T21-01 | Identità del componente e documentazione di ingresso | Web + Tox21, modifiche separate | T21-00 | P1 |
| T21-02 | Contratto di configurazione, ambienti e autenticazione | Tox21, con verifica dei consumer Web | T21-01 | P1 |
| T21-03 | Dipendenze e pacchetto modello riproducibili | Tox21 | T21-01 | P1 |
| T21-09 | Suite `unittest` di regressione applicativa e adeguamenti di testabilità | Tox21 + test contratti Web | T21-02, T21-03 | P1 |
| T21-04 | Dockerfile consolidato e contesto minimo | Tox21 | T21-09 | P1 |
| T21-05 | CI applicativa e verifica dei container | Tox21 | T21-04 | P1 |
| T21-06 | Integrazione Compose e riferimenti di distribuzione | Web | T21-05 | P2 |
| T21-07 | Identità e consegna coordinata degli artefatti | Tox21 + Web | T21-05, T21-06 | P2 |
| T21-08 | Accettazione integrata e istruzioni di ripristino | Entrambi, ambiente non produttivo | T21-07 | P2 |
| T21-10 | Estensione delle verifiche locali del training e della qualità del modello | Tox21 | T21-00, T21-03 | P2 |
| T21-11 | Override JWT ternario per ciascuno dei cinque servizi | Tox21, compatibilità Web | T21-02, T21-09 | Successivo, solo pianificato |

Gli identificativi già assegnati sono conservati: T21-09 precede T21-04 nell’ordine di lavoro; T21-10 è un percorso distinto che non blocca la consegna del runtime. La coerenza checkpoint/soglie resta invece obbligatoria in T21-03. T21-02 e T21-03 sono indipendenti dopo T21-01. Questa dipendenza non prescrive esecuzione concorrente o delega ad agenti. Si propone un intervento focalizzato alla volta.

### T21-00 — Vincoli e punti importanti da coprire

**Esito:** completato il 6 novembre nel [verbale dedicato](tox21-design-test-inventory.md), senza modifiche applicative. Le decisioni aperte rimangono nei rispettivi interventi successivi; i test presenti non sono dichiarati passati da questa ispezione.

**Intervento:** formalizzare i vincoli sopra, inventariare i comportamenti e i test esistenti e associare ogni contratto critico a un caso di regressione della matrice T21-09. Distinguere comportamento conservato, difetto da correggere con test e decisione aperta. Registrare il contenuto ammesso nel runtime e le operazioni consentite soltanto al training locale.

**Completamento:** confini, invarianti, compatibilità Web e criteri di errore documentati prima di refactor e nuovi test. Le decisioni non ancora prese, inclusa l’autenticazione, sono esplicite. La matrice indica quali prove esistono, quali mancano e quali richiedono librerie native o servizi effimeri. Non assegnare una percentuale di coverage arbitraria come sostituto della copertura dei contratti.

### T21-01 — Identità e documentazione

**Esito, 6 novembre:** aggiornati il [README Web](../../readme.md) e il [README Tox21](https://github.com/giuliomarinelli/MercurionTox21/blob/0d8f8c0fa186484c8d6ed367360723eb93bd78a2/readme.md). Tox21 consegnato nel commit `0d8f8c0fa186484c8d6ed367360723eb93bd78a2` sul branch `docs/T21-01`; Web sul branch documentale `docs/tox21-container-roadmap`. Nessun merge: le istruzioni nuove sono sui branch di lavoro, non dichiarate integrate in `develop`.

Documentati clone esplicito di `develop`, virtualenv locale su Windows/Linux, configurazione da process environment senza dipendere da file personali, entrypoint `main`, pacchetto necessario per l’inferenza, modalità auth corrente e sue limitazioni. Separati training locale, test applicativi e script scientifici; packaging/CI futuri restano tali. Verificati `ci:docs` Web, link locali, diff e presenza/sintassi dei moduli Python citati tramite parsing del sorgente. Nessuna installazione, esecuzione di questi moduli, suite Python, nuova prova runtime/container o CI applicativa eseguita per T21-01. La compatibilità di installazione pulita resta T21-03, non viene dedotta dalla correttezza delle istruzioni.

**Intervento:** descrivere Tox21 come componente Mercurion con repository separato. Documentare il clone dal remoto corretto, la creazione del virtualenv e l’avvio da root con `python -m main`. Conservare `../MercurionTox21` soltanto come layout locale convenzionale; non introdurre submodule, monorepo o spostamenti di cartelle. Distinguere vincoli degli agenti Web da proprietà del prodotto.

**Completamento:** un nuovo sviluppatore può individuare entrambi i repository e capire quali comandi appartengono a ciascuno. I README non dichiarano virtualenv tracciati, vecchi entrypoint o autenticazione sempre attiva. Riferimenti ai file esistenti verificati; nessuna istruzione richiede file personali già presenti sul computer dell’autore.

### T21-02 — Contratto runtime

**Esito, 6 novembre:** implementato nel repository Tox21 sul branch `feature/T21-02`; [verbale e limiti](tox21-runtime-qa.md). Configurazione validata, bootstrap esplicito, namespace invariati e cleanup del client; **54 test applicativi locali passati**, nessuna prova di runtime/container reale o CI remota. Le definizioni di deployment ancora incomplete restano T21-06. Nessun merge.

**Decisione di perimetro dell’utente:** progetto portfolio gestito da una persona; auth corrente tutto-o-nulla conservata, default pubblico interno. Quando attiva richiede un file PEM pubblico RS256 anche in staging/production; nessun Base64 runtime o key ring. Adozione operativa della rotazione coordinata rinviata, conservando codice e prove Web già predisposti. Il change di chiave del firmatario e la distribuzione al verificatore restano un lavoro coordinato futuro; il formato del materiale non risolve da solo l’incompatibilità.

**Intervento:** definire e documentare variabili richieste, valori ammessi e precedenza tra ambiente e file locali. `test`, `staging` e `production` devono selezionare coerentemente anche i subject NATS; la configurazione runtime deve essere esplicita, senza incorporare `.env` nell’immagine. Mantenere l’avvio locale di sviluppo documentato.

Decisione acquisita sopra; non rimuovere il bypass o introdurre credenziali/ACL per supposizione. Conservare il percorso PEM con fallimento esplicito quando l’auth è attiva e il file non è valido. Il [piano JWT](../../MercurionWebNg/docs/portfolio-ux/JWT-KEY-ROTATION.md) registra il rinvio dell’adozione coordinata senza rimuovere le predisposizioni esistenti.

**Completamento:** test della configurazione per i tre ambienti, degli errori per valori mancanti/non ammessi e dei namespace NATS. Modalità autenticata/pubblica e relativi requisiti registrati esplicitamente. Nessuna lettura obbligatoria di chiavi quando la modalità approvata non le richiede; nessun fallback silenzioso a una modalità più permissiva.

### T21-03 — Dipendenze e modello

**Esito, 6 novembre:** completato nel repository Tox21 sul branch `feature/T21-03`, SHA `6f19c869a0d99209fc78eb6a909d1f45897118a8`. [Verbale, comandi ed evidenze](tox21-model-package-qa.md). Installazioni pulite Linux x86_64/Python 3.10.11 CPU, profili runtime/training bloccati con hash, esportazione atomica con ricalibrazione del checkpoint selezionato, verifica del pacchetto nel loader e compatibilità legacy esplicita. **74 test Linux e 63 nel runtime minimale**, più prova sul pacchetto reale ricavato dai 627 campioni di validazione. Artefatti originali invariati. Limiti Windows/GPU e qualità/provenienza scientifica espliciti; nessun merge o immagine applicativa distribuita.

**Intervento:** verificare da installazione pulita la combinazione Python, sistema base e dipendenze native. Separare dipendenze runtime da training, notebook e test; non aggiornare indiscriminatamente le versioni. Scegliere una procedura di risoluzione bloccata, con vincoli e verifica d’integrità adatti alle piattaforme supportate; i soli pin del file attuale non sono prova di riproducibilità completa.

Definire un pacchetto modello: `best_model.pt`, soglie globali/per-label, ordine delle label e parametri del fingerprint necessari alla compatibilità con il modello. Registrare provenienza, versione e checksum; verificare coerenza tra output del training e input dell’inferenza. Il runtime non deve addestrare o scaricare implicitamente il modello all’avvio. Le copie storiche del modello e i dataset non vanno cancellati per realizzare questa separazione.

L’esportazione locale deve associare pesi e soglie al medesimo checkpoint: per esempio ricalcolando le soglie sul validation set con il checkpoint selezionato, oppure salvandole insieme al checkpoint pertinente secondo una procedura documentata. Non ottimizzare soglie sul test set finale. Verificare l’atomicità della consegna del pacchetto e rifiutare combinazioni incomplete/incompatibili. Il file della soglia globale oggi viene letto dall’inferenza anche se il risultato esposto usa soglie per-label: mantenerlo finché quel caricamento non è stato rimosso e verificato esplicitamente.

**Completamento:** installazione pulita verificata sulla piattaforma container scelta; pacchetto modello completo e identificabile; caricamento reale dei pesi e inferenza deterministica su una fixture verificati con tolleranze motivate. Funzionamento CPU verificato; supporto GPU dichiarato soltanto se richiesto e provato. Dimensioni e tempi di avvio misurati, senza inventare soglie prima delle misure.

### T21-09 — Suite applicativa con `unittest`

**Esito, 6 novembre:** completato sul branch `feature/T21-09` di entrambi i repository. [Verbale e matrice aggiornata](tox21-testing-qa.md): **99 test autonomi**, **85 nel profilo runtime**, più riferimento reale esplicito e **47 test Nest mirati** sulla fixture condivisa/contratti. Coperti i residui applicativi previsti a questo livello e corretti due difetti riprodotti su inferenza e consegna della risposta. Broker reale, immagini finali e qualità scientifica restano nei rispettivi task, senza essere dichiarati superati.

**Intervento:** estendere le suite esistenti usando `unittest.TestCase`, `IsolatedAsyncioTestCase` e `unittest.mock` dove appropriato. Separare esplicitamente test rapidi, integrazione con librerie/modello reali e prove con NATS effimero. Le dipendenze tra test e l’ordine di esecuzione non devono influire sul risultato; ambiente e directory temporanee vanno ripristinati. Eventuali refactor per rimuovere effetti collaterali all’import o rendere sostituibili client/loader devono restare mirati ai vincoli T21-00.

La seguente è una matrice di casi da inventariare ed estendere, non un elenco di test già superati:

| Punto importante | Regressioni da prevenire | Livello |
| --- | --- | --- |
| Configurazione e bootstrap | Ambiente non ammesso, variabili mancanti, precedenza errata, letture/rete all’import; avvio esplicito e fallimenti comprensibili | Unitario |
| Schemi ed envelope NATS | JSON/UTF-8 invalidi, campi extra, SMILES vuoti/limiti, wrapping `data`, compatibilità della risposta e assenza di reply | Unitario handler |
| Auth e namespace | Modalità approvata, token valido/scaduto/mancante, chiave richiesta soltanto quando serve, subject coerenti per ambiente | Unitario con chiavi di test quando necessarie |
| Fingerprint e label | Stessi bit/parametri tra preprocessing locale e inferenza, shape/dtype concordati, mapping stabile delle dodici label e delle quattro esposte | Integrazione RDKit e fixture piccole |
| Inferenza e soglie | `eval`/assenza di gradienti, sigmoid corretta, probabilità finite, associazione label/probabilità/soglia, soglia esatta e SMILES invalidi | Unitario più inferenza reale |
| Loader del pacchetto modello | File mancanti/corrotti, dimensioni incompatibili, label/soglie incoerenti, checksum/identità, caricamento dei pesi reali e assenza di scritture | Unitario più integrazione Torch |
| RDKit | Canonicalizzazione, stereochimica, equivalenza, descrittori, comportamento con/senza InChI | Estensione delle suite reali esistenti |
| PubChem | Risposta assente/errore del client, input invalido, errore distinto, chiamata che non blocca l’event loop | Unitario con client sostituito |
| Errori degli handler | Distinzione tra errore di richiesta e interno, nessuna fuga di token/dettagli sensibili, nessun falso successo | Unitario |
| Lifecycle NATS | Sottoscrizioni effettive, avvio fallito, interruzione/riconnessione e arresto secondo contratto; cleanup anche al fallimento | Unitario asincrono più NATS effimero |
| Confine training/runtime | Import e avvio usando soltanto il contenuto runtime, nessun dataset/training importato, nessuna modifica a pesi/soglie | Integrazione e ispezione immagine |

**Completamento:** comandi distinti e ripetibili per i gruppi, suite rapida senza rete o retraining, test esistenti conservati e ampliati dove mancano i casi; evidenza di almeno una predizione reale con il pacchetto selezionato. I test di confine devono fallire se viene introdotta una dipendenza dal training. T21-05 esegue questi gruppi in CI e conserva gli esiti separati. Non fissare valori predetti arbitrari: usare fixture di riferimento controllate e tolleranze motivate.

### T21-04 — Dockerfile e immagine

**Esito, 6 novembre:** completato nel perimetro locale Linux amd64 CPU su `feature/T21-04` di entrambi i repository. [Verbale e identità delle immagini](tox21-container-qa.md): tre target costruiti da snapshot pulito, gate di 99 test, tre audit e tre smoke NATS/arresto riusciti, riferimento predittivo reale e prove negative. Training/test e configurazioni personali esclusi dai runtime. CI remota T21-05 e migrazione dei riferimenti Web T21-06 restano aperte; nessun merge o deployment.

**Intervento:** proporre un unico Dockerfile con stadi condivisi e target finali `test`, `staging`, `production`, coerenti con Web. Il target test deve eseguire controlli isolati in fase di build o tramite un job CI esplicito; il servizio finale mantiene l’entrypoint `python -m main`. Test che richiedono NATS reale appartengono a una fase separata.

Aggiungere `.dockerignore` e copie selettive del runtime. Escludere Git, virtualenv host, configurazioni personali, chiavi, cache, notebook, dataset e output non necessari; includere esplicitamente il pacchetto modello. Usare utente non-root con UID/GID definiti e separare tool di compilazione dal runtime. Registrare i soli percorsi che richiedono scrittura e verificare l’esecuzione con filesystem in sola lettura e area temporanea dedicata.

I target applicativi finali staging/production devono escludere anche `train.py`, preprocessing dei dataset, early stopping, loss/ottimizzatori dedicati al training e relative dipendenze esclusive. Devono mantenere definizione della rete, trasformazione SMILES/fingerprint usata in inferenza, label e soglie richieste. Test, dataset sintetici e strumenti di verifica possono esistere negli stadi CI/test, senza essere copiati nelle immagini finali staging/production. Una lista esplicita del contenuto ammesso e una prova con sole dipendenze runtime devono dimostrare la separazione.

**Completamento:** tre build da contesto pulito riuscite, nessuna dipendenza da file ignorati locali; ispezione dell’immagine conferma contenuto previsto, utente, comando e identità. Nessun segreto incorporato. Arresto regolare verificato. Non aggiungere porte HTTP o probe HTTP fittizie a un worker che comunica via NATS.

### T21-05 — CI Tox21

**Esito, 6 novembre:** completato su `feature/T21-05`, senza merge. [Verbale CI](tox21-ci-qa.md): run `42272061500` riuscito sullo SHA Tox21 `1e295ce617ce0df3f374e84e094ead4ce0d569c0`, job applicativo e **Required gate** verdi. Installazione pulita, test isolati, export QA, tre build/audit, riferimento reale, cinque subject e recovery del broker su ogni target; artifact report/modello scaricati e verificati. Primo tentativo rosso per proprietà dei file di export, corretto sullo stesso branch e documentato. Nessun registry/deployment o accettazione Web implicita.

**Intervento:** introdurre una pipeline propria del repository: installazione pulita, controlli statici proporzionati, test isolati, build dei target e smoke test dell’immagine. Per la prova di integrazione usare un NATS effimero e configurazione di test; nessuna connessione a servizi o identità personali/di produzione.

La suite applicativa T21-09 è un gate esplicito. Integrazione con modello reale e verifica dell’immagine hanno esiti distinti dai test con mock. Un job separato può validare l’esportazione locale del pacchetto senza ripetere l’addestramento. Le valutazioni scientifiche complete T21-10 accompagnano un nuovo modello e non sostituiscono né appesantiscono implicitamente ogni verifica applicativa.

La prova deve distinguere: validazione degli handler con mock, caricamento reale del modello, inferenza sul container, richiesta/risposta NATS reale e interrogazioni esterne PubChem. Queste ultime non devono diventare una dipendenza intermittente della suite obbligatoria; prevedere una verifica separata quando necessaria. Definire readiness del worker, timeout e cleanup, senza affidarsi soltanto a un processo vivo o a una riga di log.

**Completamento:** run completo riuscito sull’esatto SHA Tox21 candidato, con un gate aggregato stabile. Report di test e diagnostica disponibili anche al fallimento. Smoke test dimostra risposta dei subject attesi, caricamento modello e assenza di servizi reali impliciti. Fallimento di test/build/smoke impedisce il successo del gate.

### T21-06 — Consumer e configurazioni Web

**Esito, 6 novembre:** completato sul branch Web `feature/T21-06`, con [input, inventario, verifiche e residui](tox21-deployment.md). Compose preview/production consumano un'immagine Tox21 senza checkout; build opzionali con sorgenti e pacchetto espliciti. Identità Tox21 indipendente da Web, namespace/versione coerenti e template Kubernetes preview aggiornato. Quattro risoluzioni Compose e dodici input mancanti verificati, gate statico con undici prove negative e 47 test contratti Nest passati. Nessuna CI Web remota, build applicativa o prova di deployment dedotta da questi controlli. Conservati i manifest; il riferimento errato del CronJob PostgreSQL è una lacuna separata documentata prima dell'uso.

**Intervento:** eliminare la dipendenza dal vecchio layout `MercurionAI`. Separare il percorso per build locale dal riferimento a un’immagine già prodotta da Tox21. Documentare un contesto locale configurabile o una convenzione di checkout; evitare path assoluti personali. Non trasformare il repository sibling in requisito del build Web ordinario.

Allineare variabili e namespace ai contratti T21-02. Inventariare Compose e manifest esistenti; decidere quali restano supportati nel progetto corrente. Per quelli mantenuti, eliminare divergenze tra tag immagine, versione runtime e metadati di build. L’eventuale archiviazione dei vecchi manifest richiede una decisione esplicita, non una cancellazione automatica.

**Completamento:** configurazioni risolte con fixture di ambiente prive di segreti, percorsi corretti e nessun argomento di build inutilizzato. La variante che usa immagini verificate non richiede il clone Tox21. Controlli statici Web pertinenti verdi; test dei client NATS confermano compatibilità di subject e payload. Nessuna riscrittura generale della topologia per la VM.

### T21-07 — Identità e consegna

**Baseline Web e nuovo candidato, 7 novembre:** [verbale e checksum](web-runtime-baseline-qa.md) su `feature/T21-WEB-BASELINE`, discendente da Web T21-BASELINE e T21-DELIVERY. Runtime fissati per digest, npm/Yarn esclusi dal backend, copia delle dipendenze workspace corretta. Nuovi archivi Web dallo SHA `c02ac848d3aaebdb5e3b85022dd2eeba2592bc9b`: zero criticità; archivio Tox21 verificato riutilizzato senza modifiche. Manifest completo e ammissibile (`eligible_for_integrated_acceptance: true`), nessun deployment. La CI completa sullo SHA implementativo `c02ac848d3aaebdb5e3b85022dd2eeba2592bc9b` è verde, incluso Required gate e tutti i sei target. L'integrazione rimane all'owner. T21-08 è il passo successivo di accettazione separata.

**Consegna locale, 7 novembre:** [tre archivi reali e manifest coordinato](tox21-coordinated-delivery-qa.md) prodotti su `feature/T21-DELIVERY`, che recupera il coordinatore del vecchio branch Web T21-07. Nessun componente mancante, ma immagini Web bloccate dalla policy: tre occorrenze critiche frontend e cinque backend. Tox21 ha zero criticità. T21-07 non è ancora approvato per T21-08; serve una revisione mirata della baseline runtime Web, senza derogare alla policy. Nessun merge o deployment eseguito.

**Seguito baseline, 7 novembre:** [revisione OS/Python/Pillow verificata](tox21-security-baseline-qa.md).
Sul branch Tox21 `feature/T21-BASELINE`, SHA `56d1b4e12ddcfa45b440280e025dac46f7ca2034`,
la CI e il Required gate sono verdi: production ha zero criticità bloccanti,
107 test e riferimento reale passati, archive save/load verificato. Il branch
contiene anche il precedente lavoro Tox21 T21-07. Questo risolve il blocco di
sicurezza della baseline nel perimetro della policy acquisita; non completa
ancora gli artifact Web e il manifest coordinato richiesti da T21-07.

**Intervento:** attribuire all’immagine Tox21 versione, SHA completo del suo repository e label OCI, rendendo consultabile l’identità anche dal servizio. Preparare inventario/SBOM e diagnostica di sicurezza coerenti con le regole applicabili a Web; definire un criterio esplicito per risultati non conformi, senza neutralizzarli per ottenere un verde.

Definire un manifest di consegna che associ revisioni Web e Tox21, riferimenti delle immagini, digest e identità/checksum del modello. Distinguere tre risultati: immagine costruita/verificata, immagine esportata o pubblicata, applicazione distribuita. Scegliere il canale di consegna prima di implementarlo: registry e relative autorizzazioni, oppure esportazione verificabile per il caricamento locale. Non assumere che la CI Web attuale pubblichi già le immagini.

**Completamento:** ogni immagine è riconducibile a un commit e a un pacchetto modello; una consegna può essere ricostruita senza usare soltanto tag mobili. Se si adotta un registry, verificare digest dopo push/pull e permessi minimi. Se si adotta un archivio, verificarne integrità, caricamento e identità dell’immagine risultante. Nessuna pubblicazione o configurazione provider è autorizzata da questa roadmap.

### T21-08 — Accettazione integrata

**Esito, 7 novembre:** [accettazione dei servizi scientifici dagli artefatti](tox21-integrated-acceptance-qa.md) riuscita su `feature/T21-08`. Servizi Nest compilati reali → NATS dedicato → worker reale, due round di readiness, inferenza e RDKit, namespace errato, modalità pubblica attuale, SMILES invalidi e validazione PubChem prima del provider. Broker recovery con stessi processi/sessione, stop/start worker, sostituzione e ritorno agli archivi precedenti verificati. Quattro pacchetti modello invalidi respinti al bootstrap; cleanup completo. Nuove immagini dai merge Web `cf9e1043672a4553ddcfad46a32616094f5c8673` e Tox21 `a99754c9e61051036153d3676b7ef5d568b0c1bc`, con stesso pacchetto modello QA e zero criticità bloccanti. Il livello è l'integrazione del componente scientifico: restano distinti bootstrap dell'intera applicazione Web, percorsi REST/GraphQL/browser, provider PubChem live e deployment VM. Nessun merge o modifica Tox21 da questo branch.

**Intervento:** provare in ambiente non produttivo la coppia esatta di artefatti: Web → NATS → Tox21, inferenza e operazioni RDKit. Verificare avvio con configurazione esterna, namespace dell’ambiente, readiness, arresto e riavvio, temporanea indisponibilità NATS e comportamento della modalità auth approvata. Definire cosa accade se modello o soglie sono mancanti/incompatibili.

Documentare la sostituzione dell’immagine e il ritorno alla precedente coppia compatibile, inclusi modello e configurazione. Nessun retraining o alterazione dei dati come effetto collaterale della prova.

**Completamento:** verbale con SHA/digest, ambiente, comandi, esiti e limiti; ripristino verificato. Una build verde non sostituisce questa prova. I TODO manuali/runtime F-01–F-07 della [precedente consegna Web](../../MercurionWebNg/docs/portfolio-ux/FINAL-TODO.md) conservano il loro stato: questa roadmap non li chiude né li riattiva implicitamente.

### T21-10 — Estensione delle verifiche locali del training

**Intervento:** preservare validazione per epoca e valutazione post-training, estendendo prima i test di correttezza della pipeline: split riproducibili e separati, allineamento di label/colonne, gestione di dati invalidi e label senza entrambe le classi, ricerca delle soglie, early stopping e coerenza del checkpoint esportato. Usare dati sintetici piccoli per questi controlli, senza richiedere training completo nei test unitari.

Separatamente, registrare su un nuovo modello le metriche per-label e aggregate su un test set riservato, la procedura di split, seed, configurazione, versioni delle librerie e checkpoint. Tolleranze numeriche e criteri di qualità devono essere motivati prima del confronto; una predizione stabile non dimostra capacità predittiva o validità scientifica. L’eventuale revisione del metodo di split per valutarne la generalizzazione richiede una decisione dedicata, non una modifica opportunistica per migliorare il punteggio.

**Completamento:** verifiche della pipeline distinte dalla valutazione statistica, report locale ripetibile e pacchetto esportato identificabile. Nessuna regressione applicativa viene considerata coperta soltanto perché migliorano loss o ROC-AUC. Questo percorso può proseguire successivamente; il contratto minimo pesi/soglie e la sua prova restano già obbligatori per T21-03/T21-09.

## Decisioni da chiudere prima delle rispettive fasi

### T21-11 — Controllo JWT per servizio (requisito futuro)

Richiesto dall'owner il 7 novembre: [specifica e matrice di precedenza](tox21-service-auth-plan.md).
Cinque flag indipendenti per inferenza, tre API RDKit e PubChemPy, ciascuno con
valori `allow`, `deny-withouth-access-token`, `disabled`. I primi due prevalgono
sempre sul globale; `disabled`, anche come default del flag omesso, eredita il
globale. Il secondo stato richiede un JWT effettivamente valido, non soltanto
presente. Nessun servizio viene disattivato dal valore `disabled`.

**Non implementare durante il task corrente:** T21-07 e la verifica degli
artefatti restano il lavoro attivo. Nessuna nuova policy auth, key rotation o modifica dei
payload viene introdotta per anticipare T21-11. I formati di configurazione e
gli input non riconosciuti saranno fissati prima del codice del task futuro.

| Decisione | Quando serve | Proposta da valutare |
| --- | --- | --- |
| Modalità auth e confine di fiducia del worker | Decisione acquisita per T21-02 | Default pubblico interno e tutto-o-nulla; percorso autenticato con PEM singolo, nessuna rotazione coordinata adottata. L’esposizione di rete della demo resta nel piano VM |
| Piattaforma runtime supportata e necessità GPU | Prima di chiudere T21-03 | Verificare prima Linux/CPU; eventuali altri target richiedono prove proprie |
| Identità/provenienza del modello e convenzione di versione Tox21 | Contratto di pacchetto acquisito in T21-03; release coordinata T21-07 | Identificativo modello, SHA dell’export e checksum acquisiti; la provenienza storica ignota non viene ricostruita per supposizione |
| Manifest Compose/Kubernetes da mantenere | Definito in T21-06 | [Inventario](tox21-deployment.md): proiezioni Tox21 mantenute, nessuna archiviazione; CronJob PostgreSQL non certificato, topologia VM ancora separata |
| Canale di distribuzione e politica delle evidenze di sicurezza | Prima di completare T21-07 | Separare build verificata da pubblicazione; scegliere registry o esportazione in base al contesto demo |

Queste decisioni non impediscono T21-01 o l’analisi delle altre voci indipendenti. Non assegnare arbitrariamente stati terminali a lavori non ancora avviati.

## Confini di esecuzione e consegne

Prima di ogni intervento verificare branch, working tree, istruzioni e baseline del repository interessato. Le modifiche Web e Tox21 hanno branch, commit e prove distinti. L’autorizzazione al lavoro Web non supera da sola il vincolo di sola lettura del sibling nelle sessioni autonome: l’implementazione Tox21 deve ricevere un incarico esplicito nel suo repository. Per eventuale esecuzione autonoma preparare prima le ricette numerate nel relativo control plane, senza trattare questo documento come ricetta.

**Gestione Git autorizzata dall’utente il 6 novembre:** commit e push consentiti; branch separati e comandi Git Flow utilizzabili quando utili, in particolare per modifiche con rischio di regressioni o incompatibilità. La divergenza non è un obiettivo da introdurre artificialmente. Nessun merge autonomo è consentito, neppure fast-forward o tramite `git flow ... finish`; l’integrazione resta all’utente. Questa autorizzazione Git non costituisce autorizzazione a implementare ogni voce della roadmap.

Checkpoint proposti:

1. **Design e regressioni coperti:** T21-00–T21-03 e T21-09 completati; confini, README e decisioni coerenti, compatibilità dipendenze/modello verificata e suite applicativa disponibile prima del refactor container.
2. **Immagine Tox21 verificata:** T21-04–T21-05 completati con gate sull’esatto SHA; nessuna consegna integrata ancora certificata.
3. **Consegna ripetibile:** T21-06–T21-07 completati, consumer allineati e manifest con entrambe le identità.
4. **Accettazione integrata:** T21-08 completato. Deployment della demo resta un incarico successivo nel piano infrastrutturale.

**T21-00–T21-06 e T21-09 completati nel rispettivo perimetro documentato; prossimo intervento T21-07**, identità e consegna coordinata degli artifact. CI Tox21 verificata sull'esatto SHA e proiezioni Web verificate localmente; non equivale ad accettazione integrata. T21-10 estende successivamente la valutazione scientifica locale senza trasferire il training nel runtime. Limiti Windows scientifici, CronJob PostgreSQL, topologia e accettazione operativa restano espliciti nei rispettivi verbali.

Le revisioni delle baseline Tox21 e Web hanno superato i rispettivi gate di
sicurezza; T21-07 dispone del nuovo bundle ammissibile documentato sopra e
della CI verde sullo SHA implementativo. Il prossimo passo è l'integrazione
dei branch da parte dell'owner, poi T21-08. T21-11 è soltanto pianificato:
il controllo JWT granulare non viene anticipato in questa consegna.
