import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from "../Modules/storage/safeLocalStorage.ts";
import { resolvePlatformId } from "../src/platform/config.ts";

test("platform selection keeps local, GamePush and Poki builds isolated", () => {
  assert.equal(resolvePlatformId({}), "local");
  assert.equal(resolvePlatformId({ VITE_GAMEPUSH_ENABLED: "true" }), "gamepush");
  assert.equal(resolvePlatformId({ VITE_PLATFORM: "poki", VITE_GAMEPUSH_ENABLED: "true" }), "poki");
  assert.equal(resolvePlatformId({ VITE_PLATFORM: "local", VITE_GAMEPUSH_ENABLED: "true" }), "local");
});

test("Poki build explicitly selects Poki and disables GamePush", async () => {
  const script = await readFile(new URL("../scripts/build-poki.ps1", import.meta.url), "utf8");
  const viteConfig = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.match(script, /VITE_PLATFORM\s*=\s*"poki"/);
  assert.match(script, /VITE_GAMEPUSH_ENABLED\s*=\s*"false"/);
  assert.match(viteConfig, /mode === "poki"/);
  assert.match(viteConfig, /https:\/\/game-cdn\.poki\.com\/scripts\/v2\/poki-sdk\.js/);
  assert.match(viteConfig, /poki-platform-isolation/);
});

test("gameplay uses only the shared platform bridge for rewarded ads", async () => {
  const game = await readFile(new URL("../src/game/Game.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(game, /platform\/gamepush|\bgamePush\b/);
  assert.equal(game.match(/platformBridge\.rewardedBreak\(\)/g)?.length, 3);
});

test("safe storage falls back to session memory when localStorage is blocked", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new Error("blocked"); },
  });

  try {
    assert.equal(writeLocalStorage("poki-incognito-test", "session-value"), true);
    assert.equal(readLocalStorage("poki-incognito-test"), "session-value");
    assert.equal(removeLocalStorage("poki-incognito-test"), true);
    assert.equal(readLocalStorage("poki-incognito-test"), null);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else delete globalThis.localStorage;
  }
});
