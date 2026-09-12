import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL, fileURLToPath } from "node:url";
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const output = new URL("../Art/ability-boss-review/", import.meta.url);
await mkdir(output, { recursive: true });
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1600, height: 900 }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => { if (response.status() >= 400 && response.url().includes("/art/")) errors.push(`${response.status()}: ${response.url()}`); });
    await page.goto("http://127.0.0.1:5180/");
    const seed = await page.evaluate(async () => {
      const { createInitialGameState, WEAPON_ORDER, WEAPONS, getEnemyMaxHp } = await import("/src/game/clickerV3.ts");
      const state = createInitialGameState();
      state.zone = 65; state.highestZone = 105; state.bossTimeLeft = 30;
      state.enemyHp = state.enemyMaxHp = getEnemyMaxHp(65); state.gold = 1e30;
      for (const id of WEAPON_ORDER) state.weapons[id] = { owned: true, level: 150, purchasedUpgradeIds: WEAPONS[id].upgrades.map((item) => item.id) };
      return state;
    });
    await context.addInitScript((state) => {
      localStorage.setItem("mage-cleanse-world-map-v2", JSON.stringify(state));
      localStorage.setItem("clicker-weapon-adventure-ftue-shown", "1");
    }, seed);
    await page.reload();
    await page.locator(".start-game-button").click();
    await page.locator(".ability-dock").waitFor();
    const names = await page.locator(".ability-dock .ability-art").evaluateAll((items) => items.map((item) => item.src.split("/").pop().split(".")[0]));
    assert.deepEqual(names, ["leadership", "ice-rain", "abyss", "wolf-summon", "agility", "speed", "gold-bag"]);
    assert.equal(await page.locator(".weapon-upgrade-slots .ability-art").count(), 6);
    for (const weapon of ["blue_weapon", "void_weapon", "relic_weapon"]) await page.locator(`.ability-dock [data-weapon-ability="${weapon}"]`).click();
    await page.waitForTimeout(900);
    assert.equal(await page.locator(".ability-dock .active").count(), 3);
    assert.equal(await page.locator(".wolf-claw-impact").count(), 1);
    const broken = await page.locator(".ability-art, .enemy-image").evaluateAll((items) => items.filter((item) => !item.complete || !item.naturalWidth).map((item) => item.src));
    assert.deepEqual(broken, []);
    await page.screenshot({ path: fileURLToPath(new URL(mobile ? "mobile.png" : "desktop.png", output)), fullPage: true });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ mobile, names, errors, active: 3 }));
    await context.close();
  }
} finally { await browser.close(); }
