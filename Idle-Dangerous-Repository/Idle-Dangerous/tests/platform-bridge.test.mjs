import assert from "node:assert/strict";
import test from "node:test";

import { PlatformBridge } from "../src/platform/bridge.ts";

function createAdapter(overrides = {}) {
  const calls = [];
  return {
    calls,
    async initialize() { calls.push("initialize"); return true; },
    loadingFinished() { calls.push("loadingFinished"); },
    gameplayStart() { calls.push("gameplayStart"); },
    gameplayStop() { calls.push("gameplayStop"); },
    async commercialBreak(onStart) { calls.push("commercialBreak"); onStart?.(); return true; },
    async rewardedBreak(onStart) { calls.push("rewardedBreak"); onStart?.(); return true; },
    ...overrides,
  };
}

test("platform lifecycle calls are ordered and duplicate-safe", async () => {
  const adapter = createAdapter();
  const bridge = new PlatformBridge(adapter, () => undefined, false);

  await bridge.initialize();
  bridge.loadingFinished();
  bridge.loadingFinished();
  bridge.gameplayStart();
  bridge.gameplayStart();
  bridge.gameplayStop();
  bridge.gameplayStop();

  assert.equal(bridge.state, "STOPPED");
  assert.deepEqual(adapter.calls, ["initialize", "loadingFinished", "gameplayStart", "gameplayStop"]);
});

test("rewarded ad stops gameplay, locks concurrent requests and resumes gameplay", async () => {
  let finishAd;
  const adapter = createAdapter({
    rewardedBreak(onStart) {
      adapter.calls.push("rewardedBreak");
      onStart?.();
      return new Promise((resolve) => { finishAd = resolve; });
    },
  });
  const events = [];
  const bridge = new PlatformBridge(adapter, (event) => events.push(event), false);
  await bridge.initialize();
  bridge.loadingFinished();
  bridge.gameplayStart();

  const first = bridge.rewardedBreak();
  const duplicate = bridge.rewardedBreak();
  assert.equal(first, duplicate);
  assert.equal(bridge.state, "AD");
  assert.deepEqual(events, ["mage:platform-pause"]);

  finishAd(true);
  assert.equal(await first, true);
  assert.equal(bridge.state, "PLAYING");
  assert.deepEqual(events, ["mage:platform-pause", "mage:platform-resume"]);
  assert.deepEqual(adapter.calls, ["initialize", "loadingFinished", "gameplayStart", "gameplayStop", "rewardedBreak", "gameplayStart"]);
});

test("SDK failure never blocks local loading and never grants an ad reward", async () => {
  const adapter = createAdapter({
    async initialize() { throw new Error("offline"); },
  });
  const bridge = new PlatformBridge(adapter, () => undefined, false);

  assert.equal(await bridge.initialize(), false);
  bridge.loadingFinished();
  bridge.gameplayStart();

  assert.equal(bridge.state, "PLAYING");
  assert.equal(await bridge.rewardedBreak(), false);
  assert.equal(bridge.state, "PLAYING");
});
