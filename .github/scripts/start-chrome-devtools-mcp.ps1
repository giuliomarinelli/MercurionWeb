[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$profilePath = [System.IO.Path]::GetFullPath(
    (Join-Path ([Environment]::GetFolderPath('UserProfile')) '.cache\chrome-devtools-mcp\chrome-profile')
)

function Get-DedicatedChromeProcessIds {
    $processes = @(Get-CimInstance Win32_Process -ErrorAction Stop)
    $byId = @{}

    foreach ($process in $processes) {
        $byId[[int]$process.ProcessId] = $process
    }

    $ownedIds = [System.Collections.Generic.HashSet[int]]::new()
    $seeds = @($processes | Where-Object {
        $_.Name -eq 'chrome.exe' -and
        $_.CommandLine -and
        $_.CommandLine.IndexOf($profilePath, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    })

    foreach ($seed in $seeds) {
        $current = $seed
        while ($null -ne $current -and $current.Name -eq 'chrome.exe') {
            [void]$ownedIds.Add([int]$current.ProcessId)
            $parentId = [int]$current.ParentProcessId
            $current = if ($byId.ContainsKey($parentId)) { $byId[$parentId] } else { $null }
        }
    }

    return @($ownedIds)
}

function Stop-DedicatedChrome {
    $deadline = [DateTime]::UtcNow.AddSeconds(15)

    do {
        $ownedIds = @(Get-DedicatedChromeProcessIds)
        if ($ownedIds.Count -eq 0) {
            return
        }

        foreach ($processId in $ownedIds) {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }

        Start-Sleep -Milliseconds 200
    } while ([DateTime]::UtcNow -lt $deadline)

    $remainingIds = @(Get-DedicatedChromeProcessIds)
    if ($remainingIds.Count -ne 0) {
        [Console]::Error.WriteLine(
            "Dedicated Chrome cleanup timed out for profile '$profilePath' (PIDs: $($remainingIds -join ', '))."
        )
        exit 70
    }
}

# Serial workers are the only permitted owners of this profile. Cleaning it at
# both boundaries makes a force-terminated prior MCP session recoverable without
# deleting persistent browser state or touching a personal Chrome profile.
Stop-DedicatedChrome

$npx = Get-Command 'npx.cmd' -ErrorAction Stop
$exitCode = 1

try {
    & $npx.Source '-y' 'chrome-devtools-mcp@1.8.0' '--headless' "--user-data-dir=$profilePath"
    $exitCode = $LASTEXITCODE
}
finally {
    Stop-DedicatedChrome
}

exit $exitCode
