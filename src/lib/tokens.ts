"use client";

import { clusterApiUrl } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const SUPPORTED_CLUSTERS = ["mainnet", "devnet"] as const;
export type ClusterType = (typeof SUPPORTED_CLUSTERS)[number];
export type AssetSymbol = "sol" | "usdc";

export const CLUSTER_LABELS: Record<ClusterType, string> = {
  mainnet: "Mainnet",
  devnet: "Devnet",
};

const ENV_DEFAULT_CLUSTER = (process.env.NEXT_PUBLIC_DEFAULT_CLUSTER ?? "").toLowerCase();
export const DEFAULT_CLUSTER: ClusterType = ENV_DEFAULT_CLUSTER === "devnet" ? "devnet" : "mainnet";
export const DEFAULT_ASSET: AssetSymbol = "sol";

const MAINNET_RPC = process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC;
const DEVNET_RPC = process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC;

export const RPC_ENDPOINTS: Record<ClusterType, string> = {
  mainnet: MAINNET_RPC || clusterApiUrl("mainnet-beta"),
  devnet: DEVNET_RPC || clusterApiUrl("devnet"),
};

const CUSDC_MINTS: Record<ClusterType, string> = {
  mainnet:
    process.env.NEXT_PUBLIC_CUSDC_MAINNET_MINT ??
    process.env.NEXT_PUBLIC_USDC_MAINNET_MINT ??
    "",
  devnet: process.env.NEXT_PUBLIC_CUSDC_DEVNET_MINT ?? "",
};

type AssetMeta =
  | {
      symbol: string;
      label: string;
      decimals: number;
      kind: "native";
    }
  | {
      symbol: string;
      label: string;
      decimals: number;
      kind: "spl";
      mint: Record<ClusterType, string>;
      program: "token" | "token-2022";
    };

export const ASSETS: Record<AssetSymbol, AssetMeta> = {
  sol: {
    symbol: "SOL",
    label: "Solana",
    decimals: 9,
    kind: "native",
  },
  usdc: {
    symbol: "cUSDC",
    label: "Confidential USDC",
    decimals: 6,
    kind: "spl",
    mint: CUSDC_MINTS,
    program: "token-2022",
  },
};

export const assetList: AssetSymbol[] = ["sol", "usdc"];
export const clusterList: ClusterType[] = [...SUPPORTED_CLUSTERS];

export const getRpcEndpoint = (cluster: ClusterType) => RPC_ENDPOINTS[cluster];

export const getAssetDecimals = (asset: AssetSymbol) => ASSETS[asset].decimals;

export const getAssetSymbol = (asset: AssetSymbol) => ASSETS[asset].symbol;

export const getAssetMint = (asset: AssetSymbol, cluster: ClusterType): string | null => {
  const meta = ASSETS[asset];
  if (meta.kind === "native") return null;
  return meta.mint[cluster];
};

export const getAssetProgramId = (asset: AssetSymbol) => {
  const meta = ASSETS[asset];
  if (meta.kind === "native") return null;
  return meta.program === "token-2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
};
