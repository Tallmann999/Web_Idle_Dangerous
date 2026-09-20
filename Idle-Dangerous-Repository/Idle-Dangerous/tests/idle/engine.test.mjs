import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../src/idle/engine.ts';

test('Fresh profile uses equipment DPS and independent manual damage',()=>{const s=E.fresh();assert.equal(E.totalDps(s),1);assert.equal(E.clickDamage(s),1);s.gold=500;E.train(s);assert.equal(E.totalDps(s),1);assert.ok(E.clickDamage(s)>1);const click=E.clickDamage(s);E.buy(s,'helmet',10);assert.equal(E.clickDamage(s),click);assert.equal(s.gear.helmet.level,11);});
test('Ten enemies open a room but do not move the player; repeat farming works',()=>{const s=E.fresh();for(let i=0;i<10;i++)E.damage(s,1e9,()=>.99);assert.equal(s.highest,2);assert.equal(s.room,1);assert.equal(s.kills,0);for(let i=0;i<10;i++)E.damage(s,1e9,()=>.99);assert.equal(s.highest,2);assert.equal(s.totalKills,20);assert.equal(s.gold,60);});
test('Equipment requires both depth and gold, bulk never overspends',()=>{const s=E.fresh();s.gold=10000;assert.equal(E.buy(s,'armor'),0);s.highest=5;assert.equal(E.buy(s,'armor'),1);assert.equal(s.gold,9850);s.gold=6;assert.equal(E.buy(s,'helmet',999),1);assert.equal(s.gold,1);assert.equal(E.buy(s,'helmet'),0);});
test('Milestones are separate one-time purchases and multiply only one item',()=>{const s=E.fresh();s.gold=1e6;assert.equal(E.specialize(s,'helmet',10),false);E.buy(s,'helmet',9);const before=E.gearDps(s,'helmet');assert.equal(E.specialize(s,'helmet',10),true);assert.equal(E.gearDps(s,'helmet'),before*2);assert.equal(E.specialize(s,'helmet',10),false);assert.equal(E.specialize(s,'helmet',15),false);});
test('Loot is retained on exit, sold only in guild, sale credits diamonds without changing gold or duplicating loot',()=>{const s=E.fresh();E.damage(s,100,()=>0);assert.equal(E.lootCount(s),1);assert.equal(s.inventory.claw.count,1);assert.equal(E.sell(s),0);const loot=E.lootValue(s);E.leave(s);const gold=s.gold;assert.equal(E.sell(s),loot);assert.equal(s.gold,gold);assert.equal(s.diamonds,loot);assert.equal(E.sell(s),0);assert.equal(E.lootCount(s),0);});
test('Guild contracts consume five and preserve exact stack value',()=>{const s=E.fresh();s.location='guild';s.inventory.claw={count:7,value:19};assert.equal(E.sell(s,'claw',true),13);assert.equal(s.inventory.claw.count,2);assert.equal(s.inventory.claw.value,6);assert.equal(s.reputation,5);assert.equal(E.sell(s,'claw',true),0);assert.equal(E.sell(s,'claw'),6);assert.equal(s.gold,0);assert.equal(s.diamonds,19);});
test('Boss win grants once, unlocks next room and returns to safe farm',()=>{const s=E.fresh();s.highest=5;E.go(s,5);const out=E.damage(s,1e20,()=>0);assert.equal(out.bossWon,true);assert.equal(s.room,4);assert.equal(s.highest,6);assert.deepEqual(s.defeated,[5]);assert.equal(E.go(s,5),false);assert.equal(E.lootCount(s),3);});
test('Boss timeout allows retry and a single rewarded rescue per attempt',()=>{const s=E.fresh();s.highest=5;E.go(s,5);s.bossTime=.01;assert.equal(E.tick(s,.1).failed,true);assert.equal(s.offerRoom,5);assert.equal(s.room,4);const gold=s.gold;E.damage(s,1e20);assert.equal(s.gold,gold);assert.equal(E.rescue(s,5),true);assert.equal(s.bossTime,15);assert.equal(E.totalDps(s),2);s.bossTime=.01;E.tick(s,.1);assert.equal(E.rescue(s,5),false);assert.equal(E.go(s,5),true);assert.equal(s.bossTime,30);assert.equal(s.rescueUsed,false);});
test('Boss timeout loses to an actual lethal hit in same simulation step',()=>{const s=E.fresh();s.highest=5;E.go(s,5);s.hp=.01;s.bossTime=.01;const out=E.tick(s,.1);assert.equal(out.bossWon,true);assert.equal(s.offerRoom,null);});
test('Final boss finishes campaign and returns to room 104',()=>{const s=E.fresh();s.highest=105;E.go(s,105);E.damage(s,1e100);assert.equal(s.completed,true);assert.equal(s.room,104);assert.equal(s.highest,105);assert.equal(E.go(s,105),false);const restored=E.normalize(JSON.parse(JSON.stringify(s)));assert.equal(restored.completed,true);assert.equal(restored.defeated.length,21);});
test('Save roundtrip retains equipment, inventory, depth, guild and cooldown',()=>{const s=E.fresh();s.gold=5000;s.diamonds=37;s.highest=12;E.buy(s,'armor',10);s.inventory.bone={count:3,value:21};s.clickLevel=10;E.focus(s);E.leave(s);const restored=E.normalize(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.gear,s.gear);assert.deepEqual(restored.inventory,s.inventory);assert.equal(restored.location,'guild');assert.equal(restored.gold,s.gold);assert.equal(restored.diamonds,37);assert.equal(restored.focusReady,s.focusReady);assert.equal(E.focus(restored),false);});
test('Corrupt values are bounded and old weapon saves never migrate into new game',()=>{const s=E.normalize({version:1,gold:Infinity,highest:999,room:-9,clickLevel:NaN});assert.equal(s.gold,0);assert.equal(s.highest,105);assert.equal(s.room,1);assert.equal(s.clickLevel,0);assert.deepEqual(E.normalize({version:7,gold:1e20}),E.fresh());});
test('Leaving boss cancels attempt and reentry starts a full timer',()=>{const s=E.fresh();s.highest=5;E.go(s,5);s.hp=1;s.bossTime=2;E.leave(s);const hp=s.hp;E.tick(s,10);assert.equal(s.hp,hp);E.enter(s);assert.equal(s.bossTime,30);assert.equal(s.hp,E.hpMax(s));});


