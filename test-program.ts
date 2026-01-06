import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Program ID from deployment
const PROGRAM_ID_STR = "95XwPFvP6znDJN2XS4JRp29NjUNGEKDAmCRfKaZEzNfw";
const PROGRAM_ID = new PublicKey(PROGRAM_ID_STR);
const DEVNET_RPC = "https://api.devnet.solana.com";

async function testProgram() {
  console.log("🧪 Testing DarkDrop Program on Devnet\n");
  console.log("Program ID:", PROGRAM_ID.toString());
  console.log("RPC:", DEVNET_RPC);
  console.log("");

  // Setup connection
  const connection = new Connection(DEVNET_RPC, "confirmed");
  
  // Load wallet - try multiple paths
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
    console.error("❌ Could not find wallet file. Please set SOLANA_KEYPAIR_PATH or ensure default wallet exists.");
    process.exit(1);
  }
  
  const wallet = new Wallet(walletKeypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Load IDL - try multiple paths
  const possibleIdlPaths = [
    join(process.cwd(), "target", "idl", "darkdrop.json"),
    join(process.cwd(), "programs", "darkdrop", "target", "idl", "darkdrop.json"),
  ];
  
  let idl;
  let idlLoaded = false;
  for (const idlPath of possibleIdlPaths) {
    try {
      if (existsSync(idlPath)) {
        idl = JSON.parse(readFileSync(idlPath, "utf-8"));
        idlLoaded = true;
        console.log("✅ Loaded IDL from:", idlPath);
        break;
      }
    } catch (e) {
      // Try next path
    }
  }
  
  if (!idlLoaded) {
    console.error("❌ Could not load IDL file. Make sure you've built the program.");
    console.error("Tried paths:", possibleIdlPaths);
    console.error("Run: anchor build");
    process.exit(1);
  }

  // Create program instance
  const programId = new PublicKey(PROGRAM_ID_STR);
  const program = new Program(idl as any, programId, provider);

  console.log("✅ Connected to devnet");
  console.log("✅ Wallet:", wallet.publicKey.toString());
  console.log("✅ Program loaded\n");

  try {
    // Test 1: Initialize
    console.log("📝 Test 1: Initialize Program");
    const [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      PROGRAM_ID
    );

    try {
      const tx1 = await program.methods
        .initialize()
        .accounts({
          config: configPDA,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Initialize successful!");
      console.log("   Transaction:", tx1);
      console.log("   Config PDA:", configPDA.toString());
    } catch (e: any) {
      if (e.message?.includes("already in use")) {
        console.log("ℹ️  Program already initialized (this is OK)");
      } else {
        throw e;
      }
    }

    // Test 2: Create Drop
    console.log("\n📝 Test 2: Create Drop");
    const nullifier = Keypair.generate().publicKey.toBytes().slice(0, 32);
    const recipient = Keypair.generate().publicKey;
    const amount = new BN(1000000); // 1 USDC (6 decimals)
    const assetType = 1; // USDC
    const expiresAt = new BN(Math.floor(Date.now() / 1000) + 600); // 10 minutes

    const [dropPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("drop"), Buffer.from(nullifier)],
      PROGRAM_ID
    );

    const [nullifierPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier"), Buffer.from(nullifier)],
      PROGRAM_ID
    );

    console.log("   Nullifier:", Buffer.from(nullifier).toString("hex"));
    console.log("   Recipient:", recipient.toString());
    console.log("   Amount:", amount.toString());
    console.log("   Drop PDA:", dropPDA.toString());
    console.log("   Nullifier PDA:", nullifierPDA.toString());
    console.log("   Expires At:", expiresAt.toString());

    const tx2 = await program.methods
      .createDrop(
        Array.from(nullifier),
        recipient,
        amount,
        assetType,
        expiresAt
      )
      .accounts({
        drop: dropPDA,
        nullifierAccount: nullifierPDA,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Create Drop successful!");
    console.log("   Transaction:", tx2);

    // Verify drop account
    const dropAccount = await (program.account as any).dropAccount.fetch(dropPDA);
    console.log("   Drop Status:", dropAccount.status);
    console.log("   Drop Amount:", dropAccount.amount.toString());
    console.log("   Drop Recipient:", dropAccount.recipient.toString());

    // Test 3: Claim Drop
    console.log("\n📝 Test 3: Claim Drop");
    const claimer = wallet.publicKey; // Same wallet claiming

    const tx3 = await program.methods
      .claimDrop(Array.from(nullifier))
      .accounts({
        drop: dropPDA,
        nullifierAccount: nullifierPDA,
        claimer: claimer,
      })
      .rpc();

    console.log("✅ Claim Drop successful!");
    console.log("   Transaction:", tx3);

    // Verify drop was claimed
    const dropAccountAfter = await (program.account as any).dropAccount.fetch(dropPDA);
    const nullifierAccountAfter = await (program.account as any).nullifierAccount.fetch(nullifierPDA);
    
    console.log("   Drop Status:", dropAccountAfter.status);
    console.log("   Drop Claimer:", dropAccountAfter.claimer.toString());
    console.log("   Nullifier Used:", nullifierAccountAfter.isUsed);
    console.log("   Nullifier Claimer:", nullifierAccountAfter.claimer.toString());

    // Test 4: Try to claim again (should fail)
    console.log("\n📝 Test 4: Try Double Claim (Should Fail)");
    try {
      const tx4 = await program.methods
        .claimDrop(Array.from(nullifier))
        .accounts({
          drop: dropPDA,
          nullifierAccount: nullifierPDA,
          claimer: claimer,
        })
        .rpc();

      console.log("❌ ERROR: Double claim succeeded (should have failed!)");
      console.log("   Transaction:", tx4);
    } catch (e: any) {
      if (e.error?.errorCode?.code === "NullifierAlreadyUsed" || 
          e.message?.includes("already been used")) {
        console.log("✅ Double claim correctly rejected!");
        console.log("   Error:", e.error?.errorCode?.code || e.message);
      } else {
        console.log("⚠️  Unexpected error:", e.message);
      }
    }

    console.log("\n🎉 All tests completed!");
    console.log("\nView on explorer:");
    console.log(`https://explorer.solana.com/address/${PROGRAM_ID.toString()}?cluster=devnet`);

  } catch (error: any) {
    console.error("\n❌ Test failed:", error);
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
    process.exit(1);
  }
}

testProgram();


