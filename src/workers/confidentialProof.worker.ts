/// <reference lib="webworker" />

import init, {
  init_panic_hook,
  generate_transfer_proof,
} from "../lib/wasm/darkdrop_ct_proofs";

type Token2022Payload = {
  kind: "token2022-confidential-transfer";
  asset: string;
  amount: string;
  decimals: number;
  mint?: string;
  owner?: string;
  destination?: string;
  cluster?: string;
};

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
    const baseUrl = (self as any).location?.origin || "http://localhost:3001";
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

  if (payload.kind !== "token2022-confidential-transfer") {
    ctx.postMessage({
      id,
      result: { ok: false, notes: ["Unknown proof job kind."] },
    });
    return;
  }

  if (!payload.mint) {
    ctx.postMessage({
      id,
      result: { ok: false, notes: ["Mint address missing for confidential transfer job."] },
    });
    return;
  }

  try {
    notes.push(`WASM proof worker loaded for ${payload.asset}.`);
    notes.push(`Mint: ${payload.mint}`);
    notes.push(`Cluster: ${payload.cluster ?? "unknown"}`);
    notes.push(`Owner: ${payload.owner ?? "n/a"}`);
    notes.push(`Destination: ${payload.destination ?? "n/a"}`);
    notes.push(`Amount (raw units): ${payload.amount}`);

    // Call WASM proof generator
    const proofRequest = {
      mint: payload.mint,
      amount: payload.amount,
      sender_balance: payload.sender_balance || "1000000", // Use provided or default
    };

    console.log("[CT Worker] Generating proof with:", proofRequest);
    const proofResult = generate_transfer_proof(JSON.stringify(proofRequest));
    console.log("[CT Worker] Proof result:", proofResult);
    notes.push(...(proofResult.notes || []));
    notes.push("WASM proof generation executed successfully.");

    const preview = `wasm-proof::${payload.amount}:${Date.now()}`;

    const response: WorkerResponse = {
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
          },
        },
        notes,
      },
    };

    ctx.postMessage(response);
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
