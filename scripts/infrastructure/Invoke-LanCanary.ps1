#Requires -Version 5.1
<# Controlled Android endpoint; no image transfer, published ports or policy changes. #>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ConfigPath, [switch]$ValidateOnly)
$ErrorActionPreference='Stop'
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskScp=(Get-Command scp.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskSsh=(Get-Command ssh.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskSource=Join-Path $PSScriptRoot 'lan_canary_probe.py'
$taskInput=(Resolve-Path -LiteralPath $ConfigPath -ErrorAction Stop).Path
if ((Split-Path -Leaf $taskInput) -cne 'config.json') { throw 'Expected a dedicated config.json file.' }
$taskConfig=Get-Content -Raw -LiteralPath $taskInput | ConvertFrom-Json -ErrorAction Stop
& $taskPython -B $taskSource validate --directory (Split-Path -Parent $taskInput)
if ($LASTEXITCODE -ne 0) { throw 'Configurazione LAN non valida: nessun SSH avviato.' }
$taskWifi=@(Get-NetIPAddress -InterfaceAlias 'Wi-Fi' -AddressFamily IPv4 -ErrorAction Stop |
    Where-Object { [string]$_.AddressState -eq 'Preferred' })
if ($taskWifi.Count -ne 1 -or $taskWifi[0].PrefixLength -ne 24) { throw 'Baseline Wi-Fi /24 non univoca: review richiesta.' }
$taskPhone=[Net.IPAddress]::Parse($taskConfig.address).GetAddressBytes()
$taskHost=[Net.IPAddress]::Parse($taskWifi[0].IPAddress).GetAddressBytes()
if ($taskPhone.Length -ne 4 -or ($taskPhone[0..2] -join '.') -ne ($taskHost[0..2] -join '.') -or
    $taskPhone[3] -eq $taskHost[3] -or $taskPhone[3] -in @(0,255)) { throw 'Telefono non identificato come peer della LAN Wi-Fi corrente.' }
$taskRemaining=([DateTimeOffset]::Parse($taskConfig.expiresAtUtc)-[DateTimeOffset]::UtcNow).TotalSeconds
if ($taskRemaining -lt 90) { throw 'Finestra telefono insufficiente: nessun SSH avviato.' }
if ($ValidateOnly) { Write-Output 'Preflight LAN passato; nessun monitor, SCP, SSH o container avviato.'; return }
$taskBase=Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex/artifacts/inf-vm-02'
$taskRun=Join-Path $taskBase ('lan-ipv4-'+$taskConfig.runId)
if (Test-Path -LiteralPath $taskRun) { throw 'Run gia presente: nessuna sovrascrittura o ripetizione automatica.' }
$taskStage=Join-Path $taskRun ('inf-vm-02-lan-'+$taskConfig.runId)
[void][IO.Directory]::CreateDirectory($taskStage)
Copy-Item -LiteralPath $taskInput -Destination (Join-Path $taskStage 'config.json')
$taskHashes=foreach ($taskName in @('lan_canary_probe.py','network_canary.py','probe_container_isolation.py')) {
    $taskFile=Join-Path $PSScriptRoot $taskName
    Copy-Item -LiteralPath $taskFile -Destination $taskStage
    [ordered]@{file=$taskName;sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $taskFile).Hash.ToLowerInvariant()}
}
$taskHashes | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskRun 'source-hashes.json') -Encoding UTF8
$taskMonitor=$null
try {
    $taskArguments=@('-B',('"'+$taskSource+'"'),'watch','--directory',('"'+$taskStage+'"'))
    $taskMonitor=Start-Process -FilePath $taskPython -ArgumentList $taskArguments -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $taskRun 'monitor-stdout.txt') `
        -RedirectStandardError (Join-Path $taskRun 'monitor-stderr.txt')
    $taskReady=Join-Path $taskStage 'lan-ready.json'
    $taskDeadline=[DateTimeOffset]::UtcNow.AddSeconds(15)
    while (-not (Test-Path -LiteralPath $taskReady)) {
        if ($taskMonitor.HasExited -or [DateTimeOffset]::UtcNow -ge $taskDeadline) {
            throw 'Controllo positivo Windows verso Android non pronto: nessuna prova guest avviata.'
        }
        Start-Sleep -Milliseconds 200
    }
    Write-Output 'Controllo Windows verso Android positivo. Passphrase SSH e sudo solo nel terminale.'
    & $taskScp -o StrictHostKeyChecking=yes -r $taskStage 'mercurion-server:'
    if ($LASTEXITCODE -ne 0) { throw 'SCP fallito: nessuna prova guest avviata.' }
    $taskRemote=Split-Path -Leaf $taskStage
    & $taskSsh -t -o StrictHostKeyChecking=yes mercurion-server ('sudo python3 ~/'+$taskRemote+'/lan_canary_probe.py guest --directory ~/'+$taskRemote)
    $taskGuestExit=$LASTEXITCODE
    & $taskScp -o StrictHostKeyChecking=yes ('mercurion-server:'+$taskRemote+'/lan-guest.json') (Join-Path $taskStage 'lan-guest.json')
    if ($LASTEXITCODE -ne 0) { throw 'Report guest non recuperato: conservare il run.' }
    if ($taskGuestExit -ne 0) { throw 'Prova guest da revisionare: report conservato, nessuna accettazione.' }
}
finally {
    if ($taskMonitor) {
        [IO.File]::WriteAllText((Join-Path $taskStage 'lan-stop'),'')
        if (-not $taskMonitor.WaitForExit(15000)) {
            Stop-Process -Id $taskMonitor.Id
            Write-Warning 'Monitor interrotto: controlli finali non garantiti, prova non accettabile.'
        }
    }
}
& $taskPython -B $taskSource correlate --directory $taskStage
if ($LASTEXITCODE -ne 0) { throw 'Correlazione LAN non riuscita; nessuna accettazione del test.' }
Write-Output ('Report e correlazione LAN salvati in '+$taskRun)
