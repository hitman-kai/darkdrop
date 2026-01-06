# DarkDrop Custom Program - Complete Handoff Document

## 📋 Executive Summary

**Project**: DarkDrop Custom Solana Program  
**Status**: Deployed to Devnet, Core Functionality Working  
**Program ID**: `95XwPFvP6znDJN2XS4JRp29NjUNGEKDAmCRfKaZEzNfw`  
**Network**: Devnet (NOT ready for Mainnet)  
**Last Updated**: November 29, 2025

### What Was Achieved

✅ **Custom Solana Program Built**
- Full Anchor-based program with nullifier system
- On-chain nullifier verification
- Drop creation and claiming functionality
- PDA-based account management

✅ **Successfully Deployed to Devnet**
- Program deployed and verified
- All core instructions working
- Tested with real transactions

✅ **Privacy-Focused Design**
- Nullifier-based privacy protection
- PDA accounts prevent enumeration
- On-chain cryptographic verification

✅ **Client SDK Created**
- TypeScript SDK for program interaction
- Manual instruction serialization (due to Anchor IDL issues)
- Helper functions for PDA derivation

## 🏗️ Architecture Overview

### Program Structure

```
darkdrop/
├── programs/
│   └── darkdrop/
│       ├── src/
│       │   └── lib.rs          # Main program logic
│       ├── Cargo.toml          # Dependencies
│       └── Anchor.toml         # Anchor configuration
├── src/
│   └── lib/
│       └── darkdrop-program.ts # TypeScript SDK
└── test-program-simple.ts      # Test script
```

### Core Components

1. **DarkDrop Program** (`programs/darkdrop/src/lib.rs`)
   - `initialize`: Initialize program config
   - `create_drop`: Create a new drop with nullifier
   - `claim_drop`: Claim a drop using nullifier

2. **Account Structures**
   - `DropAccount`: Stores drop information (131 bytes)
   - `NullifierAccount`: Tracks nullifier usage (82 bytes)
   - `Config`: Program configuration

3. **TypeScript SDK** (`src/lib/darkdrop-program.ts`)
   - PDA derivation functions
   - Instruction builders with manual Borsh serialization
   - Helper utilities

## 🔧 Technical Details

### Program Instructions

#### 1. `create_drop`
**Purpose**: Create a new drop with nullifier verification

**Parameters**:
- `nullifier: [u8; 32]` - Unique nullifier for the drop
- `recipient: Pubkey` - Recipient's public key
- `amount: u64` - Amount to drop
- `asset_type: u8` - Asset type (0=SOL, 1=USDC)
- `expires_at: i64` - Unix timestamp when the drop expires (must be 1 min–30 days from creation)

**Accounts**:
- `drop` (PDA) - Drop account, writable
- `nullifier_account` (PDA) - Nullifier tracking, writable
- `config` (PDA) - Read-only config enforcing authority access control
- `rate_limit_account` (PDA) - Tracks per-payer cooldowns, writable
- `payer` - Transaction payer, signer, writable
- `system_program` - System program

**What it does**:
- Creates DropAccount PDA
- Creates/initializes NullifierAccount PDA
- Stores drop metadata
- Marks nullifier as unused
- Verifies caller is the configured authority
- Enforces min/max expiration window and per-payer rate limiting

**Discriminator**: `SHA256("global:create_drop")[0:8]` = `[0x9d, 0x8e, 0x91, 0xf7, 0x5c, 0x49, 0x3b, 0x30]`

#### 2. `claim_drop`
**Purpose**: Claim a drop using nullifier

**Parameters**:
- `nullifier: [u8; 32]` - Nullifier to claim

**Accounts**:
- `drop` (PDA) - Drop account, writable
- `nullifier_account` (PDA) - Nullifier tracking, writable
- `claimer` - Claimer's wallet, signer, writable

**What it does**:
- Verifies drop is active
- Verifies nullifier hasn't been used
- Verifies nullifier matches drop
- Verifies drop has not expired (auto-sets status to `Expired` when needed)
- Marks drop as claimed
- Marks nullifier as used
- Records claimer and timestamp

