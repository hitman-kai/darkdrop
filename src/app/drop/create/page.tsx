"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import { DropCard } from "@/components/DropCard";
import { ConfidentialPreviewCard } from "@/components/ConfidentialPreviewCard";
import { QRDisplay } from "@/components/QRDisplay";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ClusterToggle } from "@/components/ClusterToggle";
import { amountToUnits } from "@/lib/amount";
import { generateDrop, type DropPayload, withElGamalKeypair } from "@/lib/drop";
import { deriveAESKey } from "@/lib/confidential/aes";
import { base64FromBytes, bytesFromBase64 } from "@/lib/base64";
import { buildConfidentialAccountInstructions } from "@/lib/confidential/instructions";
import { generateConfigureAccountProof, generateConfidentialProof } from "@/lib/confidential/proofClient";
import { getConfidentialSupport, planConfidentialTransfer } from "@/lib/confidential/transfers";
import {
  ASSETS,
  AssetSymbol,
  ClusterType,
  CLUSTER_LABELS,
  DEFAULT_ASSET,
  assetList,
  getAssetDecimals,
  getAssetMint,
  getAssetProgramId,
  getAssetSymbol,
} from "@/lib/tokens";
import { useHistoryStore } from "@/store/history";
import { useSettingsStore } from "@/store/settings";
import { usePrivacyStore } from "@/store/privacy";

const CUSDC_FEE_BUFFER_LAMPORTS = Math.round(0.002 * LAMPORTS_PER_SOL);

