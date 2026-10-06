# Mercurion — Diario dei blocchi UX

Roadmap: [ROADMAP.md](ROADMAP.md).

Usare una voce per ogni blocco affrontato, anche quando la giornata produce soltanto una diagnosi o una proposta. Non trasformare un limite di verifica in un esito positivo.

## Stati

- **Da affrontare**: pianificato, nessun lavoro del blocco dichiarato completo.
- **In osservazione**: raccolta di evidenze e definizione dell'intervento.
- **In lavorazione**: modifiche avviate, verifica ancora incompleta.
- **Implementato, in review**: verifiche previste eseguite, attesa della review manuale.
- **Accettato**: review manuale conclusa; non implica merge o rilascio.

## Punto di partenza — 6 ottobre 2026

- Audit regressioni precedente completato e documentato negli artefatti locali.
- Primo riferimento UX settings implementato: quattro pannelli e cinque overlay iniziali verificati nei due temi.
- Stato del riferimento: **Implementato, in review**. Stati OTP/QR e altre varianti account restano nel completamento PX-13.
- Roadmap iniziale salvata; gli altri blocchi restano **Da affrontare**.
- Prossimo blocco suggerito: **PX-07, creazione collezione** (ordine 01 della roadmap).
- Nessun ulteriore intervento al codice applicativo è stato eseguito per preparare questi documenti.

## Blocco 01 — Creazione collezioni

### 2026-10-06 — PX-07 — Creazione collezioni

**Stato:** Implementato, in review. Gli altri overlay PX-07 restano da affrontare.

**Obiettivo:** distinguere preparazione dell'elenco e creazione effettiva, con form leggibile nei due temi, anteprima utilizzabile su mobile e recupero dagli errori.

**Evidenze iniziali:** `/molecules/collections`, overlay `CreateCollection`. Nome accessibile di “Aggiungi” sostituito dal messaggio di validazione; `aria-describedby` puntava a un elemento assente con input vuoto; stato busy attivo appena presente un nome; testo dei chip a 10 px e rimozione a 12 px su mobile. Il sorgente permetteva richieste ripetute e chiudeva il pannello in caso di errore, perdendo i nomi. Feedback duplicato non reattivo alla rimozione di un nome.

**Interventi:** titolo breve, istruzioni, azione secondaria “Aggiungi nome”, elenco con conteggio e conferma singolare/plurale. Input e superfici usano i token semantici dei temi. Nomi lunghi vanno a capo; rimozione e pulizia hanno target di 44 px; campo a 16 px. Feedback associato al campo, ritorno del focus dopo rimozione e pulizia. La conferma non scarta nomi ancora nel campo. Durante la richiesta, editing, invii ripetuti e chiusura tramite controlli, Escape o sfondo sono bloccati. Dopo errore restano nomi e possibilità di retry; dopo successo resta l'invalidazione della lista e il toast. Modifica al contenitore condiviso limitata alla dismissal policy di `CreateCollection` durante `submitting`.

**File:** componente, nuovo CSS locale e test di `create-collection`; policy e test di `action-overlay`. Nessuna modifica ai pannelli settings manuali, contratti backend o dipendenze.

**Verifica browser:** Chrome tramite Computer Use su `http://localhost:8888`, runtime esistenti autorizzati. Aggiunta con Invio, duplicato, rimozione con aggiornamento del feedback, più nomi e nomi lunghi. Sette viewport per tema: 360×800, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1920×1080. Nessun overflow orizzontale nel pannello; target di rimozione 44×44 px e input a 16 px nelle 14 misure. Lista di otto nomi a 360×500: scroll interno e conferma raggiunta con Tab, focus visibile. Creazione reale della collezione vuota locale `UX PX-07 — 2026-10-06`, toast di successo e aggiornamento della lista; fixture lasciata visibile nell'account di test. Nessun errore console catturato nella scheda finale. Tema automatico e viewport originale ripristinati.

**Limiti:** errore remoto, richiesta prolungata e retry verificati con Observable controllato nei test, senza provocare guasti al backend. La viewport ridotta verifica lo spazio disponibile, non una tastiera virtuale su un dispositivo fisico. Le misure riguardano questo overlay, non certificano tutta la pagina collezioni. Un timeout della connessione Chrome ha richiesto una scheda nuova; le misure finali sono state raccolte e salvate dopo il recupero.

**Controlli locali:** ESLint mirato, TypeScript, controlli styling e colori semantici superati. Suite creazione: 13 test passati (6 del componente e 7 comuni); suite contenitore: 14 passati (7 specifici e 7 comuni). Regole collezioni passate nella prima esecuzione congiunta. Build Angular e gate bundle/lazy superati; resta l'avviso preesistente sulla soglia indicativa di 500 kB, con bundle iniziale sotto il gate di 1 MB. Nessuna certificazione CI remota o integrazione dichiarata.

