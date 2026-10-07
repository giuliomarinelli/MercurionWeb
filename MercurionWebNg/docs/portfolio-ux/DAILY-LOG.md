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

### 2026-10-06 — PX-09 — Salvataggio della molecola (blocco 04)

**Stato:** Implementato, in review.

**Obiettivo:** concludere editor → nuova molecola con destinazione chiara, metadati ordinati e conferma verificabile.

**Evidenze iniziali:** osservato in Chrome con `CCOCC`: selettore sempre esteso e offset `-top-3`, focus manuale dei campi, proprietà senza stato di calcolo, azioni nel contenuto, errori solo con toast e richieste duplicate non protette. Il metodo dell’overlay crea sempre una nuova molecola; la modifica dell’originale avviene in un altro percorso dell’editor.

**Interventi:** titolo e istruzioni espliciti; riepilogo della destinazione conservato durante la ricerca; selettore richiudibile con focus restituito al disclosure. Metadati su due colonne desktop e una mobile, descrizioni collegate, nome composto da soli spazi rifiutato, note accessibili senza ID duplicati. Proprietà con unità, arrotondamento solo visivo, spazio riservato al calcolo, errore recuperabile e possibilità di salvare senza valori dopo un fallimento. SMILES consultabile; footer persistente e spazio dello scroll che mantiene i campi raggiunti con Tab sopra le azioni.

**Affidabilità:** creazione inline con validazione, pending, conferma e retry del nome conservato. Invio unico, editing e chiusura bloccati durante pending; payload e destinazione acquisiti prima della richiesta. Errori inline con dati e draft conservati; messaggio specifico per struttura già presente. Cancellazione del draft, invalidazione, toast e navigazione soltanto dopo successo; risposte tardive ignorate dopo la distruzione del pannello.

**File:** componente, nuovo CSS locale e test del salvataggio; dismissal policy del contenitore e test; contesto e test per consentire il salvataggio dopo creazione inline. `ActionCardComponent` aggiunge due variabili CSS opzionali dello scroll, usate solo dal form e con default zero. Il suo test di contenuto lungo verifica il contenitore effettivamente scrollabile nelle viewport desktop o mobili/corte. Nessuna modifica a backend, DTO generati, settings, sinonimi o altri flussi dell’editor.

**Controlli locali:** 47 test mirati superati: salvataggio, contenitore overlay, contesto, ActionCard e controlli comuni inclusi dal runner. ESLint, styling, colori semantici e `git diff --check` superati. Build Angular e lazy chemistry superate; bundle iniziale 990448 byte su 1000000. Il gate bundle resta sotto il limite obbligatorio di 1 MB; restano gli avvisi indicativi di 500 kB iniziali e di 4 kB sul CSS di `AddMoleculesToCollection`. Nessuna certificazione CI remota dichiarata.

**Browser:** Chrome Computer Use, runtime esistenti autorizzati, edge `http://localhost:8888`. Selezione di una destinazione con nome lungo, metadati, ricerca senza risultati e creazione inline con dati conservati. Validazione da tastiera, focus dopo selezione ed Escape sul pannello inattivo con ritorno al comando dell’editor verificati.

**Operazioni reali:** creata `UX PX-09 — Salvataggio molecola con metadati e destinazione`, ID `01a112b4-54e1-7000-a1ee-f95db572d2a2`. La prima richiesta, inviata con Invio, ha restituito un errore; form conservato e collezione ancora vuota verificati. La causa della prima risposta non è stata isolata: non viene attribuita a una regressione frontend né dichiarata risolta. Una prova successiva ha salvato `UX PX-09 — Etere di prova`, ID `01a112cd-9bad-7000-b3d2-01ce0973deac`, nella stessa collezione. Verificati nel dettaglio nome, etichetta `Riferimento UX`, note, SMILES `CCOCC`, proprietà originali, appartenenza e query `c_id` corretta. Toast coerente; nessuna eliminazione.

