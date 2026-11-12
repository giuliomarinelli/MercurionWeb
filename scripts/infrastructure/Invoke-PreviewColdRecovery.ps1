#Requires -Version 5.1
<# Existing preview servers cold recovery. Private values read only with -Execute in owner terminal. #>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$BundlePath,
      [string]$ConfigurationPath=(Join-Path ([Environment]::GetFolderPath('UserProfile')) '.mercurion/preview/configuration.json'),
      [switch]$Execute,
      [Parameter(Mandatory=$true)][ValidatePattern('^[a-f0-9]{32}$')][string]$InspectionId,
      [ValidatePattern('^[a-f0-9]{32}$')][string]$VerifyAttemptId)
$ErrorActionPreference='Stop'
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskArguments=@('-B',(Join-Path $PSScriptRoot 'preview_cold_recovery.py'),'--bundle',$BundlePath,'--inspection-id',$InspectionId)
if ($VerifyAttemptId) { $taskArguments+=@('--verify-attempt',$VerifyAttemptId) }
if ($Execute -and -not $VerifyAttemptId) {
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
    $taskArguments+=@('--configuration',$taskPrivate)
}
if ($Execute) { $taskArguments+='--execute' }
& $taskPython @taskArguments
if ($LASTEXITCODE -ne 0) { throw 'Recupero non completato: conservare attemptId, fase e report, senza rilanciare il bootstrap.' }
