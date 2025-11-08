# Workflow Management Platform - Quick Start
# This script helps you start both the backend and frontend servers

Write-Host "🚀 Starting Workflow Management Platform..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Get the script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootPath = $scriptPath

# Check if backend is set up
$backendPath = Join-Path $rootPath "apps\api"
$frontendPath = Join-Path $rootPath "apps\web"

Write-Host ""
Write-Host "📦 Checking dependencies..." -ForegroundColor Cyan

# Check backend dependencies
if (-not (Test-Path (Join-Path $backendPath "node_modules"))) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location $backendPath
    npm install
    Pop-Location
}

# Check frontend dependencies
if (-not (Test-Path (Join-Path $frontendPath "node_modules"))) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location $frontendPath
    npm install
    Pop-Location
}

Write-Host "✓ Dependencies ready" -ForegroundColor Green
Write-Host ""

# Check if .env files exist
$backendEnv = Join-Path $backendPath ".env"
$frontendEnv = Join-Path $frontendPath ".env"

if (-not (Test-Path $backendEnv)) {
    Write-Host "⚠ Backend .env file not found. Creating from example..." -ForegroundColor Yellow
    $backendEnvExample = Join-Path $backendPath ".env.example"
    if (Test-Path $backendEnvExample) {
        Copy-Item $backendEnvExample $backendEnv
        Write-Host "✓ Created backend .env file. Please update DATABASE_URL and other settings." -ForegroundColor Green
    }
}

if (-not (Test-Path $frontendEnv)) {
    Write-Host "⚠ Frontend .env file not found. Creating..." -ForegroundColor Yellow
    "VITE_API_BASE=http://localhost:3001" | Out-File -FilePath $frontendEnv -Encoding UTF8
    Write-Host "✓ Created frontend .env file" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎯 Starting Services..." -ForegroundColor Cyan
Write-Host ""

# Start backend in a new window
Write-Host "Starting Backend API (Port 3001)..." -ForegroundColor Cyan
$backendScript = @"
    `$host.ui.RawUI.WindowTitle = 'Workflow Backend API'
    Set-Location '$backendPath'
    Write-Host '🔧 Backend API Server' -ForegroundColor Green
    Write-Host 'Running on http://localhost:3001' -ForegroundColor Cyan
    Write-Host ''
    npm run start:dev
    pause
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

Start-Sleep -Seconds 2

# Start frontend in a new window
Write-Host "Starting Frontend Web App (Port 5173)..." -ForegroundColor Cyan
$frontendScript = @"
    `$host.ui.RawUI.WindowTitle = 'Workflow Web Interface'
    Set-Location '$frontendPath'
    Write-Host '🎨 Frontend Web Interface' -ForegroundColor Green
    Write-Host 'Running on http://localhost:5173' -ForegroundColor Cyan
    Write-Host ''
    npm run dev
    pause
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript

Write-Host ""
Write-Host "✓ Services are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  📊 Backend API:      http://localhost:3001" -ForegroundColor White
Write-Host "  🌐 Web Interface:    http://localhost:5173" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "  - Wait 10-15 seconds for services to start"
Write-Host "  - Check the new terminal windows for any errors"
Write-Host "  - Press Ctrl+C in any terminal to stop that service"
Write-Host ""
Write-Host "📖 Documentation:" -ForegroundColor Cyan
Write-Host "  - Backend: apps\api\README.md"
Write-Host "  - Frontend: apps\web\WEB_INTERFACE_GUIDE.md"
Write-Host "  - Setup Guide: SETUP_GUIDE.md"
Write-Host ""
Write-Host "Press any key to open the web interface in your browser..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "✓ Web interface opened in browser" -ForegroundColor Green
Write-Host "✓ Platform is running!" -ForegroundColor Green
Write-Host ""
