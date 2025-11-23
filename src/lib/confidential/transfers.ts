"use client";

import type { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

import { ASSETS, AssetSymbol, getAssetMint } from "@/lib/tokens";

export type ConfidentialSupport = {
  asset: AssetSymbol;
  supported: boolean;
  reason?: string;
};

export type ConfidentialAccountPlan = {
  required: boolean;
  instructions: TransactionInstruction[];
  notes: string[];
};

export type ConfidentialTransferPlan = {
  instructions: TransactionInstruction[];
  requiresProofWorker: boolean;
  notes: string[];
};

type BuildContext = {
  connection: Connection;
  asset: AssetSymbol;
  owner: PublicKey;
  destination: PublicKey;
};

const NOT_IMPLEMENTED_NOTE =
  "Confidential transfer scaffolding placeholder — proof generation + instructions will be wired in Phase 2.";

export function getConfidentialSupport(asset: AssetSymbol): ConfidentialSupport {
  const meta = ASSETS[asset];
  if (meta.kind === "native") {
    return {
      asset,
      supported: false,
      reason: "Native SOL does not support Token-2022 confidential transfers.",
    };
  }
  if (meta.program !== "token-2022") {
    return {
      asset,
      supported: false,
      reason: "Mint is not using the Token-2022 program.",
    };
  }
  return { asset, supported: true };
}

export async function planConfidentialAccount({
  connection,
  asset,
}: BuildContext): Promise<ConfidentialAccountPlan> {
  void connection;
  const support = getConfidentialSupport(asset);
  if (!support.supported) {
    return { required: false, instructions: [], notes: [support.reason ?? "Unsupported asset."] };
  }

  return {
    required: true,
    instructions: [],
    notes: [
      "Account requires confidential-transfer approval.",
      NOT_IMPLEMENTED_NOTE,
      "Need: pending balance commitment, decryptable balance, approve instruction.",
    ],
  };
}

export async function planConfidentialTransfer({
  connection,
  asset,
  destination,
}: BuildContext): Promise<ConfidentialTransferPlan> {
  void connection;
  void destination;
  const support = getConfidentialSupport(asset);
  if (!support.supported) {
    return { instructions: [], requiresProofWorker: false, notes: [support.reason ?? "Unsupported asset."] };
  }

  const mint = getAssetMint(asset, "mainnet");
  return {
    instructions: [],
    requiresProofWorker: true,
    notes: [
      `Token-2022 mint (${mint ?? "unknown"}) uses program ${TOKEN_2022_PROGRAM_ID.toBase58()}.`,
      NOT_IMPLEMENTED_NOTE,
      "Need: decrypt source balance, build ciphertext, attach proof to transfer instruction.",
    ],
  };
}
