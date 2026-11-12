# Audit di sicurezza preliminare all'allineamento dei servizi

**12 novembre 2026.** Richiesta owner: correggere i Compose shared/preview e
caricarli sulla VM, prima sottoponendo le versioni di sviluppo ad audit di
sicurezza e correggendo i problemi senza introdurre regressioni. Resta valido
il vincolo di [parità delle versioni](SERVICE-VERSION-PARITY.md).

## Esito delle immagini attuali di sviluppo

Audit reale, non simulato, delle cinque immagini effettivamente usate dai
container definiti in `docker_sl/docker-compose.yml`. Ogni immagine coincide
con il riferimento Compose presente sul Docker host. Nessun pull, riavvio,
modifica a volumi/configurazioni dei servizi o accesso a segreti.

Scanner fissato:
`aquasec/trivy@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb`.
Per ogni immagine: archivio untagged, digest, SBOM CycloneDX, database di
vulnerabilità scaricato in una cache nuova e scansione senza filtri di severità
o esclusioni. Policy applicata a tutti i finding, inclusi UNKNOWN/unfixed.

| Servizio | Versione letta dal binario | Finding totali | Critical | High | Esito |
| --- | --- | ---: | ---: | ---: | --- |
| PostgreSQL | 16.10 | 896 | 19 | 255 | Bloccato |
| Redis | 8.2.2 | 336 | 7 | 61 | Bloccato |
| NATS | 2.12.1 | 85 | 1 | 42 | Bloccato |
| Meilisearch | 1.14.0 | 62 | 2 | 17 | Bloccato |
| Nginx edge | 1.27.5 | 219 | 3 | 67 | Bloccato |

I numeri sono **finding pacchetto/CVE**, non CVE uniche né prova che ogni
problema sia sfruttabile nella configurazione corrente. La policy strict non
li esclude in base all'uso di un modulo. Il report aggregato è `blocked`.
Le scansioni non sostituiscono la verifica degli advisory del motore: un
binario nativo senza inventario delle dipendenze può avere copertura diversa
da un pacchetto OS o Go.

Evidenze pubbliche locali:
`%USERPROFILE%/.codex/artifacts/inf-vm-04/vm046-service-parity/audit-20261112/`.
`audit.json` contiene identità/versioni/riepiloghi; ogni sottocartella conserva
`identity.json`, `image.tar`, SBOM, vulnerabilità e risultato della policy.
I log dello scanner e i metadati del suo database sono conservati. Nessun file
di credenziali viene copiato nell'audit.

## Come ripetere l'audit

Dalla root Web su Windows, con i cinque servizi di sviluppo già avviati e
Docker Desktop Linux disponibile. Scegliere una directory di output nuova:

```powershell
$taskAuditOutput = Join-Path $env:USERPROFILE '.codex/artifacts/inf-vm-04/vm046-service-parity/audit-ripetizione-01'
python -B scripts/infrastructure/audit_development_services.py --output $taskAuditOutput
```

Lo strumento usa il Compose con un env file temporaneo vuoto, senza caricare
dotenv ignorati. Legge solo identità e `--version` dai container. Salva e
scansiona le immagini senza eseguire i loro server o montare i volumi dati.
Due scansioni al massimo sono concorrenti. Codice di uscita 2 e `blocked`
sono l'esito atteso quando esistono finding; un errore di scansione non vale
zero vulnerabilità. Non cancellare output precedenti per mascherare un errore.

## Distinguere i fix di base dai fix del motore

- Redis: i 336 finding del report sono attribuiti ai pacchetti Debian della
  base. Questo non dimostra automaticamente che il binario Redis sia privo
  di problemi: vanno lette anche le
  [release note della linea 8.2](https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisos-8.2-release-notes/).
- Meili: i 62 finding esposti dallo scanner riguardano la base Alpine 3.20.6.
  Un aggiornamento della sola base può preservare il binario 1.14.0, ma deve
  essere costruito e verificato, inclusi dipendenze native e formato dei dati;
  non è già una correzione consegnata.
- PostgreSQL: 834 finding OS, inclusi quelli del pacchetto pgvector 0.8.5,
  e 62 nel tool Go `gosu`. Inoltre gli
  [advisory PostgreSQL 16](https://www.postgresql.org/support/security/16/)
  elencano correzioni del motore successive alla 16.10. Una pulizia dell'OS
  da sola non basta a dichiarare sicuro il server.
- NATS: il report contiene 14 finding sul modulo
  `github.com/nats-io/nats-server/v2` stesso, oltre a toolchain e dipendenze.
  Per esempio [CVE-2026-33216](https://github.com/nats-io/nats-server/security/advisories/GHSA-v722-jcv5-w7mc)
  è corretta nella linea 2.12 a partire da 2.12.6. Quel numero è solo un
  esempio di fix, non una selezione della versione finale né una prova che
  tutti i finding siano risolti.
- Nginx: la versione 1.27.5 rientra in intervalli riportati dagli
  [advisory ufficiali](https://nginx.org/en/security_advisories.html).
  L'assenza di TLS o maintenance mode nel file VM non rende nullo l'audit
  del binario e dei pacchetti.

## Contratto Nginx specifico della VM

Usare `deployment/local-vm/operational/nginx.conf`, separato dalla ConfigMap
Kubernetes. **Solo HTTP interno su porta 80, nessun certificato/TLS e nessun
maintenance mode.** Il TLS pubblico è terminato da Cloudflare. Mantenere
health, API, SPA e upgrade WebSocket del normale funzionamento applicativo.

Il validatore dei Compose verifica ora anche questo file. Test negativi
coprono listener TLS, certificati, maintenance mode, upstream HTTPS e riferimenti
a ConfigMap. Il file operativo corrente soddisfa il contratto; non necessita
di copiare la configurazione Kubernetes. Questo è distinto dall'idoneità
dell'immagine Nginx che dovrà essere scelta dopo l'audit.

## Perché il caricamento è ancora fermo

Non è sicuro sostituire i riferimenti nei Compose con queste immagini
vulnerabili per ottenere la sola parità. Non è nemmeno corretto modificare
silenziosamente soltanto le versioni VM per ottenere un report verde.

È stata chiesta all'owner la decisione sui casi che richiedono aggiornamenti
del motore: preparare fix coordinati sviluppo/staging nelle linee compatibili,
oppure mantenere le versioni esatte e lasciare il caricamento bloccato.
Nel frattempo nessun Compose è stato caricato sulla VM e i server attivi
restano invariati.

Dopo la scelta: costruire i candidati fissati per digest, ripetere tutte le
scansioni, collaudare su copie/fixture e confrontare API, autenticazione,
persistenza, RDB/AOF, SQL/pgvector e query Meili usate dall'applicazione.
Preparare backup e rollback dei volumi e riconciliazione degli ID del recovery
prima di sostituire i servizi. L'assenza di breaking change va sostenuta da
queste evidenze nei percorsi esercitati, non promessa in assoluto da una
scansione CVE o dal numero di versione.
