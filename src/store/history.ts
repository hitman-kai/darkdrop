"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { AssetSymbol, ClusterType, DEFAULT_ASSET, DEFAULT_CLUSTER } from "@/lib/tokens";

export type SentDrop = {
  signature: string;
  address: string;
  amount: string;
  asset: AssetSymbol;
  claimCode?: string;
  cluster: ClusterType;
  createdAt: string;
  status: "pending" | "claimed";
};

export type ClaimedDrop = {
  address: string;
  amount: string;
  asset: AssetSymbol;
  cluster: ClusterType;
  signature: string;
  claimedAt: string;
};

type HistoryState = {
  sentDrops: SentDrop[];
  claimedDrops: ClaimedDrop[];
  addSentDrop: (drop: SentDrop) => void;
  updateDropStatus: (address: string, status: SentDrop["status"]) => void;
  addClaimedDrop: (drop: ClaimedDrop) => void;
};

const normalizeSentDrop = (drop: Partial<SentDrop>): SentDrop => ({
  signature: drop.signature ?? `legacy-${Date.now()}`,
  address: drop.address ?? "unknown",
  amount: drop.amount ?? "0",
  asset: drop.asset ?? DEFAULT_ASSET,
  claimCode: drop.claimCode,
  cluster: drop.cluster ?? DEFAULT_CLUSTER,
  createdAt: drop.createdAt ?? new Date().toISOString(),
  status: drop.status ?? "pending",
});

const normalizeClaimedDrop = (drop: Partial<ClaimedDrop>): ClaimedDrop => ({
  address: drop.address ?? "unknown",
  amount: drop.amount ?? "0",
  asset: drop.asset ?? DEFAULT_ASSET,
  cluster: drop.cluster ?? DEFAULT_CLUSTER,
  signature: drop.signature ?? `legacy-${Date.now()}`,
  claimedAt: drop.claimedAt ?? new Date().toISOString(),
});

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      sentDrops: [],
      claimedDrops: [],
      addSentDrop: (drop) =>
        set((state) => ({
          sentDrops: [drop, ...state.sentDrops].slice(0, 50),
        })),
      updateDropStatus: (address, status) =>
        set((state) => ({
          sentDrops: state.sentDrops.map((drop) => (drop.address === address ? { ...drop, status } : drop)),
        })),
      addClaimedDrop: (drop) =>
        set((state) => ({
          claimedDrops: [drop, ...state.claimedDrops].slice(0, 50),
        })),
    }),
    {
      name: "darkdrop-history",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persistedState: unknown, version) => {
        const state = persistedState as HistoryState | undefined;
        if (!state) {
          return {
            sentDrops: [],
            claimedDrops: [],
          };
        }
        if (version < 1) {
          return {
            sentDrops: state.sentDrops.map(normalizeSentDrop),
            claimedDrops: state.claimedDrops.map(normalizeClaimedDrop),
          };
        }
        return state;
      },
      partialize: (state) => ({
        sentDrops: state.sentDrops,
        claimedDrops: state.claimedDrops,
      }),
    }
  )
);
