import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

import { decryptPrivateKey, encryptPrivateKey } from "@/lib/encryption";
import { AssetSymbol, ClusterType, DEFAULT_ASSET, DEFAULT_CLUSTER } from "@/lib/tokens";

const CODE_PREFIX = "darkdrop";
const CODE_VERSION = "v1";
const encoder = new TextEncoder();

export type DropPayload = {
  address: string;
  claimCode: string;
  encrypted: boolean;
  asset: AssetSymbol;
  cluster: ClusterType;
};

type GenerateParams = {
  asset: AssetSymbol;
  cluster: ClusterType;
  password?: string;
};

export type ClaimedDrop = {
  keypair: Keypair;
  asset: AssetSymbol;
  cluster: ClusterType;
  encrypted: boolean;
  legacy?: boolean;
};

const buildHint = (password: string): string => {
  const hash = nacl.hash(encoder.encode(password));
  return Array.from(hash.slice(0, 8))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export function generateDrop({ asset, cluster, password }: GenerateParams): DropPayload {
  const keypair = Keypair.generate();
  const secretKey = keypair.secretKey;
  let claimCode = bs58.encode(secretKey);
  let encrypted = false;

  const baseSegments = [CODE_PREFIX, CODE_VERSION, cluster, asset];

  if (password && password.trim().length > 0) {
    const encryptedPayload = encryptPrivateKey(secretKey, password);
    const hint = buildHint(password);
    claimCode = `${baseSegments.join(":")}:aes:${hint}:${encryptedPayload}`;
    encrypted = true;
  } else {
    claimCode = `${baseSegments.join(":")}:raw:${claimCode}`;
  }

  return {
    address: keypair.publicKey.toBase58(),
    claimCode,
    encrypted,
    asset,
    cluster,
  };
}

type ClaimOptions = {
  password?: string;
  fallbackCluster?: ClusterType;
};

const parseCluster = (value: string): ClusterType => (value === "mainnet" ? "mainnet" : DEFAULT_CLUSTER);
const parseAsset = (value: string): AssetSymbol => (value === "usdc" ? "usdc" : "sol");

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
    };
  }

  throw new Error("Unsupported claim code");
}

