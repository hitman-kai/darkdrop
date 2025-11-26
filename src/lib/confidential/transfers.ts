"use client";

import type { Connection, TransactionInstruction } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  getExtensionData,
  getExtensionTypes,
  unpackAccount,
  unpackMint,
} from "@solana/spl-token";

import { ASSETS, AssetSymbol, ClusterType, DEFAULT_CLUSTER, getAssetMint } from "@/lib/tokens";
import { buildConfidentialAccountInstructions, buildConfidentialTransferInstruction } from "./instructions";

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
  context?: {
    mint: MintInspection;
    source: AccountInspection;
    destination: AccountInspection;
  };
};

type BuildContext = {
  connection: Connection;
  asset: AssetSymbol;
  owner: PublicKey;
  destination: PublicKey;
  amount?: bigint;
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
  proofContextAccounts?: {
    equality?: PublicKey;
    validity?: PublicKey;
    range?: PublicKey;
  };
};

const DEFAULT_CONFIDENTIAL_CLUSTER: ClusterType = DEFAULT_CLUSTER;

type ConfidentialMintDetails = {
  authority?: string;
  auditorElgamalPubkey?: string;
  autoApproveNewAccounts: boolean;
};

type ConfidentialAccountDetails = {
  approved: boolean;
  elgamalPubkey?: string;
  pendingBalanceLo?: string;
  pendingBalanceHi?: string;
  availableBalance?: string;
  decryptableAvailableBalance?: string;
  allowConfidentialCredits: boolean;
  allowNonConfidentialCredits: boolean;
  pendingBalanceCreditCounter: bigint;
  maximumPendingBalanceCreditCounter: bigint;
  expectedPendingBalanceCreditCounter: bigint;
  actualPendingBalanceCreditCounter: bigint;
};

type MintInspection =
  | {
      address: PublicKey;
      found: true;
      hasConfidential: boolean;
      extensions: ExtensionType[];
      decimals: number;
      confidentialDetails?: ConfidentialMintDetails;
    }
  | {
      address: PublicKey;
      found: false;
      hasConfidential: false;
      extensions: ExtensionType[];
      decimals: number | null;
      confidentialDetails?: undefined;
    };

type AccountInspection =
  | {
      address: PublicKey;
      exists: true;
      hasConfidential: boolean;
      extensions: ExtensionType[];
      confidentialDetails?: ConfidentialAccountDetails;
    }
  | {
      address: PublicKey;
      exists: false;
      hasConfidential: false;
      extensions: ExtensionType[];
      confidentialDetails?: undefined;
    };

const bytesToBase64 = (value: Uint8Array) => Buffer.from(value).toString("base64");

function isZeroBytes(value: Uint8Array) {
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== 0) {
      return false;
    }
  }
  return true;
}

function decodeConfidentialMintData(data: Buffer): ConfidentialMintDetails {
  if (data.length < 65) {
    throw new Error("Confidential mint extension is truncated");
  }
  const authorityBytes = data.subarray(0, 32);
  const autoApprove = data[32] === 1;
  const auditorBytes = data.subarray(33, 65);

  return {
    authority: isZeroBytes(authorityBytes) ? undefined : bytesToBase64(authorityBytes),
    autoApproveNewAccounts: autoApprove,
    auditorElgamalPubkey: isZeroBytes(auditorBytes) ? undefined : bytesToBase64(auditorBytes),
  };
}

function decodeConfidentialAccountData(data: Buffer): ConfidentialAccountDetails {
  if (data.length < 295) {
    throw new Error("Confidential account extension is truncated");
  }

  let offset = 0;
  const approved = data[offset++] === 1;
  const elgamal = data.subarray(offset, offset + 32);
  offset += 32;
  const pendingLo = data.subarray(offset, offset + 64);
  offset += 64;
  const pendingHi = data.subarray(offset, offset + 64);
  offset += 64;
  const available = data.subarray(offset, offset + 64);
  offset += 64;
  const decryptable = data.subarray(offset, offset + 36);
  offset += 36;
  const allowConfidentialCredits = data[offset++] === 1;
  const allowNonConfidentialCredits = data[offset++] === 1;
  const pendingBalanceCreditCounter = data.readBigUInt64LE(offset);
  offset += 8;
  const maximumPendingBalanceCreditCounter = data.readBigUInt64LE(offset);
  offset += 8;
  const expectedPendingBalanceCreditCounter = data.readBigUInt64LE(offset);
  offset += 8;
  const actualPendingBalanceCreditCounter = data.readBigUInt64LE(offset);

  return {
    approved,
    elgamalPubkey: isZeroBytes(elgamal) ? undefined : bytesToBase64(elgamal),
    pendingBalanceLo: isZeroBytes(pendingLo) ? undefined : bytesToBase64(pendingLo),
    pendingBalanceHi: isZeroBytes(pendingHi) ? undefined : bytesToBase64(pendingHi),
    availableBalance: isZeroBytes(available) ? undefined : bytesToBase64(available),
    decryptableAvailableBalance: isZeroBytes(decryptable) ? undefined : bytesToBase64(decryptable),
    allowConfidentialCredits,
    allowNonConfidentialCredits,
    pendingBalanceCreditCounter,
    maximumPendingBalanceCreditCounter,
    expectedPendingBalanceCreditCounter,
    actualPendingBalanceCreditCounter,
  };
}

