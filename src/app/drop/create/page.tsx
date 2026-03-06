"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { QRDisplay } from "@/components/QRDisplay";
import { amountToUnits } from "@/lib/amount";
import { generateDrop, type DropPayload } from "@/lib/drop";
import { createShieldSendFn } from "@/lib/shield-relay";
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
import { useHistoryStore } from "@/store/history";
import { useSettingsStore } from "@/store/settings";

const USDC_FEE_BUFFER_LAMPORTS = Math.round(0.002 * LAMPORTS_PER_SOL);
const CREATE_ASSET_LIST: AssetSymbol[] = ["sol", "usdc"];

const explorerUrl = (sig: string) => `https://solscan.io/tx/${sig}`;

type DropResult = DropPayload & { signature: string };

const CODE_PREVIEW = (cluster: ClusterType, asset: AssetSymbol, compressed: boolean = false) =>
  compressed
    ? `darkdrop:v2:${cluster}:${asset}:compressed:raw:...`
    : `darkdrop:v2:${cluster}:${asset}:raw:...`;

const normalizeTxError = (error: unknown): string => {
  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("invalid public key input")) return "RPC rejected the transaction. Switch your wallet to Solana Mainnet Beta.";
    if (lower.includes("blockhash not found")) return "Stale blockhash. Reconnect your wallet and try again.";
    return error.message;
  }
  return "Failed to create drop.";
};

