#Requires -Version 5.1
<# Metadata-only inventory for cold recovery. Never reads private configuration. #>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$BundlePath,[switch]$Execute)
$ErrorActionPreference='Stop'
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskArguments=@('-B',(Join-Path $PSScriptRoot 'preview_recovery_inventory.py'),'--bundle',$BundlePath)
if ($Execute) { $taskArguments+='--execute' }
& $taskPython @taskArguments
if ($LASTEXITCODE -ne 0) { throw 'Inventario non completato: conservare inspectionId e report, senza ripetere il bootstrap.' }
