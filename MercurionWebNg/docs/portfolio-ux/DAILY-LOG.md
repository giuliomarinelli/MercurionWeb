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

### 2026-10-21 — Revisione del metodo e delle prossime priorità

**Stato:** pianificazione aggiornata su istruzione dell’utente; nessuna implementazione o operazione Git eseguita in questa revisione.

**Decisione:** Notebook e Synthesis anticipati prima del merge finale. L’utente sviluppa le due feature su branch `feature/**` creati dal branch corrente e le reintegra su questo stesso branch. Il precedente vincolo di attendere il merge della sola fase UX è superato.

**Nuovo ordine:** N1 Notebook e Synthesis; N2 refactor backend dell’object store e porting Dropbox → Cloudflare R2; N3 refactor navigazione/offcanvas/sidebar. Segue la ripresa dei blocchi UX residui dal 13, con regressione della shell al blocco 14 dopo il refactor anticipato, senza duplicarlo.

**Navigazione richiesta:** area scrollabile dall’inizio dell’elenco, comprendente la cronologia; navigazione sticky con eventuali uno/due elementi fissi e densità da valutare. Offcanvas mobile senza dropdown Funzionalità. Sidebar desktop collassata come colonna di icone con tooltip/title, comandi di espansione e collasso in flusso invece del toggle absolute. Stile e colori allineati al frontend rifinito. Conservati i follow-up su gutter, cambi breakpoint e ripristino sessione.

**Documenti aggiornati:** ROADMAP.md (metodo, fasi, priorità, MF-01/MF-02, nuova INF-01, perimetro PX-01 e sequenza residua) e richiamo corrente in KEYBOARD-QA.md. I blocchi 01–12 restano implementati, in review. QA fisica Safari, review manuale e regressione finale restano aperte e copriranno anche feature e refactor aggiunti. Angular 22 rimane successivo alle macro-feature. Le voci del 7 ottobre conservano il prossimo blocco previsto a quella data come registro storico.

**Verifica:** coerenza dei riferimenti e diff documentale; nessun test applicativo necessario per questo aggiornamento. Nessun branch creato, commit, merge, deploy o migrazione dati.

### 2026-10-23 — Priorità navigazione e rinvio condiviso di feature/storage

**Stato:** decisione di pianificazione registrata su istruzione dell’utente; refactor della navigazione ancora da eseguire.

**Aggiornamento:** anche il refactor dell’object store e il porting Dropbox → Cloudflare R2 (INF-01 / N2) sono rinviati, alla pari di Notebook e Synthesis (MF-01/MF-02 / N1). Il codice scientifico è stato reintegrato il 22 ottobre (`c8dc4f3f1`), ma completamento end-to-end e abilitazione restano rinviati. Il completamento di queste attività non è un prerequisito per il merge della beta corrente.

**Motivazione verificata nei sorgenti:** `DocumentController` ha `@RequiresFeatures('documents')` a livello di classe; il guard globale rifiuta le richieste quando la feature è disabilitata e le mappe attuali mantengono Documents, Notebook e Synthesis false nei quattro ambienti. R2 è rinviato come attività di roadmap, non tramite un nuovo flag.

**Nuovo ordine attivo:** N3 / PX-01, refactor sidebar/navigazione/offcanvas; quindi ripresa UX dal blocco 13 / PX-08 e successivi. Il blocco 14 resta la regressione della shell dopo N3, senza duplicarne il refactor. Restano i requisiti concordati su scroll dell’intera navigazione, sticky, eventuali pochi elementi fissi, icone nella sidebar collassata, tooltip/title, toggle in flusso, rimozione dropdown mobile e stile coerente.

**Continuità:** blocchi 01–12 ancora implementati/in review; QA Safari fisica, regressione dei percorsi attivi e review manuale ancora aperte. Verificare che le feature rinviate restino inaccessibili. Pianificazione Angular/Node del 22 ottobre preservata; nessuna data fissata per la ripresa delle attività rinviate.

**Verifica e perimetro:** ROADMAP.md, DAILY-LOG.md e KEYBOARD-QA.md allineati; lettura statica di controller, guard e mappe, senza una nuova prova HTTP/runtime. Aggiornamento solo documentale: nessuna modifica a flag, codice applicativo o infrastruttura, nessuna operazione Git. Le voci precedenti conservano il piano valido alla rispettiva data.

**Prossimo intervento:** N3 / PX-01 — sidebar, navigazione e offcanvas.

### 2026-10-23 — Porting SMS Twilio → SMS Hosting (INF-02)

**Stato:** pianificato, implementazione non avviata. L’utente segnala di avere chiuso l’account Twilio e di utilizzare SMS Hosting; l’invio attuale va quindi adeguato.

**Riscontro statico:** `notification/services/sms-sender/sms-sender.service.ts` contiene `SmsSenderService.sendSms(to, body)`, client Twilio, `messages.create` e tipo restituito `MessageInstance`. Mapping `Sms` e schema env usano ancora `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_NUMBER`, `TWILIO_FROM`. Individuati chiamanti in `MfaService` e `account-flow-kernel`; inclusa regressione dei flussi account/OTP/MFA interessati.

**Pianificazione:** nuova voce INF-02 con verifica preventiva della documentazione ufficiale SMS Hosting, scelta del trasporto soltanto dopo tale verifica, revisione tipi/configurazione/env e dipendenza Twilio, test positivi/negativi e prova reale solo nel perimetro concordato. Nessuna disponibilità SDK o REST API assunta come confermata. Riferimenti aggiunti a PX-03/PX-13/PX-14/PX-15.

**Ordine:** N3 / navigazione resta il prossimo intervento, poi ripresa UX dal blocco 13. INF-02 è nel perimetro attivo e va pianificato prima dell’accettazione dei flussi SMS; non è rinviato con Notebook, Synthesis e R2.

**Verifica:** lettura del codice e coerenza del diff documentale; nessuna prova runtime, invio SMS, lettura di segreti, modifica a servizio/env/dipendenze o operazione Git. ROADMAP.md e diario aggiornati.

### 2026-10-23 — N3 / PX-01 — Navigazione responsive

**Stato:** implementato, in review; QA fisica Safari e zoom browser reale 200%/400% ancora aperti. Report: [NAVIGATION-QA.md](NAVIGATION-QA.md).

**Interventi:** sidebar permanente 256/64 px, quattro funzioni nella rail con tooltip PrimeNG al focus/hover, toggle sticky integrato, unico scroll per funzioni e cronologia. Drawer con header e account fuori dallo scroll, contenitore stabile anche durante il caricamento, trap del focus, chiusura con Escape e ritorno al trigger. Superfici e stati coerenti nei due temi. Riutilizzati DesignService, ShellLayoutService e DialogScrollLockService; allineato il throttle di DesignService all’invalidazione della cache CDK per evitare breakpoint fermi sulla misura precedente; scroll globale del documento preservato.

**Caricamento:** navigazione differita immediatamente su desktop; drawer attivato all’apertura con prefetch idle. Il contenitore riserva lo spazio prima del caricamento. Questa separazione mantiene i tooltip richiesti e il bundle iniziale sotto il gate esistente di 1 MB, senza modificare soglie o dipendenze.

**Verifiche:** typecheck/template Angular, ESLint mirato, build production, gate bundle/lazy, styling/colori/semantica interattiva e 52 test mirati. Chrome tramite controllo browser di Computer Use su localhost:8888: 12 larghezze per tema, resize continuo, rail, tooltip, tastiera, account, ricerca, apertura selettore ChEMBL e cronologia 25→50. Selezione storica inizializzata dalla route anche dopo la ricreazione uscendo dalla rail. Viewport 375×320: nav scrollabile e account separato. Nessuna certificazione CI remota o accettazione finale dichiarata.

**Correzioni dalla review:** selezionando una voce storica si attende il riordino/rendering e si esegue smooth-to-top del solo pannello; prova sidebar 679→0 px e drawer 625→0, documento fermo. Aggiornamenti in background senza scroll automatico. Eliminata la fessura sopra la zona sticky, incluso il mezzo pixel dovuto all'altezza arrotondata dell'header; bordo e superficie allineati a 54,5 px nei due temi. Eliminato il gap doppio generato dal badge realtime vuoto e rimossi i margini compensativi dell'header: 16 misure ai breakpoint nei due temi con distanze uniformi. Transizione del margine limitata al desktop, senza offset residuo quando subentra il drawer. Prove aggiuntive in `queued-fixes.json`; tema automatico e viewport originale ripristinati.

