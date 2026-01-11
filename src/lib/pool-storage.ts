/**
 * DarkPool Storage - Vercel KV backed nullifier storage
 * 
 * Uses Vercel KV to store deposit records and nullifiers.
 * Each deposit creates a record keyed by nullifier hash.
 * Claims mark nullifiers as used.
 */

import { kv } from "@vercel/kv";
import { PoolAsset } from "./pool";

// Key prefixes for KV storage
const NULLIFIER_PREFIX = "darkpool:nullifier:";
const STATS_KEY = "darkpool:stats";

export interface PoolDepositRecord {
  nullifier: string;
  amount: string;
  asset: PoolAsset;
  createdAt: string;
  claimedAt: string | null;
  claimTx: string | null;
  claimDestination: string | null;
}

export interface PoolStats {
  totalDeposits: number;
  totalClaims: number;
  pendingClaims: number;
  totalVolume: {
    sol: string;
    usdc: string;
  };
}

/**
 * Store a new deposit record
 */
export async function storePoolDeposit(
  nullifier: string,
  amount: string,
  asset: PoolAsset
): Promise<void> {
  const key = `${NULLIFIER_PREFIX}${nullifier}`;
  
  // Check if nullifier already exists (shouldn't happen with random secrets)
  const existing = await kv.get(key);
  if (existing) {
    throw new Error("Nullifier collision - try again");
  }
  
  const record: PoolDepositRecord = {
    nullifier,
    amount,
    asset,
    createdAt: new Date().toISOString(),
    claimedAt: null,
    claimTx: null,
    claimDestination: null,
  };
  
  // Store record (no expiry - deposits are permanent until claimed)
  await kv.set(key, record);
  
  // Update stats
  await incrementPoolStats("deposit", amount, asset);
  
  console.log("[PoolStorage] Stored deposit:", nullifier, amount, asset);
}

/**
 * Get a deposit record by nullifier
 */
export async function getPoolDeposit(nullifier: string): Promise<PoolDepositRecord | null> {
  const key = `${NULLIFIER_PREFIX}${nullifier}`;
  const record = await kv.get<PoolDepositRecord>(key);
  return record;
}

/**
 * Mark a deposit as claimed
 */
export async function markPoolDepositClaimed(
  nullifier: string,
  claimTx: string,
  claimDestination: string
): Promise<void> {
  const key = `${NULLIFIER_PREFIX}${nullifier}`;
  const record = await kv.get<PoolDepositRecord>(key);
  
  if (!record) {
    throw new Error("Deposit not found");
  }
  
  if (record.claimedAt) {
    throw new Error("Already claimed");
  }
  
  record.claimedAt = new Date().toISOString();
  record.claimTx = claimTx;
  record.claimDestination = claimDestination;
  
  await kv.set(key, record);
  
  // Update stats
  await incrementPoolStats("claim", record.amount, record.asset);
  
  console.log("[PoolStorage] Marked claimed:", nullifier, claimTx);
}

/**
 * Check if a nullifier has been used
 */
export async function isNullifierUsed(nullifier: string): Promise<boolean> {
  const record = await getPoolDeposit(nullifier);
  if (!record) {
    return false; // Doesn't exist = not used (but also invalid)
  }
  return record.claimedAt !== null;
}

/**
 * Get pool statistics
 */
export async function getPoolStats(): Promise<PoolStats> {
  const stats = await kv.get<PoolStats>(STATS_KEY);
  return stats || {
    totalDeposits: 0,
    totalClaims: 0,
    pendingClaims: 0,
    totalVolume: { sol: "0", usdc: "0" },
  };
}

/**
 * Increment pool statistics
 */
async function incrementPoolStats(
  action: "deposit" | "claim",
  amount: string,
  asset: PoolAsset
): Promise<void> {
  const stats = await getPoolStats();
  
  if (action === "deposit") {
    stats.totalDeposits++;
    stats.pendingClaims++;
    
    // Add to volume
    const current = BigInt(stats.totalVolume[asset] || "0");
    const added = BigInt(Math.floor(parseFloat(amount) * (asset === "sol" ? 1e9 : 1e6)));
    stats.totalVolume[asset] = (current + added).toString();
  } else {
    stats.totalClaims++;
    stats.pendingClaims = Math.max(0, stats.pendingClaims - 1);
  }
  
  await kv.set(STATS_KEY, stats);
}

/**
 * Get pool keypair from environment
 * Pool keypair should be stored as base58 secret key in DARKPOOL_KEYPAIR env var
 */
export function getPoolKeypairBase58(): string | null {
  return process.env.DARKPOOL_KEYPAIR || null;
}

/**
 * Check if pool is configured
 */
export function isPoolConfigured(): boolean {
  // Check for required env vars
  // Support both Vercel KV names and Upstash names
  const hasKeypair = !!process.env.DARKPOOL_KEYPAIR;
  const hasKV = !!(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  );
  
  return hasKeypair && hasKV;
}

