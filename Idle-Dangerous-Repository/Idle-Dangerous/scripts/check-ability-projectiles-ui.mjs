import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ headless: true, channel: "msedge" });
await mkdir("Art/ability-projectiles-review", { recursive: true });
try {
  for (const [name, width, height] of [["desktop", 1600, 900], ["mobile", 844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:5184/");
    const seed = await page.evaluate(async () => {
      const { createInitialGameState, getEnemyMaxHp } = await import("/src/game/clickerV3.ts");
      const state = createInitialGameState();
      state.zone = state.highestZone = 56;
      state.enemyHp = state.enemyMaxHp = getEnemyMaxHp(56);
      state.weapons.blue_weapon = { owned: true, level: 150, purchasedUpgradeIds: ["blue_150"] };
      state.weapons.void_weapon = { owned: true, level: 150, purchasedUpgradeIds: ["void_150"] };
      return state;
    });
    await context.addInitScript(state => {
      const now = Date.now();
      state.iceRainActiveUntil = now + 8_000;
      state.iceRainCooldownUntil = now + 608_000;
      state.combatAbilities.abyss = { activeUntil: now + 8_000, cooldownUntil: now + 608_000, nextHitAt: now + 250 };
      localStorage.setItem("mage-cleanse-world-map-v2", JSON.stringify(state));
      localStorage.setItem("clicker-weapon-adventure-ftue-shown", "1");
      localStorage.setItem("clicker-weapon-adventure-graphics-quality-v1", "high");
      localStorage.setItem("clicker-weapon-adventure-language-v1", "ru");
    }, seed);
    await page.reload();
    await page.locator(".start-game-button").click();
    await page.waitForFunction(() => document.querySelector(".enemy-image")?.naturalWidth > 0);
    await page.locator(".ice-rain-projectile img").first().waitFor();
    const ice = await page.locator(".ice-rain-projectile").first().evaluate(element => {
      const style = getComputedStyle(element);
      const image = element.querySelector("img");
      return {
        width: style.width,
        height: style.height,
        angle: element.style.getPropertyValue("--ice-rain-angle"),
        source: image?.getAttribute("src") ?? "",
        natural: [image?.naturalWidth ?? 0, image?.naturalHeight ?? 0],
      };
    });
    assert.match(ice.source, /art\/projectiles\/blue\.webp/);
    assert.ok(ice.natural[0] / ice.natural[1] > 1.8, JSON.stringify(ice));
    assert.ok(Number.parseFloat(ice.angle) > 35 && Number.parseFloat(ice.angle) < 145);

    await page.waitForFunction(() => document.querySelectorAll(".ability-strike.abyss").length >= 8);
    const abyssTargets = await page.locator(".ability-strike.abyss").evaluateAll(elements => elements.map(element => ({
      endX: element.style.getPropertyValue("--strike-end-x"),
      endY: element.style.getPropertyValue("--strike-end-y"),
      delay: element.style.getPropertyValue("--strike-delay"),
    })));
    assert.ok(new Set(abyssTargets.map(target => `${target.endX}:${target.endY}`)).size >= 5, JSON.stringify(abyssTargets));
    assert.ok(new Set(abyssTargets.map(target => target.delay)).size >= 4, JSON.stringify(abyssTargets));
    await page.locator(".impact-blue_weapon").first().waitFor();
    await page.locator(".impact-void_weapon").first().waitFor();
    await page.screenshot({ path: `Art/ability-projectiles-review/${name}.png` });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ name, ice, abyssTargets: abyssTargets.length, impacts: ["blue", "void"], errors }));
    await context.close();
  }
} finally {
  await browser.close();
}
