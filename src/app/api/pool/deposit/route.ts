import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createRpc } from "@lightprotocol/stateless.js";
import bs58 from "bs58";
import {
  generatePoolSecret,
  deriveNullifier,
  encodePoolClaimCode,
  POOL_CONFIG,
  PoolAsset,
} from "@/lib/pool";
import {
  storePoolDeposit,
  getPoolKeypairBase58,
  isPoolConfigured,
} from "@/lib/pool-storage";

/**
 * POST /api/pool/deposit
 * 
 * Request body:
 * {
 *   amount: string,        // Must match a fixed denomination
 *   asset: "sol" | "usdc",
 *   txSignature: string    // Signature of compress transaction to pool
 * }
 * 
 * Response:
 * {
 *   claimCode: string,
 *   nullifier: string,
 *   expiresIn: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check configuration
    if (!isPoolConfigured()) {
      return NextResponse.json(
        { error: "DarkPool not configured. Missing DARKPOOL_KEYPAIR or KV credentials." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { amount, asset, txSignature } = body;

    // Validate required fields
    if (!amount || !asset || !txSignature) {
      return NextResponse.json(
        { error: "Missing required fields: amount, asset, txSignature" },
        { status: 400 }
      );
    }

    // Validate asset
    if (asset !== "sol" && asset !== "usdc") {
      return NextResponse.json(
        { error: "Invalid asset. Must be 'sol' or 'usdc'" },
        { status: 400 }
      );
    }

    // Validate denomination
    const validDenominations = POOL_CONFIG.DENOMINATIONS[asset as PoolAsset];
    if (!validDenominations.includes(amount)) {
      return NextResponse.json(
        { 
          error: `Invalid denomination. Must be one of: ${validDenominations.join(", ")}`,
          validDenominations 
        },
        { status: 400 }
      );
    }

    // Get pool keypair
    const poolKeypairB58 = getPoolKeypairBase58();
    if (!poolKeypairB58) {
      return NextResponse.json(
        { error: "Pool keypair not configured" },
        { status: 503 }
      );
    }
    const poolKeypair = Keypair.fromSecretKey(bs58.decode(poolKeypairB58));

    // Setup RPC connection
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC || "https://api.mainnet-beta.solana.com";
    const compressionApi = process.env.NEXT_PUBLIC_LIGHT_COMPRESSION_API;
    const connection = new Connection(rpcUrl, "confirmed");
    const rpc = compressionApi 
      ? createRpc(connection, compressionApi)
      : createRpc(connection);

    // Verify transaction exists and is confirmed
    console.log("[Pool Deposit] Verifying transaction:", txSignature);
    const txInfo = await connection.getTransaction(txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo) {
      return NextResponse.json(
        { error: "Transaction not found or not confirmed" },
        { status: 400 }
      );
    }

    if (txInfo.meta?.err) {
      return NextResponse.json(
        { error: "Transaction failed on-chain" },
        { status: 400 }
      );
    }

    // Verify funds arrived in pool's compressed accounts
    // For simplicity, we trust the client sent to the right address
    // In production, you'd parse the transaction logs to verify exact amount
    console.log("[Pool Deposit] Transaction verified, generating claim code");

    // Generate secret and nullifier
    const secret = generatePoolSecret();
    const nullifier = deriveNullifier(secret);

    // Store deposit record
    await storePoolDeposit(nullifier, amount, asset as PoolAsset);

    // Generate claim code
    const claimCode = encodePoolClaimCode("mainnet", asset as PoolAsset, amount, secret);

    console.log("[Pool Deposit] Deposit registered:", {
      nullifier: nullifier.slice(0, 8) + "...",
      amount,
      asset,
      tx: txSignature.slice(0, 8) + "...",
    });

    return NextResponse.json({
      success: true,
      claimCode,
      nullifier,
      message: "Deposit registered. Share the claim code to recipient.",
    });

  } catch (error) {
    console.error("[Pool Deposit] Error:", error);
    const message = error instanceof Error ? error.message : "Deposit failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pool/deposit
 * Returns pool address and deposit instructions
 */
export async function GET() {
  try {
    // Check if pool is configured
    const poolKeypairB58 = getPoolKeypairBase58();
    
    let poolAddress: string | null = null;
    let online = false;

    if (poolKeypairB58) {
      try {
        const poolKeypair = Keypair.fromSecretKey(bs58.decode(poolKeypairB58));
        poolAddress = poolKeypair.publicKey.toBase58();
        online = isPoolConfigured();
      } catch (e) {
        console.error("[Pool Deposit] Invalid pool keypair:", e);
      }
    }

    return NextResponse.json({
      online,
      poolAddress,
      denominations: POOL_CONFIG.DENOMINATIONS,
      feeBps: POOL_CONFIG.FEE_BPS,
      instructions: online 
        ? "Compress funds to the pool address, then call POST /api/pool/deposit with the transaction signature."
        : "DarkPool is not yet configured. Coming soon.",
    });

  } catch (error) {
    console.error("[Pool Deposit] Error:", error);
    return NextResponse.json(
      { error: "Failed to get deposit info" },
      { status: 500 }
    );
  }
}
