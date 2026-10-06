# Mercurion — Roadmap UX e presentazione portfolio

Data iniziale: 6 ottobre 2026. Stato: pianificazione per lavoro incrementale e review manuale.

## Obiettivo

Portare Mercurion da applicazione utilizzabile a prodotto professionale, piacevole da vedere e da usare, capace di dimostrare competenze avanzate nella realizzazione di interfacce per applicazioni complesse. La qualità deve emergere anche durante un'interazione reale: ricerca, selezione, modifica, caricamento, errore e ritorno al lavoro.

La presentazione non si esaurisce nelle schermate migliori. Un cliente deve percepire chiarezza, coerenza, cura dei dettagli e controllo dei flussi. Il percorso scientifico deve restare comprensibile senza semplificare impropriamente dati o risultati.

Il segmento preciso di clienti non è ancora indicato. Questa roadmap privilegia la qualità di un'applicazione tecnica articolata; messaggi commerciali, promessa della home e percorso dimostrativo definitivo andranno adattati al segmento scelto. Non si presume che tutti i potenziali clienti conoscano la chimica.

## Base di partenza e attendibilità

La lista deriva da:

- Routing e registro delle azioni riletti nel repository corrente.
- Template e componenti esaminati per individuare differenze di gerarchia, spaziatura e composizione rispetto al riferimento settings.
- Audit browser del 6 ottobre 2026 e successiva revisione UX di settings, già documentati negli artefatti locali.

Questa è una roadmap, non un nuovo audit browser completo. Gli interventi proposti non sono tutti regressioni confermate. Ogni blocco deve iniziare osservando lo stato corrente nel browser, perché possono esserci ulteriori modifiche manuali.

Legenda delle evidenze:

- **S**: caratteristica o differenza riscontrata nel sorgente corrente; l'impatto visivo va verificato nel browser.
- **B**: flusso esplorato nell'audit browser precedente; questo non costituisce una certificazione della qualità UX finale.
- **V**: stato ancora da verificare con dati, account o condizioni rappresentative.

Artefatti disponibili sulla macchina di lavoro, esterni al repository:

- `C:/Users/giuli/.codex/artifacts/mercurion-audit-2026-10-06/audit-report.html`: audit regressioni e limiti di copertura.
- `C:/Users/giuli/.codex/artifacts/mercurion-settings-ux-2026-10-06/review.html`: primo riferimento UX settings, schermate e misure responsive.

Settings è un **riferimento implementato da sottoporre alla review manuale**, non un design system definitivo da imporre indiscriminatamente a tutte le pagine. Non rifare le correzioni già applicate senza una nuova evidenza.

Questi documenti non sono task eseguibili del sistema autonomous-development e non autorizzano commit, merge, deploy o operazioni sugli account. Gli identificativi PX servono soltanto al tracciamento del lavoro UX.

## Priorità

- **P1**: esperienza centrale e schermate che mostrano maggiormente il valore del progetto.
- **P2**: fiducia, continuità e qualità dei percorsi complementari.
- **P3**: completamento editoriale e presentazione della demo.

La priorità indica il valore della rifinitura per il portfolio, non la gravità di un bug. Un problema che impedisce un'azione va affrontato prima dell'ordine suggerito.

| ID | Area | Priorità | Evidenze | Stato iniziale |
|---|---|---|---|---|
| PX-01 | Shell, navigazione e orientamento | P1 | S, B | Da affrontare |
| PX-02 | Home e presentazione pubblica | P1 | S, B, V | Da affrontare |
| PX-03 | Accesso e registrazione | P1 | S, B, V | Da affrontare |
| PX-04 | Ricerca molecolare | P1 | S, B | Da affrontare |
| PX-05 | Liste, card e selezione | P1 | S, B | Da affrontare |
| PX-06 | Dettaglio collezione | P1 | S, B | Da affrontare |
| PX-07 | Overlay di gestione collezioni | P1 | S, B | Creazione implementata, in review; altri overlay da affrontare |
| PX-08 | Editor molecolare | P1 | S, B | Da affrontare |
| PX-09 | Salvataggio della molecola | P1 | S, B | Da affrontare |
| PX-10 | Dettaglio molecola e informazioni scientifiche | P1 | S, B | Da affrontare |
| PX-11 | Predizione Tox21 e comunicazione dei risultati | P1 | S, B, V | Da affrontare |
| PX-12 | Dashboard | P2 | S, B | Da affrontare |
| PX-13 | Settings: fasi e stati ancora non conclusi | P2 | S, B, V | Riferimento iniziale implementato; completamento aperto |
| PX-14 | Recupero, attivazione e callback SSO | P2 | S, V | Da affrontare |
| PX-15 | Notifiche | P2 | S, B, V | Da affrontare |
| PX-16 | Supporto, ticket e conversazioni | P2 | S, B | Da affrontare |
| PX-17 | Feedback e contatti | P2 | S, B | Da affrontare |
| PX-18 | Pagine di stato e documenti | P3 | S, V | Da affrontare |
| PX-19 | Componenti, stati e accessibilità trasversali | P1 | S, B, V | Da applicare progressivamente |
| PX-20 | Reattività percepita e movimento | P2 | S, B, V | Da misurare sui percorsi principali |
| PX-21 | Dati e percorso dimostrativo portfolio | P3 | B, V | Da preparare dopo il percorso centrale |