**Perimetro:** codice Angular della navigazione e relativi test; nessuna modifica a backend, route, flag o dipendenze. Nessun commit, merge, push o arresto dei runtime riutilizzati.

**Rimane:** review manuale del codice/icone, Safari fisico con safe-area/tastiera e zoom reale 200%/400%; conservati gli altri punti PX-01/PX-23 già aperti. Nessun logout o cancellazione dei dati eseguito nella verifica live. Il blocco 14 rimane la regressione trasversale della shell.

**Prossimo blocco:** 13 / PX-08 — editor: stati e percorso finale. Notebook, Synthesis e R2 restano rinviati; INF-02 / SMS Hosting resta attivo da pianificare.

### 2026-10-23 — PX-02 — Home, benvenuto e aggiornamento welcome

**Stato:** pianificato; nessuna modifica al codice applicativo in questo aggiornamento.

**Richiesta:** migliorare presentabilità della home, sfondo e animazione di benvenuto al primo ingresso, conservando la persistenza localStorage che evita replay; rivedere `/welcome`, i cui screenshot mostrano componenti precedenti ai refactor.

**Riscontro statico:** ingresso a lettere con intervalli di 750 ms e CTA con delay di 8.250 ms più 650 ms di animazione. Sfondo uniforme slate. Il flag locale attuale viene scritto navigando a welcome/login/register, quindi va verificato anche il reload della home prima di queste route. Welcome usa coppie light/dark di immagini ricerca e predizione. Nessuna nuova verifica browser svolta per questa voce; le osservazioni distinguono codice esistente e segnalazione visiva dell'utente.

**Roadmap:** ampliato PX-02 e suddiviso il blocco 15 in 15A (home, composizione, gradiente da valutare, benvenuto coordinato e breve, reduced motion e persistenza) e 15B (welcome, aggiornamento immagini reali, perimetro beta, responsive e stabilità del caricamento). Sequenza attiva invariata: ripresa UX dal blocco 13. Nessun redesign delle pagine interne, modifica ai flag o operazione Git autorizzati da questa pianificazione.

### 2026-10-25 — AUTH-01 — Proposta accesso con passkey

**Stato:** proposta opzionale, da dimensionare; nessuna implementazione o modifica ai metodi di accesso.

**Richiesta:** aggiungere alla roadmap la possibilità di accedere con passkey, sia con MFA attiva sia disattiva, se l'impegno è sostenibile.

**Riscontro e pianificazione:** nessuna integrazione WebAuthn/passkey rilevata nei sorgenti Angular/Nest o nei relativi manifest. L'autenticazione corrente separa credenziali, challenge MFA e completamento della sessione. Aggiunta AUTH-01, impegno preliminare medio da stimare dopo analisi; collocazione opzionale 16P, con enrollment/gestione in settings e login esplicito. Prima dell'implementazione vanno definiti policy MFA, account ammessi e RP ID/origin/HTTPS. MVP limitato agli account esistenti, con più credenziali, revoca e metodi precedenti conservati; registrazione interamente passwordless e migrazioni forzate escluse.

**Verifica:** consultati FIDO Alliance e W3C WebAuthn; controllati riferimenti e diff della documentazione. Nessun test applicativo o browser eseguito per questo aggiornamento documentale. La proposta non modifica il prossimo blocco UX e non aggiunge automaticamente un requisito al merge corrente.

### 2026-10-25 — AUTH-02 — Rotazione e revoca chiavi JWT

**Stato:** pianificato; nessuna modifica applicativa, rotazione reale o operazione Git.

**Richiesta:** gestire più chiavi e revoca anche manuale, mantenendo RS256 per access token HTTP/WS e HS512 per gli altri token, con `kid` nell'header JWT.

**Riscontro statico:** Nest usa due coppie RSA e configurazioni HS512 per tipo; provider e servizio JWT caricano una sola versione e contengono già il TODO sulla rotazione. Tox21, letto senza modifiche, verifica con una singola chiave pubblica al bootstrap. Non letti PEM, env o altri segreti. Il controllo minimo attuale HS512 va rivalutato sul materiale decodificato secondo RFC 7518; non dedotta la qualità dei segreti realmente configurati.

**Pianificazione:** aggiunti AUTH-02 e blocco 16K, con [piano architetturale](JWT-KEY-ROTATION.md): registro versionato, chiave di emissione attiva, precedenti in sola verifica, revoca manuale con audit, algoritmo/scopo vincolati, transizione per token senza `kid`, propagazione fra consumer e trattamento dei socket già autenticati. Distinte rotazione, revoca chiave e revoca JTI/sessione. Fasi: analisi/stima, Nest/operazioni, integrazione/QA. Gestione dei segreti, fonte autorevole del registro e modalità di reload restano decisioni esplicite prima del codice.

**Verifica:** fonti RFC 7515, 8725 e 7518; controlli documentali e diff. Nessun test applicativo o browser eseguito per questa pianificazione. Prossimo blocco UX invariato; adeguamento Tox21 da coordinare con un intervento separato nel relativo repository.

### 2026-10-25 — PX-08 / Blocco 13 — Stati editor e cache identità

**Stato:** implementato, in review. Report: [EDITOR-STATES-QA.md](EDITOR-STATES-QA.md).

**Interventi:** nome e canonical SMILES conservati nel draft in sessionStorage, su richiesta dell'utente, evitando nuove risoluzioni al cambio vista. Riusati BrowserStorageRegistry e descrittori esistenti; invalidazione legata alla struttura e al contesto. Controllo duplicati sempre aggiornato e canonicalizzazione remota delle nuove strutture. Stati di salvataggio/cambio vista più espliciti e collegati al pulsante; baseline invariata non descritta come duplicato. Widget Tox21 con soglie visibili, percentuali leggibili e quattro righe stabili negli stati asincroni.

**Verifica:** 84 test mirati, typecheck/template, ESLint, build production, gate bundle/lazy e controlli statici superati. Nel browser, dopo il caricamento iniziale, due cambi vista hanno generato zero nuove richieste nome/canonicalizzazione e due controlli duplicati. Apertura/annullamento dell'overlay conserva il draft. Controllati entrambi i temi e ingombri mobile/tablet/desktop; limiti della matrice nel report.

**Rimane:** QA fisica Safari, zoom, review e salvataggio reale su fixture. Riprodotto il gutter desktop conservato dopo resize mobile, recuperato con reload: seguito nel blocco 14. Un timeout Ketcher e un 504 main.js sono stati recuperati senza modifiche all'infrastruttura. Nessuna CI remota dichiarata.

**Prove:** `C:/Users/giuli/.codex/artifacts/mercurion-editor-block13-2026-10-25/`. Tema automatico/viewport ripristinati, scheda agente chiusa, runtime esistenti preservati. Nessun commit, merge, push o deploy.

**Prossimo blocco:** 14 / PX-01 — regressione shell dopo N3, partendo da resize e gutter.

### 2026-10-25 — Review PX-08 — Scroll editor

**Stato:** regressione segnalata dall'utente riprodotta e corretta; blocco 14 sospeso durante questa correzione.

**Causa e intervento:** il focus della textarea nascosta Ketcher poteva spostare il documento al fondo dopo la navigazione. Focus desktop conservato con preventScroll per il solo controllo cliparea. All'avvio della sessione, scroll del workspace sotto l'header con 16 px di spazio, tramite i servizi esistenti; nessun calcolo basato sul fondo della pagina.

**Verifica:** prima 341/341 px e workspace fuori schermo; dopo 192 px e bordo workspace 70,4 px rispetto all'header 54,5 px, in creazione, passaggio live e duplicazione. 96 test Angular e 10 test bridge superati; typecheck, lint, build e gate bundle/lazy superati. Nessuna scrittura di molecole. QA fisica Safari e modalità modifica con fixture restano da completare. Dettagli in [EDITOR-STATES-QA.md](EDITOR-STATES-QA.md).

**Prossimo intervento:** riprendere il blocco 14, gutter e resize; nessun commit o merge eseguito.

### 2026-10-25 — Seconda review PX-08 — Identità tra viste

**Stato:** corretti reset visivo dell'identità e cache miss sulle serializzazioni SMILES riordinate da Ketcher. La prima verifica con ALCOOL non copriva il caso aromatico VENLAFAXINA segnalato durante la review.

**Intervento e prove:** identità preservata durante export/cambio route/primo polling; separati ripristino e modifiche interattive. Abbinamento in sessionStorage della serializzazione esportata al termine di un ripristino confermato e senza modifiche intervenute, senza euristiche chimiche. Risposte nome legate alla revisione corrente. Nel percorso VENLAFAXINA Disegno → live → Disegno: nessuno spinner di identità, zero nuove richieste nome/canonicalizzazione, due controlli duplicati. 104 test Angular, typecheck, lint, build e gate locali superati. Dettagli in [EDITOR-STATES-QA.md](EDITOR-STATES-QA.md).

