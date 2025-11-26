"use client";

import { CLUSTER_LABELS, clusterList } from "@/lib/tokens";
import { useSettingsStore } from "@/store/settings";

type Props = {
  className?: string;
};

export function ClusterToggle({ className }: Props) {
  const cluster = useSettingsStore((state) => state.cluster);
  const setCluster = useSettingsStore((state) => state.setCluster);

  if (clusterList.length <= 1) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 text-xs ${className ?? ""}`}>
      {clusterList.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => setCluster(key)}
          className={`border px-3 py-2 tracking-[0.3em] ${
            cluster === key ? "border-[var(--accent)] text-[var(--accent)]" : "border-[rgba(0,255,65,0.2)]"
          }`}
        >
          {CLUSTER_LABELS[key]}
        </button>
      ))}
    </div>
  );
}