const devWarn = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[confidential]", ...args);
  }
};

async function inspectMint(connection: Connection, mintAddress: string): Promise<MintInspection> {
  const mint = new PublicKey(mintAddress);
  try {
    const info = await connection.getAccountInfo(mint, "confirmed");
    if (!info) {
      return {
        address: mint,
        found: false,
        hasConfidential: false,
        extensions: [],
        decimals: null,
      };
    }
    const decoded = unpackMint(mint, info, TOKEN_2022_PROGRAM_ID);
    const extensions = decoded.tlvData.length ? getExtensionTypes(decoded.tlvData) : [];
    let confidentialDetails: ConfidentialMintDetails | undefined;
    if (extensions.includes(ExtensionType.ConfidentialTransferMint)) {
      const extensionData = getExtensionData(ExtensionType.ConfidentialTransferMint, decoded.tlvData);
      if (extensionData) {
        try {
          confidentialDetails = decodeConfidentialMintData(extensionData);
        } catch (err) {
          devWarn("Failed to decode CT mint extension", err);
        }
      }
    }
    return {
      address: mint,
      found: true,
      hasConfidential: extensions.includes(ExtensionType.ConfidentialTransferMint),
      extensions,
      decimals: decoded.decimals,
      confidentialDetails,
    };
  } catch (error) {
    devWarn("Failed to inspect mint", error);
    return {
      address: mint,
      found: false,
      hasConfidential: false,
      extensions: [],
      decimals: null,
    };
  }
}

async function inspectTokenAccount(connection: Connection, mint: PublicKey, owner: PublicKey): Promise<AccountInspection> {
  const ata = await getAssociatedTokenAddress(mint, owner, true, TOKEN_2022_PROGRAM_ID);
  try {
    const info = await connection.getAccountInfo(ata, "confirmed");
    if (!info) {
      return { address: ata, exists: false, hasConfidential: false, extensions: [] };
    }
    const decoded = unpackAccount(ata, info, TOKEN_2022_PROGRAM_ID);
    const extensions = decoded.tlvData.length ? getExtensionTypes(decoded.tlvData) : [];
    let confidentialDetails: ConfidentialAccountDetails | undefined;
    if (extensions.includes(ExtensionType.ConfidentialTransferAccount)) {
      const extensionData = getExtensionData(ExtensionType.ConfidentialTransferAccount, decoded.tlvData);
      if (extensionData) {
        try {
          confidentialDetails = decodeConfidentialAccountData(extensionData);
        } catch (err) {
          devWarn("Failed to decode CT account extension", err);
        }
      }
    }
    return {
      address: ata,
      exists: true,
      hasConfidential: extensions.includes(ExtensionType.ConfidentialTransferAccount),
      extensions,
      confidentialDetails,
    };
  } catch (error) {
    devWarn("Failed to inspect token account", error);
    return { address: ata, exists: false, hasConfidential: false, extensions: [] };
  }
}

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
  owner,
}: BuildContext): Promise<ConfidentialAccountPlan> {
  const support = getConfidentialSupport(asset);
  if (!support.supported) {
    return { required: false, instructions: [], notes: [support.reason ?? "Unsupported asset."] };
  }

  const cluster = DEFAULT_CONFIDENTIAL_CLUSTER;
  const mintAddress = getAssetMint(asset, cluster);
  if (!mintAddress) {
    return {
      required: false,
      instructions: [],
      notes: ["Missing mint configuration for this asset. Set NEXT_PUBLIC_CUSDC_MAINNET_MINT."],
    };
  }

  const mintInspection = await inspectMint(connection, mintAddress);
  const accountInspection = await inspectTokenAccount(connection, mintInspection.address, owner);

  const notes: string[] = [];
  notes.push(
    mintInspection.found
      ? `Mint ${mintInspection.address.toBase58()} is reachable (${mintInspection.decimals} decimals).`
      : `Mint ${mintInspection.address.toBase58()} is missing on-chain (RPC returned null).`
  );
  notes.push(
    mintInspection.hasConfidential
      ? "Mint already carries the ConfidentialTransfer mint extension."
      : "Mint does NOT expose the ConfidentialTransfer mint extension yet."
  );
  notes.push(
    accountInspection.exists
      ? `ATA ${accountInspection.address.toBase58()} ${
          accountInspection.hasConfidential ? "already" : "does not yet"
        } include the ConfidentialTransfer account extension.`
      : `ATA ${accountInspection.address.toBase58()} does not exist; it will be created when the drop is funded.`
  );

  let instructions: TransactionInstruction[] = [];
  if (!accountInspection.hasConfidential && accountInspection.exists) {
    const ctInstructions = await buildConfidentialAccountInstructions({
      connection,
      mint: mintInspection.address,
      owner,
      accountAddress: accountInspection.address,
    });
    instructions = ctInstructions.instructions;
    notes.push(...ctInstructions.notes);
  } else if (accountInspection.hasConfidential) {
    notes.push("Burner account is CT-ready (configure/approve completed).");
  } else {
    notes.push("Account does not exist yet; configure/approve will happen after ATA creation.");
  }

  return {
    required: !accountInspection.hasConfidential,
    instructions,
    notes,
  };
}

