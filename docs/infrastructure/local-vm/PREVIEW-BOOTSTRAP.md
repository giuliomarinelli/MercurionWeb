# VM-042 — Preparazione dello stack preview

**11 novembre 2026.** L'owner ha scelto provider reali e hostname
`preview.mercurion.app`. I valori saranno preparati dall'owner nel file
locale privato; nessun segreto in chat, Git, build, argv o artifact di consegna.
Lo stack operativo è in preparazione: questo documento non ne attesta l'avvio.

## 1. File privato sull'host Windows

Da PowerShell Windows normale eseguire una sola volta:

```powershell
powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/New-PreviewConfiguration.ps1
```

Lo script crea `%USERPROFILE%/.mercurion/preview/configuration.json` dopo
aver ristretto le ACL della nuova directory a utente corrente e SYSTEM.
Genera segreti interni distinti e due coppie RSA HTTP/WS da 3072 bit.
La chiave `APP_AES_SECRET` decodifica esattamente 32 byte, come richiesto
dal servizio AES-256-GCM effettivo; la validazione blocca lunghezze diverse.
Non stampa valori, non legge dotenv esistenti e non trasferisce nulla.
Se directory o file esistono già, si ferma senza modificare ACL o segreti.
Non rigenerare il file per correggere un campo: conservare i valori stabili.

Aprire il file nel proprio editor e compilare tutti i campi della sezione
`providers`: SMTP, Twilio, Dropbox, Turnstile e i client OAuth/ORCID.
`ORCID_ISSUER` deve corrispondere al client effettivamente registrato.
Non condividere il contenuto del file o screenshot con i valori.

Gli origin/callback sono ricavati da `https://preview.mercurion.app` e dai
controller esistenti. Configurare i provider di conseguenza prima delle
prove pubbliche; non si crea DNS o tunnel in questa fase. Le policy auth,
Turnstile e cookie secure restano attive.

## 2. Master key Meilisearch e chiavi applicative

- `meilisearchServer.masterKey`: credenziale amministrativa del solo server.
  Conservare il valore anche nel password manager dell'host. Non copiarlo
  in `applicationSecrets` o fra le chiavi client.
- `meilisearchClients.searchKey`: API key ristretta alla ricerca ChEMBL.
- `meilisearchClients.logKey`: API key distinta per scrivere i log/audit preview.

Le chiavi client possono restare vuote durante la preparazione iniziale.
Verranno create dall'operatore tramite `curl`, dopo l'avvio protetto del
server e la precreazione degli indici, secondo
[MEILISEARCH-OPERATIONS.md](MEILISEARCH-OPERATIONS.md).
Il bootstrap dei servizi non crea automaticamente indici o grant con la
master key. L'applicazione non verrà avviata con chiavi client assenti.

La variabile Nest legacy `MEILISEARCH_MASTER_KEY` riceverà esclusivamente
`searchKey`, mai la master key del server. `MEILISEARCH_LOG_KEY` riceverà
`logKey`. La costruzione del payload rifiuta chiavi uguali alla master key,
chiavi client uguali fra loro e contaminazioni nei segreti applicativi.
Nessuna chiave Meilisearch viene compilata nella SPA.

## 3. Verifiche della preparazione

Sette test locali con valori sintetici verificano la separazione fra
master server/client, omissioni dei provider, segreti indipendenti, origin
HTTPS e proxy trust limitato agli indirizzi dei peer immediati.
Wrapper eseguito realmente su PowerShell 5.1 in una directory QA separata:
generazione riuscita, valori non stampati, ACL rilette con soli utente e
SYSTEM, nessuna ereditarietà. Il file operativo dell'owner non viene letto
dall'agente.

I runtime PostgreSQL/pgvector, Redis e Meilisearch precedenti sono respinti
dalle scansioni strict. Le immagini sostitutive devono superare scan,
compatibilità e bootstrap prima di qualunque consegna sulla VM.
Staging Web viene allineato alla consegna production: dipendenze runtime,
label ambiente e export/scan espliciti nel relativo target CI.

LUKS sbloccato e VM accesa non chiudono H-05/A-05/A-30. Nessuna modifica
a rete, ACL, firewall, DNS, Cloudflare, produzione o merge implicita.

## 4. Proiezione operativa e database iniziale

I manifest `deployment/local-vm/operational/{shared,preview}/compose.yaml`
sono separati dalle fixture. Otto servizi non-root, nessuna porta host,
reti IPv4 esplicite, credenziali su bind read-only per consumer e volumi
dati separati. Le interpolazioni contengono soltanto immagini e percorsi.
`restart: no` mantiene l'avvio su richiesta.

