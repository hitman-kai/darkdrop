"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { RefreshCcw, Shield, ShieldAlert, ShieldOff, Zap, Radio } from "lucide-react";

import { ConfidentialPreviewCard } from "@/components/ConfidentialPreviewCard";
import { DropCard } from "@/components/DropCard";
import { QRScanner } from "@/components/QRScanner";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { unitsToAmount } from "@/lib/amount";
import { claimDrop, unshieldDrop } from "@/lib/drop";
import { AssetSymbol, ClusterType, CLUSTER_LABELS, getAssetDecimals, getAssetMint, getAssetProgramId, getAssetSymbol } from "@/lib/tokens";
import { fetchSplMetadata, getMintProgram, type SplTokenMeta } from "@/lib/spl";
import { generateNullifier, getNullifierRegistry } from "@/lib/nullifier";
import { createRpc } from "@lightprotocol/stateless.js";
import BN from "bn.js";

import { getConfidentialSupport, planConfidentialAccount, planConfidentialTransfer } from "@/lib/confidential/transfers";
import { useBurnerStore } from "@/store/burner";
import { useHistoryStore } from "@/store/history";
import { useSettingsStore } from "@/store/settings";

type BurnerState = {
  keypair: Keypair;
  balance: bigint;
  asset: AssetSymbol;
  cluster: ClusterType;
  shielded?: boolean;
  compressed?: boolean;
  mint?: string;
  tokenMeta?: SplTokenMeta | null;
};

const DUST_THRESHOLD = 5_000n;

