export type VaultSentEntry = {
  address: string;
  amount: string;
  asset: string;
  cluster: string;
  claimCode?: string;
  createdAt: string;
  status: string;
};

export type VaultClaimedEntry = {
  address: string;
  amount: string;
  asset: string;
  cluster: string;
  signature: string;
  claimedAt: string;
};

export type VaultSnapshot = {
  sentDrops: VaultSentEntry[];
  claimedDrops: VaultClaimedEntry[];
};

export type VaultExport = {
  version: number;
  createdAt: string;
  kdf: {
    name: "PBKDF2";
    hash: "SHA-256";
    iterations: number;
    salt: string;
  };
  cipher: {
    name: "AES-GCM";
    iv: string;
  };
  ciphertext: string;
  entries: {
    sent: number;
    claimed: number;
  };
};

const encoder = new TextEncoder();

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const deriveKey = async (passphrase: string, salt: Uint8Array, iterations: number) => {
  const passphraseBytes = encoder.encode(passphrase);
  const keyMaterial = await crypto.subtle.importKey("raw", passphraseBytes as BufferSource, "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export const buildEncryptedVault = async (snapshot: VaultSnapshot, passphrase: string): Promise<VaultExport> => {
  const trimmed = passphrase.trim();
  if (!trimmed) {
    throw new Error("Passphrase required for vault export.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 210_000;

  const key = await deriveKey(trimmed, salt, iterations);
  const plaintext = encoder.encode(JSON.stringify(snapshot));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      plaintext as BufferSource
    )
  );

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations,
      salt: toBase64(salt),
    },
    cipher: {
      name: "AES-GCM",
      iv: toBase64(iv),
    },
    ciphertext: toBase64(ciphertext),
    entries: {
      sent: snapshot.sentDrops.length,
      claimed: snapshot.claimedDrops.length,
    },
  };
};
