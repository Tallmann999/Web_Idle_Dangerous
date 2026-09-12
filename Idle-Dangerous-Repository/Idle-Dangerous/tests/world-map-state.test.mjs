import assert from "node:assert/strict";
import test from "node:test";
import { getMapRegionState } from "../src/game/worldMap.ts";

const regions = [[1, 10], [11, 25], [26, 40], [41, 55], [56, 75], [76, 105]]
  .map(([startZone, endZone]) => ({ startZone, endZone }));
const states = (highest, current) => regions.map((region) => getMapRegionState(region, highest, current));

test("a new campaign reveals only the current first region", () => {
  assert.deepEqual(states(1, 1), ["current", "locked", "locked", "locked", "locked", "locked"]);
});
test("crossing each region boss reveals the next region and preserves completed art", () => {
  for (let index = 0; index < regions.length - 1; index++) {
    const boundary = regions[index].endZone;
    assert.equal(getMapRegionState(regions[index + 1], boundary, boundary), "locked");
    assert.equal(getMapRegionState(regions[index + 1], boundary + 1, boundary), "unlocked");
    assert.equal(getMapRegionState(regions[index], boundary + 1, boundary + 1), "completed");
  }
  assert.deepEqual(states(55, 55), ["completed", "completed", "completed", "current", "locked", "locked"]);
});
test("revisiting an earlier region keeps progression while marking the player's location", () => {
  assert.deepEqual(states(61, 7), ["current", "completed", "completed", "completed", "unlocked", "locked"]);
});
test("the final boss must be beaten before the whole world is completed", () => {
  assert.equal(states(105, 105)[5], "current");
  assert.deepEqual(states(106, 104), Array(6).fill("completed"));
});
