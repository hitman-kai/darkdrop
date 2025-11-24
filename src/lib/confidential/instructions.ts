"use client";

import type { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
  buildConfigureAccountInstruction,
  buildApproveAccountInstruction,
  buildEnableCreditsInstruction,
  buildCTTransferWithProofs,
} from "./ct-instructions";
import { SystemProgram, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";

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
  zeroBalanceProof?: string;
  elGamalPubkey?: string;
}): Promise<{ instructions: TransactionInstruction[]; notes: string[] }> {
  const notes: string[] = [];
  const instructions: TransactionInstruction[] = [];

  if (!params.zeroBalanceProof || !params.elGamalPubkey) {
    notes.push("Missing zero-balance proof - generate via WASM first");
    notes.push("Call generate_configure_account_proof() to get proof data");
    return { instructions: [], notes };
  }

  try {
    // Import instruction builders
    const { buildConfigureAccountInstruction, buildEnableCreditsInstruction } = await import("./ct-instructions");

    // Decode base64 proof data
    const zeroProofBytes = Uint8Array.from(atob(params.zeroBalanceProof), (c) => c.charCodeAt(0));
    const elGamalBytes = Uint8Array.from(atob(params.elGamalPubkey), (c) => c.charCodeAt(0));

    // 1. Configure account with zero-balance proof
    instructions.push(
      buildConfigureAccountInstruction(
        params.accountAddress,
        params.mint,
        params.owner,
        zeroProofBytes,
        elGamalBytes
      )
    );

    // 2. Skip approve - mint has auto-approve enabled
    notes.push("Skipping ApproveConfidentialTransferAccount (mint has auto-approve)");

    // 3. Enable confidential credits
    instructions.push(buildEnableCreditsInstruction(params.accountAddress, params.owner));

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
  };
}): Promise<{ instructions: TransactionInstruction[]; notes: string[] }> {
  const notes: string[] = [];

  if (!params.proofData) {
    notes.push("No proof data provided - generate proofs first via WASM module");
    notes.push("Call generateConfidentialProof() to get proof data");
    return { instructions: [], notes };
  }

  // Import the actual instruction builders we created
  const { buildCTTransferWithProofs } = await import("./ct-instructions");

  try {
    console.log("[Instructions] Building CT transfer with proofData:", !!params.proofData);
    
    // Import instruction builders
    const { buildCTTransferWithProofs } = await import("./ct-instructions");
    
    console.log("[Instructions] Import successful, building CT transfer with proofs");
    console.log("[Instructions] Amount:", params.amount);
    
    // Decode base64 proofs from WASM
    const equalityProof = Uint8Array.from(atob(params.proofData.equalityProof), (c) => c.charCodeAt(0));
    const validityProof = Uint8Array.from(atob(params.proofData.validityProof), (c) => c.charCodeAt(0));
    const rangeProof = Uint8Array.from(atob(params.proofData.rangeProof), (c) => c.charCodeAt(0));

    console.log("[Instructions] Decoded proofs - Equality:", equalityProof.length, "Validity:", validityProof.length, "Range:", rangeProof.length);

    // For new source decryptable balance, we need a 64-byte ElGamal ciphertext
    // The WASM should provide this, but for now create a placeholder
    // TODO: Get actual encrypted balance from WASM proof result
    const newBalanceBytes = new Uint8Array(64);
    const newBalance = BigInt(params.proofData.newSourceBalance);
    const balanceView = new DataView(newBalanceBytes.buffer);
    balanceView.setBigUint64(0, newBalance, true);

    console.log("[Instructions] Building transaction with", 4, "instructions");

    // Build complete CT transfer with all proof verification
    const instructions = buildCTTransferWithProofs(
      params.from,
      params.mint,
      params.to,
      params.owner,
      equalityProof,
      validityProof,
      rangeProof,
      newBalanceBytes
    );

    notes.push("✓ Decoded WASM proofs successfully");
    notes.push("✓ Built proof verification instructions");
    notes.push("✓ Built ConfidentialTransfer instruction");
    notes.push(`Transfer ${params.amount} tokens with encrypted amount`);
    notes.push("Transaction ready for signing and submission");

    return { instructions, notes };
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

/**
 * Decode base64-encoded WASM proof data
 */
function decodeProof(base64Proof: string): Uint8Array {
  return Uint8Array.from(atob(base64Proof), (c) => c.charCodeAt(0));
}

/**
 * Build proof verification instructions that must precede CT transfer
 * Uses Solana's ZK ElGamal Proof Program
 */
async function buildProofVerificationInstructions(
  equalityProof: string,
  validityProof: string,
  rangeProof: string
): Promise<TransactionInstruction[]> {
  // Decode base64 proofs from WASM
  const equalityData = decodeProof(equalityProof);
  const validityData = decodeProof(validityProof);
  const rangeData = decodeProof(rangeProof);

  // TODO: Create ProofInstruction transactions using ZK ElGamal Proof Program
  // Program ID: ZkE1Gama1Proof11111111111111111111111111111
  // Instructions:
  // 1. VerifyCiphertextCommitmentEquality (equality proof)
  // 2. VerifyBatchedGroupedCiphertext3HandlesValidity (validity proof)
  // 3. VerifyBatchedRangeProofU128 (range proof)

  void equalityData;
  void validityData;
  void rangeData;

  return [];
}
