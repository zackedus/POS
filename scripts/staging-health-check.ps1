param(
    [string]$ApiBase = $env:STAGING_API_URL,
    [string]$SmokeEmail = $env:STAGING_SMOKE_EMAIL,
    [string]$SmokePassword = $env:STAGING_SMOKE_PASSWORD,
    [string]$TenantSlug = $env:STAGING_TENANT_SLUG,
    [int]$TimeoutSec = 15
)

$ErrorActionPreference = 'Stop'

if (-not $ApiBase) {
    $ApiBase = 'http://localhost:3010/api/v1'
}

if (-not $SmokeEmail) {
    $SmokeEmail = 'kasir@barokah.local'
}

if (-not $SmokePassword) {
    $SmokePassword = 'Kasir123!'
}

if (-not $TenantSlug) {
    $TenantSlug = 'barokah-bangunan'
}

$passed = 0
$failed = 0

function Write-SmokeResult {
    param([string]$Name, [bool]$Ok, [string]$Detail)
    if ($Ok) {
        $script:passed++
        Write-Host "[PASS] $Name - $Detail" -ForegroundColor Green
    } else {
        $script:failed++
        Write-Host "[FAIL] $Name - $Detail" -ForegroundColor Red
    }
}

function Invoke-SmokeGet {
    param(
        [string]$Name,
        [string]$Url,
        [hashtable]$Headers = @{},
        [int[]]$ExpectedStatus = @(200)
    )

    try {
        $params = @{
            Uri = $Url
            Method = 'GET'
            TimeoutSec = $TimeoutSec
            UseBasicParsing = $true
        }
        if ($Headers.Count -gt 0) {
            $params.Headers = $Headers
        }
        $response = Invoke-WebRequest @params
        $status = [int]$response.StatusCode
        if ($ExpectedStatus -contains $status) {
            return @{ Ok = $true; Detail = "HTTP $status"; Body = $response.Content }
        }
        return @{ Ok = $false; Detail = "HTTP $status (expected $($ExpectedStatus -join '/'))"; Body = $null }
    } catch {
        $status = $null
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode.value__
            if ($ExpectedStatus -contains $status) {
                return @{ Ok = $true; Detail = "HTTP $status"; Body = $null }
            }
        }
        return @{ Ok = $false; Detail = $_.Exception.Message; Body = $null }
    }
}

Write-Host "Barokah POS staging smoke - $ApiBase" -ForegroundColor Cyan
Write-Host "Prerequisites: API reachable (staging Docker port 3010 or set STAGING_API_URL), DB migrated + seeded." -ForegroundColor DarkGray
Write-Host ""

$r = Invoke-SmokeGet -Name 'health' -Url "$ApiBase/health"
Write-SmokeResult -Name 'health' -Ok $r.Ok -Detail $r.Detail

$r = Invoke-SmokeGet -Name 'store-outlets (public)' -Url "$ApiBase/store/$TenantSlug/outlets"
Write-SmokeResult -Name 'store-outlets (public)' -Ok $r.Ok -Detail $r.Detail

$accessToken = $null
$outletId = $null

try {
    $loginJson = @{ email = $SmokeEmail; password = $SmokePassword } | ConvertTo-Json -Compress
    $loginResponse = Invoke-WebRequest -Uri "$ApiBase/auth/login" -Method POST -Body $loginJson -ContentType 'application/json' -TimeoutSec $TimeoutSec -UseBasicParsing
    if ([int]$loginResponse.StatusCode -eq 200 -or [int]$loginResponse.StatusCode -eq 201) {
        $envelope = $loginResponse.Content | ConvertFrom-Json
        if ($envelope.success -eq $true -and $envelope.data.tokens.accessToken) {
            $accessToken = $envelope.data.tokens.accessToken
            if ($envelope.data.user.outletIds -and $envelope.data.user.outletIds.Count -gt 0) {
                $outletId = $envelope.data.user.outletIds[0]
            }
            Write-SmokeResult -Name 'auth-login' -Ok $true -Detail 'token issued'
        } else {
            Write-SmokeResult -Name 'auth-login' -Ok $false -Detail 'unexpected response envelope'
        }
    } else {
        Write-SmokeResult -Name 'auth-login' -Ok $false -Detail "HTTP $($loginResponse.StatusCode)"
    }
} catch {
    Write-SmokeResult -Name 'auth-login' -Ok $false -Detail $_.Exception.Message
}

if ($accessToken) {
    $authHeaders = @{ Authorization = "Bearer $accessToken" }

    $r = Invoke-SmokeGet -Name 'auth-me' -Url "$ApiBase/auth/me" -Headers $authHeaders
    Write-SmokeResult -Name 'auth-me' -Ok $r.Ok -Detail $r.Detail

    $r = Invoke-SmokeGet -Name 'products-list' -Url "$ApiBase/products?limit=1" -Headers $authHeaders
    Write-SmokeResult -Name 'products-list' -Ok $r.Ok -Detail $r.Detail

    if ($outletId) {
        $r = Invoke-SmokeGet -Name 'shift-active' -Url "$ApiBase/shifts/active?outletId=$outletId" -Headers $authHeaders
        Write-SmokeResult -Name 'shift-active' -Ok $r.Ok -Detail $r.Detail
    } else {
        Write-SmokeResult -Name 'shift-active' -Ok $false -Detail 'no outletId from login user'
    }
} else {
    Write-SmokeResult -Name 'auth-me' -Ok $false -Detail 'skipped (no token)'
    Write-SmokeResult -Name 'products-list' -Ok $false -Detail 'skipped (no token)'
    Write-SmokeResult -Name 'shift-active' -Ok $false -Detail 'skipped (no token)'
}

Write-Host ""
Write-Host "Summary: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Yellow' })

if ($failed -gt 0) {
    Write-Host ""
    Write-Host "Hint: run from monorepo root: cd <repo-root>; npm run smoke:staging" -ForegroundColor DarkYellow
    Write-Host "Set STAGING_API_URL for non-default host (e.g. http://localhost:3000/api/v1 for local dev API)." -ForegroundColor DarkYellow
    exit 1
}

Write-Host "Staging smoke OK" -ForegroundColor Green
exit 0
