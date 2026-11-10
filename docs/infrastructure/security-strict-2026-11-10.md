# Policy strict vulnerabilità — 10 novembre 2026

**Richiesta owner:** «una policy strict in entrambe le repo che blocchi in
presenza di cve indipendentemente dal livello di gravità».

## Contratto attivo

Web e Tox21 adottano policy v2: **zero vulnerabilità segnalate**, qualunque
gravità. Anche GHSA senza CVE numerico, UNKNOWN o finding suppressed bloccano.
Non si escludono finding unfixed né si applicano allowlist delle vulnerabilità.
Un report vuoto valido può passare; scanner assente, errore, report mancante,
incompleto, incoerente o con severità non riconosciuta falliscono.

| Percorso | Copertura e comportamento |
| --- | --- |
| Web npm | Tutti i lockfile tracciati, root + MercurionData + MercurionLandingFactory; dev/optional/peer inclusi. INFO, LOW, MODERATE, HIGH e CRITICAL bloccano |
| Web immagini | Controllo SARIF Nest e exporter Trivy bloccano qualsiasi finding. Fallback Trivy fissato allo stesso digest canonico, niente ignorefile operativo |
| Web coordinatore | Rivaluta lo scan dell'archivio: un vecchio security_eligible true non può nascondere finding LOW/HIGH |
| Tox21 sorgenti | CI prepara quattro soli manifest noti in directory isolate: legacy, runtime, training e build; Trivy analizza ogni scope, senza installare le dipendenze. Un target mancante invalida il report |
| Tox21 immagini | Exporter richiede policy v2 senza eccezioni e blocca UNKNOWN/LOW/MEDIUM/HIGH/CRITICAL; report ed evidenze rimangono disponibili |

La CI Tox21 esegue unit test della policy e source scan prima delle build;
Required gate rimane dipendente dal successo del job. Web registra i test
SARIF nel gate supply-chain esistente. Nessun gate disabilitato o reso opzionale.
Web aggiunge inoltre un audit npm prima di installare/compilare: viene richiesto
anche in modalità metadata/duplicate e il Required gate ne controlla sempre
l'esito prima di selezionare il percorso. Un successo storico non evita un
nuovo controllo degli advisory correnti. Test negativi coprono anche questi bypass.
Le vecchie licenze ammesse o eccezioni di metadati non sono esenzioni CVE.
Non vengono modificati dipendenze, lockfile, soglie del modello o applicazioni.

## Perché la precedente CI poteva essere verde

La vecchia policy Web bloccava solo critical nell'audit `--omit=dev`; la
vecchia policy Tox21 bloccava solo CRITICAL nell'immagine. Non era una policy
zero vulnerabilità. Gli alert Tox21 precedono la CI del 9 novembre e sono
presenti anche nel suo report Trivy: il passaggio era dovuto alla soglia,
non soltanto a nuove advisory pubblicate dopo la scansione.

La verifica precedente «CI verde» resta un fatto sullo SHA e sul criterio
allora attivo; non è un'approvazione secondo la nuova policy.
VM-039 resta rinviata: prima rientro delle dipendenze e nuova verifica.

Snapshot del 10 novembre, API Dependabot sui default branch develop:
Web 118 alert distribuiti su più manifest; Tox21 tre alert su due pacchetti.
L'audit npm allegato dall'owner riportava 97 pacchetti vulnerabili; la lettura
live del medesimo giorno ne riporta 110 nel workspace. Sono snapshot e unità
diversi da numero di CVE uniche o numero di alert GitHub.

### Tox21: finding già confermati nello scan CI

