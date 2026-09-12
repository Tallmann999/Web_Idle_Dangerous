import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const POKI_GAMEPUSH_STUB_ID = "\0poki-gamepush-stub";

function pokiPlatformPlugin(): Plugin {
  return {
    name: "poki-platform-isolation",
    resolveId(source, importer) {
      const isPlatformImport = importer?.replaceAll("\\", "/").includes("/src/platform/");
      if (isPlatformImport && (source === "./gamepush" || source === "./gamepush.ts")) return POKI_GAMEPUSH_STUB_ID;
      return null;
    },
    load(id) {
      if (id !== POKI_GAMEPUSH_STUB_ID) return null;
      return `export const gamePush = {
        isReady: false,
        getSdk: () => null,
        initialize: async () => false,
        showPreloader: async () => false,
        showInterstitial: async () => false,
        showRewarded: async () => false,
      };`;
    },
    transformIndexHtml() {
      return [{
        tag: "script",
        attrs: { src: "https://game-cdn.poki.com/scripts/v2/poki-sdk.js" },
        injectTo: "head" as const,
      }];
    },
  };
}

export default defineConfig(({ mode }) => ({
  // Relative URLs let the same ZIP run from a portal subdirectory or iframe.
  base: "./",
  define: {
    __POKI_PRODUCTION__: JSON.stringify(mode === "poki"),
  },
  plugins: [
    react(),
    ...(mode === "poki" ? [pokiPlatformPlugin()] : []),
  ],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
    sourcemap: false,
  },
}));
