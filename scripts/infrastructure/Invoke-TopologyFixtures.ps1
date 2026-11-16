#Requires -Version 5.1
<# Explicit synthetic fixture execution only. No credentials, image pulls or published ports. #>
[CmdletBinding()]
param([switch]$Execute, [switch]$ValidateOnly)
$ErrorActionPreference='Stop'
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskScp=(Get-Command scp.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskSsh=(Get-Command ssh.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskSource=Join-Path $PSScriptRoot 'run_vm_fixture_lifecycle.py'
if (-not (Test-Path -LiteralPath $taskSource)) { throw 'Lifecycle fixture mancante.' }
if ($Execute -and $ValidateOnly) { throw 'Execute e ValidateOnly sono alternativi.' }
if ($ValidateOnly -or -not $Execute) { Write-Output 'Solo preflight locale: sorgente e trasporti presenti. Nessun SSH o runtime avviato; esecuzione richiede -Execute.'; return }
$taskId=[Guid]::NewGuid().ToString('N')
$taskBase=Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex/artifacts/inf-vm-03'
$taskRoot=Join-Path $taskBase $taskId
[void][IO.Directory]::CreateDirectory($taskRoot)
$taskBundle=Join-Path $taskRoot ('inf-vm-03-fixtures-'+$taskId)
& $taskPython -B $taskSource prepare --directory $taskBundle
if ($LASTEXITCODE -ne 0) { throw 'Bundle non preparato: nessun trasferimento o avvio VM.' }
Write-Output 'Bundle fixture verificato. Passphrase SSH e sudo solo nel terminale; nessun segreto o immagine trasferiti.'
& $taskScp -o StrictHostKeyChecking=yes -r $taskBundle 'mercurion-server:'
if ($LASTEXITCODE -ne 0) { throw 'Trasferimento fallito: nessuna fixture avviata.' }
$taskRemote=Split-Path -Leaf $taskBundle
$taskRemoteReport=$taskRemote+'-report.json'
& $taskSsh -t -o StrictHostKeyChecking=yes mercurion-server ('sudo python3 ~/'+$taskRemote+'/scripts/infrastructure/run_vm_fixture_lifecycle.py execute --report ~/'+$taskRemoteReport)
$taskGuestExit=$LASTEXITCODE
& $taskScp -o StrictHostKeyChecking=yes ('mercurion-server:'+$taskRemoteReport) (Join-Path $taskRoot 'fixture-run.json')
if ($LASTEXITCODE -ne 0) { throw 'Report non recuperato: conservare il bundle, nessun retry automatico.' }
$taskReport=Get-Content -Raw -LiteralPath (Join-Path $taskRoot 'fixture-run.json') | ConvertFrom-Json
$taskCaseCount=if ($null -ne $taskReport.matrix) { @($taskReport.matrix.cases).Count } else { 0 }
[ordered]@{runId=$taskReport.runId;status=$taskReport.status;caseCount=$taskCaseCount;
    cleanupErrors=@($taskReport.cleanupErrors).Count;reportPath=(Join-Path $taskRoot 'fixture-run.json');isolationAccepted=$false} | ConvertTo-Json
if ($taskGuestExit -ne 0 -or $taskReport.status -ne 'passed') { throw 'Collaudo da revisionare: report conservato, nessun retry automatico.' }
