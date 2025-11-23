"use client";

import type { ClusterType } from "@/lib/tokens";
import { AssetSymbol } from "@/lib/tokens";

type ProofJobKind = "token2022-confidential-transfer";

export type ProofJob = {
  kind: ProofJobKind;
  asset: AssetSymbol;
  amount: bigint;
  decimals: number;
  cluster?: ClusterType;
  mint?: string;
  owner?: string;
  destination?: string;
};

export type ProofResponse = {
  ok: boolean;
  proof?: {
    kind: ProofJobKind;
    preview: string;
    metadata?: Record<string, string | number | boolean | null>;
  };
  notes: string[];
};

type WorkerResponse = {
  id: string;
  result: ProofResponse;
};

const pending = new Map<
  string,
  {
    resolve: (value: ProofResponse) => void;
    reject: (reason: Error) => void;
  }
>();

let workerInstance: Worker | null = null;

const createWorker = () =>
  new Worker(new URL("../../workers/confidentialProof.worker.ts", import.meta.url), {
    type: "module",
  });

const ensureWorker = () => {
  if (typeof window === "undefined") return null;
  if (!workerInstance) {
    workerInstance = createWorker();
    workerInstance.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
      const handler = pending.get(event.data.id);
      if (!handler) return;
      pending.delete(event.data.id);
      handler.resolve(event.data.result);
    });
    workerInstance.addEventListener("error", (event) => {
      const error = event.error ?? new Error("Worker error");
      pending.forEach(({ reject }) => reject(error));
      pending.clear();
    });
  }
  return workerInstance;
};

export async function generateConfidentialProof(request: ProofJob): Promise<ProofResponse> {
  if (typeof window === "undefined") {
    return {
      ok: false,
      notes: ["Proof generation unavailable during SSR."],
    };
  }

  const worker = ensureWorker();
  if (!worker) {
    return {
      ok: false,
      notes: ["Worker unavailable in this environment."],
    };
  }

  return new Promise<ProofResponse>((resolve, reject) => {
    const id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    pending.set(id, { resolve, reject });
    worker.postMessage({
      id,
      payload: {
        ...request,
        amount: request.amount.toString(),
      },
    });
  });
}
