# Conversazione ticket — blocco 22 / PX-16

29 ottobre 2026. Implementato, in review. Perimetro: dettaglio ticket, storico, risposta Quill, aggiornamenti e continuità dello scroll. Elenco e nuovo ticket restano documentati in [SUPPORT-21-QA.md](SUPPORT-21-QA.md).

## Comportamento

- Dettaglio su ActionCard e pulsanti condivisi, con informazioni del ticket, storico e risposta separati. Conservati stato, date, richiedente nello scope supporto e permessi esistenti di chiusura/riapertura. Titoli e contenuti lunghi vanno a capo senza allargare il pannello. Scrollbar thin conservate.
- Il composer invia `event.content`, cioè il documento Quill completo, al posto di `event.delta`, che rappresenta solo l’ultima modifica. Tutte le nove azioni originali della toolbar sono conservate e hanno etichette accessibili. Conservato il tracciato SVG originale dell’orologio nei messaggi e il controllo di chiusura condiviso.
- La bozza si cancella solo dopo `true` dal server. Errore o risposta negativa mantengono testo e formattazione e mostrano un avviso esplicito; nessun reinvio automatico. Il contratto non garantisce l’idempotenza: in caso di esito incerto viene richiesto di aggiornare la conversazione prima di riprovare.
- Durante l’invio editor e azioni concorrenti sono bloccati. Rimossa la falsa possibilità di annullare una scrittura già avviata sul server. Header, Escape e backdrop rispettano il pending. Lo stesso overlay consente invii successivi dopo un successo.
- Non viene più inserito un messaggio ottimistico indistinguibile da un messaggio persistito. Dopo la conferma vengono aggiornati dettaglio e pagine caricate; un errore di aggiornamento resta distinto dall’esito dell’invio.
- Realtime e riconnessione aggiornano il contenuto senza smontare il composer o annullare un invio in corso. Refresh falliti conservano messaggi e bozza. Una chiusura remota rende la bozza non inviabile, conservandola nel pannello. Cambio di ticket/scope e distruzione invalidano le risposte precedenti.
- Lo storico apre sugli ultimi messaggi. Caricare pagine precedenti conserva il messaggio visibile e il suo offset; nuove risposte seguono il fondo solo se il lettore era già in fondo o aveva appena inviato. Altrimenti compare «Nuovi messaggi · Vai agli ultimi». L’azione esplicita rispetta reduced motion.
- Paginazione con deduplicazione per ID, avanzamento anche sulle pagine completamente sovrapposte e ordinamento cronologico anche quando nuovi arrivi spostano i confini delle pagine. Errori di pagina hanno retry esplicito, senza ciclo di richieste provocato dallo scroll.
- Errori di chiusura/riapertura visibili e azioni serializzate. Quando un comando cambia il pulsante disponibile, il focus passa al comando sostitutivo; per la chiusura utente passa al controllo di chiusura del pannello. Help recupera il focus sulla nuova istanza della card se l’aggiornamento dell’elenco ha rimosso il controllo originario; se il filtro la nasconde, usa il titolo della pagina.

Tailwind 4 per layout, dimensioni, spaziature e stati. Il solo CSS aggiunto riguarda il DOM Quill generato: il foglio della libreria è fuori dai layer Tailwind e richiede override espliciti per colori, contrasto e focus. Nessuna nuova dipendenza o modifica backend/GraphQL/feature flag.

## Verifiche automatiche

Esecuzione finale: **69 test mirati superati**, inclusi i 7 del setup canonico. I conteggi intermedi non vanno sommati.

Copertura: documento completo, conservazione/cancellazione della bozza, invii ripetuti, mancata conferma, refresh durante un invio, errori di pagina e refresh, pagine sovrapposte, ordinamento dopo nuovi arrivi, risposte obsolete e permessi; geometria reale dello scroll per prepend/append; continuità del focus dopo riapertura; pending e cicli successivi della sessione overlay. Axe sull’editor realmente inizializzato nei due temi, senza escludere il controllo di contrasto.

