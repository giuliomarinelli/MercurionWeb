# Review INF-VM-02 — evidenze e prossimo perimetro

9 novembre 2026, aggiornata il 10 novembre. Raccolta delle prove sulla baseline statica Hyper-V.
Non è un'accettazione globale dell'isolamento né un'autorizzazione di deployment.

## Risultati disponibili

| Perimetro | Evidenza | Limite |
| --- | --- | --- |
| Indirizzi e recovery | IP host/guest, switch, NAT senza mapping, ACL e profili preservati dopo Restart Windows; SSH riuscito | Non recovery dello stack applicativo |
| Host Windows | Nove percorsi TCP/443, TCP/53 e UDP/53 da guest/due bridge negativi; 81 controlli host positivi post-Restart | Endpoint specifici, non attribuzione a un solo firewall |
| Egress Internet | DNS/HTTPS IPv4 su guest e due bridge, HTTP 200/TLS verificato | Smoke su endpoint dichiarato |
| WSL/Docker Desktop | Smoke WSL DNS/HTTPS riuscito; daemon e prove container locali funzionanti | Non tutte le applicazioni host |
| Guest/container → LAN | TCP Android negativo da tre origini, 18 controlli Windows positivi, route/correlazione/cleanup validi | Un telefono e una porta TCP |
| LAN → SSH VM | Android non connesso in tre secondi, host positivo prima/dopo | Route Android verso Internal non provata; whitelist H-05 non isolata sperimentalmente |
| IPv6 | Inventario completo, nessun unicast eth0/default route; bridge con IPAM IPv4, forwarding IPv6 0 | Kernel disponibile e docker0 link-local; nessun test negativo IPv6 con percorso positivo disponibile |

Fonti: [riavvio e persistenza](HOST-REBOOT-VERIFICATION.md),
[porte private host](PRIVATE-PORT-PROBES.md), [prove Android e IPv6](ANDROID-LAN-PROBES.md).
A-28/A-29 verificati nei loro perimetri; A-26/H-05 e A-30 restano parziali.
Non sostituire gli esiti dei report isolationAccepted false con true.

## Interpretazione IPv6

Il report guest delle 17:33:38 UTC non mostra un indirizzo IPv6 unicast su
eth0, né una default route IPv6. Docker bridge ha EnableIPv6 false e solo
172.17.0.0/16 in IPAM. Esistono ::1 e un link-local su docker0 con route
linkdown; le route multicast di tabella local non costituiscono una default route.
I tre disable_ipv6 letti valgono 0, quindi non dichiarare il kernel disabilitato.

Il deny IPv6 Hyper-V fa parte della policy DnsHttps già riletta dall'owner;
il collector guest non ricontrolla le ACL host. La configurazione osservata
non offre un percorso IPv6 esterno con cui costruire il controllo positivo.
Non abilitarlo soltanto per superare un test: introdurrebbe una topologia nuova.

Successivo brainstorming owner: proposta [VM-034 IPv4-only](IPV4-ONLY-DESIGN.md).
Il router non copre link-local VM ↔ host; mantenere il blocco sulla vNIC e
valutare interventi guest soltanto dopo definizione di verifiche/rollback.
La proposta non modifica gli esiti o autorizza cambiamenti di rete.

## VM-033 — esecuzione limitata alle fixture

**APPROVATA dall'owner il 9 novembre:** «Procedi con le sole fixture».
Eccezione circoscritta al precedente anticipo statico, senza trasformare
i residui in esiti passati. [Procedura operativa](FIXTURE-RUNTIME.md):

1. Mantenere H-05/A-30 aperti con i limiti sopra. Nessuna modifica a switch,
   ACL, router, forwarding o IPv6 per il collaudo.
2. Preparare una directory VM nuova per il bundle
   [deployment/local-vm](../../../deployment/local-vm/README.md), senza
   sovrascrivere configurazioni o dati esistenti.
3. Prima di creare risorse: verificare l'immagine esatta già locale, assenza
   di collisioni con nomi/progetti/reti/volumi e `compose config` sul guest.
   Nessun pull o recupero automatico di immagini mancanti.
4. Eseguire soltanto i tre Compose **sintetici** shared/preview/production:
   16 ruoli Python, 13 reti e 7 volumi di fixture, 15 collegamenti ammessi e
   18 vietati. Le immagini non sono Nest/Tox21/database/broker reali.
