# DARKDROP

Anonymous Solana dead drops  
No address sharing · No direct on-chain link · Just a code

https://darkdrop.app

## DESCRIPTION

DarkDrop enables irreversible, anonymous value transfers on Solana mainnet using temporary burner keypairs.

The sender funds a freshly generated keypair and receives a claim code (base58 private key or AES-encrypted variant).  
The receiver imports the burner, sweeps funds to their main wallet, and the burner is discarded.

Operational privacy depends on sender using a disposable wallet for funding.  
Mathematical privacy extensions (Token-2022 confidential transfers + Light Protocol) are on the public roadmap.

## FEATURES

- SOL and USDC (Token-2022) support
- Optional password-protected claim codes (AES-256, scrypt-derived)
- QR + plaintext code generation
- Temporary burner import with one-click sweep and purge
- LocalStorage history (50 latest actions, per-browser)
- Full PWA — installable, offline-capable
- Mainnet-only · No devnet fallback

## ROADMAP

/roadmap → https://darkdrop.app/roadmap

v1   Live (November 2025) – Burner-based dead drops  
v2   Q4 2025 / Q1 2026 – Token-2022 confidential transfers + Light Protocol shielded drops  
v3   2026 – Time-locks · Duress mode · Tor mirror · Telegram Mini App

## LOCAL DEVELOPMENT

```bash
git clone https://github.com/hitman-kai/darkdrop.git
cd darkdrop
npm install
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Visit http://localhost:3000  
Wallet must be set to mainnet.

## PRODUCTION DEPLOYMENT

```bash
npm run build
npm run start -- --hostname 0.0.0.0 --port 4000
```

Recommended: Vercel (current deployment method) or static export behind Nginx.

Environment variables (optional):

- NEXT_PUBLIC_SOLANA_MAINNET_RPC   – Custom RPC endpoint (default: public fallback)
- NEXT_PUBLIC_USDC_MAINNET_MINT    – USDC mint (default: EPjFWdd5AufqSSqeM2qxdjQssd1kY9hSx6msvPoN9G)

Use Helius, QuickNode, or Triton for production traffic.

## SECURITY

Private keys are generated client-side and never leave the browser.  
No server component exists. All encryption occurs in-memory using tweetnacl.

Users are responsible for their own operational security.

No warranty. Use at your own risk.
