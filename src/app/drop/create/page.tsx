"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import { DropCard } from "@/components/DropCard";
import { QRDisplay } from "@/components/QRDisplay";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { amountToUnits } from "@/lib/amount";
import { generateDrop, type DropPayload } from "@/lib/drop";
import {
  ASSETS,
  AssetSymbol,
  ClusterType,
  CLUSTER_LABELS,
  DEFAULT_ASSET,
  assetList,
  getAssetDecimals,
  getAssetMint,
  getAssetSymbol,
} from "@/lib/tokens";
import { useHistoryStore } from "@/store/history";
import { useSettingsStore } from "@/store/settings";

const USDC_FEE_BUFFER_LAMPORTS = Math.round(0.002 * LAMPORTS_PER_SOL);

const explorerUrl = (signature: string, cluster: ClusterType) => {
  const base = `https://solscan.io/tx/${signature}`;
  return cluster === "devnet" ? `${base}?cluster=devnet` : base;
};

type DropResult = DropPayload & {
  signature: string;
};

export default function CreateDropPage() {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const addSentDrop = useHistoryStore((state) => state.addSentDrop);
  const cluster = useSettingsStore((state) => state.cluster);
  const preferredAsset = useSettingsStore((state) => state.preferredAsset);
  const setPreferredAsset = useSettingsStore((state) => state.setPreferredAsset);

  const [asset, setAsset] = useState<AssetSymbol>(preferredAsset ?? DEFAULT_ASSET);
  const [amount, setAmount] = useState("0.1");
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DropResult | null>(null);

  useEffect(() => {
    setAsset(preferredAsset);
  }, [preferredAsset]);

  const decimals = getAssetDecimals(asset);
  const symbol = getAssetSymbol(asset);

  const handleAssetChange = (next: AssetSymbol) => {
    setAsset(next);
    setPreferredAsset(next);
  };

  const handleCreate = async () => {
    if (!connected || !publicKey) {
      setError("Connect a Solana wallet first.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const rawAmount = amountToUnits(amount, decimals);
      if (rawAmount <= 0n) {
        throw new Error("Enter a valid amount.");
      }

      const drop = generateDrop({ asset, cluster, password: password.trim() ? password : undefined });
      const dropPubkey = new PublicKey(drop.address);
      let signature = "";

      if (asset === "sol") {
        const lamports = Number(rawAmount);
        if (lamports <= 0) throw new Error("Amount too low.");
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: dropPubkey,
            lamports,
          })
        );
        tx.feePayer = publicKey;
        signature = await sendTransaction(tx, connection, { skipPreflight: false });
      } else {
        const mintAddress = getAssetMint(asset, cluster);
        if (!mintAddress) throw new Error("Missing token mint for this asset.");
        const mint = new PublicKey(mintAddress);
        const fromAta = await getAssociatedTokenAddress(mint, publicKey);
        const fromInfo = await connection.getAccountInfo(fromAta);
        if (!fromInfo) throw new Error(`No ${symbol} balance on this cluster.`);
        const toAta = await getAssociatedTokenAddress(mint, dropPubkey, true);
        const toInfo = await connection.getAccountInfo(toAta);
        const instructions = [];
        if (!toInfo) {
          instructions.push(createAssociatedTokenAccountInstruction(publicKey, toAta, dropPubkey, mint));
        }
        instructions.push(
        createTransferInstruction(fromAta, toAta, publicKey, Number(rawAmount))
      );
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: dropPubkey,
          lamports: USDC_FEE_BUFFER_LAMPORTS,
        })
      );
        const tx = new Transaction().add(...instructions);
        tx.feePayer = publicKey;
        signature = await sendTransaction(tx, connection, { skipPreflight: false });
      }

      await connection.confirmTransaction(signature, "confirmed");

      setResult({
        ...drop,
        signature,
      });
      addSentDrop({
        signature,
        address: drop.address,
        amount,
        asset,
        cluster,
        createdAt: new Date().toISOString(),
        status: "pending",
      });
    } catch (txError) {
      setError(txError instanceof Error ? txError.message : "Failed to create drop.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setPassword("");
    setError(null);
  };

  const claimLabel = useMemo(
    () => `CLAIM CODE • ${symbol} • ${CLUSTER_LABELS[cluster]}`,
    [symbol, cluster]
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-4 text-sm text-[rgba(224,224,224,0.7)]">
        <Link href="/" className="text-xs tracking-[0.4em] text-[var(--accent)]">
          DARKDROP / CREATE
        </Link>
        <p className="text-2xl font-semibold tracking-[0.3em] text-white">Dead Drop Generator</p>
        <WalletConnectButton />
      </div>

      <DropCard
        title="TRANSFER"
        subtitle={`Specify amount and optional password. Supported assets: ${assetList
          .map((key) => ASSETS[key].symbol)
          .join(", ")}.`}
      >
        <div className="flex flex-wrap gap-2 text-xs">
          {assetList.map((key) => (
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
        <label className="block text-xs tracking-[0.4em] text-[rgba(224,224,224,0.6)]">
          AMOUNT ({symbol})
          <input
            type="number"
            step={asset === "sol" ? "0.0001" : "0.01"}
            min="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-2 w-full"
          />
        </label>
        <label className="block text-xs tracking-[0.4em] text-[rgba(224,224,224,0.6)]">
          PASSWORD (OPTIONAL)
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="leave empty for raw key"
            className="mt-2 w-full"
          />
        </label>
        <div className="flex flex-wrap items-center gap-4 border border-[rgba(0,255,65,0.2)] p-4 text-xs">
          <ShieldQuestion size={16} />
          <p className="text-[rgba(224,224,224,0.7)]">
            Password adds AES layer. Claim string becomes
            <span className="text-[var(--accent)]"> {CODE_PREVIEW(cluster, asset)}</span>
          </p>
        </div>
        {error && (
          <p className="flex items-center gap-2 text-sm text-[var(--danger)]">
            <ShieldAlert size={16} /> {error}
          </p>
        )}
        <button type="button" onClick={handleCreate} disabled={processing} className="w-full justify-center">
          {processing ? "EXECUTING..." : "CREATE DEAD DROP"}
        </button>
      </DropCard>

      {result && (
        <DropCard
          title="DELIVER"
          subtitle="Funds parked on burner. Share the claim string only with the intended recipient."
          action={
            <button type="button" onClick={reset} className="text-[var(--accent)]">
              RESET
            </button>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-[rgba(224,224,224,0.7)]">
              <ShieldCheck size={16} className="text-[var(--accent)]" />
              <p>
                Drop address: {result.address} · {symbol} · {CLUSTER_LABELS[result.cluster]}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[rgba(224,224,224,0.7)]">
              <ArrowLeftRight size={16} />
              <p>
                Transfer signature:{" "}
                <a
                  href={explorerUrl(result.signature, result.cluster)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--accent)] underline"
                >
                  {result.signature.slice(0, 12)}...
                </a>
              </p>
            </div>
            <QRDisplay value={result.claimCode} label={claimLabel} />
          </div>
        </DropCard>
      )}
    </div>
  );
}

const CODE_PREVIEW = (cluster: ClusterType, asset: AssetSymbol) =>
  `darkdrop:v1:${cluster}:${asset}:raw:...`;
