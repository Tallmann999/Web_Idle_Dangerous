import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const gameSource = await readFile(new URL("../src/game/Game.tsx", import.meta.url), "utf8");
const performanceSource = await readFile(new URL("../src/game/performance.ts", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../src/styles/game.css", import.meta.url), "utf8");

test("combat publishes a five-hertz snapshot from one shared gameplay heartbeat", () => {
  assert.match(gameSource, /const CLOCK_TICK_MS = 200/);
  assert.match(gameSource, /const heartbeat = \(\) =>/);
  assert.match(gameSource, /window\.setInterval\(heartbeat, COMBAT_TICK_MS\)/);
  assert.match(gameSource, /else if \(!currentAttempt && !mapOpen/);
  assert.doesNotMatch(gameSource, /setInterval\(launchIceRainProjectile/);
  assert.doesNotMatch(gameSource, /setInterval\([^\n]*playSeconds/);
});

test("hidden tabs keep AFK combat progressing and flush the latest save", () => {
  assert.match(gameSource, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/);
  assert.match(gameSource, /setPageHidden\(hidden\)/);
  assert.match(gameSource, /const afkTick = document\.hidden \|\| resumeAfkCatchUpRef\.current \|\| realElapsed > 1/);
  assert.match(gameSource, /advanceAfkCombat\(current, afkDps \* bossBoostMultiplier, elapsed\)/);
  assert.match(gameSource, /gameServices\.saves\.flush\(\)/);
  assert.match(cssSource, /\.game-shell\.is-paused \*/);
});

test("stable interface panels are memoized away from combat HP updates", () => {
  assert.match(gameSource, /const WeaponRosterPanel = memo/);
  assert.match(gameSource, /const TopBar = memo/);
  assert.match(gameSource, /const AbilityDock = memo/);
  assert.match(gameSource, /previous\.weapons === next\.weapons/);
});

test("quality modes set explicit VFX and audio budgets", () => {
  assert.match(performanceSource, /economy: \{ shots: 3, damageNumbers: 8, coins: 16, iceRainShots: 6, audioChannels: 3 \}/);
  assert.match(performanceSource, /navigator\.hardwareConcurrency/);
  assert.match(performanceSource, /class AudioChannelPool/);
  assert.match(gameSource, /quality-\$\{resolvedGraphicsQuality\}/);
  assert.match(cssSource, /\.quality-economy \.arena-glow/);
});

test("combat art only warms the current and next encounters", () => {
  assert.match(gameSource, /function getNextCombatArt/);
  assert.match(gameSource, /getNextCombatArt\(gameRef\.current\)\.map\(preloadImage\)/);
  assert.doesNotMatch(gameSource, /Object\.values\(WEAPON_ART_BY_WEAPON\)/);
});
