import Link from "next/link";
import { ArrowUpRight, Eye, EyeOff, Lock, Shield, Share, Terminal, Layers, Clock } from "lucide-react";

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
          DarkDrop is a privacy-focused value transfer layer on Solana mainnet. Create anonymous transfers using 
          ZK-compressed drops via Light Protocol with fixed denominations for maximum privacy.
        </p>
        <ul className="list-disc space-y-2 pl-6 text-sm text-[rgba(224,224,224,0.75)]">
          <li>SOL and USDC supported on mainnet</li>
          <li>Fixed denominations prevent amount correlation attacks</li>
          <li>Light Protocol ZK compression hides transaction details</li>
          <li>Password protection encrypts claim codes with AES-256</li>
          <li>Relayer service provides gas abstraction for claimers</li>
        </ul>
      </>
    ),
  },
  {
    id: "privacy-layers",
    title: "Privacy Layers",
    icon: <Layers size={18} />,
    content: (
      <>
        <p>
          True privacy requires protecting multiple layers. DarkDrop addresses each one:
        </p>
        <div className="mt-4 space-y-4">
          <div className="border-l-2 border-[var(--accent)] pl-4">
            <p className="text-xs tracking-wider text-[var(--accent)] mb-2">LAYER 1: TRANSACTION PRIVACY</p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-[rgba(224,224,224,0.75)]">
              <li>ZK compression via Light Protocol</li>
              <li>Fixed denominations (0.1, 0.5, 1, 10 SOL)</li>
              <li>Shared pool hides individual transactions</li>
              <li>Nullifier system prevents double-spending</li>
            </ul>
          </div>
          <div className="border-l-2 border-[rgba(0,255,65,0.5)] pl-4">
            <p className="text-xs tracking-wider text-[rgba(0,255,65,0.7)] mb-2">LAYER 2: IDENTITY PRIVACY</p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-[rgba(224,224,224,0.75)]">
              <li>No KYC or account required</li>
              <li>Burner wallets for operational security</li>
              <li>Tor RPC routing (coming in v3)</li>
            </ul>
          </div>
          <div className="border-l-2 border-[rgba(224,224,224,0.3)] pl-4">
            <p className="text-xs tracking-wider text-[rgba(224,224,224,0.5)] mb-2">LAYER 3: CODE SECURITY</p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-[rgba(224,224,224,0.75)]">
              <li>Optional AES-256 encryption with scrypt key derivation</li>
              <li>Client-side key generation only</li>
              <li>No server-side key storage</li>
            </ul>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "fixed-denominations",
    title: "Fixed Denominations",
    icon: <Shield size={18} />,
    content: (
      <>
        <p>
          DarkDrop uses fixed amounts to prevent correlation attacks. When everyone deposits the same amounts,
          observers cannot link deposits to claims by matching values.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="border border-[rgba(0,255,65,0.2)] p-4">
            <p className="text-xs tracking-wider text-[var(--accent)] mb-2">SOL AMOUNTS</p>
            <div className="flex flex-wrap gap-2">
              <span className="border border-[rgba(0,255,65,0.3)] px-2 py-1 text-xs">0.1</span>
              <span className="border border-[rgba(0,255,65,0.3)] px-2 py-1 text-xs">0.5</span>
              <span className="border border-[rgba(0,255,65,0.3)] px-2 py-1 text-xs">1</span>
              <span className="border border-[rgba(0,255,65,0.3)] px-2 py-1 text-xs">10</span>
            </div>
          </div>
          <div className="border border-[rgba(0,255,65,0.2)] p-4">
            <p className="text-xs tracking-wider text-[var(--accent)] mb-2">USDC AMOUNTS</p>
            <div className="flex flex-wrap gap-2">
              <span className="border border-[rgba(0,255,65,0.3)] px-2 py-1 text-xs">$1</span>
              <span className="border border-[rgba(0,255,65,0.3)] px-2 py-1 text-xs">$5</span>
              <span className="border border-[rgba(0,255,65,0.3)] px-2 py-1 text-xs">$10</span>
              <span className="border border-[rgba(0,255,65,0.3)] px-2 py-1 text-xs">$100</span>
            </div>
          </div>
        </div>
        <div className="mt-4 bg-black/40 p-4 font-mono text-xs text-[rgba(224,224,224,0.7)]">
          <p className="text-[var(--accent)] mb-2">// Without fixed amounts (traceable)</p>
          <p>Deposit: 7.3891 SOL → Claim: 7.3891 SOL = Same person</p>
          <p className="text-[var(--accent)] mt-3 mb-2">// With fixed amounts (anonymous)</p>
          <p>Deposit: 1 SOL (1 of 1000) → Claim: 1 SOL = Could be anyone</p>
        </div>
      </>
    ),
  },
  {
    id: "ultra-private",
    title: "Ultra Private Mode",
    icon: <EyeOff size={18} />,
    content: (
      <>
        <p>
          Ultra Private Mode uses Light Protocol&apos;s ZK compression to hide your drop in a merkle tree with validity proofs.
          Unlike burner wallets, compressed drops don&apos;t create visible on-chain accounts.
        </p>
        <ol className="space-y-3 text-sm text-[rgba(224,224,224,0.8)] mt-4">
          <li>
            <strong>Compress:</strong> Your SOL/USDC is compressed into Light Protocol&apos;s state tree.
          </li>
          <li>
            <strong>Share:</strong> The claim code contains the keypair to access the compressed funds.
          </li>
          <li>
            <strong>Decompress:</strong> Recipient decompresses the funds to their wallet using validity proofs.
          </li>
        </ol>
        <div className="mt-4 bg-black/40 p-4 font-mono text-xs text-[rgba(224,224,224,0.7)]">
          <p className="text-[var(--accent)] mb-2">// Privacy Flow</p>
          <p>Creator (Wallet A) → Compress → Merkle Tree</p>
          <p className="text-[rgba(224,224,224,0.4)]">{"                              |"}</p>
          <p className="text-[rgba(224,224,224,0.4)]">{"                    [share code off-chain]"}</p>
          <p className="text-[rgba(224,224,224,0.4)]">{"                              |"}</p>
          <p>Claimer (Wallet B) ← Decompress ← Merkle Tree</p>
          <p className="mt-2 text-[var(--accent)]">// No on-chain link between Wallet A and B</p>
        </div>
      </>
    ),
  },
  {
    id: "darkpool",
    title: "DarkPool (Live)",
    icon: <Shield size={18} />,
    content: (
      <>
        <p>
          DarkPool is a shielded mixing pool that provides maximum privacy by breaking all on-chain links
          between deposits and claims. It is live and uses a shared pool wallet with Light Protocol compression.
        </p>
        <div className="mt-4 bg-black/40 p-4 font-mono text-xs text-[rgba(224,224,224,0.7)]">
          <p className="text-[var(--accent)] mb-2">// DarkPool Flow</p>
          <p>Wallet A → Deposit 1 SOL ─┐</p>
          <p>Wallet B → Deposit 1 SOL ─┼─→ [SHIELDED POOL] ─┬─→ Claim → Wallet X</p>
          <p>Wallet C → Deposit 1 SOL ─┘                    ├─→ Claim → Wallet Y</p>
          <p>{"                                              └─→ Claim → Wallet Z"}</p>
          <p className="mt-2 text-[var(--accent)]">// No way to know: A→X? A→Y? B→Z?</p>
        </div>
        <ul className="list-disc space-y-2 pl-6 text-sm text-[rgba(224,224,224,0.75)] mt-4">
          <li>All deposits go to a shared shielded pool</li>
          <li>Claims come from the pool, not linked to specific deposits</li>
          <li>Time delays add additional privacy (planned)</li>
          <li>Relayer-managed for gas abstraction</li>
        </ul>
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
          Connect a wallet on <strong>Solana Mainnet</strong> funded with SOL.
        </li>
        <li>
          Select asset (SOL or USDC) and pick a fixed denomination.
        </li>
        <li>
          Optionally enable <strong>Ultra Private Mode</strong> for ZK compression.
        </li>
        <li>
          Optionally set a password to encrypt the claim code.
        </li>
        <li>
          Confirm the transaction. Your funds are compressed into the shielded pool.
        </li>
        <li>
          You receive a claim code and QR. Share only with the intended recipient.
        </li>
      </ol>
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
          Connect your wallet (or use relayer for gasless claims).
        </li>
        <li>
          Light Protocol decompresses the funds using validity proofs.
        </li>
        <li>
          Funds arrive in your wallet. The claim keypair is destroyed.
        </li>
      </ol>
    ),
  },
  {
    id: "claim-formats",
    title: "Claim Code Formats",
    icon: <Share size={18} />,
    content: (
      <>
        <p>
          Claim codes encode the keypair needed to access funds. Password-protected codes use AES encryption.
        </p>
        <div className="mt-4 space-y-2 font-mono text-xs">
          <div className="border-l-2 border-[var(--accent)] pl-3 py-1">
            <p className="text-[var(--accent)]">Ultra Private SOL</p>
            <p className="text-[rgba(224,224,224,0.7)]">darkdrop:v2:mainnet:sol:compressed:raw:...</p>
          </div>
          <div className="border-l-2 border-[rgba(0,255,65,0.5)] pl-3 py-1">
            <p className="text-[rgba(0,255,65,0.7)]">Password Protected</p>
            <p className="text-[rgba(224,224,224,0.7)]">darkdrop:v2:mainnet:usdc:compressed:aes:HINT:...</p>
          </div>
          <div className="border-l-2 border-[rgba(224,224,224,0.3)] pl-3 py-1">
            <p className="text-[rgba(224,224,224,0.5)]">Standard Drop</p>
            <p className="text-[rgba(224,224,224,0.7)]">darkdrop:v2:mainnet:sol:raw:...</p>
          </div>
          <div className="border-l-2 border-[rgba(224,224,224,0.2)] pl-3 py-1">
            <p className="text-[rgba(224,224,224,0.4)]">DarkPool (Live)</p>
            <p className="text-[rgba(224,224,224,0.7)]">darkpool:v1:mainnet:sol:1:...</p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    icon: <Lock size={18} />,
    content: (
      <ul className="list-disc space-y-3 pl-6 text-sm text-[rgba(224,224,224,0.75)]">
        <li>All cryptography happens client-side. No keys touch any server.</li>
        <li>Claim codes are like cash. Anyone with the code can claim.</li>
        <li>Use strong passwords and share them separately from the code.</li>
        <li>Ultra Private Mode provides stronger privacy than burner wallets.</li>
        <li>Fixed denominations prevent amount-based tracking.</li>
        <li>Nullifiers prevent double-spending cryptographically.</li>
      </ul>
    ),
  },
  {
    id: "roadmap",
    title: "Roadmap",
    icon: <Clock size={18} />,
    content: (
      <div className="space-y-3 font-mono text-xs">
        <div className="flex items-center gap-4">
          <span className="text-[var(--accent)]">v1.0</span>
          <span className="text-[rgba(224,224,224,0.5)]">Nov 2025</span>
          <span className="text-[rgba(224,224,224,0.7)]">Burner drops, SOL + USDC</span>
          <span className="text-[var(--accent)]">LIVE</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[var(--accent)]">v2.0</span>
          <span className="text-[rgba(224,224,224,0.5)]">Jan 2026</span>
          <span className="text-[rgba(224,224,224,0.7)]">ZK compression, Relayer, Fixed amounts</span>
          <span className="text-[var(--accent)]">LIVE</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[rgba(224,224,224,0.5)]">v3.0</span>
          <span className="text-[rgba(224,224,224,0.5)]">Q2 2026</span>
          <span className="text-[rgba(224,224,224,0.7)]">DarkPool, Time delays, Tor routing</span>
          <span className="text-[rgba(224,224,224,0.4)]">BUILDING</span>
        </div>
      </div>
    ),
  },
  {
    id: "dev-notes",
    title: "Developer Notes",
    icon: <Terminal size={18} />,
    content: (
      <>
        <p>
          Core logic: <code>src/lib/drop.ts</code> (compression), <code>src/lib/pool.ts</code> (DarkPool),
          <code>src/lib/encryption.ts</code> (AES), <code>src/lib/nullifier.ts</code> (double-spend prevention).
        </p>
        <p className="mt-2 text-sm text-[rgba(224,224,224,0.75)]">
          Dependencies: <code>@lightprotocol/compressed-token</code>, <code>@lightprotocol/stateless.js</code>,
          <code>tweetnacl</code>, <code>zustand</code>.
        </p>
        <p className="mt-2 text-sm text-[rgba(224,224,224,0.75)]">
          Open source: <a href="https://github.com/hitman-kai/darkdrop" className="text-[var(--accent)] underline">github.com/hitman-kai/darkdrop</a>
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
            <Shield size={14} /> ZK Compression
          </div>
          <div className="flex items-center gap-2 border border-[rgba(0,255,65,0.3)] px-3 py-1">
            <Share size={14} /> Fixed Denominations
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
