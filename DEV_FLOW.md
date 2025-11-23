# DarkDrop Development Flow

## Branch Policy
- `main` stays on v1 (burner-based drops + production deploys).
- All v2 confidential work lives on `v2-confidential`. Never commit experimental code to `main`.

## Working on v2
1. Checkout `v2-confidential` (create it locally if missing).
2. Log the current status + next todo in **Status Log** below before you stop working.
3. Push feature branches as needed but open PRs against `v2-confidential`.
4. Do not merge to `main` until v2 is fully vetted on preview deployments.

## Status Log
- [TODO] Implement Token-2022 cUSDC pipeline (deposit, confidential transfer, sweep).
- [TODO] Integrate Light Protocol (shielded SOL + note handling).
- [TODO] Replace burner claim codes with shielded notes.
- [TODO] Build "Private Mode" UI + fallback.
- [TODO] Ceremony: deposit → private drop → claim → withdraw.

- [2025-11-23] Bootstrap: `v2-confidential` branch created from `main`. Next action is to design the Token-2022 cUSDC flow without touching v1.
- [2025-11-23] Phase 1 kickoff: cUSDC asset now uses Token-2022 (mint env required) and create/claim flows build Token-2022 instructions. Next: wire up confidential transfer SDK scaffolding.
- [2025-11-23] Token-2022 cUSDC mint live at `8vVxyKSPyyf5iXk2eQdi7KGbBr1okp8bseyjGNZSWahR` with treasury ATA `AH5US8BCoGnLLJdRBp1mPg62XCodRQirBcn8JV4agwPw`. `.env.local` now carries `NEXT_PUBLIC_CUSDC_MAINNET_MINT`. Next focus: scaffold confidential-transfer account approval + proof plumbing without touching v1.
- [2025-11-23] Phase 2 scaffolding: added proof worker stub, privacy store toggle in create flow, and confidential account notes on claim page. Actual confidential transfers still disabled.
Add new entries chronologically so the next operator can follow the trail.
- [2025-11-23] Confidential preview UX unified via `ConfidentialPreviewCard`. Create + claim pages now share the same status panel and claim view shows account notes once loaded. Next: replace mock worker output with real Token-2022 proofs.
- [2025-11-23] Mint/account inspection now surfaces real CT readiness: we fetch mint/ATA TLVs, display readiness notes in /drop create + claim so operators know when configure/approve is still pending. Next: hook proof worker to real CT SDK.
- [2025-11-23] Proof worker + client now accept Token-2022 job payloads (mint/owner/cluster) and /drop/create feeds them. Still mock output but ready to swap in the actual SDK.
- [2025-11-23] Instruction scaffolding added (configure/approve/enable stubs in instructions.ts). Planners now call them and surface step-by-step notes. Next: lift the "preview only" guard and enable actual sends once proofs exist.
