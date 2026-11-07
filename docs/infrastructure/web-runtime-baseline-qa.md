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

## Validazione richiesta

Build reali production da sorgente Git identificabile; audit delle immagini,
SBOM e scan senza deroghe alla policy. La CI verifica i sei target e l'aggregato
completo sull'esatto SHA. Poi rigenerare il bundle coordinato con l'archivio
Tox21 già verificato, conservando le sue identità e il pacchetto modello.

L'ammissibilità del manifest non equivale a T21-08 o a un deployment. Servizi
personali e repository sibling restano invariati; i container posseduti dalle
prove vengono rimossi. Risultati ed eventuali residui saranno registrati dopo
le verifiche effettive.
