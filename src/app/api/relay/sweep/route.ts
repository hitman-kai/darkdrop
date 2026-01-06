import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey, Transaction, ComputeBudgetProgram } from "@solana/web3.js";
import { createRpc, bn, LightSystemProgram } from "@lightprotocol/stateless.js";
import { CompressedTokenProgram, getTokenPoolInfos, selectTokenPoolInfosForDecompression } from "@lightprotocol/compressed-token";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getUnsweptFees, markFeesSwept, getFeeStats } from "@/lib/fee-storage";
import bs58 from "bs58";

// Sweep all accumulated fees to relayer wallet (protected endpoint)
export async function POST(req: NextRequest) {
  try {
    // Verify API key - only relayer owner can sweep
    const apiKey = req.headers.get("x-api-key");
    const sweepApiKey = process.env.SWEEP_API_KEY;
    
    if (!sweepApiKey) {
      return NextResponse.json({ error: "SWEEP_API_KEY not configured" }, { status: 500 });
    }
    
    if (apiKey !== sweepApiKey) {
      return NextResponse.json({ error: "Unauthorized - invalid API key" }, { status: 401 });
    }
    
    // Load relayer keypair (supports both base58 and JSON array formats)
    const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerPrivateKey) {
      return NextResponse.json({ error: "RELAYER_PRIVATE_KEY not configured" }, { status: 500 });
    }
    
    let relayerKeypair: Keypair;
    try {
      // Try JSON array format first
      relayerKeypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(relayerPrivateKey))
      );
    } catch {
      // Fall back to base58 format
      relayerKeypair = Keypair.fromSecretKey(bs58.decode(relayerPrivateKey));
    }
    
    // Setup connection
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC!;
    const compressionApi = process.env.NEXT_PUBLIC_LIGHT_COMPRESSION_API || rpcUrl;
    const connection = new Connection(rpcUrl);
    const rpc = createRpc(rpcUrl, compressionApi);
    
    // Get unswept fees
    const unsweptFees = getUnsweptFees();
    
    if (unsweptFees.length === 0) {
      return NextResponse.json({ 
        message: "No fees to sweep",
        stats: getFeeStats()
      });
    }
    
    console.log("[Sweep] Found", unsweptFees.length, "unswept fee records");
    
    const results: { pubkey: string; asset: string; amount: string; signature?: string; error?: string }[] = [];
    const sweptPubkeys: string[] = [];
    
    for (const fee of unsweptFees) {
      try {
        const recipientKeypair = Keypair.fromSecretKey(Uint8Array.from(fee.recipientSecretKey));
        
        if (fee.asset === "SOL") {
          // Sweep compressed SOL
          const compressedAccounts = await rpc.getCompressedAccountsByOwner(recipientKeypair.publicKey);
          
          if (!compressedAccounts.items || compressedAccounts.items.length === 0) {
            results.push({ 
              pubkey: fee.recipientPubkey, 
              asset: "SOL", 
              amount: "0",
              error: "No compressed SOL found" 
            });
            sweptPubkeys.push(fee.recipientPubkey); // Mark as swept anyway
            continue;
          }
          
          const totalLamports = compressedAccounts.items.reduce(
            (sum, acc) => sum + BigInt(String(acc.lamports || 0)),
            BigInt(0)
          );
          
          if (totalLamports === BigInt(0)) {
            results.push({ 
              pubkey: fee.recipientPubkey, 
              asset: "SOL", 
              amount: "0",
              error: "Zero balance" 
            });
            sweptPubkeys.push(fee.recipientPubkey);
            continue;
          }
          
          // Get validity proof
          const proof = await rpc.getValidityProof(
            compressedAccounts.items.map(acc => bn(acc.hash))
          );
          
          // Build decompress to relayer
          const decompressIx = await LightSystemProgram.decompress({
            payer: relayerKeypair.publicKey,
            inputCompressedAccounts: compressedAccounts.items,
            toAddress: relayerKeypair.publicKey,
            lamports: bn(totalLamports.toString()),
            recentValidityProof: proof.compressedProof,
            recentInputStateRootIndices: proof.rootIndices,
          });
          
          // Set recipient as authority
          decompressIx.keys[1] = {
            pubkey: recipientKeypair.publicKey,
            isSigner: true,
            isWritable: false,
          };
          
          // Build and send transaction
          const { blockhash } = await connection.getLatestBlockhash();
          const tx = new Transaction();
          tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }));
          tx.add(decompressIx);
          tx.recentBlockhash = blockhash;
          tx.feePayer = relayerKeypair.publicKey;
          tx.sign(relayerKeypair, recipientKeypair);
          
          const signature = await connection.sendRawTransaction(tx.serialize());
          await connection.confirmTransaction(signature, "confirmed");
          
          results.push({
            pubkey: fee.recipientPubkey,
            asset: "SOL",
            amount: totalLamports.toString(),
            signature,
          });
          sweptPubkeys.push(fee.recipientPubkey);
          
          console.log("[Sweep] Swept", totalLamports.toString(), "lamports SOL from", fee.recipientPubkey);
          
        } else {
          // Sweep compressed USDC
          const usdcMint = process.env.NEXT_PUBLIC_USDC_MAINNET_MINT;
          if (!usdcMint) {
            results.push({ 
              pubkey: fee.recipientPubkey, 
              asset: "USDC", 
              amount: "0",
              error: "USDC mint not configured" 
            });
            continue;
          }
          
          const mint = new PublicKey(usdcMint);
          const compressedAccounts = await rpc.getCompressedTokenAccountsByOwner(
            recipientKeypair.publicKey,
            { mint }
          );
          
          if (!compressedAccounts.items || compressedAccounts.items.length === 0) {
            results.push({ 
              pubkey: fee.recipientPubkey, 
              asset: "USDC", 
              amount: "0",
              error: "No compressed USDC found" 
            });
            sweptPubkeys.push(fee.recipientPubkey);
            continue;
          }
          
          const totalAmount = compressedAccounts.items.reduce(
            (sum, acc) => sum + BigInt(String(acc.parsed.amount)),
            BigInt(0)
          );
          
          if (totalAmount === BigInt(0)) {
            results.push({ 
              pubkey: fee.recipientPubkey, 
              asset: "USDC", 
              amount: "0",
              error: "Zero balance" 
            });
            sweptPubkeys.push(fee.recipientPubkey);
            continue;
          }
          
          // Get relayer's USDC ATA
          const relayerAta = await getAssociatedTokenAddress(mint, relayerKeypair.publicKey);
          const ataInfo = await connection.getAccountInfo(relayerAta);
          
          // Create ATA if needed
          if (!ataInfo) {
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
          }
          
          // Get validity proof
          const proof = await rpc.getValidityProofV0(
            compressedAccounts.items.map((acc) => ({
              hash: acc.compressedAccount.hash,
              tree: acc.compressedAccount.treeInfo.tree,
              queue: acc.compressedAccount.treeInfo.queue,
            }))
          );
          
          // Get token pool infos
          const tokenPoolInfos = await getTokenPoolInfos(rpc, mint);
          const selectedTokenPoolInfos = selectTokenPoolInfosForDecompression(
            tokenPoolInfos,
            bn(totalAmount.toString())
          );
          
          // Build decompress to relayer's ATA
          const decompressIx = await CompressedTokenProgram.decompress({
            payer: relayerKeypair.publicKey,
            inputCompressedTokenAccounts: compressedAccounts.items,
            toAddress: relayerAta,
            amount: bn(totalAmount.toString()),
            tokenPoolInfos: selectedTokenPoolInfos,
            recentValidityProof: proof.compressedProof,
            recentInputStateRootIndices: proof.rootIndices,
          });
          
          // Set recipient as authority
          decompressIx.keys[1] = {
            pubkey: recipientKeypair.publicKey,
            isSigner: true,
            isWritable: false,
          };
          
          // Build and send transaction
          const { blockhash } = await connection.getLatestBlockhash();
          const tx = new Transaction();
          tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
          tx.add(decompressIx);
          tx.recentBlockhash = blockhash;
          tx.feePayer = relayerKeypair.publicKey;
          tx.sign(relayerKeypair, recipientKeypair);
          
          const signature = await connection.sendRawTransaction(tx.serialize());
          await connection.confirmTransaction(signature, "confirmed");
          
          results.push({
            pubkey: fee.recipientPubkey,
            asset: "USDC",
            amount: totalAmount.toString(),
            signature,
          });
          sweptPubkeys.push(fee.recipientPubkey);
          
          console.log("[Sweep] Swept", totalAmount.toString(), "atomic USDC from", fee.recipientPubkey);
        }
        
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({
          pubkey: fee.recipientPubkey,
          asset: fee.asset,
          amount: fee.expectedFee,
          error: message,
        });
        console.error("[Sweep] Error sweeping", fee.recipientPubkey, ":", message);
      }
    }
    
    // Mark swept fees
    if (sweptPubkeys.length > 0) {
      markFeesSwept(sweptPubkeys);
    }
    
    return NextResponse.json({
      message: `Swept ${sweptPubkeys.length} of ${unsweptFees.length} fee records`,
      results,
      stats: getFeeStats(),
    });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Sweep] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - just show stats
export async function GET() {
  const stats = getFeeStats();
  const unswept = getUnsweptFees();
  
  return NextResponse.json({
    stats: {
      pending: {
        sol: {
          lamports: stats.totalPending.sol,
          sol: (Number(stats.totalPending.sol) / 1e9).toFixed(9),
        },
        usdc: {
          atomicUnits: stats.totalPending.usdc,
          usdc: (Number(stats.totalPending.usdc) / 1e6).toFixed(6),
        },
        count: stats.pendingCount,
      },
      swept: {
        sol: {
          lamports: stats.totalSwept.sol,
          sol: (Number(stats.totalSwept.sol) / 1e9).toFixed(9),
        },
        usdc: {
          atomicUnits: stats.totalSwept.usdc,
          usdc: (Number(stats.totalSwept.usdc) / 1e6).toFixed(6),
        },
        count: stats.sweptCount,
      },
    },
    pendingFees: unswept.map(f => ({
      pubkey: f.recipientPubkey,
      asset: f.asset,
      expectedFee: f.expectedFee,
      timestamp: new Date(f.timestamp).toISOString(),
    })),
  });
}

