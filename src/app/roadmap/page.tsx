type TimelineEntry = {
  title: string;
  bullets: string[];
  status: string;
};

const TIMELINE: TimelineEntry[] = [
  {
    title: 'v1 \u2014 Launched November 2025',
    bullets: [
      'Anonymous dead drops via burner keypairs',
      'Optional AES password protection',
      'QR + claim code sharing',
      'One-click sweep and burner purge',
      'Local history',
      'Full PWA installable',
    ],
    status: 'Status: LIVE',
  },
  {
    title: 'v2 \u2014 December 2025',
    bullets: [
      'Ultra Private Mode via Light Protocol ZK compression',
      'Compressed SOL/USDC drops stored in merkle trees',
      'Addresses + amounts hidden on-chain via validity proofs',
      'Claim codes use v2 format with compression markers',
      'Seamless compress/decompress flow for claiming',
    ],
    status: 'Status: LIVE',
  },
  {
    title: 'v3 \u2014 2026',
    bullets: [
      'Cross-chain bridge integration',
      'Time-locked drops (auto-return if unclaimed)',
      'Multi-recipient batch drops',
      'Duress password (wrong password sweeps to decoy wallet)',
      'Tor / i2p hidden service mirror',
      'Telegram Mini App version',
    ],
    status: 'Status: Planned',
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

      <div className="mt-16 flex flex-col gap-12">
        {TIMELINE.map((entry) => (
          <div key={entry.title} className="relative border-l-2 border-[var(--accent)] pl-6">
            <span className="absolute -left-[7px] top-2 block h-3 w-3 rounded-full bg-[var(--accent)]" aria-hidden />
            <p className="font-mono text-xl uppercase tracking-[0.5em] text-white">{entry.title}</p>
            <div className="mt-4 space-y-2 text-sm text-[rgba(224,224,224,0.85)]">
              {entry.bullets.map((bullet) => (
                <p key={bullet} className="font-mono text-[var(--muted-text,#d7fedd)]">
                  {"\u2022"} {bullet}
                </p>
              ))}
            </div>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.6em] text-[var(--accent)]">
              {entry.status}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
