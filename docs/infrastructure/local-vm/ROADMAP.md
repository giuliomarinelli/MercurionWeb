# Roadmap — deployment demo Hyper-V / Docker Engine

**Shared/preview adottati sulla VM:** upgrade `6d019947800b4578bc2b5d40791f5132`
passed, sette controlli true, volumi persistenti nuovi e originali conservati.
Prossimo lavoro autorizzato: [carico embedding](EMBEDDINGS-IMPORT.md), 50 chunk
con 2.644.421 righe a 768 dimensioni. Manifest verificato; DDL corretto per
preferred_name e dimensione del vettore, import transazionale con journal e
fase HNSW separata. Meili ChEMBL e accesso pubblico vengono dopo il carico.

**Adozione in corso:** [aggiornamento operativo shared/preview](SERVICE-UPGRADE.md).
Inventario owner aggiornato, quattro server running e segreti tmpfs presenti.
I cinque candidati sono ora un insieme collaudato: stack locale completo passato,
trasferimenti Redis/Meili e backup/rollback predisposti. I Compose versionati e
la procedura di consegna sostituiscono i server su volumi separati; l'esito VM
va ancora acquisito. Non chiudere questa voce alla sola build delle immagini.

**Audit preliminare alla correzione Compose:** eseguito sui cinque artefatti
di sviluppo, tutti bloccati dalla policy CVE strict. L'owner autorizza fix
coordinati sviluppo/staging e collaudi isolati. PostgreSQL 16.16 è ora costruito
dai sorgenti ufficiali verificati: export/load e scansione strict a zero,
sei controlli SQL/HNSW/auth/restore/restart passati. Tutti i cinque candidati
hanno scansioni positive; la sostituzione dei servizi attivi resta da preparare
con restore separati e riconciliazione del recovery.
Il contratto Nginx dedicato HTTP-only/senza maintenance è ora verificato.
[Esiti e passi necessari](SERVICE-SECURITY-AUDIT.md).

**Precedenza vincolante:** parità delle versioni server con
`docker_sl/docker-compose.yml`, richiesta dall'owner il 12 novembre.
L'audit ha trovato divergenze in PostgreSQL/pgvector, Redis, NATS, Meili e
Nginx: [confronto e piano](SERVICE-VERSION-PARITY.md). Prima di restore o
consolidamento pubblico correggere questo aspetto, mantenendo la policy CVE
strict. Nessun upgrade/downgrade o cambio allo sviluppo è stato eseguito.

**Priorità operativa del 12 novembre:** staging funzionante. Dopo la conferma
owner di spegnimento/riavvio, anticipare il recupero dei quattro server rispetto
alle API key/applicazioni: [procedura e vincoli](COLD-RECOVERY.md). Inventario
sanitizzato riuscito il 12 novembre, senza lettura di credenziali o avvio servizi.
Riconsegna e avvio dei soli quattro server eseguiti; verifica successiva
`d2cfff6e2a204c27ac3362f4d9e59fbf` passed con sei controlli. Prossimo passo:
chiavi client Meili a 90 giorni completate; ora primo avvio delle applicazioni
private, descritto in [APPLICATION-BOOTSTRAP.md](APPLICATION-BOOTSTRAP.md).
Nessuna chiusura dei gate di isolamento.
Cloudflare Access sul dominio è predisposto dall'owner, collegamento e collaudo
pubblico rimangono da verificare.

