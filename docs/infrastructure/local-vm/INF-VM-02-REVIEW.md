# Review INF-VM-02 — evidenze e prossimo perimetro

9 novembre 2026. Raccolta delle prove sulla baseline statica Hyper-V.
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

## Proposta VM-033 — prossima esecuzione limitata alle fixture

**PROPOSTA, non approvata.** La roadmap finora autorizza solo la preparazione
statica anticipata di INF-VM-03. Per proseguire senza trasformare questi residui
in esiti passati, sottoporre all'owner questa eccezione circoscritta:

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

Se l'owner non autorizza l'eccezione, restare nel perimetro di preparazione
locale già concesso. Non dedurre un'approvazione da assenza di risposta.
