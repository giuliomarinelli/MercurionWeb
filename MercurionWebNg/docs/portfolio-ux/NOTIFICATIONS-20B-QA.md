# Notifiche — azioni e recupero

28–29 ottobre 2026 — blocco 20B / PX-15C. Implementazione e verifica Chrome/Playwright dei casi descritti completate; review manuale e prove residue esplicitate sotto. Le comunicazioni e-mail appartengono al blocco 20C.

## Comportamento e contratto

- Conferma esplicita prima di eliminare una notifica o tutte le notifiche. Annullamento ed Escape non inviano richieste; durante la scrittura i controlli e la chiusura sono bloccati. Il focus iniziale è su **Annulla**. Alla chiusura torna all'origine; se la card è stata rimossa, passa al filtro attivo.
- Il backend imposta `dismissedAt` e rimuove la notifica dalle liste dell'utente; non elimina la risorsa collegata. Non esiste un'operazione di ripristino nel contratto corrente. La UI esplicita questo limite senza introdurre un undo fittizio.
- Le azioni globali coprono anche le pagine non caricate e gli elementi esclusi dal filtro, entro il cursore ricevuto dal server. Per l'eliminazione il cursore è acquisito all'apertura della conferma e resta identico nei retry: gli eventi successivi non ampliano il consenso dato dall'utente. Nessuna operazione globale parte senza un cursore disponibile.
- Le azioni singole aggiornano la card interessata senza ricaricare la prima pagina e perdere le pagine successive. Il filtro Non lette resta coerente. Le azioni globali rileggono la prima pagina del filtro attivo, senza presumere quali record appartengano al cursore opaco.
- Pending e spinner identificano la lettura in corso, anche nel dettaglio; i nomi accessibili restano presenti durante lo spinner. Il guard della facade impedisce richieste duplicate prima del nuovo rendering. Anche la lettura automatica all'apertura viene serializzata con le azioni esplicite.
- Un errore di trasporto non è presentato come certezza che la scrittura non sia avvenuta. Il retry ripete lo stesso comando assoluto, con ID/stato di lettura/cursore originali. La conferma di eliminazione resta aperta su errore. Una scrittura riuscita e un successivo errore di rilettura sono esiti distinti: il retry della lista non riesegue la scrittura.
- Risposte di lista/dettaglio partite prima di un aggiornamento vengono riconciliate con le modifiche ricevute nel frattempo. Una rimozione remota non viene annullata da una vecchia pagina, da una lettura pendente o dal retry di una lettura fallita. Una nuova notifica durante un refresh conserva l'avviso di aggiornamento.
- Il servizio pubblica ogni pagina di recovery tramite un Observable: una successione di pagine non perde gli eventi intermedi per la coalescenza dei signal. Contatori e cursori restano quelli del server. Se il recupero fallisce, il fallback esistente continua ogni 25 secondi; la pagina segnala il possibile ritardo e offre un retry senza ripetere la scrittura.

Per una scrittura singola confermata ma non ancora ricevuta tramite recovery, la card riflette temporaneamente lo stato letto/eliminato con un timestamp locale; il successivo recovery fornisce quello autorevole. Non viene inventato un nuovo conteggio globale.

Nessuna modifica a backend, endpoint, contratti, feature flag, segreti o logica della risorsa collegata. L'apertura dei ticket continua a usare il servizio di navigazione esistente; la pagina Help gestisce una risorsa inesistente con la propria pagina 404. Le icone e il fade-in/fade-out del badge non sono stati modificati.

## Prove automatiche

Baseline prima dell'intervento: 35 test mirati superati. Due nuovi test fallivano sul codice iniziale per perdita delle pagine dopo un cambio di lettura e ricomparsa di un elemento rimosso durante una richiesta pendente.

**66 test mirati superati** in un’unica esecuzione finale, inclusi i 7 test canonici del setup; i sottoinsiemi precedenti non vanno sommati. Include test di facade con trasporti controllati e test del template Angular reale: conferma/annullamento, focus iniziale e ritorno, doppio invio, errore/retry, perimetro globale fisso, assenza di cursore, distruzione, aggiornamenti concorrenti e recovery su più pagine. Axe controlla la conferma ordinaria e quella in pending. Restano nella suite le regressioni 20A su geometria 320/375/640/1280 px nei due temi, skeleton, URL, badge e animazione.

Da `MercurionWebNg`:

```powershell
$env:NG_CLI_ANALYTICS = 'false'
$env:CI = 'true'
..\node_modules\.bin\ng.cmd test --watch=false --karma-config=karma.conf.js --include=src/app/pages/notifications/*.spec.ts --include=src/app/components/common/header/header-notifications.component.spec.ts --include=src/app/components/common/notification-button/notification-button.component.spec.ts --include=src/app/services/in-app-notification.service.spec.ts --include=src/app/services/notification-api.service.spec.ts
```

Typecheck/template, lint e build production superati. Gate bundle e lazy boundary superati: bundle iniziale **955.003 / 1.000.000 byte**, 21 moduli CommonJS. Styling e quattro fixture negative, documentazione e `git diff --check` superati; nessuna soglia modificata. Restano i warning preesistenti dei budget CSS. Log locali in `C:/Users/giuli/.codex/artifacts/mercurion-notifications-20b-2026-10-28/`.

Le prove automatiche non modificano notifiche reali e non certificano la consegna di messaggi. I controlli locali sono mirati; nessuna verifica CI remota sul commit finale è stata eseguita dall'agente.

## Browser e limiti

Playwright MCP collegato a `http://localhost:8888/notifications`, con sessione autenticata e 14 notifiche non lette osservate al baseline. Nessuna notifica aperta per marcarla letta, nessuna cancellazione, azione globale o navigazione alla risorsa collegata eseguita sull'account reale.

**Sessione del 28 ottobre:** la finestra Chrome risulta minimizzata e `document.visibilityState` è `hidden`. Le attese di stabilità dei controlli e il rendering Angular della conferma non si completano; un tentativo di apertura non ha prodotto un dialogo osservabile. Il tentativo non costituisce prova di accettazione. Richiesto all'utente di lasciare visibile Chrome per completare la verifica esclusivamente con Playwright MCP.

Durante la sessione sono stati osservati anche errori 502 sul recovery e riconnessioni WebSocket; l’output del processo Nest mostra riavvii, seguiti dal ritorno in ascolto su 8099. Queste osservazioni non sono una prova di regressione del frontend e non costituiscono un esito browser positivo.

Alla chiusura del 28 ottobre restavano da completare le prove browser elencate nel seguito; Safari fisico, review manuale e consistenza fra vere sessioni su dataset di prova autorizzato restano aperti. I test simulati non sostituiscono queste prove e non autorizzano cancellazioni sulle notifiche dell'utente.


## Ripresa del 29 ottobre — Playwright MCP

- Riutilizzati i runtime di sviluppo già attivi. Usato esclusivamente Playwright MCP per il browser, su `localhost:8888`; nessun uso di Computer Use. Working tree precedente preservato, nessun commit.
- Sull’account locale: apertura e annullamento delle conferme singola/globale, focus iniziale su Annulla, Tab confinato nel dialogo, Escape e ritorno del focus. Nessuna richiesta di scrittura sulle notifiche osservata durante questi passaggi. L’attività concorrente dell’utente nelle altre schede non viene usata come prova di consistenza realtime.
- Per le mutazioni è stata creata una scheda con API delle notifiche intercettate da Playwright: fixture con tre record e due pagine, nessuna scrittura inoltrata al backend. Verificati lettura senza perdita delle pagine caricate, permanenza di Segna non letta nel dettaglio, errore 503 sull’eliminazione globale, dialogo mantenuto aperto e retry con lo stesso cursore `qa.4`. Nel pending Annulla/Elimina sono disabilitati ed Escape non chiude; alla risposta la lista mostra lo stato vuoto. La singola eliminazione riuscita resta coperta dai test Angular, senza dichiarare una prova browser riuscita non completata.
- Conferma globale controllata a **375×812, 375×320, 640×500, 768×500 e 1280×720**, in entrambi i temi: nessun overflow orizzontale, pannello contenuto nel viewport, Annulla raggiungibile e focus corretto. A 320 px di altezza il pannello scorre internamente. Tema automatico ripristinato.
- Richiesta dell’utente: pulsanti Elimina della lista, del dettaglio e globale allineati alla variante condivisa **destructive/danger**, come il pulsante finale di conferma. Nessun nuovo colore o CSS ad hoc; aggiunta una regressione sul template e sul background effettivo delle tre azioni.
- **76 test mirati superati in un’unica esecuzione**, inclusa la correzione dello spinner history e i 7 test del setup. Typecheck/template, lint e build production superati; bundle iniziale **954.866 / 1.000.000 byte**, gate lazy e styling verificati. I conteggi delle esecuzioni precedenti non vanno sommati.