## Lista dettagliata degli interventi

### PX-01 — Shell, navigazione e orientamento

**Perché conta:** header e navigazione accompagnano quasi tutte le schermate e fanno percepire immediatamente quanto il prodotto sia coerente.

**Base:** shell, sidebar desktop e menu mobile già esplorati; header, cronologia e contenuto principale hanno esigenze di densità diverse. Evitare di alterare lo scrolling del documento e i collegamenti a frammento già ripristinati.

**Interventi:**

- Definire un allineamento coerente tra titolo pagina, toolbar, contenuto e gutter della shell.
- Chiarire pagina attiva, percorso di ritorno e differenza tra navigazione e azioni che aprono overlay.
- Rifinire cronologia: nomi lunghi, date, icone, stato vuoto e spazio occupato.
- Verificare menu utente, tema e notifiche: ancoraggio, chiusura, focus e target touch.
- Rendere coerenti le versioni mobile e desktop senza riprogettare la navigazione del prodotto.

**Accettazione:** un utente identifica dove si trova e come tornare indietro; nessun menu nasconde il controllo necessario per chiuderlo; focus e collegamenti restano funzionanti dopo cambi route e breakpoint.

**Sorgenti:** [app.component.ts](../../src/app/app.component.ts), [header](../../src/app/components/common/header/header.component.ts), [sidenav](../../src/app/components/common/sidenav/sidenav.component.ts), [footer](../../src/app/components/common/footer/footer.component.ts).

### PX-02 — Home e presentazione pubblica

**Perché conta:** è la prima impressione e deve spiegare il valore prima di richiedere attenzione o registrazione.

**Base S:** la home introduce lettere con ritardi di 750 ms e mostra le CTA dopo ulteriori passaggi; welcome compone hero, feature, loghi e screenshot. Il tempo fino alla prima azione utile va misurato, non dedotto dalla sola fluidità dell'animazione.

**Interventi:**

- Rendere chiaro cosa permette di fare Mercurion e quali competenze dimostra.
- Valutare durata e sequenza dell'introduzione; rendere tempestivamente disponibili le azioni essenziali.
- Rifinire gerarchia delle CTA, ritmo tra sezioni, larghezza dei testi e allineamento delle feature.
- Aggiornare le schermate dimostrative dopo la rifinitura del prodotto.
- Verificare reduced motion, primo accesso, ritorno alla home e comportamento autenticato.

**Accettazione:** la pagina comunica utilità e azione successiva senza attendere una lunga introduzione; screenshot e promesse corrispondono a funzionalità realmente disponibili. Una modifica sostanziale del messaggio commerciale richiede prima la definizione del segmento clienti.

**Sorgenti:** [home](../../src/app/pages/home.page/home.page.component.ts), [welcome](../../src/app/pages/welcome/welcome.page.component.ts), [hero](../../src/app/components/welcome/welcome-hero/welcome-hero.component.ts), [screenshot band](../../src/app/components/welcome/welcome-screenshot-band/welcome-screenshot-band.component.ts).

### PX-03 — Accesso e registrazione

**Perché conta:** un percorso di ingresso ordinato comunica affidabilità e cura dei form.

**Base S/B/V:** login ordinario verificato; il form credenziali usa anche offset verticali manuali. Registrazione, attivazione e SSO non hanno copertura browser completa nell'audit precedente.

**Interventi:**

- Uniformare larghezza dei form, distanze tra label, campi, errori, suggerimenti e azioni.
- Rendere chiari progressione e ritorno tra inserimento e-mail e password.
- Bilanciare SSO e accesso tradizionale senza cambiare i metodi disponibili.
- Rifinire caricamento della verifica di sicurezza, invio in corso e messaggi del server.
- Verificare tastiera, autofill, password manager e conservazione dei valori dopo errore.

**Accettazione:** nessun salto di geometria compromette l'interazione; errori pertinenti al campo; procedura utilizzabile su mobile e da tastiera. Conservare requisiti e significato delle informative.

**Sorgenti:** [login](../../src/app/pages/login/login.page.component.ts), [form credenziali](../../src/app/pages/login/login-credential-form.component.ts), [scelta SSO](../../src/app/pages/login/login-sso-chooser.component.ts), [registrazione](../../src/app/pages/register/register.page.component.ts).

### PX-04 — Ricerca molecolare

**Perché conta:** è uno dei primi flussi da mostrare nella demo e rappresenta il collegamento tra esplorazione e dati.

**Base S/B:** pannello dedicato con composizione distinta dagli ActionComponents; ricerca personale e ChEMBL già percorse.

**Interventi:**

- Chiarire ambito di ricerca, query corrente e differenza tra risultati personali e ChEMBL.
- Rifinire gerarchia del risultato: nome, struttura, identificativo, origine e azione.
- Curare attesa, nessun risultato, errore e caricamento progressivo.
- Rendere esplicito cosa viene selezionato e dove porta l'apertura di un risultato.
- Verificare tastiera virtuale, Escape, focus di ritorno e scrolling interno.

