# Adottare le versioni coordinate nei servizi shared e preview

Procedura operativa, **12 novembre 2026**. Fa seguito all'
[audit e costruzione dei candidati](SERVICE-SECURITY-AUDIT.md). Non ripetere
il primo bootstrap, non inizializzare lo schema applicativo e non cancellare
container/volumi precedenti. Il comando aggiorna i quattro server, conservando
Nginx già conforme alla versione selezionata e i quattro container applicativi.
Il file Nginx rimane dedicato alla VM: HTTP interno su 80, senza certificati TLS
o maintenance mode, indipendente dalla ConfigMap Kubernetes.

## 1. Condizioni e risultato previsto

- VM `Mercurion-Server` accesa, LUKS sbloccato, SSH `mercurion-server` raggiungibile;
  reti private, ACL e firewall invariati.
- Server e applicazioni della release precedente attivi, segreti presenti su
  tmpfs, nessun riavvio VM tra inventario e adozione.
- Cinque archivi con SBOM e scansione strict positiva recente, ottenuti seguendo
  il rapporto collegato. Nessuna esclusione per severity, UNKNOWN o unfixed.
- Il gestore esegue i comandi dal terminale Windows; passphrase SSH e sudo sono
  inserite soltanto nel suo terminale. Non occorre aprire o leggere da un agente
  `configuration.json`, dotenv, PEM o password manager.
- L'aggiornamento interrompe temporaneamente backend e worker Tox21. Lasciare
  terminare il comando, senza avviare altri bootstrap o scritture amministrative.

| Ruolo | Versione coordinata | Gestione dati |
| --- | --- | --- |
| PostgreSQL | 16.16, pgvector disponibile 0.8.7 | Dump logico della VM e restore su nuovo volume, catalogo VM 0.8.7 verificato |
| Redis | 8.2.9 | Copia del volume 7.2.17 dopo arresto pulito, originale conservato |
| NATS | 2.12.15, Go 1.27.4 e patch crypto fissata | Stessi due consumer user/password, nessun JetStream configurato |
| Meilisearch | 1.14.0 con base OS corretta | Export logico della 1.56.2 VM e import in nuovo volume 1.14; nessun downgrade fisico |
| Nginx | 1.30.6 già installata | Verifica identità e mantenimento del container/IP fidato |

La baseline di sviluppo è `docker_sl/docker-compose.yml`. L'overlay
`docker_sl/compose.coordinated.yaml` seleziona le stesse versioni candidate
per il passaggio coordinato dello sviluppo. Non avviare quello stack sui vecchi
volumi: PostgreSQL passa da Debian UID 999 ad Alpine UID 70; anche librerie,
collazioni e dati vanno collaudati tramite restore separato. Il Compose originale
resta disponibile come baseline di rollback; l'overlay non riavvia alcun servizio
da solo. L'allineamento del runtime di sviluppo è distinto dall'adozione sulla VM.

## 2. Inventario recente della VM

PowerShell ordinaria, root Web. Impostare il percorso del bundle del primo
bootstrap conservato dall'operatore:

```powershell
$taskServerBundle = 'C:/Users/giuli/.codex/artifacts/inf-vm-04/vm043-servers-ready'
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewRecoveryInventory.ps1 -BundlePath $taskServerBundle -Execute
if ($LASTEXITCODE -ne 0) { throw 'Inventario fallito: non procedere.' }
```

Il comando conserva `receipts/recovery-inventory-<inspectionId>.json` e non
legge i corpi delle credenziali. Per questo aggiornamento sono attesi quattro
server `running`, `secretRunPresent=true`, `runIsTmpfs=true`,
`coldRecoveryCandidate=false`. Se è necessario un cold recovery, eseguire prima
la [procedura dedicata](COLD-RECOVERY.md), poi acquisire un nuovo inventario.
Non usare una vecchia ricevuta dopo un riavvio: il boot ID è un vincolo del bundle.

L'inventario acquisito per la prima adozione è
`91bc83f416a9429a9106f2a94e1ba513`, serverRunId
`6c3e72e2e4064b71bd3bbffcff4d629c`. Non è una costante richiesta dal codice:
una riproduzione futura usa la propria release e il proprio inspectionId.

## 3. Assemblare i materiali pubblici verificati

Le directory indicate sotto sono output delle ricette documentate nell'audit,
non script monouso esterni. È possibile collocare gli artefatti altrove e
passare i propri percorsi. La directory di output deve essere nuova.

```powershell
$taskInspection = '91bc83f416a9429a9106f2a94e1ba513'
$taskEvidence = 'C:/Users/giuli/.codex/artifacts/inf-vm-04/vm046-service-parity/coordinated-01/scans'
$taskPostgres = 'C:/Users/giuli/.codex/artifacts/inf-vm-04/vm046-postgres1616/export'
$taskUpgrade = Join-Path $env:USERPROFILE ('.mercurion/artifacts/preview-upgrade-' + [Guid]::NewGuid().ToString('N'))
python -B scripts/infrastructure/preview_service_upgrade_bundle.py --evidence $taskEvidence --postgres $taskPostgres --baseline $taskServerBundle --inspection $taskInspection --meili-defaults deployment/local-vm/coordinated/meili-1562-defaults.json --output $taskUpgrade
if ($LASTEXITCODE -ne 0) { throw 'Bundle aggiornamento respinto.' }
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewServiceUpgrade.ps1 -BundlePath $taskUpgrade
if ($LASTEXITCODE -ne 0) { throw 'Piano aggiornamento respinto.' }
```

