"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, ShieldCheck } from "lucide-react";

import { CLUSTER_LABELS, getAssetSymbol } from "@/lib/tokens";
import { buildEncryptedVault } from "@/lib/vault";
import { useHistoryStore } from "@/store/history";

const explorerUrl = (signature: string) => {
  const base = `https://solscan.io/tx/${signature}`;
  return base;
};

const claimUrl = (code: string) => `/drop/claim?code=${encodeURIComponent(code)}`;

const copyToClipboard = async (value: string) => {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // ignore clipboard errors
  }
};

export default function HistoryPage() {
  const sentDrops = useHistoryStore((state) => state.sentDrops);
  const claimedDrops = useHistoryStore((state) => state.claimedDrops);
  const [searchAddress, setSearchAddress] = useState("");
  const [recoverStatus, setRecoverStatus] = useState<string | null>(null);
  const [recoverClaimCode, setRecoverClaimCode] = useState<string | null>(null);
  const [vaultPassphrase, setVaultPassphrase] = useState("");
  const [vaultStatus, setVaultStatus] = useState<string | null>(null);
  const [vaultBusy, setVaultBusy] = useState(false);

  const handleRecover = () => {
    setRecoverStatus(null);
    setRecoverClaimCode(null);

    const target = searchAddress.trim();
    if (!target) {
      setRecoverStatus("Enter a drop address to search.");
      return;
    }
    if (typeof window === "undefined") {
      setRecoverStatus("Local storage unavailable.");
      return;
    }

    try {
      const raw = window.localStorage.getItem("darkdrop-history");
      if (!raw) {
        setRecoverStatus("No local history found.");
        return;
      }
      const parsed = JSON.parse(raw) as { state?: { sentDrops?: Array<{ address?: string; claimCode?: string }> } };
      const entries = parsed.state?.sentDrops ?? [];
      const match = entries.find((drop) => drop.address === target);
      if (!match) {
        setRecoverStatus("No matching drop found in local history.");
        return;
      }
      if (!match.claimCode) {
        setRecoverStatus("Match found, but no claim code was stored.");
        return;
      }
      setRecoverClaimCode(match.claimCode);
      setRecoverStatus("Claim code recovered from local storage.");
    } catch {
      setRecoverStatus("Failed to read local storage.");
    }
  };

  const handleVaultExport = async () => {
    setVaultStatus(null);
    if (typeof window === "undefined") {
      setVaultStatus("Vault export is only available in the browser.");
      return;
    }

    try {
      setVaultBusy(true);
      const snapshot = {
        sentDrops: sentDrops.map((drop) => ({
          address: drop.address,
          amount: drop.amount,
          asset: drop.asset,
          cluster: drop.cluster,
          claimCode: drop.claimCode,
          createdAt: drop.createdAt,
          status: drop.status,
        })),
        claimedDrops: claimedDrops.map((drop) => ({
          address: drop.address,
          amount: drop.amount,
          asset: drop.asset,
          cluster: drop.cluster,
          signature: drop.signature,
          claimedAt: drop.claimedAt,
        })),
      };
      const vault = await buildEncryptedVault(snapshot, vaultPassphrase);
      const blob = new Blob([JSON.stringify(vault, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `darkdrop-vault-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      setVaultStatus("Encrypted vault exported.");
    } catch (error) {
      setVaultStatus(error instanceof Error ? error.message : "Vault export failed.");
    } finally {
      setVaultBusy(false);
    }
  };

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
                {drop.claimCode && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <button type="button" onClick={() => copyToClipboard(drop.claimCode!)}>
                      COPY CLAIM CODE
                    </button>
                    <Link
                      href={claimUrl(drop.claimCode)}
                      className="border border-[rgba(255,0,68,0.6)] bg-[rgba(255,0,68,0.08)] px-3 py-2 text-[var(--danger)]"
                    >
                      CLAW BACK
                    </Link>
                  </div>
                )}
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
                  href={explorerUrl(drop.signature)}
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

      <section className="border border-[rgba(0,255,65,0.2)] bg-[var(--card)] p-5 text-xs">
        <p className="text-sm tracking-[0.3em] text-[var(--accent)]">RECOVER FROM LOCAL</p>
        <p className="mt-2 text-[rgba(224,224,224,0.7)]">
          Search this device&apos;s local history for a stored claim code by burner address.
        </p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={searchAddress}
            onChange={(event) => setSearchAddress(event.target.value)}
            placeholder="Paste drop address"
            className="flex-1"
          />
          <button type="button" onClick={handleRecover} className="px-4 py-2">
            CHECK LOCAL
          </button>
        </div>
        {recoverStatus && (
          <p className="mt-3 text-[rgba(224,224,224,0.7)]">{recoverStatus}</p>
        )}
        {recoverClaimCode && (
          <div className="mt-3 space-y-2">
            <p className="text-[var(--accent)]">Recovered claim code:</p>
            <pre className="max-h-32 overflow-y-auto bg-black/60 p-3 text-xs">{recoverClaimCode}</pre>
          </div>
        )}
      </section>

      <section className="border border-[rgba(0,255,65,0.2)] bg-[var(--card)] p-5 text-xs">
        <p className="text-sm tracking-[0.3em] text-[var(--accent)]">LOCAL PRIVACY VAULT</p>
        <p className="mt-2 text-[rgba(224,224,224,0.7)]">
          Export an encrypted vault file for offline storage or local watchtower monitoring. Passphrase never
          leaves your device.
        </p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row">
          <input
            type="password"
            value={vaultPassphrase}
            onChange={(event) => setVaultPassphrase(event.target.value)}
            placeholder="Vault passphrase"
            className="flex-1"
          />
          <button type="button" onClick={handleVaultExport} className="px-4 py-2" disabled={vaultBusy}>
            {vaultBusy ? "EXPORTING..." : "EXPORT VAULT"}
          </button>
        </div>
        {vaultStatus && <p className="mt-3 text-[rgba(224,224,224,0.7)]">{vaultStatus}</p>}
      </section>
    </div>
  );
}

