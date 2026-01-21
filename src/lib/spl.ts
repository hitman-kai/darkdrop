import type { Connection } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { getMint, getTokenMetadata, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { deserializeMetadata } from "@metaplex-foundation/mpl-token-metadata";

export type SplTokenMeta = {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  program: "token" | "token-2022";
  metadataSource?: "jupiter" | "token-2022" | "metaplex" | "none";
};

type JupiterToken = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
};

let tokenListCache: { loadedAt: number; tokens: Record<string, JupiterToken> } | null = null;
const TOKEN_LIST_TTL_MS = 10 * 60 * 1000;
const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

const loadJupiterTokenList = async (): Promise<Record<string, JupiterToken>> => {
  if (tokenListCache && Date.now() - tokenListCache.loadedAt < TOKEN_LIST_TTL_MS) {
    return tokenListCache.tokens;
  }
  const response = await fetch("https://token.jup.ag/strict");
  if (!response.ok) {
    throw new Error("Unable to load token list");
  }
  const tokens = (await response.json()) as JupiterToken[];
  const map: Record<string, JupiterToken> = {};
  for (const token of tokens) {
    map[token.address] = token;
  }
  tokenListCache = { loadedAt: Date.now(), tokens: map };
  return map;
};

export const validateMintAddress = (value: string): PublicKey => {
  try {
    return new PublicKey(value);
  } catch {
    throw new Error("Invalid mint address");
  }
};

export const getMintProgram = async (connection: Connection, mintAddress: string) => {
  const mint = validateMintAddress(mintAddress);
  const info = await connection.getAccountInfo(mint);
  if (!info) {
    throw new Error("Mint not found on-chain");
  }
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    return TOKEN_2022_PROGRAM_ID;
  }
  return TOKEN_PROGRAM_ID;
};

const cleanMetadataText = (value: string) => value.replace(/\0/g, "").trim();

const fetchOnchainMetadata = async (connection: Connection, mintAddress: string) => {
  const mint = validateMintAddress(mintAddress);
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID
  );
  const accountInfo = await connection.getAccountInfo(metadataPda);
  if (!accountInfo?.data) return null;

  const metadata = deserializeMetadata({
    publicKey: metadataPda.toBase58(),
    owner: accountInfo.owner.toBase58(),
    lamports: accountInfo.lamports,
    executable: accountInfo.executable,
    data: accountInfo.data,
  });
  const name = cleanMetadataText(metadata.data.name);
  const symbol = cleanMetadataText(metadata.data.symbol);
  const uri = cleanMetadataText(metadata.data.uri);

  return { name, symbol, uri };
};

export const fetchSplMetadata = async (
  connection: Connection,
  mintAddress: string
): Promise<SplTokenMeta> => {
  const mint = validateMintAddress(mintAddress);
  const [tokenList, programId] = await Promise.all([
    loadJupiterTokenList().catch(() => ({})),
    getMintProgram(connection, mintAddress),
  ]);

  const entry = tokenList[mint.toBase58()];
  let decimals = entry?.decimals ?? 0;
  let name = entry?.name ?? "";
  let symbol = entry?.symbol ?? "";
  let logoURI = entry?.logoURI;
  let metadataSource: SplTokenMeta["metadataSource"] = entry ? "jupiter" : undefined;

  if (!entry) {
    const mintInfo = await getMint(connection, mint, "confirmed", programId);
    decimals = mintInfo.decimals;
  }

  if (programId.equals(TOKEN_2022_PROGRAM_ID)) {
    try {
      const tokenMeta = await getTokenMetadata(connection, mint, "confirmed", programId);
      if (tokenMeta) {
        name = name || cleanMetadataText(tokenMeta.name);
        symbol = symbol || cleanMetadataText(tokenMeta.symbol);
        const additional = tokenMeta.additionalMetadata ?? [];
        const imageEntry = additional.find(([key]) => key.toLowerCase() === "image");
        if (!logoURI && imageEntry?.[1]) {
          logoURI = imageEntry[1];
        }
        if (!logoURI && tokenMeta.uri) {
          const metadataRes = await fetch(tokenMeta.uri);
          if (metadataRes.ok) {
            const json = (await metadataRes.json()) as { name?: string; symbol?: string; image?: string };
            name = name || json.name || "";
            symbol = symbol || json.symbol || "";
            logoURI = json.image || logoURI;
          }
        }
        metadataSource = metadataSource ?? "token-2022";
      }
    } catch {
      // Ignore token-2022 metadata failures
    }
  }

  if (!name || !symbol || !logoURI) {
    try {
      const onchain = await fetchOnchainMetadata(connection, mintAddress);
      if (onchain) {
        name = name || onchain.name;
        symbol = symbol || onchain.symbol;
        if (!logoURI && onchain.uri) {
          const metadataRes = await fetch(onchain.uri);
          if (metadataRes.ok) {
            const json = (await metadataRes.json()) as { name?: string; symbol?: string; image?: string };
            name = name || json.name || "";
            symbol = symbol || json.symbol || "";
            logoURI = json.image || logoURI;
          }
        }
        metadataSource = metadataSource ?? "metaplex";
      }
    } catch {
      // Ignore metadata failures; we still return decimals and program
    }
  }

  return {
    mint: mint.toBase58(),
    name: name || "Custom SPL Token",
    symbol: symbol || "SPL",
    decimals,
    logoURI,
    program: programId.equals(TOKEN_2022_PROGRAM_ID) ? "token-2022" : "token",
    metadataSource: metadataSource ?? "none",
  };
};
