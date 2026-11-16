#Requires -Version 5.1
<# H-06: no host listener, image transfer, registry pull or firewall changes. #>
[CmdletBinding()]
param([switch]$ValidateOnly)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ContainerCanaryReport.ps1')
$taskScp = (Get-Command scp.exe -CommandType Application | Select-Object -First 1).Source
$taskSsh = (Get-Command ssh.exe -CommandType Application | Select-Object -First 1).Source
$taskSource = Join-Path $PSScriptRoot 'probe_egress.py'
if (-not (Test-Path -LiteralPath $taskSource)) { throw 'Probe Python mancante.' }
if ($ValidateOnly) { Write-Output 'Prerequisiti locali validi; nessun SCP/SSH avviato.'; return }
$taskId = [Guid]::NewGuid().ToString('N')
$taskBase = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex/artifacts/inf-vm-02'
$taskRun = Join-Path $taskBase ('h06-ipv4-' + $taskId)
$taskRemoteDirectory = 'inf-vm-02-h06-' + $taskId
$taskStage = Join-Path $taskRun $taskRemoteDirectory
[void](New-Item -ItemType Directory -Path $taskStage)
Copy-Item -LiteralPath $taskSource -Destination $taskStage
Write-Output 'Trasferimento del solo probe; immagine Python gia presente sulla VM.'
& $taskScp -o StrictHostKeyChecking=yes -r $taskStage 'mercurion-server:'
if ($LASTEXITCODE -ne 0) { throw 'SCP fallito; nessuna prova avviata.' }
Write-Output 'Prova DNS/HTTPS IPv4: passphrase SSH e password sudo solo nel terminale.'
$taskCommand = 'sudo python3 ~/' + $taskRemoteDirectory + '/probe_egress.py run --run-id ' + $taskId
& $taskSsh -t -o StrictHostKeyChecking=yes mercurion-server $taskCommand |
    Tee-Object -FilePath (Join-Path $taskRun 'guest-terminal.txt') |
    Tee-Object -Variable taskLines
$taskExit = $LASTEXITCODE
$taskReport = Read-ContainerCanaryReport -Lines $taskLines -RunId $taskId -Marker 'INF_VM_02_H06_RESULT '
$taskReport | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $taskRun 'egress-probe.json')
if ($taskExit -ne 0) { throw 'Esito da revisionare; report conservato, nessuna prova dichiarata passata.' }
Write-Output ('Report salvato in ' + $taskRun)