**Responsive e tastiera:** 14 misure, due temi e sette viewport: 360×800, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1920×1080. Nessun overflow orizzontale del pannello; footer dentro la viewport. Le misure dopo il resize possono includere l’animazione; schermate desktop/mobile osservate separatamente dopo l’assestamento. A 360×500, Tab su etichetta, note, ricalcolo, struttura, Annulla, Salva e chiusura: contenuto sopra il footer e focus nel dialog. Tema automatico e viewport originale ripristinati.

**Prove:** `C:/Users/giuli/.codex/artifacts/mercurion-portfolio-ux-2026-10-06/PX-09-molecule-save/`: `before.png`, `after-dark-desktop.png`, `after-dark-mobile.png`, `after-light-desktop.png`, `after-light-mobile.png`, `responsive.json`, `keyboard-short.json`, `keyboard-short.png`, `save-error-draft.png`, `success.png`, `success.txt`, `tests.log`, `build.log`. Fixture locali, non materiale portfolio pubblico.

**Limiti:** pending prolungato, errori controllati, retry senza distruzione del componente, risposte tardive, errore del calcolo e conflitto di struttura coperti nei test. Nel browser: caricamento delle collezioni, errore reale e successivo salvataggio riuscito, senza provocare guasti ai servizi. Collezioni su una pagina: paginazione estesa non verificata dal vivo. Viewport corta non equivale a tastiera virtuale o Safari fisico. Modalità edit coperta dal test dell’overlay; percorso completo di modifica nei blocchi 12–13. Nessuna dichiarazione di console globale priva di errori.

**Review manuale:** da eseguire; nessun commit, merge o deploy effettuato.

**Prossimo blocco:** ordine 05, PX-04 — ricerca: percorso ricerca → risultato nei due temi.


## 2026-10-07 — PX-04 e regressione tastiera dei blocchi 01–04

**Stato:** implementato, in review; accettazione su Safari fisico ancora aperta.

**Problema osservato:** screenshot dell'utente su iPhone 13 mini, iOS 18.7.1, Safari: con tastiera aperta titolo, sorgente, istruzioni e contatore lasciano spazio a una sola card. La geometria del contenitore era già sensibile alla visual viewport, ma la composizione conservava troppo contenuto fisso.

**Ricerca:** sorgente controllata prima del campo, SearchField comune con focus iniziale esplicito; stati iniziale/loading/empty/error, retry con risultati conservati, caricamento manuale oltre allo scroll, deduplicazione e annullamento immediato delle richieste obsolete. Invio non duplica la ricerca in debounce; chiusura annulla timer e richieste. Sotto 500 px di altezza visuale su mobile, titolo e istruzioni visive cedono spazio ai risultati mantenendo nomi e descrizioni accessibili; sorgente, campo e chiusura restano disponibili. A 375×350 misurati 204 px per i risultati.

**Regressione trasversale:** header compatto di ActionCard, footer persistente salvo altezze estreme, campo attivo mantenuto sopra il footer nello scroll effettivo. Ricerca/combobox vengono portati sotto l'header per lasciare spazio alle risposte. Ridotte le introduzioni decorative in creazione, destinazione, associazione, aggiunta e salvataggio; selezione multipla espandibile negli overlay di associazione e aggiunta. Card compatta opzionale nell'aggiunta, con default invariato per gli altri consumatori. Campi touch almeno 16 px, senza disabilitare lo zoom.

**Controlli:** 112 test mirati superati, inclusa contrazione della sola visual viewport con layout viewport invariata, focus iniziale, footer e ricerca. ESLint mirato, styling (565 file), colori semantici (23 coppie nei due temi), build produzione, bundle e confine lazy chemistry superati. Bundle iniziale 987423/1000000 byte. Avvisi build: soglia indicativa iniziale 500 kB, CSS aggiunta 5.29 kB e creazione 4.12 kB oltre la soglia indicativa 4 kB. Nessuna CI remota dichiarata.

