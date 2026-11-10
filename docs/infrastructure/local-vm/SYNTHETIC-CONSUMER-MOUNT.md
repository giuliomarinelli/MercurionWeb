# VM-037 — Lettore Tox21, mount e riavvio sintetici

**10 novembre 2026 — implementato e verificato localmente; esecuzione VM pendente.**
L'owner autorizza la prosecuzione dopo il ritiro VM-036. Il perimetro è un
nuovo run sintetico preview, con fixture Python senza rete. INF-VM-02/04
restano aperti e H-05/A-05/A-30 conservano i propri residui.

## 1. Scopo e vincoli

Verificare che il vero adattatore `secret_bootstrap.py` di MercurionTox21
possa leggere il file come UID/GID 10021 e rileggerlo dopo restart e recreate.
Si incorpora nel bundle il sorgente del lettore dalla repository separata,
senza modificarla. Non si eseguono `main.py`, inferenza, NATS o altri servizi
applicativi; non si trasferiscono pesi, `.env`, PEM o credenziali reali.

Immagine locale Python Linux/amd64 fissata per **image ID**, non digest di
manifest registry:
`sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79`.
`--pull never`, `--network none`, filesystem root read-only, capability tutte
rimosse, `no-new-privileges`, limiti memoria/CPU/PID, nessuna porta pubblicata.
I due bind sono il codice fixture e il solo file sintetico, entrambi read-only.
Il file non entra in `Config.Env`, argv o layer. Il lettore popola un dizionario
di processo, senza inviare richieste al broker e senza stampare i valori.

Le identità dei sorgenti sono hash di **codice**, mai hash delle credenziali:

- Lettore Tox21: `acd8aa097c15455182806aaefc8c6939c66fbacfdf9e9bc9955c31a9e875f2d2`.
- Probe: `9ec74bf34d39222e49f6666c1165de8327ab4df04aa8df25305d02fec9821f87`.
- Helper VM-036 invariato: `7328eadb8793bc0e19d7ae87537af6301e58cbcee7f43a61abcf88f73eb294ef`.

Il bundle include helper, driver, lettore e probe: viene nuovamente verificato
prima di ogni esecuzione guest. Il suo hash compare nel piano e nel report.
Il run VM-035/036 `dfc1af5a416f4b1abc6e8dab99034dbb` rimane chiuso e non viene riusato.

## 2. Sequenza automatizzata del singolo tentativo

1. Generare in memoria un nuovo runId e due valori sintetici, senza file dati
   sull'host. Creare il solo report host di metadati prima della prima SSH.
2. Consegnare il bundle per-run come utente SSH; eseguire prepare con sudo,
   receive su stdin senza PTY, apply con sudo e inspect non privilegiato.
   Alias e controllo della chiave host restano quelli già configurati.
3. Nel comando privilegiato di collaudo verificare run active preview,
   ownership/permessi, immagine presente e assenza di altri mount sul run.
4. Creare le sole fixture del tentativo e raccogliere i sei casi sotto.
5. Verificare che inode, proprietà, dimensione e tempi di modifica del file
   sorgente non siano cambiati. Rimuovere solo i cinque container identificati
   dalla label casuale del tentativo, inclusi quelli fermi/created, con controllo
   dell'ownership e lettura finale. Eliminare i soli due sorgenti fixture noti.
6. Solo dopo il successo e la pulizia, ritirare il nuovo run con il protocollo
   VM-036: dati assenti, due metadati root senza valori contro il riuso.
7. Recuperare il risultato di soli metadati con utente SSH, verificare il
   retirement e rimuovere la copia staged del codice. Salvare il report host.

| Caso | Evidenza richiesta |
| --- | --- |
| initial | Lettura reale UID 10021 e valori sintetici attesi; chmod respinto con EROFS sul bind |
| restart | Stesso container ID, seconda invocazione del lettore con UUID differente, nuova lettura read-only |
| recreate | Container ID nuovo, file sorgente ancora disponibile e nuova lettura read-only |
| unauthorized | UID/GID 65534 riceve `file-unreadable` |
| missing | UID 10021 senza bind del file riceve `file-unreadable` |
| wrong-environment | UID 10021 con PY_ENV production e file staging riceve `environment-mismatch` |

