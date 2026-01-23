type TimelineEntry = {
  title: string;
  bullets: string[];
  status: string;
  statusColor?: string;
};

const TIMELINE: TimelineEntry[] = [
  {
    title: 'v1 — November 2025',
    bullets: [
      'Anonymous dead drops via burner keypairs',
      'SOL + USDC support on mainnet',
      'Optional AES-256 password protection',
      'QR code + claim code generation',
      'One-click sweep and burner purge',
      'Local history (browser storage)',
      'Full PWA — installable, offline-capable',
    ],
    status: 'LIVE',
    statusColor: 'var(--accent)',
  },
  {
    title: 'v2 — January 2026',
    bullets: [
      'Ultra Private Mode via Light Protocol ZK compression',
      'Compressed SOL/USDC in merkle trees with validity proofs',
      'Fixed denominations (0.1, 0.5, 1, 10 SOL / $1, $5, $10, $100)',
      'Relayer service for gasless claims',
      'Nullifier system prevents double-spending',
      'On-chain link between sender and receiver broken',
    ],
    status: 'LIVE',
    statusColor: 'var(--accent)',
  },
  {
    title: 'v2.1 — January 2026',
    bullets: [
      'Batch drops (multi-recipient) with 2-20 drops per session',
      'Clawback flow for unclaimed drops',
      'Claim code storage in local history',
    ],
    status: 'LIVE',
    statusColor: 'var(--accent)',
  },
  {
    title: 'v3 — Q2 2026',
    bullets: [
      'DarkPool — shielded mixing pool for maximum privacy',
      'Time-delayed claims (randomized 1-24hr wait)',
      'Tor routing for RPC calls (hide IP from providers)',
      'Telegram Mini App integration',
      'Duress mode (decoy wallet on wrong password)',
    ],
    status: 'IN PROGRESS',
    statusColor: 'rgba(255, 200, 0, 0.9)',
  },
  {
    title: 'v4 — 2026+',
    bullets: [
      'Cross-chain bridge integration',
      'Hardware wallet signing support',
      'Self-hosted relayer option',
      'I2P hidden service mirror',
      'Mobile native apps (iOS/Android)',
      'SDK for third-party integrations',
    ],
    status: 'PLANNED',
    statusColor: 'rgba(224, 224, 224, 0.5)',
  },
] as const;

export default function RoadmapPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col bg-black px-6 py-16 text-white">
      <div className="flex flex-col gap-4">
        <p className="text-xs font-mono uppercase tracking-[0.6em] text-[var(--accent)]">
          OUTPUT // 0X01
        </p>
        <p className="font-mono text-4xl uppercase tracking-[0.8em] text-[var(--accent)]">
          DARKDROP ROADMAP
        </p>
      </div>

      {/* Current Focus */}
      <div className="mt-10 border border-[rgba(0,255,65,0.3)] bg-[rgba(0,255,65,0.05)] p-4">
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-[var(--accent)]">
          CURRENT FOCUS: UTILITY RELEASES
        </p>
        <p className="mt-2 font-mono text-sm text-[rgba(224,224,224,0.7)]">
          Shipping batch drops, clawback recovery, and stronger sender tooling while DarkPool continues in parallel.
        </p>
      </div>

      <div className="mt-12 flex flex-col gap-12">
        {TIMELINE.map((entry) => (
          <div key={entry.title} className="relative border-l-2 border-[var(--accent)] pl-6">
            <span className="absolute -left-[7px] top-2 block h-3 w-3 rounded-full bg-[var(--accent)]" aria-hidden />
            <p className="font-mono text-xl uppercase tracking-[0.5em] text-white">{entry.title}</p>
            <div className="mt-4 space-y-2 text-sm text-[rgba(224,224,224,0.85)]">
              {entry.bullets.map((bullet) => (
                <p key={bullet} className="font-mono text-[var(--muted-text,#d7fedd)]">
                  {"•"} {bullet}
                </p>
              ))}
            </div>
            <p 
              className="mt-6 font-mono text-xs uppercase tracking-[0.6em]"
              style={{ color: entry.statusColor || 'var(--accent)' }}
            >
              {entry.status}
            </p>
          </div>
        ))}
      </div>

      {/* Privacy Stack */}
      <div className="mt-16 border border-[rgba(0,255,65,0.2)] p-6">
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-[var(--accent)] mb-4">
          PRIVACY STACK
        </p>
        <div className="grid gap-4 md:grid-cols-3 font-mono text-xs">
          <div className="border border-[rgba(0,255,65,0.2)] p-3">
            <p className="text-[var(--accent)] mb-2">LAYER 1</p>
            <p className="text-[rgba(224,224,224,0.7)]">Transaction Privacy</p>
            <p className="text-[rgba(224,224,224,0.5)] mt-1">ZK compression, fixed amounts, mixing pool</p>
          </div>
          <div className="border border-[rgba(0,255,65,0.2)] p-3">
            <p className="text-[var(--accent)] mb-2">LAYER 2</p>
            <p className="text-[rgba(224,224,224,0.7)]">Identity Privacy</p>
            <p className="text-[rgba(224,224,224,0.5)] mt-1">No KYC, burner wallets, Tor routing</p>
          </div>
          <div className="border border-[rgba(0,255,65,0.2)] p-3">
            <p className="text-[var(--accent)] mb-2">LAYER 3</p>
            <p className="text-[rgba(224,224,224,0.7)]">Code Security</p>
            <p className="text-[rgba(224,224,224,0.5)] mt-1">AES encryption, client-side keys</p>
          </div>
        </div>
      </div>
    </div>
  );
}
