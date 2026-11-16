# Strumenti dell'operatore: delivery, ripristino segreti, scope amministrativi

**VM da riaccendere:** seguire la [procedura completa per shutdown VM o riavvio host](#riaccensione-staging-dopo-shutdown), con ripristino segreti, avvio servizi e verifica Cloudflare.

Questa guida riguarda **preview**, non la produzione. I comandi sono eseguibili
da un normale terminale, senza agenti AI. I tre strumenti sono distinti:

| Esigenza | Strumento | Cosa cambia |
| --- | --- | --- |
| Generare gli scope del proprio amministratore | `admin:scopes` | Scrive un JSON cifrato locale; nessuna connessione DB |
| Dopo reboot, ripristinare file volatili | `restore_preview_secrets.py` | Ripristina server, app e token Cloudflare mancanti su `/run`; non avvia servizi |
| Consegnare nuove immagini applicative | `preview_application_rollout.py` | Aggiorna solo le app selezionate; conserva immagini e override per rollback |

**Validazione attuale:** typecheck Nest e test locali di cifratura reale passati.
I test Python simulano SSH e Docker, includendo errori e rollback. In aggiunta, i receiver server/app e Cloudflare sono stati provati in un container Linux temporaneo, senza rete, con /run tmpfs e dati sintetici: permessi e skip del token attivo verificati. Queste prove non equivalgono
a un rollout reale o a un reboot della VM. Il primo collaudo operativo resta da
eseguire. Nessuno dei comandi mutanti di questa guida è stato lanciato sulla VM
per preparare questi strumenti. Nessun commit, push o esito CI remoto è implicito.

## 1. Prerequisiti e provenienza dei valori

Sul PC Windows: checkout MercurionWeb, Node con dipendenze già installate,
Python 3.12 o successivo, client OpenSSH e alias `mercurion-server` già verificato.
Sulla VM: Docker/Compose, Python 3, release già installate e sudo interattivo.
Nessun nuovo pacchetto viene installato dagli strumenti.

Il file pubblico [preview-operations.example.json](../../../scripts/infrastructure/preview-operations.example.json)
registra **i nomi effettivi di questa installazione**, non valori da inventare
per una nuova macchina. Contiene host, run ID, percorsi delle release, progetto
Compose e identificatori Nginx. Non contiene password. Leggerlo e confrontarlo
con i propri percorsi prima di usarlo. Si può copiarlo e passare la copia con
`--profile`: non serve modificare gli script per cambiare questi riferimenti.

| Valore | Origine |
| --- | --- |
| Password/chiavi stabili e provider | File privato Windows `C:/Users/giuli/.mercurion/preview/configuration.json`, già compilato dall'operatore |
| Chiave usata per cifrare gli scope | `applicationSecrets.APP_AES_SECRET` nello stesso file privato |
| Token Cloudflare ruotato | File privato locale scelto e predisposto dall'operatore; solo token, senza comando Docker o virgolette |
| Utenti DB, host, porte, variabili applicative non segrete | Generatore esistente `preview_credentials.application_document`: usa il **file tracciato** `MercurionWebNode/env/.env.example` e gli override preview espliciti nella funzione |
| IP proxy fidato per le app | IP attuale di Nginx su `edgeNetwork`, letto con Docker nella fase applicativa |
| Lista dei privilegi amministrativi | `ScopeService.adminScopes`, inclusa la lista locale aggiunta dall'operatore |
| Algoritmo e formato scope | `ScopeService.encryptScopes` → `SecurityService.encrypt_AES256_GCM`, AES-256-GCM, IV casuale e tag autenticato |

Il ripristino **riusa** il generatore della prima installazione: non importa
`.env.development` e non indovina nuove variabili. Attualmente il generatore
assegna DB e utente `mercurion_preview`; questa guida non li rinomina in
`mercurion`/`app`. Se vuoi gestire tutti i valori non segreti in un file diverso,
occorre un cambiamento esplicito della fonte di configurazione, non una modifica
silenziosa del ripristino. Non cambiare password stabili per correggere un login.

Il token locale va conservato in una directory privata con ACL limitate al tuo
utente e SYSTEM, come il file di configurazione. Non inserirlo nel repository,
nel profilo pubblico, nella riga di comando o in chat. Il percorso è un argomento;
lo script non decide dove conservarlo. Gli strumenti non generano nuovi segreti.

## 2. Scope amministratore: locale, offline, senza database

**PowerShell Windows, dalla root del repository:**

```powershell
npm.cmd run admin:scopes --workspace mercurion_web_node -- --configuration C:/Users/giuli/.mercurion/preview/configuration.json --out C:/Users/giuli/.mercurion/preview/root-scopes.json
```

Su Windows usare esplicitamente `npm.cmd`: nel terminale verificato il wrapper
`npm.ps1` non inoltrava correttamente le opzioni del CLI. Il comando completo
con `npm.cmd` è stato eseguito su un file sintetico e ha esportato 25 scope.

Il CLI importa i veri servizi TypeScript, senza avviare Nest, Redis, Meili o
PostgreSQL. Legge solo la chiave AES necessaria dal documento locale, cifra il
preset amministratore con IV diversi, verifica la decifratura e salva **un array
JSON di stringhe cifrate**. Lo stdout contiene soltanto esito e numero di scope.
Non stampa la chiave e non modifica il file di configurazione. Il file di output
deve stare nella stessa directory privata della configurazione, fuori dal repo;
se esiste già, il comando fallisce senza sovrascriverlo.

In pgAdmin seleziona il tuo utente effettivo e applica l'array alla colonna JSONB
`users.scopes`, verificando l'UUID prima del salvataggio. Il tool **non crea un
utente di nome root**, non sceglie un account e non aggiorna il DB. Gli scope
cifrati sono materiale di autorizzazione: non pubblicarli. La chiave deve essere
quella effettivamente usata dalla build staging. Dopo una modifica dei privilegi,
eseguire una nuova autenticazione: i vecchi claim JWT possono non coincidere più
con gli scope DB. Le sessioni già esistenti non vengono cambiate dal CLI.

## 3. Dopo reboot: un comando locale per i segreti

### Prerequisito sul guest

LUKS deve essere sbloccato e SSH raggiungibile. Per rilevare l'IP proxy Nginx
deve essere avviato e collegato a `mercurion_stg_web`. Nginx non richiede segreti.
Se è arrestato, dalla **shell Ubuntu**:

```bash
sudo docker start mercurion-shared-nginx-edge-1
```

Questo avvia il container esistente, non ricrea reti o volumi. Un 502 temporaneo
è possibile finché le app sono ferme. Non avviare i vecchi server conservati per
rollback. Se Nginx non esiste, il profilo non descrive l'installazione corrente:
fermarsi e correggere il profilo con i riferimenti effettivi.

### Piano senza lettura dei file privati

**PowerShell Windows dalla root:**

```powershell
python -B scripts/infrastructure/restore_preview_secrets.py --profile scripts/infrastructure/preview-operations.example.json
```

Il piano non apre SSH e non legge configurazione privata o token. Mostra host,
componenti e assenza di avvii.

### Esecuzione

Nel comando seguente **sostituire** `PERCORSO_PRIVATO_DEL_TOKEN.txt` con il percorso
del file che hai scelto. Non sostituirlo con il valore del token.

```powershell
python -B scripts/infrastructure/restore_preview_secrets.py --profile scripts/infrastructure/preview-operations.example.json --configuration C:/Users/giuli/.mercurion/preview/configuration.json --cloudflare-token-file PERCORSO_PRIVATO_DEL_TOKEN.txt --execute
```

Le fasi leggibili sono:

1. Validazione locale, senza modifica o rigenerazione delle credenziali.
2. Server: `prepare` tramite sudo, trasferimento su stdin SSH senza sudo, `apply`
   tramite sudo. Sono riusati `preview_server_secrets.py` e i permessi già definiti.
3. App: stessi tre passaggi con `preview_application_secrets.py`; IP proxy letto
   dal container Nginx, master Meili e password admin PG esclusi dal payload app.
4. Cloudflare: token trasferito in inbox privata su `/run`, poi spostato al file
   `/run/mercurion-cloudflared/token`, UID/GID 65532 e permessi 0400.

I segreti viaggiano su stdin e non negli argomenti del processo SSH. La password
sudo usa una sessione interattiva separata, mai lo stdin del payload. SSH chiede
la passphrase nel terminale; sudo può richiedere più autenticazioni. Lo script
non installa agent o modifica sudoers per eliminarle.

Se i documenti sono già attivi, ne controlla i metadati e li lascia invariati:
non è uno strumento di rotazione. Una directory incompleta fa fallire la fase
senza cancellazione automatica. Conservare la fase e controllare il relativo
percorso; non rilanciare un bootstrap del DB. Non cambiare `runId` per aggirare
un errore: i mount dei container puntano ai run esistenti.

L'esito `secrets-ready` significa **file pronti**, non servizi avviati. I file su
`/run` si perdono a ogni reboot; i volumi dati restano. Per gli avvii successivi
usare i container e i Compose correnti descritti nel memo: il tool non riapplica
il vecchio profilo PostgreSQL e non modifica l'HNSW.

## 4. Delivery e rollout delle sole applicazioni

### Cosa deve già esistere

Servono i normali export verificati degli artefatti con `component.json`,
`image.tar`, SBOM, report vulnerabilità, policy, load log e runtime audit.
Il tool riusa `scripts/coordinate-delivery.py`: verifica checksum, provenienza,
revisione, target **staging**, identità dell'immagine e zero vulnerabilità a
qualsiasi gravità. Non costruisce immagini, non cambia dipendenze, non ignora
una scansione rossa. La scansione è quella fornita: va mantenuta aggiornata nella
preparazione degli artefatti, non è una scansione live durante il rollout.

Passare una o più opzioni `--web-node`, `--web-ng`, `--tox21`. Il parametro
`--web-revision` è il commit completo di Web atteso; Nest e Angular selezionati
devono corrispondervi. Tox21 mantiene la propria revisione e identità del modello.
Gli altri componenti non vengono aggiornati.

### Preparare e rivedere il bundle su Windows

Questi sono esempi con segnaposto **da sostituire**: non sono percorsi già creati.
La directory di destinazione deve essere nuova e il suo genitore già esistente.

```powershell
python -B scripts/infrastructure/preview_application_rollout.py prepare --profile scripts/infrastructure/preview-operations.example.json --web-revision SHA_WEB_COMPLETO --web-node CARTELLA_EXPORT_NEST --web-ng CARTELLA_EXPORT_ANGULAR --tox21 CARTELLA_EXPORT_TOX21 --bundle CARTELLA_NUOVA_DEL_BUNDLE
python -B scripts/infrastructure/preview_application_rollout.py plan --bundle CARTELLA_NUOVA_DEL_BUNDLE
```

Per un fix solo Nest, omettere `--web-ng` e `--tox21`. Il bundle è pubblico: non
contiene file privati o nuovi segreti. `plan` non accede alla VM. Leggere
`profile.json` e `rollout.json`: il piano elenca esattamente gli aggiornamenti.

### Rollout esplicito

```powershell
python -B scripts/infrastructure/preview_application_rollout.py deploy --bundle CARTELLA_NUOVA_DEL_BUNDLE --execute
```

Il comando:

1. Rivalida il bundle, poi lo trasferisce con SCP alla home della VM.
2. Con sudo verifica i byte contro il manifest fissato dall'host e copia in una
   release root-owned `/opt/mercurion/releases/rollout-<runId>`.
3. Controlla progetto Compose e identità dei container esistenti. Carica gli
   archivi senza muovere tag; esegue save/load roundtrip del digest config.
4. Conserva `previous-images.json` con gli ID realmente in uso e scrive
   `new-images.json`. Sono piccoli override Compose: solo `image` e `pull_policy`.
5. Valida il Compose combinato e applica `up -d --no-deps --pull never` soltanto
   ai servizi selezionati. Mantiene env, mount, volumi, reti e limiti del Compose
   base. Non esegue schema sync, SQL, cleanup o upgrade dei server dati.
6. Controlla immagini dei processi avviati e risposte HTTP 200 di `/health` e `/`
   attraverso Nginx. Scarica il report pubblico `rollout-result.json`.

Questi smoke **non provano** login, RPC Tox21, correttezza della SPA o tutti i bug
applicativi. I breakpoint e l'accettazione funzionale sono passaggi distinti.
Nginx e Cloudflare non sono ricreati dal rollout; perciò Access/DNS restano invariati.

Gli override non riscrivono il Compose base. Per gestire manualmente l'ultima
versione adottata, includere entrambi i file:

```bash
sudo docker compose --env-file /dev/null -p mercurion-preview -f /opt/mercurion/releases/application-07fd750861be434b8de3c768bc9a6353/preview-applications.json -f /opt/mercurion/releases/rollout-RUN_ID_EFFETTIVO/new-images.json up -d --no-deps web-node-preview
```

Sostituire `RUN_ID_EFFETTIVO` con quello della ricevuta e indicare il servizio
che si intende gestire. Usare il solo Compose base può ripristinare le vecchie
immagini: l'override è parte del comando operativo. Dopo rollout parziali,
conservare gli override precedenti necessari per gli altri componenti quando
si vuole avviare l'intero progetto. Non usare `down -v`, `prune` o `--remove-orphans`.

### Errore, report non scaricato e rollback

Un errore interrompe l'operazione, conserva il bundle e `rollout-state.json`.
Non c'è retry o rollback nascosto. Il rollback immagini è esplicito:

```powershell
python -B scripts/infrastructure/preview_application_rollout.py rollback --bundle CARTELLA_DEL_BUNDLE_GIA_DISTRIBUITO --execute
```

Riutilizza le immagini precedenti senza toccare dati o schema e ripete gli smoke. Dopo un rollback riuscito, per i successivi comandi Compose manuali usare `previous-images.json` di quel run al posto di `new-images.json`: questo ultimo descrive ancora la release annullata.
Non è un rollback dei dati: non usare questo percorso per release che richiedono
modifiche incompatibili allo schema. Il tool non applica tali modifiche.

Se lo step remoto è passato ma SCP del report fallisce, non rieseguire deploy.
Il report è leggibile dalla shell Ubuntu:

```bash
sudo cat /opt/mercurion/releases/rollout-RUN_ID_EFFETTIVO/rollout-state.json
```

Contiene soltanto ID immagini, stato e orario, non password. Se l'operazione è
ancora `running` dopo un'interruzione del client, controllare i container prima
di qualsiasi ripresa. `failed` può significare un'app già sostituita: il report
conserva gli ID precedenti, ma non afferma che siano già stati ripristinati.

## 5. Collaudo locale riproducibile

**PowerShell Windows dalla root:**

```powershell
python -B -m unittest discover -s scripts/infrastructure -p test_preview_operations.py
npm.cmd test --workspace mercurion_web_node -- --runInBand --runTestsByPath src/admin-scopes.cli.spec.ts src/app_modules/auth/services/scope.service.spec.ts
```

I test usano solo dati sintetici. Coprono separazione SSH/sudo/stdin, skip dei
segreti esistenti, allowlist applicazioni, override immagine, mismatch del digest,
conservazione del rollback in errore, cifratura autenticata reale, IV casuali,
rifiuto della chiave errata e mancata sovrascrittura dell'output. La CI registra
anche il nuovo gruppo Python; non è stata eseguita o dichiarata verde da questi
controlli locali. Il file privato dell'operatore non è letto durante i test.

## 6. Avvio dopo reboot: un comando locale, nessuna ricreazione

Il nuovo `start_preview.py` riusa i ricevitori dei segreti già installati e avvia
**i container esistenti**. Non esegue `compose up`, non cambia immagini, volumi,
limiti PostgreSQL, schema o HNSW. Richiede VM avviata, LUKS sbloccato, SSH
raggiungibile e password/passphrase inserite dall'operatore nel terminale.

Il profilo aggiuntivo `preview-startup.example.json` identifica esplicitamente
la generazione server aggiornata `6d019947800b4578bc2b5d40791f5132`: i vecchi
container server del progetto `mercurion-preview` sono copie di rollback e non
vengono avviati. I nomi sono stati confrontati con `upgrade-result.json`.
Aggiornare il profilo quando si adotta un'altra generazione server.

Ordine: verifica presenza univoca di tutti i container; avvio Nginx per ottenere
l'IP del proxy; ripristino segreti server/app/token; avvio server dati; avvio
Tox21/Nest/Angular e HTTP 200 su `/health` e `/`; infine avvio cloudflared.
L'avvio del processo cloudflared non prova la connessione al suo edge: verificare
poi stato Healthy nel pannello e accesso HTTPS autorizzato dal browser.
I segreti attivi vengono verificati e saltati, non sostituiti o ruotati.
Se una fase fallisce, lo script si ferma; i servizi già avviati rimangono accesi.
Conservare la fase e leggere lo stato prima di ripetere. Directory segreti
parziali richiedono verifica, non vengono cancellate automaticamente.

**PowerShell Windows, root MercurionWeb.** Sostituire il percorso del token con
il file privato scelto dall'operatore; il segnaposto non è un file da creare
con un valore fittizio. Non mettere il token nei parametri o nel repository.

```powershell
python -B scripts/infrastructure/start_preview.py --profile scripts/infrastructure/preview-operations.example.json --startup-profile scripts/infrastructure/preview-startup.example.json
```

Il comando precedente è solo piano: nessun SSH, lettura privata o avvio.
Dopo aver verificato i due profili pubblici:

```powershell
python -B scripts/infrastructure/start_preview.py --profile scripts/infrastructure/preview-operations.example.json --startup-profile scripts/infrastructure/preview-startup.example.json --configuration C:/Users/giuli/.mercurion/preview/configuration.json --cloudflare-token-file PERCORSO_PRIVATO_TOKEN_EFFETTIVO --execute
```

Non occorre pianificare un task Windows all'avvio del PC: la VM potrebbe avere
ancora LUKS bloccato. Questo è il singolo comando locale da eseguire **dopo**
lo sblocco. L'automatismo senza input della delivery è distinto dal ripristino
dei segreti amministrativi, che conserva l'autenticazione personale.

## 7. Debug remoto Nest senza pubblicare il debugger su Internet

Remote Explorer aiuta a leggere file e terminali sulla VM. Per breakpoint,
variabili e call stack serve invece il debugger Node, collegato da VS Code.
Il debugger è temporaneo; un breakpoint può sospendere le richieste dello
staging. Non abilitarlo durante una delivery.

Le immagini attuali eliminano le source map dal container. VS Code puo
usare le mappe conservate sul PC quando dist e sorgenti corrispondono alla
build remota: seguire la sezione **Debug Nest — lavorare sui TypeScript locali**.
Il JavaScript virtuale in Loaded Scripts e soltanto un ripiego diagnostico.
Le mappe non vengono pubblicate al frontend.

Il tool `preview_nest_debug.py`, eseguito sulla VM con sudo, legge il backend
corrente e i suoi file Compose dalle etichette Docker. Conserva immagine e
comando originali; aggiunge soltanto inspector e binding host
`127.0.0.1:19229 → container:9229`, poi ricrea **solo Nest**. Il bootstrap dei
segreti rimane `dist/src/bootstrap-secrets.cli.js`. Nessun database, volume,
password, altro servizio o regola Hyper-V viene modificato.

Il listener inspector è aperto alle interfacce del container per consentire il
mapping Docker, ma la porta host è esclusivamente loopback. Gli altri container
sulle sue reti possono comunque raggiungerlo: usarlo solo durante il debug e
disabilitarlo alla fine. Non creare route Cloudflare, port forwarding router o
binding `0.0.0.0` sull'host per il debugger.

**PowerShell Windows, root repository:**

```powershell
scp scripts/infrastructure/preview_nest_debug.py mercurion-server:preview_nest_debug.py
```

**Shell Ubuntu:** il percorso `debug-nest-01` è una nuova directory di stato,
non una configurazione applicativa. Se esiste già, non cancellarla né ripetere
l'abilitazione con lo stesso nome.

```bash
sudo python3 -B "$HOME/preview_nest_debug.py" enable --directory "$HOME/debug-nest-01"
```

Atteso `status: enabled`, `imageUnchanged: true`. Se errore, conservare directory
e output: un errore successivo alla ricreazione può lasciare il debugger attivo.

**PowerShell Windows, nuova finestra da lasciare aperta:**

```powershell
ssh -N -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -L 127.0.0.1:19229:127.0.0.1:19229 mercurion-server
```

In VS Code: Run and Debug → **Preview Nest via SSH (TypeScript locale)**.
Aprire il file TypeScript dal repository, posizionare il breakpoint nella
funzione da osservare e riprodurre il flusso nel browser su preview. Non esportare schermate di variabili contenenti token,
password, cookie o profili personali. I log 299 del contratto legacy sono
avvisi distinti dall'eccezione applicativa.

Alla fine disconnettere VS Code, poi **shell Ubuntu**:

```bash
sudo python3 -B "$HOME/preview_nest_debug.py" disable --directory "$HOME/debug-nest-01"
sudo python3 -B "$HOME/preview_nest_debug.py" status --directory "$HOME/debug-nest-01"
```

Attesi comando Node originale e binding vuoti. Il tool rifiuta il ripristino se
un rollout ha cambiato l'immagine nel frattempo. Chiudere il tunnel con Ctrl+C.
Ricontrollare `/health` e la pagina nel browser. Un nuovo debug usa una nuova
directory; non viene sovrascritta la precedente ricevuta.

Riferimenti tecnici: [Node inspector e tunnel SSH](https://nodejs.org/en/learn/getting-started/debugging),
[debug Node in VS Code](https://code.visualstudio.com/docs/nodejs/nodejs-debugging).

## 8. Delivery automatica su `preview`: cosa è predisposto

Il branch `preview` esiste già; il checkout di lavoro non è stato spostato.
La CI viene estesa ai push su `preview` e pubblica, solo dopo il controllo
security riuscito, immagini staging e prove con retention di tre giorni.
`preview-delivery.yml` reagisce al completamento di **CI**, verifica push della
stessa repository/branch, SHA ancora corrente e `Required gate` verde di quel
run. Non parte per PR, fork, CI rossa o revisione superata. Il driver locale
ripete questi controlli e verifica il digest GitHub di ogni archivio scaricato.

Questa prima pipeline consegna **web-node e web-ng insieme**. Tox21 rimane
sull'immagine corrente: il rollout manuale precedente supporta anche Tox21,
ma il trigger e gli artefatti della sua repository richiedono configurazione
separata. Nessuna modifica è stata apportata alla repository Tox21.

L'esecuzione sul runner non fa checkout, build o install di codice ricevuto.
Esegue soltanto `preview_ci_delivery.py` installato e revisionato localmente.
I file scaricati sono dati: verifica componenti/digest/security, prepara il
bundle e lo invia con una chiave dedicata. Sulla VM, un gateway forced-command
accetta soltanto upload limitato e deploy con ID/hash esatti. Nessuna shell,
SFTP generico o forwarding per quella chiave; il normale SSH personale resta
invariato. Il broker privilegiato esegue **moduli root-owned già installati**,
mai gli script inclusi nell'artefatto, e vincola il target al profilo locale.

La delivery resta **disabilitata** finché `PREVIEW_DELIVERY_ENABLED` non è `true`.
Runner, chiave, sudoers e broker **non sono installati** da questa modifica.
La sequenza di installazione e i controlli richiesti sono in
[INSTALL-DELIVERY.md](INSTALL-DELIVERY.md). Nessun deploy remoto è stato
eseguito durante la preparazione dei file.

## 9. Errori applicativi ancora aperti

- SSO ORCID nuovo utente: PostgreSQL ha riportato `users.created_at` nullo.
  `createSsoUser` non valorizza i timestamp e l'entity non dichiara un default.
  La cattura generale di `QueryFailedError` nel flow SSO maschera la causa con
  `SSO_Unauthorized::failed callback flow`. Confrontare schema/default di dev
  e staging prima della correzione; i log disponibili non dimostrano un errore
  di Cloudflare Access.
- `/register`: messaggio «email già registrata» con HTTP 200. Occorre acquisire
  corpo della risposta, errore GraphQL/applicativo e punto frontend che mostra
  il messaggio; lo status HTTP da solo non decide l'esito di business.

Non sono stati corretti in questa preparazione degli strumenti.

## Debug Nest — ripristinare il collegamento prima dei breakpoint

La configurazione locale di VS Code «Preview Nest via SSH (JavaScript distribuito)»
si collega a 127.0.0.1:19229. Nel controllo Windows del 13 novembre questa porta
non era in ascolto: ciò non prova che l'inspector sulla VM sia spento, ma impedisce
l'attach dal PC. Il forward Meilisearch 17700 è separato: lasciarlo aperto.

### VS Code aperto localmente su Windows

In una NUOVA PowerShell Windows, lasciare questo comando in esecuzione:

```powershell
ssh -N -T -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -L 127.0.0.1:19229:127.0.0.1:19229 mercurion-server
```

Inserire la passphrase solo nel terminale. Dopo l'autenticazione il comando non
stampa un prompt: è normale. Non chiudere questa finestra durante il debug.
In un'altra PowerShell Windows verificare:

```powershell
curl.exe --noproxy '*' --silent --show-error --max-time 5 http://127.0.0.1:19229/json/list
```

È atteso un array con un target Node e webSocketDebuggerUrl. Non è sufficiente
che la sola porta SSH risponda. Se la risposta è connection refused/timeout,
controllare l'inspector sulla VM, senza riavviare i servizi dati.

### VS Code aperto in una finestra Remote SSH

Se l'angolo inferiore sinistro di VS Code indica SSH: mercurion-server, il
debugger può essere eseguito sulla VM. In questo caso 127.0.0.1 della sessione
di debug può riferirsi alla VM, non al PC. Specificare prima quale finestra si
sta usando; la mancanza del listener Windows da sola non diagnostica quel caso.

### Cosa aspettarsi da VS Code

Con attach riuscito, la vista Loaded Scripts permette di aprire il JavaScript
caricato dal processo remoto e impostare breakpoint su quel file. Il call stack
con i frame è disponibile quando il processo è sospeso (breakpoint o Pausa),
non mentre esegue normalmente le richieste. La configurazione JavaScript di ripiego disabilita le source map.
Per il lavoro ordinario usare invece TypeScript locale, come descritto nella
sezione successiva, con dist e mappe corrispondenti alla build remota.
Prima di diagnosticare le mappe o modificare launch.json verificare il target
Node effettivamente raggiunto dal debugger.

Riferimento: https://code.visualstudio.com/docs/nodejs/nodejs-debugging

## Debug Nest — lavorare sui TypeScript locali

Questa procedura sostituisce l'uso dei file virtuali di Loaded Scripts come
modalita ordinaria. Usare VS Code sul repository Windows
`C:\.project_repo\MercurionWeb`, con il tunnel SSH 19229 gia aperto.
Non occorre riavviare Nest o ripetere l'abilitazione del debugger.

1. Con Shift+F5 scollegare la vecchia sessione di debug.
2. In Esegui e debug scegliere **Preview Nest via SSH (TypeScript locale)** e
   premere F5. La configurazione e in `.vscode/launch.json`.
3. Con Ctrl+P aprire il normale file
   `MercurionWebNode/src/app_modules/auth/controllers/account.controller.ts`;
   impostare il breakpoint nella funzione dell'endpoint da riprodurre.
4. Lavorare sui file sotto `MercurionWebNode/src`: Ctrl+clic o F12 segue le
   definizioni TypeScript; Ctrl+Shift+F cerca nel repository. Queste funzioni
   usano i sorgenti locali, non i file virtuali aperti da Loaded Scripts.
5. Riprodurre la richiesta nel browser. Il breakpoint deve risultare associato
   (pallino rosso pieno); al suo raggiungimento compaiono call stack e variabili.
   Il call stack puo essere vuoto mentre il processo e in esecuzione.

La configurazione associa `/usr/src/app` al percorso locale
`${workspaceFolder}/MercurionWebNode`, abilita `sourceMaps` e cerca il JavaScript
compilato in `${workspaceFolder}/MercurionWebNode/dist/**/*.js`. Le mappe `.js.map`
restano sul PC: non serve pubblicarle o copiarle nel container.

Verifica del 13 novembre 2026: tutti i 337 script applicativi letti dal processo
remoto corrispondono al dist locale, normalizzando esclusivamente CRLF/LF.
Una compilazione esclusivamente in memoria, con il trasformatore di import
usato da Nest, ha confrontato 433 mappe locali con i sorgenti attuali.
Solo `scope.service.ts` e `molecule-embedding.entity.ts` producono mappe diverse:
le loro mappe sono escluse esplicitamente da `resolveSourceMapLocations`.
Non usare breakpoint TypeScript su questi due file fino all'allineamento con
una build distribuita verificata; il JavaScript remoto resta il ripiego.
I file di controller, autenticazione e servizi utente verificati sono mappabili.

Non ricompilare dist durante questo debug: sostituirebbe il riferimento della
build remota. Una modifica TypeScript locale non cambia il processo sulla VM;
per eseguirla serve un successivo rollout. Dopo un rollout ricontrollare la
corrispondenza di dist/mappe e aggiornare le esclusioni soltanto se allineate.
Se un breakpoint resta grigio, usare il comando VS Code
**Debug: Diagnose Breakpoint Problems**, verificare il file e la configurazione
selezionati; non disabilitare la verifica del contenuto per forzare il binding.

Validazione: trasporto inspector, contenuti JavaScript e mappe verificati;
configurazione locale controllata. Il raggiungimento del breakpoint TypeScript
nell'interfaccia VS Code resta da confermare dall'operatore. Nessuna modifica a
container, database, segreti o importazione Meilisearch.

Riferimento: [debug remoto e source map in VS Code](https://code.visualstudio.com/docs/nodejs/nodejs-debugging).

## Diagnosi registrazione — richieste annullate e mail di conferma

Le richieste `is-email-available` sono verifiche di disponibilita, non l'invio
della registrazione. In Firefox `NS_BINDING_ABORTED` indica una richiesta
annullata: non e una risposta HTTP di errore di Nest. Nel validatore attuale
`of(control.value).pipe(debounceTime(200), ...)` emette subito al completamento
di `of`, senza attendere 200 ms; `distinctUntilChanged` vede un solo valore per
invocazione. La cancellazione della precedente validazione puo quindi abortire
la richiesta precedente. Riprodotto localmente senza chiamate HTTP.

Il backend imposta un blocco Redis di due ore prima della transazione di
registrazione. Il catch converte qualsiasi QueryFailedError, anche non dovuto
a duplicati, in USER_REGISTRATION_EMAIL_CONFLICT e non elimina quel blocco.
Una registrazione fallita puo quindi lasciare l'indirizzo non disponibile
pur senza aver creato l'utente. Questa e un'analisi del codice, non la conferma
della causa dello specifico tentativo remoto.

La registrazione accoda EMAIL_SEND/account-confirmation in outbox_events nella
stessa transazione dell'utente; la risposta positiva non attesta la consegna
SMTP. Il dispatcher controlla la coda ogni secondo, riprova gli errori fino a
cinque tentativi e poi imposta dead_letter. Se Nest e sospeso nel debugger,
anche il dispatcher non puo proseguire: riprendere l'esecuzione con F5.

**pgAdmin, Query Tool del database staging effettivamente usato da Nest:**

```sql
SELECT current_database() AS database_corrente;

SELECT id,
       status,
       attempt_count,
       to_timestamp(created_at::numeric / 1000) AS creato_il,
       split_part(last_error, E'\n', 1) AS errore
FROM public.outbox_events
WHERE event_type = 'EMAIL_SEND'
  AND payload->>'templateKey' = 'account-confirmation'
ORDER BY created_at DESC
LIMIT 10;
```

La query legge soltanto e non seleziona destinatari, payload completi o token.
Nessuna riga: verificare prima risposta POST /api/account/register e transazione;
non concludere che SMTP sia stato chiamato. pending/processing: invio in attesa,
in corso o in retry, da leggere insieme a tentativi ed errore. dead_letter:
tentativi esauriti, senza riaccodare prima di aver risolto la causa. succeeded:
il trasporto email ha restituito successo, non prova l'arrivo in posta in ingresso.
Non modificare righe della coda o chiavi Redis durante questa diagnosi.

Le ACL Hyper-V riportate dall'operatore consentivano DNS, TCP/443 e TCP/7844
verso Cloudflare, con deny finale; non includevano SMTP. Se EMAIL_SMTP_PORT e
465, 587 o 25, quella policy blocca la connessione. Il numero di porta va
confermato dall'operatore e lo stato attuale delle ACL va verificato prima di
qualsiasi modifica; non leggere o condividere password SMTP. Un timeout in
outbox e compatibile con questo blocco, ma da solo non identifica quale filtro
lo abbia causato. Nessuna apertura di porte eseguita in questa diagnosi.

Riferimento sulle cancellazioni HTTP Angular:
https://angular.dev/guide/http/making-requests

## Verifica email in attesa — Nest sospeso e timeout SMTP Resend

Il 13 novembre 2026 l'inspector remoto ha confermato una pausa effettiva del
processo Nest in SecureCookieService.getSignedCookie, nel JavaScript distribuito
secure-cookie.service.js, riga 53. Lo stack prosegue nell'hook onRequest di
cookies-request-context.configurator. Non sono stati letti valori dei cookie,
variabili applicative o segreti; nessun comando di ripresa e stato inviato.
La pausa impedisce il completamento delle richieste e del dispatcher outbox.
Il controllo dei cookie mancanti e racchiuso in try/catch nell'hook: durante
una richiesta anonima puo generare un'eccezione gestita normalmente.

**VS Code locale Windows:**

1. Nella sezione Breakpoints, se selezionata, disattivare **Caught Exceptions**
   (eccezioni gestite). Non rimuovere i propri breakpoint applicativi.
2. Con la sessione di debug selezionata premere **F5 / Continua**. Il processo
   deve risultare Running. Se si ferma di nuovo, leggere il motivo della pausa
   e la riga corrente prima di attribuire il blocco al validatore.
3. Tornare al browser e modificare l'email per avviare una nuova verifica.
   Verificare l'esito della richiesta is-email-available. Le vecchie richieste
   possono essere gia scadute; non usare il loro stato come nuova misura.

L'operatore ha riportato nell'outbox un errore di connessione in timeout e
confermato host smtp.resend.com, porta 465. Questa porta e supportata da Resend
con TLS implicito; non e coperta dalle ACL DNS/HTTPS/Cloudflare riportate finora.
Il timeout non prova da solo quale apparato stia bloccando il collegamento.

**Shell Ubuntu della VM, sola prova TCP senza autenticazione o invio mail:**

```bash
nc -4 -vz -w 5 smtp.resend.com 465
```

Success: il percorso guest IPv4 verso uno degli IP risolti e raggiungibile,
non prova quello del container ne le credenziali SMTP. Timeout: verificare le
ACL Hyper-V attuali e gli altri filtri prima di aprire una regola limitata al
servizio. Non disabilitare firewall o isolamento LAN e non ritentare l'invio
degli eventi dead_letter prima di aver risolto la connettivita.

Nessuna modifica a codice applicativo, regole ACL o servizi eseguita in questo
controllo. Il difetto del debounce e distinto dalla pausa osservata.
Riferimento: https://resend.com/changelog/smtp-service

## SMTP Resend — timeout confermato e verifica ACL Hyper-V

Esito riportato dall'operatore: dopo Continua/F5 il validatore email termina.
La pausa del debugger era quindi la causa dell'attesa osservata. La prova TCP
eseguita sulla VM ha invece restituito timeout su entrambi gli IPv4 risolti
per smtp.resend.com: 54.157.71.137 e 54.205.195.44, porta 465.
Non e un errore di password SMTP: questa prova non esegue autenticazione.

La policy precedentemente acquisita non permette TCP/465; il deny finale
blocca quel traffico. Questo identifica un impedimento da correggere nelle ACL,
ma non esclude altri filtri. Prima della modifica occorre la lettura attuale:
questa sessione non puo acquisirla per mancanza di privilegi Hyper-V.

**PowerShell Windows come amministratore, sola lettura:**

```powershell
Get-VMNetworkAdapterExtendedAcl -VMName 'Mercurion-Server' | Sort-Object Weight -Descending | Select-Object Direction,Action,LocalIPAddress,RemoteIPAddress,Protocol,LocalPort,RemotePort,Weight,Stateful | Format-Table -AutoSize
```

Intervento proposto, non applicato: due regole stateful Outbound Allow TCP,
RemotePort 465, ciascuna verso uno dei due IPv4 pubblici osservati con prefisso
/32. Proposta pesi 150 e 151, da verificare liberi sulla configurazione attuale:
precedenza inferiore ai deny delle reti private (201-209), superiore al deny
finale (10). Nessuna regola Inbound aggiuntiva, nessuna apertura alla LAN,
nessuna modifica a porte pubblicate, NAT, router o isolamento IPv6.

Gli indirizzi osservati sono risoluzioni DNS del momento, non indirizzi fissi
garantiti da Resend. Se cambiano, verificare nuovamente DNS e aggiornare soltanto
le regole dedicate con una procedura esplicita. Non aggiungere range ampi.
Non rilanciare Apply della vecchia policy DnsHttps per questa modifica: gestisce
un elenco diverso e non rappresenta le regole Cloudflare/SMTP aggiunte dopo.

Dopo la correzione autorizzata, ripetere nella shell Ubuntu la prova gia
presente nel memo:

```bash
nc -4 -vz -w 5 smtp.resend.com 465
```

Il successo TCP non prova ancora l'invio della mail dal backend: verificare
poi il percorso del container e lo stato dell'evento outbox. Un evento in
stato dead_letter non viene riprovato automaticamente; non riaccodarlo prima
di aver risolto la causa e identificato il singolo evento.

Riferimento ACL stateful e priorita:
https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/create-security-policies-extended-port-access-control-lists

## Abilitare Resend SMTP TCP/465 — regole Hyper-V limitate

Prerequisiti verificati dall'output dell'operatore: VM Mercurion-Server,
indirizzo guest 10.203.240.10, deny privati con peso 201-209, deny finale 10,
regole Cloudflare 110-129, pesi 150 e 151 liberi. Nessuna regola SMTP presente.
Gli IP Resend osservati dalla VM sono 54.157.71.137 e 54.205.195.44.
Comandi predisposti per l'intervento. Successivamente l'operatore ha confermato
la connessione TCP dal guest a 54.157.71.137:465; vedere la verifica seguente.

### 1. PowerShell Windows come amministratore

Eseguire ciascuna aggiunta una sola volta. Se un comando fallisce, conservare
l'errore e verificare lo stato prima di ripeterlo.

```powershell
Add-VMNetworkAdapterExtendedAcl -VMName 'Mercurion-Server' -Direction Outbound -Action Allow -LocalIPAddress '10.203.240.10/32' -RemoteIPAddress '54.157.71.137/32' -Protocol TCP -RemotePort '465' -Weight 150 -Stateful $true -IdleSessionTimeout 300 -ErrorAction Stop
Add-VMNetworkAdapterExtendedAcl -VMName 'Mercurion-Server' -Direction Outbound -Action Allow -LocalIPAddress '10.203.240.10/32' -RemoteIPAddress '54.205.195.44/32' -Protocol TCP -RemotePort '465' -Weight 151 -Stateful $true -IdleSessionTimeout 300 -ErrorAction Stop
```

Le regole consentono connessioni iniziate dal guest solo verso quei due IPv4
pubblici sulla porta 465. Stateful consente le risposte della connessione;
non serve aprire una nuova regola Inbound. I deny verso le reti private hanno
peso maggiore e restano prioritari. Non cambia la policy IPv6, NAT o router.

Verificare la configurazione risultante:

```powershell
Get-VMNetworkAdapterExtendedAcl -VMName 'Mercurion-Server' | Where-Object { $_.Weight -in 150,151 } | Sort-Object Weight | Select-Object Direction,Action,LocalIPAddress,RemoteIPAddress,Protocol,RemotePort,Weight,Stateful | Format-Table -AutoSize
```

Attese due regole Outbound Allow TCP/465, pesi 150 e 151 e Stateful True,
ciascuna con la destinazione /32 riportata sopra.

### 2. Shell Ubuntu della VM

```bash
nc -4 -vz -w 5 smtp.resend.com 465
```

Riportare success oppure timeout e l'IP indicato. Se DNS restituisce nuovi IP,
queste regole non li autorizzano: confrontare le risoluzioni prima di cambiare
altre impostazioni. Nessun success viene dichiarato prima di questa prova.
Dopo il successo guest resta la verifica del percorso dal container e dell'invio
SMTP applicativo. Non reinviare eventi outbox alla cieca: identificare prima
stato ed evento esatto, specialmente se gia in dead_letter.

### Rimozione delle sole due regole, se occorre annullare l'intervento

Non eseguire come parte dell'abilitazione. Prima della rimozione verificare
con la lettura del punto 1 che i pesi 150/151 corrispondano ancora alle due
regole dedicate, senza riutilizzi per altri servizi.

```powershell
Remove-VMNetworkAdapterExtendedAcl -VMName 'Mercurion-Server' -Direction Outbound -Weight 150 -ErrorAction Stop
Remove-VMNetworkAdapterExtendedAcl -VMName 'Mercurion-Server' -Direction Outbound -Weight 151 -ErrorAction Stop
```

Sintassi e nomi parametri confrontati con i cmdlet Hyper-V installati su
Windows PowerShell 5.1; nessuna mutazione eseguita dalla sessione di assistenza.
Riferimento: https://learn.microsoft.com/en-us/powershell/module/hyper-v/add-vmnetworkadapterextendedacl


## SMTP Resend — verifica dopo apertura TCP/465

Esito comunicato dall'operatore il 13 novembre 2026: dalla shell Ubuntu
`nc` raggiunge smtp.resend.com, IPv4 54.157.71.137, porta 465.
Questo conferma la connessione TCP dal guest per quella destinazione.
Autenticazione SMTP, percorso dal container e consegna della mail restano da verificare.

### 1. Shell Ubuntu: connessione dal container Nest

Il comando usa il modulo standard Node net: non legge credenziali, non invia
mail e chiude subito la connessione. Non richiede di installare nc nel container.

```bash
sudo docker exec mercurion-preview-web-node-preview-1 node -e 'const net=require("node:net"); const s=net.createConnection({host:"smtp.resend.com",port:465,family:4}); s.setTimeout(5000); s.once("connect",()=>{console.log("SMTP_TCP_OK ip="+s.remoteAddress);s.destroy();}); s.once("timeout",()=>{console.error("SMTP_TCP_TIMEOUT");s.destroy();process.exitCode=1;}); s.once("error",e=>{console.error("SMTP_TCP_ERROR "+e.code);process.exitCode=1;});'
```

Atteso `SMTP_TCP_OK ip=...`. In caso di timeout conservare l'errore:
non cambiare porta SMTP o password per risolvere un blocco TCP.

### 2. pgAdmin: leggere gli eventi di conferma account

Eseguire nel database staging usato dall'applicazione. La query non modifica
record e non mostra payload, destinatari o URL di attivazione.

```sql
SELECT current_database() AS database_corrente;

SELECT id,
       status,
       attempt_count,
       to_timestamp(created_at::numeric / 1000) AS creato_il,
       to_timestamp(available_at::numeric / 1000) AS prossimo_tentativo,
       split_part(last_error, E'\n', 1) AS errore
FROM public.outbox_events
WHERE event_type = 'EMAIL_SEND'
  AND payload->>'templateKey' = 'account-confirmation'
ORDER BY created_at DESC
LIMIT 10;
```

Interpretazione:
- `pending`: in attesa di un tentativo; Nest deve essere attivo e non sospeso dal debugger.
- `processing`: evento preso in carico, invio non ancora concluso.
- `succeeded`: il trasporto SMTP ha accettato l'invio; verificare anche ricezione e spam.
- `dead_letter`: tentativi esauriti (massimo 5); non riparte automaticamente.

Per un eventuale reinvio identificare prima l'id dell'evento corretto e la
validita della conferma. Non azzerare o reinviare tutti gli eventi.
Una registrazione HTTP riuscita prova l'accodamento, non la consegna email.


## Aggiornare segreti e variabili applicative gia attivi

Questa procedura manuale aggiorna il documento di Nest e riavvia solo il suo
container. E adatta, per esempio, a credenziali SMTP/OAuth/Turnstile e chiavi
client Meilisearch gia create. Non eseguirla per cambiare password PostgreSQL,
Redis/NATS, master key Meili, chiavi AES/JWT o identita DB: richiedono una
rotazione coordinata anche sui servizi o sui dati che le usano.

**Differenza fondamentale:** `restore_preview_secrets.py` e `start_preview.py`
conservano i documenti gia attivi. Non applicano le modifiche del JSON locale
ai file attivi. Un semplice restart senza aggiornare il documento rilegge i
vecchi valori. Un `.env` nella cartella Compose non sostituisce questo documento.

### 1. Windows: aggiornare la copia privata durevole

Aprire nell'editor `C:/Users/giuli/.mercurion/preview/configuration.json`.
Aggiornare solo i campi desiderati e salvare. Per SMTP i campi sono in
`providers`: `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_SECURE`,
`EMAIL_USERNAME`, `EMAIL_PASSWORD`, `EMAIL_DEFAULT_FROM`.
Le chiavi client Meili sono `meilisearchClients.searchKey` e `logKey`.
Non rigenerare l'intero file e non incollare valori in chat o nella shell.

**PowerShell Windows**, validazione senza stampa dei valori:

```powershell
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/preview_credentials.py validate --file C:/Users/giuli/.mercurion/preview/configuration.json
```

Atteso `status: valid`. La validazione non trasferisce nulla.
Il file locale accetta porta SMTP come numero e secure come booleano JSON.

### 2. Ubuntu: confermare quale file usa Nest

```bash
sudo docker inspect --format '{{range .Mounts}}{{if eq .Destination "/run/mercurion/values.json"}}{{.Source}}{{end}}{{end}}' mercurion-preview-web-node-preview-1
```

Nell'installazione corrente il percorso atteso e:
`/run/mercurion-applications/07fd750861be434b8de3c768bc9a6353/active/web-node/values.json`.
Se cambia, usare il percorso realmente restituito, senza modificare altri run.
Se manca il file dopo reboot, usare prima il ripristino descritto nel capitolo 3
Strumenti dell'operatore. Non creare un file vuoto al suo posto.

### 3. Ubuntu: backup privato e modifica mirata

Tutti i comandi Ubuntu seguenti vanno eseguiti nella stessa shell, per conservare
le variabili `f` e `b`. I percorsi sotto descrivono questa installazione.

```bash
f=/run/mercurion-applications/07fd750861be434b8de3c768bc9a6353/active/web-node/values.json
b="$f.pre-edit-$(date +%Y%m%d-%H%M%S)"
sudo cp -a -i -- "$f" "$b"
sudoedit "$f"
```

Se cp chiede una sovrascrittura rispondere no e scegliere un backup nuovo prima
di modificare. Il backup conserva proprietario e permessi del file segreto;
resta sul tmpfs `/run`, quindi sparisce al reboot insieme al documento attivo.

Nel documento modificare esclusivamente i campi sotto `variables` interessati,
lasciando struttura, altre chiavi, schemaVersion e environment invariati.
Qui tutti i valori sono **stringhe di ambiente**: porta `"465"`, secure `"true"`.
Questa e la rappresentazione finale per process.env; il JSON privato Windows
resta tipizzato. Non inserire APP_ENV, NODE_ENV o NODE_OPTIONS in variables.
Per Meili searchKey corrisponde a MEILISEARCH_MASTER_KEY (nome applicativo
storico: contiene la chiave client, MAI la master key server), logKey a
MEILISEARCH_LOG_KEY.

La modifica non cambia il processo gia in esecuzione. Non eseguire chmod 777,
non esportare password nella shell e non stampare il documento con cat.

### 4. Ubuntu: validare il documento modificato senza avviare Nest

```bash
sudo cat -- "$f" | sudo docker exec -i mercurion-preview-web-node-preview-1 node -e 'const fs=require("node:fs");const {parseSecretEnvironment}=require("/usr/src/app/dist/src/bootstrap/secret-file-environment.js");try{parseSecretEnvironment(fs.readFileSync(0),process.env);console.log("APPLICATION_DOCUMENT_OK");}catch(e){console.error("APPLICATION_DOCUMENT_INVALID "+(e.reason||"validation-failed"));process.exitCode=1;}'
```

Il contenuto passa direttamente via stdin al parser gia distribuito
nell'immagine: non viene stampato e non viene avviata una seconda applicazione.
Atteso `APPLICATION_DOCUMENT_OK`. Questo controllo verifica formato e nomi
accettati dal loader; non prova credenziali presso i provider, connettivita o
tutti i vincoli della configurazione Nest. In errore correggere il documento o
ripristinare il backup, senza procedere al restart. Occorre che il container sia
in esecuzione per usare questo controllo.

### 5. Ubuntu: applicare con un riavvio del solo backend

```bash
sudo docker restart mercurion-preview-web-node-preview-1
sudo docker inspect --format 'Stato={{.State.Status}} ExitCode={{.State.ExitCode}}' mercurion-preview-web-node-preview-1
sudo docker logs --since 2m --tail 80 mercurion-preview-web-node-preview-1
```

C'e una breve interruzione API/WebSocket e l'eventuale debugger si scollega.
Il restart rilegge il documento e rimonta il file bind anche se l'editor ne ha
sostituito l'inode. Non ricrea volumi e non riavvia Meili o PostgreSQL.
`running` da solo non prova readiness: attendere il completamento del bootstrap
nei log e verificare il flusso interessato. Per SMTP distinguere TCP, accettazione
SMTP e ricezione della mail; gli eventi dead_letter non ripartono da soli.

### Se occorre annullare la modifica

Sempre nella stessa shell, ripristinare il backup indicato da `b`:

```bash
sudo cp -a -- "$b" "$f"
sudo docker restart mercurion-preview-web-node-preview-1
```

Se hai cambiato anche configuration.json, riallinearlo manualmente al valore
precedente per evitare che il prossimo ripristino riproponga la modifica.

### Persistenza e limiti per le altre variabili

Le modifiche a providers/applicationSecrets/meilisearchClients gia previsti dal
formato locale si conservano al reboot solo se hai aggiornato anche il JSON
Windows. Per variabili non esposte da quel formato (per esempio i valori pubblici
e gli override in preview_credentials.application_document), una modifica manuale
al solo file su `/run` e temporanea: il prossimo ripristino rigenera il valore
dalla fonte attuale. Non aggiungere campi arbitrari a configuration.json: il
validator ne impone lo schema. L'estensione della fonte durevole va concordata
separatamente; questa procedura non modifica codice o generatori.

Cambiare una password SQL nel documento non esegue ALTER ROLE sul database.
Cambiare un file Redis/NATS/Meili non aggiorna automaticamente i relativi client.
Chiavi AES/pepper/JWT possono rendere illeggibili dati o invalidare credenziali e
sessioni. Queste operazioni non sono equivalenti all'aggiornamento di una API key
SMTP e non vanno eseguite con la sola procedura Nest sopra.

**Livello di verifica:** procedura ricavata dal loader e dai mount dichiarati nel
repository; sintassi Node del controllo verificata localmente. Nessun segreto
letto dalla sessione di assistenza, nessun comando eseguito sulla VM per questo
aggiornamento e nessuna prova di invio email implicita.


## Correggere un refuso nel client ID Google dell'applicazione

Questa modifica riguarda il login Google di Mercurion, distinto dal client
Google configurato in Cloudflare Access.

1. Nell'editor Windows aprire `C:/Users/giuli/.mercurion/preview/configuration.json`,
   correggere `providers.GOOGLE_CLIENT_ID` con il client ID previsto per Mercurion
   e salvare. Non cambiare client secret o redirect URI per correggere un refuso.
2. Validare da PowerShell Windows:

```powershell
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/preview_credentials.py validate --file C:/Users/giuli/.mercurion/preview/configuration.json
```

3. Seguire i punti 2-4 della sezione precedente «Aggiornare segreti e variabili
   applicative gia attivi»: confermare il mount, creare il backup e aprire il
   documento con sudoedit. Nel file guest correggere soltanto
   `variables.GOOGLE_CLIENT_ID`, usando lo stesso valore del file Windows.
   Eseguire il controllo fino a `APPLICATION_DOCUMENT_OK`.
4. Solo dopo il controllo, nella shell Ubuntu:

```bash
sudo docker restart mercurion-preview-web-node-preview-1
sudo docker logs --since 2m --tail 80 mercurion-preview-web-node-preview-1
```

Attendere il completamento dell'avvio e riprovare il login Google di Mercurion
iniziando un nuovo flusso, senza riusare un callback precedente. L'eventuale
debugger va ricollegato dopo il restart. Cloudflare Access resta invariato.
La copia Windows serve a conservare la correzione al prossimo reboot;
la copia guest viene letta da Nest al riavvio. Nessuna immagine va ricostruita.


## GeoIP preview e incompatibilita Node — diagnosi 13 novembre 2026

Nel package-lock.json corrente geoip-lite 2.0.3 dichiara Node >=24.0.0.
La CI, i package.json e gli stage di build Docker sono fissati a 22.16.0;
il runtime Docker Nest e fissato a 22.23.4. Entrambi sono fuori dal requisito
Node di geoip-lite. Anche abbrev 5.0.0 e nopt 10.0.1 escludono Node 22.16.0.
Il confronto e stato fatto sui metadati del lockfile, senza installazioni.
Non e una prova che l'incompatibilita sia da sola la causa del problema GeoIP.

GeoIpService usa lookup locale di geoip-lite: non chiama un'API GeoIP esterna.
Nel Nginx tracciato, X-Forwarded-For e X-Real-IP sono impostati a remote_addr,
senza direttive real_ip. Con cloudflared in un container separato quel valore
puo essere l'IP privato del connettore. Nest usa req.ip con proxy fidati, e
GeoIP non geolocalizza gli indirizzi Docker privati. Occorre confrontare la
configurazione effettiva VM prima di applicare una correzione.

### Controlli di sola lettura — shell Ubuntu della VM

Versione Node realmente eseguita nel container:

```bash
sudo docker exec mercurion-preview-web-node-preview-1 node -p 'process.version'
```

Prova del database locale GeoIP, senza richieste Internet:

```bash
sudo docker exec mercurion-preview-web-node-preview-1 node -e 'const g=require("geoip-lite");console.log(JSON.stringify({publicLookupFound:g.lookup("8.8.8.8")!==null,privateLookupFound:g.lookup("172.21.0.3")!==null}));'
```

Attesi publicLookupFound true e privateLookupFound false. Il secondo IP e un
campione privato, non un'affermazione sull'IP attuale del connettore. Il successo
del campione pubblico non garantisce la copertura di tutti gli IP dei visitatori.

Configurazione IP del Nginx effettivo:

```bash
sudo docker exec mercurion-shared-nginx-edge-1 nginx -T 2>&1 | grep -E 'set_real_ip_from|real_ip_header|real_ip_recursive|proxy_set_header (X-Real-IP|X-Forwarded-For|X-Forwarded-Proto)'
```

Le direttive di fiducia vanno limitate al connettore realmente autorizzato:
non fidarsi indiscriminatamente di X-Forwarded-For o CF-Connecting-IP provenienti
da qualunque sorgente. Nessuna regola firewall o apertura Internet serve per
la sola lookup GeoIP locale.

Esiti VM ancora da acquisire. Nessun Dockerfile, proxy, dipendenza o servizio
modificato durante questa diagnosi; nessuna nuova versione Node scelta o
adottata implicitamente.


## Deployment preview — procedura disponibile e stato verificato

Verifica del 13 novembre 2026 tramite API GitHub e filesystem locale:
- default branch GitHub: develop;
- nessun self-hosted runner registrato nella repository;
- nessuna variabile repository PREVIEW_DELIVERY_* configurata;
- .github/workflows/preview-delivery.yml assente su origin/develop (API 404),
  sebbene il file esista nel checkout locale;
- driver/settings/launcher runner assenti nei percorsi delivery documentati.

Quindi un push su preview **non esegue attualmente la delivery automatica**.
La presenza locale del workflow non attiva la pipeline. Il percorso disponibile
rimane il rollout manuale, da collaudare sull'intervento effettivo; questa verifica
non e un deploy ne una conferma di CI verde per un commit specifico.

### 1. Preparare una revisione e gli artefatti

Integrare nel branch preview solo le modifiche che si vogliono consegnare.
Attendere CI riuscita e Required gate verde sullo SHA completo scelto.
Dalla pagina di quel run GitHub Actions scaricare:
- deployment-nest-staging;
- deployment-angular-staging, se si aggiorna anche il frontend.

Gli archivi delle immagini hanno retention di 3 giorni nel workflow corrente.
Usare gli artefatti deployment completi, non i soli report delivery-* o i report
di vulnerabilita. Estrarre ogni ZIP in una directory locale: il parametro
--web-node deve indicare la sottocartella web-node contenente component.json e
image.tar; --web-ng la corrispondente web-ng. Gli artefatti Web selezionati devono
appartenere allo stesso commit atteso.

La procedura non costruisce immagini. Se gli artefatti sono assenti/scaduti o
la CI non passa, risolvere la produzione degli artefatti prima del rollout.
L'incompatibilita Node/geoip-lite appena identificata resta da correggere e
verificare nel prossimo candidato; non viene risolta dal trasferimento.

### 2. Precondizioni della VM

VM accesa, LUKS sbloccato, SSH raggiungibile; segreti gia caricati; server dati,
Nginx e applicazioni esistenti avviati. Completare eventuali import in corso e
valutare la breve indisponibilita delle app selezionate. Terminare il debug
remoto prima del rollout: non usare un container sospeso su breakpoint come
riferimento per healthcheck. I segreti aggiornati hanno il proprio percorso,
non vengono riconsegnati dal rollout delle immagini.

Controllare scripts/infrastructure/preview-operations.example.json: progetti,
Compose e release devono corrispondere alle risorse applicative effettive.
Non usare i vecchi container server conservati per rollback.

### 3. PowerShell Windows: preparazione e piano

Comandi dalla root C:/.project_repo/MercurionWeb. Sostituire i segnaposto
SHA_WEB_COMPLETO, CARTELLA_EXPORT_NEST, CARTELLA_EXPORT_ANGULAR e
CARTELLA_NUOVA_DEL_BUNDLE con i propri valori; non incollarli letteralmente.
Usare percorsi assoluti; il bundle deve essere nuovo e il genitore gia esistente.

Per aggiornare Nest e Angular:

```powershell
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/preview_application_rollout.py prepare --profile C:/.project_repo/MercurionWeb/scripts/infrastructure/preview-operations.example.json --web-revision SHA_WEB_COMPLETO --web-node CARTELLA_EXPORT_NEST --web-ng CARTELLA_EXPORT_ANGULAR --bundle CARTELLA_NUOVA_DEL_BUNDLE
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/preview_application_rollout.py plan --bundle CARTELLA_NUOVA_DEL_BUNDLE
```

Per il solo backend omettere --web-ng e il relativo percorso. Non aggiungere
--tox21 se non si intende aggiornare anche quel componente con il suo artefatto
verificato. Il percorso manuale supporta Tox21; il driver automatico attuale
scarica solo Nest e Angular dalla CI Web.

Controllare ruoli/revisione nel piano. Il controllo strict richiede zero
vulnerabilita a ogni gravita, checksum e identita immagini validi.

### 4. PowerShell Windows: eseguire il rollout

```powershell
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/preview_application_rollout.py deploy --bundle CARTELLA_NUOVA_DEL_BUNDLE --execute
```

Chiede passphrase SSH e sudo nel terminale personale. Trasferisce/carica le
immagini, conserva gli ID precedenti e applica solo gli override delle app
selezionate, senza inizializzare SQL, modificare dati, segreti, server o DNS.
Scarica rollout-result.json; atteso status passed. Non esiste rollback automatico.
Health e frontend HTTP 200 sono smoke, non accettazione funzionale: verificare
nel browser login, registrazione/email o la funzione coinvolta nella modifica.

### 5. Rollback delle sole immagini

Se necessario, usare il bundle dello stesso intervento:

```powershell
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/preview_application_rollout.py rollback --bundle CARTELLA_DEL_BUNDLE_GIA_DISTRIBUITO --execute
```

Non annulla modifiche ai dati o allo schema. Se il report non si scarica dopo
l'esecuzione remota, verificare lo stato conservato prima di ripetere qualsiasi
operazione. Dopo il rollout i comandi Compose manuali devono includere anche
gli override immagini effettivamente adottati, come descritto nel capitolo 4
Strumenti dell'operatore, per non ripristinare involontariamente immagini vecchie.

### Attivazione futura del percorso automatico

La procedura completa e in docs/infrastructure/local-vm/INSTALL-DELIVERY.md:
installazione degli strumenti attendibili e chiave SSH limitata, broker VM,
registrazione runner Windows e prova negativa, pubblicazione workflow sul
default branch, variabili ed environment preview; attivazione per ultima.
Il flusso previsto e push preview -> CI esatta verde -> admit -> runner Windows
-> trasferimento SSH limitato -> rollout Nest/Angular -> smoke e ricevuta.
Non e ancora stato installato o collaudato end-to-end. Server dati e aggiornamenti
segreti restano separati. Non attivato durante la redazione di questa procedura.


## Cloudflare errore 1033 — diagnosi senza riavvii

Il 1033 indica che Cloudflare non trova un connettore sano per il tunnel associato al dominio. Non dimostra un guasto del database o la perdita dei dati. Se la VM e spenta, il connettore non puo funzionare. Se e accesa, eseguire nella shell Ubuntu i due comandi seguenti, separatamente. Sono sole letture e non interrompono Meilisearch.

```bash
sudo docker inspect --format 'Stato={{.State.Status}} ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}} RestartCount={{.RestartCount}}' mercurion-shared-cloudflared-1
```

```bash
sudo docker logs --since 30m --tail 80 mercurion-shared-cloudflared-1
```

Conservare gli errori e gli orari; prima di condividere i log oscurare eventuali token o credenziali. Non riavviare Docker o la VM durante l'import per tentare una correzione alla cieca. Uno stato running del container non prova da solo che le connessioni del tunnel siano attive.

Riferimento: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1033/


### 14 novembre 2026 — cloudflared attivo, handshake TLS in timeout

L'output acquisito mostra running, ExitCode=0, OOMKilled=false, RestartCount=0. Tutte e quattro le connessioni tentate verso Cloudflare TCP/7844 falliscono durante l'handshake TLS con i/o timeout. Non risulta un arresto del container; il punto di guasto osservato e la connessione cifrata verso l'edge. La causa di rete o filtro non e ancora identificata. Gli IP nei log erano gia inclusi nella precedente allowlist: non aggiungere regole alla cieca.

Nella shell Ubuntu, eseguire separatamente:

```bash
nc -4 -vz -w 5 198.41.192.37 7844
```

```bash
timeout 15 openssl s_client -connect 198.41.192.37:7844 -servername h2.cftunnel.com -alpn h2 -brief </dev/null
```

La prima prova verifica solo TCP; la seconda tenta anche TLS con il nome SNI del servizio HTTP/2 Cloudflare. Nessun token richiesto. Se un comando manca, riportare l'errore senza installare pacchetti. Un successo dalla VM non prova ancora il percorso del container Docker; serve come confronto per il passo successivo. Il timeout del secondo comando puo terminare senza altro output: riportare anche questo esito. Nessun riavvio o modifica ai servizi.


### Esito riavvio cloudflared del 14 novembre 2026

Il riavvio manuale del solo container e avvenuto: nuovo avvio alle 01:15:08 UTC (02:15:08 Europe/Rome). Non ha ripristinato il tunnel: i log successivi continuano a mostrare timeout TLS verso TCP/7844, mentre DNS e API Cloudflare su 443 risultano raggiungibili nel precheck. Le registrazioni di connessioni riuscite del 13 novembre alle 03:05 UTC sono storiche, precedenti al guasto, e non costituiscono evidenza di recupero. Il warning iniziale di assenza ingress non prova la perdita della route remota: senza connessione il connettore non ha ancora ricevuto la configurazione. Proseguire con le due prove TCP/TLS dalla shell Ubuntu gia riportate sopra; non ripetere riavvii o modificare le ACL senza ulteriori evidenze.


### Confronto TLS VM / Windows — TCP raggiungibile, handshake non completato

Dalla VM, nc verso 198.41.192.37:7844 riesce; openssl con SNI h2.cftunnel.com termina allo scadere dei 15 secondi mostrando soltanto Connecting. Quindi il problema osservato si riproduce fuori dal container. La causa precisa (filtro, percorso, MTU o altra anomalia) non e ancora dimostrata.

In PowerShell Windows normale eseguire:

```powershell
curl.exe --noproxy '*' --verbose --head --connect-timeout 5 --max-time 15 --resolve h2.cftunnel.com:7844:198.41.192.37 https://h2.cftunnel.com:7844/
```

La prova forza lo stesso IPv4 conservando il nome TLS; non usa token e non modifica configurazioni. Serve confrontare la negoziazione TLS, non ottenere una pagina web: un errore HTTP o successivo al TLS va distinto da un timeout durante l'handshake. Riportare l'output completo. Non disattivare Kaspersky e non cambiare ACL per eseguire questa prova.


### Confronto Windows: certificato ricevuto, radice non attendibile

curl Windows verso h2.cftunnel.com:7844 sul medesimo IP restituisce SEC_E_UNTRUSTED_ROOT. Dimostra che Windows riceve il certificato del peer, mentre dalla VM il test precedente non completava la negoziazione entro 15 secondi. Non dimostra un errore del certificato HTTPS di preview.mercurion.app, ne identifica da solo un'intercettazione. I due client usano stack TLS e offerte ALPN differenti.

Nella shell Ubuntu provare TLS 1.2, mantenendo indirizzo, SNI e ALPN precedenti:

```bash
timeout 15 openssl s_client -connect 198.41.192.37:7844 -servername h2.cftunnel.com -alpn h2 -tls1_2 -brief </dev/null
```

Nessun token, modifica o riavvio. Riportare anche eventuali errori di verifica certificato: per questa diagnosi importa distinguere una risposta TLS dal timeout. Non installare CA e non disabilitare la verifica certificati di cloudflared sulla base del solo errore curl.


### TLS 1.2 rifiutato: prova TLS 1.3 con gruppo X25519

Il test TLS 1.2 riceve alert protocol version (70): il peer rifiuta la versione proposta. Questo non e un timeout e non identifica la causa del guasto originale. Non utilizzare TLS 1.2 come configurazione del tunnel.

Prova diagnostica nella shell Ubuntu, senza cambiare cloudflared:

```bash
timeout 15 openssl s_client -connect 198.41.192.37:7844 -servername h2.cftunnel.com -alpn h2 -tls1_3 -groups X25519 -brief </dev/null
```

Forza TLS 1.3 e un gruppo classico, evitando l'offerta di gruppi post-quantum del client. Serve verificare se una diversa negoziazione passa: un successo non dimostra da solo un difetto MTU o di un firewall. Riportare l'intero output; nessun token e nessuna modifica persistente. La causa rimane aperta finche non correlata con ulteriori evidenze.


### TLS 1.3 / X25519 riuscito

Il test TLS 1.3 con gruppo X25519 ha completato l'handshake (TLS_AES_128_GCM_SHA256). Il certificato ricevuto e CloudFlare Origin Certificate; openssl non dispone della sua CA nel trust store usato dal test. Non installare certificati o disabilitare la verifica del tunnel per questo motivo. Il risultato distingue il successo con X25519 dal timeout della negoziazione predefinita, ma non prova ancora MTU, filtro o componente responsabile.

Per confrontare esplicitamente il gruppo ibrido post-quantum, nella shell Ubuntu:

```bash
timeout 15 openssl s_client -connect 198.41.192.37:7844 -servername h2.cftunnel.com -alpn h2 -tls1_3 -groups X25519MLKEM768 -brief </dev/null
```

Stesso IP, SNI, TLS e ALPN; cambia solo il gruppo rispetto al test riuscito. Se openssl non riconosce il gruppo, riportare l'errore senza installazioni. Se scade senza completare TLS mentre X25519 riesce, il difetto e correlato alla negoziazione ibrida su questo percorso; l'origine precisa resta da individuare. Nessuna modifica al container eseguita.


### Regressione tunnel — esito confronto gruppi TLS

Sul medesimo endpoint 198.41.192.37:7844, con stesso SNI h2.cftunnel.com, ALPN h2 e TLS 1.3: X25519 completa l'handshake; X25519MLKEM768 resta su Connecting fino al timeout di 15 secondi. E evidenza di un comportamento diverso legato alla negoziazione ibrida, non una prova conclusiva della causa sottostante.

Una regressione puo comparire senza modifiche locali: percorso ISP/MTU effettiva, filtri intermedi o comportamento dell'edge remoto possono cambiare. Gli handshake ibridi sono piu grandi; perdita dei segmenti o problemi PMTU sono ipotesi plausibili, cosi come un filtro TLS incompatibile. Nessuna di queste cause e stata accertata. Non attribuire il problema a modifiche dell'utente, a Kaspersky o a un aggiornamento specifico senza evidenza. I log riportano ancora la medesima versione cloudflared con no-autoupdate attivo. Il container si avvia e il problema persiste anche nel test OpenSSL dalla VM. Nessuna modifica correttiva al tunnel e stata applicata durante queste prove.


### Ripristino tunnel — identificare interfaccia e MTU del solo connettore

Il confronto TLS indica successo con X25519 e timeout con X25519MLKEM768. Una prova reversibile sulla segmentazione e da valutare sul solo namespace di rete cloudflared. Non assumere che --post-quantum=false escluda i gruppi ibridi: nel sorgente ufficiale verificato false lascia la modalita prefer, che include MLKEM. Nessuna modifica all'immagine e stata preparata o applicata.

Nella shell Ubuntu eseguire queste sole letture per identificare interfaccia d'uscita e MTU originaria:

```bash
sudo nsenter --target "$(sudo docker inspect --format '{{.State.Pid}}' mercurion-shared-cloudflared-1)" --net ip route get 198.41.192.37
```

```bash
sudo nsenter --target "$(sudo docker inspect --format '{{.State.Pid}}' mercurion-shared-cloudflared-1)" --net ip -brief link
```

nsenter esegue ip nel namespace di rete del container usando il programma installato sulla VM; non richiede una shell nell'immagine cloudflared. Queste due invocazioni non cambiano nulla. Conservare nome interfaccia e MTU per predisporre modifica e ripristino esatti. Se il container e fermo o il comando manca, fermarsi e riportare l'errore.


### Prova reversibile MTU sul solo cloudflared

La route verso 198.41.192.37 usa eth0, gateway 172.24.0.1, sorgente 172.24.0.2. ip -brief link non mostrava la MTU. Eseguire nella stessa shell Ubuntu il blocco seguente: conserva il PID e la MTU originali nelle variabili della shell, li stampa e applica 1280 soltanto a eth0 nel namespace cloudflared. Non modifica interfacce della VM, firewall, volumi o altri container. E una prova, non una correzione permanente gia collaudata.

```bash
cf_pid=$(sudo docker inspect --format '{{.State.Pid}}' mercurion-shared-cloudflared-1)
cf_mtu=$(sudo nsenter --target "$cf_pid" --net ip -o link show dev eth0 | awk '{for(i=1;i<=NF;i++) if($i=="mtu") {print $(i+1); exit}}')
if test "$cf_pid" -gt 0 && test "$cf_mtu" -ge 1280; then
  printf 'MTU originale eth0: %s; PID: %s
' "$cf_mtu" "$cf_pid"
  sudo nsenter --target "$cf_pid" --net ip link set dev eth0 mtu 1280
fi
```

Se compare un errore fermarsi. Conservare questa shell aperta. Attendere circa un minuto per i tentativi automatici del connettore, poi leggere:

```bash
sudo docker logs --since 2m --tail 40 mercurion-shared-cloudflared-1
```

L'esito positivo richiede nuove righe Registered tunnel connection e verifica del sito; il comando MTU senza errori non prova il recupero. La modifica runtime non sopravvive alla ricreazione del container.

Ripristino della MTU originale, dalla stessa shell e solo se il container non e stato riavviato o ricreato:

```bash
if test "$(sudo docker inspect --format '{{.State.Pid}}' mercurion-shared-cloudflared-1)" = "$cf_pid" && test "$cf_mtu" -ge 1280; then
  sudo nsenter --target "$cf_pid" --net ip link set dev eth0 mtu "$cf_mtu"
fi
```


### Ripristino osservato dopo MTU 1280 — 14 novembre 2026

MTU originale eth0 del connettore: 1500. Dopo la modifica runtime a 1280, cloudflared ha registrato quattro connessioni HTTP/2 (connIndex 0, 1, 2, 3) tra 01:27:55 e 01:27:58 UTC, ossia 02:27:55–02:27:58 Europe/Rome. Ha inoltre ricevuto la configurazione remota preview.mercurion.app -> http://nginx-edge:80. Nessun riavvio ulteriore, modifica firewall, token, immagine o dati durante la prova.

La correlazione fra riduzione MTU e recupero e forte ed e coerente con un problema di segmentazione/PMTU sul percorso. Non identifica ancora il componente che ha cambiato comportamento. I gruppi crittografici pubblicizzati restano quelli precedenti: non e stata applicata una disabilitazione post-quantum e non e stata disattivata la verifica TLS. I log non indicano quale gruppo sia stato effettivamente negoziato.

Confermare ora nel browser che https://preview.mercurion.app superi Access e carichi Mercurion. Il solo recupero del tunnel non costituisce collaudo funzionale dell'applicazione. Lasciare MTU 1280 durante la verifica; la prova runtime non costituisce ancora configurazione persistente e andra consolidata in Docker Compose/rete con una modifica separata e documentata. Non ricreare il container assumendo che conservi la MTU impostata a mano.


## Turnstile — errore TLS e seconda eccezione del logger (14 novembre 2026)

Log acquisiti: ECONNRESET / Client network socket disconnected before secure TLS connection was established verso challenges.cloudflare.com:443, endpoint /turnstile/v0/siteverify. Non e una risposta siteverify che dichiara il token invalido: il collegamento TLS non e stato stabilito. Il legame con il problema MTU del connettore e plausibile ma non ancora verificato per Nest. La modifica MTU di cloudflared non modifica le interfacce di web-node.

Secondo difetto confermato da stack e sorgenti: TurnstileService passa l'intero errore Axios al logger; MeiliLoggerService.createLogEntry esegue JSON.stringify su un oggetto che conserva riferimenti circolari. La scrittura del warning lancia quindi TypeError e interrompe il normale percorso di gestione dell'errore. Serve una correzione applicativa separata, che estragga informazioni diagnostiche sicure e impedisca al logger di propagare eccezioni. Nessun codice modificato durante questa diagnosi. Non condividere dump Axios completi: possono includere body, secret Turnstile e token.

Nella shell Ubuntu, sole letture per identificare route e MTU del container Nest:

```bash
sudo nsenter --target "$(sudo docker inspect --format '{{.State.Pid}}' mercurion-preview-web-node-preview-1)" --net ip route show default
```

```bash
sudo nsenter --target "$(sudo docker inspect --format '{{.State.Pid}}' mercurion-preview-web-node-preview-1)" --net ip -o link
```

Riportare gli output prima di modificare la MTU. Non disabilitare Turnstile o la verifica TLS per aggirare il problema.

## VPN disconnessa: TLS ibrido riuscito — 14 novembre 2026

Dopo la disconnessione della VPN sull'host Windows, la stessa prova OpenSSL dalla VM verso 198.41.192.37:7844, SNI h2.cftunnel.com, TLS 1.3 e gruppo X25519MLKEM768 ha restituito CONNECTION ESTABLISHED e Negotiated TLS1.3 group: X25519MLKEM768. Prima terminava in timeout. Questo confronto sostiene fortemente l'ipotesi che la VPN interferisse con il percorso; non identifica il meccanismo preciso. Gli avvisi di issuer non disponibile riguardano il trust store della prova OpenSSL e non annullano l'evidenza di handshake riuscito; non modificare CA o verifica TLS.

Questa verifica aggiorna le indicazioni precedenti: non rendere permanente MTU 1280 prima della prova senza VPN e con MTU originale. Nella shell Ubuntu ripristinare 1500 sulla sola interfaccia egress eth0 di cloudflared, gia identificata nelle prove precedenti. Il comando non riavvia il container:

```bash
sudo nsenter --target "$(sudo docker inspect --format '{{.State.Pid}}' mercurion-shared-cloudflared-1)" --net ip link set dev eth0 mtu 1500
```

Verificare la MTU applicata:

```bash
sudo nsenter --target "$(sudo docker inspect --format '{{.State.Pid}}' mercurion-shared-cloudflared-1)" --net ip -o link show dev eth0
```

Controllare i log recenti (le registrazioni precedenti alla modifica non provano da sole una nuova connessione):

```bash
sudo docker logs --since 2m --tail 40 mercurion-shared-cloudflared-1
```

Con VPN disconnessa, verificare inoltre nel browser https://preview.mercurion.app e ripetere l'operazione che aveva prodotto l'errore Turnstile. Non riavviare lo stack e non modificare MTU di Nest. Il difetto separato del logger con oggetti circolari resta aperto anche se il trasporto torna funzionante. Ripristino MTU e verifiche applicative ancora da confermare.


# Riaccensione staging dopo shutdown

**Procedura del 16 novembre 2026 per l'installazione esistente.** I due casi hanno lo stesso ripristino applicativo; il secondo aggiunge i controlli dell'host.

## Cosa si conserva

PostgreSQL, embedding, HNSW e indici Meilisearch restano nei volumi persistenti. Restano anche immagini, container e release sul disco Ubuntu. Non ripetere import, creazione indici o bootstrap.

I segreti sotto `/run` sono invece volatili: si perdono allo shutdown di Ubuntu, anche se Windows rimane acceso. Vanno ripristinati dalla copia privata Windows prima di avviare i servizi. DNS e policy Access restano su Cloudflare. I tunnel SSH personali vanno riaperti solo quando servono; non sono necessari al tunnel Cloudflare.

Disconnettere la VPN Windows che ha interferito con il collegamento TLS. Non applicare automaticamente il precedente workaround MTU 1280: il TLS ibrido era tornato funzionante dopo aver disconnesso la VPN; la conferma finale con MTU originale era ancora aperta.

## Caso 1 — VM arrestata, Windows rimasto acceso

Aprire Gestione Hyper-V dal menu Start, avviare **Mercurion-Server**, premere **Connetti**, sbloccare LUKS nella console e attendere Ubuntu. Poi seguire **Avvio comune**. Non ricreare NAT o switch.

## Caso 2 — Anche Windows spento o riavviato

Accedere a Windows, attendere Hyper-V e verificare che Kaspersky mantenga **vEthernet (Mercurion-Internal)** come **Rete pubblica**. In **PowerShell Windows amministrativa** eseguire le letture:

```powershell
Get-VM -Name 'Mercurion-Server' | Format-List Name,State
Get-VMNetworkAdapter -VMName 'Mercurion-Server' | Format-Table Name,SwitchName,MacAddress -AutoSize
Get-NetIPAddress -InterfaceAlias 'vEthernet (Mercurion-Internal)' -AddressFamily IPv4 | Format-Table IPAddress,PrefixLength -AutoSize
Get-NetNat -Name 'Mercurion-NAT' | Format-List Name,InternalIPInterfaceAddressPrefix,Active
Get-VMNetworkAdapterExtendedAcl -VMName 'Mercurion-Server' | Sort-Object Weight -Descending | Format-Table Direction,Action,LocalIPAddress,RemoteIPAddress,Protocol,LocalPort,RemotePort,Weight,Stateful -AutoSize
```

Attesi: scheda VM su **Mercurion-Internal**, host **10.203.240.1/24**, NAT **10.203.240.0/24** attivo. Le ACL devono conservare SSH dall'host, DNS, HTTPS, Cloudflare TCP/7844, SMTP Resend TCP/465 e i blocchi IPv6, reti private e deny finale. Non verificare con un conteggio fisso e non riapplicare la vecchia policy DnsHttps: non comprende necessariamente le eccezioni aggiunte dopo.

Se manca una risorsa, fermarsi per diagnosticare quella risorsa senza creare NAT aggiuntivi o cancellare ACL. Altrimenti avviare la VM da Hyper-V e sbloccare LUKS. La precedente impostazione StartIfRunning non garantisce l'avvio automatico di una VM già arrestata prima dell'host: controllarne lo stato.

## Avvio comune — 1. Ubuntu e Docker

In **PowerShell Windows normale**:

```powershell
ssh -o StrictHostKeyChecking=yes mercurion-server
```

Nella **shell Ubuntu**:

```bash
ip -brief address show eth0
ip -4 route show default
systemctl is-active docker
```

Attesi **10.203.240.10/24**, default via **10.203.240.1**, Docker **active**. Solo se Docker è inattivo:

```bash
sudo systemctl start docker
systemctl is-active docker
```

Se fallisce, leggere il motivo e fermarsi:

```bash
sudo journalctl -u docker -b -n 60 --no-pager
```

Se SSH segnala una chiave diversa non cancellare known_hosts: verificare l'identità della VM. Quando tutto è pronto, tornare a Windows:

```bash
exit
```

## Avvio comune — 2. Ripristinare segreti e avviare servizi

Sorgenti private sul **PC Windows**, da mantenere aggiornate:

- `C:\Users\giuli\.mercurion\preview\configuration.json`: configurazione e segreti correnti, inclusi provider e chiavi client Meili. Non usare un vecchio backup.
- `C:\Users\giuli\.mercurion\preview\tunnel-token.txt`: percorso già annotato nel memo per il token corrente Cloudflare. Deve contenere il solo token. Se lo hai salvato altrove, sostituire soltanto il percorso nel comando sotto.
- `root-scopes.json` non serve all'avvio: non sostituisce la configurazione o il token.

Non inserire valori segreti nella riga di comando. I due profili pubblici specificano percorsi e progetti. Attualmente identificano i server aggiornati della generazione **6d019947800b4578bc2b5d40791f5132** e le applicazioni **07fd750861be434b8de3c768bc9a6353**; non avviano i vecchi server di rollback.

In **PowerShell Windows normale**, da qualsiasi directory:

```powershell
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/start_preview.py --profile C:/.project_repo/MercurionWeb/scripts/infrastructure/preview-operations.example.json --startup-profile C:/.project_repo/MercurionWeb/scripts/infrastructure/preview-startup.example.json --configuration C:/Users/giuli/.mercurion/preview/configuration.json --cloudflare-token-file C:/Users/giuli/.mercurion/preview/tunnel-token.txt --execute
```

Inserire passphrase SSH e password sudo nel terminale quando richieste. Possono esserci richieste ripetute per connessioni distinte. Non eseguire questo comando da Ubuntu.

Lo strumento esistente esegue queste fasi, nell'ordine:

1. Valida gli input e verifica la presenza univoca dei container attesi.
2. Avvia Nginx e rileva il suo IP Docker corrente.
3. Ripristina segreti server, applicazioni e token Cloudflare mancanti via stdin SSH, separando il trasferimento dalle richieste sudo.
4. Avvia PostgreSQL, Redis, NATS e Meili esistenti, aspettando gli healthcheck disponibili.
5. Avvia Tox21, Nest e frontend, verificando HTTP 200 su /health e / tramite Nginx.
6. Avvia cloudflared.

Destinazioni volatili: `/run/mercurion-preview/6c3e72e2e4064b71bd3bbffcff4d629c/active`, `/run/mercurion-applications/07fd750861be434b8de3c768bc9a6353/active` e `/run/mercurion-cloudflared/token`.

Non serve un secondo caricamento manuale delle env: l'avvio delle immagini legge i documenti applicativi values.json. Lo strumento non ricrea container, immagini, schema o volumi e conserva i limiti attuali, anche quelli temporaneamente aumentati per PG/Meili. Non rigenerare chiavi né inizializzare SQL.

Riepilogo atteso: **status: started**, **existingContainersOnly: true**, **cloudflareConnectionVerified: false**. L'ultimo campo richiede il controllo finale del tunnel descritto sotto.

In caso di **failed**, conservare ultima Phase ed errore precedente: i servizi già avviati restano accesi. Non rilanciare alla cieca o cancellare directory parziali /run. I documenti già attivi vengono verificati e saltati: questa è una procedura di ripristino, non di aggiornamento di segreti attivi. Dopo una delivery che cambia percorsi o progetti, verificare e aggiornare prima i profili pubblici.

## Avvio comune — 3. Verifica del tunnel e del sito

Ricollegarsi da **PowerShell Windows**:

```powershell
ssh -o StrictHostKeyChecking=yes mercurion-server
```

Nella **shell Ubuntu**:

```bash
sudo docker ps -a --format 'Nome={{.Names}} Stato={{.Status}}'
sudo docker logs --since 5m --tail 60 mercurion-shared-cloudflared-1
```

Devono essere avviati i server aggiornati, le tre applicazioni, Nginx e cloudflared. I vecchi server di rollback possono rimanere Exited: non avviarli. Nei log recenti cercare Registered tunnel connection, normalmente per quattro connessioni, senza timeout ripetuti. Nel pannello Cloudflare il tunnel **Mercurion Preview** deve risultare **Healthy**, con route **preview.mercurion.app → http://nginx-edge:80**.

Aprire **https://preview.mercurion.app**, senza porta 18888. Completare Google login di Access con l'account autorizzato e verificare pagina e una funzione applicativa. Per verificare la protezione Access usare una finestra privata priva di sessione precedente. Home visibile e verifica Turnstile sono controlli distinti.

Non servono modifiche a DNS, Access o certificati: Cloudflare gestisce il TLS pubblico, Nginx usa HTTP nella rete Docker privata. Errore 1033: controllare prima connettore e VPN. Errore 502 con tunnel Healthy: controllare Nginx/upstream, non reinstallare il database.

**Verifica della procedura:** sorgenti e profili letti; piano non mutante riuscito; 13 test locali con SSH/Docker simulati passati il 16 novembre 2026. Nessun file privato letto dall'assistente e nessun avvio/reboot reale eseguito durante la redazione. Il prossimo utilizzo reale deve confermare esito dello strumento e raggiungibilità pubblica.


### Convalida dell'operatore — 16 novembre 2026

- **Caso 1 validato dall'operatore:** shutdown e riaccensione della VM senza riavviare Windows; procedura dichiarata riuscita.
- **Caso 2, controlli host:** dopo reboot Windows risultano presenti switch Mercurion-Internal, MAC 00155D00DD01, indirizzo host 10.203.240.1/24, NAT Mercurion-NAT attivo su 10.203.240.0/24 e ACL comprese Cloudflare TCP/7844 e Resend TCP/465. La VM è ancora Off. Avvio guest, ripristino segreti e accesso pubblico del secondo caso restano da convalidare.

La tabella ACL precedente ometteva LocalPort e LocalIPAddress: RemotePort ANY sulla regola Inbound dall'host non significa che tutte le porte della VM siano autorizzate. In ingresso LocalPort è la porta destinazione sulla VM; RemotePort è la porta sorgente sull'host. La regola SSH attesa ha LocalIPAddress 10.203.240.10/32, RemoteIPAddress 10.203.240.1/32, protocollo TCP, LocalPort 22, RemotePort ANY, peso 300 e Stateful True. Il comando del caso 2 ora mostra entrambe le colonne.

I pesi maggiori hanno precedenza: i deny IPv6 a 900 e delle reti private a 201–209 precedono gli allow di egress a 100–151; i deny finali a 10 coprono il resto. Stateful True consente le risposte dei flussi autorizzati, senza richiedere una regola inbound generale. La presenza delle ACL dopo reboot prova la loro persistenza, non sostituisce le prove di traffico.

Per leggere la sola regola SSH in modo completo, da PowerShell Windows amministrativa:

```powershell
Get-VMNetworkAdapterExtendedAcl -VMName 'Mercurion-Server' | Where-Object { $_.Direction -eq 'Inbound' -and $_.Action -eq 'Allow' } | Format-List Direction,Action,LocalIPAddress,RemoteIPAddress,Protocol,LocalPort,RemotePort,Weight,Stateful
```


## Delivery: significato dei percorsi e aggiornamento Tox21

Questa sezione chiarisce i placeholder dei comandi precedenti. **Tox21** è il componente Python; il nome dell'opzione è `--tox21`, non `--tox2`. Questi comandi sono istruzioni per l'operatore: non sono stati eseguiti durante la redazione.

### Cosa inserire al posto dei placeholder

| Nome precedente | Significato e provenienza |
| --- | --- |
| SHA_WEB_COMPLETO | SHA Git di 40 caratteri del commit MercurionWeb scelto, visibile nella pagina del run CI. Non è il numero del run, il branch preview o un digest Docker. Per Nest/Angular deve essere lo stesso commit dei due artefatti. |
| CARTELLA_EXPORT_NEST | Cartella estratta dall'artefatto deployment-nest-staging che contiene direttamente component.json e image.tar, normalmente la sottocartella web-node. Non il file ZIP o la sua cartella esterna se contiene ulteriori sottocartelle. |
| CARTELLA_EXPORT_ANGULAR | Analoga cartella web-ng estratta da deployment-angular-staging, contenente direttamente component.json e image.tar. |
| CARTELLA_EXPORT_TOX21 | Directory del candidato staging prodotto dall'esportatore Tox21. Deve contenere direttamente gli stessi file di evidenza elencati sotto. Non è il checkout Python, il pacchetto del modello o la cartella dei report CI. |
| CARTELLA_NUOVA_DEL_BUNDLE | Directory di destinazione da creare tramite prepare: non deve ancora esistere, ma la directory genitore deve esistere. Conterrà copia delle immagini selezionate, profilo e manifesto rollout.json. plan, deploy e rollback devono usare questo stesso percorso. |

Ogni componente deve contenere: component.json, image.tar, sbom.cdx.json, vulnerabilities.json, policy-result.json, load.log e runtime-audit.json. Non creare manifesti manualmente né rinominare un'immagine production in staging. Il rollout verifica identità, checksum, target staging e zero vulnerabilità.

I percorsi Windows con spazi sono supportati: usare variabili e doppi apici come negli esempi. Ai prompt Read-Host incollare il percorso senza virgolette esterne. Le variabili valgono solo nella PowerShell corrente; conservarne i percorsi nel proprio registro del rilascio prima di chiuderla.

### Nest e Angular: esempio senza placeholder nella riga di esecuzione

In **PowerShell Windows**, dopo aver scaricato ed estratto gli artefatti del medesimo commit con CI verde:

```powershell
$webSha = Read-Host 'SHA completo del commit MercurionWeb del run CI scelto'
$nestExport = Read-Host 'Percorso assoluto della cartella web-node contenente component.json'
$angularExport = Read-Host 'Percorso assoluto della cartella web-ng contenente component.json'
$rolloutBundle = Read-Host 'Percorso assoluto della NUOVA cartella bundle; genitore esistente'
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/preview_application_rollout.py prepare --profile C:/.project_repo/MercurionWeb/scripts/infrastructure/preview-operations.example.json --web-revision "$webSha" --web-node "$nestExport" --web-ng "$angularExport" --bundle "$rolloutBundle"
```

Se prepare fallisce, non passare a plan/deploy. Per il solo backend omettere l'opzione --web-ng e il suo argomento. Il contenuto privato di configuration.json non entra in questo bundle.

### Tox21: da dove proviene l'immagine

**Verifica dei file locali del 16 novembre 2026:** il workflow MercurionTox21 costruisce tutti i target ma esporta evidenza per tox21-production; pubblica JSON/log diagnostici e un pacchetto modello QA, non un archivio staging distribuibile con image.tar. Non esiste quindi, in quel workflow, uno ZIP staging equivalente agli artefatti deployment Web da scaricare e passare direttamente al rollout.

Il percorso manuale esistente richiede una build locale staging con il pacchetto scientifico approvato, poi audit/esportazione. Non usare automaticamente il pacchetto modello CI etichettato ci-qa al posto del modello scientifico scelto. Il modello è incorporato nell'immagine: non richiede un mount separato sulla VM. Il suo manifest e gli hash vengono controllati dal coordinatore.

Prerequisiti: Docker locale operativo; checkout MercurionTox21 pulito al commit scelto con CI verde; pacchetto modello esportato e validato composto da weights.pt, thresholds.json e manifest.json. Questo non richiede un nuovo training. La scelta del pacchetto e della versione del rilascio appartiene all'operatore.

Nella **PowerShell Windows aperta nella root del checkout MercurionTox21**, acquisire gli input:

```powershell
$toxSha = git rev-parse HEAD
git status --short
$toxVersion = Read-Host 'Versione non vuota da assegnare a questo candidato Tox21'
$modelPackage = Read-Host 'Percorso assoluto del pacchetto modello approvato'
$toxExport = Read-Host 'Percorso assoluto della NUOVA cartella candidato Tox21'
$trivyCache = Read-Host 'Percorso assoluto della cache Trivy da usare'
```

git status deve essere vuoto: una build da un checkout modificato non prova che il codice corrisponda allo SHA dichiarato. Verificare sul run CI lo SHA $toxSha. Non fare switch/reset automatici per eliminare modifiche personali.

Eseguire i comandi seguenti **uno per volta**, proseguendo soltanto quando il precedente termina con successo:

```powershell
docker build --platform linux/amd64 --target staging --build-context "model_package=$modelPackage" --build-arg "BUILD_VERSION=$toxVersion" --build-arg "BUILD_REVISION=$toxSha" --tag mercurion-tox21:staging-candidate .
```

```powershell
python -B scripts/check_container_image.py mercurion-tox21:staging-candidate --target staging --version "$toxVersion" --revision "$toxSha"
```

```powershell
python -B scripts/smoke_container.py mercurion-tox21:staging-candidate --target staging
```

```powershell
python -B scripts/container_evidence.py --image mercurion-tox21:staging-candidate --output "$toxExport" --cache "$trivyCache"
```

Il controllo immagine verifica identità e inferenza; lo smoke usa proprie risorse Docker isolate e verifica i subject NATS, recupero broker e shutdown. L'esportatore produce image.tar ed evidenze, prova save/load e applica la policy strict. Exit code 2 indica candidato non ammesso dalla policy, non successo distribuibile. Non aggirare scanner, smoke o errori di tool. Tag locale riutilizzabile: non lanciarne build concorrenti; il bundle distribuito è identificato dai digest.

### Preparare un rollout del solo Tox21

Si può continuare dalla stessa PowerShell, usando i percorsi assoluti degli strumenti MercurionWeb:

```powershell
$webSha = Read-Host 'SHA completo MercurionWeb di riferimento per il rilascio coordinato'
$rolloutBundle = Read-Host 'Percorso assoluto della NUOVA cartella bundle; genitore esistente'
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/preview_application_rollout.py prepare --profile C:/.project_repo/MercurionWeb/scripts/infrastructure/preview-operations.example.json --web-revision "$webSha" --tox21 "$toxExport" --bundle "$rolloutBundle"
```

Nel caso solo Tox21, --web-revision resta obbligatorio per il manifesto di coordinamento: inserire uno SHA MercurionWeb reale di riferimento, non $toxSha o un valore fittizio. Il codice attuale NON verifica che tale SHA sia quello del Web già installato. La revisione Tox21 viene letta dal suo component.json e può differire da quella Web. Poiché mancano --web-node e --web-ng, il comando non aggiorna Nest o Angular.

Per un intervento con tutti e tre i componenti, usare un unico prepare con --web-node, --web-ng e --tox21. Se si usa un'altra PowerShell, reimpostare $toxExport con il percorso del candidato già esportato; non ricostruirlo soltanto per recuperare la variabile.

### Piano, applicazione e rollback: uguali per Web e Tox21

VM operativa, segreti già caricati, applicazioni avviate e debugger non sospeso. Dopo prepare riuscito, nella medesima PowerShell:

```powershell
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/preview_application_rollout.py plan --bundle "$rolloutBundle"
```

Verificare i roles: per Tox21 soltanto deve comparire tox21. Se piano e controlli passano:

```powershell
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/preview_application_rollout.py deploy --bundle "$rolloutBundle" --execute
```

Il comando trasferisce via SCP e carica le immagini, conserva gli ID precedenti e ricrea solo le app selezionate con Compose --no-deps. Richiede passphrase SSH/sudo. Non aggiorna server dati, segreti o SQL.

Atteso rollout-result.json con status passed. **Limite verificato nel sorgente:** readiness controlla immagini/processi e HTTP /health e /; NON esegue una RPC reale Tox21. Dopo un rollout Tox21 occorre quindi provare una predizione dal normale flusso applicativo e controllarne il risultato. Non chiamare questo rollout collaudo RPC completo.

Se serve tornare alle immagini precedenti, lo stesso bundle identifica l'intervento:

```powershell
python -B C:/.project_repo/MercurionWeb/scripts/infrastructure/preview_application_rollout.py rollback --bundle "$rolloutBundle" --execute
```

In caso di errore o report non recuperato conservare bundle e fase; non ripetere deploy alla cieca. Il rollback immagini non ripristina dati o schema. Una nuova consegna richiede una nuova directory bundle.

Questa spiegazione documenta gli strumenti esistenti: non attiva la delivery automatica e non costituisce una build, scansione o distribuzione appena eseguita. Nessun file della repository Tox21 è stato modificato.
