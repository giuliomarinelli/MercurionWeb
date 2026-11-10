# Collaudo controllato delle fixture INF-VM-03

## Autorizzazione e perimetro

Il 9 novembre 2026 l'owner approva VM-033: «Procedi con le sole fixture».
Sono autorizzati trasferimento del bundle, avvio dei tre progetti sintetici,
matrice da 33 casi e pulizia delle sole risorse create dalla prova. H-05/A-30
restano parziali. Nessuna autorizzazione per applicazioni, credenziali reali,
consegna segreti, Cloudflare, port publishing, merge o promozione.

I nomi shared/preview/production identificano i ruoli delle fixture Python.
Non avviano i servizi reali indicati dai nomi. Il filesystem root dei container
è read-only, UID 65534:65534, capability rimosse, nessun restart, limiti risorse
e listener per massimo 600 secondi. Solo TCP/DNS IPv4, senza prove host/LAN/IPv6.

## 1. Preparazione e controlli

`Invoke-TopologyFixtures.ps1` senza Execute verifica soltanto sorgente e
disponibilità dei trasporti. `-ValidateOnly` non trasferisce né avvia nulla.
Con `-Execute`:

1. Il preparatore riesegue il validator statico e le sue guardie, poi copia
   in una directory artifact nuova una lista chiusa di file: tre manifest,
   env di validazione vuoto, fixture, matrice e due script Python.
2. Produce modelli Compose normalizzati e un manifest SHA-256. Il solo bind
   ammesso resta il file fixture tracciato; nessun env operativo viene letto.
   I file sorgente vengono ricontrollati contro le copie prima del trasferimento.
3. SCP consegna il bundle in una directory guest univoca. SSH usa known_hosts
   e prompt diretti; niente Tee-Object, trascrizione o cattura di password.
4. Il lifecycle richiede root su Ubuntu mercurion-server e daemon Unix locale.
   Verifica hash del bundle, immagine esatta locale linux/amd64 e config Compose
   guest confrontato con quello host, normalizzando soltanto il path del bind.
5. Cerca collisioni con container/progetti, 13 nomi di reti e 7 volumi. Oggetti
   già presenti fermano la prova prima di up: non vengono riutilizzati,
   ricreati, cancellati o rinominati. Nessun pull/build/import automatico.

Non avviare altre operazioni sui medesimi progetti durante la misura.
Differenze fra versioni Compose che cambiano il modello bloccano il preflight;
conservare il report e diagnosticare prima di qualsiasi nuova esecuzione.

## 2. Comando operatore

VM pronta, normale PowerShell Windows, nessun'altra copia del collaudo attiva:

```powershell
powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Invoke-TopologyFixtures.ps1 -Execute
```

Passphrase SSH e sudo restano nel terminale dell'owner. L'immagine Python è
quella già usata nei probe VM: il riferimento preciso viene verificato prima
dell'avvio. Se non è disponibile, il test si ferma senza download.

## 3. Avvio, matrice e pulizia

Il lifecycle genera override che aggiungono soltanto una label casuale del
run a container, reti e volumi posseduti dal progetto. Avvia shared, preview,
production con i profili fixture/admin e pull never. Le reti external dei due
ambienti mantengono shared come proprietario.

Il runner verifica 16 fixture realmente in esecuzione, immagine, comando,
utente, filesystem, assenza di pubblicazioni e DNS option attesi. Controlli
positivi precedono la matrice; per ciascuna negazione controlla sorgente e
destinazione prima/dopo, DNS e tutti gli IP IPv4 di destinazione. Ogni errore
DNS temporaneo resta invalid; TCP connesso rende fallita una negazione anche
quando l'identità restituita è diversa.

Una rete internal può escludere la destinazione già per mancanza di route:
il probe registra separatamente `no-route` solo con ENETUNREACH, tabella
IPv4 del namespace letta correttamente e nessuna route corrispondente.
Con sorgente/destinazione attive e controlli prima/dopo, questo supera il caso
di **separazione topologica**, senza dimostrare un blocco firewall. Nel report
observedMechanisms distingue namespace-without-route da tcp-not-connected.
Tabella non leggibile, errore diverso o dati contraddittori restano invalid.
Questo criterio appartiene alla matrice delle fixture; non chiude H-05/A-30
né modifica i probe host/LAN che richiedono un percorso di rete valido.

Checkpoint persistenti documentano la fase e il caso attivo.
La console mostra fase e numero di casi completati, senza trascrivere i prompt.
Il report risiede fuori dal bundle, ha permessi 0600 ed è restituito all'owner sudo.
La riserva esclusiva del report e un marker di esecuzione impediscono
sovrascritture/riuso involontario del bundle.

Il finally rimuove prima i client del probe, poi solo container, reti e volumi
con label del run verificata immediatamente prima della rimozione. Niente
compose down generico, remove-orphans, prune o rimozione di oggetti preesistenti.
Il fallimento di scrittura del report non deve saltare il tentativo di pulizia.
Risorse residue o ownership cambiata invalidano il risultato e vengono riportate.

