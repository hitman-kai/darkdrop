import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { loadLightSDK } from "@/lib/server/light-sdk-loader";

/**
 * Light Protocol Proxy API
 * 
 * Runs Light Protocol SDK server-side since @lightprotocol/zk.js is Node.js-only.
 * Client sends requests here, we handle shield/unshield operations, return results.
 * 
 * Uses dynamic imports to prevent Next.js from trying to bundle the SDK at build time.
 * 
 * This route must run on Node.js runtime (not Edge runtime) to use the SDK.
 */
export const runtime = "nodejs"; // Force Node.js runtime for this API route

const RELAYER_URL = process.env.NEXT_PUBLIC_LIGHT_RELAYER || "https://mainnet.lightprotocol.com/relayer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "shield": {
        return await handleShield(params);
      }
      case "unshield": {
        return await handleUnshield(params);
      }
      case "createNote": {
        return await handleCreateNote(params);
      }
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Light Proxy] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Handle shield operation: create note and return shield instruction
 */
async function handleShield(params: {
  rpcUrl: string;
  payerPubkey: string;
  amount: number;
  assetId: "SOL" | "USDC";
}) {
  const { rpcUrl, payerPubkey, amount, assetId } = params;

  if (!rpcUrl || !payerPubkey || amount === undefined || !assetId) {
    return NextResponse.json(
      { error: "Missing required parameters: rpcUrl, payerPubkey, amount, assetId" },
      { status: 400 }
    );
  }

  const connection = new Connection(rpcUrl, "confirmed");
  const payer = new PublicKey(payerPubkey);

  // Dynamically load Light Protocol SDK
  const { LightProtocolClient, Note } = await loadLightSDK();

  // Initialize Light Protocol client
  const client = new LightProtocolClient(connection, payer, { relayerUrl: RELAYER_URL });

  // Create note
  const note = await client.createNote({
    amount,
    assetId,
  });

  // Get shield instruction
  const shieldIx = await client.shield({ note });

  // Serialize note for client
  const noteSerialized = note.serialize();
  const nullifier = note.nullifier();

  return NextResponse.json({
    success: true,
    noteSerialized,
    nullifier: Array.from(nullifier.toBytes()),
    shieldInstruction: {
      programId: shieldIx.programId.toString(),
      keys: shieldIx.keys.map((k) => ({
        pubkey: k.pubkey.toString(),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: Array.from(shieldIx.data),
    },
  });
}

/**
 * Handle unshield operation: create unshield instruction from serialized note
 */
async function handleUnshield(params: {
  rpcUrl: string;
  payerPubkey: string;
  noteSerialized: string;
  recipientPubkey: string;
}) {
  const { rpcUrl, payerPubkey, noteSerialized, recipientPubkey } = params;

  if (!rpcUrl || !payerPubkey || !noteSerialized || !recipientPubkey) {
    return NextResponse.json(
      { error: "Missing required parameters: rpcUrl, payerPubkey, noteSerialized, recipientPubkey" },
      { status: 400 }
    );
  }

  const connection = new Connection(rpcUrl, "confirmed");
  const payer = new PublicKey(payerPubkey);
  const recipient = new PublicKey(recipientPubkey);

  // Dynamically load Light Protocol SDK
  const { LightProtocolClient, Note } = await loadLightSDK();

  // Initialize Light Protocol client
  const client = new LightProtocolClient(connection, payer, { relayerUrl: RELAYER_URL });

  // Deserialize note
  const note = Note.deserialize(noteSerialized);

  // Get unshield instruction
  const unshieldIx = await client.relaySpend(note, recipient);

  return NextResponse.json({
    success: true,
    unshieldInstruction: {
      programId: unshieldIx.programId.toString(),
      keys: unshieldIx.keys.map((k) => ({
        pubkey: k.pubkey.toString(),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: Array.from(unshieldIx.data),
    },
  });
}

/**
 * Handle createNote operation: just create and serialize a note (for testing)
 */
async function handleCreateNote(params: {
  amount: number;
  assetId: "SOL" | "USDC";
}) {
  const { amount, assetId } = params;

  if (amount === undefined || !assetId) {
    return NextResponse.json(
      { error: "Missing required parameters: amount, assetId" },
      { status: 400 }
    );
  }

  // Create a dummy connection for note creation (note creation doesn't need RPC)
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const dummyPayer = PublicKey.default;

  // Dynamically load Light Protocol SDK
  const { LightProtocolClient, Note } = await loadLightSDK();

  const client = new LightProtocolClient(connection, dummyPayer, { relayerUrl: RELAYER_URL });

  const note = await client.createNote({
    amount,
    assetId,
  });

  const noteSerialized = note.serialize();
  const nullifier = note.nullifier();

  return NextResponse.json({
    success: true,
    noteSerialized,
    nullifier: Array.from(nullifier.toBytes()),
  });
}

