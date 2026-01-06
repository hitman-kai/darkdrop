/**
 * Server-only Light Protocol SDK loader
 * 
 * This file is only used on the server side (API routes).
 * It uses dynamic imports to prevent bundling issues.
 */

/**
 * Dynamically load Light Protocol SDK (Node.js-only, can't be bundled)
 * Uses require() since we're in a Node.js server context
 */
export async function loadLightSDK() {
  try {
    // Use require() directly since we're in Node.js server context
    // This avoids ESM import issues and works better with packages that may not be fully built
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const lightSDK = require("@lightprotocol/zk.js");
    console.log("[Light SDK Loader] Successfully loaded using require()");
    return lightSDK;
  } catch (requireError) {
    console.error("[Light SDK Loader] require() failed:", requireError);
    
    // Try dynamic import as fallback
    try {
      const modulePath = "@lightprotocol/zk.js";
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const importFn = new Function("p", "return import(p)");
      const lightSDK = await importFn(modulePath);
      console.log("[Light SDK Loader] Successfully loaded using dynamic import()");
      return lightSDK;
    } catch (importError) {
      console.error("[Light SDK Loader] dynamic import() also failed:", importError);
    }

    const errorMessage = requireError instanceof Error ? requireError.message : String(requireError);
    throw new Error(`Failed to load Light Protocol SDK: ${errorMessage}. The package may need to be built. Try: cd node_modules/@lightprotocol/zk.js && npm run build`);
  }
}