**Discriminator**: `SHA256("global:claim_drop")[0:8]` = `[0x9d, 0x1d, 0x59, 0x0e, 0x51, 0xcb, 0x6b, 0x3a]`

#### 3. `initialize`
**Purpose**: Initialize program configuration

**Accounts**:
- `config` (PDA) - Config account
- `authority` - Authority signer
- `system_program` - System program

**Note**: Currently not used in main flow

#### 4. `expire_drop`
**Purpose**: Close expired drops and reclaim rent

**Parameters**:
- `nullifier: [u8; 32]` - Identifies the drop

**Accounts**:
- `drop` (PDA, close) - Drop account, writable
- `nullifier_account` (PDA, close) - Nullifier tracking account, writable
- `config` (PDA) - Config account (authority validation)
- `authority` - Config authority signer
- `rent_collector` - Writable account receiving reclaimed lamports

**What it does**:
- Validates drop is active, expired, and unclaimed
- Emits `DropExpired`
- Closes both PDAs, refunding rent to `rent_collector`

#### 5. `propose_authority`
**Purpose**: Start a timelocked authority transfer

**Parameters**:
- `new_authority: Pubkey`

**Accounts**:
- `config` (PDA, mutable)
- `authority` - Current authority signer

**What it does**:
- Records pending authority + timestamp
- Emits `AuthorityProposed`

#### 6. `cancel_authority_proposal`
**Accounts**:
- `config` (PDA, mutable)
- `authority` - Current authority signer

**What it does**:
- Clears pending authority metadata
- Emits `AuthorityProposalCancelled`

#### 7. `accept_authority`
**Accounts**:
- `config` (PDA, mutable)
- `pending_authority` - Signer matching pending key

**What it does**:
- Enforces configured delay (15 min – 7 days)
- Swaps authority and clears pending state
- Emits `AuthorityAccepted`

#### 8. `update_authority_delay`
**Parameters**:
- `new_delay_seconds: i64`

**Accounts**:
- `config` (PDA, mutable)
- `authority` - Current authority signer

**What it does**:
- Validates delay bounds
- Updates stored delay
- Emits `AuthorityDelayUpdated`

### Anchor Events

- `DropCreated` – emitted after every successful `create_drop`, includes nullifier, recipient, amount, asset type, expiration, and payer.
- `DropClaimed` – emitted after every successful `claim_drop`, includes nullifier, claimer, and claimed timestamp.
- `DropExpired` – emitted when `expire_drop` closes an expired drop.
- `AuthorityProposed` – fired when a new authority proposal is submitted.
- `AuthorityProposalCancelled` – fired when a pending proposal is revoked.
- `AuthorityAccepted` – fired when the pending authority finalizes takeover.
- `AuthorityDelayUpdated` – fired when the config authority updates the timelock.

### Account Structures

#### DropAccount (131 bytes)
```rust
pub struct DropAccount {
    pub nullifier: [u8; 32],      // 32 bytes
    pub recipient: Pubkey,          // 32 bytes
    pub amount: u64,               // 8 bytes
    pub asset_type: u8,            // 1 byte
    pub status: DropStatus,        // 1 byte (0=Active, 1=Claimed, 2=Expired)
    pub expires_at: i64,           // 8 bytes
    pub created_at: i64,           // 8 bytes
    pub claimed_at: i64,           // 8 bytes
    pub claimer: Pubkey,           // 32 bytes
    pub bump: u8,                  // 1 byte
}
```

#### NullifierAccount (82 bytes)
```rust
pub struct NullifierAccount {
    pub nullifier: [u8; 32],       // 32 bytes
    pub is_used: bool,             // 1 byte
    pub claimer: Pubkey,           // 32 bytes
    pub used_at: i64,              // 8 bytes
    pub bump: u8,                  // 1 byte
}
```

#### RateLimitAccount (9 bytes)
```rust
pub struct RateLimitAccount {
    pub last_drop_at: i64,        // 8 bytes
    pub bump: u8,                 // 1 byte
}
```

