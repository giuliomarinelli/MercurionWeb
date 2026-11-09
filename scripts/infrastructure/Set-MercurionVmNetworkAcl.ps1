#Requires -Version 5.1
<# Default Plan is read-only. Apply/Quarantine require VM Off and affect its single known vNIC only. #>
[CmdletBinding()]
param([ValidateSet('Plan','Apply','Verify','Quarantine')][string]$Mode='Plan',
    [ValidateSet('SshOnly','DnsHttps')][string]$Policy='SshOnly')
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'MercurionVmAcl.ps1')
try {
    Invoke-MercurionVmAcl -Mode $Mode -Policy $Policy | ConvertTo-Json -Depth 8
} catch {
    [ordered]@{
        code='VM_ACL_OPERATION_STOPPED'; mode=$Mode; policy=$Policy
        message=$_.Exception.Message
        instruction='Non avviare la VM; conservare snapshot e stato, nessun retry automatico.'
        isolationAccepted=$false
    } | ConvertTo-Json -Depth 4
    exit 1
}
