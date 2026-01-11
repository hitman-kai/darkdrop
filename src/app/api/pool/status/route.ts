import { NextResponse } from "next/server";

/**
 * GET /api/pool/status
 * Returns pool status and balances
 */
export async function GET() {
  try {
    // TODO: Implement actual pool status
    // 1. Get pool keypair from env
    // 2. Query compressed SOL balance
    // 3. Query compressed USDC balance
    // 4. Return status

    return NextResponse.json({
      online: false,
      message: "DarkPool coming soon",
      balances: {
        sol: "0",
        usdc: "0",
      },
      stats: {
        totalDeposits: 0,
        totalClaims: 0,
        pendingClaims: 0,
      },
    });
  } catch (error) {
    console.error("[Pool Status] Error:", error);
    return NextResponse.json(
      { error: "Failed to get pool status" },
      { status: 500 }
    );
  }
}

