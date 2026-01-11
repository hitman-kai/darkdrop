"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import { DropCard } from "@/components/DropCard";
import { WalletConnectButton } from "@/components/WalletConnectButton";

type ClaimResult = {
  amount: string;
  asset: string;
  signature: string;
};

export default function PoolClaimPage() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();

  const [claimCode, setClaimCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClaimResult | null>(null);

  const handleClaim = async () => {
    if (!connected || !publicKey) {
      setError("Connect a Solana wallet first.");
      return;
    }

    if (!claimCode.trim()) {
      setError("Enter a claim code.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // TODO: Implement pool claim
      // 1. Parse claim code to extract secret
      // 2. Call /api/pool/claim with secret + destination wallet
      // 3. Server verifies nullifier, decompresses from pool to wallet
      // 4. Return transaction signature

      // For now, show placeholder
      setError("DarkPool claim coming soon. Use regular claim for now.");
      
    } catch (err) {
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

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-4 text-sm text-[rgba(224,224,224,0.7)]">
        <Link href="/pool" className="text-xs tracking-[0.4em] text-[var(--accent)]">
          DARKPOOL / CLAIM
        </Link>
        <p className="text-2xl font-semibold tracking-[0.3em] text-white">Claim Funds</p>
        <WalletConnectButton />
      </div>

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
            <p className="text-[rgba(224,224,224,0.7)]">
              Funds will be sent to your connected wallet. This action cannot be reversed.
            </p>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-[var(--danger)]">
              <ShieldAlert size={16} /> {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleClaim}
            disabled={processing || !connected || !claimCode.trim()}
            className="w-full justify-center"
          >
            {processing ? "CLAIMING..." : "CLAIM FROM POOL"}
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
                {result.amount} {result.asset} claimed successfully
              </p>
            </div>
            <a
              href={`https://solscan.io/tx/${result.signature}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[var(--accent)] underline"
            >
              View transaction on Solscan
            </a>
          </div>
        </DropCard>
      )}
    </div>
  );
}

