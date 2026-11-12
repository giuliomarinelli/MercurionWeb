# Mercurion — progetto infrastrutturale della demo su VM locale

**Data di apertura:** 7 novembre 2026  
**Stato, 12 novembre 2026:** ripartenza dei quattro server privati verificata, sei controlli riusciti e quattro indici log persistenti. Due chiavi client dedicate create a 90 giorni; prossimo passo: bootstrap applicativo privato. Accesso pubblico ancora aperto.
**Branch di lavoro:** `feature/infra-vm-docker-engine-architecture`.  
**Lingua di lavoro:** italiano, salvo nomi tecnici, identificatori e codice.

## Da dove iniziare

Questa pagina è il punto di ingresso. **Per creare `mercurion-server` da zero,
seguire il percorso numerato qui sotto**, usando il [runbook operativo](RUNBOOK.md).
Non occorre leggere tutti i documenti della cartella prima di cominciare.
Il runbook contiene i passi operativi; le due appendici richiamate nel percorso
contengono i comandi delle verifiche e della preparazione degli artefatti.
Chat, agenti AI e script personali dell'autore non sono necessari. Software,
credenziali e modello scientifico rimangono prerequisiti espliciti.

### Nuova installazione: percorso passo per passo

Eseguire le fasi nell'ordine. Nei documenti ogni blocco distingue PowerShell
ordinaria, PowerShell amministrativa e console Ubuntu, con risultati attesi
e condizioni di arresto. Una nuova installazione deve produrre le proprie prove.