**Continuità:** nessuna scrittura di molecole, operazione Git o modifica ai runtime dell'utente. QA Safari e blocco 14 restano aperti.

### 2026-10-25 — Review PX-08 — Colonna analisi live

**Intervento:** Tox21 e analoghi compattati per restare entrambi visibili accanto al canvas desktop. Esiti e probabilità nel pannello; soglie e avvertenze nel tooltip PrimeNG dell'icona info fornita dall'utente, con hover/focus/click ed Escape. Spaziature ridotte senza rimpicciolire i valori; metadati analoghi riallineati a 12 px e spazio stabile per gli stati asincroni.

**Verifica:** colonna di circa 582 px a 1366×768 e 1600×775, entro il workspace; entrambi i temi, tre analoghi reali e stato senza analoghi verificati. Telefono 375×812 senza overflow e tooltip dentro il viewport. 106 test, typecheck, lint, build e gate locali superati. [Report e limiti](EDITOR-STATES-QA.md), incluse prove locali e QA fisica Safari ancora aperta. Nessun commit/merge; blocco 14 ancora da riprendere.

### 2026-10-25 — PX-01 / Blocco 14 — Regressione shell

**Stato:** implementato, in review. [Prove e limiti](SHELL-QA.md).

**Difetto:** durante il resize con drawer aperto, il viewport live misurava 1366 px ma DesignService/CDK restavano a 375; drawer e lock rimanevano attivi, gutter errato. DesignService ora deriva i breakpoint da ViewportRuntimeService, conservando le soglie e rimuovendo cache/listener duplicati.

**Verifica:** 22 misure nei due temi senza reload, incluse soglie 640/768/1280; sidebar 256/64 px e gutter coerenti, niente overflow. Drawer → desktop chiude/rilascia il lock; tastiera/Escape, backdrop ricerca, cronologia 25→50 e ritorno in cima dopo selezione verificati. Account/menu contenuti anche a 375×320. 63 test, typecheck, lint, build e gate locali superati.

**Rimane:** review manuale, Safari fisico e zoom reale; il precedente redirect UUID durante il ripristino della sessione resta nel seguito PX-23, senza modifiche all'autenticazione. Nessuna CI remota, operazione Git o modifica dei processi dell'utente. Prove in `C:/Users/giuli/.codex/artifacts/mercurion-shell-block14-2026-10-25/`.

**Prossimo blocco:** 15A / PX-02 — Home e benvenuto; chiarire il messaggio prima di riscrivere il copy.

### 2026-10-25 — INF-03 — Pianificazione verifica log Meilisearch

**Stato:** pianificato, non implementato/testato. Aggiunta alla roadmap la separazione degli indici log per ambiente e la prova logger → outbox → indicizzazione → frontend Docker tramite forwarding SSH.

**Evidenza statica:** indice `logs` fisso nel payload di MeiliLoggerService; configurazione con host/chiave e test esistenti insufficienti a dimostrare isolamento o consegna reale. Registrati gestione dei task asincroni, retry, eventi pendenti, redazione e prove con log sintetici. Le immagini individuate dall’utente e i dettagli di connessione vanno confermati prima dell’esecuzione.

**Verifica:** controllo documentale e lettura dei sorgenti; nessun runtime, container o accesso remoto avviato. La prossima attività UX rimane 15A / PX-02.

### 2026-10-25 — PX-02 / Blocco 15A — Home e benvenuto

**Stato:** implementato, in review. [Prove e limiti](HOME-QA.md).

**Interventi:** composizione con pittogramma e cornice molecolare, gradienti a tema, animazione finita entro un secondo; CTA visibili e utilizzabili dal primo frame. Il flag locale viene scritto anche alla presentazione della home anonima, senza consumare l’introduzione durante il ripristino sessione. Conservati route e marking precedente; CSS locale e token esistenti.

**Verifica:** baseline 26 test, finale 33; typecheck, lint, policy, build e bundle/lazy riusciti. Chrome: 18 combinazioni responsive light/dark, primo ingresso, reload, nuova scheda, reduced motion effettivo, focus e tre destinazioni verificati. Azioni ferme durante l’ingresso; un piccolo shift nel footer della shell di avvio resta nel seguito PX-01. Logout effettuato dall’utente, nessun login/modulo inviato dall’agente.

**Rimane:** review manuale, Safari fisico, reduced motion nativo al caricamento e riavvio completo del browser. Nessuna CI remota o operazione Git. Prove in `C:/Users/giuli/.codex/artifacts/mercurion-home-15a-2026-10-25/`.

**Prossimo blocco:** 15B — Welcome e screenshot aggiornati; messaggio commerciale sostanziale ancora subordinato al segmento clienti.

### 2026-10-25 — PX-02 / Blocco 15B — Welcome, screenshot ed editor Analisi live

**Stato:** implementato, in review. [Prove e limiti](WELCOME-QA.md).

**Interventi:** sei catture reali light/dark di ricerca, predizione ed editor sull’aspirina pubblica; nuova sezione Analisi live. Screenshot con dimensioni riservate, variante tema singola, lazy loading e apertura a dimensione intera. CTA uniformate e descrizioni allineate alle funzioni disponibili. Immagini di sfondo, veli e CSS della pagina contenitore conservati.

**Verifica:** baseline 17 test, finale 20; typecheck, lint, policy, build e bundle/lazy riusciti. Browser: 18 combinazioni responsive nei due temi senza overflow; caricamento PNG ritardato con variazione geometrica delle immagini pari a 0 px; link full-size e frammento funzionalità verificati. Login/logout effettuati dall’utente, nessuna molecola salvata. Tema e viewport ripristinati, chiusa soltanto la scheda dell’agente.

**Rimane:** review manuale e QA fisica Safari/zoom trasversale. Nessuna operazione Git o CI remota. Artefatti in `C:/Users/giuli/.codex/artifacts/mercurion-welcome-15b-2026-10-25/`.

**Prossimo blocco:** 16 / PX-03 — Accesso.

### 2026-10-25 — PX-03 / Blocco 16 — Accesso

**Stato:** implementato, in review. [Prove e limiti](LOGIN-QA.md).

**Interventi:** composizione condivisa login/SSO/MFA, progressione e ritorno e-mail/password espliciti, focus e azioni coerenti. Pending della verifica e-mail rilasciato anche dopo errore, retry senza invii duplicati; corretto il blur che poteva ripristinare la password cancellata nel ritorno al primo passo. Presentazione MFA con label/errori associati e senza offset manuali. Policy e strategie di autenticazione conservate.

**Review utente:** rimossa la scrollbar del contenitore Turnstile passando da altezza fissa a intrinseca e rimuovendo overflow scrollabile; aggiunti 8 px di separazione oltre al gap tra «Accedi» e widget. Utente: confermato il widget intero e senza scrollbar dopo reload.

**Verifica:** baseline 30 test, finale 49; typecheck/template, lint mirato, policy, build production e gate bundle/lazy riusciti. Login anonimo Chrome nei due temi e a viewport basse; controlli contenuti, nessun overflow persistente dopo assestamento shell. Fixture geometriche per form/password/errori, widget 300×78 px e stati MFA senza servizi esterni. Nessuna password/codice o richiesta SMS/e-mail inviati dall’agente.

**Rimane:** login/MFA end-to-end, handoff SSO, password manager reali, Safari fisico e zoom. SMS subordinati a INF-02. Nessuna CI remota o operazione Git. Artefatti in `C:/Users/giuli/.codex/artifacts/mercurion-login-16-2026-10-25/`.

**Prossimo blocco:** 16K / AUTH-02 — architettura e stima per rotazione/revoca chiavi JWT; nessuna rotazione reale avviata.

### 2026-10-25 — AUTH-02 / Blocco 16K-A — Analisi rotazione JWT

**Stato:** inventario e proposta in review; nessuna implementazione applicativa. [Analisi e stima](JWT-KEY-ROTATION-ANALYSIS.md), [piano aggiornato](JWT-KEY-ROTATION.md).

**Confermato dall’utente:** revoca a caldo; VPS Docker Compose con una istanza Nest e una Tox21 per ambiente, senza repliche. Manifest Kubernetes mantenuti come case study.

