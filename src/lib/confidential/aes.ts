"use client";

import type { Keypair } from "@solana/web3.js";

/**
 * Derive a deterministic 128-bit AES key from a burner keypair.
 * Token-2022 configure proof expects a 16-byte key (AE_KEY_LEN).
 */
export function deriveAESKey(burnerKeypair: Keypair): Uint8Array {
  return burnerKeypair.secretKey.slice(0, 16);
}

