import type { NextConfig } from "next";
import path from "path";

process.env.NEXT_USE_TURBOPACK = process.env.NEXT_USE_TURBOPACK ?? "0";

const threadStreamStub = path.resolve(__dirname, "src/lib/stubs/threadStream.ts");
const wbgStub = path.resolve(__dirname, "src/lib/stubs/wbg.ts");

const aliasMap = {
  pino: "pino/browser",
  "pino/lib/transport": "pino/browser",
  "thread-stream": threadStreamStub,
  wbg: wbgStub,
};

const nextConfig: NextConfig = {
  // Mark Light Protocol SDK as external for server components/API routes
  serverExternalPackages: ["@lightprotocol/zk.js"],
  
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      ...aliasMap,
    };

    // Enable WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // WASM loader for .wasm files
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // Handle Light Protocol SDK - exclude from bundling (server-side only)
    if (isServer) {
      // On server, mark @lightprotocol/zk.js as external to prevent bundling
      config.externals = config.externals || [];
      if (typeof config.externals === "function") {
        const originalExternals = config.externals;
        config.externals = [
          ...(Array.isArray(originalExternals) ? originalExternals : []),
          ({ request }: { request?: string }) => {
            if (request === "@lightprotocol/zk.js") {
              return true;
            }
            return originalExternals({ request });
          },
        ];
      } else if (Array.isArray(config.externals)) {
        config.externals.push("@lightprotocol/zk.js");
      }
    } else {
      // On client, mark as unavailable
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        "@lightprotocol/zk.js": false,
      };
    }

    return config;
  },
};

export default nextConfig;
