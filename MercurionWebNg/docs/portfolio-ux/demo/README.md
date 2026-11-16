# Demo portfolio — blocco 25 / PX-21

Aggiornamento del 5 novembre 2026. **Dataset e copione in review; percorso persistente parziale verificato nel [Giorno 1](../DAY-1-QA.md), compatibilità nel [Giorno 4](../DAY-4-QA.md).** La preview locale usa i componenti dell’applicazione e risposte dati sintetiche nella sola scheda Playwright. Non è una modalità demo distribuita nel prodotto e non certifica salvataggi nel database.

## Materiale

| File | Scopo |
| --- | --- |
| [dataset.json](dataset.json) | Quattro campioni, tre collezioni, note e due notifiche dichiaratamente sintetiche |
| [chembl-snapshot.json](chembl-snapshot.json) | Estratto dei record pubblici originali e URL di provenienza, acquisito il 30 ottobre 2026 |
| [preview.mjs](preview.mjs) | Trasporto Playwright MCP per una scheda locale temporanea; scritture bloccate |
| [prepare-preview.mjs](prepare-preview.mjs) | Genera il codice da eseguire attraverso Playwright MCP, senza avviare un browser alternativo |
| [validate.mjs](validate.mjs), [demo.test.mjs](demo.test.mjs) | Identità delle fonti, riferimenti, casi limite e protezione del trasporto |
| [QA.md](QA.md) | Evidenze, correzione emersa dal dataset e lavoro ancora aperto |

Nessun dato di clienti, credenziale, identificatore dell’account corrente o risultato Tox21 è incluso. Le date demo sono fisse, non indicano eventi effettivamente avvenuti. Il dataset non contiene indirizzi e-mail o numeri di telefono.

## Campioni e provenienza

