# Manual Anchor 0.29.0 Installation Script
# Run this script when you can close all processes using anchor.exe

Write-Host "Installing Anchor 0.29.0..." -ForegroundColor Cyan
Write-Host "`nIMPORTANT: Close all terminals, IDEs, and any processes using anchor.exe first!" -ForegroundColor Yellow
Write-Host "Press any key to continue after closing processes..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stop any processes using anchor
Write-Host "`nStopping processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.Path -like "*anchor*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Remove existing anchor binary
$anchorPath = "D:\Dev\cargo\bin\anchor.exe"
if (Test-Path $anchorPath) {
    Write-Host "Removing existing anchor.exe..." -ForegroundColor Yellow
    Remove-Item $anchorPath -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Install Anchor 0.29.0
Write-Host "Installing Anchor 0.29.0 via avm..." -ForegroundColor Yellow
avm install 0.29.0 --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSwitching to Anchor 0.29.0..." -ForegroundColor Yellow
    avm use 0.29.0
    anchor --version
    
    Write-Host "`n✅ Anchor 0.29.0 installed successfully!" -ForegroundColor Green
    Write-Host "You can now run: .\build-program.ps1" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Installation failed. Try manually:" -ForegroundColor Red
    Write-Host "1. Close ALL processes using anchor.exe" -ForegroundColor Yellow
    Write-Host "2. Run: Remove-Item D:\Dev\cargo\bin\anchor.exe -Force" -ForegroundColor Yellow
    Write-Host "3. Run: avm install 0.29.0 --force" -ForegroundColor Yellow
    Write-Host "4. Run: avm use 0.29.0" -ForegroundColor Yellow
}


