# Molecule Collection: cross-owner links — chiusura incidente (21/10/2026)

**Stato: RIPARAZIONE DB COMPLETATA; postflight SQL superato.**

Fonte della verifica: output pgAdmin fornito dall'operatore del database PostgreSQL 16.10 il 21/10/2026. L'assistente non dispone di connessione al DB e non ha eseguito personalmente gli script.

## Problema iniziale

- 1.511 link in `molecule_collection_items_join`.
- 307 riferimenti con ownership incoerente, tutti ChEMBL, nessun custom.
- 184 link con `join.user_id = collection.user_id` ma `item.user_id` diverso.
- 123 link con `join.user_id = item.user_id` ma `collection.user_id` diverso.
- Diagnostici 00b/00c/00d hanno ricostruito piano deterministico e permesso di riparazione.
- Probabile origine storica: filtri di ownership incompleti nei servizi di associazione multipla, corretti dal commit ff1c5d8b055dcb01c1d96ca97666d113595507e8 del 01/12/2025. Non vi e' prova definitiva senza log storici.

## Operazione DB eseguita dall'operatore

`10_repair_cross_owner_chembl_pg16.sql` terminato con `COMMITTED`:

| Metrica | Quantita' |
|---|---:|
| created_local_chembl_items | 19 |
| updated_joins_to_local_items | 137 |
| deleted_invalid_or_redundant_joins | 170 |
| remaining_cross_owner_joins | 0 |
| removed_legacy_autopurge_trigger | 1 |

Non era autorizzata alcuna cancellazione di molecole o collezioni esistenti.

## Verifica postflight indipendente

L'operatore ha eseguito `11_postrepair_validation_readonly.sql` e mostrato tutti i check `OK`:

| Verifica | Osservato | Atteso |
|---|---:|---:|
| CROSS_OWNER_JOINS | 0 | 0 |
| DUPLICATE_LINK_TRIPLETS | 0 | 0 |
| LEGACY_AUTOPURGE_TRIGGERS | 0 | 0 |
| LOCAL_CHEMBL_PAIRS | 19 | 19 |
| TOTAL_JOIN_ROWS | 1341 | 1341 |

Conteggio finale coerente: 1511 - 170 = 1341.

## Semantica di dominio confermata

- FK singole per accoppiamento debole (senza user_id nelle FK fisiche). Ownership garantita e testata dai servizi Nest in tutte le mutation.
- Rimuovi da collezione = rimozione del join, senza cancellare la molecola.
- Elimina definitivamente una molecola = operazione esplicita con anteprima UX degli impatti; le associazioni *live* possono essere cancellate per FK `ON DELETE CASCADE`.
- Revisioni storiche dei protocolli mantengono snapshot immutabili indipendenti da molecole o sintesi correnti.

## Backend, deployment e verifiche ancora aperti

- Il servizio `MoleculeCollectionService.delete()` e' stato adeguato nel branch corrente per rimuovere solo la collezione.
- `MoleculeCollectionService.duplicate()` rifiuta join con ownership incoerente prima di effettuare una copia.
- Test Jest introdotti in `molecule-collection.service.ownership.spec.ts`, ma non vi e' evidenza di un CI o di una esecuzione test riuscita all'atto della registrazione.
- **Non distribuire un backend vecchio** contenente la query di eliminazione di molecole orfane: potrebbe aggirare l'assenza del vecchio trigger DB.
- Necessari typecheck, test Jest, integrazione PostgreSQL e verifica operativa dei due percorsi prima di dichiarare il deployment coordinato concluso.

## Next

Avviare riconciliazione DB-first PostgreSQL 16 del Notebook/Synthesis (solo tabelle legacy di quei due moduli; DROP RESTRICT e no CASCADE), poi aggiornare entity TypeORM, DTO/GraphQL e UI.
