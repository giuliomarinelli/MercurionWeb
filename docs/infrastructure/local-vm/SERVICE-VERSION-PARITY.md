# Parità dei servizi server con lo sviluppo

**Vincolo esplicito dell'owner, 12 novembre 2026:** le versioni dei servizi
Docker server non devono differire tra sviluppo e staging. Le prove di
readiness e RPC già concluse non dimostrano la compatibilità dei dati né
autorizzano divergenze di versione. Prima di importare dati o consolidare lo
staging, risolvere i disallineamenti sotto. Nessun container o volume è stato
modificato, fermato, aggiornato o declassato durante questa verifica.

## Fonte di riferimento

`docker_sl/docker-compose.yml` definisce i servizi di sviluppo effettivi.
Per PostgreSQL rimanda a `docker_sl/Dockerfile.postgres`. Autenticazione,
reti, limiti di risorse e gestione dei segreti possono differire tra ambienti;
la versione del motore server non deve essere scelta indipendentemente.

Redis, NATS e Meili sono già fissati per digest nel Compose di sviluppo.
PostgreSQL ha una base fissata, ma installa pgvector via APT senza una versione
esplicita. Nginx usa un tag: alla riproduzione occorre fissare anche questi
elementi senza cambiare implicitamente le versioni di riferimento.

## Confronto verificato il 12 novembre

Le versioni di sviluppo sono state lette dai binari nei container già
esistenti; quelle degli artefatti VM dai medesimi binari nelle immagini
identificate dalle ricevute pubbliche di load/save, senza rete o volumi.
Non è stata aperta una nuova sessione SSH per questa indagine.

| Componente | Sviluppo effettivo | Artefatto VM attuale | Esito |
| --- | --- | --- | --- |
| PostgreSQL | 16.10 | 16.15 | Diverso patch level |
| Redis | 8.2.2 | 7.2.17 | Diversa versione major |
| NATS Server | 2.12.1 | 2.15.2, con patch crypto della ricetta | Diversa versione minor/build |
| Meilisearch | 1.14.0 | 1.56.2 | Diversa versione minor |
| Nginx edge | 1.27.5 | 1.30.6 | Diversa versione minor |
| pgvector, versione nel file di controllo installato | 0.8.5 | 0.8.7 | Diversa versione dell'estensione disponibile |

**pgvector richiede una distinzione aggiuntiva:** nel database di sviluppo
`mercurion`, `pg_extension.extversion` è **0.8.1**, mentre il file di controllo
del pacchetto installato dichiara default **0.8.5**. La versione nel catalogo e
il pacchetto disponibile non sono la stessa osservazione. Non eseguire
automaticamente `ALTER EXTENSION`, non presumere una versione HNSW dal solo
Compose e non confondere questa lettura con una verifica del catalogo VM.
L'estensione effettiva nella VM andrà acquisita nel prossimo inventario guest.

Comandi di sola lettura ripetibili sul Docker host di sviluppo:

```powershell
docker --context desktop-linux exec pg_sl postgres --version
```

```powershell
docker --context desktop-linux exec redis_sl redis-server --version
```

```powershell
docker --context desktop-linux exec nats_sl /nats-server --version
```

```powershell
docker --context desktop-linux exec meilisearch_sl /bin/meilisearch --version
```

```powershell
docker --context desktop-linux exec nginx_sl_dev nginx -v
```

```powershell
docker --context desktop-linux exec pg_sl cat /usr/share/postgresql/16/extension/vector.control
```

```powershell
docker --context desktop-linux exec pg_sl psql -U app -d mercurion -At -c "SELECT extversion FROM pg_extension WHERE extname='vector'"
```

L'ultimo comando legge solo il catalogo locale via socket; non invia password
negli argomenti e non modifica estensioni o dati.

## Correzione da pianificare prima del caricamento

**Audit eseguito:** tutte e cinque le immagini di sviluppo sono bloccate dalla
policy strict. [Risultati, comando ripetibile e vincolo Nginx HTTP-only](SERVICE-SECURITY-AUDIT.md).
Non caricare queste immagini sulla VM solo per riprodurre le vecchie versioni.

**Scelta owner acquisita:** preparare aggiornamenti coordinati sviluppo/staging
nelle linee compatibili e collaudarli su copie isolate. Ricette, comandi ed
evidenze dei candidati sono nella seconda parte del
[rapporto di sicurezza](SERVICE-SECURITY-AUDIT.md#candidati-coordinati-preparazione-e-limiti).
L'allineamento dei servizi attivi non è ancora eseguito.
L'[adozione operativa](SERVICE-UPGRADE.md) usa le stesse immagini verificate,
Compose shared/preview versionati e overlay `docker_sl/compose.coordinated.yaml`
per lo sviluppo, con volumi separati per evitare riavvii impliciti sui dati vecchi.

1. Trattare il Compose di sviluppo come riferimento; registrare versione e
   identità delle immagini e delle estensioni, inclusa la distinzione pgvector.
2. Confrontare ogni candidato VM con questa baseline prima del deploy. Un
   futuro controllo automatico deve fallire su divergenza, non limitarsi a
   verificare che un'immagine risponda alla health.
3. Conservare la policy CVE strict. Se un artefatto conforme alla versione di
   sviluppo non supera la scansione, rendere esplicito il blocco: non bypassare
   la policy e non aggiornare soltanto lo staging per superarla. Un eventuale
   aggiornamento coordinato va deciso e collaudato in sviluppo prima di
   adottarlo negli altri ambienti.
4. Preparare ricette e artifact conformi, con prove su copie isolate. Non
   montare volumi creati con una versione diversa sotto un binario più vecchio
   assumendo che il downgrade sia supportato. Anche la sostituzione dei server
   cambia ID/identità registrati e richiede riconciliazione del recovery.
5. Solo dopo questa verifica definire il restore dei due indici Meili e degli
   embedding. Il salto Meili 1.14 → 1.56 discusso nell'analisi precedente non
   è una decisione approvata: resta soltanto una caratteristica degli artefatti
   attualmente divergenti.

Il piano dati rimane sospeso mentre l'owner prepara l'archivio. La landing
privata può restare visibile, ma non rende lo staging conforme al vincolo di
parità. Questa pagina registra la diagnosi e il vincolo, non l'allineamento
dei container, che non è ancora stato eseguito.
