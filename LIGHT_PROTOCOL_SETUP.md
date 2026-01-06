# Light Protocol Integration Setup

This document describes the Light Protocol integration for DarkDrop v2.

## ⚠️ Current Status: Not Yet Available

**The `@lightprotocol/zk.js` package is deprecated and not compatible with Next.js browser environments.** 

Ultra Private Mode will automatically fall back to burner wallet mode until a browser-compatible Light Protocol SDK is available or we implement a direct API integration.

## Planned Implementation

When Light Protocol releases a browser-compatible SDK or we integrate with their API:

## Environment Variables

Add the following to your `.env.local` file:

```bash
# Light Protocol Relayer URL
# Mainnet: https://mainnet.lightprotocol.com/relayer
# Testnet: https://testnet.lightprotocol.com/relayer (if available)
NEXT_PUBLIC_LIGHT_RELAYER=https://mainnet.lightprotocol.com/relayer

# Feature Flag: Enable Token-2022 zk-elgamal (disabled by default)
# Set to "true" to use Token-2022 confidential transfers instead of Light Protocol
NEXT_PUBLIC_USE_ZK_ELGAMAL=false
```

## Features

### Ultra Private Mode (Light Protocol)

When enabled, drops use Light Protocol's zk-compression for full privacy:
- Amounts are hidden on-chain
- Transaction links are obfuscated
- Uses shielded notes (zk-compression)
- Browser-native, no WASM proof generation needed

### Token-2022 Mode (Legacy)

When `NEXT_PUBLIC_USE_ZK_ELGAMAL=true`, the app uses Token-2022 confidential transfers:
- Requires zk-elgamal proof program to be enabled
- Uses WASM proof generation
- Currently disabled on public devnet/mainnet (Q1 2026 expected)

## Usage

1. **Creating a Shielded Drop:**
   - Enable "Ultra Private Mode" checkbox in the create drop page
   - Enter amount and optional password
   - Click "CREATE DEAD DROP"
   - The app will shield the note via Light Protocol relayer
   - Share the claim code with the recipient

2. **Claiming a Shielded Drop:**
   - Paste or scan the claim code
   - Enter password if encrypted
   - Click "LOAD DROP"
   - Click "UNSHIELD TO MAIN WALLET" to claim

## Fallback Behavior

If Light Protocol relayer is unavailable:
- The app will automatically fall back to burner wallet mode
- A toast notification will show: "Privacy mode unavailable — using secure burner."

## Testing

For mainnet testing:
- Use small amounts (0.001 SOL recommended)
- Verify transactions on Solscan show zk blobs (no visible amounts)
- Test both encrypted and unencrypted claim codes

## Implementation Notes

- Light Protocol client is initialized with relayer URL from environment
- Shielded drops use a different claim code format: `nullifier:shielded:asset[:aes:encrypted_note]`
- Unshielding requires wallet signature (wallet adapter integration needed)
- Token-2022 code is preserved behind feature flag for future use