**Accettazione:** ricerca → risultato → dettaglio è comprensibile e fluido; nomi e strutture lunghe non compromettono la lettura; query e ambito non si perdono in modo inatteso.

**Sorgenti:** [overlay ricerca](../../src/app/components/search-overlay/search-overlay/search-overlay.component.ts), [input ricerca](../../src/app/components/search-overlay/search-input/search-input.component.ts), [risultato](../../src/app/components/search-overlay/search-result/search-result.component.ts).

### PX-05 — Liste, card e selezione

**Perché conta:** griglie e card occupano una parte rilevante dell'esperienza quotidiana.

**Base S/B:** liste molecole e collezioni hanno titoli, gutter e pulsanti locali; la card molecolare condivisa combina apertura, selezione e animazioni. Alcuni controlli hanno padding ridotto senza un minimo touch esplicito.

**Interventi:**

- Coerenza di titolo, ricerca, contatori, CTA e paginazione tra le due liste.
- Bilanciare struttura molecolare, nome, badge e metadati nelle card.
- Distinguere chiaramente apertura del dettaglio, selezione e azioni secondarie.
- Rifinire hover, focus, selezionato, pending e rimozione senza perdere le animazioni esistenti.
- Curare griglie con uno, pochi e molti elementi e stato vuoto con azione utile.

**Accettazione:** nessuna ambiguità tra click di apertura e selezione; selezioni visibili anche senza il solo colore; nomi lunghi e dati mancanti restano gestibili.

**Sorgenti:** [le mie molecole](../../src/app/pages/all-my-molecules/all-my-molecules.page.component.ts), [collezioni](../../src/app/pages/my-molecule-collections/my-molecule-collections.page.component.ts), [card molecola](../../src/app/components/molecule-detail/molecule-summary-card/molecule-summary-card.component.ts).

### PX-06 — Dettaglio collezione

**Perché conta:** mostra la capacità di organizzare strumenti di gestione senza affollare la pagina.

**Base S/B:** toolbar con modifica inline del nome, azioni icona per duplicazione/eliminazione e aggiunta con stile locale. Il layout responsive è già stato corretto, ma la gerarchia delle azioni va rifinita.

**Interventi:**

- Dare priorità al nome e all'aggiunta; separare visivamente azioni distruttive e di gestione.
- Rifinire modifica inline, conferma, annullamento e feedback del salvataggio.
- Allineare filtro, risultati, contatore e paginazione.
- Verificare nome lungo, collezione vuota e filtro senza corrispondenze.
- Curare selezione multipla e conferme con conseguenze esplicite.

**Accettazione:** le azioni principali sono riconoscibili su mobile; nessuna icona richiede il tooltip per essere interpretabile; il risultato del comando resta visibile nel contesto corretto.

**Sorgenti:** [pagina](../../src/app/pages/molecule-collection-detail/molecule-collection-detail.page.component.ts), [toolbar](../../src/app/pages/molecule-collection-detail/molecule-collection-detail-toolbar.component.ts), [paginazione](../../src/app/pages/molecule-collection-detail/molecule-collection-detail-pagination.component.ts).

### PX-07 — Overlay di gestione collezioni

**Perché conta:** sono il prossimo gruppo naturale da portare al livello di settings.

**Base S/B:** flussi esplorati; ogni overlay ha esigenze specifiche. Creazione gestisce anche più nomi, aggiunta combina metodi e risultati, associazione gestisce selezioni, importazione passa tra due overlay.

**Interventi:**

- `CreateCollection`: form, anteprima nomi e stati rifiniti nel blocco del 6 ottobre; **implementato, in review**. Il flusso esistente crea collezioni vuote: l'aggiunta delle molecole avviene successivamente in `AddMoleculesToCollection`, senza introdurre una nuova selezione iniziale.
- `AddMoleculesToCollection`: gerarchia della scelta sorgente, ricerca, selezioni e conteggio; footer prevedibile mentre la lista scorre.
- `BindCollectionsToMolecule`: leggibilità della destinazione, selezione totale/parziale, nomi lunghi e risultato finale.
- `SelectCollectionThenRoute`: scelta della destinazione e passaggio all'importazione senza sensazione di chiusura/riapertura casuale.
- Uniformare gutter, titoli, close, avvisi, caricamenti e disposizione delle azioni, rispettando il comportamento di ogni flusso.

**Accettazione:** l'utente comprende oggetto, destinazione e quantità prima di confermare; annullamento e ritorno non causano perdite inattese; footer raggiungibile con lista lunga e tastiera virtuale aperta.

**Sorgenti:** [creazione](../../src/app/components/action-components/create-collection/create-collection.component.ts), [aggiunta](../../src/app/components/action-components/add-molecules-to-collection/add-molecules-to-collection.component.ts), [associazione](../../src/app/components/action-components/bind-collections-to-molecule/bind-collections-to-molecule.component.ts), [scelta destinazione](../../src/app/components/action-components/select-collection-then-route/select-collection-then-route.component.ts).

### PX-08 — Editor molecolare

