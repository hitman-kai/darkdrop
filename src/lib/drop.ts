import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, TransactionInstruction, ComputeBudgetProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import bs58 from "bs58";
import nacl from "tweetnacl";
import BN from "bn.js";
import { CompressedTokenProgram, getTokenPoolInfos, selectTokenPoolInfo, selectTokenPoolInfosForDecompression, selectMinCompressedTokenAccountsForTransfer } from "@lightprotocol/compressed-token";
import { createRpc, selectStateTreeInfo, bn, LightSystemProgram, sumUpLamports } from "@lightprotocol/stateless.js";

import { decryptPrivateKey, encryptPrivateKey } from "@/lib/encryption";
import { AssetSymbol, ClusterType, DEFAULT_ASSET, DEFAULT_CLUSTER, getAssetMint } from "@/lib/tokens";
import { generateNullifier, generateNullifierFromSecret, getNullifierRegistry } from "@/lib/nullifier";
import { 
  createMarkNullifierUsedInstruction, 
  checkNullifierOnChain,
  NULLIFIER_REGISTRY_PROGRAM_ID 
} from "@/lib/nullifier-onchain";

const CODE_PREFIX = "darkdrop";
const CODE_VERSION = "v2";
const encoder = new TextEncoder();

export type DropPayload = {
  address: string;
  claimCode: string;
  encrypted: boolean;
  asset: AssetSymbol;
  cluster: ClusterType;
  shielded?: boolean;
  shieldSignature?: string;
};

type GenerateParams = {
  asset: AssetSymbol;
  cluster: ClusterType;
  password?: string;
  ultraPrivateMode?: boolean;
  connection?: Connection;
  payer?: Keypair;
  payerPubkey?: PublicKey;
  sendTransactionFn?: (tx: Transaction) => Promise<string>;
  amount?: bigint;
};

export type ClaimedDrop = {
  keypair: Keypair;
  asset: AssetSymbol;
  cluster: ClusterType;
  encrypted: boolean;
  legacy?: boolean;
  shielded?: boolean;
  compressed?: boolean; // True if this is a compressed token drop
};