**Prove locali:** `C:/Users/giuli/.codex/artifacts/mercurion-portfolio-ux-2026-10-06/PX-07-create-collection/`: `before.png`, quattro schermate dopo nei due temi, `responsive.json`, `short-height.json`, `short-height-keyboard-footer.png`, `creation-success.png`. Le schermate dell'overlay mostrano nomi dimostrativi; la schermata del successo comprende le fixture locali già esistenti e non è materiale portfolio pubblico.

**Review manuale:** da eseguire. Nessun commit o merge effettuato.

**Rimane da fare:** review visiva/manuale del blocco; eventuale prova su telefono fisico. Scelta destinazione, associazione e aggiunta molecole restano aperti.

**Prossimo blocco:** ordine 02, PX-07 — `SelectCollectionThenRoute` e associazione: leggibilità della destinazione e continuità del passaggio tra overlay.

## Blocco 02 — Destinazione e associazione

### 2026-10-06 — PX-07 — Destinazione e associazione

**Stato:** Implementato, in review. L'aggiunta delle molecole resta nel blocco 03.

**Obiettivo:** rendere esplicita la destinazione dell'importazione/aggiunta e offrire una selezione multipla compatta, leggibile e recuperabile in caso di errore.

**Evidenze iniziali:** `SelectCollectionThenRoute` dalla sidebar ChEMBL e dall'aggiunta molecole; `BindCollectionsToMolecule` dalla pagina di ASPIRINA. Destinazione senza riepilogo persistente, creazione inline senza gestione visibile dell'errore. Associazione con schede grandi contenenti data e informazioni ridondanti, nessun conteggio selezionato, selezione globale non spiegata durante la ricerca. Errore di trasporto sostituiva la selezione con una schermata generica; risposta `ok: false` chiudeva comunque il pannello. Doppio invio e chiusura durante salvataggio non protetti.

**Interventi:** scelta destinazione in card compatta, istruzioni sul prossimo passaggio e riepilogo del nome selezionato conservato tra le ricerche. Creazione inline con validazione esistente, pending, nome conservato dopo errore e retry. Associazione in card standard con nome della molecola separato dal titolo, righe compatte con checkbox native e conteggio molecole, nomi a capo, riepilogo selezione, azzeramento e spiegazione della selezione globale. Errori di caricamento e mutazione visibili; selezioni conservate per riprovare. Durante mutazioni sono bloccati editing, doppio invio e chiusura tramite controlli, Escape e sfondo. Paginazione collegata all'effettivo contenitore di scroll. Restano invariati snapshot, selezione globale/esclusioni e parametri del passaggio al prossimo overlay.

**File:** i due componenti e relative suite, CSS locale condiviso ai soli due overlay, dismissal policy del contenitore e test, transizione di submit del contesto e test. La nuova transizione da `succeeded` a `submitting` è limitata a `SelectCollectionThenRoute`, per consentire più creazioni inline nella stessa sessione. Nessun intervento sui controlli comuni, sul backend, sui pannelli settings o sul flusso interno di aggiunta molecole.

**Controlli locali:** 33 test mirati superati sulla versione finale (due overlay, contenitore, contesto e controlli comuni). ESLint, styling, colori semantici e `git diff --check` superati. Build Angular e gate bundle/lazy superati; resta l'avviso sulla soglia indicativa di 500 kB, mentre il bundle iniziale passa il gate di 1 MB. Nessuna certificazione CI remota dichiarata.

**Verifica browser:** Chrome tramite Computer Use, runtime esistenti autorizzati, edge `http://localhost:8888`. Destinazione con nome lungo, ricerca, selezione, creazione inline reale e successivo passaggio all'aggiunta ChEMBL con nome corretto e radio ChEMBL selezionata. Flusso ordinario dalla pagina molecole: destinazione corretta e radio “Le mie molecole” selezionata. Associazione: selezione totale, esclusione di una destinazione, stato indeterminato, azzeramento, ricerca vuota con selezione conservata. Associazione reale di ASPIRINA alla fixture del blocco 01 `UX PX-07 — 2026-10-06`: toast di successo e appartenenza visibile sulla pagina molecola.

**Responsive:** sette viewport per ciascuno dei due overlay in ciascun tema, 28 misure: 360×800, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1920×1080. Pannelli entro la viewport, nessun overflow orizzontale; etichette cliccabili delle righe almeno 46 px di altezza. Nomi lunghi a capo. A 360×500 la conferma dell'associazione è raggiunta con Tab e focus visibile; header e footer restano utilizzabili con scroll. Tema automatico e viewport originale ripristinati.

