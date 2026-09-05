# SYS-020 — Electronic Lab Notebook: analisi funzionale e tecnica estesa

## Metadati

- Task: `0020-resolve-notebook-route-reachability.md`
- Source: `SYS-020`
- Trello card: `6a93bf97280aac615b016fbc`
- Stato raccomandato: **BLOCKED**
- Base path approvato: `/notebook/`
- Ambito: Electronic Lab Notebook `v1.0.0-beta`

## Sintesi decisionale

L'Electronic Lab Notebook deve rimanere nel prodotto e diventare una funzionalità
raggiungibile. I requisiti chiariti risolvono la precedente ambiguità sul destino
della feature e definiscono il base path Angular.

L'attività non è però una semplice correzione di routing. Per ottenere un flusso
realmente integrabile occorrono modifiche coordinate a modello persistente,
migrazioni, ownership, GraphQL, frontend Angular, editor, riordinamento
transazionale, collegamenti alle molecole e test browser end-to-end.

Si raccomanda quindi di mantenere `SYS-020` temporaneamente **BLOCKED** e di
riattivarla dopo avere completato, oppure anticipato con esplicita autorizzazione,
le fondamenta previste dalle task `0150–0152` e `0164–0167`.

## Analisi funzionale

### Scopo del Quaderno

Il Quaderno di laboratorio serve ad annotare e organizzare attività sperimentali.
La sua struttura esprime livelli scientifici differenti:

| Livello attuale | Nome di prodotto proposto | Significato |
| --- | --- | --- |
| Notebook | Quaderno di laboratorio | Contenitore complessivo, assimilabile a una tesi |
| Chapter | Fase di progetto | Fase o argomento scientifico del progetto |
| Section | Protocollo sperimentale | Definizione teorica o ricetta di un esperimento |
| Page | Esecuzione sperimentale | Istanza pratica, osservazioni e risultati dell'esperimento |

Le denominazioni definitive devono essere approvate prima della riattivazione.
Nella prima iterazione è preferibile mantenere stabili nomi di tabelle e contratti
tecnici esistenti, introducendo i nuovi termini nell'interfaccia. Eventuali rename
GraphQL dovranno essere compatibili e accompagnati da deprecazione e codegen.

### Gerarchia non completa

La gerarchia è ordinata, ma ogni livello deve poter esistere senza discendenti:

```text
Quaderno di laboratorio
└── zero o più Fasi di progetto
    └── zero o più Protocolli sperimentali
        └── zero o più Esecuzioni sperimentali
```

Ne consegue che:

- il Quaderno può contenere soltanto titolo e premessa;
- una Fase può contenere una discussione senza Protocolli;
- un Protocollo può contenere una descrizione senza Esecuzioni;
- ogni livello è leggibile e modificabile indipendentemente dai figli;
- le collezioni figlie assenti devono essere esposte come array vuoti.

### Allegati

Ambito raccomandato per la prima versione:

- molecole: incluse e associate alle Esecuzioni sperimentali;
- sintesi: differite a una fase successiva;
- documenti e file: differiti alla card dedicata;
- nessun sistema polimorfico generico di attachment finché non saranno definiti
  lifecycle, autorizzazioni e requisiti dei diversi tipi di allegato.

## Contratto di routing

### Lista e modifica

- `/notebook/`: elenco dei Quaderni tramite card, con creazione e modifica;
- `/notebook/:notebook_id/edit`: modifica di titolo e premessa;
- `/notebook/:notebook_id/edit?c_id=<chapter_id>`: modifica della Fase;
- `/notebook/:notebook_id/edit?c_id=<chapter_id>&section=<section_id>`:
  modifica del Protocollo;
- `/notebook/:notebook_id/edit?c_id=<chapter_id>&section=<section_id>&page_id=<page_id>`:
  modifica dell'Esecuzione.

### Lettura e indice

- `/notebook/:notebook_id/index`: indice navigabile con link;
- `/notebook/:notebook_id/edit/index`: indice a card riordinabili;
- `/notebook/:notebook_id`: lettura dell'intero Quaderno;
- le combinazioni di `c_id`, `section` e `page_id` selezionano una Fase, un
  Protocollo o una Esecuzione, includendo gli eventuali discendenti.