test('Old saves gain zero diamonds while retaining gold and unsold loot',()=>{
 const {diamonds,...old}=E.fresh();old.gold=123;old.inventory.bone={count:4,value:28};
 const restored=E.normalize(old);assert.equal(restored.diamonds,0);assert.equal(restored.gold,123);assert.deepEqual(restored.inventory,old.inventory);
 for(const bad of [undefined,null,-1,NaN,Infinity,'200'])assert.equal(E.normalize({...old,diamonds:bad}).diamonds,0);
 E.leave(old);assert.equal(E.sell(old,'bone'),28);assert.equal(old.diamonds,28); // Also tolerate a live pre-update state during HMR.
});
test('Single-stack and sell-all payouts accumulate only in the diamond wallet',()=>{
 const s=E.fresh();s.gold=42;s.diamonds=5;s.inventory.claw={count:2,value:9};s.inventory.bone={count:3,value:12};
 assert.equal(E.sell(s,'claw'),0);assert.equal(s.diamonds,5);E.leave(s);
 assert.equal(E.sell(s,'claw'),9);assert.equal(s.diamonds,14);assert.equal(s.inventory.bone.count,3);
 assert.equal(E.sell(s),12);assert.equal(s.diamonds,26);assert.equal(s.gold,42);
 assert.equal(E.sell(s),0);assert.equal(s.diamonds,26);assert.equal(E.lootCount(s),0);
});
test('Diamond income does not pay for gold upgrades or enable purchases',()=>{
 const s=E.fresh();s.diamonds=1e9;assert.equal(E.buy(s,'helmet'),0);assert.equal(E.train(s),false);
 s.gear.helmet.level=10;assert.equal(E.specialize(s,'helmet',10),false);assert.equal(s.diamonds,1e9);
 E.damage(s,1e12,()=>0);assert.equal(s.gold,3);assert.equal(s.diamonds,1e9);
});
