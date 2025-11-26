# Devnet Confidential Transfer Testing

Mainnet CT transactions are currently blocked while the `zk-elgamal-proof` program stays disabled. Use devnet to keep the product demoable and to validate the configure → transfer → sweep flow end to end.

## 1. Environment variables

Add the following keys to `.env.local` (or the hosting platform equivalent) and restart `npm run dev`:

```
NEXT_PUBLIC_DEFAULT_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_DEVNET_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_CUSDC_DEVNET_MINT=<devnet cUSDC mint pubkey>
```

You can still keep the mainnet values (`NEXT_PUBLIC_SOLANA_MAINNET_RPC`, `NEXT_PUBLIC_CUSDC_MAINNET_MINT`) so switching back is a single toggle in the UI.

## 2. Create a CT-enabled Token-2022 mint on devnet

Requirements:

- Latest Solana CLI + `spl-token` (v3.4.0+ includes CT flags)
- A funded devnet keypair (`solana-keygen new -o devnet-authority.json`)

Steps:

```bash
# Point CLI at devnet
solana config set --url https://api.devnet.solana.com

# Fund the authority
solana airdrop 5 $(solana-keygen pubkey devnet-authority.json)

# Create the mint under the Token-2022 program with auto-approved CT accounts
spl-token \
  --url devnet \
  --program-id TokenzQdmsJZ6UUrhZuQw9TnCUXpzE9WwSBha6VwWqP \
  create-token \
  --decimals 6 \
  --enable-confidential-transfers auto \
  --mint-authority devnet-authority.json \
  --fee-payer devnet-authority.json \
  devnet-cusdc-mint.json
```

The command prints the mint address—copy it into `NEXT_PUBLIC_CUSDC_DEVNET_MINT`.

Optional but recommended:

```bash
# Treasury ATA for funding drops
spl-token \
  --url devnet \
  --program-id TokenzQdmsJZ6UUrhZuQw9TnCUXpzE9WwSBha6VwWqP \
  create-account <DEVNET_CUSDC_MINT> devnet-authority.json

# Mint test liquidity (e.g., 10,000,000 base units = 10 cUSDC)
spl-token \
  --url devnet \
  --program-id TokenzQdmsJZ6UUrhZuQw9TnCUXpzE9WwSBha6VwWqP \
  mint <DEVNET_CUSDC_MINT> 10000000 <TREASURY_ATA> --fee-payer devnet-authority.json
```

## 3. Verify programs

Ensure the proof and Token-2022 programs are executable on devnet:

```bash
solana account ZkE1ELui7gL5YjYv3ygGkbAtwGYd8tAJ1BsFth7zdASj --output json
solana account TokenzQdmsJZ6UUrhZuQw9TnCUXpzE9WwSBha6VwWqP --output json
```

`executable: true` confirms RPCs are serving the binaries. If the proof program shows `executable: false`, spin up a local validator (`solana-test-validator --token2022 --bpf-program ...`) and point DarkDrop at `http://127.0.0.1:8899` via `NEXT_PUBLIC_SOLANA_DEVNET_RPC`.

## 4. Test matrix

1. **Configure burner**: Run `/drop/create`, pick Devnet+cUSDC, enable Private Mode. Confirm the configure transaction succeeds (ATA + zero-proof verify + configure + enable).
2. **CT transfer**: Use the same flow to push 1 cUSDC to the burner. Solscan should show 3 proof instructions + `ConfidentialTransfer`.
3. **Claim / sweep**: Use `/drop/claim`, switch network to Devnet, scan the claim, and sweep via standard transfer (Phase 2 will add CT sweep).

Capture Solscan links for each step so we have public evidence while mainnet remains paused.

