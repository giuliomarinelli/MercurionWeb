#Requires -Version 5.1
<# Owner-only: no credentials printed, no SSH, no existing configuration overwritten. #>
[CmdletBinding()]
param([string]$Directory=(Join-Path ([Environment]::GetFolderPath('UserProfile')) '.mercurion/preview'))
$ErrorActionPreference='Stop'
$taskProfile=[Environment]::GetFolderPath('UserProfile')
$taskPrivate=[IO.Path]::GetFullPath($Directory)
if (-not $taskPrivate.StartsWith(([IO.Path]::GetFullPath($taskProfile).TrimEnd('\')+'\'),[StringComparison]::OrdinalIgnoreCase)) { throw 'La directory privata deve essere nel profilo utente.' }
$taskFile=Join-Path $taskPrivate 'configuration.json'
if (Test-Path -LiteralPath $taskFile) { throw 'Configurazione esistente: conservarla, non rigenerare i segreti.' }
if (Test-Path -LiteralPath $taskPrivate) { throw 'Directory privata esistente: verificare prima proprietario e ACL senza modificarla automaticamente.' }
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskAcl=(Get-Command icacls.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
[void][IO.Directory]::CreateDirectory($taskPrivate)
$taskIdentity=[Security.Principal.WindowsIdentity]::GetCurrent().Name
& $taskAcl $taskPrivate /inheritance:r /grant:r ($taskIdentity+':(OI)(CI)F') '*S-1-5-18:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'ACL private non applicate: nessun file di credenziali creato.' }
& $taskPython -B (Join-Path $PSScriptRoot 'preview_credentials.py') create --file $taskFile --origin https://preview.mercurion.app
if ($LASTEXITCODE -ne 0) { throw 'Configurazione non creata; conservare errore senza ripetere automaticamente.' }
Write-Output 'Compilare providers nel file privato. Le API key Meilisearch client verranno inserite dopo la creazione tramite curl; la master key resta nella sola sezione server.'
