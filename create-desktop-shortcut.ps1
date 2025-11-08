# Create Desktop Shortcut for Workflo Launcher

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$batchFile = Join-Path $scriptPath "START-WORKFLO.bat"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "Launch Workflo.lnk"

Write-Host "Creating desktop shortcut..." -ForegroundColor Cyan

$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $batchFile
$Shortcut.WorkingDirectory = $scriptPath
$Shortcut.Description = "Launch Workflo - Start frontend and backend servers"
$Shortcut.IconLocation = "C:\Windows\System32\shell32.dll,43"  # Rocket icon
$Shortcut.Save()

Write-Host ""
Write-Host "✅ Desktop shortcut created!" -ForegroundColor Green
Write-Host ""
Write-Host "Shortcut location: $shortcutPath" -ForegroundColor Gray
Write-Host ""
Write-Host "You can now double-click 'Launch Workflo' on your desktop!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