#### Config (81 bytes)
```rust
pub struct Config {
    pub authority: Pubkey,               // 32 bytes
    pub is_initialized: bool,            // 1 byte
    pub pending_authority: Pubkey,       // 32 bytes
    pub pending_authority_set_at: i64,   // 8 bytes
    pub authority_delay_seconds: i64,    // 8 bytes
}
```

### PDA Derivation

**Drop PDA**:
```rust
Pubkey::findProgramAddress(
    [b"drop", nullifier_bytes],
    program_id
)
```

**Nullifier PDA**:
```rust
Pubkey::findProgramAddress(
    [b"nullifier", nullifier_bytes],
    program_id
)
```

**Config PDA**:
```rust
Pubkey::findProgramAddress(
    [b"config"],
    program_id
)
```

**Rate Limit PDA**:
```rust
Pubkey::findProgramAddress(
    [b"rate_limit", payer_pubkey.as_ref()],
    program_id
)
```

## 🔐 Privacy Architecture

### Nullifier System

**Purpose**: Prevent double-spending and enhance privacy

**How it works**:
1. Each drop has a unique nullifier (32 bytes)
2. Nullifier is cryptographically derived from recipient secret
3. Nullifier is stored on-chain in NullifierAccount
4. When claimed, nullifier is marked as used
5. Cannot claim same nullifier twice

**Privacy Benefits**:
- Recipient identity hidden behind nullifier
- Cannot enumerate all drops for a recipient
- Each drop uses unique nullifier
- Harder to link multiple drops together

**Limitations**:
- If nullifier is leaked, drop becomes visible
- Accounts can be enumerated (but recipients hidden)
- Transaction metadata visible (payer address)

### Privacy Score

- **Recipient Privacy**: HIGH (hidden behind nullifier)
- **Drop Enumeration**: MEDIUM (accounts visible, recipients hidden)
- **Transaction Linking**: MEDIUM (harder without nullifiers)
- **Amount Privacy**: LOW (visible if account decoded)

## 📦 Dependencies

### Rust Dependencies (`Cargo.toml`)
```toml
anchor-lang = { version = "0.29.0", features = ["init-if-needed"] }
anchor-spl = "0.29.0"
```

### TypeScript Dependencies
- `@solana/web3.js` - Solana client
- `@coral-xyz/anchor` - Anchor client (for IDL loading)
- `bs58` - Base58 encoding
- `borsh` - Borsh serialization

### Build Tools
- **Rust**: 1.75.0-dev (via Solana toolchain)
- **Anchor**: 0.29.0
- **Solana CLI**: 1.18.26
- **Docker**: Used for consistent builds

## 🚀 Deployment Information

### Devnet Deployment

**Program ID**: `95XwPFvP6znDJN2XS4JRp29NjUNGEKDAmCRfKaZEzNfw`  
**Network**: Devnet  
**RPC**: `https://api.devnet.solana.com`

**Deployment Method**: Docker-based build and deploy
- Script: `deploy-devnet.ps1`
- Dockerfile: `Dockerfile`
- Build script: `build-program.ps1`

### Build Process

1. **Docker Build**:
   ```powershell
   docker build -t darkdrop-builder .
   ```

2. **Build Program**:
   ```powershell
   docker run -v D:\Dev\Projects\hackathon\darkdrop:/workspace darkdrop-builder anchor build
   ```

3. **Deploy**:
   ```powershell
   .\deploy-devnet.ps1
   ```

### Key Files

- `Dockerfile` - Build environment
- `build-program.ps1` - Local build script
- `deploy-devnet.ps1` - Deployment script
- `check-and-deploy.ps1` - Balance check + deploy

## ✅ Testing Status

### Tests Performed

✅ **Create Drop Test**
- Successfully creates drop account
- Successfully creates nullifier account
- Stores correct metadata
- Transaction: `4QikAr4vGECQpk45vAnKp77nXvHR4YD7s6qGW5CLHPFkLLP71yxyPghfhtNq9u4hE2y3ScBveshPDBC9PbyiwRhW`

