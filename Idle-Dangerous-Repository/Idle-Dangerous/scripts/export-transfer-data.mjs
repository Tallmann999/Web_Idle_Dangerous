// Explicit handoff export; this script does not modify gameplay or player saves.
import * as E from '../src/idle/engine.ts';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const out=resolve(process.argv[2]);mkdirSync(out,{recursive:true});
const write=(name,value)=>writeFileSync(resolve(out,name),JSON.stringify(value,null,2)+'\n');
const roster=JSON.parse(readFileSync('src/idle/enemies.json','utf8'));
const sources=JSON.parse(readFileSync('public/art/items/sources.json','utf8'));
write('equipment.json',E.EQUIPMENT.map(d=>({...d,icon:`03_ASSETS/public/art/items/${d.id}.webp`,portableIcon:`03_ASSETS/PortablePNG/art/items/${d.id}.png`,source:sources[d.id],side:['helmet','armor','bracers','boots'].includes(d.id)?'left':'right',milestones:E.MILESTONES.map((level,i)=>({level,cost:E.upgradeCost(d.id,i),multiplier:2}))})));
write('materials.json',E.MATERIALS.map(d=>({...d,icon:`03_ASSETS/public/art/items/${d.id}.webp`,portableIcon:`03_ASSETS/PortablePNG/art/items/${d.id}.png`,source:sources[d.id]})));
write('regions.json',E.LAYERS.map(l=>({...l,background:`03_ASSETS/public/art/backgrounds/zone-${String(l.region).padStart(2,'0')}.webp`,enemies:roster[l.region].map(f=>`03_ASSETS/public/art/enemies/${f}`)})));
write('enemy-pools.json',roster);
write('fresh-save.json',E.fresh());
write('levels.json',Array.from({length:105},(_,i)=>{const room=i+1,s=E.fresh();s.room=room;const region=E.layer(room).region;const boss=E.boss(room);const out=E.damage({...s,hp:1},1,()=>.99);return {room,region,boss,bossSeconds:boss?30:null,requiredKills:boss?1:10,background:`03_ASSETS/public/art/backgrounds/zone-${String(region).padStart(2,'0')}.webp`,bossSprite:boss?`03_ASSETS/public/art/bosses/boss-${String((Math.floor(room/5)-1)%18+1).padStart(2,'0')}.webp`:null,enemyPool:boss?null:region,hpBySerialModulo10:Array.from({length:10},(_,serial)=>E.hpMax({...s,serial})),goldReward:out.gold,lootChance:boss?1:.45,lootCount:boss?3:1,lootTotalDiamondValue:Math.max(1,Math.round(out.gold*.4))};}));
const fixtures=[];
for(const level of [0,1,9,10,25,50,100,150,500,998,999]){const s=E.fresh();s.clickLevel=level;fixtures.push({type:'training',level,damage:E.clickDamage(s,0),nextCost:E.clickCost(s)});}
for(const d of E.EQUIPMENT)for(const level of [0,1,10,25,50,100,150,999]){const s=E.fresh();s.gear[d.id].level=level;fixtures.push({type:'equipment',id:d.id,level,dps:E.gearDps(s,d.id),nextCost:E.gearCost(s,d.id)});}
write('balance-reference-values.json',fixtures);
const example=E.fresh();example.room=58;example.highest=58;example.kills=4;example.gold=1000000;example.diamonds=19;example.inventory.claw={count:2,value:6};
write('example-save-TEST-ONLY.json',E.normalize(example));
write('currency-trade-examples.json',[{input:{gold:1000,diamonds:0,claw:{count:7,value:19},reputation:0},contract5:{gold:1000,diamonds:13,claw:{count:2,value:6},reputation:5},sellRemainder:{gold:1000,diamonds:19,claw:{count:0,value:0},reputation:5}}]);
console.log('Exported content, all 105 levels, save samples and balance reference values.');
