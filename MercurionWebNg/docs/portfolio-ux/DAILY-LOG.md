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