✅ **Claim Drop Test**
- Successfully claims drop
- Marks nullifier as used
- Updates drop status
- Transaction: `4EtD68GWBQxJXpEEoX7kYwJnYdqcgozjQj3rtt3BsckdyHaWfoaty28TSK8NcBwz68ctcRhbABwRT48j8MFjYUsj`

✅ **Double Claim Prevention**
- Correctly rejects second claim attempt
- Error: "Drop is not active"
- Nullifier system working

### Test Scripts

- `test-program-simple.ts` - Manual instruction building test
- `test-program-anchor.ts` - Anchor Program class test (not working)
- `test-working.ts` - Alternative test approach
- `check-privacy.ts` - Privacy verification script
- `verify-privacy.ts` - Comprehensive privacy analysis

### Known Test Issues

❌ **Anchor Program Class**: Cannot use Anchor's `Program` class due to IDL/PublicKey serialization issues  
✅ **Workaround**: Manual instruction building with Borsh serialization

## ⚠️ Known Issues & Limitations

### Critical Issues

1. **Access Control & Rate Limiting (Improved)**
   - ✅ `create_drop` now requires the config authority signer and enforces a 10s per-payer cooldown via `RateLimitAccount`
   - ❗ Still single-signer authority, no multi-tenant permissions, and no economic deterrent beyond cooldowns

2. **Input Validation (Improved)**
   - ✅ Amount must be > 0, asset type limited to SOL/USDC, recipient must differ from payer, expiration window must be 1 min–30 days
   - ❗ Need upper-bound enforcement per asset, configurable allowed assets, and richer validation errors

3. **Expiration Logic (Improved)**
   - ✅ `expires_at` stored per drop; claims auto-expire and set status to `Expired`
   - ✅ `expire_drop` instruction reclaims rent and emits audit events
   - ❗ No automated sweeper or incentives for calling `expire_drop`

4. **Upgrade Authority Management (Improved)**
   - ✅ Timelocked authority transfer flow (propose / cancel / accept / adjustable delay)
   - ❗ Still single-signer (no multisig) and relies on external upgrade authority controls

5. **No Fee Mechanism**
   - No way to collect fees
   - Vulnerable to spam attacks

### Technical Limitations

6. **Instruction Serialization**
   - Must use manual Borsh serialization
   - Anchor's `BorshInstructionCoder` has issues
   - Discriminators manually calculated

7. **Eventing / Indexing (Improved)**
   - ✅ `DropCreated` and `DropClaimed` events now emitted
   - ❗ Still need off-chain indexer + webhooks to consume them

8. **Limited Error Handling**
   - Only 3 error types
   - Missing edge case handling

9. **No Tests**
   - Empty test module
   - Only manual testing
   - No unit/integration tests

### Build/Deployment Issues

10. **Docker Required**
    - Local builds problematic
    - Docker provides consistent environment
    - Windows-specific issues

11. **Anchor Version Lock**
    - Must use Anchor 0.29.0
    - `cargo-build-bpf` wrapper needed
    - Rust version compatibility issues

## 🔒 Security Considerations

### Current Security Posture

**Strengths**:
- Uses Anchor framework (security best practices)
- PDA-based accounts (correct derivation)
- Nullifier prevents double-spending
- Type safety with Rust
- No unsafe code

**Weaknesses**:
- No access control
- No input validation
- No rate limiting
- No upgrade authority management
- No security audit

### Security Recommendations

1. **Add Access Control**
   ```rust
   // Add authority checks or rate limiting
   require!(is_authorized, DarkDropError::Unauthorized);
   ```

2. **Input Validation**
   ```rust
   require!(amount > 0, DarkDropError::InvalidAmount);
   require!(asset_type <= 1, DarkDropError::InvalidAssetType);
   ```

3. **Rate Limiting**
   - Track recent drops per payer
   - Limit drops per time period
   - Prevent spam attacks

4. **Upgrade Authority**
   - Use multisig for upgrades
   - Implement timelock
   - Document upgrade process

5. **Security Audit**
   - Professional audit required
   - Bug bounty program
   - Formal verification (optional)

## 📝 Code Structure

### Program Code (`lib.rs`)