Sono cinque container perché initial/restart condividono lo stesso oggetto.
Ogni esecuzione stampa solo runId, caso, UID, UUID d'invocazione ed esito.
Il runner legge da Docker solo campi di configurazione necessari, mount e
log della propria fixture; non acquisisce Env o log dei container esistenti.

## 3. Procedura operatore, passo per passo

1. Lasciare la VM accesa, LUKS sbloccato e SSH funzionante sulla rete statica.
   Non cambiare ACL, NAT, Kaspersky, SSH o sudoers. Python locale e immagine
   fissata sulla VM sono quelli già usati nei collaudi precedenti.
2. Da **PowerShell Windows normale**, eseguire questa unica riga:

   ```powershell
   powershell -NoProfile -File C:/.project_repo/MercurionWeb/scripts/infrastructure/Invoke-SyntheticConsumerMount.ps1 -Execute
   ```

3. Inserire passphrase SSH e password sudo soltanto nei prompt del terminale.
   Le sessioni sudo ereditano la console; il payload viaggia su un'altra
   sessione senza PTY. Lo script non registra transcript o prompt.
4. Attendere le otto fasi: staged, prepared, received, applied, active,
   consumer-tested, consumer-result, code-removed. Atteso riepilogo finale
   `status: passed`, `checkCount: 6`, `retirementState: retired`,
   `codeRemoved: true`, `realServicesStarted: false`, `isolationAccepted: false`.
5. Riportare soltanto il JSON finale con `reportPath`. Il report dettagliato
   è `~/.codex/artifacts/inf-vm-04/<nuovo-runId>/consumer-mount-result.json`.
   Senza `-Execute` il comando mostra soltanto il piano, senza SSH o file.

In errore conservare runId, ultima fase, codice d'errore e report. Non ripetere
automaticamente e non rimuovere directory o container alla cieca. Il runner
tenta soltanto la pulizia delle proprie fixture; se la verifica o la pulizia
fallisce, non ritira il materiale active. Un'interruzione improvvisa può
lasciare fixture o metadati: riconciliare prima di un nuovo tentativo. La
procedura VM-036 rifiuta correttamente un run con fixture/mount inattesi.

## 4. Evidenze locali e limiti

- **51 test Linux passati**, con identità e permessi reali su tmpfs. Inclusa
  esecuzione completa di STAGE/LOAD/CLEANUP con bundle verificato e retirement;
  in questi test il solo Docker è simulato. Coperti mount RW, immagini errate,
  mount preesistenti, perdita del daemon, ownership, cleanup incompleto,
  run già ritirato e ricevute incoerenti. Le suite VM-035/036 restano verdi.
- **19 test Windows passati, 32 integrazioni Linux escluse**; piano reale
  PowerShell 5.1 passato senza SSH.
- **Docker Desktop reale: 6/6**, run `22df6f265467454db8f3f31561c4a845`.
  Bind da tmpfs locale, lettore Tox21 reale, UID/mode/EROFS effettivi,
  restart stesso ID e recreate diverso; cinque consumer rimossi, keeper e
  volume tmpfs rimossi, nessun errore di pulizia o risorsa con label residua.
  Report `inf-vm-04/local-validation/<runId>/consumer-mount.json`, SHA-256
  `e1a978891995ba8b1a4e30eaf7a59bd01e9f7c929c593256f18a95fcfce0ea49`.

Riproduzione locale: `Test-SecretDelivery.ps1` per la suite e
`python -B scripts/infrastructure/local_consumer_mount_validation.py` dalla
root per il Docker reale. Richiedono Docker Desktop locale `desktop-linux`
e l'immagine già presente; nessun pull o collegamento alla VM.

**A-34 pendente sulla VM.** Le prove locali non attestano SSH/sudo né il
Docker Engine guest. Il successo futuro della fixture proverà il bootstrap
del lettore nel proprio perimetro, non restart dell'applicazione, resilienza
del broker, reboot guest, provisioning reale o accettazione dell'isolamento.
