#Requires -Version 5.1
<# H-02 IPv4 on Mercurion-Internal only. SCP and SSH remain separate native invocations. #>
[CmdletBinding()]
param([switch]$ValidateOnly)
$ErrorActionPreference = 'Stop'

$taskBase = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex/artifacts/inf-vm-02'
$taskRun = Get-ChildItem -LiteralPath $taskBase -Directory -Filter 'h02-ipv4-*' |
    Where-Object {
        (Test-Path -LiteralPath (Join-Path $_.FullName 'ready.json')) -and
        -not (Test-Path -LiteralPath (Join-Path $_.FullName 'result.json'))
    } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $taskRun) { throw 'Nessuna prova attiva. Non eseguire SCP/SSH con dati scaduti.' }
$taskReady = Get-Content -Raw -LiteralPath (Join-Path $taskRun.FullName 'ready.json') | ConvertFrom-Json
if ([DateTimeOffset]::Parse($taskReady.expiresAtUtc) -le [DateTimeOffset]::UtcNow.AddSeconds(30)) {
    throw 'La finestra di prova sta scadendo. Nessuna connessione avviata.'
}
if ($taskReady.nonce -notmatch '^[a-f0-9]{32}$' -or $taskReady.port -lt 1024 -or $taskReady.port -gt 65535) {
    throw 'Dati canary non validi. Nessuna connessione avviata.'
}
if ($taskReady.address -cne '10.203.240.1') {
    throw 'Il canary non appartiene alla rete statica Mercurion; nessun SCP/SSH avviato.'
}
$taskHostAddress = @(Get-NetIPAddress -InterfaceAlias 'vEthernet (Mercurion-Internal)' -AddressFamily IPv4 -ErrorAction Stop |
    Where-Object { $_.IPAddress -eq $taskReady.address -and $_.PrefixLength -eq 24 -and [string]$_.AddressState -eq 'Preferred' })
if ($taskHostAddress.Count -ne 1) { throw 'Bersaglio Mercurion-Internal assente, ambiguo o non Preferred; nessun SCP/SSH avviato.' }
$taskSource = Join-Path $PSScriptRoot 'network_canary.py'
if (-not (Test-Path -LiteralPath $taskSource)) { throw 'Script probe locale mancante.' }
if ($ValidateOnly) {
    Write-Output 'Readiness valida; nessun SCP/SSH eseguito.'
    return
}

$taskScp = (Get-Command scp.exe -CommandType Application | Select-Object -First 1).Source
$taskSsh = (Get-Command ssh.exe -CommandType Application | Select-Object -First 1).Source
& $taskScp -o StrictHostKeyChecking=yes $taskSource 'mercurion-server:inf-vm-02-canary.py'
if ($LASTEXITCODE -ne 0) { throw 'SCP non riuscito: SSH non avviato.' }
$taskRemoteCommand = "python3 ~/inf-vm-02-canary.py probe --host $($taskReady.address) --port $($taskReady.port) --nonce $($taskReady.nonce)"
$taskResult = & $taskSsh -o StrictHostKeyChecking=yes mercurion-server $taskRemoteCommand
if ($LASTEXITCODE -ne 0) { throw 'Probe SSH non riuscito: nessun test di isolamento dichiarato passato.' }
$taskParsed = ($taskResult -join "`n") | ConvertFrom-Json
if ($taskParsed.nonce -ne $taskReady.nonce -or $taskParsed.port -ne $taskReady.port -or $taskParsed.address -ne $taskReady.address) {
    throw 'Il risultato non appartiene alla prova corrente.'
}
$taskParsed | ConvertTo-Json -Depth 5 |
    Set-Content -Encoding UTF8 -LiteralPath (Join-Path $taskRun.FullName 'guest-probe.json')
$taskParsed | ConvertTo-Json -Depth 5
