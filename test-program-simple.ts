import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createInitializeInstruction, createCreateDropInstruction, createClaimDropInstruction, deriveDropPDA, deriveNullifierPDA, deriveConfigPDA } from "./src/lib/darkdrop-program";
import bs58 from "bs58";

const PROGRAM_ID = new PublicKey("95XwPFvP6znDJN2XS4JRp29NjUNGEKDAmCRfKaZEzNfw");
const DEVNET_RPC = "https://api.devnet.solana.com";

async function testProgram() {
  console.log("Testing DarkDrop Program on Devnet\n");
  console.log("Program ID:", PROGRAM_ID.toString());
  console.log("RPC:", DEVNET_RPC);
  console.log("");

  const connection = new Connection(DEVNET_RPC, "confirmed");
  
  // Load wallet
  let walletKeypair: Keypair | null = null;
  const possiblePaths = [
    process.env.SOLANA_KEYPAIR_PATH,
    process.env.HOME ? `${process.env.HOME}/.config/solana/id.json` : null,
    "D:\\Dev\\Keys\\darkdrop-funding.json",
  ].filter(Boolean) as string[];

  for (const walletPath of possiblePaths) {
    try {
      if (walletPath && existsSync(walletPath)) {
        walletKeypair = Keypair.fromSecretKey(
          new Uint8Array(JSON.parse(readFileSync(walletPath, "utf-8")))
        );
        console.log("✅ Loaded wallet from:", walletPath);
        break;
      }
    } catch (e) {
      // Try next path
    }
  }

  if (!walletKeypair) {
    console.error("❌ Could not find wallet file.");
    process.exit(1);
  }

  console.log("✅ Wallet:", walletKeypair.publicKey.toString());
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log("✅ Balance:", balance / 1e9, "SOL\n");

  try {
    // Test 0: Initialize Config (if not already initialized)
    console.log("Test 0: Initialize Config");
    const [configPDA] = deriveConfigPDA(PROGRAM_ID);
    const configAccount = await connection.getAccountInfo(configPDA);
    
    if (!configAccount) {
      console.log("   Config not found, initializing...");
      const initIx = createInitializeInstruction(PROGRAM_ID, walletKeypair.publicKey);
      const { blockhash: bh0, lastValidBlockHeight: lbh0 } = await connection.getLatestBlockhash("confirmed");
      const tx0 = new Transaction({
        feePayer: walletKeypair.publicKey,
        recentBlockhash: bh0,
        lastValidBlockHeight: lbh0,
      }).add(initIx);
      
      try {
        const sig0 = await sendAndConfirmTransaction(connection, tx0, [walletKeypair], {
          commitment: "confirmed",
        });
        console.log("✅ Config initialized!");
        console.log("   Transaction:", sig0);
        console.log("   Config PDA:", configPDA.toString());
      } catch (e: any) {
        if (e.message?.includes("already in use")) {
          console.log("ℹ️  Config already initialized (this is OK)");
        } else {
          throw e;
        }
      }
    } else {
      console.log("ℹ️  Config already exists, skipping initialization");
    }
    console.log("");

    // Test 1: Create Drop
    console.log("Test 1: Create Drop");
    const nullifierBytes = Keypair.generate().publicKey.toBytes().slice(0, 32);
    const nullifier = bs58.encode(nullifierBytes);
    const recipient = Keypair.generate().publicKey;
    const amount = 1000000; // 1 USDC (6 decimals)
    const assetType = 1; // USDC
    const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 minutes out

    const [dropPDA] = deriveDropPDA(PROGRAM_ID, nullifier);
    const [nullifierPDA] = deriveNullifierPDA(PROGRAM_ID, nullifier);

    console.log("   Nullifier:", nullifier);
    console.log("   Recipient:", recipient.toString());
    console.log("   Amount:", amount);
    console.log("   Drop PDA:", dropPDA.toString());
    console.log("   Nullifier PDA:", nullifierPDA.toString());

    const createIx = createCreateDropInstruction(
      PROGRAM_ID,
      nullifier,
      recipient,
      amount,
      assetType,
      expiresAt,
      walletKeypair.publicKey
    );

    const { blockhash: bh1, lastValidBlockHeight: lbh1 } = await connection.getLatestBlockhash("confirmed");
    const tx1 = new Transaction({
      feePayer: walletKeypair.publicKey,
      recentBlockhash: bh1,
      lastValidBlockHeight: lbh1,
    }).add(createIx);
    const sig1 = await sendAndConfirmTransaction(connection, tx1, [walletKeypair], {
      commitment: "confirmed",
    });

    console.log("✅ Create Drop successful!");
    console.log("   Transaction:", sig1);
    console.log("   Explorer: https://explorer.solana.com/tx/" + sig1 + "?cluster=devnet\n");

    // Test 2: Claim Drop
    console.log("Test 2: Claim Drop");
    const claimIx = createClaimDropInstruction(
      PROGRAM_ID,
      nullifier,
      walletKeypair.publicKey
    );

    const { blockhash: bh2, lastValidBlockHeight: lbh2 } = await connection.getLatestBlockhash("confirmed");
    const tx2 = new Transaction({
      feePayer: walletKeypair.publicKey,
      recentBlockhash: bh2,
      lastValidBlockHeight: lbh2,
    }).add(claimIx);
    const sig2 = await sendAndConfirmTransaction(connection, tx2, [walletKeypair], {
      commitment: "confirmed",
    });

    console.log("✅ Claim Drop successful!");
    console.log("   Transaction:", sig2);
    console.log("   Explorer: https://explorer.solana.com/tx/" + sig2 + "?cluster=devnet\n");

    // Test 3: Try to claim again (should fail)
    console.log("Test 3: Try Double Claim (Should Fail)");
    try {
      const { blockhash: bh3, lastValidBlockHeight: lbh3 } = await connection.getLatestBlockhash("confirmed");
      const tx3 = new Transaction({
        feePayer: walletKeypair.publicKey,
        recentBlockhash: bh3,
        lastValidBlockHeight: lbh3,
      }).add(claimIx);
      const sig3 = await sendAndConfirmTransaction(connection, tx3, [walletKeypair], {
        commitment: "confirmed",
      });
      console.log("❌ ERROR: Double claim succeeded (should have failed!)");
      console.log("   Transaction:", sig3);
    } catch (e: any) {
      console.log("✅ Double claim correctly rejected!");
      console.log("   Error:", e.message || e.toString());
    }

    console.log("\n🎉 All tests completed!");
    console.log("\nView program on explorer:");
    console.log(`https://explorer.solana.com/address/${PROGRAM_ID.toString()}?cluster=devnet`);

  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message || error.toString());
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
    process.exit(1);
  }
}

testProgram();

