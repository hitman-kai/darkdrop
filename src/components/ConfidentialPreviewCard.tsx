"use client";

import { Shield } from "lucide-react";

type ConfidentialPreviewCardProps = {
  enabled: boolean;
  pending?: boolean;
  notes: string[];
  onToggle?: (enabled: boolean) => void;
  disabledReason?: string;
  description?: string;
  label?: string;
  interactive?: boolean;
};

const DEFAULT_DESCRIPTION =
  "Confidential transfers will encrypt amounts once Phase 2 lands. Preview-only; sending is disabled for now.";

export function ConfidentialPreviewCard({
  enabled,
  pending,
  notes,
  onToggle,
  disabledReason,
  description = DEFAULT_DESCRIPTION,
  label = "PRIVATE MODE (PREVIEW)",
  interactive = true,
}: ConfidentialPreviewCardProps) {
  const checkbox = (
    <input
      type="checkbox"
      className="size-4 border border-[rgba(0,255,65,0.4)] bg-transparent text-[var(--accent)]"
      checked={enabled}
      disabled={!interactive || !!disabledReason}
      onChange={(event) => onToggle?.(event.target.checked)}
    />
  );

  return (
    <div className="space-y-2 border border-[rgba(0,255,65,0.2)] p-4 text-xs">
      <label className="flex items-center gap-2 uppercase tracking-[0.3em] text-[rgba(224,224,224,0.7)]">
        {interactive ? checkbox : <span className="inline-flex size-4 items-center justify-center">{"\u2022"}</span>}
        {label}
      </label>
      <p className="text-[rgba(224,224,224,0.6)]">{description}</p>
      {disabledReason && <p className="text-[var(--danger)]">{disabledReason}</p>}
      {enabled && (
        <div className="space-y-1 text-[rgba(224,224,224,0.75)]">
          <p className="flex items-center gap-2 text-[rgba(0,255,65,0.8)]">
            <Shield size={14} />
            {pending ? "Building proof preview..." : "Proof preview"}
          </p>
          <ul className="space-y-1">
            {notes.length === 0
              ? [<li key="empty">{"\u2022"} No proof info yet.</li>]
              : notes.map((note, index) => (
                  <li key={`${index}-${note.slice(0, 20)}`}>
                    {"\u2022"} {note}
                  </li>
                ))}
          </ul>
        </div>
      )}
    </div>
  );
}
