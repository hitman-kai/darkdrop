/// <reference lib="webworker" />

import init, {
  init_panic_hook,
  generate_transfer_proof,
  generate_configure_account_proof,
} from "../lib/wasm/darkdrop_ct_proofs";

type TransferPayload = {
  kind: "token2022-confidential-transfer";
  asset: string;
  amount: string;
  decimals: number;
  mint?: string;
  owner?: string;
  destination?: string;
  cluster?: string;
  senderBalance?: string;
  senderElGamalKeypair?: string;
  destinationElGamalPubkey?: string;
  auditorElGamalPubkey?: string;
  sourceAvailableBalance?: string;
  sourceDecryptableBalance?: string;
  aesKey?: string;
  /** @deprecated legacy field */
  sender_balance?: string;
};

type ConfigurePayload = {
  kind: "token2022-confidential-configure";
  aesKey?: string;
};

type Token2022Payload = TransferPayload | ConfigurePayload;

type WorkerRequest = {
  id: string;
  payload: Token2022Payload;
};

type WorkerResponse = {
  id: string;
  result: {
    ok: boolean;
    proof?: {
      kind: Token2022Payload["kind"];
      preview: string;
      metadata?: Record<string, string | number | boolean | null>;
    };
    notes: string[];
  };
};

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

let wasmReady = false;

// Initialize WASM module - load from public folder with absolute URL
(async () => {
  try {
    // Use location to construct absolute URL
    const baseUrl = (self as typeof globalThis).location?.origin || "http://localhost:3001";
    const wasmUrl = `${baseUrl}/darkdrop_ct_proofs_bg.wasm`;
    console.log("[CT Worker] Loading WASM from:", wasmUrl);
    
    const wasmResponse = await fetch(wasmUrl);
    if (!wasmResponse.ok) {
      throw new Error(`Failed to fetch WASM: ${wasmResponse.status}`);
    }
    
    const wasmBytes = await wasmResponse.arrayBuffer();
    await init(wasmBytes);
    init_panic_hook();
    wasmReady = true;
    console.log("[CT Worker] WASM module initialized successfully");
    ctx.postMessage({ type: "wasm-ready" });
  } catch (error) {
    console.error("[CT Worker] WASM init failed:", error);
    ctx.postMessage({
      type: "wasm-error",
      error: error instanceof Error ? error.message : "Failed to load WASM",
    });
  }
})();

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, payload } = event.data;

  if (!wasmReady) {
    ctx.postMessage({
      id,
      result: { ok: false, notes: ["WASM module not ready yet. Retry in a moment."] },
    });
    return;
  }

  const notes: string[] = [];

  try {
    if (payload.kind === "token2022-confidential-transfer") {
      if (!payload.mint) {
        ctx.postMessage({
          id,
          result: { ok: false, notes: ["Mint address missing for confidential transfer job."] },
        });
        return;
      }

      notes.push(`WASM proof worker loaded for ${payload.asset}.`);
      notes.push(`Mint: ${payload.mint}`);
      notes.push(`Cluster: ${payload.cluster ?? "unknown"}`);
      notes.push(`Owner: ${payload.owner ?? "n/a"}`);
      notes.push(`Destination: ${payload.destination ?? "n/a"}`);
      notes.push(`Amount (raw units): ${payload.amount}`);

      const proofRequest = {
        mint: payload.mint,
        amount: payload.amount,
        sender_balance: payload.senderBalance ?? payload.sender_balance ?? "1000000",
        sender_elgamal_keypair: payload.senderElGamalKeypair,
        destination_elgamal_pubkey: payload.destinationElGamalPubkey,
        auditor_elgamal_pubkey: payload.auditorElGamalPubkey,
        source_available_balance: payload.sourceAvailableBalance,
        source_decryptable_balance: payload.sourceDecryptableBalance,
        aes_key: payload.aesKey,
      };

      console.log("[CT Worker] Generating transfer proof with:", proofRequest);
      const proofResult = generate_transfer_proof(JSON.stringify(proofRequest));
      console.log("[CT Worker] Transfer proof result:", proofResult);
      notes.push(...(proofResult.notes || []));
      notes.push("WASM transfer proof generation executed successfully.");

      const preview = `wasm-transfer-proof::${payload.amount}:${Date.now()}`;

      ctx.postMessage({
        id,
        result: {
          ok: true,
          proof: {
            kind: payload.kind,
            preview,
            metadata: {
              mint: payload.mint,
              cluster: payload.cluster ?? "unknown",
              owner: payload.owner ?? null,
              destination: payload.destination ?? null,
              wasm_loaded: true,
              equality_proof: proofResult.equality_proof,
              validity_proof: proofResult.validity_proof,
              range_proof: proofResult.range_proof,
              new_source_balance: proofResult.new_source_balance,
              sender_elgamal_keypair: proofResult.sender_elgamal_keypair,
              new_source_decryptable_balance: proofResult.new_source_decryptable_balance ?? null,
              transfer_auditor_ciphertext_lo: proofResult.transfer_auditor_ciphertext_lo ?? null,
              transfer_auditor_ciphertext_hi: proofResult.transfer_auditor_ciphertext_hi ?? null,
            },
          },
          notes,
        },
      });
      return;
    }

    if (payload.kind === "token2022-confidential-configure") {
      try {
        const proofRequest = {
          aes_key: payload.aesKey,
        };

        console.log("[CT Worker] Generating configure proof with:", proofRequest);
        const proofResult = generate_configure_account_proof(JSON.stringify(proofRequest));
        console.log("[CT Worker] Configure proof result:", proofResult);
        notes.push(...(proofResult.notes || []));
        notes.push("WASM configure proof generation executed successfully.");

        const preview = `wasm-configure-proof::${Date.now()}`;

        ctx.postMessage({
          id,
          result: {
            ok: true,
            proof: {
              kind: payload.kind,
              preview,
              metadata: {
                zero_balance_proof: proofResult.zero_balance_proof,
                elgamal_pubkey: proofResult.elgamal_pubkey,
                elgamal_keypair: proofResult.elgamal_keypair,
                decryptable_zero_balance: proofResult.decryptable_zero_balance ?? null,
                generated_aes_key: proofResult.generated_aes_key ?? null,
              },
            },
            notes,
          },
        });
        return;
      } catch (error) {
        console.error("[CT Worker] Configure proof failed:", error);
        throw error;
      }
    }

    ctx.postMessage({
      id,
      result: { ok: false, notes: ["Unknown proof job kind."] },
    });
  } catch (error) {
    ctx.postMessage({
      id,
      result: {
        ok: false,
        notes: [
          "WASM proof generation failed.",
          error instanceof Error ? error.message : "Unknown error",
        ],
      },
    });
  }
};
