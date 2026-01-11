"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ShieldAlert, Loader2, ExternalLink } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";

import { DropCard } from "@/components/DropCard";
import { WalletConnectButton } from "@/components/WalletConnectButton";

type PoolStatus = {
  online: boolean;
  poolAddress: string | null;
  balances: { sol: string; usdc: string };
  feeBps: number;
};

type ClaimResult = {
  amountReceived: string;
  fee: string;
  asset: string;
  signature: string;
};

export default function PoolClaimPage() {
  const { publicKey, connected } = useWallet();

  const [claimCode, setClaimCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [poolStatus, setPoolStatus] = useState<PoolStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Fetch pool status on mount
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/pool/status");
        const data = await res.json();
        setPoolStatus(data);
      } catch (e) {
        console.error("Failed to fetch pool status:", e);
      } finally {
        setLoadingStatus(false);
      }
    }
    fetchStatus();
  }, []);

  // Check URL for claim code parameter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        setClaimCode(decodeURIComponent(code));
      }
    }
  }, []);

  const handleClaim = async () => {
    if (!connected || !publicKey) {
      setError("Connect a Solana wallet first.");
      return;
    }

    const code = claimCode.trim();
    if (!code) {
      setError("Enter a claim code.");
      return;
    }

    // Validate claim code format
    if (!code.startsWith("darkpool:")) {
      setError("Invalid claim code format. Must start with 'darkpool:'");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/pool/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimCode: code,
          destination: publicKey.toBase58(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Claim failed");
      }

      setResult({
        amountReceived: data.amountReceived,
        fee: data.fee,
        asset: data.asset.toUpperCase(),
        signature: data.signature,
      });

    } catch (err) {
      console.error("[Pool Claim] Error:", err);
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setClaimCode("");
    setError(null);
  };

  if (loadingStatus) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 px-6 py-32">
        <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
        <p className="text-xs tracking-[0.3em] text-[rgba(224,224,224,0.5)]">LOADING POOL STATUS</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-4 text-sm text-[rgba(224,224,224,0.7)]">
        <Link href="/pool" className="text-xs tracking-[0.4em] text-[var(--accent)]">
          DARKPOOL / CLAIM
        </Link>
        <p className="text-2xl font-semibold tracking-[0.3em] text-white">Claim Funds</p>
        <WalletConnectButton />
      </div>

      {/* Pool Status */}
      {poolStatus && !poolStatus.online && (
        <div className="border border-[rgba(255,200,0,0.3)] bg-[rgba(255,200,0,0.05)] p-4">
          <p className="text-xs text-[rgba(255,200,0,0.9)]">
            DarkPool is not yet configured. Coming soon.
          </p>
        </div>
      )}

      {/* Pool Balance Info */}
      {poolStatus?.online && (
        <div className="flex gap-4 text-xs">
          <div className="border border-[rgba(0,255,65,0.2)] px-3 py-2">
            <span className="text-[rgba(224,224,224,0.5)]">POOL SOL:</span>{" "}
            <span className="text-[var(--accent)]">{parseFloat(poolStatus.balances.sol).toFixed(4)}</span>
          </div>
          <div className="border border-[rgba(0,255,65,0.2)] px-3 py-2">
            <span className="text-[rgba(224,224,224,0.5)]">POOL USDC:</span>{" "}
            <span className="text-[var(--accent)]">{parseFloat(poolStatus.balances.usdc).toFixed(2)}</span>
          </div>
        </div>
      )}

      {!result ? (
        <DropCard
          title="CLAIM FROM POOL"
          subtitle="Enter your claim code to receive funds from the shielded pool."
        >
          {/* Claim Code Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs tracking-[0.4em] text-[rgba(224,224,224,0.6)]">
              CLAIM CODE
            </label>
            <textarea
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              placeholder="darkpool:v1:mainnet:sol:1:..."
              rows={3}
              className="w-full resize-none bg-transparent border border-[rgba(0,255,65,0.2)] p-3 text-xs font-mono focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          {/* Info Box */}
          <div className="flex flex-wrap items-center gap-4 border border-[rgba(0,255,65,0.2)] p-4 text-xs">
            <ShieldCheck size={16} className="text-[var(--accent)]" />
            <div className="flex-1 text-[rgba(224,224,224,0.7)]">
              <p>Funds will be sent to your connected wallet.</p>
              <p className="text-[rgba(224,224,224,0.5)]">1% fee deducted for pool operation.</p>
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-[var(--danger)]">
              <ShieldAlert size={16} /> {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleClaim}
            disabled={processing || !connected || !claimCode.trim() || !poolStatus?.online}
            className="w-full justify-center disabled:opacity-50"
          >
            {processing ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> CLAIMING...
              </span>
            ) : (
              "CLAIM FROM POOL"
            )}
          </button>
        </DropCard>
      ) : (
        <DropCard
          title="CLAIM COMPLETE"
          subtitle="Funds have been sent to your wallet."
          action={
            <button type="button" onClick={reset} className="text-[var(--accent)]">
              NEW CLAIM
            </button>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-[rgba(224,224,224,0.7)]">
              <ShieldCheck size={16} className="text-[var(--accent)]" />
              <p>
                <span className="text-[var(--accent)]">{result.amountReceived}</span> {result.asset} received
                <span className="text-[rgba(224,224,224,0.5)]"> (fee: {result.fee})</span>
              </p>
            </div>

            <a
              href={`https://solscan.io/tx/${result.signature}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs text-[var(--accent)] hover:underline"
            >
              <ExternalLink size={12} />
              View transaction on Solscan
            </a>

            <div className="border border-[rgba(0,255,65,0.1)] bg-[rgba(0,255,65,0.02)] p-3 text-[10px] text-[rgba(224,224,224,0.4)]">
              This claim came from the shared pool. No on-chain link to the original deposit.
            </div>
          </div>
        </DropCard>
      )}
    </div>
  );
}
