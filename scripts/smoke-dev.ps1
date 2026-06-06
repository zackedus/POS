param(
    [string]$SmokeEmail = $env:STAGING_SMOKE_EMAIL,
    [string]$SmokePassword = $env:STAGING_SMOKE_PASSWORD,
    [string]$TenantSlug = $env:STAGING_TENANT_SLUG,
    [int]$TimeoutSec = 15
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$StagingScript = Join-Path $ScriptDir 'staging-health-check.ps1'

$candidates = @(
    'http://localhost:3000/api/v1',
    'http://localhost:3010/api/v1'
)

function Test-ApiHealth {
    param([string]$ApiBase, [int]$Timeout = 5)
    try {
        $response = Invoke-WebRequest -Uri "$ApiBase/health" -Method GET -TimeoutSec $Timeout -UseBasicParsing
        return [int]$response.StatusCode -eq 200
    } catch {
        return $false
    }
}

if ($env:STAGING_API_URL) {
    $ApiBase = $env:STAGING_API_URL
    Write-Host "Barokah POS dev smoke — using STAGING_API_URL: $ApiBase" -ForegroundColor Cyan
} else {
    $ApiBase = $null
    foreach ($url in $candidates) {
        if (Test-ApiHealth -ApiBase $url) {
            $ApiBase = $url
            Write-Host "Barokah POS dev smoke — detected API at $ApiBase" -ForegroundColor Green
            break
        }
    }
    if (-not $ApiBase) {
        $ApiBase = 'http://localhost:3000/api/v1'
        Write-Host "Barokah POS dev smoke — no API on 3000/3010; defaulting to $ApiBase" -ForegroundColor Yellow
        Write-Host "Start dev API first: npm run dev:api (or npm run dev:all)" -ForegroundColor DarkYellow
    }
}

Write-Host "Prerequisites: DB migrated + seeded (npm run db:migrate && npm run db:seed)" -ForegroundColor DarkGray
Write-Host ""

& $StagingScript -ApiBase $ApiBase -SmokeEmail $SmokeEmail -SmokePassword $SmokePassword -TenantSlug $TenantSlug -TimeoutSec $TimeoutSec
exit $LASTEXITCODE
