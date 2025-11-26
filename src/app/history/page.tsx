"use client";

import Link from "next/link";
import { ArrowUpRight, Clock3, ShieldCheck } from "lucide-react";

import { CLUSTER_LABELS, ClusterType, getAssetSymbol } from "@/lib/tokens";
import { useHistoryStore } from "@/store/history";

const explorerUrl = (signature: string, cluster: ClusterType) => {
  const base = `https://solscan.io/tx/${signature}`;
  return cluster === "mainnet" ? base : `${base}?cluster=${cluster}`;
};

export default function HistoryPage() {
  const sentDrops = useHistoryStore((state) => state.sentDrops);
  const claimedDrops = useHistoryStore((state) => state.claimedDrops);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16">
      <div className="space-y-3">
        <Link href="/" className="text-xs tracking-[0.4em] text-[var(--accent)]">
          DARKDROP / HISTORY
        </Link>
        <p className="text-2xl font-semibold tracking-[0.3em] text-white">Local Activity</p>
        <p className="text-sm text-[rgba(224,224,224,0.7)]">
          Stored only in this device&apos;s local storage. Wipe your browser to purge traces.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="border border-[rgba(0,255,65,0.2)] bg-[var(--card)] p-5">
          <header className="mb-4 flex items-center gap-2 text-sm tracking-[0.3em] text-[var(--accent)]">
            <Clock3 size={18} />
            SENT DROPS
          </header>
          <div className="space-y-4 text-xs">
            {sentDrops.length === 0 && <p className="text-[rgba(224,224,224,0.6)]">No drops created yet.</p>}
            {sentDrops.map((drop) => (
              <div key={drop.signature} className="border border-[rgba(0,255,65,0.2)] p-3">
                <p className="text-[var(--accent)]">
                  {drop.amount} {getAssetSymbol(drop.asset)}
                </p>
                <p className="mt-1 text-[rgba(224,224,224,0.7)]">{drop.address}</p>
                <p className="text-[rgba(224,224,224,0.5)]">
                  {new Date(drop.createdAt).toLocaleString()} · {CLUSTER_LABELS[drop.cluster]}
                </p>
                <p
                  className={`mt-1 text-xs uppercase tracking-[0.3em] ${
                    drop.status === "claimed" ? "text-[var(--accent)]" : "text-[var(--danger)]"
                  }`}
                >
                  {drop.status}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[rgba(0,255,65,0.2)] bg-[var(--card)] p-5">
          <header className="mb-4 flex items-center gap-2 text-sm tracking-[0.3em] text-[var(--accent)]">
            <ShieldCheck size={18} />
            CLAIMED DROPS
          </header>
          <div className="space-y-4 text-xs">
            {claimedDrops.length === 0 && <p className="text-[rgba(224,224,224,0.6)]">No claims recorded.</p>}
            {claimedDrops.map((drop) => (
              <div key={drop.signature} className="border border-[rgba(0,255,65,0.2)] p-3">
                <p className="text-[var(--accent)]">
                  {drop.amount} {getAssetSymbol(drop.asset)} swept
                </p>
                <p className="mt-1 text-[rgba(224,224,224,0.7)]">{drop.address}</p>
                <p className="text-[rgba(224,224,224,0.5)]">
                  {new Date(drop.claimedAt).toLocaleString()} · {CLUSTER_LABELS[drop.cluster]}
                </p>
                <a
                  href={explorerUrl(drop.signature, drop.cluster)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[var(--accent)]"
                >
                  View TX <ArrowUpRight size={14} />
                </a>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

