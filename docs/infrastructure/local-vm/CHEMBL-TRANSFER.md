# Trasferire ChEMBL dallo sviluppo a preview

## Scopo e prerequisiti

Questa procedura copia soltanto `molecule_previews_chembl_36` e
`molecule_details_chembl_36`, con documenti, primary key e impostazioni.
Non modifica PostgreSQL, embeddings, HNSW o API key. Non sostituisce il volume
Meilisearch. Sul target verifica inoltre i quattro indici log; crea solo quelli
mancanti con primary key `id`, senza alterare impostazioni o documenti esistenti.

La sorgente locale è `meilisearch_sl`, raggiungibile da Windows a
`http://127.0.0.1:7700`. La destinazione è raggiungibile esclusivamente attraverso
il forward SSH locale `http://127.0.0.1:17700`. Entrambi i binari devono essere
Meilisearch **1.14.0**: lo script rifiuta versioni diverse. Non aggiornarli per
eseguire il trasferimento.

Occorre Python 3.11 o successivo, senza pacchetti aggiuntivi. La master key di
sviluppo è quella configurata per il servizio Meilisearch nel Compose
`docker_sl/docker-compose.yml`, campo `MEILI_MASTER_KEY`. La master key staging
è quella conservata dall'operatore nel password manager e nella sezione server
della configurazione privata preview. Non usare le due chiavi applicative al
posto della master. Lo script richiede le chiavi a prompt nascosto, non le salva
nel bundle né le stampa. Non incollarle in chat o nella riga di comando.

L'export contiene dati molecolari e impostazioni, non API key. Lasciare liberi
sul disco Windows almeno i byte necessari alla copia logica JSON: possono
superare la dimensione del database indicizzato. Non modificare/importare dati
nei due indici sorgente durante l'export. Non avviare due copie dello script.

## 1. Esportare sul PC Windows

**PowerShell Windows**, dalla quale è disponibile Python. Non dalla shell Ubuntu.
La cartella di destinazione deve essere nuova; lo script non la sovrascrive.

```powershell
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/transfer_chembl_indexes.py export --directory C:/Users/giuli/.mercurion/preview/chembl-transfer-01
```

Inserire al prompt la master key **sviluppo**. Il comando esegue solo GET sulla
sorgente. Scrive batch JSON da 5.000 documenti e, soltanto al termine,
`manifest.json` con conteggi, primary key, impostazioni e SHA-256 dei batch.
Mostra indice, documenti esportati e totale. Il successo è `status: exported`.
Una cartella senza manifest finale è incompleta: non importarla. In caso di
errore conservarla; una nuova esportazione deve usare una cartella nuova.

## 2. Preparare la destinazione prima dell'importazione

Il Compose operativo prevede ancora 1 CPU e 768 MiB per Meilisearch. Prima del
carico completo verificare le risorse effettive e lo spazio libero della VM;
l'esportazione non richiede alcuna modifica alla VM. Non sottrarre memoria al
PostgreSQL attivo senza pianificare la distribuzione complessiva dei 28 GiB.

Individuare il container Meilisearch **in esecuzione**, evitando quello vecchio
conservato per rollback. Nella **shell Ubuntu SSH**:

```bash
sudo docker ps --filter label=com.docker.compose.service=meilisearch --format 'Nome={{.Names}} ID={{.ID}}'
sudo docker inspect --format 'CPU_Nano={{.HostConfig.NanoCpus}} RAM_bytes={{.HostConfig.Memory}} Reti={{range $name, $net := .NetworkSettings.Networks}}{{$name}}:{{$net.IPAddress}} {{end}}' $(sudo docker ps -q --filter label=com.docker.compose.service=meilisearch)
df -h /var/lib/docker
free -h
```

Se la prima lettura mostra più di un container, identificare quello attivo prima
di proseguire. L'ultima lettura mostra memoria disponibile nell'intera VM,
non un'autorizzazione ad assegnarla tutta a Meilisearch.

Per aprire il forward, copiare l'IP sulla rete `mercurion_stg_search` ottenuto
dall'inspect. In una **nuova PowerShell Windows**, sostituire `IP_MEILI`:

```powershell
ssh -N -T -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -L 127.0.0.1:17700:IP_MEILI:7700 mercurion-server
```