**Riscontri:** 15 domini (2 RSA, 13 HMAC), firma/verifica Nest centralizzate. Il rinnovo HTTP usa anche token scaduti con sessione valida: ritiro della chiave e finestra senza kid non si dimensionano sul solo TTL JWT. Il guard WS non basta per interrompere push a socket passivi. Tox21 ha un verificatore a chiave singola ma GLOBAL_SKIP_AUTH_FLAG=True nel sorgente locale; controller scientifici Nest pubblici con token vuoto/omesso. Nessun flag cambiato.

**Proposta:** registro persistente senza segreti su directory condivisa in sola lettura, CLI con aggiornamento atomico/revisioni/audit, materiale di firma separato, lettura dello stato per ogni operazione e riconciliazione WS entro 5 secondi. Modello, limite WS e politiche di continuità restano da concordare. Stima condizionata: 4–6 giornate tecniche; autenticazione dei flussi scientifici pubblici esclusa e da definire separatamente.

**Verifica:** baseline invariata 7 suite Jest/78 test superati; 10 controlli con librerie JWT installate e chiavi casuali solo in memoria. Fonti RFC primarie ricontrollate, documentazione e diff check. Nessun .env/PEM letto, nessun runtime/container/accesso VPS/CI remota, nessuna operazione Git o modifica a Tox21. Log in `C:/Users/giuli/.codex/artifacts/mercurion-jwt-16ka-2026-10-25/`.

**Aggiornamento decisionale:** l’utente ha confermato «Manifest su volume e limite WS di 5 secondi». Registrati manifest senza segreti persistente, aggiornamento atomico tramite CLI, lettura a caldo e rimozione dalle room private/disconnessione dei WS con chiave revocata entro il limite. Requisiti concordati, non ancora implementati o misurati; finestre operative e contratto scientifico restano da definire.

**Prossimo blocco:** 16K-B1 (schema/loader e firma/verifica multi-chiave con compatibilità), sul modello di registro confermato. Nessuna abilitazione implicita del consumer scientifico.

### 2026-10-25 — AUTH-02 / VPS INF-01A — Coordinamento Secret Manager

**Stato:** pianificazione allineata; nessun adapter o deployment implementato. Fonte: nuova v0.2.0 della [roadmap VPS](../../../docs/infrastructure/vps-deployment-roadmap.md), D-12–D-14 e checkpoint INF-01A.

**Aggiornamento:** manifest JWT su volume confermato come sola autorità di metadati/revoche. Rimossa l’ipotesi di una directory segreta persistente in staging/production: private RSA/HMAC dal Secret Manager a runtime, in memoria; Base64 non rende persistibili i segreti. Provider e bootstrap macchina ancora da selezionare/provare. Local development/test conservano il percorso file previsto. B1 sviluppa port asincrona e core con fixture sintetiche; integrazione vendor e bootstrap pre-Nest coordinati con VPS INF-01A prima del rollout. Il limite WS di 5 secondi resta applicabile anche durante outage del manager.

**Riscontro aggiuntivo:** il ConfigModule installato copia il risultato della validazione in process.env; il solo oggetto configuration.environment non dimostra che i segreti restino esclusivamente nella DI. Aggiunta prova/correzione di questa superficie, cache SDK, processi figli e persistenza ai gate di integrazione. Nessun dato d’ambiente letto.

**Verifica:** lettura statica di roadmap, bootstrap/configurazione e libreria installata; controlli documentali, link locali e diff. Baseline JWT 78 test/10 controlli del blocco precedente non rieseguita né presentata come prova del Secret Manager. Stima JWT 4–6 giornate distinta dal PoC/integrazione infrastrutturale, ancora da stimare. Nessuna scelta provider, chiamata al manager, acquisto, modifica applicativa o operazione Git.

**Prossimo blocco:** 16K-B1 con contratto del materiale indipendente dal provider; POC reale e bootstrap restano nel percorso VPS INF-01A.

### 2026-10-25 — AUTH-02 / B1a — Schema manifest e material-source port

**Stato:** implementato, in review. [Contratto v1 e limiti](../../../MercurionWebNode/docs/jwt-key-manifest.md). Nessuna emissione/verifica con kid nel percorso corrente; .env e PEM locali invariati.

**Intervento:** policy esaustiva per i 15 TokenType; manifest chiuso con revisione/ambiente, riferimenti logici versionati, stati, cronologia e finestre legacy; parser senza I/O o orologio, snapshot scollegato/immutabile ed errori senza valori sensibili. SPKI RSA pubblico valido ≥2048 bit, divieto di riuso tra kid/domini, nessun campo inline per private/HMAC. Port asincrona indipendente dal vendor con encoding espliciti ed errori sanitizzati. JwtKeysProvider.validateManifest vincola il parser all’App.env fidato; metodi di caricamento RSA attuali e bootstrap invariati. Nessuna allowlist architetturale aggiunta.

**Verifica:** baseline mirata 2 suite/7 test; finale 9 suite/156 test, inclusi 78 nuovi e regressioni guard/sessione/WS/configurazione. Typecheck Nest, lint mirato senza warning, build Nest, policy architettura/raggiungibilità/naming/errori e controlli documentali riusciti. RSA sintetiche solo in memoria; nessun .env/PEM reale letto, adapter remoto, chiamata provider, runtime/browser/container, operazione Git o CI remota.

**Limiti:** parser e contratto non dimostrano selezione/verifica JWT, disponibilità del materiale, anti-rollback tra revisioni, lettura live del file o disconnessione WS. Questi comportamenti restano nei blocchi successivi; Secret Manager reale e bootstrap in VPS INF-01A. Log locali in `C:/Users/giuli/.codex/artifacts/mercurion-jwt-b1a-2026-10-25/`.

**Prossimo blocco:** B1b — loader e integrazione di firma/verifica con kid, legacy e continuità del rinnovo HTTP.

### 2026-10-25 — AUTH-02 / B1b — Loader e firma/verifica multi-chiave

**Stato:** implementato, in review. [Contratto aggiornato](../../../MercurionWebNode/docs/jwt-key-manifest.md). Attivazione tramite sorgenti esplicite in createApplicationModule; il bootstrap ordinario mantiene .env/PEM e JWT precedenti senza kid. Nessuna configurazione locale da cambiare per questa consegna.

**Intervento:** JwtKeyRing collega manifest e materiale a JwtToolsService per tutti i 15 TokenType. Header kid protetto, algoritmo/scopo vincolati, verifica crittografica e claim obbligatori, lookup limitata senza URL/percorsi dal token. Loader con validazione RSA/coppie/encoding e HMAC ≥64 byte, cache in memoria, deduplicazione e timeout. Validazione e preriscaldamento del materiale all’inizializzazione Nest; nessun fallback legacy dopo aver configurato le nuove sorgenti. Lettura dello stato prima/dopo firma/verifica, revoca anche con cache calda e flag diagnostici, rifiuto di rollback/modifiche delle identità osservate nel processo. Continuità vecchia/nuova chiave e mapping legacy con finestre separate per rinnovo HTTP. Conservati JTI, PAT corrente, sub cifrato e sessione/device.

**Errori:** fault del registro/provider distinti da token invalidi; HTTP non elimina cookie/sessioni per questi fault, WS nega l’evento senza sessionExpired/disconnessione. Rimossa la distruzione delle sessioni fondata soltanto su decodeUnsafe: serve il principal verificato. Questo non implementa il timer dei socket inattivi.

**Verifica:** baseline B1b 9 suite/156 test; finale **17 suite/271 test superati**, incluse firme RSA/HMAC reali con materiale sintetico, race di revoca, timeout, inizializzazione, cache/outage, guard HTTP/WS, composizione, login/MFA/SSO/sessione e relativo contratto. Esecuzione diretta Jest --runInBand --runTestsByPath sui percorsi elencati nel log. Typecheck Nest (--noEmit --incremental false), ESLint mirato senza warning, build Nest, policy architettura/raggiungibilità/naming/errori e controlli documentali riusciti. Log in `C:/Users/giuli/.codex/artifacts/mercurion-jwt-b1b-2026-10-25/`.

**Limiti:** nessun adapter file/provider reale; configurazione canonica e recupero pre-bootstrap Secret Manager ancora da integrare con VPS INF-01A. Storia di revisioni/revoche solo nel processo, non prova durevole dopo riavvio. Nessuna finestra legacy reale definita, deroga automatica per segreti legacy corti, rotazione reale, lettura di .env/PEM reali, modifica Tox21/flag, prova runtime/browser/Compose o CI remota. Nessuna operazione Git.

**Prossimo blocco:** B2 — lettura del manifest su volume, CLI atomica, audit/tombstone durevoli e revoca dei WS già aperti entro 5 secondi, anche con manager indisponibile. Provider e bootstrap macchina restano nel percorso VPS INF-01A.

