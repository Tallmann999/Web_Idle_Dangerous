import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const gameSource = await readFile(new URL("../src/game/Game.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../src/styles/game.css", import.meta.url), "utf8");

test("main screen follows the left roster, skill dock and right battlefield structure", () => {
  assert.match(gameSource, /className="clicker-layout"/);
  assert.match(gameSource, /className="weapon-roster-panel"/);
  assert.match(gameSource, /className="ability-dock"/);
  assert.match(gameSource, /className="battlefield-panel"/);
  assert.match(cssSource, /grid-template-columns:\s*minmax\(392px, 434px\) 72px minmax\(0, 1fr\)/);
});

test("major gameplay surfaces are separated into distinct framed windows", () => {
  assert.match(cssSource, /\.clicker-layout \{[\s\S]*?gap:\s*8px;\s*padding:\s*8px/);
  assert.match(cssSource, /\.weapon-roster-panel \{[\s\S]*?border:\s*1px solid #655e49;\s*border-radius:\s*6px/);
  assert.match(cssSource, /\.battlefield-panel \{[^}]*gap:\s*8px/);
  assert.match(cssSource, /\.zone-navigation \{[\s\S]*?border:\s*1px solid #4b5149;\s*border-radius:\s*6px/);
  assert.match(cssSource, /\.arena \{[\s\S]*?border:\s*1px solid #3e4944;\s*border-radius:\s*6px/);
});

test("zone progression and boss timer remain inside the combat screen", () => {
  assert.match(gameSource, /className="zone-navigation"/);
  assert.match(gameSource, /className="open-map-button"/);
  assert.match(gameSource, /zoneStrip\.map/);
  assert.match(gameSource, /className="boss-timer"/);
  assert.match(gameSource, /BOSS_TIME_LIMIT_SEC/);
  assert.doesNotMatch(gameSource, /view === "map"/);
});

test("world overview shows regions and the player position without level nodes or roads", () => {
  const worldOverview = gameSource.match(/world-overview-canvas"([\s\S]*?)<\/section> : <section className="world-map-canvas region-map-canvas"/)?.[1] ?? "";
  assert.match(gameSource, /className=\{`world-map-screen/);
  assert.match(gameSource, /art\/maps\/world\.webp/);
  assert.match(worldOverview, /state !== "locked"/);
  assert.match(worldOverview, /className="world-map-fog"/);
  assert.match(worldOverview, /className="world-player-marker"/);
  assert.match(worldOverview, /openMapRegion\(region\.id\)/);
  assert.doesNotMatch(worldOverview, /world-zone-node/);
  assert.doesNotMatch(worldOverview, /map-roads/);
  assert.match(cssSource, /\.world-map-fog \{[^}]*opacity: \.76/);
  assert.match(cssSource, /\.world-map-canvas[\s\S]*?aspect-ratio:\s*16 \/ 9/);
});

test("each region screen builds its own irregular sequential route", () => {
  assert.match(gameSource, /REGION_LAYOUTS\[selectedMapRegion.id\].route\[index\]/);
  assert.match(gameSource, /const regionMapNodes = useMemo/);
  assert.match(gameSource, /className="map-roads region-map-roads"/);
  assert.match(gameSource, /mapRoadCurve\(previous, node, index/);
  assert.match(gameSource, /<path d=\{route\} className="road-shadow"/);
  assert.match(cssSource, /\.road-active \{[^}]*stroke-dasharray:/);
});

test("regional art and markers share one responsive coordinate space", () => {
  assert.match(gameSource, /className="region-map-content"/);
  assert.match(gameSource, /mapPoint\(selectedMapRegion.id/);
  assert.match(cssSource, /\.region-map-content \{[^}]*container-type: size/);
});

test("regional maps have previous and next navigation arrows", () => {
  assert.match(gameSource, /className="region-map-arrow previous"/);
  assert.match(gameSource, /className="region-map-arrow next"/);
  assert.match(gameSource, /openMapRegion\(previousMapRegion\.id\)/);
  assert.match(gameSource, /openMapRegion\(nextMapRegion\.id\)/);
  assert.match(cssSource, /\.region-map-pagination \{[^}]*position: absolute;[^}]*z-index: 14/);
});

test("compact map header keeps every label and action inside its responsive grid cell", () => {
  assert.match(cssSource, /\.world-map-header \{ grid-template-columns: minmax\(0, 1\.35fr\) minmax\(58px, \.5fr\) minmax\(0, 1fr\) minmax\(76px, \.58fr\); overflow: hidden; \}/);
  assert.match(cssSource, /\.world-map-header > \* \{ min-width: 0; max-width: 100%; overflow: hidden; \}/);
  assert.match(cssSource, /\.map-brand strong \{ font-size: clamp\(10px, 1\.75vw, 14px\)/);
  assert.match(cssSource, /\.region-map-actions \.whole-world-button \{[^}]*min-width: 0; min-height: 0/);
});

test("regional maps use the supplied transparent art without stretching or neighboring regions", () => {
  const regionArt = gameSource.match(/<svg className="region-map-art"([\s\S]*?)<\/svg>/)?.[1] ?? "";
  assert.match(regionArt, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(regionArt, /REGION_LAYOUTS/);
  assert.match(regionArt, /art\/maps\/zone-/);
  assert.doesNotMatch(regionArt, /WORLD_MAP_ART|clipPath|region-outside/);
});

test("world map is divided into six named irregular hover regions with fixed campaign ranges", () => {
  assert.match(gameSource, /const MAP_REGIONS = \[/);
  for (const name of ["Сумрачный лес", "Одинокие равнины", "Скованные хребты", "Заснеженные пики", "Проклятая земля", "Разлом Хаоса"]) {
    assert.match(gameSource, new RegExp(name));
  }
  assert.match(gameSource, /className="map-regions"/);
  assert.match(gameSource, /className="map-region-shape"/);
  assert.match(gameSource, /className=\{`map-region-label/);
  assert.match(cssSource, /\.map-region:hover \.map-region-shape, \.map-region:focus-visible \.map-region-shape/);
  assert.match(cssSource, /\.map-region-shape \{[^}]*fill: transparent; stroke: transparent/);
  assert.doesNotMatch(gameSource, /path: "[^"]*Q/);
  assert.match(gameSource, /startZone: 1, endZone: 10/);
  assert.match(gameSource, /startZone: 76, endZone: 105/);
});

test("region map is a separate full-screen state with a full-width world button", () => {
  assert.match(gameSource, /selectedMapRegion \? "region-map-screen" : "world-overview-screen"/);
  assert.match(gameSource, /className="world-map-canvas region-map-canvas"/);
  assert.match(gameSource, /className="whole-world-button" onClick=\{showWholeWorldMap\}>МИР/);
  assert.match(gameSource, /setSelectedMapRegionId\(getMapRegionForZone\(current\.zone\)\.id\)/);
  assert.match(cssSource, /\.whole-world-button \{[^}]*width:\s*100%;[^}]*min-height:\s*100%/);
  assert.doesNotMatch(gameSource, /className="region-return-to-battle"/);
  assert.doesNotMatch(gameSource, /className="return-to-battle"/);
  assert.match(gameSource, /REGION_LAYOUTS\[selectedMapRegion.id\].viewBox/);
  assert.match(gameSource, /regionMapNodes\.map/);
});

test("new world texture is cache-busted and has a reproducible web optimization pipeline", () => {
  assert.match(gameSource, /2026-09-05-abilities-bosses/);
});

test("regional maps show two cooldown dungeon entrances while the world overview stays clean", () => {
  const worldOverview = gameSource.match(/world-overview-canvas"([\s\S]*?)<\/section> : <section className="world-map-canvas region-map-canvas"/)?.[1] ?? "";
  assert.doesNotMatch(worldOverview, /world-dungeon-node/);
  assert.match(gameSource, /DUNGEON_CHALLENGES\s*\.filter\(\(dungeon\) => dungeon\.regionId === selectedMapRegion\.id\)/);
  assert.match(gameSource, /regionDungeons\.map/);
  assert.match(gameSource, /className={`world-dungeon-node \$\{stateClass\}`}/);
  assert.match(gameSource, /Данжи перезаряжаются 10 минут после победы/);
  assert.match(cssSource, /\.world-dungeon-node\.locked/);
  assert.match(cssSource, /\.world-dungeon-node\.cooldown/);
  assert.doesNotMatch(gameSource, /className="world-dungeon-node available world-test-boss-node"/);
  assert.doesNotMatch(gameSource, /<b>TestBoss<\/b>/);
  assert.doesNotMatch(worldOverview, /legend-dungeon|legend-test-boss/);
});

test("boss map nodes stay red and open right-side status information instead of restarting fights", () => {
  assert.match(gameSource, /disabled=\{!accessible\}/);
  assert.match(gameSource, /kind: "campaign", zone: node\.zone/);
  assert.match(gameSource, /className="map-boss-info"/);
  assert.match(gameSource, /БОСС ПОВЕРЖЕН/);
  assert.match(gameSource, /ДАНЖ-БОСС МОЖНО БУДЕТ АТАКОВАТЬ ЧЕРЕЗ/);
  assert.match(gameSource, /disabled=\{!unlocked\}/);
  assert.match(gameSource, /kind: "dungeon", dungeonId: dungeon\.id/);
  assert.match(cssSource, /\.map-boss-info \{[^}]*left:\s*clamp\([^;]*var\(--map-node-x\)/);
  assert.match(cssSource, /\.map-boss-info > \.map-boss-info-danger/);
  assert.match(cssSource, /\.world-zone-node\.boss \{[^}]*opacity:\s*\.84;[^}]*#df5162/);
  assert.match(cssSource, /\.world-dungeon-node \{[\s\S]*?opacity:\s*\.84;[^}]*#e05266/);
});

test("dungeon FTUE appears only for a fresh boss unlock in the same region and at most twice per campaign", () => {
  assert.match(gameSource, /const MAX_DUNGEON_GUIDE_SHOWS = 2/);
  assert.match(gameSource, /dungeon\.bossZone === lethalState\.zone/);
  assert.match(gameSource, /lethalState\.combatAnnouncedDungeonIds\.length < MAX_DUNGEON_GUIDE_SHOWS/);
  assert.match(gameSource, /!lethalState\.combatAnnouncedDungeonIds\.includes\(dungeon\.id\)/);
  assert.match(gameSource, /combatAnnouncedDungeonIds: newlyUnlockedDungeon/);
  assert.match(gameSource, /setNewDungeonGuide\(\{ dungeonId: newlyUnlockedDungeon\.id \}\)/);
  assert.match(gameSource, /announcedDungeon\.regionId !== getMapRegionForZone\(game\.zone\)\.id/);
  assert.match(gameSource, /game\.zone === announcedDungeon\.bossZone - 1/);
  assert.doesNotMatch(gameSource, /legacyUnlockedDungeon/);
  assert.match(gameSource, /ref=\{mapButtonRef\} className="open-map-button"/);
  assert.match(gameSource, /className=\{`ftue-guide dungeon-unlock-ftue/);
  assert.match(gameSource, /ПОЯВИЛСЯ НОВЫЙ ДАНЖ-БОСС/);
  assert.match(gameSource, /const NEW_DUNGEON_GUIDE_MS = 6_000/);
  assert.match(gameSource, /setTimeout\(\(\) => setNewDungeonGuide\(null\), NEW_DUNGEON_GUIDE_MS\)/);
  assert.doesNotMatch(gameSource, /className="new-dungeon-guide"/);
});

test("defeated campaign bosses are marked and cannot be selected again", () => {
  assert.match(gameSource, /const defeatedBoss = bossZone && zone < game\.highestZone/);
  assert.match(gameSource, /disabled=\{defeatedBoss\}/);
  assert.match(gameSource, /ПОБЕЖДЁН/);
  assert.match(gameSource, /Босс уровня \$\{zone\} уже повержен/);
  assert.match(cssSource, /\.zone-track button\.defeated/);
});

test("dungeon battles reuse the main game shell with one zone card", () => {
  assert.match(gameSource, /activeDungeon \? <header className="zone-navigation dungeon-zone-navigation">/);
  assert.match(gameSource, /className="zone-track dungeon-zone-track"/);
  assert.match(gameSource, /className="arena boss-arena dungeon-arena-main"/);
  assert.match(gameSource, /className="weapon-roster-panel"/);
  assert.match(gameSource, /className="ability-dock"/);
  assert.doesNotMatch(gameSource, /className="dungeon-screen"/);
});

test("manual dungeon attacks reuse projectile, impact and damage-number feedback", () => {
  assert.match(gameSource, /function attackDungeon\(event: MouseEvent<HTMLButtonElement>\)/);
  assert.match(gameSource, /latestAttempt\.dungeonId !== currentAttempt\.dungeonId/);
  assert.match(gameSource, /key=\{`dungeon-impact-\$\{number\.id\}`\}/);
  assert.match(gameSource, /key=\{`dungeon-damage-\$\{number\.slot\}`\}/);
  assert.match(gameSource, /PROJECTILE_TRAVEL_MS/);
});

test("opening the map abandons an active boss attempt", () => {
  assert.match(gameSource, /if \(isBossZone\(current\.zone\)\) \{/);
  assert.match(gameSource, /const failed = failBoss\(current\)/);
  assert.match(gameSource, /reason: "map_exit"/);
});

test("an expired boss timer offers one rewarded fifteen-second DPS rescue before leaving", () => {
  assert.match(gameSource, /commitBossRewardAd\(\{ zone: current\.zone, started: false/);
  assert.match(gameSource, /bossTimeLeft: BOSS_BOOST_DURATION_SEC/);
  assert.match(gameSource, /const autoDps = getTotalArsenalDps\(current\)[^;]*bossBoostMultiplier/);
  assert.match(gameSource, /const autoDamage = autoDps \* elapsed/);
  assert.match(gameSource, /displayedDps = totalDps[^;]*bossRewardBoostMultiplier/);
  assert.match(gameSource, /bossTimerLimit = bossRewardBoostActive[\s\S]*?\? BOSS_BOOST_DURATION_SEC[\s\S]*?testBossActive \? TEST_BOSS_TIME_LIMIT_SEC : BOSS_TIME_LIMIT_SEC/);
  assert.match(gameSource, /×2 DPS · 15 СЕКУНД/);
  assert.match(gameSource, /ПРОДОЛЖИТЬ С ×2 DPS/);
  assert.match(gameSource, /СМОТРЕТЬ РЕКЛАМУ · ×2 DPS/);
  assert.match(gameSource, /rewarded_time_expired/);
  assert.match(cssSource, /\.boss-reward-boost-badge/);
});

test("map and open-zone navigation stay interactive during the enemy death dissolve", () => {
  assert.match(gameSource, /function interruptEnemyDeath/);
  assert.match(gameSource, /const MIN_ENEMY_VISIBLE_MS = 450/);
  assert.match(gameSource, /<button className="open-map-button" onClick=\{openWorldMap\}>/);
  assert.doesNotMatch(gameSource, /open-map-button" disabled=\{enemyDying\}/);
  assert.doesNotMatch(gameSource, /zoneStrip\.map\(\(zone\) => <button key=\{zone\} disabled=\{enemyDying\}/);
  assert.match(gameSource, /const completed = resolveCampaignBossVictory\(gameRef\.current\)/);
  assert.match(gameSource, /const skipVictory = dungeonAttemptRef\.current\?\.status === "won"/);
  assert.doesNotMatch(gameSource, /open-map-button" disabled=\{dungeonAttempt\?\.status === "won"\}/);
});

test("top status emphasizes the biome and removes the enemy counter", () => {
  assert.match(gameSource, /const TopBar = memo/);
  assert.match(gameSource, /title=\{activeDungeon \? activeDungeon\.shortName : testBossActive \? "TestBoss" : biome\.name\}/);
  assert.match(gameSource, /<small>ОБЩИЙ УРОН<\/small>/);
  assert.doesNotMatch(gameSource, /world-status[^\n]*ВРАГ/);
});

test("top combat values and zone cards use doubled typography", () => {
  assert.match(cssSource, /\.top-resources small \{[^}]*font:\s*600 18px\/1 "Roboto Condensed"/);
  assert.match(cssSource, /\.top-resources strong \{[^}]*clamp\(26px, 2\.2vw, 36px\)\/1 "Roboto Condensed"/);
  assert.match(cssSource, /\.zone-track small \{[^}]*font:\s*600 14px\/1 "Roboto Condensed"/);
  assert.match(cssSource, /\.zone-track strong \{[^}]*font:\s*700 38px\/1 "Roboto Condensed"/);
  assert.match(cssSource, /\.zone-track span \{[^}]*font:\s*700 14px\/1 "Roboto Condensed"/);
});

test("bottom navigation is twenty percent shorter without shrinking its type", () => {
  assert.match(cssSource, /\.battlefield-panel \{[^}]*grid-template-rows:\s*92px minmax\(0, 1fr\) 53px/);
  assert.match(cssSource, /\.system-nav strong \{[^}]*font:\s*700 9px "Roboto Condensed"/);
});

test("bottom navigation uses centered text labels without decorative icons", () => {
  const navigation = gameSource.match(/<footer className="system-nav">([\s\S]*?)<\/footer>/)?.[1] ?? "";
  for (const label of ["Арсенал", "Магазин", "Очищение", "Достижения", "Настройки"]) {
    assert.match(navigation, new RegExp(`<strong>${label}<\\/strong>`));
  }
  assert.doesNotMatch(navigation, /<span>|<small>/);
  assert.match(cssSource, /\.system-nav button \{[^}]*display:\s*flex;[^}]*justify-content:\s*center/);
});

test("enemy card stays the central click target with one health bar", () => {
  assert.match(gameSource, /className=\{`enemy-target \$\{ftueStep === "enemy" \? "ftue-target" : ""\} \$\{enemyDying \? boss && !testBossActive \? "boss-victory-freeze" : "dying" : ""\}`\}/);
  assert.match(gameSource, /className="health-track"/);
  assert.match(cssSource, /\.health-panel \{[^}]*width:\s*min\(420px, 52%\)/);
  assert.doesNotMatch(gameSource, /corruption-hp|phase-corruption|selectedCorrectly/);
});

test("enemy artwork cannot open the browser image action menu", () => {
  assert.match(gameSource, /onContextMenu=\{\(event\) => event\.preventDefault\(\)\}/);
  assert.match(gameSource, /<img className="enemy-image"/);
  assert.match(gameSource, /src=\{enemyData\.src\}/);
  assert.match(gameSource, /draggable=\{false\}/);
  assert.match(gameSource, /fetchPriority="high"/);
  assert.match(cssSource, /\.enemy-image \{[^}]*pointer-events:\s*none/);
});

test("encounter header shows zone progress while enemy name and level sit below its feet", () => {
  assert.match(gameSource, /const currentZoneCompleted = !boss && game\.zone < game\.highestZone/);
  assert.match(gameSource, /const displayedZoneKills = currentZoneCompleted \? ENEMIES_PER_ZONE : Math\.min\(ENEMIES_PER_ZONE, game\.killsInZone \+ 1\)/);
  assert.match(gameSource, /`УРОВЕНЬ \$\{game\.zone\} · \$\{displayedZoneKills\}\/\$\{ENEMIES_PER_ZONE\}`/);
  assert.match(gameSource, /className="enemy-nameplate"><span>\{enemyName\}<\/span><b> — \{game\.zone\} ур\.<\/b>/);
  assert.match(cssSource, /\.enemy-nameplate \{[^}]*justify-self:\s*center[^}]*font:\s*700 22px\/1 "Roboto Condensed"/);
  assert.doesNotMatch(gameSource, /НАЖИМАЙ, ЧТОБЫ СТРЕЛЯТЬ/);
  assert.doesNotMatch(gameSource, /<span>\{boss \? "ИСПЫТАНИЕ СИЛЫ" : biome\.name\}<\/span>/);
});

test("enemy health card shows health only and formats the coin reward below it", () => {
  assert.match(gameSource, /className="health-copy"><strong>[\s\S]*?<\/strong><\/div>\s*<div className="health-track"[\s\S]*?<div className="enemy-reward"><span>Награда:<\/span> <b>\{testBossActive \? "тестовая цель" : `\$\{formatNumber\(getGoldRewardWithBonuses\(game, getEnemyGold\(game\.zone\)\)\)\} монет`\}<\/b>/);
  assert.doesNotMatch(gameSource, /className="health-copy"><span>\{enemyName\}<\/span>/);
  assert.match(cssSource, /\.enemy-reward \{[^}]*color:\s*#f4f1e9;[^}]*font:\s*700 16px\/1 "Roboto Condensed"/);
  assert.match(cssSource, /\.enemy-reward b \{[^}]*color:\s*#ffe27b/);
  assert.doesNotMatch(gameSource, /⚔ АВТО|⌁ УРОН ЗА КЛИК/);
});

test("normal enemies dissolve quickly while bosses receive a twelve-wave five-second jackpot fountain", () => {
  assert.match(gameSource, /const NORMAL_DEATH_STATE_MS = 320/);
  assert.match(gameSource, /const BOSS_VICTORY_FREEZE_MS = 6_000/);
  assert.match(gameSource, /const BOSS_JACKPOT_SOUND_MS = 5_000/);
  assert.match(gameSource, /const BOSS_COIN_FOUNTAIN_WAVES = 12/);
  assert.match(gameSource, /const BOSS_COIN_FOUNTAIN_SETTLE_MS = 1_400/);
  assert.match(gameSource, /BOSS_JACKPOT_SOUND_MS - BOSS_COIN_FOUNTAIN_SETTLE_MS/);
  assert.match(gameSource, /wave \* BOSS_COIN_WAVE_INTERVAL_MS/);
  assert.match(gameSource, /spawnLootCoins\("boss"\)/);
  assert.match(gameSource, /playBossCoinFountain\(\);[\s\S]*?showToast\(`\$\{dungeon\.name\} побеждён/);
  assert.match(gameSource, /ref=\{enemyTargetRef\}[\s\S]*?className=\{`dungeon-enemy-target/);
  assert.match(gameSource, /const DUNGEON_VICTORY_RETURN_MS = BOSS_JACKPOT_SOUND_MS \+ 3_000/);
  assert.match(gameSource, /latestAttempt\.status !== "won"/);
  assert.match(gameSource, /commitDungeon\(null\);[\s\S]*?setMapOpen\(false\);[\s\S]*?\}, DUNGEON_VICTORY_RETURN_MS\)/);
  assert.doesNotMatch(gameSource, /className="dungeon-result won"/);
  assert.match(cssSource, /\.dungeon-enemy-target\.won\.victory-celebration/);
  assert.match(gameSource, /beginEnemyDeath/);
  assert.match(gameSource, /boss-victory-freeze/);
  assert.match(gameSource, /PROJECTILE_BY_WEAPON\[shot\.weaponId\]/);
  assert.doesNotMatch(gameSource, /shot\.label/);
  assert.match(cssSource, /\.enemy-target\.boss-victory-freeze \.enemy-image/);
  assert.match(cssSource, /@keyframes enemy-dissolve/);
  assert.match(cssSource, /@keyframes projectile-flight/);
});

test("projectiles use the reduced sprite size and impacts appear at the cursor position", () => {
  assert.match(gameSource, /className=\{`impact-effect impact-\$\{number\.weaponId\}`\}/);
  assert.match(gameSource, /left: `\$\{number\.x\}%`/);
  assert.match(gameSource, /top: `\$\{number\.y\}%`/);
  assert.match(cssSource, /\.projectile \{[^}]*width:\s*clamp\(54px, 6vw, 82px\)/);
  assert.match(cssSource, /@keyframes impact-life/);
});

test("FTUE highlighting never places the enemy above a flying projectile", () => {
  assert.match(cssSource, /\.ftue-target \{[^}]*z-index:\s*80/);
  assert.doesNotMatch(cssSource, /\.ftue-target \{[^}]*(?:outline|filter):/);
  assert.match(cssSource, /\.projectile \{[^}]*z-index:\s*90/);
});

test("bottom navigation opens a weapon shop over combat without pausing automatic DPS", () => {
  assert.match(gameSource, /const \[shopOpen, setShopOpen\] = useState\(false\)/);
  assert.match(gameSource, /<strong>Магазин<\/strong>/);
  assert.match(gameSource, /className="shop-modal" role="dialog" aria-modal="true"/);
  assert.match(gameSource, /<ShopWeaponCards assetUrl=\{publicAssetUrl\}/);
  assert.match(gameSource, /Автоматический DPS продолжает работать, пока магазин открыт/);
  assert.doesNotMatch(gameSource, /platformPaused \|\| shopOpen/);
  assert.match(cssSource, /\.shop-backdrop \{[\s\S]*?position:\s*fixed;[^}]*z-index:\s*250;[^}]*inset:\s*0/);
  assert.match(cssSource, /\.shop-modal \{[^}]*width:\s*100%; height:\s*100%/);
});

test("combat strip marks the actual zone yellow and completed zones translucent green", () => {
  assert.doesNotMatch(gameSource, /className="enemy-aura"/);
  assert.doesNotMatch(cssSource, /\.enemy-aura/);
  assert.doesNotMatch(cssSource, /\.enemy-target:focus-visible/);
  assert.match(gameSource, /const completed = zone < game\.highestZone/);
  assert.match(gameSource, /completed \? "completed"/);
  assert.match(gameSource, /const current = zone === game\.zone/);
  assert.match(cssSource, /\.zone-track button\.completed \{[^}]*border-color:\s*#4d9c69[^}]*background:\s*linear-gradient/);
  assert.match(cssSource, /\.zone-track button\.current \{[^}]*border-color:\s*#ffe192[^}]*background:\s*linear-gradient/);
});

test("the newest unvisited zone pulses in the combat strip until selected", () => {
  assert.match(gameSource, /const visitedZonesRef = useRef<Set<number>>\(new Set\(\)\)/);
  assert.match(gameSource, /visitedZonesRef\.current\.add\(game\.zone\)/);
  assert.match(gameSource, /const newlyUnlocked = zone === game\.highestZone && !current && !visitedZonesRef\.current\.has\(zone\)/);
  assert.match(gameSource, /newlyUnlocked \? "new-zone"/);
  assert.match(gameSource, /newlyUnlocked \? "НОВЫЙ"/);
  assert.match(cssSource, /\.zone-track button\.new-zone \{[^}]*animation:\s*new-zone-glow/);
  assert.match(cssSource, /\.zone-track button\.new-zone::after \{[^}]*content:\s*"!"[^}]*animation:\s*new-zone-alert/);
  assert.match(cssSource, /@keyframes new-zone-alert \{[\s\S]*?font-size:\s*var\(--new-zone-alert-small-size\);[\s\S]*?to \{[^}]*font-size:\s*var\(--new-zone-alert-size\)/);
  assert.doesNotMatch(cssSource, /new-zone-(?:star|alert)[^}]*rotate/);
});

test("damage numbers are outlined, compact, single-line and use the shortened lifetime", () => {
  assert.match(gameSource, /const DAMAGE_NUMBER_LIFE_MS = 1_575/);
  assert.match(gameSource, /}, DAMAGE_NUMBER_LIFE_MS\)/);
  assert.match(gameSource, /number\.critical \? "КРИТ! " : ""/);
  assert.match(gameSource, /−\{formatNumber\(number\.amount\)\}/);
  assert.match(cssSource, /\.damage-number \{[\s\S]*?color:\s*#ff5b65;[^}]*white-space:\s*nowrap/);
  assert.match(cssSource, /\.damage-number\.critical \{[^}]*color:\s*#ffe84f;[^}]*font-size:\s*31px/);
  assert.match(cssSource, /-webkit-text-stroke:\s*1px #160204/);
  assert.match(cssSource, /animation:\s*damage-float 1\.575s/);
});

test("every weapon has a distinct impact effect", () => {
  for (const weaponId of ["gray_weapon", "purple_weapon", "blue_weapon", "void_weapon", "sun_weapon", "relic_weapon"]) {
    assert.match(cssSource, new RegExp(`\\.impact-${weaponId}`));
  }
  assert.match(gameSource, /weaponId: current\.selectedWeaponId/);
  assert.match(gameSource, /"--impact-color": number\.color/);
  assert.match(cssSource, /@keyframes plasma-core/);
  assert.match(cssSource, /@keyframes ice-shard/);
  assert.match(cssSource, /@keyframes magma-fragment/);
  assert.match(cssSource, /@keyframes electric-arc/);
  assert.match(cssSource, /@keyframes gel-splat/);
});

test("each projectile flies to the clicked point before damage and impact resolve", () => {
  assert.match(gameSource, /const PROJECTILE_TRAVEL_MS = 480/);
  assert.match(gameSource, /const targetX = \(event\.clientX - stageRect\.left\)/);
  assert.match(gameSource, /const targetY = \(event\.clientY - stageRect\.top\)/);
  assert.match(gameSource, /"--shot-target-x": `\$\{shot\.targetX\}%`/);
  assert.match(gameSource, /"--shot-target-y": `\$\{shot\.targetY\}%`/);
  assert.match(gameSource, /}, PROJECTILE_TRAVEL_MS\)/);
  assert.match(cssSource, /100% \{ left: var\(--shot-target-x\); top: var\(--shot-target-y\)/);
});
