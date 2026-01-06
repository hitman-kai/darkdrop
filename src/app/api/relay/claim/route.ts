import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { executeRelayedClaim, RELAYER_FEE_PERCENT } from "@/lib/relay";
import bs58 from "bs58";

// Load relayer keypair from environment
function getRelayerKeypair(): Keypair {
  const privateKey = process.env.RELAYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("RELAYER_PRIVATE_KEY not configured");
  }
  
  // Support both JSON array and base58 formats
  try {
    if (privateKey.startsWith("[")) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(privateKey)));
    } else {
      return Keypair.fromSecretKey(bs58.decode(privateKey));
    }
  } catch {
    throw new Error("Invalid RELAYER_PRIVATE_KEY format");
  }
}

// Parse claim code to extract keypair and metadata
function parseClaimCode(code: string): {
  recipientKeypair: Keypair;
  asset: "SOL" | "USDC";
  network: string;
  isCompressed: boolean;
} | null {
  try {
    // Format: darkdrop:v2:mainnet:sol:compressed:raw:BASE58_SECRET
    // or: darkdrop:v2:mainnet:usdc:compressed:raw:BASE58_SECRET
    const parts = code.split(":");
    
    if (parts.length < 7 || parts[0] !== "darkdrop" || parts[1] !== "v2") {
      return null;
    }
    
    const network = parts[2]; // mainnet
    const asset = parts[3].toUpperCase() as "SOL" | "USDC";
    const isCompressed = parts[4] === "compressed";
    const secretKey = parts[6];
    
    if (!isCompressed) {
      return null; // Relayer only supports compressed drops
    }
    
    const recipientKeypair = Keypair.fromSecretKey(bs58.decode(secretKey));
    
    return {
      recipientKeypair,
      asset,
      network,
      isCompressed,
    };
  } catch (error) {
    console.error("[Relayer] Failed to parse claim code:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { claimCode, destination } = body;
    
    // 1. Validate inputs
    if (!claimCode || typeof claimCode !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid claimCode" },
        { status: 400 }
      );
    }
    
    if (!destination || typeof destination !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid destination wallet" },
        { status: 400 }
      );
    }
    
    // 2. Validate destination is valid pubkey
    let destinationPubkey: PublicKey;
    try {
      destinationPubkey = new PublicKey(destination);
    } catch {
      return NextResponse.json(
        { error: "Invalid destination wallet address" },
        { status: 400 }
      );
    }
    
    // 3. Parse claim code
    const parsed = parseClaimCode(claimCode);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid claim code format. Relayer only supports v2 compressed drops." },
        { status: 400 }
      );
    }
    
    const { recipientKeypair, asset, network } = parsed;
    
    // 4. Validate network
    if (network !== "mainnet") {
      return NextResponse.json(
        { error: "Relayer only supports mainnet" },
        { status: 400 }
      );
    }
    
    // 5. Load relayer keypair
    let relayerKeypair: Keypair;
    try {
      relayerKeypair = getRelayerKeypair();
    } catch (error: any) {
      console.error("[Relayer] Failed to load relayer keypair:", error);
      return NextResponse.json(
        { error: "Relayer not configured" },
        { status: 500 }
      );
    }
    
    console.log("[Relayer] Processing claim request");
    console.log("[Relayer] Asset:", asset);
    console.log("[Relayer] Destination:", destination);
    console.log("[Relayer] Relayer pubkey:", relayerKeypair.publicKey.toBase58());
    
    // 6. Check relayer has enough SOL for gas
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com");
    const relayerBalance = await connection.getBalance(relayerKeypair.publicKey);
    
    if (relayerBalance < 10_000_000) { // 0.01 SOL minimum
      console.error("[Relayer] Insufficient relayer balance:", relayerBalance);
      return NextResponse.json(
        { error: "Relayer temporarily unavailable (insufficient funds)" },
        { status: 503 }
      );
    }
    
    // 7. Execute relayed claim
    const result = await executeRelayedClaim({
      connection,
      recipientKeypair,
      destinationPubkey,
      relayerKeypair,
      asset,
    });
    
    console.log("[Relayer] Claim successful:", result.signature);
    
    // 8. Return success
    return NextResponse.json({
      success: true,
      signature: result.signature,
      amountReceived: result.amountReceived,
      feePaid: result.feePaid,
      feePercent: RELAYER_FEE_PERCENT,
      asset: result.asset,
    });
    
  } catch (error: any) {
    console.error("[Relayer] Error processing claim:", error);
    
    // Provide user-friendly error messages
    let errorMessage = "Failed to process claim";
    
    if (error.message?.includes("No compressed")) {
      errorMessage = "No funds found for this claim code. It may have already been claimed.";
    } else if (error.message?.includes("insufficient")) {
      errorMessage = "Insufficient funds in drop or relayer.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint to check relayer status
export async function GET() {
  try {
    const relayerKeypair = getRelayerKeypair();
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com");
    const balance = await connection.getBalance(relayerKeypair.publicKey);
    
    return NextResponse.json({
      status: "online",
      relayerAddress: relayerKeypair.publicKey.toBase58(),
      balanceLamports: balance,
      balanceSOL: balance / 1_000_000_000,
      feePercent: RELAYER_FEE_PERCENT,
      supported: ["SOL", "USDC"],
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "offline",
      error: error.message,
    }, { status: 503 });
  }
}


