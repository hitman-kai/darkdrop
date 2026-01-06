import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";

const encoder = new TextEncoder();

/**
 * Generate a nullifier from a recipient keypair's secret key
 * Nullifier = SHA256(secretKey + "darkdrop_nullifier")
 * This creates a unique identifier that prevents double-spending without revealing the drop
 */
export function generateNullifier(recipientKeypair: Keypair): string {
  const secretKey = recipientKeypair.secretKey;
  const prefix = encoder.encode("darkdrop_nullifier");
  const combined = new Uint8Array(secretKey.length + prefix.length);
  combined.set(prefix, 0);
  combined.set(secretKey, prefix.length);
  
  const hash = nacl.hash(combined);
  return bs58.encode(hash);
}

/**
 * Generate nullifier from secret key bytes (for encrypted drops)
 */
export function generateNullifierFromSecret(secretKey: Uint8Array): string {
  const prefix = encoder.encode("darkdrop_nullifier");
  const combined = new Uint8Array(secretKey.length + prefix.length);
  combined.set(prefix, 0);
  combined.set(secretKey, prefix.length);
  
  const hash = nacl.hash(combined);
  return bs58.encode(hash);
}

/**
 * Nullifier registry interface
 * Can be implemented as:
 * - Off-chain API/database (current)
 * - On-chain PDA account (future upgrade)
 * - Merkle tree (advanced)
 */
export interface NullifierRegistry {
  /**
   * Check if a nullifier has been used
   */
  isUsed(nullifier: string): Promise<boolean>;
  
  /**
   * Mark a nullifier as used
   */
  markUsed(nullifier: string, signature?: string): Promise<void>;
  
  /**
   * Batch check multiple nullifiers
   */
  areUsed(nullifiers: string[]): Promise<boolean[]>;
}

/**
 * Simple in-memory nullifier registry (for development/testing)
 * In production, replace with API call or on-chain PDA
 */
class InMemoryNullifierRegistry implements NullifierRegistry {
  private usedNullifiers = new Set<string>();
  
  async isUsed(nullifier: string): Promise<boolean> {
    return this.usedNullifiers.has(nullifier);
  }
  
  async markUsed(nullifier: string, signature?: string): Promise<void> {
    this.usedNullifiers.add(nullifier);
    console.log(`[Nullifier] Marked nullifier as used: ${nullifier.substring(0, 16)}... (tx: ${signature?.substring(0, 16)}...)`);
  }
  
  async areUsed(nullifiers: string[]): Promise<boolean[]> {
    return nullifiers.map(n => this.usedNullifiers.has(n));
  }
}

/**
 * API-based nullifier registry (for production)
 * Calls backend API to check/mark nullifiers
 */
class ApiNullifierRegistry implements NullifierRegistry {
  private apiUrl: string;
  
  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || process.env.NEXT_PUBLIC_NULLIFIER_API_URL || "/api/nullifier";
  }
  
  async isUsed(nullifier: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/check/${nullifier}`);
      if (!response.ok) {
        console.warn(`[Nullifier] API check failed, assuming unused: ${response.statusText}`);
        return false; // Fail open - allow claim if API is down
      }
      const data = await response.json();
      return data.used === true;
    } catch (error) {
      console.error("[Nullifier] API check error:", error);
      return false; // Fail open - allow claim if API is down
    }
  }
  
  async markUsed(nullifier: string, signature?: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nullifier, signature }),
      });
      if (!response.ok) {
        console.error(`[Nullifier] Failed to mark nullifier as used: ${response.statusText}`);
        // Don't throw - nullifier marking is best-effort
      } else {
        console.log(`[Nullifier] Marked nullifier as used: ${nullifier.substring(0, 16)}...`);
      }
    } catch (error) {
      console.error("[Nullifier] API mark error:", error);
      // Don't throw - nullifier marking is best-effort
    }
  }
  
  async areUsed(nullifiers: string[]): Promise<boolean[]> {
    try {
      const response = await fetch(`${this.apiUrl}/check-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nullifiers }),
      });
      if (!response.ok) {
        console.warn(`[Nullifier] Batch API check failed: ${response.statusText}`);
        return new Array(nullifiers.length).fill(false); // Fail open
      }
      const data = await response.json();
      return data.used || new Array(nullifiers.length).fill(false);
    } catch (error) {
      console.error("[Nullifier] Batch API check error:", error);
      return new Array(nullifiers.length).fill(false); // Fail open
    }
  }
}

// Singleton registry instance
let registryInstance: NullifierRegistry | null = null;

/**
 * Get the nullifier registry instance
 * Uses API if NEXT_PUBLIC_NULLIFIER_API_URL is set, otherwise in-memory
 */
export function getNullifierRegistry(): NullifierRegistry {
  if (!registryInstance) {
    const apiUrl = process.env.NEXT_PUBLIC_NULLIFIER_API_URL;
    if (apiUrl) {
      registryInstance = new ApiNullifierRegistry(apiUrl);
      console.log("[Nullifier] Using API registry:", apiUrl);
    } else {
      registryInstance = new InMemoryNullifierRegistry();
      console.log("[Nullifier] Using in-memory registry (development mode)");
    }
  }
  return registryInstance;
}

/**
 * Set a custom nullifier registry (for testing or custom implementations)
 */
export function setNullifierRegistry(registry: NullifierRegistry): void {
  registryInstance = registry;
}