const explorerUrl = (signature: string, cluster: ClusterType) => {
  const base = `https://solscan.io/tx/${signature}`;
  return cluster === "mainnet" ? base : `${base}?cluster=${cluster}`;
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
  const privateMode = usePrivacyStore((state) => state.privateMode);
  const setPrivateMode = usePrivacyStore((state) => state.setPrivateMode);
  const privacyPending = usePrivacyStore((state) => state.pending);
  const setPrivacyPending = usePrivacyStore((state) => state.setPending);

  const [asset, setAsset] = useState<AssetSymbol>(preferredAsset ?? DEFAULT_ASSET);
  const [amount, setAmount] = useState("0.1");
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DropResult | null>(null);
  const [confidentialNotes, setConfidentialNotes] = useState<string[]>([]);
  const [proofData, setProofData] = useState<{
    equalityProof: string;
    validityProof: string;
    rangeProof: string;
    newSourceBalance: string;
    senderElGamalKeypair: string;
    newSourceDecryptableBalance?: string;
    transferAuditorCiphertextLo?: string;
    transferAuditorCiphertextHi?: string;
  } | null>(null);

  useEffect(() => {
    setAsset(preferredAsset);
  }, [preferredAsset]);

  const decimals = getAssetDecimals(asset);
  const symbol = getAssetSymbol(asset);
  const confidentialSupport = getConfidentialSupport(asset);
  const confidentialSupported = confidentialSupport.supported;
  const confidentialSupportReason = confidentialSupport.reason;
  const mintAddress = useMemo(() => getAssetMint(asset, cluster), [asset, cluster]);

  const handleAssetChange = (next: AssetSymbol) => {
    setAsset(next);
    setPreferredAsset(next);
  };

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanupTimer = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const scheduleRetry = (attempt: number) => {
      cleanupTimer();
      if (typeof window === "undefined") return;
      retryTimer = window.setTimeout(() => {
        run(attempt + 1);
      }, 700);
    };

    const run = async (attempt = 0) => {
      setPrivacyPending(true);
      try {
        let units = 0n;
        try {
          units = amountToUnits(amount || "0", decimals);
        } catch {
          units = 0n;
        }

        const previewBalance = units * 10n || 1000000n;

        const proof = await generateConfidentialProof({
          kind: "token2022-confidential-transfer",
          asset,
          amount: units,
          decimals,
          mint: mintAddress,
          owner: publicKey?.toBase58(),
          destination: publicKey?.toBase58(),
          cluster,
          senderBalance: previewBalance.toString(),
        });

        if (cancelled) {
          return;
        }

        const notReady =
          proof.notes?.some((note) => note.toLowerCase().includes("wasm module not ready yet")) ?? false;
        if (!proof.ok && notReady && attempt < 5) {
          setConfidentialNotes(["WASM proof worker warming up. Retrying…"]);
          scheduleRetry(attempt);
          return;
        }

        cleanupTimer();
        setConfidentialNotes(proof.notes);
        setPrivacyPending(false);

        if (proof.proof?.metadata) {
          const meta = proof.proof.metadata;
          if (meta.equality_proof && meta.validity_proof && meta.range_proof) {
            setProofData({
              equalityProof: String(meta.equality_proof),
              validityProof: String(meta.validity_proof),
              rangeProof: String(meta.range_proof),
              newSourceBalance: String(meta.new_source_balance),
              senderElGamalKeypair: String(meta.sender_elgamal_keypair),
              newSourceDecryptableBalance: meta.new_source_decryptable_balance
                ? String(meta.new_source_decryptable_balance)
                : undefined,
              transferAuditorCiphertextLo: meta.transfer_auditor_ciphertext_lo
                ? String(meta.transfer_auditor_ciphertext_lo)
                : undefined,
              transferAuditorCiphertextHi: meta.transfer_auditor_ciphertext_hi
                ? String(meta.transfer_auditor_ciphertext_hi)
                : undefined,
            });
          }
        }
      } catch (proofError) {
        if (!cancelled) {
          cleanupTimer();
          setConfidentialNotes([
            proofError instanceof Error ? proofError.message : "Unable to build proof preview.",
          ]);
          setPrivacyPending(false);
        }
      }
    };

    if (!privateMode) {
      setConfidentialNotes(confidentialSupported ? [] : confidentialSupportReason ? [confidentialSupportReason] : []);
      setPrivacyPending(false);
      return () => {
        cancelled = true;
        cleanupTimer();
      };
    }

    if (!confidentialSupported) {
      setConfidentialNotes(confidentialSupportReason ? [confidentialSupportReason] : []);
      setPrivacyPending(false);
      return () => {
        cancelled = true;
        cleanupTimer();
      };
    }

    if (!mintAddress) {
      setConfidentialNotes(["Missing cUSDC mint configuration."]);
      setPrivacyPending(false);
      return () => {
        cancelled = true;
        cleanupTimer();
      };
    }

    run();

    return () => {
      cancelled = true;
      cleanupTimer();
    };
  }, [
    asset,
    amount,
    decimals,
    privateMode,
    mintAddress,
    publicKey,
    cluster,
    confidentialSupported,
    confidentialSupportReason,
    setPrivacyPending,
  ]);

  const handleCreate = async () => {
    if (!connected || !publicKey) {
      setError("Connect a Solana wallet first.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const walletAccount = await connection.getAccountInfo(publicKey, "confirmed");
      if (!walletAccount) {
        throw new Error(
          `Wallet not found on Solana ${CLUSTER_LABELS[cluster]}. Switch your wallet network and ensure it holds SOL (and cUSDC if needed).`
        );
      }

      const rawAmount = amountToUnits(amount, decimals);
      if (rawAmount <= 0n) {
        throw new Error("Enter a valid amount.");
      }

      const dropPassword = password.trim() ? password.trim() : undefined;
      const burnerKeypair = Keypair.generate();
      let drop = generateDrop({
        asset,
        cluster,
        password: dropPassword,
        keypair: burnerKeypair,
      });
      const dropPubkey = new PublicKey(drop.address);
      let signature = "";
      const configureNotes: string[] = [];

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
        const tokenProgramId = getAssetProgramId(asset);
        if (!mintAddress || !tokenProgramId) throw new Error("Missing token configuration for this asset.");
        const mint = new PublicKey(mintAddress);
        const fromAta = await getAssociatedTokenAddress(mint, publicKey, false, tokenProgramId);
        const fromInfo = await connection.getAccountInfo(fromAta);
        if (!fromInfo) throw new Error(`No ${symbol} balance on this cluster.`);
        const toAta = await getAssociatedTokenAddress(mint, dropPubkey, true, tokenProgramId);
        const toInfo = await connection.getAccountInfo(toAta);
        const instructions: TransactionInstruction[] = [];
        if (!toInfo) {
          instructions.push(createAssociatedTokenAccountInstruction(publicKey, toAta, dropPubkey, mint, tokenProgramId));
        }

        const configureInstructions: TransactionInstruction[] = [];
        if (privateMode && asset === "usdc") {
          const aesKey = deriveAESKey(burnerKeypair);
          if (process.env.NODE_ENV !== "production") {
            console.log("[CreateDrop] AES key length", aesKey.length);
          }
          const aesKeyBase64 = base64FromBytes(aesKey);
          if (process.env.NODE_ENV !== "production") {
            console.log("[CreateDrop] AES key base64 length", aesKeyBase64.length);
          }
          const configureProof = await generateConfigureAccountProof({
            kind: "token2022-confidential-configure",
            aesKey: aesKeyBase64,
          });
          configureNotes.push(...(configureProof.notes ?? []));

          if (!configureProof.ok || !configureProof.proof?.metadata) {
            throw new Error(configureProof.notes?.join(" ") || "Configure proof failed.");
          }

          const metadata = configureProof.proof.metadata;
          const zeroBalanceProof =
            typeof metadata.zero_balance_proof === "string" ? metadata.zero_balance_proof : undefined;
          const decryptableZeroBalance =
            typeof metadata.decryptable_zero_balance === "string" ? metadata.decryptable_zero_balance : undefined;
          const elgamalKeypair =
            typeof metadata.elgamal_keypair === "string" ? metadata.elgamal_keypair : undefined;

          if (!zeroBalanceProof || !decryptableZeroBalance || !elgamalKeypair) {
            throw new Error("Configure proof missing required fields.");
          }

          drop = withElGamalKeypair(drop, elgamalKeypair, dropPassword);

          const zeroProofBytes = bytesFromBase64(zeroBalanceProof);
          const decryptableZeroBytes = bytesFromBase64(decryptableZeroBalance);
          const configurePlan = await buildConfidentialAccountInstructions({
            connection,
            mint,
            owner: dropPubkey,
            accountAddress: toAta,
            zeroBalanceProof: zeroProofBytes,
            decryptableZeroBalance: decryptableZeroBytes,
          });
          configureInstructions.push(...configurePlan.instructions);
          configureNotes.push(...configurePlan.notes);
        }

        if (configureInstructions.length) {
          instructions.push(...configureInstructions);
        }

        if (privateMode && asset === "usdc" && proofData) {
          // Use CT transfer with generated proofs
          const ctPlan = await planConfidentialTransfer({
            connection,
            asset,
            owner: publicKey,
            destination: dropPubkey,
            amount: rawAmount,
            proofData,
          });
          if (ctPlan.instructions.length === 0) {
            throw new Error(
              "Failed to build CT instructions. " +
                (ctPlan.notes.length ? ctPlan.notes[0] : "Check console for details.")
            );
          }
          instructions.push(...ctPlan.instructions);
          const aggregateNotes = [...configureNotes, ...ctPlan.notes];
          if (aggregateNotes.length) {
            setConfidentialNotes(aggregateNotes);
          }
        } else if (privateMode && asset === "usdc" && !proofData) {
          throw new Error(
            "Private Mode enabled but proofs not ready. Wait for proof generation to complete."
          );
        } else {
          instructions.push(
            createTransferInstruction(fromAta, toAta, publicKey, Number(rawAmount), [], tokenProgramId)
          );
        }

        instructions.push(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: dropPubkey,
            lamports: CUSDC_FEE_BUFFER_LAMPORTS,
          })
        );
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
        const tx = new Transaction({ feePayer: publicKey, blockhash, lastValidBlockHeight }).add(
          ...instructions
        );
        tx.partialSign(burnerKeypair);
        if (process.env.NODE_ENV !== "production") {
          try {
            const txSize = tx.serialize({ requireAllSignatures: false }).length;
            console.log("[CreateDrop] Transaction size (bytes)", txSize);
          } catch (sizeErr) {
            console.warn("[CreateDrop] Failed to measure transaction size", sizeErr);
          }
          try {
            const simulation = await connection.simulateTransaction(tx, [burnerKeypair]);
            console.log("[CreateDrop] Simulation logs", simulation.value.logs ?? []);
            if (simulation.value.err) {
              console.warn("[CreateDrop] Simulation error", simulation.value.err);
            }
          } catch (simErr) {
            console.warn("[CreateDrop] Simulation failed", simErr);
          }
        }
        try {
          signature = await sendTransaction(tx, connection, { skipPreflight: false });
        } catch (err) {
          console.error("[CreateDrop] sendTransaction failed", err);
          throw err;
        }
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
      setError(normalizeTxError(txError, cluster));
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
        <div className="flex flex-col gap-2 text-xs text-[rgba(224,224,224,0.7)]">
          <p className="tracking-[0.3em]">NETWORK</p>
          <ClusterToggle />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
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
        <ConfidentialPreviewCard
          enabled={privateMode}
          pending={privacyPending}
          notes={confidentialNotes}
          onToggle={(next) => setPrivateMode(next)}
          disabledReason={
            confidentialSupport.supported
              ? undefined
              : confidentialSupport.reason ?? "Asset not supported on Token-2022."
          }
        />

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

const normalizeTxError = (error: unknown, cluster: ClusterType): string => {
  if (error instanceof Error) {
    const message = error.message;
    const lower = message.toLowerCase();
    const clusterLabel = CLUSTER_LABELS[cluster];
    if (lower.includes("invalid public key input")) {
      return `RPC rejected the transaction. Switch your wallet to Solana ${clusterLabel} and ensure it holds SOL/cUSDC on that cluster.`;
    }
    if (lower.includes("blockhash not found")) {
      return `Stale blockhash. Reconnect your wallet on Solana ${clusterLabel} and try again.`;
    }
    return message;
  }
  return "Failed to create drop.";
};
