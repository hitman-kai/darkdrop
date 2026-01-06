import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, ComputeBudgetProgram } from "@solana/web3.js";
import { CompressedTokenProgram, getTokenPoolInfos, selectTokenPoolInfo, selectTokenPoolInfosForDecompression, selectMinCompressedTokenAccountsForTransfer } from "@lightprotocol/compressed-token";
import { createRpc, selectStateTreeInfo, bn, LightSystemProgram, sumUpLamports } from "@lightprotocol/stateless.js";
import BN from "bn.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

import { generateNullifier } from "@/lib/nullifier";
import { AssetSymbol, getAssetMint } from "@/lib/tokens";
import {
  DARKDROP_PROGRAM_ID,
  createCreateDropInstruction,
  createClaimDropInstruction,
  createBatchCreateDropsInstruction,
  createBatchClaimDropsInstruction,
  deriveDropPDA,
  deriveNullifierPDA,
  DropData,
} from "@/lib/darkdrop-program";

const encoder = new TextEncoder();
const MIN_EXPIRATION_SECONDS = 60;
const MAX_EXPIRATION_SECONDS = 30 * 24 * 60 * 60;

export interface CreateDropParams {
  amount: bigint;
  asset: "SOL" | "USDC";
  connection: Connection;
  payerPubkey: PublicKey;
  sendTransactionFn: (tx: Transaction) => Promise<string>;
  batchWith?: CreateDropParams[];
  expirationSeconds?: number;
}

export interface ClaimDropParams {
  recipientKeypair: Keypair;
  asset: "SOL" | "USDC";
  amount: bigint;
  claimerPubkey: PublicKey;
  connection: Connection;
  payerPubkey: PublicKey;
  sendTransactionFn: (tx: Transaction) => Promise<string>;
}

export async function createDropWithProgram(
  params: CreateDropParams
): Promise<{ nullifier: string; recipientKeypair: Keypair; signature: string }> {
  const { amount, asset, connection, payerPubkey, sendTransactionFn, batchWith } = params;
  const expirationSeconds = params.expirationSeconds ?? 3600;
  if (expirationSeconds < MIN_EXPIRATION_SECONDS || expirationSeconds > MAX_EXPIRATION_SECONDS) {
    throw new Error(`expirationSeconds must be between ${MIN_EXPIRATION_SECONDS} and ${MAX_EXPIRATION_SECONDS}`);
  }
  const expiresAt = Math.floor(Date.now() / 1000) + expirationSeconds;

  const recipientKeypair = Keypair.generate();
  const nullifier = generateNullifier(recipientKeypair);
  const nullifierBytes = bs58.decode(nullifier);

  const assetType = asset === "SOL" ? 0 : 1;

  if (batchWith && batchWith.length > 0) {
    return createBatchDropsWithProgram({
      drops: [params, ...batchWith],
      connection,
      payerPubkey,
      sendTransactionFn,
    });
  }

  const compressionApiEndpoint = process.env.NEXT_PUBLIC_LIGHT_COMPRESSION_API;
  const rpc = compressionApiEndpoint
    ? createRpc(connection, compressionApiEndpoint)
    : createRpc(connection);

  const amountBN = new BN(amount.toString());
  let compressIx: TransactionInstruction;
  let computeUnits: number;

  if (asset === "SOL") {
    const solBalance = await connection.getBalance(payerPubkey);
    if (solBalance < amount) {
      throw new Error(`Insufficient SOL balance. Available: ${solBalance / 1e9} SOL, Required: ${Number(amount) / 1e9} SOL`);
    }

    const stateTreeInfos = await rpc.getStateTreeInfos();
    const outputStateTreeInfo = selectStateTreeInfo(stateTreeInfos);

    compressIx = await LightSystemProgram.compress({
      payer: payerPubkey,
      toAddress: recipientKeypair.publicKey,
      lamports: amountBN,
      outputStateTreeInfo,
    });

    computeUnits = 1_000_000;
  } else {
    const mintAddress = getAssetMint("usdc", "mainnet");
    if (!mintAddress) {
      throw new Error("USDC mint address not configured");
    }

    const mint = new PublicKey(mintAddress);
    const { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } = await import("@solana/spl-token");
    
    let payerATA = getAssociatedTokenAddressSync(mint, payerPubkey, false, TOKEN_PROGRAM_ID);
    let ataInfo = await connection.getAccountInfo(payerATA);

    if (!ataInfo) {
      const { TOKEN_2022_PROGRAM_ID } = await import("@solana/spl-token");
      const payerATA2022 = getAssociatedTokenAddressSync(mint, payerPubkey, false, TOKEN_2022_PROGRAM_ID);
      const ata2022Info = await connection.getAccountInfo(payerATA2022);
      if (ata2022Info) {
        payerATA = payerATA2022;
        ataInfo = ata2022Info;
      }
    }

    const tokenAccountInfo = await connection.getTokenAccountBalance(payerATA).catch(() => null);
    
    if (!tokenAccountInfo || !tokenAccountInfo.value || tokenAccountInfo.value.uiAmount === 0) {
      throw new Error("Insufficient USDC balance");
    }

    const availableBalance = BigInt(tokenAccountInfo.value.amount);
    if (availableBalance < amount) {
      throw new Error(`Insufficient USDC balance`);
    }

    const stateTreeInfos = await rpc.getStateTreeInfos();
    const outputStateTreeInfo = selectStateTreeInfo(stateTreeInfos);
    
    const tokenPoolInfos = await getTokenPoolInfos(rpc, mint);
    const tokenPoolInfo = selectTokenPoolInfo(tokenPoolInfos);

    compressIx = await CompressedTokenProgram.compress({
      payer: payerPubkey,
      owner: payerPubkey,
      source: payerATA,
      toAddress: recipientKeypair.publicKey,
      amount: amountBN,
      mint,
      outputStateTreeInfo,
      tokenPoolInfo,
    });

    computeUnits = 150_000;
  }

  const createDropIx = createCreateDropInstruction(
    DARKDROP_PROGRAM_ID,
    nullifier,
    recipientKeypair.publicKey,
    Number(amount),
    assetType,
    expiresAt,
    payerPubkey
  );

  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits + 50_000 }),
    compressIx,
    createDropIx
  );
  tx.recentBlockhash = blockhash;
  tx.feePayer = payerPubkey;

  const signature = await sendTransactionFn(tx);
  await connection.confirmTransaction(signature, "confirmed");

  return { nullifier, recipientKeypair, signature };
}

