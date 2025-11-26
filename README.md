# DARKDROP

Anonymous Solana dead drops  
No address sharing Â· No direct on-chain link Â· Just a code

https://darkdrop.app

## DESCRIPTION

DarkDrop enables irreversible, anonymous value transfers on Solana mainnet or devnet using temporary burner keypairs.

The sender funds a freshly generated keypair and receives a claim code (base58 private key or AES-encrypted variant).  
The receiver imports the burner, sweeps funds to their main wallet, and the burner is discarded.

Operational privacy depends on sender using a disposable wallet for funding.  
Mathematical privacy extensions (Token-2022 confidential transfers + Light Protocol) are on the public roadmap.

## FEATURES

- SOL + cUSDC (Token-2022) support
- Optional password-protected claim codes (AES-256, scrypt-derived)
- QR + plaintext code generation
- Temporary burner import with one-click sweep and purge
- LocalStorage history (50 latest actions, per-browser)
- Full PWA â€” installable, offline-capable
- Mainnet + Devnet toggle (select at runtime)

## ROADMAP

/roadmap â†’ https://darkdrop.app/roadmap

v1   Live (November 2025) â€“ Burner-based dead drops  
v2   Q4 2025 / Q1 2026 â€“ Token-2022 confidential transfers + Light Protocol shielded drops  
v3   2026 â€“ Time-locks Â· Duress mode Â· Tor mirror Â· Telegram Mini App

## LOCAL DEVELOPMENT

```bash
git clone https://github.com/hitman-kai/darkdrop.git
cd darkdrop
npm install
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Visit http://localhost:3000  
Set your wallet to match the selected cluster (Mainnet Beta or Devnet).

## PRODUCTION DEPLOYMENT

```bash
npm run build
npm run start -- --hostname 0.0.0.0 --port 4000
```

Recommended: Vercel (current deployment method) or static export behind Nginx.

Environment variables (optional):

- NEXT_PUBLIC_SOLANA_MAINNET_RPC   – Custom Mainnet RPC endpoint (default: public fallback)
- NEXT_PUBLIC_SOLANA_DEVNET_RPC    – Custom Devnet RPC endpoint (default: api.devnet.solana.com)
- NEXT_PUBLIC_CUSDC_MAINNET_MINT   – Token-2022 cUSDC mint on mainnet (required; falls back to NEXT_PUBLIC_USDC_MAINNET_MINT if set)
- NEXT_PUBLIC_CUSDC_DEVNET_MINT    – Token-2022 cUSDC mint on devnet (required for devnet drops)
- NEXT_PUBLIC_DEFAULT_CLUSTER      – `mainnet` (default) or `devnet`

Devnet setup + mint creation walkthrough: [`docs/devnet-testing.md`](./docs/devnet-testing.md).

Use Helius, QuickNode, or Triton for production traffic.

## SECURITY

Private keys are generated client-side and never leave the browser.  
No server component exists. All encryption occurs in-memory using tweetnacl.

Users are responsible for their own operational security.

No warranty. Use at your own risk.

## DEVELOPMENT PROTOCOL

- `main` == production v1. Do not land experimental work here.
- All Token-2022 / Light Protocol / confidential-transfer work must stay on the `v2-confidential` branch.
- Every time you touch v2, update `DEV_FLOW.md` in the repo root with status + next steps so the next operator can resume.
- Merge back into `main` only after v2 is complete, reviewed, and signed off for release.
