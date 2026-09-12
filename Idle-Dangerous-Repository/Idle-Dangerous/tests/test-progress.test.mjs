import assert from "node:assert/strict";
import test from "node:test";
import { TestProgressModule } from "../Modules/test-progress/TestProgressModule.ts";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("test progress cartridge survives clearing an independent main save", () => {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = createMemoryStorage();
  try {
    const cartridge = new TestProgressModule("poki_ignore:game:test-progress", 6);
    cartridge.save({ zone: 40, highestZone: 40, gold: 12345 });

    globalThis.localStorage.setItem("game:main-save", "main progress");
    globalThis.localStorage.removeItem("game:main-save");

    const restored = cartridge.load();
    assert.equal(restored?.format, "portable_test_progress_v1");
    assert.equal(restored?.schemaVersion, 6);
    assert.deepEqual(restored?.data, { zone: 40, highestZone: 40, gold: 12345 });
  } finally {
    globalThis.localStorage = previousStorage;
  }
});

test("test progress rejects corrupt and future cartridge formats safely", () => {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = createMemoryStorage();
  try {
    const cartridge = new TestProgressModule("test-progress", 6);
    globalThis.localStorage.setItem("test-progress", "not-json");
    assert.equal(cartridge.load(), null);

    globalThis.localStorage.setItem("test-progress", JSON.stringify({
      format: "portable_test_progress_v1",
      schemaVersion: 7,
      savedAt: new Date().toISOString(),
      data: { zone: 10 },
    }));
    assert.equal(cartridge.load(), null);
  } finally {
    globalThis.localStorage = previousStorage;
  }
});

