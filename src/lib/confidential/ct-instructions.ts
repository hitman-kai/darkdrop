"use client";

import { PublicKey, TransactionInstruction, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";

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

const AE_CIPHERTEXT_LEN = 36;
const ELGAMAL_CIPHERTEXT_LEN = 64;

const ZERO_PROOF_OFFSET = -1;

function copyBytes(target: Uint8Array, source: Uint8Array, expected: number, label: string, offset = 0) {
  if (source.length < expected) {
    throw new Error(`${label} must be at least ${expected} bytes (received ${source.length}).`);
  }
  target.set(source.slice(0, expected), offset);
}

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
  decryptableZeroBalance: Uint8Array,
  options?: {
    maxPendingBalanceCreditCounter?: bigint;
    proofInstructionOffset?: number;
    proofContext?: PublicKey;
  }
): TransactionInstruction {
  const maxPending = options?.maxPendingBalanceCreditCounter ?? BigInt(64);
  const proofInstructionOffset = options?.proofInstructionOffset ?? ZERO_PROOF_OFFSET;
  const proofAccount = options?.proofContext ?? SYSVAR_INSTRUCTIONS_PUBKEY;

  const data = new Uint8Array(2 + AE_CIPHERTEXT_LEN + 8 + 1);
  data[0] = CT_INSTRUCTION_TYPES.ConfigureAccount;
  data[1] = CT_INSTRUCTION_TYPES.ConfigureAccountSubtype;
  copyBytes(data, decryptableZeroBalance, AE_CIPHERTEXT_LEN, "Decryptable zero balance", 2);

  const countersView = new DataView(data.buffer, 2 + AE_CIPHERTEXT_LEN, 8);
  countersView.setBigUint64(0, maxPending, true);
  new DataView(data.buffer, 2 + AE_CIPHERTEXT_LEN + 8, 1).setInt8(0, proofInstructionOffset);

  return new TransactionInstruction({
    keys: [
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: proofAccount, isSigner: false, isWritable: false },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  });
}

export function buildZeroCiphertextProofInstruction(proofData: Uint8Array): TransactionInstruction {
  return createProofInstruction(PROOF_INSTRUCTION_TYPES.ZeroCiphertext, proofData);
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

type ProofContextMap = {
  equality?: PublicKey;
  validity?: PublicKey;
  range?: PublicKey;
};

type ProofOffsetMap = {
  equality?: number;
  validity?: number;
  range?: number;
};

const DEFAULT_PROOF_OFFSETS: Required<ProofOffsetMap> = {
  equality: -3,
  validity: -2,
  range: -1,
};

function getProofOffset(
  contexts: ProofContextMap | undefined,
  offsets: ProofOffsetMap | undefined,
  kind: keyof ProofOffsetMap
) {
  const hasContext = Boolean(contexts?.[kind]);
  if (hasContext) {
    return 0;
  }
  return offsets?.[kind] ?? DEFAULT_PROOF_OFFSETS[kind];
}

/**
 * Build a Token-2022 ConfidentialTransfer instruction.
 * Supports either inline proof verification (negative proof offsets) or proof context
 * accounts (offset 0 + context pubkeys appended to the account metas).
 */
export function buildConfidentialTransferInstruction(params: {
  sourceAccount: PublicKey;
  mint: PublicKey;
  destinationAccount: PublicKey;
  owner: PublicKey;
  newSourceDecryptableBalance: Uint8Array;
  auditorCiphertextLo: Uint8Array;
  auditorCiphertextHi: Uint8Array;
  proofContexts?: ProofContextMap;
  proofInstructionOffsets?: ProofOffsetMap;
}): TransactionInstruction {
  const equalityOffset = getProofOffset(params.proofContexts, params.proofInstructionOffsets, "equality");
  const validityOffset = getProofOffset(params.proofContexts, params.proofInstructionOffsets, "validity");
  const rangeOffset = getProofOffset(params.proofContexts, params.proofInstructionOffsets, "range");

  const accounts = [
    { pubkey: params.sourceAccount, isSigner: false, isWritable: true },
    { pubkey: params.mint, isSigner: false, isWritable: false },
    { pubkey: params.destinationAccount, isSigner: false, isWritable: true },
  ];

  const needsSysvar = [equalityOffset, validityOffset, rangeOffset].some((offset) => offset !== 0);
  if (needsSysvar) {
    accounts.push({ pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false });
  }

  const maybePushContext = (pubkey?: PublicKey) => {
    if (pubkey) {
      accounts.push({ pubkey, isSigner: false, isWritable: false });
    }
  };

  maybePushContext(params.proofContexts?.equality);
  maybePushContext(params.proofContexts?.validity);
  maybePushContext(params.proofContexts?.range);

  accounts.push({ pubkey: params.owner, isSigner: true, isWritable: false });

  const data = new Uint8Array(2 + AE_CIPHERTEXT_LEN + ELGAMAL_CIPHERTEXT_LEN * 2 + 3);
  data[0] = CT_INSTRUCTION_TYPES.Transfer;
  data[1] = CT_INSTRUCTION_TYPES.TransferSubtype;
  copyBytes(data, params.newSourceDecryptableBalance, AE_CIPHERTEXT_LEN, "New decryptable balance", 2);
  copyBytes(
    data,
    params.auditorCiphertextLo,
    ELGAMAL_CIPHERTEXT_LEN,
    "Auditor ciphertext (lo)",
    2 + AE_CIPHERTEXT_LEN
  );
  copyBytes(
    data,
    params.auditorCiphertextHi,
    ELGAMAL_CIPHERTEXT_LEN,
    "Auditor ciphertext (hi)",
    2 + AE_CIPHERTEXT_LEN + ELGAMAL_CIPHERTEXT_LEN
  );

  const offsetsStart = 2 + AE_CIPHERTEXT_LEN + ELGAMAL_CIPHERTEXT_LEN * 2;
  const offsetView = new DataView(data.buffer, offsetsStart, 3);
  offsetView.setInt8(0, equalityOffset);
  offsetView.setInt8(1, validityOffset);
  offsetView.setInt8(2, rangeOffset);

  return new TransactionInstruction({
    keys: accounts,
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  });
}