Durante le verifiche sono stati rilevati e corretti anche il colore ereditato dal composer isolato in dark mode e la perdita del focus dopo la sostituzione del comando. Questi casi hanno controlli dedicati; i test di creazione generici non sono usati come prova di qualità visiva.

Da `MercurionWebNg`:

```powershell
..\node_modules\.bin\ng.cmd test --watch=false --karma-config=karma.conf.js --include=src/app/components/support/ticket-composer/ticket-composer.component.spec.ts --include=src/app/components/action-components/ticket-detail/*.spec.ts --include=src/app/components/action-components/action-overlay/action-overlay.component.spec.ts --include=src/app/services/context/action-context/action-overlay-context.service.spec.ts --include=src/app/components/action-components/message-item/message-item.component.spec.ts --include=src/app/services/graphql/help.service.spec.ts --include=src/app/pages/help/help.page.component.spec.ts
```

Lint mirato, typecheck, build production, gate bundle/lazy, styling con quattro fixture negative e semantica interattiva verificati. Il build mantiene i warning preesistenti dei budget iniziale/CSS; soglie invariate. Bundle iniziale **954.595 / 1.000.000 byte**, 21 moduli CommonJS; log finali negli artefatti locali.

## Playwright MCP

Usata esclusivamente una scheda QA dedicata su `http://localhost:8888/help`, con la sessione di sviluppo già disponibile. Query ticket e mutazioni della prova intercettate: **nessun messaggio, chiusura o riapertura inoltrati al backend**, nessuna e-mail/SMS inviata.

Sul runtime Angular reale, con fixture sintetiche:

- Digitazione in più passaggi e payload con HTML e documento Delta completi.
- Errore HTTP 503 con bozza conservata; successivo invio trattenuto per osservare readonly e blocco chiusura/Escape; conferma simulata con bozza svuotata e messaggio recuperato tramite query.
- Caricamento precedente con scostamento misurato dell’ancora di circa **0,11 px**. Nuova risposta simulata tramite aggiornamento esplicito: posizione di lettura a 140 px conservata, bozza conservata e pulsante nuovi messaggi presente. L’invalidazione realtime è coperta separatamente dai test automatici, senza simulare eventi sul server.
- Tema chiaro e scuro a **320×568, 375×812, 375×320, 640×500, 768×600, 1280×900**: pannello contenuto nel viewport, nessun overflow orizzontale, pulsante invio raggiungibile scorrendo. Sono resize Chrome reali, non prove della tastiera iOS.
- Scope supporto: richiedente visibile, stato chiuso, invio disabilitato e riapertura disponibile; errore e successo del comando simulati. Dopo la riapertura il focus è su «Chiudi ticket»; Escape chiude il pannello e il focus ritorna al pulsante della card ricreata. Nell’ultima prova i click usano `force: true` per bypassare l’attesa di stabilità: certificano la risposta e il focus risultante, non il normale hit testing durante una transizione.

I tentativi interrotti dal live reload durante i build non costituiscono evidenza di focus o transizione. Nessun uso di Computer Use o browser CLI.

Artefatti: `C:/Users/giuli/.codex/artifacts/mercurion-ticket-22-2026-10-29/`, con log finali, matrice viewport e screenshot nei due temi. Screenshot ispezionati: `detail-light-375.png`, `detail-dark-1280.png`.

## Accettazione residua

- Smoke test con invii autorizzati e persistenza reale, incluse notifiche e aggiornamenti fra client indipendenti.
- Safari fisico con tastiera aperta, zoom reale e lettura assistita; il viewport Chrome a 375×320 è solo una verifica di spazio ridotto.
- Review manuale dell’utente e CI sul commit risultante. Nessuna CI remota dichiarata superata da queste prove locali.

Nessun segreto letto o modificato, nessuna operazione Git di scrittura, nessuna modifica a processi o schede dell’utente. Il prossimo blocco pianificato è **23 / PX-17 e PX-18 — pagine complementari**.
