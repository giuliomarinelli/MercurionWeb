# Meilisearch — log e audit separati per ambiente

7 novembre 2026. Correzione su `feature/LOG-ENV-INDICES`, separata dal branch
infrastrutturale dell'owner. Nessun merge o deployment effettuato.

I nomi vengono derivati centralmente da `APP_ENV` nella configurazione
`Meilisearch.logIndexes`, poi acquisiti dai due produttori di eventi outbox:

| APP_ENV | Log di sistema | Audit di sicurezza |
| --- | --- | --- |
| `development` | `logs_development` | `security_logs_development` |
| `test` | `logs_test` | `security_logs_test` |
| `staging` | `logs_staging` | `security_logs_staging` |
| `production` | `logs_production` | `security_logs_production` |

`APP_ENV` resta validato dallo schema canonico. Non usare `NODE_ENV`: staging
può eseguire Node in modalità production. La denominazione infrastrutturale
preview mantiene `APP_ENV=staging`, come già previsto dal progetto.
Non servono nuove variabili o nomi di indici configurabili separatamente.

## Creazione e consegna

Il dispatcher conserva la destinazione registrata nel payload outbox. Non la
ricalcola durante i retry: lo stesso evento continua a puntare allo stesso
indice. Il percorso generico per gli altri documenti Meilisearch non cambia.

L'indice viene creato **al primo inserimento**, non anticipatamente al bootstrap.
Il dispatcher usa già `index(indexName).addDocuments(..., { primaryKey: 'id' })`:
la [creazione implicita è prevista dall'API Meilisearch](https://specs.meilisearch.dev/specifications/text/0124-documents-api.html).
Serve una chiave autorizzata ad aggiungere documenti e creare indici. Non viene
introdotta una seconda procedura di creazione con una race fra create e insert.
Gli indici senza eventi possono legittimamente essere ancora assenti.

Gli indici storici `logs` e `security_logs` non vengono cancellati, rinominati o
migrati. Eventi già persistiti in outbox mantengono il vecchio `indexName`:
non è possibile attribuire retroattivamente un ambiente ignoto per supposizione.
La correzione si applica ai nuovi eventi. Eventuali dashboard/query esterne
devono selezionare i nuovi nomi dopo l'aggiornamento.

Restano invariati redazione, struttura degli eventi, transazioni, deduplica e
semantica asincrona della consegna: il dispatcher attende l'accodamento del task
Meilisearch, non il completamento dell'indicizzazione. La prova seguente attende
anche il task finale per verificare la creazione e il contenuto effettivi.
Separazione degli indici utile al case study; nessuna nuova garanzia forense,
immutabilità, retention o politica di accesso è introdotta.

## Verifiche

**29 test mirati passati** su configurazione e produttori coprono tutti i quattro ambienti,
tutti i sei livelli di log e tutte le sette azioni di audit, inclusa una
transazione già aperta. Il dispatcher è verificato sulla destinazione ricevuta,
sulla chiave primaria `id` e sulla conservazione degli upsert ordinari.
ESLint mirato, typecheck Nest e controlli di confine logger/architettura passati
con le dipendenze esistenti.

```powershell
node scripts/smoke-meili-log-indices.mjs
```

La prova reale usa un Meilisearch effimero fissato per digest e il client JS
0.54.0 già installato, su rete Docker interna, senza porte host e senza volumi
persistenti. Parte senza indici e verifica creazione automatica di tutti gli
otto indici, chiave primaria, lettura dei documenti e isolamento tra ambienti
usando lo stesso ID sintetico. La ripetizione dell'inserimento sostituisce il
documento senza duplicarlo. Task di indicizzazione tutti completati con successo;
container e rete della prova rimossi. Nessun accesso ai dati o alle chiavi del
Meilisearch personale dell'utente, nessun riavvio dei suoi servizi.

Log e report locali in `C:/Users/giuli/.codex/artifacts/meili-log-environments/`.
Il Required gate dello SHA pubblicato resta una verifica distinta da queste
prove locali. Il lavoro infrastrutturale potrà incorporare questa correzione
dopo l'integrazione scelta dall'owner.
