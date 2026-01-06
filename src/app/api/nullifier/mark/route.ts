import { NextRequest, NextResponse } from "next/server";

// Simple in-memory store for nullifiers (replace with database in production)
const usedNullifiers = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nullifier, signature } = body;
    
    if (!nullifier) {
      return NextResponse.json({ error: "Nullifier required" }, { status: 400 });
    }
    
    // Mark nullifier as used
    usedNullifiers.add(nullifier);
    
    console.log(`[Nullifier API] Marked nullifier as used: ${nullifier.substring(0, 16)}... (tx: ${signature?.substring(0, 16)}...)`);
    
    return NextResponse.json({ 
      success: true,
      nullifier,
      signature 
    });
  } catch (error) {
    console.error("[Nullifier API] Error marking nullifier:", error);
    return NextResponse.json(
      { error: "Failed to mark nullifier" },
      { status: 500 }
    );
  }
}


