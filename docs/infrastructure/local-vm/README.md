# Mercurion — progetto infrastrutturale della demo su VM locale

**Data di apertura:** 7 novembre 2026  
**Stato:** specifica architetturale iniziale; nessun deployment autorizzato né eseguito da questo documento.  
**Branch di lavoro:** `feature/infra-vm-docker-engine-architecture`.  
**Lingua di lavoro:** italiano, salvo nomi tecnici, identificatori e codice.

## Scopo e criterio di successo

Mercurion è un **portfolio case study tecnico**, non un SaaS commerciale, un servizio critico o una piattaforma con obbligo di disponibilità continua. La demo serve a mostrare competenze full-stack, autenticazione/autorizzazione, GraphQL, realtime, persistenza, ricerca, integrazione NATS/Python e deployment ragionato. Non va dimensionata come infrastruttura gestita da un team reperibile 24/7.

La VM può rimanere spenta; preview può essere arrestato indipendentemente dalla produzione. Sono indispensabili integrità dei dati trattati, sicurezza di base, comportamento verificabile e un percorso di avvio/ripristino comprensibile. Non sono obiettivi clustering, autoscaling, alta disponibilità, orchestrazione Kubernetes o rotazione JWT a caldo.

## Indice e fonti di verità

| Documento | Responsabilità |
| --- | --- |
| [CURRENT-STATE.md](CURRENT-STATE.md) | Stato effettivamente osservato, riferimenti ai sorgenti e lacune |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Componenti, ingressi, flussi applicativi e confini |
| [NETWORK-TOPOLOGY.md](NETWORK-TOPOLOGY.md) | Reti Docker, collegamenti permessi, isolamento e SSH |
| [SECURITY-AND-SECRETS.md](SECURITY-AND-SECRETS.md) | Identità, privilegi, segreti e bootstrap |
| [MEILISEARCH-OPERATIONS.md](MEILISEARCH-OPERATIONS.md) | Indici, chiavi, UI di sola lettura e operazioni curl |
| [ARTIFACT-DELIVERY.md](ARTIFACT-DELIVERY.md) | Build, consegna, verifica, archivio e rollback delle immagini |
| [DECISIONS.md](DECISIONS.md) | Decisioni approvate, proposte e aspetti aperti |
| [ROADMAP.md](ROADMAP.md) | Lavori ordinati per blocchi, dipendenze e criteri di accettazione |
| [ACCEPTANCE.md](ACCEPTANCE.md) | Piano di test, comprese prove negative di sicurezza |
| [DAILY-LOG.md](DAILY-LOG.md) | Diario delle evidenze, interventi e limitazioni |

**Documentazione preesistente autorevole nei rispettivi perimetri:** [identità degli ambienti](../../../deployment/README.md), [schema comune di deployment](../../../deployment/deployment-schema.json), [configurazione Nest](../../../docs/configuration.md), [indici dei log](../../../docs/meilisearch-log-indices.md), [roadmap e verifiche Tox21](../tox21-container-roadmap.md), [guida JWT](../../../MercurionWebNode/docs/jwt-environment-and-secrets.md).

Questa cartella **non sostituisce** schema, overlay, Dockerfile, test o contratti applicativi esistenti: costituisce la specifica della nuova *proiezione operativa VM*. Quando un contratto esistente confligge con una decisione approvata, registrare lo scostamento e modificarlo soltanto in un task successivo con test. Non cancellare i manifest Kubernetes storici per motivi cosmetici.

## Convenzioni per persone e agenti

- Distinguere sempre **decisione approvata**, **evidenza verificata**, **proposta** e **blocco aperto**; una bozza non costituisce un deployment.
- Rispettare `AGENTS.md` e i validator esistenti per qualunque modifica successiva. Questo piano interattivo non è automaticamente una ricetta eseguibile del control plane autonomo in `docs/autonomous-development/`.
- Nessun segreto, PEM privato, credenziale reale, dump contenente dati personali, file `.env` operativo o output sensibile deve entrare nel repository, negli artifact GitHub o nei log.
- Non modificare il repository `MercurionTox21` come effetto collaterale: l'immagine scientifica è un artefatto indipendente.
- Nessun merge su `develop`, cambio di segreti reali o avvio della demo è implicito nella stesura dei documenti.
- L'eventuale processo operativo è **build verificata → consegna verificata → accettazione VM**, tre prove distinte.

## Scelta architetturale di riferimento

Una VM Ubuntu Server su Hyper-V Windows 11 Pro, Docker Engine + Compose; tre progetti Compose indipendenti (`shared`, `preview`, `production`). Un Cloudflare Tunnel entra su Nginx edge HTTP. Ogni ambiente dispone di web-ng, web-node, Postgres/pgvector, Redis, NATS e Tox21 propri. Meilisearch è unico e condiviso attraverso due reti distinte. La UI amministrativa `eyeix/meilisearch-ui` è accessibile esclusivamente tramite tunnel SSH e chiave Meilisearch di sola lettura; le operazioni elevate si eseguono soltanto tramite curl controllato.

Le verifiche e la configurazione dell'isolamento tra host Windows, guest e LAN precedono qualsiasi esposizione tramite Cloudflare Tunnel.
