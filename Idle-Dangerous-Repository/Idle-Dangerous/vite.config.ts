import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const POKI_GAMEPUSH_STUB_ID = "\0poki-gamepush-stub";

// Keep source sheets and unused legacy content in the repository, outside the web build.
function idleRuntimeArt(): Plugin {
  let root = '', out = '';
  return {
    name: 'idle-runtime-art',
    apply: 'build',
    configResolved(config) { root = config.root; out = resolve(root, config.build.outDir); },
    writeBundle() {
      for (const path of ['favicon.svg', 'fonts', 'art/enemies', 'art/bosses', 'art/backgrounds/zone-01.webp',
        'art/backgrounds/zone-02.webp', 'art/backgrounds/zone-03.webp', 'art/backgrounds/zone-04.webp',
        'art/backgrounds/zone-05.webp', 'art/backgrounds/zone-06.webp', 'art/items',
        'art/abilities/strength.webp', 'art/effects/coin.webp', 'audio/gray-impact-1.mp3']) {
        const target = resolve(out, path);
        mkdirSync(dirname(target), { recursive: true });
        cpSync(resolve(root, 'public', path), target, { recursive: true });
      }
    },
  };
}

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
    idleRuntimeArt(),
    ...(mode === "poki" ? [pokiPlatformPlugin()] : []),
  ],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
  },
  build: {
    copyPublicDir: false,
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
    sourcemap: false,
    rolldownOptions: {
      output: { codeSplitting: { groups: [{ name: 'phaser', test: /node_modules[\\/]phaser/ }] } },
    },
  },
}));