**Prove:** artefatti in `C:/Users/giuli/.codex/artifacts/mercurion-portfolio-ux-2026-10-06/PX-07-destination-binding/`: due schermate prima, otto schermate dei due pannelli dopo nei temi e viewport desktop/mobile, `responsive.json`, `binding-short-keyboard.png`, `association-success.png`, `destination-transition.png`, `ordinary-transition.png`, `tests.log` e `build.log`. Screenshot delle pagine complete contengono fixture locali preesistenti e non sono materiale portfolio pubblico.

**Fixture:** creata e lasciata nell'account locale `UX PX-07 — Destinazione di prova per composti di riferimento e studi di relazione struttura-attività` (collezione vuota). La collezione di prova del blocco 01 ora contiene ASPIRINA. Nessuna eliminazione di dati.

**Limiti:** pending prolungato, errore di trasporto, risposta `ok: false`, retry e payload di selezione globale verificati con Observable controllati nei test, senza provocare guasti al backend. Nel browser erano disponibili tre destinazioni per l'associazione: paginazione e selezioni tra pagine sono coperte dal test esistente; nessuna lista di molte pagine dichiarata verificata dal vivo. Viewport ridotta non equivale a tastiera virtuale su telefono fisico. Durante le pagine molecole sono stati osservati errori del renderer molecolare e del caricamento IUPAC, esterni ai due overlay; non risolti né attribuiti a questo blocco. La verifica non certifica il flusso interno di `AddMoleculesToCollection`.

**Review manuale:** da eseguire; nessun commit o merge effettuato.

**Prossimo blocco:** ordine 03, PX-07 — `AddMoleculesToCollection`, scelta sorgente, risultati e selezione delle molecole.

### 2026-10-06 — PX-07 — Aggiunta molecole (blocco 03)

**Stato:** Implementato, in review.

**Obiettivo:** rendere chiari destinazione, sorgente e selezione prima della conferma, mantenendo utilizzabili ricerca e azioni con liste lunghe.

**Evidenze iniziali:** overlay osservato dalla collezione di prova con nome lungo. Titolo e destinazione mescolati, radio con ampi spazi, chips con rimozione di 20 px su desktop, nessun conteggio per le molecole personali. Cambiare sorgente azzerava le selezioni. La ricerca ChEMBL passava sia dal componente di ricerca con servizio proprio sia dal controller locale. Invio ChEMBL senza pending; risposta negativa chiudeva il pannello e poteva reindirizzare, errore di trasporto sostituiva la selezione con uno stato generico. La verifica mobile ha inoltre mostrato azioni alla fine della lista e controlli delle schede sovrapposti a header/footer durante lo scroll.

**Interventi:** titolo breve con icona, destinazione a capo in un riepilogo separato, due sorgenti con radio native e target di almeno 48 px. Ricerca ChEMBL gestita da un solo controller: debounce, cancellazione immediata delle richieste precedenti, deduplicazione della query e retry della stessa ricerca. Le selezioni per sorgente sopravvivono a cambio sorgente e ricerca; la conferma invia soltanto la sorgente attiva. Conteggio e spiegazione della selezione globale, azzeramento, chips con rimozione di 44 px, schede ChEMBL selezionate riconoscibili e senza nuova selezione o navigazione involontaria. Stati iniziale, caricamento, nessun risultato ed errore recuperabile. Footer persistente su mobile e viewport compatte; stacking delle schede confinato alla lista. Paginazione collegata al contenitore di scroll effettivo, con pulsante di caricamento come alternativa all'observer. Invio unico per entrambe le sorgenti, editing e chiusura bloccati durante pending, errori con draft conservato e retry, invalidazione e toast soltanto dopo successo. Cancellare la ricerca non duplica il caricamento quando il campo emette entrambi gli eventi.

**File:** componente, CSS locale e controller di `AddMoleculesToCollection`, suite relative, `SearchResultComponent` con input `selected` opzionale e test, dismissal policy del contenitore e test. Il comportamento degli altri consumatori di `SearchResultComponent` conserva il default precedente. Nessuna modifica al backend, ai DTO generati, ai controlli comuni, a settings o al dettaglio sinonimi.

**Controlli locali:** 36 test mirati superati: componente, controller di selezione/ricerca/invio, contenitore overlay, risultati ricerca e controlli comuni inclusi dall'ambiente di test. ESLint, styling, colori semantici e `git diff --check` superati. Build Angular con gate bundle e lazy chemistry verificata; resta l'avviso della soglia indicativa di 500 kB. Nessuna certificazione CI remota dichiarata.

