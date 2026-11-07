#Requires -Version 5.1
function Read-ContainerCanaryReport {
    [CmdletBinding()]
    param([string[]]$Lines, [Parameter(Mandatory = $true)][string]$RunId,
        [string]$Marker = 'INF_VM_02_H04_RESULT ')
    $taskText = $Lines -join "`n"
    $taskMarker = $Marker
    $taskMatches = [regex]::Matches($taskText, [regex]::Escape($taskMarker))
    if ($taskMatches.Count -ne 1) {
        throw 'Report guest assente o ambiguo; vedere guest-terminal.txt.'
    }
    # PTY prompts may leave text before the marker on the same line.
    # Extract only the payload; never copy that prefix into parsed reports.
    $taskPayload = ($taskText.Substring($taskMatches[0].Index + $taskMarker.Length) -split "`n", 2)[0].Trim()
    try { $taskParsed = $taskPayload | ConvertFrom-Json -ErrorAction Stop }
    catch { throw 'Payload report guest non valido.' }
    if ($taskParsed.runId -ne $RunId) { throw 'Report non appartenente alla prova corrente.' }
    return $taskParsed
}
