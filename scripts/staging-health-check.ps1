param(
    [string]$ApiBase = $env:STAGING_API_URL,
    [int]$TimeoutSec = 15
)

$ErrorActionPreference = 'Stop'

if (-not $ApiBase) {
    $ApiBase = 'http://localhost:3010/api/v1'
}

Write-Host "Barokah POS staging health — $ApiBase" -ForegroundColor Cyan

$checks = @(
    @{ Name = 'health'; Url = "$ApiBase/health" },
    @{ Name = 'store-outlets'; Url = "$ApiBase/store/barokah-bangunan/outlets" }
)

$failed = 0
foreach ($check in $checks) {
    try {
        $response = Invoke-WebRequest -Uri $check.Url -Method GET -TimeoutSec $TimeoutSec -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "[PASS] $($check.Name)" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] $($check.Name) HTTP $($response.StatusCode)" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "[FAIL] $($check.Name) — $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

if ($failed -gt 0) {
    exit 1
}

Write-Host "Staging health OK" -ForegroundColor Green
exit 0
