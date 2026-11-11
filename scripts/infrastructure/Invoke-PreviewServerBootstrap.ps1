#Requires -Version 5.1
<# First real preview server bootstrap. Private values read only with -Execute in owner terminal. #>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$BundlePath,
      [string]$ConfigurationPath=(Join-Path ([Environment]::GetFolderPath('UserProfile')) '.mercurion/preview/configuration.json'),
      [switch]$Execute)
$ErrorActionPreference='Stop'
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskArguments=@('-B',(Join-Path $PSScriptRoot 'preview_server_bootstrap.py'),'--bundle',$BundlePath)
if ($Execute) {
    $taskPrivate=[IO.Path]::GetFullPath($ConfigurationPath)
    $taskProfile=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')+'\'
    if (-not $taskPrivate.StartsWith($taskProfile,[StringComparison]::OrdinalIgnoreCase)) { throw 'Configurazione fuori dal profilo privato.' }
    $taskSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    foreach ($taskPath in @((Split-Path -Parent $taskPrivate),$taskPrivate)) {
        $taskAcl=Get-Acl -LiteralPath $taskPath
        if ($taskPath -ne $taskPrivate -and -not $taskAcl.AreAccessRulesProtected) { throw 'Ereditarieta ACL privata inattesa.' }
        foreach ($taskRule in $taskAcl.Access) {
            $taskRuleSid=$taskRule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
            if ($taskRuleSid -notin @($taskSid,'S-1-5-18') -or $taskRule.AccessControlType -ne 'Allow') { throw 'ACL private inattese; nessuna modifica automatica.' }
        }
    }
    $taskArguments+=@('--configuration',$taskPrivate,'--execute')
}
& $taskPython @taskArguments
if ($LASTEXITCODE -ne 0) { throw 'Bootstrap non completato: conservare ultima fase e report, senza rilanciare.' }
