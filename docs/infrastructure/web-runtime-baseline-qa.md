# T21 — Baseline runtime Web, 7 novembre 2026

Intervento autorizzato dopo il [blocco della consegna T21-07](tox21-coordinated-delivery-qa.md).
Branch `feature/T21-WEB-BASELINE`, derivato da `feature/T21-DELIVERY`
(`e7d2a2869500e56434a492d4858fcb0d73800c7d`); nessun merge o deployment.

## Vincoli e modifica

- Aggiornare soltanto gli stage runtime. Conservare toolchain di build Node
  22.16.0/npm 10.9.2, lockfile e dipendenze applicative: non è una migrazione
  generale del progetto o una certificazione di sicurezza dei builder.
- Usare immagini ufficiali, versione esplicita e digest acquisito dal registry.
  Riferimenti: [Node](https://hub.docker.com/_/node),
  [Nginx](https://hub.docker.com/_/nginx). La disponibilità è stata verificata
  tramite pull reale; versione Node e Alpine tramite esecuzione senza rete.
- Conservare target production/staging/test, utenti non-root, porte, comandi,
  asset, contratti e versione/SHA compilati. Non modificare configurazioni JWT.

| Runtime | Prima | Candidato verificato nel registry |
| --- | --- | --- |
| Angular/Nginx | `nginx:1.27-alpine`, Alpine 3.21.3 | `nginx:1.30.6-alpine3.24@sha256:583b7f2fce1cdb8da5ad5c39ebd3c33b98b87d493190e548bdee1fa8c619c311` |
| Nest/Node | `node:22.16.0-alpine`, Alpine 3.22.0 | `node:22.23.4-alpine3.24@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202` |

Alpine risolto dai nuovi riferimenti: 3.24.4. Node resta nella major 22;
la compatibilità con Argon2 e gli altri moduli deve essere provata sull'immagine
costruita, non dedotta dalla sola major.

Nel runtime backend vengono rimossi npm/npx e Yarn: l'entrypoint usa direttamente
Node e installazione, rebuild nativi e test avvengono già negli stage di build.
Le copie vulnerabili di `tar` identificate nel npm globale non hanno quindi
un motivo per restare nell'artefatto applicativo. La rimozione riguarda lo stage
runtime comune, quindi tutti e tre i target.

Il controllo di inventario non esegue più `npm ls` nel container. Verifica tutti
i nomi delle dipendenze production dichiarate, i moduli nativi richiesti e
l'assenza delle dipendenze dirette marcate esclusivamente `dev` nel lockfile.
Una dipendenza condivisa con un ramo production non viene rifiutata soltanto
perché compare anche fra le devDependencies. Restano i controlli su asset,
contratti e sorgenti/mappe non ammessi. Inventario ed exporter rifiutano inoltre
la presenza dei package manager globali, compresi eventuali link interrotti.

L'audit ha individuato anche `jose` mancante nell'immagine precedente: npm lo
installa nella `node_modules` locale al workspace Nest, esclusa dalle vecchie
copie. Ora i tre target sovrappongono quell'albero a quello root; production
usa esclusivamente il ramo installato con `--omit=dev`. `jose` viene anche
caricato esplicitamente negli audit insieme ai cinque moduli già verificati.
La nuova classificazione del lockfile distingue dipendenze root, locali al
workspace e condivise con production: cinque test mirati coprono questi casi
e il rifiuto di entry mancanti. Un audit sull'immagine precedente conferma
il rifiuto per `jose` assente e package manager globali presenti.

**Residuo preesistente:** l'installazione segnala `geoip-lite` 2.0.3 con engine
Node >=24, mentre il progetto mantiene la major 22. Questo intervento non
cambia il lockfile né chiude la discrepanza dichiarata dal pacchetto; test
verdi non equivalgono al rispetto di quell'engine. Valutare separatamente
l'allineamento del toolchain e della dipendenza.

## Validazione richiesta

Build reali production da sorgente Git identificabile; audit delle immagini,
SBOM e scan senza deroghe alla policy. La CI verifica i sei target e l'aggregato
completo sull'esatto SHA. Poi rigenerare il bundle coordinato con l'archivio
Tox21 già verificato, conservando le sue identità e il pacchetto modello.

L'ammissibilità del manifest non equivale a T21-08 o a un deployment. Servizi
personali e repository sibling restano invariati; i container posseduti dalle
prove vengono rimossi. Risultati e residui sono registrati di seguito.

## Risultati sugli artefatti reali

Immagini production costruite da un `git archive` pulito dello SHA
`c02ac848d3aaebdb5e3b85022dd2eeba2592bc9b`, versione Web `1.0.0`, Linux amd64.
I tentativi intermedi non sono componenti del bundle finale. Il commit seguente
del verbale non cambia Dockerfile, audit o applicazione contenuti in questo SHA.

Bundle esterno al repository:
`C:/Users/giuli/.codex/artifacts/t21-web-baseline-c02ac848/bundle/`.

| Componente | Byte archivio | Config digest SHA-256 | Critiche / alte / medie / basse |
| --- | ---: | --- | --- |
| web-ng | 86.912.512 | `aa070b6c8082c498ccb169dcf7c3d9d506834f84fe6d858d2ccf75a25f82f95e` | 0 / 0 / 1 / 0 |
| web-node | 131.801.600 | `c84b91246cc6398814ca509fd83a285926c330711a4053a3ce21212c0598444d` | 0 / 9 / 17 / 6 |
| tox21 | 370.035.712 | `31a6742450d5c881d3aa4e9207413309ffbbeba84a38a2a6368b527bc16dea5e` | 0 / 52 / 78 / 63 |

Checksum SHA-256 degli archivi:

- web-ng: `ab8cf7823993521b1f6bb75a44d94f2b67ef2af71ba48e0c723a4d1b26223e80`;
- web-node: `6977519f9843676149e0657005c0b8eb9d4605f4bb8a1aa82203825a98b59049`;
- tox21: `757b8bd90ffc02e23aa37c1f8a2f761bbb58aa4813dd9e6b47231f18d366db0c`.

I due exporter hanno restituito exit 0, con audit, SBOM CycloneDX, scan raw,
policy invariata, caricamento dell'archivio e verifica di label/layer riusciti.
Nginx risponde su loopback nel container senza porte host; versione/SHA
compilati coincidono con le label. Backend: sei moduli caricati, inclusi Argon2
e `jose`, package manager assenti, nessun bootstrap Nest con servizi reali.

Tox21 è una copia esatta del precedente archivio verificato, con tutti i file
vincolati dal record: sorgente `56d1b4e12ddcfa45b440280e025dac46f7ca2034`,
modello QA `qa-6f19c86`, pesi/soglie e metadati immutati. Non è una nuova build
o un nuovo scan Tox21. Il sibling non viene modificato.

Il coordinatore ha verificato checksum, label, identità di modello, SBOM e
verdetti dei tre componenti, restituendo exit 0 e:

```json
{
  "missing_components": [],
  "blocked_components": [],
  "eligible_for_integrated_acceptance": true,
  "deployed": false
}
```

Lo scan riguarda il filesystem finale visibile delle immagini: rimuovere npm
non equivale a riscrivere i layer della base. Restano finding non critici,
nessuna eccezione alla policy è introdotta e non viene attestata l'assenza di
ogni vulnerabilità. Il load usa il daemon esistente, non un host vuoto.

## Evidenze CI e limiti

[Run 42356313442](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/42356313442)
è riferito allo SHA implementativo `c02ac848d3aaebdb5e3b85022dd2eeba2592bc9b`.
**Run concluso con successo, incluso Required gate:** prerequisiti su
Windows/Linux, tutte le suite unit Angular/Nest, E2E Nest, build, percorsi
browser e supply-chain/attestation verdi. L'attestazione CI riguarda il suo
manifest supply-chain, non firma implicitamente il bundle Docker locale.
I sei target container sono verdi, inclusi i nuovi cinque test di inventario;
le due immagini production superano policy ed exporter. Artifact
`delivery-angular-production`, `delivery-nest-production` e
`container-nest-production-supply-chain` scaricati e ispezionati.
L'inventario backend conferma 54 dipendenze production, otto file richiesti,
sei moduli caricati e package manager assenti. Nei report CI non sono
pubblicati gli archivi Docker; le cardinalità dei finding corrispondono alle
prove locali. L'identità delle immagini CI è ricostruita dal relativo SHA,
non viene confusa con il config digest delle build locali.

Gli undici test del coordinatore e i cinque test dell'inventario passano
anche localmente. Nessun `npm ci` o aggregato CI eseguito sull'host: le
installazioni pulite appartengono alle build Docker e a GitHub Actions.

Nessuna pubblicazione in registry, configurazione di segreti, prova integrata
Web → NATS → Tox21 o distribuzione è stata eseguita. T21-08 resta il passo
di accettazione separato. L'integrazione Git rimane all'owner; questo branch
contiene per discendenza anche `feature/T21-BASELINE` e `feature/T21-DELIVERY`.
