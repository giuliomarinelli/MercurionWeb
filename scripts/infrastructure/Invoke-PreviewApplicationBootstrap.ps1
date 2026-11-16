#Requires -Version 5.1
<# First private application bootstrap. Private values read only with -Execute in owner terminal. #>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$BundlePath,
      [string]$ConfigurationPath=(Join-Path ([Environment]::GetFolderPath('UserProfile')) '.mercurion/preview/configuration.json'),
      [switch]$Execute,
      [switch]$VerifyExisting,
      [switch]$OpenTunnel)
$ErrorActionPreference='Stop'
if ($OpenTunnel -and (-not $VerifyExisting -or -not $Execute)) { throw 'OpenTunnel richiede VerifyExisting ed Execute.' }
$taskPython=(Get-Command python.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$taskArguments=@('-B',(Join-Path $PSScriptRoot 'preview_application_bootstrap.py'),'--bundle',$BundlePath)
if ($VerifyExisting) { $taskArguments+='--verify-existing' }
if ($Execute -and -not $VerifyExisting) {
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
if ($Execute -and $VerifyExisting) { $taskArguments+='--execute' }
& $taskPython @taskArguments
if ($LASTEXITCODE -ne 0) { throw 'Avvio applicativo non completato: conservare runId, fase e ricevute; non rilanciare o inizializzare nuovamente il database.' }
if ($OpenTunnel) { & (Join-Path $PSScriptRoot 'Open-PreviewNginxTunnel.ps1') -BundlePath $BundlePath }
