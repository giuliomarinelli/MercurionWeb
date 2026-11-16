#Requires -Version 5.1
<# Fresh synthetic run only; default plan performs no SSH or credential writes. #>
[CmdletBinding()]
param([switch]$Execute)
$ErrorActionPreference='Stop'
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskScript=Join-Path $PSScriptRoot 'synthetic_consumer_host.py'
$taskArguments=@('-B',$taskScript)
if ($Execute) { $taskArguments+='--execute' }
& $taskPython @taskArguments
if ($LASTEXITCODE -ne 0) { throw 'Collaudo consumer non completato; conservare run/report, nessun retry automatico.' }
