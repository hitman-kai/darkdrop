# Manual Anchor 0.29.0 Installation Guide

## The Problem
```powershell
# This command keeps failing:
avm install 0.29.0 --force
# Error: binary `anchor.exe` already exists in destination
```

## Solution: Manual Installation

### Step 1: Close Everything
1. Close ALL PowerShell windows
2. Close your IDE (VS Code, etc.)
3. Open Task Manager (Ctrl+Shift+Esc)
4. End any processes named:
   - `anchor.exe`
   - `cargo.exe`
   - `rustc.exe`
   - `cargo-build-sbf.exe`

### Step 2: Remove anchor.exe
Open a NEW PowerShell window (as Administrator if possible):

```powershell
# Navigate to project
cd D:\Dev\Projects\hackathon\darkdrop

# Remove anchor.exe
Remove-Item D:\Dev\cargo\bin\anchor.exe -Force

# Verify it's gone
Test-Path D:\Dev\cargo\bin\anchor.exe  # Should return: False
```

### Step 3: Install Anchor 0.29.0
```powershell
# Install (this will take a few minutes)
avm install 0.29.0 --force

# If it still fails, try:
# 1. Wait 10 seconds
# 2. Check if anchor.exe was created
# 3. If it exists but is 0 bytes, remove it and try again
```

### Step 4: Switch to Anchor 0.29.0
```powershell
avm use 0.29.0
anchor --version  # Should show: anchor-cli 0.29.0
```

### Step 5: Build
```powershell
cd D:\Dev\Projects\hackathon\darkdrop
anchor build
```

## Alternative: Use Anchor 0.32.1 with Docker

If manual installation keeps failing, use Docker:

```powershell
# Build in Docker container with pre-configured toolchain
docker run -it --rm -v ${PWD}:/workspace -w /workspace solanalabs/solana:latest anchor build
```

## Why Anchor 0.29.0?

- ✅ Compatible with Rust 1.75 (Solana toolchain)
- ✅ All dependencies work together
- ✅ No version conflicts

## Current Status

- ✅ Program code: Complete
- ✅ Configuration: Ready for Anchor 0.29.0
- ⏳ Waiting for: Anchor 0.29.0 installation


