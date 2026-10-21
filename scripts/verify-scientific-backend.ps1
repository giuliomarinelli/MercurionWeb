# Mercurion Notebook/Synthesis DB-first: backend validation.
# Run from PowerShell on Windows after npm dependencies are installed.
# It does NOT modify PostgreSQL. GraphQL schema regeneration modifies
# MercurionWebNode/src/schema.graphql intentionally: review and commit the diff.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repoRoot = Split-Path -Parent $PSScriptRoot
$nodeRoot = Join-Path $repoRoot 'MercurionWebNode'
if (-not (Test-Path (Join-Path $nodeRoot 'package.json'))) {
    throw 'MercurionWebNode/package.json not found.'
}

function Run-Required {
    param([string]$Description, [string]$Command, [string[]]$Arguments)
    Write-Host ''
    Write-Host ">>> $Description" -ForegroundColor Cyan
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Description failed (exit code $LASTEXITCODE)"
    }
}

Push-Location $nodeRoot
try {
    Run-Required 'TypeScript typecheck' 'npm' @('run', 'typecheck')
    Run-Required 'Scientific-domain and custom molecule Jest regressions' 'npm' @(
        'run', 'test', '--', '--runInBand', 'scientific-domain|custom-molecule-resolution'
    )
    Run-Required 'Regenerate committed GraphQL schema' 'npm' @(
        'run', 'graphql:schema:update'
    )
    Run-Required 'Check GraphQL schema consistency' 'npm' @(
        'run', 'graphql:schema:check'
    )
    Run-Required 'Compile NestJS application' 'npm' @('run', 'build')
    Write-Host ''
    Write-Host 'Scientific backend checks passed. Review src/schema.graphql and git diff.' -ForegroundColor Green
} finally {
    Pop-Location
}
