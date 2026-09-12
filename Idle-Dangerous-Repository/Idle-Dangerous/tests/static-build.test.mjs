import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

test("creates a portal-ready static build", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");

  assert.match(html, /<div id="root">/);
  assert.match(html, /src="\.\/assets\//);
  assert.match(html, /href="\.\/assets\//);
  assert.doesNotMatch(html, /\/src\/main\.tsx/);

  const map = await stat(new URL("../dist/art/maps/world.webp", import.meta.url));
  assert.ok(map.size > 0);
  assert.ok(map.size < 500_000, "world map should stay optimized for mobile delivery");

  const font = await stat(new URL("../dist/fonts/Roboto-Variable.woff2", import.meta.url));
  assert.ok(font.size > 0, "the game font must be bundled for portals that block external resources");

  const cssFile = html.match(/href="(\.\/assets\/[^"]+\.css)"/)?.[1];
  assert.ok(cssFile);
  const css = await readFile(new URL(`../dist/${cssFile.replace("./", "")}`, import.meta.url), "utf8");
  assert.doesNotMatch(css, /fonts\.googleapis\.com|fonts\.gstatic\.com/);

  await assert.rejects(
    stat(new URL("../dist/enemies", import.meta.url)),
    (error) => error?.code === "ENOENT",
    "legacy PNG enemies must not be shipped in the web build",
  );
  await assert.rejects(
    stat(new URL("../dist/projectiles", import.meta.url)),
    (error) => error?.code === "ENOENT",
    "legacy PNG projectiles must not be shipped in the web build",
  );
});