Attesi `upgrade-bundle-ready` e `upgrade-plan`, un upgradeId nuovo, nessun SSH
nel secondo comando senza `-Execute`. L'assemblatore verifica archivio, digest,
user Linux, provenance, ruolo, versioni dichiarate nei Compose, SBOM, finding e
data della scansione (massimo 24 ore). Conserva i Compose shared/preview, il
modello renderizzato, Nginx, helper e hash di ogni file. I binari vengono
verificati nuovamente dopo l'avvio. Un timestamp di scansione non sostituisce
gli advisory del motore controllati nella fase audit.

`meili-1562-defaults.json` contiene soltanto impostazioni pubbliche del motore
1.56.2, acquisite da un indice vuoto in una fixture. Non contiene credenziali
né dati applicativi e permette di distinguere un nuovo default da una
personalizzazione non supportata dalla 1.14.

## 4. Trasferire e applicare sulla VM

```powershell
powershell -NoProfile -File scripts/infrastructure/Invoke-PreviewServiceUpgrade.ps1 -BundlePath $taskUpgrade -Execute
if ($LASTEXITCODE -ne 0) { throw 'Aggiornamento incompleto: leggere ricevuta e rollback, non rilanciare.' }
```

Lo script trasferisce solo il bundle pubblico via SCP sullo stesso SSH già
autorizzato, senza aprire porte o modificare firewall/router. Sudo copia i file
in `/opt/mercurion/releases/upgrade-<upgradeId>`, root-owned, verificandone gli
hash prima dell'esecuzione. Non scarica immagini sulla VM e non legge il file
di configurazione Windows. I valori server già presenti nella tmpfs sono
riutilizzati sui nuovi container: nessuna rotazione, rigenerazione o invio in chat.

Fasi attese nel terminale:

1. `loading-verified-images`: load/save e confronto digest; Nginx deve avere
   l'identità già attiva, perché l'IP del proxy fidato deve rimanere invariato.
2. `pausing-writers`: stop ordinato di backend e worker Tox21.
3. `backing-up-existing-data`: dump PostgreSQL, conteggi di tutte le tabelle
   pubbliche, export Meili con impostazioni/documenti/chiavi. Attesa dei task
   Meili pendenti, poi arresto dei quattro server originali.
4. `starting-new-server-generation`: volumi nuovi con nomi `mercurion_u...`,
   copia Redis da originale fermo e avvio dei nuovi Compose. Le reti esistenti
   sono dichiarate esterne; nessuna rete LAN o porta host viene introdotta.
5. `restoring-and-verifying-data`: restore PostgreSQL senza alterare implicitamente
   l'estensione, confronto righe e autenticazione; import Meili logico e verifica
   di conteggi, primary key e contenuto riletto; verifica credenziali Redis/NATS.
6. `resuming-and-testing-applications`: ripartenza degli stessi backend/worker,
   health attraverso Nginx, SPA e cinque subject RPC Tox21 con inferenza reale.
7. `finished`: registrazione atomica della generazione attiva per il recovery.

Il comando usa i Compose aggiornati sotto `deployment/local-vm/operational/`:
le immagini caricate sono selezionate per ID, non per tag mobile. I progetti
server nuovi hanno nome `mercurion-u<upgradeId>-shared` e
`mercurion-u<upgradeId>-preview`, evitando di ricreare i quattro container
applicativi dei progetti precedenti. Le reti e gli alias di servizio mantengono
il contratto applicativo. Nessun `down -v`, prune o reset viene eseguito.

### Dettagli del trasferimento Meili

Le due chiavi applicative a 90 giorni devono mantenere UID, valore, azioni,
indici e scadenza. Stessa master key server e stessi UID producono le stesse
chiavi: il programma confronta i valori in memoria senza stamparli e blocca
il passaggio se differiscono. Anche le altre chiavi compatibili sono conservate.

Due chiavi automatiche della 1.56 riguardano funzionalità assenti nella 1.14:
`Default Read-Only Admin API Key` e `Default Chat API Key`. Solo quando nome,
azioni, ambito globale e assenza di scadenza corrispondono esattamente ai
default noti vengono conservate nel backup senza ricrearle nel vecchio motore.
Gli UID delle due chiavi applicative sono sempre esclusi da questa eccezione.
Nessuna nuova chiave viene esposta o sostituita nel file di configurazione host.

Le impostazioni presenti solo nella 1.56 sono omesse esclusivamente quando
uguali al default pubblico; default modificati dal motore (per esempio la
lista di ranking) tornano al default 1.14 già usato in sviluppo. Una
personalizzazione incompatibile provoca errore e rollback, senza cancellarla.
I campi omessi sono elencati nella ricevuta. Documenti e impostazioni originali
restano nel backup root privato; non si copia `data.ms` tra versioni.

