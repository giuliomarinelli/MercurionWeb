#Requires -Version 5.1
<# Forward privato Nginx su loopback; nessuna modifica DNS, hosts o firewall. #>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$BundlePath,
      [ValidateRange(1024,65535)][int]$Port=18888,
      [ValidateRange(1024,65535)][int]$SshPort=18889)
$ErrorActionPreference='Stop'
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
& $taskPython -B (Join-Path $PSScriptRoot 'preview_nginx_tunnel.py') --bundle $BundlePath --port $Port --ssh-port $SshPort
if ($LASTEXITCODE -ne 0) { throw 'Forward privato non disponibile; conservare l''esito senza cambiare DNS o firewall.' }
