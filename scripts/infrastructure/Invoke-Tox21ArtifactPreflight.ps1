#Requires -Version 5.1
<# Transfer only metadata and a read-only probe. Never transfer/load image or start services. #>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$BundlePath, [switch]$Execute)
$ErrorActionPreference='Stop'
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskTool=Join-Path $PSScriptRoot 'prepare_tox21_transport.py'
& $taskPython -B $taskTool validate --bundle $BundlePath
if ($LASTEXITCODE -ne 0) { throw 'Bundle non valido; nessun SSH avviato.' }
$taskRequest=Get-Content -Raw -LiteralPath (Join-Path $BundlePath 'preflight/request.json') | ConvertFrom-Json
if ($taskRequest.runId -notmatch '^[a-f0-9]{32}$') { throw 'Run ID non valido.' }
if (-not $Execute) { Write-Output 'Bundle verificato. Per le sole letture guest usare -Execute.'; return }
$taskSsh=(Get-Command ssh.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskScp=(Get-Command scp.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskReport=Join-Path (Split-Path -Parent $BundlePath) ('vm040-preflight-'+$taskRequest.runId+'.json')
if (Test-Path -LiteralPath $taskReport) { throw 'Report locale esistente; nessun retry automatico.' }
$taskRemote='vm040-preflight-'+[Guid]::NewGuid().ToString('N')
Write-Output 'Preflight guest: solo script e metadati, nessuna immagine. Passphrase e sudo nel terminale.'
& $taskScp -o StrictHostKeyChecking=yes -r (Join-Path $BundlePath 'preflight') ('mercurion-server:'+$taskRemote)
if ($LASTEXITCODE -ne 0) { throw 'Trasferimento probe fallito; nessun retry automatico.' }
& $taskSsh -t -o StrictHostKeyChecking=yes mercurion-server ('sudo python3 -I -B ~/'+$taskRemote+'/guest_artifact_preflight.py --request ~/'+$taskRemote+'/request.json --output ~/'+$taskRemote+'/result.json')
$taskExit=$LASTEXITCODE
& $taskScp -o StrictHostKeyChecking=yes ('mercurion-server:'+$taskRemote+'/result.json') $taskReport
if ($LASTEXITCODE -ne 0) { throw 'Report non recuperato; conservare output senza rilanciare.' }
$taskResult=Get-Content -Raw -LiteralPath $taskReport | ConvertFrom-Json
if ($taskResult.runId -ne $taskRequest.runId -or
    ($taskResult.request | ConvertTo-Json -Depth 5 -Compress) -ne ($taskRequest | ConvertTo-Json -Depth 5 -Compress)) { throw 'Identita report guest differente dal bundle.' }
[ordered]@{runId=$taskResult.runId;status=$taskResult.status;readyForArtifactTransfer=$taskResult.readyForArtifactTransfer;
    reportPath=$taskReport;imageLoaded=$false;servicesStarted=$false;isolationAccepted=$false} | ConvertTo-Json
if ($taskExit -ne 0 -or $taskResult.readyForArtifactTransfer -ne $true) { throw 'Preflight bloccato; vedere report, nessun caricamento immagine.' }
