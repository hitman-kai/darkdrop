"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { AssetSymbol, ClusterType, DEFAULT_ASSET, DEFAULT_CLUSTER } from "@/lib/tokens";

type SettingsState = {
  cluster: ClusterType;
  preferredAsset: AssetSymbol;
  setPreferredAsset: (asset: AssetSymbol) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cluster: DEFAULT_CLUSTER,
      preferredAsset: DEFAULT_ASSET,
      setPreferredAsset: (preferredAsset) => set({ preferredAsset }),
    }),
    {
      name: "darkdrop-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        preferredAsset: state.preferredAsset,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<SettingsState>),
        cluster: DEFAULT_CLUSTER,
      }),
    }
  )
);