PostgreSQL resta sulla major 16 (16.15), con pgvector 0.8.7 compilato da
sorgente fissato e verificato per SHA-256. Redis usa la linea BSD 7.2.17,
verificata per autenticazione e key events `Exg`: nuovo datastore preview,
nessun downgrade o riuso dei dati di sviluppo. Meilisearch 1.56.2 legge la
master key dal proprio TOML. Ricette in `deployment/local-vm/runtime/Dockerfile`;
`export_preview_service.py` richiede ruolo/revisione, SBOM, scan strict e
roundtrip load verificati prima della consegna.

L'hook PostgreSQL crea il ruolo applicativo non-superuser `mercurion_preview`,
database omonimo e vector soltanto su un cluster nuovo. Il comando una tantum
`initialize-empty-schema.cjs` usa le entità registrate nei moduli Nest e
rifiuta database con tabelle esistenti. Non abilita `synchronize` o migrazioni
automatiche nell'applicazione. Database esistenti richiedono una procedura
esplicita, non la riesecuzione del bootstrap.

## 5. Evidenze locali dell'11 novembre

Report esterni a Git in
`C:/Users/giuli/.codex/artifacts/inf-vm-04/vm042-preview/`:

| Prova | Report | Esito e limite |
| --- | --- | --- |
| Configurazione | `preview_compose.py` | Due progetti, otto servizi, zero porte pubblicate; sei mutazioni pericolose respinte. Solo statica |
| Server reali, valori sintetici | `infrastructure-smoke-tcp-readiness.json`, run `9aa845d722a643ac9f19abba50685521` | pgvector e persistenza dopo restart, Redis auth/Exg, Meili master richiesta e key search senza amministrazione; cleanup senza errori |
| Stack a freddo | `full-stack-qa-crypto.json`, run `3e0542842ace4bd2a4c9552059b1ca67` | Schema vuoto inizializzato, backend healthy attraverso nginx, HTML Angular e roundtrip AES tramite servizio applicativo reale; cleanup senza errori |
| Web staging | `qa-export-web-node`, `qa-export-web-ng` | Audit, export/load, SBOM e scan senza finding. Immagini QA da sorgente applicativa f3c4c487 con ricette in revisione, non la release finale |

I tentativi falliti restano documentati nei report: corretti la sintassi
tmpfs e i percorsi temporanei nginx prima del collaudo riuscito. Le fixture
creano propri materiali sintetici e indici effimeri, senza leggere il file
dell'owner; non sostituiscono il curl amministrativo dell'installazione reale.

La prima CI e79f0981 ha rilevato quattro finding `libxslt` nelle immagini
Angular (due HIGH, uno MEDIUM, uno UNKNOWN). Correzione: pacchetto Alpine
`1.1.43-r4` nei runtime Angular e nginx edge, senza ignore o deroghe.
Gli exporter scaricano il DB Trivy in un cache effimero nuovo per ogni export
e ne registrano i metadati, evitando il riuso fino a `NextUpdate` del cache locale.
Le scansioni QA precedenti non sostituiscono questa verifica della release.

Health e HTML non provano login/MFA, OAuth, Turnstile, email/SMS, Socket.IO,
dati ChEMBL o accettazione pubblica. Il proxy privato inoltra il proprio
schema HTTP: header Cloudflare e cookie secure richiedono il collaudo della
catena effettiva, senza fidarsi di header client arbitrari.

## 6. Passi successivi, nell'ordine

1. Compilare `providers` nel file privato, conservando stabili i segreti
   generati. Lasciare ancora vuote soltanto le API key Meilisearch client.
2. Ottenere la CI verde sull'esatto commit Web e produrre da quel sorgente
   le immagini definitive; coordinare Web con il Tox21 già verificato ed
   esportare/scansionare anche i server.
3. Trasferire il bundle verificato e consegnare i file dei server sul tmpfs
   guest. Verificare ownership/collisioni, poi avviare PostgreSQL, Redis,
   NATS e Meilisearch senza publishing. Il wrapper operativo è ancora da
   completare: non lanciare direttamente Compose dai manifest preparatori.
4. Aprire solo l'accesso amministrativo SSH loopback a Meilisearch; usare
   curl per indici e chiavi ristrette, attendere i task e inserire le due
   chiavi client nel file privato. Nessuna master key a Nest.
5. Consegnare il payload applicativo, inizializzare una sola volta il DB
   vuoto, avviare Web/Tox21 e verificare health/RPC sulla VM. Conservare i
   dati persistenti in caso di errore, senza reset automatici.
6. Importazione ChEMBL e prove applicative precedono Cloudflare/Access e
   apertura pubblica. Isolamento residuo ed egress del tunnel restano
   separati; hostname scelto non significa DNS attivato.
