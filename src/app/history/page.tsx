"use client";
import { useState } from "react";
import Link from "next/link";
import { useHistoryStore } from "@/store/history";
import { CLUSTER_LABELS, getAssetSymbol } from "@/lib/tokens";
import { buildEncryptedVault } from "@/lib/vault";

const explorerUrl = (sig: string) => `https://solscan.io/tx/${sig}`;
const claimUrl = (code: string) => `/drop/claim?code=${encodeURIComponent(code)}`;

export default function HistoryPage() {
  const sentDrops = useHistoryStore((state) => state.sentDrops);
  const claimedDrops = useHistoryStore((state) => state.claimedDrops);
  const [searchAddress, setSearchAddress] = useState("");
  const [recoverStatus, setRecoverStatus] = useState<string | null>(null);
  const [recoverClaimCode, setRecoverClaimCode] = useState<string | null>(null);
  const [vaultPassphrase, setVaultPassphrase] = useState("");
  const [vaultStatus, setVaultStatus] = useState<string | null>(null);
  const [vaultBusy, setVaultBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<"sent" | "claimed">("sent");

  const copy = async (val: string, key: string) => {
    try { await navigator.clipboard.writeText(val); setCopied(key); setTimeout(() => setCopied(null), 2000); } catch {}
  };

  const handleRecover = () => {
    setRecoverStatus(null);
    setRecoverClaimCode(null);
    const target = searchAddress.trim();
    if (!target) { setRecoverStatus("Enter a drop address to search."); return; }
    try {
      const raw = window.localStorage.getItem("darkdrop-history");
      if (!raw) { setRecoverStatus("No local history found."); return; }
      const parsed = JSON.parse(raw) as { state?: { sentDrops?: Array<{ address?: string; claimCode?: string }> } };
      const match = (parsed.state?.sentDrops ?? []).find((d) => d.address === target);
      if (!match) { setRecoverStatus("No matching drop found."); return; }
      if (!match.claimCode) { setRecoverStatus("Match found but no claim code stored."); return; }
      setRecoverClaimCode(match.claimCode);
      setRecoverStatus("Claim code recovered.");
    } catch { setRecoverStatus("Failed to read local storage."); }
  };

  const handleVaultExport = async () => {
    setVaultStatus(null);
    try {
      setVaultBusy(true);
      const snapshot = {
        sentDrops: sentDrops.map((d) => ({ address: d.address, amount: d.amount, asset: d.asset, cluster: d.cluster, claimCode: d.claimCode, createdAt: d.createdAt, status: d.status })),
        claimedDrops: claimedDrops.map((d) => ({ address: d.address, amount: d.amount, asset: d.asset, cluster: d.cluster, signature: d.signature, claimedAt: d.claimedAt })),
      };
      const vault = await buildEncryptedVault(snapshot, vaultPassphrase);
      const blob = new Blob([JSON.stringify(vault, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `darkdrop-vault-${new Date().toISOString().replace(/[:.]/g, "-")}.json`; a.click();
      window.URL.revokeObjectURL(url);
      setVaultStatus("Vault exported.");
    } catch (e) { setVaultStatus(e instanceof Error ? e.message : "Export failed."); }
    finally { setVaultBusy(false); }
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-[rgba(0,255,65,0.12)] bg-[rgba(0,0,0,0.92)] px-8 backdrop-blur-md" style={{height:"52px"}}>
        <span className="font-mono text-[13px] tracking-[0.22em] text-[var(--accent)]">DARKDROP</span>
        <div className="flex items-center gap-1 border border-[rgba(0,255,65,0.15)] px-1 py-1">
          <Link href="/" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[rgba(224,224,224,0.5)] transition-colors hover:text-[var(--accent)]">HOME</Link>
          <Link href="/drop/create" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[rgba(224,224,224,0.5)] transition-colors hover:text-[var(--accent)]">CREATE</Link>
          <Link href="/drop/claim" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[rgba(224,224,224,0.5)] transition-colors hover:text-[var(--accent)]">CLAIM</Link>
        </div>
        <Link href="/drop/create" className="border border-[var(--accent)] px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[var(--accent)] transition-colors hover:bg-[rgba(0,255,65,0.08)]">CREATE DROP</Link>
      </nav>

      <main className="mx-auto w-full max-w-3xl px-6 pb-20" style={{paddingTop:"80px"}}>
        <div className="mb-8">
          <p className="mb-2 font-mono text-[9px] tracking-[0.3em] text-[rgba(0,255,65,0.35)]">OUTPUT // 0X03</p>
          <h1 className="font-mono text-[clamp(24px,4vw,36px)] font-light leading-[1.15] text-[var(--text)]">Local activity.</h1>
          <p className="mt-3 text-xs leading-relaxed text-[rgba(224,224,224,0.45)]">Stored only in this device's local storage. Clear your browser to purge all traces.</p>
        </div>

        {/* TABS */}
        <div className="mb-3 flex border border-[rgba(0,255,65,0.1)]">
          {(["sent","claimed"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-3 font-mono text-[10px] tracking-[0.18em] border-none transition-colors ${
                tab === t ? "bg-[rgba(0,255,65,0.06)] text-[var(--accent)]" : "text-[rgba(224,224,224,0.3)] hover:text-[rgba(224,224,224,0.5)]"
              }`}
            >
              {t === "sent" ? `SENT (${sentDrops.length})` : `CLAIMED (${claimedDrops.length})`}
            </button>
          ))}
        </div>

        {/* SENT */}
        {tab === "sent" && (
          <div className="flex flex-col gap-2">
            {sentDrops.length === 0 && (
              <div className="border border-[rgba(0,255,65,0.08)] px-5 py-8 text-center">
                <p className="font-mono text-[10px] tracking-[0.2em] text-[rgba(224,224,224,0.2)]">NO DROPS CREATED YET</p>
              </div>
            )}
            {sentDrops.map((drop) => (
              <div key={drop.signature} className="border border-[rgba(0,255,65,0.1)] bg-[#050505]">
                <div className="border-b border-[rgba(0,255,65,0.08)] px-5 py-3 flex items-center justify-between">
                  <span className="font-mono text-[13px] text-[var(--accent)]">{drop.amount} {getAssetSymbol(drop.asset)}</span>
                  <span className={`font-mono text-[8px] tracking-[0.18em] border px-2 py-0.5 ${drop.status === "claimed" ? "text-[var(--accent)] border-[rgba(0,255,65,0.3)]" : "text-[rgba(224,224,224,0.3)] border-[rgba(224,224,224,0.1)]"}`}>{drop.status?.toUpperCase()}</span>
                </div>
                <div className="divide-y divide-[rgba(0,255,65,0.05)] text-[11px]">
                  <div className="flex justify-between px-5 py-2">
                    <span className="text-[rgba(224,224,224,0.3)]">Address</span>
                    <span className="font-mono text-[rgba(224,224,224,0.5)]">{drop.address.slice(0,8)}...{drop.address.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between px-5 py-2">
                    <span className="text-[rgba(224,224,224,0.3)]">Created</span>
                    <span className="text-[rgba(224,224,224,0.5)]">{new Date(drop.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between px-5 py-2">
                    <span className="text-[rgba(224,224,224,0.3)]">Network</span>
                    <span className="text-[rgba(224,224,224,0.5)]">{CLUSTER_LABELS[drop.cluster]}</span>
                  </div>
                </div>
                {drop.claimCode && (
                  <div className="flex gap-2 px-4 py-3">
                    <button type="button" onClick={() => copy(drop.claimCode!, drop.signature)} className="flex-1 py-2 font-mono text-[9px] tracking-[0.12em]">
                      {copied === drop.signature ? "COPIED" : "COPY CODE"}
                    </button>
                    <Link href={claimUrl(drop.claimCode)} className="flex-1 border border-[rgba(255,0,68,0.3)] bg-[rgba(255,0,68,0.05)] py-2 text-center font-mono text-[9px] tracking-[0.12em] text-[var(--danger)]">
                      CLAW BACK
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CLAIMED */}
        {tab === "claimed" && (
          <div className="flex flex-col gap-2">
            {claimedDrops.length === 0 && (
              <div className="border border-[rgba(0,255,65,0.08)] px-5 py-8 text-center">
                <p className="font-mono text-[10px] tracking-[0.2em] text-[rgba(224,224,224,0.2)]">NO CLAIMS RECORDED YET</p>
              </div>
            )}
            {claimedDrops.map((drop) => (
              <div key={drop.signature} className="border border-[rgba(0,255,65,0.1)] bg-[#050505]">
                <div className="border-b border-[rgba(0,255,65,0.08)] px-5 py-3 flex items-center justify-between">
                  <span className="font-mono text-[13px] text-[var(--accent)]">{drop.amount} {getAssetSymbol(drop.asset)} swept</span>
                  <a href={explorerUrl(drop.signature)} target="_blank" rel="noreferrer" className="font-mono text-[9px] tracking-[0.12em] text-[rgba(0,255,65,0.4)] hover:text-[var(--accent)]">VIEW TX →</a>
                </div>
                <div className="divide-y divide-[rgba(0,255,65,0.05)] text-[11px]">
                  <div className="flex justify-between px-5 py-2">
                    <span className="text-[rgba(224,224,224,0.3)]">Address</span>
                    <span className="font-mono text-[rgba(224,224,224,0.5)]">{drop.address.slice(0,8)}...{drop.address.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between px-5 py-2">
                    <span className="text-[rgba(224,224,224,0.3)]">Claimed</span>
                    <span className="text-[rgba(224,224,224,0.5)]">{new Date(drop.claimedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between px-5 py-2">
                    <span className="text-[rgba(224,224,224,0.3)]">Network</span>
                    <span className="text-[rgba(224,224,224,0.5)]">{CLUSTER_LABELS[drop.cluster]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RECOVER */}
        <div className="mt-6 border border-[rgba(0,255,65,0.1)] bg-[#050505]">
          <div className="border-b border-[rgba(0,255,65,0.08)] px-5 py-3">
            <span className="font-mono text-[9px] tracking-[0.28em] text-[rgba(224,224,224,0.2)]">RECOVER FROM LOCAL</span>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <p className="text-[11px] text-[rgba(224,224,224,0.4)]">Search local storage for a claim code by burner address.</p>
            <div className="flex gap-2">
              <input type="text" value={searchAddress} onChange={(e) => setSearchAddress(e.target.value)} placeholder="Paste drop address..." className="flex-1 border border-[rgba(0,255,65,0.2)] bg-[#020202] px-4 py-2.5 font-mono text-[11px] focus:border-[var(--accent)] focus:outline-none" />
              <button type="button" onClick={handleRecover} className="px-4 py-2 font-mono text-[9px] tracking-[0.12em]">SEARCH</button>
            </div>
            {recoverStatus && <p className={`text-[11px] ${recoverClaimCode ? "text-[var(--accent)]" : "text-[rgba(224,224,224,0.4)]"}`}>{recoverStatus}</p>}
            {recoverClaimCode && (
              <div className="border border-[rgba(0,255,65,0.15)] bg-[#020202] p-3">
                <p className="break-all font-mono text-[10px] text-[var(--accent)]">{recoverClaimCode}</p>
                <button type="button" onClick={() => copy(recoverClaimCode, "recover")} className="mt-2 py-1.5 font-mono text-[9px] tracking-[0.12em] w-full">
                  {copied === "recover" ? "COPIED" : "COPY CODE"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* VAULT */}
        <div className="mt-3 border border-[rgba(0,255,65,0.1)] bg-[#050505]">
          <div className="border-b border-[rgba(0,255,65,0.08)] px-5 py-3">
            <span className="font-mono text-[9px] tracking-[0.28em] text-[rgba(224,224,224,0.2)]">ENCRYPTED VAULT EXPORT</span>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <p className="text-[11px] text-[rgba(224,224,224,0.4)]">Export an AES-encrypted backup of all local history. Passphrase never leaves your device.</p>
            <div className="flex gap-2">
              <input type="password" value={vaultPassphrase} onChange={(e) => setVaultPassphrase(e.target.value)} placeholder="Vault passphrase..." className="flex-1 border border-[rgba(0,255,65,0.2)] bg-[#020202] px-4 py-2.5 font-mono text-[11px] focus:border-[var(--accent)] focus:outline-none" />
              <button type="button" onClick={handleVaultExport} disabled={vaultBusy} className="px-4 py-2 font-mono text-[9px] tracking-[0.12em] disabled:opacity-50">
                {vaultBusy ? "EXPORTING..." : "EXPORT"}
              </button>
            </div>
            {vaultStatus && <p className="text-[11px] text-[var(--accent)]">{vaultStatus}</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
