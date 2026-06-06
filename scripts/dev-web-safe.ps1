param(
    [int]$Port = 3001,
    [switch]$KillOnly,
    [switch]$AutoFallback,
    [switch]$CleanNext,
    [string]$StartCommand = "npm run dev:watch --workspace=@barokah/web",
    [string]$ProjectRoot = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-ListeningPids {
    param([int]$TargetPort)

    $lines = netstat -ano -p tcp | Select-String -Pattern "^\s*TCP\s+\S+:$TargetPort\s+\S+\s+LISTENING\s+(\d+)\s*$"
    $pids = @()

    foreach ($line in $lines) {
        $parts = ($line.Line -split "\s+") | Where-Object { $_ -ne "" }
        if ($parts.Count -gt 0) {
            $processId = [int]$parts[-1]
            if ($processId -gt 0) {
                $pids += $processId
            }
        }
    }

    return $pids | Sort-Object -Unique
}

function Test-PortAvailable {
    param([int]$TargetPort)

    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $TargetPort)
        $listener.Start()
        return $true
    }
    catch {
        return $false
    }
    finally {
        if ($null -ne $listener) {
            $listener.Stop()
        }
    }
}

function Find-NextAvailablePort {
    param(
        [int]$StartPort,
        [int]$Attempts = 30
    )

    for ($i = 0; $i -lt $Attempts; $i++) {
        $candidate = $StartPort + $i
        if (Test-PortAvailable -TargetPort $candidate) {
            return $candidate
        }
    }

    throw "Tidak menemukan port kosong dari $StartPort sampai $($StartPort + $Attempts - 1)."
}

Write-Host "[dev-web-safe] Memeriksa konflik port pada :$Port ..."
$targetPids = @(Get-ListeningPids -TargetPort $Port)

if ($targetPids.Count -eq 0) {
    Write-Host "[dev-web-safe] Port :$Port tersedia."
}
else {
    Write-Host "[dev-web-safe] Ditemukan proses pada :$Port => PID: $($targetPids -join ', ')"
    foreach ($targetPid in $targetPids) {
        try {
            Stop-Process -Id $targetPid -Force -ErrorAction Stop
            Write-Host "[dev-web-safe] Proses PID $targetPid dihentikan."
        }
        catch {
            Write-Warning "[dev-web-safe] Gagal menghentikan PID ${targetPid}: $($_.Exception.Message)"
        }
    }
}

if ($KillOnly) {
    Write-Host "[dev-web-safe] Selesai (KillOnly)."
    exit 0
}

$resolvedPort = $Port
if (-not (Test-PortAvailable -TargetPort $resolvedPort)) {
    if ($AutoFallback) {
        $resolvedPort = Find-NextAvailablePort -StartPort ($Port + 1)
        Write-Warning "[dev-web-safe] Port :$Port masih bentrok. Fallback ke :$resolvedPort"
    }
    else {
        throw "Port :$Port masih digunakan. Jalankan ulang dengan -AutoFallback atau hentikan proses pemakainya."
    }
}

if ($CleanNext) {
    $nextDir = Join-Path (Resolve-Path $ProjectRoot) "apps/web/.next"
    if (Test-Path $nextDir) {
        Write-Host "[dev-web-safe] Menghapus cache .next (stale chunk prevention)..."
        Remove-Item -LiteralPath $nextDir -Recurse -Force -ErrorAction Stop
        Write-Host "[dev-web-safe] Cache .next dihapus."
    }
    else {
        Write-Host "[dev-web-safe] Folder .next tidak ada - lewati pembersihan."
    }
}

$env:PORT = "$resolvedPort"
Write-Host "[dev-web-safe] Menjalankan web pada PORT=$env:PORT"

Push-Location $ProjectRoot
try {
    Invoke-Expression $StartCommand
}
finally {
    Pop-Location
}
