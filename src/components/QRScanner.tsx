"use client";

import { useEffect, useId, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { ShieldAlert } from "lucide-react";

type QRScannerProps = {
  onScan: (payload: string) => void;
};

export function QRScanner({ onScan }: QRScannerProps) {
  const containerId = useId();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      containerId,
      {
        fps: 8,
        qrbox: 220,
        disableFlip: false,
        rememberLastUsedCamera: true,
        aspectRatio: 1,
      },
      false
    );

    scanner.render(
      (decoded) => {
        onScan(decoded);
        setError(null);
      },
      (scanError) => {
        if (!scanError) return;
        setError("SCANNER NOISE");
        setTimeout(() => setError(null), 1000);
      }
    );

    return () => {
      scanner.clear().catch(() => undefined);
    };
  }, [containerId, onScan]);

  return (
    <div className="w-full space-y-2">
      <div id={containerId} className="min-h-[260px] border border-[rgba(0,255,65,0.2)]" />
      {error && (
        <p className="flex items-center gap-2 text-xs text-[var(--danger)]">
          <ShieldAlert size={14} />
          {error}
        </p>
      )}
    </div>
  );
}
