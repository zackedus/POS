param(
    [string]$ApiBase = $env:API_BASE_URL,
    [int]$TimeoutSec = 10
)

$ErrorActionPreference = 'Stop'

if (-not $ApiBase) {
    $ApiBase = 'http://localhost:3000/api/v1'
}

$results = @()
$passed = 0
$failed = 0

function Test-SmokeEndpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int[]]$ExpectedStatus = @(200)
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec $TimeoutSec -UseBasicParsing
        $status = [int]$response.StatusCode
        if ($ExpectedStatus -contains $status) {
            return @{ Name = $Name; Status = 'PASS'; Detail = "HTTP $status" }
        }
        return @{ Name = $Name; Status = 'FAIL'; Detail = "HTTP $status (expected $($ExpectedStatus -join '/'))" }
    }
    catch {
        $status = $null
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode.value__
            if ($ExpectedStatus -contains $status) {
                return @{ Name = $Name; Status = 'PASS'; Detail = "HTTP $status" }
            }
        }
        return @{ Name = $Name; Status = 'FAIL'; Detail = $_.Exception.Message }
    }
}

Write-Host "Barokah POS smoke check - $ApiBase" -ForegroundColor Cyan

$checks = @(
    @{ Name = 'health'; Url = "$ApiBase/health"; Expected = @(200) },
    @{ Name = 'store-outlets (public)'; Url = "$ApiBase/store/demo/outlets"; Expected = @(200, 401, 404) }
)

foreach ($check in $checks) {
    $result = Test-SmokeEndpoint -Name $check.Name -Url $check.Url -ExpectedStatus $check.Expected
    $results += $result
    if ($result.Status -eq 'PASS') {
        $passed++
        Write-Host "[PASS] $($result.Name) - $($result.Detail)" -ForegroundColor Green
    }
    else {
        $failed++
        Write-Host "[FAIL] $($result.Name) - $($result.Detail)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Summary: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Yellow' })

if ($failed -gt 0) {
    exit 1
}

exit 0
