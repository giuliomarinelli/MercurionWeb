# Installazione revisionabile della delivery preview

Questa procedura **non è stata eseguita sulla VM**. Installa un runner e abilita
una nuova chiave di automazione: eseguire soltanto dopo revisione dei file.
La variabile GitHub di attivazione viene impostata per ultima.

## 1. Identità e confini

Scelte dell'operatore: branch `preview`, account Windows
`giulio.marinelli@icloud.com`, cartella `%USERPROFILE%\.mercurion\preview\delivery`,
account Linux esistente `giuliomarinelli`. `%USERPROFILE%` indica la home
Windows effettiva, non una variabile `%USER%`.

Il runner avviato con l'account Windows personale ha gli stessi permessi su
file di quell'account: non è isolamento dal profilo personale. Il driver non
legge configuration.json né il token Cloudflare, ma questa limitazione del
codice non equivale a negare quei file al processo Windows. Per isolamento
Windows occorre invece un account locale distinto e ACL dedicate. Non
installare il runner come amministratore o LocalSystem.

Su Linux si mantiene l'account richiesto, separando **la chiave**: la nuova
chiave ha un forced-command e non permette una shell, SFTP generico o tunnel.
Non aggiungere quell'account al gruppo Docker e non assegnare NOPASSWD a Docker,
Python generico, bash o agli script ricevuti dagli artefatti.

