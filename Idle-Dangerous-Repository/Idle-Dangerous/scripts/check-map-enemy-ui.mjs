import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const output = "Art/map-enemy-review";
await mkdir(output, { recursive: true });
try {
  for (const [name, width, height, zone, highest] of [
    ["desktop", 1920, 900, 56, 56], ["mobile", 844, 390, 56, 56],
    ["window", 900, 600, 56, 56], ["start", 1600, 900, 1, 1],
    ["complete", 1600, 900, 104, 106],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5182/");
    const seed = await page.evaluate(async ({ zone, highest }) => {
      const { createInitialGameState, getEnemyMaxHp } = await import("/src/game/clickerV3.ts");
      const state = createInitialGameState();
      state.zone = zone; state.highestZone = highest;
      state.enemyHp = state.enemyMaxHp = getEnemyMaxHp(zone);
      return state;
    }, { zone, highest });
    await context.addInitScript((state) => {
      localStorage.setItem("mage-cleanse-world-map-v2", JSON.stringify(state));
      localStorage.setItem("clicker-weapon-adventure-ftue-shown", "1");
    }, seed);
    await page.reload();
    await page.locator(".start-game-button").click();
    await page.locator(".enemy-image").waitFor();
    await page.waitForFunction(() => document.querySelector(".enemy-image")?.naturalWidth > 0);
    const geometry = await page.evaluate(() => {
      const img = document.querySelector(".enemy-image");
      const box = img.getBoundingClientRect();
      const stage = document.querySelector(".combat-stage").getBoundingClientRect();
      const heading = document.querySelector(".encounter-heading").getBoundingClientRect();
      const name = document.querySelector(".enemy-nameplate").getBoundingClientRect();
      const scale = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
      return { height: img.naturalHeight * scale, stageHeight: stage.height, top: box.top - heading.bottom, bottom: name.top - box.bottom };
    });
    assert.ok(geometry.height / geometry.stageHeight > .86, JSON.stringify({ name, geometry }));
    assert.ok(geometry.top >= 2 && geometry.bottom >= 2, JSON.stringify({ name, geometry }));
    await page.screenshot({ path: `${output}/${name}-enemy.png` });
    await page.locator(".open-map-button").click();
    await page.locator(".whole-world-button").click();
    await page.locator(".world-overview-canvas").waitFor();
    await page.waitForTimeout(300);
    const states = await page.locator(".map-inner-glow").evaluateAll((items) => items.map((item) => item.getAttribute("class")));
    await page.screenshot({ path: `${output}/${name}-world.png` });
    if (name === "start") assert.equal(states.filter((state) => state.includes("locked")).length, 5);
    if (name === "complete") {
      assert.ok(states.every((state) => state.includes("completed")));
      assert.equal(await page.locator(".world-map-fog").count(), 0);
      for (let index = 0; index < 6; index++) {
        await page.locator(".map-region").nth(index).focus();
        await page.keyboard.press("Enter");
        await page.locator(".region-map-canvas").waitFor();
        await page.screenshot({ path: `${output}/region-${index + 1}.png` });
        await page.locator(".whole-world-button").click();
      }
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ name, geometry, states, errors }));
    await context.close();
  }
} finally { await browser.close(); }
