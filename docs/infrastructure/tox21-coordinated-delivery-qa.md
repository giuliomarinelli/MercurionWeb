# T21-07 — Consegna coordinata, 7 novembre 2026

**Esito: tre archivi reali prodotti, consegna bloccata dalla policy di sicurezza
delle immagini Web.** Nessun merge, pubblicazione o deployment. Il manifest
non autorizza ancora T21-08.

## Provenienza e branch

Il branch Web `feature/T21-DELIVERY` parte da `feature/T21-BASELINE`, SHA
`a2e2c4bb0f678db95fbace39c0e03bdfd4ab981b`. Recupera il coordinatore dal
precedente `feature/T21-07`, aggiungendo exporter Web e verifica nella CI.
Non richiede di integrare separatamente il vecchio branch Web T21-07.
Il sibling Tox21 non viene modificato.

Le immagini Web sono costruite dai Dockerfile esistenti, target `production`,
versione `1.0.0`, da un `git archive` pulito dello SHA **a2e2c4bb** completo
riportato sopra. Il successivo commit degli strumenti di consegna non è lo
SHA di queste immagini: la CI costruisce invece le proprie immagini dal suo
esatto SHA. Nessun file ignorato, credenziale o checkout sibling entra nel
contesto di build Web.

Tox21 proviene dalla [baseline verificata](tox21-security-baseline-qa.md):
SHA `56d1b4e12ddcfa45b440280e025dac46f7ca2034`, versione `t21-baseline-qa`,
target `production`. Il suo pacchetto modello QA `qa-6f19c86` conserva export
SHA, architettura, fingerprint, ordine delle label e checksum di pesi/soglie.
La versione QA non costituisce certificazione scientifica del modello.

## Bundle locale verificato

Percorso esterno al repository:
`C:/Users/giuli/.codex/artifacts/t21-delivery/bundle/`.

| Componente | Archivio, byte | Config digest SHA-256 | Critiche / alte / medie / basse |
| --- | ---: | --- | --- |
| web-ng | 81.810.432 | `37c2977eb343c75c5ad2a19a12b3107fd1ca1806401ff3455f6bc56a976cfba4` | 3 / 64 / 102 / 46 |
| web-node | 126.434.816 | `0793943f55265eb6f310c09dc6a8f24f56276cfe36bd9b1d7d31e4bb8e7d5d11` | 5 / 68 / 71 / 62 |
| tox21 | 370.035.712 | `31a6742450d5c881d3aa4e9207413309ffbbeba84a38a2a6368b527bc16dea5e` | 0 / 52 / 78 / 63 |

Ogni directory contiene `component.json`, `image.tar`, SBOM CycloneDX,
report vulnerabilità, verdetto di policy, audit runtime e log di caricamento.
I sei file di evidenza sono vincolati dai checksum nel record. Il manifest
`delivery.json` vincola a sua volta i tre record e riporta:

```json
{
  "status": "candidate",
  "missing_components": [],
  "blocked_components": ["web-ng", "web-node"],
  "eligible_for_integrated_acceptance": false,
  "deployed": false
}
```

Gli archivi sono esportati per ID, senza tag, quindi caricati con `docker load`:
verificati config, label e layer risultanti. La prova usa il daemon esistente,
non dimostra il ripristino su un host vuoto. Config digest, ID locale Docker e
checksum dell'archivio sono identità distinte; non vengono chiamati digest di
un registry. Checksum e coerenza non sono attestazioni firmate.

## Controlli effettuati e limiti

- Nginx avviato in container posseduto dalla prova, senza rete esterna né
  porte host: index HTTP disponibile su loopback, versione e SHA compilati
  corrispondenti alle label. L'identità è in un chunk lazy; la ricerca iniziale
  limitata a `main` è stata corretta ed eseguita nuovamente sui chunk.
- Backend con filesystem in sola lettura e rete disabilitata: file runtime,
  asset e contratti presenti, cinque moduli caricati incluso Argon2, tool di
  sviluppo assenti; identità compilata uguale a versione/SHA richiesti.
  Nessun bootstrap Nest con database, NATS o sessioni reali.