5. Listener senza port publishing, UID non root, cap rimosse, filesystem
   read-only e durata massima 600 secondi. Il nome production indica il ruolo
   della fixture, non un deployment dell'applicazione in produzione.
6. Raccogliere matrice, controlli positivi/negativi, hash e pulizia dei soli
   oggetti creati dalla prova; preservare risorse preesistenti.

Esclusi da questa proposta: segreti reali o consegna sintetica credenziali,
stack applicativo, DNS pubblico, Cloudflare Tunnel/Access, esposizioni LAN,
merge e promozioni. L'eventuale autorizzazione non chiude INF-VM-02 né le
accettazioni applicative successive.

**Preparazione locale ricontrollata:** `node scripts/check-local-vm-compose.mjs --self-test`
passato: tre progetti, 16 servizi, 13 reti, 7 volumi, matrice 15 allow/18 deny,
11 guardie topologia e 4 matrice. Riferimento immagine esatto interrogabile
sul Docker Desktop host; disponibilità dello stesso riferimento sul guest da
verificare prima dell'avvio. Nessun Compose avviato, bundle operativo trasferito
o risorsa VM creata durante questa review.

Ogni attività esterna a questa eccezione mantiene le autorizzazioni e i gate
precedenti. La risposta dell'owner non autorizza merge o deployment applicativo.

**Esito successivo VM-033:** run c2abe4b0e10248698a4e02a9ff584e5b completato
sulla VM il 9 novembre, 33/33 passed e cleanup 16/13/7 senza errori. Bundle/hash
e decisioni del report verificati sull'host. [Evidenza completa](FIXTURE-RUNTIME.md#7-collaudo-sulla-vm-riuscito).
Non modifica i limiti H-05/IPv6 della review: resta una prova della topologia
sintetica, non dell'isolamento completo o dei servizi applicativi reali.