Artefatti locali: `C:/Users/giuli/.codex/artifacts/mercurion-notifications-20b-2026-10-29/`. Screenshot mobile chiaro e desktop scuro ispezionati; il desktop include dati di sviluppo nella sidebar e va anonimizzato prima della pubblicazione. Errori 503/404 prodotti dalle fixture sono scenari intenzionali e non errori sul database reale. Le schede in background vengono riportate davanti tramite Playwright prima delle interazioni; i timeout a documento hidden non sono conteggiati come prove superate.

Restano Safari fisico, zoom reale, review manuale, cancellazione singola con backend e dataset dedicati, consistenza fra vere sessioni e CI sul commit finale. Nessuna prova di consegna e-mail/SMS implicita. Prossimo blocco pianificato: **20C / PX-15D — e-mail transazionali**.


### 29 ottobre — Prima correzione dell’offset, risultata insufficiente

Segnalazione desktop riprodotta con Playwright su fixture: chiudendo un dettaglio mentre la card di origine era sopra il viewport, il titolo tornava a −0,25 px e il bordo della card a −45,25 px, sotto l’header fisso alto 54,5 px. Il ritorno ora scorre la card intera con `md:scroll-mt-24`, mantenendo il focus sul pulsante titolo. Misura dopo la correzione a 1600 px: bordo card 95,75 px, titolo 140,75 px, header 54,5 px; circa 41 px di spazio libero. Il filtro di fallback ha lo stesso margine desktop.

Fra 768 e 1279 px l’apertura allinea il contenitore del dettaglio anziché il titolo interno: card 95,75 px, titolo 172,75 px nella fixture lunga a 1100 px. Sotto 768 px resta l’allineamento precedente del titolo, verificato a 375 px con titolo a 96 px. Non modificati lo scroll generale di ingresso nella route, il comportamento affiancato da 1280 px, né lo scroll della sidebar.

Nuovo test con CSS reali e iframe a 1100 px: card intera sotto il margine superiore sia in apertura sia nel ritorno, focus conservato. **44 test mirati delle notifiche superati** in un’unica esecuzione; typecheck/template, lint e styling superati. Questa esecuzione è distinta dalle precedenti 76 prove combinate e non va sommata. Nessuna mutazione reale, commit o riavvio dei runtime preesistenti.


### 29 ottobre — Coordinamento con lo scroll del Router

La prima correzione non copriva il comportamento finale segnalato dall’utente: oltre 1280 px l’apertura non aveva un allineamento locale, mentre `withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })` emette uno Scroll e porta il viewport a `[0, 0]` anche al cambio della query. Inoltre il dettaglio sticky non è un riferimento stabile per calcolare una coordinata nel documento. Il controllo precedente dell’offset era troppo precoce e il relativo test non riproduceva il reset tardivo del Router.

La pagina ora osserva gli eventi Scroll delle transizioni di selezione e riallinea il contenuto dopo rendering e ripristino, tramite il servizio ScrollContextService già esistente. In apertura il riferimento è la griglia statica che contiene il dettaglio; al ritorno è la card selezionata. Un comando instant interrompe l’eventuale smooth nativo verso zero prima di avviare l’animazione posseduta dal servizio, anche se il target coincide con la posizione corrente. Callback tardive controllano selezione, caricamento e conferme; aggiornamenti dati ordinari non generano un nuovo scroll. Nessun cambiamento alla configurazione globale del Router o alla sidebar.

Verifica Playwright su API intercettate, letture già confermate e mutazioni bloccate, **dopo 1,2 secondi** da ogni transizione:

| Larghezza | Apertura: scroll documento / bordo dettaglio | Chiusura: scroll documento / bordo card |
| --- | --- | --- |
| 1600 px | 331,5 / 96 px | 1983,5 / 95,75 px |
| 1100 px | 172 / 95,75 px | 1983,5 / 95,75 px |

Focus correttamente restituito al titolo della card. A 375 px il titolo del dettaglio resta a 96 px, senza overflow. La verifica del punto finale sostituisce la precedente lettura istantanea; non viene dichiarata una risoluzione sulla sola base di quella misura iniziale.

