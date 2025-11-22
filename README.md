# DarkDrop

Anonymous Solana dead drops with no on-chain link between sender and recipient.

## Features
- SOL and USDC drops with optional AES-encrypted claim codes.
- Devnet / mainnet toggle (devnet default for launch hardening).
- QR-based claim + sweep flow with temporary burner wallet import.
- Local-only history (50 most recent create/sweep actions per browser).

## Local Development
```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 3000
```
Visit `http://localhost:3000` and use the settings dock (top-right) to choose Devnet or Mainnet. Wallet Adapter auto-reconnects when the cluster changes.

## Production Build / Start
```bash
npm run build --webpack
npm run start -- --port 4000 --hostname 0.0.0.0
```

## Environment Variables
| Variable | Description | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_SOLANA_DEVNET_RPC` | Optional custom devnet RPC URL | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_SOLANA_MAINNET_RPC` | Optional custom mainnet RPC URL | `https://api.mainnet-beta.solana.com` |
| `NEXT_PUBLIC_USDC_DEVNET_MINT` | Devnet USDC mint | `Gh9ZwEmdLJ8DscK9Z9mAjnSVZXvByPCs4s7tT3EPhEE` |
| `NEXT_PUBLIC_USDC_MAINNET_MINT` | Mainnet USDC mint | `EPjFWdd5AufqSSqeM2qxdjQssd1kY9hSx6msvPoN9G` |

Devnet should stay active for testing. Flip the cluster to Mainnet (in the UI or by setting `NEXT_PUBLIC_SOLANA_MAINNET_RPC`) a couple hours after launch once you are ready to use production RPCs.

## Deployment Notes
1. Export the project (without `.next` / `node_modules`) and copy to the VPS.
2. On the VPS: `npm install`, set the env values above, run `npm run build --webpack`, then `npm run start -- --port <port> --hostname 0.0.0.0`.
3. Use a production RPC (Helius/QuickNode/etc.) to avoid public-endpoint 403s when broadcasting transactions from browsers.
