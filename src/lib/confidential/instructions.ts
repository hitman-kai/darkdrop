"use client";

import type { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";

/**
 * Build the configure + approve + enable instruction sequence for a Token-2022
 * confidential-transfer account. This is a stub until we integrate the real
 * @solana-program/token-2022 SDK or equivalent CT instruction builders.
 *
 * For now, we return an empty array and surface notes explaining what's missing.
 */
export async function buildConfidentialAccountInstructions(params: {
  connection: Connection;
  mint: PublicKey;
  owner: PublicKey;
  accountAddress: PublicKey;
}): Promise<{ instructions: TransactionInstruction[]; notes: string[] }> {
  void params.connection;
  void params.mint;
  void params.owner;
  void params.accountAddress;

  const notes: string[] = [
    "Confidential account initialization requires three steps:",
    "1. ConfigureConfidentialTransferAccount - sets up ZK proof state (decryptableZeroBalance, max pending counter, proof offset).",
    "2. ApproveConfidentialTransferAccount - mint authority signs off on the account's CT readiness.",
    "3. EnableConfidentialCredits - owner enables receiving confidential deposits.",
    "These instructions need the @solana-program/token-2022 SDK or manual construction with AccountRole + encoders.",
    "Placeholder: will return empty array until SDK is wired.",
  ];

  return { instructions: [], notes };
}

/**
 * Build the confidential transfer instruction for a Token-2022 transfer.
 * This requires the decryptable balance proof + ciphertext from the proof worker.
 *
 * For now, we return an empty array and surface notes explaining what's missing.
 */
export async function buildConfidentialTransferInstruction(params: {
  connection: Connection;
  mint: PublicKey;
  from: PublicKey;
  to: PublicKey;
  owner: PublicKey;
  amount: bigint;
  proofData?: {
    decryptableBalance: Uint8Array;
    ciphertext: Uint8Array;
  };
}): Promise<{ instructions: TransactionInstruction[]; notes: string[] }> {
  void params.connection;
  void params.mint;
  void params.from;
  void params.to;
  void params.owner;
  void params.amount;
  void params.proofData;

  const notes: string[] = [
    "Confidential transfer instruction requires:",
    "1. Proof worker output: decryptableBalance (ElGamal ciphertext of new source balance) + newSourceDecryptableAvailableBalance.",
    "2. ConfidentialTransfer instruction with accounts: source ATA, destination ATA, mint, owner (signer).",
    "3. Attach proof data to instruction.data (via encoder from @solana-program/token-2022).",
    "Placeholder: will return empty array until proof + SDK are wired.",
  ];

  return { instructions: [], notes };
}

