import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { shouldPreventPageScrollKey } from "../src/platform/inputGuard.ts";

const gameSource = await readFile(new URL("../src/game/Game.tsx", import.meta.url), "utf8");
const audioSource = await readFile(new URL("../src/game/audio.ts", import.meta.url), "utf8");
const inputSource = await readFile(new URL("../src/platform/inputGuard.ts", import.meta.url), "utf8");

test("game input blocks page-scrolling keys outside native controls", () => {
  assert.equal(shouldPreventPageScrollKey("ArrowDown", null), true);
  assert.equal(shouldPreventPageScrollKey(" ", null), true);
  assert.equal(shouldPreventPageScrollKey("a", null), false);
  assert.match(inputSource, /addEventListener\("wheel"[\s\S]*passive: false/);
  assert.match(inputSource, /addEventListener\("touchmove"[\s\S]*passive: false/);
});

test("Poki production hides local test-progress controls", () => {
  assert.match(gameSource, /!__POKI_PRODUCTION__ && <section className="settings-test-progress"/);
  assert.match(gameSource, /if \(__POKI_PRODUCTION__\) return;[\s\S]*gameServices\.testProgress\.load/);
});

test("audio downloads begin only after gameplay is allowed to run", () => {
  const constructorEnd = audioSource.indexOf("private loadAudio");
  const constructorSource = audioSource.slice(audioSource.indexOf("constructor("), constructorEnd);
  assert.doesNotMatch(constructorSource, /fetch\(/);
  assert.match(audioSource, /if \(running\) \{[\s\S]*this\.loadAudio\(\)/);
});

test("window focus participates in audio, combat and Poki lifecycle state", () => {
  assert.match(gameSource, /window\.addEventListener\("blur", handleBlur\)/);
  assert.match(gameSource, /window\.addEventListener\("focus", handleFocus\)/);
  assert.match(gameSource, /!pageHidden && windowFocused && !platformPaused/);
});
