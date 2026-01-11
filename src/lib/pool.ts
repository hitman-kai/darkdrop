/**
 * DarkPool - Shielded Mixing Pool
 * 
 * Architecture:
 * 1. All deposits compress funds into a single shared pool
 * 2. Each deposit generates a unique secret + nullifier
 * 3. Claims verify the secret, decompress from pool, mark nullifier used
 * 4. No on-chain link between deposit and claim
 */

import { Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";

const POOL_CODE_PREFIX = "darkpool";
const POOL_CODE_VERSION = "v1";

export type PoolAsset = "sol" | "usdc";

export type PoolDeposit = {
  id: string;
  nullifier: string;
  amount: string;
  asset: PoolAsset;
  createdAt: string;
  claimedAt: string | null;
  claimTx: string | null;
};

export type PoolClaimCode = {
  version: string;
  cluster: string;
  asset: PoolAsset;
  amount: string;
  secret: string;
};

/**
 * Generate a random secret for a pool deposit
 */
export function generatePoolSecret(): Uint8Array {
  return nacl.randomBytes(32);
}

/**
 * Derive nullifier from secret
 * nullifier = hash(secret)
 */
export function deriveNullifier(secret: Uint8Array): string {
  const hash = nacl.hash(secret);
  return bs58.encode(hash.slice(0, 32));
}

/**
 * Encode a pool claim code
 * Format: darkpool:v1:cluster:asset:amount:secret
 */
export function encodePoolClaimCode(
  cluster: string,
  asset: PoolAsset,
  amount: string,
  secret: Uint8Array
): string {
  const secretB58 = bs58.encode(secret);
  return `${POOL_CODE_PREFIX}:${POOL_CODE_VERSION}:${cluster}:${asset}:${amount}:${secretB58}`;
}

/**
 * Decode a pool claim code
 */
export function decodePoolClaimCode(code: string): PoolClaimCode {
  const parts = code.trim().split(":");
  
  if (parts.length !== 6) {
    throw new Error("Invalid pool claim code format");
  }
  
  const [prefix, version, cluster, asset, amount, secretB58] = parts;
  
  if (prefix !== POOL_CODE_PREFIX) {
    throw new Error("Not a pool claim code");
  }
  
  if (version !== POOL_CODE_VERSION) {
    throw new Error(`Unsupported pool code version: ${version}`);
  }
  
  if (asset !== "sol" && asset !== "usdc") {
    throw new Error(`Invalid asset: ${asset}`);
  }
  
  return {
    version,
    cluster,
    asset,
    amount,
    secret: secretB58,
  };
}

/**
 * Verify a claim code and extract nullifier
 */
export function verifyPoolClaimCode(code: string): { nullifier: string; amount: string; asset: PoolAsset } {
  const decoded = decodePoolClaimCode(code);
  const secret = bs58.decode(decoded.secret);
  const nullifier = deriveNullifier(secret);
  
  return {
    nullifier,
    amount: decoded.amount,
    asset: decoded.asset,
  };
}

/**
 * Pool configuration
 */
export const POOL_CONFIG = {
  // Fee percentage (1% = 100 basis points)
  FEE_BPS: 100,
  
  // Supported denominations
  DENOMINATIONS: {
    sol: ["0.1", "0.5", "1", "10"],
    usdc: ["1", "5", "10", "100"],
  },
  
  // Minimum pool balance to accept claims
  MIN_POOL_BALANCE_SOL: 0.01,
  MIN_POOL_BALANCE_USDC: 1,
};

/**
 * Calculate fee for a claim
 */
export function calculatePoolFee(amount: string, asset: PoolAsset): { fee: string; net: string } {
  const amountNum = parseFloat(amount);
  const feeNum = amountNum * (POOL_CONFIG.FEE_BPS / 10000);
  const netNum = amountNum - feeNum;
  
  const decimals = asset === "sol" ? 9 : 6;
  const fee = feeNum.toFixed(decimals);
  const net = netNum.toFixed(decimals);
  
  return { fee, net };
}

