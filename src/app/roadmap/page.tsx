const TIMELINE = [
  {
    title: "v1 â€” Launched November 2025",
    bullets: [
      "â€¢ Anonymous dead drops via burner keypairs",
      "â€¢ Optional AES password protection",
      "â€¢ QR + claim code sharing",
      "â€¢ One-click sweep and burner purge",
      "â€¢ Local history",
      "â€¢ Full PWA installable",
    ],
    status: "LIVE",
  },
  {
    title: "v2 â€” Q4 2025 / Q1 2026",
    bullets: [
      "â€¢ Token-2022 Confidential Transfers (amounts hidden on-chain via zk)",
      "â€¢ Support for cUSDC / private SPL tokens",
      "â€¢ Confidential balances enabled automatically",
      "â€¢ \"Private Mode\" toggle â€” hides transfer amounts even if sender/receiver use main wallets",
      "â€¢ Light Protocol integration option (ultra-private mode)",
      "â€¢ Private SOL drops (zk-compressed, addresses + amounts fully hidden)",
      "â€¢ Shielded notes instead of burner keypairs",
      "â€¢ Deposit â†’ private drop â†’ claim â†’ withdraw ceremony (optional public sweep)",
    ],
    status: "In Development",
  },
  {
    title: "v3 â€” 2026",
    bullets: [
      "â€¢ Time-locked drops (auto-return if unclaimed)",
      "â€¢ Multi-recipient batch drops",
      "â€¢ Duress password (wrong password sweeps to decoy wallet)",
      "â€¢ Tor / i2p hidden service mirror",
      "â€¢ Telegram Mini App version",
    ],
    status: "Planned",
  },
];

export default function RoadmapPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-16 text-white">
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
          <div key={entry.title} className="border-l-2 border-[var(--accent)] pl-6">
            <p className="font-mono text-xl uppercase tracking-[0.5em] text-white">
              {entry.title}
            </p>
            <div className="mt-4 space-y-2 text-sm text-[rgba(224,224,224,0.85)]">
              {entry.bullets.map((bullet) => (
                <p key={bullet} className="font-mono">
                  {bullet}
                </p>
              ))}
            </div>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.6em] text-[var(--accent)]">
              Status: {entry.status}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
