#Requires -Version 5.1
# All Hyper-V/network operations are replaced by local functions. No real network writes.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'MercurionVmAcl.ps1')

function Reset-Fixture {
    $script:vmState='Off'; $script:mac='00155D00DD01'; $script:adapterCount=1
    $script:switchType='Internal'; $script:addressState='Preferred'; $script:snapshotFailure=$false
    $script:failAddAt=0; $script:addCount=0; $script:runningAfter=0
    $script:failFinalRead=$false; $script:guardRemovals=0
    $script:injectExtraRule=$false
    $script:log=@()
    $script:simple=@([pscustomobject]@{Action='Deny';Direction='Outbound';RemoteAddress='10.0.0.0/8'})
    $script:extended=@(
        [pscustomobject]@{Action='Deny';Direction='Outbound';Weight=200;RemoteIPAddress='172.16.0.0/12'},
        [pscustomobject]@{Action='Allow';Direction='Inbound';Weight=300;RemoteIPAddress='172.26.48.1/32';Protocol='TCP';LocalPort='22';Stateful=$true;IdleSessionTimeout=3600}
    )
}
function Assert-True { param($Condition,[string]$Message) if (-not $Condition) { throw $Message } }
function Assert-Rejected {
    param([scriptblock]$Operation)
    $taskRejected=$false
    try { & $Operation | Out-Null } catch { $taskRejected=$true }
    Assert-True $taskRejected 'Expected failure was accepted.'
}
function Get-VM { [CmdletBinding()] param($Name) [pscustomobject]@{State=$script:vmState} }
function Get-VMNetworkAdapter {
    [CmdletBinding()] param($VMName)
    for($taskIndex=0; $taskIndex -lt $script:adapterCount; $taskIndex++) {
        [pscustomobject]@{Name='fixture-nic';Id='fixture-id';MacAddress=$script:mac;SwitchName='Default Switch'}
    }
}
function Get-VMNetworkAdapterAcl { [CmdletBinding()] param($VMNetworkAdapter) $script:simple }
function Get-VMNetworkAdapterExtendedAcl {
    [CmdletBinding()] param($VMNetworkAdapter)
    if ($script:injectExtraRule -and $script:addCount -eq 16 -and $script:guardRemovals -eq 0) {
        $script:injectExtraRule=$false
        $script:extended += [pscustomobject]@{Action='Allow';Direction='Outbound';Weight=4000}
    }
    if ($script:failFinalRead -and $script:guardRemovals -eq 2) {
        $script:failFinalRead=$false
        throw 'Synthetic final read failure'
    }
    $script:extended
}
function Get-VMSwitch { [CmdletBinding()] param($Name) [pscustomobject]@{SwitchType=$script:switchType} }
function Get-NetIPAddress {
    [CmdletBinding()] param($InterfaceAlias,$AddressFamily,$PolicyStore)
    [pscustomobject]@{IPAddress='10.203.240.1';PrefixLength=24;AddressState=$script:addressState}
}
function Save-MercurionAclSnapshot {
    param($Context)
    if($script:snapshotFailure) { throw 'Synthetic snapshot failure' }
    $script:log += [pscustomobject]@{Kind='snapshot'}
    return 'synthetic-in-memory-snapshot'
}
function Add-VMNetworkAdapterExtendedAcl {
    [CmdletBinding()] param($VMNetworkAdapter,$Action,$Direction,$Weight,$LocalIPAddress,$RemoteIPAddress,$LocalPort,$RemotePort,$Protocol,$Stateful,$IdleSessionTimeout)
    Assert-True ($VMNetworkAdapter.Id -eq 'fixture-id') 'Wrong target adapter.'
    $script:addCount++
    if($script:failAddAt -eq $script:addCount) { throw 'Synthetic add failure' }
    if(@($script:extended | Where-Object { $_.Weight -eq $Weight -and $_.Direction -eq $Direction }).Count -gt 0) {
        throw 'Duplicate weight/direction in fixture'
    }
    $script:extended += [pscustomobject]@{
        Action=$Action;Direction=$Direction;Weight=$Weight;LocalIPAddress=$LocalIPAddress;RemoteIPAddress=$RemoteIPAddress
        LocalPort=$LocalPort;RemotePort=$RemotePort;Protocol=$Protocol;Stateful=[bool]$Stateful;IdleSessionTimeout=[int]$IdleSessionTimeout
    }
    $script:log += [pscustomobject]@{Kind='add';Weight=$Weight;Direction=$Direction}
    if($script:runningAfter -eq $script:addCount) { $script:vmState='Running' }
}
function Remove-VMNetworkAdapterAcl {
    [CmdletBinding(SupportsShouldProcess=$true)] param($InputObject)
    $script:simple=@($script:simple | Where-Object { $_ -ne $InputObject })
    $script:log += [pscustomobject]@{Kind='removeSimple'}
}
function Remove-VMNetworkAdapterExtendedAcl {
    [CmdletBinding(SupportsShouldProcess=$true)] param($InputObject,$VMNetworkAdapter,$Weight,$Direction)
    if($InputObject) { $Weight=$InputObject.Weight; $Direction=$InputObject.Direction }
    else { Assert-True ($VMNetworkAdapter.Id -eq 'fixture-id') 'Wrong target adapter.' }
    $script:extended=@($script:extended | Where-Object { -not ($_.Weight -eq $Weight -and $_.Direction -eq $Direction) })
    $script:log += [pscustomobject]@{Kind='removeExtended';Weight=$Weight;Direction=$Direction}
    if($Weight -eq 10000) { $script:guardRemovals++ }
}

