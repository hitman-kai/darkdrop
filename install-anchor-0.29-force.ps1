# Force Install Anchor 0.29.0
# This script aggressively handles file locking issues

Write-Host "Force Installing Anchor 0.29.0..." -ForegroundColor Cyan

# Step 1: Find and stop all processes using anchor.exe
Write-Host "`nStep 1: Stopping all processes using anchor.exe..." -ForegroundColor Yellow
$anchorPath = "D:\Dev\cargo\bin\anchor.exe"
$processes = Get-Process | Where-Object {
    $_.Path -eq $anchorPath -or 
    $_.CommandLine -like "*anchor*" -or
    $_.ProcessName -like "*anchor*" -or
    $_.ProcessName -like "*cargo*"
} -ErrorAction SilentlyContinue

if ($processes) {
    Write-Host "Found $($processes.Count) processes to stop..." -ForegroundColor Yellow
    $processes | ForEach-Object {
        Write-Host "  Stopping: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 3
} else {
    Write-Host "No processes found using anchor.exe" -ForegroundColor Green
}

# Step 2: Remove anchor.exe with multiple attempts
Write-Host "`nStep 2: Removing existing anchor.exe..." -ForegroundColor Yellow
$attempts = 0
$maxAttempts = 5

while ($attempts -lt $maxAttempts -and (Test-Path $anchorPath)) {
    $attempts++
    Write-Host "  Attempt $attempts/$maxAttempts..." -ForegroundColor Gray
    
    try {
        # Try to remove with different methods
        Remove-Item $anchorPath -Force -ErrorAction Stop
        Write-Host "  ✅ Successfully removed anchor.exe" -ForegroundColor Green
        break
    } catch {
        Write-Host "  ⚠️  Failed: $($_.Exception.Message)" -ForegroundColor Yellow
        if ($attempts -lt $maxAttempts) {
            Write-Host "  Waiting 2 seconds before retry..." -ForegroundColor Gray
            Start-Sleep -Seconds 2
            
            # Try to stop processes again
            Get-Process | Where-Object {$_.Path -eq $anchorPath} | Stop-Process -Force -ErrorAction SilentlyContinue
        }
    }
}

# Step 3: Verify removal
if (Test-Path $anchorPath) {
    Write-Host "`n❌ ERROR: Could not remove anchor.exe after $maxAttempts attempts" -ForegroundColor Red
    Write-Host "`nPlease manually:" -ForegroundColor Yellow
    Write-Host "1. Close ALL terminals, IDEs, and any programs" -ForegroundColor White
    Write-Host "2. Open Task Manager and end any 'anchor' or 'cargo' processes" -ForegroundColor White
    Write-Host "3. Run: Remove-Item $anchorPath -Force" -ForegroundColor White
    Write-Host "4. Then run: avm install 0.29.0 --force" -ForegroundColor White
    exit 1
}

# Step 4: Install Anchor 0.29.0
Write-Host "`nStep 3: Installing Anchor 0.29.0..." -ForegroundColor Yellow
avm install 0.29.0 --force

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Installation failed. Exit code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "`nTry manually:" -ForegroundColor Yellow
    Write-Host "avm install 0.29.0 --force" -ForegroundColor White
    exit 1
}

# Step 5: Switch to Anchor 0.29.0
Write-Host "`nStep 4: Switching to Anchor 0.29.0..." -ForegroundColor Yellow
avm use 0.29.0

# Step 6: Verify installation
Write-Host "`nStep 5: Verifying installation..." -ForegroundColor Yellow
$version = anchor --version 2>&1
if ($version -like "*0.29.0*") {
    Write-Host "`n✅ SUCCESS! Anchor 0.29.0 installed and active" -ForegroundColor Green
    Write-Host "Version: $version" -ForegroundColor Cyan
    Write-Host "`nYou can now run: anchor build" -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️  Warning: Version check returned: $version" -ForegroundColor Yellow
    Write-Host "But installation completed. Try: anchor --version" -ForegroundColor Gray
}


