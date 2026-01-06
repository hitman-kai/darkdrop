import { NextRequest, NextResponse } from "next/server";

// Simple in-memory store for nullifiers (replace with database in production)
// In production, use a database like PostgreSQL, Redis, or on-chain PDA
const usedNullifiers = new Set<string>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nullifier: string }> }
) {
  const { nullifier } = await params;
  
  if (!nullifier) {
    return NextResponse.json({ error: "Nullifier required" }, { status: 400 });
  }
  
  const isUsed = usedNullifiers.has(nullifier);
  
  return NextResponse.json({ 
    nullifier,
    used: isUsed 
  });
}