### 2026-10-27 — AUTH-02 / B2 — Registro persistente, CLI e socket inattivi

**Stato:** implementazione locale in review. [Runbook e confine operativo](../../../MercurionWebNode/docs/jwt-key-operations.md). Il bootstrap ordinario conserva la configurazione precedente; nessuna rotazione o nuovo requisito per avviare lo sviluppo.

**Intervento:** JwtKeyFileRegistry con directory current/history separate, revisioni immutabili concatenate, lock del writer, expectedRevision e pubblicazione atomica con flush. Reader senza fallback a snapshot obsoleti, replay di identità/tombstone dopo riavvio e recovery esplicito soltanto in avanti. JwtKeyAdministration e CLI con anteprima/digest, argomenti chiusi e operazioni prepare/activate/revoke/retire; source del materiale validata in memoria prima di prepare/activate. La CLI standalone non finge un adapter: applica revoke/retire senza provider, mentre prepare/activate richiedono composizione fidata INF-01A. Nuovo entrypoint CLI registrato nel grafo di produzione, nessuna eccezione per nascondere codice orfano e nessuna nuova dipendenza.

**WS:** gateway e guard collegano le connessioni verificate alla chiave; timer per lotto ogni secondo, lettura con timeout e un retry breve, nessuna chiamata al manager. Rimozione dalle room private e disconnessione, cleanup a rebind/disconnect/shutdown. Rotazione ordinaria e semplice scadenza JWT conservano le sessioni; fault persistente del registro esclude i socket privati senza invalidare Redis/JTI. Pubblicazioni brevemente interrotte non causano disconnessioni spurie.

**Verifica:** baseline mirata 4 suite/149 test; finale **19 suite/301 test superati**. Test con filesystem reale e chiavi sintetiche, concorrenza, crash audit/current, recovery, corruzione, rollback, riuso di pubbliche ritirate, preflight/guasto materiale, guard/gateway e regressioni login/MFA/SSO/sessione. Timer reali: esclusione della connessione inattiva in **1016 ms** durante outage del manager; lettura integrale di 20 revisioni/15 domini/34 chiavi in **53 ms**. È una fixture locale, non una prova di rete Socket.IO/Redis/Compose. Typecheck, ESLint mirato senza warning, build e avvio del solo entrypoint CLI su argomenti invalidi riusciti; policy architettura/naming/errori, documentazione e diff check riusciti. Log: `C:/Users/giuli/.codex/artifacts/mercurion-jwt-b2-2026-10-27/`.

**Preservato:** modifiche manuali già presenti al bootstrap e quelle concorrenti alla pagina notifiche. Nessun .env/PEM reale letto, accesso VPS/provider, modifica a Tox21/flag, servizio utente fermato o operazione Git.

**Limiti e prossimo passaggio:** gate Linux/Compose per readonly/ACL, fsync e restore, misura WS reale e integrazione HTTP; provider/bootstrap INF-01A e consumer/contratto Tox21 16K-C da coordinare. Finestre legacy reali ancora da definire. La cronologia protegge dal restore del solo current, non da un amministratore che riscriva entrambi gli archivi; niente compattazione automatica, massimo 512 revisioni/256 KiB per documento. HMAC storiche eliminate dal provider non hanno fingerprint persistito: nuovo materiale e binding immutabili restano requisiti del provisioning. Nessuna certificazione CI remota o accettazione di rollout dichiarata.

### 2026-10-27 — AUTH-02 — QA Linux/Compose e modello env/segreti

**Stato:** QA isolata completata, in review; non è il rollout o il bootstrap completo dell’app. [Report e comando ripetibile](../../../MercurionWebNode/docs/jwt-linux-qa.md); [gestione di variabili, segreti e kid](../../../MercurionWebNode/docs/jwt-environment-and-secrets.md).

**Intervento:** runner PowerShell con contesto allowlist, immagine pubblica Node 22.16.0 bookworm-slim, dipendenze allineate a manifest/lock senza installare nel workspace, Compose con rete interna e Redis dedicato. Writer/reader separati con UID 10002/10001, directory RW/readonly e permessi POSIX. Sorgente del materiale sintetica in memoria tramite IPC, niente chiavi in env/argv/volumi. Il codice applicativo compilato esercita guard e policy HTTP, sessioni/repository Redis, Socket.IO gateway/guard/Redis adapter, registro e amministrazione delle chiavi. Nessun frontend, account o database utente coinvolto.

**Verifica:** **26/26 controlli d’integrazione riusciti** sulla base Node pubblica. Nest common/core 11.2.7, JwtService 11.0.2, Socket.IO 4.8.1 e ioredis 5.8.2. Rinnovo di JWT HTTP realmente scaduto verso nuovo kid senza perdere sessione/cookie; rotazione e revoca RS256/HS512 con cache e manager offline; WS inattivo rimosso dalle room reali e disconnesso in **697 ms** nell’ultima prova. Pubbliche/nuove chiavi restano connesse; zero chiamate al provider nella riconciliazione. Restore del solo current rifiutato; reader riavviato conserva revoche; SIGKILL reale del writer dopo fsync dell’audit e prima del rename, recovery in avanti riuscito. Nessun secret nei tredici documenti persistenti controllati. Readonly EROFS e permessi EACCES verificati separatamente.

**Validazione/risorse:** build Nest, sintassi CJS, parsing PowerShell e controlli statici/documentali riusciti. Rimossi immagine, container, rete e volumi del progetto di QA; verifica finale con zero container/volumi/reti residui. Evidenze: `C:/Users/giuli/.codex/artifacts/mercurion-jwt-linux-2026-10-27/`. Nessun npm ci/ci:check locale, installazione nel workspace, Git write, chiave reale letta o servizio dell’utente fermato. Le modifiche manuali restano preservate.

**Env e prossimo passo:** oggi .env/PEM ordinari e bootstrap legacy restano invariati. Il kid/stato/binding vive nel manifest, non in JWT_ACTIVE_KID; il nuovo adapter recupererà private/HMAC versionate dal manager in memoria. Restano INF-01A (provider, adapter, configurazione pre-bootstrap senza copia in process.env e identità/reboot VPS), finestre reali e consumer Tox21. Il provider della fixture non è un’implementazione del Secret Manager e il trasporto HTTP di prova non certifica login/GraphQL/nginx o RBAC completo. La prova di crash non simula perdita di alimentazione del filesystem.

### 2026-10-27 — AUTH-02 — Adapter e bootstrap di sviluppo

**Stato:** implementato, in review. [Guida operativa locale](../../../MercurionWebNode/docs/jwt-local-development.md). Nessun input reale migrato o flag attivato dall’agente.

**Intervento:** adapter development/test con mapping reference/version immutabile, PEM versionati e HMAC in dotenv privato senza copia in process.env. Opt-in canonico JWT_LOCAL_KEYS_CONFIG; assente/vuoto conserva il percorso legacy. Con opt-in non sono più obbligatori i 13 JWT_SECRETS_* principali. Staging/produzione rifiutano il flag. CLI jwt:local init con anteprima/digest legato ai byte importati, validazione reale di 15 domini, finestre legacy/rinnovo HTTP e pubblicazione da staging privato senza sovrascrivere input esistenti. HMAC legacy preservate come UTF-8 letterale; materiale corto rifiutato senza reset automatici. Generazione di nuove versioni e amministrazione prepare/activate tramite --local-config, senza riavviare la sorgente e senza segreti in argv/output. CLI registrata come entrypoint; nessuna nuova dipendenza o eccezione architetturale.

**Verifica:** **22 suite/362 test superati**, inclusi 32 test dedicati: firme legacy di tutti i 15 scopi, bootstrap Nest con configurazione canonica senza i vecchi JWT_SECRETS_*, fail-closed senza fallback, rifiuto destinazioni in workspace tracciati e rotazione RSA/HS512 a caldo. QA Linux/Compose estesa a **27/27 controlli**, con importazione/rotazione locale su tmpfs indipendente dal provider sintetico; WS revocato in **543 ms**. Typecheck, lint, build e policy locali registrati nelle evidenze finali: `C:/Users/giuli/.codex/artifacts/mercurion-jwt-local-2026-10-27/`. La prova è isolata: non certifica login/nginx/database reali o CI remota.

**Risorse e seguito:** container, rete e volumi del progetto QA rimossi e assenza verificata; lockfile del workspace invariato. Preservati file .env/PEM e modifiche manuali, nessuna operazione Git o servizio utente fermato. L’attivazione locale reale segue la guida con migrazione esplicita; per il resto del capitolo rimangono INF-01A (provider, identità VPS e pre-bootstrap), finestre operative degli ambienti e consumer Tox21.

