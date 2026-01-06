# Where to Run Commands

## Project Root Directory
All commands should be run from:
```
D:\Dev\Projects\hackathon\darkdrop
```

## Step-by-Step Instructions

### 1. Open PowerShell/Terminal
Navigate to the project root:
```powershell
cd D:\Dev\Projects\hackathon\darkdrop
```

### 2. Verify You're in the Right Directory
You should see these files:
- `install-anchor-0.29.ps1`
- `build-program.ps1`
- `Anchor.toml`
- `Cargo.toml`
- `programs/` folder

### 3. Install Anchor 0.29.0
**From:** `D:\Dev\Projects\hackathon\darkdrop`
```powershell
.\install-anchor-0.29.ps1
```

### 4. Build the Program
**From:** `D:\Dev\Projects\hackathon\darkdrop`
```powershell
anchor build
```

OR use the build script:
```powershell
.\build-program.ps1
```

## Directory Structure
```
darkdrop/
├── install-anchor-0.29.ps1  ← Run from here
├── build-program.ps1         ← Run from here
├── Anchor.toml
├── Cargo.toml
├── programs/
│   └── darkdrop/
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs
└── ...
```

## Important Notes
- ✅ **Always run commands from:** `D:\Dev\Projects\hackathon\darkdrop`
- ❌ **Don't run from:** `programs\darkdrop` (that's a subdirectory)
- ✅ The scripts handle subdirectories automatically

## Quick Check
Run this to verify you're in the right place:
```powershell
cd D:\Dev\Projects\hackathon\darkdrop
Test-Path install-anchor-0.29.ps1  # Should return: True
Test-Path Anchor.toml              # Should return: True
```


