#Requires -Version 5.1
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$BundlePath,[switch]$BuildIndex,[switch]$Status,[switch]$Resume,[switch]$Execute)
$ErrorActionPreference='Stop'
if (-not $Execute -and -not $Status) { throw 'Specificare -Execute per il trasferimento/import oppure -Status per la sola lettura.' }
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskMode=if ($BuildIndex) {'index'} else {'import'}
$taskArguments=@('-B',(Join-Path $PSScriptRoot 'preview_embedding_import.py'),'execute','--root',$BundlePath,'--mode',$taskMode)
if ($Status) { $taskArguments+='--status' }
if ($Resume) { $taskArguments+='--resume' }
& $taskPython @taskArguments
if ($LASTEXITCODE -ne 0) { throw 'Import embedding non completato: conservare runId e ricevuta. Non cancellare dati o journal.' }
