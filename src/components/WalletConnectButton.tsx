"use client";

import { PlugZap, Unplug } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useMemo } from "react";

export function WalletConnectButton() {
  const { connected, connecting, disconnect, disconnecting, publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const label = useMemo(() => {
    if (connecting) return "CONNECTING...";
    if (disconnecting) return "DISCONNECTING...";
    if (connected && publicKey) {
      const address = publicKey.toBase58();
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }
    return "CONNECT WALLET";
  }, [connected, connecting, disconnecting, publicKey]);

  const handlePrimary = () => {
    setVisible(true);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={handlePrimary}
        className="flex items-center gap-2 border border-[rgba(0,255,65,0.5)] bg-[rgba(0,255,65,0.08)] px-4 py-2 text-xs tracking-[0.2em]"
      >
        <PlugZap size={16} />
        {label}
      </button>
      {connected && (
        <button
          type="button"
          onClick={() => disconnect()}
          className="flex items-center gap-2 border border-[rgba(255,0,68,0.4)] bg-[rgba(255,0,68,0.1)] px-4 py-2 text-xs tracking-[0.2em]"
        >
          <Unplug size={16} />
          KILL SESSION
        </button>
      )}
    </div>
  );
}
