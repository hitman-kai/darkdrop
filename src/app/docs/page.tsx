import Link from "next/link";
import { ArrowUpRight, Eye, EyeOff, Lock, Shield, Share, Terminal } from "lucide-react";

export const metadata = {
  title: "DarkDrop Documentation",
  description: "Full guide covering create, share, and claim flows for DarkDrop dead drops.",
};

const sections = [
  {
    id: "overview",
    title: "Concept Overview",
    content: (
      <>
        <p>
          DarkDrop is a privacy-focused "dead drop" layer on Solana mainnet. Create anonymous transfers using either
          traditional burner keypairs (v1) or ZK-compressed drops via Light Protocol (v2 Ultra Private Mode).
        </p>
        <ul className="list-disc space-y-2 pl-6 text-sm text-[rgba(224,224,224,0.75)]">
          <li>SOL and USDC are supported on mainnet.</li>
          <li>Ultra Private Mode uses Light Protocol ZK compression for true on-chain privacy.</li>
          <li>Password protection optionally encrypts claim codes with AES-256.</li>
          <li>v2 claim strings: <code>darkdrop:v2:mainnet:sol:compressed:raw:...</code></li>
        </ul>
      </>
    ),
  },
  {
    id: "ultra-private",
    title: "Ultra Private Mode (v2)",
    icon: <Shield size={18} />,
    content: (
      <>
        <p>
          Ultra Private Mode uses Light Protocol&apos;s ZK compression to hide your drop in a merkle tree with validity proofs.
          Unlike burner wallets, compressed drops don&apos;t create visible on-chain accounts.
        </p>
        <ol className="space-y-3 text-sm text-[rgba(224,224,224,0.8)] mt-4">
          <li>
            <strong>Create:</strong> Your SOL/USDC is compressed into Light Protocol&apos;s state tree, owned by a random keypair.
          </li>
          <li>
            <strong>Share:</strong> The claim code contains the keypair to access the compressed funds.
          </li>
          <li>
            <strong>Claim:</strong> Recipient decompresses the funds to their wallet using validity proofs.
          </li>
        </ol>
      </>
    ),
  },
  {
    id: "privacy-model",
    title: "Privacy Model",
    icon: <EyeOff size={18} />,
    content: (
      <>
        <p>
          DarkDrop v2 breaks the on-chain link between sender and receiver. Here&apos;s how privacy works:
        </p>
        <div className="mt-4 space-y-4">
          <div className="border-l-2 border-[var(--accent)] pl-4">
            <p className="text-xs tracking-wider text-[var(--accent)] mb-2">WHAT&apos;S HIDDEN</p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-[rgba(224,224,224,0.75)]">
              <li>The recipient address until claim time</li>
              <li>The link between deposit and withdrawal (different wallets)</li>
              <li>The exact compressed account in the Merkle tree</li>
              <li>Who created the drop vs who claimed it</li>
            </ul>
          </div>
          <div className="border-l-2 border-[rgba(224,224,224,0.3)] pl-4">
            <p className="text-xs tracking-wider text-[rgba(224,224,224,0.5)] mb-2">WHAT&apos;S VISIBLE</p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-[rgba(224,224,224,0.6)]">
              <li>Amount deposited into the ZK compression pool</li>
              <li>Amount withdrawn from the compression pool</li>
              <li>The claimer&apos;s wallet address (when they claim)</li>
            </ul>
          </div>
          <div className="mt-4 bg-black/40 p-4 font-mono text-xs text-[rgba(224,224,224,0.7)]">
            <p className="text-[var(--accent)] mb-2">// Privacy Flow</p>
            <p>Creator (Wallet A) --&gt; Compress --&gt; Merkle Tree</p>
            <p className="text-[rgba(224,224,224,0.4)]">{"                              |"}</p>
            <p className="text-[rgba(224,224,224,0.4)]">{"                    [share code off-chain]"}</p>
            <p className="text-[rgba(224,224,224,0.4)]">{"                              |"}</p>
            <p>Claimer (Wallet B) &lt;-- Decompress &lt;-- Merkle Tree</p>
            <p className="mt-2 text-[var(--accent)]">// No on-chain link between Wallet A and B</p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "create",
    title: "Create Flow",
    icon: <Shield size={18} />,
    content: (
      <ol className="space-y-3 text-sm text-[rgba(224,224,224,0.8)]">
        <li>
          Connect a wallet on <strong>Solana Mainnet</strong> funded with SOL (0.01 SOL buffer recommended for fees).
        </li>
        <li>
          Pick SOL or USDC, enter the amount, and optionally set a password.
        </li>
        <li>
          <strong>Standard Mode:</strong> Funds go to a burner keypair (visible on-chain but unlinkable).
        </li>
        <li>
          <strong>Ultra Private Mode:</strong> Funds are ZK-compressed into Light Protocol (hidden on-chain).
        </li>
        <li>
          You receive a claim code and QR. Share only with the intended recipient.
        </li>
      </ol>
    ),
  },
  {
    id: "share",
    title: "Claim Code Formats",
    icon: <Share size={18} />,
    content: (
      <>
        <p>
          Claim codes encode the keypair needed to access funds. Password-protected codes use AES encryption with a hint.
        </p>
        <ul className="list-disc space-y-2 pl-6 text-sm text-[rgba(224,224,224,0.75)]">
          <li>
            <code>darkdrop:v2:mainnet:sol:compressed:raw:...</code> - Ultra Private SOL drop
          </li>
          <li>
            <code>darkdrop:v2:mainnet:sol:raw:...</code> - Standard SOL drop
          </li>
          <li>
            <code>darkdrop:v2:mainnet:usdc:compressed:aes:HINT:...</code> - Password-protected compressed USDC
          </li>
          <li>
            Legacy v1 codes and raw base58 keys are still supported.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "claim",
    title: "Claim Flow",
    icon: <Lock size={18} />,
    content: (
      <ol className="space-y-3 text-sm text-[rgba(224,224,224,0.8)]">
        <li>
          Paste or scan the claim code. Enter password if encrypted.
        </li>
        <li>
          <strong>Standard drops:</strong> DarkDrop rebuilds the burner keypair and sweeps funds to your wallet.
        </li>
        <li>
          <strong>Compressed drops:</strong> Light Protocol decompresses the funds using validity proofs.
        </li>
        <li>
          The claim keypair is destroyed after sweep. Local history is the only record.
        </li>
      </ol>
    ),
  },
  {
    id: "security",
    title: "Security & Best Practices",
    icon: <Lock size={18} />,
    content: (
      <ul className="list-disc space-y-3 pl-6 text-sm text-[rgba(224,224,224,0.75)]">
        <li>Everything happens client-side; no keys or claim codes touch a server.</li>
        <li>Ultra Private Mode provides stronger privacy than burner wallets.</li>
        <li>Use strong passwords and share them out-of-band (different channel than the code).</li>
        <li>Treat claim codes like cash - anyone with the code can claim the funds.</li>
        <li>USDC drops require ~0.002 SOL extra to pay for token account rent.</li>
      </ul>
    ),
  },
  {
    id: "dev-notes",
    title: "Developer Notes",
    icon: <Terminal size={18} />,
    content: (
      <>
        <p>
          Core logic lives in <code>src/lib/drop.ts</code> (compression/decompression via Light Protocol),
          <code>src/lib/encryption.ts</code> (AES), and <code>src/lib/nullifier.ts</code> (double-spend prevention).
        </p>
        <p className="mt-2 text-sm text-[rgba(224,224,224,0.75)]">
          Light Protocol SDK: <code>@lightprotocol/compressed-token</code> and <code>@lightprotocol/stateless.js</code>.
          History and settings persist in browser localStorage via Zustand.
        </p>
      </>
    ),
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-16 text-[var(--text)]">
      <header className="space-y-4 text-center">
        <p className="text-xs tracking-[0.8em] text-[var(--accent)]">DARKDROP / DOCS</p>
        <h1 className="text-3xl font-semibold tracking-[0.3em] text-white">Guide &amp; Playbook</h1>
        <p className="text-sm text-[rgba(224,224,224,0.7)]">
          Understand every step—create, share, claim, and secure Solana dead drops with confidence.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[rgba(224,224,224,0.7)]">
          <div className="flex items-center gap-2 border border-[rgba(0,255,65,0.3)] px-3 py-1">
            <Lock size={14} /> Client-side encryption
          </div>
          <div className="flex items-center gap-2 border border-[rgba(0,255,65,0.3)] px-3 py-1">
            <Shield size={14} /> Mainnet-only
          </div>
          <div className="flex items-center gap-2 border border-[rgba(0,255,65,0.3)] px-3 py-1">
            <Share size={14} /> Off-chain delivery
          </div>
        </div>
      </header>

      <section className="space-y-3 border border-[rgba(0,255,65,0.2)] bg-black/40 p-5 text-sm text-[rgba(224,224,224,0.75)]">
        <p className="text-xs tracking-[0.4em] text-[var(--accent)]">TABLE OF CONTENTS</p>
        <ul className="grid gap-2 md:grid-cols-2">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="flex items-center gap-2 text-[rgba(224,224,224,0.8)] hover:text-[var(--accent)]">
                <ArrowUpRight size={14} />
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {sections.map((section) => (
        <section key={section.id} id={section.id} className="space-y-3 border border-[rgba(0,255,65,0.25)] bg-black/30 p-5">
          <header className="flex items-center gap-3 text-[var(--accent)]">
            {section.icon}
            <h2 className="text-sm tracking-[0.4em]">{section.title}</h2>
          </header>
          <div className="text-sm leading-relaxed text-[rgba(224,224,224,0.85)]">{section.content}</div>
        </section>
      ))}

      <footer className="space-y-3 border border-[rgba(0,255,65,0.3)] bg-black/60 p-5 text-center text-sm text-[rgba(224,224,224,0.7)]">
        <p>Questions or integration ideas?</p>
        <Link href="https://github.com/hitman-kai/darkdrop" target="_blank" className="inline-flex items-center gap-2 text-[var(--accent)]">
          View the repository <ArrowUpRight size={14} />
        </Link>
      </footer>
    </div>
  );
}
