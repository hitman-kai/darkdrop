import { PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import bs58 from "bs58";
import { BorshInstructionCoder } from "@coral-xyz/anchor";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as borsh from "borsh";

export const DARKDROP_PROGRAM_ID = new PublicKey(
  "95XwPFvP6znDJN2XS4JRp29NjUNGEKDAmCRfKaZEzNfw"
);

export function deriveDropPDA(
  programId: PublicKey,
  nullifier: string
): [PublicKey, number] {
  const nullifierBytes = bs58.decode(nullifier);
  if (nullifierBytes.length !== 32) {
    throw new Error("Nullifier must be 32 bytes");
  }
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from("drop"), nullifierBytes],
    programId
  );
}

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

export function deriveConfigPDA(
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );
}

export function deriveRateLimitPDA(
  programId: PublicKey,
  payer: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("rate_limit"), payer.toBuffer()],
    programId
  );
}

export interface DropData {
  nullifier: string;
  recipient: PublicKey;
  amount: number;
  assetType: number;
  expiresAt: number;
}

export function createInitializeInstruction(
  programId: PublicKey,
  authority: PublicKey
): TransactionInstruction {
  const [configPDA] = deriveConfigPDA(programId);
  const discriminator = Buffer.from([0xaf, 0xaf, 0x6d, 0x1f, 0x0d, 0x98, 0x9b, 0xed]);
  const data = Buffer.from(discriminator);

  return new TransactionInstruction({
    programId,
    keys: [
      {
        pubkey: configPDA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: authority,
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

export function createCreateDropInstruction(
  programId: PublicKey,
  nullifier: string,
  recipient: PublicKey,
  amount: number,
  assetType: number,
  expiresAt: number,
  payer: PublicKey
): TransactionInstruction {
  const nullifierBytes = bs58.decode(nullifier);
  if (nullifierBytes.length !== 32) {
    throw new Error("Nullifier must be 32 bytes");
  }
  
  const nullifierArray = Array.from(nullifierBytes);
  
  const [dropPDA] = deriveDropPDA(programId, nullifier);
  const [nullifierPDA] = deriveNullifierPDA(programId, nullifier);
  const [configPDA] = deriveConfigPDA(programId);
  const [rateLimitPDA] = deriveRateLimitPDA(programId, payer);
  
  // Manual Borsh serialization
  // Note: Anchor uses camelCase in IDL but snake_case in discriminator calculation
  // Format: discriminator (8) + nullifier [u8;32] (32) + recipient Pubkey (32) + amount u64 (8) + asset_type u8 (1) + expires_at i64 (8)
  // Discriminator: SHA256("global:create_drop")[0:8] - uses snake_case from Rust function name
  const createDropDiscriminator = Buffer.from([0x9d, 0x8e, 0x91, 0xf7, 0x5c, 0x49, 0x3b, 0x30]);
  const data = Buffer.alloc(8 + 32 + 32 + 8 + 1 + 8);
  createDropDiscriminator.copy(data, 0);
  Buffer.from(nullifierArray).copy(data, 8);  // nullifier [u8;32]
  recipient.toBuffer().copy(data, 40);         // recipient Pubkey (32 bytes)
  const amountBuf = Buffer.allocUnsafe(8);
  amountBuf.writeBigUInt64LE(BigInt(amount), 0);
  amountBuf.copy(data, 72);                   // amount u64 (little-endian)
  data.writeUInt8(assetType, 80);             // asset_type u8
  data.writeBigInt64LE(BigInt(expiresAt), 81); // expires_at i64
  
  return new TransactionInstruction({
    programId,
    keys: [
      {
        pubkey: dropPDA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: nullifierPDA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: configPDA,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: rateLimitPDA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: payer,
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

export function createClaimDropInstruction(
  programId: PublicKey,
  nullifier: string,
  claimer: PublicKey
): TransactionInstruction {
  const nullifierBytes = bs58.decode(nullifier);
  if (nullifierBytes.length !== 32) {
    throw new Error("Nullifier must be 32 bytes");
  }
  
  const nullifierArray = Array.from(nullifierBytes);
  
  const [dropPDA] = deriveDropPDA(programId, nullifier);
  const [nullifierPDA] = deriveNullifierPDA(programId, nullifier);
  
  // Manual Borsh serialization
  // Format: discriminator (8) + nullifier [u8;32] (32)
  // Discriminator: SHA256("global:claim_drop")[0:8] - uses snake_case from Rust function name
  const claimDropDiscriminator = Buffer.from([0x9d, 0x1d, 0x59, 0x0e, 0x51, 0xcb, 0x6b, 0x3a]);
  const data = Buffer.alloc(8 + 32);
  claimDropDiscriminator.copy(data, 0);
  Buffer.from(nullifierArray).copy(data, 8);  // nullifier [u8;32]
  
  return new TransactionInstruction({
    programId,
    keys: [
      {
        pubkey: dropPDA,
        isSigner: false,
        isWritable: true,
      },
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
    ],
    data,
  });
}

export function createExpireDropInstruction(
  programId: PublicKey,
  nullifier: string,
  authority: PublicKey,
  rentCollector: PublicKey
): TransactionInstruction {
  const nullifierBytes = bs58.decode(nullifier);
  if (nullifierBytes.length !== 32) {
    throw new Error("Nullifier must be 32 bytes");
  }

  const [dropPDA] = deriveDropPDA(programId, nullifier);
  const [nullifierPDA] = deriveNullifierPDA(programId, nullifier);
  const [configPDA] = deriveConfigPDA(programId);

  const expireDiscriminator = Buffer.from([0xb9, 0x3a, 0x8b, 0xfb, 0xeb, 0xf2, 0x43, 0x68]);
  const data = Buffer.alloc(8 + 32);
  expireDiscriminator.copy(data, 0);
  Buffer.from(nullifierBytes).copy(data, 8);

  return new TransactionInstruction({
    programId,
    keys: [
      {
        pubkey: dropPDA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: nullifierPDA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: configPDA,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: authority,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: rentCollector,
        isSigner: false,
        isWritable: true,
      },
    ],
    data,
  });
}

export function createProposeAuthorityInstruction(
  programId: PublicKey,
  authority: PublicKey,
  newAuthority: PublicKey
): TransactionInstruction {
  const [configPDA] = deriveConfigPDA(programId);
  const discriminator = Buffer.from([0x14, 0x94, 0xec, 0xc6, 0x4c, 0x77, 0x63, 0x8e]);
  const data = Buffer.alloc(8 + 32);
  discriminator.copy(data, 0);
  newAuthority.toBuffer().copy(data, 8);

  return new TransactionInstruction({
    programId,
    keys: [
      {
        pubkey: configPDA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: authority,
        isSigner: true,
        isWritable: false,
      },
    ],
    data,
  });
}

export function createCancelAuthorityProposalInstruction(
  programId: PublicKey,
  authority: PublicKey
): TransactionInstruction {
  const [configPDA] = deriveConfigPDA(programId);
  const discriminator = Buffer.from([0xea, 0x34, 0xdd, 0x5e, 0xb3, 0xaf, 0xdb, 0x72]);
  const data = Buffer.from(discriminator);

  return new TransactionInstruction({
    programId,
    keys: [
      {
        pubkey: configPDA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: authority,
        isSigner: true,
        isWritable: false,
      },
    ],
    data,
  });
}

export function createAcceptAuthorityInstruction(
  programId: PublicKey,
  pendingAuthority: PublicKey
): TransactionInstruction {
  const [configPDA] = deriveConfigPDA(programId);
  const discriminator = Buffer.from([0x6b, 0x56, 0xc6, 0x5b, 0x21, 0x0c, 0x6b, 0xa0]);
  const data = Buffer.from(discriminator);

  return new TransactionInstruction({
    programId,
    keys: [
      {
        pubkey: configPDA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: pendingAuthority,
        isSigner: true,
        isWritable: false,
      },
    ],
    data,
  });
}

export function createUpdateAuthorityDelayInstruction(
  programId: PublicKey,
  authority: PublicKey,
  newDelaySeconds: number
): TransactionInstruction {
  const [configPDA] = deriveConfigPDA(programId);
  const discriminator = Buffer.from([0xf8, 0x02, 0xea, 0x9d, 0xda, 0x07, 0x06, 0x89]);
  const data = Buffer.alloc(8 + 8);
  discriminator.copy(data, 0);
  data.writeBigInt64LE(BigInt(newDelaySeconds), 8);

  return new TransactionInstruction({
    programId,
    keys: [
      {
        pubkey: configPDA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: authority,
        isSigner: true,
        isWritable: false,
      },
    ],
    data,
  });
}

export function createBatchCreateDropsInstruction(
  programId: PublicKey,
  drops: DropData[],
  payer: PublicKey
): TransactionInstruction {
  if (drops.length > 10) {
    throw new Error("Maximum 10 drops per batch");
  }
  
  let data = Buffer.alloc(8 + 4);
  data.writeUInt8(3, 0);
  data.writeUInt32LE(drops.length, 8);
  
  const [configPDA] = deriveConfigPDA(programId);
  const [rateLimitPDA] = deriveRateLimitPDA(programId, payer);
  
  const keys = [
    {
      pubkey: payer,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: configPDA,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: rateLimitPDA,
      isSigner: false,
      isWritable: true,
    },
  ];
  
  for (const drop of drops) {
    const nullifierBytes = bs58.decode(drop.nullifier);
    const nullifierArray = new Uint8Array(32);
    nullifierArray.set(nullifierBytes);
    
    const dropData = Buffer.alloc(32 + 32 + 8 + 1 + 8);
    nullifierArray.copy(dropData, 0);
    drop.recipient.toBuffer().copy(dropData, 32);
    dropData.writeBigUInt64LE(BigInt(drop.amount), 64);
    dropData.writeUInt8(drop.assetType, 72);
    dropData.writeBigInt64LE(BigInt(drop.expiresAt), 73);
    
    data = Buffer.concat([data, dropData]);
    
    const [dropPDA] = deriveDropPDA(programId, drop.nullifier);
    const [nullifierPDA] = deriveNullifierPDA(programId, drop.nullifier);
    
    keys.push(
      {
        pubkey: dropPDA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: nullifierPDA,
        isSigner: false,
        isWritable: true,
      }
    );
  }
  
  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

export function createBatchClaimDropsInstruction(
  programId: PublicKey,
  nullifiers: string[],
  claimer: PublicKey
): TransactionInstruction {
  if (nullifiers.length > 10) {
    throw new Error("Maximum 10 drops per batch");
  }
  
  let data = Buffer.alloc(8 + 4);
  data.writeUInt8(4, 0);
  data.writeUInt32LE(nullifiers.length, 8);
  
  const keys = [
    {
      pubkey: claimer,
      isSigner: true,
      isWritable: true,
    },
  ];
  
  for (const nullifier of nullifiers) {
    const nullifierBytes = bs58.decode(nullifier);
    const nullifierArray = new Uint8Array(32);
    nullifierArray.set(nullifierBytes);
    
    data = Buffer.concat([data, Buffer.from(nullifierArray)]);
    
    const [dropPDA] = deriveDropPDA(programId, nullifier);
    const [nullifierPDA] = deriveNullifierPDA(programId, nullifier);
    
    keys.push(
      {
        pubkey: dropPDA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: nullifierPDA,
        isSigner: false,
        isWritable: true,
      }
    );
  }
  
  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

