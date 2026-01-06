# DarkDrop Quick Reference Guide

## 🚀 Quick Start

### Program Info
- **Program ID**: `95XwPFvP6znDJN2XS4JRp29NjUNGEKDAmCRfKaZEzNfw`
- **Network**: Devnet
- **Status**: Working, NOT mainnet-ready

### Key Files
- **Program**: `programs/darkdrop/src/lib.rs`
- **SDK**: `src/lib/darkdrop-program.ts`
- **Tests**: `test-program-simple.ts`

### Build & Deploy
```powershell
# Build (Docker)
docker build -t darkdrop-builder .
docker run -v D:\Dev\Projects\hackathon\darkdrop:/workspace darkdrop-builder anchor build

# Deploy
.\deploy-devnet.ps1

# Test
npx tsx test-program-simple.ts
```

## 📋 Instructions

### create_drop
- **Discriminator**: `[0x9d, 0x8e, 0x91, 0xf7, 0x5c, 0x49, 0x3b, 0x30]`
- **Accounts**: drop (PDA), nullifier_account (PDA), config (PDA), rate_limit_account (PDA), payer, system_program
- **Params**: nullifier[32], recipient, amount, asset_type, expires_at (Unix ts)

### claim_drop
- **Discriminator**: `[0x9d, 0x1d, 0x59, 0x0e, 0x51, 0xcb, 0x6b, 0x3a]`
- **Accounts**: drop (PDA), nullifier_account (PDA), claimer
- **Params**: nullifier[32]

### expire_drop
- **Discriminator**: `[0xb9, 0x3a, 0x8b, 0xfb, 0xeb, 0xf2, 0x43, 0x68]`
- **Accounts**: drop (PDA, close), nullifier_account (PDA, close), config (PDA), authority, rent_collector
- **Params**: nullifier[32]

### propose_authority
- **Discriminator**: `[0x14, 0x94, 0xec, 0xc6, 0x4c, 0x77, 0x63, 0x8e]`
- **Accounts**: config (PDA), authority signer
- **Params**: new_authority pubkey

### cancel_authority_proposal
- **Discriminator**: `[0xea, 0x34, 0xdd, 0x5e, 0xb3, 0xaf, 0xdb, 0x72]`
- **Accounts**: config (PDA), authority signer

### accept_authority
- **Discriminator**: `[0x6b, 0x56, 0xc6, 0x5b, 0x21, 0x0c, 0x6b, 0xa0]`
- **Accounts**: config (PDA), pending authority signer

### update_authority_delay
- **Discriminator**: `[0xf8, 0x02, 0xea, 0x9d, 0xda, 0x07, 0x06, 0x89]`
- **Accounts**: config (PDA), authority signer
- **Params**: delay_seconds (i64, 15 min–7 days)

## 🔐 PDA Derivation

```typescript
// Drop PDA
[Buffer.from("drop"), nullifierBytes]

// Nullifier PDA
[Buffer.from("nullifier"), nullifierBytes]

// Config PDA
[Buffer.from("config")]

// Rate limit PDA
[Buffer.from("rate_limit"), payer.toBuffer()]
```

## ⚠️ Critical Issues

1. Config authority still single-signer (need multisig for upgrades)
2. Validation lacks configurable upper bounds/asset allow-lists
3. `expire_drop` is manual—need automation/incentives
4. No fee mechanism / spam resistance beyond cooldowns
5. No security audit yet

## 📊 Test Results

✅ Create Drop: Working  
✅ Claim Drop: Working  
✅ Double Claim Prevention: Working

## 🔗 Resources

- **Full Handoff**: `HANDOFF_DOCUMENT.md`
- **Mainnet Readiness**: `MAINNET_READINESS.md`
- **Deployment Guide**: `DEPLOY_GUIDE.md`

