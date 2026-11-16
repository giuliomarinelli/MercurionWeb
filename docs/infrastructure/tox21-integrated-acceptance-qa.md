# T21-08 — Accettazione dei servizi scientifici dagli artefatti

**Esito: PASSED nel perimetro dei servizi scientifici descritto sotto.**
Sostituzione, riconnessione, riavvio, ritorno alla coppia precedente e quattro
fallimenti modello controllati riusciti; cleanup completo. Nessun deployment.

7 novembre 2026. Branch Web `feature/T21-08`, dal develop integrato
`cf9e1043672a4553ddcfad46a32616094f5c8673`. Tox21 develop:
`a99754c9e61051036153d3676b7ef5d568b0c1bc`. Entrambi i merge dell'owner hanno
CI verde: [Web](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/42360199862),
[Tox21](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42360144406).
Nessun nuovo merge o modifica al sibling da parte dell'agente.

## Livello verificato

La prova usa le classi Nest **compilate nella vera immagine Web**:
`MercurionAIService`, `RDKitService`, `PcpService`, `ScientificRpcPolicy` e
`createNatsTransportOptions`, con `ClientProxyFactory` e `ConfigService` reali.
Sono sintetici soltanto i valori di configurazione e i sink di log/metriche.
Non viene sostituito il client NATS o l'handler Tox21 con un mock.

Un processo Web residente conserva la stessa connessione e sessione durante
la perdita del broker. Il worker usa il normale `python -m main`, modello QA
reale, Torch CPU e RDKit reali. Nginx avvia l'artefatto Angular e serve l'index
su loopback del proprio container. Tutte le risorse hanno nomi univoci,
rete Docker interna, nessuna porta host; gli applicativi sono non-root e
read-only con `/tmp` temporaneo. I servizi personali restano invariati.

**Confine esplicito:** questa è integrazione del componente scientifico Nest
con il worker, non bootstrap dell'intera applicazione Nest con database/Redis,
né flusso REST/GraphQL/browser Angular → API. I TODO manuali/runtime F-01–F-07
restano nel loro stato. Non è un deployment sulla VM o una prova con dati
personali/di produzione.

## Coppie selezionate e modello

| Coppia | Sorgente Web | Sorgente Tox21 | Uso |
| --- | --- | --- | --- |
| Precedente ammissibile | `c02ac848d3aaebdb5e3b85022dd2eeba2592bc9b` | `56d1b4e12ddcfa45b440280e025dac46f7ca2034` | Riferimento e ritorno dopo sostituzione |
| Merge integrati | `cf9e1043672a4553ddcfad46a32616094f5c8673` | `a99754c9e61051036153d3676b7ef5d568b0c1bc` | Nuove build dai sorgenti Git puliti |

Le due coppie hanno immagini realmente distinte e non usano tag mobili per
il ripristino. Il modello resta `qa-6f19c86`, con identici pesi, soglie e
manifest: nessun training o nuovo export scientifico. Le differenze dei merge
non introducono una diversa API o un diverso modello: questa prova verifica
la meccanica di sostituzione/ritorno, non una migrazione di schema o la
compatibilità predittiva di modelli differenti.

Il driver valida prima i due manifest completi e ammissibili con il
coordinatore T21-07: checksum di tutti i file, label/config, revisioni, SBOM e
report di policy. Rifiuta una falsa sostituzione con immagini identiche e un
modello diverso da quello ammesso da questo scenario. Poi carica gli archivi
senza tag e verifica nuovamente label e layer dell'immagine risultante.
Il daemon esistente può riusare cache: non è ripristino a freddo su un nuovo host.

## Scenari

1. Coppia precedente pronta dopo **due round RPC consecutivi**: inferenza
   CCO, proprietà molecolari, canonicalizzazione OCC → CCO e confronto
   strutture uguali/diverse.
2. Arresto regolare e sostituzione con i nuovi artefatti: stessi risultati
   sullo stesso pacchetto modello, senza servizi personali o modifiche ai dati.
3. Namespace production coerente tra client/worker; richiesta staging respinta
   per assenza di responder, senza attraversamento implicito dei namespace.
4. Modalità worker globale pubblica attuale: token assente e deliberatamente
   non valido danno la stessa inferenza; PEM non fornito e percorso inesistente.
   Questo verifica il comportamento approvato, non autorizzazione del gateway,
   validazione JWT obbligatoria, rotazione o futuri override T21-11.
5. SMILES invalido su RDKit e PubChemPy: errori reali propagati dal worker
   attraverso il servizio Web. Per PubChem viene verificato soltanto il
   rifiuto prima della chiamata al provider; nessuna risposta PubChem live.
6. Stop del broker posseduto dalla prova, errore Web riconosciuto entro il
   limite, riavvio e due round RPC riusciti; `StartedAt` di Web e worker
   invariati e sessione Web persistente. Non basta aprire un nuovo client.
7. Stop/start del worker con uscita regolare e nuovo `StartedAt`; client Web
   mantenuto e risultati ripristinati.
8. Arresto della coppia candidata, ricaricamento degli archivi precedenti,
   ripristino della configurazione e due round con risultati identici.
