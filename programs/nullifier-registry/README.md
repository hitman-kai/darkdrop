# Nullifier Registry Program

## 📍 Where Things Live

### On Your Laptop (Local Development)
- ✅ **Source Code**: `programs/nullifier-registry/src/lib.rs` (Rust code)
- ✅ **Configuration**: `Anchor.toml`, `Cargo.toml`
- ✅ **Build Output**: `target/` directory (after building)

### On Solana Blockchain (After Deployment)
- ✅ **Deployed Program**: Lives on Solana validators (devnet/mainnet)
- ✅ **Program ID**: Unique address on blockchain (e.g., `NulL1f1erR3g1stry...`)
- ✅ **Nullifier Accounts**: PDA accounts stored on-chain

## 🔄 Workflow

```
Your Laptop                    Solana Blockchain
─────────────────              ──────────────────
1. Write Code                  (empty)
   programs/nullifier-registry/
   
2. Build Program               (empty)
   anchor build
   → Creates .so file
   
3. Deploy Program              Program deployed
   anchor deploy                Program ID assigned
                                Program runs on validators
   
4. Your App Calls              Program executes
   (TypeScript code)            On-chain verification
                                PDA accounts created
```

## 🚀 Quick Start

### 1. Install Tools (One-Time Setup)

**Windows (PowerShell):**
```powershell
# Install Rust
# Download from https://rustup.rs/ or:
Invoke-WebRequest https://win.rustup.rs/x86_64 -OutFile rustup-init.exe
.\rustup-init.exe

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install Solana CLI
# Download from https://docs.solana.com/cli/install-solana-cli-tools
# Or use WSL (Windows Subsystem for Linux)
```

**Mac/Linux:**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

### 2. Build the Program (On Your Laptop)

```bash
cd programs/nullifier-registry

# Build (creates .so file in target/)
anchor build
```

This compiles your Rust code into a `.so` (shared object) file that Solana can execute.

### 3. Deploy to Devnet (Test Network)

```bash
# Make sure you have a Solana wallet with SOL
solana config set --url devnet
solana airdrop 2  # Get free SOL for testing

# Deploy the program
anchor deploy --provider.cluster devnet
```

**What happens:**
- Your `.so` file is uploaded to Solana devnet
- A Program ID is assigned (or uses the one in `lib.rs`)
- The program is now **running on Solana validators** (not your laptop!)

### 4. Update Your App Code

After deployment, update the program ID in:
- `src/lib/nullifier-onchain.ts` → `NULLIFIER_REGISTRY_PROGRAM_ID`
- `programs/nullifier-registry/src/lib.rs` → `declare_id!("...")`

### 5. Enable in Your App

```bash
# .env.local
NEXT_PUBLIC_USE_ONCHAIN_NULLIFIER=true
```

## 📦 What Gets Deployed?

When you run `anchor deploy`:

1. **Program Binary** (`.so` file)
   - Uploaded to Solana blockchain
   - Stored on-chain
   - Executed by validators

2. **Program ID**
   - Unique address (like `NulL1f1erR3g1stry...`)
   - Used to call the program
   - Stored in your code

3. **Nothing Else**
   - No files copied to blockchain
   - No source code uploaded
   - Only the compiled binary

## 🔍 How It Works

### Your Laptop (Development)
```
You write code → Build → Deploy
```

### Solana Blockchain (Runtime)
```
User calls program → Validator executes → Results stored on-chain
```

### Example Flow:

1. **User claims drop** (in your Next.js app)
2. **Your app** calls the nullifier program (on-chain)
3. **Solana validator** executes the program
4. **Program** checks/marks nullifier PDA account
5. **Result** stored on-chain

## 💰 Costs

### One-Time Costs:
- **Deploy Program**: ~2-3 SOL (rent for program account)
- **Program Account**: Permanent storage on-chain

### Per-Transaction Costs:
- **Mark Nullifier**: ~0.00001 SOL (transaction fee)
- **Nullifier PDA**: ~0.00144 SOL (rent exemption, one-time per nullifier)

## 🛠️ Development vs Production

### Development (Your Laptop)
- ✅ Edit code locally
- ✅ Test locally with `anchor test`
- ✅ Deploy to devnet for testing

### Production (Solana Mainnet)
- ✅ Deploy once: `anchor deploy --provider.cluster mainnet`
- ✅ Program runs forever on validators
- ✅ No need to keep laptop running
- ✅ Program is decentralized (runs on all validators)

## ❓ FAQ

**Q: Do I need to keep my laptop running?**
A: No! Once deployed, the program runs on Solana validators. Your laptop is only needed for development/deployment.

**Q: Can I update the program?**
A: Yes, but you need to deploy a new version. Old version stays on-chain.

**Q: Where is the program stored?**
A: On Solana blockchain, replicated across all validators.

**Q: Can I delete it?**
A: You can close the program account (reclaim rent), but the program binary stays on-chain.

**Q: Do I need a server?**
A: No! The program runs on Solana validators. Your Next.js app just calls it.

## 📚 Next Steps

1. Install tools (see Quick Start)
2. Build: `anchor build`
3. Deploy to devnet: `anchor deploy --provider.cluster devnet`
4. Test with your app
5. Deploy to mainnet when ready

---

**Remember**: The program code is on your laptop, but once deployed, it runs on Solana blockchain! 🚀


