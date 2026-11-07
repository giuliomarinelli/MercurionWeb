# Consegna, trasferimento e archivio degli artefatti Docker

**Stato:** proposta architetturale coerente con gli exporter già presenti; nessuna CI/CD o trasferimento VM implementato da questo documento.

## Obiettivo

Avviare la VM con **immagini compilate e verificate fuori dalla VM**, ricostruibili da revisioni precise dei due repository e da un pacchetto modello Tox21 identificato. Evitare checkout dei sorgenti, toolchain di compilazione e build cache sul guest. Per Mercurion, un rilascio **manuale e verificato** è preferibile a un sistema CD automatico permanente.

## Sorgenti e responsabilità

| Origine | Consegna prevista |
| --- | --- |
| `MercurionWeb` | immagini `web-ng` e `web-node` per target `staging`/`production`, SHA Web, versioni, audit |
| `MercurionTox21` | immagine Tox21 dello stesso target, SHA Tox21 **indipendente**, modello con `weights.pt`, `thresholds.json` e manifest già integrati nel runtime |
| Pipeline o build approvata dedicata | immagine PostgreSQL 16/pgvector versionata, se non basta una release già verificata |
| Docker Hub / registri upstream | Nginx, Redis, NATS, Meilisearch, cloudflared e UI con digest verificati e policy di aggiornamento esplicita |
| Preparazione locale | dati iniziali ChEMBL e asset statici necessari; `MercurionData` e `MercurionLandingFactory` NON vengono distribuiti come servizi |

Esistono già `scripts/export-web-container.py`, `scripts/coordinate-delivery.py` e `scripts/accept-t21-delivery.py`. Gli exporter distinguono archive SHA-256, Docker image ID, config digest OCI e, ove applicabile, manifest di provenance. **Un checksum file non è un digest registry**, né la verifica di una build equivale al deployment.

## Gap CI rilevato

`.github/workflows/ci.yml` costruisce immagini e carica diagnostici, SBOM e manifest; il job Web production esporta un `image.tar` durante i test, ma il suo `upload-artifact` non include oggi quel tar. La CI Tox21 carica diagnostici e pacchetto modello QA, ma non ancora un archivio immagine runtime distribuibile. I target staging richiedono un percorso equivalente. Non descrivere gli attuali artifact GitHub come release complete.

## Filiera proposta

```text
CI Web (SHA W)                  CI Tox21 (SHA T)
test + build target             test + model package + build target
        |                                 |
  image.tar + component.json     image.tar + component.json
        +---------------+-----------------+
                        |
            manifest coordinato per ambiente
            checksum + identità + policy
                        |
         GitHub Actions: download temporaneo
                        |
        Windows host: archivio release approvata
          + copia indipendente della release
                        |
              SSH/SFTP o SCP protetto
                        |
         Ubuntu VM: verifica hash e identità
                docker load / image inspect
                        |
          Compose target: preview / production
                        |
           test applicativi e piano di rollback
```

Il coordinatore corrente rifiuta target runtime misti: produrre **un manifest preview (staging)** e **un manifest production** separati. Non associare Web e Tox21 in base all'ora dell'ultimo push: scegliere SHAs precisi e annotare un bundle coerente. L'ammissibilità della consegna non sostituisce l'accettazione applicativa.

## Contenuto minimo del bundle

```text
release/<id-approvato>/
  delivery.json
  web-ng/image.tar
  web-ng/component.json
  web-node/image.tar
  web-node/component.json
  tox21/image.tar
  tox21/component.json
  evidence/              # SBOM, scansioni, policy e log pertinenti
  checksums.sha256        # hash su tutti i file trasferiti
```

Questo è un **layout proposto**, non l'output identico agli script attuali; evolverlo riutilizzando i formati già presenti. Nessuna password, chiave, token, PEM privato, dump utenti o file `.env` deve essere impacchettato. La disponibilità degli artefatti del modello in GitHub Actions per QA non ne fa automaticamente un rilascio scientifico.

## Download, retention e archivio durevole

1. Consentire la pubblicazione del bundle **solo** dopo il gate della revisione esatta e la verifica della security policy. Prevedere un workflow separato o manuale, con permessi minimi; non generare una release per ogni push che può consumare storage inutilmente.
2. Scaricare tramite GitHub CLI/Actions autenticati dal computer host. Verificare SHA, checksum e struttura degli archivi **prima** di un upload alla VM.
3. Conservare una copia sul disco host e una **seconda copia indipendente** (SSD/HDD esterno, oppure storage remoto privato solo se giustificato); almeno release corrente e precedente funzionante. Non affidarsi alla retention temporanea degli artifact Actions, spesso 14 giorni nei workflow esistenti.
4. Trasferire tramite canale SSH amministrativo ristretto. La VM può essere spenta normalmente: la pipeline non deve dipendere dalla sua reperibilità.
5. Dopo `docker load` verificare ID, label, target staging/production, versione, SHA sorgente e modello; attribuire un tag locale **non ambiguo** solo dopo verifica. Salvare nel registro locale dei deployment le identità effettivamente avviate.
6. Eseguire smoke del runtime e registrare l'esito. Fallimento: non promuovere il candidato; conservare diagnosi senza segreti.

Un processo futuro potrà usare GHCR o R2 privato, ma questo **non** è requisito per la prima demo. Valutare costi, policy e complessità prima di cambiare canale.

## Rollback, stato e backup

La release precedente deve rimanere disponibile, verificata e selezionabile senza nuova compilazione. Ripristinare immagini precedenti **non** ripristina PostgreSQL, Redis, Meilisearch, configurazione o segreti. Definire separatamente backup prima delle modifiche di schema, restore dei volumi e compatibilità delle migrazioni. Non promuovere un rollback applicativo se il database ha subito una migrazione incompatibile.

Test minimo: nuova release, snapshot/backup coerente, arresto della candidata, ripristino della precedente con identità confermate, due round di probe funzionali e verifica dell'assenza di accessi incrociati tra ambienti.

## Gate e questioni aperte

- Canale concreto di pubblicazione tar nella CI (artifact download o release dedicata).
- Coordinamento firmato/attestato o integrità con checksum per la prima fase: evitare di chiamare «firma» un mero digest.
- Identità dei target stage/prod nelle immagini Tox21, immutabilità dei nomi locali e policy di retention.
- Trasferimento dati ChEMBL e release degli asset generati localmente.
- Replica dell'archivio fuori dallo stesso disco fisico e test di ripristino **a freddo** su host/daemon privi di cache.
- Budget di storage da misurare sul VHDX 200 GiB e dispositivi esterni.