const buildHint = (password: string): string => {
  const hash = nacl.hash(encoder.encode(password));
  return Array.from(hash.slice(0, 8))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

// Helper function to encrypt with AES (reusing existing encryption)
const encryptAES = (password: string, data: Uint8Array): string => {
  return encryptPrivateKey(data, password);
};

/**
 * Generate a compressed token drop using Light Protocol zk-compression
 * Creates compressed tokens owned by a random keypair that can be claimed later
 */
export async function generateShieldedDrop(
  amount: bigint,
  password: string | undefined,
  asset: "SOL" | "USDC",
  connection: Connection,
  payerPubkey: PublicKey,
  sendTransactionFn: (tx: Transaction) => Promise<string>
): Promise<{ claimCode: string; recipientKeypair: Keypair; shieldSignature: string }> {
  try {
    // Generate recipient keypair (owns the compressed tokens)
    const recipientKeypair = Keypair.generate();
    const recipientPubkey = recipientKeypair.publicKey;

    // Create RPC instance from connection
    const compressionApiEndpoint = process.env.NEXT_PUBLIC_LIGHT_COMPRESSION_API;
    const rpc = compressionApiEndpoint 
      ? createRpc(connection, compressionApiEndpoint)
      : createRpc(connection); // Defaults to connection.rpcEndpoint for compression API

    const amountBN = new BN(amount.toString());
    
    console.log("[Light Protocol] Compressing:", {
      asset,
      amount: amount.toString(),
      amountBN: amountBN.toString(),
      payer: payerPubkey.toBase58(),
      recipient: recipientPubkey.toBase58(),
    });

    let compressIx: TransactionInstruction;
    let computeUnits: number;

    if (asset === "SOL") {
      // SOL compression: Use LightSystemProgram to compress native SOL (lamports)
      // Check SOL balance
      const solBalance = await connection.getBalance(payerPubkey);
      if (solBalance < amount) {
        throw new Error(`Insufficient SOL balance. Available: ${solBalance / 1e9} SOL, Required: ${Number(amount) / 1e9} SOL`);
      }

      const stateTreeInfos = await rpc.getStateTreeInfos();
      const outputStateTreeInfo = selectStateTreeInfo(stateTreeInfos);

      compressIx = await LightSystemProgram.compress({
        payer: payerPubkey,
        toAddress: recipientPubkey,
        lamports: amountBN,
        outputStateTreeInfo,
      });

      computeUnits = 1_000_000; // SOL compression needs more compute
    } else {
      // USDC compression: Use CompressedTokenProgram
      const mintAddress = getAssetMint("usdc", "mainnet");
      if (!mintAddress) {
        throw new Error("USDC mint address not configured");
      }

      const mint = new PublicKey(mintAddress);
      
      // Get/create payer's USDC ATA
      // Try both TOKEN_PROGRAM_ID and TOKEN_2022_PROGRAM_ID to find the account
      // First try standard token program
      let payerATA = getAssociatedTokenAddressSync(
        mint,
        payerPubkey,
        false,
        TOKEN_PROGRAM_ID
      );
      
      // Check if account exists with standard token program
      let ataInfo = await connection.getAccountInfo(payerATA);
      
      // If not found, try Token-2022 program
      if (!ataInfo) {
        const { TOKEN_2022_PROGRAM_ID } = await import("@solana/spl-token");
        const payerATA2022 = getAssociatedTokenAddressSync(
          mint,
          payerPubkey,
          false,
          TOKEN_2022_PROGRAM_ID
        );
        const ata2022Info = await connection.getAccountInfo(payerATA2022);
        if (ata2022Info) {
          payerATA = payerATA2022;
          ataInfo = ata2022Info;
        }
      }

      // Check if payer has USDC balance
      const tokenAccountInfo = await connection.getTokenAccountBalance(payerATA).catch((err) => {
        console.error("[Light Protocol] Error fetching USDC balance:", err);
        return null;
      });
      
      if (!tokenAccountInfo) {
        // ATA doesn't exist - user needs to receive USDC first to create the token account
        throw new Error(
          `USDC token account not found. Please ensure you have USDC in your wallet. ` +
          `If you have USDC elsewhere, try sending a small amount to yourself first to create the token account. ` +
          `Expected ATA: ${payerATA.toBase58()}`
        );
      }
      
      if (!tokenAccountInfo.value || tokenAccountInfo.value.uiAmount === null || tokenAccountInfo.value.uiAmount === 0) {
        throw new Error(`Insufficient USDC balance. Your balance is 0 USDC. Please add USDC to your wallet.`);
      }
      
      const availableBalance = BigInt(tokenAccountInfo.value.amount);
      if (availableBalance < amount) {
        throw new Error(`Insufficient USDC balance. Available: ${tokenAccountInfo.value.uiAmount} USDC, Required: ${Number(amount) / 1e6} USDC`);
      }

      const stateTreeInfos = await rpc.getStateTreeInfos();
      const outputStateTreeInfo = selectStateTreeInfo(stateTreeInfos);
      
      const tokenPoolInfos = await getTokenPoolInfos(rpc, mint);
      const tokenPoolInfo = selectTokenPoolInfo(tokenPoolInfos);

      compressIx = await CompressedTokenProgram.compress({
        payer: payerPubkey,
        owner: payerPubkey, // Owner of the source token account
        source: payerATA,
        toAddress: recipientPubkey,
        amount: amountBN,
        mint,
        outputStateTreeInfo,
        tokenPoolInfo,
      });

      computeUnits = 130_000 + 20_000;
    }

    // Build transaction with compute budget
    const { blockhash } = await connection.getLatestBlockhash();
    const tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
      compressIx
    );
    tx.recentBlockhash = blockhash;
    tx.feePayer = payerPubkey;

    // Send transaction
    const shieldSignature = await sendTransactionFn(tx);
    
    // Wait for confirmation
    await connection.confirmTransaction(shieldSignature, "confirmed");

    // Generate nullifier for this drop (prevents double-spending)
    const nullifier = generateNullifier(recipientKeypair);
    console.log(`[Nullifier] Generated nullifier for drop: ${nullifier.substring(0, 16)}...`);
    
    // Build claim code: darkdrop:v2:cluster:asset:compressed:mode:payload
    const recipientSecret = recipientKeypair.secretKey;
    const baseSegments = [CODE_PREFIX, CODE_VERSION, "mainnet", asset.toLowerCase(), "compressed"];
    
    let code: string;
    if (password) {
      // Encrypt the recipient secret key with password
      const encryptedSecret = encryptAES(password, recipientSecret);
      const hint = buildHint(password);
      code = `${baseSegments.join(":")}:aes:${hint}:${encryptedSecret}`;
    } else {
      code = `${baseSegments.join(":")}:raw:${bs58.encode(recipientSecret)}`;
    }

    return { claimCode: code, recipientKeypair, shieldSignature };
  } catch (error) {
    console.error("[Light Protocol] Compress failed:", error);
    throw new Error(`Light Protocol compression failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function generateDrop({
  asset,
  cluster,
  password,
  ultraPrivateMode = false,
  connection,
  payer,
  payerPubkey,
  sendTransactionFn,
  amount,
}: GenerateParams): Promise<DropPayload> {
  // Check if Light Protocol should be used
  const useLightProtocol = ultraPrivateMode && connection && payerPubkey && sendTransactionFn;
  const useZkElgamal = process.env.NEXT_PUBLIC_USE_ZK_ELGAMAL === "true";

  // If ultra private mode and Light Protocol available, use compressed token drops
  if (useLightProtocol && !useZkElgamal) {
    if (!payerPubkey || !sendTransactionFn) {
      throw new Error("Wallet connection required for compressed token drops. Please connect your wallet.");
    }
    
    const assetForLight = asset === "usdc" ? "USDC" : "SOL";
    const dropAmount = amount ?? 0n;
    
    // Try compression - don't fall back silently
    const { claimCode, recipientKeypair, shieldSignature } = await generateShieldedDrop(
      dropAmount,
      password,
      assetForLight,
      connection,
      payerPubkey,
      sendTransactionFn
    );

    return {
      address: recipientKeypair.publicKey.toBase58(), // Recipient's public key
      claimCode,
      encrypted: !!password,
      asset,
      cluster,
      shielded: true,
      shieldSignature, // Store compression transaction signature
    };
  }

  // Fallback to burner wallet (v1 behavior)
  const keypair = Keypair.generate();
  const secretKey = keypair.secretKey;
  let claimCode = bs58.encode(secretKey);
  let encrypted = false;

  const baseSegments = [CODE_PREFIX, CODE_VERSION, cluster, asset];

  if (password && password.trim().length > 0) {
    const encryptedPayload = encryptPrivateKey(secretKey, password);
    const hint = buildHint(password);
    claimCode = `${baseSegments.join(":")}:aes:${hint}:${encryptedPayload}`;
    encrypted = true;
  } else {
    claimCode = `${baseSegments.join(":")}:raw:${claimCode}`;
  }

  return {
    address: keypair.publicKey.toBase58(),
    claimCode,
    encrypted,
    asset,
    cluster,
    shielded: false,
  };
}

type ClaimOptions = {
  password?: string;
  fallbackCluster?: ClusterType;
};

const parseCluster = (value: string): ClusterType => (value === "mainnet" ? "mainnet" : DEFAULT_CLUSTER);
const parseAsset = (value: string): AssetSymbol => (value === "usdc" ? "usdc" : "sol");

export function claimDrop(code: string, options?: ClaimOptions): ClaimedDrop {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error("Claim code required");
  }

  // Handle legacy codes (no prefix)
  if (!trimmed.startsWith(`${CODE_PREFIX}:`)) {
    try {
      const secretKey = bs58.decode(trimmed);
      return {
        keypair: Keypair.fromSecretKey(secretKey),
        asset: DEFAULT_ASSET,
        cluster: options?.fallbackCluster ?? DEFAULT_CLUSTER,
        encrypted: false,
        legacy: true,
      };
    } catch {
      throw new Error("Invalid claim code");
    }
  }

  const segments = trimmed.split(":");
  if (segments.length < 4) {
    throw new Error("Malformed claim code");
  }

  const [, version, clusterSegment, assetSegment, mode, ...rest] = segments;
  
  // Handle v1 codes
  if (version === "v1") {
    if (segments.length < 6) {
      throw new Error("Malformed v1 claim code");
    }
    const cluster = parseCluster(clusterSegment);
    const asset = parseAsset(assetSegment);

    if (mode === "raw") {
      const payload = rest[0];
      if (!payload) throw new Error("Malformed claim code");
      try {
        const secretKey = bs58.decode(payload);
        return {
          keypair: Keypair.fromSecretKey(secretKey),
          asset,
          cluster,
          encrypted: false,
          legacy: true,
        };
      } catch {
        throw new Error("Invalid claim code");
      }
    }

    if (mode === "aes") {
      const [hint, payload] = rest;
      if (!hint || !payload) {
        throw new Error("Malformed claim code");
      }
      if (!options?.password) {
        throw new Error("Password required for this drop");
      }
      const derivedHint = buildHint(options.password);
      if (hint !== derivedHint) {
        throw new Error("Password mismatch");
      }
      const decoded = decryptPrivateKey(payload, options.password);
      if (!decoded) {
        throw new Error("Unable to decrypt claim");
      }
      return {
        keypair: Keypair.fromSecretKey(decoded),
        asset,
        cluster,
        encrypted: true,
        legacy: true,
      };
    }
    throw new Error("Unsupported v1 claim code");
  }

  // Handle v2 codes
  if (version !== CODE_VERSION) {
    throw new Error(`Unsupported claim version: ${version}`);
  }

  // Check if this is a compressed token drop
  if (mode === "compressed") {
    const assetForLight = parseAsset(assetSegment);
    const cluster = parseCluster(clusterSegment);
    
    if (segments.length < 6) {
      throw new Error("Malformed compressed drop claim code");
    }
    
    const encMode = rest[0];
    let recipientSecret: Uint8Array;
    let encrypted = false;

    if (encMode === "aes") {
      if (!options?.password) {
        throw new Error("Password required for encrypted compressed drop");
      }
      const [hint, encryptedPayload] = rest.slice(1);
      if (!hint || !encryptedPayload) {
        throw new Error("Malformed encrypted compressed drop");
      }
      const derivedHint = buildHint(options.password);
      if (hint !== derivedHint) {
        throw new Error("Password mismatch");
      }
      const decrypted = decryptPrivateKey(encryptedPayload, options.password);
      if (!decrypted) {
        throw new Error("Unable to decrypt compressed drop secret");
      }
      recipientSecret = decrypted;
      encrypted = true;
    } else if (encMode === "raw") {
      const secretKeyStr = rest[1];
      if (!secretKeyStr) {
        throw new Error("Malformed compressed drop");
      }
      try {
        recipientSecret = bs58.decode(secretKeyStr);
      } catch {
        throw new Error("Invalid compressed drop secret key");
      }
    } else {
      throw new Error("Invalid compressed drop format");
    }

    // Return the recipient keypair - used to decompress tokens
    return {
      keypair: Keypair.fromSecretKey(recipientSecret),
      asset: assetForLight,
      cluster,
      encrypted,
      compressed: true,
    };
  }

  // Handle v2 burner wallet codes
  if (segments.length < 6) {
    throw new Error("Malformed claim code");
  }

  const cluster = parseCluster(clusterSegment);
  const asset = parseAsset(assetSegment);

  if (mode === "raw") {
    const payload = rest[0];
    if (!payload) throw new Error("Malformed claim code");
    try {
      const secretKey = bs58.decode(payload);
      return {
        keypair: Keypair.fromSecretKey(secretKey),
        asset,
        cluster,
        encrypted: false,
      };
    } catch {
      throw new Error("Invalid claim code");
    }
  }

  if (mode === "aes") {
    const [hint, payload] = rest;
    if (!hint || !payload) {
      throw new Error("Malformed claim code");
    }
    if (!options?.password) {
      throw new Error("Password required for this drop");
    }
    const derivedHint = buildHint(options.password);
    if (hint !== derivedHint) {
      throw new Error("Password mismatch");
    }
    const decoded = decryptPrivateKey(payload, options.password);
    if (!decoded) {
      throw new Error("Unable to decrypt claim");
    }
    return {
      keypair: Keypair.fromSecretKey(decoded),
      asset,
      cluster,
      encrypted: true,
    };
  }

  throw new Error("Unsupported claim code");
}

/**
 * Decompress compressed tokens/SOL (claim via Light Protocol)
 * Converts compressed tokens/SOL owned by recipient keypair to regular tokens/SOL in claimer's wallet
 */
export async function unshieldDrop(
  recipientKeypair: Keypair,
  asset: "SOL" | "USDC",
  amount: bigint,
  claimerPubkey: PublicKey,
  connection: Connection,
  payerPubkey: PublicKey,
  sendTransactionFn: (tx: Transaction) => Promise<string>
): Promise<string> {
  try {
    // Generate nullifier for this drop
    const nullifier = generateNullifier(recipientKeypair);
    
    // Check nullifier on-chain (if program is deployed)
    const useOnChainNullifier = process.env.NEXT_PUBLIC_USE_ONCHAIN_NULLIFIER === "true";
    
    if (useOnChainNullifier) {
      console.log(`[Nullifier On-Chain] Checking nullifier on-chain: ${nullifier.substring(0, 16)}...`);
      const onChainCheck = await checkNullifierOnChain(
        connection,
        NULLIFIER_REGISTRY_PROGRAM_ID,
        nullifier
      );
      
      if (onChainCheck.exists && onChainCheck.isUsed) {
        throw new Error("This drop has already been claimed. Nullifier already used (on-chain verified).");
      }
      
      console.log(`[Nullifier On-Chain] Nullifier verified unused on-chain`);
    } else {
      // Fallback to client-side check
      const registry = getNullifierRegistry();
      const isUsed = await registry.isUsed(nullifier);
      
      if (isUsed) {
        throw new Error("This drop has already been claimed. Nullifier already used.");
      }
      
      console.log(`[Nullifier] Checking nullifier: ${nullifier.substring(0, 16)}... (not used)`);
    }
    // Create RPC instance from connection
    const compressionApiEndpoint = process.env.NEXT_PUBLIC_LIGHT_COMPRESSION_API;
    const rpc = compressionApiEndpoint 
      ? createRpc(connection, compressionApiEndpoint)
      : createRpc(connection); // Defaults to connection.rpcEndpoint for compression API

    const amountBN = new BN(amount.toString());

    let decompressIx: TransactionInstruction;
    let computeUnits: number;
    let needsATACreation = false;
    let claimerATA: PublicKey | null = null;

    if (asset === "SOL") {
      // SOL decompression: Use LightSystemProgram
      const compressedAccounts = await rpc.getCompressedAccountsByOwner(recipientKeypair.publicKey);
      
      if (compressedAccounts.items.length === 0) {
        throw new Error("No compressed SOL found for this drop");
      }

      // Sum up available compressed lamports
      const totalCompressed = sumUpLamports(compressedAccounts.items);
      
      if (amountBN.gt(totalCompressed)) {
        throw new Error(`Insufficient compressed SOL. Available: ${totalCompressed.toString()}, Required: ${amountBN.toString()}`);
      }

      // Get validity proof
      const proof = await rpc.getValidityProof(
        compressedAccounts.items.map(account => bn(account.hash))
      );

      // For now, decompress the full amount to avoid output compressed account issues
      // TODO: Support partial decompression if needed
      const decompressAmount = amountBN.eq(totalCompressed) ? amountBN : totalCompressed;
      
      console.log(`[Light Protocol] Decompressing ${decompressAmount.toString()} lamports (requested: ${amountBN.toString()}, available: ${totalCompressed.toString()})`);

      // Build decompress instruction - but we need to modify it to use recipient keypair as authority
      // since the compressed accounts are owned by recipientKeypair, not payer
      decompressIx = await LightSystemProgram.decompress({
        payer: payerPubkey,
        toAddress: claimerPubkey,
        inputCompressedAccounts: compressedAccounts.items,
        recentValidityProof: proof.compressedProof,
        recentInputStateRootIndices: proof.rootIndices,
        lamports: decompressAmount,
      });
      
      // Modify the instruction to use recipient keypair as authority instead of payer
      // The authority account is at index 1 (after fee payer at index 0)
      decompressIx.keys[1] = {
        pubkey: recipientKeypair.publicKey,
        isSigner: true,
        isWritable: false,
      };

      computeUnits = 1_000_000; // SOL decompression needs more compute
    } else {
      // USDC decompression: Use CompressedTokenProgram
      const mintAddress = getAssetMint("usdc", "mainnet");
      if (!mintAddress) {
        throw new Error("USDC mint address not configured");
      }
      const mint = new PublicKey(mintAddress);

      // Get/create claimer's USDC ATA
      claimerATA = await getAssociatedTokenAddress(
        mint,
        claimerPubkey,
        true,
        TOKEN_PROGRAM_ID
      );

      // Check if claimer's ATA exists, if not we need to create it
      const claimerATAInfo = await connection.getAccountInfo(claimerATA);
      needsATACreation = !claimerATAInfo;
      
      if (needsATACreation) {
        console.log("[Light Protocol] Claimer ATA doesn't exist, will create it");
      }

      // Get compressed token accounts owned by recipient
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

      // Get validity proof
      const proof = await rpc.getValidityProofV0(
        inputAccounts.map(account => ({
          hash: account.compressedAccount.hash,
          tree: account.compressedAccount.treeInfo.tree,
          queue: account.compressedAccount.treeInfo.queue,
        }))
      );

      // Get token pool infos
      const tokenPoolInfos = await getTokenPoolInfos(rpc, mint);
      const selectedTokenPoolInfos = selectTokenPoolInfosForDecompression(
        tokenPoolInfos,
        amountBN
      );

      // Build decompress instruction
      decompressIx = await CompressedTokenProgram.decompress({
        payer: payerPubkey,
        inputCompressedTokenAccounts: inputAccounts,
        toAddress: claimerATA,
        amount: amountBN,
        tokenPoolInfos: selectedTokenPoolInfos,
        recentInputStateRootIndices: proof.rootIndices,
        recentValidityProof: proof.compressedProof,
      });

      // Fix: Force ALL accounts that start with 'smt' or 'nfq' (state trees/queues) to be writable
      // Also mark token pool and destination as writable
      // The Light System Program CPI needs these to be writable
      
      const programIds = new Set([
        "11111111111111111111111111111111", // System Program
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // Token Program  
        "SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7", // Light System Program
        "cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m", // Compressed Token Program
        "compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq", // Account Compression Program
        "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV", // Noop Program
      ]);
      
      // Force rebuild keys array with proper writable flags
      const newKeys = decompressIx.keys.map((key, index) => {
        const pubkeyStr = key.pubkey.toBase58();
        
        // Skip program IDs
        if (programIds.has(pubkeyStr)) {
          return key;
        }
        
        // Mark state trees (smt...) and queues (nfq...) as writable
        if (pubkeyStr.startsWith('smt') || pubkeyStr.startsWith('nfq')) {
          console.log(`[Light Protocol] Marking ${pubkeyStr.slice(0, 8)}... as writable (state tree/queue)`);
          return { pubkey: key.pubkey, isSigner: key.isSigner, isWritable: true };
        }
        
        // Mark accounts at index >= 9 as writable (token pool, destination, etc)
        if (index >= 9) {
          return { pubkey: key.pubkey, isSigner: key.isSigner, isWritable: true };
        }
        
        return key;
      });
      
      // Replace the keys
      decompressIx.keys = newKeys;
      
      console.log("[Light Protocol] Instruction has", decompressIx.keys.length, "accounts");
      console.log("[Light Protocol] Writable accounts:", decompressIx.keys.filter(k => k.isWritable).map(k => k.pubkey.toBase58().slice(0, 8) + '...'));

      computeUnits = 350_000;
    }

    // Build transaction with compute budget
    const { blockhash } = await connection.getLatestBlockhash();
    const tx = new Transaction();
    
    // Add compute budget (add extra for ATA creation if needed)
    const finalComputeUnits = asset === "USDC" && needsATACreation ? computeUnits + 50_000 : computeUnits;
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: finalComputeUnits }));
    
    // Create claimer's ATA if it doesn't exist (for USDC)
    if (asset === "USDC" && needsATACreation && claimerATA) {
      const mintAddress = getAssetMint("usdc", "mainnet");
      if (mintAddress) {
        const mint = new PublicKey(mintAddress);
        tx.add(
          createAssociatedTokenAccountInstruction(
            payerPubkey,
            claimerATA,
            claimerPubkey,
            mint,
            TOKEN_PROGRAM_ID
          )
        );
        console.log("[Light Protocol] Added ATA creation instruction");
      }
    }
    
    // Add on-chain nullifier verification if enabled
    if (useOnChainNullifier) {
      const markNullifierIx = createMarkNullifierUsedInstruction(
        NULLIFIER_REGISTRY_PROGRAM_ID,
        nullifier,
        payerPubkey
      );
      tx.add(markNullifierIx);
      console.log(`[Nullifier On-Chain] Added mark nullifier instruction to transaction`);
    }
    
    // Add decompression instruction
    tx.add(decompressIx);
    tx.recentBlockhash = blockhash;
    tx.feePayer = payerPubkey;

    // Check which accounts need to sign
    const requiredSigners = new Set<string>();
    decompressIx.keys.forEach(key => {
      if (key.isSigner) {
        requiredSigners.add(key.pubkey.toBase58());
      }
    });
    requiredSigners.add(payerPubkey.toBase58()); // Fee payer always signs
    
    console.log("[Light Protocol] Required signers:", Array.from(requiredSigners));
    console.log("[Light Protocol] Recipient pubkey:", recipientKeypair.publicKey.toBase58());
    console.log("[Light Protocol] Payer pubkey:", payerPubkey.toBase58());

    // Partially sign with recipient keypair if it's a required signer (it should be now since we set it as authority)
    if (requiredSigners.has(recipientKeypair.publicKey.toBase58())) {
      tx.partialSign(recipientKeypair);
      console.log("[Light Protocol] Successfully partially signed with recipient keypair (authority)");
    } else {
      console.warn("[Light Protocol] WARNING: Recipient keypair is not a required signer, but it should be!");
    }

    // Send transaction - wallet adapter will add its signature
    const decompressSignature = await sendTransactionFn(tx);
    
    // Wait for confirmation
    await connection.confirmTransaction(decompressSignature, "confirmed");
    
    // Mark nullifier as used after successful decompression
    if (useOnChainNullifier) {
      // On-chain marking already happened in the transaction
      console.log(`[Nullifier On-Chain] Nullifier marked as used on-chain in transaction`);
    } else {
      // Fallback to client-side marking
      const registry = getNullifierRegistry();
      await registry.markUsed(nullifier, decompressSignature);
      console.log(`[Nullifier] Marked nullifier as used after successful decompression`);
    }
    
    return decompressSignature;
  } catch (error: any) {
    console.error("[Light Protocol] Decompress failed:", error);
    
    // Try to extract more details from the error
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error?.logs) {
      console.error("[Light Protocol] Transaction logs:", error.logs);
      errorMessage = error.logs.join('\n');
    } else if (error?.InstructionError) {
      console.error("[Light Protocol] Instruction error:", JSON.stringify(error.InstructionError));
      errorMessage = `Instruction ${error.InstructionError[0]} failed: ${JSON.stringify(error.InstructionError[1])}`;
    } else if (typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }
    
    throw new Error(`Light Protocol decompression failed: ${errorMessage}`);
  }
}

