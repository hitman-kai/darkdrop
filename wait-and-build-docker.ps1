# Wait for Docker to start, then build

Write-Host "Waiting for Docker Desktop to start..." -ForegroundColor Cyan

$maxAttempts = 30
$attempt = 0
$dockerReady = $false

while ($attempt -lt $maxAttempts -and -not $dockerReady) {
    $attempt++
    Write-Host "  Attempt $attempt/$maxAttempts - Checking Docker..." -ForegroundColor Gray
    
    $dockerCheck = docker ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerReady = $true
        Write-Host "`n✅ Docker is ready!" -ForegroundColor Green
        break
    }
    
    if ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 2
    }
}

if (-not $dockerReady) {
    Write-Host "`n❌ Docker didn't start in time" -ForegroundColor Red
    Write-Host "`nPlease:" -ForegroundColor Yellow
    Write-Host "1. Make sure Docker Desktop is running" -ForegroundColor White
    Write-Host "2. Look for whale icon in system tray" -ForegroundColor White
    Write-Host "3. Wait for it to say 'Docker Desktop is running'" -ForegroundColor White
    Write-Host "4. Then run: .\build-with-docker.ps1" -ForegroundColor White
    exit 1
}

Write-Host "`nBuilding DarkDrop program..." -ForegroundColor Cyan
.\build-with-docker.ps1