### 2026-10-27 — Blocco 17 / PX-03 e PX-14 — Registrazione e recupero

**Stato:** implementato, in review. [Risultato, prove e limiti](REGISTRATION-RECOVERY-QA.md).

**Intervento:** layout comune al login per sei pagine, form e fieldset nativi, distanze regolari e slot di sicurezza senza affiancamenti/offset. Invii ripetuti impediti, richieste annullate in uscita, errori pertinenti e valori conservati. Distinti recupero password e account; link incompleti con spiegazione e uscita, nessun form prima dell’autorizzazione server. Password frontend allineata alla regola forte backend già esistente. Percorso SSO e informative conservati.

**Correzioni durante la review:** l’utente ha richiesto codice leggibile per tutti i file; preservata la sua formattazione CSS e formattati template/TypeScript/test con blocchi espliciti. Corretta la regressione della checkbox nativa scura in light e priva di pointer: superficie, spunta, focus e stato disabilitato espliciti e provati. La prima opzione vuota del genere ora mostra «Seleziona il genere», mantenendo required e valore vuoto.

**Verifica:** baseline 32 test; finale **117 test superati**, incluse regressioni login/MFA e 24 casi di geometria delle sei pagine. Chrome anonimo: 23 misure nei due temi senza overflow, registrazione a 320–1280 px e con viewport bassa, menu Genere ed Escape, pointer/focus della checkbox. Typecheck, lint, formattazione, styling/negative, colori/token, policy e production build/gate riusciti. Iniziale 947.699 byte, soglie invariate. Le prove di stato sono sintetiche; nessun flusso reale di invio/cambio credenziali eseguito. Artefatti: `C:/Users/giuli/.codex/artifacts/mercurion-account-17-2026-10-27/`.

**Rimane:** QA con link/codici/account autorizzati, Safari fisico e password manager. Backend, flag, segreti e processi dell’utente preservati; nessuna operazione Git. Migrazione JWT locale rinviata per richiesta dell’utente.

**Prossimo blocco:** 18 / PX-12 — Dashboard.

### 2026-10-27 — Blocco 17 — Revisione dopo regressioni

**Correzione dell'esito precedente:** i 117 test e il contenimento non certificavano la fedeltà grafica. Ripetuta la revisione dei sei componenti e dei test nel worktree; nessuna accettazione del blocco.

**Riparazioni:** checkbox originale 16 px con spunta SVG 14 px centrata, Tailwind e focus tastiera; punteggiatura delle informative e conferme; tutti i 12 tracciati originali conservati nei template. Avviso recupero nell'intestazione, icone affiancate al testo nelle card larghe e compressione involontaria eliminata. Protette microtask di conferma/redirect/pulizia URL dopo distruzione. Preservati intervento manuale sulla select e formattazione CSS dell'utente.

**Verifiche corrette:** cinque fallimenti prima del fix checkbox, uno prima del fix SSO e quattro per le dimensioni delle icone. Test del reset riscritti attraverso form e risposte autorizzate, senza sostituire membri privati. Suite finale **124/124**, typecheck/template, lint, styling/fixture negative, colori/token e build con gate bundle/lazy riusciti. Browser anonimo e limiti distinti dalle fixture di successo: [rapporto aggiornato](REGISTRATION-RECOVERY-QA.md). Le precedenti evidenze sono conservate come storico, non come certificazione grafica.

**Review residua:** accettazione manuale del design, percorsi reali di attivazione/recupero/SSO, Safari fisico e password manager. Nessuna operazione Git o sui dati/account reali. Artefatti e backup: `C:/Users/giuli/.codex/artifacts/mercurion-account-17-2026-10-27/worktree-review/`.

### 2026-10-27 — Verifica del rollback SSO richiesto dall'utente

**Scelta dell'utente:** mantenere la versione originale con il solo spinner. Componente e relativo spec coincidono con HEAD e non sono stati modificati durante il controllo; hash SHA-256 del componente invariato: `918d6549360928ee56f523e31a57f5c59743aa312f546ab7776824094c354b7b`.

**Verifica:** typecheck/template e lint riusciti. Quattro test di layout aggiunti nel refactor fallivano perché imponevano il tag `main`; ora riconoscono anche il ruolo nativo equivalente `[role="main"]`. Fixture SSO isolata dalla raccolta reale del fingerprint. **34/34 test mirati superati**, comprendenti SSO, layout dei flussi e accessibilità canonica. Nessuna modifica della grafica o della logica SSO, nessun commit.

**Osservazioni statiche da discutere separatamente:** callback senza frammento lascia lo spinner, errore iniziale del fingerprint non gestito e redirect da errore accodato senza guardia dopo distruzione. Questi comportamenti appartengono alla versione ripristinata; il normale successo SSO e il ritorno al percorso richiesto sono coperti dai test esistenti. L'esito di 124 test della voce precedente è storico e precede il rollback.

### 2026-10-27 — SSO — Casi limite senza modifiche grafiche

**Autorizzazione:** gestire i casi limite emersi nella verifica del rollback, mantenendo esattamente il solo spinner scelto dall'utente.

**Intervento:** validazione del callback prima del fingerprint, senza attesa infinita se manca il token; stesso percorso 404 già esistente per input non valido. Errori del fingerprint intercettati dallo stesso percorso di errore dell'autorizzazione SSO verso il login. Microtask di redirect e riallineamento dello spinner ignorate dopo distruzione; conservati unsubscribe, cleanup e normale successo della sessione/redirect.

**Verifica:** template originale confrontato esattamente e hash SHA-256 invariato `61c9a45fc702a514802e16772241a8f6db7d373b174fda3cdff137ab450635e4`; nessuno stile aggiunto. Test per callback assente/malformato, provider sconosciuto, fingerprint fallito, errore dell'autorizzazione, navigazione tardiva e risoluzione del fingerprint dopo distruzione; contratto grafico del solo spinner esplicito. **45 test mirati superati**, typecheck/template e lint riusciti. Nessun provider SSO reale o CI remota certificati. Evidenze in `C:/Users/giuli/.codex/artifacts/mercurion-account-17-2026-10-27/sso-edge-cases/`. Nessun commit.

### 2026-10-27 — Blocco 18 / PX-12 — Dashboard

**Stato:** implementato, in review. [Prove, comandi e limiti](DASHBOARD-QA.md).

**Intervento:** saluto/avatar e palette conservati; contatori descritti, grafici affiancati desktop e impilati mobile, legende native da tastiera e tabella dei dati giornalieri. Chiarito il significato delle risorse distinte nella cronologia. Stati vuoti indipendenti, skeleton allineati e retry senza perdere i dati già caricati. Chart.js resta differito; cleanup e preferenze di visibilità delle serie verificati. Tailwind 4 e token esistenti, nessun CSS aggiunto.

**Verifica:** baseline 12 test, finale **29 test superati**; geometria reale in iframe a 320/375/768/1280 px nei due temi, nomi lunghi e grandi contatori. Rilevate e corrette differenze di 6 px degli skeleton e overflow transitorio dei canvas durante il resize, con prove fallite conservate. Chrome autenticato: stessi quattro breakpoint nei due temi, screenshot ispezionati, legenda e tabella da tastiera. Typecheck, lint, formattazione, styling/negative, colori/token e build con gate bundle/lazy superati. Iniziale 951.540 byte, soglie invariate.

**Limiti:** stati di errore/account vuoto coperti da fixture; Safari fisico, zoom reale e accettazione manuale aperti. Nessuna CI remota, operazione Git o modifica ai dati/account. SSO e runtime dell’utente preservati. Artefatti: `C:/Users/giuli/.codex/artifacts/mercurion-dashboard-18-2026-10-27/`.

**Prossimo blocco:** 19 / PX-13 — Settings: fasi successive, coordinando l’accettazione dei flussi SMS con INF-02.

### 2026-10-27 — INF-02 — Permanenza su Twilio

**Decisione dell’utente:** rinuncia a SMS Hosting per le difficoltà burocratiche nell’approvazione dell’alias; creerà un nuovo account Twilio. Porting a SMS Hosting superato e nessun refactor per limitare i destinatari all’Italia da eseguire.

**Aggiornamento:** riallineati stato, priorità e dipendenze SMS della roadmap. Restano configurazione del nuovo account e verifica degli invii OTP/MFA prima dell’accettazione dei relativi flussi. Il nuovo account non è ancora dichiarato operativo. Le precedenti indicazioni di porting nei rapporti e nel diario restano storiche.

