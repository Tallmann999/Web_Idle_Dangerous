import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const gameSource = await readFile(new URL("../src/game/Game.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../src/styles/game.css", import.meta.url), "utf8");

test("mobile gameplay recommends landscape but keeps an explicit portrait fallback", () => {
  assert.match(gameSource, /className=\{`mobile-orientation-gate \$\{allowPortraitPlay \? "dismissed" : ""\}`\}/);
  assert.match(gameSource, /ПОВЕРНИТЕ ТЕЛЕФОН/);
  assert.match(gameSource, /ПРОДОЛЖИТЬ ВЕРТИКАЛЬНО/);
  assert.match(cssSource, /@media \(max-width: 820px\) and \(orientation: portrait\)/);
  assert.match(cssSource, /\.mobile-orientation-gate \{[\s\S]*?position:\s*fixed;[\s\S]*?z-index:\s*600/);
});

test("compact landscape keeps every main game panel inside a viewport-locked grid", () => {
  assert.match(cssSource, /@media \(orientation: landscape\) and \(max-height: 700px\)/);
  assert.doesNotMatch(cssSource, /max-height: 700px\) and \(max-width:/);
  assert.match(cssSource, /grid-template-areas:\s*"roster battle" "roster abilities"/);
  assert.match(cssSource, /\.weapon-roster-panel \{ grid-area:\s*roster/);
  assert.match(cssSource, /\.battlefield-panel \{ grid-area:\s*battle/);
  assert.match(cssSource, /\.ability-dock \{ grid-area:\s*abilities/);
  assert.match(cssSource, /grid-template-rows:\s*clamp\(40px, 8\.7dvh, 54px\) minmax\(0, 1fr\)/);
  assert.match(cssSource, /@media \(orientation: landscape\) and \(max-height: 430px\)/);
  assert.match(cssSource, /\.loot-coin \{ width:\s*clamp\(19px, 6dvh, 24px\)/);
  assert.match(cssSource, /\.cost-coin\.compact \{ width:\s*17px/);
  assert.match(cssSource, /\.click-upgrade-card \{ min-height:\s*96px; grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  assert.match(cssSource, /\.zone-track button, \.zone-track button:nth-child\(n\) \{[\s\S]*?flex:\s*1 1 0; min-width:\s*0; min-height:\s*0; height:\s*100%;[\s\S]*?display:\s*grid/);
  assert.match(cssSource, /\.zone-track small \{[\s\S]*?font-size:\s*clamp\(6px, calc\(\.65vw \+ \.35dvh\), 10px\)/);
  assert.match(cssSource, /\.zone-track button\.current \{ transform:\s*none/);
  assert.match(cssSource, /\.zone-track button\.new-zone::after \{[\s\S]*?z-index:\s*3;[\s\S]*?width:\s*100%; height:\s*100%;[\s\S]*?transform:\s*none/);
  assert.match(cssSource, /@keyframes new-zone-alert \{[\s\S]*?font-size:\s*var\(--new-zone-alert-small-size\)/);
  assert.match(cssSource, /\.zone-track button\.new-zone span \{[\s\S]*?font-size:\s*clamp\(5px, calc\(\.55vw \+ \.3dvh\), 9px\)/);
  assert.doesNotMatch(cssSource, /body \{ overflow:\s*auto; \}/);
});

test("touch, safe-area and viewport changes are handled on mobile", () => {
  assert.match(cssSource, /touch-action:\s*manipulation/);
  assert.match(cssSource, /touch-action:\s*pan-y/);
  assert.match(cssSource, /env\(safe-area-inset-bottom\)/);
  assert.match(gameSource, /window\.visualViewport\?\.addEventListener\("resize", updateFtueGuidePosition\)/);
  assert.match(gameSource, /onPointerDown=/);
});

test("mobile combat preloads versioned critical art and reduces expensive rendering work", () => {
  assert.match(gameSource, /const PUBLIC_ASSET_VERSION = "2026-09-05-abilities-bosses"/);
  assert.match(gameSource, /function preloadImage\(url: string\)/);
  assert.match(gameSource, /getCriticalCombatArt\(gameRef\.current\)\.map\(preloadImage\)/);
  assert.match(gameSource, /disabled=\{!startAssetsReady\} aria-busy=\{!startAssetsReady\}/);
  assert.match(gameSource, /const COMBAT_TICK_MS = MOBILE_PERFORMANCE_MODE \? 180 : 100/);
  assert.match(gameSource, /VFX_BUDGETS\[resolvedGraphicsQuality\]/);
  assert.match(gameSource, /<img className="enemy-image" src=\{enemyData\.src\}/);
  assert.match(gameSource, /<img className="projectile-sprite" src=\{PROJECTILE_BY_WEAPON\[shot\.weaponId\]\}/);
  assert.match(cssSource, /@media \(hover: none\) and \(pointer: coarse\) \{[\s\S]*?\.quality-medium \.arena-glow, \.quality-economy \.arena-glow \{ filter:\s*none/);
  assert.match(cssSource, /\.quality-high \.enemy-target:active \.enemy-image \{ filter:\s*brightness\(1\.65\) drop-shadow\(0 0 18px var\(--weapon-color\)\)/);
  assert.match(cssSource, /\.loot-coin \{[\s\S]*?will-change:\s*transform, opacity/);
  assert.match(cssSource, /@keyframes coin-fountain \{[\s\S]*?translate3d\(var\(--coin-start-x\), var\(--coin-start-y\), 0\)/);
});