| Fase | Cosa fare | Dove seguire le istruzioni |
| --- | --- | --- |
| 1 | Comprendere ambienti e confini, verificare i programmi necessari e clonare i due repository | [Runbook: sezioni 1–2](RUNBOOK.md#1-nomi-ambienti-e-confini) |
| 2 | Creare la VM Hyper-V, installare Ubuntu e predisporre la cifratura LUKS | [Runbook: sezione 3](RUNBOOK.md#3-creare-o-verificare-il-guest-senza-confondere-i-due-percorsi), percorso «Nuova VM» |
| 3 | Configurare switch Internal, IP statici, profili firewall, ACL e NAT | [Runbook: sezione 4](RUNBOOK.md#4-rete-statica-e-firewall-prima-dellesposizione-del-guest) |
| 4 | Configurare accesso SSH a chiave e installare Docker Engine/Compose | [Runbook: sezione 5](RUNBOOK.md#5-ssh-e-pacchetti-del-guest) |
| 5 | Verificare rete e isolamento prima del bootstrap | [Runbook: sezione 6](RUNBOOK.md#6-verifiche-prima-del-bootstrap-reale) → [appendice delle verifiche](VERIFICATION-PROCEDURE.md); al termine tornare alla sezione 7 |
| 6 | Generare e compilare il file privato di configurazione, custodendo i segreti | [Runbook: sezione 7](RUNBOOK.md#7-configurazione-privata-una-sola-volta) |
| 7 | Preparare immagini e bundle sull'host, verificando sorgenti, modello, CI e scansioni | [Runbook: sezione 8](RUNBOOK.md#8-preparare-e-archiviare-le-immagini-sullhost) → [appendice artefatti](ARTIFACT-REPRODUCTION.md); al termine tornare alla sezione 9 |
| 8 | Trasferire il bundle e avviare privatamente PostgreSQL, Redis, NATS e Meilisearch | [Runbook: sezione 9](RUNBOOK.md#9-primo-bootstrap-dei-quattro-server-solo-su-risorse-nuove) |
| 9 | Aprire il tunnel SSH amministrativo e creare gli indici Meilisearch | [Runbook: sezioni 10–11](RUNBOOK.md#10-tunnel-amministrativo-meilisearch) |
| 10 | Creare le due chiavi applicative Meili, poi preparare e avviare privatamente Nest, Angular, Tox21 e l'edge | [Runbook: sezione 11.2](RUNBOOK.md) → [primo bootstrap applicativo](APPLICATION-BOOTSTRAP.md) |
| 11 | Completare la verifica senza reinstallare e vedere la UI tramite forward SSH privato | [Verifica dei container esistenti e forward](APPLICATION-BOOTSTRAP.md#7-riprendere-soltanto-la-verifica-dei-container-esistenti) |

**Fin dove arriva oggi questa procedura:** quattro server privati, quattro
indici log e due chiavi client Meilisearch a 90 giorni verificati. Le quattro
applicazioni sono state avviate, lo schema inizializzato e i controlli backend,
frontend e RPC Tox21 superati. L'owner ha visualizzato la landing tramite
forward SSH su localhost:18888. Verifica e forward sono descritti nella guida
applicativa, sezioni 7–8; login/dati e accesso pubblico restano successivi.

### Ripresa, manutenzione o consultazione

| Esigenza | Punto di ingresso |
| --- | --- |
| Preparare schema SQL esplicito, restore ChEMBL/embedding e tool scope | [Analisi e proposta dati/bootstrap](DATA-BOOTSTRAP-PLAN.md); nessun restore da avviare prima dell'inventario |
| Riprendere la VM già predisposta | [Runbook: sezione 12](RUNBOOK.md#12-punto-di-ripresa-concordato-per-il-giorno-successivo). Non ripetere installazione, generazione segreti o bootstrap |
| Capire cosa fare dopo spegnimento o riavvio | [Runbook: sezione 13](RUNBOOK.md#13-arresto-file-volatili-e-ripristino-limite-operativo-attuale), prima di avviare lo stack |
| Diagnosticare un errore | [Runbook: sezione 14](RUNBOOK.md#14-diagnosi-senza-esporre-segreti) |
| Capire come è progettata l'infrastruttura | [Architettura](ARCHITECTURE.md), [reti Docker](NETWORK-TOPOLOGY.md), [sicurezza e segreti](SECURITY-AND-SECRETS.md) |
| Sapere cosa è stato eseguito e cosa manca | [Registro delle esecuzioni](EXECUTION-RECORD.md), [stato corrente](CURRENT-STATE.md), [roadmap](ROADMAP.md) e [criteri di accettazione](ACCEPTANCE.md) |

### Limiti da conoscere prima di iniziare

- **Replica completa su macchina nuova non ancora collaudata.** La VM originaria
  preesisteva a questa documentazione: il runbook distingue la procedura proposta
  per una nuova installazione dai passi effettivamente verificati. Anche la
  ricostruzione su host privo di cache resta una verifica aperta.
- **Ripartenza dopo spegnimento tramite procedura dedicata.** I segreti attivi sono su
  tmpfs e si perdono al riavvio del guest. I dati persistono nei volumi, ma il
  cold recovery ha concluso la verifica sulla VM il 12 novembre. Il bootstrap iniziale
  non lo sostituisce: leggere la sezione 13 del runbook.
- **Demo applicativa privata in verifica.** I container sono avviati, ma
  dati ChEMBL, login/realtime, tunnel pubblico e produzione restano successivi.
  Le verifiche di isolamento H-05/A-05/A-30 restano parziali; i pilot autorizzati
  non costituiscono accettazione globale della rete.

## Catalogo della documentazione

Consultare le pagine seguenti quando servono dettagli. **L'ordine delle tabelle
non è un ordine di esecuzione:** quello operativo è il percorso numerato sopra.
Le note dei singoli interventi conservano decisioni e ricevute; i loro «prossimi
passi» datati non superano lo stato del runbook e del registro delle esecuzioni.

### Guide operative principali

| Documento | Responsabilità |
| --- | --- |
| [COLD-RECOVERY.md](COLD-RECOVERY.md) | Inventario, recupero dei server esistenti e verifica senza nuovo avvio; ricevute VM del 12 novembre |
| [RUNBOOK.md](RUNBOOK.md) | Installazione/configurazione, bootstrap, curl, ripresa del giorno successivo, errori e limite del cold recovery |
| [ARTIFACT-REPRODUCTION.md](ARTIFACT-REPRODUCTION.md) | Preparazione da sorgenti e modello, build/export/scan/CI e bundle, senza script esterni al repository |
| [VERIFICATION-PROCEDURE.md](VERIFICATION-PROCEDURE.md) | Inventari, canary host/LAN, Android, IPv6, fixture e pilot ripetibili senza AI |
| [MEILISEARCH-OPERATIONS.md](MEILISEARCH-OPERATIONS.md) | Indici, chiavi, UI di sola lettura e operazioni curl |

### Architettura e contratti di riferimento

| Documento | Responsabilità |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Componenti, ingressi, flussi applicativi e confini |
| [NETWORK-TOPOLOGY.md](NETWORK-TOPOLOGY.md) | Reti Docker, collegamenti permessi, isolamento e SSH |
| [SECURITY-AND-SECRETS.md](SECURITY-AND-SECRETS.md) | Identità, privilegi, segreti e bootstrap |
| [BOOTSTRAP-CONTRACT.md](BOOTSTRAP-CONTRACT.md) | Audit consumer e proposta INF-VM-04 per consegna, compatibilità e ciclo di vita dei segreti |
| [NEST-SECRET-FILE-ADAPTER.md](NEST-SECRET-FILE-ADAPTER.md) | Adattatore Nest opt-in da file, contratto e prove sintetiche Windows/Linux |
| [TOX21-SECRET-FILE-ADAPTER.md](TOX21-SECRET-FILE-ADAPTER.md) | Adattatore Tox21 opt-in per la coppia NATS e continuità del branch operativo |
| [NATS-CLIENT-AUTH.md](NATS-CLIENT-AUTH.md) | Credenziali NATS Nest separate dall'URL, validazione e prova isolata dei transport |
| [ARTIFACT-DELIVERY.md](ARTIFACT-DELIVERY.md) | Build, consegna, verifica, archivio e rollback delle immagini |

### Approfondimenti e prove della rete

| Documento | Responsabilità |
| --- | --- |
| [STATIC-NETWORK-MIGRATION.md](STATIC-NETWORK-MIGRATION.md) | Procedura italiana passo per passo: rete statica, Kaspersky Pubblica, isolamento LAN e recupero |
| [SSH-ONLY-ACL.md](SSH-ONLY-ACL.md) | Applicazione controllata ACL della sola vNIC, prima fase SSH-only, test simulati e quarantena |
| [DNS-HTTPS-ACL.md](DNS-HTTPS-ACL.md) | Transizione controllata a 19 ACL per DNS/HTTPS, prove, recupero e limiti |
| [IPV4-ONLY-DESIGN.md](IPV4-ONLY-DESIGN.md) | VM-034: policy IPv4-only, passi operativi, verifiche, rollback e limiti del filtro router |
| [HOST-REBOOT-VERIFICATION.md](HOST-REBOOT-VERIFICATION.md) | Punto di ripresa e verifica passo passo dopo riavvio Windows, con VM arrestata ordinatamente |
| [NETWORK-PROBES.md](NETWORK-PROBES.md) | Canary temporaneo e controlli positivi per le prove negative TCP |
| [PRIVATE-PORT-PROBES.md](PRIVATE-PORT-PROBES.md) | Probe TCP/443 e TCP/UDP 53 privati con controlli, runner e limiti |
| [ANDROID-LAN-PROBES.md](ANDROID-LAN-PROBES.md) | Preparazione Android/Termux e contratto delle prove LAN con endpoint controllato |

### Note dei pilot e dei bootstrap

| Documento | Responsabilità |
| --- | --- |
| [HOST-GUEST-READINESS.md](HOST-GUEST-READINESS.md) | Inventari INF-VM-02, baseline guest e prove di isolamento ancora aperte |
| [INF-VM-02-REVIEW.md](INF-VM-02-REVIEW.md) | Evidenze, residui H-05/IPv6, fixture verificate e gate proposto per il pilot sintetico VM-035 |
| [FIXTURE-RUNTIME.md](FIXTURE-RUNTIME.md) | VM-033 approvata: bundle verificato, fixture sintetiche, matrice e pulizia per label |
| [SECRET-DELIVERY-PILOT.md](SECRET-DELIVERY-PILOT.md) | Primo pilot locale del ricevitore/apply Tox21; stato storico da leggere insieme al registro corrente |
| [HOST-SYNTHETIC-DELIVERY.md](HOST-SYNTHETIC-DELIVERY.md) | Orchestratore sintetico opt-in, verifica del codice guest e limiti della prova locale |
| [SYNTHETIC-RUN-RETIREMENT.md](SYNTHETIC-RUN-RETIREMENT.md) | VM-036: riconciliazione e rimozione selettiva dei materiali del singolo run sintetico |
| [SYNTHETIC-CONSUMER-MOUNT.md](SYNTHETIC-CONSUMER-MOUNT.md) | VM-037: nuovo run sintetico, vero lettore Tox21, bind read-only, restart/recreate e retirement |
| [TOX21-ARTIFACT-REVIEW.md](TOX21-ARTIFACT-REVIEW.md) | VM-038: immagini locali/CI, modello riutilizzabile e prerequisiti del candidato applicativo preview |
| [TOX21-STAGING-CANDIDATE.md](TOX21-STAGING-CANDIDATE.md) | Preparazione del candidato Tox21 staging e sue verifiche |
| [TOX21-TRANSPORT-PREFLIGHT.md](TOX21-TRANSPORT-PREFLIGHT.md) | Verifica del bundle Tox21 e prerequisiti guest prima del trasferimento |
| [TOX21-VM-PILOT.md](TOX21-VM-PILOT.md) | Pilot temporaneo Tox21/NATS sulla VM e ricevute RPC |
| [PREVIEW-BOOTSTRAP.md](PREVIEW-BOOTSTRAP.md) | Preparazione VM-042 di configurazione e stack preview |
| [PREVIEW-SERVER-BOOTSTRAP.md](PREVIEW-SERVER-BOOTSTRAP.md) | Bootstrap VM-043 dei soli quattro server e recupero del trasferimento |

### Stato, decisioni e pianificazione

| Documento | Responsabilità |
| --- | --- |
| [EXECUTION-RECORD.md](EXECUTION-RECORD.md) | Ricevute sanitizzate, SHA/CI/identità, confine tra eseguito e soltanto pronto |
| [CURRENT-STATE.md](CURRENT-STATE.md) | Stato effettivamente osservato, riferimenti ai sorgenti e lacune |
| [CONTINUITY.md](CONTINUITY.md) | Punto di consegna della pausa operativa; per riprendere usare la sezione 12 del runbook |
| [DECISIONS.md](DECISIONS.md) | Decisioni approvate, proposte e aspetti aperti |
| [ROADMAP.md](ROADMAP.md) | Lavori ordinati per blocchi, dipendenze e criteri di accettazione |
| [ACCEPTANCE.md](ACCEPTANCE.md) | Piano di test, comprese prove negative di sicurezza |
| [DAILY-LOG.md](DAILY-LOG.md) | Diario delle evidenze, interventi e limitazioni |

**Documentazione preesistente autorevole nei rispettivi perimetri:** [identità degli ambienti](../../../deployment/README.md), [schema comune di deployment](../../../deployment/deployment-schema.json), [configurazione Nest](../../../docs/configuration.md), [indici dei log](../../../docs/meilisearch-log-indices.md), [roadmap e verifiche Tox21](../tox21-container-roadmap.md), [guida JWT](../../../MercurionWebNode/docs/jwt-environment-and-secrets.md).

Questa cartella **non sostituisce** schema, overlay, Dockerfile, test o contratti applicativi esistenti: costituisce la specifica della nuova *proiezione operativa VM*. Quando un contratto esistente confligge con una decisione approvata, registrare lo scostamento e modificarlo soltanto in un task successivo con test. Non cancellare i manifest Kubernetes storici per motivi cosmetici.

## Scopo e criterio di successo

Mercurion è un **portfolio case study tecnico**, non un SaaS commerciale, un servizio critico o una piattaforma con obbligo di disponibilità continua. La demo serve a mostrare competenze full-stack, autenticazione/autorizzazione, GraphQL, realtime, persistenza, ricerca, integrazione NATS/Python e deployment ragionato. Non va dimensionata come infrastruttura gestita da un team reperibile 24/7.

La VM può rimanere spenta; preview può essere arrestato indipendentemente dalla produzione. Sono indispensabili integrità dei dati trattati, sicurezza di base, comportamento verificabile e un percorso di avvio/ripristino comprensibile. Non sono obiettivi clustering, autoscaling, alta disponibilità, orchestrazione Kubernetes o rotazione JWT a caldo.

## Convenzioni per persone e agenti

- Distinguere sempre **decisione approvata**, **evidenza verificata**, **proposta** e **blocco aperto**; una bozza non costituisce un deployment.
- Basi operative concordate con l'owner: Web `feature/infra-vm-docker-engine-architecture`, Tox21 `feature/infra-vm-nats-client-auth`. I lavori successivi proseguono su questi rami; eventuali sotto-rami partono dalla rispettiva base. `develop` può restare indietro; ogni integrazione rimane dell'owner, nessun merge automatico o cherry-pick implicito.
- Rispettare `AGENTS.md` e i validator esistenti per qualunque modifica successiva. Questo piano interattivo non è automaticamente una ricetta eseguibile del control plane autonomo in `docs/autonomous-development/`.
- Nessun segreto, PEM privato, credenziale reale, dump contenente dati personali, file `.env` operativo o output sensibile deve entrare nel repository, negli artifact GitHub o nei log.
- Non modificare il repository `MercurionTox21` come effetto collaterale: l'immagine scientifica è un artefatto indipendente.
- Nessun merge su `develop`, cambio di segreti reali o avvio della demo è implicito nella stesura dei documenti.
- L'eventuale processo operativo è **build verificata → consegna verificata → accettazione VM**, tre prove distinte.

## Scelta architetturale di riferimento

Una VM Ubuntu Server su Hyper-V Windows 11 Pro, Docker Engine + Compose; tre progetti Compose indipendenti (`shared`, `preview`, `production`). Un Cloudflare Tunnel entra su Nginx edge HTTP. Ogni ambiente dispone di web-ng, web-node, Postgres/pgvector, Redis, NATS e Tox21 propri. Meilisearch è unico e condiviso attraverso due reti distinte. La UI amministrativa `eyeix/meilisearch-ui` è accessibile esclusivamente tramite tunnel SSH e chiave Meilisearch di sola lettura; le operazioni elevate si eseguono soltanto tramite curl controllato.

Le verifiche e la configurazione dell'isolamento tra host Windows, guest e LAN precedono qualsiasi esposizione tramite Cloudflare Tunnel.
