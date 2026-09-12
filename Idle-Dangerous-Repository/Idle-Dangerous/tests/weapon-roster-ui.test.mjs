import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/game/Game.tsx", import.meta.url), "utf8");

test("weapon roster exposes purchase, bulk level and separate upgrade actions", () => {
  assert.match(source, /className="weapon-roster"/);
  assert.match(source, /WEAPON_ORDER\.map\(\(weaponId\)/);
  assert.match(source, /buyWeaponOrLevels\(current, weaponId\)/);
  assert.match(source, /buyWeaponUpgrade\(current, weaponId, upgradeId\)/);
  assert.match(source, /BULK_AMOUNTS\.map/);
  assert.match(source, /weapon\.upgrades\.map/);
  assert.match(source, /className="weapon-upgrade-tooltip"/);
  assert.match(source, /getBoundingClientRect\(\)/);
  assert.match(source, /left: rect\.right \+ 7/);
  assert.match(source, /lockedUpgradePulseId === item\.id/);
  assert.match(source, /onPulseLockedUpgrade\(item\.id\)/);
  assert.match(source, /purchased \? "✓"/);
  assert.match(source, /УРОН ЗА КЛИК/);
  assert.match(source, /state\.owned \? "weapon-level" : "weapon-new-label"/);
  assert.match(source, /state\.owned \? `УР\. \$\{state\.level\}`/);
  assert.match(source, /state\.level >= WEAPON_LEVEL_CAP \? "МАКС\. УРОВЕНЬ"/);
  assert.doesNotMatch(source, /УСИЛ\./);
  assert.match(source, /className="weapon-unlock-tooltip"/);
  assert.match(source, /onShowWeaponUnlockTooltip\(event\.currentTarget, weaponId\)/);
  assert.match(source, /УСЛОВИЕ ОТКРЫТИЯ/);
});

test("selected weapon is explicitly a visual selection while click damage is global", () => {
  assert.match(source, /selectWeaponVisual/);
  assert.doesNotMatch(source, /изменён визуал выстрела/);
  assert.match(source, /getGlobalClickDamage\(current\)/);
  assert.match(source, /ВЫБРАТЬ ВИЗУАЛ/);
});

test("weapon leveling pulses its own level number without creating a side toast", () => {
  assert.match(source, /const WEAPON_LEVEL_PULSE_MS = 500/);
  assert.match(source, /if \(wasOwned\) pulseWeaponLevel\(weaponId\)/);
  assert.doesNotMatch(source, /`\$\{weapon\.shortName\}: уровень \$\{next\.weapons\[weaponId\]\.level\}`/);
  assert.match(source, /level-up-pulse-\$\{weaponLevelPulse\.tick/);
});
