# DarkDrop v2 Build Plan

## Phase 0 — Baseline
- Branch `v2-confidential` from `main` and lock v1 (DONE 2025-11-23).
- Leave breadcrumbs in `README.md` + `DEV_FLOW.md` so future operators follow the protocol.

## Phase 1 — Token-2022 cUSDC Pipeline
- Swap current USDC mint for cUSDC (Token-2022) and update metadata helpers.
- ✅ Token-2022 cUSDC mint deployed: `8vVxyKSPyyf5iXk2eQdi7KGbBr1okp8bseyjGNZSWahR` (treasury ATA `AH5US8BCoGnLLJdRBp1mPg62XCodRQirBcn8JV4agwPw`).
- Mirror existing burner flow but ensure transactions use Token-2022 instructions.
- Build ATA management + rent padding for cUSDC just like standard SPL.
- Gate the new code path behind the v2 branch until wallets prove compatibility.
- Tests: local validator w/ Token-2022 feature flag, manual wallet sweep.

## Phase 2 — Confidential Transfer Wiring
- Integrate Solana Labs Token-2022 confidential-transfer SDK.
- Add proof generation helpers (wasm/worker) and secure claim payload for proof data.
- Update sender UX to show amount-blind confirmation + required CPU time.
- Update claim UX to run proofs before sweep; add progress + error handling.
- Tests: unit tests for proof builders, end-to-end flow on devnet fork.

## Phase 3 — Light Protocol (Shielded SOL)
- Add Light SDK client + config (RPC endpoints, Merkle roots).
- Build deposit → private-note creation when sender chooses private SOL.
- Extend claim path to withdraw or keep funds inside Light pool.
- Storage: encrypt shielded note details inside claim code payload.
- Tests: Light localnet scripts + integration walkthrough.

## Phase 4 — Shielded Notes & Claim Format
- Replace burner private keys with encrypted note payloads (AES + password optional).
- Update QR / history views to label claim types (cUSDC CT vs Light SOL).
- Backfill history schema to store note metadata without leaking secrets.

## Phase 5 — Private Mode UX & Fallbacks
- Global toggle enabling confidential defaults; show capability matrix per wallet.
- Detect incompatible wallets and offer “standard mode” fallback with clear warnings.
- Polish docs + /roadmap to describe the new private rails.

## Phase 6 — Ceremony Automation & Release Gate
- Automate deposit → private drop → claim → withdraw ceremony checks.
- Add regression tests (Playwright) covering SOL + cUSDC + Light paths.
- Run security review (manual) and document operational guidance.
- Once all boxes are green, merge `v2-confidential` → `main` and tag release.

Update this plan whenever scope shifts. Each phase should land via PRs targeting `v2-confidential` only.