**Verifica browser:** Chrome tramite Computer Use, runtime esistenti autorizzati, edge `http://localhost:8888`. Molecole personali: ricerca ASPIRINA, selezione, cancellazione della ricerca, lista di otto schede e selezione conservata; ricerca senza corrispondenze con conferma ancora disponibile per la molecola selezionata. ChEMBL: ricerca `aspirin`, risultati scientifici con viewer, selezione, rimozione e reinserimento, ricerca senza risultati con chip conservato. Cambiando sorgente, ciascuna selezione viene recuperata; la scheda ChEMBL selezionata mostra il badge e non espone un link al dettaglio.

**Operazioni reali:** aggiunta ChEMBL di ESTERE ASPIRINA-EUGENOLO alla fixture del blocco 02, poi aggiunta di ASPIRINA da Le mie molecole. Entrambe confermate dal toast e dall'appartenenza visibile sulla pagina collezione. La selezione ChEMBL di ASPIRINA TRELAMINA usata durante la verifica del tema chiaro non è stata inviata quando si è confermata la sorgente personale. La collezione `01a1125c-ee21-7000-b460-f697bf0bd529` ora contiene ASPIRINA ed ESTERE ASPIRINA-EUGENOLO; nessuna eliminazione di dati.

**Responsive e tastiera:** 28 misure, due sorgenti in due temi per sette viewport: 360×800, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1920×1080. Nessun overflow orizzontale; pannello e footer dentro la viewport. Scrolling sul card mobile e sul body desktop. A 360×500, navigazione con Tab attraverso ricerca, selezione e azioni; ritorno con Shift+Tab al campo, visibile sopra il footer. Escape chiude il draft inattivo e ritorna al contesto precedente; protezione Escape durante invio verificata nei test del contenitore. Tema automatico e viewport originale ripristinati.

**Prove:** `C:/Users/giuli/.codex/artifacts/mercurion-portfolio-ux-2026-10-06/PX-07-add-molecules/`: `before-my.png`, `before-chembl.png`, otto schermate dopo nei temi/dimensioni desktop e mobile, `responsive.json`, `keyboard-short.json`, `keyboard-short.png`, `keyboard-search-short.png`, `chembl-empty-selection.png`, `chembl-success.png`, `my-success.png`, `tests.log`, `build.log`. Le immagini includono fixture locali e non sono materiale portfolio pubblico. Le misure di focus nel file JSON sono campionate subito dopo ciascun Tab: i pulsanti del footer sono dentro il footer, non nella regione del contenuto; la visibilità del campo è stata confermata separatamente dopo l'assestamento dello scroll.

**Limiti:** errori di trasporto, risposta negativa, retry, pending prolungato, cancellazione delle risposte tardive e selezione globale/esclusioni verificati con Observable controllati nei test, senza provocare guasti al backend. La lista personale osservata occupa una sola pagina: nessuna paginazione su molte pagine dichiarata verificata dal vivo. Viewport ridotta non equivale a tastiera virtuale o Safari su dispositivo fisico. Errori preesistenti del renderer molecolare restano fuori da questo blocco; non si dichiara una console globale priva di errori.

**Review manuale:** da eseguire; nessun commit, merge o deploy effettuato. Lo stato non equivale ad accettazione della roadmap complessiva.

**Prossimo blocco:** ordine 04, PX-09 — `MoleculeCollectionItemSave`, form, destinazione, metadati e conferma del salvataggio.

## Modello per le voci successive

### AAAA-MM-GG — PX-XX — Sottoarea

**Stato:** In osservazione / In lavorazione / Implementato, in review / Accettato.

**Obiettivo della giornata:** risultato circoscritto e osservabile.

**Evidenze iniziali:** route, stato, dati, viewport, tema e problema concreto. Distinguere bug confermato da miglioramento proposto.

**Interventi eseguiti:** cosa cambia e perché; file coinvolti; modifiche manuali da preservare.

**Verifica:** flusso realmente percorso, tastiera/touch, temi, dimensioni, stati e controlli locali pertinenti. Riportare esito e limiti.

**Prove:** percorso delle schermate prima/dopo e di eventuali misure o report. Escludere dati sensibili dalle prove destinate al portfolio.

**Review manuale:** da eseguire / osservazioni ricevute / accettazione e data.

**Rimane da fare:** elenco breve e preciso; eventuali decisioni necessarie.

**Prossimo blocco:** una sola sottoarea, con motivazione.