Non rilanciare automaticamente in caso di errore, perdita SSH o report assente.
Conservare bundle e ricevuta; verificare prima risorse/label e fase del report.
Il wrapper recupera con SCP il report anche quando il comando guest fallisce.

## 4. DNS delle sole fixture

Un primo collaudo locale si è fermato al caso 23 con EAI_AGAIN nella risoluzione
di nats-preview dal namespace tox21-production: 22 casi passati, uno invalid,
controlli TCP validi. Pulizia completa di 16 container, 13 reti e 7 volumi;
report conservato in inf-vm-03/local-validation/ef0fbe8c4e454fefa8035c50af761206.

Le sole fixture impostano ora `dns_opt: [ndots:1]`. Docker può inoltrare nomi
sconosciuti ai DNS host; l'opzione esplicita mantiene le query A a etichetta
singola prive di record locale nel resolver embedded, evitando quella dipendenza
esterna. I nomi noti continuano a risolversi. Non modifica DNS host/VM o daemon.
Il validator e il controllo runtime richiedono l'opzione esatta; non si
riclassifica EAI_AGAIN come negazione riuscita e non si aggiungono retry.

Seconda esecuzione locale con DNS circoscritto: 23 casi passati, il caso 24
fermato per OSError da una sorgente internal-only. Un'ulteriore diagnosi mirata
ha acquisito ENETUNREACH (101) e la sola route connessa, senza default;
namespace/destinazione positivi prima/dopo. Sono state rimosse le 16 fixture,
13 reti e 7 volumi anche in questa esecuzione e nella diagnosi. I report
restano in local-validation/a86b48d318cc4cb9b2f40e3ce3f6e6b2 e
local-diagnostics/554ec71280044066ab513e02d1fa49a2. La classificazione no-route
sopra rende esplicito questo meccanismo senza attribuirlo a un firewall.