Il test geometrico ora usa un dettaglio sticky a 1600 px ed emette esplicitamente un evento Scroll, con scroll nativo smooth verso zero dopo il primo allineamento, sia in apertura sia in chiusura. **44 test mirati superati**, typecheck/template, lint, styling e build production superati. Gate bundle/lazy superati: iniziale 954.928 / 1.000.000 byte. Restano i limiti manuali, fisici e di CI già indicati.

## 29 ottobre — Mutazioni sul backend reale e due client

Questa verifica supera il precedente limite delle sole API intercettate per le azioni qui elencate. L’utente ha autorizzato l’uso dell’account correntemente autenticato. Usati esclusivamente Playwright MCP, il backend locale su `localhost:8888` e PostgreSQL di sviluppo; nessun invio e-mail/SMS. Le due schede QA condividevano la stessa sessione di accesso, verificata senza esporne l’identificativo: sono due client, **non due login indipendenti**.

Prima delle azioni globali sono stati salvati gli stati originali di 23 record: 14 attivi/non letti e 9 già rimossi. Inserite 12 notifiche QA riconoscibili, senza risorse collegate, e pubblicato il normale evento outbox di aggiornamento. Le azioni sono state eseguite dai pulsanti dell’interfaccia e inoltrate alle API reali, senza intercettazioni o chiamate ai metodi Angular. Lo stato del componente è stato soltanto letto per verificare il recupero.

| Prova reale | Esito osservato |
| --- | --- |
| Paginazione | Caricate entrambe le pagine: 26 record, oltre il limite iniziale di 25 |
| Lettura singola in A | QA01 letta, 26 righe conservate; contatore a 25 e stato letto ricevuti anche in B |
| Ritorno a non letta in B | Contatore a 26 anche in A |
| Eliminazione singola in A | QA02 rimossa dopo conferma; assente in entrambi i client, contatore a 25 |
| Segna tutte lette | PATCH reale con risposta 204; contatori a zero e record persistiti come letti |
| Elimina tutte con nuovo arrivo | Cursore acquisito all’apertura; inserita QA13 prima della conferma; DELETE reale 204 con lo stesso cursore. Rimossa la popolazione precedente, preservata QA13 non letta |
| Recupero nel secondo client | B rimuove le righe eliminate e riceve il contatore 1; osservato l’avviso di nuovi dati. Dopo ritorno visibile, entrambi i client mostrano soltanto QA13 |

Chrome ha alternato documento hidden/visible. Alcuni click Playwright sono stati eseguiti con `force: true` dopo identificazione del controllo e scroll al target: verificano la scrittura reale e il relativo recupero, non certificano la stabilità di tutte le transizioni grafiche. Il tentativo di premere Aggiorna elenco in B non ha trovato il controllo perché la lista si era già aggiornata al ritorno visibile; non viene contato come prova di quel pulsante. Un errore console durante il reload di A proveniva dalla sonda QA `getComponent` chiamata prima della comparsa dell’elemento; corretta la sonda con guard sul DOM, non il codice applicativo. Nessun altro errore/warning osservato nei controlli console finali.

### Ripristino e residui

Ripristinati in transazione gli stati `seen_at`, `read_at` e `dismissed_at` dei 23 record originali, con controllo delle revisioni e blocco delle righe contro modifiche concorrenti. Le revisioni restano monotone. Tutte le 13 fixture QA sono state soft-dismissed secondo il modello dati: non sono presenti nelle liste attive, ma restano record tecnici nel database locale. La verifica successiva conferma corrispondenza degli stati originali e zero fixture attive. Dopo reload entrambe le schede mostrano **14 record, 14 non letti, sincronizzazione ready e nessuna notifica QA**.

Backup degli stati e script della fixture restano fuori repository in `C:/Users/giuli/.codex/artifacts/mercurion-notifications-20b-real-2026-10-29/`; non pubblicare il backup degli identificativi dell’account. Chiuse soltanto le due schede QA, conservando la scheda dell’utente e i runtime preesistenti. Nessuna modifica al codice applicativo in questa verifica, nessuna operazione Git di scrittura o modifica dei segreti. Per l’aggiornamento documentale eseguiti il gate documentazione e il controllo whitespace; le suite applicative già riportate non sono state rieseguite.

Restano review manuale, Safari fisico/zoom, consistenza fra sessioni di accesso indipendenti e CI sul commit finale. Le prove descritte non certificano la consegna e-mail/SMS. Il prossimo blocco pianificato resta **20C / PX-15D — e-mail transazionali**.
