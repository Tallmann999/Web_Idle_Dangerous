import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ headless: true, channel: "msedge" });
await mkdir("Art/map-points-review", { recursive: true });
try {
  for (const [name, width, height, zone, highest, first, last, upcoming, art] of [
    ["first", 1600, 900, 1, 10, 1, 10, 0, 1],
    ["second", 1600, 900, 11, 20, 11, 25, 1, 3],
    ["third", 1600, 900, 26, 36, 26, 40, 1, 2],
    ["fourth", 1600, 900, 41, 51, 41, 55, 2, 4],
    ["mobile", 844, 390, 41, 51, 41, 55, 2, 4],
    ["fifth", 1600, 900, 56, 76, 56, 75, 3, 5],
    ["last", 1600, 900, 99, 106, 76, 105, 4, 6],
    ["mobile-last", 844, 390, 99, 106, 76, 105, 4, 6],
    ["mobile-first", 844, 390, 1, 10, 1, 10, 0, 1],
    ["mobile-second", 844, 390, 11, 20, 11, 25, 1, 3],
    ["mobile-third", 844, 390, 26, 36, 26, 40, 1, 2],
    ["mobile-fifth", 844, 390, 56, 76, 56, 75, 3, 5],
  ]) {
    if (process.argv[3] && !name.includes(process.argv[3])) continue;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 900 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("http://127.0.0.1:5184/");
    const seed = await page.evaluate(async ({ zone, highest }) => {
      const { createInitialGameState, getEnemyMaxHp } = await import("/src/game/clickerV3.ts");
      const state = createInitialGameState();
      state.zone = zone; state.highestZone = highest;
      state.enemyHp = state.enemyMaxHp = getEnemyMaxHp(zone);
      state.dungeonCooldowns = { region_4_dungeon_1: Date.now() + 300000 };
      return state;
    }, { zone, highest });
    await context.addInitScript(state => {
      localStorage.setItem("mage-cleanse-world-map-v2", JSON.stringify(state));
      localStorage.setItem("clicker-weapon-adventure-ftue-shown", "1");
      localStorage.setItem("clicker-weapon-adventure-language-v1", "ru");
    }, seed);
    await page.reload();
    await page.locator(".start-game-button").click();
    await page.locator(".open-map-button").click();
    await page.locator(".region-map-canvas").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.querySelectorAll(".region-map-canvas img")].every(i => i.complete && i.naturalWidth));
    const boxes = await page.locator(".world-zone-node, .world-dungeon-node, .map-coming-soon-point").evaluateAll(els => els.map(el => { const b = el.getBoundingClientRect(); return { x:b.x, y:b.y, w:b.width, h:b.height, name:el.getAttribute("aria-label") }; }));
    const overlaps = [];
    for (let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++) { const a=boxes[i],b=boxes[j]; if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>2 && Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>2) overlaps.push([a.name,b.name]); }
    assert.deepEqual(overlaps, [], JSON.stringify({name,overlaps}));
    const levels = await page.locator(".world-zone-node > span").allTextContents();
    assert.deepEqual(levels, Array.from({ length: last - first + 1 }, (_, index) => String(first + index)));
    assert.match(await page.locator(".region-map-art image").getAttribute("href"), new RegExp(`zone-${art}.webp`));
    assert.equal(await page.locator(".map-coming-soon-point").count(), upcoming);
    if (upcoming) {
      const point = page.locator(".map-coming-soon-point").last();
      if (width < 900) await point.tap(); else await point.hover();
      const tooltip = point.locator('[role="tooltip"]');
      await tooltip.waitFor({ state: "visible" });
      assert.equal(await tooltip.innerText(), "Пока в разработке");
      const bounds = await tooltip.boundingBox();
      assert.ok(bounds.x + bounds.width <= width && bounds.y >= 0);
      assert.equal(await page.locator(".region-map-canvas").count(), 1);
    }
    await page.screenshot({ path: `Art/map-points-review/${name}.png` });
    if (name === "second") {
      await page.locator(".whole-world-button").click();
      assert.match(await page.locator(".map-region.current").getAttribute("aria-label"), /^Скованные хребты/);
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ name, levels: levels.length, upcoming, errors }));
    await context.close();
  }
} finally { await browser.close(); }
