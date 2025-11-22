"use client";

export const amountToUnits = (value: string, decimals: number): bigint => {
  const normalized = value.trim();
  if (!normalized) return 0n;
  if (normalized.startsWith("-")) {
    throw new Error("Amount cannot be negative");
  }
  const [whole, fraction = ""] = normalized.split(".");
  const cleanWhole = whole.replace(/[^0-9]/g, "") || "0";
  const cleanFraction = fraction.replace(/[^0-9]/g, "").slice(0, decimals);
  const paddedFraction = cleanFraction.padEnd(decimals, "0");
  const combined = `${cleanWhole}${paddedFraction}`;
  return BigInt(combined);
};

export const unitsToAmount = (units: bigint, decimals: number, precision = decimals): string => {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const padded = absolute.toString().padStart(decimals + 1, "0");
  const integer = padded.slice(0, padded.length - decimals);
  const fraction = padded.slice(padded.length - decimals).slice(0, precision).replace(/0+$/, "");
  return `${negative ? "-" : ""}${integer}${fraction ? `.${fraction}` : ""}`;
};
