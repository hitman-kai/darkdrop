"use client";
import Link from "next/link";

const sections = [
  {
    id: "01",
    title: "What is DarkDrop?",
    content: `DarkDrop is an anonymous asset transfer protocol built on Solana. Instead of sending funds directly to a recipient's wallet — which creates a permanent, traceable on-chain link — DarkDrop routes funds through a one-time burner keypair. The sender gets a claim code. The recipient uses the code to sweep funds to any wallet they choose. No addresses are ever exchanged.`,
  },
  {
    id: "02",
    title: "How a dead drop works",
    content: `1. TRANSIT — You specify an amount and asset (SOL or USDC). DarkDrop generates a random burner keypair client-side. Funds move from your wallet to the burner address in a single transaction.\n\n2. SHARE — A claim code is produced. This is either a raw base58 private key or an AES-encrypted payload depending on whether you set a password. You deliver this string to the recipient over any channel — encrypted DM, Signal, physical note, QR code.\n\n3. PURGE — The recipient pastes the claim code into DarkDrop. The burner private key is reconstructed and all funds are swept to their main wallet. The burner is now empty and permanently spent. A nullifier is registered to prevent replay.`,
  },
  {
    id: "03",
    title: "Claim code format",
    content: `All v2 codes follow this structure:\n\ndarkdrop:v2:{cluster}:{asset}:{mode}:{payload}\n\nExamples:\n• darkdrop:v2:mainnet:sol:raw:5Kd3NBUd...\n• darkdrop:v2:mainnet:sol:aes:{hint}:{encrypted}\n• darkdrop:v2:mainnet:sol:compressed:raw:...\n\nLegacy codes (raw base58 only) are still supported for backwards compatibility.`,
  },
  {
    id: "04",
    title: "Password encryption",
    content: `When you set a password, the burner private key is encrypted using AES-256-GCM with a key derived via PBKDF2 (SHA-256, 120,000 iterations). A random 16-byte salt and 24-byte nonce are prepended to the ciphertext. The recipient must enter the same password to reconstruct the key. DarkDrop never transmits or stores your password.`,
  },
  {
    id: "05",
    title: "Ultra Private Mode",
    content: `Ultra Private Mode uses Light Protocol zk-compression to sever the on-chain link between sender and drop.\n\nNormally: Sender Wallet → Burner Address (visible on Solscan)\n\nWith Ultra Private: Relayer → Compressed Account (sender wallet never appears)\n\nThe sender signs the transaction client-side but the relayer broadcasts it. On-chain, only the relayer address is visible as the fee payer. The recipient can claim via relayer too — meaning neither sender nor receiver ever appear in the transaction graph.`,
  },
  {
    id: "06",
    title: "Nullifiers",
    content: `Every drop has a nullifier derived from the burner keypair's secret key using SHA-512. Once a drop is claimed, the nullifier is registered in a Vercel KV store. Any attempt to replay the same claim code will be rejected before the sweep transaction is even built. This prevents double-spending even if the claim code leaks after use.`,
  },
  {
    id: "07",
    title: "What DarkDrop does not do",
    content: `DarkDrop is not a mixer or tumbler. In standard mode, the sender-to-burner transaction is visible on-chain. A chain analysis firm with access to both sender and recipient identities could potentially correlate the transfer by amount and timing.\n\nUltra Private Mode significantly raises the bar by hiding the sender, but it is not equivalent to a zero-knowledge commitment scheme like Tornado Cash. Full trustless unlinkability requires an on-chain program with a merkle tree — this is on the roadmap.\n\nDarkDrop does not store any data on its servers. All history is local to your browser.`,
  },
  {
    id: "08",
    title: "Recovering a drop",
    content: `If you created a drop and lost the claim code, go to History. DarkDrop stores all sent drops in your browser's local storage including the claim code. You can search by burner address or export an encrypted vault file for offline backup.\n\nIf you cleared your browser storage, the claim code is unrecoverable. DarkDrop has no server-side record.`,
  },
];

export default function DocsPage() {
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
          <p className="mb-2 font-mono text-[9px] tracking-[0.3em] text-[rgba(0,255,65,0.35)]">OUTPUT // 0X05</p>
          <h1 className="font-mono text-[clamp(24px,4vw,36px)] font-light leading-[1.15] text-[var(--text)]">Documentation.</h1>
          <p className="mt-3 text-xs leading-relaxed text-[rgba(224,224,224,0.45)]">How dead drops work, what the privacy guarantees are, and what they are not.</p>
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

        <div className="mt-8 border border-[rgba(0,255,65,0.15)] bg-[rgba(0,255,65,0.03)] px-5 py-4 flex items-center justify-between">
          <p className="text-xs text-[rgba(224,224,224,0.4)]">Ready to create your first drop?</p>
          <Link href="/drop/create" className="font-mono text-[10px] tracking-[0.15em] text-[var(--accent)] hover:underline">CREATE DROP →</Link>
        </div>
      </main>
    </div>
  );
}
