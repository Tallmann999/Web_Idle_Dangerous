import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

const gameSource = await readFile(new URL("../src/game/Game.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../src/styles/game.css", import.meta.url), "utf8");
const importScriptSource = await readFile(new URL("../scripts/import-zone-art.py", import.meta.url), "utf8");
const artRoot = new URL("../public/art/", import.meta.url);

test("combat header shows gold as one wide line and removes the duplicate economy strip", () => {
  assert.doesNotMatch(gameSource, /MAGE:? CLEANSE THE CORRUPTION/);
  assert.match(gameSource, /<div ref=\{walletRef\} className=\{`gold-hero/);
  assert.match(gameSource, /className="gold-coin-animated"[^>]*backgroundImage: `url\(\$\{COIN_ART\}\)`/);
  assert.doesNotMatch(gameSource, /<span>ЗОЛОТО<\/span><b aria-hidden="true">◆<\/b>/);
  assert.match(cssSource, /\.gold-hero \{[^}]*display:\s*flex/);
  assert.match(cssSource, /\.gold-hero strong \{[^}]*font:\s*700 clamp\(28px, 2\.2vw, 38px\)/);
  assert.match(cssSource, /\.gold-coin-animated \{[^}]*animation: header-coin-spin/);
  assert.match(cssSource, /\.top-resources \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\) 82px/);
  assert.doesNotMatch(gameSource, /className="economy-summary"/);
  assert.doesNotMatch(cssSource, /\.economy-summary/);
});

test("regular enemies use their regional sprite pools while bosses stay separate", () => {
  assert.match(gameSource, /const REGION_ENEMY_ROSTERS:[\s\S]*?\[32, "Хранитель часа пепла"\]/);
  assert.match(gameSource, /src: publicAssetUrl\(`art\/enemies\/region-\$\{regionId\}-\$\{paddedNumber\}\.webp`\)/);
  assert.match(gameSource, /const REGION_ENEMIES:[\s\S]*?roster\.map\(\(\[number, name\]\)/);
  assert.match(gameSource, /const BOSS_ENEMIES:[\s\S]*?BOSS_NAMES\.map/);
  assert.match(gameSource, /if \(isBossZone\(safeZone\)\) return BOSS_ENEMIES/);
  assert.match(gameSource, /const zoneEnemyOrderCache = new Map<number, readonly EnemyData\[]>\(\)/);
  assert.match(gameSource, /const order = \[\.\.\.REGION_ENEMIES\[region\.id - 1\]\]/);
  assert.match(gameSource, /const swapIndex = \(seed >>> 0\) % \(index \+ 1\)/);
  assert.match(gameSource, /return order\[Math\.max\(0, Math\.floor\(killsInZone\)\) % order\.length\]/);
  assert.match(importScriptSource, /SPRITE_LONG_EDGE = 288/);
  assert.match(importScriptSource, /SPRITE_QUALITY = 68/);
  assert.match(importScriptSource, /KEPT_ENEMY_NUMBERS = \{/);
});

test("each campaign region uses its numbered optimized background", () => {
  assert.match(gameSource, /const REGION_ARENA_BACKGROUNDS/);
  assert.match(gameSource, /art\/backgrounds\/zone-\$\{String\(index \+ 1\)\.padStart\(2, "0"\)\}\.webp/);
  assert.match(gameSource, /function getArenaBackground\(zone: number\)/);
  assert.match(gameSource, /const region = getMapRegionForZone\(safeZone\)/);
  assert.match(gameSource, /return REGION_ARENA_BACKGROUNDS\[region\.id - 1\]/);
  assert.match(gameSource, /function getDungeonArenaBackground\(regionId: number, _slot: number\)/);
  assert.match(gameSource, /getDungeonArenaBackground\(activeDungeon\.regionId, activeDungeon\.slot\)/);
  assert.match(gameSource, /getArenaBackground\(game\.zone\)/);
  assert.match(gameSource, /"--arena-background": `url\(\$\{arenaBackground\}\)`/);
  assert.match(importScriptSource, /BACKGROUND_LONG_EDGE = 1280/);
  assert.match(importScriptSource, /BACKGROUND_QUALITY = 65/);
});

test("new weapon art replaces placeholders", () => {
  assert.match(gameSource, /function publicAssetUrl\(path: string\)/);
  assert.match(gameSource, /const WEAPON_ART_BY_WEAPON/);
  assert.match(gameSource, /gray_weapon: publicAssetUrl\("art\/weapons\/gray\.webp"\)/);
  assert.match(gameSource, /className="weapon-art" style=\{\{ "--weapon-image"/);
  assert.doesNotMatch(gameSource, /className="weapon-art"><i \/><b>✦<\/b>/);
  assert.match(cssSource, /background-image:\s*var\(--weapon-image\)/);
  assert.match(cssSource, /\.weapon-art \{[\s\S]*?aspect-ratio:\s*1\.5 \/ 1/);
  assert.match(cssSource, /background-size:\s*92% auto, 100% 100%/);
  assert.match(cssSource, /\.weapon-card\.selected::after \{[\s\S]*?animation:\s*weapon-frame-glow \.8s/);
  assert.match(cssSource, /@keyframes weapon-frame-glow/);
  assert.match(cssSource, /\.weapon-title \.weapon-level \{[^}]*text-shadow:\s*none/);
  assert.match(cssSource, /@keyframes weapon-frame-glow[\s\S]*?inset 0 0 24px[\s\S]*?0 0 20px/);
  assert.doesNotMatch(cssSource, /@keyframes weapon-frame-glow\s*\{[^}]*filter:/);
  assert.doesNotMatch(cssSource, /\.weapon-card\.selected \{[^}]*border-(?:left-)?width/);
});

test("all imported gameplay art is optimized WebP", async () => {
  const expectedCounts = { backgrounds: 7, bosses: 18, abilities: 9, effects: 1, enemies: 88, projectiles: 6, weapons: 6 };
  let totalBytes = 0;
  let totalFiles = 0;
  for (const [folder, expectedCount] of Object.entries(expectedCounts)) {
    const folderUrl = new URL(`${folder}/`, artRoot);
    const files = (await readdir(folderUrl)).filter((file) => file.endsWith(".webp"));
    assert.equal(files.length, expectedCount, `${folder} WebP count`);
    for (const file of files) {
      const fileUrl = new URL(file, folderUrl);
      const info = await stat(fileUrl);
      const header = await readFile(fileUrl);
      assert.equal(header.subarray(0, 4).toString("ascii"), "RIFF");
      assert.equal(header.subarray(8, 12).toString("ascii"), "WEBP");
      assert.ok(info.size < 400_000, `${folder}/${file} should stay web-optimized`);
      totalBytes += info.size;
      totalFiles += 1;
    }
  }
  const runtimeAbilities = (await readdir(new URL("abilities/", artRoot))).filter((file) => file.endsWith(".webp")).sort();
  assert.deepEqual(runtimeAbilities, [
    "abyss.webp", "agility.webp", "critical.webp", "gold-bag.webp", "ice-rain.webp",
    "leadership.webp", "speed.webp", "strength.webp", "wolf-summon.webp",
  ]);
  assert.equal(totalFiles, 135);
  assert.ok(totalBytes < 8_000_000, `art bundle is ${totalBytes} bytes`);
});
