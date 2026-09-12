import { getEnemyMaxHp, getEnemyGold, getGlobalClickDamage, getClickLevelCost } from '../game/clickerV3.ts';

export const SAVE_KEY = 'idle-dangerous-save-v1';
export const TOTAL_ROOMS = 105;
export const MILESTONES = [10, 25, 50, 100, 150] as const;
export const EQUIPMENT = [
  { id: 'helmet', name: 'Шлем', title: 'Шлем дозорного', gate: 1, cost: 0, dps: 1, levelCost: 5, upgradeCost: 120, color: '#9bbdc4' },
  { id: 'armor', name: 'Броня', title: 'Броня странника', gate: 5, cost: 150, dps: 8, levelCost: 20, upgradeCost: 480, color: '#b0bb89' },
  { id: 'boots', name: 'Ноги', title: 'Сапоги следопыта', gate: 12, cost: 2500, dps: 55, levelCost: 110, upgradeCost: 3500, color: '#8ec3d1' },
  { id: 'bracers', name: 'Наручи', title: 'Наручи разрушителя', gate: 20, cost: 40000, dps: 420, levelCost: 1300, upgradeCost: 42000, color: '#d2a77c' },
  { id: 'shoulders', name: 'Плечи', title: 'Наплечники стража', gate: 25, cost: 220000, dps: 1200, levelCost: 5500, upgradeCost: 180000, color: '#a7a1cc' },
  { id: 'ring', name: 'Кольцо', title: 'Кольцо затмения', gate: 30, cost: 1200000, dps: 3600, levelCost: 18000, upgradeCost: 620000, color: '#c693d8' },
  { id: 'amulet', name: 'Амулет', title: 'Амулет глубин', gate: 40, cost: 30000000, dps: 31000, levelCost: 260000, upgradeCost: 9500000, color: '#86d9b0' },
] as const;
export type GearId = typeof EQUIPMENT[number]['id'];
export const MATERIALS = [
  {id:'claw',name:'Когти',color:'#d8ccb1',chance:.45},
  {id:'hide',name:'Кожа чудовища',color:'#bf9175',chance:.24},
  {id:'bone',name:'Древние кости',color:'#dad7be',chance:.16},
  {id:'crystal',name:'Осколки кристалла',color:'#84c6d3',chance:.09},
  {id:'essence',name:'Тёмная эссенция',color:'#be91dc',chance:.05},
  {id:'heart',name:'Сердце глубин',color:'#e28a86',chance:.01},
] as const;
export const LAYERS = [
 {name:'Забытые катакомбы',start:1,end:10,region:1},
 {name:'Скованные коридоры',start:11,end:25,region:2},
 {name:'Залы безмолвия',start:26,end:40,region:3},
 {name:'Ледяные склепы',start:41,end:55,region:4},
 {name:'Проклятые недра',start:56,end:75,region:5},
 {name:'Сердце Бездны',start:76,end:105,region:6},
];
export type MaterialId = typeof MATERIALS[number]['id'];
export type State = {
 version:1; gold:number; room:number; highest:number; kills:number; serial:number; hp:number;
 bossTime:number; defeated:number[]; gear:Record<GearId,{level:number;upgrades:number[]}>;
 clickLevel:number; inventory:Record<MaterialId,{count:number;value:number}>;
 location:'dungeon'|'guild'; reputation:number; totalKills:number; completed:boolean;
 offerRoom:number|null; offerHp:number; rescueUsed:boolean; boost:boolean; focusUntil:number; focusReady:number; sound:boolean;
};
export const boss = (room:number) => room % 5 === 0;
export const layer = (room:number) => LAYERS.find(x=>room<=x.end) ?? LAYERS[5];
export const hpMax = (s:State) => getEnemyMaxHp(s.room,s.serial);
export const gearDps = (s:State,id:GearId) => {const d=EQUIPMENT.find(x=>x.id===id)!;return d.dps*s.gear[id].level*2**s.gear[id].upgrades.length;};
export const totalDps = (s:State) => EQUIPMENT.reduce((n,d)=>n+gearDps(s,d.id),0)*(s.boost?2:1);
export const clickDamage = (s:State,now=Date.now()) => getGlobalClickDamage({clickLevel:s.clickLevel+1})*(now<s.focusUntil?2:1);
export const clickCost = (s:State) => getClickLevelCost(s.clickLevel+1);
export const gearCost = (s:State,id:GearId) => {const d=EQUIPMENT.find(x=>x.id===id)!;return s.gear[id].level?Math.ceil(d.levelCost*1.075**(s.gear[id].level-1)):d.cost;};
export const upgradeCost = (id:GearId,index:number) => EQUIPMENT.find(x=>x.id===id)!.upgradeCost*[1,5,25,150,800][index];
export const lootCount = (s:State) => MATERIALS.reduce((n,m)=>n+s.inventory[m.id].count,0);
export const lootValue = (s:State) => MATERIALS.reduce((n,m)=>n+s.inventory[m.id].value,0);
export function fresh():State {return {version:1,gold:0,room:1,highest:1,kills:0,serial:0,hp:10,bossTime:30,defeated:[],gear:Object.fromEntries(EQUIPMENT.map((d,i)=>[d.id,{level:i?0:1,upgrades:[]}])) as unknown as State['gear'],clickLevel:0,inventory:Object.fromEntries(MATERIALS.map(m=>[m.id,{count:0,value:0}])) as State['inventory'],location:'dungeon',reputation:0,totalKills:0,completed:false,offerRoom:null,offerHp:0,rescueUsed:false,boost:false,focusUntil:0,focusReady:0,sound:true};}
const safe=(n:unknown, fallback=0,max=1e100)=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(max,n)):fallback;
export function normalize(raw:unknown):State {
 const s=fresh();if(!raw||typeof raw!=='object'||(raw as State).version!==1)return s;
 const r=raw as Partial<State>;
 s.gold=safe(r.gold);s.highest=Math.max(1,Math.floor(safe(r.highest,1,105)));s.room=Math.max(1,Math.floor(safe(r.room,1,s.highest)));
 s.completed=r.completed===true&&s.highest===105;
 s.defeated=Array.from({length:21},(_,i)=>(i+1)*5).filter(n=>n<s.highest||(n===105&&s.completed));
 if(s.defeated.includes(s.room))s.room=Math.max(1,s.room-1);
 s.kills=Math.floor(safe(r.kills,0,9));s.serial=Math.floor(safe(r.serial,0,1e9));
 s.clickLevel=Math.floor(safe(r.clickLevel,0,999));s.reputation=Math.floor(safe(r.reputation));s.totalKills=Math.floor(safe(r.totalKills));
 s.location=r.location==='guild'?'guild':'dungeon';s.sound=r.sound!==false;
 for(const d of EQUIPMENT){const g=r.gear?.[d.id];s.gear[d.id]={level:Math.floor(safe(g?.level,d.id==='helmet'?1:0,999)),upgrades:[]};s.gear[d.id].upgrades=MILESTONES.filter(t=>s.gear[d.id].level>=t&&g?.upgrades?.includes(t));}
 s.gear.helmet.level=Math.max(1,s.gear.helmet.level);
 for(const m of MATERIALS){const v=r.inventory?.[m.id];s.inventory[m.id]={count:Math.floor(safe(v?.count,0,1e12)),value:safe(v?.value)};if(!s.inventory[m.id].count)s.inventory[m.id].value=0;}
 s.focusUntil=safe(r.focusUntil,0,Date.now()+15000);s.focusReady=safe(r.focusReady,0,Date.now()+615000);
 // An interrupted boss attempt restarts; gold and loot never roll back.
 s.hp=boss(s.room)?hpMax(s):Math.max(1,safe(r.hp,hpMax(s),hpMax(s)));
 return s;
}
export function go(s:State,room:number):boolean {
 if(room<1||room>s.highest||room>105||s.defeated.includes(room))return false;
 s.room=room;s.kills=0;s.serial++;s.hp=hpMax(s);s.bossTime=30;s.boost=false;s.rescueUsed=false;s.offerRoom=null;return true;
}
export function enter(s:State){s.location='dungeon';s.offerRoom=null;if(boss(s.room)){s.hp=hpMax(s);s.bossTime=30;s.boost=false;s.rescueUsed=false;}}
export function leave(s:State){s.location='guild';s.offerRoom=null;s.boost=false;if(boss(s.room)){s.hp=hpMax(s);s.bossTime=30;s.rescueUsed=false;}}
export function buy(s:State,id:GearId,amount=1):number {
 const d=EQUIPMENT.find(x=>x.id===id)!;if(s.highest<d.gate)return 0;
 let n=0;while(n<amount&&s.gear[id].level<999){const cost=gearCost(s,id);if(s.gold<cost)break;s.gold-=cost;s.gear[id].level++;n++;}return n;
}
export function specialize(s:State,id:GearId,t:number):boolean {
 const i=MILESTONES.findIndex(x=>x===t);if(i<0||s.gear[id].level<t||s.gear[id].upgrades.includes(t))return false;
 const cost=upgradeCost(id,i);if(s.gold<cost)return false;s.gold-=cost;s.gear[id].upgrades.push(t);return true;
}
export function train(s:State):boolean {const c=clickCost(s);if(s.gold<c||s.clickLevel>=999)return false;s.gold-=c;s.clickLevel++;return true;}
export function sell(s:State,id?:MaterialId,contract=false):number {
 if(s.location!=='guild')return 0;let gold=0;
 for(const m of MATERIALS){if(id&&id!==m.id)continue;const stack=s.inventory[m.id];if(contract&&stack.count<5)continue;const quantity=contract?5:stack.count;if(!quantity)continue;const value=quantity===stack.count?stack.value:Math.floor(stack.value*quantity/stack.count);stack.count-=quantity;stack.value-=value;gold+=value;if(contract)s.reputation+=5;}
 s.gold+=gold;return gold;
}
export function focus(s:State,now=Date.now()):boolean {if(s.clickLevel<10||now<s.focusReady)return false;s.focusUntil=now+15000;s.focusReady=now+615000;return true;}
export function rescue(s:State,room:number):boolean {if(s.offerRoom!==room||s.rescueUsed||s.defeated.includes(room))return false;const remaining=s.offerHp;go(s,room);s.hp=Math.max(1,Math.min(hpMax(s),remaining));s.bossTime=15;s.boost=true;s.rescueUsed=true;return true;}
export type Outcome={killed?:boolean;bossWon?:boolean;failed?:boolean;drop?:MaterialId;gold?:number;unlocked?:boolean};
export function damage(s:State,amount:number,rng:()=>number=Math.random):Outcome {
 if(s.location!=='dungeon'||s.offerRoom!==null||amount<=0||!Number.isFinite(amount))return {};
 s.hp=Math.max(0,s.hp-amount);if(s.hp>0)return {};
 const oldRoom=s.room,wasBoss=boss(oldRoom),reward=getEnemyGold(oldRoom);s.gold+=reward;s.totalKills++;
 const out:Outcome={killed:true,gold:reward,bossWon:wasBoss};
 if(wasBoss||rng()<.45){let pick=rng(),type=MATERIALS[0] as typeof MATERIALS[number];for(const m of MATERIALS){pick-=m.chance;if(pick<=0){type=m;break;}}
 const count=wasBoss?3:1,value=Math.max(1,Math.round(getEnemyGold(oldRoom)*.4));s.inventory[type.id].count+=count;s.inventory[type.id].value+=value;out.drop=type.id;}
 if(wasBoss){if(!s.defeated.includes(oldRoom))s.defeated.push(oldRoom);s.highest=Math.max(s.highest,Math.min(105,oldRoom+1));if(oldRoom===105)s.completed=true;go(s,oldRoom-1);out.unlocked=true;}
 else{s.kills++;s.serial++;if(s.kills>=10){s.kills=0;if(s.room===s.highest&&s.highest<105){s.highest++;out.unlocked=true;}}s.hp=hpMax(s);}
 return out;
}
export function tick(s:State,dt:number,rng:()=>number=Math.random):Outcome {
 if(s.location!=='dungeon'||s.offerRoom!==null||dt<=0)return {};
 const elapsed=Math.min(dt,.25); // no hidden-tab catch-up
 const out=damage(s,totalDps(s)*elapsed,rng);if(out.bossWon)return out;
 if(boss(s.room)){s.bossTime=Math.max(0,s.bossTime-elapsed);if(s.bossTime===0){const room=s.room,used=s.rescueUsed,remaining=s.hp;go(s,room-1);s.offerRoom=room;s.offerHp=remaining;s.rescueUsed=used;return {...out,failed:true};}}
 return out;
}
