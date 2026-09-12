import assert from "node:assert/strict";
import test from "node:test";
import { REGION_LAYOUTS, mapPoint } from "../src/game/regionLayouts.ts";
import { DUNGEON_CHALLENGES } from "../src/game/dungeonChallenges.ts";
import { getEnemyMaxHp, getEnemyGold, isBossZone } from "../src/game/clickerV3.ts";

test("sketched campaign routes contain 105 levels and all additional points have positions", () => {
  assert.deepEqual([1,3,2,4,5,6].map(id => REGION_LAYOUTS[id].route.length), [10,15,15,15,20,30]);
  for (const [id, layout] of Object.entries(REGION_LAYOUTS)) {
    assert.equal(layout.dungeons.length, DUNGEON_CHALLENGES.filter(d => d.regionId === Number(id)).length);
    for (const point of [...layout.route, ...layout.dungeons, ...layout.future.map(p => p.point)]) {
      const normalized = mapPoint(Number(id), point);
      assert.ok(normalized.x > 0 && normalized.x < 100 && normalized.y > 0 && normalized.y < 100);
    }
  }
});

test("late campaign HP reduction eases in after 50 and reaches 30 percent at 60", () => {
  for (let zone=1;zone<=105;zone++) {
    const oldBase = 10 * 1.48 ** Math.min(zone-1,49) * 1.58 ** Math.max(0,zone-50);
    const factor = isBossZone(zone) ? 12 : 1;
    const expected = zone <= 50 ? 1 : zone >= 60 ? .7 : 1 - .03 * (zone-50);
    assert.ok(Math.abs(getEnemyMaxHp(zone)/(oldBase*factor) - expected) < .051, `level ${zone}`);
    assert.equal(getEnemyGold(zone), Math.max(1,Math.round(3*1.48**(zone-1))) * (isBossZone(zone) ? 10 : 1));
    if (zone>50 && zone<60) assert.ok(Math.abs(getEnemyMaxHp(zone)/(oldBase*factor)-expected)<1e-8);
  }
});
