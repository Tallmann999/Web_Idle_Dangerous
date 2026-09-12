import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ headless: true, channel: "msedge" });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.clock.install();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:5184/");
  const seed = await page.evaluate(async () => {
    const { createInitialGameState } = await import("/src/game/clickerV3.ts");
    const state = createInitialGameState();
    state.weapons.gray_weapon.level = 10;
    return state;
  });
  await page.addInitScript(state => {
    localStorage.setItem("mage-cleanse-world-map-v2", JSON.stringify(state));
    localStorage.setItem("clicker-weapon-adventure-ftue-shown", "1");
  }, seed);
  await page.reload();
  await page.locator(".start-game-button").click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(1000);
  const before = Number(await page.locator(".gold-hero strong").innerText());
  await page.clock.fastForward(20000);
  await page.clock.runFor(250);
  const after = Number(await page.locator(".gold-hero strong").innerText());
  assert.ok(after > before + 10, JSON.stringify({ before, after }));
  await page.evaluate(() => window.dispatchEvent(new Event("mage:platform-pause")));
  await page.clock.runFor(100);
  const paused = await page.locator(".gold-hero strong").innerText();
  await page.clock.fastForward(10000);
  assert.equal(await page.locator(".gold-hero strong").innerText(), paused);
  await page.evaluate(() => window.dispatchEvent(new Event("mage:platform-resume")));
  await page.clock.runFor(1000);
  assert.ok(Number(await page.locator(".gold-hero strong").innerText()) > Number(paused));
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ before, after, afkFarm: true, platformPause: true, errors }));
} finally { await browser.close(); }