Lasciare aperto questo terminale. Se esiste già un forward corretto sulla porta
17700, usare quello; non avviarne un secondo. L'IP può cambiare dopo una
ricreazione del container. Non pubblicare 7700 sulla LAN.

## 3. Importare attraverso il forward

Solo dopo il controllo delle risorse, in **un'altra PowerShell Windows**:

```powershell
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/transfer_chembl_indexes.py import --directory C:/Users/giuli/.mercurion/preview/chembl-transfer-01
```

Inserire la master key **staging**. Lo script controlla prima credenziale e versione
con `GET /version`, poi verifica tutti gli hash prima della prima scrittura.
Se il prompt Python non permette l'incolla, usare il prompt PowerShell descritto
nella sezione «403 e inserimento della chiave da PowerShell» in fondo alla guida.
Rifiuta indici ChEMBL già presenti senza il journal di questo
bundle, anziché svuotarli o sovrascriverli. Verifica i log esistenti e crea gli
eventuali mancanti:

- `logs_staging`;
- `security_logs_staging`;
- `logs_production`;
- `security_logs_production`.

Per ciascun indice ChEMBL crea l'indice con la primary key originale, applica
le impostazioni, carica un batch alla volta e attende l'esito della task.
Il terminale mostra task in attesa/elaborazione e batch completati. Al termine
verifica conteggio dei documenti, primary key e impostazioni. Questa verifica
non è una rilettura integrale di tutti i documenti del target.

Il successo finale è `status: passed`, `chemblIndexes: 2`, `logIndexes: 4`,
`apiKeysChanged: false`. È un esito di importazione, non l'accettazione funzionale
dell'applicazione o la verifica dei permessi delle chiavi applicative.

### Interruzioni e ripresa

Il journal locale `import-journal.json` conserva le task accettate dal server e
i batch completati. In caso di sola interruzione del trasporto, riaprire il
medesimo forward e rieseguire **lo stesso comando import con la stessa cartella**:
attende la task pendente e salta le operazioni completate. Non cancellare il
journal o gli indici. Una task `failed`, un hash diverso o un indice inatteso
richiedono diagnosi; ripetere il comando non corregge la causa. Un'interruzione
tra l'accettazione HTTP della task e il salvataggio del journal può richiedere
riconciliazione manuale; non aggirare le protezioni cancellando risorse.

## 4. Verifica dal browser

Con la sessione preview autenticata, ricaricare Le mie molecole e verificare i
cinque elementi iniziali; cercare `aspirin` in ChEMBL, aprire un dettaglio e
verificare che le risposte GraphQL non contengano errori `index_not_found` o
di autorizzazione. Nessun reset PostgreSQL è necessario per questi errori.

## Collaudo della procedura

Il 13 novembre sono passati tre test di contratto e un collaudo con due server
Docker Meilisearch reali 1.14.0 **temporanei**, dati sintetici, ricerca filtrata,
conservazione del log esistente, creazione dei log mancanti e replay del journal.
Il primo tentativo del collaudo reale, con limite 512 MiB e senza limitare la
memoria d'indicizzazione, si è interrotto per disconnessione del server. Il
collaudo riuscito usa 1 GiB e memoria d'indicizzazione 128 MiB per ciascuna
istanza temporanea. Non è un dimensionamento validato per il dataset ChEMBL.
Nessuna importazione del dataset reale su staging è attestata da questi test.

