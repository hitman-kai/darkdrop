"use client";

import { useState } from "react";
import Link from "next/link";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { RefreshCcw, Shield, ShieldAlert, ShieldOff } from "lucide-react";

import { ConfidentialPreviewCard } from "@/components/ConfidentialPreviewCard";
import { DropCard } from "@/components/DropCard";
import { QRScanner } from "@/components/QRScanner";
import { ClusterToggle } from "@/components/ClusterToggle";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { unitsToAmount } from "@/lib/amount";
import { claimDrop } from "@/lib/drop";
import { AssetSymbol, ClusterType, CLUSTER_LABELS, getAssetDecimals, getAssetMint, getAssetProgramId, getAssetSymbol } from "@/lib/tokens";

import { getConfidentialSupport, planConfidentialAccount } from "@/lib/confidential/transfers";
import { useBurnerStore } from "@/store/burner";
import { useHistoryStore } from "@/store/history";
import { useSettingsStore } from "@/store/settings";

type BurnerState = {
  keypair: Keypair;
  balance: bigint;
  asset: AssetSymbol;
  cluster: ClusterType;
};

const DUST_THRESHOLD = 5_000n;

export default function ClaimDropPage() {
  const { connection } = useConnection();
  const { publicKey: mainWallet } = useWallet();
  const setBurner = useBurnerStore((state) => state.setBurner);
  const updateDropStatus = useHistoryStore((state) => state.updateDropStatus);
  const addClaimedDrop = useHistoryStore((state) => state.addClaimedDrop);
  const cluster = useSettingsStore((state) => state.cluster);
  const setCluster = useSettingsStore((state) => state.setCluster);

  const [claimCode, setClaimCode] = useState("");
  const [password, setPassword] = useState("");
  const [burner, setBurnerState] = useState<BurnerState | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [confidentialNotes, setConfidentialNotes] = useState<string[]>([]);

  const fetchBalance = async (keypair: Keypair, asset: AssetSymbol, dropCluster: ClusterType) => {
    if (asset === "sol") {
      const lamports = await connection.getBalance(keypair.publicKey, "confirmed");
      return BigInt(lamports);
    }
    const mintAddress = getAssetMint(asset, dropCluster);
    const tokenProgramId = getAssetProgramId(asset);
    if (!mintAddress || !tokenProgramId) return 0n;
    const mint = new PublicKey(mintAddress);
    const ata = await getAssociatedTokenAddress(mint, keypair.publicKey, true, tokenProgramId);
    const info = await connection.getTokenAccountBalance(ata).catch(() => null);
    if (!info?.value?.amount) return 0n;
    return BigInt(info.value.amount);
  };

  const loadDrop = async () => {
    setError(null);
    setStatus(null);
    try {
      const parsed = claimDrop(claimCode, {
        password: password.trim() ? password : undefined,
        fallbackCluster: cluster,
      });

      if (parsed.cluster !== cluster) {
        setCluster(parsed.cluster);
        setError(`Switched network to ${CLUSTER_LABELS[parsed.cluster]}. Reconnect your wallet if needed, then load again.`);
        return;
      }

      const support = getConfidentialSupport(parsed.asset);

      if (support.supported) {

        const plan = await planConfidentialAccount({

          connection,

          asset: parsed.asset,

          owner: parsed.keypair.publicKey,

          destination: mainWallet ?? parsed.keypair.publicKey,

        });

        setConfidentialNotes(plan.notes);

      } else if (support.reason) {

        setConfidentialNotes([support.reason]);

      }



      const balance = await fetchBalance(parsed.keypair, parsed.asset, parsed.cluster);
      setBurner(parsed.keypair);
      setBurnerState({
        keypair: parsed.keypair,
        balance,
        asset: parsed.asset,
        cluster: parsed.cluster,
      });
      setStatus("Burner imported. Ready to sweep.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to parse claim code.");
      setBurnerState(null);
      setBurner(null);
    }
  };

  const refreshBalance = async () => {
    if (!burner) return;
    const balance = await fetchBalance(burner.keypair, burner.asset, burner.cluster);
    setBurnerState({ ...burner, balance });
  };

  const sweepDrop = async () => {
    if (!burner) {
      setError("No burner loaded.");
      return;
    }
    if (!mainWallet) {
      setError("Connect your main wallet first.");
      return;
    }

    const decimals = getAssetDecimals(burner.asset);

    if (burner.asset === "sol" && burner.balance <= DUST_THRESHOLD) {
      setError("Nothing to sweep.");
      return;
    }

    if (burner.asset === "usdc" && burner.balance <= 0n) {
      setError("No cUSDC remaining to sweep.");
      return;
    }

    setSweeping(true);
    setError(null);

    try {
      if (burner.asset === "sol") {
        const lamports = burner.balance - DUST_THRESHOLD;
        if (lamports <= 0n) throw new Error("Not enough SOL to cover fees.");
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: burner.keypair.publicKey,
            toPubkey: mainWallet,
            lamports: Number(lamports),
          })
        );
        tx.recentBlockhash = blockhash;
        tx.feePayer = burner.keypair.publicKey;
        tx.sign(burner.keypair);
        const signature = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

        updateDropStatus(burner.keypair.publicKey.toBase58(), "claimed");
        addClaimedDrop({
          address: burner.keypair.publicKey.toBase58(),
          amount: unitsToAmount(lamports, decimals, 6),
          asset: burner.asset,
          cluster: burner.cluster,
          signature,
          claimedAt: new Date().toISOString(),
        });
      } else {
        const mintAddress = getAssetMint(burner.asset, burner.cluster);
        const tokenProgramId = getAssetProgramId(burner.asset);
        if (!mintAddress || !tokenProgramId) throw new Error("Missing token mint for cUSDC (Token-2022).");
        const mint = new PublicKey(mintAddress);
        const sourceAta = await getAssociatedTokenAddress(mint, burner.keypair.publicKey, true, tokenProgramId);
        const destAta = await getAssociatedTokenAddress(mint, mainWallet, true, tokenProgramId);
        const instructions = [];
        const destInfo = await connection.getAccountInfo(destAta);
        if (!destInfo) {
          instructions.push(createAssociatedTokenAccountInstruction(mainWallet, destAta, mainWallet, mint, tokenProgramId));
        }

        // Use standard transfer for claiming
        // CT proofs were validated during creation, standard transfer works for claiming
        instructions.push(
          createTransferInstruction(sourceAta, destAta, burner.keypair.publicKey, Number(burner.balance), [], tokenProgramId)
        );

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
        const tx = new Transaction().add(...instructions);
        tx.recentBlockhash = blockhash;
        tx.feePayer = burner.keypair.publicKey;
        tx.sign(burner.keypair);
        const signature = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

        updateDropStatus(burner.keypair.publicKey.toBase58(), "claimed");
        addClaimedDrop({
          address: burner.keypair.publicKey.toBase58(),
          amount: unitsToAmount(burner.balance, decimals, 4),
          asset: burner.asset,
          cluster: burner.cluster,
          signature,
          claimedAt: new Date().toISOString(),
        });
      }

      setStatus("Drop claimed. Burner destroyed.");
      setBurnerState(null);
      setBurner(null);
      setClaimCode("");
      setPassword("");
    } catch (txError) {
      setError(txError instanceof Error ? txError.message : "Sweep failed.");
    } finally {
      setSweeping(false);
    }
  };

  const balanceDisplay = burner
    ? `${unitsToAmount(
        burner.balance,
        getAssetDecimals(burner.asset),
        burner.asset === "sol" ? 6 : 4
      )} ${getAssetSymbol(burner.asset)}`
    : "0";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-4">
        <Link href="/" className="text-xs tracking-[0.4em] text-[var(--accent)]">
          DARKDROP / CLAIM
        </Link>
        <p className="text-2xl font-semibold tracking-[0.3em] text-white">Claim a Dead Drop</p>
        <WalletConnectButton />
      </div>

      <DropCard title="SCAN OR PASTE" subtitle="Load claim string manually or via camera.">
        <div className="mb-4 flex flex-col gap-2 text-xs text-[rgba(224,224,224,0.7)]">
          <p className="tracking-[0.3em]">NETWORK</p>
          <ClusterToggle />
        </div>
        <label className="block text-xs tracking-[0.4em] text-[rgba(224,224,224,0.6)]">
          CLAIM CODE
          <textarea
            value={claimCode}
            onChange={(event) => setClaimCode(event.target.value)}
            rows={4}
            className="mt-2 w-full"
            placeholder={`darkdrop:v1:${cluster}:usdc:raw:...`}
          />
        </label>
        <label className="block text-xs tracking-[0.4em] text-[rgba(224,224,224,0.6)]">
          PASSWORD
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full"
            placeholder="required if encrypted"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <QRScanner onScan={(code) => setClaimCode(code)} />
          <div className="flex flex-col gap-4 text-xs text-[rgba(224,224,224,0.7)]">
            <p>
              Ensure nobody is observing your screen. Once loaded, the burner wallet is exposed inside the wallet modal as
              <span className="text-[var(--accent)]"> Burner Import</span>.
            </p>
            <button type="button" onClick={loadDrop} className="w-full justify-center">
              LOAD DROP
            </button>
            {status && (
              <p className="flex items-center gap-2 text-xs text-[var(--accent)]">
                <Shield size={16} />
                {status}
              </p>
            )}
            {error && (
              <p className="flex items-center gap-2 text-xs text-[var(--danger)]">
                <ShieldAlert size={16} />
                {error}
              </p>
            )}
          </div>
        </div>
      </DropCard>

      {burner && (
        <DropCard title="SWEEP" subtitle="Inspect burner balance and push everything to your main wallet.">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[rgba(224,224,224,0.8)]">
              Burner address: <span className="text-[var(--accent)]">{burner.keypair.publicKey.toBase58()}</span>
            </p>
            <p className="text-sm text-[rgba(224,224,224,0.8)]">
              Asset: <strong>{getAssetSymbol(burner.asset)}</strong> · Cluster: {CLUSTER_LABELS[burner.cluster]}
            </p>
            <p className="text-sm text-[rgba(224,224,224,0.8)]">Balance: <strong>{balanceDisplay}</strong></p>
            {confidentialNotes.length > 0 && (
              <ConfidentialPreviewCard
                enabled
                interactive={false}
                notes={confidentialNotes}
                description="Proof + decrypt steps will show here once private rails go live."
                label="CONFIDENTIAL ACCOUNT NOTES"
              />
            )}

            <div className="flex gap-3">
              <button type="button" onClick={refreshBalance} className="flex flex-1 items-center justify-center gap-2">
                <RefreshCcw size={16} />
                REFRESH BALANCE
              </button>
              <button
                type="button"
                onClick={sweepDrop}
                disabled={sweeping}
                className="flex flex-1 items-center justify-center gap-2 border-[rgba(255,0,68,0.6)] bg-[rgba(255,0,68,0.08)] text-[var(--danger)]"
              >
                <ShieldOff size={16} />
                {sweeping ? "PURGING..." : "SWEEP TO MAIN WALLET"}
              </button>
            </div>
          </div>
        </DropCard>
      )}
    </div>
  );
}