$taskChecks=0
Reset-Fixture
$taskPlan=Invoke-MercurionVmAcl -Mode Plan
Assert-True ($script:log.Count -eq 0 -and -not $taskPlan.mutationsPerformed) 'Plan mutated state.'
Assert-True ($taskPlan.expectedRules.Count -eq 14) 'Unexpected policy rule count.'
$taskChecks++

foreach($taskInvalid in @('running','mac','adapters','external','address','snapshot','priority')) {
    Reset-Fixture
    switch($taskInvalid) {
        'running' { $script:vmState='Running' }
        'mac' { $script:mac='000000000000' }
        'adapters' { $script:adapterCount=2 }
        'external' { $script:switchType='External' }
        'address' { $script:addressState='Tentative' }
        'snapshot' { $script:snapshotFailure=$true }
        'priority' { $script:extended+= [pscustomobject]@{Action='Allow';Direction='Outbound';Weight=20000} }
    }
    Assert-Rejected { Invoke-MercurionVmAcl -Mode Apply }
    Assert-True (@($script:log | Where-Object Kind -ne 'snapshot').Count -eq 0) ('Mutation before valid preflight: '+$taskInvalid)
    $taskChecks++
}

Reset-Fixture
$taskResult=Invoke-MercurionVmAcl -Mode Apply
Assert-True ($taskResult.settingsReadbackVerified -and -not $taskResult.internetEgressEnabled -and -not $taskResult.isolationAccepted) 'False acceptance.'
Assert-True ($script:log[0].Kind -eq 'snapshot' -and $script:log[1].Weight -eq 10000 -and $script:log[2].Weight -eq 10000) 'Original ACLs removed before guards.'
Assert-True (@($script:extended | Where-Object Action -eq 'Allow').Count -eq 1) 'Unexpected allow.'
Assert-True (@($script:extended | Where-Object { $_.Direction -eq 'Outbound' -and $_.Action -eq 'Allow' }).Count -eq 0) 'Egress opened.'
Assert-True (@($script:extended | Where-Object Weight -eq 10000).Count -eq 0) 'Guards not released.'
Assert-True ($script:simple.Count -eq 0 -and $script:extended.Count -eq 14) 'Final ruleset incomplete.'
$taskLogCount=$script:log.Count
$taskAgain=Invoke-MercurionVmAcl -Mode Apply
Assert-True ($taskAgain.alreadyConfigured -and $script:log.Count -eq $taskLogCount) 'Idempotent apply wrote again.'
$taskVerify=Invoke-MercurionVmAcl -Mode Verify
Assert-True $taskVerify.settingsReadbackVerified 'Readback verification failed.'
$script:switchType='External'
Assert-Rejected { Invoke-MercurionVmAcl -Mode Apply }
Assert-True ($script:log.Count -eq $taskLogCount) 'Idempotent apply skipped switch preflight.'
$taskChecks++

Reset-Fixture
$script:failAddAt=5
Assert-Rejected { Invoke-MercurionVmAcl -Mode Apply }
Assert-True (@($script:extended | Where-Object Weight -eq 10000).Count -eq 2) 'Failure lost deny guards.'
$taskCount=$script:log.Count
Assert-Rejected { Invoke-MercurionVmAcl -Mode Apply }
Assert-True ($script:log.Count -eq $taskCount) 'Guarded partial state retried automatically.'
$taskChecks++

Reset-Fixture
$script:runningAfter=2
Assert-Rejected { Invoke-MercurionVmAcl -Mode Apply }
Assert-True (@($script:extended | Where-Object Weight -eq 10000).Count -eq 2) 'Concurrent VM start lost guards.'
Assert-True ($script:simple.Count -eq 1) 'Original policy removed after VM started.'
$taskChecks++

Reset-Fixture
$script:failFinalRead=$true
Assert-Rejected { Invoke-MercurionVmAcl -Mode Apply }
Assert-True (@($script:extended | Where-Object Weight -eq 10000).Count -eq 2) 'Final read failure did not restore guards.'
$taskChecks++

Reset-Fixture
$script:failAddAt=2
Assert-Rejected { Invoke-MercurionVmAcl -Mode Apply }
Assert-True ($script:simple.Count -eq 1 -and @($script:log | Where-Object Kind -like 'remove*').Count -eq 0) 'Original ACLs removed before both guards.'
$taskChecks++

Reset-Fixture
$script:injectExtraRule=$true
Assert-Rejected { Invoke-MercurionVmAcl -Mode Apply }
Assert-True ($script:guardRemovals -eq 0 -and @($script:extended | Where-Object Weight -eq 10000).Count -eq 2) 'Unexpected allow did not retain guards.'
$taskChecks++

Reset-Fixture
$taskQuarantine=Invoke-MercurionVmAcl -Mode Quarantine
Assert-True ($taskQuarantine.denyGuardsVerified -and $script:simple.Count -eq 1) 'Quarantine removed original ACLs.'
Assert-True (@($script:extended | Where-Object Weight -eq 10000).Count -eq 2) 'Quarantine incomplete.'
$taskChecks++

Reset-Fixture
$script:extended += [pscustomobject]@{Action='Allow';Direction='Outbound';Weight=20000}
Assert-Rejected { Invoke-MercurionVmAcl -Mode Quarantine }
Assert-True ($script:log.Count -eq 0) 'Quarantine accepted a higher priority rule.'
$taskChecks++

Write-Output ('ACL policy tests passed: '+$taskChecks+' scenarios; native Hyper-V operations simulated, no network changed.')
