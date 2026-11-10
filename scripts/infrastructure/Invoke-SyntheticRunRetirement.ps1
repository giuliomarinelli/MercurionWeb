#Requires -Version 5.1
<# Completed synthetic preview receipt required; default is host plan only. #>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-f0-9]{32}$')][string]$RunId,
    [switch]$Execute
)
$ErrorActionPreference='Stop'
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskScript=Join-Path $PSScriptRoot 'synthetic_run_retirement.py'
$taskArguments=@('-B',$taskScript,'--run-id',$RunId)
if ($Execute) { $taskArguments+='--execute' }
& $taskPython @taskArguments
if ($LASTEXITCODE -ne 0) { throw 'Riconciliazione/rimozione non completata; conservare run e ultima fase, nessun retry automatico.' }
