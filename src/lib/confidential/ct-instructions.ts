"use client";

import { PublicKey, TransactionInstruction, SystemProgram, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
import { serialize } from "borsh";

/**
 * Token-2022 Program ID
 */
export const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

/**
 * ZK ElGamal Proof Program ID
 */
export const ZK_ELGAMAL_PROOF_PROGRAM_ID = new PublicKey("ZkE1Gama1Proof11111111111111111111111111111");

/**
 * Proof instruction discriminators (from solana-zk-sdk)
 */
const PROOF_INSTRUCTION_TYPES = {
  ZeroCiphertext: 0,
  CiphertextCommitmentEquality: 1,
  BatchedRangeProofU128: 2,
  BatchedGroupedCiphertext3HandlesValidity: 3,
};

/**
 * Token-2022 CT instruction discriminators
 */
const CT_INSTRUCTION_TYPES = {
  ConfigureAccount: 27, // Main discriminator
  ConfigureAccountSubtype: 2, // CT extension discriminator
  ApproveAccount: 27,
  ApproveAccountSubtype: 3,
  EnableCredits: 27,
  EnableCreditsSubtype: 9,
  Transfer: 27,
  TransferSubtype: 4,
};

/**
 * Create proof verification instruction
 */
function createProofInstruction(
  proofType: number,
  proofData: Uint8Array,
  contextStateAccount?: PublicKey
): TransactionInstruction {
  const data = Buffer.concat([Buffer.from([proofType]), Buffer.from(proofData)]);

  return new TransactionInstruction({
    keys: contextStateAccount
      ? [{ pubkey: contextStateAccount, isSigner: false, isWritable: true }]
      : [],
    programId: ZK_ELGAMAL_PROOF_PROGRAM_ID,
    data,
  });
}

/**
 * Build ConfigureConfidentialTransferAccount instruction
 */
export function buildConfigureAccountInstruction(
  tokenAccount: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  zeroBalanceProof: Uint8Array,
  elGamalPubkey: Uint8Array
): TransactionInstruction {
  // Instruction data: [discriminator(1), subtype(1), decryptableZeroBalance(64), maxPendingCounter(8), proofOffset(1)]
  const data = Buffer.concat([
    Buffer.from([CT_INSTRUCTION_TYPES.ConfigureAccount]),
    Buffer.from([CT_INSTRUCTION_TYPES.ConfigureAccountSubtype]),
    Buffer.from(elGamalPubkey), // decryptableZeroBalance (should be encrypted zero)
    Buffer.alloc(8, 0), // maxPendingCounter (default to 0 for now)
    Buffer.from([0]), // proofInstructionOffset (0 = use context state)
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // record account (optional)
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  });
}

/**
 * Build ApproveConfidentialTransferAccount instruction
 * NOTE: Requires mint authority signature!
 */
export function buildApproveAccountInstruction(
  tokenAccount: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey
): TransactionInstruction {
  const data = Buffer.from([
    CT_INSTRUCTION_TYPES.ApproveAccount,
    CT_INSTRUCTION_TYPES.ApproveAccountSubtype,
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: mintAuthority, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  });
}

/**
 * Build EnableConfidentialCredits instruction
 */
export function buildEnableCreditsInstruction(tokenAccount: PublicKey, owner: PublicKey): TransactionInstruction {
  const data = Buffer.from([CT_INSTRUCTION_TYPES.EnableCredits, CT_INSTRUCTION_TYPES.EnableCreditsSubtype]);

  return new TransactionInstruction({
    keys: [
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  });
}

/**
 * Build ConfidentialTransfer instruction
 * Note: This uses the standard transferChecked instruction for now
 * TODO: Implement full CT transfer once instruction format is validated
 */
export function buildConfidentialTransferInstruction(
  sourceAccount: PublicKey,
  mint: PublicKey,
  destinationAccount: PublicKey,
  owner: PublicKey,
  amount: bigint,
  decimals: number
): TransactionInstruction {
  // For now, use standard transferChecked (instruction 12)
  // This lets us test the transaction flow while CT encoding is being finalized
  
  // Create instruction data using DataView for proper byte writing
  const data = new Uint8Array(10);
  data[0] = 12; // transferChecked discriminator
  
  // Write amount as little-endian u64 using DataView
  const view = new DataView(data.buffer);
  view.setBigUint64(1, amount, true); // true = little-endian
  
  // Write decimals
  data[9] = decimals;

  return new TransactionInstruction({
    keys: [
      { pubkey: sourceAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: destinationAccount, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  });
}

/**
 * Build CT transfer using standard transfer for now
 * TODO: Add proof verification instructions once CT instruction format is validated
 */
export function buildCTTransferWithProofs(
  sourceAccount: PublicKey,
  mint: PublicKey,
  destinationAccount: PublicKey,
  owner: PublicKey,
  amount: bigint,
  decimals: number
): TransactionInstruction[] {
  // For now, use standard transferChecked
  // Proofs are generated and available, but CT instruction encoding needs refinement
  return [
    buildConfidentialTransferInstruction(
      sourceAccount,
      mint,
      destinationAccount,
      owner,
      amount,
      decimals
    ),
  ];
}

