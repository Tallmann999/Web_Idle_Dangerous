import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const output = "Art/shop-review";
await mkdir(output, { recursive: true });
try {
  for (const [name, width, height, language] of [["desktop-ru", 1600, 900, "ru"], ["desktop-en", 1600, 900, "en"], ["mobile", 844, 390, "ru"], ["portrait", 390, 844, "en"]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 900 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await context.addInitScript((language) => {
      localStorage.setItem("clicker-weapon-adventure-ftue-shown", "1");
      localStorage.setItem("clicker-weapon-adventure-language-v1", language);
    }, language);
    await page.goto("http://127.0.0.1:5184/");
    await page.locator(".start-game-button").click();
    if (width < height) await page.locator(".mobile-orientation-gate button").click();
    await page.locator(".shop-button").click();
    await page.locator(".shop-weapon-card").first().waitFor();
    await page.locator(".shop-modal").evaluate((modal) => Promise.all(modal.getAnimations().map((animation) => animation.finished)));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.querySelectorAll(".shop-weapon-card img")].every((image) => image.complete && image.naturalWidth > 0));
    assert.equal(await page.locator(".shop-weapon-card").count(), 8);
    const catalogue = await page.locator(".shop-weapon-grid").evaluate((grid) => ({ height: grid.clientHeight, contentHeight: grid.scrollHeight, width: grid.clientWidth, contentWidth: grid.scrollWidth }));
    assert.ok(catalogue.contentHeight <= catalogue.height + 1 && catalogue.contentWidth <= catalogue.width + 1, JSON.stringify({ name, catalogue }));
    assert.equal(await page.locator(".shop-upgrade-slot.purchased").count(), 40);
    assert.equal(await page.locator(".shop-upgrade-diamond").count(), 24);
    assert.equal(await page.locator(".shop-upgrade-slot img").count(), 16);
    assert.equal(await page.locator(".shop-upgrade-tile > small").count(), 0);
    const closeButton = await page.locator(".shop-close").boundingBox();
    assert.equal(closeButton.width, 72);
    assert.equal(closeButton.height, 72);
    assert.ok(closeButton.x >= 0 && closeButton.x + closeButton.width <= width);
    assert.equal(await page.locator(".shop-close").evaluate((button) => getComputedStyle(button).animationName), "shop-close-pulse");
    assert.equal(await page.locator(".shop-upgrade-tile.passive").count(), 8);
    assert.equal(await page.locator(".shop-upgrade-tile.active").count(), 8);
    assert.equal(await page.locator(".shop-weapon-card > button:disabled").count(), 8);
    const before = await page.locator(".weapon-roster-panel .weapon-level").allTextContents();
    await page.screenshot({ path: `${output}/${name}.png` });
    for (let index = 0; index < 40; index++) {
      const slot = page.locator(".shop-upgrade-slot").nth(index);
      await slot.scrollIntoViewIfNeeded();
      if (width < 900) await slot.tap(); else await slot.hover();
      await page.locator(".shop-preview-tooltip").waitFor();
      const describedBy = await slot.getAttribute("aria-describedby");
      assert.ok(describedBy, `wrong tooltip for ${name} upgrade ${index}`);
      assert.equal(await page.locator(".shop-preview-tooltip").getAttribute("id"), describedBy);
      const tooltip = await page.locator(".shop-preview-tooltip").boundingBox();
      assert.ok(tooltip.x >= 0 && tooltip.y >= 0 && tooltip.x + tooltip.width <= width + 1 && tooltip.y + tooltip.height <= height + 1, JSON.stringify({ name, index, tooltip }));
      const content = await page.locator(".shop-preview-tooltip").innerText();
      assert.ok(content.length > 60);
      if (language === "en") assert.doesNotMatch(content, /[А-Яа-яЁё]/);
      if ([0, 3, 4, 39].includes(index)) await page.screenshot({ path: `${output}/${name}-tooltip-${index}.png` });
    }
    const after = await page.locator(".weapon-roster-panel .weapon-level").allTextContents();
    assert.deepEqual(after, before, "previewing upgrades must not modify the owned arsenal");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".shop-preview-tooltip").count(), 0);
    if (await page.locator(".shop-close").count()) await page.locator(".shop-close").click();
    assert.equal(await page.locator(".shop-modal").count(), 0);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ name, weapons: 8, upgrades: 40, errors }));
    await context.close();
  }
} finally { await browser.close(); }
