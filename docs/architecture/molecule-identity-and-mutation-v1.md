# Molecular identity and mutation policy v1

Stato: regole M1/M2/M3 approvate. Specifica di dominio DB-first, non attestazione dello stato corrente del codice.

## Identita

Il punto canonico di confronto v1 e una stringa canonical_smiles validata e canonicalizzata sul backend tramite RDKit con configurazione deterministica e documentata. Per la beta si considera identica una struttura con identica stringa canonica, NON genericamente una "molecola equivalente".

La normalizzazione deve esplicitare il comportamento di:
- stereochimica (distinguere enantiomeri e isomeri se codificati);
- isotopi;
- sali/frammenti;
- stati di protonazione e cariche;
- tautomeri.

Non introdurre equivalenza tautomerica, deprotonazione/neutralizzazione o rimozione automatica di sali senza una specifica decisione chimica. Canonicalizzazione = criterio operativo v1, non equivalenza chimica universale.
Registrare una versione della policy/canonicalizzatore per consentire future reindicizzazioni. Non normalizzare diversamente in percorsi di creazione e modifica.

## Identita persistente e mutabilita

- Unique index PostgreSQL 16 parziale: (user_id, canonical_smiles) WHERE type = 'custom'.
- Check che un custom abbia uno SMILES non nullo/non vuoto.
- Trigger database che impedisce UPDATE di canonical_smiles, type e user_id per record di tipo custom esistenti.
- Sono mutabili i soli metadati espressamente permessi; modificare una disposizione grafica Ketcher non implica necessariamente modificare canonical_smiles.
- ChEMBL non viene modificato; per la sintesi si risolve o crea un item custom.
- Non fidarsi di un controllo duplicati effettuato soltanto nel frontend o di SELECT seguito da INSERT senza indice UNIQUE.

## Contratto backend desiderato

Servizio condiviso di risoluzione molecola custom con input struttura, access context e metadati opzionali. In una operazione:
1. canonicalizza e valida la struttura (fuori dalla transazione se il calcolo non usa il database);
2. consulta il record del proprietario con stessa canonical_smiles;
3. se presente lo restituisce senza sovrascriverne automaticamente nome, note o proprieta;
4. altrimenti prova a creare la molecola;
5. su SQLSTATE 23505 associato all'indice UNIQUE canonico riesegue la lettura e riusa la risorsa vincitrice (race-safe);
6. in caso di contesto sintesi associa la molecola al pool e gli eventuali riferimenti nello stesso confine transazionale.

I vincoli di ownership e l'unicita sono autorita del DB; validazione e messaggi di UX restano a livello app. Mappare 23505/23514 a errori applicativi distinti e non a 500 indiscriminati.

## Save UX

- Stesso canonical_smiles del record aperto: nessuna duplicazione; salvataggio dei soli metadati/grafica pertinente.
- Smiles nuovo mai visto: crea custom, e nel contesto sintesi sostituisci esclusivamente riferimenti selezionati.
- Smiles nuovo gia presente: mostra riuso dell'esistente con scheda molecolare e scelta di collegamento.
- Le azioni "sostituisci nel passaggio" e "sostituisci nella sintesi" richiedono selezione esplicita di occorrenze; nessuna mutazione globale nascosta.
- Blocchi concorrenti/timeout e problemi di RDKit mostrano uno stato recuperabile; la bozza locale Ketcher non va persa.

## Conservazione e cancellazione

La cancellazione definitiva di una molecola e' esplicita: prima il backend mostra il numero di sintesi, step e link live che saranno rimossi, poi richiede conferma informata e verifica nuovamente le dipendenze al commit.

L'utente ha scelto ON DELETE CASCADE per i riferimenti live alla molecola: cancellazione molecule -> pool -> step items e cancellazione dei link execution/molecule. Le versioni immutabili dei protocolli conservano i propri snapshot e non perdono il contenuto storico.

La rimozione dell'ultima appartenenza a una collezione NON equivale alla cancellazione della molecola: rimuovere sia trg_purge_orphan_items sia il cleanup automatico equivalente nel codice Nest prima di attivare i CASCADE. CASCADE automatico attivato da un trigger sul join sarebbe una cancellazione senza conferma UX e va evitato. Il backend non deve nascondere fallimenti di cancellazione dietro Boolean false generici.

## Tests richiesti

Doppia creazione concorrente dello stesso SMILES; doppia creazione su collection differenti; update con identita invariata; update con struttura cambiata; reuse fra sintesi; cross-owner; struttura con stereochimica diversa; errore 23505 dopo gara; blocco 23514 lato DB; cancellazione di join ancora referenziata da sintesi; fallback RDKit e preservazione bozza.
