#Requires -Version 5.1
# Procedura curl dell'operatore: solo quattro indici log; nessuna chiave persistita.
$ErrorActionPreference='Stop'
$meiliBase='http://127.0.0.1:17700'
$meiliNames=@('logs_staging','security_logs_staging','logs_production','security_logs_production')
$meiliSecure=Read-Host 'Master key Meilisearch dal password manager' -AsSecureString
$meiliPointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($meiliSecure)
try {
    $meiliMaster=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($meiliPointer)
    if ($meiliMaster -cnotmatch '^[0-9a-f]{64}$') { throw 'Attesa la master key generata di 64 caratteri esadecimali; nessuna richiesta inviata.' }
    $meiliAuth='header = "Authorization: Bearer '+$meiliMaster+'"'
    function Invoke-MeiliOperatorCurl {
        param([string]$Method,[string]$Path,$Body=$null)
        $meiliConfig=@($meiliAuth,'header = "Content-Type: application/json"')
        if ($null -ne $Body) {
            $meiliJson=ConvertTo-Json -InputObject $Body -Compress -Depth 10
            $meiliConfig+='data = "'+$meiliJson.Replace('\','\\').Replace('"','\"')+'"'
        }
        $meiliRaw=($meiliConfig -join "`n") | curl.exe --silent --show-error --fail-with-body --noproxy '*' --connect-timeout 5 --max-time 15 --config - --request $Method --url ($meiliBase+$Path)
        if ($LASTEXITCODE -ne 0) { throw ('Richiesta curl fallita: '+$Method+' '+$Path+'. Conservare gli esiti; nessuna cancellazione automatica.') }
        return (($meiliRaw -join "`n") | ConvertFrom-Json)
    }
    $meiliCatalog=Invoke-MeiliOperatorCurl GET '/indexes?limit=1000'
    if ($null -eq $meiliCatalog.total -or $meiliCatalog.total -gt 1000) { throw 'Elenco indici inatteso o paginato; nessuna scrittura eseguita.' }
    foreach ($meiliExisting in @($meiliCatalog.results)) {
        if ($meiliExisting.uid -in $meiliNames -and $meiliExisting.primaryKey -ne 'id') {
            throw ('Primary key inattesa per '+$meiliExisting.uid+'; nessun indice viene modificato.')
        }
    }
    $meiliReport=@()
    foreach ($meiliName in $meiliNames) {
        $meiliTaskUid=$null
        if ($meiliName -notin @($meiliCatalog.results | ForEach-Object { $_.uid })) {
            $meiliSubmitted=Invoke-MeiliOperatorCurl POST '/indexes' @{uid=$meiliName;primaryKey='id'}
            if ($null -eq $meiliSubmitted.taskUid -or [string]$meiliSubmitted.taskUid -notmatch '^\d+$') { throw 'Task di creazione inatteso; conservare gli esiti.' }
            $meiliTaskUid=$meiliSubmitted.taskUid
            $meiliDeadline=[DateTime]::UtcNow.AddSeconds(45)
            do {
                $meiliTask=Invoke-MeiliOperatorCurl GET ('/tasks/'+$meiliTaskUid)
                if ($meiliTask.uid -ne $meiliTaskUid -or $meiliTask.indexUid -ne $meiliName -or $meiliTask.type -ne 'indexCreation') { throw 'Identita task inattesa; conservare gli esiti.' }
                if ($meiliTask.status -in @('failed','canceled')) { throw ('Creazione fallita: '+$meiliName+'; task='+$meiliTaskUid+'; status='+$meiliTask.status) }
                if ($meiliTask.status -eq 'succeeded') { break }
                if ($meiliTask.status -notin @('enqueued','processing') -or [DateTime]::UtcNow -ge $meiliDeadline) { throw ('Task non completato: '+$meiliName+'; task='+$meiliTaskUid) }
                Start-Sleep -Milliseconds 250
            } while ($true)
        }
        $meiliVerified=Invoke-MeiliOperatorCurl GET ('/indexes/'+$meiliName)
        if ($meiliVerified.uid -ne $meiliName -or $meiliVerified.primaryKey -ne 'id') { throw ('Readback indice fallito: '+$meiliName) }
        $meiliReport+=@{uid=$meiliName;primaryKey='id';taskUid=$meiliTaskUid;status='ready'}
        Write-Host ('Indice verificato: '+$meiliName)
    }
    @{status='LOG_INDEXES_READY';count=$meiliReport.Count;indexes=$meiliReport;apiKeysCreated=$false} | ConvertTo-Json -Depth 5 -Compress
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($meiliPointer)
    $meiliSecure.Dispose()
    Remove-Variable meiliMaster,meiliAuth -ErrorAction SilentlyContinue
}
