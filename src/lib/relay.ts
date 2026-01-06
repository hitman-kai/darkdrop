import { Connection, Keypair, PublicKey, Transaction, ComputeBudgetProgram } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import { LightSystemProgram } from "@lightprotocol/stateless.js";
import { CompressedTokenProgram, getTokenPoolInfos, selectTokenPoolInfosForDecompression } from "@lightprotocol/compressed-token";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { storeFeeRecord } from "./fee-storage";

// Server-safe function to get USDC mint (tokens.ts is client-only)
function getUsdcMint(): string | null {
  return process.env.NEXT_PUBLIC_USDC_MAINNET_MINT || 
         process.env.NEXT_PUBLIC_CUSDC_MAINNET_MINT || 
         null;
}

export const RELAYER_FEE_PERCENT = 1; // 1% fee - collected as compressed change for later sweep

interface RelayedClaimParams {
  connection: Connection;
  recipientKeypair: Keypair;
  destinationPubkey: PublicKey;
  relayerKeypair: Keypair;
  asset: "SOL" | "USDC";
}

interface RelayedClaimResult {
  signature: string;
  amountReceived: number;
  feePaid: number;
  asset: "SOL" | "USDC";
}

export async function executeRelayedClaim(params: RelayedClaimParams): Promise<RelayedClaimResult> {
  const { 
    connection, 
    recipientKeypair, 
    destinationPubkey, 
    relayerKeypair, 
    asset,
  } = params;
  
  console.log("[Relayer] Starting relayed claim for", asset);
  console.log("[Relayer] Recipient (compressed owner):", recipientKeypair.publicKey.toBase58());
  console.log("[Relayer] Destination:", destinationPubkey.toBase58());
  console.log("[Relayer] Relayer (fee payer):", relayerKeypair.publicKey.toBase58());
  
  // Create RPC for Light Protocol - need to use compression-enabled endpoint
  const compressionApiEndpoint = process.env.NEXT_PUBLIC_LIGHT_COMPRESSION_API;
  console.log("[Relayer] Using compression API:", compressionApiEndpoint || "default");
  const rpc = compressionApiEndpoint 
    ? createRpc(connection, compressionApiEndpoint)
    : createRpc(connection);
  
  if (asset === "SOL") {
    return executeRelayedSolClaim(rpc, connection, recipientKeypair, destinationPubkey, relayerKeypair);
  } else {
    return executeRelayedUsdcClaim(rpc, connection, recipientKeypair, destinationPubkey, relayerKeypair);
  }
}

async function executeRelayedSolClaim(
  rpc: ReturnType<typeof createRpc>,
  connection: Connection,
  recipientKeypair: Keypair,
  destinationPubkey: PublicKey,
  relayerKeypair: Keypair
): Promise<RelayedClaimResult> {
  // 1. Get compressed SOL accounts
  const compressedAccounts = await rpc.getCompressedAccountsByOwner(recipientKeypair.publicKey);
  
  if (!compressedAccounts.items || compressedAccounts.items.length === 0) {
    throw new Error("No compressed SOL found for this claim code");
  }
  
  // 2. Calculate total and fee
  const totalLamports = compressedAccounts.items.reduce(
    (sum, acc) => sum + BigInt(String(acc.lamports || 0)), 
    BigInt(0)
  );
  
  const feeLamports = (totalLamports * BigInt(RELAYER_FEE_PERCENT)) / BigInt(100);
  const amountToSend = totalLamports - feeLamports;
  
  console.log("[Relayer] Total compressed:", totalLamports.toString(), "lamports");
  console.log("[Relayer] Fee (1%):", feeLamports.toString(), "lamports (stays as compressed change)");
  console.log("[Relayer] Amount to destination:", amountToSend.toString(), "lamports");
  
  // 3. Get validity proof
  const proof = await rpc.getValidityProof(
    compressedAccounts.items.map(account => bn(account.hash))
  );
  
  console.log("[Relayer] Got validity proof with", proof.rootIndices?.length || 0, "root indices");
  
  // 4. Build decompress instruction - decompress (total - fee) to destination
  // The fee stays as compressed SOL owned by recipient keypair (relayer can sweep later)
  const decompressIx = await LightSystemProgram.decompress({
    payer: relayerKeypair.publicKey,
    inputCompressedAccounts: compressedAccounts.items,
    toAddress: destinationPubkey,
    lamports: bn(amountToSend.toString()), // Only send amount minus fee
    recentValidityProof: proof.compressedProof,
    recentInputStateRootIndices: proof.rootIndices,
  });
  
  // Modify the instruction to use recipient keypair as authority instead of payer
  decompressIx.keys[1] = {
    pubkey: recipientKeypair.publicKey,
    isSigner: true,
    isWritable: false,
  };
  
  console.log("[Relayer] Decompress to destination, fee stays compressed");
  
  // 5. Build transaction
  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }));
  tx.add(decompressIx);
  tx.recentBlockhash = blockhash;
  tx.feePayer = relayerKeypair.publicKey;
  
  // 6. Sign with both keypairs
  tx.sign(relayerKeypair, recipientKeypair);
  
  // 7. Send and confirm
  console.log("[Relayer] Sending transaction...");
  const signature = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(signature, "confirmed");
  console.log("[Relayer] Transaction confirmed:", signature);
  
  // Store fee for manual sweep (SOL state tree updates are slow, auto-sweep unreliable)
  if (feeLamports > BigInt(0)) {
    storeFeeRecord(
      recipientKeypair.secretKey,
      recipientKeypair.publicKey.toBase58(),
      "SOL",
      feeLamports,
      signature
    );
    console.log("[Relayer] SOL fee stored for manual sweep:", feeLamports.toString(), "lamports");
  }
  
  return {
    signature,
    amountReceived: Number(amountToSend),
    feePaid: Number(feeLamports),
    asset: "SOL",
  };
}