Fonti primarie: [DNS Docker](https://docs.docker.com/engine/network/#dns-services),
[resolver Moby, gestione NdotsSet](https://github.com/moby/moby/blob/master/daemon/libnetwork/resolver.go).

## 5. Evidenze

Artifact host in `.codex/artifacts/inf-vm-03/<id-trasporto>/`: bundle e manifest,
modelli attesi e fixture-run.json con preflight, matrice, checkpoint e oggetti
rimossi/errori. I nomi del bundle e il runId delle label sono registrati nel
manifest, senza dedurli dalla directory. isolationAccepted resta false.

Verifiche locali: 12 test fixture/runner, 8 test lifecycle, preflight PS 5.1,
12 guardie statiche topologia e 4 matrice. Il collaudo Docker Desktop è una
verifica dello strumento; la matrice sulla VM richiede il suo report distinto.

**Collaudo Docker Desktop completo riuscito:** run
184a74ffefc548c4b92e59aa5b17e542, 9 novembre 18:05:19–18:08:17 UTC,
33/33 casi passati (15 allow, 18 deny). Nove negazioni osservano TCP non
connesso, nove assenza di route con evidenza Linux; controlli validi.
Pulizia completa di 16 fixture, 13 reti e 7 volumi, nessun errore o risorsa
con label residua. Report locale
`inf-vm-03/local-validation/4abc754a786842c8a3982f9984b22762/lifecycle.json`,
SHA-256 `957a484a9aa37b48e4667bce5fbc962ace97e58af8e7535790070fc9e7cc977d`.

Un terzo tentativo precedente, report local-validation/9e2d865cf4bd47538027018a087058a1,
era rimasto invalid per confronto dell'errno Linux con la costante Windows
del runner (101 contro 10051). Corretto il dominio dell'errno nel protocollo
Linux; test aggiornato a usare il valore remoto, senza cambiare il report
originale. Ogni tentativo precedente resta invalid e con pulizia riuscita.
La successiva prova VM non è ancora eseguita.

## 6. Primo preflight VM e correzione del riferimento immagine

Run VM `534be453d86e42329cad4686b522019a`, 9 novembre 18:21:21 UTC
(19:21:21 italiane): status invalid in preflight, mutationsAttempted false,
zero casi e nessun errore cleanup. Nessuna fixture/rete/volume è stata creata.
Report originale preservato in
`inf-vm-03/250580d3ae2a4f998a9d92f39ec1f897/fixture-run.json`, SHA-256
`971e127d89d0c648f31e3def3ba5d14047fadb4f9a9d8a73bda2fe6a67b96ff6`.

Errore: `python@sha256:65bd3d9...` non interrogabile nel daemon guest.
Il valore completo era l'ID locale della configurazione immagine, già usato
dai probe precedenti, inserito erroneamente nella sintassi di digest registry.
ID locale e digest del manifest sono identificatori distinti; il successo
su Docker Desktop non dimostrava la portabilità di quel riferimento dopo load.
L'errore non dimostra che i byte dell'immagine siano assenti sulla VM.

Correzione circoscritta: i tre Compose, validator e runner ora usano l'ID completo
`sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79`,
senza nome repository, tag creati automaticamente o dipendenza da RepoDigests.
Preflight richiede sempre Id esatto e linux/amd64. Il runner verifica anche
`.Image` dei container, oltre al riferimento richiesto in `.Config.Image`.
Se l'ID manca davvero, si ferma ancora senza pull/import/fallback.

Test mirati: 13 fixture/runner e 10 lifecycle passati, compresi immagine senza
RepoDigests, immagine mancante e ID effettivo container differente. Validatore
statico 12+4 guardie passato. Nuovo collaudo Docker Desktop con ID corretto:
run `0a949f871198499ebdd2e2baa4b46d38`, 9 novembre 19:24–19:26 CET,
33/33 passed, cleanup completo 16 container/13 reti/7 volumi e nessuna risorsa
con label del run residua. Report
`inf-vm-03/local-validation/8c4da1af23fe4e8dacd3cad9089c35ac/lifecycle.json`,
SHA-256 `351121f7f53d3d2e2142e81d61234eae6fe9fdfbdf50083b6e030ef552fd3f01`.
Nessun report VM viene sovrascritto o promosso a passed; nuova misura VM pendente.

Per riprovare, usare il comando della sezione 2 soltanto dopo la revisione della
correzione e delle sue verifiche: genera un bundle e report nuovi. Non rieseguire
il bundle vecchio e non modificare il report invalid. Il trasferimento resta
limitato ai sorgenti fixture, senza immagini o segreti.

Riferimenti primari:
[image ID e store content-addressable](https://docs.docker.com/reference/cli/docker/image/pull/),
[manifest del registry](https://docs.docker.com/reference/api/registry/latest/).

## 7. Collaudo sulla VM riuscito

**9 novembre 2026, 18:43:12–18:45:09 UTC (19:43–19:45 CET).** Run
`c2abe4b0e10248698a4e02a9ff584e5b`, bundle trasporto
`f5433185ab7045d1b7f060b00cbdded9`, sorgenti del commit `8ddfaafea`.
Report operatore recuperato via SCP e riletto sull'host:
`inf-vm-03/f5433185ab7045d1b7f060b00cbdded9/fixture-run.json`, SHA-256
`83db34b5476189d65755297487473f01d6ab2e6e890754fd020f2a17922b1893`.

Verifiche sul report e sul bundle locale conservato:

- RunId del manifest corrispondente al report, hash di tutti i file validi e
  sorgenti del bundle identici al tree tracciato. Preflight guest completato:
  immagine locale esatta linux/amd64, modelli Compose uguali a quelli attesi,
  nessuna collisione con container/progetti, reti o volumi preesistenti.
- Tre progetti avviati, 16 ruoli, 13 reti e 7 volumi. Matrice completa con 33
  coppie uniche corrispondenti al piano: **15 allow e 18 deny tutti passed**.
  Le 18 decisioni negative sono state ricalcolate sull'host con assess_negative;
  anche i 15 risultati TCP positivi sono stati controllati, senza nuovi probe.
- Nove negazioni osservano TCP non connesso, nove assenza di route del namespace
  con evidenza Linux e controlli validi. Non attribuire le seconde a un firewall.
- Cleanup dei client del runner senza errori; lifecycle con rimozione di 16
  fixture, 13 reti e 7 volumi, readback senza residui della label e nessun errore.
  È evidenza del report guest, non una seconda lettura live SSH dall'host.

Il perimetro **VM-033 delle sole fixture è verificato sulla VM**. Nessun servizio
applicativo, segreto, immagine aggiuntiva o port publishing introdotto.
Il primo tentativo invalid rimane conservato. isolationAccepted resta false:
questa matrice non chiude H-05, A-30/IPv6, accessi amministrativi loopback,
provisioning, recovery applicativo o Cloudflare. Nessun avvio successivo è
autorizzato automaticamente dal superamento delle fixture.

## 8. Revisione VM-034 del 10 novembre

Le 13 reti possedute dai progetti hanno ora famiglie esplicite IPv4 true/IPv6
false. Le external non vengono riconfigurate dai consumer. Il runner, prima
della readiness, acquisisce EnableIPv4, EnableIPv6 e subnet IPAM delle reti
effettive; rifiuta IPv6 attivo, dati mancanti/subnet IPv6 ed endpoint container
IPv6 globale/gateway. Il report conserva networkFamilyReadback.

Verifiche nuove: 15 test fixture/runner, 10 lifecycle, 15+4 guardie statiche;
collaudo Docker Desktop 33/33 con 13 readback di rete validi e cleanup completo.
[Hash, tempi e limiti](IPV4-ONLY-DESIGN.md#7-verifiche-locali-del-10-novembre).
Il run VM del 9 novembre resta valido per la sua revisione; non dimostra i
nuovi controlli. Prima di una nuova misura VM seguire baseline/readback della
procedura VM-034. Nessun filtro IPv6 viene modificato o dichiarato collaudato
da questa guardia sulla configurazione Docker.
