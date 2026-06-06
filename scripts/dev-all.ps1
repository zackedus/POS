param(
    [switch]$SkipDocker,
    [switch]$SkipMigrate,
    [switch]$WithMobile,
    [switch]$NoFallback
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$LogPrefix = '[dev-all]'
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ComposeFile = Join-Path $ProjectRoot "docker/docker-compose.dev.yml"

function Write-DevLog {
    param([string]$Message)
    Write-Host "$LogPrefix $Message"
}

function Write-DevWarn {
    param([string]$Message)
    Write-Warning "$LogPrefix $Message"
}

function Test-DockerAvailable {
    param(
        [int]$TimeoutSeconds = 10
    )

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        return $false
    }

    $process = $null
    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = 'docker'
        $psi.Arguments = 'info'
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true

        $process = [System.Diagnostics.Process]::Start($psi)
        if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
            try {
                $process.Kill($true)
            }
            catch {
                # Best-effort kill when daemon is stuck (e.g. HTTP 500).
            }
            return $false
        }

        return $process.ExitCode -eq 0
    }
    catch {
        return $false
    }
    finally {
        if ($null -ne $process) {
            $process.Dispose()
        }
    }
}

function Test-TcpPortOpen {
    param(
        [string]$HostName = "127.0.0.1",
        [int]$Port
    )

    $client = $null
    try {
        $client = [System.Net.Sockets.TcpClient]::new()
        $task = $client.ConnectAsync($HostName, $Port)
        if (-not $task.Wait(2000)) {
            return $false
        }
        return $client.Connected
    }
    catch {
        return $false
    }
    finally {
        if ($null -ne $client) {
            $client.Dispose()
        }
    }
}

function Wait-ForTcpPort {
    param(
        [string]$Name,
        [int]$Port,
        [int]$MaxAttempts = 30,
        [int]$DelaySeconds = 2
    )

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        if (Test-TcpPortOpen -Port $Port) {
            Write-DevLog "$Name siap (port $Port)."
            return $true
        }

        Write-DevLog "Menunggu $Name pada port $Port... ($attempt/$MaxAttempts)"
        Start-Sleep -Seconds $DelaySeconds
    }

    return $false
}

function Enable-RedisDisabledFallback {
    param([string]$Reason)

    $env:REDIS_DISABLED = 'true'
    Write-DevWarn $Reason
    Write-DevWarn 'REDIS_DISABLED=true untuk sesi ini - API memakai inline queue (tanpa BullMQ).'
}

function Invoke-Npm {
    param([Parameter(Mandatory = $true)][string[]]$NpmArgs)

    Push-Location $ProjectRoot
    try {
        & npm @NpmArgs
        if ($LASTEXITCODE -ne 0) {
            throw "npm $($NpmArgs -join ' ') gagal (exit $LASTEXITCODE)."
        }
    }
    finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host " Barokah Core POS - Local Dev (All)"
Write-Host "========================================"
Write-Host ""

Push-Location $ProjectRoot
try {
    $redisReady = $false
    $useDocker = -not $SkipDocker

    if ($useDocker -and -not (Test-DockerAvailable -TimeoutSeconds 10)) {
        Write-DevWarn 'Docker tidak merespons dalam 10 detik (daemon mungkin macet atau HTTP 500).'
        Write-DevWarn 'Fallback otomatis ke mode -SkipDocker — lanjut tanpa Docker infra.'
        Write-DevWarn 'Restart Docker Desktop dari system tray, lalu ulangi: npm run dev'
        Write-DevWarn 'Alternatif manual: npm run dev -- -SkipDocker jika Postgres/Redis lokal sudah aktif.'
        $useDocker = $false
    }

    if ($useDocker) {
        $postgresRunning = docker ps --filter "name=barokah-postgres" --filter "status=running" -q 2>$null
        $redisRunning = docker ps --filter "name=barokah-redis" --filter "status=running" -q 2>$null

        if ($postgresRunning -and $redisRunning) {
            Write-DevLog "Docker infra (postgres + redis) sudah berjalan."
        }
        else {
            Write-DevLog "Memulai Docker infra: postgres + redis..."
            docker compose -f $ComposeFile up -d --wait postgres redis
            if ($LASTEXITCODE -ne 0) {
                Write-DevWarn "docker compose up gagal - coba: npm run docker:up"
            }
        }

        if (-not (Wait-ForTcpPort -Name "PostgreSQL" -Port 5433)) {
            Write-DevWarn "PostgreSQL belum merespons di port 5433. Cek DATABASE_URL di .env (disarankan port 5433 untuk Docker dev)."
        }

        $redisReady = Wait-ForTcpPort -Name "Redis" -Port 6379
        if (-not $redisReady) {
            Enable-RedisDisabledFallback -Reason "Redis belum merespons di port 6379 setelah menunggu."
        }
    }
    elseif ($SkipDocker) {
        Write-DevLog "Lewati Docker (-SkipDocker)."
        $redisReady = Test-TcpPortOpen -Port 6379
        if (-not $redisReady) {
            Enable-RedisDisabledFallback -Reason "Redis tidak terdeteksi di port 6379 (-SkipDocker)."
        }
    }
    else {
        Write-DevLog 'Mode fallback (-SkipDocker otomatis): cek Postgres/Redis lokal.'
        $redisReady = Test-TcpPortOpen -Port 6379
        if (-not $redisReady) {
            Enable-RedisDisabledFallback -Reason 'Redis tidak terdeteksi di port 6379 (fallback otomatis).'
        }
        if (-not (Test-TcpPortOpen -Port 5433)) {
            Write-DevWarn 'PostgreSQL tidak terdeteksi di port 5433. Pastikan DB lokal jalan atau restart Docker Desktop.'
        }
    }

    if (-not $SkipMigrate) {
        Write-DevLog "Menjalankan prisma migrate deploy..."
        try {
            Invoke-Npm -NpmArgs @("run", "db:migrate:deploy")
        }
        catch {
            Write-DevWarn "Migrasi gagal: $($_.Exception.Message)"
            Write-DevWarn "Lanjut start app - perbaiki DATABASE_URL lalu jalankan: npm run db:migrate:deploy"
        }
    }
    else {
        Write-DevLog "Lewati migrasi (-SkipMigrate)."
    }

    if ($NoFallback) {
        Write-DevLog "Mode strict: tanpa fallback port."
        $appsScript = if ($WithMobile) { "dev:apps:mobile" } else { "dev:apps:strict" }
    }
    else {
        $appsScript = if ($WithMobile) { "dev:apps:mobile" } else { "dev:apps" }
    }

    Write-Host ""
    Write-DevLog "Hot reload:"
    Write-Host "  - API : nest start --watch (port 3000, fallback otomatis)"
    Write-Host "  - Web : next dev (port 3001, fallback otomatis)"
    if ($WithMobile) {
        Write-Host "  - Mobile : expo start"
    }
    Write-Host ""
    Write-DevLog "URL: API http://localhost:3000/api/v1 | Web http://localhost:3001"
    Write-DevLog "ChunkLoadError di /login atau /pos? Jalankan: npm run dev:web:clean (hapus .next + restart web)."
    Write-DevLog "Tekan Ctrl+C untuk menghentikan semua proses."
    Write-Host ""

    & npm run $appsScript
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
