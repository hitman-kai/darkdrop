import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { createRpc } from "@lightprotocol/stateless.js";

// Check compressed balances for fee collection
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pubkeyParam = searchParams.get("pubkey");
    
    if (!pubkeyParam) {
      return NextResponse.json({ 
        error: "Missing pubkey parameter. Use ?pubkey=<recipient_pubkey>" 
      }, { status: 400 });
    }
    
    const pubkey = new PublicKey(pubkeyParam);
    
    // Create RPC connection
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC!;
    const compressionApi = process.env.NEXT_PUBLIC_LIGHT_COMPRESSION_API || rpcUrl;
    const rpc = createRpc(rpcUrl, compressionApi);
    
    // Get compressed SOL accounts
    const compressedSolAccounts = await rpc.getCompressedAccountsByOwner(pubkey);
    
    let totalCompressedSol = BigInt(0);
    const solAccounts: { hash: string; lamports: string }[] = [];
    
    if (compressedSolAccounts.items) {
      for (const acc of compressedSolAccounts.items) {
        const lamports = BigInt(String(acc.lamports || 0));
        totalCompressedSol += lamports;
        solAccounts.push({
          hash: acc.hash.toString(),
          lamports: lamports.toString(),
        });
      }
    }
    
    // Get compressed USDC accounts
    const usdcMint = process.env.NEXT_PUBLIC_USDC_MAINNET_MINT;
    let totalCompressedUsdc = BigInt(0);
    const usdcAccounts: { hash: string; amount: string }[] = [];
    
    if (usdcMint) {
      try {
        const compressedUsdcAccounts = await rpc.getCompressedTokenAccountsByOwner(
          pubkey,
          { mint: new PublicKey(usdcMint) }
        );
        
        if (compressedUsdcAccounts.items) {
          for (const acc of compressedUsdcAccounts.items) {
            const amount = BigInt(String(acc.parsed.amount));
            totalCompressedUsdc += amount;
            usdcAccounts.push({
              hash: acc.compressedAccount.hash.toString(),
              amount: amount.toString(),
            });
          }
        }
      } catch (e) {
        // No USDC accounts
      }
    }
    
    return NextResponse.json({
      pubkey: pubkey.toBase58(),
      fees: {
        sol: {
          totalLamports: totalCompressedSol.toString(),
          totalSol: (Number(totalCompressedSol) / 1e9).toFixed(9),
          accounts: solAccounts.length,
        },
        usdc: {
          totalAtomicUnits: totalCompressedUsdc.toString(),
          totalUsdc: (Number(totalCompressedUsdc) / 1e6).toFixed(6),
          accounts: usdcAccounts.length,
        },
      },
    });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Fees API] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

