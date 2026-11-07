#Requires -Version 5.1
<# INF-VM-02 H-04: one operator entrypoint; passphrases stay in the terminal. #>
[CmdletBinding()]
param([switch]$ValidateOnly)
$ErrorActionPreference = 'Stop'
$taskImage = 'sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79'
$taskPython = (Get-Command python.exe -CommandType Application | Select-Object -First 1).Source
$taskDocker = (Get-Command docker.exe -CommandType Application | Select-Object -First 1).Source
$taskScp = (Get-Command scp.exe -CommandType Application | Select-Object -First 1).Source
$taskSsh = (Get-Command ssh.exe -CommandType Application | Select-Object -First 1).Source
$taskAddress = @(Get-NetIPAddress -InterfaceAlias 'vEthernet (Default Switch)' -AddressFamily IPv4 |
    Where-Object { $_.AddressState -eq 'Preferred' })
if ($taskAddress.Count -ne 1) { throw 'Indirizzo Default Switch non univoco; nessuna prova avviata.' }
$taskMetadataRaw = & $taskDocker --context desktop-linux image inspect $taskImage
if ($LASTEXITCODE -ne 0) { throw 'Immagine Python verificata assente sul Docker Desktop host.' }
$taskMetadata = @($taskMetadataRaw -join "`n" | ConvertFrom-Json)[0]
if ($taskMetadata.Id -ne $taskImage -or $taskMetadata.Os -ne 'linux' -or $taskMetadata.Architecture -ne 'amd64') {
    throw 'Identita immagine inattesa.'
}
if ($ValidateOnly) { Write-Output 'Prerequisiti host validi; nessun export, listener o SSH avviato.'; return }

$taskId = [Guid]::NewGuid().ToString('N')
$taskBase = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex/artifacts/inf-vm-02'
$taskRun = Join-Path $taskBase ('h04-ipv4-' + $taskId)
$taskStage = Join-Path $taskRun ('inf-vm-02-h04-' + $taskId)
[void](New-Item -ItemType Directory -Path $taskStage)
$taskArchive = Join-Path $taskStage 'python-image.tar'
Write-Output 'Esportazione immagine Python locale; nessun download dalla VM.'
& $taskDocker --context desktop-linux image save --output $taskArchive $taskImage
if ($LASTEXITCODE -ne 0) { throw 'Export immagine fallito; nessun SSH avviato.' }
$taskArchiveHash = (Get-FileHash -LiteralPath $taskArchive -Algorithm SHA256).Hash.ToLowerInvariant()
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'network_canary.py') -Destination $taskStage
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'probe_container_isolation.py') -Destination $taskStage
Write-Output 'Trasferimento strumenti e immagine; passphrase SSH nel terminale.'
& $taskScp -o StrictHostKeyChecking=yes -r $taskStage 'mercurion-server:'
if ($LASTEXITCODE -ne 0) { throw 'SCP fallito; prova non avviata.' }

$taskCanary = $null
try {
    $taskHostRun = Join-Path $taskRun 'host'
    $taskCanaryScript = Join-Path $PSScriptRoot 'network_canary.py'
    $taskArguments = @('-B', ('"' + $taskCanaryScript + '"'), 'serve', '--bind', $taskAddress[0].IPAddress,
        '--output', ('"' + $taskHostRun + '"'), '--seconds', '600')
    $taskCanary = Start-Process -FilePath $taskPython -ArgumentList $taskArguments -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $taskRun 'host-stdout.txt') `
        -RedirectStandardError (Join-Path $taskRun 'host-stderr.txt')
    $taskReadyPath = Join-Path $taskHostRun 'ready.json'
    $taskDeadline = [DateTimeOffset]::UtcNow.AddSeconds(15)
    while (-not (Test-Path -LiteralPath $taskReadyPath)) {
        if ($taskCanary.HasExited -or [DateTimeOffset]::UtcNow -ge $taskDeadline) {
            throw 'Canary host non pronto; nessuna prova negativa eseguita.'
        }
        Start-Sleep -Milliseconds 200
    }
    $taskReady = Get-Content -Raw -LiteralPath $taskReadyPath | ConvertFrom-Json
    $taskConfig = [ordered]@{ runId = $taskId; address = $taskReady.address; port = $taskReady.port;
        nonce = $taskReady.nonce; expiresAtUtc = $taskReady.expiresAtUtc; archiveSha256 = $taskArchiveHash }
    $taskConfigPath = Join-Path $taskStage 'config.json'
    $taskConfig | ConvertTo-Json | Set-Content -LiteralPath $taskConfigPath -Encoding UTF8
    $taskRemoteDirectory = Split-Path -Leaf $taskStage
    & $taskScp -o StrictHostKeyChecking=yes $taskConfigPath ('mercurion-server:' + $taskRemoteDirectory + '/config.json')
    if ($LASTEXITCODE -ne 0) { throw 'Trasferimento config fallito; nessuna prova negativa eseguita.' }
    Write-Output 'Avvio su Ubuntu: passphrase SSH e, se richiesta, password sudo nel terminale.'
    $taskCommand = 'sudo python3 ~/' + $taskRemoteDirectory + '/probe_container_isolation.py --directory ~/' + $taskRemoteDirectory
    & $taskSsh -t -o StrictHostKeyChecking=yes mercurion-server $taskCommand |
        Tee-Object -FilePath (Join-Path $taskRun 'guest-terminal.txt') -Variable taskLines
    $taskSshExit = $LASTEXITCODE
    $taskResultLines = @($taskLines | Where-Object { $_ -match '^INF_VM_02_H04_RESULT ' })
    if ($taskResultLines.Count -ne 1) { throw 'Report guest assente o ambiguo; vedere guest-terminal.txt.' }
    $taskReport = ($taskResultLines[0] -replace '^INF_VM_02_H04_RESULT ', '') | ConvertFrom-Json
    if ($taskReport.runId -ne $taskId) { throw 'Report non appartenente alla prova corrente.' }
    $taskReport | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $taskRun 'container-probe.json') -Encoding UTF8
    if ($taskSshExit -ne 0) { throw 'Prova guest da revisionare; report conservato, nessun isolamento dichiarato.' }
    Write-Output ('Report salvato in ' + $taskRun + '; da correlare con i controlli host.')
}
finally {
    if ($taskCanary) {
        if (Test-Path -LiteralPath $taskHostRun) {
            [void](New-Item -ItemType File -Path (Join-Path $taskHostRun 'stop') -Force)
        }
        if (-not $taskCanary.WaitForExit(15000)) {
            Stop-Process -Id $taskCanary.Id
            Write-Warning 'Canary terminato forzatamente: controllo finale non garantito, prova non accettabile.'
        }
    }
}
