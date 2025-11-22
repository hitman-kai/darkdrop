import Link from "next/link";
import { ArrowRight, ScanLine } from "lucide-react";

import { WalletConnectButton } from "@/components/WalletConnectButton";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-20 text-[var(--text)]">
      <div className="z-10 flex w-full max-w-3xl flex-col items-center gap-10 text-center">
        <div className="space-y-4">
          <p className="text-xs tracking-[0.8em] text-[var(--accent)]">DARKDROP</p>
          <h1 className="text-4xl font-semibold tracking-[0.2em] text-white">
            Anonymous Solana dead drops
          </h1>
          <p className="text-base text-[rgba(224,224,224,0.7)]">
            No addresses shared. No traceable links. Just encrypted claim codes and cold storage transfers.
          </p>
        </div>

        <WalletConnectButton />

        <div className="flex w-full flex-col gap-4 sm:flex-row">
          <Link
            href="/drop/create"
            className="flex flex-1 items-center justify-center gap-3 border border-[rgba(0,255,65,0.4)] bg-[rgba(0,255,65,0.1)] px-8 py-4 text-xs font-semibold tracking-[0.5em]"
          >
            <ArrowRight size={18} /> CREATE DROP
          </Link>
          <Link
            href="/drop/claim"
            className="flex flex-1 items-center justify-center gap-3 border border-[rgba(255,0,68,0.4)] bg-[rgba(255,0,68,0.08)] px-8 py-4 text-xs font-semibold tracking-[0.5em]"
          >
            <ScanLine size={18} /> CLAIM DROP
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 text-left text-sm text-[rgba(224,224,224,0.65)] md:grid-cols-3">
          <div className="border border-[rgba(0,255,65,0.2)] bg-black/40 p-4">
            <p className="text-xs tracking-[0.4em] text-[var(--accent)]">TRANSIT</p>
            <p className="mt-2 text-sm">Funds jump to burner keypair immediately after you confirm.</p>
          </div>
          <div className="border border-[rgba(0,255,65,0.2)] bg-black/40 p-4">
            <p className="text-xs tracking-[0.4em] text-[var(--accent)]">SHARE</p>
            <p className="mt-2 text-sm">Deliver the claim string over any channel. Nothing on-chain links it to you.</p>
          </div>
          <div className="border border-[rgba(0,255,65,0.2)] bg-black/40 p-4">
            <p className="text-xs tracking-[0.4em] text-[var(--accent)]">PURGE</p>
            <p className="mt-2 text-sm">Recipient sweeps to their main wallet; burner self-destructs.</p>
          </div>
        </div>

        <Link href="/history" className="text-xs uppercase tracking-[0.4em] text-[rgba(224,224,224,0.7)] hover:text-[var(--accent)]">
          VIEW HISTORY
        </Link>
      </div>
    </div>
  );
}
