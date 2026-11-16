# Ripristino della delivery preview — 13 novembre 2026

## Obiettivo e punto di partenza

Ottenere uno staging funzionante, non soltanto container avviati o HTTP 200.
Questa pagina è il percorso corrente per correggere la consegna esistente.
Non ripetere i vecchi bootstrap o il reset SQL per tentativi.

Restano da conservare i volumi, la tabella `molecule_embeddings`, il suo HNSW
già verificato valido/pronto (circa 10 GB), le credenziali e le regole di rete.
Non eseguire `down -v`, cancellazioni di volumi o rigenerazioni dei segreti.
Nessuna rinomina di database o ruolo è compresa in questa procedura.

## Cosa è dimostrato e cosa manca

| Area | Evidenza | Conseguenza |
| --- | --- | --- |
| Schema | Il bootstrap originale usa `DataSource.synchronize`, mentre lo sviluppo ha default e trigger nel DDL PostgreSQL | Il solo confronto con le entity non prova la parità con sviluppo |
| Ricostruzione SQL | L'ultima esecuzione mostrata ha SQLSTATE 55P03, senza ricevuta finale | Non considerare lo schema ricostruito; non ripetere DROP alla cieca |
| ChEMBL | La procedura Meili lascia ancora aperta l'importazione dei due indici | Il completamento del dataset non è attestato |
| Molecole iniziali | `InitialWorkspaceService` scrive cinque riferimenti in PostgreSQL; la pagina li completa interrogando `molecule_details_chembl_36` | Un errore di caricamento non dimostra che quei cinque riferimenti siano assenti |
| Ricerca | Il backend usa `molecule_previews_chembl_36` e `molecule_details_chembl_36` | Servono documenti, impostazioni e grant reali, non soltanto indici log e chiavi create |
| Registrazione | HTTP 200 con `false` è stato osservato | Separare presenza utente e lock Redis; non dedurre la causa dal solo status HTTP |
| Inspector | HTTP 200 su VM e Windows | Conferma la raggiungibilità, non il funzionamento dei breakpoint o dell'app |
| Access/Tunnel | L'owner ha visualizzato l'app attraverso preview.mercurion.app | Non è una prova della correttezza di DB, dataset o funzionalità |

Le osservazioni sono riferite ai sorgenti locali e agli output dell'operatore.
Non sostituiscono un inventario aggiornato dei container realmente distribuiti.

## 1. Fotografare lo stato senza modificarlo

In VS Code riprendere un eventuale processo in pausa e disconnettere la sessione
debug. Conservare la richiesta fallita in Network: URL, status e corpo `errors`
GraphQL, evitando cookie, Authorization, token e dati personali. Non serve
seguire l'esecuzione dell'intera codebase con breakpoint.

Nella **shell Ubuntu**:

```bash
sudo docker ps -a --no-trunc --format 'Nome={{.Names}} Immagine={{.Image}} Stato={{.Status}}'
```

Questa lettura permette di distinguere server adottati, applicazioni correnti e
vecchi container di rollback. Non avviare questi ultimi.

In **pgAdmin**, sul collegamento staging già aperto, eseguire il file
[91_inventory_application_data.sql](../../../MercurionWebNode/sql/bootstrap/application/91_inventory_application_data.sql).
Sono sole letture: identità del database, numero utenti, riferimenti iniziali e
default utenti. Non contiene email, password o un reset e non legge embedding.
Se segnala una colonna assente, conservare l'errore: è una divergenza da verificare,
non un motivo per aggiungere colonne manualmente.

## 2. Ricostruire una consegna coerente

Prima dell'esecuzione, il pacchetto di consegna deve specificare:

1. revisione esatta dei tre componenti applicativi e digest delle immagini;
2. motori dati compatibili con sviluppo e scansioni secondo la policy strict;
3. DDL PostgreSQL esportato e revisionato, inclusi default, trigger, indici,
   sequenze e reference data; il provisioning non deve derivarlo da synchronize;
4. due indici ChEMBL con formato di trasferimento compatibile con la versione
   effettiva di Meili, checksum, impostazioni, conteggi e task conclusi;
5. nomi e valori non segreti verificati, conservando quelli concordati; segreti
   forniti dall'owner nei file privati, mai in Git o nell'output;
6. Compose e Nginx leggibili, percorsi effettivi, ordine di avvio, ripresa dopo
   reboot e rollback che conservi i volumi.

Non copiare un volume Meilisearch acceso e non avviare una versione differente
su una directory dati esistente. La scelta concreta del trasferimento richiede
prima versione sorgente/destinazione e inventario degli indici; non è ancora
una fase operativa completata.

## 3. Condizioni per dichiarare pronta la preview

Registrare separatamente questi esiti sullo stesso insieme di immagini e dati:

- schema conforme al DDL concordato, embedding e HNSW conservati;
- registrazione di un indirizzo nuovo e attivazione, senza falsi conflitti;
- login locale e SSO ORCID con creazione utente;
- cinque molecole iniziali e prima collezione leggibili dopo nuovo accesso;
- ricerca ChEMBL di `aspirin`, apertura dettaglio e importazione nella collezione;
- lettura delle molecole personali e salvataggio/riapertura;
- RPC Tox21, sessione e realtime attraverso Nginx e Cloudflare;
- recupero dopo reboot senza rigenerare credenziali o inizializzare il database.

