import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const audioSource = await readFile(new URL("../src/game/audio.ts", import.meta.url), "utf8");
const gameSource = await readFile(new URL("../src/game/Game.tsx", import.meta.url), "utf8");

test("web audio uses independent persistent music and effects buses at thirty percent", () => {
  assert.match(audioSource, /DEFAULT_AUDIO_VOLUME = 0\.3/);
  assert.match(audioSource, /music: "clicker-weapon-adventure-music-volume-v1"/);
  assert.match(audioSource, /effects: "clicker-weapon-adventure-effects-volume-v1"/);
  assert.match(audioSource, /this\.music\.loop = true/);
  assert.match(gameSource, /id="music-volume"/);
  assert.match(gameSource, /id="effects-volume"/);
});

test("every arsenal weapon has a compact web impact asset", async () => {
  const files = [
    "gray-impact-1.mp3", "gray-impact-2.mp3", "bioplasma-impact.mp3", "crystal-impact.mp3",
    "void-impact.mp3", "solar-impact.mp3", "relic-impact.mp3",
  ];
  for (const file of files) {
    assert.match(audioSource, new RegExp(file.replaceAll(".", "\\.")));
    assert.ok((await stat(new URL(`../public/audio/${file}`, import.meta.url))).size < 10_000, `${file} should stay compact`);
  }
  assert.ok((await stat(new URL("../public/audio/play-fon-loop.mp3", import.meta.url))).size < 600_000);
  assert.match(gameSource, /playImpact\(current\.selectedWeaponId\)/);
  assert.match(gameSource, /playImpact\(weaponId\)/);
});
