# Fix avm installation by monitoring and removing anchor.exe during build
# This script watches for anchor.exe creation and removes it immediately

Write-Host "Installing Anchor 0.29.0 with file watcher..." -ForegroundColor Cyan

$anchorPath = "D:\Dev\cargo\bin\anchor.exe"
$binDir = "D:\Dev\cargo\bin"

# Ensure directory exists
if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}

# Remove existing anchor.exe
Remove-Item $anchorPath -Force -ErrorAction SilentlyContinue
Write-Host "Removed existing anchor.exe" -ForegroundColor Green

# Start file watcher in background
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $binDir
$watcher.Filter = "anchor.exe"
$watcher.NotifyFilter = [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::CreationTime
$watcher.EnableRaisingEvents = $true

$action = {
    $path = $Event.SourceEventArgs.FullPath
    $name = $Event.SourceEventArgs.Name
    $changeType = $Event.SourceEventArgs.ChangeType
    
    if ($changeType -eq "Created" -and $name -eq "anchor.exe") {
        Start-Sleep -Milliseconds 500
        $file = Get-Item $path -ErrorAction SilentlyContinue
        if ($file -and $file.Length -lt 1000) {
            Write-Host "  Removing newly created anchor.exe (size: $($file.Length) bytes)" -ForegroundColor Yellow
            Remove-Item $path -Force -ErrorAction SilentlyContinue
        }
    }
}

Register-ObjectEvent -InputObject $watcher -EventName "Created" -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName "Changed" -Action $action | Out-Null

Write-Host "File watcher started (will remove anchor.exe if created during build)" -ForegroundColor Yellow
Write-Host "Installing Anchor 0.29.0..." -ForegroundColor Cyan

# Install Anchor
avm install 0.29.0 --force

# Stop watcher
$watcher.EnableRaisingEvents = $false
$watcher.Dispose()
Get-EventSubscriber | Unregister-Event

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Installation successful!" -ForegroundColor Green
    avm use 0.29.0
    anchor --version
} else {
    Write-Host "`n❌ Installation failed" -ForegroundColor Red
    Write-Host "Try Docker approach instead: .\build-with-docker.ps1" -ForegroundColor Yellow
}


