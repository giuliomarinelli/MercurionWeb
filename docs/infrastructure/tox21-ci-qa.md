# T21-05 — CI applicativa e container Tox21

6 novembre 2026. Branch di lavoro `feature/T21-05` nei due repository,
derivati da T21-04 senza merge. La pipeline appartiene al repository Tox21;
Web riceve soltanto questo verbale e l'aggiornamento della roadmap.

## Contratto implementato

Il workflow `Tox21 CI` copre push su develop/feature/release/hotfix/bugfix,
PR verso develop/master e avvio manuale. Non esegue merge, pubblicazioni di
immagini o deployment. Azioni fissate per SHA, permessi `contents: read`,
runner Ubuntu 24.04 senza cache persistente di dipendenze o immagini.

Il job applicativo usa la base Python 3.10.11 e i lock Linux amd64 CPU già
verificati: installazione pulita, hash obbligatori, backend di build fissato,
`pip check`. Il gate stabile **Required gate** dipende da questo job ed è
eseguito con `always()`: ogni esito diverso da `success` lo fa fallire.
Nessun percorso metadata/skip certifica immagini non verificate. Questo crea
il check, senza modificare le impostazioni di protezione dei branch.

I passaggi conservano evidenze distinte:

| Passaggio | Prova |
| --- | --- |
| Statica | Parsing AST dei Python tracciati senza import o I/O applicativo |
| Build validation | Installazione pulita e 99 test autonomi |
| Gruppi espliciti offline | 85 applicativi, 9 modello/export, 5 training sintetico; JSON e log |
| Export QA | Pesi selezionati e soli `X_val.npy`/`y_val.npy` tracciati montati read-only; nessun training reale |
| Tre immagini finali | Build test/staging/production, audit di identità/contenuto e inferenza CPU ripetibile offline |
| Riferimento reale | Quattro molecole, sedici predizioni, tolleranza `1e-6`; soglie/booleani esatti |
| NATS | Cinque subject, namespace corretto, outage e ripresa senza riavvio worker, SIGTERM con uscita 0 |

I gruppi si sovrappongono: non sono 198 test distinti. L'export calibra soltanto
il checkpoint esistente e non modifica i dati/output originali. Il manifest
registra SHA del codice e hash degli input; non certifica retroattivamente la
provenienza dell'addestramento o l'indipendenza dei dati storici. Il pacchetto
generato in CI è QA, senza assegnazione di una release coordinata.

Gli smoke usano broker NATS fissato per digest e rete Docker interna dedicata,
senza porte host o accesso ai servizi personali. La normale CMD avvia il worker
non-root, read-only, senza capability, con `/tmp` dedicata. Le risposte RPC,
non la presenza del processo o un log, stabiliscono la disponibilità iniziale
e quella dopo il riavvio del broker. `StartedAt` invariato dimostra che non è
stato riavviato il worker. Il client di prova usa l'IP interno del broker per
limitare la prova negativa senza attendere la risoluzione DNS del container
spento; il worker mantiene il suo URL NATS ordinario.

Per PubChem passa una richiesta non valida che viene respinta prima del
provider. Questo copre il subject e l'errore di validazione sul trasporto reale,
**non una lookup PubChem riuscita**. Inferenza, descrittori e canonicalizzazione
usano invece Torch/RDKit reali. Non sono introdotti flag auth, chiavi o rotation.

`scripts/smoke_container.py` conserva i log worker/broker prima del cleanup
degli ID posseduti. Il workflow carica i diagnostici anche al fallimento come
`tox21-reports-<sha>-<tentativo>`: report JSON, log di test/build/smoke e identità
immagini. Il pacchetto QA esportato correttamente è un artifact indipendente
`tox21-model-<sha>-<tentativo>`, conservato anche se un passaggio successivo
fallisce. Retention 14 giorni; fallisce anche se l'upload fallisce. I bind mount
scrivibili usano UID/GID del runner. Un arresto forzato del runner
può impedire upload/cleanup; le risorse isolate scadono con il runner.

## Verifiche locali e remote

