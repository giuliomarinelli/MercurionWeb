#Requires -Version 5.1
# Real host listener lifecycle; SCP/SSH are synthetic scripts, never remote.
# Fixtures live only in a new temporary directory, separate from runtime evidence.
$ErrorActionPreference='Stop'
$probeTempBase=[IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$probeFixtureRoot=Join-Path $probeTempBase ('mercurion-private-transport-'+[Guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($probeFixtureRoot)
$probeFixtureScp=Join-Path $probeFixtureRoot 'fixture-scp.ps1'
$probeFixtureSsh=Join-Path $probeFixtureRoot 'fixture-ssh.ps1'
$probeWrapper=Join-Path $PSScriptRoot 'Invoke-PrivatePortProbe.ps1'
@'
if ($args -contains '-r') {
    $global:MercurionPrivateProbeFixture.stage=$args[-2]
    $global:LASTEXITCODE=0
    if ($global:MercurionPrivateProbeFixture.mode -eq 'scp-failure') { $global:LASTEXITCODE=1 }
    return
}
$fixtureConfig=Get-Content -Raw -LiteralPath (Join-Path $global:MercurionPrivateProbeFixture.stage 'config.json') | ConvertFrom-Json
$fixtureId=$fixtureConfig.runId
if ($global:MercurionPrivateProbeFixture.mode -eq 'wrong-run') { $fixtureId='0'*32 }
[ordered]@{runId=$fixtureId;nonce=$fixtureConfig.nonce;scope='synthetic-transport-test';cases=@();status='invalid'} |
    ConvertTo-Json | Set-Content -LiteralPath $args[-1] -Encoding UTF8
$global:LASTEXITCODE=0
'@ | Set-Content -LiteralPath $probeFixtureScp -Encoding UTF8
@'
$global:MercurionPrivateProbeFixture.sshCalled=$true
Write-Host -NoNewline 'synthetic-prompt>'
$global:LASTEXITCODE=0
if ($global:MercurionPrivateProbeFixture.mode -eq 'ssh-failure') { $global:LASTEXITCODE=2 }
'@ | Set-Content -LiteralPath $probeFixtureSsh -Encoding UTF8
function Get-Command {
    [CmdletBinding()] param($Name,$CommandType)
    if ($Name -eq 'scp.exe') { return [pscustomobject]@{Source=$probeFixtureScp} }
    if ($Name -eq 'ssh.exe') { return [pscustomobject]@{Source=$probeFixtureSsh} }
    Microsoft.PowerShell.Core\Get-Command -Name $Name -CommandType $CommandType -ErrorAction Stop
}
$probeAllPassed=$false
try {
    $probeCheckCount=0
    foreach ($probeCase in @(
        @{mode='scp-failure';message='SCP fallito*';ssh=$false},
        @{mode='wrong-run';message='Report non appartenente*';ssh=$true},
        @{mode='ssh-failure';message='Esecuzione guest da revisionare*';ssh=$true}
    )) {
        $global:MercurionPrivateProbeFixture=@{mode=$probeCase.mode;sshCalled=$false;stage=$null}
        $probeCaseRoot=Join-Path $probeFixtureRoot $probeCase.mode
        $probeError=$null
        try { . $probeWrapper -ArtifactRoot $probeCaseRoot | Out-Null } catch { $probeError=$_.Exception.Message }
        if (-not $probeError -or $probeError -notlike $probeCase.message) { throw ('Unexpected failure; fixtures retained in '+$probeCaseRoot+': '+$probeError) }
        if ($global:MercurionPrivateProbeFixture.sshCalled -ne $probeCase.ssh) { throw 'SSH invoked at wrong phase.' }
        $probeRun=@(Get-ChildItem -LiteralPath $probeCaseRoot -Directory -Filter 'private-ports-ipv4-*')
        if ($probeRun.Count -ne 1) { throw 'Unexpected fixture run count.' }
        $probeHost=Get-Content -Raw -LiteralPath (Join-Path $probeRun[0].FullName 'host/result.json') | ConvertFrom-Json
        if (-not $probeHost.closed -or $probeHost.status -ne 'controls-passed') { throw 'Host cleanup or final controls failed.' }
        $probeCheckCount++
    }
    $probeAllPassed=$true
    Write-Output ('Private-port transport tests passed: '+$probeCheckCount+' failure scenarios; real host controls, simulated SCP/SSH, no VM access.')
}
finally {
    Remove-Variable -Name MercurionPrivateProbeFixture -Scope Global -ErrorAction SilentlyContinue
    # Delete only the exact newly created test directory after validating its absolute boundary.
    $probeResolvedRoot=[IO.Path]::GetFullPath($probeFixtureRoot)
    if (-not $probeResolvedRoot.StartsWith($probeTempBase,[StringComparison]::OrdinalIgnoreCase) -or
        (Split-Path -Leaf $probeResolvedRoot) -notlike 'mercurion-private-transport-*') { throw 'Unsafe fixture cleanup path.' }
    if ($probeAllPassed) { Remove-Item -LiteralPath $probeResolvedRoot -Recurse -Force }
    else { Write-Output ('Synthetic transport failure evidence retained: '+$probeResolvedRoot) }
}
