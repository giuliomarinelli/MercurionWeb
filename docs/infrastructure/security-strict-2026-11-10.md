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
policy verdi con scansioni pulite o CI complessiva verde. Questo intervento
non autorizza sessioni autonome su una baseline rossa né deployment.