Riferimenti API: [documenti](https://www.meilisearch.com/docs/reference/api/documents/list-documents-with-get)
e [impostazioni](https://www.meilisearch.com/docs/reference/api/settings/list-all-settings).

## ChEMBL — export completato, controllo VM prima dell'import

Manifest locale verificato: Meilisearch 1.14.0; 2.644.421 documenti per indice,
529 batch per indice. Primary key: id (previews), stableUuid (details).
Bundle JSON circa 15,4 GiB (16.519.546.217 byte). Questo non stima lo spazio
finale degli indici né lo spazio temporaneo necessario all'indicizzazione.

Prossimo passo: sole letture dalla shell Ubuntu SSH. Nessuna modifica ai limiti.

```bash
sudo docker inspect --format 'CPU_Nano={{.HostConfig.NanoCpus}} RAM_bytes={{.HostConfig.Memory}} Reti={{range $name, $net := .NetworkSettings.Networks}}{{$name}}:{{$net.IPAddress}} {{end}}' $(sudo docker ps -q --filter label=com.docker.compose.service=meilisearch)
sudo docker stats --no-stream
free -h
df -h /var/lib/docker
```

Riportare gli output prima di avviare l'importazione. Serve la disponibilità
effettiva della VM perché PostgreSQL era stato aumentato a 24 GiB e Meilisearch
ha ancora nel Compose un limite di 768 MiB. Non ridurre o ricreare PostgreSQL
in questo passaggio. Il bundle resta sul PC; l'import previsto usa HTTP via SSH.

## ChEMBL — risorse temporanee Meilisearch prima del carico

Letture ricevute: Meilisearch 1 CPU/768 MiB, IP 172.18.0.2; VM circa 25 GiB
disponibili e 120 GiB liberi su disco. PostgreSQL usa circa 479 MiB ma mantiene
un tetto di 24 GiB: il tetto non è memoria prenotata. Non modificarlo in questo passo.
Il generatore server attuale imposta inoltre max_indexing_memory=64Mb e
max_indexing_threads=1. Questi valori vanno superati esplicitamente per il carico.

Impostazione temporanea scelta per import: Docker 6 CPU/12 GiB, memoria totale
con swap 12 GiB (nessuna swap aggiuntiva per questo container); indicizzazione
6 GiB e 6 thread. Non è una garanzia di durata né un limite dell'intero processo
pari a 6 GiB: il tetto dell'intero container è 12 GiB.
Le opzioni CLI prevalgono sul TOML (documentazione Meilisearch configuration file).

### Shell Ubuntu SSH — creare un override leggibile senza sovrascriverne uno esistente

```bash
(set -C; cat > "$HOME/meili-import-resources.yaml" <<'YAML'
services:
  meilisearch:
    cpus: 6
    mem_limit: 12g
    memswap_limit: 12g
    command: ["--config-file-path", "/run/mercurion/server.toml", "--max-indexing-memory", "6GiB", "--max-indexing-threads", "6"]
YAML
)
```

Nota: la proprietà Compose corretta è memswap_limit, senza underscore tra mem e
swap. Non usare mem_swap_limit. Se il file esiste già, il comando si ferma:
conservarlo e verificarlo prima di proseguire.

### Validare e applicare al solo Meilisearch

```bash
sudo docker compose --env-file /dev/null -f /opt/mercurion/releases/upgrade-6d019947800b4578bc2b5d40791f5132/shared-servers.json -f "$HOME/meili-import-resources.yaml" config --quiet && sudo docker compose --env-file /dev/null -f /opt/mercurion/releases/upgrade-6d019947800b4578bc2b5d40791f5132/shared-servers.json -f "$HOME/meili-import-resources.yaml" up -d --no-deps --pull never meilisearch
sudo docker inspect --format 'CPU_Nano={{.HostConfig.NanoCpus}} RAM_bytes={{.HostConfig.Memory}} Comando={{json .Config.Cmd}} Reti={{range $name, $net := .NetworkSettings.Networks}}{{$name}}:{{$net.IPAddress}} {{end}}' $(sudo docker ps -q --filter label=com.docker.compose.service=meilisearch)
```

Questo ricrea soltanto il container Meilisearch, riusando il volume, la master key
e le reti del Compose di base. C'è una breve indisponibilità di ricerca/log.
Non avvia l'import. Riportare il readback prima di procedere; attesi 6000000000
NanoCPU, 12884901888 byte RAM e i due flag di indicizzazione nel comando.
L'IP può cambiare: il tunnel 17700 deve puntare all'IP effettivo del nuovo container.
Il backend potrebbe richiedere il rinnovo delle connessioni se conserva il vecchio IP.

Mantenere entrambi i file -f per i successivi up durante il carico; il solo file
di base ripristinerebbe 768 MiB/1 CPU. Dopo il carico, il dimensionamento stabile
va deciso dai consumi reali: non tornare automaticamente a 768 MiB. L'override
è non segreto e sopravvive al reboot nella home, ma i segreti sotto /run no.

## ChEMBL — risorse applicate, apertura tunnel e importazione

Readback ricevuto dall'operatore: CPU_Nano=6000000000, RAM_bytes=12884901888,
CLI max-indexing-memory=6GiB e max-indexing-threads=6. IP invariato 172.18.0.2.
Container Meilisearch avviato; il dataset non è ancora importato.

1. In una PowerShell Windows dedicata, se il forward 17700 non è già aperto:

```powershell
ssh -N -T -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -L 127.0.0.1:17700:172.18.0.2:7700 mercurion-server
```

Lasciare aperto questo terminale. Non aprire un secondo listener sulla stessa porta.

2. In un'altra PowerShell Windows:

```powershell
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/transfer_chembl_indexes.py import --directory C:/Users/giuli/.mercurion/preview/chembl-transfer-01
```

Al prompt inserire la master key STAGING dal password manager, non quella di sviluppo
né le chiavi applicative. I batch vengono letti dal PC e inviati via HTTP dentro
il tunnel SSH; non occorre copiare il bundle sulla VM. La prima fase controlla
gli hash di circa 15,4 GiB e può non stampare avanzamento finché non è completata.
Poi vengono verificati/creati i quattro indici log e caricati i due indici ChEMBL.
Il terminale stampa task e batch; conservare aperto anche il terminale del tunnel.
Riportare il riepilogo finale, oppure il solo errore. Non cancellare journal o indici.

## Import ChEMBL interrotto: no_space_left_on_device

Esito ricevuto: status=failed, code=task-failed-no_space_left_on_device,
automaticCleanup=false. Non è ancora accertato quale filesystem o limite
abbia causato l'errore. Prima dell'import erano disponibili circa 120 GiB
sulla root; il disco virtuale da 200 GiB non implica che tutti fossero liberi.
Non eliminare volumi, batch, dati, indici o import-journal.json; non rilanciare.

Sole letture nella shell Ubuntu SSH:

```bash
df -hT /var/lib/docker
df -i /var/lib/docker
sudo docker exec mercurion-u6d019947800b4578bc2b5d40791f5132-shared-meilisearch-1 df -h /meili_data /tmp
sudo docker exec mercurion-u6d019947800b4578bc2b5d40791f5132-shared-meilisearch-1 df -i /meili_data /tmp
sudo docker system df
```

La root e il volume /meili_data vanno distinti dal tmpfs /tmp, che ha un limite
proprio. Le letture non effettuano pulizia né riprendono l'importazione.
Riportare tutti gli output per identificare il limite realmente raggiunto.

## Correzione spazio temporaneo ChEMBL e ripresa della task 470

Evidenza: root e /meili_data hanno circa 116 GiB disponibili e inode liberi;
/tmp è un tmpfs limitato a 64 MiB. Non è esaurito il disco virtuale. Il tmpfs
piccolo è la causa sospetta principale; il suo contenuto può essere rilasciato
alla fine della task fallita. Non attribuire l'errore a una partizione piena.
Il journal identifica task 470, batch molecule_previews_chembl_36-001435000.json.

Spostiamo i temporanei tramite TMPDIR su una directory del volume dati già
scrivibile. Non aumentiamo il tmpfs in RAM e non eliminiamo dati o indici.

### Shell Ubuntu SSH

```bash
sudo docker exec mercurion-u6d019947800b4578bc2b5d40791f5132-shared-meilisearch-1 mkdir -p /meili_data/import-tmp
nano "$HOME/meili-import-resources.yaml"
```

Il file completo deve diventare:

```yaml
services:
  meilisearch:
    cpus: 6
    mem_limit: 12g
    memswap_limit: 12g
    environment:
      TMPDIR: /meili_data/import-tmp
    command: ["--config-file-path", "/run/mercurion/server.toml", "--max-indexing-memory", "6GiB", "--max-indexing-threads", "6"]
```

Salvare in nano con Ctrl+O, Invio, Ctrl+X. Poi validare e ricreare il solo Meili:

```bash
sudo docker compose --env-file /dev/null -f /opt/mercurion/releases/upgrade-6d019947800b4578bc2b5d40791f5132/shared-servers.json -f "$HOME/meili-import-resources.yaml" config --quiet && sudo docker compose --env-file /dev/null -f /opt/mercurion/releases/upgrade-6d019947800b4578bc2b5d40791f5132/shared-servers.json -f "$HOME/meili-import-resources.yaml" up -d --no-deps --pull never meilisearch
sudo docker exec mercurion-u6d019947800b4578bc2b5d40791f5132-shared-meilisearch-1 sh -c 'printf "TMPDIR=%s\n" "$TMPDIR"; df -h "$TMPDIR"'
sudo docker inspect --format 'Reti={{range $name, $net := .NetworkSettings.Networks}}{{$name}}:{{$net.IPAddress}} {{end}}' mercurion-u6d019947800b4578bc2b5d40791f5132-shared-meilisearch-1
```

Attesi TMPDIR=/meili_data/import-tmp e filesystem ext4 con circa 116 GiB
liberi, non il tmpfs da 64 MiB. Controllare l'IP prima di riusare il forward:
se differisce da 172.18.0.2, chiudere/riaprire il tunnel con il nuovo IP.

### Ripresa dopo la verifica — PowerShell Windows

Lo script è stato esteso con un retry esplicito della sola task documenti
fallita per no_space_left_on_device, verificando indice, tipo, stato e journal.
Quattro test mirati passano, incluso il rifiuto del retry non corrispondente e
la conservazione della ricevuta fallita. Questa estensione non è ancora stata
eseguita sulla VM. Non modificare manualmente import-journal.json.

```powershell
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/transfer_chembl_indexes.py import --directory C:/Users/giuli/.mercurion/preview/chembl-transfer-01 --retry-failed-task 470
```

Inserire la master key staging. Riparte dal batch fallito, conserva i completati
ed archivia la task fallita nel journal. Se termina per un'altra causa,
conservare l'errore: il parametro 470 non è un retry generico. Non cancellare
la vecchia task, gli indici o i file locali. Nessuna variazione a PostgreSQL/HNSW.

## ChEMBL — interruzione di trasporto durante la lettura della task 491

L'output allegato termina con URLError mentre la task 491 era processing.
Il journal conserva task 491 per molecule_previews_chembl_36-001535000.json;
307 batch di documenti risultano completati (le altre due voci sono create/settings).
La task 470 non è più quella pendente. Non riutilizzare --retry-failed-task 470.
La causa della disconnessione originale non è determinabile dall'output precedente,
che conservava solo URLError. Le letture successive dall'host hanno restituito
HTTP 200 /health dal forward 17700 e TCP/22 della VM raggiungibile.
Questo non esclude un riavvio o un'interruzione precedente del servizio.

Correzione dell'importatore: sulle sole richieste GET di trasporto, al massimo
quattro tentativi con attese 2/4/8 secondi; POST/PATCH non ripetuti automaticamente.
Gli errori di trasporto ora riportano tipo della causa ed errno, senza chiavi o
corpi HTTP. Validazione del bundle con avanzamento ogni 50 batch; batch già
completati saltati senza ristampare un trasferimento che non avviene.
Il journal pendente viene riconciliato interrogando la stessa task: se è riuscita,
non viene reinviato il batch. Se è ancora processing, attende; se è failed,
riporta il codice e conserva lo stato, senza forzare il retry della scrittura.

Sei test mirati passati, incluse interruzioni GET, limite ai tentativi, nessun
retry delle scritture, riconciliazione task riuscita senza reinvio e retry esplicito
del precedente errore disco. Il collaudo reale resta distinto dal dataset staging.

Con il tunnel 17700 aperto, in PowerShell Windows riprendere SENZA il parametro 470:

```powershell
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/transfer_chembl_indexes.py import --directory C:/Users/giuli/.mercurion/preview/chembl-transfer-01
```

Master key staging solo al prompt. Non modificare né cancellare il journal.

Verifica della correzione completata: anche il collaudo su due Meilisearch reali 1.14.0 temporanei passa (REAL_MEILI_114_QA_PASSED), inclusi conservazione log e replay senza nuove scritture. Nessuna prova del completamento del dataset staging ancora acquisita.


## ChEMBL — 403 e inserimento della chiave da PowerShell

Il tentativo terminato con meili-http-403 è stato rifiutato sulla prima lettura
GET /version, dopo la validazione locale. In quel tentativo non sono state
inviate nuove scritture al server. I batch completati e la task pendente del
precedente tentativo restano nel journal: non cancellarlo e non ripetere il
parametro --retry-failed-task 470.

Il vecchio riepilogo non riportava il codice API, quindi non permette di
concludere se la chiave fosse invalida o priva dei permessi richiesti. Non
rigenerare la master key né sostituire le chiavi applicative per questo errore.

Correzione: GET /version precede ora la lettura dei batch; in caso di errore
HTTP il JSON include operation e apiCode, senza corpo della risposta o chiave.
Gli hash sono ancora obbligatori prima di qualsiasi scrittura. Il controllo
/version non certifica tutti i permessi delle successive operazioni.

### Ripresa — PowerShell Windows, con forward 17700 già aperto

Usare la master key STAGING del password manager (la stessa configurata nel
server Meilisearch), non la chiave sviluppo né una delle chiavi applicative.
Il seguente blocco sostituisce il prompt Python con Read-Host -AsSecureString:
incollare al prompt e premere Invio. La chiave passa a Python tramite stdin;
non compare negli argomenti del processo e non viene salvata in un nuovo file.
Il processo deve necessariamente riceverla in memoria per autenticare HTTP;
SecureString non significa assenza della chiave dalla memoria del processo.

```powershell
$meiliSecure = Read-Host 'Master key Meilisearch STAGING' -AsSecureString
$meiliPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($meiliSecure)
try {
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($meiliPointer) |
        python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/transfer_chembl_indexes.py import --directory C:/Users/giuli/.mercurion/preview/chembl-transfer-01 --key-stdin
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($meiliPointer)
    $meiliSecure.Dispose()
    Remove-Variable meiliSecure,meiliPointer -ErrorAction SilentlyContinue
}
```

Con credenziale rifiutata il comando termina subito, prima di validating-bundle.
Con credenziale accettata valida il bundle e riconcilia la task già registrata,
senza reinviare batch completati. Riportare il JSON finale: se è ancora 403,
operation e apiCode consentono di distinguere il rifiuto; non incollare la chiave.

Verifiche locali di questa correzione: 8 test mirati passati, incluso 403 prima
della lettura dei batch/journal e assenza di retry delle scritture. Passaggio
SecureString → stdin verificato con sola chiave sintetica in Windows PowerShell
5.1.26100.9711 e PowerShell 7.7.0. Nessun accesso alla configurazione privata,
nessuna modifica di credenziali sulla VM, nessun completamento staging attestato.

## ChEMBL — ripresa dopo timeout 10060 (13 novembre 2026)

Lettura locale del journal: molecule_previews_chembl_36 ha 529/529 batch
confermati; molecule_details_chembl_36 ha 52/529 batch confermati. Non risultano
task pendenti nel journal. Il prossimo batch è
molecule_details_chembl_36-000260000.json, circa 28,4 MiB. Questi sono dati del
journal, non una nuova verifica autenticata dei conteggi sul server.
Il controllo corrente GET /health attraverso 127.0.0.1:17700 restituisce HTTP 200.

Il riepilogo TimeoutError 10060 non specificava l'operazione fallita e non prova
che il tunnel sia tuttora guasto. Il client usava un timeout fisso di 30 secondi
anche per le richieste di invio: l'importatore ora usa 180 secondi. Gli altri
utilizzatori del client condiviso mantengono il timeout precedente.

Ogni invio stampa submitting-task con indice e batch, senza documenti o segreti.
Un errore di trasporto finale riporta operation, method e
requestMayHaveBeenAccepted. Non ci sono retry automatici di POST/PATCH.
Un timeout dopo POST può avvenire quando il server ha già accettato il batch:
l'assenza di taskUid nel journal non dimostra che quel batch sia stato rifiutato.
La ripresa manuale può reinviare tale batch con gli stessi documenti e primary
key: la POST di sostituzione usa gli stessi identificativi, non crea duplicati
con nuovi identificativi. I batch confermati dal journal vengono saltati.

Per riprendere usare il blocco PowerShell Read-Host -AsSecureString della
sezione precedente, invariato, con --key-stdin e senza --retry-failed-task 470.
Non esportare nuovamente, non cancellare indici o journal e non avviare due
importatori insieme. Il timeout maggiore riduce le interruzioni premature ma
non certifica la causa del precedente errore né garantisce la stabilità di rete.

Verifica locale: 9 test mirati passati, incluso timeout 180 effettivamente passato
al trasporto, default 30 conservato per gli altri client, nessun retry POST e
messaggio di errore senza payload o credenziali.
Collaudo aggiuntivo della correzione: REAL_MEILI_114_QA_PASSED su due istanze locali temporanee Meilisearch 1.14.0, con import, conservazione log e ripresa senza nuove scritture. Questo collaudo usa dati sintetici, non attesta il completamento del carico staging.
