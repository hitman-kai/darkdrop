import type { NextConfig } from "next";
import path from "path";

process.env.NEXT_USE_TURBOPACK = process.env.NEXT_USE_TURBOPACK ?? "0";

const threadStreamStub = path.resolve(__dirname, "src/lib/stubs/threadStream.ts");

const aliasMap = {
  pino: "pino/browser",
  "pino/lib/transport": "pino/browser",
  "thread-stream": threadStreamStub,
};

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      ...aliasMap,
    };
    return config;
  },
};

export default nextConfig;
