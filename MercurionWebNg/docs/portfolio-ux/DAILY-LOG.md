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

## 2026-10-07 — PX-06, blocco 08: dettaglio collezione

**Stato:** implementato, in review. Prossimo blocco: 09 / PX-10, identità molecolare, viewer e azioni.

**Evidenze iniziali:** osservata la collezione Aromatici con 14 molecole nel runtime locale. Toolbar con icone piccole, editor condiviso che chiudeva prima della risposta, ricerca con reset ripetuti, skeleton spostati di -80 px e nessuna distinzione tra collezione vuota e ricerca vuota. Screenshot before separato non raccolto; `desktop.png` è una vista intermedia dopo l'intervento.

**Interventi:** pagina in flusso normale con gli stessi contenitori e gap delle liste, ricerca nativa da 46 px, debounce 250 ms e Invio immediato, reset query al cambio collezione, contatore degli elementi visualizzati e fallback Carica altre. Card e skeleton con rimozione distanziati di 12 px, senza offset negativi. Stati vuoti con azione pertinente; errori localizzati e retry. Titolo iniziale in caricamento privo di comandi attivi. ScrollContextService, observer e invalidazioni realtime conservati.

Editor del nome specifico della toolbar, con input nativo da 16 px, Salva/Annulla, Escape, focus restituito e bozza mantenuta su errore. Nome e titolo aggiornati dopo risposta positiva, errore inline e successo via toast. Il fallimento della successiva lettura della cronologia non trasforma un salvataggio riuscito in errore. Comandi leggibili: aggiunta primaria, duplicazione secondaria, eliminazione con icona; min-height 48–50 px. A 360 px duplicazione ed eliminazione stanno sulla stessa riga. Duplicazione e mutazioni impediscono invii ripetuti.

Conferme con DialogShell esistente e focus iniziale su Annulla. Eliminare la collezione elimina anche le molecole che appartengono soltanto a essa: verificato leggendo la query backend e reso esplicito nella UI. Rimuovere una molecola conserva invece la molecola e gli altri collegamenti; eliminarla la elimina dalle collezioni. Nessuna modifica backend. Errori di mutazione mantengono il dialogo per riprovare. La selezione multipla appartiene all'overlay di aggiunta: nessuna nuova funzione bulk introdotta nel dettaglio.

**Controlli:** 39 test mirati superati, inclusi errori e retry della rinomina, protezione pending, conferme/cancel, debounce e teardown, stati vuoti e fallback, nomi lunghi e controlli touch a larghezze utili di 318/348/726/1000 px; rieseguiti i test geometrici degli skeleton molecolari con rimozione. ESLint, compilazione Angular, styling (570 file), colori semantici, build produzione, bundle e confine lazy chemistry superati. Bundle iniziale 984061/1000000 byte. Restano gli avvisi indicativi preesistenti di 500 kB e CSS creazione/aggiunta. Nessuna CI remota dichiarata.

**Browser:** Chrome Computer Use su localhost:8888 con processi esterni autorizzati. Rinomina con bozza e Escape: nome originale preservato e focus su Rinomina. Conferme collezione e rimozione aperte e annullate; focus su Annulla. Ricerca senza corrispondenze osservata su mobile; HMR durante la lavorazione ha successivamente azzerato la query, perciò non dichiarata una prova live autonoma del pulsante di reset. Overlay aggiunta aperto con selezione multipla esistente, Escape e focus sulla CTA verificati. Nessuna rinomina, duplicazione, aggiunta, rimozione o eliminazione reale inviata; la navigazione aggiorna normalmente la cronologia.

**Responsive e limiti:** immagini finali chiare a 360/390/430/768/1024/1366/1920 px; scure a 360/390/430/768 px. Nelle letture DOM conservate, scrollWidth coincide con clientWidth della pagina. La larghezza documento è 10 px minore della viewport impostata per la scrollbar. Alcuni reload hanno mostrato il ripristino sessione o una pagina transitoria vuota; il reload ha recuperato la pagina. Un'interruzione del controllo browser ha arrestato il giro scuro a 1024 px e azzerato il REPL: non dichiarata una matrice completa nei due temi. `responsive.json` ricostruisce esclusivamente le misure già restituite dal tool, senza inventare righe mancanti. `confirm-collection.png` precede la correzione del focus iniziale; il focus finale su Annulla è stato verificato live. La foto dello stato senza risultati precede la sola rifinitura del comando elimina. Nessuna certificazione CLS nullo: quantità e contenuti reali possono differire dai cinque placeholder. Review visiva manuale, desktop scuro 1024/1366/1920 e Safari fisico con tastiera rimangono aperti.

