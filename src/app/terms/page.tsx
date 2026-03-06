"use client";
import Link from "next/link";

const sections = [
  {
    id: "01",
    title: "Protocol, not a service",
    content: `DarkDrop is a non-custodial protocol. It does not hold, control, or have access to your funds at any time. When you create a drop, funds move directly from your wallet to a burner keypair you generated client-side. DarkDrop has no ability to freeze, reverse, or recover any transaction.`,
  },
  {
    id: "02",
    title: "You are responsible for your claim codes",
    content: `The claim code is the sole means of accessing funds in a drop. Anyone who possesses the claim code can sweep the funds. DarkDrop has no server-side record of claim codes and cannot recover them if lost.\n\nDo not share claim codes publicly. Do not lose them. DarkDrop accepts no liability for lost, stolen, or misdelivered claim codes.`,
  },
  {
    id: "03",
    title: "No warranties",
    content: `DarkDrop is provided as-is without warranty of any kind. The protocol is experimental software. Smart contract interactions, RPC infrastructure, and third-party dependencies may fail. Use at your own risk.\n\nDarkDrop makes no guarantee of uptime, transaction success, or fund recovery in the event of software failure.`,
  },
  {
    id: "04",
    title: "Permitted use",
    content: `You may use DarkDrop for any lawful purpose. You may not use DarkDrop to facilitate money laundering, sanctions evasion, ransomware payments, or any activity prohibited by applicable law in your jurisdiction.\n\nDarkDrop is a neutral protocol. It does not screen, monitor, or approve transactions. Compliance with local laws is entirely your responsibility.`,
  },
  {
    id: "05",
    title: "Relayer service",
    content: `The DarkDrop relayer is an optional service that submits transactions on your behalf in exchange for a 1% fee. The relayer is operated on a best-effort basis. DarkDrop does not guarantee relayer availability, speed, or fee stability.\n\nRelayer transactions are broadcast to the public Solana network and are irreversible once confirmed.`,
  },
  {
    id: "06",
    title: "Limitation of liability",
    content: `To the maximum extent permitted by law, DarkDrop and its contributors shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of the protocol, including but not limited to loss of funds, loss of data, or unauthorized access to claim codes.`,
  },
  {
    id: "07",
    title: "Changes to these terms",
    content: `DarkDrop may update these terms at any time. Continued use of the protocol after changes constitutes acceptance of the revised terms. Material changes will be announced via @darkdrop_sol on X.`,
  },
  {
    id: "08",
    title: "Contact",
    content: `Questions regarding these terms can be directed to @darkdrop_sol on X.`,
  },
];

export default function TermsPage() {
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
          <p className="mb-2 font-mono text-[9px] tracking-[0.3em] text-[rgba(0,255,65,0.35)]">OUTPUT // 0X07</p>
          <h1 className="font-mono text-[clamp(24px,4vw,36px)] font-light leading-[1.15] text-[var(--text)]">Terms of service.</h1>
          <p className="mt-3 text-xs leading-relaxed text-[rgba(224,224,224,0.45)]">Last updated March 2026. By using DarkDrop you agree to these terms.</p>
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
