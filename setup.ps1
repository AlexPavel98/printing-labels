# Palm Karofler Labels - One-click setup for TORRERI-PC
# Run this in PowerShell as Administrator

$ErrorActionPreference = "Stop"
$repoUrl   = "https://github.com/AlexPavel98/printing-labels.git"
$appFolder = "$env:USERPROFILE\Desktop\printing-labels"

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  Palm Karofler Labels - Setup" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Install Node.js if missing ──────────────────────────────────────────
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[1/4] Installing Node.js LTS..." -ForegroundColor Yellow
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements -e
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "[1/4] Node.js already installed: $(node -v)" -ForegroundColor Green
}

# ── 2. Install Git if missing ───────────────────────────────────────────────
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[2/4] Installing Git..." -ForegroundColor Yellow
    winget install Git.Git --accept-source-agreements --accept-package-agreements -e
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "[2/4] Git already installed: $(git --version)" -ForegroundColor Green
}

# ── 3. Clone or update repo ─────────────────────────────────────────────────
if (Test-Path "$appFolder\.git") {
    Write-Host "[3/4] Updating existing repo..." -ForegroundColor Yellow
    Set-Location $appFolder
    git pull
} else {
    Write-Host "[3/4] Cloning repo to Desktop..." -ForegroundColor Yellow
    git clone $repoUrl $appFolder
    Set-Location $appFolder
}

# ── 4. Install dependencies ─────────────────────────────────────────────────
Write-Host "[4/4] Installing dependencies (first time may take 2-3 min)..." -ForegroundColor Yellow
npm install

# ── Launch ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  Setup complete! Launching app..." -ForegroundColor Green
Write-Host "  To run again later, double-click:" -ForegroundColor White
Write-Host "  Desktop\printing-labels\run.bat" -ForegroundColor White
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

npm run dev
