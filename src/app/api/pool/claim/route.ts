import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey, Transaction, ComputeBudgetProgram } from "@solana/web3.js";
import { createRpc, bn, LightSystemProgram } from "@lightprotocol/stateless.js";
import { 
  CompressedTokenProgram, 
  getTokenPoolInfos, 
  selectTokenPoolInfosForDecompression 
} from "@lightprotocol/compressed-token";
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction, 
  TOKEN_PROGRAM_ID 
} from "@solana/spl-token";
import bs58 from "bs58";
import {
  verifyPoolClaimCode,
  calculatePoolFee,
  POOL_CONFIG,
} from "@/lib/pool";
import {
  getPoolDeposit,
  markPoolDepositClaimed,
  getPoolKeypairBase58,
  isPoolConfigured,
} from "@/lib/pool-storage";

/**
 * POST /api/pool/claim
 * 
 * Request body:
 * {
 *   claimCode: string,       // darkpool:v1:mainnet:sol:1:SECRET
 *   destination: string      // Recipient wallet address
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   signature: string,
 *   amountReceived: string,
 *   fee: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check configuration
    if (!isPoolConfigured()) {
      return NextResponse.json(
        { error: "DarkPool not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { claimCode, destination } = body;

    // Validate required fields
    if (!claimCode || !destination) {
      return NextResponse.json(
        { error: "Missing required fields: claimCode, destination" },
        { status: 400 }
      );
    }

    // Parse and verify claim code
    let claimInfo;
    try {
      claimInfo = verifyPoolClaimCode(claimCode);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid claim code";
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    const { nullifier, amount, asset } = claimInfo;

    // Verify destination is valid pubkey
    let destinationPubkey: PublicKey;
    try {
      destinationPubkey = new PublicKey(destination);
    } catch {
      return NextResponse.json(
        { error: "Invalid destination address" },
        { status: 400 }
      );
    }

    // Check if deposit exists and is not claimed
    const deposit = await getPoolDeposit(nullifier);
    
    if (!deposit) {
      return NextResponse.json(
        { error: "Invalid claim code. Deposit not found." },
        { status: 404 }
      );
    }

    if (deposit.claimedAt) {
      return NextResponse.json(
        { error: "Already claimed", claimTx: deposit.claimTx },
        { status: 400 }
      );
    }

    // Verify amount matches (prevent tampering)
    if (deposit.amount !== amount || deposit.asset !== asset) {
      return NextResponse.json(
        { error: "Claim code mismatch" },
        { status: 400 }
      );
    }

    console.log("[Pool Claim] Processing claim:", {
      nullifier: nullifier.slice(0, 8) + "...",
      amount,
      asset,
      destination: destination.slice(0, 8) + "...",
    });

    // Get pool keypair
    const poolKeypairB58 = getPoolKeypairBase58();
    if (!poolKeypairB58) {
      return NextResponse.json(
        { error: "Pool keypair not configured" },
        { status: 503 }
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decode = (bs58 as any).decode || (bs58 as any).default?.decode;
    if (!decode) throw new Error("bs58 decode not available");
    const poolKeypair = Keypair.fromSecretKey(decode(poolKeypairB58.trim()));

    // Setup RPC connection
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC || "https://api.mainnet-beta.solana.com";
    const compressionApi = process.env.NEXT_PUBLIC_LIGHT_COMPRESSION_API;
    const connection = new Connection(rpcUrl, "confirmed");
    const rpc = compressionApi 
      ? createRpc(connection, compressionApi)
      : createRpc(connection);

    // Calculate fee
    const { fee, net } = calculatePoolFee(amount, asset);
    console.log("[Pool Claim] Amount:", amount, "Fee:", fee, "Net:", net);

    // Execute claim based on asset type
    let signature: string;
    
    if (asset === "sol") {
      signature = await executePoolSolClaim(
        rpc,
        connection,
        poolKeypair,
        destinationPubkey,
        net,
        amount
      );
    } else {
      signature = await executePoolUsdcClaim(
        rpc,
        connection,
        poolKeypair,
        destinationPubkey,
        net,
        amount
      );
    }

    // Mark as claimed in database
    await markPoolDepositClaimed(nullifier, signature, destination);

    console.log("[Pool Claim] Claim successful:", signature);

    return NextResponse.json({
      success: true,
      signature,
      amountReceived: net,
      fee,
      asset,
    });

  } catch (error) {
    console.error("[Pool Claim] Error:", error);
    const message = error instanceof Error ? error.message : "Claim failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * Execute SOL claim from pool
 */