**Perché conta:** è una delle parti più distintive del portfolio: integra strumenti specialistici, analisi asincrona e gestione del draft.

**Base S/B:** alternanza standard/live, identità molecolare, Ketcher, reset e salvataggio sono già verificati sul percorso principale; i blocchi informativi e le azioni richiedono una gerarchia complessiva.

**Interventi:**

- Organizzare modalità, area di disegno, identità, analisi e salvataggio secondo l'ordine del lavoro.
- Chiarire significato e differenza delle modalità standard/live e degli stati di analisi.
- Spiegare vicino all'azione perché Salva è disabilitato: struttura vuota, non valida, duplicata o controllo in corso.
- Rifinire altezza e spazio utile del canvas, integrazione dei temi e comportamento tablet/mobile.
- Curare reset, draft modificato e ritorno dall'overlay senza compromettere la struttura disegnata.

**Accettazione:** il percorso disegno → controllo → salvataggio è leggibile; nessuno stato asincrono appare come blocco inspiegato. La correzione di deduplicazione SMILES già applicata deve restare valida.

**Sorgenti:** [editor](../../src/app/pages/molecule-editor/molecule-editor.page.component.ts), [analisi live](../../src/app/pages/molecule-editor/molecule-editor-live-analysis.facade.ts), [Ketcher](../../src/app/components/chem/ketcher-frame/ketcher-frame.component.ts).

### PX-09 — Salvataggio della molecola

**Perché conta:** conclude un flusso complesso e deve trasmettere certezza sul risultato.

**Base S/B:** overlay con scelta/creazione della collezione, form e proprietà; il selettore ha anche un offset `-top-3` nel template corrente.

**Interventi:**

- Chiarire destinazione, dati obbligatori e differenza tra creazione e modifica.
- Rifinire ordine e densità di nome, etichetta, note e proprietà calcolate.
- Rimuovere compensazioni di spaziatura solo dopo avere verificato gli elementi reali che le rendono necessarie.
- Curare creazione di una collezione durante il salvataggio, pending, errore e conferma.
- Mantenere i dati del draft e rendere evidente dove trovare l'elemento salvato.

**Accettazione:** destinazione e azione finale sono inequivocabili; nessuna perdita di input durante errore o cambio destinazione; conferma coerente con i dati effettivamente persistiti.

**Sorgente:** [salvataggio molecola](../../src/app/components/action-components/custom-molecule-collection-item-save/custom-molecule-collection-item-save.component.ts).

### PX-10 — Dettaglio molecola e informazioni scientifiche

**Perché conta:** è la schermata centrale per mostrare dati ricchi senza disorientare.

**Base S/B:** la pagina contiene identità, SMILES, IUPAC, struttura, note, proprietà, collezioni, sinonimi, vie e analoghi; il viewer usa numerose altezze per breakpoint. Sono presenti varianti personale, importata e pubblica ChEMBL.

**Interventi:**

- Separare identità e azioni dai gruppi di informazioni, con una gerarchia riconoscibile.
- Bilanciare spazio del viewer e testo; rifinire stringhe scientifiche lunghe e copia.
- Uniformare titoli, righe di proprietà, unità e valori non disponibili.
- Rifinire note e metadati modificabili senza confonderli con dati di origine esterna.
- Rendere leggibili sezioni lunghe, collezioni associate e navigazione verso gli analoghi.

**Accettazione:** la scheda si può scorrere e comprendere per gruppi; non si tronca informazione scientifica essenziale; dati non disponibili e caricamenti sono distinti; tutte le varianti restano coerenti.

**Sorgenti:** [pagina](../../src/app/pages/molecule-detail/molecule-detail.page.component.ts), [proprietà](../../src/app/components/molecule-detail/molecule-properties/molecule-properties.component.ts), [sinonimi](../../src/app/components/molecule-detail/molecule-synonyms/molecule-synonyms.component.ts), [vie](../../src/app/components/molecule-detail/molecule-routes/molecule-routes.component.ts).

### PX-11 — Predizione Tox21 e comunicazione dei risultati

**Perché conta:** dimostra la capacità di presentare una funzionalità AI scientifica con chiarezza e responsabilità.

**Base S/B/V:** card con identità del modello, spiegazione, avvisi e risultati. Va esaminata con stati completi, parziali e non disponibili, oltre al caricamento.

**Interventi:**

- Separare risultato sintetico, valori per endpoint e spiegazioni del modello.
- Rendere chiari significato delle probabilità, legenda e provenienza usando il contratto e la documentazione esistenti.
- Distinguere risultato negativo, dato mancante, errore e inferenza in corso.
- Evitare che i colori suggeriscano conclusioni di sicurezza non supportate dai dati.
- Rendere gli avvisi pertinenti e leggibili, senza dominare la scheda o nasconderli.

**Accettazione:** il risultato è interpretabile con testo oltre al colore; nessuna soglia, metrica o garanzia scientifica viene inventata per rendere la demo più convincente. Le proprietà normalizzate restano visibili dopo gli aggiornamenti dell'inferenza.

**Sorgente:** [card predizione](../../src/app/components/molecule-detail/t1-prediction-card/t1-prediction-card.component.ts).