## 5. Leggere l'esito e recuperare una ricevuta

Attesi `status=passed`, sette controlli true e
`rollback=available-original-containers-and-volumes-retained`. Il report locale
è `<bundle>/upgrade-result.json`; quello guest è
`/opt/mercurion/releases/upgrade-<upgradeId>/upgrade-result.json`.

Il backup guest contiene dati e API key: directory `private-backup` 0700,
file 0600 root, filesystem VM LUKS. Non scaricarlo in directory pubbliche,
non committarlo e non incollarne il contenuto. La ricevuta pubblica contiene
solo identità, conteggi e risultati, mai valori delle chiavi.

Se SCP finale fallisce dopo `passed`, recuperare soltanto la ricevuta in un
nuovo percorso locale, senza rieseguire l'aggiornamento:

```powershell
$taskUpgradeId = (Get-Content -Raw -LiteralPath (Join-Path $taskUpgrade 'upgrade-manifest.json') | ConvertFrom-Json).upgradeId
$taskRecovered = Join-Path $taskUpgrade ('recovered-' + [Guid]::NewGuid().ToString('N') + '.json')
scp -o StrictHostKeyChecking=yes "mercurion-server:/opt/mercurion/releases/upgrade-$taskUpgradeId/upgrade-result.json" $taskRecovered
if ($LASTEXITCODE -ne 0) { throw 'Ricevuta non disponibile: verificare il progresso senza rilanciare.' }
```

La connessione può durare più della finestra breve degli script di consegna
segreti: è il guest a governare timeout delle singole fasi e rollback. Una
disconnessione del terminale non autorizza una seconda esecuzione; consultare
`progress.json`/ricevuta. L'helper ignora SIGHUP per completare il proprio stato.

## 6. Rollback e recupero successivo

Prima del commit della nuova generazione, qualsiasi errore nel blocco operativo
ferma i nuovi server, conserva i nuovi volumi per diagnosi e riavvia i container
originali con i loro volumi intatti, poi i writer applicativi. La ricevuta
riporta `original-containers-restarted` oppure `manual-review-required` se non
può verificare il ripristino. Il primo valore attesta il riavvio, non una nuova
accettazione completa; va verificata la health. Il comando non elimina i dati
per far passare un successivo tentativo e rifiuta un owner-execution duplicato.

Dopo un successo, `active-service-upgrade.json` nella release server originale
punta, tramite hash, ai nuovi modelli, ID e ricevuta. Le procedure di inventario,
cold recovery e verifica applicativa presenti nel repository seguono tale
generazione. La baseline originale e i suoi manifest restano immutati; non
falsificare `bootstrap-result.json` con gli ID nuovi. Usare sempre gli helper
aggiornati di questa revisione quando si riprende il lavoro.

La pulizia della generazione precedente è un'attività successiva, da autorizzare
dopo il collaudo e dopo aver conservato backup ripristinabili. Questo aggiornamento
non la esegue. Il passaggio pubblico Cloudflare e l'import dei dati ChEMBL/embedding
restano fasi distinte; i test di health non attestano login, provider o dataset.

## 7. Verifiche eseguite prima della consegna

- Stack locale con tutte le versioni coordinate: sette controlli passati
  (schema nuovo/esistente, rifiuto drift, RPC Tox21, health, SPA e AES).
- Redis 7.2.17 VM → 8.2.9: copie sintetiche RDB/AOF, Lua, TTL, restart e
  conservazione dell'originale passati.
- Meili 1.56.2 → 1.14.0: documenti, fingerprint del contenuto riletto, chiave
  a scadenza, ricerca/filtro e rifiuto scritture 403 passati.
- Test unitari di rollback, isolamento dei volumi, selezione della generazione,
  checksum e no-overwrite passati su Windows e Linux isolato.
- Regressioni delle procedure di inventario, cold recovery e verifica
  applicativa passate; gli scenari solo Linux sono distinti quando saltati su Windows.

Queste sono prove locali prima del deploy. La ricevuta effettiva della VM va
registrata dopo il comando della sezione 4; non dichiarare l'adozione completata
finché non è disponibile. CI remota non verificata in questa fase, come richiesto
dall'owner; la policy CVE locale rimane attiva.

## Esito effettivo della VM

Upgrade `6d019947800b4578bc2b5d40791f5132`: **passed**, fase finished, tutti i
sette controlli true. Ricevuta scaricata dall'owner in
`C:/Users/giuli/.codex/artifacts/inf-vm-04/vm047-adoption/ready/upgrade-result.json`
e verificata successivamente. PostgreSQL applicativo aveva la tabella embedding
vuota; i quattro indici log Meili e 10 documenti sono stati trasferiti con
chiavi applicative preservate. I nuovi volumi sono ora quelli operativi;
gli originali sono conservati per rollback. Nessuna porta pubblicata o merge.
