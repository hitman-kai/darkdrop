import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN, Instruction } from "@coral-xyz/anchor";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
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

  // Load IDL and create program instance
  const idlPath = join(process.cwd(), "target", "idl", "darkdrop.json");
  if (!existsSync(idlPath)) {
    console.error("❌ IDL file not found:", idlPath);
    process.exit(1);
  }

  const idl = JSON.parse(readFileSync(idlPath, "utf-8"));
  const wallet = new Wallet(walletKeypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Create program with proper typing workaround
  const programId = PROGRAM_ID.toString();
  const program = new (Program as any)(idl, programId, provider);

  try {
    // Test 1: Create Drop
    console.log("Test 1: Create Drop");
    const nullifierBytes = Keypair.generate().publicKey.toBytes().slice(0, 32);
    const nullifier = Array.from(nullifierBytes);
    const recipient = Keypair.generate().publicKey;
    const amount = new BN(1000000);
    const assetType = 1;

    console.log("   Nullifier:", Buffer.from(nullifier).toString("hex"));
    console.log("   Recipient:", recipient.toString());
    console.log("   Amount:", amount.toString());
    console.log("   Asset Type:", assetType);

    // Derive PDAs
    const [dropPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("drop"), Buffer.from(nullifier)],
      PROGRAM_ID
    );
    const [nullifierPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier"), Buffer.from(nullifier)],
      PROGRAM_ID
    );

    console.log("   Drop PDA:", dropPDA.toString());
    console.log("   Nullifier PDA:", nullifierPDA.toString());

    // Use Anchor's instruction builder
    const createIx = await program.methods
      .createDrop(nullifier, recipient, amount, assetType)
      .accounts({
        drop: dropPDA,
        nullifierAccount: nullifierPDA,
        payer: walletKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx1 = new Transaction().add(createIx);
    const sig1 = await sendAndConfirmTransaction(connection, tx1, [walletKeypair], {
      commitment: "confirmed",
    });

    console.log("✅ Create Drop successful!");
    console.log("   Transaction:", sig1);
    console.log("   Explorer: https://explorer.solana.com/tx/" + sig1 + "?cluster=devnet\n");

    // Test 2: Claim Drop
    console.log("Test 2: Claim Drop");
    const claimIx = await program.methods
      .claimDrop(nullifier)
      .accounts({
        drop: dropPDA,
        nullifierAccount: nullifierPDA,
        claimer: walletKeypair.publicKey,
      })
      .instruction();

    const tx2 = new Transaction().add(claimIx);
    const sig2 = await sendAndConfirmTransaction(connection, tx2, [walletKeypair], {
      commitment: "confirmed",
    });

    console.log("✅ Claim Drop successful!");
    console.log("   Transaction:", sig2);
    console.log("   Explorer: https://explorer.solana.com/tx/" + sig2 + "?cluster=devnet\n");

    // Test 3: Try to claim again (should fail)
    console.log("Test 3: Try Double Claim (Should Fail)");
    try {
      const tx3 = new Transaction().add(claimIx);
      const sig3 = await sendAndConfirmTransaction(connection, tx3, [walletKeypair], {
        commitment: "confirmed",
      });
      console.log("❌ ERROR: Double claim succeeded (should have failed!)");
      console.log("   Transaction:", sig3);
    } catch (e: any) {
      if (e.error?.errorCode?.code === "NullifierAlreadyUsed" || 
          e.message?.includes("already been used") ||
          e.message?.includes("already used")) {
        console.log("✅ Double claim correctly rejected!");
        console.log("   Error:", e.error?.errorCode?.code || e.message);
      } else {
        console.log("⚠️  Unexpected error:", e.message || e.toString());
      }
    }

    console.log("\n🎉 All tests completed!");
    console.log("\nView program on explorer:");
    console.log(`https://explorer.solana.com/address/${PROGRAM_ID.toString()}?cluster=devnet`);

  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message || error.toString());
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
    if (error.error) {
      console.error("Error details:", JSON.stringify(error.error, null, 2));
    }
    process.exit(1);
  }
}

testProgram();

