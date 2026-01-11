import { NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createRpc } from "@lightprotocol/stateless.js";
import bs58 from "bs58";
import { POOL_CONFIG } from "@/lib/pool";
import {
  getPoolStats,
  getPoolKeypairBase58,
  isPoolConfigured,
} from "@/lib/pool-storage";

/**
 * GET /api/pool/status
 * Returns pool status and balances
 */
export async function GET() {
  try {
    const configured = isPoolConfigured();
    const poolKeypairB58 = getPoolKeypairBase58();

    // Basic response for unconfigured pool
    if (!configured || !poolKeypairB58) {
      return NextResponse.json({
        online: false,
        message: "DarkPool coming soon. Pool keypair or KV not configured.",
        poolAddress: null,
        balances: { sol: "0", usdc: "0" },
        stats: {
          totalDeposits: 0,
          totalClaims: 0,
          pendingClaims: 0,
        },
        denominations: POOL_CONFIG.DENOMINATIONS,
        feeBps: POOL_CONFIG.FEE_BPS,
      });
    }

    // Get pool keypair
    let poolKeypair: Keypair;
    try {
      poolKeypair = Keypair.fromSecretKey(bs58.decode(poolKeypairB58));
    } catch {
      return NextResponse.json({
        online: false,
        message: "Invalid pool keypair configuration",
        poolAddress: null,
        balances: { sol: "0", usdc: "0" },
        stats: { totalDeposits: 0, totalClaims: 0, pendingClaims: 0 },
        denominations: POOL_CONFIG.DENOMINATIONS,
        feeBps: POOL_CONFIG.FEE_BPS,
      });
    }

    // Setup RPC
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC || "https://api.mainnet-beta.solana.com";
    const compressionApi = process.env.NEXT_PUBLIC_LIGHT_COMPRESSION_API;
    const connection = new Connection(rpcUrl, "confirmed");
    const rpc = compressionApi 
      ? createRpc(connection, compressionApi)
      : createRpc(connection);

    // Get compressed SOL balance
    let solBalance = "0";
    try {
      const compressedAccounts = await rpc.getCompressedAccountsByOwner(poolKeypair.publicKey);
      if (compressedAccounts.items && compressedAccounts.items.length > 0) {
        const totalLamports = compressedAccounts.items.reduce(
          (sum, acc) => sum + BigInt(String(acc.lamports || 0)),
          BigInt(0)
        );
        solBalance = (Number(totalLamports) / 1e9).toFixed(9);
      }
    } catch (e) {
      console.error("[Pool Status] Error getting SOL balance:", e);
    }

    // Get compressed USDC balance
    let usdcBalance = "0";
    try {
      const mintAddress = process.env.NEXT_PUBLIC_USDC_MAINNET_MINT || 
                          process.env.NEXT_PUBLIC_CUSDC_MAINNET_MINT;
      if (mintAddress) {
        const mint = new PublicKey(mintAddress);
        const compressedTokenAccounts = await rpc.getCompressedTokenAccountsByOwner(
          poolKeypair.publicKey,
          { mint }
        );
        if (compressedTokenAccounts.items && compressedTokenAccounts.items.length > 0) {
          const totalAtomicUnits = compressedTokenAccounts.items.reduce(
            (sum, acc) => sum + BigInt(String(acc.parsed.amount)),
            BigInt(0)
          );
          usdcBalance = (Number(totalAtomicUnits) / 1e6).toFixed(6);
        }
      }
    } catch (e) {
      console.error("[Pool Status] Error getting USDC balance:", e);
    }

    // Get regular SOL balance (for gas)
    let gasBalance = "0";
    try {
      const balance = await connection.getBalance(poolKeypair.publicKey);
      gasBalance = (balance / 1e9).toFixed(9);
    } catch (e) {
      console.error("[Pool Status] Error getting gas balance:", e);
    }

    // Get stats from KV
    let stats = { totalDeposits: 0, totalClaims: 0, pendingClaims: 0 };
    try {
      const kvStats = await getPoolStats();
      stats = {
        totalDeposits: kvStats.totalDeposits,
        totalClaims: kvStats.totalClaims,
        pendingClaims: kvStats.pendingClaims,
      };
    } catch (e) {
      console.error("[Pool Status] Error getting stats:", e);
    }

    return NextResponse.json({
      online: true,
      poolAddress: poolKeypair.publicKey.toBase58(),
      balances: {
        sol: solBalance,
        usdc: usdcBalance,
        gas: gasBalance,
      },
      stats,
      denominations: POOL_CONFIG.DENOMINATIONS,
      feeBps: POOL_CONFIG.FEE_BPS,
    });

  } catch (error) {
    console.error("[Pool Status] Error:", error);
    return NextResponse.json(
      { 
        online: false,
        error: "Failed to get pool status",
        balances: { sol: "0", usdc: "0" },
        stats: { totalDeposits: 0, totalClaims: 0, pendingClaims: 0 },
      },
      { status: 500 }
    );
  }
}
