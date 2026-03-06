import { PublicKey, Transaction } from "@solana/web3.js";

/**
 * Creates a sendTransactionFn that routes through the shield relayer.
 * - Sets tx.feePayer to relayer (sender wallet disappears from on-chain)
 * - Sender signs only (proves SOL ownership, never broadcasts)
 * - Relayer signs as fee payer and broadcasts
 * On-chain result: Relayer -> Compressed Account
 */
export function createShieldSendFn(
  relayerPubkey: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): (tx: Transaction) => Promise<string> {
  return async (tx: Transaction): Promise<string> => {
    // Override fee payer — relayer pays the network fee, not sender
    tx.feePayer = relayerPubkey;
    // Sender signs as SOL authority (not fee payer)
    const signed = await signTransaction(tx);
    // Serialize without requiring relayer signature yet
    const serialized = Buffer.from(
      signed.serialize({ requireAllSignatures: false })
    ).toString("base64");
    // POST to shield relay — relayer adds its sig and broadcasts
    const response = await fetch("/api/relay/shield", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serializedTx: serialized }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Shield relay failed: ${response.status}`);
    }
    const { signature } = await response.json();
    return signature;
  };
}
