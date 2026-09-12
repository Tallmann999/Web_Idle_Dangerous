import assert from "node:assert/strict";
import test from "node:test";
import { COMBAT_ABILITIES, activateCombatAbility, consumeCombatAbilityHits, emptyCombatAbilities } from "../src/game/combatAbilities.ts";
import { createInitialGameState, normalizeGameState } from "../src/game/clickerV3.ts";
import { BOSS_NAMES, CAMPAIGN_BOSS_ORDER, getBossName } from "../src/game/bossRoster.ts";
import { DUNGEON_CHALLENGES } from "../src/game/dungeonChallenges.ts";

test("new actives require unlocks, preserve cooldowns and survive save normalization", () => {
  const now = 1_000_000;
  const initial = createInitialGameState();
  for (const id of ["abyss", "wolf"]) {
    const empty = initial.combatAbilities[id];
    assert.equal(activateCombatAbility(id, empty, false, now), empty);
    const active = activateCombatAbility(id, empty, true, now);
    assert.equal(active.activeUntil, now + COMBAT_ABILITIES[id].durationSec * 1000);
    assert.equal(active.cooldownUntil, active.activeUntil + COMBAT_ABILITIES[id].cooldownSec * 1000);
    assert.equal(activateCombatAbility(id, active, true, active.activeUntil), active);
    assert.notEqual(activateCombatAbility(id, active, true, active.cooldownUntil), active);
    const saved = normalizeGameState({ ...initial, combatAbilities: { ...initial.combatAbilities, [id]: active } });
    assert.deepEqual(saved.combatAbilities[id], active);
  }
  assert.deepEqual(normalizeGameState({ ...initial, combatAbilities: undefined }).combatAbilities, emptyCombatAbilities());
});

test("desktop and mobile heartbeats deliver 480 Abyss hits and 100 wolf strikes", () => {
  for (const step of [100, 180, 200]) {
    for (const [id, expected] of [["abyss", 480], ["wolf", 100]]) {
      let timer = activateCombatAbility(id, emptyCombatAbilities()[id], true, 1000);
      let hits = 0;
      const end = timer.activeUntil;
      for (let now = 1000 + step; now <= end + step; now += step) {
        const result = consumeCombatAbilityHits(id, timer, now, true);
        timer = result.timer;
        hits += result.hits * COMBAT_ABILITIES[id].hitsPerVolley;
      }
      assert.equal(hits, expected, `${id} at ${step}ms heartbeat`);
    }
  }
  assert.equal(COMBAT_ABILITIES.wolf.dpsPerHit, 2);
  assert.equal(COMBAT_ABILITIES.abyss.dpsPerHit, 1);
  assert.equal(COMBAT_ABILITIES.abyss.hitsPerVolley, 10);
  assert.equal(COMBAT_ABILITIES.abyss.intervalMs, 250);
  assert.equal(COMBAT_ABILITIES.abyss.durationSec, 12);
});

test("hidden tabs and inactive targets do not accumulate a damage burst", () => {
  const initial = activateCombatAbility("wolf", emptyCombatAbilities().wolf, true, 1000);
  const paused = consumeCombatAbilityHits("wolf", initial, 5000, true);
  assert.equal(paused.hits, 0);
  assert.ok(paused.timer.nextHitAt > 5000);
  const noTarget = consumeCombatAbilityHits("wolf", paused.timer, 5200, false);
  assert.equal(noTarget.hits, 0);
  assert.equal(consumeCombatAbilityHits("wolf", noTarget.timer, 5400, true).hits, 1);
});

test("campaign and dungeon bosses resolve to the new named roster", () => {
  assert.equal(BOSS_NAMES.length, 18);
  assert.equal(new Set(CAMPAIGN_BOSS_ORDER).size, 18);
  for (const number of CAMPAIGN_BOSS_ORDER) assert.ok(number >= 1 && number <= 18);
  for (const dungeon of DUNGEON_CHALLENGES) {
    assert.ok(dungeon.enemyArtNumber >= 1 && dungeon.enemyArtNumber <= 18);
    assert.equal(dungeon.name, getBossName(dungeon.enemyArtNumber));
  }
});
