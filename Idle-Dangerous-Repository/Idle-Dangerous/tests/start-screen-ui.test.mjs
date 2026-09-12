import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const gameSource = await readFile(new URL("../src/game/Game.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../src/styles/game.css", import.meta.url), "utf8");

test("a dedicated start screen pauses gameplay until the player enters", () => {
  assert.match(gameSource, /const \[gameStarted, setGameStarted\] = useState\(false\)/);
  assert.match(gameSource, /className="start-screen"/);
  assert.match(gameSource, /main-screen\.webp/);
  assert.match(gameSource, /new URL\(relativeUrl, window\.location\.href\)\.href/);
  assert.match(gameSource, /START_SCREEN_ART/);
  assert.match(gameSource, />НАЧАТЬ</);
  assert.doesNotMatch(gameSource, /id="start-title"/);
  assert.doesNotMatch(gameSource, /МАГ · ОЧИЩЕНИЕ МИРА/);
  assert.match(gameSource, /if \(!hydrated \|\| !gameStarted \|\| platformPaused \|\| !windowFocused\) return/);
  assert.match(gameSource, /const heartbeat = \(\) =>/);
  assert.match(cssSource, /\.start-screen \{[\s\S]*?align-items:\s*end[\s\S]*?var\(--start-background\) center \/ cover no-repeat/);
  assert.match(cssSource, /\.start-card \{/);
  assert.match(cssSource, /\.start-game-button \{/);
});

test("one-time FTUE points to combat, gold, leveling, and the next zone", () => {
  assert.match(gameSource, /const FTUE_STEP_MS = 5_000/);
  assert.match(gameSource, /if \(!gameStarted \|\| !ftueInteractionStarted\) return/);
  assert.match(gameSource, /if \(ftueStep === "enemy" && !ftueInteractionStarted\)/);
  assert.match(gameSource, /ftueStep === "enemy"[\s\S]*?\? "gold"/);
  assert.match(gameSource, /ftueStep === "gold"[\s\S]*?\? "auto-upgrade"/);
  assert.match(gameSource, /ftueStep === "auto-upgrade"[\s\S]*?\? "manual-upgrade"/);
  assert.match(gameSource, /ftueStep === "manual-upgrade"[\s\S]*?\? "await-zone"/);
  assert.match(gameSource, /game\.totalKills >= ftueZoneGoalKillsRef\.current/);
  assert.match(gameSource, /writeLocalStorage\(FTUE_STORAGE_KEY, "1"\)/);
  assert.match(gameSource, /Кликайте по врагу/);
  assert.match(gameSource, /Собирайте золото/);
  assert.match(gameSource, /Улучшай оружие автоматическое/);
  assert.match(gameSource, /Улучшай оружие ручное/);
  assert.match(gameSource, /Очищайте новый уровень/);
  assert.match(cssSource, /\.ftue-guide i \{[^}]*80px/);
  assert.match(cssSource, /\.ftue-guide strong \{[^}]*20px/);
  assert.match(cssSource, /@keyframes ftue-arrow-move/);
});

test("FTUE teaches automatic and manual weapon upgrades as separate five-second steps", () => {
  assert.match(gameSource, /const clickLevelButtonRef = useRef<HTMLButtonElement \| null>\(null\)/);
  assert.match(gameSource, /ref=\{clickLevelButtonRef\}/);
  assert.match(gameSource, /ftueStep === "manual-upgrade" \? "ftue-target"/);
  assert.match(gameSource, /ftueStep === "auto-upgrade" \|\| ftueStep === "manual-upgrade"/);
});

test("main upgrade prices use a static glinting coin while weapon ability slots retain state symbols", () => {
  assert.match(gameSource, /function CostCoin/);
  assert.match(gameSource, /purchased \? "✓" : levelReady \? "✦" : "◆"/);
  assert.match(gameSource, /className=\{`weapon-buy[\s\S]*?<CostCoin compact \/>/);
  assert.match(cssSource, /\.cost-coin \{[\s\S]*?width:\s*34px/);
  assert.match(cssSource, /\.cost-coin::after \{[^}]*animation:\s*cost-coin-glint/);
  assert.doesNotMatch(cssSource, /\.cost-coin[^}]*rotateY/);
});

test("campaign navigation is labeled as levels in the player interface", () => {
  assert.doesNotMatch(gameSource, /ТЕКУЩАЯ ЗОНА|ОТКРЫТО ЗОН|ПЕРЕЙТИ В ЗОНУ/);
  assert.match(gameSource, /ТЕКУЩИЙ УРОВЕНЬ/);
  assert.match(gameSource, /`УРОВЕНЬ \$\{game\.zone\}`/);
});

test("the arsenal uses a compact seventy-percent scale and a readable Cyrillic font", () => {
  assert.match(cssSource, /font-family: "Roboto Condensed", sans-serif/);
  assert.doesNotMatch(cssSource, /\b(?:Oswald|Inter|Georgia)\b/);
  assert.match(cssSource, /\.clicker-layout \{[\s\S]*?grid-template-columns: minmax\(392px, 434px\)/);
  assert.match(cssSource, /\.click-upgrade-card \{[\s\S]*?min-height:\s*127px/);
  assert.match(cssSource, /\.weapon-title strong \{[^}]*17px/);
  assert.match(cssSource, /\.weapon-copy > small \{[^}]*font-size: 11px/);
  assert.match(cssSource, /\.weapon-buy strong \{[^}]*14px/);
  assert.match(cssSource, /\.weapon-upgrade-slot \{[\s\S]*?width: 32px; height: 32px/);
  assert.match(cssSource, /\.weapon-upgrade-tooltip \{[\s\S]*?position: fixed;[\s\S]*?width: 196px;[\s\S]*?padding: 8px 9px/);
  assert.match(cssSource, /\.weapon-unlock-tooltip \{[\s\S]*?position: fixed;[\s\S]*?min-width: 252px;[\s\S]*?padding: 11px 13px/);
});

test("a locked upgrade requirement keeps pulsing until its level is reached", () => {
  assert.match(cssSource, /\.weapon-upgrade-tooltip > \.upgrade-requirement\.unmet \{[^}]*animation: locked-requirement-pulse 1\.25s ease-in-out infinite/);
  assert.match(cssSource, /\.weapon-upgrade-tooltip > \.upgrade-requirement\.pulse \{ animation: locked-requirement-alert \.5s ease-in-out/);
  assert.match(cssSource, /@keyframes locked-requirement-pulse/);
  assert.match(cssSource, /@keyframes locked-requirement-alert/);
});

test("the click damage block makes room for a global sound toggle", () => {
  assert.match(gameSource, /className=\{`sound-toggle/);
  assert.match(gameSource, /aria-label=\{soundEnabled \? "Отключить звуки" : "Включить звуки"\}/);
  assert.match(gameSource, /setRunning\(next && gameStarted && !document.hidden && document.hasFocus\(\) && !platformPaused\)/);
  assert.match(cssSource, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\) 82px/);
  assert.match(cssSource, /\.sound-toggle\.muted/);
});

test("settings opens a centered volume dialog with a separate progress reset", () => {
  assert.match(gameSource, /readAudioVolume\("music"\)/);
  assert.match(gameSource, /readAudioVolume\("effects"\)/);
  assert.match(gameSource, /className="settings-button" onClick=\{\(\) => \{ hideAbilityTooltip\(\); setShopOpen\(false\); setSettingsOpen\(true\); \}\}/);
  assert.match(gameSource, /className="settings-modal" role="dialog" aria-modal="true"/);
  assert.match(gameSource, /ГРОМКОСТЬ МУЗЫКИ/);
  assert.match(gameSource, /ГРОМКОСТЬ ЭФФЕКТОВ/);
  assert.match(gameSource, /type="range"/);
  assert.match(gameSource, /value=\{Math\.round\(effectsVolume \* 100\)\}/);
  assert.match(gameSource, /className="settings-reset-progress" onClick=\{resetGame\}/);
  assert.match(gameSource, /СБРОСИТЬ ПРОГРЕСС/);
  assert.match(gameSource, /AUDIO_VOLUME_KEYS/);
  assert.match(gameSource, /setGameStarted\(false\)/);
  assert.match(cssSource, /\.system-nav \.settings-button \{/);
  assert.match(cssSource, /\.settings-backdrop \{[\s\S]*?place-items:\s*center/);
  assert.match(cssSource, /\.settings-modal \{[\s\S]*?width:\s*min\(420px/);
  assert.match(cssSource, /#3abaff/);
});

test("double DPS uses a two-second test banner and explicit activation", () => {
  assert.match(gameSource, /className="rewarded-ad-banner"/);
  assert.match(gameSource, /ТЕСТОВЫЙ РЕКЛАМНЫЙ БАННЕР/);
  assert.match(gameSource, />АКТИВИРОВАТЬ ×2 DPS</);
  assert.match(gameSource, /createSuperclickActivation\(Date\.now\(\)\)/);
  assert.match(gameSource, /boostActive \? `×2 · \$\{formatDuration\(boostRemaining\)\}`/);
  assert.match(cssSource, /\.ability-button\.active \{[^}]*#76e878/);
  assert.match(cssSource, /\.rewarded-ad-activate \{[^}]*#76e878/);
});

test("settings exposes a persistent test progress cartridge", () => {
  assert.match(gameSource, /gameServices\.testProgress\.save\(snapshot\)/);
  assert.match(gameSource, /gameServices\.testProgress\.load<unknown>\(\)/);
  assert.match(gameSource, /СОХРАНИТЬ ПРОГРЕСС/);
  assert.match(gameSource, /ЗАГРУЗИТЬ ПРОГРЕСС/);
  assert.match(gameSource, /disabled=\{!testProgressInfo\}/);
  assert.match(gameSource, /Обычный сброс его не удаляет/);
  assert.match(gameSource, /await gameServices\.saves\.save\(restored\)/);
  assert.match(cssSource, /\.settings-test-progress-actions \{[^}]*grid-template-columns:\s*1fr 1fr/);
});

test("rewarded ad windows warn before closing without a reward", () => {
  assert.equal((gameSource.match(/className="rewarded-ad-close"/g) ?? []).length, 2);
  assert.match(gameSource, /Если закрыть окно раньше времени, награда не будет получена/);
  assert.match(gameSource, /ПРОДОЛЖИТЬ ПРОСМОТР/);
  assert.match(gameSource, /ЗАКРЫТЬ БЕЗ НАГРАДЫ/);
  assert.match(gameSource, /setAbilityAd\(null\)/);
  assert.match(gameSource, /leaveExpiredBoss\(\)/);
  assert.match(cssSource, /\.rewarded-ad-close \{[^}]*top: 8px; right: 8px/);
  assert.match(cssSource, /\.rewarded-ad-close-warning \{/);
});

test("the ability dock reserves ten slots for active and passive weapon abilities", () => {
  assert.match(gameSource, /const ABILITY_DOCK_SLOT_COUNT = 10/);
  assert.match(gameSource, /const WEAPON_LEVEL_150_ABILITIES/);
  assert.match(gameSource, /kind: "active"/);
  assert.match(gameSource, /kind: "passive"/);
  assert.match(gameSource, /lockedAbilitySlotCount = Math\.max\(0, ABILITY_DOCK_SLOT_COUNT - 1 - unlockedWeaponAbilities\.length - \(manualCriticalUnlocked \? 1 : 0\)\)/);
  assert.match(gameSource, /Array\.from\(\{ length: lockedAbilitySlotCount \}/);
  assert.match(gameSource, /aria-label="Умение закрыто"/);
  assert.match(gameSource, /<b aria-hidden="true">🔒<\/b>/);
  assert.match(gameSource, /className={`ability-button passive-ability/);
  assert.match(cssSource, /grid-template-rows:\s*repeat\(10, minmax\(0, 1fr\)\)/);
});

test("the Crystal Rifle level 150 purchase replaces one lock with Ice Rain", () => {
  assert.match(gameSource, /isIceRainUnlocked\(game\.weapons\.blue_weapon\.purchasedUpgradeIds\)/);
  assert.match(gameSource, /className=\{`ability-button ice-rain-ability/);
  assert.match(gameSource, /<span className="ice-rain-icon"[^>]*><AbilityIcon name="ice-rain" \/><\/span>/);
  assert.match(gameSource, /activateIceRain/);
  assert.match(gameSource, /now - lastIceRainShotAtRef\.current >= ICE_RAIN_INTERVAL_MS/);
  assert.match(gameSource, /amount = getGlobalClickDamage\(latestGame\)/);
  assert.match(gameSource, /PROJECTILE_BY_WEAPON\.blue_weapon/);
  assert.match(cssSource, /@keyframes ice-rain-fall/);
  assert.match(cssSource, /animation:\s*ice-rain-fall \.24s linear forwards/);
});

test("a level 150 ability reveal waits 1.5 seconds and then flies into its dock slot", () => {
  assert.match(gameSource, /const ABILITY_UNLOCK_HOLD_MS = 1_500/);
  assert.match(gameSource, /const ABILITY_UNLOCK_FLIGHT_MS = 520/);
  assert.match(gameSource, /presentWeaponAbilityUnlock\(weaponId\)/);
  assert.match(gameSource, /querySelector<HTMLElement>\(`\[data-weapon-ability=/);
  assert.match(gameSource, /phase: "flying", flightX, flightY/);
  assert.match(gameSource, /className={`weapon-ability-unlock \$\{abilityUnlockPresentation\.phase\}`}/);
  assert.match(gameSource, /ОТКРЫТО НОВОЕ УМЕНИЕ/);
  assert.match(cssSource, /\.weapon-ability-unlock\.flying \{[^}]*scale\(\.14\);[^}]*transition: transform \.52s/);
});

test("ability cells expose active or passive information on hover and touch", () => {
  assert.match(gameSource, /type AbilityTooltipState/);
  assert.match(gameSource, /onShowTooltip\(event\.currentTarget, "double_dps", false\)/);
  assert.match(gameSource, /event\.pointerType !== "mouse"/);
  assert.match(gameSource, /АКТИВНОЕ УМЕНИЕ/);
  assert.match(gameSource, /ПАССИВНОЕ УМЕНИЕ/);
  assert.match(gameSource, /className="ability-tooltip-timer"/);
  assert.match(gameSource, /timerValue = iceRainActive \? iceRainRemaining : iceRainCooldown/);
  assert.match(cssSource, /\.ability-tooltip \{/);
});
