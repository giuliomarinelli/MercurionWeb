# Blocco 13 — Editor: stati e percorso finale

25 ottobre 2026. **Implementato, in review.** Evidenze locali; nessuna certificazione CI remota o accettazione finale.

## Modifiche

- Cache dell'identità nel draft esistente, tramite BrowserStorageRegistry e descrittori sessionStorage create/edit/duplicate. Conserva SMILES di ingresso, canonical SMILES e risultato del nome per la struttura corrente. Nessuna cache globale crescente.
- Il cambio Disegno/Analisi live riutilizza l'identità, anche dopo la ricreazione della pagina. Cambi di struttura/contesto e cancellazione del draft ne impediscono il riuso improprio. Un nome assente restituito con successo è cacheabile; un errore viene ritentato. Gli archivi precedenti senza identità restano leggibili.
- La verifica duplicati rimane remota e aggiornata, anche quando l'identità è in cache. Errori e duplicati continuano a bloccare il salvataggio. Canonicalizzazione remota per strutture nuove; protezioni sulle risposte tardive preservate.
- Stati distinti per preparazione salvataggio, scrittura e cambio vista; descrizione accessibile del pulsante Salva. La baseline invariata in modifica non appare come un duplicato da correggere.
- Tox21 live: quattro righe stabili durante caricamento/errore/risultati parziali; probabilità e soglia percentuali sempre etichettate, testo leggibile, valori invalidi non presentati come esiti. Conservato l'esito del server prima dell'arrotondamento; esplicitati i limiti della predizione.

## Verifiche

84 test Angular mirati superati: editor, draft, scheduler e widget live. Inclusi cache tra viste/ricreazione del servizio, invalidazione, errori e nomi assenti, duplicati aggiornati, salvataggi e risposte tardive già coperti dalle regressioni esistenti. Test di geometria Tox21 tra caricamento, risultato parziale, errore e stato vuoto.

Superati typecheck/template Angular, ESLint mirato, build production, gate bundle/lazy, controlli styling, typing, storage, colori e semantica interattiva; diff senza errori. Bundle iniziale 954.668 byte sul limite esistente di 1.000.000. Rimangono warning di budget indicativo iniziale e CSS già presenti; nessuna soglia modificata.

Browser Chrome tramite Playwright su localhost:8888, runtime esistenti riutilizzati:

- Creazione da `OCC`: identità ALCOOL / CCO e risultati live reali caricati.
- Due cambi vista: **0 richieste di canonicalizzazione, 0 richieste nome, 2 controlli duplicati** osservati nel traffico dopo il caricamento iniziale. Nessuna intercettazione o iniezione di risultati.
- Apertura dell'overlay Salva e annullamento: identità e disegno conservati; nessuna molecola salvata.
- Verifiche di contenuto e ingombro a 375×812, 768×1024 e 1366×900 in light, 375×812 e 768×1024 in dark; nessun overflow orizzontale, quattro etichette Soglia e azione Salva alta almeno 48 px. Desktop dark osservato dopo reload. Queste prove non certificano i cambi breakpoint continui.
- Tema automatico e viewport originale ripristinati; chiusa soltanto la scheda dell'agente. Runtime dell'utente lasciati attivi.

## Limiti e seguito

- Riprodotto il problema già aperto PX-01: dopo resize desktop → mobile il gutter può conservare 256 px; il reload lo riallinea a 0. Riprendere nel **blocco 14**, isolando il percorso di aggiornamento della shell. Nessun refactor della shell in questa modifica.
- L'automazione dei successivi cambi tema ha incontrato attese su menu in transizione; non si dichiara una nuova matrice responsive completa. Le catture full-page iniziali contengono l'header sticky nel punto di scroll della cattura e non sono prove della posizione del suo bordo superiore.
- Un timeout iniziale del bridge Ketcher e un successivo 504 di nginx su main.js sono stati recuperati con reload; causa non isolata, nessuna modifica all'infrastruttura.
- Restano Safari fisico/tastiera, zoom, review manuale e salvataggio reale su fixture dedicata. Nessuna prova di scrittura sui record esistenti; gli esiti di scrittura sono coperti dai test locali.
- La cache rappresenta l'identità risolta del draft corrente: non aggiunge una scadenza o sincronizzazione dei cambi nome esterni. Il controllo duplicati resta indipendente.

Artefatti locali: `C:/Users/giuli/.codex/artifacts/mercurion-editor-block13-2026-10-25/`, inclusi tests.log, build.log e schermate. Nessun commit, merge, push o deploy.

## Correzione dalla review — Scroll entrando nell'editor

25 ottobre: l'utente segnala lo scroll fino al fondo sia entrando nell'editor sia nei passaggi fra viste. Riprodotto entrando da una lista già scrollata: a 1366×700, posizione finale 341 px su un massimo di 341; il bordo superiore del workspace finisce a −78,6 px. Il focus automatico della textarea nascosta `cliparea` di Ketcher trascina il documento dopo lo scroll di navigazione.

Il bridge conserva il focus necessario alle scorciatoie desktop con `preventScroll`, limitato a quella textarea; gli input ordinari e la protezione tastiera mobile restano invariati. Quando la sessione editor è pronta, la pagina allinea il workspace sotto l'header sticky con 16 px di spazio, usando ScrollContextService. La destinazione dipende dall'inizio del workspace, non dall'altezza dei risultati live. Le attese del componente vengono cancellate all'uscita.

