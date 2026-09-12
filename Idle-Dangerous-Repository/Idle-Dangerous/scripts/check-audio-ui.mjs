import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ headless: true, channel: "msedge" });
await mkdir("Art/audio-review", { recursive: true });
try {
  for (const [name, width, height] of [["desktop", 1600, 900], ["mobile", 844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      window.audioContexts = [];
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        constructor(...args) {
          super(...args); this.sources = []; this.gains = [];
          window.audioContexts.push(this);
        }
        createGain() { const gain = super.createGain(); this.gains.push(gain); return gain; }
        createBufferSource() {
          const source = super.createBufferSource();
          const start = source.start.bind(source);
          source.start = (...args) => { source.started = true; source.startedAt = performance.now(); start(...args); };
          this.sources.push(source); return source;
        }
      };
      localStorage.setItem("clicker-weapon-adventure-ftue-shown", "1");
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:5184/");
    const seed = await page.evaluate(async () => {
      const { createInitialGameState, getEnemyMaxHp } = await import("/src/game/clickerV3.ts");
      const state = createInitialGameState();
      state.zone = state.highestZone = 56;
      state.enemyHp = state.enemyMaxHp = getEnemyMaxHp(56);
      Object.values(state.weapons).forEach(weapon => { weapon.owned = true; weapon.level = 1; });
      return state;
    });
    await context.addInitScript(state => localStorage.setItem("mage-cleanse-world-map-v2", JSON.stringify(state)), seed);
    await page.reload();
    await page.locator(".start-game-button").click();
    await page.waitForFunction(() => audioContexts.some(ctx => ctx.sources.some(source => source.loop && source.started)));
    const initial = await page.evaluate(() => {
      const ctx = audioContexts.findLast(ctx => ctx.state !== "closed");
      return { state: ctx.state, volume: ctx.gains.slice(0, 2).map(gain => gain.gain.value), duration: ctx.sources.find(source => source.loop).buffer.duration };
    });
    assert.equal(initial.state, "running");
    initial.volume.forEach(value => assert.ok(Math.abs(value - .3) < .00001));
    assert.ok(initial.duration > 89 && initial.duration < 91);
    await page.locator(".settings-button").click();
    assert.equal(await page.locator('#music-volume').inputValue(), "30");
    assert.equal(await page.locator('#effects-volume').inputValue(), "30");
    await page.screenshot({ path: `Art/audio-review/${name}.png` });
    await page.locator('#music-volume').fill("17");
    await page.locator('#effects-volume').fill("61");
    const volumes = await page.evaluate(() => audioContexts.findLast(ctx => ctx.state !== "closed").gains.slice(0, 2).map(gain => gain.gain.value));
    assert.ok(Math.abs(volumes[0] - .17) < .00001 && Math.abs(volumes[1] - .61) < .00001);
    await page.locator('.settings-close').click();
    const durations = [];
    for (let weapon = 0; weapon < 6; weapon++) {
      await page.locator('.weapon-visual-select').nth(weapon).click();
      const before = await page.evaluate(() => audioContexts.findLast(ctx => ctx.state !== "closed").sources.length);
      await page.locator('.enemy-target').click();
      await page.waitForFunction(count => audioContexts.findLast(ctx => ctx.state !== "closed").sources.length > count, before);
      durations.push(await page.evaluate(() => audioContexts.findLast(ctx => ctx.state !== "closed").sources.at(-1).buffer.duration));
    }
    assert.equal(new Set(durations).size, 6, "Every weapon must play its own decoded impact");
    await page.locator('.weapon-visual-select').first().click();
    const before = await page.evaluate(() => audioContexts.findLast(ctx => ctx.state !== "closed").sources.length);
    await page.locator('.enemy-target').click();
    await page.waitForFunction(count => audioContexts.findLast(ctx => ctx.state !== "closed").sources.length > count, before);
    const graySecond = await page.evaluate(() => audioContexts.findLast(ctx => ctx.state !== "closed").sources.at(-1).buffer.duration);
    assert.notEqual(graySecond, durations[0]);
    await page.locator('.sound-toggle').click();
    await page.waitForFunction(() => audioContexts.findLast(ctx => ctx.state !== "closed").state === "suspended");
    await page.locator('.sound-toggle').click();
    await page.waitForFunction(() => audioContexts.findLast(ctx => ctx.state !== "closed").state === "running");
    // Exercise the actual document visibility handler without altering the user browser.
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForFunction(() => audioContexts.findLast(ctx => ctx.state !== "closed").state === "suspended");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForFunction(() => audioContexts.findLast(ctx => ctx.state !== "closed").state === "running");
    assert.equal(await page.evaluate(() => audioContexts.findLast(ctx => ctx.state !== "closed").sources.filter(source => source.loop).length), 1);
    await page.reload();
    await page.locator(".start-game-button").click();
    await page.locator(".settings-button").click();
    assert.equal(await page.locator('#music-volume').inputValue(), "17");
    assert.equal(await page.locator('#effects-volume').inputValue(), "61");
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ name, initial, durations, graySecond, savedVolumes: [17, 61], muteAndVisibility: true, errors }));
    await context.close();
  }
} finally { await browser.close(); }
