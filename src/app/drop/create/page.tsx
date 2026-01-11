"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import { DropCard } from "@/components/DropCard";
import { ConfidentialPreviewCard } from "@/components/ConfidentialPreviewCard";
import { QRDisplay } from "@/components/QRDisplay";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { amountToUnits } from "@/lib/amount";
import { generateDrop, type DropPayload } from "@/lib/drop";
import { generateConfidentialProof } from "@/lib/confidential/proofClient";
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

const USDC_FEE_BUFFER_LAMPORTS = Math.round(0.002 * LAMPORTS_PER_SOL);

// Fixed denominations for privacy (prevents amount correlation attacks)
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

const explorerUrl = (signature: string) => {
  const base = `https://solscan.io/tx/${signature}`;
  return base;
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
  const [amount, setAmount] = useState(FIXED_DENOMINATIONS[preferredAsset ?? DEFAULT_ASSET][0].value);
  const [password, setPassword] = useState("");
  const [ultraPrivateMode, setUltraPrivateMode] = useState(false);
  const [shielding, setShielding] = useState(false);
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
  } | null>(null);

  useEffect(() => {
    setAsset(preferredAsset);
  }, [preferredAsset]);

  const decimals = getAssetDecimals(asset);
  const symbol = getAssetSymbol(asset);
  const confidentialSupport = useMemo(() => getConfidentialSupport(asset), [asset]);
  const confidentialSupported = confidentialSupport.supported;
  const confidentialSupportReason = confidentialSupport.reason;
  const mintAddress = useMemo(() => getAssetMint(asset, cluster), [asset, cluster]);
  const useZkElgamal = process.env.NEXT_PUBLIC_USE_ZK_ELGAMAL === "true";

  const handleAssetChange = (next: AssetSymbol) => {
    setAsset(next);
    setPreferredAsset(next);
    // Reset to first fixed denomination for new asset
    setAmount(FIXED_DENOMINATIONS[next][0].value);
  };

  useEffect(() => {
    let cancelled = false;
    
    // Skip Token-2022 proof generation if using Light Protocol
    if (ultraPrivateMode && !useZkElgamal) {
      setConfidentialNotes(["Using Light Protocol shielded drops (zk-compression)"]);
      setPrivacyPending(false);
      return () => {
        cancelled = true;
      };
    }
    
    if (!privateMode) {
      setConfidentialNotes(
        confidentialSupported ? [] : confidentialSupportReason ? [confidentialSupportReason] : []
      );
      setPrivacyPending(false);
      return () => {
        cancelled = true;
      };
    }
    if (!confidentialSupported) {
      setConfidentialNotes(confidentialSupportReason ? [confidentialSupportReason] : []);
      setPrivacyPending(false);
      return () => {
        cancelled = true;
      };
    }
    if (!mintAddress) {
      setConfidentialNotes(["Missing USDC mint configuration."]);
      setPrivacyPending(false);
      return () => {
        cancelled = true;
      };
    }
    const run = async () => {
      setPrivacyPending(true);
      try {
        let units = 0n;
        try {
          units = amountToUnits(amount || "0", decimals);
        } catch {
          units = 0n;
        }

        // For preview, use a large balance (actual balance fetching requires connection)
        // In production, would fetch actual token balance from blockchain
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
          sender_balance: previewBalance.toString(),
        });
        if (!cancelled) {
          setConfidentialNotes(proof.notes);
          setPrivacyPending(false);
          
          // Save proof data for use in transaction
          if (proof.proof?.metadata) {
            const meta = proof.proof.metadata;
            if (meta.equality_proof && meta.validity_proof && meta.range_proof) {
              setProofData({
                equalityProof: String(meta.equality_proof),
                validityProof: String(meta.validity_proof),
                rangeProof: String(meta.range_proof),
                newSourceBalance: String(meta.new_source_balance),
                senderElGamalKeypair: String(meta.sender_elgamal_keypair),
              });
            }
          }
        }
      } catch (proofError) {
        if (!cancelled) {
          setConfidentialNotes([
            proofError instanceof Error ? proofError.message : "Unable to build proof preview.",
          ]);
          setPrivacyPending(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [asset, amount, decimals, privateMode, ultraPrivateMode, useZkElgamal, mintAddress, publicKey, cluster, confidentialSupported, confidentialSupportReason]);

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
        throw new Error("Wallet not found on Solana Mainnet Beta. Switch your wallet network and ensure it holds mainnet SOL (and USDC if needed).");
      }

      const rawAmount = amountToUnits(amount, decimals);
      if (rawAmount <= 0n) {
        throw new Error("Enter a valid amount.");
      }

      const dropPassword = password.trim() ? password.trim() : undefined;

      // Handle Light Protocol shielded drops
      if (ultraPrivateMode && !useZkElgamal) {
        setShielding(true);
        try {
          if (!publicKey || !sendTransaction) {
            throw new Error("Wallet connection required for shielded drops");
          }
          
          // Create a wrapper function for sending transactions via wallet adapter
          const sendTxFn = async (tx: Transaction): Promise<string> => {
            return await sendTransaction(tx, connection, { skipPreflight: false });
          };
          
          const drop = await generateDrop({
            asset,
            cluster,
            password: dropPassword,
            ultraPrivateMode: true,
            connection,
            payerPubkey: publicKey,
            sendTransactionFn: sendTxFn,
            amount: rawAmount,
          });

          if (drop.shielded) {
            setResult({
              ...drop,
              signature: drop.shieldSignature || "shielded",
            });
            addSentDrop({
              signature: drop.shieldSignature || "shielded",
              address: drop.address || "shielded",
              amount,
              asset,
              cluster,
              createdAt: new Date().toISOString(),
              status: "pending",
            });
            setShielding(false);
            setProcessing(false);
            return;
          }
        } catch (lightError) {
          console.error("[DarkDrop] Compression failed:", lightError);
          const errorMsg = lightError instanceof Error ? lightError.message : "Unknown error";
          setError(`Compression failed: ${errorMsg}. Please check your USDC balance and try again.`);
          setShielding(false);
          setProcessing(false);
          return; // Don't fall back - show the error
          
          // TODO: Re-enable fallback after fixing SDK loading
          // setError(`Full privacy temporarily unavailable — using secure burner instead. Error: ${errorMsg}`);
          // Fall through to burner wallet generation
        } finally {
          setShielding(false);
        }
      }

      // Fallback to burner wallet (v1 behavior) or Token-2022 if enabled
      const drop = await generateDrop({
        asset,
        cluster,
        password: dropPassword,
        ultraPrivateMode: false,
        amount: rawAmount,
      });
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
        const tokenProgramId = getAssetProgramId(asset);
        if (!mintAddress) {
          throw new Error(`USDC mint address not configured for ${CLUSTER_LABELS[cluster]}. Please set NEXT_PUBLIC_USDC_MAINNET_MINT in .env.local`);
        }
        if (!tokenProgramId) {
          throw new Error(`Token program ID not configured for ${symbol}`);
        }
        
        const mint = new PublicKey(mintAddress);
        let fromAta = await getAssociatedTokenAddress(mint, publicKey, false, tokenProgramId);
        
        // Check if account exists - try both token programs
        let fromInfo = await connection.getAccountInfo(fromAta);
        let actualTokenProgramId = tokenProgramId;
        
        if (!fromInfo) {
          // Try checking with token-2022 program as well (in case mint is token-2022 but config says token)
          const { TOKEN_2022_PROGRAM_ID } = await import("@solana/spl-token");
          const fromAta2022 = await getAssociatedTokenAddress(mint, publicKey, false, TOKEN_2022_PROGRAM_ID);
          const fromInfo2022 = await connection.getAccountInfo(fromAta2022);
          
          if (fromInfo2022) {
            // Found with token-2022, use that instead
            fromInfo = fromInfo2022;
            actualTokenProgramId = TOKEN_2022_PROGRAM_ID;
            fromAta = fromAta2022;
          } else {
            throw new Error(`No ${symbol} balance found. Mint: ${mintAddress}, ATA (token): ${fromAta.toBase58()}, ATA (token-2022): ${fromAta2022.toBase58()}. Make sure you have ${symbol} in your wallet on ${CLUSTER_LABELS[cluster]}.`);
          }
        }
        
        // Verify the account actually has a balance
        try {
          const balance = await connection.getTokenAccountBalance(fromAta);
          if (!balance.value || balance.value.uiAmount === 0) {
            throw new Error(`Your ${symbol} account exists but has zero balance.`);
          }
        } catch (balanceError) {
          if (balanceError instanceof Error && balanceError.message.includes("zero balance")) {
            throw balanceError;
          }
          // If we can't get balance, continue - the account exists at least
        }
        const toAta = await getAssociatedTokenAddress(mint, dropPubkey, true, actualTokenProgramId);
        const toInfo = await connection.getAccountInfo(toAta);
        const instructions = [];
        if (!toInfo) {
          instructions.push(createAssociatedTokenAccountInstruction(publicKey, toAta, dropPubkey, mint, actualTokenProgramId));
        }

        // Only use CT transfer if private mode is enabled, asset supports it, and proofs are available
        if (privateMode && asset === "usdc" && confidentialSupported && proofData && useZkElgamal) {
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
        } else if (privateMode && asset === "usdc" && confidentialSupported && !proofData && useZkElgamal) {
          throw new Error(
            "Private Mode enabled but proofs not ready. Wait for proof generation to complete."
          );
        } else {
          // Regular transfer (private mode disabled, or mint doesn't support Token-2022)
          instructions.push(
            createTransferInstruction(fromAta, toAta, publicKey, Number(rawAmount), [], actualTokenProgramId)
          );
        }

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
      setError(normalizeTxError(txError));
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
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs tracking-[0.4em] text-[rgba(224,224,224,0.6)]">
            <input
              type="checkbox"
              checked={ultraPrivateMode}
              onChange={(e) => {
                setUltraPrivateMode(e.target.checked);
                if (e.target.checked) {
                  setPrivateMode(false); // Disable Token-2022 mode when Light is enabled
                }
              }}
              className="h-4 w-4"
            />
            <span>
              Ultra Private Mode
            </span>
          </label>
          {ultraPrivateMode && (
            <p className="text-xs text-[rgba(224,224,224,0.5)] ml-6">
              Uses Light Protocol zk-compression for link obfuscation. Compressed tokens/SOL owned by random keypair.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 border border-[rgba(0,255,65,0.2)] p-4 text-xs">
          <ShieldQuestion size={16} />
          <p className="text-[rgba(224,224,224,0.7)]">
            Password adds AES layer. Claim string becomes
            <span className="text-[var(--accent)]"> {CODE_PREVIEW(cluster, asset, ultraPrivateMode)}</span>
          </p>
        </div>
        {error && (
          <p className="flex items-center gap-2 text-sm text-[var(--danger)]">
            <ShieldAlert size={16} /> {error}
          </p>
        )}
        <button type="button" onClick={handleCreate} disabled={processing || shielding} className="w-full justify-center">
          {shielding ? "SHIELDING..." : processing ? "EXECUTING..." : "CREATE DEAD DROP"}
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
                {result.shielded ? (
                  <>Shielded Drop · {symbol} · {CLUSTER_LABELS[result.cluster]}</>
                ) : (
                  <>Drop address: {result.address} · {symbol} · {CLUSTER_LABELS[result.cluster]}</>
                )}
              </p>
            </div>
            {result.signature !== "shielded" && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-[rgba(224,224,224,0.7)]">
                <ArrowLeftRight size={16} />
                <p>
                  Transfer signature:{" "}
                  <a
                    href={explorerUrl(result.signature)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--accent)] underline"
                  >
                    {result.signature.slice(0, 12)}...
                  </a>
                </p>
              </div>
            )}
            {result.shielded && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-[rgba(224,224,224,0.7)]">
                <ShieldCheck size={16} className="text-[var(--accent)]" />
                <p>Shielded Drop · Amounts and links hidden on-chain via zk-compression</p>
              </div>
            )}
            <QRDisplay value={result.claimCode} label={claimLabel} />
          </div>
        </DropCard>
      )}
    </div>
  );
}

const CODE_PREVIEW = (cluster: ClusterType, asset: AssetSymbol, compressed: boolean = false) =>
  compressed 
    ? `darkdrop:v2:${cluster}:${asset}:compressed:raw:...`
    : `darkdrop:v2:${cluster}:${asset}:raw:...`;

const normalizeTxError = (error: unknown): string => {
  if (error instanceof Error) {
    const message = error.message;
    const lower = message.toLowerCase();
    if (lower.includes("invalid public key input")) {
      return "RPC rejected the transaction. Switch your wallet to Solana Mainnet Beta and ensure it holds mainnet SOL/USDC.";
    }
    if (lower.includes("blockhash not found")) {
      return "Stale blockhash. Reconnect your wallet on Solana Mainnet Beta and try again.";
    }
    return message;
  }
  return "Failed to create drop.";
};