async function createBatchDropsWithProgram(params: {
  drops: CreateDropParams[];
  connection: Connection;
  payerPubkey: PublicKey;
  sendTransactionFn: (tx: Transaction) => Promise<string>;
}): Promise<{ nullifier: string; recipientKeypair: Keypair; signature: string }> {
  const { drops, connection, payerPubkey, sendTransactionFn } = params;

  if (drops.length > 10) {
    throw new Error("Maximum 10 drops per batch");
  }

  const dropData: DropData[] = [];
  const recipientKeypairs: Keypair[] = [];
  const compressionIxs: TransactionInstruction[] = [];
  let maxComputeUnits = 0;

  const compressionApiEndpoint = process.env.NEXT_PUBLIC_LIGHT_COMPRESSION_API;
  const rpc = compressionApiEndpoint
    ? createRpc(connection, compressionApiEndpoint)
    : createRpc(connection);

  for (const drop of drops) {
    const recipientKeypair = Keypair.generate();
    const nullifier = generateNullifier(recipientKeypair);
    const assetType = drop.asset === "SOL" ? 0 : 1;
    const expirationSeconds = drop.expirationSeconds ?? 3600;
    if (expirationSeconds < MIN_EXPIRATION_SECONDS || expirationSeconds > MAX_EXPIRATION_SECONDS) {
      throw new Error(`expirationSeconds must be between ${MIN_EXPIRATION_SECONDS} and ${MAX_EXPIRATION_SECONDS}`);
    }
    const expiresAt = Math.floor(Date.now() / 1000) + expirationSeconds;

    dropData.push({
      nullifier,
      recipient: recipientKeypair.publicKey,
      amount: Number(drop.amount),
      assetType,
      expiresAt,
    });
    recipientKeypairs.push(recipientKeypair);

    const amountBN = new BN(drop.amount.toString());

    if (drop.asset === "SOL") {
      const stateTreeInfos = await rpc.getStateTreeInfos();
      const outputStateTreeInfo = selectStateTreeInfo(stateTreeInfos);

      const compressIx = await LightSystemProgram.compress({
        payer: payerPubkey,
        toAddress: recipientKeypair.publicKey,
        lamports: amountBN,
        outputStateTreeInfo,
      });

      compressionIxs.push(compressIx);
      maxComputeUnits = Math.max(maxComputeUnits, 1_000_000);
    } else {
      const mintAddress = getAssetMint("usdc", "mainnet");
      if (!mintAddress) {
        throw new Error("USDC mint address not configured");
      }

      const mint = new PublicKey(mintAddress);
      const { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } = await import("@solana/spl-token");
      const payerATA = getAssociatedTokenAddressSync(mint, payerPubkey, false, TOKEN_PROGRAM_ID);

      const stateTreeInfos = await rpc.getStateTreeInfos();
      const outputStateTreeInfo = selectStateTreeInfo(stateTreeInfos);
      
      const tokenPoolInfos = await getTokenPoolInfos(rpc, mint);
      const tokenPoolInfo = selectTokenPoolInfo(tokenPoolInfos);

      const compressIx = await CompressedTokenProgram.compress({
        payer: payerPubkey,
        owner: payerPubkey,
        source: payerATA,
        toAddress: recipientKeypair.publicKey,
        amount: amountBN,
        mint,
        outputStateTreeInfo,
        tokenPoolInfo,
      });

      compressionIxs.push(compressIx);
      maxComputeUnits = Math.max(maxComputeUnits, 150_000);
    }
  }

  const batchCreateIx = createBatchCreateDropsInstruction(
    DARKDROP_PROGRAM_ID,
    dropData,
    payerPubkey
  );

  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: maxComputeUnits * drops.length + 100_000 }),
    ...compressionIxs,
    batchCreateIx
  );
  tx.recentBlockhash = blockhash;
  tx.feePayer = payerPubkey;

  const signature = await sendTransactionFn(tx);
  await connection.confirmTransaction(signature, "confirmed");

  return {
    nullifier: dropData[0].nullifier,
    recipientKeypair: recipientKeypairs[0],
    signature,
  };
}

