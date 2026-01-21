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
import { amountToUnits, unitsToAmount } from "@/lib/amount";
import { generateDrop, type DropPayload } from "@/lib/drop";
import { generateConfidentialProof } from "@/lib/confidential/proofClient";
import { getConfidentialSupport, planConfidentialTransfer } from "@/lib/confidential/transfers";
import {
  ASSETS,
  AssetSymbol,
  ClusterType,
  CLUSTER_LABELS,
  DEFAULT_ASSET,
  getAssetDecimals,
  getAssetMint,
  getAssetProgramId,
  getAssetSymbol,
} from "@/lib/tokens";
import { fetchSplMetadata, getMintProgram, type SplTokenMeta } from "@/lib/spl";
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

const CREATE_ASSET_LIST: AssetSymbol[] = ["sol", "usdc", "spl"];
const MIN_BATCH_COUNT = 2;
const MAX_BATCH_COUNT = 20;

const explorerUrl = (signature: string) => {
  const base = `https://solscan.io/tx/${signature}`;
  return base;
};

type DropResult = DropPayload & {
  signature: string;
};

type BatchProgress = {
  done: number;
  total: number;
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

  const initialAsset = preferredAsset ?? DEFAULT_ASSET;
  const [asset, setAsset] = useState<AssetSymbol>(initialAsset);
  const [amount, setAmount] = useState(
    initialAsset === "spl" ? "" : FIXED_DENOMINATIONS[initialAsset][0].value
  );
  const [customMint, setCustomMint] = useState("");
  const [customMeta, setCustomMeta] = useState<SplTokenMeta | null>(null);
  const [customMintError, setCustomMintError] = useState<string | null>(null);
  const [customMintLoading, setCustomMintLoading] = useState(false);
  const [customBalance, setCustomBalance] = useState<bigint | null>(null);
  const [customBalanceError, setCustomBalanceError] = useState<string | null>(null);
  const [customBalanceLoading, setCustomBalanceLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [ultraPrivateMode, setUltraPrivateMode] = useState(false);
  const [shielding, setShielding] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DropResult | DropResult[] | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchCount, setBatchCount] = useState(3);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
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
    if (preferredAsset === "spl") {
      setAmount("");
    } else {
      setAmount(FIXED_DENOMINATIONS[preferredAsset][0].value);
    }
  }, [preferredAsset]);

  const decimals = asset === "spl" ? customMeta?.decimals ?? 0 : getAssetDecimals(asset);
  const symbol = asset === "spl" ? customMeta?.symbol ?? "SPL" : getAssetSymbol(asset);
  const confidentialSupport = useMemo(() => getConfidentialSupport(asset), [asset]);
  const confidentialSupported = confidentialSupport.supported;
  const confidentialSupportReason = confidentialSupport.reason;
  const mintAddress = useMemo(() => getAssetMint(asset, cluster), [asset, cluster]);
  const useZkElgamal = process.env.NEXT_PUBLIC_USE_ZK_ELGAMAL === "true";

  const handleAssetChange = (next: AssetSymbol) => {
    setAsset(next);
    setPreferredAsset(next);
    if (next === "spl") {
      setAmount("");
      return;
    }
    // Reset to first fixed denomination for core asset
    setAmount(FIXED_DENOMINATIONS[next][0].value);
  };

  useEffect(() => {
    if (asset !== "spl") {
      setCustomMeta(null);
      setCustomMintError(null);
      setCustomMintLoading(false);
      setCustomBalance(null);
      setCustomBalanceError(null);
      setCustomBalanceLoading(false);
      return;
    }
    const trimmed = customMint.trim();
    if (!trimmed) {
      setCustomMeta(null);
      setCustomMintError(null);
      setCustomMintLoading(false);
      return;
    }

    let cancelled = false;
    setCustomMintLoading(true);
    setCustomMintError(null);

    const timer = setTimeout(async () => {
      try {
        const meta = await fetchSplMetadata(connection, trimmed);
        if (!cancelled) {
          setCustomMeta(meta);
          setCustomMintError(null);
        }
      } catch (metaError) {
        if (!cancelled) {
          setCustomMeta(null);
          setCustomMintError(metaError instanceof Error ? metaError.message : "Invalid mint");
        }
      } finally {
        if (!cancelled) {
          setCustomMintLoading(false);
        }
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [asset, customMint, connection]);

  useEffect(() => {
    if (asset !== "spl" || !customMeta || !publicKey) {
      setCustomBalance(null);
      setCustomBalanceError(null);
      setCustomBalanceLoading(false);
      return;
    }

    let cancelled = false;
    setCustomBalanceLoading(true);
    setCustomBalanceError(null);

    const run = async () => {
      try {
        const tokenProgramId = await getMintProgram(connection, customMeta.mint);
        const mint = new PublicKey(customMeta.mint);
        const ata = await getAssociatedTokenAddress(mint, publicKey, false, tokenProgramId);
        const info = await connection.getTokenAccountBalance(ata).catch(() => null);
        if (!info?.value?.amount) {
          if (!cancelled) {
            setCustomBalance(0n);
          }
          return;
        }
        if (!cancelled) {
          setCustomBalance(BigInt(info.value.amount));
        }
      } catch (balanceError) {
        if (!cancelled) {
          setCustomBalance(null);
          setCustomBalanceError(
            balanceError instanceof Error ? balanceError.message : "Unable to fetch balance"
          );
        }
      } finally {
        if (!cancelled) {
          setCustomBalanceLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [asset, customMeta, publicKey, connection]);

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

  const copyToClipboard = async (value: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Ignore clipboard errors silently
    }
  };

  const createSingleDrop = async (rawAmount: bigint, dropPassword?: string): Promise<DropResult> => {
    if (!publicKey || !sendTransaction) {
      throw new Error("Wallet connection required.");
    }

    if (ultraPrivateMode && !useZkElgamal) {
      setShielding(true);
      try {
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
          mint: asset === "spl" ? customMeta?.mint ?? customMint.trim() : undefined,
        });

        if (!drop.shielded) {
          throw new Error("Shielded drop failed to initialize.");
        }

        return {
          ...drop,
          signature: drop.shieldSignature || "shielded",
        };
      } catch (lightError) {
        console.error("[DarkDrop] Compression failed:", lightError);
        const errorMsg = lightError instanceof Error ? lightError.message : "Unknown error";
        throw new Error(`Compression failed: ${errorMsg}. Please check your USDC balance and try again.`);
      } finally {
        setShielding(false);
      }
    }

    const drop = await generateDrop({
      asset,
      cluster,
      password: dropPassword,
      ultraPrivateMode: false,
      amount: rawAmount,
      mint: asset === "spl" ? customMeta?.mint ?? customMint.trim() : undefined,
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
      const isCustomSpl = asset === "spl";
      const mintAddress =
        asset === "spl" ? customMeta?.mint ?? customMint.trim() : getAssetMint(asset, cluster);
      const tokenProgramId = isCustomSpl
        ? await getMintProgram(connection, mintAddress)
        : getAssetProgramId(asset);
      if (!mintAddress) {
        throw new Error("SPL mint address not configured.");
      }
      if (!tokenProgramId) {
        throw new Error(`Token program ID not configured for ${symbol}`);
      }

      const mint = new PublicKey(mintAddress);
      const fromAta = await getAssociatedTokenAddress(mint, publicKey, false, tokenProgramId);
      const fromInfo = await connection.getAccountInfo(fromAta);
      if (!fromInfo) {
        throw new Error(
          `No ${symbol} balance found. Mint: ${mintAddress}, ATA: ${fromAta.toBase58()}.`
        );
      }

      try {
        const balance = await connection.getTokenAccountBalance(fromAta);
        if (!balance.value || balance.value.uiAmount === 0) {
          throw new Error(`Your ${symbol} account exists but has zero balance.`);
        }
      } catch (balanceError) {
        if (balanceError instanceof Error && balanceError.message.includes("zero balance")) {
          throw balanceError;
        }
      }
      const toAta = await getAssociatedTokenAddress(mint, dropPubkey, true, tokenProgramId);
      const toInfo = await connection.getAccountInfo(toAta);
      const instructions = [];
      if (!toInfo) {
        instructions.push(createAssociatedTokenAccountInstruction(publicKey, toAta, dropPubkey, mint, tokenProgramId));
      }

      if (privateMode && asset === "usdc" && confidentialSupported && proofData && useZkElgamal) {
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
        instructions.push(
          createTransferInstruction(fromAta, toAta, publicKey, Number(rawAmount), [], tokenProgramId)
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

    return {
      ...drop,
      signature,
    };
  };

  const handleCreate = async () => {
    if (!connected || !publicKey) {
      setError("Connect a Solana wallet first.");
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);
    setBatchProgress(null);

    try {
      const walletAccount = await connection.getAccountInfo(publicKey, "confirmed");
      if (!walletAccount) {
        throw new Error("Wallet not found on Solana Mainnet Beta. Switch your wallet network and ensure it holds mainnet SOL (and USDC if needed).");
      }

      if (asset === "spl") {
        if (!customMint.trim()) {
          throw new Error("Enter a valid SPL mint address.");
        }
        if (!customMeta) {
          throw new Error(customMintError || "Unable to load SPL metadata.");
        }
        if (ultraPrivateMode) {
          throw new Error("Ultra Private Mode is not supported for custom SPL mints yet.");
        }
      }

      const rawAmount = amountToUnits(amount, decimals);
      if (rawAmount <= 0n) {
        throw new Error("Enter a valid amount.");
      }

      const dropPassword = password.trim() ? password.trim() : undefined;

      if (batchMode) {
        const count = Math.max(MIN_BATCH_COUNT, Math.min(MAX_BATCH_COUNT, batchCount));
        const results: DropResult[] = [];
        setBatchProgress({ done: 0, total: count });

        for (let i = 0; i < count; i += 1) {
          const created = await createSingleDrop(rawAmount, dropPassword);
          results.push(created);
          addSentDrop({
            signature: created.signature,
            address: created.address,
            amount,
            asset,
            mint: asset === "spl" ? customMeta?.mint ?? customMint.trim() : undefined,
            cluster,
            createdAt: new Date().toISOString(),
            status: "pending",
          });
          setBatchProgress({ done: i + 1, total: count });
        }

        setResult(results);
        setBatchProgress(null);
        return;
      }

      const created = await createSingleDrop(rawAmount, dropPassword);
      setResult(created);
      addSentDrop({
        signature: created.signature,
        address: created.address,
        amount,
        asset,
        mint: asset === "spl" ? customMeta?.mint ?? customMint.trim() : undefined,
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
    setBatchProgress(null);
  };

  const claimLabel = useMemo(
    () => `CLAIM CODE • ${symbol} • ${CLUSTER_LABELS[cluster]}`,
    [symbol, cluster]
  );
  const isBatchResult = Array.isArray(result);

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
        subtitle="Specify amount and optional password. Supported assets: SOL, USDC, Custom SPL."
      >
        <div className="flex flex-wrap gap-2 text-xs">
          {CREATE_ASSET_LIST.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleAssetChange(key)}
              className={`border px-3 py-2 tracking-[0.3em] ${
                asset === key ? "border-[var(--accent)] text-[var(--accent)]" : "border-[rgba(0,255,65,0.2)]"
              }`}
            >
              {key === "spl" ? "SPL" : ASSETS[key].symbol}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs tracking-[0.4em] text-[rgba(224,224,224,0.6)]">
            AMOUNT · {symbol}
          </span>
          {asset === "spl" ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.0"
                className="w-full"
              />
              <p className="text-[10px] text-[rgba(224,224,224,0.35)]">
                Custom SPL amounts are supported. Use exact decimals from metadata.
              </p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
        {asset === "spl" && (
          <div className="flex flex-col gap-2">
            <label className="block text-xs tracking-[0.4em] text-[rgba(224,224,224,0.6)]">
              SPL MINT ADDRESS
              <input
                type="text"
                value={customMint}
                onChange={(event) => setCustomMint(event.target.value)}
                placeholder="Paste mint address"
                className="mt-2 w-full"
              />
            </label>
            {customMintLoading && (
              <p className="text-[10px] text-[rgba(224,224,224,0.45)]">Loading metadata...</p>
            )}
            {customMeta && (
              <div className="flex items-center gap-3 text-xs text-[rgba(224,224,224,0.7)]">
                {customMeta.logoURI && (
                  <img
                    src={customMeta.logoURI}
                    alt={`${customMeta.symbol} logo`}
                    className="h-6 w-6 rounded-full border border-[rgba(0,255,65,0.2)]"
                  />
                )}
                <div>
                  <p>
                    Token: <span className="text-[var(--accent)]">{customMeta.name}</span> ({customMeta.symbol})
                  </p>
                  <p>Decimals: {customMeta.decimals} · Program: {customMeta.program}</p>
                </div>
              </div>
            )}
            {customMeta?.metadataSource === "none" && (
              <p className="text-[10px] text-[var(--danger)]">
                No on-chain metadata found for this mint. The token may not publish name/symbol/logo.
              </p>
            )}
            {customMeta && customMeta.metadataSource !== "none" && !customMeta.logoURI && (
              <p className="text-[10px] text-[rgba(224,224,224,0.45)]">
                No token image metadata found for this mint.
              </p>
            )}
            {customMeta && publicKey && (
              <p className="text-[10px] text-[rgba(224,224,224,0.45)]">
                {customBalanceLoading
                  ? "Fetching token balance..."
                  : customBalanceError
                    ? `Balance lookup failed: ${customBalanceError}`
                    : customBalance !== null
                      ? `Wallet balance: ${unitsToAmount(customBalance, customMeta.decimals, 4)} ${customMeta.symbol}`
                      : "Wallet balance: --"}
              </p>
            )}
            {customMintError && (
              <p className="text-xs text-[var(--danger)]">{customMintError}</p>
            )}
          </div>
        )}
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
              checked={batchMode}
              onChange={(e) => setBatchMode(e.target.checked)}
              className="h-4 w-4"
            />
            <span>BATCH MODE</span>
          </label>
          {batchMode && (
            <div className="ml-6 space-y-2 text-xs text-[rgba(224,224,224,0.55)]">
              <label className="block text-[10px] tracking-[0.3em] text-[rgba(224,224,224,0.6)]">
                COUNT (2-20)
                <input
                  type="number"
                  min={MIN_BATCH_COUNT}
                  max={MAX_BATCH_COUNT}
                  value={batchCount}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isNaN(next)) {
                      setBatchCount(MIN_BATCH_COUNT);
                      return;
                    }
                    setBatchCount(next);
                  }}
                  className="mt-2 w-full"
                />
              </label>
              <p>Creates multiple drops with the same asset + amount.</p>
              {ultraPrivateMode && (
                <p>Ultra Private Mode runs one compression transaction per drop.</p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs tracking-[0.4em] text-[rgba(224,224,224,0.6)]">
            <input
              type="checkbox"
              checked={ultraPrivateMode}
              disabled={asset === "spl"}
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
          {asset === "spl" && (
            <p className="text-xs text-[rgba(224,224,224,0.5)] ml-6">
              Custom SPL mints are standard transfers only. Private rails and compression are disabled.
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
          {shielding
            ? "SHIELDING..."
            : processing
              ? batchProgress
                ? `CREATING ${batchProgress.done}/${batchProgress.total}`
                : "EXECUTING..."
              : batchMode
                ? "CREATE BATCH DROPS"
                : "CREATE DEAD DROP"}
        </button>
      </DropCard>

      {result && (
        <DropCard
          title={isBatchResult ? "DELIVER · BATCH" : "DELIVER"}
          subtitle={
            isBatchResult
              ? "Multiple drops generated. Save every claim code before leaving this page."
              : "Funds parked on burner. Share the claim string only with the intended recipient."
          }
          action={
            <button type="button" onClick={reset} className="text-[var(--accent)]">
              RESET
            </button>
          }
        >
          {isBatchResult ? (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-[rgba(224,224,224,0.7)]">
                Generated {(result as DropResult[]).length} drops. Keep the claim codes safe.
              </p>
              <div className="space-y-3">
                {(result as DropResult[]).map((item, index) => (
                  <div key={`${item.address}-${index}`} className="border border-[rgba(0,255,65,0.2)] p-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[rgba(224,224,224,0.7)]">
                      <ShieldCheck size={16} className="text-[var(--accent)]" />
                      <p>
                        Drop {index + 1} · {symbol} · {CLUSTER_LABELS[item.cluster]}
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-[rgba(224,224,224,0.65)]">
                      Address: <span className="text-[var(--accent)]">{item.address}</span>
                    </p>
                    {item.signature !== "shielded" && (
                      <p className="mt-1 text-xs text-[rgba(224,224,224,0.7)]">
                        Transfer signature:{" "}
                        <a
                          href={explorerUrl(item.signature)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--accent)] underline"
                        >
                          {item.signature.slice(0, 12)}...
                        </a>
                      </p>
                    )}
                    <pre className="mt-3 max-h-24 overflow-y-auto bg-black/60 p-3 text-xs">
                      {item.claimCode}
                    </pre>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <button type="button" onClick={() => copyToClipboard(item.claimCode)}>
                        COPY CLAIM CODE
                      </button>
                      <Link
                        href={`/drop/claim?code=${encodeURIComponent(item.claimCode)}`}
                        className="border border-[rgba(255,0,68,0.6)] bg-[rgba(255,0,68,0.08)] px-3 py-2 text-[var(--danger)]"
                      >
                        CLAW BACK
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard((result as DropResult[]).map((item) => item.claimCode).join("\n"))
                  }
                >
                  COPY ALL CODES
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-[rgba(224,224,224,0.7)]">
                <ShieldCheck size={16} className="text-[var(--accent)]" />
                <p>
                  {(result as DropResult).shielded ? (
                    <>Shielded Drop · {symbol} · {CLUSTER_LABELS[(result as DropResult).cluster]}</>
                  ) : (
                    <>Drop address: {(result as DropResult).address} · {symbol} · {CLUSTER_LABELS[(result as DropResult).cluster]}</>
                  )}
                </p>
              </div>
              {(result as DropResult).signature !== "shielded" && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-[rgba(224,224,224,0.7)]">
                  <ArrowLeftRight size={16} />
                  <p>
                    Transfer signature:{" "}
                    <a
                      href={explorerUrl((result as DropResult).signature)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--accent)] underline"
                    >
                      {(result as DropResult).signature.slice(0, 12)}...
                    </a>
                  </p>
                </div>
              )}
              {(result as DropResult).shielded && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-[rgba(224,224,224,0.7)]">
                  <ShieldCheck size={16} className="text-[var(--accent)]" />
                  <p>Shielded Drop · Amounts and links hidden on-chain via zk-compression</p>
                </div>
              )}
              <QRDisplay value={(result as DropResult).claimCode} label={claimLabel} />
              <Link
                href={`/drop/claim?code=${encodeURIComponent((result as DropResult).claimCode)}`}
                className="border border-[rgba(255,0,68,0.6)] bg-[rgba(255,0,68,0.08)] px-4 py-2 text-center text-xs tracking-[0.3em] text-[var(--danger)]"
              >
                CLAW BACK
              </Link>
            </div>
          )}
        </DropCard>
      )}
    </div>
  );
}

const CODE_PREVIEW = (cluster: ClusterType, asset: AssetSymbol, compressed: boolean = false) =>
  asset === "spl"
    ? `darkdrop:v2:${cluster}:spl:<mint>:raw:...`
    : compressed 
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
