import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ headless: true, channel: "msedge" });
await mkdir("Art/active-abilities-review", { recursive: true });
try {
  for (const [name, width, height] of [["desktop", 1600, 900], ["mobile", 844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("http://127.0.0.1:5184/");
    const seed = await page.evaluate(async () => {
      const { createInitialGameState, getEnemyMaxHp } = await import("/src/game/clickerV3.ts");
      const state = createInitialGameState();
      state.zone = state.highestZone = 56;
      state.enemyHp = state.enemyMaxHp = getEnemyMaxHp(56);
      state.clickLevel = 150;
      state.clickPurchasedUpgradeIds = ["manual_150"];
      state.weapons.relic_weapon = { owned: true, level: 150, purchasedUpgradeIds: ["relic_150"] };
      return state;
    });
    await context.addInitScript(state => {
      const now = Date.now();
      state.dpsBoostUntil = now + 6000;
      state.manualCriticalActiveUntil = now + 9000;
      state.combatAbilities.wolf = { activeUntil: now + 12000, cooldownUntil: now + 192000, nextStrikeAt: now + 200 };
      localStorage.setItem("mage-cleanse-world-map-v2", JSON.stringify(state));
      localStorage.setItem("clicker-weapon-adventure-ftue-shown", "1");
    }, seed);
    await page.reload();
    await page.locator(".start-game-button").click();
    await page.waitForFunction(() => document.querySelectorAll(".arena-active-ability").length === 3);
    const boxes = await page.locator(".arena-active-ability").evaluateAll(els => els.map(el => {
      const box = el.getBoundingClientRect(); return { x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: box.width };
    }));
    const hp = await page.locator(".health-panel").boundingBox();
    assert.ok(boxes.every(box => box.right < hp.x && box.width >= 20));
    assert.ok(boxes.every(box => Math.abs(box.y - boxes[0].y) < 1), JSON.stringify(boxes));
    await page.screenshot({ path: `Art/active-abilities-review/${name}.png` });
    await page.locator('[data-active-ability="boost"].expiring').waitFor();
    assert.equal(await page.locator('[data-active-ability="boost"]').evaluate(el => getComputedStyle(el).animationName), "active-ability-ending");
    await page.locator('[data-active-ability="boost"]').waitFor({ state: "detached" });
    await page.waitForFunction(() => document.querySelectorAll(".arena-active-ability").length === 1);
    await page.locator(".arena-active-abilities").waitFor({ state: "detached" });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ name, boxes, blinkAndExpiry: true, errors }));
    await context.close();
  }
} finally { await browser.close(); }
