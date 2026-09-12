/// <reference types="vite/client" />

declare const __POKI_PRODUCTION__: boolean;

interface ImportMetaEnv {
  readonly VITE_PLATFORM?: "local" | "gamepush" | "poki";
  readonly VITE_GAMEPUSH_ENABLED?: string;
  readonly VITE_GAMEPUSH_PROJECT_ID?: string;
  readonly VITE_GAMEPUSH_PUBLIC_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