**Prove:** `C:/Users/giuli/.codex/artifacts/mercurion-portfolio-ux-2026-10-07/PX-06-collection/`: viste `light-*`, `dark-*`, `mobile-light-360.png`, `empty-search-mobile.png`, `confirm-remove-mobile.png`, `add-overlay-mobile.png`, `responsive.json`, `tests.log`, `build.log`. Tema automatico e viewport ripristinati; scheda di prova chiusa. Runtime esterni lasciati attivi. Nessun commit, merge o deploy.

## 2026-10-07 — PX-10, blocco 09: identità, viewer e azioni

**Stato:** implementato, in review. Prossimo blocco: 10 / PX-10, dati, note e sezioni lunghe.

**Evidenze iniziali:** osservato il dettaglio personale `fghchgvhjv` su localhost:8888, con comandi a icona piccoli, IUPAC ND copiabile, altezze viewer da 140 a 600 px e un placeholder esterno che, senza l'evento rendered, poteva coprire l'errore e il retry del renderer. `before-custom.png` conserva lo stato iniziale. Le modifiche precedenti del blocco 08 erano presenti e sono state preservate.

**Interventi:** header con griglia comune, identità a sinistra e azioni allineate in alto su desktop, impilate prima dei dati su telefono. Aggiunta primaria, duplicazione come anchor RouterLink con gli stessi query params, elimina separato con testo e icona. Eliminazione disponibile soltanto per molecole salvate e utenti autenticati; conferma delle conseguenze su tutte le collezioni, focus su Annulla, pending protetto e errore inline per riprovare. La facade rifiuta doppi invii e id diversi dalla risorsa attuale; false e fallimenti del servizio mantengono il contesto. Nessuna mutazione reale eseguita nel browser.

Identificativi in un gruppo con stringhe intere e wrap, etichetta SMILES canonico, copia con nome accessibile specifico. IUPAC mancante indicato come Non disponibile senza copia; errore del servizio distinto, con Riprova che ripete soltanto quella richiesta. Il caricamento resta distinto. Icone copia, modifica nome e modifica struttura da 48 px nel dettaglio. I nuovi input size/actionSize nei controlli condivisi mantengono i default precedenti per gli altri consumatori; test dei controlli condivisi inclusi.

Viewer in un pannello fluido alto 240–400 px, con larghezza e altezza 100% e preserveAspectRatio meet nella variante detail. Nessuna variazione alla palette degli atomi, agli adapter o alla variante preview. Rimossa la copertura esterna della pagina: il renderer possiede loading, errore e retry, con testo di caricamento e struttura mancante esplicita. Rimossa l'aria-live sull'intero dettaglio e il banner annidato del nome; i feedback specifici mantengono i propri ruoli.

**Controlli:** 66 test superati, inclusi 18 confronti di layout per personale/importata/pubblica a 320/375/385/639 px, landscape 812×375 e colonne allineate a 640/812/1024; strutture larghe, stringhe lunghe, contenimento dei punti SVG, IUPAC mancante/errore/retry, conferme e pending, fallimenti di eliminazione, disposizioni delle sessioni renderer e retry reale dell'adapter. Suite copy-button/custom-details e regressioni realtime/associazioni incluse. Alcune fixture di dialogo emettono il warning CDK sul focus iniziale quando il pulsante è disabilitato o la fixture è spostata in iframe; il focus iniziale finale è stato verificato live su Annulla. ESLint, ngc, styling (572 file), colori semantici, build produzione, bundle e confine lazy chemistry superati. Bundle iniziale 983743/1000000 byte. Avvisi indicativi preesistenti del bundle 500 kB e CSS creazione/aggiunta conservati. Nessuna CI remota dichiarata.

**Browser:** Chrome Computer Use nel runtime esterno autorizzato. Personale, DESVENLAFAXINA importata e 7-IDROSSICLORPROMAZINA pubblica osservate. La pubblica è stata aperta tramite l'href locale di un analogo suggerito, senza navigare al sito esterno ChEMBL. Nome/IUPAC/SMILES e azioni verificati; eliminazione assente sulla pubblica. Conferma personale aperta e annullata, focus su Annulla. CTA collezioni apre BindCollectionsToMolecule; Escape chiude e restituisce focus alla CTA. Salvataggio, duplicazione, eliminazione e associazione non inviati; la navigazione aggiorna normalmente la cronologia. Errori e retry provati con fixture, senza guasti artificiali del runtime.

