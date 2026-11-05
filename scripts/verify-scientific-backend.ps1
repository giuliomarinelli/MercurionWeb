# Mercurion Notebook/Synthesis DB-first: backend validation on Windows.
# The default run checks the code and committed GraphQL schema without
# regenerating the schema. Use -UpdateGraphQLSchema explicitly to regenerate.
# Neither mode modifies PostgreSQL.
param(
    [switch]$UpdateGraphQLSchema
)

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
    Run-Required 'TypeScript typecheck' 'npm.cmd' @('run', 'typecheck')

    # Explicit --runTestsByPath values avoid cmd.exe interpreting the regex
    # alternation character | as a shell pipeline on Windows.
    $testPaths = @(
        'src/app_modules/lab-notebook/scientific-domain/notebook-delta.spec.ts'
        'src/app_modules/lab-notebook/scientific-domain/notebook-domain.service.spec.ts'
        'src/app_modules/lab-notebook/scientific-domain/experiment-protocol.service.spec.ts'
        'src/app_modules/molecule-collection/services/custom-molecule-resolution.service.spec.ts'
        'src/app_modules/molecule-collection/services/molecule-collection.service.ownership.spec.ts'
    )
    Run-Required 'Scientific-domain and custom molecule Jest regressions' 'npm.cmd' (
        @('run', 'test', '--', '--runInBand', '--runTestsByPath') + $testPaths
    )

    if ($UpdateGraphQLSchema) {
        Run-Required 'Regenerate GraphQL schema (explicit opt-in)' 'npm.cmd' @(
            'run', 'graphql:schema:update'
        )
    }

    Run-Required 'Check committed GraphQL schema consistency' 'npm.cmd' @(
        'run', 'graphql:schema:check'
    )

    Run-Required 'Compile NestJS application' 'npm.cmd' @('run', 'build')
    Write-Host ''
    Write-Host 'Scientific backend checks passed.' -ForegroundColor Green
    if ($UpdateGraphQLSchema) {
        Write-Host 'Review MercurionWebNode/src/schema.graphql and git diff before committing.' -ForegroundColor Yellow
    }
} finally {
    Pop-Location
}
