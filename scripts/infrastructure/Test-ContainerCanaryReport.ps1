#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ContainerCanaryReport.ps1')
$testId = 'a' * 32
$testPayload = '{"runId":"' + $testId + '","status":"fixture-only","isolationAccepted":false}'
$testMarker = 'INF_VM_02_H04_RESULT '
foreach ($testPrefix in @('', 'synthetic-prompt>', ([char]27 + '[0m' + "`r" + 'synthetic-prompt>'))) {
    $testReport = Read-ContainerCanaryReport -Lines @('banner', ($testPrefix + $testMarker + $testPayload + "`r"), 'closed') -RunId $testId
    if ($testReport.runId -ne $testId -or $testReport.status -ne 'fixture-only') { throw 'Payload lost' }
    if ($testReport.isolationAccepted -ne $false) { throw 'Unexpected acceptance' }
}
foreach ($testLines in @(
    @('no report'),
    @($testMarker + $testPayload, $testMarker + $testPayload),
    @($testMarker + '{broken'),
    @($testMarker + '{"runId":"different"}')
)) {
    $testRejected = $false
    try { $null = Read-ContainerCanaryReport -Lines $testLines -RunId $testId }
    catch { $testRejected = $true }
    if (-not $testRejected) { throw 'Invalid or ambiguous report accepted' }
}
Write-Output 'Report parser OK: 3 valid PTY cases, 4 invalid cases rejected.'
