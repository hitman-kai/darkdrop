import { PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import bs58 from "bs58";
import nacl from "tweetnacl";

const encoder = new TextEncoder();

// Program ID (update after deployment)
export const NULLIFIER_REGISTRY_PROGRAM_ID = new PublicKey(
  "11111111111111111111111111111111" // Placeholder - replace with actual program ID after deployment
);

/**
 * Derive nullifier PDA from nullifier hash
 */
export function deriveNullifierPDA(
  programId: PublicKey,
  nullifier: string
): [PublicKey, number] {
  const nullifierBytes = bs58.decode(nullifier);
  if (nullifierBytes.length !== 32) {
    throw new Error("Nullifier must be 32 bytes");
  }
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from("nullifier"), nullifierBytes],
    programId
  );
}

/**
 * Create instruction to mark nullifier as used (on-chain)
 */
export function createMarkNullifierUsedInstruction(
  programId: PublicKey,
  nullifier: string,
  claimer: PublicKey,
  signature?: string
): TransactionInstruction {
  const nullifierBytes = bs58.decode(nullifier);
  if (nullifierBytes.length !== 32) {
    throw new Error("Nullifier must be 32 bytes");
  }
  
  const nullifierArray = new Uint8Array(32);
  nullifierArray.set(nullifierBytes);
  
  const [nullifierPDA] = deriveNullifierPDA(programId, nullifier);
  
  // Create instruction data manually (since we don't have IDL yet)
  // Format: discriminator (8 bytes) + nullifier (32 bytes) + signature (optional string)
  const discriminator = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]); // Placeholder
  
  const data = Buffer.alloc(8 + 32 + (signature ? 4 + signature.length : 0));
  data.set(discriminator, 0);
  data.set(nullifierArray, 8);
  
  if (signature) {
    const sigBuffer = Buffer.from(signature, "utf8");
    data.writeUInt32LE(sigBuffer.length, 40);
    data.set(sigBuffer, 44);
  }
  
  return new TransactionInstruction({
    programId,
    keys: [
      {
        pubkey: nullifierPDA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: claimer,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    data,
  });
}

/**
 * Create instruction to verify nullifier is unused (read-only check)
 */
export function createVerifyNullifierUnusedInstruction(
  programId: PublicKey,
  nullifier: string
): TransactionInstruction {
  const nullifierBytes = bs58.decode(nullifier);
  if (nullifierBytes.length !== 32) {
    throw new Error("Nullifier must be 32 bytes");
  }
  
  const [nullifierPDA] = deriveNullifierPDA(programId, nullifier);
  
  // Discriminator for verify_nullifier_unused
  const discriminator = Buffer.from([0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88]); // Placeholder
  
  return new TransactionInstruction({
    programId,
    keys: [
      {
        pubkey: nullifierPDA,
        isSigner: false,
        isWritable: false,
      },
    ],
    data: discriminator,
  });
}

/**
 * Check if nullifier account exists and is used (on-chain check)
 */
export async function checkNullifierOnChain(
  connection: any,
  programId: PublicKey,
  nullifier: string
): Promise<{ exists: boolean; isUsed: boolean }> {
  try {
    const [nullifierPDA] = deriveNullifierPDA(programId, nullifier);
    const accountInfo = await connection.getAccountInfo(nullifierPDA);
    
    if (!accountInfo) {
      return { exists: false, isUsed: false };
    }
    
    // Parse account data
    // Layout: discriminator (8) + nullifier (32) + is_used (1) + claimer (32) + used_at (8) + signature (64) + sig_len (1) + bump (1)
    const data = accountInfo.data;
    const isUsed = data[8 + 32] === 1; // is_used is at offset 40
    
    return { exists: true, isUsed };
  } catch (error) {
    console.error("[Nullifier On-Chain] Error checking nullifier:", error);
    return { exists: false, isUsed: false };
  }
}


