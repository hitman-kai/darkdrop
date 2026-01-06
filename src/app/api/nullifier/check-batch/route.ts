import { NextRequest, NextResponse } from "next/server";

// Simple in-memory store for nullifiers (replace with database in production)
const usedNullifiers = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nullifiers } = body;
    
    if (!Array.isArray(nullifiers)) {
      return NextResponse.json({ error: "Nullifiers array required" }, { status: 400 });
    }
    
    // Check each nullifier
    const used = nullifiers.map((nullifier: string) => usedNullifiers.has(nullifier));
    
    return NextResponse.json({ 
      nullifiers,
      used 
    });
  } catch (error) {
    console.error("[Nullifier API] Error checking nullifiers:", error);
    return NextResponse.json(
      { error: "Failed to check nullifiers" },
      { status: 500 }
    );
  }
}


