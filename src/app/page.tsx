import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ScanLine, ShieldCheck } from "lucide-react";

import { WalletConnectButton } from "@/components/WalletConnectButton";

export default function Home() {
  const navLinkClass = "font-mono text-[11px] tracking-[0.35em] text-[var(--accent)] border border-[rgba(0,255,65,0.35)] px-4 py-2 transition-colors hover:bg-[rgba(0,255,65,0.15)] hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-20 text-[var(--text)]">
      <div className="z-10 flex w-full max-w-3xl flex-col items-center gap-10 text-center">
        <div className="space-y-4">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="DarkDrop logo" width={96} height={96} priority />
          </div>
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

        {/* DarkPool Link */}
        <Link
          href="/pool"
          className="flex w-full items-center justify-center gap-3 border border-[rgba(0,255,65,0.2)] px-8 py-3 text-xs tracking-[0.4em] transition-all hover:border-[var(--accent)] hover:bg-[rgba(0,255,65,0.05)]"
        >
          <ShieldCheck size={16} className="text-[var(--accent)]" />
          <span>DARKPOOL</span>
                        <span className="text-[10px] text-[rgba(224,224,224,0.4)]">MIXING POOL · LIVE</span>
        </Link>

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

        <div className="flex flex-col items-center gap-4 text-xs uppercase tracking-[0.35em] text-[rgba(224,224,224,0.85)]">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/history" className={navLinkClass}>
              VIEW HISTORY
            </Link>
            <Link href="/docs" className={navLinkClass}>
              READ THE GUIDE
            </Link>
            <Link href="/roadmap" className={navLinkClass}>
              ROADMAP
            </Link>
            <Link href="/privacy" className={navLinkClass}>
              PRIVACY
            </Link>
            <Link href="/terms" className={navLinkClass}>
              TERMS
            </Link>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent)]">
            v2 live - ZK compression via Light Protocol
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(224,224,224,0.7)]">
            CONTRACT: 6wKRRP1c2gkWESch723bmgCWiBYiYvn4krspZXdApump
          </p>
          <Link
            href="https://x.com/darkdrop_sol"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[12px] uppercase tracking-[0.4em] text-[var(--accent)] underline decoration-dotted underline-offset-4 transition-colors hover:text-white"
          >
            x.com/darkdrop_sol
          </Link>
        </div>
      </div>
    </div>
  );
}
