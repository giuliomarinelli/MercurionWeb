# Mercurion VM — diario di progettazione e verifica

Roadmap: [ROADMAP.md](ROADMAP.md). Questo diario segue il criterio del [diario UX](../../../MercurionWebNg/docs/portfolio-ux/DAILY-LOG.md): **evidenze reali distinte da ipotesi e lavori rinviati**.

## Stati

- **Da affrontare:** contratto pianificato, nessuna implementazione.
- **In analisi:** ricognizione o decisioni in corso, senza esito operativo.
- **Documentato, da revisionare:** specifica scritta, non necessariamente approvata in tutti i dettagli.
- **Implementato, da verificare:** configurazioni cambiate, prove incomplete.
- **Verificato:** test eseguiti ed evidenze registrate, per uno specifico ambiente/SHA.
- **Accettato:** review owner conclusa; non implica automaticamente merge o deployment.

## 7 novembre 2026 — INF-VM-01, baseline documentale

**Stato:** documentato, da revisionare.

**Contesto:** l'owner ha creato `feature/infra-vm-docker-engine-architecture` e ha chiesto di studiare documentazione/sorgenti prima di modificare Compose, servizi o VM. Il modello proviene dallo schizzo su carta e dalle decisioni successive: due stack applicativi, Meilisearch unico, Nginx edge, Cloudflare Tunnel, Tox21/NATS, credenziali separate e perimetro portfolio.

**Ricognizione:** esaminati schema deployment, overlay, Compose preview/production, Dockerfile Web/Tox21, CI/exporter/coordinatore, guide JWT e Tox21, servizi Meilisearch. Baseline di lettura `6431b5bd1e22b59edd27c7500a4025f15053dd10`; log di sistema e audit già differenziati per ambiente.

**Decisioni aggiuntive ricevute:** master key Meilisearch riservata alla gestione del server/operazioni amministrative e non ai Nest VM; vecchia variabile client conservata come nome; niente TLS origin Nginx/maintenance mode Kubernetes; `MercurionData` e `MercurionLandingFactory` solo locali; documentazione in italiano. Accesso `eyeix/meilisearch-ui` soltanto SSH e key Meilisearch read-only; precreazione indici solo con `curl` e key amministrativa custodita nel password manager Windows; definire consegna e archivio artifact GitHub Actions.

**Evidenza esterna UI:** progetto ufficiale dichiara SPA con chiamate API dal browser; Docker Hub pubblica `v0.15.3-lite` e digest `linux/amd64`. Non è stata svolta una scansione delle CVE: immagine **non approvata**. Occorrono doppio inoltro SSH locale, prova CORS/privilegi e verifica del Docker Engine.

**Intervento di questa sessione:** redazione dei documenti architetturali e di accettazione sotto `docs/infrastructure/local-vm/`; aggiornamento dell'indice della vecchia nota VM. Nessuna modifica applicativa, Compose, CI, segreti reali o VM. Nessun test runtime eseguito durante la redazione.

**Prossimo intervento:** review delle decisioni e apertura INF-VM-02 (isolare host/guest) prima di configurare network Docker eseguibili. Le proposte rimangono proposte fino a verifica.
