#Requires -Version 5.1
# Curl dell'operatore: master effimera, due chiavi ristrette nel file privato.
[CmdletBinding()]
param(
    [string]$ConfigurationPath=(Join-Path ([Environment]::GetFolderPath('UserProfile')) '.mercurion/preview/configuration.json'),
    [ValidateSet('None','90Days')][string]$Expiry='90Days'
)
$ErrorActionPreference='Stop'
$meiliBase='http://127.0.0.1:17700'
$meiliFile=[IO.Path]::GetFullPath($ConfigurationPath)
$meiliProfile=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile')).TrimEnd('\')+'\'
if (-not $meiliFile.StartsWith($meiliProfile,[StringComparison]::OrdinalIgnoreCase)) { throw 'Configurazione fuori dal profilo privato.' }
$meiliSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
function Assert-MeiliPrivatePath {
    param([string]$Path,[switch]$Directory)
    $item=Get-Item -LiteralPath $Path -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Percorso privato con reparse point; nessuna modifica.' }
    if ([bool]$item.PSIsContainer -ne [bool]$Directory) { throw 'Tipo del percorso privato inatteso.' }
    $acl=Get-Acl -LiteralPath $Path
    if ($Directory -and -not $acl.AreAccessRulesProtected) { throw 'Ereditarieta ACL privata inattesa.' }
    foreach ($rule in $acl.Access) {
        $sid=$rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
        if ($sid -notin @($meiliSid,'S-1-5-18') -or $rule.AccessControlType -ne 'Allow') { throw 'ACL private inattese; nessuna modifica automatica.' }
    }
}
Assert-MeiliPrivatePath (Split-Path -Parent $meiliFile) -Directory
Assert-MeiliPrivatePath $meiliFile
$meiliBackup=$meiliFile+'.pre-meili-keys.backup'
$meiliPending=$meiliFile+'.meili-keys.pending'
if ((Test-Path -LiteralPath $meiliBackup) -or (Test-Path -LiteralPath $meiliPending)) { throw 'Materiali di una consegna precedente presenti; conservarli per review.' }
$meiliOriginal=[IO.File]::ReadAllBytes($meiliFile)
try { $meiliDocument=([Text.Encoding]::UTF8.GetString($meiliOriginal).TrimStart([char]0xfeff)) | ConvertFrom-Json }
catch { throw 'Configurazione JSON privata non valida; contenuto non stampato.' }
if ($meiliDocument.schemaVersion -ne 1 -or $meiliDocument.environment -ne 'preview' -or $meiliDocument.origin -ne 'https://preview.mercurion.app') { throw 'Configurazione preview inattesa.' }
if ((@($meiliDocument.meilisearchClients.PSObject.Properties.Name | Sort-Object) -join ',') -ne 'logKey,searchKey') { throw 'Campi delle chiavi client inattesi.' }
if ($meiliDocument.meilisearchClients.searchKey -or $meiliDocument.meilisearchClients.logKey) { throw 'Chiavi client gia compilate; nessuna rotazione o sovrascrittura.' }
$meiliSecure=Read-Host 'Master key Meilisearch dal password manager' -AsSecureString
$meiliPointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($meiliSecure)
try {
    $meiliMaster=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($meiliPointer)
    if ($meiliMaster -cnotmatch '^[0-9a-f]{64}$') { throw 'Attesa la master key generata di 64 caratteri esadecimali.' }
    function Invoke-MeiliKeyCurl {
        param([string]$Method,[string]$Path,$Body=$null,[string]$Credential=$meiliMaster,[int[]]$Expected=@(200))
        if ($Credential -cnotmatch '^[0-9a-f]{64}$') { throw 'Formato della credenziale curl inatteso.' }
        $config=@(('header = "Authorization: Bearer '+$Credential+'"'),'header = "Content-Type: application/json"')
        if ($null -ne $Body) {
            $json=ConvertTo-Json -InputObject $Body -Compress -Depth 10
            $config+='data = "'+$json.Replace('\','\\').Replace('"','\"')+'"'
        }
        $raw=($config -join "`n") | curl.exe --silent --show-error --noproxy '*' --connect-timeout 5 --max-time 15 --config - --request $Method --url ($meiliBase+$Path) --write-out '\n%{http_code}'
        if ($LASTEXITCODE -ne 0) { throw ('Trasporto curl fallito: '+$Method+' '+$Path) }
        $text=$raw -join "`n"
        $split=$text.LastIndexOf("`n")
        if ($split -lt 0 -or $text.Substring($split+1) -notmatch '^\d{3}$') { throw 'Risposta HTTP curl inattesa.' }
        $status=[int]$text.Substring($split+1)
        if ($status -notin $Expected) { throw ('HTTP inatteso: '+$status+' '+$Method+' '+$Path) }
        try { $bodyValue=$text.Substring(0,$split) | ConvertFrom-Json } catch { throw 'JSON curl inatteso; corpo non stampato.' }
        return @{status=$status;body=$bodyValue}
    }
    foreach ($index in @('logs_staging','security_logs_staging','logs_production','security_logs_production')) {
        $record=(Invoke-MeiliKeyCurl GET ('/indexes/'+$index)).body
        if ($record.uid -ne $index -or $record.primaryKey -ne 'id') { throw ('Indice log non pronto: '+$index) }
    }
    $meiliExpires=$null
    if ($Expiry -eq '90Days') { $meiliExpires=[DateTime]::UtcNow.AddDays(90).ToString('o') }
    $meiliSpecs=@(
        @{field='searchKey';uid='6d3c5a97-a1be-5e5d-b595-b006d557b090';name='Mercurion preview ChEMBL search';actions=@('search','documents.get');indexes=@('molecule_previews_chembl_36','molecule_details_chembl_36')},
        @{field='logKey';uid='16dbd72a-9663-542f-9220-63122b77a750';name='Mercurion preview log writer';actions=@('documents.add');indexes=@('logs_staging','security_logs_staging')}
    )
    $meiliValues=@{}
    foreach ($spec in $meiliSpecs) {
        $answer=Invoke-MeiliKeyCurl GET ('/keys/'+$spec.uid) -Expected @(200,404)
        if ($answer.status -eq 404) {
            if ($answer.body.code -ne 'api_key_not_found') { throw 'Risposta assenza API key inattesa.' }
            $answer=Invoke-MeiliKeyCurl POST '/keys' @{uid=$spec.uid;name=$spec.name;actions=$spec.actions;indexes=$spec.indexes;expiresAt=$meiliExpires} -Expected @(201)
        }
        $record=$answer.body
        if ($record.uid -ne $spec.uid -or $record.key -cnotmatch '^[0-9a-f]{64}$' -or $record.key -eq $meiliMaster -or $record.key -eq $meiliDocument.meilisearchServer.masterKey -or
            ((@($record.actions | Sort-Object) -join ',') -cne (@($spec.actions | Sort-Object) -join ',')) -or
            ((@($record.indexes | Sort-Object) -join ',') -cne (@($spec.indexes | Sort-Object) -join ','))) { throw ('Identita o grant della chiave inattesi: '+$spec.uid) }
        if ($Expiry -eq 'None') {
            if ($null -ne $record.expiresAt) { throw ('Scadenza della chiave inattesa: '+$spec.uid) }
        } else {
            $expires=[DateTimeOffset]::Parse($record.expiresAt)
            $created=[DateTimeOffset]::Parse($record.createdAt)
            if ($expires -le [DateTimeOffset]::UtcNow -or [Math]::Abs(($expires-$created).TotalDays-90) -gt 0.01) { throw ('Scadenza della chiave inattesa: '+$spec.uid) }
        }
        $meiliValues[$spec.field]=$record.key
        # Read-only denials: no synthetic log documents or indexes on the real VM.
        foreach ($path in @('/keys?limit=1','/indexes/logs_staging/documents?limit=1')) {
            $denial=Invoke-MeiliKeyCurl GET $path -Credential $record.key -Expected @(403)
            if ($denial.body.code -ne 'invalid_api_key') { throw 'Negazione dei permessi inattesa.' }
        }
    }
    if ($meiliValues.searchKey -eq $meiliValues.logKey) { throw 'Le chiavi client devono essere distinte.' }
    $meiliDocument.meilisearchClients.searchKey=$meiliValues.searchKey
    $meiliDocument.meilisearchClients.logKey=$meiliValues.logKey
    $meiliEncoded=(New-Object Text.UTF8Encoding($false)).GetBytes((ConvertTo-Json -InputObject $meiliDocument -Depth 100)+"`n")
    $meiliStream=[IO.File]::Open($meiliPending,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
    try {
        Assert-MeiliPrivatePath $meiliPending
        $meiliStream.Write($meiliEncoded,0,$meiliEncoded.Length)
        $meiliStream.Flush($true)
    } finally { $meiliStream.Dispose() }
    $meiliHasher=[Security.Cryptography.SHA256]::Create()
    try {
        $originalHash=[Convert]::ToBase64String($meiliHasher.ComputeHash($meiliOriginal))
        $currentHash=[Convert]::ToBase64String($meiliHasher.ComputeHash([IO.File]::ReadAllBytes($meiliFile)))
        if ($originalHash -cne $currentHash) { throw 'Configurazione modificata durante le operazioni: originale non sostituito; conservare i file.' }
    } finally { $meiliHasher.Dispose() }
    [IO.File]::Replace($meiliPending,$meiliFile,$meiliBackup)
    Assert-MeiliPrivatePath $meiliFile
    Assert-MeiliPrivatePath $meiliBackup
    @{status='MEILI_CLIENT_KEYS_READY';keyCount=2;expiryPolicy=$Expiry;configurationPath=$meiliFile;backupPath=$meiliBackup;
      keyUids=@($meiliSpecs | ForEach-Object {$_.uid});readOnly403Checks=4;otherFieldsChanged=$false;valuesPrinted=$false} | ConvertTo-Json -Compress -Depth 5
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($meiliPointer)
    $meiliSecure.Dispose()
    Remove-Variable meiliMaster,meiliValues,meiliDocument,meiliOriginal,meiliEncoded,record,answer,denial -ErrorAction SilentlyContinue
}
