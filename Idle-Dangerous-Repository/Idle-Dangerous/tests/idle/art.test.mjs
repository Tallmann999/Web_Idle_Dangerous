import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { regionArt, enemyKey } from '../../src/idle/art.ts';
import { EQUIPMENT, MATERIALS, LAYERS } from '../../src/idle/engine.ts';

const root = fileURLToPath(new URL('../../public/', import.meta.url));
const json = path => JSON.parse(readFileSync(root + path, 'utf8'));

test('All 105 rooms select existing sprites and each region rotates its enemies', () => {
  for (let room = 1; room <= 105; room++) {
    const selected = enemyKey({ room, serial: 0 });
    assert.ok(existsSync(root + selected), selected);
    if (room % 5) assert.notEqual(selected, enemyKey({ room, serial: 1 }));
    else assert.match(selected, /art\/bosses\/boss-\d{2}\.webp$/);
  }
  for (const region of LAYERS) {
    for (const path of regionArt(region.region)) assert.ok(existsSync(root + path), path);
    const seen = new Set(Array.from({ length: 32 }, (_, serial) => enemyKey({ room: region.start, serial })));
    assert.ok(seen.size >= 12, `Region ${region.region} has a varied roster`);
  }
});

test('Every gear slot and ingredient has an exported icon and valid Phaser atlas frame', () => {
  const atlas = json('art/items/items.json');
  const sources = json('art/items/sources.json');
  for (const { id } of [...EQUIPMENT, ...MATERIALS]) {
    assert.ok(existsSync(root + `art/items/${id}.webp`), id);
    assert.ok(existsSync(root + sources[id].sheet), `Original source retained for ${id}`);
    const { x, y, w, h } = atlas.frames[id].frame;
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0);
    assert.ok(x + w <= atlas.meta.size.w && y + h <= atlas.meta.size.h);
  }
});
