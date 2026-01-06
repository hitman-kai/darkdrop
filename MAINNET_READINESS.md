# Mainnet Readiness Assessment

## ⚠️ **NOT READY FOR MAINNET** - Critical Issues Found

### 🔴 Critical Security Issues

1. **Access Control Scope**
   - ✅ `create_drop` now requires the config authority signer and enforces a 10-second per-payer cooldown
   - ❗ Still single-signer authority with no multisig and no holistic spam-fee deterrent

2. **Input Validation Coverage**
   - ✅ `amount` must be > 0, `asset_type` limited to SOL/USDC, recipient must differ from payer, expiration must be 1 min–30 days out
   - ❗ No configurable upper bounds or allow-list for assets; more validation needed for future token types

3. **Expiration Logic**
   - ✅ Each drop stores `expires_at`; claims past the deadline auto-set status to `Expired`
   - ✅ `expire_drop` instruction closes expired drops and refunds rent
   - ❗ Still need automated sweeper incentives and monitoring

4. **Upgrade Authority**
   - ✅ On-chain timelock with proposal/cancel/accept flow plus adjustable delays
   - ❗ Still lacks multisig/timelock on the actual program upgrade authority and documented procedures

5. **No Fee Mechanism**
   - No way to collect fees
   - No economic security model
   - Vulnerable to spam attacks

### 🟡 High Priority Issues

6. **Incomplete Error Handling**
   - Limited error codes
   - No detailed error messages
   - Missing edge case handling

7. **Event Emissions (Improved)**
   - ✅ `DropCreated` and `DropClaimed` events emitted
   - ❗ Still need indexer/webhook pipeline to consume events

8. **Testing Coverage**
   - Empty test module
   - No unit tests
   - No integration tests
   - Only manual devnet testing

9. **No Documentation**
   - Missing security documentation
   - No deployment guide
   - No upgrade procedures

10. **Program ID Hardcoded**
    - Devnet program ID in code
    - Needs separate mainnet deployment
    - No environment-based configuration

### 🟢 Medium Priority Issues

11. **No Account Size Limits**
    - Could create many accounts
    - No pagination for queries
    - Potential DoS vector

12. **No Time-based Validation**
    - No minimum/maximum time checks
    - No cooldown periods
    - No rate limiting

13. **Missing Features**
    - No batch operations
    - No cancellation mechanism
    - No refund functionality

### ✅ What's Good

- Uses Anchor framework (security best practices)
- PDA-based accounts (correct derivation)
- Nullifier system prevents double-spending
- Basic error handling exists
- Type safety with Rust

## 📋 Pre-Mainnet Checklist

### Security
- [x] Add access control/authorization checks
- [x] Implement input validation (amount > 0, valid asset_type)
- [x] Add rate limiting/spam protection
- [x] Implement expiration logic
- [ ] Add upgrade authority management (multisig/timelock)
- [ ] Security audit by professional firm
- [ ] Bug bounty program
- [ ] Formal verification (optional but recommended)

### Testing
- [ ] Unit tests for all instructions
- [ ] Integration tests
- [ ] Fuzz testing
- [ ] Load testing
- [ ] Edge case testing
- [ ] Test on testnet for extended period

### Code Quality
- [ ] Code review by multiple developers
- [ ] Documentation complete
- [ ] Error messages improved
- [x] Event emissions added
- [ ] Logging improved

### Operations
- [ ] Mainnet program ID generated
- [ ] Deployment scripts tested
- [ ] Monitoring setup
- [ ] Alerting configured
- [ ] Backup procedures
- [ ] Incident response plan

### Legal/Compliance
- [ ] Terms of service
- [ ] Privacy policy
- [ ] Regulatory compliance check
- [ ] Insurance (if handling funds)

## 🛠️ Recommended Fixes

### 1. Add Access Control

> **Status (Nov 30, 2025):** Implemented via config authority gating and a 10-second per-payer rate limit. Still need multisig/timelock protection and economic fees.
```rust
pub fn create_drop(
    ctx: Context<CreateDrop>,
    nullifier: [u8; 32],
    recipient: Pubkey,
    amount: u64,
    asset_type: u8,
) -> Result<()> {
    // Add validation
    require!(amount > 0, DarkDropError::InvalidAmount);
    require!(asset_type <= 1, DarkDropError::InvalidAssetType); // 0=SOL, 1=USDC
    require!(recipient != ctx.accounts.payer.key(), DarkDropError::InvalidRecipient);
    
    // Add rate limiting check (check recent drops from payer)
    // Add spam protection
    
    // ... rest of code
}
```

### 2. Add Expiration Logic

> **Status (Nov 30, 2025):** Implemented with per-drop `expires_at` validation and automatic expiry on claim. Need follow-up instruction for manual cleanup.
```rust
pub fn expire_drops(ctx: Context<ExpireDrops>) -> Result<()> {
    // Check for expired drops and mark them
    // Only callable by authorized account
}
```

### 3. Add Events

> **Status (Nov 30, 2025):** Implemented (`DropCreated`, `DropClaimed`). Still need indexing pipeline/webhooks.
```rust
#[event]
pub struct DropCreated {
    pub nullifier: [u8; 32],
    pub recipient: Pubkey,
    pub amount: u64,
    pub asset_type: u8,
}

// Emit in create_drop:
emit!(DropCreated {
    nullifier,
    recipient,
    amount,
    asset_type,
});
```

### 4. Add Upgrade Authority
> **Status (Nov 30, 2025):** On-chain config authority timelock implemented (propose/cancel/accept + adjustable delay). Still need multisig/timelock guarding the actual program upgrade authority.
- Use multisig for upgrade authority
- Or timelock for upgrades
- Document upgrade process

## 📊 Risk Assessment

| Risk | Severity | Likelihood | Impact |
|------|----------|------------|--------|
| Spam attacks | Medium | Medium | Medium |
| Invalid drops | Medium | Medium | Low |
| Expired drops occupy rent | Low | Low | Low |
| Upgrade risk | High | Low | High |
| Missing tests | High | Medium | High |

**Overall Risk Level: HIGH** ⚠️

## 🎯 Recommended Timeline

### Phase 1: Security Hardening (2-3 weeks)
- Fix critical security issues
- Add comprehensive tests
- Code review

### Phase 2: Testing (2-3 weeks)
- Extended testnet testing
- Load testing
- Edge case testing

### Phase 3: Audit (4-6 weeks)
- Professional security audit
- Bug fixes from audit
- Re-testing

### Phase 4: Mainnet Deployment (1 week)
- Deploy to mainnet
- Monitor closely
- Gradual rollout

**Total Estimated Time: 2-3 months**

## 💡 Alternative: Deploy with Limitations

If you need to deploy sooner, consider:

1. **Limited Beta**
   - Deploy with strict access control
   - Whitelist only specific addresses
   - Monitor closely
   - Limited amounts

2. **Gradual Rollout**
   - Start with small amounts
   - Increase limits over time
   - Monitor for issues

3. **Insurance**
   - Get insurance coverage
   - Set aside funds for potential issues
   - Have emergency response plan

## 📝 Conclusion

**Current Status: NOT READY FOR MAINNET**

The program needs significant security improvements and testing before mainnet deployment. The core functionality works, but production readiness requires:

1. Security hardening
2. Comprehensive testing
3. Professional audit
4. Operational procedures

**Recommendation**: Complete the security fixes and testing phases before considering mainnet deployment.

