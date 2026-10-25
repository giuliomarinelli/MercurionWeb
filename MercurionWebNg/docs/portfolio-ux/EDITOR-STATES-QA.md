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
