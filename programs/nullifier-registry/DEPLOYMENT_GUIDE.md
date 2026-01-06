# Deployment Guide: Devnet vs Mainnet

## 🌐 Solana Networks Explained

### Devnet (Development Network)
- ✅ **Free SOL** - Get test SOL via airdrop
- ✅ **No Real Money** - Safe for testing
- ✅ **Resets Periodically** - Fresh start if needed
- ✅ **Fast Testing** - Quick iteration
- ⚠️ **Not Permanent** - Data can be wiped

**Use for:**
- Testing your program
- Debugging
- Learning
- Development

### Mainnet (Production Network)
- ⚠️ **Real SOL** - Costs real money (~2-3 SOL to deploy)
- ⚠️ **Permanent** - Can't undo mistakes
- ✅ **Real Users** - Production environment
- ✅ **Stable** - No resets

**Use for:**
- Production deployment
- Real users
- After thorough testing

## 🚀 Recommended Workflow

```
1. Develop Locally
   ↓
2. Test on Devnet ← START HERE
   ↓
3. Fix Bugs
   ↓
4. Test Again on Devnet
   ↓
5. Deploy to Mainnet ← Only when ready!
```

## 📝 Step-by-Step: Devnet First

### Step 1: Install Anchor (Required First!)

**Windows PowerShell:**
```powershell
# Install Rust first (if not installed)
# Download from https://rustup.rs/

# Then install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install Anchor version manager
avm install latest
avm use latest

# Verify installation
anchor --version
```

**If cargo/rust not found:**
```powershell
# Install Rust first
# Download installer from: https://rustup.rs/
# Run: rustup-init.exe
# Restart PowerShell after installation
```

### Step 2: Set Up Devnet Wallet

```powershell
# Configure Solana CLI for devnet
solana config set --url devnet

# Create a new wallet (if you don't have one)
solana-keygen new

# Get free test SOL
solana airdrop 2

# Check balance
solana balance
```

### Step 3: Build Program

```powershell
cd programs/nullifier-registry

# Build the program
anchor build
```

### Step 4: Deploy to Devnet

```powershell
# Deploy to devnet (FREE, SAFE)
anchor deploy --provider.cluster devnet
```

**Output will show:**
```
Program Id: NulL1f1erR3g1stry1111111111111111111111111
Deploying cluster: https://api.devnet.solana.com
```

### Step 5: Test Your Program

```powershell
# Run tests
anchor test --provider.cluster devnet

# Or test from your Next.js app
# Set: NEXT_PUBLIC_USE_ONCHAIN_NULLIFIER=true
```

### Step 6: Update Program ID

After deployment, update:
- `src/lib/nullifier-onchain.ts` → `NULLIFIER_REGISTRY_PROGRAM_ID`
- `programs/nullifier-registry/src/lib.rs` → `declare_id!("...")`

## 🎯 When to Deploy to Mainnet

**Only deploy to mainnet when:**
- ✅ Program works perfectly on devnet
- ✅ All tests pass
- ✅ You've tested with real transactions
- ✅ You're ready for production
- ✅ You have real SOL (~2-3 SOL for deployment)

**Mainnet Deployment:**
```powershell
# Switch to mainnet
solana config set --url mainnet

# Make sure you have SOL
solana balance

# Deploy (COSTS REAL MONEY!)
anchor deploy --provider.cluster mainnet
```

## 💰 Cost Comparison

| Network | Deploy Cost | Per Transaction | SOL Type |
|---------|-------------|-----------------|----------|
| **Devnet** | FREE | FREE | Test SOL |
| **Mainnet** | ~2-3 SOL | ~0.00001 SOL | Real SOL |

## ⚠️ Common Mistakes

### ❌ Don't:
- Deploy to mainnet without testing on devnet first
- Use real SOL on devnet (it's test SOL!)
- Skip testing

### ✅ Do:
- Always test on devnet first
- Get free test SOL via airdrop
- Test thoroughly before mainnet
- Keep devnet and mainnet program IDs separate

## 🔄 Devnet vs Mainnet Program IDs

**Important:** Program IDs are different on each network!

- **Devnet Program ID**: `NulL1f1erR3g1stry...` (devnet address)
- **Mainnet Program ID**: `NulL1f1erR3g1stry...` (mainnet address)

You can deploy the same program to both networks, but they'll have different addresses.

## 📚 Quick Reference

```powershell
# Devnet (Testing)
solana config set --url devnet
solana airdrop 2                    # Get free test SOL
anchor deploy --provider.cluster devnet

# Mainnet (Production)
solana config set --url mainnet
solana balance                      # Check real SOL balance
anchor deploy --provider.cluster mainnet  # Costs real SOL!
```

## 🎓 Why Devnet First?

1. **Free Testing** - No cost to experiment
2. **Safe Learning** - Can't lose real money
3. **Quick Iteration** - Fast feedback loop
4. **Bug Discovery** - Find issues before production
5. **Best Practice** - Industry standard workflow

---

**TL;DR**: Use devnet for testing (free, safe), mainnet for production (costs real SOL, permanent). Always test on devnet first! 🚀


