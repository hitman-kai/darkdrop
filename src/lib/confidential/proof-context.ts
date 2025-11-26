"use client";

import { ClusterType } from "@/lib/tokens";

type ConfigureContextPayload = {
  cluster: ClusterType;
  mint: string;
  payer: string;
  owner: string;
  token_account: string;
  proof: Record<string, unknown>;
};

type TransferContextPayload = {
  cluster: ClusterType;
  mint: string;
  payer: string;
  owner: string;
  source_token_account: string;
  destination_token_account: string;
  amount: string;
  proofs: Record<string, unknown>;
};

type ConfigureContextResponse = {
  context: {
    context: string;
    signature: string;
  };
};

type TransferContextResponse = {
  equality: {
    context: string;
    signature: string;
  };
  validity: {
    context: string;
    signature: string;
  };
  range: {
    context: string;
    signature: string;
  };
};

type ApiRequest =
  | {
      mode: "configure";
      payload: ConfigureContextPayload;
      rpcUrl?: string;
    }
  | {
      mode: "transfer";
      payload: TransferContextPayload;
      rpcUrl?: string;
    };

async function callProofContextApi<T>(body: ApiRequest): Promise<T> {
  const response = await fetch("/api/proof-context", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await response.json();
  if (!response.ok) {
    const message = typeof json?.error === "string" ? json.error : "Proof context helper failed.";
    throw new Error(message);
  }
  return json as T;
}

export async function uploadConfigureProofContext(
  payload: ConfigureContextPayload,
  rpcUrl?: string
): Promise<ConfigureContextResponse> {
  return callProofContextApi<ConfigureContextResponse>({ mode: "configure", payload, rpcUrl });
}

export async function uploadTransferProofContexts(
  payload: TransferContextPayload,
  rpcUrl?: string
): Promise<TransferContextResponse> {
  return callProofContextApi<TransferContextResponse>({ mode: "transfer", payload, rpcUrl });
}