| Campione | Fonte originale | Formula | MW della fonte |
| --- | --- | --- | --- |
| Aspirina | [ChEMBL / CHEMBL25](https://www.ebi.ac.uk/chembl/api/data/molecule/CHEMBL25.json), ASPIRIN | C9H8O4 | 180,16 |
| Caffeina | [ChEMBL / CHEMBL113](https://www.ebi.ac.uk/chembl/api/data/molecule/CHEMBL113.json), CAFFEINE | C8H10N4O2 | 194,19 |
| Paracetamolo | [ChEMBL / CHEMBL112](https://www.ebi.ac.uk/chembl/api/data/molecule/CHEMBL112.json), ACETAMINOPHEN | C8H9NO2 | 151,16 |
| Campione personale | Copia invariata della struttura CHEMBL25, dichiarata nel nome e nella nota | C9H8O4 | Intenzionalmente assente nella card |

Attribuzione dei dati: **ChEMBL, EMBL-EBI**. Conservare attribuzione e URL nelle pubblicazioni che riutilizzano il dataset e verificare le condizioni di riuso della fonte prima della distribuzione esterna. I nomi italiani sono etichette della demo. Le strutture sono le stringhe canoniche della fonte: non vengono riscritte manualmente. Nomi ufficiali, formula e MW sono vincolati dal validatore; non è una ricertificazione chimica indipendente dei dati ChEMBL.

La copia personale deriva dalla stessa fonte, anziché duplicare in JSON nome, SMILES e descrittori indipendenti che potrebbero divergere. Le proprietà volutamente assenti non sono valori pari a zero. Il campo `max_phase`, quando mostrato, proviene dal record ChEMBL: non è una valutazione clinica prodotta da Mercurion. Nessun confronto implica equivalenza terapeutica, assenza di tossicità o sicurezza.

## Percorso principale: clienti software B2B

Pubblico confermato dall’utente: **clienti software B2B, con attenzione a qualità tecnica e UX**. Il percorso principale dura circa 2 minuti e 40 secondi. Il taglio R&D resta un approfondimento opzionale, senza cambiare la priorità della presentazione. Le durate sono indicative per il copione, non misure prestazionali.

La narrazione parte dal problema dell’utente: trovare, organizzare e modificare informazioni complesse mantenendo il controllo del lavoro. Mostrare prima l’esperienza e poi collegarla alle scelte tecniche osservabili: stati asincroni comprensibili, navigazione e focus coerenti, gestione dei dati mancanti, responsive, integrazione di servizi e salvataggio verificato. La chimica fornisce un caso applicativo concreto; non richiede una lezione specialistica al cliente.

| Passaggio | Azione | Cosa dimostra | Software B2B | R&D |
| --- | --- | --- | --- | --- |
| Esplorazione | Aprire Le mie collezioni; distinguere riferimenti, confronto e progetto vuoto | Gerarchia, conteggi e stati vuoti | 20 s | 15 s |
| Ricerca | Cercare aspirina nel catalogo ChEMBL; nella preview usare invece il filtro delle liste | Ricerca e stato asincrono; distinguere catalogo e dati personali | 25 s | 30 s |
| Dettaglio | Aprire il risultato pubblico, visualizzare struttura, SMILES e descrittori | Integrazione scientifica e provenienza dei dati | 25 s | 40 s |
| Organizzazione | Associare il campione a Molecole di riferimento; annotare il contesto | Stato condiviso e relazione molti-a-molti | 30 s | 25 s |
| Editor | Duplicare la struttura, aprire Analisi live e compiere una piccola modifica | Reattività, richieste asincrone e invalidazione dei risultati obsoleti | 35 s | 45 s |
| Salvataggio | Attendere struttura/analisi correnti, scegliere nome e destinazione; riaprire dopo refresh | Validazione, conservazione del lavoro e persistenza effettiva | 25 s | 30 s |

Per la versione B2B, chiudere su tre evidenze verificabili: il lavoro si ritrova dopo la riapertura, un errore non cancella l’input, la stessa azione resta utilizzabile su schermo compatto e da tastiera. Queste affermazioni vanno dimostrate durante la QA completa, non dedotte dagli screenshot o presentate come già certificate.

Il percorso completo richiede dati persistiti su un account di prova e servizi scientifici disponibili. Nella preview sono verificabili **liste, filtri, card e lista notifiche**; associazione, editor, dettaglio, lettura/eliminazione delle notifiche e salvataggio non sono promessi come interazioni supportate. Le scritture vengono rifiutate, non simulate come riuscite. Nel Giorno 1 sono stati verificati ricerca dell’aspirina, associazione, copia personale, modifica nell’editor, salvataggio reale e riapertura; errore di trasporto controllato e retry conservano il lavoro. L’anomalia storica del primo salvataggio PX-09 resta non riprodotta e non dichiarata risolta.

Non lasciare un nome chimico del campione originario su una struttura modificata. Usare un’etichetta esplicita come «Variante dimostrativa da editor · Demo25» e lasciare al servizio remoto il ricalcolo del nome e dei descrittori. Se una predizione non arriva, mostrarne lo stato reale: non sostituirla con una risposta salvata o inventata. Un esito negativo Tox21 non prova la sicurezza della molecola.

## Preparazione di una demo persistente

Il seed completo delle tre collezioni descritte sotto **non è stato eseguito**. La prova reale del Giorno 1 ha invece preparato una sola collezione «Molecole di riferimento · Demo25», con aspirina, copia personale e due varianti esplicitamente denominate: quattro elementi riaperti e verificati. Gli ID restano nel verbale locale. Per una dimostrazione senza ulteriori scritture, aprire questa collezione e la variante salvata; ricerca/editor possono essere mostrati senza creare nuovi duplicati. Il copione completo con nuovo salvataggio richiede una fixture aggiuntiva identificabile e servizi disponibili, non la sovrascrittura dei campioni esistenti.

Procedura per completare in seguito il seed del dataset:

1. Concordare l’account di prova e registrare gli ID di ogni risorsa creata. I nomi delle collezioni contengono `Demo25`; non usarli come prova di proprietà o come criterio per una cancellazione automatica.
2. Risolvere nel catalogo locale i tre identificativi ChEMBL mediante ricerca. Il `molregno` locale non coincide necessariamente col numero CHEMBL e cambia tra database. Non importare gli ID sintetici della preview.
3. Prima di creare collezioni o campioni, controllare se esistono già. Se sono presenti, riutilizzarli solo dopo aver verificato fonte, SMILES e appartenenza; non rinominare o sovrascrivere contenuti preesistenti dell’utente.
4. Creare le tre collezioni in `dataset.json`. Associare i tre campioni al gruppo di riferimento; aspirina e copia personale al confronto; lasciare vuoto Nuovo progetto. Non rimuovere dati scientifici reali per costruire artificialmente il caso mancante: quel caso resta nella preview isolata.
5. Inserire le note nei campioni demo appena creati. Verificare conteggi, appartenenze e note dopo refresh. Mantenere gli ID in un verbale locale non destinato al portfolio.
6. Percorrere editor → salvataggio → riapertura, registrando esito e eventuale errore del primo tentativo. Un retry riuscito non chiude da solo l’anomalia PX-09.
7. Produrre notifiche di prova solo attraverso una fixture QA concordata, senza e-mail, SMS o ticket reali. Non spacciare i due testi sintetici per eventi reali.
8. Ripetere la demo senza creare duplicati. Prima di rimuovere le fixture, verificare le conseguenze delle eliminazioni e intervenire soltanto sugli ID creati nella prova. Non svuotare cronologia, notifiche o collezioni dell’account per preparare gli screenshot.

## Preview locale ripetibile, senza seed

Da root, usando l’albero delle dipendenze esistente:

```powershell
node MercurionWebNg/docs/portfolio-ux/demo/validate.mjs
node --test MercurionWebNg/docs/portfolio-ux/demo/demo.test.mjs
node MercurionWebNg/docs/portfolio-ux/demo/prepare-preview.mjs
```

L’ultimo comando stampa una funzione JavaScript da passare come `code` a `browser_run_code_unsafe` di **Playwright MCP**. Non incollare il risultato in una shell. Il runtime deve essere già disponibile su `http://localhost:8888` e la pagina passata al tool deve appartenere a quell’origine. Il helper apre una nuova scheda nello stesso contesto autenticato, installa i route handler prima della navigazione e la marca con `_demo25`.

Aprire `/molecules/collections`, `/molecules` o `/notifications` nella scheda marcata. Filtrare una lista per mostrare il caso senza risultati e cancellare il filtro per ripartire. Le query personali supportate sono servite dal dataset; gli altri comandi GraphQL e tutte le scritture REST sono bloccati. Le GET di bootstrap restano reali: questa è separazione dei dati dimostrativi, non isolamento della sessione autenticata. Non aprire impostazioni/account nella preview. Una sessione scaduta va gestita fuori dalla prova, con normale login.

Il tema è quello del prodotto, scelto dal suo menu; può sincronizzarsi con le altre schede. Registrare la preferenza iniziale e ripristinarla alla fine. Chiudere soltanto le Page create dalla prova e marcate `_demo25`, conservando il riferimento restituito dal helper; la chiusura elimina gli handler. Non installare questi handler a livello di `context`, non registrare service worker e non aggiungere un flag demo all’app.

## Selezione delle schermate

Le catture in [screenshots/](screenshots/) sono **ritagli della UI corrente con fixture locali**. Non sono mockup ridisegnati. Il ritaglio esclude header/account e cronologia; non sono state cambiate icone, colori o markup per rendere la cattura più favorevole. Didascalia da conservare: «Mercurion, ambiente di sviluppo; dati dimostrativi locali, 30 ottobre 2026».

- `collections-light.png`, `collections-dark.png`: confronto dei temi, nomi lunghi e conteggi.
- Le catture delle molecole e delle viewport compatte sono registrate con stato e limiti in [QA.md](QA.md). Non presentarle come prove Safari.
- Dettaglio, analisi live ed esito del salvataggio: persistenza verificata nel Giorno 1; nel Giorno 4 ispezionati due ritagli dell’intestazione della variante reale (desktop scuro e 375 px chiaro), conservati soltanto negli artefatti locali. Selezione finale di struttura/analisi ancora aperta. Non usare schermate precedenti con dati incoerenti o cronologia personale.
- Demo mobile autentica: iPhone 13 mini/Safari fisico, in entrambi i temi, rotazione e tastiera aperta su ricerca e salvataggio. Ancora da eseguire; una viewport Chrome da 375 px non la sostituisce.

Le schermate sono candidate alla review, non pubblicate. Lo sfondo e le immagini di Home/Welcome restano quelli scelti dall’utente. Notebook, Synthesis, Documents e R2 restano fuori dal copione corrente.