async function executeRelayedUsdcClaim(
  rpc: ReturnType<typeof createRpc>,
  connection: Connection,
  recipientKeypair: Keypair,
  destinationPubkey: PublicKey,
  relayerKeypair: Keypair
): Promise<RelayedClaimResult> {
  // 1. Get USDC mint (using server-safe function)
  const mintAddress = getUsdcMint();
  if (!mintAddress) {
    throw new Error("USDC mint not configured - set NEXT_PUBLIC_USDC_MAINNET_MINT");
  }
  console.log("[Relayer] Using USDC mint:", mintAddress);
  const mint = new PublicKey(mintAddress);
  
  // 2. Get compressed token accounts
  const compressedTokenAccounts = await rpc.getCompressedTokenAccountsByOwner(
    recipientKeypair.publicKey,
    { mint }
  );
  
  if (!compressedTokenAccounts.items || compressedTokenAccounts.items.length === 0) {
    throw new Error("No compressed USDC found for this claim code");
  }
  
  // 3. Calculate total and fee
  const totalAmount = compressedTokenAccounts.items.reduce(
    (sum, acc) => sum + BigInt(String(acc.parsed.amount)),
    BigInt(0)
  );
  
  const feeAmount = (totalAmount * BigInt(RELAYER_FEE_PERCENT)) / BigInt(100);
  const amountToSend = totalAmount - feeAmount;
  
  console.log("[Relayer] Total compressed USDC:", totalAmount.toString());
  console.log("[Relayer] Fee (1%):", feeAmount.toString(), "(stays as compressed change)");
  console.log("[Relayer] Amount to destination:", amountToSend.toString());
  
  // 4. Get destination ATA
  const destinationAta = await getAssociatedTokenAddress(mint, destinationPubkey);
  const destinationAtaInfo = await connection.getAccountInfo(destinationAta);
  
  console.log("[Relayer] Destination ATA:", destinationAta.toBase58());
  
  // 5. Create destination ATA if needed (in separate transaction to avoid conflicts)
  if (!destinationAtaInfo) {
    console.log("[Relayer] Creating destination ATA in separate transaction...");
    const { blockhash: ataBlockhash } = await connection.getLatestBlockhash();
    const ataTx = new Transaction();
    ataTx.add(
      createAssociatedTokenAccountInstruction(
        relayerKeypair.publicKey,
        destinationAta,
        destinationPubkey,
        mint,
        TOKEN_PROGRAM_ID
      )
    );
    ataTx.recentBlockhash = ataBlockhash;
    ataTx.feePayer = relayerKeypair.publicKey;
    ataTx.sign(relayerKeypair);
    
    const ataSig = await connection.sendRawTransaction(ataTx.serialize());
    await connection.confirmTransaction(ataSig, "finalized");
    console.log("[Relayer] ATA created:", ataSig);
  }
  
  // 6. Get validity proof - match drop.ts format (nested structure)
  const inputAccounts = compressedTokenAccounts.items;
  const proof = await rpc.getValidityProofV0(
    inputAccounts.map((acc) => ({
      hash: acc.compressedAccount.hash,
      tree: acc.compressedAccount.treeInfo.tree,
      queue: acc.compressedAccount.treeInfo.queue,
    }))
  );
  
  console.log("[Relayer] Got validity proof with", proof.rootIndices?.length || 0, "root indices");
  
  // 7. Get token pool infos (required for USDC decompression)
  const tokenPoolInfos = await getTokenPoolInfos(rpc, mint);
  const selectedTokenPoolInfos = selectTokenPoolInfosForDecompression(
    tokenPoolInfos,
    amountToSend // Use amount to send for pool selection
  );
  
  console.log("[Relayer] Got", tokenPoolInfos.length, "token pools, selected", selectedTokenPoolInfos.length);
  
  // 8. Build decompress instruction - decompress (total - fee) to destination
  // The fee stays as compressed USDC owned by recipient keypair (relayer can sweep later)
  const decompressIx = await CompressedTokenProgram.decompress({
    payer: relayerKeypair.publicKey,
    inputCompressedTokenAccounts: inputAccounts,
    toAddress: destinationAta,
    amount: bn(amountToSend.toString()), // Only send amount minus fee
    tokenPoolInfos: selectedTokenPoolInfos,
    recentValidityProof: proof.compressedProof,
    recentInputStateRootIndices: proof.rootIndices,
  });
  
  // Modify the instruction to use recipient keypair as authority
  decompressIx.keys[1] = {
    pubkey: recipientKeypair.publicKey,
    isSigner: true,
    isWritable: false,
  };
  
  console.log("[Relayer] Decompress to destination, fee stays compressed");
  
  // 9. Build transaction
  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
  tx.add(decompressIx);
  tx.recentBlockhash = blockhash;
  tx.feePayer = relayerKeypair.publicKey;
  
  // 10. Sign with both keypairs
  tx.sign(relayerKeypair, recipientKeypair);
  
  // 11. Send and confirm
  console.log("[Relayer] Sending decompress transaction...");
  const signature = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(signature, "confirmed");
  console.log("[Relayer] Transaction confirmed:", signature);
  
  // Immediately sweep the fee to relayer in a second transaction
  if (feeAmount > BigInt(0)) {
    try {
      console.log("[Relayer] Waiting for state tree to update...");
      
      // Wait for state tree to sync after TX1 (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log("[Relayer] Sweeping USDC fee to relayer wallet...");
      
      // Get the new compressed token account (the change/fee)
      const feeAccounts = await rpc.getCompressedTokenAccountsByOwner(
        recipientKeypair.publicKey,
        { mint }
      );
      
      if (feeAccounts.items && feeAccounts.items.length > 0) {
        const feeTotal = feeAccounts.items.reduce(
          (sum, acc) => sum + BigInt(String(acc.parsed.amount)),
          BigInt(0)
        );
        
        if (feeTotal > BigInt(0)) {
          // Get relayer's USDC ATA
          const relayerAta = await getAssociatedTokenAddress(mint, relayerKeypair.publicKey);
          const relayerAtaInfo = await connection.getAccountInfo(relayerAta);
          
          // Create relayer ATA if needed
          if (!relayerAtaInfo) {
            const { blockhash: ataBlockhash } = await connection.getLatestBlockhash();
            const ataTx = new Transaction();
            ataTx.add(
              createAssociatedTokenAccountInstruction(
                relayerKeypair.publicKey,
                relayerAta,
                relayerKeypair.publicKey,
                mint,
                TOKEN_PROGRAM_ID
              )
            );
            ataTx.recentBlockhash = ataBlockhash;
            ataTx.feePayer = relayerKeypair.publicKey;
            ataTx.sign(relayerKeypair);
            
            const ataSig = await connection.sendRawTransaction(ataTx.serialize());
            await connection.confirmTransaction(ataSig, "finalized");
            console.log("[Relayer] Created relayer USDC ATA");
          }
          
          // Get new validity proof for fee accounts
          const feeProof = await rpc.getValidityProofV0(
            feeAccounts.items.map((acc) => ({
              hash: acc.compressedAccount.hash,
              tree: acc.compressedAccount.treeInfo.tree,
              queue: acc.compressedAccount.treeInfo.queue,
            }))
          );
          
          // Get token pool infos
          const feePoolInfos = await getTokenPoolInfos(rpc, mint);
          const selectedFeePoolInfos = selectTokenPoolInfosForDecompression(feePoolInfos, feeTotal);
          
          // Decompress fee to relayer's ATA
          const sweepIx = await CompressedTokenProgram.decompress({
            payer: relayerKeypair.publicKey,
            inputCompressedTokenAccounts: feeAccounts.items,
            toAddress: relayerAta,
            amount: bn(feeTotal.toString()),
            tokenPoolInfos: selectedFeePoolInfos,
            recentValidityProof: feeProof.compressedProof,
            recentInputStateRootIndices: feeProof.rootIndices,
          });
          
          sweepIx.keys[1] = {
            pubkey: recipientKeypair.publicKey,
            isSigner: true,
            isWritable: false,
          };
          
          const { blockhash: sweepBlockhash } = await connection.getLatestBlockhash();
          const sweepTx = new Transaction();
          sweepTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
          sweepTx.add(sweepIx);
          sweepTx.recentBlockhash = sweepBlockhash;
          sweepTx.feePayer = relayerKeypair.publicKey;
          sweepTx.sign(relayerKeypair, recipientKeypair);
          
          const sweepSig = await connection.sendRawTransaction(sweepTx.serialize());
          await connection.confirmTransaction(sweepSig, "confirmed");
          
          console.log("[Relayer] USDC fee swept to relayer:", sweepSig);
          console.log("[Relayer] USDC fee collected:", feeTotal.toString(), "atomic units");
        }
      }
    } catch (sweepError) {
      // If sweep fails, store for later collection
      console.error("[Relayer] Auto-sweep failed, storing for later:", sweepError);
      storeFeeRecord(
        recipientKeypair.secretKey,
        recipientKeypair.publicKey.toBase58(),
        "USDC",
        feeAmount,
        signature
      );
    }
  }
  
  return {
    signature,
    amountReceived: Number(amountToSend),
    feePaid: Number(feeAmount),
    asset: "USDC",
  };
}

// Utility to check relayer balance
export async function getRelayerBalance(connection: Connection, relayerPubkey: PublicKey): Promise<number> {
  const balance = await connection.getBalance(relayerPubkey);
  return balance;
}

