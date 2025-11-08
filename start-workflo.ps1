# Workflo - One-Click Launcher
# Starts both backend and frontend servers

Write-Host "🚀 Starting Workflo..." -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Function to check if a port is in use
function Test-Port {
    param($Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    return $connection
}

# Function to start a process in a new window
function Start-ServerWindow {
    param(
        [string]$Title,
        [string]$Command,
        [string]$WorkingDirectory,
        [string]$Color
    )
    
    Write-Host "Starting $Title..." -ForegroundColor $Color
    
    $psCommand = "cd '$WorkingDirectory'; $Command"
    
    Start-Process powershell.exe -ArgumentList `
        "-NoExit", `
        "-Command", `
        "& {`$Host.UI.RawUI.WindowTitle='$Title'; Write-Host '🟢 $Title Running' -ForegroundColor $Color; $psCommand}"
}

# Check if PostgreSQL is running
Write-Host "🔍 Checking PostgreSQL (port 5434)..." -ForegroundColor Yellow
if (-not (Test-Port -Port 5434)) {
    Write-Host "⚠️  Warning: PostgreSQL doesn't appear to be running on port 5434" -ForegroundColor Yellow
    Write-Host "   Make sure your database is running before proceeding." -ForegroundColor Yellow
    Write-Host ""
}

# Start Backend Server
$backendPath = Join-Path $scriptPath "apps\api"
Write-Host "📦 Backend Server (NestJS)" -ForegroundColor Green
Write-Host "   Location: $backendPath" -ForegroundColor Gray
Write-Host "   Port: 3000" -ForegroundColor Gray
Start-ServerWindow -Title "Workflo Backend (Port 3000)" `
                   -Command "npm run start:dev" `
                   -WorkingDirectory $backendPath `
                   -Color "Green"

# Wait a bit for backend to initialize
Write-Host ""
Write-Host "⏳ Waiting 5 seconds for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start Frontend Server
$frontendPath = Join-Path $scriptPath "apps\web"
Write-Host ""
Write-Host "🎨 Frontend Server (Vite + React)" -ForegroundColor Cyan
Write-Host "   Location: $frontendPath" -ForegroundColor Gray
Write-Host "   Port: 5173/5174" -ForegroundColor Gray
Start-ServerWindow -Title "Workflo Frontend (Port 5173)" `
                   -Command "npm run dev" `
                   -WorkingDirectory $frontendPath `
                   -Color "Cyan"

# Wait for frontend to start
Write-Host ""
Write-Host "⏳ Waiting 8 seconds for frontend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Try to determine which port Vite is using
$frontendPort = 5173
if (Test-Port -Port 5174) {
    $frontendPort = 5174
}

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "✅ Workflo is starting!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "🔹 Backend API:  " -NoNewline -ForegroundColor Yellow
Write-Host "http://localhost:3000" -ForegroundColor White
Write-Host "🔹 Frontend:     " -NoNewline -ForegroundColor Yellow
Write-Host "http://localhost:$frontendPort" -ForegroundColor White
Write-Host ""
Write-Host "📝 Demo Login:" -ForegroundColor Cyan
Write-Host "   Email:    demo@example.com" -ForegroundColor Gray
Write-Host "   Password: demo123" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

# Ask to open browser
$openBrowser = Read-Host "Open browser now? (Y/n)"
if ($openBrowser -ne 'n' -and $openBrowser -ne 'N') {
    Write-Host "🌐 Opening browser..." -ForegroundColor Green
    Start-Process "http://localhost:$frontendPort"
}

Write-Host ""
Write-Host "✨ Both servers are running in separate windows." -ForegroundColor Green
Write-Host "   Close those windows to stop the servers." -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit this launcher..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