**Avanzamento corrente:** schema applicativo inizializzato e quattro container
running; verifica `51f087181cb34ec3ad4ace23ec9e53fe` passed su backend,
frontend e RPC Tox21 reali. Forward privato Nginx e landing visibile in Chrome
confermati dall'owner; non sono collaudo di login, dati o origine pubblica.
Procedura nelle [sezioni 7–8](APPLICATION-BOOTSTRAP.md#7-riprendere-soltanto-la-verifica-dei-container-esistenti).

### Fase dati successiva — inventario prima del trasferimento

**Pausa operativa owner:** attendere che siano scaricati/estratti i chunk
SQL privati. Eseguite soltanto letture di versione Meili e analisi del codice.
Meili locale 1.14.0 supporta già dump/snapshot; immagine VM 1.56.2, quindi
non sostituire la migrazione con una copia fisica cross-versione. Proposta di
baseline SQL separata dagli embedding e contratto del tool scope in
[DATA-BOOTSTRAP-PLAN.md](DATA-BOOTSTRAP-PLAN.md). Nessun restore, upgrade o
cambio di scope eseguito. La nuova baseline non è un migration runner.

L'owner conferma due indici Meilisearch ChEMBL e una tabella di oltre tre
milioni di embedding con indice HNSW costoso da costruire. Esisterebbe già un
dump suddiviso in numerosi chunk: posizione e formato ancora da inventariare.
Non trasferire o ripristinare dati durante la fase di verifica/forward.

1. Inventariare file, dimensioni, compressione, formato del dump, numerazione
   dei chunk, checksum per file e ordine esplicito di ricomposizione. Distinguere
   dump logico SQL/custom/directory da un backup fisico e da file arbitrariamente
   spezzati. Acquisire versioni PostgreSQL/pgvector, schema, dimensioni dei
   vettori, definizione dell'indice e conteggi attesi.
2. Usare il canale SSH già autorizzato Windows → guest. SCP è già operativo;
   SFTP usa lo stesso accesso SSH, senza aprire un nuovo servizio/porta. Scegliere
   il metodo e la strategia di ripresa in funzione dei file reali, conservando
   manifest e checksum e saltando soltanto chunk già verificati.
3. Un dump logico PostgreSQL conserva dati e definizione dell'indice, non le
   pagine fisiche HNSW: il restore può quindi richiedere una ricostruzione
   costosa. Pianificare dati e creazione indice separatamente, senza rifare
   l'indice più volte. Un backup fisico ha vincoli differenti e non va trattato
   come import di una sola tabella nello schema applicativo esistente.
4. Valutare spazio e RAM prima di ripristino/indice. Aumentare solo la RAM
   della VM non aumenta il limite del container PostgreSQL (attualmente 768 MiB).
   Qualsiasi aumento temporaneo deve comprendere limiti effettivi del container,
   impostazioni di build indice, effetto su restart/ID e successivo ripristino
   delle risorse; non cambiare questi parametri automaticamente.
5. Per Meili verificare formato/versione e perimetro dei due indici. Non
   importare indiscriminatamente un dump dell'intera istanza sovrascrivendo
   chiavi applicative, indici log e impostazioni già predisposte.
6. Dopo il restore verificare conteggi, metadata, modello/dimensioni degli
   embedding e query campione ChEMBL/similarità; conservare ricevute e tempi.

Il test Access dell'owner sul dominio collegato temporaneamente a Pages è
positivo; il passaggio al tunnel e la prova sull'origine Mercurion restano
successivi al collaudo privato. Nessun cambio DNS in questa fase.

Riferimenti tecnici per questa futura fase: [formati e sezioni di pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html),
[build degli indici pgvector](https://github.com/pgvector/pgvector#index-build-time),
[SCP/SFTP sul canale SSH](https://man.openbsd.org/scp). Servono come approfondimento;
la procedura operativa di trasferimento/restore sarà documentata nel repository
dopo aver identificato il formato reale dei file.

**VM-045, preparazione:** launcher iniziale privato e documentazione disponibili;
quattro export applicativi con scansioni strict a zero, inclusa derivazione OS
Tox21 per CVE-2026-84243. Collaudo locale sintetico dello stack riuscito, sette
controlli, cleanup senza errori. Esecuzione owner sulla VM ancora da acquisire.
Poi: consolidare ripartenza unificata dopo perdita tmpfs, import ChEMBL e
collaudo funzionale; solo successivamente tunnel pubblico, header e cookie HTTPS.

> **Avanzamento fine 11 novembre:** rete statica e prove nei perimetri registrati,
> pilot sintetici/RPC conclusi; VM-043 quattro server reali privati avviati e
> VM-044 quattro indici Meili creati. Prossima azione rinviata: due API key
> ristrette, 90 giorni. Cold recovery, app e accesso pubblico rimangono aperti.
> [Runbook autosufficiente](RUNBOOK.md), [registro eseguito/pronto](EXECUTION-RECORD.md),
> [pausa e ripresa](CONTINUITY.md). Le note progressive successive conservano
> la storia delle autorizzazioni, senza prevalere su questo riepilogo.


**Stato:** roadmap architetturale. Le fasi rappresentano risultati verificabili, non giorni di lavoro promessi; un blocco può richiedere più sessioni. Seguire [DAILY-LOG.md](DAILY-LOG.md) per esiti e limiti reali.

## INF-VM-01 — Documentazione e contratto

**Obiettivo:** una specifica comprensibile da sviluppatori/agenti senza inferire decisioni dalle vecchie manifestazioni Kubernetes.

- Consolidare situazione reale, decisioni owner, topologia, matrice di rete e privilegi.
- Registrare UI SSH/read-only, precreazione curl amministrativa e flusso degli artefatti.
- Individuare conflitti con schema deployment, overlay, Compose, Nginx e codice Nest.
- **Consegna:** documenti coerenti e linkati, questioni aperte e niente modifiche infrastrutturali eseguite.
- **Gate:** review owner; nessuna configurazione futura deve trasformare una `PROPOSTA` in `APPROVATA` senza verifica.

## INF-VM-02 — Host, guest e confini di rete

**Stato, 7 novembre:** in verifica. Guest già predisposto dall'owner; Ubuntu
26.04.1, Engine 29.9.3, Compose 5.7.0 e policy SSH acquisiti da inventario
operatore. Non reinstallare né sostituire switch/regole per ricreare la baseline.
[Evidenze e gate aperti](HOST-GUEST-READINESS.md): root LUKS, risorse guest e
backend firewall e ACL acquisiti; H-02 TCP IPv4 verificato con controllo positivo.
H-04 IPv4 verso Windows verificato da due bridge guest con controlli positivi.
H-06 smoke DNS/HTTPS IPv4 verso docs.python.org verificato su guest e due bridge.
H-02 IPv6 link-local guest → host verificato con route e controlli positivi.
Rimangono prove IPv6 container/globale, LAN e altre origini; lo smoke non copre tutti i provider
applicativi. INF-VM-02 non è dichiarato concluso.

**9 novembre:** cambio subnet Default Switch, alias SSH e ACL con indirizzi
precedenti, timeout anche sul nuovo IP. VM-032: [procedura statica passo per
passo](STATIC-NETWORK-MIGRATION.md), rete Internal e Kaspersky Pubblica,
divieto diretto LAN ↔ guest/container. Inventario amministrativo completo;
M-03 eseguito dall'owner: switch Internal ancora vuoto e IP host statico,
stato operativo Preferred e profilo Windows Public verificati. Prossimo passo:
classificazione Kaspersky prima di qualunque attach: owner ha ora confermato
Pubblica sulla nuova rete tramite screenshot; efficacia/persistenza aperte.
Default Switch osservato Locale, ripristino Pubblica richiesto mentre ancora
usato dal guest, causa del cambio profilo non provata. Preparare backup e ACL
prima della migrazione guest. Rivalidare isolamento
e reboot sulla nuova baseline; vecchie prove non certificano la rete futura.
Bootstrap sintetico sospeso fino al recupero dell'accesso amministrativo.

M-05: backup Netplan creato e VM spenta confermati dall'owner. [Script ACL
SSH-only](SSH-ONLY-ACL.md) disponibile con snapshot, guardie e quarantena;
16 scenari locali con API Hyper-V simulate passati. Apply reale owner ora
riuscito con readback di 14 ACL; egress pubblico chiuso, isolamento non accettato.
Nessun NAT/avvio VM; owner ha ora collegato la sola vNIC a Mercurion-Internal,
con MAC invariato. Verify sul nuovo collegamento riuscito; prossimo passo
avvio console/LUKS e confronto backup prima di configurare l'IP statico guest.
Owner ha ora confermato BACKUP_OK: consegnata modifica minima Netplan e
validazione generate. NETPLAN_OK ora confermato da screenshot: predisposta
prova temporanea netplan try da console. Owner ha poi accettato la configurazione
dopo TCP/22 riuscito dall'host interno e verifica MAC. Alias SSH aggiornato e
chiave server gia fidata verificata. Owner conferma shell Ubuntu raggiunta:
SSH recuperato anche dopo riavvio guest: owner conferma IP 10.203.240.10/24
e default via 10.203.240.1 proto static. IP host Preferred/Manual e Windows
Public riletti dall'agente. Owner conferma Verify ACL post-riavvio riuscito,
con egress e isolamento false. Owner conferma inoltre Kaspersky ancora
Pubblica. In quella fase egress ancora chiuso; restano reboot host e isolamento LAN.
Router ZTE MC888 Ultra controllato dall'owner: port forwarding, DMZ, UPnP e
mapping disabilitati. Preparato prossimo passo WinNAT, preceduto da lettura
dei NAT esistenti e mantenendo la policy SSH-only. Lettura attuale owner vuota;
creazione Mercurion-NAT riuscita, prefisso 10.203.240.0/24 e Active 1.
Inventario post-creazione completo riletto: nessun mapping, 14 ACL SSH-only
invariate, forwarding/weak-host disabilitati e Windows Public. Nessun allow
outbound aggiunto. Nuova H-02 IPv4 eseguita: timeout guest → host, 36 controlli
positivi e listener chiuso. H-04 sulla rete statica riuscito: due
bridge guest, controlli prima/dopo positivi e nessun errore di pulizia.
Prossimo passo: predisporre apertura controllata DNS/HTTPS per lo smoke H-06,
mantenendo deny host/LAN e IPv6. Ripetere negazioni dopo apertura egress.
Implementazione [DnsHttps](DNS-HTTPS-ACL.md) pronta: 19 ACL, preflight NAT e
Public, 28 scenari lifecycle e 26 casi iniziali di traffico simulati passati.
H-06 runner: quattro unittest e ValidateOnly passati. Piano amministrativo
riuscito; owner ha poi spento il guest e applicato DnsHttps con 19 ACL verificate,
snapshot coerente e nessun avvio/spostamento automatico. H-06 poi riuscito da
guest e due bridge con DNS, TLS 1.3, HTTP 200 e cleanup. H-02 ripetuto: timeout
verso host, 23 controlli positivi e listener chiuso. H-04 aggiornato riuscito
su due bridge con 12 controlli host, cleanup e Verify finale DnsHttps riusciti.
**Passi residui:** IPv6, verifica delle origini H-05 e copertura LAN residua. Non
anticipare accettazione complessiva o deployment sulla sola riuscita H-06.
**VM-034, proposta da decidere:** [IPv4-only](IPV4-ONLY-DESIGN.md) per ridurre
il networking supportato, conservando il deny IPv6 Hyper-V. Un filtro sullo ZTE
non copre i percorsi locali; nessuna regola router/guest modificata. Definire
verifiche e rollback prima di eventuali interventi, senza chiudere IPv6/H-05.
**10 novembre — VM-034 avviata:** owner autorizza la predisposizione operativa.
Sorgenti Compose con famiglie esplicite sulle 13 reti, validator e readback
Docker rafforzati; kernel IPv6 guest conservato. [Procedura e rollback](IPV4-ONLY-DESIGN.md#5-procedura-passo-per-passo-del-10-novembre).
Nuovo inventario host richiesto all'owner; verifiche VM della nuova revisione
ancora da acquisire. Nessuna modifica alle ACL o al router; H-05/A-30 aperti.
Verifiche locali riuscite: 15 test runner/10 lifecycle, 15+4 guardie Compose,
28 scenari ACL lifecycle e 26 egress + 30 match IPv6 espliciti simulati.
Docker Desktop 33/33 e readback IPv4-only delle 13 reti, cleanup completo;
queste prove non completano A-31 sulla VM.
Inventario host diretto fb1a99fc2d9f49858e948c97019e5e1f ora completo:
19 ACL DnsHttps identiche al modello, due deny IPv6 ::/0, identità vNIC/switch,
IP persistente, NAT senza mapping e Windows Public verificati. Kaspersky
Pubblica owner confermata; nessun Apply. Guest Off, prossimo passo avvio/LUKS
e inventario IPv6 read-only; successiva matrice VM-034 ancora da acquisire.
Il precedente errore di autorizzazione non è riprodotto né spiegato.
Collector guest 0a4a324f8424486586dea762612d4caa completo e hash verificati:
solo ::1, nessuna default route/unicast eth0 IPv6, kernel disponibile e bridge
IPv4. Nessuna nuova configurazione applicata. Consegna del comando fixture
VM-034 dopo baseline host/guest; attesa matrice e 13 readback sulla VM.
**VM-034 configurazione verificata:** run 2bcdfd57a75c4b2a979d2d2503351f5f,
10 novembre, 13 readback IPv4-only e 33/33 casi, cleanup 16/13/7 senza errori.
Report/hash e decisioni ricalcolati; A-31 verificato nel perimetro configurazione.
Non chiude A-05/A-30/H-05 o INF-VM-02 complessivo. Prima del pilot sintetico
INF-VM-04 riesaminare questi residui e il gate; nessuna deroga implicita.
Strumento [porte private](PRIVATE-PORT-PROBES.md) pronto: 13 unittest, tre
scenari trasporto PowerShell 5.1, preflight host e collaudo Docker Desktop
passati. Esecuzione owner acquisita: nove percorsi host TCP/443, TCP/53 e
UDP/53 non raggiungibili da guest/due bridge; 63 controlli host positivi,
route e finestre correlate, cleanup e chiusura canary riusciti. Perimetro
specifico e hash nel documento; nessuna estensione automatica alla LAN.
Successivo riavvio Windows eseguito: inventario completo e Verify DnsHttps
confermano IP persistente, switch/vNIC, NAT senza mapping, ACL e Windows Public;
owner conferma Kaspersky ancora Pubblica. SSH/IP/route guest preservati,
H-06 riuscito e nove negazioni private ripetute con 81 controlli host positivi,
cleanup e correlazione riusciti. [Punto M-08 aggiornato](HOST-REBOOT-VERIFICATION.md).
Docker Desktop risponde e collaudo locale su due bridge riuscito; successivo
smoke Ubuntu WSL con avvio, DNS e HTTPS verificato, HTTP 200 ed exit 0.
A-28 verificato per persistenza e funzionamento base, non recovery applicativo.
Android predisposto e misura TCP verso LAN acquisita: guest/due bridge non
raggiungono il canary, 18 controlli Windows positivi, route/correlazione e cleanup
riusciti. [Evidenze](ANDROID-LAN-PROBES.md). Chiusura Android poi confermata:
controls-passed e closed true.
Tentativo opposto Android → SSH VM acquisito: non connesso in tre secondi,
host positivo prima/dopo. Route dall'altra origine non provata, quindi nessuna
attribuzione alla whitelist. Nessuna modifica ai filtri o all'instradamento;
A-30/H-05 restano parziali. Collector IPv6 guest completo: assenza di unicast
eth0/default route, bridge IPv4, forwarding 0; kernel disponibile e link-local
docker0, nessun test IPv6 negativo superato. [Review e proposta VM-033](INF-VM-02-REVIEW.md)
per la sola matrice runtime delle fixture, senza chiudere i residui. Owner
ha poi approvato «Procedi con le sole fixture»: [procedura VM-033](FIXTURE-RUNTIME.md),
senza segreti, app reali o port publishing. Gli altri gate restano invariati.
Residuo strumenti: diagnosticare il prompt sudo tardivo nella pipeline SSH/PTY,
senza cambiare autenticazione, sudoers o acquisire password nei report.

**Dipende da:** INF-VM-01.  
Preparare Docker Engine e plugin Compose su Ubuntu, amministrazione SSH a chiave, policy host↔guest, firewall e regole IPv4/IPv6. Non introdurre bridge fisici della LAN. Definire test negativi dalla VM e dai container verso Windows/LAN e protezione della porta SSH.

**Accettazione:** raggiungibilità amministrativa necessaria, assenza di accessi proibiti, assenza di servizio Internet esposto; annotare versione Docker Engine (>=28 per la proiezione loopback candidata).

## INF-VM-03 — Compose base e reti senza applicazioni reali

**Dipende da:** INF-VM-02.  
**Eccezione circoscritta autorizzata dall'owner, 7 novembre:** anticipata la sola
preparazione statica locale. Tre manifest fixture e validator disponibili in
[deployment/local-vm](../../../deployment/local-vm/README.md), senza avvio VM.
Sintassi, 11 guardie topologia e 4 guardie matrice locali passate; listener TCP,
matrice da 33 casi e runner su fixture già avviate preparati. Dieci test locali
del probe/runner passati, Docker simulato. INF-VM-02 e matrice runtime restano
aperti. INF-VM-03 non è dichiarato completato.
**Eccezione successiva VM-033, 9 novembre:** owner autorizza collaudo runtime
e pulizia delle sole fixture. Bundle con hash, collision guard e lifecycle
predisposti; immagine locale e modelli guest da verificare prima dell'avvio.
I segreti/servizi reali e Cloudflare restano esclusi. [Procedura](FIXTURE-RUNTIME.md).
Collaudo dello strumento su Docker Desktop: 33/33 casi passati, cleanup
16/13/7 riuscito. Il lifecycle separa errori DNS, connessione bloccata e assenza
di route del namespace; quest'ultima è separazione topologica, non prova firewall.
Dodici test runner e otto lifecycle passati; prova VM ancora da eseguire.
Primo tentativo VM 534be453d86e42329cad4686b522019a fermato nel preflight:
zero casi, mutationsAttempted false, riferimento immagine non interrogabile.
Corretto il pin delle sole fixture da pseudo-digest registry a ID locale
immutabile già usato dai probe. Nessun pull/tag/import come fallback;
nuovo bundle e nuova evidenza VM necessari. [Diagnosi](FIXTURE-RUNTIME.md).
Correzione verificata con 13 test runner, 10 lifecycle e nuovo collaudo
Docker Desktop 33/33, cleanup completo 16/13/7 e nessun residuo del run.
**Collaudo VM riuscito:** run c2abe4b0e10248698a4e02a9ff584e5b del 9 novembre,
33/33 (15 allow/18 deny), preflight/hash verificati, decisioni negative
ricalcolate, cleanup 16/13/7 senza errori o residui nel readback guest.
**Perimetro fixture VM-033 verificato**; questa eccezione non chiude INF-VM-02
né autorizza servizi/segreti reali. La configurazione IPv4-only VM-034 è stata
poi verificata il 10 novembre; H-05/A-30 restano punti di review prima di
estendere il runtime.

Definire directory `shared`, `preview`, `production`; reti esterne, alias, `internal`, `egress`, volumi e confini. Evitare un solo Compose con molti flag. Iniziare con probe/fixture non sensibili.

**Accettazione:** `docker compose config` valido e matrice delle comunicazioni positive/negative verificata. Nessun servizio host pubblicato eccetto gli endpoint loopback operativi autorizzati.

## INF-VM-04 — Segreti e credenziali operative

**Dipende da:** INF-VM-03.  
**Preparazione documentale:** [audit consumer e contratto proposto](BOOTSTRAP-CONTRACT.md)
disponibili. Adattatori [Nest](NEST-SECRET-FILE-ADAPTER.md) e
[Tox21](TOX21-SECRET-FILE-ADAPTER.md) opt-in implementati/testati con materiale
sintetico, senza cambiare l'avvio esistente. Nessun
provisioning; trasporto e ciclo di vita da approvare. Client Meilisearch separati
e permessi sintetici verificati localmente l'8 novembre; [auth NATS Nest](NATS-CLIENT-AUTH.md)
implementata con coppia opzionale user/password; Tox21 allineato e mantenuto sul
proprio branch operativo, adapter file in `b6476dd`. Configurazione broker, consegna protetta
credenziali e grant reali VM restano aperti. L'esecuzione mantiene le dipendenze 02/03 e INF-VM-04 resta aperto.

**9 novembre:** [pilot ricevitore/apply Tox21](SECRET-DELIVERY-PILOT.md)
implementato con envelope chiuso, identità separate e pubblicazione su tmpfs;
17 test Linux locali passati, incluso lettore Tox21 reale. Trasporto SSH,
installazione VM, altri consumer e restart/recreate applicativi ancora aperti.

Orchestratore host sintetico ora implementato: [contratto e prova operatore](HOST-SYNTHETIC-DELIVERY.md).
26 test Linux locali passati, inclusi comandi guest effettivi e verifica del
codice prima dell'esecuzione privilegiata. Nessuna connessione SSH eseguita;
verifica trasporto/prompt e filesystem VM ancora aperta.

**Review del 10 novembre completata:** VM-035 pronta come proposta per riprendere
il pilot sintetico preview già tentato prima della migrazione SSH. Baseline
host/guest e VM-034 verificate; residui H-05/A-05/A-30 mantenuti, INF-VM-02 non
dichiarato completo. Review codice e nuove prove: 26 Linux passed, 10 Windows
passed/16 Linux skipped, piano senza SSH passato. [Gate circoscritto](INF-VM-02-REVIEW.md#review-dei-residui-del-10-novembre-e-ripresa-del-pilot)
e [procedura con un solo comando](HOST-SYNTHETIC-DELIVERY.md#ripresa-operatore-del-10-novembre--vm-035).
L'esecuzione owner del singolo pilot non autorizza servizi o materiali reali.
Trasporto VM, stato active e successiva riconciliazione/rimozione restano da
verificare prima di mount e restart/recreate applicativi.
**VM-035 trasporto sintetico verificato sulla VM:** owner completa run
dfc1af5a416f4b1abc6e8dab99034dbb, sei fasi fino a code-removed, helper hash
e ricevuta metadata-only validati. A-32 verificato nel suo perimetro; active
sintetico conservato su tmpfs. Prossimo task: riconciliazione e rimozione
esplicita del solo run, senza leggere valori o cancellare namespace generici;
poi mount/consumer e restart/recreate sintetici. Nessuna consegna reale,
servizio avviato o chiusura di INF-VM-04 complessivo impliciti.
**VM-036 predisposta:** riconciliazione per stato e ritiro selettivo dei materiali
del solo run VM-035 completato, con ricevuta host obbligatoria, blocco su mount
e metadati incoerenti, marker d'interruzione e tombstone senza credenziali.
38 test Linux e 14 Windows passati (24 Linux esclusi su Windows), piano PS 5.1
senza SSH verificato. [Comando e limiti](SYNTHETIC-RUN-RETIREMENT.md); A-33
ancora da misurare sulla VM prima di passare ai consumer/mount.
**VM-036 verificata sulla VM:** ricevuta owner sul run VM-035 con quattro fasi,
state retired e valuesAbsent/codeRemoved true, hash/corrispondenza al run
originario validati. A-33 verificato; metadati root senza valori conservati
contro il riuso. Prossimo collaudo: nuovo run sintetico per mount read-only
e rilettura da consumer dopo restart/recreate, senza riutilizzare il run chiuso.

Progettare/implementare l'iniezione protetta dal password manager Windows al bootstrap VM, secret per ambiente, credenziali Meilisearch, PostgreSQL, Redis, NATS, OAuth, Twilio, cookie, JWT. Preservare nomi legacy compatibili. Rinviare rotazione a caldo.

**VM-037 verificata:** [nuovo run e collaudo consumer](SYNTHETIC-CONSUMER-MOUNT.md)
con vero lettore Tox21, bind read-only UID 10021, restart/recreate e tre
negativi; rimozione fixture prima del ritiro automatico del nuovo run sintetico.
51 test Linux e 19 Windows passati, 6 casi su Docker locale reale riusciti.
Owner completa il run preview af0b6eb4637940eb814acfd380e27f26 sulla VM:
6/6, cinque container/assets rimossi, retired e codeRemoved confermati dal
report host riletto e dagli hash corrispondenti. A-34 verificato nel perimetro
sintetico. I run VM-036 e VM-037 restano chiusi;
nessun avvio di main.py, NATS, applicazioni reali o cambio dei gate di rete.
Dopo A-34: riesaminare il passaggio da fixture all'immagine applicativa
fissata e il provisioning consumer/broker; materiali reali restano un passo
esplicito successivo, senza estenderne implicitamente l'autorizzazione.

**VM-038 review completata:** [immagini, CI e modello](TOX21-ARTIFACT-REVIEW.md).
Le immagini locali precedono i launcher e l'archivio CI aggiornato non è
pubblicato; modello esistente riutilizzabile, senza nuovo training.
**VM-039, rinvio security poi risolto:** l'owner impone policy strict in
entrambe le repo, con blocco a ogni gravità e dev inclusi. [Diagnosi, scope
e prove della policy](../security-strict-2026-11-10.md). Prima correggere i
finding e ottenere la nuova CI verde; poi candidato staging locale con modello verificato,
audit/bootstrap/NATS sintetico senza source overlay, poi export/SBOM/scan.
Anticipazione circoscritta degli strumenti INF-VM-06, prima di trasferimento
e avvio applicativo guest; nessun cambiamento ai gate di isolamento.
Il rientro è poi verificato e [VM-039 eseguita sull'host](TOX21-STAGING-CANDIDATE.md):
candidato staging d506101 esportato a zero finding e bootstrap/lifecycle
reali passati. Restano bundle, preflight e collaudo guest separati.

**Accettazione:** nessun segreto in Git/layer/CI/log; riavvio e perdita dei materiali temporanei prevedibili; nessuna master key del server accessibile ai backend.

## INF-VM-05 — Meilisearch, indici e accesso SSH di consultazione

**Dipende da:** INF-VM-03 e 04.  
Avviare singola istanza Meilisearch; importare ChEMBL da artefatto locale verificato; precreare i quattro indici runtime esclusivamente con `curl` e chiave amministrativa temporanea; verificare permessi delle key. Valutare `eyeix/meilisearch-ui` **solo** dopo scansione CVE; configurare due forward SSH per UI e API, con credenziale read-only nel browser.

**Accettazione:** query ChEMBL da entrambi gli ambienti, log segregati, nessuna scrittura ChEMBL dalle key runtime, negazione API amministrative dalla UI, nessun accesso web pubblico.

## INF-VM-06 — Pipeline di consegna e archivio

**Dipende da:** INF-VM-01/03; coordinabile in parallelo con 04/05.  
Consolidare exporter e coordinatore esistenti per immagini staging e production Web/Tox21; pubblicare bundle completi di release approvata su Actions; scaricare/archiviare sull'host e su copia separata; verificare hash e `docker load` sulla VM. Non compilare sorgenti in produzione.

VM-038 conferma sullo SHA Tox21 5f3d837 la mancanza del tar tra gli artifact
pubblicati, pur con build/audit/smoke/gate verdi. Per il prossimo test non è
necessario completare tutta la pipeline: VM-039 propone prima un candidato
manuale staging locale usando exporter e modello esistenti. Release complete,
retention, copia indipendente e cold restore restano risultati separati.

VM-039 ora eseguita dopo il rientro strict: [candidato staging locale](TOX21-STAGING-CANDIDATE.md)
Tox21 d506101 pronto, bootstrap/RPC/lifecycle reali e archivio verificato a
zero finding. VM-040 prepara il [bundle di trasporto e preflight guest](TOX21-TRANSPORT-PREFLIGHT.md):
bundle locale verificato e otto controlli guest eseguiti dall'owner passati,
report riletto e pronto al trasferimento.
Poi trasferimento/hash/load da affrontare separatamente; nessun servizio VM
o release Web completa dedotti.

VM-041 ora accorpa [trasferimento/load e pilot RPC reale](TOX21-VM-PILOT.md)
di Tox21 con NATS corretto e scansionato: rete temporanea interna, niente
publishing/egress, sole credenziali sintetiche, cleanup selettivo. Prove host
e guest concluse: due load/save verificati, tre lifecycle reali e nove
negazioni NATS, tre stop puliti e cleanup senza errori. Report recuperato e
correlato senza rieseguire il pilot. Riusare immagini e meccanismi verificati
per il successivo stack preview, senza dedurre accettazione integrata.

**Accettazione:** due release identificabili, un candidato e un precedente; manifest per ambiente, provenienza e rollback meccanico ripetibile; retention non dipendente da Actions.

## INF-VM-07 — Stack applicativi e tunnel Cloudflare

**VM-043 — primo avvio dei soli server:** [procedura e wrapper](PREVIEW-SERVER-BOOTSTRAP.md),
riuso del candidato d227dbf4, codice di consegna separato dalle immagini,
collision guard e secret delivery tmpfs, readiness e report. Prove locali
dei contratti, permessi Linux e quattro server reali sintetici completate.
Esecuzione reale acquisita: run 6c3e72e2e4064b71bd3bbffcff4d629c passed dopo
ripresa del loader SCP, quattro readiness/roundtrip e nessun publishing.
Quattro indici Meili poi creati; chiavi client curl 90 giorni pronte ma rinviate.
[Punto di arresto e ripresa](CONTINUITY.md). Nessun cambio ai gate pubblici.

**VM-042, 11 novembre — preparazione preview privata in corso.** Provider
reali da compilare dall'owner nel file locale e hostname `preview.mercurion.app`.
Master Meilisearch solo server; key search/writer create dall'operatore con
curl. Proiezione separata dalle fixture: otto ruoli senza publishing;
collaudo locale a freddo passato con valori sintetici (schema, health backend
via edge, SPA). Non è avvio VM, login o accettazione pubblica.
[Passi, evidenze e residui](PREVIEW-BOOTSTRAP.md). Prossimo blocco: immagini
definitive/CI, bootstrap server VM e curl; poi applicazioni e dati.

**Dipende da:** 03, 04, 05, 06.  
Avviare progressivamente PostgreSQL/Redis/NATS e backend/frontend/Tox21 per ambiente; recuperare routing utile da Nginx storico **senza** TLS origin/maintenance mode; configurare cloudflared, Access per preview, header forwarded, cookie, OAuth redirect e WebSocket.

Valutare VM-034: selezione esplicita IPv4 per il tunnel e origin, scelta HTTP/2
oppure QUIC e autorizzazione egress 7844 alle destinazioni previste. Le ACL
DnsHttps attuali non consentono il tunnel; nessuna apertura anticipata.

**Accettazione:** end-to-end browser reale su entrambi gli hostname; nessuna API Meilisearch/SSH esposta, sessioni/autorizzazioni funzionanti, staging e production separati.

## INF-VM-08 — Recupero, dati demo, limiti e documentazione operativa

**Dipende da:** 07.  
Eseguire backup/restore dei dati e dei manifest, testare arresto e restart, log consultabili in sola lettura, rollback e ripristino a freddo. Misurare RAM/CPU/disco prima di salire da 16 GiB a 24–26 GiB o 28 GiB massimo indicativo. Preparare avviso pubblico di case study e guida operativa essenziale.

**Accettazione:** report completo e verificabile; gestione manuale realistica per una sola persona; nessun requisito artificiale di disponibilità 24/7.

## Backlog applicativo correlato

**SEC-FIX-02/03 — Bonifica implementata, gate richiesti prima di VM-039:**
fork deepmerge corretto e testato, tre audit npm completi a zero; base Wolfi
Tox21 con stesso Python/modello, 159 test e scan OS/Python pulito, CI esatta
42857018732 verde. Corretto anche zlib nei runtime Web. Prima di proseguire,
verificare i Required gate full sugli ultimi SHA, senza eccezioni.
[Analisi, evidenze e percorso di chiusura](../security-strict-2026-11-10.md#passi-necessari-per-completare-il-rientro).

**BUG-AUTH-01 — Da diagnosticare e correggere:**
[challenge adattiva MFA, geolocalizzazione locale e coerenza login](../../bug-reports/2026-11-09-adaptive-login-mfa.md).
Segnalazione del 9 novembre, con controlli mirati della storia Git e analisi
tecnica. Lavoro applicativo distinto; solo documentazione, nessun cambiamento
auth, ordine INF-VM o gate. Dopo questa parentesi riprendere la prova PowerShell.

**BUG-SUPPORT-01 — Da affrontare:**
[notifiche ticket agli operatori e toast condizionale](../../bug-reports/2026-11-08-support-ticket-notifications.md).
Segnalazione dell'owner dell'8 novembre: bugfix trasversale backend/email e
UX/state management, tracciato nella roadmap applicativa PX-15/PX-16 e F-05.
Lavoro distinto da INF-VM: questa registrazione non ne cambia ordine o gate e
non costituisce implementazione del fix.

## Esclusioni dall'intera roadmap

Kubernetes, alta disponibilità, autoscaling, CI/CD sempre attivo, rotazione JWT a caldo, UI amministrativa esposta sul web, deployment MercurionData/LandingFactory e nuove feature chimiche non richieste alla demo.

## Criterio di arresto

Se un blocco non supera i gate di isolamento, permessi o integrità, **non** proseguire al tunnel pubblico. Annotare limite e motivazione nel diario; non risolvere con privilegi più ampi o disabilitando controlli.