**Perimetro e review:** la matrice browser è mirata a mobile 375×812 e desktop 1366×768, con una vista personale iniziale alla dimensione desktop normale. Non dichiarata la matrice completa delle sette dimensioni dell'audit. Alcuni primi screenshot chiari hanno catturato il caricamento iniziale e vengono sostituiti o distinti dalle viste assestate. Le misure JSON riportano esclusivamente letture DOM realmente raccolte; righe senza nome o dimensioni pagina indicano uno stato transitorio, non un controllo superato. Tastiera fisica Safari, focus/scroll sul dispositivo e review manuale restano aperti. Note e salvataggio metadati, proprietà, collezioni e offset legacy degli analoghi restano nel blocco 10. Le soglie Tox21 con molte cifre decimali osservate restano nella rifinitura già prevista dal blocco 11; nessuna soglia scientifica modificata.

**Prove:** `C:/Users/giuli/.codex/artifacts/mercurion-portfolio-ux-2026-10-07/PX-10-identity/`: `before-custom.png`, viste personale/importata/pubblica nei due temi, `delete-confirmation.png`, `responsive.json`, `tests.log`, `build.log`. Le viste mobili chiare personale/pubblica sono state ricatturate dopo il caricamento e controllate; gli screenshot iniziali transitori sono stati sostituiti. Tema automatico e viewport ripristinati, scheda di prova chiusa. Nessun commit, merge o deploy. Processi esterni lasciati attivi.

## 2026-10-07 — PX-10 — Dati, note e sezioni lunghe (blocco 10)

**Stato:** Implementato, in review; accettazione manuale e Safari fisico aperti.

**Evidenze iniziali:** dettaglio DESVENLAFAXINA importato osservato all'edge locale. Proprietà in righe dense senza unità; note/metadati senza superficie stabile di modifica. Le collezioni vuote passavano per un timer di due secondi e null lasciava le associazioni precedenti; doppio bordo e lista da 224 px. Analoghi con offset positivi/negativi e skeleton di collezioni forzati a 45 px, incompatibili con le card molecolari compatte. Il salvataggio chiudeva l'editor prima dell'esito; un fallimento della successiva cronologia poteva essere presentato come errore di salvataggio del nome. Modifiche precedenti e manuali preservate.

**Interventi:** elenco semantico dl/dt/dd delle sei proprietà, una/due/tre colonne a 640/1024 px, token esistenti, valori integrali senza arrotondamenti e numeri tabulari. Massa molare in g/mol e superficie polare in Å²; logP e conteggi senza unità aggiunte. Non disponibile per null/undefined/stringa vuota, senza convertire zero o valori negativi in dati mancanti. Mantenute le chiavi effettive mwFreebase/alogp/hbd/hba/psa/rtb dell'adapter RDKit e del contratto GraphQL; nessun alias scientifico dedotto dai vecchi esempi delle fixture. Significato dei campi verificato anche nelle [FAQ ufficiali ChEMBL](https://chembl.gitbook.io/chembl-interface-documentation/frequently-asked-questions/drug-and-compound-questions).

Etichetta/note con padding, righe responsive, multilinea e target da 48 px. Empty esplicito e nomi accessibili distinti. Nome/metadati attendono un Observable di conferma della mutazione: pending protegge campo e pulsanti, risposta null/fallimento mantiene l'editor e la bozza con errore inline, retry possibile. Nome vuoto rifiutato; un aggiornamento remoto non sovrascrive una bozza aperta. Cambio itemId cancella la richiesta precedente e ripristina la vista della nuova molecola; una risposta tardiva non sostituisce il nuovo dato. Escape annulla e restituisce focus al comando modifica; Ctrl/Cmd+Invio salva. La sincronizzazione secondaria della cronologia non determina l'esito della mutazione riuscita. I consumatori del componente condiviso sono stati inventariati: header e metadati del dettaglio; comportamento legacy senza callback conservato.

Collezioni: null significa loading, [] empty immediato, niente timer o dati precedenti. Skeleton readonly, gap di 12 px, contatore, lista semantica; su telefono scorrimento della pagina, da 640 px area massima 384 px con m-scroll-thin sul proprietario dello scroll. Analoghi: titolo/filtro/lista in normale flusso, skeleton molecolari compatti con lo stesso CSS delle card, gap regolare, cap 320/420 px e scrollbar thin. Empty del filtro distinto dall'assenza generale; errore di richiesta con Riprova che ricarica solo gli analoghi. Vie/sinonimi senza offset o ingrandimenti decorativi, chip semantici con wrap per stringhe lunghe.