**Browser:** Chrome Computer Use all'edge locale, runtime esistenti autorizzati. Percorso ChEMBL aspirin/CHEMBL25 verso dettaglio ASPIRINA; sorgente personale, paginazione e filtro ROSARAMICINA; Escape, riapertura con query pulita e sorgente iniziale, empty senza corrispondenze verificato dal vivo. Tema automatico e viewport originale ripristinati; sola scheda agente chiusa. Matrice ricerca: due temi e sette dimensioni ordinarie, 14 misure senza overflow orizzontale dei risultati. Dopo le rifiniture tastiera osservati separatamente creazione, destinazione, associazione, aggiunta e salvataggio a 375×350. A 375×220 note del salvataggio visibili (top 111, bottom 183) con font 16 px. Solo bozze e selezioni locali, nessuna creazione/importazione/salvataggio inviati in questo giro.

**Limiti:** viewport Chrome corta non riproduce la tastiera Safari. Errori/retry, risposta tardiva e deduplicazione coperti nei test; nessun guasto ai servizi provocato nel browser. La matrice standard precede le ultime rifiniture della composizione compatta, verificate nelle schermate corte dedicate. La segnalazione del dispositivo riapre la QA tastiera dei blocchi precedenti: seguire [KEYBOARD-QA.md](KEYBOARD-QA.md) prima dell'accettazione.

**Osservazione per PX-10:** il comando di associazione di una molecola ChEMBL non salvata non ha aperto il pannello durante la prova; verificare nel blocco dettaglio la disponibilità dell'ID locale e il feedback del comando. Nessuna causa backend attribuita o correzione fuori ambito.

**Prove:** `C:/Users/giuli/.codex/artifacts/mercurion-portfolio-ux-2026-10-07/PX-04-search/`: `responsive.json`, screenshot light/dark delle sette dimensioni, `keyboard-search-375x350.png`, `keyboard-create-375x350.png`, `keyboard-destination-375x350.png`, `keyboard-bind-375x350.png`, `keyboard-add-375x350.png`, `keyboard-save-375x350.png`, `keyboard-save-375x220.png`, `keyboard-regression-tests.log`, `lint.log`, `build.log`. Screenshot iniziale fornito dall'utente; nessun file before locale dichiarato.

**Review:** manuale ancora da eseguire. Nessun commit, merge o deploy. Prossimo blocco previsto: 06 / PX-05, dopo il riscontro sul dispositivo.

### 2026-10-07 — Seconda segnalazione Safari: footer sopra il campo nome

IMG_9685 mostra il campo nome occultato dal footer, con cursore visibile sotto le azioni. Rafforzato il test della visual viewport: il campo già attivo prima dell'apertura tastiera deve terminare almeno 3 px sopra il footer sticky, oltre a restare sotto l'header. Suite mirata ActionCard tastiera: 10 test superati sul codice corrente. Nessuna ulteriore modifica runtime applicata sulla sola base della foto: questa conserva l'introduzione rimossa nella modalità compatta corrente; l'utente ha confermato che lo screenshot precede le ultime correzioni. Non classificato come nuova regressione della patch corrente. Aggiornata [KEYBOARD-QA.md](KEYBOARD-QA.md).

Il nuovo tentativo browser di preparare una bozza duplicata non ha raggiunto un salvataggio abilitato; dopo reload l'editor non era ancora disponibile nella snapshot. Non dichiarata una nuova prova browser passata e non attribuito questo comportamento alla patch del footer. Nessun invio dati. Viewport ripristinata e sola scheda di verifica chiusa; processo runtime esterno lasciato attivo.

### 2026-10-07 — PX-10: allineamento intestazione custom

**Segnalazione e causa:** sulla molecola salvata `test_____`, gruppo nome/badge/matita e toolbar destra avevano centri verticali distanti 6.55 px. L'header usava `items-start` per entrambe le varianti, pur avendo gruppi di altezza diversa.

**Correzione:** `MoleculeHeaderComponent` centra gli elementi flex soltanto per la variante custom; ChEMBL conserva l'allineamento superiore e la seconda riga identificativa. Nessun offset manuale, modifica ai dati o redesign completo di PX-10.

