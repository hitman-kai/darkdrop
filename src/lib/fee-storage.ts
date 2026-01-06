// Fee storage for relayer keypairs
// In production, use a proper database. For now, use in-memory + file storage.

import fs from "fs";
import path from "path";

const FEE_STORAGE_FILE = path.join(process.cwd(), ".relayer-fees.json");

interface StoredFee {
  recipientPubkey: string;
  recipientSecretKey: number[]; // Uint8Array as number[]
  asset: "SOL" | "USDC";
  expectedFee: string; // lamports or atomic units
  claimSignature: string;
  timestamp: number;
  swept: boolean;
}

interface FeeStorage {
  fees: StoredFee[];
}

// Load storage from file
function loadStorage(): FeeStorage {
  try {
    if (fs.existsSync(FEE_STORAGE_FILE)) {
      const data = fs.readFileSync(FEE_STORAGE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("[FeeStorage] Error loading:", e);
  }
  return { fees: [] };
}

// Save storage to file
function saveStorage(storage: FeeStorage): void {
  try {
    fs.writeFileSync(FEE_STORAGE_FILE, JSON.stringify(storage, null, 2));
  } catch (e) {
    console.error("[FeeStorage] Error saving:", e);
  }
}

// Store a fee record after relayed claim
export function storeFeeRecord(
  recipientSecretKey: Uint8Array,
  recipientPubkey: string,
  asset: "SOL" | "USDC",
  expectedFee: bigint,
  claimSignature: string
): void {
  const storage = loadStorage();
  
  storage.fees.push({
    recipientPubkey,
    recipientSecretKey: Array.from(recipientSecretKey),
    asset,
    expectedFee: expectedFee.toString(),
    claimSignature,
    timestamp: Date.now(),
    swept: false,
  });
  
  saveStorage(storage);
  console.log("[FeeStorage] Stored fee record for", recipientPubkey, "-", asset, expectedFee.toString());
}

// Get all unswept fee records
export function getUnsweptFees(): StoredFee[] {
  const storage = loadStorage();
  return storage.fees.filter(f => !f.swept);
}

// Mark fees as swept
export function markFeesSwept(pubkeys: string[]): void {
  const storage = loadStorage();
  
  for (const fee of storage.fees) {
    if (pubkeys.includes(fee.recipientPubkey)) {
      fee.swept = true;
    }
  }
  
  saveStorage(storage);
}

// Get fee statistics (returns strings for JSON serialization)
export function getFeeStats(): { 
  totalPending: { sol: string; usdc: string };
  totalSwept: { sol: string; usdc: string };
  pendingCount: number;
  sweptCount: number;
} {
  const storage = loadStorage();
  
  let pendingSol = BigInt(0);
  let pendingUsdc = BigInt(0);
  let sweptSol = BigInt(0);
  let sweptUsdc = BigInt(0);
  let pendingCount = 0;
  let sweptCount = 0;
  
  for (const fee of storage.fees) {
    const amount = BigInt(fee.expectedFee);
    if (fee.swept) {
      sweptCount++;
      if (fee.asset === "SOL") sweptSol += amount;
      else sweptUsdc += amount;
    } else {
      pendingCount++;
      if (fee.asset === "SOL") pendingSol += amount;
      else pendingUsdc += amount;
    }
  }
  
  return {
    totalPending: { sol: pendingSol.toString(), usdc: pendingUsdc.toString() },
    totalSwept: { sol: sweptSol.toString(), usdc: sweptUsdc.toString() },
    pendingCount,
    sweptCount,
  };
}

