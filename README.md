# DarkDrop

Anonymous Solana dead drops with no on-chain link between sender and recipient.

## Features
- SOL and USDC drops with optional AES-encrypted claim codes.
- Mainnet-only flows (no devnet fallback).
- QR-based claim + sweep flow with temporary burner wallet import.
- Local-only history (50 most recent create/sweep actions per browser).

## Local Development
```
npm install
npm run dev -- --hostname 0.0.0.0 --port 3000
```
Visit `http://localhost:3000` with your wallet configured for mainnet; the app talks exclusively to mainnet RPCs.

## Production Build / Start
```
npm run build --webpack
npm run start -- --port 4000 --hostname 0.0.0.0
```

## Environment Variables
| Variable | Description | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_SOLANA_MAINNET_RPC` | Optional custom mainnet RPC URL | `https://api.mainnet-beta.solana.com` |
| `NEXT_PUBLIC_USDC_MAINNET_MINT` | Mainnet USDC mint | `EPjFWdd5AufqSSqeM2qxdjQssd1kY9hSx6msvPoN9G` |

Devnet support has been removed. Only mainnet RPCs/mints are honored now, so ensure your wallet and infrastructure point at production endpoints.

## Deployment Notes
1. Export the project (without `.next` / `node_modules`) and copy to the VPS.
2. On the VPS: `npm install`, set the env values above, run `npm run build --webpack`, then `npm run start -- --port <port> --hostname 0.0.0.0`.
3. Use a production RPC (Helius/QuickNode/etc.) to avoid public-endpoint 403s when broadcasting transactions from browsers.
