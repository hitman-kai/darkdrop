import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import nacl from "tweetnacl";

const SALT_LENGTH = 16;
const NONCE_LENGTH = nacl.secretbox.nonceLength;
const KEY_LENGTH = nacl.secretbox.keyLength;
const ITERATIONS = 120_000;

const encoder = new TextEncoder();

const bufferToBase64 = (data: Uint8Array): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(data).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < data.length; i += 1) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
};

const base64ToBuffer = (value: string): Uint8Array => {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const deriveKey = (password: string, salt: Uint8Array): Uint8Array =>
  pbkdf2(sha256, encoder.encode(password), salt, { c: ITERATIONS, dkLen: KEY_LENGTH });

export function encryptPrivateKey(payload: Uint8Array, password: string): string {
  if (!password) {
    throw new Error("Password required");
  }

  const salt = nacl.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const nonce = nacl.randomBytes(NONCE_LENGTH);
  const sealed = nacl.secretbox(payload, nonce, key);

  const sealedPayload = new Uint8Array(SALT_LENGTH + NONCE_LENGTH + sealed.length);
  sealedPayload.set(salt, 0);
  sealedPayload.set(nonce, SALT_LENGTH);
  sealedPayload.set(sealed, SALT_LENGTH + NONCE_LENGTH);

  return bufferToBase64(sealedPayload);
}

export function decryptPrivateKey(encrypted: string, password: string): Uint8Array | null {
  if (!password) {
    return null;
  }
  const payload = base64ToBuffer(encrypted);
  const salt = payload.slice(0, SALT_LENGTH);
  const nonce = payload.slice(SALT_LENGTH, SALT_LENGTH + NONCE_LENGTH);
  const cipher = payload.slice(SALT_LENGTH + NONCE_LENGTH);
  const key = deriveKey(password, salt);
  return nacl.secretbox.open(cipher, nonce, key);
}
