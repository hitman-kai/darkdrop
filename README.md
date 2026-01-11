# DARKDROP

```
██████╗  █████╗ ██████╗ ██╗  ██╗██████╗ ██████╗  ██████╗ ██████╗ 
██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝██╔══██╗██╔══██╗██╔═══██╗██╔══██╗
██║  ██║███████║██████╔╝█████╔╝ ██║  ██║██████╔╝██║   ██║██████╔╝
██║  ██║██╔══██║██╔══██╗██╔═██╗ ██║  ██║██╔══██╗██║   ██║██╔═══╝ 
██████╔╝██║  ██║██║  ██║██║  ██╗██████╔╝██║  ██║╚██████╔╝██║     
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝     
```

**Anonymous Solana Transfers**

No address sharing. No on-chain link. Just a code.

[![Live](https://img.shields.io/badge/status-live-brightgreen)]()
[![Solana](https://img.shields.io/badge/network-mainnet-purple)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

**https://darkdrop.app**

---

## Overview

DarkDrop enables private value transfers on Solana using zk-compression and burner keypairs. Sender and receiver never share addresses. The only link is a claim code transmitted off-chain.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DARKDROP SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                 │
│  │   SENDER    │      │   RELAYER   │      │  RECEIVER   │                 │
│  │   WALLET    │      │   SERVICE   │      │   WALLET    │                 │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘                 │
│         │                    │                    │                        │
│         ▼                    │                    │                        │
│  ┌─────────────┐             │                    │                        │
│  │  COMPRESS   │─────────────┼────────────────────┤                        │
│  │  (SHIELD)   │             │                    │                        │
│  └──────┬──────┘             │                    │                        │
│         │                    │                    │                        │
│         ▼                    ▼                    │                        │
│  ┌─────────────────────────────────┐              │                        │
│  │         SHIELDED POOL           │              │                        │
│  │    (Light Protocol Compressed)  │              │                        │
│  │                                 │              │                        │
│  │   ┌───┐ ┌───┐ ┌───┐ ┌───┐      │              │                        │
│  │   │ 1 │ │ 1 │ │ 1 │ │ 1 │ SOL  │              │                        │
│  │   └───┘ └───┘ └───┘ └───┘      │              │                        │
│  └─────────────────┬───────────────┘              │                        │
│                    │                              │                        │
│                    ▼                              ▼                        │
│             ┌─────────────┐              ┌─────────────┐                   │
│             │ DECOMPRESS  │─────────────►│  RECEIVE    │                   │
│             │ (UNSHIELD)  │              │  FUNDS      │                   │
│             └─────────────┘              └─────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## State Machines

### Drop Creation Flow

```
                    ┌─────────────────┐
                    │      IDLE       │
                    └────────┬────────┘
                             │ user selects amount
                             ▼
                    ┌─────────────────┐
                    │ WALLET_CONNECT  │
                    └────────┬────────┘
                             │ wallet connected
                             ▼
                    ┌─────────────────┐
                    │   COMPRESSING   │
                    └────────┬────────┘
                             │ tx confirmed
                             ▼
                    ┌─────────────────┐
                    │  CODE_GENERATED │
                    └────────┬────────┘
                             │ user copies/shares
                             ▼
                    ┌─────────────────┐
                    │    COMPLETE     │
                    └─────────────────┘
```

### Claim Flow

```
                    ┌─────────────────┐
                    │   CODE_INPUT    │
                    └────────┬────────┘
                             │ valid code entered
                             ▼
                    ┌─────────────────┐
                    │   VALIDATING    │──────────┐
                    └────────┬────────┘          │ invalid
                             │ valid             ▼
                             │          ┌─────────────────┐
                             │          │     ERROR       │
                             ▼          └─────────────────┘
                    ┌─────────────────┐
                    │ WALLET_CONNECT  │
                    └────────┬────────┘
                             │ wallet connected
                             ▼
                    ┌─────────────────┐
                    │  DECOMPRESSING  │
                    └────────┬────────┘
                             │ tx confirmed
                             ▼
                    ┌─────────────────┐
                    │    CLAIMED      │
                    └─────────────────┘
```

### Nullifier State

```
    ┌──────────────┐         ┌──────────────┐
    │   UNUSED     │────────►│    USED      │
    └──────────────┘  claim  └──────────────┘
           │                        │
           │                        │
           ▼                        ▼
    (can be claimed)         (permanently spent)
```

---

## Privacy Model

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRIVACY LAYERS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LAYER 1: TRANSACTION PRIVACY                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • ZK Compression (Light Protocol)                        │   │
│  │ • Fixed denominations (0.1, 0.5, 1, 10 SOL)             │   │
│  │ • Shared pool (many deposits, many claims)               │   │
│  │ • Nullifier system (prevents double-spend)               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  LAYER 2: IDENTITY PRIVACY                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • No KYC required                                        │   │
│  │ • Tor routing for RPC calls (planned)                    │   │
│  │ • Burner wallets for operational security                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  LAYER 3: CODE SECURITY                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Optional AES-256 encryption (scrypt-derived key)       │   │
│  │ • Client-side key generation                             │   │
│  │ • No server-side key storage                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Supported Assets

| Asset | Network | Denominations |
|-------|---------|---------------|
| SOL | Mainnet | 0.1, 0.5, 1, 10 |
| USDC | Mainnet | 1, 5, 10, 100 |

---

## Claim Code Format

```
darkdrop:v2:[cluster]:[asset]:[mode]:[encryption]:[payload]

Examples:
├── darkdrop:v2:mainnet:sol:raw:5Kd3NBU...           (unencrypted)
├── darkdrop:v2:mainnet:sol:aes:a1b2c3:Ux7mK...     (password protected)
└── darkdrop:v2:mainnet:sol:compressed:raw:9Xm...   (zk-compressed)
```

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                       │
│  ├── Next.js 15                                                 │
│  ├── TypeScript                                                 │
│  ├── TailwindCSS                                                │
│  └── Solana Wallet Adapter                                      │
├─────────────────────────────────────────────────────────────────┤
│  BLOCKCHAIN                                                     │
│  ├── Solana Mainnet                                             │
│  ├── Light Protocol (zk-compression)                            │
│  ├── SPL Token Program                                          │
│  └── Token-2022 Program                                         │
├─────────────────────────────────────────────────────────────────┤
│  CRYPTOGRAPHY                                                   │
│  ├── tweetnacl (Ed25519, XSalsa20-Poly1305)                    │
│  ├── scrypt (key derivation)                                    │
│  └── AES-256-GCM (optional encryption)                          │
├─────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE                                                 │
│  ├── Vercel (hosting)                                           │
│  ├── Helius (RPC)                                               │
│  └── Vercel KV (nullifier storage)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
darkdrop/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── drop/
│   │   │   ├── create/page.tsx      # Create drop UI
│   │   │   └── claim/page.tsx       # Claim drop UI
│   │   ├── pool/                    # DarkPool (mixing pool)
│   │   │   ├── deposit/page.tsx
│   │   │   └── claim/page.tsx
│   │   ├── api/
│   │   │   ├── relay/               # Relayer endpoints
│   │   │   ├── pool/                # Pool endpoints
│   │   │   └── light-proxy/         # Light Protocol proxy
│   │   └── tg/                      # Telegram Mini App
│   ├── components/                  # UI components
│   ├── lib/                         # Core logic
│   │   ├── drop.ts                  # Drop creation/claim
│   │   ├── pool.ts                  # Pool operations
│   │   ├── encryption.ts            # AES encryption
│   │   ├── nullifier.ts             # Nullifier system
│   │   └── tokens.ts                # Asset configuration
│   └── store/                       # State management
├── programs/                        # Anchor programs
│   ├── darkdrop/
│   └── nullifier-registry/
└── public/                          # Static assets
```

---

## Local Development

```bash
git clone https://github.com/hitman-kai/darkdrop.git
cd darkdrop
npm install
npm run dev
```

Open http://localhost:3000

---

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SOLANA_MAINNET_RPC=https://mainnet.helius-rpc.com/?api-key=xxx
NEXT_PUBLIC_LIGHT_COMPRESSION_API=https://mainnet.helius-rpc.com/?api-key=xxx
NEXT_PUBLIC_USDC_MAINNET_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Relayer (server-side)
RELAYER_PRIVATE_KEY=base58_encoded_private_key

# Optional
NEXT_PUBLIC_USE_ONCHAIN_NULLIFIER=false
```

---

## Roadmap

```
┌─────────────────────────────────────────────────────────────────┐
│                         ROADMAP                                 │
├───────────┬─────────────────────────────────────────────────────┤
│  VERSION  │  FEATURES                                           │
├───────────┼─────────────────────────────────────────────────────┤
│           │                                                     │
│  v1.0     │  ✓ Burner-based drops                              │
│  Nov 2025 │  ✓ SOL + USDC support                              │
│           │  ✓ Password encryption                              │
│           │  ✓ QR code generation                               │
│           │                                                     │
├───────────┼─────────────────────────────────────────────────────┤
│           │                                                     │
│  v2.0     │  ✓ Light Protocol integration                       │
│  Jan 2026 │  ✓ ZK compression (shielded drops)                  │
│           │  ✓ Relayer service (gas abstraction)                │
│           │  ✓ Fixed denominations                              │
│           │                                                     │
├───────────┼─────────────────────────────────────────────────────┤
│           │                                                     │
│  v3.0     │  ○ DarkPool (mixing pool)                           │
│  Q2 2026  │  ○ Time-delayed claims                              │
│           │  ○ Tor RPC routing                                  │
│           │  ○ Telegram Mini App                                │
│           │                                                     │
└───────────┴─────────────────────────────────────────────────────┘
```

---

## Security

- Private keys generated client-side only
- Keys never transmitted to any server
- AES encryption uses scrypt for key derivation
- Nullifiers prevent double-spending
- Open source and auditable

**Use at your own risk. No warranty provided.**

---

## License

MIT

---

## Links

- **App:** https://darkdrop.app
- **GitHub:** https://github.com/hitman-kai/darkdrop
- **Roadmap:** https://darkdrop.app/roadmap