Verificati ingresso in creazione da lista scrollata e cambio Disegno → Analisi live: posizione finale 192 px, bordo workspace 70,4 px, header 54,5 px. Il massimo scroll è rispettivamente 341/482 px, quindi la destinazione non è il fondo. 96 test Angular mirati e 10 test Node del bridge superati; typecheck, ESLint, build production e gate bundle/lazy superati. Inclusi test sulla destinazione con offset header, cancellazione all'uscita e focus senza scroll per il solo controllo nascosto. Rimangono QA fisica Safari e verifica completa delle altre modalità.

Verificato anche l'ingresso dalla funzione Duplica del dettaglio TETRAIDROFURANO: stesso allineamento 70,4 px / header 54,5 px, senza scritture. La modalità modifica resta coperta dai test della pagina, senza salvataggi su record esistenti.

Il blocco 14 è stato interrotto per questa correzione: il difetto gutter/resize resta aperto. Prove e log aggiuntivi in `C:/Users/giuli/.codex/artifacts/mercurion-editor-scroll-2026-10-25/`.

## Seconda review — Identità ancora in caricamento tra viste

25 ottobre: la prima prova con ALCOOL non copriva tutti i casi. Riprodotti due difetti: cancellazione temporanea dell'identità mostrata anche con cache valida; mancato riuso quando Ketcher, ripristinando la stessa struttura, esporta una diversa serializzazione SMILES. Su VENLAFAXINA il passaggio live riordinava le ramificazioni ed eseguiva nuovamente sia canonicalizzazione sia ricerca nome.

Correzione: l'invalidazione dei controlli di unicità conserva l'identità già risolta per la struttura invariata. Il ripristino programmatico non viene segnalato alla pagina come modifica interattiva. Il frame esporta la struttura al termine del caricamento e associa la nuova serializzazione all'identità di ingresso soltanto nella stessa sessione, senza cambiamenti intervenuti durante l'export; la bozza/sessionStorage conserva il nuovo abbinamento. Non vengono confrontati gli SMILES con euristiche di equivalenza chimica. Le modifiche effettive continuano a invalidare l'identità, e i controlli duplicati restano remoti. Una ricerca nome ancora in corso viene riallineata alla revisione corrente, senza accettare risposte obsolete.

Verifica finale con VENLAFAXINA, Disegno → Analisi live → Disegno: nome e canonical SMILES conservati, nessun nuovo spinner nell'area identità e nessuna nuova richiesta di canonicalizzazione/nome; i due controlli duplicati vengono eseguiti. Osservati traffico e mutazioni DOM durante le transizioni, senza iniezione di risultati. 104 test Angular mirati superati, inclusi serializzazione differente, persistenza, modifiche durante l'export e risposte nome tardive. Typecheck/template, ESLint, build production, gate bundle/lazy e policy styling/typing/storage superati. Prove in `C:/Users/giuli/.codex/artifacts/mercurion-editor-cache-visible-2026-10-25/`. QA fisica Safari resta aperta; blocco 14 non avviato nuovamente.

## Review — Colonna live compatta

25 ottobre: su richiesta dell'utente, ridotta l'altezza della colonna per vedere contemporaneamente Tox21, analoghi e canvas. Le righe Tox21 passano da 96 a 48 px; etichetta Probabilità condivisa, valori ed esiti restano leggibili. Soglie e avvertenze sono ora nel tooltip PrimeNG dell'icona info fornita dall'utente, accessibile con hover, focus e click e chiudibile con Escape. Questa scelta aggiorna il requisito precedente delle soglie sempre visibili. Il pulsante ha target 44×44 px e descrizione collegata alle informazioni; tooltip vincolato alla larghezza disponibile sui telefoni.

Ridotte anche le spaziature degli analoghi e della descrizione Analisi live, con metadati degli analoghi da almeno 12 px. Conservata un'area stabile per caricamento, errori e risultati, senza scroll interno aggiuntivo. Su desktop la colonna resta accanto al workspace; su telefono si dispone sotto il canvas.

Chrome locale a 1366×768 e 1600×775, light/dark: colonna alta circa 582 px, da y=70 a y=653, entro l'altezza del workspace. Verificati dati Tox21 reali, stato senza analoghi su VENLAFAXINA e tre analoghi su ALCOOL. A 375×812: nessun overflow orizzontale; tooltip finale entro x=16–349 e y=266–546, su documento largo 365 px. Verificati apertura al focus/click, contenuti delle soglie e chiusura con Escape. La prova a larghezza telefono non sostituisce Safari fisico/touch.

106 test mirati superati, inclusi geometria stabile dei due widget e contenuto/accessibilità delle informazioni; typecheck, lint, build production, policy styling/typing/semantica e gate bundle/lazy superati. Restano gli avvisi indicativi dei budget iniziale/CSS; nessuna soglia cambiata. Schermate e log in `C:/Users/giuli/.codex/artifacts/mercurion-live-compact-2026-10-25/`. Tema automatico e viewport ripristinati; nessuna modifica ai dati o operazione Git. Il blocco 14 resta da riprendere.
