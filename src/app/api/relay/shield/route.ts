import { Connection, Keypair, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { serializedTx } = await req.json();
    if (!serializedTx) {
      return NextResponse.json({ error: "Missing serializedTx" }, { status: 400 });
    }
    const relayerKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerKey) {
      return NextResponse.json({ error: "Relayer not configured" }, { status: 500 });
    }
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC;
    if (!rpcUrl) {
      return NextResponse.json({ error: "RPC not configured" }, { status: 500 });
    }
    const relayerKeypair = Keypair.fromSecretKey(bs58.decode(relayerKey));
    const connection = new Connection(rpcUrl, "confirmed");
    const tx = Transaction.from(Buffer.from(serializedTx, "base64"));
    if (!tx.feePayer?.equals(relayerKeypair.publicKey)) {
      return NextResponse.json({ error: "Invalid fee payer" }, { status: 400 });
    }
    tx.partialSign(relayerKeypair);
    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(signature, "confirmed");
    console.log("[Shield Relay] Confirmed:", signature);
    return NextResponse.json({ signature });
  } catch (error: any) {
    console.error("[Shield Relay] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
