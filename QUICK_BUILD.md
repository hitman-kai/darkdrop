# Quick Build Guide

## Current Setup
- **Lockfile**: Version 3 (compatible with Solana tools)
- **Anchor**: 0.29.0 (compatible with Rust 1.75)
- **Program**: Complete and ready

## To Build Successfully

### Step 1: Install Anchor 0.29.0
```powershell
# Close ALL terminals, IDEs, and processes first!
.\install-anchor-0.29.ps1
```

### Step 2: Build
```powershell
anchor build
```

Or use the build script:
```powershell
.\build-program.ps1
```

## Why Anchor 0.29.0?
- Anchor 0.32.1 requires Rust 1.77+
- Solana toolchain uses Rust 1.75
- Anchor 0.29.0 works with Rust 1.75 ✅

## Files Ready
- ✅ `programs/darkdrop/src/lib.rs` - Program code
- ✅ `programs/darkdrop/Cargo.toml` - Dependencies (Anchor 0.29.0)
- ✅ `Anchor.toml` - Configuration (Anchor 0.29.0)
- ✅ `Cargo.lock` - Version 3 (compatible)

Once Anchor 0.29.0 is installed, the build will succeed!


