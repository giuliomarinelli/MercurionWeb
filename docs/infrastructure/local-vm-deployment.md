# Mercurion — infrastruttura demo su VM locale

> **7 novembre 2026 — documento storico/preliminare.** La specifica di riferimento per il nuovo deployment Docker Engine è ora [`docs/infrastructure/local-vm/README.md`](local-vm/README.md), con architettura, reti, sicurezza, operazioni Meilisearch, artefatti, roadmap e diario in italiano. I dettagli preliminari e i limiti originali restano conservati sotto. Questo aggiornamento è **solo documentale** e non indica che il deployment sia stato eseguito.
>
**Stato: analisi preliminare, da progettare. Aggiornamento: 5 novembre 2026.** Questo documento registra le indicazioni dell’utente e i punti da definire. Non è un progetto esecutivo, un’autorizzazione al deployment o una dichiarazione che l’ambiente esista già.

## Obiettivo

Rendere Mercurion disponibile su richiesta per dimostrazioni a potenziali clienti e partner. La continuità 24 ore su 24 non è un requisito: la demo può essere normalmente offline e avviata quando serve. L’obiettivo è mostrare applicazione, architettura e competenze senza il costo ricorrente di una VPS dedicata.

## Indirizzo deciso e prime ipotesi

| Aspetto | Indicazione dell’utente | Stato |
| --- | --- | --- |
| Host | Computer di lavoro dell’utente, con 24 CPU logiche | Indicato dall’utente |
| Virtualizzazione | Una macchina virtuale locale tramite Hyper-V | Direzione scelta |
| Sistema guest | Ubuntu Server | Direzione scelta; versione e configurazione da definire |
| Disco SSD | Circa 150–200 GB | Ipotesi da dimensionare con i dati reali |
| RAM | Circa 18–20 GB, eventualmente fino a circa 28 GB | Ipotesi da misurare insieme alle risorse necessarie all’host |
| CPU guest | Una parte delle CPU logiche disponibili | Numero e limiti da definire |
| Accesso remoto | Cloudflare Tunnel per rendere raggiungibile la demo | Direzione proposta; configurazione e modalità di accesso da progettare e provare |
| Disponibilità | Attivazione su richiesta, con possibili periodi offline | Requisito accettato per la demo |

Le risorse indicate non sono una stima validata. Misurare l’occupazione di indici, database, immagini e volumi, includendo lo spazio temporaneo per importazioni e ripristini. Misurare memoria e CPU durante avvio, uso della demo e manutenzione prima di fissare il dimensionamento.

## Progettazione da completare

- Per la preparazione del container Tox21 e il suo allineamento agli artefatti Web, seguire la [roadmap dedicata](tox21-container-roadmap.md). È pianificazione della consegna applicativa: non definisce né autorizza la topologia o il deployment della VM.
- Per il perimetro portfolio chiarito il 6 novembre, l’adozione della rotazione JWT coordinata è rinviata; codice e prove già predisposti restano conservati. [T21-02](tox21-runtime-qa.md) mantiene auth tutto-o-nulla, default pubblico interno e file PEM pubblico singolo quando attiva. Il futuro disegno di rete della demo deve considerare questo assetto senza assumere il completamento della rotazione o attivarla come prerequisito implicito.
- Definire servizi e ambienti necessari alla demo, confini rispetto allo sviluppo e modalità di avvio/arresto. La vecchia suddivisione in ambienti non è automaticamente approvata per la VM.
- Definire routing, dominio, autenticazione degli ospiti, funzionamento del realtime attraverso il tunnel e accesso amministrativo. Scegliere quali servizi devono restare raggiungibili solo internamente.
- Progettare configurazione e segreti, inclusi identità della macchina, bootstrap e comportamento dopo riavvio. L’eventuale Secret Manager, il provider e le modalità di gestione sono da definire nel nuovo contesto; non assumere come adottata la vecchia soluzione VPS.
- Coordinare con [AUTH-02 — rotazione JWT](../../MercurionWebNg/docs/portfolio-ux/JWT-KEY-ROTATION.md): mantenere distinti codice e prove già svolte dalle scelte ancora aperte per la VM, inclusi provider, consumer Tox21 e verifica operativa della revoca.
- Definire dati demo, conservazione, backup e prova di ripristino, oltre ai log e alla loro consultazione. Le strategie specifiche e la separazione tra eventuali ambienti restano da progettare.
- Definire verifiche di funzionamento e criteri di accettazione della demo, inclusi rete non disponibile, riavvio e limiti comunicati ai partecipanti.

Notebook, Synthesis e integrazione object store/R2 seguono la [roadmap applicativa](../../MercurionWebNg/docs/portfolio-ux/ROADMAP.md); questa nota non ne modifica stato o feature flag.

## Cosa è stato fatto

Solo pianificazione preliminare. Non risultano creati o configurati VM, tunnel o servizi per questa proposta. La roadmap VPS precedente è stata sostituita: i suoi checkpoint e le sue scelte di topologia non vanno usati come requisiti impliciti.