### Invarianti degli URL

- `section` è valido soltanto insieme a `c_id`;
- `page_id` è valido soltanto insieme a `c_id` e `section`;
- ogni discendente deve appartenere al genitore dichiarato nell'URL;
- risorse inesistenti, cross-owner o combinazioni incoerenti restituiscono un
  esito not-found senza rivelare l'esistenza della risorsa;
- gli attuali parametri frontend `s_id` e `p_id` devono essere sostituiti dal
  contratto approvato `section` e `page_id`;
- la route statica `edit/index` deve avere precedenza sulle route dinamiche.

## Decisioni ancora necessarie

Prima dello sblocco devono essere approvate esplicitamente:

1. le denominazioni definitive dei tre livelli discendenti;
2. l'access policy consigliata: `AuthGuard` e ownership personale;
3. la voce “Quaderni di laboratorio” nella sezione “Funzionalità” della sidenav;
4. l'associazione delle molecole alle sole Esecuzioni nella prima versione;
5. il comportamento not-found per URL e gerarchie incoerenti.

## Analisi del modello dati

Il modello attuale non rappresenta contenuto autonomo su tutti i livelli:

- il Quaderno contiene soltanto il titolo;
- il Chapter non ha contenuto;
- la Section espone un semplice `description` testuale;
- soltanto la Page dispone di `content` e `sanitizedText`.

### Modello raccomandato

- Quaderno: `title`, `premiseDelta`, `premiseText`;
- Fase: `title`, `contentDelta`, `sanitizedText`;
- Protocollo: `title`, `contentDelta`, `sanitizedText`;
- Esecuzione: `title`, `contentDelta`, `sanitizedText`.

Il Delta Quill deve essere il contenuto canonico e deve essere memorizzato come
JSONB. Il testo sanificato deve essere derivato esclusivamente lato server dal
Delta validato e non deve essere accettato come dato autorevole dal client.

È necessaria una migrazione deterministica degli attuali `description` e
`content`, con una strategia esplicita per i record HTML o testuali già presenti.
Non è sufficiente affidarsi a `synchronize` per una modifica destinata a essere
integrata e distribuita.

## Ordered tree, ownership e concorrenza

L'interfaccia drag & drop non deve essere collegata direttamente alle mutation di
reorder attuali. Sono presenti problemi strutturali già coperti dalle task
`0164–0167`:

- costruzione di SQL `CASE` mediante interpolazione degli ID;
- mancata verifica di duplicati e completezza della lista dei fratelli;
- controlli owner e parent non uniformi;
- creazione di figli senza verifica uniforme dell'ownership del genitore;
- allocazione `MAX(order) + 1` non sicura con richieste concorrenti;
- assenza di vincoli database sull'unicità dell'ordine tra fratelli;
- move e reorder non validati sulla stessa fotografia transazionale dei dati.

Sequenza tecnica richiesta:

1. migrazioni TypeORM versionate (`0150`);
2. vincoli e indici database (`0151`);
3. Unit of Work transazionale (`0152`);
4. dominio ordered-tree comune (`0164`);
5. SQL di reorder interamente parametrizzato (`0165`);
6. validazione atomica di owner, parent e sibling set (`0166`);
7. invarianti concorrenti e ordine deterministico (`0167`).

## Contratto GraphQL

Il lavoro GraphQL deve includere:

- query leggera per lista e indice, limitata a identità, titolo e ordine;
- query del Quaderno completo o del sottoalbero selezionato;
- CRUD di titolo e contenuto per ogni livello;
- mutation move/reorder attraverso il dominio ordered-tree;
- mutation attach/detach molecola con verifica di ownership;
- rigenerazione dello schema e dei tipi Angular;
- verifica automatica del drift GraphQL.

Una query annidata e illimitata non deve essere usata indiscriminatamente per
lista, indice, editor e lettura: ogni vista deve caricare soltanto i dati necessari.

## Architettura Angular

Il frontend deve introdurre:

