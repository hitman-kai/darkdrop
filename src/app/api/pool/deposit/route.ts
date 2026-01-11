import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/pool/deposit
 * 
 * Request body:
 * {
 *   amount: string,
 *   asset: "sol" | "usdc",
 *   txSignature: string  // Signature of compress transaction
 * }
 * 
 * Response:
 * {
 *   claimCode: string,
 *   nullifier: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, asset, txSignature } = body;

    if (!amount || !asset || !txSignature) {
      return NextResponse.json(
        { error: "Missing required fields: amount, asset, txSignature" },
        { status: 400 }
      );
    }

    // TODO: Implement deposit flow
    // 1. Verify transaction signature exists and is confirmed
    // 2. Verify transaction compresses correct amount to pool address
    // 3. Generate secret and nullifier
    // 4. Store nullifier in database
    // 5. Return claim code

    return NextResponse.json(
      { error: "DarkPool deposit coming soon" },
      { status: 501 }
    );
  } catch (error) {
    console.error("[Pool Deposit] Error:", error);
    return NextResponse.json(
      { error: "Deposit failed" },
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
    // TODO: Return pool address for deposits
    // 1. Get pool keypair from env
    // 2. Return public key as deposit destination

    return NextResponse.json({
      poolAddress: null,
      instructions: "DarkPool coming soon",
      denominations: {
        sol: ["0.1", "0.5", "1", "10"],
        usdc: ["1", "5", "10", "100"],
      },
    });
  } catch (error) {
    console.error("[Pool Deposit] Error:", error);
    return NextResponse.json(
      { error: "Failed to get deposit info" },
      { status: 500 }
    );
  }
}

