# Notifiche — header, lista e dettaglio

27 ottobre 2026 — blocco 20A / PX-15A e PX-15B, implementato e in review. Il blocco 20B resta dedicato alle azioni e alla verifica estesa della consistenza; e-mail e consegna dei messaggi restano separate.

## Intervento

- Gerarchia della pagina allineata a dashboard e superfici esistenti: titolo, descrizione, contatore non lette, filtri con stato accessibile, numero di elementi caricati, categoria e data leggibili.
- Card con titolo e anteprima limitati a due righe, stato letto/non letto esplicito e azioni separate; testo completo nel dettaglio, con ritorno alla lista. Testi senza spazi non allargano il layout.
- Dettaglio affiancato e sticky da 1280 px, con area scorrevole limitata al viewport per contenuti lunghi; sotto questa soglia la selezione mostra una vista dedicata, senza dover scorrere tutta la lista per raggiungerla. Query `notification` conservata su errore, retry esplicito e altri parametri mantenuti alla chiusura. Focus sul dettaglio e ritorno all'elemento della lista, o al filtro se l'elemento non è più presente.
- Skeleton con la stessa altezza minima della card ordinaria. Stati distinti per caricamento, nessuna notifica, filtro senza risultati, errore iniziale e caricamento delle pagine successive. Un errore non diventa un falso elenco vuoto; una pagina successiva fallita conserva gli elementi già caricati.
- Facade locale con protezione delle risposte obsolete: selezione cambiata o chiusa, cambio filtro durante la paginazione e distruzione della pagina. Paginazione senza duplicati, anche in una risposta che ripete lo stesso ID.
- Recupero eventi: le nuove notifiche disponibili producono un avviso con aggiornamento esplicito, senza inserirsi davanti alla lettura corrente. Aggiornamenti e rimozioni dei record caricati vengono applicati al centro; la rimozione del dettaglio selezionato lascia un esito comprensibile.
- Badge con conteggio visibile fino a `99+` e nome accessibile con conteggio completo. Campanella originale conservata. **Fade-in/fade-out di 350 ms mantenuti**, con callback posseduti e cancellabili, conteggio precedente durante l'uscita, protezione dai cambi rapidi e rispetto di reduced motion tramite Tailwind. Nessun nuovo CSS vanilla.
- Catch-up con ancoraggio mobile contenuto nel viewport, distinzione fra notifiche recuperate/non viste e conteggio non lette; errore di acknowledgement con retry. Chiusura anche con Escape e ritorno del focus alla campanella. Il messaggio non ruba il focus quando compare.

Le azioni esistenti restano disponibili. Sono stati aggiunti un blocco minimo contro invii sovrapposti e messaggi di errore per evitare Promise rifiutate senza feedback. Questo non certifica il blocco 20B: restano da verificare conseguenze, conferme, granularità del pending, bulk-through-cursor e scenari concorrenti estesi. Nessuna modifica al backend, ai contratti o ai criteri di cancellazione.

## Verifiche automatiche

**47 test mirati superati** in una sola esecuzione, inclusi i 7 test canonici del setup. I sottoinsiemi precedenti non vanno sommati. I tre nuovi test iniziali fallivano prima del refactor e riproducevano selezione obsoleta, riapertura dopo chiusura e append della pagina sul filtro sbagliato.

Coperti errori/retry di lista e dettaglio, parametri URL, deduplicazione, mantenimento di «Segna non letta» sul dettaglio aperto, notifiche recuperate senza spostamento della selezione, rimozione remota, focus di ritorno, badge 0/1/99+, fade-in/out e callback obsoleti/distruzione. Il test preesistente del catch-up ora individua il vero pulsante Chiudi e verifica che non navighi: il selettore generico `button:last-child` poteva invece attivare Visualizza.

Geometria con CSS reali a **320/375/640/1280 px**, entrambi i temi: dettaglio mobile dedicato, contenuti lunghi e lista dopo la chiusura senza overflow. Card e skeleton ordinari allineati. Catch-up contenuto a 320 e 375 px. Axe sul centro popolato: nessuna violazione serious/critical. Si tratta di fixture Angular con trasporti simulati, non di invii o cancellazioni reali.

Typecheck/template, lint e build production superati. Gate bundle/lazy, controllo styling con quattro fixture negative e documentazione superati. Bundle iniziale finale: **954.487 / 1.000.000 byte**. Le soglie non vengono modificate; i warning preesistenti dei budget restano distinti dagli errori.

Suite riproducibile da `MercurionWebNg`:

```powershell
..\node_modules\.bin\ng.cmd test --watch=false --karma-config=karma.conf.js --include=src/app/pages/notifications/*.spec.ts --include=src/app/components/common/header/header-notifications.component.spec.ts --include=src/app/components/common/notification-button/notification-button.component.spec.ts --include=src/app/services/in-app-notification.service.spec.ts --include=src/app/services/notification-api.service.spec.ts
```

## Browser e accettazione residua

Chrome autenticato tramite Computer Use su `http://localhost:8888/notifications`. Riferimento iniziale vuoto; successivamente la sessione esponeva 14 notifiche, con conteggi non lette diversi nei momenti osservati. Non attribuire questi cambiamenti ad azioni dell'agente né usarli come prova isolata di consistenza realtime.

Verificati lista popolata e dettaglio affiancato desktop, dettaglio dedicato mobile a 375×812, entrambi i temi e focus sul titolo di una notifica **già letta**. Verificati inoltre Indietro e chiusura del dettaglio: dopo la chiusura il focus torna al pulsante della notifica e lo riporta nel viewport (misura osservata: top 726,75 px, bottom 774,75 px su altezza 775 px). Tema automatico e viewport originale ripristinati, schede di verifica chiuse. La cattura immediata dopo il cambio di vista mostrava ancora il frame precedente: le misure DOM e la cattura successiva confermano lista nascosta e dettaglio visibile; la cattura intermedia non è prova di accettazione. L'agente non ha premuto Segna letta/non letta, azioni massive, Elimina o Apri contenuto collegato e non ha generato notifiche. La notifica già letta permette di ispezionare il dettaglio senza la mutazione automatica prevista per quelle non lette.

Artefatti locali: `C:/Users/giuli/.codex/artifacts/mercurion-notifications-20a-2026-10-27/`. Contengono dati di sviluppo: anonimizzare e rivedere le catture prima di pubblicarle nel portfolio.

Restano Safari fisico, zoom, accettazione manuale e CI sul commit finale; paginazione di molte pagine su dataset reale, contenuto collegato eliminato/non accessibile e piena consistenza fra tab/sessioni sono da completare nel blocco 20B. I test e le letture del sorgente non certificano la consegna di e-mail/SMS o notifiche esterne.
