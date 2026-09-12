import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const output = "Art/wolf-marker-review";
await mkdir(output, { recursive: true });
try {
  for (const [name, width, height] of [["desktop", 1600, 900], ["mobile", 844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5184/");
    const seed = await page.evaluate(async () => {
      const { createInitialGameState, getEnemyMaxHp } = await import("/src/game/clickerV3.ts");
      const { activateCombatAbility } = await import("/src/game/combatAbilities.ts");
      const state = createInitialGameState();
      state.zone = 56; state.highestZone = 56;
      state.enemyHp = state.enemyMaxHp = getEnemyMaxHp(56);
      state.weapons.relic_weapon = { owned: true, level: 150, purchasedUpgradeIds: ["relic_150"] };
      state.combatAbilities.wolf = activateCombatAbility("wolf", state.combatAbilities.wolf, true, Date.now());
      return state;
    });
    await context.addInitScript((state) => {
      localStorage.setItem("mage-cleanse-world-map-v2", JSON.stringify(state));
      localStorage.setItem("clicker-weapon-adventure-ftue-shown", "1");
    }, seed);
    await page.reload();
    await page.evaluate(() => {
      window.clawEvents = [];
      new MutationObserver((records) => {
        for (const record of records) for (const [action, nodes] of [["start", record.addedNodes], ["end", record.removedNodes]]) {
          for (const node of nodes) if (node instanceof HTMLElement && node.classList.contains("wolf-claw-impact")) {
            window.clawEvents.push({ action, time: performance.now(), x: node.style.left, y: node.style.top });
          }
        }
      }).observe(document.body, { subtree: true, childList: true });
    });
    await page.locator(".start-game-button").click();
    await page.locator(".wolf-claw-impact").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => {
      const effect = document.querySelector(".wolf-claw-impact");
      const age = effect?.getAnimations()[0]?.currentTime;
      return typeof age === "number" && age >= 100 && age < 220;
    });
    console.log(await page.locator(".wolf-claw-impact").evaluate((element) => ({ opacity: getComputedStyle(element).opacity, width: element.getBoundingClientRect().width, children: element.children.length })));
    await page.screenshot({ path: `${output}/${name}-claws.png` });
    await page.waitForTimeout(5500);
    const events = await page.evaluate(() => window.clawEvents);
    const starts = events.filter((event) => event.action === "start");
    assert.ok(starts.length >= 8, JSON.stringify(events));
    assert.ok(new Set(starts.map((event) => `${event.x},${event.y}`)).size > 1);
    const lifetimes = [], pauses = [];
    for (let index = 0; index < events.length - 1; index++) {
      const first = events[index], second = events[index + 1];
      const elapsed = second.time - first.time;
      if (first.action === "start" && second.action === "end") lifetimes.push(elapsed);
      if (first.action === "end" && second.action === "start") pauses.push(elapsed);
    }
    // Asset decoding and screenshots can delay individual JS callbacks. Check the sustained cadence.
    const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
    assert.ok(median(lifetimes) >= 300 && median(lifetimes) <= 450, JSON.stringify({ lifetimes }));
    assert.ok(median(pauses) >= 100 && median(pauses) <= 450, JSON.stringify({ pauses }));
    assert.equal(await page.locator(".summoned-wolf").count(), 0);
    await page.locator(".open-map-button").click();
    await page.locator(".region-player-marker").waitFor();
    const marker = await page.locator(".region-player-marker").boundingBox();
    assert.ok(marker.width >= 26 && marker.height >= 44);
    await page.screenshot({ path: `${output}/${name}-region-marker.png` });
    await page.locator(".whole-world-button").click();
    await page.screenshot({ path: `${output}/${name}-world-marker.png` });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ name, events, marker, errors }));
    await context.close();
  }
} finally { await browser.close(); }
