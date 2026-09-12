import { getEnemyGold, getEnemyMaxHp, isBossZone } from "../src/game/clickerV3.ts";

const checkpoints = [1, 10, 25, 34, 35, 49, 50, 51, 55, 60, 80, 105];

function oldEnemyHp(zone) {
  const base = 10 * Math.pow(1.55, zone - 1);
  return Math.max(1, Math.round(base * (isBossZone(zone) ? 12 : 1)));
}

function compact(value) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

const rows = checkpoints.map((zone) => {
  const hp = getEnemyMaxHp(zone, 0);
  const oldHp = oldEnemyHp(zone);
  const reward = getEnemyGold(zone);
  return {
    level: zone,
    encounter: isBossZone(zone) ? "boss" : "regular",
    hp: compact(hp),
    reward: compact(reward),
    "hp / reward": (hp / reward).toFixed(2),
    "hp vs old": `${((hp / oldHp - 1) * 100).toFixed(1)}%`,
  };
});

console.table(rows);

const post50Step = 1.58 / 1.48;
console.log(`Pressure growth through level 50: 0.00% per level`);
console.log(`Pressure growth after level 50: ${((post50Step - 1) * 100).toFixed(2)}% per level`);
console.log(`Post-50 pressure multiplier after 10 levels: ${Math.pow(post50Step, 10).toFixed(2)}x`);