| Pacchetto bloccato | Finding | Minimo corretto indicato dall'advisory |
| --- | --- | --- |
| filelock 3.20.3 | [UnixFileLock, MEDIUM](https://github.com/advisories/GHSA-69hj-f68j-2879), [WindowsFileLock, MEDIUM](https://github.com/advisories/GHSA-8mx5-7m5m-r77g) | 4.2.1 |
| fsspec 2025.3.0 | [ReferenceFileSystem, HIGH](https://github.com/advisories/GHSA-27vj-qcqg-25rc) | 2026.6.0 |

Entrambi sono anche nei lock runtime/training attuali. Il codice applicativo
ispezionato non usa direttamente quelle API, ma ciò non esclude percorsi
transitivi e non deroga alla nuova policy. Le versioni corrette sono candidati
da verificare con Python 3.11, Torch, lock con hash e regressioni numeriche;
non sono state installate né dichiarate già compatibili.

### Web: ordine di rientro da sviluppare

1. Build Angular/Piscina e Angular common: il [critical Piscina](https://github.com/advisories/GHSA-67c8-pqhq-4rmx)
   è nel dominio di sviluppo, prima escluso. Le due righe critical npm sono
   Piscina e il parent Angular build, non due CVE necessariamente differenti.
2. Runtime Fastify/Nest, GraphQL tools, redirect/Undici, mail e altre catene
   moderate/low; poi completare i tool di sviluppo e i due lockfile indipendenti.
3. Confrontare aggiornamenti compatibili, pin e override già presenti. Il piano
   automatico npm propone anche major Nest GraphQL e downgrade di altri package:
   non eseguire audit fix --force alla cieca.
4. Nuovi audit completi, test mirati/build e CI sullo SHA esatto. Nessun rientro
   per accettazione del rischio o aumento della soglia: l'owner ha scelto strict.

## Verifiche eseguite

- Self-test supply-chain Web: tutte le gravità, dev inclusi, inventario dei tre
  lockfile, errori scanner e report incoerenti respinti.
- Test SARIF: tutti i livelli, finding senza livello, suppression e report
  malformati; 13 test coordinatore/export e 3 acceptance superati.
- Tox21: 11 unit test stdlib superati, includendo scope mancanti e LOW nei
  profili training/build. YAML CI analizzato e nuovi moduli inclusi nel contesto
  e nell'immagine di validation, senza aggiungerli al runtime distribuito.
- Gate Web reale: exit 1 atteso. Root 110 (2 critical), Data 37 (2 critical),
  LandingFactory 35 (3 critical). Tutti gli audit acquisiti, nessun npm install.
- Source scan Trivy reale Tox21: quattro manifest rilevati, 6 MEDIUM + 3 HIGH
  tra gli scope, **9 occorrenze di tre finding distinti**. Valutatore exit 2
  atteso. Licenze non analizzate da questa prova, che usa solo lo scanner vuln.
- Lo stesso report convertito in SARIF viene respinto dal controllo Web.
- Scan immagine CI Tox21 del 9 novembre rivalutato: tutte le sue 196 occorrenze
  (66 LOW, 78 MEDIUM, 52 HIGH) bloccano; approvazione storica non riutilizzabile.

Artefatti di soli metadati/report in
`~/.codex/artifacts/security-review-48c1094b46ad4c5ea086f9344c9cb05c/`:
snapshot API, audit npm, source scan/policy, conversione SARIF e rivalutazione
del vecchio scan. Nessun valore di credenziali, intervento VM o merge.

La policy corretta viene testata anche producendo **rosso intenzionale** sui
finding attuali. Le dipendenze restano da correggere: non confondere test della
policy verdi con scansioni pulite o CI complessiva verde. L'intervento iniziale
non autorizza sessioni autonome su una baseline rossa né deployment.

## Bonifica successiva autorizzata dall'owner

Il 10 novembre l'owner richiede il fix nelle due repo prima di riprendere
l'infrastruttura. Si mantengono i branch operativi esistenti, senza merge.
Gli aggiornamenti disponibili sono applicati mantenendo le major Angular 20
del prodotto, Angular 21 della landing e Nest 11; non viene eseguito
`npm audit fix --force`.

| Ambito | Aggiornamento principale |
| --- | --- |
| Web Angular | Framework 20.3.35, CLI/build 20.3.42, codegen 7.4.6 |
| Web backend | Nest 11.2.9, Fastify 5.12.8, Mercurius 16.12.1, adapter Nest 13.4.5, Nodemailer 10.5.0 |
| Transitive Web | GraphQL tools utils 12.1.0, Hono node-server 2.1.6, fast-uri 3.1.9, qs 6.16.2; override glob 14.0.4 e minimatch 11.0.5 sui range moderni |
| MercurionData | Nest 11.2.9, multer 2.5.0 e gli stessi override glob/minimatch |
| LandingFactory | Angular 21.2.26, CLI/build/SSR 21.2.29, Vitest 4.1.12 e override glob/minimatch |
| Tox21 | filelock 4.2.1 e fsspec 2026.6.0 nei quattro scope; hash dei wheel verificati, patch zlib disponibile e rimozione dei tool globali inutilizzati dal runtime |

I tre lockfile npm vengono aggiornati. La landing richiede una risoluzione
isolata dal solo manifest con il proprio npm dichiarato 11.6.2: npm 10.9.2
incontra un errore Arborist `edgesOut` durante la risoluzione dei peer. Il lock
risultante viene poi installato normalmente con npm 10.9.2, senza force o
legacy-peer-deps. Il workspace principale mantiene Node 22.16.0/npm 10.9.2.

### Audit dopo gli aggiornamenti

| Input | Prima: pacchetti vulnerabili / occorrenze | Dopo |
| --- | --- | --- |
| npm workspace Web | 110, inclusi critical | 7 LOW, tutte le altre gravità a zero |
| npm MercurionData | 37, inclusi critical | 8 LOW, tutte le altre gravità a zero |
| npm LandingFactory | 35, inclusi critical | **0** |
| Tox21 source: legacy/runtime/training/build | 9 occorrenze, MEDIUM/HIGH | **0**, tutti e quattro i target presenti |
| Immagine Tox21 completa | 196 occorrenze | **186 Debian**, zero Python; ancora rifiutata |

I contatori npm includono i parent vulnerabili per dipendenza: i residui Web e
Data derivano da **un unico advisory deepmerge**, non da quindici CVE distinte.
L'audit completo del gate termina ancora con exit 1, preservando i tre report.
La libreria è usata da Jest e fork-ts-checker/Nest CLI, nel tooling.
Un audit diagnostico separato del solo runtime npm Web risulta a zero;
il gate continua a includere dev/optional/peer e a rifiutare i residui.

[GHSA-gcqx-w48m-w2h4 / CVE-2026-93753](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)
riporta `Patched versions: None` per deepmerge fino alla versione 4.3.1.
Il suggerimento automatico npm verso vecchie major Jest/Nest CLI non costituisce
una correzione compatibile. Il [changelog upstream](https://github.com/TehShrike/deepmerge/blob/master/changelog.md)
mostra inoltre che 4.2.0 introdusse protezioni sulle proprietà ereditate:
scendere sotto il range dell'advisory senza analisi non dimostra sicurezza.
Nessun downgrade, cambio di nome del pacchetto o esenzione viene applicato.

### Validazione locale e limiti

- Web: typecheck Angular/Nest, build Angular con gate bundle/lazy chemistry e
  build Nest con verifica dei template email superati.
- Policy dipendenze/patch e relativi test negativi superati; le due patch
  RDKit/Mailer restano applicabili e le dichiarazioni Nodemailer 10 compilano.
- Catalogo/validazione GraphQL e codegen `--check` superati, senza drift.
- Backend: cinque suite mirate, 27 test superati; due suite E2E con vero
  trasporto Fastify/GraphQL e Socket.IO, 6 test superati.
- Angular: 31 test mirati di handoff MFA/layout overlay superati su Chrome
  Headless; sono unit test, non una sessione browser autenticata.
- MercurionData: build e 17 suite/19 test superati. Landing: build browser/SSR,
  42 route prerenderizzate e postprocessing completati, 4 test Vitest superati.
- Tox21: installazione Linux CPU con hash e `pip check`, 158 test superati;
  confronto offline del modello salvato con le quattro molecole di riferimento
  superato. Pesi, soglie, Torch, NumPy e RDKit invariati.
- Gli avvisi di budget CSS/iniziale Angular non bloccano i gate configurati;
  l'avviso engine di geoip-lite 2.0.3 su Node 22 era già presente nel pin iniziale.

Sono prove locali sullo stato aggiornato, non un'approvazione visuale o una CI
complessiva verde. Nessun `npm ci` o `npm run ci:check` locale. La pipeline
strict resta obbligatoria e Web non supera il gate iniziale finché deepmerge
rimane nel grafo. Le immagini Web aggiornate restano da certificare.

Il runtime staging locale Tox21 dello SHA
`9e95a765de71c9bbe4b889a1494cefc80e84e7bd` supera l'audit UID/GID 10021,
filesystem read-only, assenza training, identità e inferenza ripetibile.
L'exporter produce SBOM, scan e verifica il load del proprio archivio, poi
rifiuta correttamente: **65 LOW, 74 MEDIUM, 47 HIGH**, tutti pacchetti OS
Debian, nessun `FixedVersion` indicato. Il target Python ha zero finding.
Image ID locale `sha256:014c90d437eea154a9778b2340a81ceba7afd4bbe391df2fd2a02413b05897a6`;
config digest `sha256:be2260ec71ac67d9540fcbb890822ec5d2daef513cac23aa652571961589ba46`.
Il trasporto dell'archivio verificato non rende `security_eligible` positivo.

La [CI Tox21 esatta 42852859285](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42852859285)
conferma source scan, installazione/test, tutti i target runtime, riferimento
numerico, RPC/ripresa broker, autenticazione e arresto. Fallisce soltanto
all'ultimo scan con gli stessi 186 finding, exit 2; Required gate rosso.
Un esempio di residuo è [apt / CVE-2011-3374](https://security-tracker.debian.org/tracker/CVE-2011-3374),
che Debian considera non sfruttabile e unfixed: rimane bloccante secondo la
policy scelta. Non basta un aggiornamento indiscriminato apt per chiudere il gate.

Evidenze della bonifica, separatamente dallo snapshot iniziale:
`~/.codex/artifacts/security-fix-4454ebd8eb2f43b8a631db726784df4e/`.

### Passi necessari per completare il rientro

1. **SEC-FIX-02, aperto — tooling Web:** valutare una sostituzione mantenuta o
   una correzione upstream di deepmerge nelle catene Jest/Nest CLI, verificando
   compatibilità delle configurazioni, suite e build. Un fork richiede vera
   correzione, provenienza/licenza e manutenzione esplicite; rinominare i
   metadati per sottrarre il codice allo scanner non soddisfa il requisito.
2. **SEC-FIX-03, aperto — base runtime Tox21:** rivalutare il nuovo scan completo
   e le versioni corrette disponibili. Per gli unfixed della base Debian occorre
   confrontare basi alternative, compatibilità glibc/CPU con i wheel scientifici
   e costo di mantenimento. Un cambio di distro è una migrazione da collaudare,
   non un incremento di versione che garantisce automaticamente zero CVE.
3. Nuovi scan completi e Required gate sui due SHA finali, quindi certificazione
   degli archivi. Solo dopo riprendere VM-039; nessun trasferimento o deployment
   deriva dalle verifiche locali.

## Completamento richiesto dall'owner: sostituzioni

### SEC-FIX-02 — deepmerge sostituito e audit npm puliti

Selezionato [@shivammathur/deepmerge 4.3.2](https://github.com/shivammathur/deepmerge),
fork MIT dell'upstream 4.3.1. La revisione dei due tarball pubblicati verifica
le rispettive integrity npm e confronta `dist/cjs.js`: la differenza eseguibile
consiste nel rifiuto incondizionato di `__proto__` sulle proprietà di target
e source. Non è un semplice cambio di nome della distribuzione vulnerabile.
Non vengono introdotte nuove opzioni o modificate le API usate da Jest/CLI.

Root e Data fissano l'override a `npm:@shivammathur/deepmerge@4.3.2`; i lock
riportano nome effettivo, URL e integrity del fork. L'inventario SBOM conserva
il vero nome del pacchetto e il percorso di installazione dell'alias.
I test registrati in `ci:dependencies` verificano entrambi i lock, il codice
effettivamente risolto dai consumer Jest/fork-ts-checker, target null-prototype,
chiavi pericolose su target/source/array annidati e compatibilità delle opzioni
di merge, clone, array, symbol, Date e `all`. La policy strict non cambia.

I tre audit npm completi risultano ora **zero finding**, anche dev/optional/peer;
gate supply-chain completo, licenze e regressioni della policy superati.
Il maintainer esterno resta una dipendenza da monitorare: owner Web platform,
riesame entro 2027-03-31 o prima se l'upstream pubblica un fix compatibile.
La rimozione dell'alias richiede audit puliti e gli stessi test di regressione;
nessuna scadenza costituisce un'esenzione CVE.

Evidenze: tarball, integrity, confronto sorgente e report in
`~/.codex/artifacts/security-completion-0a4973e0eb504199b2982e8b7afa88ad/`.

### SEC-FIX-03 — migrazione della base Tox21

Selezionata la base [Wolfi](https://www.chainguard.dev/docs/open-source/wolfi),
con pacchetti glibc e Python 3.11.18, per mantenere ABI dei wheel Linux CPU e
contratto applicativo. Digest base e versioni APK dirette vengono fissati;
repo APK e firme standard restano attivi. Il database dei pacchetti viene
conservato per SBOM/scansione. La selezione della base non è approvazione:
servono suite, riferimento numerico e scan completo a zero prima di chiudere.
Questi controlli sono superati sullo SHA Tox21
`1f2d603dd53408ee59e90f647cdd542d6f49e1d2`, [CI 42857018732](https://github.com/giuliomarinelli/MercurionTox21/actions/runs/42857018732):
159 test, tre runtime, NATS/auth/recovery e Required gate verdi. OS Wolfi e
pacchetti Python sono effettivamente riconosciuti e hanno **zero finding**.
Anche l'export locale test passa, con archivio/load verificati, SBOM e
`security_eligible: true`; pesi e soglie restano quelli selezionati.
Il validatore rifiuta anche un report pulito di sola Python senza target OS.

### Immagini Web e rimozione del vecchio bypass maintenance

La prima nuova CI Web passa i tre audit npm e le build dei sei target,
ma gli scan completi delle immagini production individuano un altro finding:
`zlib 1.3.2-r1`, CVE-2026-4738, corretto in `1.4-r0` nella repo Alpine 3.24.
I due Dockerfile fissano l'aggiornamento al runtime, ereditato da staging,
test e production. Restano i digest base e i controlli strict, senza ignore.

Lo stesso full gate rileva un disallineamento applicativo precedente:
tre route admin introdotte dall'owner non erano nell'inventario; inoltre
Angular chiamava ancora il bypass maintenance con query `t`, rimosso dalla
firma del controller deprecato. L'owner sceglie esplicitamente di rimuovere
il flusso Angular. Eliminati pagina, route/manifest e metodo HTTP obsoleti;
il backend mantiene l'HTTP 403 incondizionato. Inventari REST aggiornati:
68 call site su 68 compatibili. Le tre route admin sono censite come route
esposte ma con logica pending, senza certificarne l'implementazione.

Test esistenti route-policy/manifest/transport aggiornati, typecheck e test
negativi REST conservati. La copertura restante non viene esclusa: gli
ultimi SHA pubblicati devono superare la CI full e i relativi Required gate.