async function executePoolSolClaim(
  rpc: ReturnType<typeof createRpc>,
  connection: Connection,
  poolKeypair: Keypair,
  destination: PublicKey,
  netAmount: string,
  grossAmount: string
): Promise<string> {
  // Get compressed SOL accounts owned by pool
  const compressedAccounts = await rpc.getCompressedAccountsByOwner(poolKeypair.publicKey);
  
  if (!compressedAccounts.items || compressedAccounts.items.length === 0) {
    throw new Error("Pool has no compressed SOL. Insufficient balance.");
  }

  // Calculate required lamports
  const netLamports = BigInt(Math.floor(parseFloat(netAmount) * 1e9));
  
  // Sum available balance
  const totalAvailable = compressedAccounts.items.reduce(
    (sum, acc) => sum + BigInt(String(acc.lamports || 0)),
    BigInt(0)
  );

  if (totalAvailable < netLamports) {
    throw new Error(`Insufficient pool balance. Available: ${totalAvailable}, Required: ${netLamports}`);
  }

  // Get validity proof
  const proof = await rpc.getValidityProof(
    compressedAccounts.items.map(account => bn(account.hash))
  );

  // Build decompress instruction
  const decompressIx = await LightSystemProgram.decompress({
    payer: poolKeypair.publicKey,
    inputCompressedAccounts: compressedAccounts.items,
    toAddress: destination,
    lamports: bn(netLamports.toString()),
    recentValidityProof: proof.compressedProof,
    recentInputStateRootIndices: proof.rootIndices,
  });

  // Build and sign transaction
  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }));
  tx.add(decompressIx);
  tx.recentBlockhash = blockhash;
  tx.feePayer = poolKeypair.publicKey;
  tx.sign(poolKeypair);

  // Send and confirm
  const signature = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(signature, "confirmed");

  return signature;
}

/**
 * Execute USDC claim from pool
 */
async function executePoolUsdcClaim(
  rpc: ReturnType<typeof createRpc>,
  connection: Connection,
  poolKeypair: Keypair,
  destination: PublicKey,
  netAmount: string,
  grossAmount: string
): Promise<string> {
  // Get USDC mint
  const mintAddress = process.env.NEXT_PUBLIC_USDC_MAINNET_MINT || 
                      process.env.NEXT_PUBLIC_CUSDC_MAINNET_MINT;
  if (!mintAddress) {
    throw new Error("USDC mint not configured");
  }
  const mint = new PublicKey(mintAddress);

  // Get compressed USDC accounts owned by pool
  const compressedTokenAccounts = await rpc.getCompressedTokenAccountsByOwner(
    poolKeypair.publicKey,
    { mint }
  );

  if (!compressedTokenAccounts.items || compressedTokenAccounts.items.length === 0) {
    throw new Error("Pool has no compressed USDC. Insufficient balance.");
  }

  // Calculate required amount (6 decimals for USDC)
  const netAtomicUnits = BigInt(Math.floor(parseFloat(netAmount) * 1e6));

  // Sum available balance
  const totalAvailable = compressedTokenAccounts.items.reduce(
    (sum, acc) => sum + BigInt(String(acc.parsed.amount)),
    BigInt(0)
  );

  if (totalAvailable < netAtomicUnits) {
    throw new Error(`Insufficient pool USDC. Available: ${totalAvailable}, Required: ${netAtomicUnits}`);
  }

  // Get or create destination ATA
  const destinationAta = await getAssociatedTokenAddress(mint, destination);
  const ataInfo = await connection.getAccountInfo(destinationAta);

  if (!ataInfo) {
    // Create ATA first
    const { blockhash: ataBlockhash } = await connection.getLatestBlockhash();
    const ataTx = new Transaction();
    ataTx.add(
      createAssociatedTokenAccountInstruction(
        poolKeypair.publicKey,
        destinationAta,
        destination,
        mint,
        TOKEN_PROGRAM_ID
      )
    );
    ataTx.recentBlockhash = ataBlockhash;
    ataTx.feePayer = poolKeypair.publicKey;
    ataTx.sign(poolKeypair);

    const ataSig = await connection.sendRawTransaction(ataTx.serialize());
    await connection.confirmTransaction(ataSig, "finalized");
    console.log("[Pool Claim] Created destination ATA:", ataSig);
  }

  // Get validity proof
  const inputAccounts = compressedTokenAccounts.items;
  const proof = await rpc.getValidityProofV0(
    inputAccounts.map((acc) => ({
      hash: acc.compressedAccount.hash,
      tree: acc.compressedAccount.treeInfo.tree,
      queue: acc.compressedAccount.treeInfo.queue,
    }))
  );

  // Get token pool infos
  const tokenPoolInfos = await getTokenPoolInfos(rpc, mint);
  const selectedPoolInfos = selectTokenPoolInfosForDecompression(
    tokenPoolInfos,
    bn(netAtomicUnits.toString())
  );

  // Build decompress instruction
  const decompressIx = await CompressedTokenProgram.decompress({
    payer: poolKeypair.publicKey,
    inputCompressedTokenAccounts: inputAccounts,
    toAddress: destinationAta,
    amount: bn(netAtomicUnits.toString()),
    tokenPoolInfos: selectedPoolInfos,
    recentValidityProof: proof.compressedProof,
    recentInputStateRootIndices: proof.rootIndices,
  });

  // Build and sign transaction
  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
  tx.add(decompressIx);
  tx.recentBlockhash = blockhash;
  tx.feePayer = poolKeypair.publicKey;
  tx.sign(poolKeypair);

  // Send and confirm
  const signature = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(signature, "confirmed");

  return signature;
}

/**
 * GET /api/pool/claim
 * Returns claim instructions
 */
export async function GET() {
  return NextResponse.json({
    method: "POST",
    endpoint: "/api/pool/claim",
    body: {
      claimCode: "darkpool:v1:mainnet:sol:1:SECRET",
      destination: "RECIPIENT_WALLET_ADDRESS",
    },
    response: {
      success: true,
      signature: "TX_SIGNATURE",
      amountReceived: "0.99",
      fee: "0.01",
    },
    feeBps: POOL_CONFIG.FEE_BPS,
  });
}
