"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function PoolPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-4 text-sm text-[rgba(224,224,224,0.7)]">
        <Link href="/" className="text-xs tracking-[0.4em] text-[var(--accent)]">
          DARKDROP / POOL
        </Link>
        <p className="text-2xl font-semibold tracking-[0.3em] text-white">DarkPool</p>
        <p className="text-[rgba(224,224,224,0.5)]">
          Shielded mixing pool for maximum privacy
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Deposit Card */}
        <Link
          href="/pool/deposit"
          className="group flex flex-col gap-4 border border-[rgba(0,255,65,0.2)] p-6 transition-all hover:border-[var(--accent)] hover:bg-[rgba(0,255,65,0.02)]"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-[var(--accent)]" />
            <span className="text-sm tracking-[0.3em] text-white">DEPOSIT</span>
          </div>
          <p className="text-xs text-[rgba(224,224,224,0.5)]">
            Shield your funds into the mixing pool. Receive a claim code.
          </p>
          <div className="mt-auto flex items-center gap-2 text-xs text-[var(--accent)]">
            <span className="tracking-[0.2em]">START DEPOSIT</span>
            <span>→</span>
          </div>
        </Link>

        {/* Claim Card */}
        <Link
          href="/pool/claim"
          className="group flex flex-col gap-4 border border-[rgba(0,255,65,0.2)] p-6 transition-all hover:border-[var(--accent)] hover:bg-[rgba(0,255,65,0.02)]"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-[var(--accent)]" />
            <span className="text-sm tracking-[0.3em] text-white">CLAIM</span>
          </div>
          <p className="text-xs text-[rgba(224,224,224,0.5)]">
            Withdraw from the pool using your claim code. No link to deposit.
          </p>
          <div className="mt-auto flex items-center gap-2 text-xs text-[var(--accent)]">
            <span className="tracking-[0.2em]">CLAIM FUNDS</span>
            <span>→</span>
          </div>
        </Link>
      </div>

      {/* Info Section */}
      <div className="border border-[rgba(0,255,65,0.1)] p-6">
        <p className="text-xs tracking-[0.3em] text-[var(--accent)]">HOW IT WORKS</p>
        <div className="mt-4 space-y-3 text-xs text-[rgba(224,224,224,0.6)]">
          <p>1. Deposit a fixed amount (0.1, 0.5, 1, or 10 SOL) to the shielded pool</p>
          <p>2. Receive a unique claim code (keep it secret)</p>
          <p>3. Share the code with anyone, anywhere</p>
          <p>4. Recipient claims from the pool with a different wallet</p>
          <p>5. No on-chain link between deposit and claim</p>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="border border-[rgba(0,255,65,0.05)] bg-[rgba(0,255,65,0.02)] p-4">
        <p className="text-[10px] tracking-[0.2em] text-[rgba(224,224,224,0.4)]">
          PRIVACY: All deposits use fixed denominations and flow through a shared shielded pool. 
          On-chain observers see deposits to the pool and claims from the pool, 
          but cannot link which deposit corresponds to which claim.
        </p>
      </div>
    </div>
  );
}

