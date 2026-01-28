import fs from "fs/promises";
import process from "process";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

const DEFAULT_RPC =
  process.env.DARKDROP_RPC || "https://mainnet.helius-rpc.com/?api-key=da8de8e3-afd3-457e-9820-a62102ca3c9b";
const USDC_MINT = process.env.DARKDROP_USDC_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value?.startsWith("--")) {
      result[value.replace(/^--/, "")] = args[index + 1];
      index += 1;
    }
  }
  return result;
};

const fromBase64 = (value) => Uint8Array.from(Buffer.from(value, "base64"));

const deriveKey = async (passphrase, salt, iterations) => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
};

const decryptVault = async (vault, passphrase) => {
  const salt = fromBase64(vault.kdf.salt);
  const iv = fromBase64(vault.cipher.iv);
  const ciphertext = fromBase64(vault.ciphertext);
  const key = await deriveKey(passphrase, salt, vault.kdf.iterations);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext));
};

const isCompressedClaim = (code) => typeof code === "string" && code.includes(":compressed:");

const formatAmount = (lamports) => `${(lamports / 1e9).toFixed(4)} SOL`;

const checkSol = async (connection, address) => {
  const balance = await connection.getBalance(new PublicKey(address));
  return { balance, display: formatAmount(balance) };
};

const checkUsdc = async (connection, address) => {
  const ata = await getAssociatedTokenAddress(new PublicKey(USDC_MINT), new PublicKey(address), true);
  const tokenBalance = await connection.getTokenAccountBalance(ata).catch(() => null);
  const amount = tokenBalance?.value?.amount ? BigInt(tokenBalance.value.amount) : 0n;
  const display = tokenBalance?.value?.uiAmountString ?? "0";
  return { amount, display };
};

const checkDrops = async (connection, snapshot) => {
  const results = [];
  for (const drop of snapshot.sentDrops) {
    const entry = {
      address: drop.address,
      asset: drop.asset,
      createdAt: drop.createdAt,
      status: drop.status,
      compressed: isCompressedClaim(drop.claimCode),
      live: "unknown",
      balance: "n/a",
    };

    if (entry.compressed) {
      entry.live = "skipped";
      results.push(entry);
      continue;
    }

    if (drop.asset === "sol") {
      const { balance, display } = await checkSol(connection, drop.address);
      entry.balance = display;
      entry.live = balance > 0 ? "unclaimed" : "claimed";
    } else if (drop.asset === "usdc") {
      const { amount, display } = await checkUsdc(connection, drop.address);
      entry.balance = `${display} USDC`;
      entry.live = amount > 0n ? "unclaimed" : "claimed";
    } else {
      entry.live = "unknown-asset";
    }

    results.push(entry);
  }
  return results;
};

const logResults = (results) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[watchtower] ${timestamp}`);
  results.forEach((entry) => {
    console.log(
      `${entry.live.toUpperCase()} | ${entry.asset.toUpperCase()} | ${entry.balance} | ${entry.address} | ${entry.createdAt}`
    );
  });
};

const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

const main = async () => {
  const args = parseArgs();
  const vaultPath = args.vault;
  const passphrase = args.passphrase;
  const interval = args.interval ? Number.parseInt(args.interval, 10) : 0;

  if (!vaultPath || !passphrase) {
    console.error("Usage: node tools/watchtower/watchtower.mjs --vault <file> --passphrase <passphrase> [--interval 600]");
    process.exit(1);
  }

  const connection = new Connection(DEFAULT_RPC, "confirmed");

  do {
    const raw = await fs.readFile(vaultPath, "utf-8");
    const vault = JSON.parse(raw);
    const snapshot = await decryptVault(vault, passphrase);
    const results = await checkDrops(connection, snapshot);
    logResults(results);
    if (interval > 0) {
      await sleep(interval);
    }
  } while (interval > 0);
};

main().catch((error) => {
  console.error("[watchtower] Error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