GitHub segnala il rischio dei runner persistenti per repository pubbliche:
[secure use reference](https://docs.github.com/en/actions/reference/security/secure-use).
Il workflow fornito filtra push/branch/repository/run anche prima di contattare
il runner, non esegue PR né codice scaricato. Questo non impedisce a chi può
modificare workflow attendibili della repository di usare il runner: proteggere
`preview`, il default branch e i file `.github/workflows/` dagli autori non
fidati. Non usare questo runner per altri workflow o repository.

## 2. Preparare la copia locale attendibile

**PowerShell Windows, root MercurionWeb**, sotto l'account scelto per il runner:

```powershell
$delivery = Join-Path $env:USERPROFILE '.mercurion/preview/delivery'
New-Item -ItemType Directory -Path "$delivery/tools" -ErrorAction Stop
Copy-Item scripts/infrastructure/preview_ci_delivery.py,scripts/infrastructure/preview_application_rollout.py,scripts/infrastructure/restore_preview_secrets.py,scripts/infrastructure/preview_deploy_broker.py,scripts/infrastructure/preview_deploy_gateway.py -Destination "$delivery/tools"
Copy-Item scripts/coordinate-delivery.py -Destination "$delivery/tools"
Copy-Item scripts/infrastructure/preview-operations.example.json -Destination "$delivery/preview-operations.json"
```

Se la directory esiste, ispezionarla: non sovrascrivere una precedente
installazione o una delivery in corso. Questi sono file pubblici, senza
credenziali. La copia attendibile non si aggiorna automaticamente dai bundle.
Gli aggiornamenti del driver/broker richiedono revisione e installazione
esplicita separata dal rollout applicativo.

Creare i tre documenti pubblici sotto la cartella scelta:

```powershell
$profile = Get-Content -LiteralPath "$delivery/preview-operations.json" -Raw | ConvertFrom-Json
$profile.sshHost = 'mercurion-preview-delivery'
$profile | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath "$delivery/preview-operations.json" -Encoding UTF8
@{profilePath="$delivery/preview-operations.json";workDirectory="$delivery/runs"} | ConvertTo-Json | Set-Content -LiteralPath "$delivery/delivery-settings.json" -Encoding UTF8
@{deployUser='giuliomarinelli';profile=$profile} | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath "$delivery/deployment-policy.json" -Encoding UTF8
```

La policy root deve corrispondere esattamente al profilo consegnato dal driver.
Un nuovo percorso Compose/runId richiede aggiornamento revisionato della policy;
non viene accettato perché incluso in un artefatto.

## 3. Chiave SSH dedicata

**PowerShell Windows**, con `$delivery` definita come sopra:

```powershell
ssh-keygen -t ed25519 -f "$delivery/id_ed25519" -C mercurion-preview-delivery
```

Per questa sola identità automatizzata il file chiave deve essere utilizzabile
senza prompt: lasciare vuota la passphrase alle due richieste. Proteggere quindi
la directory tramite Sicurezza → Avanzate in Esplora file: accesso al solo
account Windows del runner e amministratori/SYSTEM. Non copiarvi configuration.json
né il token Cloudflare. La chiave personale cifrata non viene modificata.

In `%USERPROFILE%\.ssh\config` **dell'account che esegue il runner** aggiungere:

```sshconfig
Host mercurion-preview-delivery
    HostName 10.203.240.10
    User giuliomarinelli
    IdentityFile ~/.mercurion/preview/delivery/id_ed25519
    IdentitiesOnly yes
    BatchMode yes
    StrictHostKeyChecking yes
    ClearAllForwardings yes
```

L'impronta della VM va verificata con quella fidata prima di aggiungere la voce
known_hosts di questo account. Non usare StrictHostKeyChecking=no o accettazioni
automatiche; il normale alias personale non va modificato.

## 4. Installare il broker immutabile sulla VM

**Shell Ubuntu tramite il normale SSH personale**:

```bash
mkdir -m 700 "$HOME/preview-delivery-install"
```

**PowerShell Windows**, usando ancora l'alias personale per questa installazione:

```powershell
scp "$delivery/tools/preview_application_rollout.py" "$delivery/tools/restore_preview_secrets.py" "$delivery/tools/coordinate-delivery.py" "$delivery/tools/preview_deploy_broker.py" "$delivery/tools/preview_deploy_gateway.py" "$delivery/deployment-policy.json" "$delivery/id_ed25519.pub" mercurion-server:preview-delivery-install/
```

**Shell Ubuntu**:

```bash
sudo install -d -o root -g root -m 0755 /usr/local/lib/mercurion-preview-delivery
sudo install -o root -g root -m 0644 "$HOME/preview-delivery-install/preview_application_rollout.py" "$HOME/preview-delivery-install/restore_preview_secrets.py" "$HOME/preview-delivery-install/coordinate-delivery.py" "$HOME/preview-delivery-install/preview_deploy_broker.py" "$HOME/preview-delivery-install/preview_deploy_gateway.py" "$HOME/preview-delivery-install/deployment-policy.json" /usr/local/lib/mercurion-preview-delivery/
sudo visudo -f /etc/sudoers.d/mercurion-preview-delivery
```

Nel file sudoers inserire **solo**:

```sudoers
giuliomarinelli ALL=(root) NOPASSWD: /usr/bin/python3 -I -B /usr/local/lib/mercurion-preview-delivery/preview_deploy_broker.py *
```

Il wildcard riguarda gli argomenti del file fisso; il broker accetta esattamente
un ID hex di 32 caratteri e un hash hex di 64, non un comando o un percorso.
Python gira in modalità isolata; i moduli vengono caricati dalla directory
root-owned, non dall'inbox né dalla home.

Validare prima di continuare (**Ubuntu**):

```bash
sudo visudo -cf /etc/sudoers.d/mercurion-preview-delivery
sudo stat -c '%U %G %a %n' /usr/local/lib/mercurion-preview-delivery /usr/local/lib/mercurion-preview-delivery/*.py /usr/local/lib/mercurion-preview-delivery/deployment-policy.json
```

Attesi root/root, directory 755 e file 644, nessun permesso di scrittura per
altri. La directory padre `/usr/local/lib` deve essere anch'essa root-owned e
non scrivibile dall'account.

Aggiungere a `~/.ssh/authorized_keys` **una nuova riga**, conservando quelle
personali. La nuova riga deve essere la chiave di `id_ed25519.pub` preceduta da:

```text
restrict,command="/usr/bin/python3 -I -B /usr/local/lib/mercurion-preview-delivery/preview_deploy_gateway.py" ssh-ed25519 CHIAVE_PUBBLICA_REALE mercurion-preview-delivery
```

`CHIAVE_PUBBLICA_REALE` è il contenuto pubblico generato, non la chiave privata.
Non aggiungere la stessa nuova chiave anche senza prefisso. Il gateway rifiuta
comandi diversi da upload/deploy; l'upload tar accetta file regolari entro limiti
espliciti (4 GiB/file, 8 GiB totali, 40 file), in una nuova directory del solo run.
Il broker valida allowlist, digest, proprietà e symlink su directory FD, copia
in una release root-owned e verifica security e identità delle immagini.
Nessun codice ricevuto viene eseguito come root.

**PowerShell Windows: prova negativa obbligatoria**:

```powershell
ssh mercurion-preview-delivery whoami
```

Deve fallire con «Only bounded upload and preview deployment are permitted»,
senza prompt di password. Se restituisce un utente o apre una shell, non
abilitare la delivery: la restrizione della chiave non è corretta.

## 5. Registrare il runner, senza privilegi amministrativi

GitHub repository → Settings → Actions → Runners → New self-hosted runner →
Windows x64. Sotto l'account Windows scelto, seguire i comandi di download e
verifica SHA indicati dalla pagina ufficiale. Usare una sottocartella
`runner` sotto la cartella delivery, fuori dal checkout del progetto.
La versione e l'hash visualizzati da GitHub sono la fonte per il pacchetto;
non usare un archivio di provenienza diversa. Non inserire il token temporaneo
di registrazione in questa documentazione, in Git o in chat.

Durante `config.cmd`: nome/label `mercurion-preview-delivery`; repository
MercurionWeb; work directory predefinita `_work`. Aggiungere esplicitamente la
label personalizzata `mercurion-preview-delivery`. Non scegliere esecuzione
come servizio LocalSystem; per il primo collaudo avviare `run.cmd` dal terminale
non amministrativo e tenerlo aperto. L'esecuzione persistente sotto un account
Windows va configurata dopo il collaudo, mantenendo la stessa identità.

Impostare le variabili GitHub Actions della repository:

| Variabile | Valore |
| --- | --- |
| `PREVIEW_DELIVERY_PYTHON` | percorso assoluto di python.exe dell'account runner |
| `PREVIEW_DELIVERY_DRIVER` | percorso assoluto `delivery/tools/preview_ci_delivery.py` |
| `PREVIEW_DELIVERY_SETTINGS` | percorso assoluto `delivery/delivery-settings.json` |
| `PREVIEW_DELIVERY_ENABLED` | lasciare assente o `false` fino al collaudo |

Il driver usa solo `github.token` con `actions:read` e `contents:read`; non
richiede PAT personale o segreti server nelle Actions. Configurare environment
`preview` e consentire solo il branch `preview`. Il workflow `workflow_run`
deve essere presente sul default branch per ricevere gli eventi: questa modifica
non pubblica né integra automaticamente i file. La CI di `preview` deve contenere
anche l'upload delle immagini, altrimenti il driver rifiuta la consegna.

## 6. Prima consegna e criteri di successo

Solo dopo revisione/installazione e prova negativa, impostare
`PREVIEW_DELIVERY_ENABLED=true`. Un nuovo push attendibile su `preview` deve
completare CI verde (gate e scansioni inclusi); allora la delivery parte da sola.
Non rilanciare un bootstrap e non usare una CI rossa per provarla.

Verificare: job `admit` verde; runner selezionato con la label; download dei due
artefatti dello **stesso run**; verifica SHA/digest/policy; upload; rollout;
`status=passed`. La ricevuta root rimane in
`/opt/mercurion/releases/rollout-ID_EFFETTIVO/rollout-state.json`; le prove locali
rimangono nella cartella `runs` indicata dal file settings. I vecchi ID immagini
sono conservati per rollback, non cancellati. Nessuna pulizia automatica degli
archivi viene eseguita: pianificare la retention dopo i primi collaudi.

HTTP 200 di health e frontend non prova login, email, RPC Tox21 o correttezza
funzionale. Riprodurre almeno il login e il percorso applicativo interessato.
Il fallimento non causa retry o rollback silenziosi; disabilitare la variabile
GitHub prima della diagnosi e usare il rollback esplicito documentato nella
guida strumenti. Il recupero dei segreti e i server dati rimangono procedure
separate. Non eseguire rollout mentre il debug Nest è attivo.

## 7. Stato del collaudo

Preparazione locale: test delle condizioni di ammissione CI, path traversal
negli ZIP, rifiuto shell/SFTP/comandi, argomenti broker e confini directory FD
su Linux. Nessun runner installato, accesso cambiato o rollout eseguito sulla VM.
Il primo collaudo end-to-end e l'attivazione GitHub restano da svolgere con
l'operatore. Non chiamare questa pipeline «attiva» prima di quell'esito.
