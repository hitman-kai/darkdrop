"use client";

import { clusterList, CLUSTER_LABELS, ClusterType } from "@/lib/tokens";
import { useSettingsStore } from "@/store/settings";

const buttonBase =
  "px-2 py-0.5 text-[0.55rem] tracking-[0.25em] transition border border-[rgba(0,255,65,0.3)]";

export function SettingsDock() {
  const cluster = useSettingsStore((state) => state.cluster);
  const setCluster = useSettingsStore((state) => state.setCluster);

  const handleClusterChange = (value: ClusterType) => {
    setCluster(value);
  };

  return (
    <div className="fixed right-3 top-3 z-30 flex flex-col gap-1.5 border border-[rgba(0,255,65,0.2)] bg-black/80 px-2 py-2 text-[0.55rem] uppercase tracking-[0.3em]">
      <p className="text-[rgba(224,224,224,0.6)] text-[0.5rem]">CLUSTER</p>
      <div className="flex gap-1.5">
        {clusterList.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleClusterChange(value)}
            className={`${buttonBase} ${
              cluster === value ? "bg-[rgba(0,255,65,0.2)] text-[var(--accent)]" : "text-[rgba(224,224,224,0.6)]"
            }`}
          >
            {CLUSTER_LABELS[value]}
          </button>
        ))}
      </div>
      <p className="text-[rgba(224,224,224,0.45)] normal-case text-[0.5rem]">
        Devnet enabled by default. Switch to mainnet post-launch.
      </p>
    </div>
  );
}