**10 novembre, VM-034:** baseline host/guest e nuova revisione fixture
verificate. Run 2bcdfd57a75c4b2a979d2d2503351f5f: 13 reti con IPv4 true/IPv6
false, 33/33 casi e cleanup 16/13/7 senza errori; A-31 configurazione verificato.
[Evidenze e limiti](IPV4-ONLY-DESIGN.md#10-vm-034-verificata-sulla-vm--perimetro-configurazione).
Il kernel guest resta IPv6-capable, i due deny vNIC sono stati riletti; nessun
percorso IPv6 positivo creato e nessuna prova del filtro ricavata da assenza
di indirizzi/route. Restano i limiti H-05/A-05/A-30 sopra: prima di passare dal
perimetro fixture a quello del pilot sintetico, registrare una decisione
esplicita sui residui e sull'eventuale perimetro anticipabile, senza marcare
INF-VM-02 completo o riaprire implicitamente i gate dei servizi/segreti reali.

## Review dei residui del 10 novembre e ripresa del pilot

**Esito:** INF-VM-02 resta parziale; VM-033 e A-31/VM-034 sono verificati nei
rispettivi perimetri. Nessun nuovo test è necessario soltanto per riconfermare
questi stessi risultati in assenza di modifiche. Non costruire una rete IPv6
o un percorso LAN aggiuntivo per ottenere un controllo positivo artificiale.

| Residuo | Evidenza e limite | Impatto sul prossimo passo sintetico |
| --- | --- | --- |
| H-05 / A-26, altra origine SSH | ACL attuali uguali al modello: solo 10.203.240.1 → 10.203.240.10:22 stateful. Android non connesso, ma route verso Internal non provata | La restrizione è verificata come configurazione; prova del filtro da altra origine resta aperta. Il pilot usa soltanto l'alias SSH dell'host e non crea listener |
| IPv6 / A-05 / A-30 | Due deny ::/0 sulla vNIC; guest solo ::1 e nessuna default route, kernel disponibile. Tredici reti fixture IPv4-only verificate | Non è prova sperimentale del filtro IPv6. Il pilot non abilita IPv6 né usa un nuovo percorso di rete; i valori trasferiti sono sintetici |
| Copertura LAN / servizi reali | Un endpoint Android e percorsi host specifici misurati; servizi reali non avviati | Vietata l'estensione del risultato a tutte le porte/servizi. Il pilot non pubblica porte, avvia container o modifica egress |
| Recovery applicativo / A-23 | Persistenza rete verificata; nessun ripristino completo dei futuri stack | Il pilot verifica trasporto e file tmpfs nello stesso boot, non restart/recreate applicativi o consegna operativa |
| Autorizzazioni collector | Ultimo inventario diretto completo/elevato; causa del primo rifiuto non dimostrata | Nessuna riparazione WMI/UAC o modifica antivirus richiesta per procedere con il canale SSH già verificato |

Baseline attuale: host fb1a99fc2d9f49858e948c97019e5e1f, guest
0a4a324f8424486586dea762612d4caa, fixture 2bcdfd57a75c4b2a979d2d2503351f5f.
Percorsi/hash in [VM-034](IPV4-ONLY-DESIGN.md). Questi residui rimangono espliciti;
il loro impatto è valutato rispetto al singolo collaudo seguente, non eliminato.

### VM-035 — proposta pronta per il solo trasporto sintetico preview

Riprendere il pilot che l'owner aveva già tentato il 9 novembre prima del
recupero SSH, con un run nuovo. Nei log owner i tentativi
679aa98103c040f594b046e1494921ad e 1604ce419409487088fada2fab6d4622 si fermano
per timeout SSH. La riga «Fase: staged» indica l'operazione in partenza,
non una ricevuta che ne dimostra il completamento. Nessuna consegna VM
riuscita viene dedotta da quei tentativi o dai test locali.

Perimetro concreto sottoposto all'esecuzione dell'owner:

1. Usare soltanto `Invoke-SyntheticSecretDelivery.ps1 -Environment preview -Execute`.
   Il sorgente genera in memoria due stringhe NATS sintetiche; non accetta file
   di password manager, `.env`, PEM o valori reali.
2. Consegnare una copia per-run del solo helper in ~/.mercurion-infra, verificata
   tramite hash/tipo/ownership/permessi prima dell'esecuzione root degli stessi
   byte. L'alias mercurion-server e StrictHostKeyChecking restano obbligatori.
3. Provare prepare/receive/apply/inspect su /run tmpfs con runId nuovo, ambiente
   preview e unico consumer Tox21 UID/GID 10021. Nessuna modifica a account,
   SSH, sudoers, servizi, reti, firewall o configurazioni applicative.
4. Payload su stdin senza PTY; sudo su sessioni separate con prompt diretti.
   Nessun transcript della sessione. Condividere solo la ricevuta finale o
   runId/ultima fase/errore, mai password o passphrase.
5. Verificare le sei fasi fino a code-removed e metadati dell'active. Il file
   sintetico attivo resta nel tmpfs dopo l'uscita; non è un secret già montato
   in un'applicazione. In errore nessun retry o cleanup automatico dei run;
   riconciliazione e rimozione esplicita restano il passo successivo.

**Gate circoscritto proposto:** eseguire soltanto questo pilot senza dichiarare
INF-VM-02/04 completi. L'esecuzione esplicita del comando da parte dell'owner
registra l'adozione di questo perimetro per il singolo tentativo. Non estende
VM-033 a servizi o segreti reali e non abilita Cloudflare, broker, database,
provisioning operativo o restart/recreate applicativi.

**Review del codice e prove del 10 novembre:** orchestratore/helper/launcher
riletti; piano senza Execute verificato senza SSH. Ripetuti con successo 26
test Linux in container locale senza rete/pull e 10 test Windows (16 Linux
esclusi). Il lettore Tox21 è montato read-only, nessun file sibling modificato.
Container di test rimosso, nessun residuo con label del test. Nessuna nuova
esecuzione SSH del pilot effettuata dall'agente. [Procedura operatore](HOST-SYNTHETIC-DELIVERY.md).

**Esito della proposta:** owner esegue VM-035, run preview
dfc1af5a416f4b1abc6e8dab99034dbb, e fornisce ricevuta finale con sei fasi,
helper hash corrispondente e syntheticOnly true/servicesStarted false.
A-32 verificato nel solo trasporto sintetico. [Provenienza e limiti](HOST-SYNTHETIC-DELIVERY.md#esito-vm-035-del-10-novembre).
Il materiale active resta nel tmpfs per il prossimo task di riconciliazione e
rimozione selettiva. Nessun ampliamento ai gate di servizi/materiali reali,
nessuna prova aggiuntiva di filtraggio dedotta dalla riuscita del pilot.