Locale: YAML parsato, sintassi di 45 file Python verificata; build validation
con 99 test riuscita; 9 test modello e report positivo riusciti. Il gruppo di
riferimento senza pacchetto esce 1 con un errore registrato nel JSON: nessuno
skip silenzioso. Smoke esteso sul target test T21-04 riuscito, compresi cinque
subject prima/dopo outage e arresto 0; risorse isolate rimosse.

Primo tentativo locale interrotto: il client di prova attendeva troppo durante
l'assenza del broker. Corretto il solo harness, con connessione limitata e IP
del broker; nessuna modifica applicativa per far passare lo smoke.

Il [primo run remoto 42271633091](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42271633091),
SHA `ad6fe44cf5d2e1f8e26764d0da9215d3b659387c`, è fallito dopo export: la
directory temporanea pubblicata atomicamente aveva permessi 0700 e proprietario
root, perché generata nel container root. Il runner non poteva leggerla per
build/upload. Il Required gate è fallito; nessun risultato verde dichiarato.
I log GitHub erano disponibili, mentre l'upload artifact del primo tentativo
era fallito anch'esso. Corretto senza cambiare l'exporter o aprire permessi
globali: container test/export con UID/GID del runner, verifica di leggibilità
e upload diagnostici indipendente dal pacchetto. Nessun workaround Windows
o modifica ai file originali.

**CI remota corretta: completata con successo** sullo SHA Tox21
`1e295ce617ce0df3f374e84e094ead4ce0d569c0`,
[run 42272061500](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42272061500).
Job applicativo e **Required gate** entrambi `success`. Tutti i passaggi
implementati sopra sono riusciti, compresi export leggibile dal runner,
riferimento numerico, tre audit e tre smoke completi. Report scaricati e
ispezionati: gruppi 85/9/5 senza failure/error/skip, cinque subject prima/dopo
outage in ogni target e tre arresti con codice 0. Il gate build dei 99 casi
è distinto dai report dei gruppi, senza sommarli come casi aggiuntivi.

Artifact verificati (conservazione GitHub 14 giorni):

| Artifact | ID | Dimensione ZIP |
| --- | --- | ---: |
| `tox21-reports-1e295ce617ce0df3f374e84e094ead4ce0d569c0-1` | `13531085081` | 19637 byte |
| `tox21-model-1e295ce617ce0df3f374e84e094ead4ce0d569c0-1` | `13530410696` | 4136645 byte |

Il pacchetto ha esattamente tre file, `model_version=ci-qa`, export revision
uguale allo SHA verificato e 627 campioni di validazione. Hash pesi:
`cbe915a168b83829e1766655dfd2d9d6ed7047638008f03e0759e0814f700104`;
soglie: `075e33c82c3ea86ef429513a582ce21d2c37094f10a91aedb59a957005c46606`.
Integrità controllata nuovamente dopo il download. Le identità immagini
registrate dagli audit sono locali al runner, senza push/pull da registry:

| Target | Image ID SHA256 |
| --- | --- |
| test | `badd65b5f8daffdd0b17384f84201466c3f9c02324e4cb11938e50861626fb82` |
| staging | `8c39f9551da0fb0baff03519dc3a8180affea70cba37eadf258f8f6afdbe4fca` |
| production | `ab93c47fb4eaff4a9cdbc08f62fca3c0ff8225cc7df6b5f070e1d5efd9e7ca4c` |

Log e report locali in `C:/Users/giuli/.codex/artifacts/t21-05/`.
Il [manuale CI Tox21](https://github.com/giuliomarinelli/MercurionTox21/blob/1e295ce617ce0df3f374e84e094ead4ce0d569c0/docs/ci.md)
contiene i comandi e i prerequisiti.

## Residui

T21-06 aggiorna Compose/riferimenti di distribuzione Web, ancora incompatibili
con il Dockerfile consolidato. T21-07 definisce la consegna coordinata e
T21-08 l'accettazione integrata. Non sono dimostrati provider PubChem reale,
TLS, auth attiva, recovery su una VM distribuita, qualità scientifica o nuova
compatibilità Windows/GPU. Nessuna immagine pubblicata, nessun servizio utente
avviato/arrestato e nessun merge.
