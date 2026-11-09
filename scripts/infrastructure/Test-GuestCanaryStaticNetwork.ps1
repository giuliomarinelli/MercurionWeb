#Requires -Version 5.1
# Exercise the real wrapper's preflight with synthetic readiness and network reads.
# No listener, SCP, SSH or filesystem mutation is performed by these scenarios.
$ErrorActionPreference = 'Stop'
$script:probeWrapper = Join-Path $PSScriptRoot 'Invoke-GuestCanary.ps1'

function Reset-ProbeFixture {
    $script:probeReady = [ordered]@{
        address='10.203.240.1'; port=49152; nonce=('a' * 32)
        expiresAtUtc=[DateTimeOffset]::UtcNow.AddMinutes(10).ToString('o')
    }
    $script:probeAddresses = @([pscustomobject]@{
        IPAddress='10.203.240.1'; PrefixLength=24; AddressState='Preferred'
    })
    $script:executableLookups = 0
}
function Get-ChildItem {
    [CmdletBinding()] param($LiteralPath,[switch]$Directory,$Filter)
    if ($Filter -ne 'h02-ipv4-*') { throw 'Unexpected artifact selection.' }
    [pscustomobject]@{ FullName='synthetic-run'; LastWriteTime=[datetime]::UtcNow }
}
function Test-Path {
    [CmdletBinding()] param($LiteralPath)
    if ($LiteralPath -eq (Join-Path 'synthetic-run' 'ready.json')) { return $true }
    if ($LiteralPath -eq (Join-Path 'synthetic-run' 'result.json')) { return $false }
    return [IO.File]::Exists($LiteralPath)
}
function Get-Content {
    [CmdletBinding()] param([switch]$Raw,$LiteralPath)
    if ($LiteralPath -ne (Join-Path 'synthetic-run' 'ready.json')) { throw 'Unexpected file read.' }
    $script:probeReady | ConvertTo-Json
}
function Get-NetIPAddress {
    [CmdletBinding()] param($InterfaceAlias,$AddressFamily)
    if ($InterfaceAlias -ne 'vEthernet (Mercurion-Internal)' -or $AddressFamily -ne 'IPv4') {
        throw 'Wrong host interface queried.'
    }
    $script:probeAddresses
}
function Get-Command {
    [CmdletBinding()] param($Name,$CommandType)
    $script:executableLookups++
    throw 'Unexpected executable lookup: no transport may be started.'
}
function Assert-ProbeRejected {
    param([string]$ExpectedMessage)
    $probeError = $null
    try { . $script:probeWrapper -ValidateOnly | Out-Null } catch { $probeError=$_.Exception.Message }
    if (-not $probeError -or $probeError -notlike $ExpectedMessage -or $script:executableLookups -ne 0) {
        throw ('Unexpected preflight result: '+$probeError)
    }
}

Reset-ProbeFixture
. $script:probeWrapper -ValidateOnly | Out-Null
if ($script:executableLookups -ne 0) { throw 'ValidateOnly attempted transport.' }
$probeChecks = 1

# A previously valid Default Switch target must be rejected even if still local.
Reset-ProbeFixture
$script:probeReady.address='172.27.0.1'
$script:probeAddresses[0].IPAddress='172.27.0.1'
Assert-ProbeRejected '*non appartiene alla rete statica*'
$probeChecks++

foreach ($probeCase in @('absent','duplicate','prefix','tentative')) {
    Reset-ProbeFixture
    switch ($probeCase) {
        'absent' { $script:probeAddresses=@() }
        'duplicate' { $script:probeAddresses += $script:probeAddresses[0] }
        'prefix' { $script:probeAddresses[0].PrefixLength=20 }
        'tentative' { $script:probeAddresses[0].AddressState='Tentative' }
    }
    Assert-ProbeRejected '*Bersaglio Mercurion-Internal*'
    $probeChecks++
}

Reset-ProbeFixture
$script:probeReady.expiresAtUtc=[DateTimeOffset]::UtcNow.AddMinutes(-1).ToString('o')
Assert-ProbeRejected '*finestra di prova sta scadendo*'
$probeChecks++

Write-Output ('Static canary preflight passed: '+$probeChecks+' scenarios; synthetic reads, no network changed.')