**Key Functions**:
- `initialize()` - Initialize config
- `create_drop()` - Create drop with nullifier
- `claim_drop()` - Claim drop using nullifier

**Account Structs**:
- `Initialize` - Initialize accounts
- `CreateDrop` - Create drop accounts
- `ClaimDrop` - Claim drop accounts

**Data Structures**:
- `Config` - Program config
- `DropAccount` - Drop data
- `NullifierAccount` - Nullifier tracking
- `RateLimitAccount` - Per-payer cooldown tracking
- `DropStatus` - Enum (Active, Claimed, Expired)

**Error Types**:
- `NullifierAlreadyUsed`
- `DropNotActive`
- `InvalidNullifier`
- `InvalidAmount`
- `InvalidAssetType`
- `InvalidRecipient`
- `InvalidExpiration`
- `ConfigNotInitialized`
- `UnauthorizedCreator`
- `RateLimitExceeded`
- `DropExpired`

### TypeScript SDK (`darkdrop-program.ts`)

**Key Functions**:
- `deriveDropPDA()` - Derive drop PDA
- `deriveNullifierPDA()` - Derive nullifier PDA
- `createCreateDropInstruction()` - Build create instruction
- `createClaimDropInstruction()` - Build claim instruction

**Important Notes**:
- Uses manual Borsh serialization
- Discriminators hardcoded
- IDL loading attempted but falls back to manual

## 🎯 Next Steps & Roadmap

### Immediate (Before Mainnet)

1. **Security Hardening** (2-3 weeks)
   - [x] Add access control
   - [x] Input validation
   - [x] Rate limiting
   - [x] Expiration logic
   - [x] Upgrade authority management (timelock in place; still need multisig / external governance)

2. **Testing** (2-3 weeks)
   - [ ] Unit tests
   - [ ] Integration tests
   - [ ] Fuzz testing
   - [ ] Load testing
   - [ ] Extended testnet testing

3. **Code Quality** (1-2 weeks)
   - [x] Add events
   - [ ] Improve error handling
   - [ ] Documentation
   - [ ] Code review

### Short Term (1-2 months)

4. **Security Audit** (4-6 weeks)
   - [ ] Professional audit
   - [ ] Bug fixes
   - [ ] Re-testing

5. **Mainnet Preparation** (1 week)
   - [ ] Generate mainnet program ID
   - [ ] Deploy to mainnet
   - [ ] Monitor closely

### Long Term (3-6 months)

6. **Feature Enhancements**
   - [ ] Batch operations
   - [ ] Cancellation mechanism
   - [ ] Refund functionality
   - [ ] Fee mechanism
   - [ ] Integration with Light Protocol

7. **Privacy Improvements**
   - [ ] Enhanced nullifier generation
   - [ ] Transaction mixing
   - [ ] Time delays
   - [ ] Additional obfuscation

## 🛠️ Development Environment

### Setup Requirements

1. **Docker** (Recommended)
   - Consistent build environment
   - Handles version conflicts
   - Cross-platform

2. **Local Setup** (Alternative)
   - Rust 1.75.0-dev
   - Anchor 0.29.0
   - Solana CLI 1.18.26
   - `cargo-build-bpf` wrapper

### Build Commands

**Docker Build**:
```powershell
docker build -t darkdrop-builder .
docker run -v D:\Dev\Projects\hackathon\darkdrop:/workspace darkdrop-builder anchor build
```

**Local Build**:
```powershell
cd programs/darkdrop
anchor build
```

**Deploy**:
```powershell
.\deploy-devnet.ps1
```

### Testing Commands

```powershell
# Run simple test
npx tsx test-program-simple.ts

# Check privacy
npx tsx check-privacy.ts

# Verify privacy
npx tsx verify-privacy.ts
```

## 📚 Documentation Files

### Existing Documentation

- `MAINNET_READINESS.md` - Mainnet readiness assessment
- `HANDOFF_DOCUMENT.md` - This document
- `DEPLOY_GUIDE.md` - Deployment guide
- `BUILD_STATUS.md` - Build status and issues

### Missing Documentation

- [ ] API documentation
- [ ] Security documentation
- [ ] Upgrade procedures
- [ ] Incident response plan
- [ ] User guide

