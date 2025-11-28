import Link from "next/link";
import { ArrowUpRight, Lock, Shield, Share, Terminal } from "lucide-react";

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
          DarkDrop is a “dead drop” layer on Solana mainnet. When you create a drop, the app spins up a disposable
          keypair (“burner”), transfers the requested asset into it, and hands you the burner’s private key as a claim
          string. Anyone holding that string can reconstruct the keypair and sweep the funds, but there is no on-chain
          link between the sender and recipient beyond the initial deposit.
        </p>
        <ul className="list-disc space-y-2 pl-6 text-sm text-[rgba(224,224,224,0.75)]">
          <li>SOL and cUSDC (Token-2022, mainnet) are supported.</li>
          <li>Password protection optionally encrypts the private key with AES (tweetnacl secretbox + PBKDF2).</li>
          <li>Claim strings use the format <code>darkdrop:v1:{`{cluster}`}:{`{asset}`}:{`{mode}`}:{`…`}</code>.</li>
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
          Connect a wallet that is on <strong>Solana Mainnet Beta</strong> and funded with SOL (0.01 SOL buffer
          recommended). cUSDC (Token-2022) drops also require rent for the recipient ATA.
        </li>
        <li>
          Pick the asset + amount and optionally enter a password. When you confirm, DarkDrop generates a new burner
          keypair entirely in-browser and pushes the funds into it via a System Program transfer (and ATA instructions
          for USDC).
        </li>
        <li>
          You receive (a) a claim string, (b) a QR code representation, and (c) the Solscan link for the deposit
          transaction. Share only the claim string/QR; never send the keypair anywhere else.
        </li>
      </ol>
    ),
  },
  {
    id: "share",
    title: "Sharing & Claim Codes",
    icon: <Share size={18} />,
    content: (
      <>
        <p>
          Raw drops use base58-encoded secret keys. Password-protected drops append an AES payload with a password hint
          (first 8 bytes of the PBKDF2 hash) so the recipient can verify they have the right passphrase before
          decrypting.
        </p>
        <ul className="list-disc space-y-2 pl-6 text-sm text-[rgba(224,224,224,0.75)]">
          <li>
            <code>darkdrop:v1:mainnet:sol:raw:XyZ…</code> – raw SOL drop.
          </li>
          <li>
            <code>darkdrop:v1:mainnet:usdc:aes:2f8a9c11:BASE64</code> – password-protected cUSDC (Token-2022) drop.
          </li>
          <li>
            Older “legacy” claim strings that are just base58 private keys are still supported during import.
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
          Paste or scan the claim string. If the drop was encrypted, enter the password and the app will confirm the hint
          before decrypting.
        </li>
        <li>
          DarkDrop rebuilds the burner keypair locally and temporarily registers it with Wallet Adapter as “Burner
          Import.” The burner never leaves the browser.
        </li>
        <li>
          When you hit <strong>Sweep</strong>, the app signs a transfer from the burner to your connected wallet and
          destroys the burner reference. Local history is the only record.
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
        <li>Everything happens client-side; no claim strings or private keys ever touch a server.</li>
        <li>
          Use strong passwords for AES drops and communicate them out-of-band. The password hint is only a hash fragment
          so the sender/recipient can confirm they’re in sync.
        </li>
        <li>
          Treat claim strings like bearer instruments. Anyone with the string can sweep the funds, so avoid copying them
          into shared channels.
        </li>
        <li>cUSDC (Token-2022) drops require ~0.002 SOL extra to pay ATA rent for the burner.</li>
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
          The underlying helpers live in <code>src/lib/drop.ts</code> (claim formatting / parsing) and <code>src/lib/encryption.ts</code> (tweetnacl secretbox + PBKDF2 using @noble/hashes). Burner wallets are
          mounted via a lightweight adapter so Wallet Adapter treats them like any other signer.
        </p>
        <p className="mt-2 text-sm text-[rgba(224,224,224,0.75)]">
          The history, settings, and burner stores are implemented with Zustand and persist only to the user’s browser.
          Clearing site data obliterates your local activity log.
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