### PX-12 — Dashboard

**Perché conta:** deve orientare il lavoro e mostrare dati utili, non soltanto riempire spazio con grafici.

**Base S/B:** metriche e grafici sono già separati in widget; caricamento usa uno spinner fisso, errore un messaggio testuale e i grafici un placeholder di altezza prefissata.

**Interventi:**

- Chiarire significato dei contatori e relazione con il workspace.
- Bilanciare saluto, metriche, composizione e attività recente.
- Rifinire grafici: legenda, etichette, contrasto, tooltip e leggibilità su mobile.
- Curare account nuovo, pochi dati, dati numerosi ed errore di caricamento.
- Valutare accessi rapidi soltanto se utili al percorso esistente, senza inventare nuovi workflow.

**Accettazione:** valori interpretabili e leggibili in entrambi i temi; grafici comprensibili anche senza hover; placeholder compatibili con la geometria finale.

**Sorgenti:** [dashboard](../../src/app/pages/profile/dashboard.page.component.ts), [metriche](../../src/app/pages/profile/dashboard/dashboard-metrics-widget.component.ts), [grafici](../../src/app/pages/profile/dashboard/dashboard-charts-widget.component.ts).

### PX-13 — Settings: completamento degli stati

**Perché conta:** il riferimento iniziale va completato nelle fasi meno frequenti, senza riaprire indiscriminatamente il layout appena rifinito.

**Base B/V:** quattro pannelli e cinque overlay iniziali verificati nei due temi; OTP, QR, attivazione MFA, cambio/rimozione telefono e stati successivi non sono tutti percorsi con effetti reali.

**Interventi:**

- Verificare OTP: istruzioni, errori, countdown, reinvio e ritorno alla fase precedente.
- Rifinire QR, chiave manuale e codici di backup preservando i requisiti di sicurezza.
- Verificare profilo SSO e account con/senza telefono e MFA.
- Controllare successi, errori, loading prolungato e sessioni multiple/realtime.
- Confermare min-height, focus di ritorno, annullamento e link diretti alle sezioni.

**Accettazione:** ogni stato conserva una geometria utilizzabile e indica il passo successivo; nessun dato sensibile appare nelle prove pubbliche del portfolio. Predisporre account/fixture adeguati prima delle verifiche con effetti reali.

**Sorgenti:** [settings](../../src/app/pages/settings/settings.page.component.ts), [workflow dati sensibili](../../src/app/components/action-components/sensitive-data-change/sensitive-data-change-workflow.component.ts), [anagrafica](../../src/app/components/action-components/profile-registry-edit/essential-profile-registry-edit.component.ts).

### PX-14 — Recupero, attivazione e callback SSO

**Perché conta:** la qualità si vede anche quando l'utente deve recuperare un accesso o gestire un link scaduto.

**Base S/V:** percorsi presenti nel routing ma non interamente verificati con token e stati rappresentativi.

**Interventi:**

- Uniformare pagina di richiesta, attesa, conferma, errore e ritorno al login.
- Chiarire differenza tra recupero password e recupero account inaccessibile.
- Curare link scaduti/non validi, codici errati, rete lenta e callback incompleta.
- Ridurre blocchi di testo ridondanti preservando istruzioni e conseguenze di sicurezza.

**Accettazione:** ogni fallimento offre un passo pertinente; nessun vicolo cieco o falso successo; nessuna modifica alla sicurezza per facilitare una dimostrazione.

**Sorgenti:** [password dimenticata](../../src/app/pages/forgot-password/forgot-password.page.component.ts), [reset](../../src/app/pages/password-recovery/password-recovery.page.component.ts), [recupero account](../../src/app/pages/account-recovery/account-recovery.page.component.ts), [attivazione](../../src/app/pages/account-activate/account-activate.page.component.ts), [callback SSO](../../src/app/pages/sso/sso.page.component.ts).

### PX-15 — Notifiche

**Perché conta:** una gestione leggibile degli eventi dimostra cura dell'esperienza anche oltre il percorso principale.

**Base S/B/V:** nell'audit l'account non aveva notifiche. Item pieni, dettaglio, lettura e caricamento successivo richiedono dati rappresentativi.

**Interventi:**

- Coerenza tra popover dell'header e pagina completa.
- Gerarchia di titolo, data, tipo, anteprima e stato letto/non letto.
- Chiarezza di filtri e azioni globali, soprattutto eliminazione.
- Verificare testi lunghi, eventi numerosi, empty state, aggiornamenti realtime ed errori.

**Accettazione:** contenuto e destinazione della notifica sono riconoscibili; il conteggio resta coerente tra header e pagina; gli aggiornamenti non spostano in modo inatteso ciò che si sta leggendo.

**Sorgenti:** [pagina notifiche](../../src/app/pages/notifications/notifications.page.component.ts), [lista](../../src/app/components/notifications/notification-list.component.ts), [item](../../src/app/components/notifications/notification-list-item.component.ts), [header](../../src/app/components/common/header/header-notifications.component.ts).

### PX-16 — Supporto, ticket e conversazioni

