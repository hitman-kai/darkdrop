"use client";

import type { Keypair } from "@solana/web3.js";

/**
 * Derive a deterministic 256-bit AES key from a burner keypair.
 * Uses the first 32 bytes of the secret key, which are recoverable from the claim code.
 */
export function deriveAESKey(burnerKeypair: Keypair): Uint8Array {
  return burnerKeypair.secretKey.slice(0, 32);
}