**Verifiche:** Chrome a 1920×1080: nome, matita e toolbar hanno tutti centro verticale 199.16 px; anche editing e annullamento del nome conservano l'allineamento, senza salvataggio. A 375×812 toolbar su riga propria e nessun overflow orizzontale. Variante salvata ChEMBL ROSARAMICINA osservata con `flex-start` conservato. 28 test esistenti mirati superati (header, custom details e layout responsive del dettaglio), ESLint e `git diff --check` superati. Nessun nuovo build/CI completo necessario per questa sola modifica di allineamento nel template.

**Prove:** `C:/Users/giuli/.codex/artifacts/mercurion-portfolio-ux-2026-10-07/custom-header/`: `before.png`, `after-desktop.png`, `after-mobile.png`, `tests.log`. Viewport originale ripristinata e sola scheda agente chiusa. PX-10 resta da affrontare per la revisione completa; questa regressione specifica è corretta, in review.

## 2026-10-07 — PX-05, blocco 06: card, selezione e skeleton

**Stato:** implementato, in review. Liste, toolbar e paginazione complete restano nel blocco 07.

**Evidenze:** card molecolari condivise con viewer sotto il testo su mobile, azioni secondarie piccole e badge che andava a capo a distanze variabili dal sinonimo. Screenshot iPhone IMG_9688 dell'utente conferma l'asimmetria su TERT-BUTILAMMINA rispetto a VERAPAMIL. Skeleton standard e ricerca usavano strutture e altezze diverse dalle card finali.

**Card:** griglia stabile nome/badge, nome con spazio per due righe standard e una compatta, viewer a fianco anche su mobile, righe sinonimo/metadati riservate anche quando mancano valori. Badge Personal anche nelle card custom salvate; bordi, superfici e focus su token semantici. Azioni duplicate/delete/remove con bersaglio minimo 44 px e footer distinto dall'apertura del dettaglio. Data breve visibile con timestamp completo nel titolo. Fase zero conservata; valore negativo non mostrato come fase clinica. Selezione nativa e segno di spunta conservati, ring semantico; eliminata la traslazione hover della selezione. Mantiene link del dettaglio e query della collezione, output, viewer loading e classi/tempi fade-out/collapse. Nessuna eliminazione reale eseguita.

**Skeleton e shift:** stesso foglio CSS e stessa griglia delle card finali; varianti standard, compatta e con suggerimento di selezione. Skeleton personale nell'aggiunta include la colonna del checkbox. Il dettaglio collezione riserva anche la riga mobile dell'azione Rimuovi. Il suggerimento ChEMBL conserva spazio dopo la selezione. Comparatore geometrico in iframe a 360, 390, 768 e 1366 px: 12 combinazioni reali di card/skeleton standard, compatta e con azioni della collezione, scarto di altezza inferiore a 1 px e larghezza coincidente. Viewer sostituito nel solo test geometrico per misurare il layout senza caricare RDKit. Questi test non costituiscono una misura globale del CLS della pagina; loading con conteggio di risultati diverso e altri elementi della lista restano da verificare nel blocco 07.

**Scrollbar richieste:** `m-scroll-thin` ripristinata sullo scroll della ActionCard e del corpo, sul contenitore dialog e sul pannello, sulla lista di creazione, sui chip dell'aggiunta e sul nuovo ticket. Ticket e thread avevano già la classe. SelectCore conserva la propria scrollbar thin. Nel browser: computed `scrollbar-width: thin` sullo scroll della card e del corpo dell'aggiunta. Copertura condivisa per profilo e workflow sensitive-data, senza inviare modifiche all'account.

**Controlli finali:** 83 test mirati superati, inclusi metadati zero/negativi, card, skeleton, ricerca, selezione, aggiunta, dialog e ActionCard. ESLint, styling (566 file), colori semantici, build produzione, bundle e confine lazy chemistry superati. Bundle 984465/1000000 byte. Restano avvisi indicativi di 500 kB iniziali e CSS aggiunta 5.29 kB/creazione 4.12 kB oltre la soglia indicativa 4 kB. Nessuna CI remota dichiarata.

