/// <reference lib="webworker" />

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

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, payload } = event.data;
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

  notes.push(`Preparing Token-2022 confidential transfer preview for ${payload.asset}.`);
  notes.push(`Mint: ${payload.mint}`);
  notes.push(`Cluster: ${payload.cluster ?? "unknown"}`);
  notes.push(`Owner: ${payload.owner ?? "n/a"}`);
  notes.push(`Destination: ${payload.destination ?? "n/a"}`);
  notes.push(`Amount (raw units): ${payload.amount}`);
  notes.push("Proof artifacts are still mocked until the Token-2022 SDK is wired in.");

  const preview = `ciphertext::${payload.amount}:${Date.now()}`;

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
        },
      },
      notes,
    },
  };

  ctx.postMessage(response);
};
