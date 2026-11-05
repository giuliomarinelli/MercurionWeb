param(
    [string]$BaseImage = "node:22.16.0-bookworm-slim",
    [string]$ArtifactsDirectory = ""
)
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$runId = "jwtqa-" + [Guid]::NewGuid().ToString("N").Substring(0, 12)
$contextDirectory = Join-Path ([IO.Path]::GetTempPath()) $runId
$image = "mercurion-jwt-linux-qa:$runId"
if (-not $ArtifactsDirectory) { $ArtifactsDirectory = Join-Path ([IO.Path]::GetTempPath()) "$runId-results" }
New-Item -ItemType Directory -Path $contextDirectory, $ArtifactsDirectory -Force | Out-Null
$fixture = Join-Path $repoRoot "MercurionWebNode/test/jwt-linux-qa"
$compose = Join-Path $fixture "compose.yml"
$environmentFile = Join-Path $contextDirectory "qa.env"
[IO.File]::WriteAllText($environmentFile, "QA_RUN_ID=$runId`n")
$composeArgs = @("compose", "--env-file", $environmentFile, "--project-name", $runId, "-f", $compose)
try {
    Push-Location (Join-Path $repoRoot "MercurionWebNode")
    try {
        & (Join-Path $repoRoot "node_modules/.bin/nest.cmd") build *> (Join-Path $ArtifactsDirectory "build.log")
        if ($LASTEXITCODE -ne 0) { throw "Nest build failed; see build.log" }
    } finally { Pop-Location }
    $manifests = Join-Path $contextDirectory "manifests"
    New-Item -ItemType Directory -Path $manifests -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $repoRoot "package.json"), (Join-Path $repoRoot "package-lock.json") -Destination $manifests
    foreach ($workspace in @("MercurionWebNode", "MercurionWebNg", "packages/rest-contracts", "packages/socket-contracts")) {
        $destination = Join-Path $manifests $workspace
        New-Item -ItemType Directory -Path $destination -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $repoRoot "$workspace/package.json") -Destination $destination
    }
    # Only compiled JavaScript: never copy env/, config/keys/, PEM, source maps or the workspace itself.
    $distRoot = Join-Path $repoRoot "MercurionWebNode/dist"
    foreach ($file in Get-ChildItem -LiteralPath $distRoot -Recurse -File -Filter "*.js") {
        $relativeFile = [IO.Path]::GetRelativePath($distRoot, $file.FullName)
        $destination = Join-Path (Join-Path $contextDirectory "runtime") $relativeFile
        New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
        Copy-Item -LiteralPath $file.FullName -Destination $destination
    }
    foreach ($package in @("rest-contracts", "socket-contracts")) {
        $destination = Join-Path $contextDirectory "contracts/$package"
        New-Item -ItemType Directory -Path $destination -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $repoRoot "packages/$package/package.json") -Destination $destination
        $buildDirectories = if ($package -eq "socket-contracts") { @("cjs", "esm") } else { @("dist") }
        foreach ($buildDirectory in $buildDirectories) {
            Copy-Item -LiteralPath (Join-Path $repoRoot "packages/$package/$buildDirectory") -Destination $destination -Recurse
        }
    }
    $fixtureDestination = Join-Path $contextDirectory "fixture"
    New-Item -ItemType Directory -Path $fixtureDestination -Force | Out-Null
    Get-ChildItem -LiteralPath $fixture -Filter "*.cjs" | Copy-Item -Destination $fixtureDestination
    docker image inspect $BaseImage --format "{{.Id}}" *> (Join-Path $ArtifactsDirectory "base-image.log")
    if ($LASTEXITCODE -ne 0) {
        docker pull $BaseImage *> (Join-Path $ArtifactsDirectory "base-pull.log")
        if ($LASTEXITCODE -ne 0) { throw "QA base image unavailable; see base-pull.log" }
        docker image inspect $BaseImage --format "{{.Id}}" *> (Join-Path $ArtifactsDirectory "base-image.log")
        if ($LASTEXITCODE -ne 0) { throw "QA base image identity unavailable" }
    }
    docker build --build-arg "BASE_IMAGE=$BaseImage" -t $image -f (Join-Path $fixture "Dockerfile") $contextDirectory *> (Join-Path $ArtifactsDirectory "docker-build.log")
    if ($LASTEXITCODE -ne 0) { throw "QA image build failed; see docker-build.log" }
    docker image inspect $image --format "{{.Id}}" *> (Join-Path $ArtifactsDirectory "qa-image.log")
    docker @composeArgs config *> (Join-Path $ArtifactsDirectory "compose-config.yml")
    if ($LASTEXITCODE -ne 0) { throw "QA Compose configuration failed" }
    docker @composeArgs up --abort-on-container-exit --exit-code-from verify *> (Join-Path $ArtifactsDirectory "compose.log")
    if ($LASTEXITCODE -ne 0) { throw "Linux JWT QA failed; see compose.log" }
    $resultLine = Get-Content -LiteralPath (Join-Path $ArtifactsDirectory "compose.log") | Select-String '"passed"' | Select-Object -Last 1
    if (-not $resultLine) { throw "QA result missing" }
    $jsonResult = $resultLine.Line.Substring($resultLine.Line.IndexOf('{"passed":'))
    $result = $jsonResult | ConvertFrom-Json
    if (-not $result.passed) { throw "QA reported failure" }
    [IO.File]::WriteAllText((Join-Path $ArtifactsDirectory "result.json"), $jsonResult)
    Write-Output $jsonResult
} finally {
    docker @composeArgs down --volumes --remove-orphans *> (Join-Path $ArtifactsDirectory "cleanup.log")
    if ($LASTEXITCODE -ne 0) { Write-Warning "Task-owned Compose cleanup requires attention: $runId" }
    docker image rm $image *>> (Join-Path $ArtifactsDirectory "cleanup.log")
    # Resolve and verify the exact task-owned directory before recursive removal on Windows.
    $resolvedContext = [IO.Path]::GetFullPath($contextDirectory)
    $resolvedTemporary = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar)
    if ((Split-Path -Parent $resolvedContext) -ne $resolvedTemporary -or (Split-Path -Leaf $resolvedContext) -ne $runId) { throw "Unsafe QA context cleanup target" }
    Remove-Item -LiteralPath $resolvedContext -Recurse -Force
}