**Browser:** Chrome Computer Use all'edge locale, runtime esterni autorizzati. Due temi e sette viewport ordinarie: 14 misure, nessun overflow interno delle card e azioni 44×44 px. Controllo dedicato a 375×812: nome TERT-BUTILAMMINA e badge sulla stessa griglia, sinonimo e viewer allineati. Apertura del dettaglio dal link della card riuscita. Selezione nativa di TERT-BUTILAMMINA nell'aggiunta, contatore a uno e azione abilitata; dopo resize a 375×350 e filtro la selezione resta conservata. Nessuna aggiunta/importazione o eliminazione inviata.

**Limiti del browser:** durante il filtro personale il servizio ha restituito errore; retry eseguito senza recupero confermato. Anche ricerca ChEMBL aspirin nell'aggiunta ha mostrato errore. La causa non è stata isolata o attribuita alla patch visuale; non dichiarato il percorso live ChEMBL riuscito in questa sessione. Errori e selezione conservata osservati dal vivo; stati e comportamento delle card coperti dai test. Matrice standard precede le ultime rifiniture dello skeleton/variante collezione: loro geometria verificata nei test, screenshot mobile finale assestato. Conferma fisica Safari ancora aperta. Nella nuova scheda finale a viewport ridotta, la shell conservava la sidebar desktop aperta: chiusa temporaneamente per isolare la card (333 px disponibili, nessun overflow), poi ripristinata; comportamento del resize da rivedere in PX-01. Il confronto visivo mobile ordinario è disponibile anche in `dark-390x844.png`. Tema automatico e viewport originale ripristinati; sola scheda agente chiusa.

**Prove:** `C:/Users/giuli/.codex/artifacts/mercurion-portfolio-ux-2026-10-07/PX-05-cards/`: `before.png`, screenshot light/dark delle sette viewport, `responsive.json`, `after-iphone-width.png`, `selected-mobile.png`, `selected-compact.png` (errore del filtro con selezione conservata), `loading-compact.png`, `tests.log`, `skeleton-tests.log`, `build.log`. Materiale locale di QA.

**Review:** manuale ancora aperta. Modifiche contemporanee dell'utente in `styles.css` preservate; nessun commit, merge o deploy. Prossimo blocco previsto: **07 / PX-05 — liste**, inclusa la continuità geometrica della pagina durante caricamento e cambio query.

## 2026-10-07 — PX-05, blocco 07: liste e allineamento skeleton

**Stato:** implementato, in review. Prossimo blocco: 08 / PX-06, dettaglio collezione.

**Evidenze iniziali:** le pagine `/molecules` e `/molecules/collections` combinavano `space-y-12` e offset verticali negativi; card e skeleton erano in contenitori diversi e il collegamento alle molecole scompariva nella lista collezioni vuota. CTA piccole, conteggio assente e retry in inglese. Osservate nel runtime locale autorizzato 25 molecole iniziali e 13 collezioni.

**Liste:** flusso normale con foglio condiviso `molecule-list-page.css`; intestazione, CTA con icona, ricerca accessibile e riga contatore/collegamento coerenti. Il conteggio indica gli elementi visualizzati, senza fingere un totale del backend. Debounce di 250 ms, Invio immediato e cancellazione senza richieste duplicate. Caricamento iniziale nello stesso spazio delle card; scorrimento progressivo e root esistenti conservati, con comando esplicito Carica altre. Empty iniziale distinto da ricerca senza risultati; azione per creare/aggiungere o cancellare il filtro. Errori localizzati con Riprova e risultati precedenti conservati. I componenti paginazione condivisi e il controller non sono stati modificati. Output, route, invalidazioni realtime e animazioni di eliminazione conservati. Nessuna mutazione reale sui dati inviata.

