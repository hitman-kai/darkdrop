/**
 * pnpmfile hooks allow patching package manifests during installation.
 * We use this to make rpc-websockets@9.x expose the legacy ./dist/lib/client
 * subpath that @lightprotocol/zk.js expects.
 */

function ensureExport(pkg, subpath, target) {
  if (
    typeof pkg.exports === "object" &&
    !Object.prototype.hasOwnProperty.call(pkg.exports, subpath)
  ) {
    pkg.exports[subpath] = target;
  }
}

module.exports = {
  hooks: {
    readPackage(pkg) {
      if (
        pkg.name === "rpc-websockets" &&
        pkg.version &&
        pkg.version.startsWith("9") &&
        pkg.exports
      ) {
        // When exports uses condition names (browser/node) we need to wrap it
        if (
          typeof pkg.exports === "object" &&
          !Object.keys(pkg.exports).every((key) => key.startsWith("."))
        ) {
          pkg.exports = {
            ".": pkg.exports,
          };
        }

        ensureExport(pkg, "./dist/lib/client", "./dist/index.cjs");
        ensureExport(pkg, "./dist/lib/client/websocket", "./dist/lib/client/websocket.cjs");
      }

      return pkg;
    },
  },
};

