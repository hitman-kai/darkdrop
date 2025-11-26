"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { AssetSymbol, ClusterType, DEFAULT_ASSET, DEFAULT_CLUSTER, clusterList } from "@/lib/tokens";

type SettingsState = {
  cluster: ClusterType;
  preferredAsset: AssetSymbol;
  setPreferredAsset: (asset: AssetSymbol) => void;
  setCluster: (cluster: ClusterType) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cluster: DEFAULT_CLUSTER,
      preferredAsset: DEFAULT_ASSET,
      setPreferredAsset: (preferredAsset) => set({ preferredAsset }),
      setCluster: (cluster) => set({ cluster }),
    }),
    {
      name: "darkdrop-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        preferredAsset: state.preferredAsset,
        cluster: state.cluster,
      }),
      merge: (persistedState, currentState) => {
        const partial = persistedState as Partial<SettingsState> | undefined;
        const persistedCluster = partial?.cluster;
        const normalizedCluster = persistedCluster && clusterList.includes(persistedCluster)
          ? persistedCluster
          : DEFAULT_CLUSTER;
        return {
          ...currentState,
          ...partial,
          cluster: normalizedCluster,
        };
      },
    }
  )
);
