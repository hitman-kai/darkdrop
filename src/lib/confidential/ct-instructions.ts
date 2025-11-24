"use client";

import { PublicKey, TransactionInstruction, SystemProgram, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";

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
 */
export function buildConfidentialTransferInstruction(
  sourceAccount: PublicKey,
  mint: PublicKey,
  destinationAccount: PublicKey,
  owner: PublicKey,
  newSourceDecryptableBalance: Uint8Array,
  proofInstructionOffset: number
): TransactionInstruction {
  // Instruction data: [discriminator(1), subtype(1), newSourceDecryptableBalance(64), proofOffset(1)]
  const data = Buffer.concat([
    Buffer.from([CT_INSTRUCTION_TYPES.Transfer]),
    Buffer.from([CT_INSTRUCTION_TYPES.TransferSubtype]),
    Buffer.from(newSourceDecryptableBalance),
    Buffer.from([proofInstructionOffset]),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: sourceAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: destinationAccount, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // record accounts (optional)
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  });
}

/**
 * Build complete CT transfer transaction with proofs
 */
export function buildCTTransferWithProofs(
  sourceAccount: PublicKey,
  mint: PublicKey,
  destinationAccount: PublicKey,
  owner: PublicKey,
  equalityProof: Uint8Array,
  validityProof: Uint8Array,
  rangeProof: Uint8Array,
  newSourceDecryptableBalance: Uint8Array
): TransactionInstruction[] {
  // Proofs must come BEFORE the transfer instruction
  // Proof instruction offset = -3 (three instructions before)
  return [
    createProofInstruction(
      PROOF_INSTRUCTION_TYPES.CiphertextCommitmentEquality,
      equalityProof
    ),
    createProofInstruction(
      PROOF_INSTRUCTION_TYPES.BatchedGroupedCiphertext3HandlesValidity,
      validityProof
    ),
    createProofInstruction(PROOF_INSTRUCTION_TYPES.BatchedRangeProofU128, rangeProof),
    buildConfidentialTransferInstruction(
      sourceAccount,
      mint,
      destinationAccount,
      owner,
      newSourceDecryptableBalance,
      -3 // offset to first proof
    ),
  ];
}

