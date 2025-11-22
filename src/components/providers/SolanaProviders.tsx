"use client";

import { ReactNode, useMemo } from "react";
import type { WalletAdapter } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { BraveWalletAdapter } from "@solana/wallet-adapter-brave";
import { LedgerWalletAdapter } from "@solana/wallet-adapter-ledger";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";

import { BurnerWalletAdapter } from "@/lib/burnerWalletAdapter";
import { getRpcEndpoint } from "@/lib/tokens";
import { useBurnerStore } from "@/store/burner";
import { useSettingsStore } from "@/store/settings";

import "@solana/wallet-adapter-react-ui/styles.css";

type Props = {
  children: ReactNode;
};

export function SolanaProviders({ children }: Props) {
  const burner = useBurnerStore((state) => state.burner);
  const cluster = useSettingsStore((state) => state.cluster);

  const baseWallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new BackpackWalletAdapter(),
      new SolflareWalletAdapter(),
      new BraveWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  const endpoint = useMemo(() => getRpcEndpoint(cluster), [cluster]);

  const wallets = useMemo<WalletAdapter[]>(() => {
    const list: WalletAdapter[] = [...baseWallets];
    if (burner) {
      list.push(new BurnerWalletAdapter(burner) as unknown as WalletAdapter);
    }
    return list;
  }, [baseWallets, burner]);

  return (
    <ConnectionProvider endpoint={endpoint} key={cluster} config={{ commitment: "processed" }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