**Perché conta:** è una dimostrazione concreta di gestione di contenuti lunghi, rich text e stati di processo.

**Base S/B:** Help, ticket aperto/chiuso e nuovo ticket esplorati. Help usa anche un offset `bottom-[10px]`; il thread ha un proprio limite di altezza basato sul viewport e scroll interno.

**Interventi:**

- Rifinire elenco ticket, stato, data, oggetto e azione di apertura.
- `NewTicket`: gerarchia di oggetto e messaggio, toolbar Quill, errori e azioni finali.
- `TicketDetail`: separare informazioni del ticket, conversazione e composer; curare mittente, orari, messaggi lunghi e stato chiuso.
- Verificare storico lungo, caricamento precedente, posizione di lettura e arrivo di nuovi messaggi.
- Rendere prevedibile lo scrolling con tastiera virtuale e viewport basso.

**Accettazione:** composer e azioni restano raggiungibili; non si perde la posizione di lettura; gli stati aperto/chiuso sono chiari. Nessun messaggio reale viene inviato come semplice prova visiva.

**Sorgenti:** [Help](../../src/app/pages/help/help.page.component.ts), [nuovo ticket](../../src/app/components/action-components/new-ticket/new-ticket.component.ts), [dettaglio ticket](../../src/app/components/action-components/ticket-detail/ticket-detail.component.ts), [thread](../../src/app/components/action-components/ticket-detail/ticket-thread.component.ts).

### PX-17 — Feedback e contatti

**Perché conta:** chiudono l'esperienza e contribuiscono al tono professionale dell'applicazione.

**Base S/B:** feedback ha un avviso introduttivo con icona grande e copy molto enfatico; contatti presenta sezioni con titoli e spaziature locali.

**Interventi:**

- Rendere il tono più sobrio, diretto e coerente con l'identità di Mercurion.
- Equilibrare introduzione, campi, azione e feedback dell'invio.
- Chiarire differenza tra feedback e assistenza tramite ticket.
- Rifinire contatti per utente autenticato/anonimo e leggibilità degli indirizzi.

**Accettazione:** l'utente comprende il canale pertinente e cosa accade dopo l'invio. Non modificare affermazioni su anonimato o privacy senza verificarne la corrispondenza con il comportamento reale.

**Sorgenti:** [feedback](../../src/app/pages/feedback/feedback.page.component.ts), [contatti](../../src/app/pages/contacts/contacts.page.component.ts).

### PX-18 — Pagine di stato e documenti

**Perché conta:** schermate periferiche incoerenti fanno apparire incompleto anche un buon percorso principale.

**Base S/V:** pagine 403/404 e documenti inventariati; la pagina di stato usa un contenitore assoluto e titoli molto grandi.

**Interventi:**

- Controllare 403/404, viewport basso e azioni di ritorno.
- Uniformare tipografia, larghezza di lettura, titoli e link di privacy/termini.
- Verificare indice, frammenti, focus e navigazione dal footer dove presenti.
- Rifinire solo presentazione e accessibilità dei documenti; non riscrivere contenuti legali per ragioni estetiche.

**Accettazione:** documenti leggibili e navigabili; pagine di stato comprensibili, senza CTA tagliate o sovrapposizioni alla shell.

**Sorgenti:** [status page](../../src/app/pages/status-page/status-page.component.ts), [privacy](../../src/app/pages/privacy/privacy.page.component.ts), [termini](../../src/app/pages/terms-and-policies/terms-and-policies.page.component.ts).

### PX-19 — Componenti, stati e accessibilità trasversali

**Perché conta:** la coerenza delle parti ripetute è ciò che rende le pagine un unico prodotto.

**Interventi da applicare ai blocchi, non come refactoring globale preventivo:**

- Definire esempi di titolo pagina, toolbar, form, avviso, lista e footer usando token e componenti esistenti.
- Verificare pulsanti e icone: dimensioni, contrasto, significato, focus, hover, disabled e busy.
- Uniformare loading, empty, error e success distinguendo chiaramente i quattro stati.
- Curare dropdown, tooltip, dialog e toast: ancoraggio, layering, Escape, focus iniziale e ritorno.
- Verificare errori di form associati ai campi, gerarchia delle heading e messaggi live non ridondanti.
- Provare zoom 200%, tastiera, contenuti lunghi e target touch; usare 44 px come riferimento per le azioni mobili importanti.

**Accettazione:** le azioni non dipendono solo da colore, hover o tooltip; l'ordine di focus segue quello visivo; modifiche a un componente condiviso vengono verificate anche negli altri consumatori.

**Sorgenti:** [token](../../src/styles.css), [ActionCard](../../src/app/components/common/action-card/action-card.component.ts), [ActionFooter](../../src/app/components/common/action-footer/action-footer.component.ts), [DialogShell](../../src/app/components/common/dialog-shell/dialog-shell.component.ts), [toast](../../src/app/components/common/toast/toast.component.ts).

### PX-20 — Reattività percepita e movimento

**Perché conta:** una demo gradevole deve rispondere alle azioni e mantenere stabile il contesto, anche durante il lavoro asincrono.

