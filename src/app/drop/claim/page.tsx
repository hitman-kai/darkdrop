"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { QRScanner } from "@/components/QRScanner";
import { unitsToAmount } from "@/lib/amount";
import { claimDrop, unshieldDrop } from "@/lib/drop";
import { AssetSymbol, ClusterType, CLUSTER_LABELS, getAssetDecimals, getAssetMint, getAssetProgramId, getAssetSymbol } from "@/lib/tokens";
import { generateNullifier, getNullifierRegistry } from "@/lib/nullifier";
import { createRpc } from "@lightprotocol/stateless.js";
import BN from "bn.js";
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
};

const DUST_THRESHOLD = 5_000n;

function ClaimDropContent() {
  const { connection } = useConnection();
  const { publicKey: mainWallet, sendTransaction } = useWallet();
  const searchParams = useSearchParams();
  const setBurner = useBurnerStore((state) => state.setBurner);
  const updateDropStatus = useHistoryStore((state) => state.updateDropStatus);
  const addClaimedDrop = useHistoryStore((state) => state.addClaimedDrop);
  const cluster = useSettingsStore((state) => state.cluster);

  const [claimCode, setClaimCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [burner, setBurnerState] = useState<BurnerState | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [useRelayer, setUseRelayer] = useState(false);
  const [customDestination, setCustomDestination] = useState("");
  const [relayerStatus, setRelayerStatus] = useState<{ online: boolean; fee: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam && !claimCode) setClaimCode(codeParam);
  }, [searchParams, claimCode]);

  const fetchBalance = async (keypair: Keypair, asset: AssetSymbol, dropCluster: ClusterType, options?: { compressed?: boolean }) => {
    if (options?.compressed) {
      const compressionApiEndpoint = process.env.NEXT_PUBLIC_LIGHT_COMPRESSION_API;
      const rpc = compressionApiEndpoint ? createRpc(connection, compressionApiEndpoint) : createRpc(connection);
      if (asset === "sol") {
        const compressedAccounts = await rpc.getCompressedAccountsByOwner(keypair.publicKey);
        const { sumUpLamports } = await import("@lightprotocol/stateless.js");
        const totalBalance = sumUpLamports(compressedAccounts.items);
        return BigInt(totalBalance.toString());
      } else {
        const mintAddress = getAssetMint(asset, dropCluster);
        if (!mintAddress) return 0n;
        const mint = new PublicKey(mintAddress);
        const accounts = await rpc.getCompressedTokenAccountsByOwner(keypair.publicKey, { mint });
        const totalBalance = accounts.items.reduce((sum, account) => sum.add(account.parsed.amount), new BN(0));
        return BigInt(totalBalance.toString());
      }
    }
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
    setLoading(true);
    try {
      const parsed = claimDrop(claimCode, {
        password: password.trim() ? password : undefined,
        fallbackCluster: cluster,
      });
      if (parsed.cluster !== cluster) {
        setError(`Drop was created on ${CLUSTER_LABELS[parsed.cluster]}, which DarkDrop no longer supports.`);
        return;
      }
      if (parsed.compressed) {
        const balance = await fetchBalance(parsed.keypair, parsed.asset, parsed.cluster, { compressed: true });
        setBurner(parsed.keypair);
        setBurnerState({ keypair: parsed.keypair, balance, asset: parsed.asset, cluster: parsed.cluster, compressed: true });
        setStatus("Compressed drop loaded. Ready to decompress.");
        return;
      }
      const balance = await fetchBalance(parsed.keypair, parsed.asset, parsed.cluster);
      setBurner(parsed.keypair);
      setBurnerState({ keypair: parsed.keypair, balance, asset: parsed.asset, cluster: parsed.cluster, shielded: false });
      setStatus("Burner imported. Ready to sweep.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to parse claim code.");
      setBurnerState(null);
      setBurner(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    if (!burner) return;
    const balance = await fetchBalance(burner.keypair, burner.asset, burner.cluster, { compressed: burner.compressed });
    setBurnerState({ ...burner, balance });
  };

  const sweepDrop = async () => {
    if (!burner) { setError("No burner loaded."); return; }
    if (!mainWallet) { setError("Connect your main wallet first."); return; }

    if (burner.compressed) {
      setSweeping(true);
      setError(null);
      try {
        if (!sendTransaction) throw new Error("Wallet not connected");
        const sendTxFn = async (tx: Transaction): Promise<string> => {
          return await sendTransaction(tx, connection, { skipPreflight: false });
        };
        const assetForLight = burner.asset === "usdc" ? "USDC" : "SOL";
        const signature = await unshieldDrop(burner.keypair, assetForLight, burner.balance, mainWallet, connection, mainWallet, sendTxFn);
        updateDropStatus("compressed", "claimed");
        addClaimedDrop({
          address: burner.keypair.publicKey.toBase58(),
          amount: (Number(burner.balance) / Math.pow(10, getAssetDecimals(burner.asset))).toString(),
          asset: burner.asset, cluster: burner.cluster, signature, claimedAt: new Date().toISOString(),
        });
        setStatus("Compressed tokens decompressed successfully.");
        setBurnerState(null); setBurner(null); setClaimCode(""); setPassword("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Decompress failed.");
      } finally {
        setSweeping(false);
      }
      return;
    }

    const decimals = getAssetDecimals(burner.asset);
    if (burner.asset === "sol" && burner.balance <= DUST_THRESHOLD) { setError("Nothing to sweep."); return; }
    if (burner.asset === "usdc" && burner.balance <= 0n) { setError("No USDC remaining to sweep."); return; }

    if (!burner.compressed) {
      const nullifier = generateNullifier(burner.keypair);
      const registry = getNullifierRegistry();
      const isUsed = await registry.isUsed(nullifier);
      if (isUsed) { setError("This drop has already been claimed."); return; }
    }

    setSweeping(true);
    setError(null);
    try {
      if (burner.asset === "sol") {
        const lamports = burner.balance - DUST_THRESHOLD;
        if (lamports <= 0n) throw new Error("Not enough SOL to cover fees.");
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
        const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: burner.keypair.publicKey, toPubkey: mainWallet, lamports: Number(lamports) }));
        tx.recentBlockhash = blockhash;
        tx.feePayer = burner.keypair.publicKey;
        tx.sign(burner.keypair);
        const signature = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
        if (!burner.compressed) {
          const nullifier = generateNullifier(burner.keypair);
          const registry = getNullifierRegistry();
          await registry.markUsed(nullifier, signature);
        }
        updateDropStatus(burner.keypair.publicKey.toBase58(), "claimed");
        addClaimedDrop({ address: burner.keypair.publicKey.toBase58(), amount: unitsToAmount(lamports, decimals, 6), asset: burner.asset, cluster: burner.cluster, signature, claimedAt: new Date().toISOString() });
      } else {
        const mintAddress = getAssetMint(burner.asset, burner.cluster);
        const tokenProgramId = getAssetProgramId(burner.asset);
        if (!mintAddress || !tokenProgramId) throw new Error("Missing token mint for USDC.");
        const mint = new PublicKey(mintAddress);
        const sourceAta = await getAssociatedTokenAddress(mint, burner.keypair.publicKey, true, tokenProgramId);
        const destAta = await getAssociatedTokenAddress(mint, mainWallet, true, tokenProgramId);
        const instructions = [];
        const destInfo = await connection.getAccountInfo(destAta);
        if (!destInfo) instructions.push(createAssociatedTokenAccountInstruction(mainWallet, destAta, mainWallet, mint, tokenProgramId));
        instructions.push(createTransferInstruction(sourceAta, destAta, burner.keypair.publicKey, Number(burner.balance), [], tokenProgramId));
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
        }
        updateDropStatus(burner.keypair.publicKey.toBase58(), "claimed");
        addClaimedDrop({ address: burner.keypair.publicKey.toBase58(), amount: unitsToAmount(burner.balance, decimals, 4), asset: burner.asset, cluster: burner.cluster, signature, claimedAt: new Date().toISOString() });
      }
      setStatus("Drop claimed. Burner destroyed.");
      setBurnerState(null); setBurner(null); setClaimCode(""); setPassword("");
    } catch (txError) {
      setError(txError instanceof Error ? txError.message : "Sweep failed.");
    } finally {
      setSweeping(false);
    }
  };

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

  const claimViaRelayer = async () => {
    if (!burner) { setError("No drop loaded."); return; }
    if (!burner.compressed) { setError("Relayer only supports compressed drops."); return; }
    const destination = customDestination.trim() || mainWallet?.toBase58();
    if (!destination) { setError("Enter a destination wallet address or connect your wallet."); return; }
    try { new PublicKey(destination); } catch { setError("Invalid destination wallet address."); return; }
    setSweeping(true);
    setError(null);
    try {
      const response = await fetch("/api/relay/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimCode, destination }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Relayer claim failed");
      const decimals = getAssetDecimals(burner.asset);
      const amountReceived = result.amountReceived / Math.pow(10, decimals);
      const feePaid = result.feePaid / Math.pow(10, decimals);
      updateDropStatus("compressed", "claimed");
      addClaimedDrop({ address: burner.keypair.publicKey.toBase58(), amount: amountReceived.toString(), asset: burner.asset, cluster: burner.cluster, signature: result.signature, claimedAt: new Date().toISOString() });
      setStatus(`Claimed via relayer. Received ${amountReceived.toFixed(4)} ${getAssetSymbol(burner.asset)} (${feePaid.toFixed(4)} fee)`);
      setBurnerState(null); setBurner(null); setClaimCode(""); setPassword(""); setCustomDestination("");
    } catch (relayError) {
      setError(relayError instanceof Error ? relayError.message : "Relayer claim failed.");
    } finally {
      setSweeping(false);
    }
  };

  const balanceDisplay = burner
    ? `${unitsToAmount(burner.balance, getAssetDecimals(burner.asset), burner.asset === "sol" ? 6 : 4)} ${getAssetSymbol(burner.asset)}`
    : "0";

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-[rgba(0,255,65,0.12)] bg-[rgba(0,0,0,0.92)] px-8 backdrop-blur-md" style={{height:"52px"}}>
        <span className="font-mono text-[13px] tracking-[0.22em] text-[var(--accent)]">DARKDROP</span>
        <div className="flex items-center gap-1 border border-[rgba(0,255,65,0.15)] px-1 py-1">
          <Link href="/" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[rgba(224,224,224,0.5)] transition-colors hover:text-[var(--accent)]">HOME</Link>
          <Link href="/drop/create" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[rgba(224,224,224,0.5)] transition-colors hover:text-[var(--accent)]">CREATE</Link>
          <Link href="/drop/claim" className="px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-[var(--accent)]">CLAIM</Link>
        </div>
        <WalletConnectButton />
      </nav>

      <main className="mx-auto w-full max-w-xl px-6 pb-20" style={{paddingTop:"80px"}}>
        <div className="mb-8">
          <p className="mb-2 font-mono text-[9px] tracking-[0.3em] text-[rgba(0,255,65,0.35)]">OUTPUT // 0X02</p>
          <h1 className="font-mono text-[clamp(24px,4vw,36px)] font-light leading-[1.15] text-[var(--text)]">Claim a<br />dead drop.</h1>
          <p className="mt-3 text-xs leading-relaxed text-[rgba(224,224,224,0.45)]">Paste the claim string below. Funds sweep directly to your connected wallet.</p>
        </div>

        {/* CLAIM CODE INPUT */}
        <div className="mb-3 border border-[rgba(0,255,65,0.1)] bg-[#050505]">
          <div className="border-b border-[rgba(0,255,65,0.1)] px-5 py-3">
            <span className="font-mono text-[9px] tracking-[0.28em] text-[rgba(224,224,224,0.2)]">CLAIM STRING</span>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <textarea
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              rows={3}
              placeholder="darkdrop:v2:mainnet:sol:..."
              className="w-full border border-[rgba(0,255,65,0.2)] bg-[#020202] px-4 py-3 font-mono text-[11px] leading-relaxed text-[var(--text)] placeholder-[rgba(224,224,224,0.12)] focus:border-[var(--accent)] focus:outline-none resize-none"
            />
            <QRScanner onScan={(code) => setClaimCode(code)} />
          </div>
        </div>

        {/* PASSWORD */}
        <div className="mb-3 border border-[rgba(0,255,65,0.1)] bg-[#050505]">
          <div className="border-b border-[rgba(0,255,65,0.1)] px-5 py-3">
            <span className="font-mono text-[9px] tracking-[0.28em] text-[rgba(224,224,224,0.2)]">PASSWORD <span className="text-[rgba(224,224,224,0.15)]">— IF ENCRYPTED</span></span>
          </div>
          <div className="p-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Required if encrypted..."
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

        {error && (
          <div className="mb-3 border border-[rgba(255,0,68,0.2)] bg-[rgba(255,0,68,0.04)] px-5 py-3">
            <p className="text-xs text-[var(--danger)]">{error}</p>
          </div>
        )}

        {status && !burner && (
          <div className="mb-3 border border-[rgba(0,255,65,0.2)] bg-[rgba(0,255,65,0.04)] px-5 py-3">
            <p className="text-xs text-[var(--accent)]">{status}</p>
          </div>
        )}

        {!burner && (
          <button
            type="button"
            onClick={loadDrop}
            disabled={loading || !claimCode.trim()}
            className="w-full border-[var(--accent)] bg-[var(--accent)] py-4 font-mono text-[10px] font-medium tracking-[0.2em] text-black transition-all hover:bg-[#33ff66] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "LOADING..." : "LOAD DROP"}
          </button>
        )}

        {/* BURNER LOADED */}
        {burner && (
          <>
            <div className="mb-3 border border-[rgba(0,255,65,0.2)] bg-[#050505]">
              <div className="border-b border-[rgba(0,255,65,0.15)] px-5 py-3 flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]" />
                <span className="font-mono text-[9px] tracking-[0.28em] text-[rgba(0,255,65,0.6)]">DROP DETAILS</span>
              </div>
              <div className="divide-y divide-[rgba(0,255,65,0.06)]">
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs text-[rgba(224,224,224,0.4)]">Balance</span>
                  <span className="font-mono text-[13px] text-[var(--accent)]">{balanceDisplay}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs text-[rgba(224,224,224,0.4)]">Asset</span>
                  <span className="font-mono text-[11px] text-[var(--text)]">{getAssetSymbol(burner.asset)}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs text-[rgba(224,224,224,0.4)]">Mode</span>
                  <span className="font-mono text-[11px] text-[var(--text)]">{burner.compressed ? "Compressed (ZK)" : "Raw Burner"}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs text-[rgba(224,224,224,0.4)]">Nullifier</span>
                  <span className="font-mono text-[10px] text-[rgba(224,224,224,0.3)]">{generateNullifier(burner.keypair).slice(0,8)}...{generateNullifier(burner.keypair).slice(-6)}</span>
                </div>
              </div>
            </div>

            {/* CLAIM MODE — compressed only */}
            {burner.compressed && (
              <div className="mb-3 border border-[rgba(0,255,65,0.1)] bg-[#050505]">
                <div className="border-b border-[rgba(0,255,65,0.1)] px-5 py-3">
                  <span className="font-mono text-[9px] tracking-[0.28em] text-[rgba(224,224,224,0.2)]">CLAIM MODE</span>
                </div>
                <div className="flex divide-x divide-[rgba(0,255,65,0.08)]">
                  <button
                    type="button"
                    onClick={() => setUseRelayer(false)}
                    className={`flex-1 px-4 py-4 text-left transition-colors ${!useRelayer ? "bg-[rgba(0,255,65,0.05)] border-none" : "border-none"}`}
                  >
                    <p className={`font-mono text-[10px] tracking-[0.12em] ${!useRelayer ? "text-[var(--accent)]" : "text-[rgba(224,224,224,0.4)]"}`}>DIRECT</p>
                    <p className="mt-1 text-[11px] text-[rgba(224,224,224,0.35)]">You pay gas</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUseRelayer(true); checkRelayerStatus(); }}
                    className={`flex-1 px-4 py-4 text-left transition-colors ${useRelayer ? "bg-[rgba(0,255,65,0.05)] border-none" : "border-none"}`}
                  >
                    <p className={`font-mono text-[10px] tracking-[0.12em] ${useRelayer ? "text-[var(--accent)]" : "text-[rgba(224,224,224,0.4)]"}`}>RELAYER</p>
                    <p className="mt-1 text-[11px] text-[rgba(224,224,224,0.35)]">1% fee · no SOL needed</p>
                  </button>
                </div>
                {useRelayer && (
                  <div className="border-t border-[rgba(0,255,65,0.08)] p-4 space-y-3">
                    {relayerStatus && (
                      <p className={`font-mono text-[9px] tracking-[0.15em] ${relayerStatus.online ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                        RELAYER {relayerStatus.online ? "ONLINE" : "OFFLINE"} · FEE 1%
                      </p>
                    )}
                    <input
                      type="text"
                      value={customDestination}
                      onChange={(e) => setCustomDestination(e.target.value)}
                      placeholder={mainWallet?.toBase58() || "Destination wallet address..."}
                      className="w-full border border-[rgba(0,255,65,0.2)] bg-[#020202] px-4 py-3 font-mono text-[11px] text-[var(--text)] placeholder-[rgba(224,224,224,0.15)] focus:border-[var(--accent)] focus:outline-none"
                    />
                    <p className="text-[10px] text-[rgba(224,224,224,0.3)]">Any wallet — no SOL required. Leave empty to use connected wallet.</p>
                  </div>
                )}
              </div>
            )}

            {status && (
              <div className="mb-3 border border-[rgba(0,255,65,0.15)] bg-[rgba(0,255,65,0.03)] px-5 py-3">
                <p className="text-xs text-[var(--accent)]">{status}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={refreshBalance}
                className="border-[rgba(0,255,65,0.2)] px-4 py-3 font-mono text-[9px] tracking-[0.15em] text-[rgba(224,224,224,0.4)] transition-colors hover:text-[var(--accent)]"
              >
                REFRESH
              </button>
              {useRelayer && burner.compressed ? (
                <button
                  type="button"
                  onClick={claimViaRelayer}
                  disabled={sweeping || !!(relayerStatus && !relayerStatus.online)}
                  className="flex-1 border-[var(--accent)] bg-[var(--accent)] py-3 font-mono text-[10px] font-medium tracking-[0.2em] text-black transition-all hover:bg-[#33ff66] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sweeping ? "CLAIMING..." : "CLAIM VIA RELAYER"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={sweepDrop}
                  disabled={sweeping}
                  className="flex-1 border-[rgba(255,0,68,0.4)] bg-[rgba(255,0,68,0.08)] py-3 font-mono text-[10px] tracking-[0.2em] text-[var(--danger)] transition-all hover:bg-[rgba(255,0,68,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sweeping
                    ? burner.compressed ? "DECOMPRESSING..." : "PURGING..."
                    : burner.compressed ? "DECOMPRESS TO WALLET" : "SWEEP TO MAIN WALLET"}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => { setBurnerState(null); setBurner(null); setClaimCode(""); setPassword(""); setStatus(null); setError(null); }}
              className="mt-2 w-full border-none bg-transparent py-2 font-mono text-[9px] tracking-[0.15em] text-[rgba(224,224,224,0.2)] transition-colors hover:text-[rgba(224,224,224,0.4)]"
            >
              CLEAR
            </button>
          </>
        )}
      </main>
    </div>
  );
}

export default function ClaimDropPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center font-mono text-[10px] tracking-[0.3em] text-[rgba(224,224,224,0.3)]">LOADING...</div>}>
      <ClaimDropContent />
    </Suspense>
  );
}
