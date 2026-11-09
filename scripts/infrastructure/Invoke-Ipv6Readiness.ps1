#Requires -Version 5.1
<# Guest configuration reads only. Direct SSH prompts, report fetched separately. #>
[CmdletBinding()]
param([switch]$ValidateOnly)
$ErrorActionPreference='Stop'
$taskScp=(Get-Command scp.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskSsh=(Get-Command ssh.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskSource=Join-Path $PSScriptRoot 'inspect_guest_ipv6.py'
if (-not (Test-Path -LiteralPath $taskSource)) { throw 'Inventario IPv6 mancante.' }
if ($ValidateOnly) { Write-Output 'Prerequisiti locali validi; nessun SSH o comando guest eseguito.'; return }
$taskId=[Guid]::NewGuid().ToString('N')
$taskBase=Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex/artifacts/inf-vm-02'
$taskRoot=Join-Path $taskBase ('ipv6-readiness-'+$taskId)
[void][IO.Directory]::CreateDirectory($taskRoot)
Copy-Item -LiteralPath $taskSource -Destination (Join-Path $taskRoot 'inspect_guest_ipv6.py')
Get-FileHash -Algorithm SHA256 -LiteralPath $taskSource | Select-Object Algorithm,Hash |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskRoot 'source-hash.json') -Encoding UTF8
$taskRemote='inf-vm-02-ipv6-'+$taskId
Write-Output 'Letture IPv6 e bridge Docker; passphrase SSH e sudo solo nel terminale.'
& $taskScp -o StrictHostKeyChecking=yes $taskSource ('mercurion-server:'+$taskRemote+'.py')
if ($LASTEXITCODE -ne 0) { throw 'SCP fallito; nessuna lettura guest avviata.' }
& $taskSsh -t -o StrictHostKeyChecking=yes mercurion-server ('sudo python3 ~/'+$taskRemote+'.py --output ~/'+$taskRemote+'.json')
$taskGuestExit=$LASTEXITCODE
& $taskScp -o StrictHostKeyChecking=yes ('mercurion-server:'+$taskRemote+'.json') (Join-Path $taskRoot 'ipv6-readiness.json')
if ($LASTEXITCODE -ne 0) { throw 'Report non recuperato; nessuna prova dichiarata riuscita.' }
$taskReport=Get-Content -Raw -LiteralPath (Join-Path $taskRoot 'ipv6-readiness.json') | ConvertFrom-Json
[ordered]@{reportPath=(Join-Path $taskRoot 'ipv6-readiness.json');incomplete=$taskReport.incomplete;isolationAccepted=$false} | ConvertTo-Json
if ($taskGuestExit -ne 0 -or $taskReport.incomplete) { throw 'Inventario incompleto: conservare il report, nessun retry automatico.' }
