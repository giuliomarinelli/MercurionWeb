#Requires -Version 5.1
<# Local synthetic Linux tests only. Never connects to the VM or pulls images. #>
[CmdletBinding()]
param([switch]$ValidateOnly)
$ErrorActionPreference = 'Stop'
$taskDocker = (Get-Command docker.exe -CommandType Application | Select-Object -First 1).Source
$taskImage = 'sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79'
$taskTools = [IO.Path]::GetFullPath($PSScriptRoot)
$taskReader = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../MercurionTox21/secret_bootstrap.py'))
foreach ($taskFile in @((Join-Path $taskTools 'secret_delivery.py'),
                       (Join-Path $taskTools 'test_secret_delivery.py'), $taskReader)) {
    if (-not (Test-Path -LiteralPath $taskFile -PathType Leaf)) { throw 'Sorgente della prova mancante.' }
}
foreach ($taskPath in @($taskTools, $taskReader)) {
    if ($taskPath.Contains(',')) { throw 'Percorso non supportato dal mount Docker.' }
}
$taskEndpoint = & $taskDocker context inspect desktop-linux --format '{{.Endpoints.docker.Host}}'
if ($LASTEXITCODE -ne 0 -or $taskEndpoint -notmatch '^npipe://') {
    throw 'Richiesto il contesto Docker Desktop locale desktop-linux.'
}
$taskIdentity = & $taskDocker --context desktop-linux image inspect $taskImage --format '{{.Os}}/{{.Architecture}}'
if ($LASTEXITCODE -ne 0 -or $taskIdentity -ne 'linux/amd64') {
    throw 'Immagine Python locale fissata assente o non compatibile. Nessun pull eseguito.'
}
if ($ValidateOnly) { Write-Output 'Prerequisiti locali verificati; nessun container o SSH avviato.'; return }
$taskName = 'mercurion-secret-delivery-test-' + [Guid]::NewGuid().ToString('N')
$taskArguments = @('--context', 'desktop-linux', 'run', '--rm', '--pull', 'never',
    '--name', $taskName, '--label', 'mercurion.secret-delivery-test=true',
    '--network', 'none', '--read-only', '--cap-drop', 'ALL',
    '--cap-add', 'CHOWN', '--cap-add', 'FOWNER', '--cap-add', 'SETUID',
    '--cap-add', 'SETGID', '--cap-add', 'DAC_OVERRIDE',
    '--security-opt', 'no-new-privileges:true', '--pids-limit', '64',
    '--memory', '128m', '--cpus', '1',
    '--tmpfs', '/run:rw,noexec,nosuid,size=16m,mode=0755',
    '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m,mode=1777',
    '--tmpfs', '/nonexistent:rw,noexec,nosuid,size=2m,mode=0700,uid=65534,gid=65534',
    '--env', 'MERCURION_SYNTHETIC_DELIVERY_TEST=1',
    '--mount', ('type=bind,source=' + $taskTools + ',target=/tools,readonly'),
    '--mount', ('type=bind,source=' + $taskReader + ',target=/consumer/secret_bootstrap.py,readonly'),
    '--entrypoint', 'python', $taskImage,
    '-B', '-m', 'unittest', 'discover', '-s', '/tools', '-p', 'test_*secret_delivery.py', '-v')
Write-Output 'Prova sintetica locale su tmpfs; nessuna connessione SSH o modifica VM.'
# unittest uses stderr for its ordinary progress. Keep native streams attached in PS 5.1.
& $taskDocker @taskArguments
if ($LASTEXITCODE -ne 0) { throw 'Prova locale fallita; nessun esito positivo dichiarato.' }
Write-Output 'Prova locale completata; risorse effimere rimosse da Docker --rm.'