export default function CreateDropPage() {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction, signTransaction } = useWallet();
  const addSentDrop = useHistoryStore((state) => state.addSentDrop);
  const cluster = useSettingsStore((state) => state.cluster);
  const preferredAsset = useSettingsStore((state) => state.preferredAsset);
  const setPreferredAsset = useSettingsStore((state) => state.setPreferredAsset);

  const [asset, setAsset] = useState<AssetSymbol>(preferredAsset ?? DEFAULT_ASSET);
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ultraPrivateMode, setUltraPrivateMode] = useState(false);
  const [shielding, setShielding] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DropResult | null>(null);
  const [copied, setCopied] = useState(false);

  const decimals = getAssetDecimals(asset);
  const symbol = getAssetSymbol(asset);
  const useZkElgamal = process.env.NEXT_PUBLIC_USE_ZK_ELGAMAL === "true";

  const handleAssetChange = (next: AssetSymbol) => {
    setAsset(next);
    setPreferredAsset(next);
    setAmount("");
  };

  const copyToClipboard = async (value: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const createSingleDrop = async (rawAmount: bigint, dropPassword?: string): Promise<DropResult> => {
    if (!publicKey || !sendTransaction) throw new Error("Wallet connection required.");

    if (ultraPrivateMode && !useZkElgamal) {
      setShielding(true);
      try {
        const sendTxFn = signTransaction
          ? createShieldSendFn(
              new PublicKey(process.env.NEXT_PUBLIC_RELAYER_PUBKEY!),
              signTransaction
            )
          : async (tx: Transaction): Promise<string> => {
              return await sendTransaction(tx, connection, { skipPreflight: false });
            };
        const drop = await generateDrop({
          asset, cluster, password: dropPassword,
          ultraPrivateMode: true, connection,
          payerPubkey: publicKey, sendTransactionFn: sendTxFn, amount: rawAmount,
        });
        if (!drop.shielded) throw new Error("Shielded drop failed to initialize.");
        return { ...drop, signature: drop.shieldSignature || "shielded" };
      } catch (lightError) {
        const errorMsg = lightError instanceof Error ? lightError.message : "Unknown error";
        throw new Error(`Compression failed: ${errorMsg}`);
      } finally {
        setShielding(false);
      }
    }

    const drop = await generateDrop({ asset, cluster, password: dropPassword, ultraPrivateMode: false, amount: rawAmount });
    const dropPubkey = new PublicKey(drop.address);
    let signature = "";

    if (asset === "sol") {
      const lamports = Number(rawAmount);
      if (lamports <= 0) throw new Error("Amount too low.");
      const tx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: dropPubkey, lamports })
      );
      tx.feePayer = publicKey;
      signature = await sendTransaction(tx, connection, { skipPreflight: false });
    } else {
      const mintAddress = getAssetMint(asset, cluster);
      if (!mintAddress) throw new Error("Token mint address not configured.");
      const tokenProgramId = getAssetProgramId(asset);
      if (!tokenProgramId) throw new Error(`Token program ID not configured for ${symbol}`);
      const mint = new PublicKey(mintAddress);
      const fromAta = await getAssociatedTokenAddress(mint, publicKey, false, tokenProgramId);
      const fromInfo = await connection.getAccountInfo(fromAta);
      if (!fromInfo) throw new Error(`No ${symbol} balance found.`);
      const toAta = await getAssociatedTokenAddress(mint, dropPubkey, true, tokenProgramId);
      const toInfo = await connection.getAccountInfo(toAta);
      const instructions = [];
      if (!toInfo) instructions.push(createAssociatedTokenAccountInstruction(publicKey, toAta, dropPubkey, mint, tokenProgramId));
      instructions.push(createTransferInstruction(fromAta, toAta, publicKey, Number(rawAmount), [], tokenProgramId));
      instructions.push(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: dropPubkey, lamports: USDC_FEE_BUFFER_LAMPORTS }));
      const tx = new Transaction().add(...instructions);
      tx.feePayer = publicKey;
      signature = await sendTransaction(tx, connection, { skipPreflight: false });
    }

    await connection.confirmTransaction(signature, "confirmed");
    return { ...drop, signature };
  };

  const handleCreate = async () => {
    if (!connected || !publicKey) { setError("Connect a Solana wallet first."); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError("Enter a valid amount."); return; }
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const walletAccount = await connection.getAccountInfo(publicKey, "confirmed");
      if (!walletAccount) throw new Error("Wallet not found on Solana Mainnet Beta.");
      const rawAmount = amountToUnits(amount, decimals);
      if (rawAmount <= 0n) throw new Error("Enter a valid amount.");
      const dropPassword = password.trim() ? password.trim() : undefined;
      const created = await createSingleDrop(rawAmount, dropPassword);
      setResult(created);
      addSentDrop({
        signature: created.signature, address: created.address,
        amount, asset, claimCode: created.claimCode, cluster,
        createdAt: new Date().toISOString(), status: "pending",
      });
    } catch (txError) {
      setError(normalizeTxError(txError));
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setResult(null); setPassword(""); setError(null); setAmount(""); };

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-[rgba(0,255,65,0.12)] bg-[rgba(0,0,0,0.92)] px-8 backdrop-blur-md" style={{height:"52px"}}>
        <span className="font-mono text-[13px] tracking-[0.22em] text-[var(--accent)]">DARKDROP</span>
        <div className="flex items-center gap-1 border border-[rgba(0,255,65,0.15)] px-1 py-1">
          <Link href="/" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[rgba(224,224,224,0.5)] transition-colors hover:text-[var(--accent)]">HOME</Link>
          <Link href="/drop/create" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[var(--accent)]">CREATE</Link>
          <Link href="/drop/claim" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[rgba(224,224,224,0.5)] transition-colors hover:text-[var(--accent)]">CLAIM</Link>
        </div>
        <WalletConnectButton />
      </nav>

      <main className="mx-auto w-full max-w-xl px-6 pb-20" style={{paddingTop:"80px"}}>
        {!result ? (
          <>
            <div className="mb-8">
              <p className="mb-2 font-mono text-[9px] tracking-[0.3em] text-[rgba(0,255,65,0.35)]">OUTPUT // 0X01</p>
              <h1 className="font-mono text-[clamp(24px,4vw,36px)] font-light leading-[1.15] text-[var(--text)]">Create a<br />dead drop.</h1>
              <p className="mt-3 text-xs leading-relaxed text-[rgba(224,224,224,0.45)]">Select asset, enter amount, optional password. Claim code generated client-side.</p>
            </div>

            {/* ASSET */}
            <div className="mb-3 border border-[rgba(0,255,65,0.1)] bg-[#050505]">
              <div className="border-b border-[rgba(0,255,65,0.1)] px-5 py-3">
                <span className="font-mono text-[9px] tracking-[0.28em] text-[rgba(224,224,224,0.2)]">ASSET</span>
              </div>
              <div className="flex p-4 gap-2">
                {CREATE_ASSET_LIST.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleAssetChange(key)}
                    className={`flex-1 py-2.5 font-mono text-[10px] tracking-[0.15em] transition-all ${
                      asset === key
                        ? "border-[var(--accent)] bg-[rgba(0,255,65,0.08)] text-[var(--accent)]"
                        : "border-[rgba(0,255,65,0.15)] text-[rgba(224,224,224,0.4)] hover:border-[rgba(0,255,65,0.3)]"
                    }`}
                  >
                    {ASSETS[key].symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* AMOUNT */}
            <div className="mb-3 border border-[rgba(0,255,65,0.1)] bg-[#050505]">
              <div className="border-b border-[rgba(0,255,65,0.1)] px-5 py-3 flex justify-between items-center">
                <span className="font-mono text-[9px] tracking-[0.28em] text-[rgba(224,224,224,0.2)]">AMOUNT</span>
                <span className="font-mono text-[9px] tracking-[0.15em] text-[rgba(0,255,65,0.4)]">{symbol}</span>
              </div>
              <div className="p-4">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={asset === "sol" ? "e.g. 0.05" : "e.g. 5"}
                  min="0"
                  step={asset === "sol" ? "0.001" : "0.01"}
                  className="w-full border border-[rgba(0,255,65,0.2)] bg-[#020202] px-4 py-3 font-mono text-[18px] text-[var(--text)] placeholder-[rgba(224,224,224,0.15)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            </div>

            {/* MODE */}
            <div className="mb-3 border border-[rgba(0,255,65,0.1)] bg-[#050505]">
              <div className="border-b border-[rgba(0,255,65,0.1)] px-5 py-3">
                <span className="font-mono text-[9px] tracking-[0.28em] text-[rgba(224,224,224,0.2)]">DELIVERY MODE</span>
              </div>
              <div className="flex flex-col divide-y divide-[rgba(0,255,65,0.06)]">
                {[
                  { id: "raw", name: "Raw Transfer", desc: "Burner keypair. No password required.", tag: "STANDARD" },
                  { id: "aes", name: "Encrypted", desc: "AES-256-GCM + PBKDF2. Receiver needs the password.", tag: "SECURE" },
                  { id: "zk", name: "Ultra Private", desc: "ZK compression via Light Protocol. On-chain link severed.", tag: "PRIVATE" },
                ].map((mode) => {
                  const isZk = mode.id === "zk";
                  const isAes = mode.id === "aes";
                  const selected = isZk ? ultraPrivateMode : (isAes ? (!ultraPrivateMode && password.length > 0) : (!ultraPrivateMode));
                  return (
                    <div
                      key={mode.id}
                      onClick={() => {
                        if (isZk) setUltraPrivateMode(true);
                        else setUltraPrivateMode(false);
                      }}
                      className={`flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors ${
                        isZk && ultraPrivateMode ? "bg-[rgba(0,255,65,0.04)]" : "hover:bg-[#080808]"
                      }`}
                    >
                      <div className={`h-3.5 w-3.5 shrink-0 rounded-full border transition-all ${
                        (isZk && ultraPrivateMode) || (!isZk && !ultraPrivateMode && mode.id === "raw")
                          ? "border-[var(--accent)] bg-[var(--accent)] shadow-[0_0_6px_rgba(0,255,65,0.5)]"
                          : "border-[rgba(224,224,224,0.15)]"
                      }`} />
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-[var(--text)]">{mode.name}</p>
                        <p className="text-[11px] text-[rgba(224,224,224,0.4)]">{mode.desc}</p>
                      </div>
                      <span className="font-mono text-[8px] tracking-[0.14em] text-[rgba(224,224,224,0.2)] border border-[rgba(0,255,65,0.1)] px-2 py-1">{mode.tag}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PASSWORD */}
            <div className="mb-3 border border-[rgba(0,255,65,0.1)] bg-[#050505]">
              <div className="border-b border-[rgba(0,255,65,0.1)] px-5 py-3">
                <span className="font-mono text-[9px] tracking-[0.28em] text-[rgba(224,224,224,0.2)]">PASSWORD <span className="text-[rgba(224,224,224,0.15)]">— OPTIONAL</span></span>
              </div>
              <div className="p-4">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave empty for raw key..."
                    className="w-full border border-[rgba(0,255,65,0.2)] bg-[#020202] px-4 py-3 pr-16 font-mono text-sm text-[var(--text)] placeholder-[rgba(224,224,224,0.15)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 border-none bg-transparent px-2 py-1 font-mono text-[9px] tracking-[0.1em] text-[rgba(224,224,224,0.3)] hover:text-[rgba(224,224,224,0.6)]"
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>
            </div>

            {/* CODE PREVIEW */}
            <div className="mb-5 border border-[rgba(0,255,65,0.08)] px-5 py-3">
              <p className="font-mono text-[9px] tracking-[0.2em] text-[rgba(224,224,224,0.2)]">CODE FORMAT</p>
              <p className="mt-1 font-mono text-[10px] text-[rgba(0,255,65,0.4)] break-all">{CODE_PREVIEW(cluster, asset, ultraPrivateMode)}</p>
            </div>

            {error && (
              <div className="mb-5 border border-[rgba(255,0,68,0.2)] bg-[rgba(255,0,68,0.04)] px-5 py-3">
                <p className="text-xs text-[var(--danger)]">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleCreate}
              disabled={processing || shielding}
              className="w-full border-[var(--accent)] bg-[var(--accent)] py-4 font-mono text-[10px] font-medium tracking-[0.2em] text-black transition-all hover:bg-[#33ff66] hover:shadow-[0_0_24px_rgba(0,255,65,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {shielding ? "SHIELDING..." : processing ? "EXECUTING..." : "CREATE DEAD DROP"}
            </button>
          </>
        ) : (
          <>
            <div className="mb-8">
              <p className="mb-2 font-mono text-[9px] tracking-[0.3em] text-[rgba(0,255,65,0.35)]">OUTPUT // 0X01</p>
              <h1 className="font-mono text-[clamp(24px,4vw,36px)] font-light leading-[1.15] text-[var(--text)]">Drop ready.</h1>
              <p className="mt-3 text-xs leading-relaxed text-[rgba(224,224,224,0.45)]">Deliver the claim string to the recipient off-chain. Do not share publicly.</p>
            </div>

            <div className="mb-3 border border-[rgba(0,255,65,0.2)] bg-[#050505]">
              <div className="border-b border-[rgba(0,255,65,0.15)] px-5 py-3 flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]" />
                <span className="font-mono text-[9px] tracking-[0.28em] text-[rgba(0,255,65,0.6)]">TRANSACTION CONFIRMED</span>
              </div>
              <div className="p-5">
                <p className="mb-3 font-mono text-[9px] tracking-[0.25em] text-[rgba(224,224,224,0.2)]">CLAIM CODE</p>
                <div className="border border-[rgba(0,255,65,0.15)] bg-[#020202] p-4">
                  <p className="break-all font-mono text-[11px] leading-relaxed text-[var(--accent)]">{result.claimCode}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.claimCode)}
                    className="flex-1 border-[rgba(0,255,65,0.3)] py-2.5 font-mono text-[9px] tracking-[0.15em] text-[var(--accent)]"
                  >
                    {copied ? "COPIED" : "COPY CODE"}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="flex-1 border-[rgba(224,224,224,0.1)] py-2.5 font-mono text-[9px] tracking-[0.15em] text-[rgba(224,224,224,0.4)]"
                  >
                    NEW DROP
                  </button>
                </div>
              </div>
            </div>

            {result.signature !== "shielded" && (
              <div className="mb-3 border border-[rgba(0,255,65,0.1)] bg-[#050505] px-5 py-3">
                <p className="font-mono text-[9px] tracking-[0.2em] text-[rgba(224,224,224,0.2)]">TX SIGNATURE</p>
                <a href={explorerUrl(result.signature)} target="_blank" rel="noreferrer" className="mt-1 block font-mono text-[10px] text-[rgba(0,255,65,0.5)] underline decoration-dotted underline-offset-2 hover:text-[var(--accent)]">
                  {result.signature.slice(0, 24)}...
                </a>
              </div>
            )}

            <QRDisplay value={result.claimCode} label={`CLAIM CODE · ${symbol} · ${CLUSTER_LABELS[cluster]}`} />

            <div className="mt-3 border border-[rgba(255,0,68,0.1)] bg-[rgba(255,0,68,0.03)] px-5 py-4">
              <p className="mb-1 font-mono text-[9px] tracking-[0.25em] text-[rgba(255,0,68,0.6)]">SECURITY NOTICE</p>
              <p className="text-[11px] leading-relaxed text-[rgba(224,224,224,0.4)]">This code grants direct access to the funds. Share only with the intended recipient. DarkDrop cannot recover lost codes.</p>
            </div>

            <Link
              href={`/drop/claim?code=${encodeURIComponent(result.claimCode)}`}
              className="mt-3 block border border-[rgba(255,0,68,0.3)] bg-[rgba(255,0,68,0.06)] px-5 py-3 text-center font-mono text-[10px] tracking-[0.2em] text-[var(--danger)] transition-colors hover:bg-[rgba(255,0,68,0.1)]"
            >
              CLAW BACK
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
