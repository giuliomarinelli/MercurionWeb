#Requires -Version 5.1
<# Adopt verified servers on separate volumes, retaining the original generation for rollback. #>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$BundlePath,[switch]$Execute)
$ErrorActionPreference='Stop'
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskArguments=@('-B',(Join-Path $PSScriptRoot 'preview_service_upgrade.py'),'--bundle',$BundlePath)
if ($Execute) { $taskArguments+='--execute' }
& $taskPython @taskArguments
if ($LASTEXITCODE -ne 0) { throw 'Aggiornamento non completato: conservare upgradeId, fase e ricevuta; verificare lo stato del rollback senza rilanciare.' }
