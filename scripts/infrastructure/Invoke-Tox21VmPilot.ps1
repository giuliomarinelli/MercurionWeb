#Requires -Version 5.1
<# Explicit archive transfer/load and isolated synthetic-credential RPC pilot. #>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$PilotPath, [switch]$Execute)
$ErrorActionPreference='Stop'
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
& $taskPython -B (Join-Path $PSScriptRoot 'run_tox21_vm_pilot.py') verify --root $PilotPath
if ($LASTEXITCODE -ne 0) { throw 'Pilot non valido: nessun trasferimento.' }
if (-not $Execute) { Write-Output 'Pilot verificato; per trasferimento/load/RPC usare -Execute.'; return }
$taskRequest=Get-Content -Raw -LiteralPath (Join-Path $PilotPath 'pilot.json') | ConvertFrom-Json
if ($taskRequest.runId -notmatch '^[a-f0-9]{32}$') { throw 'Run ID non valido.' }
$taskReport=Join-Path (Split-Path -Parent $PilotPath) ('vm041-result-'+$taskRequest.runId+'.json')
if (Test-Path -LiteralPath $taskReport) { throw 'Report esistente; nessun retry automatico.' }
$taskSsh=(Get-Command ssh.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskScp=(Get-Command scp.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskRemote='vm041-pilot-'+$taskRequest.runId
Write-Output 'Trasferimento immagini verificate e prova RPC isolata; passphrase SSH e sudo nel terminale.'
& $taskScp -o StrictHostKeyChecking=yes -r $PilotPath ('mercurion-server:'+$taskRemote)
if ($LASTEXITCODE -ne 0) { throw 'Trasferimento fallito; nessun retry automatico.' }
& $taskSsh -t -o StrictHostKeyChecking=yes mercurion-server ('sudo python3 -B ~/'+$taskRemote+'/scripts/infrastructure/run_tox21_vm_pilot.py execute --root ~/'+$taskRemote+' --report ~/'+$taskRemote+'/pilot-result.json')
$taskExit=$LASTEXITCODE
& $taskScp -o StrictHostKeyChecking=yes ('mercurion-server:'+$taskRemote+'/pilot-result.json') $taskReport
if ($LASTEXITCODE -ne 0) { throw "Report non recuperato; conservare output. Scaricare soltanto $taskRemote/pilot-result.json con SCP, senza rilanciare Execute." }
$taskResult=Get-Content -Raw -LiteralPath $taskReport | ConvertFrom-Json
if ($taskResult.runId -ne $taskRequest.runId) { throw 'Identita report diversa dal pilot.' }
[ordered]@{runId=$taskResult.runId;status=$taskResult.status;phase=$taskResult.phase;reportPath=$taskReport;
    realServicesStarted=$taskResult.realServicesStarted;publishedPorts=$false;isolationAccepted=$false} | ConvertTo-Json
if ($taskExit -ne 0 -or $taskResult.status -ne 'passed') { throw 'Pilot non completato; vedere report, nessun retry automatico.' }
