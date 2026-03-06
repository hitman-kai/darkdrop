"use client";
import Link from "next/link";

const items = [
  {
    phase: "01",
    status: "LIVE",
    title: "Core Dead Drops",
    items: [
      "Burner keypair generation client-side",
      "AES-256-GCM + PBKDF2 password encryption",
      "v2 claim code format with versioning",
      "Nullifier registry — prevents double-spend",
      "QR code generation and scanner",
      "Local history vault with encrypted export",
    ],
  },
  {
    phase: "02",
    status: "LIVE",
    title: "ZK Compression Layer",
    items: [
      "Light Protocol zk-compression integration",
      "Compressed SOL and USDC drops",
      "Relayer-submitted claims — receiver wallet never on-chain",
      "1% relayer fee model, no SOL required to claim",
      "On-chain nullifier program support",
    ],
  },
  {
    phase: "03",
    status: "LIVE",
    title: "Sender Privacy",
    items: [
      "Relayer-submitted shield transactions",
      "Sender wallet hidden from on-chain compress tx",
      "signTransaction intercept — sender signs only, relayer broadcasts",
      "Fallback to direct mode if relayer unavailable",
    ],
  },
  {
    phase: "04",
    status: "NEXT",
    title: "Split Claim Codes",
    items: [
      "Shamir's Secret Sharing — split code into N shares",
      "Require M-of-N shares to reconstruct",
      "Send shares over separate channels",
      "Single channel compromise cannot steal funds",
      "Pure cryptography — zero on-chain footprint",
    ],
  },
  {
    phase: "05",
    status: "NEXT",
    title: "Stealth Address Registry",
    items: [
      "Receiver publishes scan key once",
      "Sender derives stealth address without prior contact",
      "No DM or address sharing required",
      "Monero-style scanning model for Solana",
    ],
  },
  {
    phase: "06",
    status: "NEXT",
    title: "Physical Dead Drops",
    items: [
      "Claim code embedded in printed QR",
      "Full offline support — derivation client-side",
      "Hand someone paper, they sweep from phone",
      "No network required until sweep",
    ],
  },
  {
    phase: "07",
    status: "RESEARCH",
    title: "Commitment Scheme",
    items: [
      "On-chain merkle tree of commitment hashes",
      "Deposit and withdrawal cryptographically unlinked",
      "Tornado Cash model adapted for Solana",
      "Requires custom program + audit",
    ],
  },
];

const statusColor: Record<string, string> = {
  LIVE: "text-[var(--accent)] border-[rgba(0,255,65,0.3)]",
  NEXT: "text-[rgba(224,224,224,0.5)] border-[rgba(224,224,224,0.15)]",
  RESEARCH: "text-[rgba(224,224,224,0.3)] border-[rgba(224,224,224,0.08)]",
};

export default function RoadmapPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-[rgba(0,255,65,0.12)] bg-[rgba(0,0,0,0.92)] px-8 backdrop-blur-md" style={{height:"52px"}}>
        <span className="font-mono text-[13px] tracking-[0.22em] text-[var(--accent)]">DARKDROP</span>
        <div className="flex items-center gap-1 border border-[rgba(0,255,65,0.15)] px-1 py-1">
          <Link href="/" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[rgba(224,224,224,0.5)] transition-colors hover:text-[var(--accent)]">HOME</Link>
          <Link href="/drop/create" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[rgba(224,224,224,0.5)] transition-colors hover:text-[var(--accent)]">CREATE</Link>
          <Link href="/drop/claim" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[rgba(224,224,224,0.5)] transition-colors hover:text-[var(--accent)]">CLAIM</Link>
        </div>
        <Link href="/drop/create" className="border border-[var(--accent)] px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[var(--accent)] transition-colors hover:bg-[rgba(0,255,65,0.08)]">CREATE DROP</Link>
      </nav>

      <main className="mx-auto w-full max-w-3xl px-6 pb-20" style={{paddingTop:"80px"}}>
        <div className="mb-12">
          <p className="mb-2 font-mono text-[9px] tracking-[0.3em] text-[rgba(0,255,65,0.35)]">OUTPUT // 0X04</p>
          <h1 className="font-mono text-[clamp(24px,4vw,36px)] font-light leading-[1.15] text-[var(--text)]">Roadmap.</h1>
          <p className="mt-3 text-xs leading-relaxed text-[rgba(224,224,224,0.45)]">Privacy primitives shipping in sequence. No promises on dates — only on direction.</p>
        </div>

        <div className="relative flex flex-col gap-0">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-[rgba(0,255,65,0.3)] via-[rgba(0,255,65,0.1)] to-transparent" />
          {items.map((phase, i) => (
            <div key={phase.phase} className="relative flex gap-6 pb-10">
              <div className={`relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center border font-mono text-[9px] tracking-[0.1em] ${
                phase.status === "LIVE"
                  ? "border-[var(--accent)] bg-[rgba(0,255,65,0.08)] text-[var(--accent)]"
                  : phase.status === "NEXT"
                  ? "border-[rgba(224,224,224,0.15)] bg-[#050505] text-[rgba(224,224,224,0.3)]"
                  : "border-[rgba(224,224,224,0.06)] bg-[#030303] text-[rgba(224,224,224,0.15)]"
              }`}>{phase.phase}</div>
              <div className="flex-1 border border-[rgba(0,255,65,0.08)] bg-[#050505] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="font-mono text-[13px] font-medium tracking-[0.08em] text-[var(--text)]">{phase.title}</h2>
                  <span className={`border px-2 py-0.5 font-mono text-[8px] tracking-[0.18em] ${statusColor[phase.status]}`}>{phase.status}</span>
                </div>
                <ul className="space-y-1.5">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[11px] text-[rgba(224,224,224,0.45)]">
                      <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${phase.status === "LIVE" ? "bg-[var(--accent)]" : "bg-[rgba(224,224,224,0.15)]"}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
