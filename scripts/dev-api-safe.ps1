param(
    [int]$Port = 3000,
    [switch]$KillOnly,
    [switch]$AutoFallback,
    [string]$StartCommand = "npm run dev --workspace=@barokah/api",
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

Write-Host "[dev-api-safe] Memeriksa konflik port pada :$Port ..."
$targetPids = @(Get-ListeningPids -TargetPort $Port)

if ($targetPids.Count -eq 0) {
    Write-Host "[dev-api-safe] Port :$Port tersedia."
}
else {
    Write-Host "[dev-api-safe] Ditemukan proses pada :$Port => PID: $($targetPids -join ', ')"
    foreach ($targetPid in $targetPids) {
        try {
            Stop-Process -Id $targetPid -Force -ErrorAction Stop
            Write-Host "[dev-api-safe] Proses PID $targetPid dihentikan."
        }
        catch {
            Write-Warning "[dev-api-safe] Gagal menghentikan PID ${targetPid}: $($_.Exception.Message)"
        }
    }
}

if ($KillOnly) {
    Write-Host "[dev-api-safe] Selesai (KillOnly)."
    exit 0
}

$resolvedPort = $Port
if (-not (Test-PortAvailable -TargetPort $resolvedPort)) {
    if ($AutoFallback) {
        $resolvedPort = Find-NextAvailablePort -StartPort ($Port + 1)
        Write-Warning "[dev-api-safe] Port :$Port masih bentrok. Fallback ke :$resolvedPort"
    }
    else {
        throw "Port :$Port masih digunakan. Jalankan ulang dengan -AutoFallback atau hentikan proses pemakainya."
    }
}

$env:API_PORT = "$resolvedPort"
Write-Host "[dev-api-safe] Menjalankan API pada API_PORT=$env:API_PORT"

Push-Location $ProjectRoot
try {
    Invoke-Expression $StartCommand
}
finally {
    Pop-Location
}