**Controlli:** suite mirata di 78 test superata (dettaglio, facade, header, metadati, proprietà, associazioni, analoghi, sinonimi e vie). Verifica finale di 39 test sui file ritoccati e sulle geometrie skeleton in final-tests.log: include focus con Escape e cancellazione durante cambio risorsa. Build produzione, ESLint mirato, controllo styling (574 file), colori semantici (23 coppie in due temi), bundle e confine lazy chemistry superati. Bundle finale 982337/1000000 byte, confermato dal controllo sul risultato della build. Restano gli avvisi indicativi preesistenti del bundle 500 kB e CSS creazione/aggiunta 4.12/5.29 kB. Nessuna CI remota dichiarata.

**Browser:** Chrome Computer Use, processi esterni autorizzati, localhost:8888. DESVENLAFAXINA importata con quattro collezioni, personal fghchgvhjv con tredici e pubblica 7-IDROSSICLORPROMAZINA. Raccolte 14 letture DOM sulle sette dimensioni nei due temi (360×800, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1920×1080), più controlli a 375×812 della pubblica e personal. Nessun overflow orizzontale nei componenti misurati. Modifica nome/etichetta/note da 48 px; il badge Personal rimane un controllo informativo da 30 px, non un'azione di modifica. Valori personal 0/0/0 visibili; lista di 13 collezioni alta 2016 px su mobile, senza scroll interno. Bozze multilinea compilate e annullate su mobile nei due temi e su desktop; nome personal modificato soltanto in bozza e annullato. Inclusione dei lead verificata con Space, ritorno ai soli noti tramite etichetta; navigazione verso un analogo pubblico riuscita. Nessun salvataggio, eliminazione o associazione inviato; la navigazione aggiorna normalmente la cronologia.

**Limiti e follow-up:** errori, pending, successo, cancellazione richieste e cambi risorsa verificati con fixture; nessun guasto artificiale o mutazione sui dati esistenti. Durante una ripresa l'edge ha mostrato 504; pagina recuperata con reload, causa non isolata e non attribuita alla patch. Un reload ha aperto la variante pubblica prima della navigazione interna alla salvata: registrato follow-up PX-01/PX-23. Alcune immagini della matrice immediatamente dopo resize includono geometrie transitorie della shell o una diversa porzione di scroll; non sono prove di assestamento del gutter. Le immagini *-final.png, con desktop ricaricato e scorrimento controllato, sono le evidenze visive finali: nessuna sovrapposizione del contenuto alla sidebar. Il comportamento del cambio breakpoint resta nel blocco shell. Tastiera virtuale Safari, zoom e scroll/focus sul dispositivo fisico restano da verificare secondo KEYBOARD-QA.md; non dichiarata equivalenza tra emulazione Chrome e Safari iOS.

**Prove:** C:/Users/giuli/.codex/artifacts/mercurion-portfolio-ux-2026-10-07/PX-10-data/: before-imported.png, responsive.json, tests.log, final-tests.log, build.log; notes-draft-desktop-final.png, custom-notes-mobile-light.png, custom-notes-mobile-dark-final.png, properties-collections-desktop-{light,dark}-final.png, analogues-synonyms-desktop-{light,dark}-final.png, imported-mobile-dark-final.png e public-mobile-{light,dark}-final.png. before-imported.png inquadra la parte iniziale della scheda; i difetti delle sezioni inferiori sono stati osservati nel DOM e confermati nei sorgenti, senza un confronto pixel per pixel prima/dopo di quelle sezioni. Schermate locali di QA, non materiale pubblico del portfolio. Tema automatico e viewport ripristinati; unica scheda agente chiusa, processi esterni lasciati attivi. Nessun commit, merge o deploy.

**Prossimo blocco:** 11 — PX-11, Tox21: probabilità, soglie, legenda e stati, senza cambiare i valori scientifici del modello.

### 2026-10-07 — PX-11 — Predizione Tox21

**Stato:** Implementato, in review; accettazione manuale aperta.

**Evidenze iniziali:** nella personal fghchgvhjv, la card presentava una legenda Tossico/NON Tossico e soglie grezze come 0.5500000000000002. Durante richieste fallite il blocco spariva: la facade assorbiva l’errore senza distinguerlo dal dettaglio ordinario. Letti il contratto Tox21Prediction/Tox21Inference e api/inference.py nel backend Tox21, senza modificare il repository sibling: quattro endpoint, probabilità sigmoid, soglia per endpoint e classificazione probability > threshold.

