#Requires -Version 5.1
# Policy-level initial-packet checks only; no Hyper-V calls or conntrack simulation.
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'MercurionVmAcl.ps1')
$taskPolicyRules=@(Get-MercurionDnsHttpsRules | Sort-Object Weight -Descending)

function Test-AddressPrefix {
    param([string]$Address,[string]$Prefix)
    if ([string]::IsNullOrWhiteSpace($Prefix)) { return $true }
    $taskParts=$Prefix.Split('/')
    $taskAddressBytes=[Net.IPAddress]::Parse($Address).GetAddressBytes()
    $taskPrefixBytes=[Net.IPAddress]::Parse($taskParts[0]).GetAddressBytes()
    if ($taskAddressBytes.Length -ne $taskPrefixBytes.Length) { return $false }
    $taskBits=[int]$taskParts[1]
    for ($taskIndex=0; $taskBits -gt 0; $taskIndex++) {
        $taskWidth=[Math]::Min(8,$taskBits)
        $taskMask=[int](256-[Math]::Pow(2,8-$taskWidth))
        if (($taskAddressBytes[$taskIndex] -band $taskMask) -ne ($taskPrefixBytes[$taskIndex] -band $taskMask)) { return $false }
        $taskBits-=$taskWidth
    }
    return $true
}
function Get-InitialPacketDecision {
    param([string]$Remote,[string]$Protocol='TCP',[int]$RemotePort=443,
        [string]$Local='10.203.240.10',[string]$Direction='Outbound',[int]$LocalPort=50000)
    foreach ($taskRule in $taskPolicyRules) {
        if ($taskRule.Direction -ne $Direction) { continue }
        if ($taskRule.Protocol -and $taskRule.Protocol -ne $Protocol) { continue }
        if ($taskRule.LocalPort -and [int]$taskRule.LocalPort -ne $LocalPort) { continue }
        if ($taskRule.RemotePort -and [int]$taskRule.RemotePort -ne $RemotePort) { continue }
        if (-not (Test-AddressPrefix $Local $taskRule.LocalIPAddress)) { continue }
        if (-not (Test-AddressPrefix $Remote $taskRule.RemoteIPAddress)) { continue }
        return $taskRule.Action
    }
    throw 'Missing default-deny rule.'
}

$taskCases=@(
    @{Args=@{Remote='151.101.0.223'};Expected='Allow'},
    @{Args=@{Remote='151.101.0.223';RemotePort=80};Expected='Deny'},
    @{Args=@{Remote='151.101.0.223';Protocol='UDP'};Expected='Deny'},
    @{Args=@{Remote='151.101.0.223';Local='10.203.240.11'};Expected='Deny'},
    @{Args=@{Remote='1.1.1.1';Protocol='UDP';RemotePort=53};Expected='Allow'},
    @{Args=@{Remote='1.1.1.1';RemotePort=53};Expected='Allow'},
    @{Args=@{Remote='9.9.9.9';Protocol='UDP';RemotePort=53};Expected='Allow'},
    @{Args=@{Remote='9.9.9.9';RemotePort=53};Expected='Allow'},
    @{Args=@{Remote='8.8.8.8';Protocol='UDP';RemotePort=53};Expected='Deny'},
    @{Args=@{Remote='192.168.0.1';Protocol='UDP';RemotePort=53};Expected='Deny'},
    @{Args=@{Remote='10.203.240.1'};Expected='Deny'},
    @{Args=@{Remote='192.168.0.221'};Expected='Deny'},
    @{Args=@{Remote='2001:4860:4860::8888';Local='2001:db8::10'};Expected='Deny'},
    @{Args=@{Remote='fe80::1';Local='fe80::10'};Expected='Deny'},
    @{Args=@{Remote='10.203.240.1';Direction='Inbound';LocalPort=22;RemotePort=50000};Expected='Allow'},
    @{Args=@{Remote='192.168.0.221';Direction='Inbound';LocalPort=22;RemotePort=50000};Expected='Deny'},
    @{Args=@{Remote='151.101.0.223';Direction='Inbound';LocalPort=443;RemotePort=50000};Expected='Deny'}
)
# Every blocked class must override public-HTTPS permission, even on TCP/443.
foreach ($taskBlocked in @('10.1.2.3','172.26.48.1','192.168.0.1','127.0.0.1',
        '169.254.1.1','100.64.1.1','0.1.2.3','224.0.0.1','240.0.0.1')) {
    $taskCases+=@{Args=@{Remote=$taskBlocked};Expected='Deny'}
}
foreach ($taskCase in $taskCases) {
    $taskArguments=$taskCase.Args
    $taskDecision=Get-InitialPacketDecision @taskArguments
    if ($taskDecision -ne $taskCase.Expected) {
        throw ('Wrong initial-packet decision for '+($taskArguments | ConvertTo-Json -Compress))
    }
}
Write-Output ('Egress policy checks passed: '+$taskCases.Count+' initial-packet scenarios; no network calls. Stateful return traffic requires runtime validation.')
