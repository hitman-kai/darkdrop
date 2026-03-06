"use client";
import Link from "next/link";

const sections = [
  {
    id: "01",
    title: "No accounts, no sign-up",
    content: `DarkDrop does not require an account, email address, phone number, or any form of identity verification. You interact with the protocol directly through your Solana wallet. Your wallet address is never stored on DarkDrop servers.`,
  },
  {
    id: "02",
    title: "What we collect",
    content: `DarkDrop collects nothing on its servers beyond what is required to operate the relayer and nullifier registry.\n\nNullifier hashes — a one-way hash derived from each burner keypair's secret key — are stored in a Vercel KV database solely to prevent double-spend. These hashes cannot be used to reconstruct any private key or identify any party.\n\nRelayer transactions are submitted to the Solana network and are permanently public on-chain. The relayer address, recipient address, and transaction amounts are visible on any block explorer.`,
  },
  {
    id: "03",
    title: "What stays on your device",
    content: `All of the following are stored only in your browser's local storage and never transmitted to DarkDrop:\n\n• Sent drop history (addresses, amounts, claim codes)\n• Claimed drop history\n• Wallet preferences and cluster settings\n\nClearing your browser's local storage permanently deletes this data. DarkDrop cannot recover it.`,
  },
  {
    id: "04",
    title: "On-chain data",
    content: `All transactions on the Solana blockchain are public and permanent. In standard mode, the transfer from your wallet to the burner address is visible on-chain. In Ultra Private Mode, the relayer submits the compression transaction on your behalf, hiding your wallet from the on-chain record.\n\nDarkDrop does not control what block explorers, analytics firms, or other third parties do with on-chain data.`,
  },
  {
    id: "05",
    title: "Third party services",
    content: `DarkDrop uses the following third party infrastructure:\n\n• Vercel — hosting and serverless functions\n• Helius — Solana RPC provider\n• Light Protocol — zk-compression infrastructure\n• Vercel KV — nullifier storage\n\nEach of these services has its own privacy policy. DarkDrop does not share user data with any advertising or analytics platforms.`,
  },
  {
    id: "06",
    title: "Wallet connection",
    content: `Connecting a wallet is required only to create a drop or to claim a compressed drop in direct mode. DarkDrop requests only the minimum permissions required — transaction signing. DarkDrop never requests access to your full transaction history or private keys.\n\nFor compressed drops, claiming via the relayer requires no wallet connection at all.`,
  },
  {
    id: "07",
    title: "Contact",
    content: `For privacy-related questions, contact us via X: @darkdrop_sol`,
  },
];

export default function PrivacyPage() {
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
          <p className="mb-2 font-mono text-[9px] tracking-[0.3em] text-[rgba(0,255,65,0.35)]">OUTPUT // 0X06</p>
          <h1 className="font-mono text-[clamp(24px,4vw,36px)] font-light leading-[1.15] text-[var(--text)]">Privacy policy.</h1>
          <p className="mt-3 text-xs leading-relaxed text-[rgba(224,224,224,0.45)]">Last updated March 2026. DarkDrop is a non-custodial protocol. We do not custody funds or store personal data.</p>
        </div>

        <div className="flex flex-col gap-3">
          {sections.map((section) => (
            <div key={section.id} className="border border-[rgba(0,255,65,0.1)] bg-[#050505]">
              <div className="border-b border-[rgba(0,255,65,0.08)] px-5 py-3 flex items-center gap-4">
                <span className="font-mono text-[9px] tracking-[0.2em] text-[rgba(0,255,65,0.25)]">{section.id}</span>
                <h2 className="font-mono text-[12px] tracking-[0.08em] text-[var(--text)]">{section.title}</h2>
              </div>
              <div className="px-5 py-4">
                {section.content.split("\n\n").map((para, i) => (
                  <p key={i} className="mb-3 text-[12px] leading-relaxed text-[rgba(224,224,224,0.5)] last:mb-0 whitespace-pre-line">{para}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