export async function planConfidentialTransfer({
  connection,
  asset,
  owner,
  destination,
  amount,
  proofData,
  proofContextAccounts,
}: BuildContext): Promise<ConfidentialTransferPlan> {
  const support = getConfidentialSupport(asset);
  if (!support.supported) {
    return { instructions: [], requiresProofWorker: false, notes: [support.reason ?? "Unsupported asset."] };
  }

  const cluster = DEFAULT_CONFIDENTIAL_CLUSTER;
  const mintAddress = getAssetMint(asset, cluster);
  if (!mintAddress) {
    return {
      instructions: [],
      requiresProofWorker: false,
      notes: ["Missing mint configuration for this asset. Unable to plan confidential transfer."],
    };
  }

  const mintInspection = await inspectMint(connection, mintAddress);
  const sourceInspection = await inspectTokenAccount(connection, mintInspection.address, owner);
  const destinationInspection = await inspectTokenAccount(connection, mintInspection.address, destination);

  const notes: string[] = [
    mintInspection.found
      ? `Mint ${mintInspection.address.toBase58()} reachable; decimals=${mintInspection.decimals}.`
      : `Mint ${mintInspection.address.toBase58()} missing on-chain (RPC null).`,
    mintInspection.hasConfidential
      ? "Mint exposes ConfidentialTransfer extension."
      : "Mint still lacks ConfidentialTransfer extension - proof path will fail until the mint is upgraded.",
  ];

  notes.push(
    sourceInspection.exists
      ? `Sender ATA ${sourceInspection.address.toBase58()} ${
          sourceInspection.hasConfidential ? "is" : "is NOT"
        } CT-enabled.`
      : `Sender ATA ${sourceInspection.address.toBase58()} does not exist yet.`
  );

  notes.push(
    destinationInspection.exists
      ? `Destination ATA ${destinationInspection.address.toBase58()} ${
          destinationInspection.hasConfidential ? "is" : "is NOT"
        } CT-enabled.`
      : `Destination ATA ${destinationInspection.address.toBase58()} does not exist yet; drop will create it.`
  );

  const ctTransfer = await buildConfidentialTransferInstruction({
    connection,
    mint: mintInspection.address,
    from: sourceInspection.address,
    to: destinationInspection.address,
    owner,
    amount: amount ?? 0n,
    proofData,
    proofContexts: proofContextAccounts,
  });

  if (ctTransfer.instructions.length > 0) {
    notes.push("✓ CT transfer instructions built successfully");
  } else {
    notes.push("Proof data available but instructions not yet built");
  }
  notes.push(...ctTransfer.notes);

  return {
    instructions: ctTransfer.instructions,
    requiresProofWorker: true,
    notes,
    context: {
      mint: mintInspection,
      source: sourceInspection,
      destination: destinationInspection,
    },
  };
}
