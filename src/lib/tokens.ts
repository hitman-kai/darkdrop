"use client";

import { clusterApiUrl } from "@solana/web3.js";

export type ClusterType = "devnet" | "mainnet";
export type AssetSymbol = "sol" | "usdc";

export const CLUSTER_LABELS: Record<ClusterType, string> = {
  devnet: "Devnet",
  mainnet: "Mainnet",
};

export const DEFAULT_CLUSTER: ClusterType = "devnet";
export const DEFAULT_ASSET: AssetSymbol = "sol";

const MAINNET_RPC = process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC;
const DEVNET_RPC = process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC;

export const RPC_ENDPOINTS: Record<ClusterType, string> = {
  mainnet: MAINNET_RPC || clusterApiUrl("mainnet-beta"),
  devnet: DEVNET_RPC || clusterApiUrl("devnet"),
};

const USDC_MINTS: Record<ClusterType, string> = {
  mainnet: process.env.NEXT_PUBLIC_USDC_MAINNET_MINT ?? "EPjFWdd5AufqSSqeM2qxdjQssd1kY9hSx6msvPoN9G",
  devnet: process.env.NEXT_PUBLIC_USDC_DEVNET_MINT ?? "Gh9ZwEmdLJ8DscK9Z9mAjnSVZXvByPCs4s7tT3EPhEE",
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
    mint: USDC_MINTS,
  },
};

export const assetList: AssetSymbol[] = ["sol", "usdc"];
export const clusterList: ClusterType[] = ["devnet", "mainnet"];

export const getRpcEndpoint = (cluster: ClusterType) => RPC_ENDPOINTS[cluster];

export const getAssetDecimals = (asset: AssetSymbol) => ASSETS[asset].decimals;

export const getAssetSymbol = (asset: AssetSymbol) => ASSETS[asset].symbol;

export const getAssetMint = (asset: AssetSymbol, cluster: ClusterType): string | null => {
  const meta = ASSETS[asset];
  if (meta.kind === "native") return null;
  return meta.mint[cluster];
};