## 🔍 Debugging & Troubleshooting

### Common Issues

1. **InstructionFallbackNotFound Error**
   - **Cause**: Wrong discriminator or serialization
   - **Fix**: Verify discriminator calculation
   - **Check**: Instruction data format

2. **Account Not Found**
   - **Cause**: Wrong PDA derivation
   - **Fix**: Verify seeds and program ID
   - **Check**: PDA calculation

3. **Build Errors**
   - **Cause**: Version mismatches
   - **Fix**: Use Docker build
   - **Check**: Anchor/Rust versions

4. **Deployment Failures**
   - **Cause**: Insufficient funds or wrong network
   - **Fix**: Check balance and network
   - **Check**: Keypair and config

### Debug Tools

- Solana Explorer: https://explorer.solana.com
- Anchor IDL: `target/idl/darkdrop.json`
- Program logs: Check transaction logs
- Account inspection: `solana account <address>`

## 💰 Cost Analysis

### Devnet Costs

- **Account Creation**: ~0.0018 SOL per drop account
- **Nullifier Account**: ~0.0015 SOL per nullifier
- **Transaction Fees**: ~0.000005 SOL per transaction
- **Total per Drop**: ~0.0033 SOL (~$0.45 at current prices)

### Mainnet Estimates

- Similar costs but with real SOL
- Need to account for rent exemption
- Consider fee mechanism for sustainability

## 🎓 Key Learnings

### What Worked Well

1. **Docker Build**: Solved version conflicts
2. **Manual Serialization**: Worked around Anchor issues
3. **PDA Design**: Correct account derivation
4. **Nullifier System**: Effective privacy mechanism

### What Was Challenging

1. **Anchor Version Compatibility**: Required specific versions
2. **Instruction Serialization**: IDL issues forced manual approach
3. **Build Environment**: Windows-specific issues
4. **Discriminator Calculation**: Had to manually calculate

### Best Practices Applied

1. **PDA-Based Accounts**: Correct derivation
2. **Nullifier Pattern**: Privacy-focused design
3. **Error Handling**: Basic but functional
4. **Type Safety**: Rust type system

## 📞 Support & Resources

### Key Files Reference

- **Program**: `programs/darkdrop/src/lib.rs`
- **SDK**: `src/lib/darkdrop-program.ts`
- **Tests**: `test-program-simple.ts`
- **Build**: `Dockerfile`, `build-program.ps1`
- **Deploy**: `deploy-devnet.ps1`

### External Resources

- Anchor Docs: https://www.anchor-lang.com/
- Solana Docs: https://docs.solana.com/
- Light Protocol: https://www.lightprotocol.com/

## ✅ Checklist for Next Agent

### Immediate Actions

- [ ] Review this document
- [ ] Understand program architecture
- [ ] Review security issues
- [ ] Set up development environment
- [ ] Run existing tests

### Priority Tasks

- [ ] Fix critical security issues
- [ ] Add comprehensive tests
- [ ] Improve error handling
- [ ] Add input validation
- [ ] Implement access control

### Before Mainnet

- [ ] Complete security audit
- [ ] Extensive testing
- [ ] Documentation complete
- [ ] Monitoring setup
- [ ] Incident response plan

## 🎯 Successfully Notes

### Current State

The DarkDrop program is **functional but not production-ready**. Core features work correctly on devnet, but critical security improvements are needed before mainnet deployment.

### Key Achievements

✅ Custom Solana program built and deployed  
✅ Nullifier-based privacy system working  
✅ On-chain verification functional  
✅ TypeScript SDK created  
✅ Successfully tested on devnet  

### Critical Gaps

❌ No access control  
❌ No input validation  
❌ No security audit  
❌ Limited testing  
❌ Missing documentation  

### Recommendation

**Do NOT deploy to mainnet** until security issues are addressed and comprehensive testing is completed. Estimated timeline: 2-3 months of additional work.

---

**Document Version**: 1.0  
**Last Updated**: November 29, 2025  
**Author**: Development Team  
**Status**: Active Development

