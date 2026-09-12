import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const gameSource = await readFile(new URL("../src/game/Game.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../src/styles/game.css", import.meta.url), "utf8");

test("every normal enemy death launches three to five clickable coins", () => {
  assert.match(gameSource, /bossFountain \? 4 \+ Math\.floor\(Math\.random\(\) \* 3\) : 3 \+ Math\.floor\(Math\.random\(\) \* 3\)/);
  assert.match(gameSource, /spawnLootCoins\(\)/);
  assert.match(gameSource, /className=\{`loot-coin \$\{coin\.phase\}`\}/);
  assert.match(gameSource, /aria-label="Собрать монету"/);
  assert.match(gameSource, /onClick=\{\(event\) => collectLootCoin\(coin\.id, event\.currentTarget\)\}/);
  assert.match(gameSource, /spinDelayMs: -Math\.round\(Math\.random\(\) \* 580\)/);
});

test("coins land no lower than the enemy feet and rest for three seconds", () => {
  assert.match(gameSource, /const floorY = enemyRect\.top \+ enemyRect\.height \* \.88/);
  assert.match(gameSource, /landY: floorY - Math\.random\(\) \* 9/);
  assert.match(gameSource, /const COIN_GROUND_LIFETIME_MS = 3_000/);
  assert.match(gameSource, /groundLifetimeMs: bossFountain \? BOSS_COIN_GROUND_LIFETIME_MS : COIN_GROUND_LIFETIME_MS/);
  assert.match(gameSource, /phase: "resting"/);
  assert.match(gameSource, /coin\.delayMs \+ coin\.fallMs \+ coin\.groundLifetimeMs/);
  assert.match(cssSource, /@keyframes coin-fountain/);
  assert.match(cssSource, /\.loot-coin\.resting/);
});

test("manual or automatic collection flies coins into the gold wallet", () => {
  assert.match(gameSource, /walletRef\.current\?\.getBoundingClientRect\(\)/);
  assert.match(gameSource, /phase: "collecting"/);
  assert.match(gameSource, /const COIN_COLLECT_FLIGHT_MS = 620/);
  assert.match(gameSource, /const COIN_COLLECT_FALLBACK_MS = COIN_COLLECT_FLIGHT_MS \+ 280/);
  assert.match(gameSource, /key=\{coin\.id\}/);
  assert.match(gameSource, /event\.animationName === "coin-wallet-flight"/);
  assert.match(gameSource, /finishLootCoinCollection\(coin\.id\)/);
  assert.match(gameSource, /setWalletPulseTick\(\(tick\) => tick \+ 1\)/);
  assert.match(gameSource, /const BOSS_COIN_VISIBLE_LIMIT = BOSS_COIN_FOUNTAIN_WAVES \* 6/);
  assert.match(gameSource, /visibleLimit - coins\.length/);
  assert.match(cssSource, /@keyframes coin-wallet-flight/);
  assert.match(cssSource, /\.gold-hero\.wallet-pulse-a/);
  assert.match(cssSource, /@keyframes coin-spin/);
});

test("coin sounds use the shared effects channel", async () => {
  assert.match(gameSource, /playEffect\(kind === "drop" \? "coin-drop\.mp3" : "coin-collect\.mp3"\)/);
  assert.match(gameSource, /playCoinSound\("drop"\)/);
  assert.match(gameSource, /playCoinSound\("collect"\)/);

  const dropAudio = await stat(new URL("../public/audio/coin-drop.mp3", import.meta.url));
  const collectAudio = await stat(new URL("../public/audio/coin-collect.mp3", import.meta.url));
  assert.ok(dropAudio.size < 100_000);
  assert.ok(collectAudio.size < 100_000);
});

test("campaign and dungeon boss victories use the optimized five-second jackpot sound through global audio controls", async () => {
  assert.match(gameSource, /const BOSS_JACKPOT_SOUND_MS = 5_000/);
  assert.match(gameSource, /playEffect\("boss-jackpot\.mp3", 1, BOSS_JACKPOT_SOUND_MS \/ 1000\)/);
  assert.match(gameSource, /const BOSS_COIN_FOUNTAIN_WAVES = 12/);
  assert.match(gameSource, /playBossCoinFountain\(\);[\s\S]*?showToast\(`\$\{dungeon\.name\} побеждён/);

  const jackpotAudio = await stat(new URL("../public/audio/boss-jackpot.mp3", import.meta.url));
  assert.ok(jackpotAudio.size < 120_000);
});