export default function ClaimDropPage() {
  const { connection } = useConnection();
  const { publicKey: mainWallet, sendTransaction } = useWallet();
  const searchParams = useSearchParams();
  const setBurner = useBurnerStore((state) => state.setBurner);
  const updateDropStatus = useHistoryStore((state) => state.updateDropStatus);
  const addClaimedDrop = useHistoryStore((state) => state.addClaimedDrop);
  const cluster = useSettingsStore((state) => state.cluster);

  const [claimCode, setClaimCode] = useState("");
  const [password, setPassword] = useState("");
  const [burner, setBurnerState] = useState<BurnerState | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [confidentialNotes, setConfidentialNotes] = useState<string[]>([]);
  
  // Relayer mode state
  const [useRelayer, setUseRelayer] = useState(false);
  const [customDestination, setCustomDestination] = useState("");
  const [relayerStatus, setRelayerStatus] = useState<{ online: boolean; fee: number } | null>(null);

  useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam && !claimCode) {
      setClaimCode(codeParam);
    }
  }, [searchParams, claimCode]);

  const fetchBalance = async (
    keypair: Keypair,
    asset: AssetSymbol | "spl",
    dropCluster: ClusterType,
    options?: { compressed?: boolean; mint?: string }
  ) => {
    // Handle compressed tokens/SOL
    if (options?.compressed) {
      const compressionApiEndpoint = process.env.NEXT_PUBLIC_LIGHT_COMPRESSION_API;
      const rpc = compressionApiEndpoint 
        ? createRpc(connection, compressionApiEndpoint)
        : createRpc(connection); // Defaults to same endpoint as connection
      
      if (asset === "sol") {
        // Get compressed SOL accounts
        const compressedAccounts = await rpc.getCompressedAccountsByOwner(keypair.publicKey);
        const { sumUpLamports } = await import("@lightprotocol/stateless.js");
        const totalBalance = sumUpLamports(compressedAccounts.items);
        return BigInt(totalBalance.toString());
      } else if (asset === "usdc") {
        // Get compressed USDC accounts
        const mintAddress = getAssetMint(asset, dropCluster);
        if (!mintAddress) return 0n;
        const mint = new PublicKey(mintAddress);
        const accounts = await rpc.getCompressedTokenAccountsByOwner(keypair.publicKey, { mint });
        const totalBalance = accounts.items.reduce(
          (sum, account) => sum.add(account.parsed.amount),
          new BN(0)
        );
        return BigInt(totalBalance.toString());
      }
    }
    
    // Regular token/SOL balance
    if (asset === "sol") {
      const lamports = await connection.getBalance(keypair.publicKey, "confirmed");
      return BigInt(lamports);
    }
    if (asset === "spl") {
      if (!options?.mint) return 0n;
      const mint = new PublicKey(options.mint);
      const tokenProgramId = await getMintProgram(connection, options.mint);
      const ata = await getAssociatedTokenAddress(mint, keypair.publicKey, true, tokenProgramId);
      const info = await connection.getTokenAccountBalance(ata).catch(() => null);
      if (!info?.value?.amount) return 0n;
      return BigInt(info.value.amount);
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
        setError(`Drop was created on ${CLUSTER_LABELS[parsed.cluster]}, which DarkDrop no longer supports.`);
        return;
      }

      let tokenMeta: SplTokenMeta | null = null;
      if (parsed.asset === "spl") {
        if (!parsed.mint) {
          throw new Error("Missing SPL mint in claim code.");
        }
        tokenMeta = await fetchSplMetadata(connection, parsed.mint);
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



      // Handle compressed token drops
      if (parsed.compressed) {
        const balance = await fetchBalance(parsed.keypair, parsed.asset, parsed.cluster, { compressed: true });
        setBurner(parsed.keypair);
        setBurnerState({
          keypair: parsed.keypair,
          balance,
          asset: parsed.asset,
          cluster: parsed.cluster,
          compressed: true,
          mint: parsed.mint,
          tokenMeta,
        });
        setStatus("Compressed token drop loaded. Ready to decompress.");
        setConfidentialNotes(["Compressed Token Drop · Amounts hidden via zk-compression"]);
        return;
      }

      const balance = await fetchBalance(parsed.keypair, parsed.asset, parsed.cluster, {
        mint: parsed.mint,
      });
      setBurner(parsed.keypair);
      setBurnerState({
        keypair: parsed.keypair,
        balance,
        asset: parsed.asset,
        cluster: parsed.cluster,
        shielded: false,
        mint: parsed.mint,
        tokenMeta,
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
    const balance = await fetchBalance(burner.keypair, burner.asset, burner.cluster, {
      compressed: burner.compressed,
      mint: burner.mint,
    });
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

    // Handle compressed token drops (decompress via Light Protocol)
    if (burner.compressed) {
      setSweeping(true);
      setError(null);
      try {
        if (!mainWallet || !sendTransaction) {
          throw new Error("Wallet not connected");
        }

        const sendTxFn = async (tx: Transaction): Promise<string> => {
          // Transaction is already partially signed with recipient keypair
          // Wallet adapter will sign with connected wallet (fee payer)
          return await sendTransaction(tx, connection, { skipPreflight: false });
        };

        const assetForLight = burner.asset === "usdc" ? "USDC" : "SOL";
        const signature = await unshieldDrop(
          burner.keypair,
          assetForLight,
          burner.balance,
          mainWallet, // For SOL, this is the recipient. For USDC, we'll get ATA inside unshieldDrop
          connection,
          mainWallet,
          sendTxFn
        );

        updateDropStatus("compressed", "claimed");
        addClaimedDrop({
          address: burner.keypair.publicKey.toBase58(),
          amount: (Number(burner.balance) / Math.pow(10, getAssetDecimals(burner.asset))).toString(),
          asset: burner.asset,
          cluster: burner.cluster,
          signature,
          claimedAt: new Date().toISOString(),
        });

        setStatus("Compressed tokens decompressed successfully.");
        setBurnerState(null);
        setBurner(null);
        setClaimCode("");
        setPassword("");
      } catch (decompressError) {
        setError(decompressError instanceof Error ? decompressError.message : "Decompress failed.");
      } finally {
        setSweeping(false);
      }
      return;
    }

    const decimals =
      burner.asset === "spl" ? burner.tokenMeta?.decimals ?? 0 : getAssetDecimals(burner.asset);

    if (burner.asset === "sol" && burner.balance <= DUST_THRESHOLD) {
      setError("Nothing to sweep.");
      return;
    }

    if (burner.asset === "usdc" && burner.balance <= 0n) {
      setError("No USDC remaining to sweep.");
      return;
    }
    if (burner.asset === "spl" && burner.balance <= 0n) {
      setError("No SPL tokens remaining to sweep.");
      return;
    }

    // Check nullifier for regular drops (compressed drops check in unshieldDrop)
    if (!burner.compressed) {
      const nullifier = generateNullifier(burner.keypair);
      const registry = getNullifierRegistry();
      const isUsed = await registry.isUsed(nullifier);
      
      if (isUsed) {
        setError("This drop has already been claimed. Nullifier already used.");
        return;
      }
      
      console.log(`[Nullifier] Checking nullifier for regular drop: ${nullifier.substring(0, 16)}... (not used)`);
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

        // Mark nullifier as used for regular SOL drops
        if (!burner.compressed) {
          const nullifier = generateNullifier(burner.keypair);
          const registry = getNullifierRegistry();
          await registry.markUsed(nullifier, signature);
          console.log(`[Nullifier] Marked nullifier as used for regular SOL drop`);
        }

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
      if (burner.asset === "spl") {
        if (!burner.mint) throw new Error("Missing SPL mint.");
        const mint = new PublicKey(burner.mint);
        const tokenProgramId = await getMintProgram(connection, burner.mint);
        const sourceAta = await getAssociatedTokenAddress(mint, burner.keypair.publicKey, true, tokenProgramId);
        const destAta = await getAssociatedTokenAddress(mint, mainWallet, true, tokenProgramId);
        const instructions = [];
        const destInfo = await connection.getAccountInfo(destAta);
        if (!destInfo) {
          instructions.push(createAssociatedTokenAccountInstruction(mainWallet, destAta, mainWallet, mint, tokenProgramId));
        }
  
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
  
        if (!burner.compressed) {
          const nullifier = generateNullifier(burner.keypair);
          const registry = getNullifierRegistry();
          await registry.markUsed(nullifier, signature);
          console.log(`[Nullifier] Marked nullifier as used for regular SPL drop`);
        }
  
        updateDropStatus(burner.keypair.publicKey.toBase58(), "claimed");
        addClaimedDrop({
          address: burner.keypair.publicKey.toBase58(),
          amount: unitsToAmount(burner.balance, decimals, 4),
          asset: burner.asset,
          mint: burner.mint,
          cluster: burner.cluster,
          signature,
          claimedAt: new Date().toISOString(),
        });
      } else {
        const mintAddress = getAssetMint(burner.asset, burner.cluster);
        const tokenProgramId = getAssetProgramId(burner.asset);
        if (!mintAddress || !tokenProgramId) throw new Error("Missing token mint for USDC.");
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

        // Mark nullifier as used for regular USDC drops
        if (!burner.compressed) {
          const nullifier = generateNullifier(burner.keypair);
          const registry = getNullifierRegistry();
          await registry.markUsed(nullifier, signature);
          console.log(`[Nullifier] Marked nullifier as used for regular USDC drop`);
        }

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

  // Check relayer status
  const checkRelayerStatus = async () => {
    try {
      const response = await fetch("/api/relay/claim");
      if (response.ok) {
        const data = await response.json();
        setRelayerStatus({ online: data.status === "online", fee: data.feePercent || 1 });
      } else {
        setRelayerStatus({ online: false, fee: 1 });
      }
    } catch {
      setRelayerStatus({ online: false, fee: 1 });
    }
  };

  // Claim via relayer (no wallet connection needed)
  const claimViaRelayer = async () => {
    if (!burner) {
      setError("No drop loaded.");
      return;
    }

    if (!burner.compressed) {
      setError("Relayer only supports compressed drops (Ultra Private Mode).");
      return;
    }

    const destination = customDestination.trim() || mainWallet?.toBase58();
    if (!destination) {
      setError("Enter a destination wallet address or connect your wallet.");
      return;
    }

    // Validate destination address
    try {
      new PublicKey(destination);
    } catch {
      setError("Invalid destination wallet address.");
      return;
    }

    setSweeping(true);
    setError(null);

    try {
      const response = await fetch("/api/relay/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimCode: claimCode,
          destination: destination,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Relayer claim failed");
      }

      const decimals =
        burner.asset === "spl" ? burner.tokenMeta?.decimals ?? 0 : getAssetDecimals(burner.asset);
      const amountReceived = result.amountReceived / Math.pow(10, decimals);
      const feePaid = result.feePaid / Math.pow(10, decimals);

      updateDropStatus("compressed", "claimed");
      addClaimedDrop({
        address: burner.keypair.publicKey.toBase58(),
        amount: amountReceived.toString(),
        asset: burner.asset,
        cluster: burner.cluster,
        signature: result.signature,
        claimedAt: new Date().toISOString(),
      });

      setStatus(`Claimed via relayer! Received ${amountReceived.toFixed(4)} ${getAssetSymbol(burner.asset)} (${feePaid.toFixed(4)} fee)`);
      setBurnerState(null);
      setBurner(null);
      setClaimCode("");
      setPassword("");
      setCustomDestination("");
    } catch (relayError) {
      setError(relayError instanceof Error ? relayError.message : "Relayer claim failed.");
    } finally {
      setSweeping(false);
    }
  };

  const balanceDisplay = burner
    ? burner.shielded
      ? "Hidden (shielded)"
      : `${unitsToAmount(
          burner.balance,
          burner.asset === "spl" ? burner.tokenMeta?.decimals ?? 0 : getAssetDecimals(burner.asset),
          burner.asset === "sol" ? 6 : 4
        )} ${burner.asset === "spl" ? burner.tokenMeta?.symbol ?? "SPL" : getAssetSymbol(burner.asset)}`
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
        <label className="block text-xs tracking-[0.4em] text-[rgba(224,224,224,0.6)]">
          CLAIM CODE
          <textarea
            value={claimCode}
            onChange={(event) => setClaimCode(event.target.value)}
            rows={4}
            className="mt-2 w-full"
            placeholder="darkdrop:v2:mainnet:sol:compressed:raw:..."
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
        <DropCard
          title={burner.shielded ? "UNSHIELD" : "SWEEP"}
          subtitle={
            burner.shielded
              ? "Unshield the note to your main wallet via Light Protocol."
              : "Inspect burner balance and push everything to your main wallet."
          }
        >
          <div className="flex flex-col gap-4">
            {!burner.shielded && (
              <p className="text-sm text-[rgba(224,224,224,0.8)]">
                Burner address: <span className="text-[var(--accent)]">{burner.keypair.publicKey.toBase58()}</span>
              </p>
            )}
            {burner.asset === "spl" ? (
              <div className="flex items-center gap-3 text-sm text-[rgba(224,224,224,0.8)]">
                {burner.tokenMeta?.logoURI && (
                  <img
                    src={burner.tokenMeta.logoURI}
                    alt={`${burner.tokenMeta.symbol} logo`}
                    className="h-6 w-6 rounded-full border border-[rgba(0,255,65,0.2)]"
                  />
                )}
                <div>
                  <p>
                    Token: <strong>{burner.tokenMeta?.name ?? "Custom SPL Token"}</strong> (
                    {burner.tokenMeta?.symbol ?? "SPL"})
                  </p>
                  <p className="text-xs text-[rgba(224,224,224,0.6)]">
                    Cluster: {CLUSTER_LABELS[burner.cluster]}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[rgba(224,224,224,0.8)]">
                Asset: <strong>{getAssetSymbol(burner.asset)}</strong> · Cluster: {CLUSTER_LABELS[burner.cluster]}
              </p>
            )}
            {burner.asset === "spl" && burner.tokenMeta?.metadataSource === "none" && (
              <p className="text-xs text-[var(--danger)]">
                No on-chain metadata found for this mint.
              </p>
            )}
            {burner.asset === "spl" &&
              burner.tokenMeta &&
              burner.tokenMeta.metadataSource !== "none" &&
              !burner.tokenMeta.logoURI && (
                <p className="text-xs text-[rgba(224,224,224,0.6)]">
                  No token image metadata found for this mint.
                </p>
              )}
            {burner.asset === "spl" && burner.mint && (
              <p className="text-xs text-[rgba(224,224,224,0.6)]">
                Mint: <span className="text-[var(--accent)]">{burner.mint}</span>
              </p>
            )}
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

            {/* Relayer Mode Toggle - Only for compressed drops */}
            {burner.compressed && (
              <div className="border border-[rgba(0,255,65,0.2)] bg-black/30 p-4 space-y-4">
                <p className="text-xs tracking-[0.4em] text-[var(--accent)]">CLAIM MODE</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUseRelayer(false)}
                    className={`p-3 text-left ${!useRelayer ? 'border-[var(--accent)] bg-[rgba(0,255,65,0.08)]' : 'border-[rgba(0,255,65,0.2)]'}`}
                  >
                    <div className="flex items-center gap-2 text-sm font-mono">
                      <Zap size={14} />
                      DIRECT
                    </div>
                    <p className="text-xs text-[rgba(224,224,224,0.6)] mt-1">You pay gas</p>
                    <p className="text-xs text-[rgba(224,224,224,0.6)]">Requires funded wallet</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUseRelayer(true); checkRelayerStatus(); }}
                    className={`p-3 text-left ${useRelayer ? 'border-[var(--accent)] bg-[rgba(0,255,65,0.08)]' : 'border-[rgba(0,255,65,0.2)]'}`}
                  >
                    <div className="flex items-center gap-2 text-sm font-mono">
                      <Radio size={14} />
                      RELAYER
                    </div>
                    <p className="text-xs text-[rgba(224,224,224,0.6)] mt-1">1% fee, relayer pays gas</p>
                    <p className="text-xs text-[var(--accent)]">Fresh 0 SOL wallet OK</p>
                  </button>
                </div>

                {useRelayer && (
                  <div className="space-y-3 pt-2 border-t border-[rgba(0,255,65,0.1)]">
                    {relayerStatus && (
                      <p className={`text-xs ${relayerStatus.online ? 'text-[var(--accent)]' : 'text-[var(--danger)]'}`}>
                        Relayer: {relayerStatus.online ? 'Online' : 'Offline'} | Fee: 1%
                      </p>
                    )}
                    <label className="block text-xs tracking-[0.3em] text-[rgba(224,224,224,0.6)]">
                      DESTINATION WALLET
                      <input
                        type="text"
                        value={customDestination}
                        onChange={(e) => setCustomDestination(e.target.value)}
                        placeholder={mainWallet?.toBase58() || "Enter fresh wallet address..."}
                        className="mt-2 w-full text-sm"
                      />
                    </label>
                    <p className="text-xs text-[rgba(224,224,224,0.5)]">
                      Can be any wallet - no SOL needed. Leave empty to use connected wallet.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={refreshBalance} className="flex flex-1 items-center justify-center gap-2">
                <RefreshCcw size={16} />
                REFRESH BALANCE
              </button>
              {useRelayer && burner.compressed ? (
                <button
                  type="button"
                  onClick={claimViaRelayer}
                  disabled={sweeping || !!(relayerStatus && !relayerStatus.online)}
                  className="flex flex-1 items-center justify-center gap-2 border-[rgba(0,255,65,0.6)] bg-[rgba(0,255,65,0.08)] text-[var(--accent)]"
                >
                  <Radio size={16} />
                  {sweeping ? "CLAIMING VIA RELAYER..." : "CLAIM VIA RELAYER"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={sweepDrop}
                  disabled={sweeping}
                  className="flex flex-1 items-center justify-center gap-2 border-[rgba(255,0,68,0.6)] bg-[rgba(255,0,68,0.08)] text-[var(--danger)]"
                >
                  <ShieldOff size={16} />
                  {sweeping
                    ? burner.compressed
                      ? "DECOMPRESSING..."
                      : burner.shielded
                      ? "UNSHIELDING..."
                      : "PURGING..."
                    : burner.compressed
                      ? "DECOMPRESS TO MAIN WALLET"
                      : burner.shielded
                      ? "UNSHIELD TO MAIN WALLET"
                      : "SWEEP TO MAIN WALLET"}
                </button>
              )}
            </div>
          </div>
        </DropCard>
      )}
    </div>
  );
}