Health, SPA HTTP 200, matrice fixture e RPC isolato restano prove utili ma non
soddisfano da soli questa accettazione. Il CD automatico non deve essere attivato
su questa baseline prima del completamento e della verifica della nuova procedura.

### Inventario ricevuto il 13 novembre: confronto con i bundle

I digest comunicati dall'owner per gli otto servizi applicativi/dati coincidono
con i metadati pubblici dei bundle vm045-applications/ready e vm047-adoption/ready:
Nest, Angular, Tox21, Nginx, PostgreSQL, Redis, NATS e Meilisearch.
Web Node e Web Ng sono entrambi alla revisione d227dbf4216ce2ceb865a9b315ae52169c9e8c6e;
Tox21 è alla revisione d506101ec27c985ef4ddb280266bfcdc4b6bf1c4.
Questo esclude un'immagine diversa da quella consegnata, non prova che tali
revisioni siano aggiornate rispetto allo sviluppo né che configurazione e dati
siano corretti. I vecchi quattro server risultano fermi e sono risorse di rollback.

Lo screenshot SQL conferma i default epoch-millisecondi di users.created_at e
users.updated_at nel database interrogato. Non conferma l'identità del target
usato da Nest, l'equivalenza dell'intero schema o il successo del reset SQL.
Per i risultati precedenti di 91_inventory_application_data.sql, eseguire
separatamente ogni SELECT dal Query Tool e annotare database/utente, utenti,
riferimenti_molecole_iniziali, utenti_con_riferimenti_iniziali e collezioni_iniziali.
Non è necessario ripetere il reset o modificare ancora i default.

### Risultati SQL confermati dall'owner — 13 novembre

- Collegamento pgAdmin: database mercurion_preview, ruolo mercurion_preview,
  server 172.19.0.2, porta 5432.
- Cinque riferimenti starter in molecule_collection_items, appartenenti a un utente.
- Una collezione con system_key mercurion:starter-workspace.
- users.created_at e users.updated_at: NOT NULL, default epoch in millisecondi presente.
- Il numero totale utenti non è visibile nelle schermate ricevute; non assumerlo.

Queste evidenze escludono l'assenza globale dei riferimenti starter nel DB
interrogato, ma non provano che appartengano alla sessione browser corrente,
che Nest usi lo stesso target o che tutti i dati siano leggibili dalla API.
Non ripetere il reset per correggere il messaggio di caricamento della pagina.

Prossima lettura dal browser, senza breakpoint o modifiche:
F12 > Rete > cancellare soltanto la lista delle richieste visualizzate >
premere Riprova nella pagina Le mie molecole > selezionare la richiesta API
che fallisce (normalmente POST /api/graphql) > Risposta.
Annotare lo status HTTP e soltanto message/code dell'eventuale array errors.
Non esportare HAR o Copia come curl: possono includere cookie e token.
Se non c'è risposta HTTP, annotare l'errore di trasporto e l'URL senza query string.
Questo distingue una risposta applicativa da una richiesta annullata dal client.


## Ricerca molecolare: causa confermata dalle risposte GraphQL (13 novembre)

Le risposte del browser identificano due errori Meilisearch `index_not_found`:

| Operazione GraphQL | Indice mancante |
| --- | --- |
| moleculeSearch_excludeAlreadyAdded | molecule_previews_chembl_36 |
| paginatedMoleculeCollectionItemsByCollection | molecule_details_chembl_36 |

I cinque riferimenti starter e la collezione esistono in PostgreSQL. La API
recupera i dettagli molecolari da Meilisearch: se quell'indice manca, anche
la pagina delle molecole personali fallisce. Questo errore non richiede di
ricreare PostgreSQL, la tabella embeddings o l'indice HNSW.

Verifica locale di sola lettura: il container di sviluppo meilisearch_sl è
in esecuzione e il binario riporta Meilisearch 1.14.0. L'immagine consegnata
alla VM riporta anch'essa 1.14.0 nelle label; la versione del binario in
esecuzione sulla VM non è stata interrogata in questa verifica.

Passaggio da completare: trasferire dall'istanza di sviluppo soltanto i due
indici ChEMBL, includendo documenti, primary key e impostazioni, verificando
conteggi e completamento delle task. Conservare gli indici di log e le chiavi
applicative già presenti su staging. Non copiare sopra il volume Meilisearch
attivo e non usare un ripristino che richieda di svuotare l'istanza.

Il helper esistente scripts/infrastructure/meili_logical_transfer.py esporta
tutti gli indici e le API key; il suo restore richiede un target vuoto.
Non è quindi utilizzabile senza adattamento per questa importazione selettiva.
Nessun trasferimento ChEMBL è stato effettuato con questa diagnosi.
Registrazione, SSO e affidabilità del debugger restano verifiche separate.


Procedura selettiva: [Trasferimento ChEMBL e indici log](CHEMBL-TRANSFER.md). Export/import reali ancora da eseguire.
