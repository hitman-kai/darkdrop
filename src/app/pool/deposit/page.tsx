"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { 
  Transaction, 
  ComputeBudgetProgram, 
  PublicKey, 
  SystemProgram,
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";

import { DropCard } from "@/components/DropCard";
import { QRDisplay } from "@/components/QRDisplay";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ASSETS, AssetSymbol, DEFAULT_ASSET } from "@/lib/tokens";

// Fixed denominations for privacy
const FIXED_DENOMINATIONS = {
  sol: [
    { value: "0.1", label: "0.1" },
    { value: "0.5", label: "0.5" },
    { value: "1", label: "1" },
    { value: "10", label: "10" },
  ],
  usdc: [
    { value: "1", label: "$1" },
    { value: "5", label: "$5" },
    { value: "10", label: "$10" },
    { value: "100", label: "$100" },
  ],
};

type PoolInfo = {
  online: boolean;
  poolAddress: string | null;
  denominations: { sol: string[]; usdc: string[] };
  feeBps: number;
  instructions: string;
};

type DepositResult = {
  claimCode: string;
  amount: string;
  asset: AssetSymbol;
};

export default function PoolDepositPage() {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();

  const [asset, setAsset] = useState<AssetSymbol>(DEFAULT_ASSET);
  const [amount, setAmount] = useState(FIXED_DENOMINATIONS[DEFAULT_ASSET][0].value);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DepositResult | null>(null);
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [loadingPool, setLoadingPool] = useState(true);

  const symbol = ASSETS[asset].symbol;

  // Fetch pool info on mount
  useEffect(() => {
    async function fetchPoolInfo() {
      try {
        const res = await fetch("/api/pool/deposit");
        const data = await res.json();
        setPoolInfo(data);
      } catch (e) {
        console.error("Failed to fetch pool info:", e);
      } finally {
        setLoadingPool(false);
      }
    }
    fetchPoolInfo();
  }, []);

  const handleAssetChange = (next: AssetSymbol) => {
    setAsset(next);
    setAmount(FIXED_DENOMINATIONS[next][0].value);
  };

  const handleDeposit = async () => {
    if (!connected || !publicKey) {
      setError("Connect a Solana wallet first.");
      return;
    }

    if (!poolInfo?.online || !poolInfo?.poolAddress) {
      setError("DarkPool is not available yet.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const poolAddress = new PublicKey(poolInfo.poolAddress);
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

      // For now, only SOL is fully implemented
      // USDC would require additional token transfer logic
      if (asset !== "sol") {
        setError("USDC deposits coming soon. Use SOL for now.");
        setProcessing(false);
        return;
      }

      // Build a simple SOL transfer to pool (will be compressed server-side)
      // In production, this would use Light Protocol compress directly
      const { blockhash } = await connection.getLatestBlockhash();
      const tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: poolAddress,
          lamports,
        })
      );
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      // Send transaction
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      console.log("[Pool Deposit] Transaction confirmed:", signature);

      // Register deposit with server
      const res = await fetch("/api/pool/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          asset,
          txSignature: signature,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to register deposit");
      }

      setResult({
        claimCode: data.claimCode,
        amount,
        asset,
      });

    } catch (err) {
      console.error("[Pool Deposit] Error:", err);
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  if (loadingPool) {
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
          DARKPOOL / DEPOSIT
        </Link>
        <p className="text-2xl font-semibold tracking-[0.3em] text-white">Shield Funds</p>
        <WalletConnectButton />
      </div>

      {/* Pool Status */}
      {poolInfo && !poolInfo.online && (
        <div className="border border-[rgba(255,200,0,0.3)] bg-[rgba(255,200,0,0.05)] p-4">
          <p className="text-xs text-[rgba(255,200,0,0.9)]">
            DarkPool is not yet configured. Coming soon.
          </p>
        </div>
      )}

      {!result ? (
        <DropCard
          title="DEPOSIT TO POOL"
          subtitle="Select a fixed amount to deposit. You'll receive a claim code."
        >
          {/* Asset Selection */}
          <div className="flex flex-wrap gap-2 text-xs">
            {(Object.keys(FIXED_DENOMINATIONS) as AssetSymbol[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleAssetChange(key)}
                className={`border px-3 py-2 tracking-[0.3em] ${
                  asset === key ? "border-[var(--accent)] text-[var(--accent)]" : "border-[rgba(0,255,65,0.2)]"
                }`}
              >
                {ASSETS[key].symbol}
              </button>
            ))}
          </div>

          {/* Amount Selection */}
          <div className="flex flex-col gap-2">
            <span className="text-xs tracking-[0.4em] text-[rgba(224,224,224,0.6)]">
              AMOUNT · {symbol}
            </span>
            <div className="flex gap-1.5">
              {FIXED_DENOMINATIONS[asset].map((denom) => (
                <button
                  key={denom.value}
                  type="button"
                  onClick={() => setAmount(denom.value)}
                  className={`border px-3 py-2 text-xs tracking-[0.15em] transition-all ${
                    amount === denom.value
                      ? "border-[var(--accent)] bg-[rgba(0,255,65,0.1)] text-[var(--accent)]"
                      : "border-[rgba(0,255,65,0.2)] hover:border-[rgba(0,255,65,0.4)]"
                  }`}
                >
                  {denom.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[rgba(224,224,224,0.35)]">
              Fixed amounts prevent transaction correlation · 1% claim fee
            </p>
          </div>

          {/* Info Box */}
          <div className="flex flex-wrap items-center gap-4 border border-[rgba(0,255,65,0.2)] p-4 text-xs">
            <ShieldCheck size={16} className="text-[var(--accent)]" />
            <p className="text-[rgba(224,224,224,0.7)]">
              Funds flow to a shared pool. Claim code works from any wallet.
            </p>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-[var(--danger)]">
              <ShieldAlert size={16} /> {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleDeposit}
            disabled={processing || !connected || !poolInfo?.online}
            className="w-full justify-center disabled:opacity-50"
          >
            {processing ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> PROCESSING...
              </span>
            ) : (
              "DEPOSIT TO POOL"
            )}
          </button>
        </DropCard>
      ) : (
        <DropCard
          title="DEPOSIT COMPLETE"
          subtitle="Share this claim code with the recipient. Keep it secret."
          action={
            <button type="button" onClick={reset} className="text-[var(--accent)]">
              NEW DEPOSIT
            </button>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-[rgba(224,224,224,0.7)]">
              <ShieldCheck size={16} className="text-[var(--accent)]" />
              <p>
                {result.amount} {ASSETS[result.asset].symbol} deposited to pool
              </p>
            </div>
            <QRDisplay value={result.claimCode} label="CLAIM CODE" />
            <p className="text-[10px] text-[rgba(224,224,224,0.4)]">
              Anyone with this code can claim the funds. Treat it like cash.
            </p>
          </div>
        </DropCard>
      )}
    </div>
  );
}
