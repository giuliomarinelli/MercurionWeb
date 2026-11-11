#Requires -Version 5.1
<# Owner-only repair for the early generator; no other material is regenerated. #>
[CmdletBinding()]
param([string]$ConfigurationPath=(Join-Path ([Environment]::GetFolderPath('UserProfile')) '.mercurion/preview/configuration.json'))
$ErrorActionPreference='Stop'
$taskProfile=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')+'\'
$taskFile=[IO.Path]::GetFullPath($ConfigurationPath)
if (-not $taskFile.StartsWith($taskProfile,[StringComparison]::OrdinalIgnoreCase)) { throw 'Il file deve restare nel profilo privato.' }
if (-not (Test-Path -LiteralPath $taskFile -PathType Leaf)) { throw 'Configurazione privata assente.' }
$taskSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
foreach ($taskPath in @((Split-Path -Parent $taskFile),$taskFile)) {
    $taskAcl=Get-Acl -LiteralPath $taskPath
    if ($taskPath -ne $taskFile -and -not $taskAcl.AreAccessRulesProtected) { throw 'La directory privata ha ereditarieta ACL inattesa; nessuna modifica.' }
    foreach ($taskRule in $taskAcl.Access) {
        $taskRuleSid=$taskRule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
        if ($taskRuleSid -notin @($taskSid,'S-1-5-18') -or $taskRule.AccessControlType -ne 'Allow') { throw 'ACL inattese: nessuna modifica automatica ai permessi o al file.' }
    }
}
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
& $taskPython -B (Join-Path $PSScriptRoot 'preview_credentials.py') repair-generated-aes --file $taskFile --before-first-bootstrap
if ($LASTEXITCODE -ne 0) { throw 'Correzione non completata: conservare i file privati e riportare il solo errore.' }
