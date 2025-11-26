import { Keypair } from "@solana/web3.js";
import { Buffer } from "buffer";
import bs58 from "bs58";
import nacl from "tweetnacl";

import { decryptPrivateKey, encryptPrivateKey } from "@/lib/encryption";
import { AssetSymbol, ClusterType, DEFAULT_ASSET, DEFAULT_CLUSTER, clusterList } from "@/lib/tokens";

const CODE_PREFIX = "darkdrop";
const CODE_VERSION = "v2";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type DropPayload = {
  address: string;
  claimCode: string;
  encrypted: boolean;
  asset: AssetSymbol;
  cluster: ClusterType;
  keypair: Keypair;
  elgamalKeypair?: string;
};

type GenerateParams = {
  asset: AssetSymbol;
  cluster: ClusterType;
  password?: string;
  keypair?: Keypair;
  elgamalKeypair?: string;
};

export type ClaimedDrop = {
  keypair: Keypair;
  asset: AssetSymbol;
  cluster: ClusterType;
  encrypted: boolean;
  elgamalKeypair?: string;
  legacy?: boolean;
};

const buildHint = (password: string): string => {
  const hash = nacl.hash(encoder.encode(password));
  return Array.from(hash.slice(0, 8))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

type SecretPayload = {
  secretKey: string;
  elgamalKeypair?: string;
};

const encodeSecretPayload = (secretKey: Uint8Array, elgamalKeypair?: string): Uint8Array => {
  const payload: SecretPayload = {
    secretKey: bs58.encode(secretKey),
    elgamalKeypair,
  };
  return encoder.encode(JSON.stringify(payload));
};

const decodeSecretPayload = (bytes: Uint8Array): SecretPayload => {
  const json = decoder.decode(bytes);
  return JSON.parse(json) as SecretPayload;
};

export function generateDrop({
  asset,
  cluster,
  password,
  keypair: providedKeypair,
  elgamalKeypair,
}: GenerateParams): DropPayload {
  const keypair = providedKeypair ?? Keypair.generate();
  const secretBytes = encodeSecretPayload(keypair.secretKey, elgamalKeypair);
  let claimCode = "";
  let encrypted = false;

  const baseSegments = [CODE_PREFIX, CODE_VERSION, cluster, asset];

  if (password && password.trim().length > 0) {
    const encryptedPayload = encryptPrivateKey(secretBytes, password);
    const hint = buildHint(password);
    claimCode = `${baseSegments.join(":")}:aes:${hint}:${encryptedPayload}`;
    encrypted = true;
  } else {
    const payloadBase64 = Buffer.from(secretBytes).toString("base64");
    claimCode = `${baseSegments.join(":")}:raw:${payloadBase64}`;
  }

  return {
    address: keypair.publicKey.toBase58(),
    claimCode,
    encrypted,
    asset,
    cluster,
    keypair,
    elgamalKeypair,
  };
}

type ClaimOptions = {
  password?: string;
  fallbackCluster?: ClusterType;
};

const parseCluster = (value: string): ClusterType =>
  clusterList.includes(value as ClusterType) ? (value as ClusterType) : DEFAULT_CLUSTER;
const parseAsset = (value: string): AssetSymbol => (value === "usdc" ? "usdc" : "sol");

function claimLegacyV1(code: string, options?: ClaimOptions): ClaimedDrop {
  const segments = code.split(":");
  const [, version, clusterSegment, assetSegment, mode, ...rest] = segments;
  if (version !== "v1") {
    throw new Error("Unsupported claim version");
  }
  const cluster = parseCluster(clusterSegment);
  const asset = parseAsset(assetSegment);

  if (mode === "raw") {
    const payload = rest[0];
    if (!payload) throw new Error("Malformed claim code");
    try {
      const secretKey = bs58.decode(payload);
      return {
        keypair: Keypair.fromSecretKey(secretKey),
        asset,
        cluster,
        encrypted: false,
        legacy: true,
      };
    } catch {
      throw new Error("Invalid claim code");
    }
  }

  if (mode === "aes") {
    const [hint, payload] = rest;
    if (!hint || !payload) {
      throw new Error("Malformed claim code");
    }
    if (!options?.password) {
      throw new Error("Password required for this drop");
    }
    const derivedHint = buildHint(options.password);
    if (hint !== derivedHint) {
      throw new Error("Password mismatch");
    }
    const decoded = decryptPrivateKey(payload, options.password);
    if (!decoded) {
      throw new Error("Unable to decrypt claim");
    }
    return {
      keypair: Keypair.fromSecretKey(decoded),
      asset,
      cluster,
      encrypted: true,
      legacy: true,
    };
  }

  throw new Error("Unsupported claim code");
}

export function claimDrop(code: string, options?: ClaimOptions): ClaimedDrop {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error("Claim code required");
  }

  if (!trimmed.startsWith(`${CODE_PREFIX}:`)) {
    try {
      const secretKey = bs58.decode(trimmed);
      return {
        keypair: Keypair.fromSecretKey(secretKey),
        asset: DEFAULT_ASSET,
        cluster: options?.fallbackCluster ?? DEFAULT_CLUSTER,
        encrypted: false,
        legacy: true,
      };
    } catch {
      throw new Error("Invalid claim code");
    }
  }

  const segments = trimmed.split(":");
  if (segments.length < 6) {
    throw new Error("Malformed claim code");
  }

  const [, version, clusterSegment, assetSegment, mode, ...rest] = segments;
  if (version !== CODE_VERSION) {
    if (version === "v1") {
      return claimLegacyV1(trimmed, options);
    }
    throw new Error("Unsupported claim version");
  }

  const cluster = parseCluster(clusterSegment);
  const asset = parseAsset(assetSegment);

  if (mode === "raw") {
    const payload = rest[0];
    if (!payload) throw new Error("Malformed claim code");
    let decoded: SecretPayload;
    try {
      const bytes = new Uint8Array(Buffer.from(payload, "base64"));
      decoded = decodeSecretPayload(bytes);
    } catch {
      throw new Error("Invalid claim code");
    }
    return {
      keypair: Keypair.fromSecretKey(bs58.decode(decoded.secretKey)),
      asset,
      cluster,
      encrypted: false,
      elgamalKeypair: decoded.elgamalKeypair,
    };
  }

  if (mode === "aes") {
    const [hint, payload] = rest;
    if (!hint || !payload) {
      throw new Error("Malformed claim code");
    }
    if (!options?.password) {
      throw new Error("Password required for this drop");
    }
    const derivedHint = buildHint(options.password);
    if (hint !== derivedHint) {
      throw new Error("Password mismatch");
    }
    const decryptedBytes = decryptPrivateKey(payload, options.password);
    if (!decryptedBytes) {
      throw new Error("Unable to decrypt claim");
    }
    const decoded = decodeSecretPayload(decryptedBytes);
    return {
      keypair: Keypair.fromSecretKey(bs58.decode(decoded.secretKey)),
      asset,
      cluster,
      encrypted: true,
      elgamalKeypair: decoded.elgamalKeypair,
    };
  }

  throw new Error("Unsupported claim code");
}

export function withElGamalKeypair(drop: DropPayload, elgamalKeypair: string, password?: string): DropPayload {
  return generateDrop({
    asset: drop.asset,
    cluster: drop.cluster,
    password,
    keypair: drop.keypair,
    elgamalKeypair,
  });
}

