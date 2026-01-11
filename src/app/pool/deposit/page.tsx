"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

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
    { value: "1", label: "1" },
    { value: "5", label: "5" },
    { value: "10", label: "10" },
    { value: "100", label: "100" },
  ],
};

type DepositResult = {
  claimCode: string;
  amount: string;
  asset: AssetSymbol;
  signature: string;
};

export default function PoolDepositPage() {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();

  const [asset, setAsset] = useState<AssetSymbol>(DEFAULT_ASSET);
  const [amount, setAmount] = useState(FIXED_DENOMINATIONS[DEFAULT_ASSET][0].value);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DepositResult | null>(null);

  const symbol = ASSETS[asset].symbol;

  const handleAssetChange = (next: AssetSymbol) => {
    setAsset(next);
    setAmount(FIXED_DENOMINATIONS[next][0].value);
  };

  const handleDeposit = async () => {
    if (!connected || !publicKey) {
      setError("Connect a Solana wallet first.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // TODO: Implement pool deposit
      // 1. Call /api/pool/deposit to get pool address + instructions
      // 2. User signs transaction to compress funds to pool
      // 3. Server generates claim code and stores nullifier
      // 4. Return claim code to user

      // For now, show placeholder
      setError("DarkPool deposit coming soon. Use regular drops for now.");
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-4 text-sm text-[rgba(224,224,224,0.7)]">
        <Link href="/pool" className="text-xs tracking-[0.4em] text-[var(--accent)]">
          DARKPOOL / DEPOSIT
        </Link>
        <p className="text-2xl font-semibold tracking-[0.3em] text-white">Shield Funds</p>
        <WalletConnectButton />
      </div>

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
              Fixed amounts for privacy · prevents tracking
            </p>
          </div>

          {/* Info Box */}
          <div className="flex flex-wrap items-center gap-4 border border-[rgba(0,255,65,0.2)] p-4 text-xs">
            <ShieldCheck size={16} className="text-[var(--accent)]" />
            <p className="text-[rgba(224,224,224,0.7)]">
              Funds will be compressed into the shared pool. You'll receive a claim code that can be used by anyone.
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
            disabled={processing || !connected}
            className="w-full justify-center"
          >
            {processing ? "PROCESSING..." : "DEPOSIT TO POOL"}
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
          </div>
        </DropCard>
      )}
    </div>
  );
}