**Interventi:** card con quattro righe in ordine stabile, identità e codice del modello, esito testuale, probabilità e soglia in percentuale con due decimali. Esiti del backend preservati anche vicino alla soglia: nessun ricalcolo dai valori visualizzati. Zero valido, dati incompleti/non finiti/fuori intervallo non mostrati come Negativo; nessun risultato obsoleto quando manca l’input. Spiegazione endpoint e limiti integrati nella scheda. Skeleton con stessa geometria delle righe finali, stato accessibile, risultati parziali e retry. Facade con loading/error dedicati e retry della sola inferenza; cancellazione immediata quando cambia la route, senza ricaricare analoghi o associazioni. Note e proprietà preservate. File: t1-prediction-card TS/CSS/spec, facade TS/spec e collegamento nella pagina dettaglio.

**Controlli:** 45 test mirati su card, facade, pagina, analoghi e aggiornamento collezioni; ulteriori 27 test sulle geometrie mobile del dettaglio, tutti superati. Inclusi confronto skeleton/risultati a 320/375/640/1024 px, classificazione vicino alla soglia, dati assenti/malformati, retry, doppia richiesta e cancellazione. ngc, ESLint mirato, build produzione, styling (575 file), colori semantici (23 coppie in due temi), bundle e confine lazy chemistry superati. Bundle iniziale 980128/1000000 byte. Restano gli avvisi indicativi preesistenti del bundle 500 kB e CSS creazione/aggiunta collezioni. Nessuna CI remota dichiarata.

**Browser:** Chrome Computer Use a localhost:8888, runtime esterni autorizzati riutilizzati. Personal con quattro esiti negativi e DESVENLAFAXINA importata con SR-p53 positivo (38.03%, soglia 35.00%). Osservato un errore reale di inferenza e recupero tramite Riprova predizione, senza ricaricare il dettaglio; causa del guasto non isolata. Raccolte 14 letture DOM nelle sette dimensioni e due temi, nessun overflow nei nodi della card dopo reload all’ingresso nel gruppo mobile/tablet. Ulteriori schermate a 375×812: righe e spiegazione leggibili con scroll normale. Aperta e annullata la sola modifica note per verificare focus e raggiungere il blocco: nessun salvataggio o altra mutazione inviata, salvo la normale cronologia di navigazione.

**Limiti:** alcune misure durante resize includono transizioni della shell; non certificano il gutter nel cambio breakpoint. Le prime letture con gutter desktop rimasto su mobile hanno rilevato overflow e sono state escluse dalla matrice finale dopo reload; il problema resta nel follow-up PX-01 già registrato. Le immagini desktop *-final sono le prove assestate. Risultati parziali/malformati e cancellazione verificati con fixture, senza guasti artificiali nel runtime. Safari/iPhone fisico, tastiera virtuale e verifica finale del percorso restano aperti. before.png inquadra soltanto la parte inferiore della vecchia card: difetti iniziali confermati nel DOM e nei sorgenti, nessun confronto pixel completo. Una navigazione di prova ha aperto FANS durante lo scroll da tastiera; ripreso il dettaglio con Indietro, causa non isolata, nessuna azione sui dati.

**Prove:** C:/Users/giuli/.codex/artifacts/mercurion-portfolio-ux-2026-10-07/PX-11-tox21/: before.png, responsive.json, tests.log, mobile-tests.log, build.log, desktop-light-final.png, desktop-dark-final.png, mobile-light-results.png e mobile-dark-results.png. Altre immagini sono osservazioni intermedie, non prove finali. Tema automatico/viewport ripristinati e scheda agente chiusa; runtime esterni lasciati attivi. Nessun commit, merge o deploy.

**Prossimo blocco:** 12 — PX-08, editor: layout e modalità.

### 2026-10-07 — PX-08 — Editor: layout e modalità (blocco 12)

**Stato:** Implementato, in review; accettazione manuale aperta.

**Evidenze iniziali:** titolo generico, selettore che mescolava Crea/Modifica/Duplica con Analisi live; card nome/SMILES alte e separate dal canvas. Ketcher aveva padding laterale desktop diverso dalle card, altezze differenti per errore e contenuto; azioni con margini ripetuti e offset relativo, etichetta Salva uguale per modifica e creazione.