**Base B/V:** nell'audit si sono osservati caricamenti incompleti durante ricompilazioni e un timeout Ketcher. La causa non è stata attribuita al layout: non classificarli come difetti di produzione senza misure su un runtime assestato.

**Interventi:**

- Misurare apertura a freddo e a caldo di ricerca, editor, dettaglio, grafici e ticket.
- Individuare attese senza feedback e salti tra placeholder e contenuto.
- Rifinire durata e coerenza di transizioni, disclosure, selezione e rimozione.
- Verificare reduced motion e condizioni di rete/viewport realistiche.
- Controllare errori e retry di viewer e contenuti differiti prima di introdurre ottimizzazioni tecniche.

**Accettazione:** ogni attesa significativa è riconoscibile e non appare come UI rotta; animazioni non ritardano le azioni essenziali. Definire eventuali soglie prestazionali dopo una misura iniziale ripetibile.

### PX-21 — Dati e percorso dimostrativo portfolio

**Perché conta:** schermate curate con dati poveri, mancanti o incoerenti indeboliscono la dimostrazione delle competenze.

**Base B/V:** l'audit disponeva di alcune fixture utili, ma notifiche vuote e una molecola con dati/SMILES assenti; la fixture cicloesano fu modificata in piperidina mantenendo il nome originario e non va presentata come esempio scientificamente coerente.

**Interventi:**

- Preparare un piccolo dataset dimostrativo locale con nomi, strutture, proprietà, note e collezioni coerenti.
- Definire una sequenza breve: esplorazione → ricerca → dettaglio → organizzazione → editor → salvataggio.
- Aggiungere esempi di testi lunghi, dati mancanti, empty state e notifiche per mostrare la robustezza, senza usare dati reali di clienti.
- Scegliere schermate finali nei due temi e una dimostrazione mobile autentica.
- Annotare, per ogni passaggio, la competenza mostrata: gestione dati, stato asincrono, responsive, accessibilità, integrazione scientifica.

**Accettazione:** la demo si può ripetere con esito prevedibile e dati non sensibili; screenshot corrispondono al prodotto reale; limiti del modello e funzionalità ancora incomplete non vengono nascosti o inventati.

## Copertura esplicita degli ActionComponents

Il registro corrente contiene nove azioni. Nessuna viene esclusa dalla roadmap.

| Scope registrato | Blocco | Lavoro residuo |
|---|---|---|
| `CreateCollection` | PX-07 | Form, anteprima nomi, azioni e stati: implementato, in review |
| `AddMoleculesToCollection` | PX-07 | Sorgenti, ricerca, selezione, lista, conteggio e footer |
| `BindCollectionsToMolecule` | PX-07 | Destinazioni, nomi lunghi, selezione e conferma |
| `SelectCollectionThenRoute` | PX-07 | Scelta e passaggio tra overlay |
| `MoleculeCollectionItemSave` | PX-09 | Destinazione, metadati, creazione/modifica e risultato |
| `EssentialProfileRegistryEdit` | PX-13 | Review del riferimento e stati successivi |
| `SensitiveDataChange` | PX-13 | OTP, QR, backup, varianti account e stati finali |
| `NewTicket` | PX-16 | Rich text, validazione e invio |
| `TicketDetail` | PX-16 | Conversazione, composer, storico e stato ticket |

Fonti: [registro azioni](../../src/app/components/action-components/action-overlay/action-overlay.registry.ts), [routing](../../src/app/app.routes.ts), [manifesto route](../../src/app/route-manifest.ts).

## Ordine di lavoro a piccoli blocchi

Ogni riga è un'unità di lavoro, non una promessa di completamento in un giorno. Una giornata può contenere soltanto osservazione e proposta, oppure implementazione e verifica di un sottoinsieme. Non accumulare più aree incompiute per rispettare il calendario.

| Ordine | Blocco | Risultato concreto da portare alla review |
|---|---|---|
| 01 | PX-07 — Creazione collezione | Un overlay completo come secondo riferimento dopo settings |
| 02 | PX-07 — Scelta destinazione e associazione | Destinazione e selezioni leggibili; passaggio tra overlay chiaro |
| 03 | PX-07 — Aggiunta molecole | Selezione e footer rifiniti con lista lunga |
| 04 | PX-09 — Salvataggio molecola | Form, destinazione e conferma ordinati |
| 05 | PX-04 — Ricerca | Un percorso ricerca → risultato completo nei due temi |
| 06 | PX-05 — Card e selezione | Un esempio riutilizzabile senza perdere comportamenti esistenti |
| 07 | PX-05 — Liste | Toolbar, filtri, paginazione e stati vuoti coerenti |
| 08 | PX-06 — Collezione | Pagina completa collegata agli overlay già rifiniti |
| 09 | PX-10 — Identità, viewer e azioni | Parte iniziale del dettaglio chiara su desktop/mobile |
| 10 | PX-10 — Dati, note e sezioni lunghe | Informazioni scientifiche leggibili e ordinate |
| 11 | PX-11 — Tox21 | Risultati e stati comunicati senza ambiguità |
| 12 | PX-08 — Editor: layout e modalità | Canvas e modalità integrati nella gerarchia della pagina |
| 13 | PX-08 — Editor: stati e percorso finale | Draft, validazione e salvataggio verificati insieme |
| 14 | PX-01 — Shell | Navigazione, menu, cronologia e gutter allineati al percorso centrale |
| 15 | PX-02 — Home e welcome | Prima impressione allineata a schermate reali già curate |
| 16 | PX-03 — Accesso | Percorso e-mail/password/SSO coerente |
| 17 | PX-03/PX-14 — Registrazione e recupero | Stati e token verificati con fixture appropriate |
| 18 | PX-12 — Dashboard | Metriche, grafici e stati rifiniti |
| 19 | PX-13 — Settings: fasi successive | Stati OTP/MFA e varianti account completati con perimetro sicuro |
| 20 | PX-15 — Notifiche | Dataset rappresentativo e percorso lista/dettaglio |
| 21 | PX-16 — Supporto e nuovo ticket | Lista e composizione del messaggio rifinite |
| 22 | PX-16 — Conversazione ticket | Storico, composer e scrolling verificati |
| 23 | PX-17/PX-18 — Pagine complementari | Tono, leggibilità e azioni coerenti |
| 24 | PX-20 — Reattività | Misure e interventi sui soli punti dimostrati |
| 25 | PX-21 — Demo portfolio | Dataset, percorso e schermate finali verificati |