**Skeleton:** collezioni riallineate alla griglia reale: avatar, titolo, badge e footer, senza righe inventate. Card con bordo arrotondato e azioni touch da 44 px. Risolto uno scarto mobile di 12 px: `m-skeleton` impone `display: block` al proprio host, prevalendo sulla classe `hidden`; la visibilità responsive ora appartiene a un contenitore esterno. Test geometrici in iframe a 360, 390, 768 e 1366 px, con e senza azioni: altezza/larghezza e posizione/altezza di tutte e tre le righe coincidono entro 1 px. Rieseguita anche la suite degli skeleton molecolari standard, compatti e con rimozione. Le pagine usano lo stesso gap tra placeholder e card. La verifica riguarda la geometria delle card: non è una certificazione di CLS nullo quando cinque placeholder vengono sostituiti da un numero diverso di risultati. L'utilizzo legacy dello skeleton collezioni a 45 px in Similars resta da rivedere nel blocco dettaglio PX-10.

**Controlli:** 42 test mirati liste/card/controller superati; 28 test dedicati agli skeleton superati, inclusi i confronti delle righe. ESLint, compilazione Angular, styling (567 file), colori semantici e build produzione superati. Bundle 984306/1000000 byte; confine lazy chemistry superato. Restano gli avvisi indicativi iniziali 500 kB e CSS creazione 4.12 kB/aggiunta 5.29 kB. Nessuna CI remota eseguita o dichiarata.

**Browser:** Chrome Computer Use su localhost:8888, con runtime esterni riutilizzati. Raccolte viste delle due liste nei due temi alle sette dimensioni previste. `responsive.json` conserva 18 letture: nessun overflow interno nelle letture registrate; input alto 46 px. Le prime dieci letture delle collezioni non sono conservate nel JSON dopo l'interruzione della sessione browser; sono disponibili le schermate. La matrice collezioni precede l'ultima rifinitura del pulsante principale e della visibilità dello skeleton: geometria finale coperta dai test, vista desktop finale assestata verificata. Alcune schermate subito dopo il cambio tema catturano un frame intermedio e non vanno usate come prove di contrasto; `final-collections.png` documenta il tema assestato. Il controllo statico dei token passa; acceptance fisica Safari e review visiva restano aperte.

Filtri live: Aromatici restituisce una collezione, tert due molecole. Query senza corrispondenze osservata in entrambe le liste; cancellazione ripristina i risultati. Caricamento progressivo osservato da 25 a 75 molecole. Il tentativo di cliccare Carica altre durante l'autoload non ha prodotto un click stabile perché la lista si allungava: non dichiarata una prova live del fallback manuale; il relativo comportamento è verificato nei test con observer inattivo. Navigazione molecole → collezioni riuscita. CTA Crea collezioni apre l'overlay esistente; Escape chiude e restituisce il focus alla CTA. Empty iniziale senza dati e errori di prima/pagina successiva verificati con fixture nei test, senza provocare guasti al runtime.

**Limiti della verifica:** il solo resize conserva talvolta la shell desktop nella viewport mobile; il reload alla dimensione impostata ripristina il layout corretto. Follow-up PX-01 già aperto. Due interruzioni del controllo browser hanno lasciato due schede di prova senza debugger: la chiusura tramite API è fallita; non dichiarata una cleanup completa. Le schede personali non sono state modificate. Tema automatico ripristinato e scheda finale chiusa; il reset globale della viewport è stato impedito dalle due schede scollegate. Runtime esterni lasciati attivi. La foto `empty-query-mobile.png` mostra il caso di shell desktop persistente e non rappresenta l'acceptance mobile dello stato vuoto.

**Prove:** `C:/Users/giuli/.codex/artifacts/mercurion-portfolio-ux-2026-10-07/PX-05-lists/`: `before-molecules.png`, viste collections/molecules chiaro/scuro, `responsive.json`, `empty-query-desktop.png`, `empty-collections-desktop.png`, `final-collections.png`, `tests.log`, `skeleton-tests.log`, `build.log`. Nessuna schermata before collezioni separata dichiarata.

**Review:** manuale e Safari fisico aperti; nessun commit, merge o deploy. Modifiche limitate alle due liste, presentazione della card collezione e relativo skeleton/test.

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
