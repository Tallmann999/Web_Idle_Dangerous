import roster from './enemies.json' with { type: 'json' };
import { boss, layer, type State, type GearId, type MaterialId } from './engine.ts';

export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
export const itemPath = (id: GearId | MaterialId) => `art/items/${id}.webp`;
export const regionEnemies = (region: number): string[] => roster[String(region) as keyof typeof roster];
export const backgroundKey = (region: number) => `art/backgrounds/zone-${String(region).padStart(2, '0')}.webp`;
export const bossKey = (room: number) => `art/bosses/boss-${String((Math.floor(room / 5) - 1) % 18 + 1).padStart(2, '0')}.webp`;
export function enemyKey(s: Pick<State, 'room' | 'serial'>): string {
  if (boss(s.room)) return bossKey(s.room);
  const pool = regionEnemies(layer(s.room).region);
  return `art/enemies/${pool[(s.room * 3 + s.serial) % pool.length]}`;
}
export function regionArt(region: number): string[] {
  const range = layer(([1, 11, 26, 41, 56, 76])[region - 1]);
  const bosses = Array.from({ length: range.end - range.start + 1 }, (_, i) => i + range.start)
    .filter(boss).map(bossKey);
  return [...new Set([backgroundKey(region), ...regionEnemies(region).map(f => `art/enemies/${f}`), ...bosses])];
}
