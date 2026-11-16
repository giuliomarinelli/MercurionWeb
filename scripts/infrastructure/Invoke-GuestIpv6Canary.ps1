#Requires -Version 5.1
<# H-02 IPv6 link-local; one operator entrypoint, no sudo or Docker. #>
[CmdletBinding()]
param([switch]$ValidateOnly)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ContainerCanaryReport.ps1')
$taskPython = (Get-Command python.exe -CommandType Application | Select-Object -First 1).Source
$taskScp = (Get-Command scp.exe -CommandType Application | Select-Object -First 1).Source
$taskSsh = (Get-Command ssh.exe -CommandType Application | Select-Object -First 1).Source
$taskAddress = @(Get-NetIPAddress -InterfaceAlias 'vEthernet (Default Switch)' -AddressFamily IPv6 |
    Where-Object { $_.AddressState -eq 'Preferred' -and $_.IPAddress -like 'fe80:*' })
if ($taskAddress.Count -ne 1) { throw 'IPv6 link-local Default Switch non univoco; nessuna prova avviata.' }
$taskBareAddress = ($taskAddress[0].IPAddress -split '%')[0]
$taskScopedAddress = $taskBareAddress + '%' + $taskAddress[0].InterfaceIndex
foreach ($taskSource in @('network_canary.py', 'probe_guest_ipv6.py')) {
    if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot $taskSource))) { throw 'Sorgente probe mancante.' }
}
if ($ValidateOnly) { Write-Output 'Prerequisiti host IPv6 validi; nessun listener o SSH avviato.'; return }
$taskId = [Guid]::NewGuid().ToString('N')
$taskBase = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex/artifacts/inf-vm-02'
$taskRun = Join-Path $taskBase ('h02-ipv6-' + $taskId)
$taskRemoteDirectory = 'inf-vm-02-h02-ipv6-' + $taskId
$taskStage = Join-Path $taskRun $taskRemoteDirectory
[void](New-Item -ItemType Directory -Path $taskStage)
foreach ($taskSource in @('network_canary.py', 'probe_guest_ipv6.py')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $taskSource) -Destination $taskStage
}
$taskCanary = $null
try {
    $taskHostRun = Join-Path $taskRun 'host'
    $taskCanaryScript = Join-Path $PSScriptRoot 'network_canary.py'
    $taskArguments = @('-B', ('"' + $taskCanaryScript + '"'), 'serve', '--bind', $taskScopedAddress,
        '--output', ('"' + $taskHostRun + '"'), '--seconds', '600')
    $taskCanary = Start-Process -FilePath $taskPython -ArgumentList $taskArguments -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $taskRun 'host-stdout.txt') `
        -RedirectStandardError (Join-Path $taskRun 'host-stderr.txt')
    $taskReadyPath = Join-Path $taskHostRun 'ready.json'
    $taskDeadline = [DateTimeOffset]::UtcNow.AddSeconds(15)
    while (-not (Test-Path -LiteralPath $taskReadyPath)) {
        if ($taskCanary.HasExited -or [DateTimeOffset]::UtcNow -ge $taskDeadline) { throw 'Canary IPv6 host non pronto.' }
        Start-Sleep -Milliseconds 200
    }
    $taskReady = Get-Content -Raw -LiteralPath $taskReadyPath | ConvertFrom-Json
    $taskConfig = [ordered]@{ runId = $taskId; address = $taskBareAddress; port = $taskReady.port;
        nonce = $taskReady.nonce; expiresAtUtc = $taskReady.expiresAtUtc }
    $taskConfig | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $taskStage 'config.json')
    Write-Output 'Canary IPv6 host attivo. Trasferimento probe; passphrase SSH solo nel terminale.'
    & $taskScp -o StrictHostKeyChecking=yes -r $taskStage 'mercurion-server:'
    if ($LASTEXITCODE -ne 0) { throw 'SCP fallito; nessun probe guest eseguito.' }
    Write-Output 'Probe IPv6 guest senza sudo; interfaccia rilevata automaticamente.'
    $taskCommand = 'python3 ~/' + $taskRemoteDirectory + '/probe_guest_ipv6.py --config ~/' + $taskRemoteDirectory + '/config.json'
    & $taskSsh -o StrictHostKeyChecking=yes mercurion-server $taskCommand |
        Tee-Object -FilePath (Join-Path $taskRun 'guest-terminal.txt') |
        Tee-Object -Variable taskLines
    $taskExit = $LASTEXITCODE
    $taskReport = Read-ContainerCanaryReport -Lines $taskLines -RunId $taskId -Marker 'INF_VM_02_H02_IPV6_RESULT '
    $taskReport | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $taskRun 'guest-ipv6-probe.json')
    if ($taskExit -ne 0) { throw 'Esito IPv6 da revisionare; report conservato, nessun isolamento dichiarato.' }
    Write-Output ('Report salvato in ' + $taskRun + '; da correlare con i controlli host.')
}
finally {
    if ($taskCanary) {
        if (Test-Path -LiteralPath $taskHostRun) { [void](New-Item -ItemType File -Path (Join-Path $taskHostRun 'stop') -Force) }
        if (-not $taskCanary.WaitForExit(15000)) {
            Stop-Process -Id $taskCanary.Id
            Write-Warning 'Chiusura forzata: controllo finale non garantito, prova non accettabile.'
        }
    }
}