export async function claimDropWithProgram(
  params: ClaimDropParams
): Promise<string> {
  const { recipientKeypair, asset, amount, claimerPubkey, connection, payerPubkey, sendTransactionFn } = params;

  const nullifier = generateNullifier(recipientKeypair);
  const [nullifierPDA] = deriveNullifierPDA(DARKDROP_PROGRAM_ID, nullifier);

  const nullifierAccount = await connection.getAccountInfo(nullifierPDA);
  if (nullifierAccount) {
    const data = nullifierAccount.data;
    const isUsed = data[32] === 1;
    if (isUsed) {
      throw new Error("This drop has already been claimed");
    }
  }

  const compressionApiEndpoint = process.env.NEXT_PUBLIC_LIGHT_COMPRESSION_API;
  const rpc = compressionApiEndpoint
    ? createRpc(connection, compressionApiEndpoint)
    : createRpc(connection);

  const amountBN = new BN(amount.toString());
  let decompressIx: TransactionInstruction;
  let computeUnits: number;

  if (asset === "SOL") {
    const compressedAccounts = await rpc.getCompressedAccountsByOwner(recipientKeypair.publicKey);
    
    if (compressedAccounts.items.length === 0) {
      throw new Error("No compressed SOL found for this drop");
    }

    const totalCompressed = sumUpLamports(compressedAccounts.items);
    
    if (amountBN.gt(totalCompressed)) {
      throw new Error(`Insufficient compressed SOL`);
    }

    const proof = await rpc.getValidityProof(
      compressedAccounts.items.map(account => bn(account.hash))
    );

    const decompressAmount = amountBN.eq(totalCompressed) ? amountBN : totalCompressed;
    
    decompressIx = await LightSystemProgram.decompress({
      payer: payerPubkey,
      toAddress: claimerPubkey,
      inputCompressedAccounts: compressedAccounts.items,
      recentValidityProof: proof.compressedProof,
      recentInputStateRootIndices: proof.rootIndices,
      lamports: decompressAmount,
    });
    
    decompressIx.keys[1] = {
      pubkey: recipientKeypair.publicKey,
      isSigner: true,
      isWritable: false,
    };

    computeUnits = 1_000_000;
  } else {
    const mintAddress = getAssetMint("usdc", "mainnet");
    if (!mintAddress) {
      throw new Error("USDC mint address not configured");
    }
    const mint = new PublicKey(mintAddress);

    const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = await import("@solana/spl-token");
    const claimerATA = await getAssociatedTokenAddress(mint, claimerPubkey, true, TOKEN_PROGRAM_ID);

    const compressedTokenAccounts = await rpc.getCompressedTokenAccountsByOwner(
      recipientKeypair.publicKey,
      { mint }
    );

    if (compressedTokenAccounts.items.length === 0) {
      throw new Error("No compressed tokens found for this drop");
    }

    const [inputAccounts] = selectMinCompressedTokenAccountsForTransfer(
      compressedTokenAccounts.items,
      amountBN
    );

    const proof = await rpc.getValidityProofV0(
      inputAccounts.map(account => ({
        hash: account.compressedAccount.hash,
        tree: account.compressedAccount.treeInfo.tree,
        queue: account.compressedAccount.treeInfo.queue,
      }))
    );

    const tokenPoolInfos = await getTokenPoolInfos(rpc, mint);
    const selectedTokenPoolInfos = selectTokenPoolInfosForDecompression(
      tokenPoolInfos,
      amountBN
    );

    decompressIx = await CompressedTokenProgram.decompress({
      payer: payerPubkey,
      inputCompressedTokenAccounts: inputAccounts,
      toAddress: claimerATA,
      amount: amountBN,
      tokenPoolInfos: selectedTokenPoolInfos,
      recentInputStateRootIndices: proof.rootIndices,
      recentValidityProof: proof.compressedProof,
    });

    computeUnits = 350_000;
  }

  const claimDropIx = createClaimDropInstruction(
    DARKDROP_PROGRAM_ID,
    nullifier,
    payerPubkey
  );

  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits + 50_000 }),
    claimDropIx,
    decompressIx
  );
  tx.recentBlockhash = blockhash;
  tx.feePayer = payerPubkey;

  tx.partialSign(recipientKeypair);

  const signature = await sendTransactionFn(tx);
  await connection.confirmTransaction(signature, "confirmed");

  return signature;
}


