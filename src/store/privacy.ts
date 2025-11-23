"use client";

import { create } from "zustand";

type PrivacyState = {
  privateMode: boolean;
  pending: boolean;
  setPrivateMode: (enabled: boolean) => void;
  setPending: (pending: boolean) => void;
};

export const usePrivacyStore = create<PrivacyState>((set) => ({
  privateMode: false,
  pending: false,
  setPrivateMode: (privateMode) => set({ privateMode }),
  setPending: (pending) => set({ pending }),
}));
