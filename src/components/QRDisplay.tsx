"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, Share2 } from "lucide-react";

type QRDisplayProps = {
  value: string;
  label?: string;
};

export function QRDisplay({ value, label = "CLAIM CODE" }: QRDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canShare = useMemo(() => typeof navigator !== "undefined" && Boolean(navigator.share), []);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: 420,
      margin: 1,
      color: {
        dark: "#00ff41",
        light: "#000000",
      },
    })
      .then((url) => {
        if (!active) return;
        setDataUrl(url);
        setError(null);
      })
      .catch(() => {
        if (active) setError("QR generation failed");
      });
    return () => {
      active = false;
    };
  }, [value]);

  const handleCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      setTimeout(() => setCopiedValue(null), 2000);
    } catch {
      setError("Clipboard unavailable");
    }
  };

  const handleShare = async () => {
    if (!canShare || typeof navigator === "undefined") {
      await handleCopy();
      return;
    }
    try {
      await navigator.share({
        title: "DarkDrop",
        text: value,
      });
    } catch {
      await handleCopy();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 border border-[rgba(0,255,65,0.2)] p-4">
      {dataUrl && (
        <Image
          src={dataUrl}
          alt="drop qr"
          width={224}
          height={224}
          className="h-56 w-56 border border-[rgba(0,255,65,0.3)] p-2"
        />
      )}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <div className="w-full space-y-2 text-left">
        <p className="text-xs tracking-[0.4em] text-[rgba(224,224,224,0.7)]">{label}</p>
        <pre className="max-h-32 overflow-y-auto bg-black/60 p-3 text-xs">{value}</pre>
      </div>
      <div className="flex w-full flex-wrap gap-3">
        <button type="button" onClick={handleCopy} className="flex flex-1 items-center justify-center gap-2">
          <Copy size={16} />
          {copiedValue === value ? "COPIED" : "COPY"}
        </button>
        <button type="button" onClick={handleShare} className="flex flex-1 items-center justify-center gap-2">
          <Share2 size={16} />
          SHARE
        </button>
      </div>
    </div>
  );
}
