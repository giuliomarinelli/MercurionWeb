# IP del visitatore in preview

Cloudflare passa l’IP del visitatore in `CF-Connecting-IP`. Nginx usa quell’header soltanto se il peer TCP è `cloudflared` su `mercurion_edge`, con indirizzo riservato `172.21.0.3`. Inoltra quindi l’IP del visitatore a Nest attraverso le direttive esistenti. L’access log di nginx continua a registrare l’indirizzo del peer TCP.

La rete mantiene subnet `172.21.0.0/16` e gateway `172.21.0.1`. Il pool dinamico `172.21.1.0/24` lascia libero l’indirizzo riservato. La migrazione ricrea soltanto nginx, `cloudflared` e la loro rete. Durante questo passaggio la preview pubblica è temporaneamente irraggiungibile.

## Preparazione su Windows

I sorgenti sono `deployment/local-vm/operational/nginx.conf`, `deployment/local-vm/operational/shared/compose.yaml` e `deployment/local-vm/operational/shared/cloudflared-edge.compose.yaml`. Quest’ultimo si applica dopo il Compose del connettore e ne conserva l’immagine e i parametri. I bundle precedenti conservano i propri file e checksum.

Da PowerShell nella root MercurionWeb, con Docker Desktop attivo, prepara una cartella nuova:

```powershell
$stage = Join-Path $env:USERPROFILE '.codex\artifacts\preview-edge-real-ip-20261124-v1'
if (Test-Path -LiteralPath $stage) { throw 'La cartella del candidato esiste già.' }
New-Item -ItemType Directory -Path $stage | Out-Null
Copy-Item -LiteralPath 'deployment/local-vm/operational/nginx.conf' -Destination $stage
Copy-Item -LiteralPath 'deployment/local-vm/operational/shared/cloudflared-edge.compose.yaml' -Destination $stage
Copy-Item -LiteralPath 'scripts/infrastructure/migrate_preview_edge_real_ip.py' -Destination $stage
$network = python -B -c "import sys,json; sys.path.insert(0,'scripts/infrastructure'); from preview_compose import render; print(json.dumps(render()['shared']['networks']['edge']))"
if ($LASTEXITCODE -ne 0) { throw 'Rendering della rete fallito.' }
$patch = @{
    name = 'mercurion-shared'
    services = @{ 'nginx-edge' = @{ volumes = @(@{
        type = 'bind'
        source = '/opt/mercurion/releases/preview-edge-real-ip-20261124-v1/nginx.conf'
        target = '/etc/nginx/nginx.conf'
        read_only = $true
        bind = @{ create_host_path = $false }
    }) } }
    networks = @{ edge = ($network | ConvertFrom-Json) }
}
$patch | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $stage 'edge.compose.json') -Encoding ascii
$checksums = foreach ($name in 'nginx.conf', 'cloudflared-edge.compose.yaml', 'edge.compose.json') {
    $hash = (Get-FileHash -LiteralPath (Join-Path $stage $name) -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $name"
}
[System.IO.File]::WriteAllText((Join-Path $stage 'SHA256SUMS'), (($checksums -join "`n") + "`n"), [System.Text.Encoding]::ASCII)
```

L’alias SSH `mercurion-server` usa l’utente e la chiave configurati in OpenSSH su Windows. Per un accesso temporaneo puoi caricare la chiave nell’agente con una scadenza e inserire la passphrase nel prompt di `ssh-add`:

```powershell
ssh-add -t 20m (Join-Path $env:USERPROFILE '.ssh\mercurion_ed25519')
ssh -o StrictHostKeyChecking=yes mercurion-server 'test ! -e "$HOME/preview-edge-real-ip-20261124-v1"'
if ($LASTEXITCODE -ne 0) { throw 'Directory già presente o verifica SSH fallita.' }
scp -o StrictHostKeyChecking=yes -r $stage 'mercurion-server:'
```

## Esecuzione sulla VM

Nella shell Ubuntu della VM, controlla i checksum e avvia la migrazione. Inserisci la password sudo nel terminale Ubuntu:

```bash
stage="$HOME/preview-edge-real-ip-20261124-v1"
(cd "$stage" && sha256sum -c SHA256SUMS)
(set -o pipefail; sudo python3 -I -B "$stage/migrate_preview_edge_real_ip.py" "$stage" 2>&1 | tee "$stage/result.log")
```

Prima di fermare i servizi, lo script confronta la rete effettiva con quella verificata, controlla i Compose indicati dai container attivi e accerta che le immagini siano le stesse. Conserva i Compose effettivi per il rollback nella nuova release ed esegue `nginx -t` con l’immagine già presente sulla VM. Il recupero dopo reboot con `start_preview.py` avvia i container esistenti, che conservano i nuovi mount e la configurazione di rete.

Dopo la ricreazione, lo script controlla che nginx abbia lo stesso indirizzo sulla rete di Nest, che `/health` e `/` rispondano 200 e che il nuovo connettore si registri con Cloudflare. Un errore durante il passaggio avvia il rollback con i Compose precedenti. Se fallisce anche il rollback, conserva `result.log` e i modelli nella nuova release prima di intervenire sulla VM. Per future ricreazioni manuali di nginx o `cloudflared`, usa i modelli `active-edge.compose.json` e `active.compose.json` della nuova release per conservare il mount e la riserva dell’IP.

La verifica applicativa si esegue su `https://preview.mercurion.app` con un account senza MFA configurata. Dopo il primo login, la nuova sessione deve mostrare la posizione quando GeoIP dispone dei dati. Ripeti logout e login nello stesso browser. A parità di dispositivo, fingerprint e posizione fidati, il secondo accesso conclude il login senza OTP.

Chiudi le sessioni SSH di questo intervento e rimuovi dall’agente la sola chiave caricata temporaneamente:

```powershell
ssh-add -d (Join-Path $env:USERPROFILE '.ssh\mercurion_ed25519.pub')
```
