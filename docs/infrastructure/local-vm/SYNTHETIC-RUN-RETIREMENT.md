# VM-036 — riconciliazione e rimozione dei materiali sintetici

10 novembre 2026. Owner autorizza il prossimo task con «ok proseguiamo» dopo
VM-035. Perimetro operativo: solo run preview `dfc1af5a416f4b1abc6e8dab99034dbb`,
consumer Tox21, nessun consumer avviato. La ricevuta completa è conservata in
`.codex/artifacts/inf-vm-04/<runId>/operator-receipt.json` sul profilo Windows.
Non è autorizzata la rimozione di materiale reale o di altri namespace.

## 1. Piano locale senza SSH

Il [launcher](../../../scripts/infrastructure/Invoke-SyntheticRunRetirement.ps1)
richiede RunId esatto, senza wildcard. Senza Execute legge soltanto la ricevuta
locale e mostra il piano. Il wrapper Python [host](../../../scripts/infrastructure/synthetic_run_retirement.py)
accetta schema chiuso, preview/tox21, syntheticOnly true, servicesStarted false,
sei fasi precedenti complete e runId coincidente. Sono ammessi l'hash helper
storico VM-035 oppure quello corrente; il nuovo codice trasferito è sempre
verificato separatamente col suo SHA. Non apre payload, .env o password manager.

Il piano locale per il run selezionato è stato eseguito con successo su
PowerShell 5.1, executionRequested false; nessun SSH o file guest toccato.

## 2. Comando operatore

Con VM accesa e nessun altro bootstrap/manutenzione concorrente, da PowerShell
Windows normale eseguire una sola riga:

```powershell
powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Invoke-SyntheticRunRetirement.ps1 -RunId dfc1af5a416f4b1abc6e8dab99034dbb -Execute
```

Quattro connessioni SSH, una fase sudo; passphrase/password solo nel terminale.
Host key obbligatoria e forwarding porte disabilitato come nel pilot. Nessun
transcript, payload in argv, servizio avviato o modifica di rete. La copia
temporanea dell'helper segue gli stessi controlli di hash/ownership/tipo/modo
già testati; non è un'installazione root permanente.

## 3. Riconciliazione prima della rimozione

L'[helper guest](../../../scripts/infrastructure/secret_delivery.py) aggiunge
reconcile/retire/inspect-retired, mantenendo le API della consegna esistente.
Richiede Linux, /run su tmpfs e assenza di mount annidati nel namespace.
Percorso fisso `/run/mercurion-bootstrap/<runId>`, antenati root-owned protetti,
nomi chiusi e metadati esatti; niente percorsi ricevuti dal payload.

| Stato rilevato | Comportamento |
| --- | --- |
| prepared / received | Descrive i metadati, nessuna rimozione automatica |
| active completo | Verifica ambiente/account, struttura, permessi, tipo e singolo link; solo questo stato può essere ritirato |
| applying / retiring o struttura incoerente | Stop e conservazione per diagnosi, nessun retry automatico |
| retired | Ripetizione esplicita di sola lettura dei metadati |
| absent | Nessuna scrittura; assenza osservata, non prova di una nuova rimozione eseguita |

Non legge bootstrap.json né payload.json: legge il solo state.json protetto e,
dopo la rimozione, la marca retired.json, entrambi senza credenziali. Verifica
anche Docker sul socket Unix locale: container running, stopped o created con
bind sovrapposto al run, a un suo discendente o antenato bloccano l'operazione.
Ispeziona soltanto metadati mount, mai Env/comandi dei container. Docker non
disponibile o dati malformati fermano la rimozione prima di qualsiasi mutazione.

È una manutenzione esclusiva del pilot senza consumer: il controllo non è un
lock globale Docker e non certifica l'assenza di lettori host arbitrari.
Non usare questo strumento per ritirare credenziali applicative reali.

## 4. Rimozione selettiva e ricevuta

1. Dopo i controlli, prende un lock non bloccante del run e rivalida lo stato.
2. Crea un'intenzione root-owned retiring.json esclusiva. Se qualcosa fallisce
   dopo questa riserva, il run resta interrotto per diagnosi.
3. Rimuove soltanto active/bootstrap.json e le directory active/inbox vuote,
   verificando ancora l'identità del file. Nessuna ricorsione, glob o rmtree.
4. Pubblica retired.json e verifica la struttura finale. Rimangono soltanto
   state.json e retired.json root/0600, senza valori: il nome del run resta
   riservato e prepare/apply non possono riutilizzarlo nello stesso boot.
5. Una sessione non-root verifica i metadati e l'assenza dei percorsi dati;
   una quarta connessione rimuove solo la copia temporanea del codice.

Attesa ricevuta finale con fasi staged/retired/retirement-verified/code-removed,
state retired, valuesAbsent true e codeRemoved true; syntheticOnly true,
servicesStarted false e isolationAccepted false. state absent è distinto:
può seguire perdita del tmpfs e non va registrato come rimozione appena eseguita.
Riportare il solo JSON finale. In errore conservare runId, ultima fase e codice;
non rilanciare, non rimuovere marker o directory alla cieca.

## 5. Verifiche locali e limiti

38 test Linux passati nel container effimero senza rete/pull; 14 test Windows
passati e 24 integrazioni Linux escluse. Coperti anche stato ricevuto/preparato,
file inattesi, symlink/hardlink/modi errati, altro run preservato, owner/ambiente
diversi, mount parent/child e container fermi, Docker non disponibile, lock
occupato, interruzione dopo riserva e rifiuto del riuso. La prova completa del
nuovo host esegue helper verificato e identità/filesystem reali, simulando la
sola risposta Docker senza container. SSH e sudo reali restano prova operatore.
La suite include le regressioni di consegna precedenti; nessun codice Tox21
modificato. Piano PS 5.1 riuscito e nessun container di test residuo.

Helper manutenzione SHA-256
`7328eadb8793bc0e19d7ae87537af6301e58cbcee7f43a61abcf88f73eb294ef`;
orchestratore manutenzione SHA-256
`f102dc1bdf5540517d7c17463cf6e6c800704d10b11ca8a4856c5722f2fd557e`.
Sono hash di sorgenti; la ricevuta storica VM-035 conserva il proprio hash.
**A-33 VM pendente:** nessuna rimozione sulla VM ancora eseguita dall'agente.
Mount/consumer, restart/recreate e materiali reali restano fasi successive.
