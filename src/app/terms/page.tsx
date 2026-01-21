import Link from "next/link";

export const metadata = {
  title: "DarkDrop Terms of Service",
  description: "Terms of Service for DarkDrop.",
};

const content = `# Terms of Service

**Effective date:** [insert date]  
**Applies to:** https://darkdrop.app

By using DarkDrop, you agree to these terms.

## Non-Custodial Service
DarkDrop is non-custodial. We never control your funds or private keys. You are fully responsible for your assets and transactions.

## Claim Code Responsibility
Claim codes are like cash. Anyone with the code can claim the funds. You are responsible for generating, storing, and sharing codes securely.

## No Guarantees of Privacy or Recovery
DarkDrop does not guarantee anonymity or fund recovery. On-chain transactions may be visible to network participants. Lost or exposed claim codes cannot be recovered.

## "As Is" Software
The protocol and interface are provided "as is" without warranties. Use at your own risk.

## Experimental Modules
Some modules (for example DarkPool) may be experimental or separate. Use them with caution and only when you understand the risks.

## Changes to the Protocol
We may modify or update the interface, relayer behavior, or protocol logic at any time.

## Limitation of Liability
To the maximum extent permitted by law, DarkDrop contributors are not liable for any loss, damages, or claims arising from your use of the software.

## Contact
support@darkdrop.app
`;

function renderInline(text: string) {
  const parts: Array<string | JSX.Element> = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={`${match.index}-${match[1]}`} className="text-white">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function renderMarkdown(text: string) {
  return text.split("\n").map((line, idx) => {
    if (line.startsWith("# ")) {
      return (
        <h1 key={idx} className="text-2xl font-semibold tracking-[0.2em] text-white">
          {renderInline(line.replace("# ", ""))}
        </h1>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h2 key={idx} className="text-sm tracking-[0.4em] text-[var(--accent)]">
          {renderInline(line.replace("## ", ""))}
        </h2>
      );
    }
    if (line.startsWith("- ")) {
      return (
        <li key={idx} className="ml-6 list-disc text-sm text-[rgba(224,224,224,0.85)]">
          {renderInline(line.replace("- ", ""))}
        </li>
      );
    }
    if (line.trim() === "") {
      return <div key={idx} className="h-3" />;
    }
    return (
      <p key={idx} className="text-sm text-[rgba(224,224,224,0.85)]">
        {renderInline(line)}
      </p>
    );
  });
}

export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16 text-[var(--text)]">
      <header className="space-y-3 text-center">
        <p className="text-xs tracking-[0.8em] text-[var(--accent)]">DARKDROP / TERMS</p>
        <p className="text-sm text-[rgba(224,224,224,0.7)]">Simple, clear, and privacy-first.</p>
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
