"use client";

import { Keypair } from "@solana/web3.js";
import { create } from "zustand";

type BurnerState = {
  burner: Keypair | null;
  setBurner: (keypair: Keypair | null) => void;
};

export const useBurnerStore = create<BurnerState>((set) => ({
  burner: null,
  setBurner: (keypair) => set({ burner: keypair }),
}));