**Interventi:** titolo H1 e descrizione persistenti per le tre modalità, viste Disegno/Analisi live indipendenti dal contesto operativo. Identità in dl compatto sopra il canvas, nome/badge a capo e SMILES lunghi contenuti con copia contestuale. Workspace e analisi live allineati; due colonne soltanto quando il contenitore dispone di almeno 58rem, stack sotto tale soglia. Canvas clamp(360px,55svh,560px), stessa area per loading/errore/contenuto, nessun padding compensativo desktop. Azioni di almeno 48 px, Salva modifiche/Salva nuova molecola e Ripristina struttura/Svuota disegno; UI disabilitata durante azioni e cambio vista pendenti. Nessuna modifica alle API, alla deduplicazione, alla cronologia draft o alla logica di salvataggio. File: pagina editor TS/CSS, Ketcher frame TS/CSS e nuova suite layout.

**Correzione richiesta dall’utente durante il blocco:** ripristinata la sfocatura del backdrop della ricerca molecolare. Il DOM confermava oscuramento nero al 70% ma backdrop-filter none; la variante search della DialogShell ora applica blur(4px), anche in vista compatta, senza cambiare overlay o dismissal. Aggiunto controllo di regressione sullo stile effettivo; varianti action/default preservate.

**Controlli:** 37 test mirati superati: editor, validazione dopo cambio vista/reset, analisi live, Ketcher e DialogShell. Geometrie reali in iframe a 320/375/768/1024/1366 px con identificativi lunghi, azioni >=48 px e colonne/stack verificati. ngc, ESLint mirato, styling (578 file), colori semantici (23 coppie nei due temi), build produzione, bundle e confine lazy chemistry superati. Bundle 978968/1000000 byte; chunk editor selezionato 58735 byte. Restano i warning indicativi preesistenti bundle 500 kB e CSS creazione/aggiunta collezioni. Nessuna CI remota dichiarata.

**Browser:** Chrome Computer Use a localhost:8888, runtime esterni autorizzati riutilizzati. Creazione vuota in Disegno/Analisi live, modifica della personal fghchgvhjv e duplicazione dalla stessa scheda, senza disegnare modifiche o inviare salvataggi. Cambio vista tramite Space, SMILES CCCCC(C)(CC)CC1C=CC=C1 confrontati prima/dopo senza variazioni (valore esatto nelle schermate). Contesto edit e azione Salva modifiche persistenti; duplicazione con Salva nuova molecola disabilitata sulla struttura esistente, comportamento di deduplicazione preservato. Quattordici misure DOM nelle sette dimensioni e due temi, nessun overflow dei nodi misurati e azioni >=48 px. Prove aggiuntive a 375×812. Backdrop della ricerca verificato blur(4px) e oscuramento 70%; apertura dal menu mobile e chiusura con Escape. La navigazione aggiorna normalmente la cronologia, nessuna mutazione sulle molecole salvate.

**Limiti:** misure durante resize includono transizioni del gutter già registrate in PX-01; screenshot desktop finali dopo reload, sidebar e contenuti separati. Le catture senza regione esplicita risultavano scalate e includevano spazio inutilizzato: escluse dalle prove finali. Risolto usando screenshot con clip delle coordinate del viewport corrente; nessuna modifica del prodotto per compensare la cattura. Un reload mobile rimasto vuoto è stato recuperato con un ulteriore reload; causa non isolata. Tastiera fisica Safari, pannelli Ketcher su touch e verifica completa salvataggio/draft restano aperti. Nessuna prova di salvataggio reale in questo blocco. I widget live mantengono layout/copy preesistenti: soglie nel tooltip e testo piccolo da rivedere nel blocco 13.

**Prove:** C:/Users/giuli/.codex/artifacts/mercurion-portfolio-ux-2026-10-07/PX-12-editor-layout/: before-desktop.png, before-mobile.png, responsive.json, tests.log, build.log; desktop-live-dark-final.png, desktop-edit-live-dark-final.png, desktop-duplicate-light-final.png, mobile-live-header-{light,dark}-final.png, mobile-live-dark-final.png, mobile-duplicate-light-final.png, search-backdrop-mobile-final.png. Le immagini intermedie prive di suffisso final non certificano la geometria. Tema automatico/viewport ripristinati, scheda agente chiusa e processi esterni lasciati attivi. Nessun commit, merge o deploy.

**Prossimo blocco:** 13 — PX-08, editor: stati e percorso finale.

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
