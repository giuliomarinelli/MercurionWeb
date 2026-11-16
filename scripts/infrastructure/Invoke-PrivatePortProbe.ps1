#Requires -Version 5.1
<# One operator command; no image pull, policy changes or password capture. #>
[CmdletBinding()]
param([switch]$ValidateOnly,
    [string]$ArtifactRoot=(Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex/artifacts/inf-vm-02'))
$ErrorActionPreference='Stop'
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskScp=(Get-Command scp.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskSsh=(Get-Command ssh.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskSource=Join-Path $PSScriptRoot 'private_port_probe.py'
if (-not (Test-Path -LiteralPath $taskSource)) { throw 'Probe Python mancante.' }
$taskHostAddress=@(Get-NetIPAddress -InterfaceAlias 'vEthernet (Mercurion-Internal)' -AddressFamily IPv4 -ErrorAction Stop |
    Where-Object { $_.IPAddress -eq '10.203.240.1' -and $_.PrefixLength -eq 24 -and [string]$_.AddressState -eq 'Preferred' })
$taskDnsAddress=@(Get-NetIPAddress -InterfaceAlias 'vEthernet (Default Switch)' -AddressFamily IPv4 -ErrorAction Stop |
    Where-Object { [string]$_.AddressState -eq 'Preferred' })
if ($taskHostAddress.Count -ne 1 -or $taskDnsAddress.Count -ne 1) { throw 'Indirizzi host non univoci: nessuna prova avviata.' }
if ($ValidateOnly) {
    & $taskPython -B $taskSource host-preflight --dns-address $taskDnsAddress[0].IPAddress
    if ($LASTEXITCODE -ne 0) { throw 'Controlli positivi host non riusciti; nessuna prova guest avviata.' }
    Write-Output 'Preflight locale passato; nessun SSH, container o modifica rete.'
    return
}
$taskId=[Guid]::NewGuid().ToString('N')
$taskRun=Join-Path $ArtifactRoot ('private-ports-ipv4-'+$taskId)
$taskStage=Join-Path $taskRun ('inf-vm-02-private-'+$taskId)
[void](New-Item -ItemType Directory -Path $taskStage)
Copy-Item -LiteralPath $taskSource -Destination $taskStage
$taskHostRun=Join-Path $taskRun 'host'
$taskCanary=$null
try {
    $taskArguments=@('-B',('"'+$taskSource+'"'),'serve-host','--directory',('"'+$taskHostRun+'"'),
        '--run-id',$taskId,'--dns-address',$taskDnsAddress[0].IPAddress)
    $taskCanary=Start-Process -FilePath $taskPython -ArgumentList $taskArguments -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $taskRun 'host-stdout.txt') `
        -RedirectStandardError (Join-Path $taskRun 'host-stderr.txt')
    $taskReadyPath=Join-Path $taskHostRun 'ready.json'
    $taskDeadline=[DateTimeOffset]::UtcNow.AddSeconds(15)
    while (-not (Test-Path -LiteralPath $taskReadyPath)) {
        if ($taskCanary.HasExited -or [DateTimeOffset]::UtcNow -ge $taskDeadline) { throw 'Controlli host non pronti; consultare host/result.json. Nessun SSH avviato.' }
        Start-Sleep -Milliseconds 200
    }
    Copy-Item -LiteralPath $taskReadyPath -Destination (Join-Path $taskStage 'config.json')
    Write-Output 'Canary privati pronti. Passphrase SSH e sudo solo nel terminale; nessun download immagini.'
    & $taskScp -o StrictHostKeyChecking=yes -r $taskStage 'mercurion-server:'
    if ($LASTEXITCODE -ne 0) { throw 'SCP fallito: nessuna prova guest avviata.' }
    $taskRemote=Split-Path -Leaf $taskStage
    $taskCommand='sudo python3 ~/'+$taskRemote+'/private_port_probe.py run-guest --directory ~/'+$taskRemote
    # Direct console output: do not buffer PTY password prompts through Tee-Object.
    & $taskSsh -t -o StrictHostKeyChecking=yes mercurion-server $taskCommand
    $taskSshExit=$LASTEXITCODE
    & $taskScp -o StrictHostKeyChecking=yes ('mercurion-server:'+ $taskRemote+'/private-port-probe.json') (Join-Path $taskRun 'private-port-probe.json')
    if ($LASTEXITCODE -ne 0) { throw 'Report guest non recuperato; conservare il run, nessun retry automatico.' }
    $taskReport=Get-Content -Raw -LiteralPath (Join-Path $taskRun 'private-port-probe.json') | ConvertFrom-Json -ErrorAction Stop
    if ($taskReport.runId -ne $taskId) { throw 'Report non appartenente al run corrente.' }
    if ($taskSshExit -ne 0) { throw 'Esecuzione guest da revisionare; report conservato.' }
}
finally {
    if ($taskCanary) {
        if (Test-Path -LiteralPath $taskHostRun) { [IO.File]::WriteAllText((Join-Path $taskHostRun 'stop'),'') }
        if (-not $taskCanary.WaitForExit(15000)) {
            Stop-Process -Id $taskCanary.Id
            Write-Warning 'Canary interrotto: controlli finali non garantiti, prova non accettabile.'
        }
    }
}
& $taskPython -B $taskSource correlate --directory $taskRun
if ($LASTEXITCODE -ne 0) { throw 'Correlazione non riuscita: nessuna accettazione del test.' }
Write-Output ('Report e correlazione salvati in '+$taskRun)