PX-19 accompagna ogni blocco. Non aspettare la fine per curare focus, errori, nomi accessibili e stati di caricamento. Se home o accesso devono essere mostrati subito a un cliente, anticipare i blocchi 15–16 senza aprire un redesign globale.

## Criterio comune di completamento

Un blocco passa da **Da affrontare** a **Implementato, in review** soltanto quando:

- È stato osservato nel browser con dati rappresentativi e il problema/opportunità è descritto concretamente.
- Gerarchia, spaziatura, azioni e copy sono coerenti con il contesto; nessuna funzionalità è eliminata per rendere il layout più semplice.
- Sono stati verificati loading, contenuto, empty, error e success applicabili; gli stati non verificabili sono elencati, non dichiarati passati.
- Sono stati controllati i due temi e le sette dimensioni dell'audit: 360×800, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1920×1080.
- Le interazioni rilevanti funzionano con touch e tastiera, inclusi focus, Escape, scroll e ritorno al contesto precedente. La tastiera virtuale va verificata quando cambia l'utilizzabilità del form.
- I controlli locali sono proporzionati alla modifica; compilazione o test da soli non sostituiscono la prova browser.
- È disponibile un confronto prima/dopo e sono registrati file, prove e limiti nel [diario](DAILY-LOG.md).

Lo stato **Accettato** richiede la review manuale dell'utente. Non equivale a merge o rilascio. La valutazione finale deve riguardare anche il percorso tra le pagine, non soltanto schermate isolate.

## Regole per contenere lavoro e costi

- Una sola area o sottoarea per volta; prima osservare, poi intervenire, poi verificare.
- Usare settings come riferimento di qualità, non copiare la stessa densità in editor, schede scientifiche e conversazioni.
- Preferire token, componenti e dipendenze esistenti; introdurre astrazioni condivise soltanto quando emerge un bisogno reale tra consumatori.
- Preservare tutte le modifiche manuali; mostrare un diff ristretto e leggibile.
- Verificare presto le geometrie critiche a 360 px e su desktop; completare la matrice sul risultato assestato.
- Evitare ricompilazioni ripetute per sole osservazioni; effettuare i controlli necessari sul risultato finale e ripeterli quando una nuova modifica li rende obsoleti.
- Le operazioni reali su credenziali, MFA, messaggi o dati non sono semplici prove di layout: predisporre fixture e un perimetro esplicito.
- Nessun commit, merge o deploy fa parte automaticamente di questa roadmap; la review manuale resta prima dell'integrazione.

## Aree escluse dal percorso pubblico principale

- `/__local/dummy-auth` e `/btn-playground`: strumenti locali/interni; utili per verifica, non tappe del portfolio cliente.
- `/admin/maintenance/:token`: percorso operativo con requisiti specifici; rifinitura separata soltanto se entra nel perimetro di una demo autorizzata.
- Componenti notebook presenti nei sorgenti ma non collegati al routing principale esaminato: non presentarli come funzionalità complete. Decidere prima se debbano far parte del prodotto dimostrato.
- Redirect `/profile`, wildcard e callback SSO non richiedono una nuova pagina decorativa: verificare destinazione, attesa ed errori pertinenti.

## Decisioni da definire quando servono

1. Segmento clienti e messaggio centrale del portfolio, prima di riscrivere home/welcome.
2. Eventuali differenze di enfasi tra esperienza desktop specialistica e mobile consultiva, senza eliminare le operazioni oggi disponibili.
3. Account e dataset dedicati alle prove di notifiche, OTP, recupero e ticket.
4. Percorso pubblico della demo e modalità di accesso: non introdurre credenziali condivise o nuove esposizioni senza una decisione esplicita.

Queste decisioni non impediscono di iniziare il blocco 01: la creazione delle collezioni può essere rifinita mantenendo l'identità attuale e i comportamenti esistenti.
