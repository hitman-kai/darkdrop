# DarkDrop Program Deployment Guide

## What This Program Does

The custom DarkDrop program provides **on-chain nullifier verification** for privacy-focused token drops:

- ✅ **Prevents Double-Claiming**: Uses nullifiers to ensure each drop can only be claimed once
- ✅ **On-Chain Verification**: All checks happen on Solana blockchain (not client-side)
- ✅ **Privacy**: Uses cryptographic nullifiers instead of exposing recipient addresses
- ✅ **Works with Light Protocol**: Can be used with compressed/shielded tokens

## Deployment Steps

### Step 1: Setup Solana Wallet (if needed)

```powershell
# Check if Solana CLI is installed
solana --version

# If not installed, install it:
# Windows: Download from https://docs.solana.com/cli/install-solana-cli-tools

# Configure for devnet
solana config set --url devnet

# Check your wallet address
solana address

# If you don't have a wallet, create one:
solana-keygen new

# Get free devnet SOL (need ~2-3 SOL for deployment)
solana airdrop 2

# Check balance
solana balance
```

### Step 2: Deploy Using Docker

```powershell
# Make sure you're in the darkdrop directory
cd D:\Dev\Projects\hackathon\darkdrop

# Run the deployment script
.\deploy-devnet.ps1
```

### Step 3: Verify Deployment

After deployment, you'll see a Program ID. Verify it:

```powershell
solana program show <PROGRAM_ID> --url devnet
```

### Step 4: Update Your Code (if Program ID changed)

If the program ID changed during deployment, update:
- `programs/darkdrop/src/lib.rs` → `declare_id!("...")`
- `Anchor.toml` → `programs.devnet.darkdrop = "..."`

## What Happens During Deployment

1. **Build Check**: Verifies program is built (builds if needed)
2. **Network Setup**: Configures Solana CLI for devnet
3. **Deployment**: Uploads program binary to devnet
4. **Verification**: Shows deployment status and program ID

## Troubleshooting

**Error: Insufficient funds**
```powershell
solana airdrop 2 --url devnet
```

**Error: Wallet not found**
- Check: `~/.config/solana/id.json` exists
- Or create new: `solana-keygen new`

**Error: Network mismatch**
```powershell
solana config set --url devnet
solana config get
```

## Next Steps After Deployment

1. Test the program with your app
2. Update TypeScript code to use the new program ID
3. Test create_drop and claim_drop functions
4. Deploy to mainnet when ready (costs real SOL!)


