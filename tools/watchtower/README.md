Local Privacy Vault + Watchtower
================================

This watchtower is an optional, outbound-only monitor for DarkDrop vault exports.
It never exposes a public endpoint and keeps claim codes local.

Setup
-----
1) Export a vault from the History page (Local Privacy Vault section).
2) Copy the vault file to this machine.

Run (one-time check)
--------------------
node tools/watchtower/watchtower.mjs --vault /path/to/darkdrop-vault.json --passphrase "your-passphrase"

Filter results
--------------
node tools/watchtower/watchtower.mjs --vault /path/to/darkdrop-vault.json --passphrase "your-passphrase" --only unclaimed
node tools/watchtower/watchtower.mjs --vault /path/to/darkdrop-vault.json --passphrase "your-passphrase" --only claimed
node tools/watchtower/watchtower.mjs --vault /path/to/darkdrop-vault.json --passphrase "your-passphrase" --only skipped
node tools/watchtower/watchtower.mjs --vault /path/to/darkdrop-vault.json --passphrase "your-passphrase" --only compressed

JSON output
-----------
node tools/watchtower/watchtower.mjs --vault /path/to/darkdrop-vault.json --passphrase "your-passphrase" --format json

Run (repeat every 10 minutes)
-----------------------------
node tools/watchtower/watchtower.mjs --vault /path/to/darkdrop-vault.json --passphrase "your-passphrase" --interval 600

Optional environment variables
------------------------------
set DARKDROP_RPC=https://your.rpc.endpoint
set DARKDROP_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

Notes
-----
- Watchtower currently checks burner-wallet drops (non-compressed).
- Compressed drops are detected and skipped, since balances are not visible as normal accounts.
