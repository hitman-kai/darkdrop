"use client";

import { clusterApiUrl } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export type ClusterType = "mainnet";
export type AssetSymbol = "sol" | "usdc";

export const CLUSTER_LABELS: Record<ClusterType, string> = {
  mainnet: "Mainnet",
};

export const DEFAULT_CLUSTER: ClusterType = "mainnet";
export const DEFAULT_ASSET: AssetSymbol = "sol";

const MAINNET_RPC = process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC;

export const RPC_ENDPOINTS: Record<ClusterType, string> = {
  mainnet: MAINNET_RPC || clusterApiUrl("mainnet-beta"),
};

const CUSDC_MINTS: Record<ClusterType, string> = {
  mainnet:
    process.env.NEXT_PUBLIC_CUSDC_MAINNET_MINT ??
    process.env.NEXT_PUBLIC_USDC_MAINNET_MINT ??
    "",
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
    symbol: "USDC",
    label: "USD Coin",
    decimals: 6,
    kind: "spl",
    mint: CUSDC_MINTS,
    program: "token",
  },
};

export const assetList: AssetSymbol[] = ["sol", "usdc"];
export const clusterList: ClusterType[] = ["mainnet"];

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
