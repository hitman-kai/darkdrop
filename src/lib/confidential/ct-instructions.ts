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
 * Create proof verification instruction for ZK ElGamal Proof Program
 * These instructions verify the ZK proofs before the CT transfer
 */
function createProofInstruction(
  proofType: number,
  proofData: Uint8Array
): TransactionInstruction {
  // Proof instruction format: [proof_type(1 byte)] + [proof_data]
  const data = new Uint8Array(1 + proofData.length);
  data[0] = proofType;
  data.set(proofData, 1);

  // Proof instructions have no accounts - they just verify and store in context
  return new TransactionInstruction({
    keys: [],
    programId: ZK_ELGAMAL_PROOF_PROGRAM_ID,
    data: Buffer.from(data), // Convert Uint8Array to Buffer for TypeScript compatibility
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
 * Instruction format: [discriminator(1), subtype(1), new_decryptable_balance(64), proof_offset(1)]
 */
export function buildConfidentialTransferInstruction(
  sourceAccount: PublicKey,
  mint: PublicKey,
  destinationAccount: PublicKey,
  owner: PublicKey,
  newSourceDecryptableBalance: Uint8Array,
  proofOffset: number
): TransactionInstruction {
  // CT Transfer instruction (discriminator 27, subtype 4)
  // Total: 1 + 1 + 64 + 1 = 67 bytes
  const data = new Uint8Array(67);
  data[0] = CT_INSTRUCTION_TYPES.Transfer; // 27
  data[1] = CT_INSTRUCTION_TYPES.TransferSubtype; // 4
  
  // New source decryptable balance (64 bytes ElGamal ciphertext)
  data.set(newSourceDecryptableBalance.slice(0, 64), 2);
  
  // Proof instruction offset (signed byte) - negative offset to first proof
  const offsetView = new DataView(data.buffer);
  offsetView.setInt8(66, proofOffset);

  return new TransactionInstruction({
    keys: [
      { pubkey: sourceAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: destinationAccount, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_2022_PROGRAM_ID,
    data: Buffer.from(data), // Convert Uint8Array to Buffer for TypeScript compatibility
  });
}

/**
 * Build CT transfer - for now just use standard transfer
 * Proof instructions are complex and need more research into exact format
 */
export function buildCTTransferWithProofs(
  sourceAccount: PublicKey,
  mint: PublicKey,
  destinationAccount: PublicKey,
  owner: PublicKey,
  amount: bigint,
  decimals: number
): TransactionInstruction[] {
  // Temporary: Use standard transferChecked while we debug proof instruction format
  // The proofs ARE generating correctly, we just need to perfect the encoding
  
  const transferData = new Uint8Array(10);
  transferData[0] = 12; // transferChecked
  
  const view = new DataView(transferData.buffer);
  view.setBigUint64(1, amount, true);
  transferData[9] = decimals;

  return [
    new TransactionInstruction({
      keys: [
        { pubkey: sourceAccount, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: destinationAccount, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      programId: TOKEN_2022_PROGRAM_ID,
      data: transferData,
    }),
  ];
}