- route lazy e protette sotto `/notebook`;
- parser tipizzato unico per route e query parameter;
- facade/store Notebook senza `any`;
- stati espliciti `loading`, `dirty`, `saving`, `saved` ed `error`;
- autosave serializzato, senza cancellazione silenziosa di scritture precedenti;
- retry esplicito e protezione dall'uscita con modifiche non salvate;
- lista a card, reader, editor e indice;
- Angular CDK drag & drop con alternativa accessibile da tastiera;
- selezione molecole riutilizzando i componenti esistenti;
- UI mobile-first, responsive e coerente in light/dark.

`ngx-quill` è già presente, ma deve essere configurato esplicitamente per Delta
JSON. L'attuale contratto basato su `string`/HTML non soddisfa la rappresentazione
canonica proposta.

Devono inoltre essere corretti:

- l'assenza delle route Notebook da `app.routes.ts`;
- la classificazione di una Section come Chapter quando sono presenti entrambi
  gli identificatori;
- il rename della Page che può sostituire il contenuto con il vecchio titolo;
- l'uso di `prompt`, `confirm` e `alert` come interfaccia primaria;
- subscription, refresh ed error handling non coordinati.

## Workload deterministico di recupero

1. Approvare nomi, access policy, navigazione e scope allegati.
2. Completare migrazioni e contratto Quill Delta.
3. Completare dominio ordered-tree e invarianti di ownership/concorrenza.
4. Aggiornare entity, DTO, resolver e service GraphQL.
5. Rigenerare schema e tipi client.
6. Implementare route, facade e selezione gerarchica Angular.
7. Implementare lista, lettura, editor e indice riordinabile.
8. Implementare i link alle molecole.
9. Aggiungere test unitari, integrazione PostgreSQL, GraphQL e browser E2E.
10. Eseguire il lifecycle completo di integrazione previsto dal PROTOCOL.

## Piano di validazione

- unit test del parser route/query e delle gerarchie invalide;
- unit test di state, reorder, dirty/autosave/error/retry;
- contract test ordered-tree sui tre livelli ordinati;
- integration test PostgreSQL per ownership, parent identity e concorrenza;
- GraphQL integration test e schema/codegen drift check;
- verifica della persistenza di Delta, testo derivato e link molecole;
- accesso cross-owner negato;
- E2E tramite `http://localhost:8888`:
  create Quaderno → Fase → Protocollo → Esecuzione → edit → reorder → reload → read;
- controllo console browser e richieste `/api/graphql`;
- `npm ci` seguito da `npm run ci:check`;
- human review prima del commit.

## Impatto sulle dipendenze

La chiusura transitiva censita da `SYS-020` comprende 12 task:

```text
0114, 0195, 0197, 0198, 0205,
0214, 0215, 0216, 0217, 0218, 0219, 0220
```

`0114` è già `BLOCKED`. Le altre 11 task sono pending ed esposte a
`SKIPPED_DEPENDENCY` se gli altri prerequisiti vengono recuperati lasciando
`SYS-020` bloccata. Alcune hanno già ulteriori prerequisiti terminali: completare
soltanto `SYS-020` non le renderebbe immediatamente eseguibili.

Il costo prospettico del blocco è quindi rilevante, ma non giustifica una
implementazione monolitica che duplichi o anticipi in modo insicuro il lavoro
dati e ordered-tree.

## Condizioni di sblocco e integrazione

La task può essere riattivata soltanto dopo:

- approvazione delle decisioni ancora aperte;
- completamento o anticipo autorizzato di `0150–0152` e `0164–0167`;
- autorizzazione umana alla riapertura di `SYS-020`;
- decisione esplicita sulla branch `feature/SYS-020` già preservata.

Il successivo lifecycle deve rispettare il PROTOCOL:

1. preflight pulito da `develop` aggiornato;
2. `npm ci` e `npm run ci:check` prima dello sviluppo;
3. implementazione e validazione sulla feature branch;
4. CI verde sull'esatto feature SHA;
5. merge esplicito `--no-ff --no-gpg-sign` su `develop`;
6. CI sull'esatto merge SHA;
7. in caso di fallimento, timeout o risultato non verificabile: revert ordinario
   del merge, verifica del revert verde, metadata `REVERTED` e conservazione della
   feature branch per la diagnosi.

