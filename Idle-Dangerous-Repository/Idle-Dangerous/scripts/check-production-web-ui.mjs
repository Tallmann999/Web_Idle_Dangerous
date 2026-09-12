import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const playwrightPath = process.argv[2];
const baseUrl = process.argv[3] ?? "http://127.0.0.1:5184/";
if (!playwrightPath) throw new Error("Pass the local Playwright module path as the first argument.");

const { chromium } = await import(pathToFileURL(playwrightPath).href);
const browser = await chromium.launch({ headless: true, channel: "msedge" });
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem("clicker-weapon-adventure-ftue-shown", "1");
    localStorage.setItem("clicker-weapon-adventure-language-v1", "en");
  });
  const page = await context.newPage();
  const pageErrors = [];
  const failedResponses = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator(".start-game-button").click();
  await page.locator(".game-shell").waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.fonts.check('16px "Roboto Condensed"')), true);

  await page.locator(".shop-button").click();
  await page.locator(".shop-weapon-card").first().waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll(".shop-weapon-card img")]
    .every((image) => image.complete && image.naturalWidth > 0));
  await page.waitForFunction(() => performance.getEntriesByType("resource")
    .some((entry) => entry.name.includes("play-fon-loop.mp3")));

  const resources = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  assert.ok(resources.some((url) => url.includes("Roboto-Variable.woff2")), "WOFF2 font was not loaded");
  assert.ok(resources.some((url) => url.endsWith(".webp") || url.includes(".webp?")), "WebP art was not loaded");
  assert.ok(resources.some((url) => url.includes("play-fon-loop.mp3")), "Background music was not requested");
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(failedResponses, []);
  console.log(JSON.stringify({ production: true, webp: true, woff2: true, music: true, failedResponses, pageErrors }));
} finally {
  await browser.close();
}