- Audit finali di entrambi gli strumenti rieseguiti sulle immagini reali,
  incluso il confronto della versione compilata. I record iniziali restano
  immutati; quello frontend registrava già SHA e index, senza campo versione.
- Undici test standard-library verificano identità, report riferito a un'altra
  immagine, checksum alterato, componente mancante, criticità, revisione Web
  divergente, target mescolati, SBOM vuoto e approvazione contraddetta dai finding. Le fixture sintetiche non sono prove Docker.
- Scanner Trivy fissato per digest, stesso riferimento della baseline Tox21;
  report raw vincolato al config digest dell'archivio. La policy esistente
  blocca le criticità, senza eccezioni o `ignore-unfixed`. Le altre severità
  restano visibili. Lo scan è una fotografia del database utilizzato, non una
  garanzia permanente né una certificazione delle licenze dell'intera immagine.

I container della prova vengono rimossi; servizi personali e immagini
esistenti non vengono arrestati o cancellati. Nessuna accettazione browser,
Web → NATS → Tox21 o distribuzione operativa è dedotta da questi controlli.

## Blocco individuato: baseline Web

Sono **otto occorrenze di tre CVE distinte**, riportate dallo scanner:

| Immagine | Origine | Finding critico |
| --- | --- | --- |
| web-ng, Alpine 3.21.3, EOSL segnalato | OS `brotli-libs` | CVE-2026-111497, 1.1.0-r2 |
| web-ng | OS `libcrypto3`, `libssl3` | CVE-2026-31789, 3.3.3-r0, due occorrenze |
| web-node, Alpine 3.22.0 | OS `libcrypto3`, `libssl3` | CVE-2026-31789, 3.5.0-r0, due occorrenze |
| web-node | npm globale dell'immagine, `tar` | CVE-2026-59873, 6.2.1 e due copie 7.4.3 |

Le tre copie `tar` sono in `usr/local/lib/node_modules/npm/node_modules/`:
direttamente, sotto `cacache` e sotto `node-gyp`. Non sono attribuite per
supposizione alle dipendenze applicative del lockfile.

**Prossimo intervento proposto:** revisione mirata delle basi runtime Web,
con verifica del toolchain npm eventualmente superfluo nel runtime. Selezionare
versioni/digest supportati, preservare utenti non-root, contratti, asset,
versione/SHA compilati e target test/staging/production. Rieseguire build,
audit, scan e CI sull'esatto candidato, poi rigenerare il bundle. Nessun cambio
di policy o aggiornamento indiscriminato delle dipendenze è parte di T21-07.

## Ripetizione e CI

Con immagini già costruite e label corrispondenti, usare directory nuove:

```sh
python3 -B scripts/export-web-container.py --image IMAGE --component web-ng \
  --revision WEB_SHA_COMPLETO --version VERSIONE --output bundle/web-ng --cache /tmp/trivy-cache
python3 -B scripts/export-web-container.py --image IMAGE --component web-node \
  --revision WEB_SHA_COMPLETO --version VERSIONE --output bundle/web-node --cache /tmp/trivy-cache
python3 -B scripts/coordinate-delivery.py --web-revision WEB_SHA_COMPLETO \
  --web-ng bundle/web-ng --web-node bundle/web-node --tox21 bundle/tox21 \
  --output bundle/delivery.json
```

Per Tox21 usare il suo exporter e collocare il relativo record e tutti i file
vincolati sotto la stessa radice del bundle. Gli strumenti rifiutano overwrite
del risultato. Exit **2** significa candidato registrato ma non ammissibile;
errori di identità o file mancanti falliscono prima dell'approvazione.

La CI applica exporter e policy alle due immagini production e pubblica JSON
e log anche al fallimento. Non carica gli archivi Docker negli artifact GitHub
e non pubblica immagini in registry. Una precedente CI verde senza questo
controllo non prova l'ammissibilità delle immagini OS complete.

L'integrazione dei branch resta all'owner. T21-11 resta soltanto documentato;
nessuna modifica JWT o rotazione dei segreti è introdotta qui.
