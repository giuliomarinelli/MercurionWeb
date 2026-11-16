#Requires -Version 5.1
<# Default: plan only. -Execute is an explicit operator-only synthetic VM trial. #>
[CmdletBinding()]
param(
    [ValidateSet('preview', 'production')][string]$Environment = 'preview',
    [switch]$Execute
)
$ErrorActionPreference = 'Stop'
$taskPython = (Get-Command python.exe -CommandType Application | Select-Object -First 1).Source
$taskScript = Join-Path $PSScriptRoot 'synthetic_secret_delivery.py'
$taskArguments = @('-B', $taskScript, '--environment', $Environment)
if ($Execute) { $taskArguments += '--execute' }
& $taskPython @taskArguments
if ($LASTEXITCODE -ne 0) { throw 'Consegna sintetica non completata; nessun retry automatico.' }
