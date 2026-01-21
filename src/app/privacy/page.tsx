import Link from "next/link";

export const metadata = {
  title: "DarkDrop Privacy Policy",
  description: "Privacy Policy for DarkDrop.",
};

const content = `# Privacy Policy

**Effective date:** [insert date]  
**Applies to:** https://darkdrop.app

DarkDrop is a privacy-focused Solana dApp for private value transfers using Light Protocol compression and burner keypairs. This policy explains what we do and do not collect.

## What We Do NOT Collect
- We do not collect personal data (no names, emails, phone numbers, or IDs).
- We do not collect wallet private keys or seed phrases.
- We do not run tracking analytics or behavioral profiling.
- We do not require accounts, logins, or KYC.

## Wallet Usage
Wallet connections happen client-side in your browser. Your wallet provider (for example Phantom) handles permissions. We do not custody funds or keys.

## Claim Codes
Claim codes are generated and handled client-side. They enable the recipient to claim funds. Anyone with the claim code can claim. We do not store claim codes.

## Relayer Role
If a relayer is used, it only submits transactions on your behalf. It does not control your funds or private keys.

## Encryption
Optional AES-256 encryption for claim codes is performed client-side only. We do not receive or store passwords or decrypted data.

## Nullifiers
Nullifier checks are currently enforced at the application level only. This does not provide guarantees beyond the app's checks.

## Third-Party Services
DarkDrop relies on:
- Solana network and validators
- Light Protocol compression
- RPC providers (for example Helius or other configured RPCs)

These services have their own policies and may log network metadata.

## Cookies and Analytics
We do not use cookies or analytics unless strictly required for basic functionality.

## Contact
support@darkdrop.app
`;

function renderMarkdown(text: string) {
  return text.split("\n").map((line, idx) => {
    if (line.startsWith("# ")) {
      return (
        <h1 key={idx} className="text-2xl font-semibold tracking-[0.2em] text-white">
          {line.replace("# ", "")}
        </h1>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h2 key={idx} className="text-sm tracking-[0.4em] text-[var(--accent)]">
          {line.replace("## ", "")}
        </h2>
      );
    }
    if (line.startsWith("- ")) {
      return (
        <li key={idx} className="ml-6 list-disc text-sm text-[rgba(224,224,224,0.85)]">
          {line.replace("- ", "")}
        </li>
      );
    }
    if (line.trim() === "") {
      return <div key={idx} className="h-3" />;
    }
    return (
      <p key={idx} className="text-sm text-[rgba(224,224,224,0.85)]">
        {line}
      </p>
    );
  });
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16 text-[var(--text)]">
      <header className="space-y-3 text-center">
        <p className="text-xs tracking-[0.8em] text-[var(--accent)]">DARKDROP / PRIVACY</p>
        <p className="text-sm text-[rgba(224,224,224,0.7)]">Minimal, transparent, privacy-first.</p>
      </header>

      <section className="space-y-3 border border-[rgba(0,255,65,0.25)] bg-black/30 p-5">
        {renderMarkdown(content)}
      </section>

      <footer className="text-center text-xs text-[rgba(224,224,224,0.6)]">
        <Link href="/" className="text-[var(--accent)] underline">
          Return to DarkDrop
        </Link>
      </footer>
    </div>
  );
}