9. Quattro copie di fixture modello, mai l'originale: pesi mancanti, soglie
   mancanti, checksum delle soglie incoerente, fingerprint incompatibile.
   Il normale bootstrap deve uscire 1 con `ModelPackageError`, senza
   connessione a un broker reale o accettazione di pacchetti parziali.
10. Cleanup di tutti i container e della sola rete posseduta dalla prova,
    con log e report persistiti anche in caso di fallimento.

## Ripetizione

Prerequisiti: Docker Linux amd64, due bundle T21-07 completi/ammissibili e il
pacchetto QA originale corrispondente. Python usa soltanto standard library;
Node e i client applicativi sono eseguiti dentro l'immagine. Non installare
dipendenze sull'host, non fornire env personali né chiavi JWT.

```powershell
python -B scripts/accept-t21-delivery.py --candidate C:/qa/new/bundle/delivery.json --previous C:/qa/previous/bundle/delivery.json --model-package C:/qa/model-package --output C:/qa/t21-08/run-001
```

Scegliere sempre una directory di output nuova. `result.json` registra le
fasi, l'identità dei manifest, errori e stato di cleanup. Il codice di uscita
resta nonzero se una prova o il cleanup falliscono; un fallimento non viene
convertito in successo dalle fasi precedenti.

La CI Web controlla sintassi del probe, tre guardie sul rollback e gli undici
test del coordinatore. Non esegue implicitamente la prova multi-repository:
i bundle/modello sono input espliciti della verifica locale descritta qui.

## Evidenze locali

Radice degli artefatti: `C:/Users/giuli/.codex/artifacts/t21-08/`.
Le immagini dei merge sono costruite da `git archive`, con i Dockerfile
esistenti e pacchetto modello verificato contro il record Tox21 precedente.
I tentativi partiti prima del completamento dell'estrazione sono stati
scartati; i log sono conservati come `build-*-before-context-ready.log`.
Tutte e tre le build ripetute dopo estrazione completa sono riuscite.

La verifica preliminare del protocollo residente ha collegato il client Nest
reale a un NATS dedicato e ne ha provato la chiusura regolare.

La sequenza completa è riuscita al primo run di accettazione:
`acceptance-1/result.json`, stato `passed`, `cleanup_complete: true`.
Il log `acceptance-1.log` contiene le fasi `previous-ready`, `candidate-ready`,
`broker-recovery`, `worker-restart`, `rollback`. Pesi/soglie e directory
originale del pacchetto non vengono modificati. Tutti i servizi personali
iniziali sono rimasti in esecuzione; nessuna rete/container di accettazione
rimasto attivo dopo la prova.

| Controllo reale | Risultato |
| --- | --- |
| Inferenza CCO | Quattro label attese, probabilità/soglie finite in [0,1], classificazione coerente; risultati identici prima/dopo sostituzione, guasti e ripristino |
| RDKit | Massa molecolare CCO coerente con 46.069; OCC canonicalizzato CCO; confronto uguale vero e diverso falso |
| Namespace staging contro worker production | `SCIENTIFIC_RPC_UNAVAILABLE`, senza risposta di un namespace diverso |
| Auth pubblica corrente | Inferenza identica senza token e con token deliberatamente invalido; nessun PEM fornito |
| SMILES invalido RDKit/PubChemPy | `TOX21_UPSTREAM_ERROR` con `Invalid SMILES`; nessuna chiamata PubChem live |
| Broker arrestato | `SCIENTIFIC_RPC_UNAVAILABLE` immediato; processi Web/worker rimasti vivi |
| Broker ripristinato | Due round RPC riusciti, stesso `StartedAt` dei due processi e stessa sessione Web |
| Worker riavviato | Uscita 0, nuovo `StartedAt`, risultati ripristinati sul client residente |
| Ritorno alla coppia precedente | Archivi ricaricati e verificati; due round e stessi risultati/configurazione/modello |
| Pesi/soglie mancanti, checksum soglie errato, fingerprint incompatibile | Tutti e quattro: uscita 1 e `FATAL: ModelPackageError` dal normale bootstrap |

Le tre nuove immagini hanno superato export, caricamento, audit e scan con
zero criticità: frontend 1 finding medio; backend 9 alti/17 medi/6 bassi;
Tox21 52 alti/78 medi/63 bassi. Policy invariata, nessuna eccezione.

| Componente nuovo | Config digest SHA-256 |
| --- | --- |
| web-ng | `d180130f5fe984f3b379b45771f67eef85cb987681510695d1108c97f4edaca9` |
| web-node | `af4962170144bf7e1985a82c76c87fc851b20cac5cad5e86dd210126717cc48c` |
| tox21 | `2c185467a91dab4f929c7a6ee9f939f3daaa9e2fc39f1e38fed55cc460bef138` |

Il nuovo `bundle/delivery.json` è completo, ammissibile e non distribuito.
Checksum SHA-256 manifest:
`8206e72cff97ac49271d1ba0515ebf7fea40f85b92df030f0df67b650c05eb09`.
Checksum del report effettivo:
`7966d472dbcf8d98b790ed540354c986be3afb9c27138fcd5f715e7dd3eb3249`.
I checksum dei singoli archivi sono nel manifest/record vincolati; quelli dei
due driver eseguiti sono nel report e sono stati confrontati con i sorgenti
prima del commit. Gli script non simulano una risposta scientifica per
ottenere un esito verde.
