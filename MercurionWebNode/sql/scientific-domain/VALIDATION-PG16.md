# Verifica DDL scientific-domain su PostgreSQL 16

Data: 21 ottobre 2026. Esito: **PASS nel perimetro SQL isolato descritto sotto**.

## Input e ambiente

- Input: `mercurion_pg16_scientific_domain_v3.zip`, SQL 20 e 21 originali, senza modifiche. Coincidono con i file del repository dopo normalizzazione dei fine riga; gli hash sotto si riferiscono ai byte dello ZIP.
- SQL 20 SHA-256: `f4aafefaa682f20b65d6ed4ff9ccb7f29def252bd6bc671a3c9c77ecb30d6e13`.
- SQL 21 SHA-256: `7925201a6ee962f7da6407cf9dd6ef8914e93e848a9386cca5af753f4b116c32`.
- Server reale: PostgreSQL 16.15 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit.
- Immagine: `postgres@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea`.
- Docker: rete `none`, nessuna porta pubblicata, PGDATA in tmpfs, container con rimozione automatica.
- DDL eseguito come ruolo `app` **non superuser**, proprietario del database/fixture.
- Fixture sintetica: otto tabelle legacy con FK e righe rappresentative; tabelle molecolari, utenti, `lab_notebooks_old` e tabella sentinella indipendente. Non proviene da un dump di `pg_sl`.

## Risultati

- Applicazione transazionale SQL 20: riuscita.
- SQL 21 in sessione separata: **11/11 OK**, nessun BLOCKER.
- Suite comportamentale SQL: **54/54 PASS**. Verifica ownership degli oggetti come `app`, UUID senza default server, dati preservati, pool custom-only, enum e ordinamenti, reorder con vincoli differibili, JSON/checksum, revisioni append-only, transizioni delle esecuzioni, vincoli sulla loro identità, immutabilità dopo completamento/annullamento, archiviazione, unicità con step NULL e cascade dei collegamenti live. Snapshot e storico restano disponibili dopo cancellazione di molecole e sintesi live. Le scritture della suite sono annullate con ROLLBACK.
- Dump normalizzati di schema e dati delle sei tabelle preservate: **identici prima e dopo il reset**. Include utenti, collezioni, item, join, `lab_notebooks_old` e sentinella.
- Sei scenari negativi: riesecuzione; tabella legacy mancante; nuova tabella già presente; funzione trigger già presente; FK esterna verso synthesis; tabella molecolare referenziata mancante. Tutti rifiutati con errore atteso. Schemi invariati dopo il fallimento; nei casi che arrivano ai DROP/CREATE verificato anche il mantenimento delle righe legacy. La FK esterna blocca l’ultimo DROP dopo che i precedenti sono già stati eseguiti nella transazione: rollback effettivamente provato, non soltanto preflight.
- Container finale `eb96b501d6c0` arrestato e rimosso; dati effimeri eliminati. Nessuna connessione o modifica a `pg_sl`.

## Prove e riproduzione

Artefatti locali: `C:/Users/giuli/.codex/artifacts/mercurion-pg16-ddl-2026-10-21/`.

- `results.json`: versione, digest immagine, hash input, isolamento, esiti e rimozione del container.
- `00_fixture.sql`, `40_smoke.sql`, `build_smoke.py`: base sintetica, assert e generatore della suite.
- `run_ephemeral.py`: avvio Docker, creazione fixture, applicazione/verifica, scenari negativi e cleanup in finally. Usa soltanto docker exec sul proprio container, senza connessioni al database dell’applicazione.
- `postflight.log`, `behavior_smoke.log`, log per scenario e `final_schema.sql`: risultati e schema finale.

Riproduzione dalla macchina corrente, con Docker avviato e l’immagine postgres:16-alpine disponibile:

```powershell
python C:/Users/giuli/.codex/artifacts/mercurion-pg16-ddl-2026-10-21/run_ephemeral.py
```

Il runner salva le prove della nuova esecuzione nella stessa cartella. Digest e versione vengono registrati a ogni esecuzione.

## Limiti prima di applicare su pg_sl

Questa prova dimostra che i due SQL funzionano su PostgreSQL 16 e che i vincoli/trigger esercitati si comportano come atteso sulla fixture. **Non certifica le dipendenze, i dati, i permessi o i volumi effettivi di pg_sl**, perché non è stato usato un suo dump.

Prima dell’applicazione restano necessari backup ripristinabile e prova su clone dello schema/dati reali, verifica delle dipendenze esterne e coordinamento tra schema e release Nest/GraphQL. I vincoli di uguaglianza owner e di coerenza tra esperimento/revisione e sintesi/step sono intenzionalmente applicativi: non sono certificati da questa suite SQL. Non verificati qui copy-on-write frontend/backend, richieste GraphQL, concorrenza applicativa o CI remota. Lo script separato `30_custom_identity_guard_pg16_NOT_YET_APPLY.sql` non è stato applicato né incluso nella prova.

Nessuna modifica ai due SQL candidati, commit, merge o deploy eseguita per questa verifica.
