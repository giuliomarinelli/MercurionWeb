# Experimental protocol versioning v1

Stato: regole P1/P2 approvate. Schema e lifecycle da implementare sotto contratto DB-first.

## Oggetti

- NotebookExperiment: identita dell'esperimento e bozza modificabile del protocollo (Quill Delta JSONB, testo server-derived).
- ExperimentProtocolRevision: snapshot immutabile, numero incrementale per esperimento, autore, created_at, checksum semantico e schema_version.
- ExperimentExecution: una concreta esecuzione sperimentale con stato, osservazioni, risultati, started_at e riferimento a una sola revisione dopo l'avvio.

## Stati

- DRAFT: esecuzione non avviata, revisione ancora facoltativa; editing libero dei dati preparatori.
- IN_PROGRESS: revisione obbligatoria, iniziata con protocollo congelato.
- COMPLETED: revisione obbligatoria, risultati consolidati; eventuali correzioni sono tracciate come rettifiche.
- CANCELLED: caso da disciplinare; una esecuzione gia iniziata conserva revisione e cronologia.

Non permettere che un utente cambi protocol_revision_id di una esecuzione gia iniziata.
Non cancellare lo storico implicitamente tramite modifiche di una sintesi o del protocollo in bozza.

## Avvio atomico

Nella stessa transazione:
1. blocca l'esperimento per evitare due revisioni dello stesso numero;
2. verifica proprietario e appartenenza gerarchica dell'esecuzione;
3. costruisce snapshot dal protocollo attuale e dai riferimenti chimici rilevanti (sintesi/step, molecole, reazioni e condizioni pianificate);
4. valida schema dello snapshot e calcola hash canonico;
5. riusa solo una revisione materialmente identica e consentita, altrimenti crea versione incrementale;
6. collega l'esecuzione alla revisione e passa a IN_PROGRESS;
7. restituisce revisione e identificatori stabili.

La bozza puo avere autosave frequente ma non genera revisioni da sola. Lo snapshot non deve dipendere da lookup di dati mutabili per la ricostruzione storica.

## Composizione dello snapshot v1

- schemaVersion, experimentId, protocolDelta, sanitizedText;
- sostanze/strutture rilevanti (almeno canonicalSmiles + identificatori di origine);
- sintesi e step correlati con il loro assetto effettivo al momento del freeze (ruolo, ordine, condizioni, reagenti/prodotti e annotazioni);
- metadati di creazione e versioni del canonicalizzatore;
- tutte le unita chimiche esplicite quando disponibili.

I riferimenti correnti a Synthesis e Molecule restano utili per navigazione, ma non sostituiscono i valori congelati.

## Immutabilita, riproducibilita, versioni

Le revisioni pubblicate sono append-only; il database deve vietare UPDATE e riutilizzi fraudolenti di numerazioni. Impostare protezione contro il cambio del riferimento a revisione dopo l'avvio; valutare un registro di rettifiche per contenuti Completed.
Eliminazione storica e retention restano una decisione separata: per la beta prevedere archivio logico, non cascade silenziosi.

## Migrazione dei dati legacy

Non convertire alla cieca il contenuto testuale/HTML esistente in Quill Delta; mantenere colonne sorgenti fino alla validazione. Le vecchie Pages non devono essere considerate automaticamente esecuzioni avviate: censire dati e attribuire stato DRAFT finche l'utente non dichiara l'esecuzione storica completata.
