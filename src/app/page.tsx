import Link from "next/link";
import { WalletConnectButton } from "@/components/WalletConnectButton";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-[rgba(0,255,65,0.12)] bg-[rgba(0,0,0,0.92)] px-8 backdrop-blur-md" style={{height:"52px"}}>
        <span className="font-mono text-[13px] tracking-[0.22em] text-[var(--accent)]">DARKDROP</span>
        <div className="flex items-center gap-1 border border-[rgba(0,255,65,0.15)] px-1 py-1">
          <Link href="/drop/create" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[rgba(224,224,224,0.5)] transition-colors hover:text-[var(--accent)]">CREATE</Link>
          <Link href="/drop/claim" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[rgba(224,224,224,0.5)] transition-colors hover:text-[var(--accent)]">CLAIM</Link>
          <Link href="/pool" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[rgba(224,224,224,0.5)] transition-colors hover:text-[var(--accent)]">DARKPOOL</Link>
          <Link href="/roadmap" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[rgba(224,224,224,0.5)] transition-colors hover:text-[var(--accent)]">ROADMAP</Link>
        </div>
        <WalletConnectButton />
      </nav>

      {/* HERO */}
      <main className="flex flex-1 flex-col justify-center" style={{paddingTop:"52px"}}>
        <div className="relative mx-auto w-full max-w-4xl px-10 py-20">
          {/* left accent line */}
          <div className="absolute left-10 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[rgba(0,255,65,0.2)] to-transparent" />

          <p className="mb-8 pl-6 font-mono text-[10px] tracking-[0.35em] text-[rgba(0,255,65,0.4)]">OUTPUT // 0X00 — SOLANA DEAD DROPS</p>

          <h1 className="mb-6 pl-6 font-mono text-[clamp(32px,5vw,64px)] font-light leading-[1.1] tracking-tight text-[var(--text)]">
            Anonymous<br />
            Solana <span className="text-[var(--accent)]">dead drops.</span>
          </h1>

          <p className="mb-10 pl-6 max-w-md text-sm leading-relaxed text-[rgba(224,224,224,0.5)]">
            No addresses shared. No traceable links.<br />
            Encrypted claim codes. Cold storage transfers.
          </p>

          <div className="mb-12 flex flex-wrap gap-3 pl-6">
            <Link
              href="/drop/create"
              className="border border-[var(--accent)] bg-[var(--accent)] px-7 py-3 font-mono text-[10px] font-medium tracking-[0.2em] text-black transition-all hover:bg-[#33ff66] hover:shadow-[0_0_24px_rgba(0,255,65,0.25)]"
            >
              CREATE DROP
            </Link>
            <Link
              href="/drop/claim"
              className="border border-[rgba(0,255,65,0.25)] px-7 py-3 font-mono text-[10px] tracking-[0.2em] text-[rgba(224,224,224,0.6)] transition-all hover:border-[rgba(0,255,65,0.5)] hover:text-[var(--text)]"
            >
              CLAIM DROP
            </Link>
          </div>

          {/* DarkPool pill */}
          <div className="mb-16 pl-6">
            <Link href="/pool" className="inline-flex items-center gap-3 border border-[rgba(0,255,65,0.2)] bg-[rgba(0,255,65,0.04)] px-4 py-2.5 transition-all hover:bg-[rgba(0,255,65,0.08)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]" />
              <span className="font-mono text-[10px] tracking-[0.18em] text-[var(--accent)]">DARKPOOL</span>
              <span className="border-l border-[rgba(0,255,65,0.2)] pl-3 font-mono text-[9px] tracking-[0.12em] text-[rgba(0,255,65,0.4)]">MIXING POOL · LIVE</span>
            </Link>
          </div>

          {/* TRANSIT / SHARE / PURGE */}
          <div className="grid grid-cols-1 gap-px border border-[rgba(0,255,65,0.1)] bg-[rgba(0,255,65,0.06)] md:grid-cols-3" style={{marginLeft:"24px"}}>
            <div className="bg-[#000] p-7 transition-colors hover:bg-[#050505]">
              <p className="mb-4 font-mono text-[9px] tracking-[0.3em] text-[rgba(224,224,224,0.2)]">STEP 01</p>
              <p className="mb-3 font-mono text-[16px] font-medium tracking-[0.12em] text-[var(--accent)]">TRANSIT</p>
              <p className="text-xs leading-relaxed text-[rgba(224,224,224,0.5)]">Funds jump to a burner keypair immediately after you confirm. No link to your wallet remains on-chain.</p>
            </div>
            <div className="bg-[#000] p-7 transition-colors hover:bg-[#050505]">
              <p className="mb-4 font-mono text-[9px] tracking-[0.3em] text-[rgba(224,224,224,0.2)]">STEP 02</p>
              <p className="mb-3 font-mono text-[16px] font-medium tracking-[0.12em] text-[var(--accent)]">SHARE</p>
              <p className="text-xs leading-relaxed text-[rgba(224,224,224,0.5)]">Deliver the claim string over any channel. Nothing on-chain connects it to you. Optionally encrypt with a password.</p>
            </div>
            <div className="bg-[#000] p-7 transition-colors hover:bg-[#050505]">
              <p className="mb-4 font-mono text-[9px] tracking-[0.3em] text-[rgba(224,224,224,0.2)]">STEP 03</p>
              <p className="mb-3 font-mono text-[16px] font-medium tracking-[0.12em] text-[var(--accent)]">PURGE</p>
              <p className="text-xs leading-relaxed text-[rgba(224,224,224,0.5)]">Recipient sweeps to their main wallet. The burner self-destructs. Nullifier marks the code permanently spent.</p>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[rgba(0,255,65,0.1)] px-10 py-5">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-5">
          <span className="font-mono text-[9px] tracking-[0.2em] text-[rgba(224,224,224,0.2)]">CONTRACT</span>
          <span
            className="cursor-pointer font-mono text-[11px] tracking-[0.04em] text-[rgba(224,224,224,0.35)] transition-colors hover:text-[rgba(224,224,224,0.6)]"
            onClick={() => navigator.clipboard?.writeText("6wKRRP1c2gkWESch723bmgCWiBYiYvn4krspZXdApump")}
          >
            6wKRRP1c2gkWESch723bmgCWiBYiYvn4krspZXdApump
          </span>
          <div className="h-3 w-px bg-[rgba(0,255,65,0.15)]" />
          <span className="border border-[rgba(0,255,65,0.2)] px-2 py-0.5 font-mono text-[9px] tracking-[0.18em] text-[rgba(0,255,65,0.4)]">V2 LIVE</span>
          <div className="h-3 w-px bg-[rgba(0,255,65,0.15)]" />
          <div className="flex gap-4">
            <Link href="/history" className="font-mono text-[9px] tracking-[0.18em] text-[rgba(224,224,224,0.25)] transition-colors hover:text-[rgba(224,224,224,0.5)]">HISTORY</Link>
            <Link href="/docs" className="font-mono text-[9px] tracking-[0.18em] text-[rgba(224,224,224,0.25)] transition-colors hover:text-[rgba(224,224,224,0.5)]">DOCS</Link>
            <Link href="/roadmap" className="font-mono text-[9px] tracking-[0.18em] text-[rgba(224,224,224,0.25)] transition-colors hover:text-[rgba(224,224,224,0.5)]">ROADMAP</Link>
            <Link href="/privacy" className="font-mono text-[9px] tracking-[0.18em] text-[rgba(224,224,224,0.25)] transition-colors hover:text-[rgba(224,224,224,0.5)]">PRIVACY</Link>
            <Link href="/terms" className="font-mono text-[9px] tracking-[0.18em] text-[rgba(224,224,224,0.25)] transition-colors hover:text-[rgba(224,224,224,0.5)]">TERMS</Link>
            <a href="https://x.com/darkdrop_sol" target="_blank" rel="noreferrer" className="font-mono text-[9px] tracking-[0.18em] text-[rgba(0,255,65,0.4)] transition-colors hover:text-[var(--accent)]">X.COM</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