**Perimetro:** solo documentazione; nessun codice, segreto, variabile d’ambiente o dipendenza modificati. Prossimo blocco UX invariato: 19 / PX-13 — Settings.

### 2026-10-27 — INF-02 — Vincolo Italia per il sender Twilio

**Aggiornamento dell’utente:** il ritorno a Twilio non elimina il vincolo geografico: sender alfanumerico abilitato solo per l’Italia e accettazione dei soli numeri +39. Questa decisione supera la frase «nessun refactor per limitare i destinatari all’Italia» della voce precedente.

**Intervento:** select e bandiera conservate, prefisso Italia fisso e controllo disabilitato dal form reattivo; tooltip PrimeNG da focus/hover con testo visibile. Il payload usa sempre +39. Validazione DTO e controllo del kernel prima dello stato OTP; controllo di ogni destinatario prima della chiamata Twilio. TWILIO_NUMBER diventa facoltativo e il mittente resta TWILIO_FROM. Restrizione indicata in Settings, Termini e Privacy. Attribuzione pubblica Mercurion–ditta–sender aggiunta come requisito prima del deployment nella roadmap VPS, con dati esatti ancora da confermare.

**Verifica:** 46 test backend e 44 Angular superati; typecheck, lint, styling/negative e build Nest/Angular con gate bundle/lazy riusciti (iniziale 951.620 byte). Chrome a 375 e 1280 px nei due temi: screenshot ispezionati, +39 bloccato e tooltip allineato al controllo anche con body fissato dopo lo scroll. Prova supplementare a viewport bassa non conclusiva per il focus; QA fisica ancora aperta. Prove del workflow e delle regressioni collegate nella [QA dedicata](SMS-ITALY-QA.md). Il browser ha fatto emergere un tooltip senza superficie: riprodotto con test sul background e corretto usando lo stile esistente. Tracciati SVG del workflow e pannello contatti identici a HEAD. Nessun CSS aggiunto, file env o credenziale letti/modificati, SMS reale inviato, dato account cambiato o operazione Git eseguita.

**Rimane:** account/sender operativo e consegna reale, gestione esplicita di eventuali numeri esteri preesistenti, Safari fisico e review manuale. L’intero blocco 19 / Settings resta da svolgere; questo è il solo intervento circoscritto sul prefisso.

### 2026-10-27 — INF-02 — Prova diretta SMS superata dall’utente

**Esito riferito dall’utente:** inserite le nuove credenziali Twilio nell’ambiente di sviluppo, eseguita una prova diretta SMS e comunicato «test superato». Registrato separatamente dalle prove automatiche e browser dell’agente; nessun segreto letto e nessun SMS inviato dall’agente.

**Seguito:** ripresa del blocco 19 / Settings. Restano la verifica dei singoli flussi OTP/MFA, gli altri ambienti, la QA fisica e l’attribuzione pubblica ditta/sender prima del deployment. La prova diretta non costituisce accettazione dell’intero blocco.

### 2026-10-27 — Telefono — Select e invalidazione locale Settings

**Segnalazioni:** dopo il merge delle policy, select del prefisso disomogenea rispetto all’input e pannello Contatti non aggiornato alla chiusura dopo aggiunta/rimozione del telefono.

**Correzioni:** select e input da 52 px, bordi e allineamento coerenti, label su riga condivisa e focus sul solo controllo. Classi Tailwind locali, bandiera/freccia e select condiviso conservati. Settings ora consuma l’evento locale profile/changed già emesso dall’overlay, aggiorna il template senza ricreare il pannello e riallinea la sicurezza/MFA dopo la rimozione del numero. Cleanup delle letture e microtask alla distruzione.

**Verifica:** 59 test mirati superati, con geometria a quattro larghezze e due temi, template reale prima/dopo aggiunta/modifica/rimozione, remote sync e cancellazione delle letture. Sottoinsieme sicurezza rieseguito: 15 test superati. Typecheck, lint, styling e build/gate bundle/lazy riusciti; iniziale 952.698 byte. Screenshot Chrome nei due temi ispezionati, misure allineate a 375/640/1280 px. Mutazioni provate con fixture, nessun SMS reale o modifica dei numeri eseguiti dall’agente. [Prove e limiti](SMS-ITALY-QA.md).

**Perimetro:** policy integrate dall’utente e validazione DTO +39 non modificate; nessun segreto letto e nessun commit. L’intero blocco 19 e la QA Safari fisica restano aperti.

### 2026-10-27 — Blocco 19 / PX-13 — OTP/MFA e preautenticazione login

**Intervento:** recupero esplicito degli errori, reinvio con token nuovo, countdown condiviso, focus OTP e spaziature, QR/chiave manuale e backup senza overflow. Distinti attivazione MFA riuscita e fallimento della successiva generazione dei backup. Annullamento/distruzione impediscono aggiornamenti tardivi e cancellano i dati temporanei dal componente. Corretto il validatore della nuova password.

**Integrazioni richieste durante la review:** countdown anche nel login e gestione di scadenza/revoca del preAuthorizationToken. La preautorizzazione termina in modo esplicito, preservando l'intento di destinazione. Il backend consuma il token anche sul codice errato: serve quindi un nuovo login, senza modificare la regola server. Revoca remota accertata alla richiesta successiva, nessun nuovo push/polling.

**Verifica finale:** 186 test mirati superati in un'unica esecuzione, typecheck/template, lint, build production, gate bundle/lazy, styling con fixture negative e documentazione superati. Bundle iniziale 953.040 / 1.000.000 byte. Icone originali confrontate con HEAD: tutti i 24 tracciati del workflow e i 4 del login MFA conservati. Browser Chrome: selettore mobile chiaro e desktop scuro, Escape e focus di ritorno; ripristinati tema automatico e viewport originale.

**Prove e residui:** [SETTINGS-STATES-QA.md](SETTINGS-STATES-QA.md). Casi automatici con trasporti sintetici distinti dal browser autenticato e dalle prove reali. Smoke test dei singoli flussi, varianti SSO/sessioni e Safari fisico ancora aperti. Nessun invio o modifica di credenziali reali eseguiti dall'agente; nessuna operazione Git o modifica dei segreti. Il successivo blocco pianificato resta 20A / Notifiche.

### 2026-10-27 — Blocco 20A / PX-15A e PX-15B — Centro notifiche

**Intervento:** gerarchia e superfici coerenti con i refactor precedenti, categoria/data/stato leggibili, dettaglio affiancato desktop e dedicato mobile, errori/retry espliciti e skeleton allineato. Facade locale con protezioni per risposte obsolete, cambio filtro e paginazione; nuove notifiche recuperate proposte tramite aggiornamento esplicito. Badge accessibile, conteggio 99+, animazioni fade-in/out conservate con cleanup dei callback. Catch-up contenuto su mobile, retry acknowledgement, Escape e focus di ritorno. Campanella originale conservata; Tailwind 4, nessun nuovo CSS vanilla.

**Verifiche:** 47 test mirati superati, compresi 7 canonici. Tre regressioni riprodotte prima del fix. Geometria lista/dettaglio e testi lunghi a 320/375/640/1280 px nei due temi, card/skeleton e catch-up mobile. Axe senza violazioni gravi/critiche. Typecheck/template, lint, build production e gate bundle/lazy/styling/documentazione superati; iniziale 954.487 / 1.000.000 byte. [Rapporto e limiti](NOTIFICATIONS-20A-QA.md).

**Perimetro:** browser sullo sviluppo, con dettaglio già letto; nessuna azione di lettura/cancellazione/invio eseguita dall'agente. Nessuna modifica backend, dei segreti o operazione Git. L'aggiornamento è in review; prossimo blocco 20B — azioni e recupero; e-mail transazionali nel successivo 20C. QA fisica e prova estesa multi-sessione restano aperte.

### 2026-10-28 — Blocco 20B / PX-15C — Azioni sulle notifiche

**Intervento:** conferme di eliminazione con focus iniziale su Annulla, cursore globale acquisito all’apertura e invariato nei retry; pending e doppio invio protetti. Letture ed eliminazioni singole conservano pagine e cursori caricati. Errori di scrittura distinti da errori del successivo refresh. Recovery pubblicato pagina per pagina, riconciliazione delle risposte obsolete e protezione delle rimozioni remote. Stato degradato con retry della sincronizzazione. Icone e animazioni del badge conservate; Tailwind 4 e TypeScript senza terminatori opzionali.

