"use client";

import type { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
  buildConfigureAccountInstruction,
  buildEnableCreditsInstruction,
  buildZeroCiphertextProofInstruction,
  buildConfidentialTransferInstruction as buildCTTransferInstruction,
} from "./ct-instructions";
import { bytesFromBase64 } from "@/lib/base64";

const CONFIGURE_INLINE_PROOF_OFFSET = -1;

/**
 * Build the configure + approve + enable instruction sequence for a Token-2022
 * confidential-transfer account.
 * 
 * NOTE: This requires:
 * 1. WASM proof for zero-balance (from generate_configure_account_proof)
 * 2. Mint authority keypair for approve instruction
 * 3. @solana-program/token-2022 SDK (already installed)
 */
export async function buildConfidentialAccountInstructions(params: {
  connection: Connection;
  mint: PublicKey;
  owner: PublicKey;
  accountAddress: PublicKey;
  zeroBalanceProof?: string | Uint8Array;
  decryptableZeroBalance?: string | Uint8Array;
  zeroBalanceProofContext?: PublicKey;
}): Promise<{ instructions: TransactionInstruction[]; notes: string[] }> {
  const notes: string[] = [];
  const instructions: TransactionInstruction[] = [];

  try {
    const requiresInlineProof = !params.zeroBalanceProofContext;
    const zeroProofBytes = requiresInlineProof ? normalizeBytes(params.zeroBalanceProof) : null;
    const decryptableZeroBytes = normalizeBytes(params.decryptableZeroBalance);

    if (!decryptableZeroBytes) {
      notes.push("Missing decryptable zero balance - generate via WASM first.");
      return { instructions: [], notes };
    }

    if (requiresInlineProof && !zeroProofBytes) {
      notes.push("Missing zero-balance proof - generate via WASM first");
      notes.push("Call generate_configure_account_proof() to get proof data");
      return { instructions: [], notes };
    }

    if (requiresInlineProof && zeroProofBytes) {
      instructions.push(buildZeroCiphertextProofInstruction(zeroProofBytes));
    }

    instructions.push(
      buildConfigureAccountInstruction(params.accountAddress, params.mint, params.owner, decryptableZeroBytes, {
        proofInstructionOffset: requiresInlineProof ? CONFIGURE_INLINE_PROOF_OFFSET : 0,
        proofContext: params.zeroBalanceProofContext,
      })
    );

    instructions.push(buildEnableCreditsInstruction(params.accountAddress, params.owner));

    if (params.zeroBalanceProofContext) {
      notes.push(`✓ Zero-ciphertext proof pre-verified via context ${params.zeroBalanceProofContext.toBase58()}`);
    } else {
      notes.push("✓ Added inline zero-ciphertext proof instruction");
    }
    notes.push("✓ Built ConfigureConfidentialTransferAccount instruction");
    notes.push("✓ Built EnableConfidentialCredits instruction");
    notes.push("Account initialization ready for transaction");

    return { instructions, notes };
  } catch (error) {
    notes.push("Failed to build CT account instructions:");
    notes.push(error instanceof Error ? error.message : "Unknown error");
    return { instructions: [], notes };
  }
}

/**
 * Build the confidential transfer instruction for a Token-2022 transfer.
 * 
 * NOTE: This requires:
 * 1. WASM proofs (equality, validity, range) from generate_transfer_proof
 * 2. ElGamal encrypted ciphertexts
 * 3. @solana-program/token-2022 ConfidentialTransfer instruction
 */
export async function buildConfidentialTransferInstruction(params: {
  connection: Connection;
  mint: PublicKey;
  from: PublicKey;
  to: PublicKey;
  owner: PublicKey;
  amount: bigint;
  proofData?: {
    equalityProof: string;
    validityProof: string;
    rangeProof: string;
    newSourceBalance: string;
    senderElGamalKeypair: string;
    newSourceDecryptableBalance?: string;
    transferAuditorCiphertextLo?: string;
    transferAuditorCiphertextHi?: string;
  };
  proofContexts?: {
    equality?: PublicKey;
    validity?: PublicKey;
    range?: PublicKey;
  };
}): Promise<{ instructions: TransactionInstruction[]; notes: string[] }> {
  const notes: string[] = [];

  if (!params.proofData) {
    notes.push("No proof data provided - generate proofs first via WASM module");
    notes.push("Call generateConfidentialProof() to get proof data");
    return { instructions: [], notes };
  }

  try {
    if (
      !params.proofData.newSourceDecryptableBalance ||
      !params.proofData.transferAuditorCiphertextLo ||
      !params.proofData.transferAuditorCiphertextHi
    ) {
      throw new Error("Proof metadata missing decryptable balance or auditor ciphertexts.");
    }

    if (
      !params.proofContexts?.equality ||
      !params.proofContexts?.validity ||
      !params.proofContexts?.range
    ) {
      throw new Error("Proof contexts missing. Upload proofs via helper before building the transfer.");
    }

    const decryptableBalance = bytesFromBase64(params.proofData.newSourceDecryptableBalance);
    const auditorCiphertextLo = bytesFromBase64(params.proofData.transferAuditorCiphertextLo);
    const auditorCiphertextHi = bytesFromBase64(params.proofData.transferAuditorCiphertextHi);

    const instruction = buildCTTransferInstruction({
      sourceAccount: params.from,
      mint: params.mint,
      destinationAccount: params.to,
      owner: params.owner,
      newSourceDecryptableBalance: decryptableBalance,
      auditorCiphertextLo,
      auditorCiphertextHi,
      proofContexts: params.proofContexts,
    });

    notes.push("✓ Built ConfidentialTransfer instruction referencing proof context accounts.");
    return { instructions: [instruction], notes };
  } catch (error) {
    console.error("[Instructions] Error building CT transfer:", error);
    notes.push("Failed to build CT transfer instructions:");
    notes.push(error instanceof Error ? error.message : "Unknown error");
    if (error instanceof Error && error.stack) {
      console.error("[Instructions] Stack:", error.stack);
    }
    return { instructions: [], notes };
  }
}

function normalizeBytes(value?: string | Uint8Array): Uint8Array | null {
  if (!value) return null;
  if (value instanceof Uint8Array) {
    return value;
  }
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