**Verifiche:** due regressioni nuove fallivano sul codice iniziale. Suite finale: 66 test mirati superati, inclusi i 7 del setup; conferme anche in pending verificate con Axe. Typecheck/template, lint, build production, bundle/lazy, styling con fixture negative e documentazione superati. Bundle iniziale 955.003 / 1.000.000 byte. Nessuna modifica backend, ai segreti o operazione Git di scrittura.

**Limiti:** Playwright MCP collegato al browser autenticato; baseline con 14 notifiche non lette. Chrome minimizzato espone il documento come hidden e non completa il rendering delle conferme: QA browser finale ancora aperta, senza dichiararla superata. Richiesto di lasciare visibile Chrome. Nessuna mutazione delle notifiche reali eseguita; restano fixture end-to-end autorizzate, vere sessioni concorrenti e Safari fisico. [Prove e limiti](NOTIFICATIONS-20B-QA.md). Il successivo blocco pianificato è 20C / e-mail transazionali, dopo la review delle notifiche.

### 2026-10-29 — Chiusura verifiche 20B e spinner history

**Intervento:** ripresa con il solo Playwright MCP. Conferme e focus verificati su account locale senza inviare scritture; lettura, pending, errore e retry globale provati su API intercettate. Elimina in lista, dettaglio e azione globale usa ora la variante condivisa destructive/danger, come richiesto. Verificati cinque viewport, compreso 375×320, nei due temi. Tema automatico ripristinato.

**Correzione aggiuntiva richiesta:** spinner history assente durante l’attesa della pagina successiva. Riprodotto nel browser; loading convertito da booleano a signal per notificare la vista OnPush. Test della callback sentinel falliva prima e passa dopo. Browser: spinner presente durante la richiesta trattenuta, rimosso dopo la risposta, 25 righe conservate.

**Verifiche:** 76 test mirati superati in una sola esecuzione, typecheck/template, lint, build production e gate bundle/lazy/styling. Iniziale 954.866 byte. [Notifiche: prove e limiti](NOTIFICATIONS-20B-QA.md); [history](NAVIGATION-QA.md). Nessun commit, segreto o modifica backend; runtime preesistenti riutilizzati e preservati. Restano QA fisica/manuale e prove backend dedicate; prossimo blocco pianificato 20C / e-mail transazionali.

### 2026-10-29 — Offset desktop del dettaglio notifiche

**Correzione su segnalazione:** in apertura/chiusura il margine riguarda il bordo della card, non il titolo interno. Ritorno alla card con 96 px di margine desktop e focus sul titolo; colonna singola desktop allineata al contenitore del dettaglio. Mobile, scroll generale della route e sidebar preservati.

**Verifica:** Playwright prima/dopo, bordo card da −45,25 a 95,75 px rispetto al viewport, header a 54,5 px. Test geometrico con CSS reali; 44 test mirati superati, typecheck/template, lint e styling. [Misure e limiti](NOTIFICATIONS-20B-QA.md). Nessun commit o mutazione reale.

### 2026-10-29 — Seguito: ripristino Router delle notifiche

**Causa mancata nel controllo precedente:** il Router effettua uno scroll tardivo a `[0,0]` al cambio della query; il dettaglio sticky non offre una coordinata documentale stabile. La prima verifica dell’offset non bastava per considerare risolta la segnalazione.

**Correzione:** allineamento desktop dopo Scroll/render, ancorato alla griglia statica in apertura e alla card al ritorno, con cancellazione dello smooth nativo concorrente e animazione del servizio esistente. Configurazione globale del Router e sidebar non modificate; layout mobile preservato.

**Prova:** Playwright dopo 1,2 secondi, apertura/chiusura a 1600 e 1100 px: bordo a circa 96 px, scroll documento diverso da zero e focus ripristinato. Mobile a 375 px senza overflow. Test con reset smooth tardivo: 44 casi mirati superati; typecheck/template, lint e styling. [Dettaglio e limiti](NOTIFICATIONS-20B-QA.md). Nessun commit o mutazione reale.

### 2026-10-29 — 20B: azioni sul backend reale e ripristino account

**Stato:** Implementato, in review.

**Verifica autorizzata:** usato l’account correntemente autenticato, come richiesto dall’utente, con backup degli stati e fixture tecniche locali. Playwright MCP ha eseguito lettura/non lettura, eliminazione singola e azioni globali sulle API reali; caricate entrambe le pagine di 26 record. Inserita una nuova notifica dopo l’apertura della conferma globale: DELETE con il cursore originale, nuovo arrivo conservato. Recupero coerente nelle due schede dello stesso login; nessuna prova di sessioni di accesso indipendenti o invio e-mail/SMS implicita.

**Ripristino:** stati originali dei 23 record verificati dopo transazione con controllo delle revisioni; tutte le 13 fixture soft-dismissed, zero fixture attive. Reload finale: entrambe le schede mostrano i 14 record originali attivi/non letti e sincronizzazione ready. Chiuse soltanto le schede QA; preservati browser dell’utente, runtime e modifiche locali, inclusa quella manuale a similars. Nessuna modifica al codice applicativo o operazione Git di scrittura in questa verifica.

**Evidenze e limiti:** [resoconto completo](NOTIFICATIONS-20B-QA.md), inclusi click forzati dopo controllo del target nei passaggi hidden/visible. Backup locale fuori repository. Gate documentazione e controllo whitespace; nessuna ripetizione delle suite applicative per le sole aggiunte documentali. Restano review manuale, Safari fisico, login indipendenti e CI sul commit finale. Prossimo blocco pianificato: **20C / e-mail transazionali**.

### 2026-10-29 — 20C / PX-15D — E-mail transazionali

**Stato:** Implementato, in review. Avvio dopo smoke test positivo delle notifiche comunicato dall’utente.

**Intervento:** inventariate le 13 chiavi esistenti; corretti titoli MFA nei messaggi assistenza, copy del nuovo ticket e oggetti. CSS centralizzato e inlining tramite adapter esistente, contrasto OTP/footer nei due temi, larghezze e wrapping mobile, istruzioni per scadenza senza TTL fissi nelle e-mail. Anteprime ticket ricavate dal testo Delta con escaping; URL Help normalizzati conservando modalità e ID. Logo conservato; nessuna modifica a segreti, policy o durate server.

**Prove:** cinque test nuovi fallivano prima delle correzioni. Esecuzione finale di 50 test Nest in sei suite superata, incluso MailerModule reale con trasporto JSON e dati sintetici. Typecheck, lint mirato, build Nest e controllo degli asset compilati superati. Playwright MCP: 117 casi di rendering/fallback, focus da tastiera e rilevazione di due fixture negative; 11 test browser aggiunti alla suite critical e caricati con `--list`, senza avviare un browser via CLI. Screenshot ispezionati. [Inventario, comandi e limiti](EMAILS-20C-QA.md).

**Review residua:** client di posta reali, eventuali invii esplicitamente autorizzati, CI e confronto fra riferimento frontend alle 2 ore e TTL per ambiente. Nessuna e-mail/SMS inviata, account modificato, segreto letto o operazione Git di scrittura. Scheda utente e runtime preservati. Prossimo blocco pianificato: **21 / PX-16 — supporto e nuovo ticket**.

### 2026-10-29 — 21 / PX-16 — Supporto e nuovo ticket

**Stato:** Implementato, in review.

**Intervento:** Help con conteggio, pill Tutti/Non chiusi sui dati caricati, paginazione manuale alternativa e stati vuoti/errori distinti. Card e skeleton allineati, quattro tracciati SVG originali conservati, pending/errori per chiusura e riapertura. Nuovo ticket su componenti condivisi; corretto l’invio del documento Quill completo al posto dell’ultima modifica. Bozza conservata su invio non confermato, chiusura bloccata in pending e risposte tardive vincolate alla sessione.

**Verifiche:** cinque test nuovi fallivano prima delle correzioni; esecuzione finale di 53 test mirati superata, inclusi i 7 del setup e Axe sull’editor inizializzato. Otto prove geometriche con CSS reali coprono 64 combinazioni di card/skeleton. Typecheck, lint, build production, gate bundle/lazy e styling superati; iniziale 952.033 byte.

**Browser e limiti:** Playwright MCP, payload/errore/pending su API intercettate senza invio reale. Frame e resize della scheda autenticata instabili: quei tentativi non certificano animazioni, focus o tastiera. Ispezionate copie statiche della UI QA nei due temi e in 12 combinazioni di viewport, con footer raggiungibile. Restano smoke test visibile, Safari fisico e CI. [Resoconto completo](SUPPORT-21-QA.md). Nessun backend, segreto o Git di scrittura; runtime e schede dell’utente preservati. Prossimo blocco: **22 / conversazione ticket**.

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
