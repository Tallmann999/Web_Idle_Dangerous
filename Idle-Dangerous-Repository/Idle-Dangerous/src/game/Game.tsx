import { GameAudio, AUDIO_VOLUME_KEYS, readAudioVolume } from "./audio";
import { getAfkDamage } from "./afkDamage";
import { CSSProperties, MouseEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { REGION_MAP_ART, MAP_STATE_COLORS, getMapRegionState } from "./worldMap";
import { WOLF_IMPACT_LIFE_MS, nextWolfImpactDelay, getOpaqueBodyPoints, type BodyPoint } from "./wolfImpact";
import { ShopWeaponCards } from "./ShopWeaponCards";
import { REGION_LAYOUTS, mapPoint } from "./regionLayouts";
import { MapComingSoonPoints } from "./MapComingSoonPoints";
import { platformBridge } from "../platform/bridge";
import { platformConfig } from "../platform/config";
import { gameServices } from "../platform/services";
import {
  BOSS_TIME_LIMIT_SEC, ENEMIES_PER_ZONE, WEAPONS, WEAPON_LEVEL_CAP, WEAPON_ORDER, WEAPON_SPECIALIZATION_LEVEL,
  MANUAL_CRIT_COOLDOWN_SEC, MANUAL_CRIT_DURATION_SEC, MANUAL_UPGRADES, activateManualCritical, buyClickLevel,
  advanceAfkCombat, buyManualUpgrade, buyWeaponOrLevels, buyWeaponUpgrade, damageEnemy, defeatCurrentEnemy, enterZone, failBoss,
  getClickLevelCost, getEnemyGold, getGoldRewardWithBonuses, getGlobalClickDamage,
  getTotalArsenalDps, getWeaponDps, getWeaponLevelQuote, isBossZone, normalizeGameState, resolveManualAttack,
  createInitialGameState, type BulkAmount, type GameStateV3, type WeaponId,
} from "./clickerV3";
import {
  DUNGEON_CHALLENGES, DUNGEON_COOLDOWN_SEC, DUNGEON_TIME_LIMIT_SEC, advanceDungeon, createDungeonAttempt,
  damageDungeon, getDungeonDefinition, isDungeonUnlocked, type DungeonAttempt, type DungeonId,
} from "./dungeonChallenges";
import {
  SUPERCLICK_AD_DURATION_SEC, SUPERCLICK_COOLDOWN_SEC, SUPERCLICK_DURATION_SEC,
  createSuperclickActivation,
} from "./superclickAbility";
import {
  BOSS_BOOST_DURATION_SEC, TEST_REWARDED_AD_DURATION_MS, getBossBoostDamageMultiplier,
} from "./bossFlow";
import {
  ICE_RAIN_COOLDOWN_SEC, ICE_RAIN_DURATION_SEC, ICE_RAIN_INTERVAL_MS, ICE_RAIN_PROJECTILE_TRAVEL_MS, ICE_RAIN_PROJECTILES_PER_VOLLEY,
  canActivateIceRain, createIceRainActivation, isIceRainUnlocked,
} from "./iceRainAbility";
import { COMBAT_ABILITIES, activateCombatAbility, consumeCombatAbilityHits, type CombatAbilityId, type CombatAbilityTimers } from "./combatAbilities";
import { BOSS_NAMES, CAMPAIGN_BOSS_ORDER } from "./bossRoster";
import {
  VFX_BUDGETS, readGraphicsQuality, resolveGraphicsQuality, writeGraphicsQuality,
  type GraphicsQuality,
} from "./performance";
import { LocalizationBoundary, readGameLanguage, writeGameLanguage, type GameLanguage } from "./localization";
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from "../../Modules/storage/safeLocalStorage";

type EnemyData = { id: string; name: string; src: string };
type DamageNumber = { id: number; slot: number; amount: number; x: number; y: number; weaponId: WeaponId; color: string; critical?: boolean; doubleDamage?: boolean; ability?: CombatAbilityId };
type Shot = {
  id: number;
  slot: number;
  color: string;
  weaponId: WeaponId;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  angle: number;
};
type Toast = { id: number; text: string; tone: "gold" | "danger" | "info" };
type AbilityAdState = { readyAt: number; sdkFinished: boolean };
type BossRewardAdState = { zone: number; started: boolean; readyAt: number; sdkFinished: boolean; sdkFailed: boolean };
type RewardedAdCloseTarget = "ability" | "boss";
type IceRainShot = { id: number; slot: number; startX: number; targetX: number; targetY: number; angle: number };
type AbilityStrike = { id: number; kind: CombatAbilityId; startX: number; startY: number; targetX: number; targetY: number; impactX: number; impactY: number; delayMs: number; angle?: number };
type AbilityImpact = { id: number; weaponId: WeaponId; color: string; x: number; y: number };
type UpgradeTooltipState = { weaponId: WeaponId; upgradeId: string; left: number; top: number };
type ManualUpgradeTooltipState = { upgradeId: string; left: number; top: number };
type WeaponUnlockTooltipState = { weaponId: WeaponId; left: number; top: number };
type AbilityTooltipId = "double_dps" | "manual_crit" | WeaponId;
type AbilityTooltipState = { abilityId: AbilityTooltipId; left: number; top: number; placement: "side" | "above" };
type MapBossInfoState = { kind: "campaign"; zone: number } | { kind: "dungeon"; dungeonId: DungeonId };
type NewDungeonGuideState = { dungeonId: DungeonId };
type TestProgressInfo = { savedAt: string; zone: number; highestZone: number };
type WeaponLevelPulse = { weaponId: WeaponId; tick: number };
type WeaponAbilityKind = "active" | "passive";
type WeaponAbilityDefinition = {
  weaponId: WeaponId;
  upgradeId: string;
  name: string;
  icon: string;
  kind: WeaponAbilityKind;
  description: string;
};
type AbilityUnlockPresentation = {
  ability: WeaponAbilityDefinition;
  phase: "showing" | "flying";
  flightX: number;
  flightY: number;
};
type FtueStep = "idle" | "enemy" | "gold" | "auto-upgrade" | "manual-upgrade" | "await-zone" | "next-zone" | "done";
type FtueGuidePosition = { left: number; top: number; direction: "up" | "right" | "left" };
type LootCoin = {
  id: number;
  slot: number;
  phase: "falling" | "resting" | "collecting";
  startX: number;
  startY: number;
  landX: number;
  landY: number;
  collectStartX: number;
  collectStartY: number;
  targetX: number;
  targetY: number;
  arcHeight: number;
  delayMs: number;
  fallMs: number;
  groundLifetimeMs: number;
  spinDelayMs: number;
  scale: number;
};

const PUBLIC_ASSET_VERSION = "2026-09-05-abilities-bosses";
const MAX_DUNGEON_GUIDE_SHOWS = 2;

function publicAssetUrl(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  const relativeUrl = `${import.meta.env.BASE_URL}${path}${separator}v=${PUBLIC_ASSET_VERSION}`;
  if (typeof window === "undefined") return relativeUrl;
  return new URL(relativeUrl, window.location.href).href;
}

const imagePreloadCache = new Map<string, Promise<void>>();

function preloadImage(url: string): Promise<void> {
  if (typeof Image === "undefined") return Promise.resolve();
  const cached = imagePreloadCache.get(url);
  if (cached) return cached;

  const pending = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (typeof image.decode !== "function") {
        resolve();
        return;
      }
      void image.decode().catch(() => undefined).then(() => resolve());
    };
    image.onerror = () => reject(new Error(`Unable to preload image: ${url}`));
    image.src = url;
    if (image.complete && image.naturalWidth > 0) resolve();
  }).catch((error) => {
    imagePreloadCache.delete(url);
    throw error;
  });

  imagePreloadCache.set(url, pending);
  return pending;
}

function artEnemy(group: "tier1" | "tier2" | "boss", number: number, name: string): EnemyData {
  const id = `${group}-${String(number).padStart(2, "0")}`;
  const folder = group === "boss" ? "bosses" : "enemies";
  return { id, name, src: publicAssetUrl(`art/${folder}/${id}.webp`) };
}

type RegionEnemyEntry = readonly [number: number, name: string];

const REGION_ENEMY_ROSTERS: readonly (readonly RegionEnemyEntry[])[] = [
  [
    [1, "Шиполистый налётчик"], [2, "Терновый потрошитель"], [3, "Споровый пророк"],
    [5, "Корнекоготь"], [6, "Жабий копейщик"], [8, "Болотный громила"],
    [9, "Грибной часовой"], [11, "Паутинный жрец"], [12, "Мшистый древень"],
    [15, "Серый лунозверь"], [16, "Клыкастый ловчий"], [17, "Хранительница чащи"],
    [19, "Моховой исполин"], [21, "Багряный мухомор"], [24, "Костяной пауколаз"],
    [31, "Вороний оракул"],
  ],
  [
    [7, "Седогривый рубака"], [8, "Костеклыкий вепрь"], [9, "Чернокрылый дозорный"],
    [10, "Крысолов пустошей"], [11, "Камышовый жабр"], [12, "Рогатый тотемщик"],
    [19, "Степной гиенар"], [20, "Красночешуйчатый резак"], [21, "Ночной ушан"],
    [22, "Вороний костевед"], [23, "Бараний громила"], [24, "Панцирный болотник"],
  ],
  [
    [7, "Белошкурый крушитель"], [8, "Кристальный медвежрец"], [9, "Снежная рысь-охотница"],
    [10, "Ледокоготь"], [11, "Дух синей метели"], [12, "Осколочный берсерк"],
    [19, "Лютый ледовед"], [20, "Резчик снегов"], [21, "Полярный фантом"],
    [22, "Морозный лич"], [23, "Кристальный титан"], [24, "Клыкастый владыка"],
  ],
  [
    [1, "Гранитный ледолом"], [2, "Кристальный шаман"], [3, "Зеркальный бастион"],
    [4, "Снеговик-людоед"], [10, "Хрустальный паук"], [11, "Ледяная пряха"],
    [12, "Матка белых пещер"], [13, "Полярный костолом"], [14, "Пятнистый морозник"],
    [15, "Странник инея"], [17, "Ледяной колосс"], [18, "Плакальщица вьюги"],
    [20, "Белогривый оборотень"], [21, "Сова ледяных копий"], [24, "Рогатый ледозверь"],
    [26, "Призрачный олень"],
  ],
  [
    [1, "Споровый гоблин"], [2, "Око гнилого корня"], [5, "Чумная крыса"],
    [6, "Порченый голем"], [7, "Багряная паучиха"], [8, "Многоногий пожиратель"],
    [9, "Кровавый древень"], [10, "Дух алой скверны"], [11, "Гнойный студень"],
    [19, "Пузырчатый паук"], [20, "Дупляной душегуб"], [21, "Гнилокрыс"],
    [26, "Живая язва"], [28, "Моровой камнелом"], [31, "Шёпот разложения"],
    [32, "Костяной древесник"],
  ],
  [
    [9, "Магмовый громила"], [10, "Обсидиановая виверна"], [11, "Танцовщица пламени"],
    [12, "Дымный провидец"], [13, "Огнегривый ящер"], [14, "Лавовый волколак"],
    [15, "Цепной инфернал"], [16, "Панцирь вулкана"], [17, "Око базальта"],
    [19, "Пламенный разрушитель"], [20, "Дух жерла"], [21, "Владыка раскола"],
    [28, "Адская гончая"], [29, "Рогатый огневед"], [30, "Пепельный вепрь"],
    [32, "Хранитель часа пепла"],
  ],
];

function artRegionEnemy(regionId: number, number: number, name: string): EnemyData {
  const paddedNumber = String(number).padStart(2, "0");
  return {
    id: `region-${regionId}-${paddedNumber}`,
    name,
    src: publicAssetUrl(`art/enemies/region-${regionId}-${paddedNumber}.webp`),
  };
}

const REGION_ENEMIES: readonly (readonly EnemyData[])[] = REGION_ENEMY_ROSTERS.map((roster, regionIndex) =>
  roster.map(([number, name]) => artRegionEnemy(regionIndex + 1, number, name)),
);

const BOSS_ENEMIES: readonly EnemyData[] = [
  ...BOSS_NAMES.map((name, index) => artEnemy("boss", index + 1, name)),
];

const TEST_BOSS_ZONE = 5;
const TEST_BOSS_HP = 1_000_000_000_000_000;
const TEST_BOSS_TIME_LIMIT_SEC = 15;
const TEST_BOSS_ENEMY: EnemyData = { ...BOSS_ENEMIES[17], id: "test-boss", name: "TestBoss" };

const START_SCREEN_ART = publicAssetUrl("art/backgrounds/main-screen.webp");
const WORLD_MAP_ART = publicAssetUrl("art/maps/world.webp");
const REGION_ARENA_BACKGROUNDS: readonly string[] = Array.from({ length: 6 }, (_, index) =>
  publicAssetUrl(`art/backgrounds/zone-${String(index + 1).padStart(2, "0")}.webp`),
);
const BULK_AMOUNTS: readonly BulkAmount[] = [1, 10, 25, 100, "max"];
const NORMAL_DEATH_STATE_MS = 320;
const BOSS_VICTORY_FREEZE_MS = 6_000;
const BOSS_JACKPOT_SOUND_MS = 5_000;
const BOSS_COIN_FOUNTAIN_WAVES = 12;
const BOSS_COIN_FOUNTAIN_SETTLE_MS = 1_400;
const BOSS_COIN_WAVE_INTERVAL_MS = (BOSS_JACKPOT_SOUND_MS - BOSS_COIN_FOUNTAIN_SETTLE_MS) / (BOSS_COIN_FOUNTAIN_WAVES - 1);
const BOSS_COIN_GROUND_LIFETIME_MS = 2_000;
const BOSS_COIN_VISIBLE_LIMIT = BOSS_COIN_FOUNTAIN_WAVES * 6;
const DUNGEON_VICTORY_RETURN_MS = BOSS_JACKPOT_SOUND_MS + 3_000;
const NEW_DUNGEON_GUIDE_MS = 6_000;
const MIN_ENEMY_VISIBLE_MS = 450;
const PROJECTILE_TRAVEL_MS = 480;
const DAMAGE_NUMBER_LIFE_MS = 1_575;
const COIN_GROUND_LIFETIME_MS = 3_000;
const COIN_COLLECT_FLIGHT_MS = 620;
const COIN_COLLECT_FALLBACK_MS = COIN_COLLECT_FLIGHT_MS + 280;
const COIN_ART = publicAssetUrl("art/effects/coin.webp");

const FTUE_STEP_MS = 5_000;
const WEAPON_LEVEL_PULSE_MS = 500;
const ABILITY_UNLOCK_HOLD_MS = 1_500;
const ABILITY_UNLOCK_FLIGHT_MS = 520;
const ABILITY_DOCK_SLOT_COUNT = 10;
const FTUE_STORAGE_KEY = "clicker-weapon-adventure-ftue-shown";
const MOBILE_PERFORMANCE_MODE = typeof window !== "undefined" && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
const CLOCK_TICK_MS = 200;
const COMBAT_TICK_MS = MOBILE_PERFORMANCE_MODE ? 180 : 100;
const AUTOSAVE_INTERVAL_MS = 15_000;

function CostCoin({ compact = false }: { compact?: boolean }) {
  return <i
    className={`cost-coin ${compact ? "compact" : ""}`}
    style={{ backgroundImage: `url(${COIN_ART})` }}
    aria-hidden="true"
  />;
}

const PROJECTILE_BY_WEAPON: Record<WeaponId, string> = {
  gray_weapon: publicAssetUrl("art/projectiles/gray.webp"),
  purple_weapon: publicAssetUrl("art/projectiles/purple.webp"),
  blue_weapon: publicAssetUrl("art/projectiles/blue.webp"),
  void_weapon: publicAssetUrl("art/projectiles/void.webp"),
  sun_weapon: publicAssetUrl("art/projectiles/sun.webp"),
  relic_weapon: publicAssetUrl("art/projectiles/relic.webp"),
};

const ABYSS_EYE_POSITIONS = [
  { x: 8, y: 18 }, { x: 30, y: 8 }, { x: 52, y: 6 }, { x: 74, y: 9 }, { x: 92, y: 22 },
  { x: 94, y: 67 }, { x: 77, y: 88 }, { x: 50, y: 92 }, { x: 24, y: 87 }, { x: 6, y: 64 },
] as const;

const WEAPON_ART_BY_WEAPON: Record<WeaponId, string> = {
  gray_weapon: publicAssetUrl("art/weapons/gray.webp"),
  purple_weapon: publicAssetUrl("art/weapons/purple.webp"),
  blue_weapon: publicAssetUrl("art/weapons/blue.webp"),
  void_weapon: publicAssetUrl("art/weapons/void.webp"),
  sun_weapon: publicAssetUrl("art/weapons/sun.webp"),
  relic_weapon: publicAssetUrl("art/weapons/relic.webp"),
};

const WEAPON_LEVEL_150_ABILITIES: readonly WeaponAbilityDefinition[] = [
  { weaponId: "gray_weapon", upgradeId: "gray_150", name: "Ловкость", icon: "agility", kind: "passive", description: "+10% к DPS Серого импульсника за каждый уровень после 150-го. Бонусы складываются." },
  { weaponId: "purple_weapon", upgradeId: "purple_150", name: "Скорость", icon: "speed", kind: "passive", description: "+1% к скорости автоматических атак жезла за каждый уровень после 150-го. Увеличивает DPS этого оружия." },
  { weaponId: "blue_weapon", upgradeId: "blue_150", name: "Ледяной дождь", icon: "ice-rain", kind: "active", description: "15 секунд выпускает 5–6 залпов в секунду, по 3 ледяных снаряда в каждом. Перезарядка 10 минут." },
  { weaponId: "void_weapon", upgradeId: "void_150", name: "Бездна", icon: "abyss", kind: "active", description: "10 глаз атакуют со всех сторон 12 секунд. Каждый стреляет 4 раза в секунду с уроном ×1 общего DPS за попадание. Перезарядка 10 минут." },
  { weaponId: "sun_weapon", upgradeId: "sun_150", name: "Мешок золота", icon: "gold-bag", kind: "passive", description: "+30% золота за победу над любым монстром, включая боссов и данжи." },
  { weaponId: "relic_weapon", upgradeId: "relic_150", name: "Призыв волка", icon: "wolf-summon", kind: "active", description: "Волк атакует 20 секунд: 5 ударов в секунду, каждый с уроном ×2 общего DPS. Перезарядка 3 минуты." },
] as const;

function AbilityIcon({ name }: { name: string }) {
  return <img className="ability-art" src={publicAssetUrl(`art/abilities/${name}.webp`)} alt="" draggable={false} decoding="async" />;
}

function LanguageModal({ language, onSelect, onClose }: {
  language: GameLanguage;
  onSelect: (language: GameLanguage) => void;
  onClose: () => void;
}) {
  const options: readonly { id: GameLanguage; name: string; detail: string }[] = [
    { id: "en", name: "English", detail: "English" },
    { id: "ru", name: "Русский", detail: "Russian" },
  ];
  return <div className="language-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="language-modal" role="dialog" aria-modal="true" aria-labelledby="language-title">
      <header className="settings-modal-header">
        <div><small>ЯЗЫКИ</small><h2 id="language-title">ВЫБЕРИТЕ ЯЗЫК</h2></div>
        <button type="button" className="settings-close" onClick={onClose} aria-label="Закрыть выбор языка">×</button>
      </header>
      <div className="language-list" data-no-localize>
        {options.map((option) => <button
          type="button"
          key={option.id}
          className={language === option.id ? "active" : ""}
          aria-pressed={language === option.id}
          onClick={() => onSelect(option.id)}
        >
          <img src={publicAssetUrl(`art/flags/${option.id}.svg`)} alt="" />
          <span><strong>{option.name}</strong><small>{option.detail}</small></span>
          <b aria-hidden="true">{language === option.id ? "✓" : ""}</b>
        </button>)}
      </div>
      <small className="language-future-note">Интерфейс готов для добавления новых языков.</small>
    </section>
  </div>;
}

function getWeaponAbility(weaponId: WeaponId): WeaponAbilityDefinition {
  return WEAPON_LEVEL_150_ABILITIES.find((ability) => ability.weaponId === weaponId)!;
}

type WeaponRosterPanelProps = {
  gold: number;
  clickLevel: number;
  clickPurchasedUpgradeIds: readonly string[];
  bulkAmount: BulkAmount;
  highestZone: number;
  selectedWeaponId: WeaponId;
  weapons: GameStateV3["weapons"];
  clickDamage: number;
  ftueStep: FtueStep;
  weaponLevelPulse: WeaponLevelPulse | null;
  clickLevelButtonRef: { current: HTMLButtonElement | null };
  weaponLevelButtonRef: { current: HTMLButtonElement | null };
  onPurchaseClickLevel: () => void;
  onPurchaseManualUpgrade: (upgradeId: string) => void;
  onSetBulkAmount: (amount: BulkAmount) => void;
  onSelectWeapon: (weaponId: WeaponId) => void;
  onPurchaseWeapon: (weaponId: WeaponId) => void;
  onPurchaseUpgrade: (weaponId: WeaponId, upgradeId: string) => void;
  onPulseLockedUpgrade: (upgradeId: string) => void;
  onShowUpgradeTooltip: (anchor: HTMLButtonElement, weaponId: WeaponId, upgradeId: string) => void;
  onShowManualUpgradeTooltip: (anchor: HTMLButtonElement, upgradeId: string) => void;
  onShowWeaponUnlockTooltip: (anchor: HTMLElement, weaponId: WeaponId) => void;
  onHideTooltips: () => void;
};

const WeaponRosterPanel = memo(function WeaponRosterPanel(props: WeaponRosterPanelProps) {
  const {
    gold, clickLevel, clickPurchasedUpgradeIds, bulkAmount, highestZone, selectedWeaponId, weapons, clickDamage, ftueStep, weaponLevelPulse,
    clickLevelButtonRef, weaponLevelButtonRef, onPurchaseClickLevel, onPurchaseManualUpgrade, onSetBulkAmount, onSelectWeapon,
    onPurchaseWeapon, onPurchaseUpgrade, onPulseLockedUpgrade, onShowUpgradeTooltip,
    onShowManualUpgradeTooltip, onShowWeaponUnlockTooltip, onHideTooltips,
  } = props;
  return <aside className="weapon-roster-panel" aria-label="Оружие">
    <section className="click-upgrade-card">
      <div className="click-upgrade-copy"><span>РУЧНАЯ МАГИЯ</span><small>Урон любого визуального оружия: {formatNumber(clickDamage)}</small></div>
      <strong className="click-upgrade-level">Уровень {clickLevel}</strong>
      <button ref={clickLevelButtonRef} className={`click-level-buy ${ftueStep === "manual-upgrade" ? "ftue-target" : ""}`} disabled={gold < getClickLevelCost(clickLevel)} onClick={onPurchaseClickLevel}><CostCoin compact /><span>{formatNumber(getClickLevelCost(clickLevel))}</span></button>
      <div className="manual-upgrade-slots" aria-label="Улучшения ручного оружия">
        {MANUAL_UPGRADES.map((item) => {
          const purchased = clickPurchasedUpgradeIds.includes(item.id);
          const levelReady = clickLevel >= item.threshold;
          const canBuy = !purchased && levelReady && gold >= item.cost;
          const status = purchased ? "purchased" : levelReady ? "available" : "locked";
          return <button
            type="button"
            key={item.id}
            className={`weapon-upgrade-slot manual-upgrade-slot ${status} ${canBuy ? "affordable" : ""}`}
            aria-disabled={!canBuy}
            aria-label={`${item.name}, уровень ${item.threshold}${purchased ? ", активно" : levelReady ? ", доступно для покупки" : ", закрыто"}`}
            onMouseEnter={(event) => onShowManualUpgradeTooltip(event.currentTarget, item.id)}
            onMouseLeave={onHideTooltips}
            onFocus={(event) => onShowManualUpgradeTooltip(event.currentTarget, item.id)}
            onBlur={onHideTooltips}
            onClick={() => { if (!purchased && !levelReady) onPulseLockedUpgrade(item.id); else if (canBuy) onPurchaseManualUpgrade(item.id); }}
          ><span>{item.threshold === 150 ? <AbilityIcon name={item.icon} /> : purchased ? "✓" : levelReady ? "✦" : "◆"}</span><small>{item.threshold}</small></button>;
        })}
      </div>
    </section>

    <nav className="bulk-selector" aria-label="Количество покупаемых уровней">
      <span>КУПИТЬ:</span>
      {BULK_AMOUNTS.map((amount) => <button key={String(amount)} className={bulkAmount === amount ? "active" : ""} onClick={() => onSetBulkAmount(amount)}>{amount === "max" ? "MAX" : `×${amount}`}</button>)}
    </nav>

    <div className="weapon-roster" onScroll={onHideTooltips}>
      {WEAPON_ORDER.map((weaponId) => {
        const weapon = WEAPONS[weaponId];
        const state = weapons[weaponId];
        const dps = getWeaponDps(weaponId, state);
        const quote = getWeaponLevelQuote(weaponId, state, gold, bulkAmount);
        const selected = selectedWeaponId === weaponId;
        const zoneReady = highestZone >= weapon.unlockZone;
        const affordable = state.owned ? quote.levels > 0 && gold >= quote.cost : zoneReady && gold >= weapon.purchaseCost;
        return <article
          key={weaponId}
          className={`weapon-card ${state.owned ? "owned" : "unowned"} ${selected ? "selected" : ""}`}
          style={{ "--card-color": weapon.color } as CSSProperties}
          onMouseEnter={(event) => { if (!state.owned) onShowWeaponUnlockTooltip(event.currentTarget, weaponId); }}
          onMouseLeave={onHideTooltips}
          onFocus={(event) => { if (!state.owned) onShowWeaponUnlockTooltip(event.currentTarget, weaponId); }}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onHideTooltips(); }}
        >
          <button className="weapon-visual-select" disabled={!state.owned} onClick={() => onSelectWeapon(weaponId)} aria-label={`Выбрать визуал: ${weapon.name}`}>
            <span className="weapon-art" style={{ "--weapon-image": `url(${WEAPON_ART_BY_WEAPON[weaponId]})` } as CSSProperties} aria-hidden="true" />
            <span className="visual-chip">{selected ? "ВИЗУАЛ АКТИВЕН" : state.owned ? "ВЫБРАТЬ ВИЗУАЛ" : "НЕ КУПЛЕНО"}</span>
          </button>
          <div className="weapon-copy">
            <span className="weapon-title"><strong>{weapon.name}</strong><b className={`${state.owned ? "weapon-level" : "weapon-new-label"} ${weaponLevelPulse?.weaponId === weaponId ? `level-up-pulse-${weaponLevelPulse.tick % 2 === 0 ? "a" : "b"}` : ""}`}>{state.owned ? `УР. ${state.level}` : "НОВОЕ ОРУЖИЕ"}</b></span>
            <small>{weapon.description}</small>
            <p>{state.owned ? <><span>DPS</span><strong>{formatNumber(dps)}</strong></> : <><span>ПОСЛЕ ПОКУПКИ</span><strong>+{formatNumber(weapon.baseDps)} DPS</strong></>}</p>
            <div className="weapon-upgrade-slots" aria-label={`Улучшения: ${weapon.name}`}>
              {weapon.upgrades.map((item) => {
                const purchased = state.purchasedUpgradeIds.includes(item.id);
                const levelReady = state.owned && state.level >= item.threshold;
                const canBuy = !purchased && levelReady && gold >= item.cost;
                const status = purchased ? "purchased" : levelReady ? "available" : "locked";
                const tooltipId = `${weaponId}-${item.id}-tooltip`;
                return <span className="weapon-upgrade-wrap" key={item.id}><button
                  type="button"
                  className={`weapon-upgrade-slot ${status} ${canBuy ? "affordable" : ""}`}
                  aria-describedby={tooltipId}
                  aria-disabled={!canBuy}
                  aria-label={`${item.name}, уровень ${item.threshold}${purchased ? ", активно" : levelReady ? ", доступно для покупки" : ", закрыто"}`}
                  onMouseEnter={(event) => onShowUpgradeTooltip(event.currentTarget, weaponId, item.id)}
                  onMouseLeave={onHideTooltips}
                  onFocus={(event) => onShowUpgradeTooltip(event.currentTarget, weaponId, item.id)}
                  onBlur={onHideTooltips}
                  onClick={() => { if (!purchased && !levelReady) onPulseLockedUpgrade(item.id); else if (canBuy) onPurchaseUpgrade(weaponId, item.id); }}
                ><span>{item.threshold === 150 ? <AbilityIcon name={getWeaponAbility(weaponId).icon} /> : purchased ? "✓" : levelReady ? "✦" : "◆"}</span><small>{item.threshold}</small></button></span>;
              })}
            </div>
          </div>
          <button ref={weaponId === "gray_weapon" ? weaponLevelButtonRef : undefined} className={`weapon-buy ${affordable ? "affordable" : ""} ${weaponId === "gray_weapon" && ftueStep === "auto-upgrade" ? "ftue-target" : ""}`} disabled={!affordable || state.level >= WEAPON_LEVEL_CAP} onClick={() => onPurchaseWeapon(weaponId)}>
            <span>{state.owned ? quote.levels > 0 ? `+${quote.levels} УР.` : state.level >= WEAPON_LEVEL_CAP ? "МАКС. УРОВЕНЬ" : "НЕДОСТАТОЧНО" : zoneReady ? "КУПИТЬ" : `УРОВЕНЬ ${weapon.unlockZone}`}</span>
            <strong><CostCoin compact /><span>{formatNumber(state.owned ? quote.cost : weapon.purchaseCost)}</span></strong>
          </button>
        </article>;
      })}
    </div>
  </aside>;
}, (previous, next) => previous.gold === next.gold
  && previous.clickLevel === next.clickLevel
  && previous.clickPurchasedUpgradeIds === next.clickPurchasedUpgradeIds
  && previous.bulkAmount === next.bulkAmount
  && previous.highestZone === next.highestZone
  && previous.selectedWeaponId === next.selectedWeaponId
  && previous.weapons === next.weapons
  && previous.clickDamage === next.clickDamage
  && previous.ftueStep === next.ftueStep
  && previous.weaponLevelPulse === next.weaponLevelPulse);

type TopBarProps = {
  gold: number;
  title: string;
  subtitle: string;
  displayedDps: number;
  clickDamage: number;
  soundEnabled: boolean;
  walletPulseTick: number;
  walletHighlighted: boolean;
  walletRef: { current: HTMLDivElement | null };
  onToggleSounds: () => void;
};

const TopBar = memo(function TopBar(props: TopBarProps) {
  const { gold, title, subtitle, displayedDps, clickDamage, soundEnabled, walletPulseTick, walletHighlighted, walletRef, onToggleSounds } = props;
  return <header className="topbar">
    <div ref={walletRef} className={`gold-hero ${walletHighlighted ? "ftue-target" : ""} ${walletPulseTick > 0 ? `wallet-pulse-${walletPulseTick % 2 === 0 ? "a" : "b"}` : ""}`}><span className="gold-coin-animated" style={{ backgroundImage: `url(${COIN_ART})` }} role="img" aria-label="Золото" /><strong>{formatNumber(gold)}</strong></div>
    <div className="world-status"><strong>{title}</strong><span>{subtitle}</span></div>
    <div className="top-resources">
      <span><small>ОБЩИЙ УРОН</small><strong>{formatNumber(displayedDps)} DPS</strong></span>
      <span><small>УРОН ЗА КЛИК</small><strong>{formatNumber(clickDamage)}</strong></span>
      <button type="button" className={`sound-toggle ${soundEnabled ? "enabled" : "muted"}`} aria-pressed={!soundEnabled} aria-label={soundEnabled ? "Отключить звуки" : "Включить звуки"} onClick={onToggleSounds}>
        <span aria-hidden="true">{soundEnabled ? "🔊" : "🔇"}</span><strong>ЗВУК</strong><small>{soundEnabled ? "ВКЛ" : "ВЫКЛ"}</small>
      </button>
    </div>
  </header>;
}, (previous, next) => previous.gold === next.gold
  && previous.title === next.title
  && previous.subtitle === next.subtitle
  && previous.displayedDps === next.displayedDps
  && previous.clickDamage === next.clickDamage
  && previous.soundEnabled === next.soundEnabled
  && previous.walletPulseTick === next.walletPulseTick
  && previous.walletHighlighted === next.walletHighlighted);

type AbilityDockProps = {
  boostActive: boolean;
  boostRemaining: number;
  abilityCooldown: number;
  manualCriticalUnlocked: boolean;
  manualCriticalActive: boolean;
  manualCriticalRemaining: number;
  manualCriticalCooldown: number;
  iceRainUnlocked: boolean;
  iceRainActive: boolean;
  iceRainRemaining: number;
  iceRainCooldown: number;
  combatTimers: CombatAbilityTimers;
  clock: number;
  unlockedWeaponAbilities: readonly WeaponAbilityDefinition[];
  lockedAbilitySlotCount: number;
  dockRef: { current: HTMLElement | null };
  onActivateAbility: () => void;
  onActivateManualCritical: () => void;
  onActivateIceRain: () => void;
  onActivateCombatAbility: (id: CombatAbilityId) => void;
  onShowTooltip: (anchor: HTMLElement, abilityId: AbilityTooltipId, touch: boolean) => void;
  onHideTooltip: () => void;
};

const AbilityDock = memo(function AbilityDock(props: AbilityDockProps) {
  const {
    boostActive, boostRemaining, abilityCooldown, iceRainUnlocked, iceRainActive, iceRainRemaining,
    iceRainCooldown, unlockedWeaponAbilities, lockedAbilitySlotCount, dockRef, onActivateAbility, onActivateIceRain,
    onShowTooltip, onHideTooltip, combatTimers, clock, onActivateCombatAbility, manualCriticalUnlocked,
    manualCriticalActive, manualCriticalRemaining, manualCriticalCooldown, onActivateManualCritical,
  } = props;
  const passiveAbilities = unlockedWeaponAbilities.filter((ability) => ability.kind === "passive");
  const boostUnavailable = boostActive || abilityCooldown > 0;
  const iceRainUnavailable = iceRainActive || iceRainCooldown > 0;
  return <aside ref={dockRef} className="ability-dock" aria-label="Активные и пассивные способности">
    <button
      className={`ability-button ${boostActive ? "active" : abilityCooldown <= 0 ? "ready" : "cooldown"}`}
      aria-disabled={boostUnavailable}
      onClick={() => { if (!boostUnavailable) onActivateAbility(); }}
      onMouseEnter={(event) => onShowTooltip(event.currentTarget, "double_dps", false)}
      onMouseLeave={onHideTooltip}
      onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) onShowTooltip(event.currentTarget, "double_dps", false); }}
      onBlur={onHideTooltip}
      onPointerDown={(event) => { if (event.pointerType !== "mouse") onShowTooltip(event.currentTarget, "double_dps", true); }}
      aria-label={boostActive ? `Двойной DPS, осталось ${formatDuration(boostRemaining)}` : abilityCooldown > 0 ? `Перезагрузка, осталось ${formatDuration(abilityCooldown)}` : "Активировать двойной DPS за рекламу"}
    >
      <span><AbilityIcon name="leadership" /></span><strong>{boostActive ? `×2 · ${formatDuration(boostRemaining)}` : abilityCooldown > 0 ? formatDuration(abilityCooldown) : "×2 DPS"}</strong><small>{boostActive ? "АКТИВНО" : abilityCooldown > 0 ? "ПЕРЕЗАРЯДКА" : "ГОТОВО"}</small>
    </button>
    {manualCriticalUnlocked && <button
      type="button"
      className={`ability-button manual-critical-ability ${manualCriticalActive ? "active" : manualCriticalCooldown <= 0 ? "ready" : "cooldown"}`}
      data-manual-ability="manual_150"
      aria-disabled={manualCriticalActive || manualCriticalCooldown > 0}
      onClick={() => { if (!manualCriticalActive && manualCriticalCooldown <= 0) onActivateManualCritical(); }}
      onMouseEnter={(event) => onShowTooltip(event.currentTarget, "manual_crit", false)}
      onMouseLeave={onHideTooltip}
      onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) onShowTooltip(event.currentTarget, "manual_crit", false); }}
      onBlur={onHideTooltip}
      onPointerDown={(event) => { if (event.pointerType !== "mouse") onShowTooltip(event.currentTarget, "manual_crit", true); }}
      aria-label={manualCriticalActive ? `Крит активен, осталось ${formatDuration(manualCriticalRemaining)}` : manualCriticalCooldown > 0 ? `Крит перезаряжается, осталось ${formatDuration(manualCriticalCooldown)}` : "Активировать Крит"}
    >
      <span><AbilityIcon name="critical" /></span>
      <strong>{manualCriticalActive ? formatDuration(manualCriticalRemaining) : manualCriticalCooldown > 0 ? formatDuration(manualCriticalCooldown) : "КРИТ +20%"}</strong>
      <small>{manualCriticalActive ? "АКТИВНО" : manualCriticalCooldown > 0 ? "ПЕРЕЗАРЯДКА" : "ГОТОВО"}</small>
    </button>}
    {iceRainUnlocked && <button
      type="button"
      className={`ability-button ice-rain-ability ${iceRainActive ? "active" : iceRainCooldown <= 0 ? "ready" : "cooldown"}`}
      data-weapon-ability="blue_weapon"
      aria-disabled={iceRainUnavailable}
      onClick={() => { if (!iceRainUnavailable) onActivateIceRain(); }}
      onMouseEnter={(event) => onShowTooltip(event.currentTarget, "blue_weapon", false)}
      onMouseLeave={onHideTooltip}
      onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) onShowTooltip(event.currentTarget, "blue_weapon", false); }}
      onBlur={onHideTooltip}
      onPointerDown={(event) => { if (event.pointerType !== "mouse") onShowTooltip(event.currentTarget, "blue_weapon", true); }}
      aria-label={iceRainActive ? `Ледяной дождь активен, осталось ${formatDuration(iceRainRemaining)}` : iceRainCooldown > 0 ? `Ледяной дождь перезаряжается, осталось ${formatDuration(iceRainCooldown)}` : "Активировать Ледяной дождь"}
    >
      <span className="ice-rain-icon" aria-hidden="true"><AbilityIcon name="ice-rain" /></span>
      <strong>{iceRainActive ? formatDuration(iceRainRemaining) : iceRainCooldown > 0 ? formatDuration(iceRainCooldown) : "ЛЕДЯНОЙ ДОЖДЬ"}</strong>
      <small>{iceRainActive ? "АКТИВНО" : iceRainCooldown > 0 ? "ПЕРЕЗАРЯДКА" : "ГОТОВО"}</small>
    </button>}
    {(["abyss", "wolf"] as const).map((id) => {
      const spec = COMBAT_ABILITIES[id];
      const ability = unlockedWeaponAbilities.find((entry) => entry.weaponId === spec.weaponId);
      if (!ability) return null;
      const timer = combatTimers[id];
      const active = timer.activeUntil > clock;
      const cooldown = Math.max(0, (timer.cooldownUntil - clock) / 1000);
      const remaining = Math.max(0, (timer.activeUntil - clock) / 1000);
      const unavailable = active || cooldown > 0;
      return <button
        key={id}
        type="button"
        className={`ability-button combat-ability ${id}-ability ${active ? "active" : cooldown > 0 ? "cooldown" : "ready"}`}
        data-weapon-ability={ability.weaponId}
        aria-disabled={unavailable}
        aria-label={`${ability.name}${active ? ` активно, ${formatDuration(remaining)}` : cooldown > 0 ? `, перезарядка ${formatDuration(cooldown)}` : ", готово"}`}
        onClick={() => { if (!unavailable) onActivateCombatAbility(id); }}
        onMouseEnter={(event) => onShowTooltip(event.currentTarget, ability.weaponId, false)}
        onMouseLeave={onHideTooltip}
        onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) onShowTooltip(event.currentTarget, ability.weaponId, false); }}
        onBlur={onHideTooltip}
        onPointerDown={(event) => { if (event.pointerType !== "mouse") onShowTooltip(event.currentTarget, ability.weaponId, true); }}
      ><span><AbilityIcon name={ability.icon} /></span><strong>{active ? formatDuration(remaining) : cooldown > 0 ? formatDuration(cooldown) : ability.name}</strong><small>{active ? "АКТИВНО" : cooldown > 0 ? "ПЕРЕЗАРЯДКА" : "ГОТОВО"}</small></button>;
    })}
    {passiveAbilities.map((ability, index) => <article
      key={ability.weaponId}
      className={`ability-button passive-ability ${index === 0 ? "passive-first" : ""}`}
      data-weapon-ability={ability.weaponId}
      style={{ "--ability-color": WEAPONS[ability.weaponId].color } as CSSProperties}
      aria-label={`${ability.name}, пассивное умение. ${ability.description}`}
      tabIndex={0}
      onMouseEnter={(event) => onShowTooltip(event.currentTarget, ability.weaponId, false)}
      onMouseLeave={onHideTooltip}
      onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) onShowTooltip(event.currentTarget, ability.weaponId, false); }}
      onBlur={onHideTooltip}
      onPointerDown={(event) => { if (event.pointerType !== "mouse") onShowTooltip(event.currentTarget, ability.weaponId, true); }}
    >
      <span className="weapon-ability-glyph" aria-hidden="true"><AbilityIcon name={ability.icon} /></span>
      <strong>{ability.name}</strong>
      <small>ПАССИВНО</small>
    </article>)}
    {Array.from({ length: lockedAbilitySlotCount }, (_, index) => <span className="ability-placeholder" key={index} role="img" aria-label="Умение закрыто"><b aria-hidden="true">🔒</b></span>)}
  </aside>;
}, (previous, next) => previous.boostActive === next.boostActive
  && Math.ceil(previous.boostRemaining) === Math.ceil(next.boostRemaining)
  && Math.ceil(previous.abilityCooldown) === Math.ceil(next.abilityCooldown)
  && previous.manualCriticalUnlocked === next.manualCriticalUnlocked
  && previous.manualCriticalActive === next.manualCriticalActive
  && Math.ceil(previous.manualCriticalRemaining) === Math.ceil(next.manualCriticalRemaining)
  && Math.ceil(previous.manualCriticalCooldown) === Math.ceil(next.manualCriticalCooldown)
  && previous.iceRainUnlocked === next.iceRainUnlocked
  && previous.iceRainActive === next.iceRainActive
  && Math.ceil(previous.iceRainRemaining) === Math.ceil(next.iceRainRemaining)
  && Math.ceil(previous.iceRainCooldown) === Math.ceil(next.iceRainCooldown)
  && (["abyss", "wolf"] as const).every((id) =>
    Math.ceil(Math.max(0, previous.combatTimers[id].activeUntil - previous.clock) / 1000) === Math.ceil(Math.max(0, next.combatTimers[id].activeUntil - next.clock) / 1000)
    && Math.ceil(Math.max(0, previous.combatTimers[id].cooldownUntil - previous.clock) / 1000) === Math.ceil(Math.max(0, next.combatTimers[id].cooldownUntil - next.clock) / 1000))
  && previous.unlockedWeaponAbilities === next.unlockedWeaponAbilities
  && previous.lockedAbilitySlotCount === next.lockedAbilitySlotCount);

const zoneEnemyOrderCache = new Map<number, readonly EnemyData[]>();

function getEnemyOrderForZone(zone: number): readonly EnemyData[] {
  const safeZone = Math.max(1, Math.floor(zone));
  const cached = zoneEnemyOrderCache.get(safeZone);
  if (cached) return cached;

  const region = getMapRegionForZone(safeZone);
  const order = [...REGION_ENEMIES[region.id - 1]];
  let seed = (Math.imul(safeZone, 0x9e3779b1) ^ Math.imul(region.id, 0x85ebca6b)) >>> 0;
  for (let index = order.length - 1; index > 0; index -= 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const swapIndex = (seed >>> 0) % (index + 1);
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  zoneEnemyOrderCache.set(safeZone, order);
  return order;
}

function getEnemyForZone(zone: number, killsInZone: number): EnemyData {
  const safeZone = Math.max(1, Math.floor(zone));
  if (isBossZone(safeZone)) return BOSS_ENEMIES[CAMPAIGN_BOSS_ORDER[(safeZone / 5 - 1) % CAMPAIGN_BOSS_ORDER.length] - 1];
  const order = getEnemyOrderForZone(safeZone);
  return order[Math.max(0, Math.floor(killsInZone)) % order.length];
}

function getArenaBackground(zone: number): string {
  const safeZone = Math.max(1, Math.floor(zone));
  const region = getMapRegionForZone(safeZone);
  return REGION_ARENA_BACKGROUNDS[region.id - 1];
}

function getDungeonArenaBackground(regionId: number, _slot: number): string {
  return REGION_ARENA_BACKGROUNDS[Math.max(0, Math.min(REGION_ARENA_BACKGROUNDS.length - 1, regionId - 1))];
}

function getCriticalCombatArt(state: GameStateV3): string[] {
  return [
    getArenaBackground(state.zone),
    getEnemyForZone(state.zone, state.killsInZone).src,
    PROJECTILE_BY_WEAPON[state.selectedWeaponId],
    PROJECTILE_BY_WEAPON.blue_weapon,
    PROJECTILE_BY_WEAPON.void_weapon,
    WEAPON_ART_BY_WEAPON[state.selectedWeaponId],
    COIN_ART,
  ];
}

function getNextCombatArt(state: GameStateV3): string[] {
  const nextZone = state.killsInZone + 1 >= ENEMIES_PER_ZONE
    ? Math.min(105, state.zone + 1)
    : state.zone;
  const nextKills = nextZone === state.zone ? state.killsInZone + 1 : 0;
  return [getArenaBackground(nextZone), getEnemyForZone(nextZone, nextKills).src];
}

const MAP_REGIONS = [
  {
    id: 1, name: "Сумрачный лес", color: "#79bd7d", labelX: 24, labelY: 68, markerX: 25, markerY: 69,
    startZone: 1, endZone: 10, unlockBossZone: 0,
    path: "M 7.27 57.81 L 7.60 57.12 L 10.17 57.44 L 10.53 58.93 L 11.93 59.51 L 12.14 61.05 L 14.23 61.48 L 14.86 59.19 L 15.40 58.55 L 15.70 56.11 L 14.35 55.63 L 14.32 54.73 L 13.82 54.14 L 12.02 53.40 L 11.99 52.39 L 11.42 52.02 L 10.83 50.32 L 9.27 50.85 L 8.73 51.70 L 8.64 50.69 L 7.86 49.95 L 9.75 50.32 L 9.99 49.47 L 10.65 49.26 L 11.96 50.21 L 12.44 51.28 L 13.76 51.49 L 14.06 52.66 L 16.21 52.87 L 16.72 50.80 L 15.70 49.84 L 15.52 48.35 L 16.63 46.81 L 17.11 46.81 L 18.06 48.09 L 18.90 48.30 L 18.93 48.99 L 19.47 49.42 L 19.44 50.64 L 21.11 50.85 L 21.65 48.72 L 22.82 48.25 L 22.82 46.87 L 21.86 45.70 L 21.92 44.63 L 20.42 43.78 L 21.17 42.35 L 21.77 42.35 L 22.49 43.84 L 23.27 44.05 L 25.78 42.03 L 27.51 41.92 L 28.59 42.35 L 30.62 44.58 L 31.88 44.90 L 32.48 47.45 L 33.55 47.87 L 34.48 49.10 L 34.96 50.80 L 34.90 53.88 L 35.50 54.41 L 35.44 55.58 L 38.55 58.98 L 38.91 63.23 L 38.31 64.08 L 38.31 65.25 L 38.67 67.80 L 37.77 70.99 L 37.35 75.45 L 38.67 79.28 L 38.67 82.57 L 38.97 83.10 L 37.50 85.28 L 35.41 86.24 L 33.37 85.39 L 32.18 82.20 L 29.61 82.84 L 29.34 84.38 L 29.64 85.12 L 28.89 85.28 L 27.66 87.35 L 28.14 90.01 L 27.57 90.17 L 27.03 91.34 L 26.61 91.34 L 26.38 90.60 L 24.82 90.60 L 24.79 91.82 L 25.33 92.35 L 24.58 94.42 L 23.83 94.16 L 24.25 93.73 L 24.25 92.77 L 22.91 90.60 L 22.43 90.70 L 21.23 92.83 L 21.20 91.82 L 20.28 90.91 L 19.56 92.30 L 18.60 91.76 L 16.87 95.70 L 15.91 93.68 L 14.59 92.72 L 14.47 91.55 L 13.58 90.60 L 12.65 90.54 L 13.43 88.52 L 13.43 87.35 L 12.44 85.81 L 11.84 85.71 L 11.60 84.64 L 10.65 84.43 L 9.78 82.68 L 10.65 80.71 L 12.41 79.60 L 12.47 78.00 L 11.69 77.58 L 12.38 77.31 L 12.71 75.77 L 11.69 74.71 L 12.65 73.86 L 12.71 72.79 L 11.18 71.89 L 10.38 70.56 L 10.14 68.86 L 10.65 67.22 L 11.90 67.11 L 12.11 65.67 L 11.66 64.88 L 9.69 64.03 L 10.08 61.85 L 7.78 60.31 L 7.75 58.45 Z M 4.75 79.49 L 6.04 78.80 L 6.22 79.22 L 6.76 79.12 L 7.09 79.70 L 7.45 80.98 L 6.85 81.93 L 6.85 83.53 L 7.63 84.48 L 8.16 85.55 L 8.01 85.81 L 7.42 85.81 L 7.00 85.07 L 6.58 85.18 L 6.40 84.54 L 5.77 83.95 L 6.25 81.40 L 5.26 81.14 Z",
  },
  {
    id: 2, name: "Одинокие равнины", color: "#c7b66b", labelX: 52, labelY: 55, markerX: 53, markerY: 55,
    startZone: 26, endZone: 40, unlockBossZone: 25,
    path: "M 35.14 48.88 L 35.59 46.60 L 37.14 46.07 L 37.44 45.22 L 38.58 45.32 L 39.71 43.62 L 41.03 42.77 L 41.27 41.50 L 42.43 40.91 L 42.37 38.47 L 42.73 36.88 L 42.02 34.86 L 42.43 34.22 L 42.61 32.41 L 40.94 31.03 L 42.37 29.44 L 42.40 27.58 L 44.62 26.62 L 44.77 27.84 L 45.75 29.38 L 46.65 28.75 L 46.89 29.38 L 47.91 29.70 L 50.24 29.60 L 50.42 30.23 L 54.01 31.72 L 54.31 32.89 L 55.38 32.57 L 53.68 35.71 L 53.68 36.66 L 54.19 37.46 L 59.39 36.61 L 60.83 37.57 L 60.92 39.32 L 60.26 40.49 L 60.26 41.55 L 61.00 43.73 L 63.58 43.30 L 65.79 42.03 L 66.81 42.45 L 67.64 45.01 L 68.54 45.43 L 69.14 46.60 L 71.11 47.66 L 71.14 48.78 L 72.64 50.58 L 72.82 52.71 L 72.25 53.72 L 70.63 53.83 L 69.26 55.31 L 68.36 55.42 L 67.34 56.80 L 66.63 56.91 L 66.03 58.08 L 64.77 58.29 L 63.58 59.99 L 62.56 60.10 L 61.87 63.12 L 62.41 65.57 L 62.02 66.79 L 59.99 68.49 L 58.37 67.85 L 58.19 68.60 L 57.98 67.06 L 57.66 67.00 L 57.18 68.92 L 55.68 68.81 L 54.93 69.82 L 54.37 72.42 L 52.39 73.49 L 50.78 76.57 L 50.18 76.78 L 49.82 79.22 L 48.92 79.33 L 47.97 81.03 L 46.89 81.35 L 46.41 80.39 L 45.33 80.92 L 44.32 80.50 L 44.35 81.93 L 43.96 81.99 L 43.15 80.98 L 43.12 79.54 L 41.87 79.44 L 41.09 78.27 L 39.11 78.69 L 38.49 77.15 L 37.95 74.92 L 38.49 70.03 L 39.08 68.44 L 38.79 64.61 L 39.26 63.97 L 39.20 58.66 L 38.76 57.55 L 36.21 55.58 L 36.45 53.99 L 35.38 53.24 L 35.50 50.48 Z M 39.74 87.46 L 40.37 87.83 L 40.55 88.79 L 41.27 88.79 L 41.51 89.43 L 42.22 89.85 L 42.70 89.64 L 42.19 86.29 L 42.85 84.91 L 42.11 84.43 L 41.96 83.63 L 41.63 83.37 L 40.67 83.90 L 40.70 85.76 Z M 44.83 87.99 L 45.60 89.69 L 45.54 90.86 L 45.01 91.39 L 45.99 91.98 L 46.41 92.93 L 47.55 91.76 L 49.31 91.07 L 48.50 89.00 L 47.85 88.89 L 47.43 87.94 L 46.83 88.36 L 45.16 87.09 Z M 49.61 86.93 L 49.67 88.63 L 50.00 88.68 L 50.48 89.53 L 51.38 89.32 L 51.94 88.63 L 50.60 86.45 Z",
  },
  {
    id: 3, name: "Скованные хребты", color: "#70acd0", labelX: 28, labelY: 34, markerX: 28, markerY: 34,
    startZone: 11, endZone: 25, unlockBossZone: 10,
    path: "M 12.05 36.66 L 13.64 36.08 L 14.06 34.80 L 15.73 33.85 L 15.73 31.93 L 16.63 32.68 L 17.46 32.57 L 17.55 31.24 L 18.18 30.45 L 19.92 31.08 L 21.17 28.64 L 23.44 28.00 L 22.94 25.93 L 24.04 25.98 L 24.79 25.29 L 24.64 24.28 L 23.47 24.12 L 23.65 22.74 L 23.27 21.84 L 22.58 21.79 L 22.28 18.70 L 21.29 18.23 L 21.02 17.00 L 22.28 16.47 L 22.34 15.41 L 21.92 14.45 L 22.67 13.34 L 23.03 13.87 L 24.34 13.23 L 26.26 13.66 L 27.00 15.52 L 27.06 16.90 L 27.84 18.28 L 28.23 20.88 L 30.26 21.73 L 30.86 22.69 L 31.22 22.69 L 31.82 21.31 L 32.78 23.01 L 34.63 23.33 L 35.47 26.20 L 36.72 25.98 L 36.57 24.76 L 36.96 23.86 L 38.40 23.75 L 39.65 26.30 L 41.57 26.83 L 41.90 27.63 L 41.90 28.91 L 40.52 30.39 L 40.52 31.77 L 41.15 32.68 L 42.14 32.84 L 41.54 35.07 L 42.25 37.19 L 41.90 37.83 L 42.02 40.17 L 40.91 40.65 L 40.67 42.03 L 39.29 42.88 L 38.22 44.58 L 37.14 44.26 L 36.90 45.22 L 35.17 45.86 L 34.75 48.19 L 32.83 46.60 L 32.24 44.05 L 30.98 43.73 L 29.01 41.60 L 27.81 41.07 L 25.42 41.18 L 23.03 43.20 L 22.13 41.50 L 21.14 41.45 L 21.56 40.60 L 21.29 39.59 L 20.28 39.48 L 19.02 41.29 L 17.94 41.29 L 17.40 42.14 L 16.45 41.60 L 13.04 41.82 L 13.31 40.28 L 12.86 40.12 L 12.95 39.00 L 12.17 38.26 Z",
  },
  {
    id: 4, name: "Заснеженные пики", color: "#bce9ff", labelX: 50, labelY: 15, markerX: 50, markerY: 16,
    startZone: 41, endZone: 55, unlockBossZone: 40,
    path: "M 24.97 11.69 L 26.61 12.81 L 27.18 13.92 L 27.54 16.37 L 28.32 17.64 L 28.53 20.03 L 29.31 20.03 L 29.96 20.99 L 30.50 20.78 L 30.92 21.73 L 31.58 20.14 L 32.12 20.03 L 32.60 21.84 L 35.11 22.69 L 35.77 25.35 L 36.15 25.08 L 36.15 23.91 L 36.60 23.11 L 38.64 22.90 L 40.01 25.45 L 41.87 25.98 L 42.22 26.83 L 43.66 25.66 L 44.98 25.56 L 45.19 27.21 L 45.63 27.36 L 45.87 28.32 L 46.83 27.79 L 47.25 28.64 L 48.27 28.96 L 48.92 28.43 L 50.48 28.75 L 50.78 29.49 L 51.73 29.49 L 53.05 30.66 L 53.68 30.39 L 54.10 28.16 L 54.67 27.15 L 56.07 26.99 L 55.77 24.87 L 56.46 23.43 L 57.54 23.86 L 58.58 23.17 L 58.82 21.57 L 58.28 20.94 L 58.28 20.09 L 59.45 19.29 L 60.35 17.27 L 62.50 17.06 L 62.68 18.33 L 63.34 17.27 L 65.37 16.63 L 66.57 18.12 L 67.11 17.91 L 67.70 16.21 L 68.24 16.21 L 68.60 17.38 L 69.32 15.57 L 71.35 14.19 L 73.39 14.61 L 74.85 12.65 L 73.15 12.49 L 72.31 11.00 L 69.98 11.32 L 69.56 10.89 L 69.17 11.48 L 69.08 13.55 L 67.40 13.97 L 66.48 13.18 L 66.48 11.80 L 67.37 11.16 L 66.75 11.11 L 66.39 10.26 L 65.01 11.64 L 64.50 11.26 L 64.47 10.26 L 63.04 10.36 L 62.44 11.85 L 61.78 11.96 L 61.57 10.63 L 61.93 8.50 L 63.04 7.70 L 62.86 6.85 L 61.66 6.64 L 59.81 8.66 L 58.64 8.40 L 59.09 6.32 L 59.96 6.27 L 59.78 4.04 L 61.63 2.76 L 60.41 1.43 L 58.07 2.60 L 56.88 4.41 L 55.20 4.84 L 53.53 4.84 L 52.69 3.99 L 52.09 4.84 L 51.44 4.20 L 50.78 4.73 L 48.33 3.45 L 46.65 3.88 L 45.33 2.39 L 43.54 4.84 L 41.45 5.90 L 40.13 7.81 L 39.47 7.60 L 38.22 8.77 L 37.38 8.66 L 37.02 9.72 L 35.11 9.72 L 34.09 8.66 L 32.63 9.67 L 32.60 11.42 L 31.16 12.06 L 29.96 11.42 L 29.87 10.10 L 29.25 9.30 L 27.09 8.98 L 26.94 7.33 L 28.08 6.70 L 27.33 6.54 L 26.02 7.39 L 25.99 8.50 L 25.39 8.93 L 25.78 9.72 L 26.61 9.62 L 26.70 10.84 L 26.26 11.32 L 25.36 11.00 Z M 34.84 5.21 L 35.68 5.84 L 35.50 6.59 L 35.65 6.96 L 38.13 6.91 L 37.41 6.16 L 37.68 5.37 L 36.48 5.69 L 36.30 4.30 Z M 67.73 8.08 L 68.00 7.17 L 68.51 6.80 L 68.51 6.06 L 68.21 5.63 L 68.84 5.47 L 69.08 4.73 L 69.74 5.05 L 69.86 5.79 L 70.60 5.95 L 70.19 6.91 L 70.31 8.29 L 69.92 7.81 L 69.20 7.81 L 69.02 9.30 L 68.18 9.30 L 67.73 8.61 Z",
  },
  {
    id: 5, name: "Проклятая земля", color: "#b083d6", labelX: 73, labelY: 35, markerX: 73, markerY: 35,
    startZone: 56, endZone: 75, unlockBossZone: 55,
    path: "M 55.05 35.92 L 57.18 32.78 L 57.27 33.69 L 57.83 34.17 L 59.27 33.63 L 59.36 31.88 L 59.96 31.77 L 60.02 30.50 L 58.91 30.34 L 58.52 29.33 L 58.58 28.59 L 59.30 27.95 L 59.18 26.89 L 59.81 26.73 L 59.99 25.77 L 60.77 25.66 L 61.18 24.39 L 63.28 24.60 L 63.91 23.49 L 63.73 22.42 L 64.06 21.94 L 64.14 23.17 L 65.25 24.39 L 66.03 23.65 L 66.63 23.96 L 66.78 22.10 L 67.34 22.37 L 67.46 21.52 L 68.06 23.43 L 70.57 23.43 L 71.05 22.37 L 71.59 22.69 L 72.19 21.20 L 72.31 22.16 L 73.39 22.16 L 74.40 20.35 L 75.96 18.97 L 76.88 19.77 L 77.87 23.75 L 79.04 24.23 L 78.89 26.62 L 79.84 25.88 L 80.65 26.99 L 80.86 28.43 L 81.52 28.00 L 82.21 29.44 L 82.39 30.29 L 81.52 30.98 L 81.25 31.99 L 81.28 33.10 L 82.33 32.84 L 81.79 34.54 L 83.25 35.33 L 83.85 35.02 L 84.09 36.61 L 84.66 36.34 L 84.06 38.68 L 85.53 39.59 L 86.15 42.08 L 84.75 41.82 L 84.06 43.04 L 84.27 44.69 L 86.12 45.11 L 87.11 43.36 L 87.05 42.40 L 87.62 40.97 L 89.29 39.69 L 89.77 42.03 L 90.82 41.76 L 89.44 42.93 L 89.44 44.31 L 88.64 44.47 L 88.61 45.59 L 88.04 46.81 L 87.38 45.32 L 86.66 45.32 L 86.54 46.28 L 85.65 47.02 L 84.45 46.81 L 84.36 47.93 L 84.78 48.67 L 84.30 49.31 L 84.15 50.74 L 83.19 50.64 L 81.88 51.59 L 81.46 50.00 L 80.38 49.79 L 80.26 50.96 L 77.39 51.49 L 77.24 52.50 L 77.90 53.13 L 76.85 53.51 L 76.50 54.36 L 75.78 53.72 L 74.40 54.14 L 73.18 53.45 L 73.47 51.54 L 73.00 49.84 L 71.68 48.25 L 71.59 47.02 L 70.93 46.17 L 69.50 45.86 L 68.90 44.69 L 67.94 44.16 L 67.05 41.60 L 65.49 41.18 L 61.36 42.99 L 60.80 41.02 L 61.45 39.74 L 61.18 36.82 L 59.03 35.76 L 55.80 36.72 Z M 87.23 56.00 L 87.65 56.32 L 87.68 57.12 L 89.11 57.44 L 89.53 58.29 L 90.01 57.33 L 90.40 57.28 L 90.34 56.54 L 90.64 56.00 L 90.07 55.31 L 89.71 55.84 L 88.97 55.58 L 88.97 54.73 L 89.47 53.72 L 88.88 54.25 L 88.10 54.14 L 87.95 55.47 Z",
  },
  {
    id: 6, name: "Разлом Хаоса", color: "#d78360", labelX: 69, labelY: 74, markerX: 69, markerY: 74,
    startZone: 76, endZone: 105, unlockBossZone: 75,
    path: "M 47.94 83.53 L 48.62 83.69 L 49.34 82.52 L 51.91 81.14 L 52.00 79.81 L 50.48 79.22 L 50.45 77.68 L 51.14 77.31 L 52.75 74.23 L 54.78 73.17 L 55.35 70.46 L 56.04 69.55 L 57.48 69.77 L 58.73 68.81 L 60.29 69.23 L 62.38 67.53 L 62.89 66.21 L 62.41 63.23 L 62.98 60.84 L 63.88 60.84 L 65.13 59.03 L 66.27 58.93 L 66.87 57.76 L 67.70 57.55 L 70.81 54.68 L 75.60 54.57 L 76.50 55.42 L 77.93 58.29 L 78.65 58.08 L 79.31 56.16 L 80.02 60.63 L 80.98 60.84 L 81.22 61.80 L 82.66 62.75 L 82.66 64.88 L 83.61 64.67 L 84.33 67.00 L 86.60 69.02 L 87.59 70.67 L 87.62 72.10 L 86.66 72.10 L 86.24 73.27 L 84.15 74.65 L 84.18 77.58 L 83.07 77.84 L 82.72 79.33 L 81.97 79.70 L 82.15 83.63 L 82.95 83.90 L 83.07 84.86 L 81.28 85.39 L 81.07 85.02 L 81.37 83.53 L 80.20 82.31 L 79.25 82.84 L 78.53 81.77 L 77.81 81.77 L 76.73 82.73 L 76.76 84.70 L 76.17 85.12 L 75.90 86.66 L 75.03 87.04 L 74.85 88.31 L 76.67 88.89 L 76.82 89.59 L 76.35 90.65 L 76.88 91.18 L 76.50 91.23 L 76.14 92.51 L 75.24 91.98 L 74.82 93.15 L 74.22 92.08 L 73.74 92.08 L 73.21 93.04 L 70.57 94.10 L 69.98 92.51 L 68.90 92.30 L 68.72 91.02 L 66.27 90.17 L 66.09 90.70 L 65.37 90.49 L 64.86 91.92 L 64.95 93.15 L 65.82 93.41 L 65.25 94.21 L 64.06 94.42 L 63.76 93.15 L 63.04 93.78 L 62.56 92.40 L 62.20 92.40 L 61.12 92.83 L 60.47 94.21 L 59.63 94.42 L 58.76 93.41 L 58.67 91.98 L 57.00 91.87 L 56.61 90.22 L 56.01 89.80 L 56.13 87.89 L 56.61 87.46 L 56.64 86.66 L 53.95 85.81 L 53.17 84.43 L 51.97 84.22 L 51.44 83.48 L 49.04 84.33 Z M 89.38 77.58 L 90.25 77.10 L 90.91 76.04 L 93.12 75.82 L 93.54 74.87 L 93.78 75.40 L 94.86 76.04 L 94.89 77.36 L 95.25 77.68 L 95.01 77.90 L 95.25 78.75 L 94.95 78.96 L 94.47 80.66 L 94.47 81.19 L 94.95 81.72 L 94.50 81.88 L 94.44 82.41 L 93.48 82.73 L 93.48 83.79 L 92.22 84.11 L 92.02 85.76 L 91.33 85.92 L 90.85 84.75 L 89.92 84.27 L 90.34 83.95 L 91.09 81.77 L 91.72 81.51 L 91.72 80.77 L 90.76 79.60 L 90.67 78.80 L 89.65 78.69 Z M 89.98 89.48 L 90.49 90.49 L 91.09 90.60 L 91.21 91.02 L 91.63 91.02 L 91.93 90.06 L 92.52 90.06 L 92.76 90.60 L 93.45 90.86 L 93.63 92.99 L 93.36 93.57 L 94.26 93.68 L 94.47 93.09 L 94.65 92.24 L 94.11 89.90 L 93.66 89.64 L 93.54 89.11 L 93.12 89.21 L 92.94 88.58 L 92.52 89.00 L 91.51 88.58 L 91.39 88.89 L 90.67 88.89 L 90.31 88.15 Z",
  },
] as const;

// Geographic IDs stay attached to their art; navigation follows level order.
const ORDERED_MAP_REGIONS = [...MAP_REGIONS].sort((a, b) => a.startZone - b.startZone);

function getMapRegionForZone(zone: number) {
  const safeZone = Math.max(1, Math.min(105, Math.floor(zone)));
  return MAP_REGIONS.find((region) => safeZone >= region.startZone && safeZone <= region.endZone) ?? MAP_REGIONS[0];
}

function mapRoadCurve(from: { x: number; y: number }, to: { x: number; y: number }, index: number): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const bend = (index % 2 === 0 ? 1 : -1) * Math.min(3.2, length * 0.22);
  const controlX = (from.x + to.x) / 2 - dy / length * bend;
  const controlY = (from.y + to.y) / 2 + dx / length * bend;
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}

function formatNumber(value: number): string {
  if (value < 1_000) return Math.max(0, Math.round(value)).toLocaleString("ru-RU");
  const units = ["тыс.", "млн", "млрд", "трлн"];
  let scaled = value;
  let unit = -1;
  while (scaled >= 1_000 && unit < units.length - 1) { scaled /= 1_000; unit += 1; }
  return `${scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)} ${units[unit]}`;
}

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  return safe >= 60 ? `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}` : `${safe}с`;
}

function formatTestProgressDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "дата неизвестна";
  return date.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

export default function Game() {
  const [language, setLanguage] = useState<GameLanguage>(readGameLanguage);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [game, setGame] = useState<GameStateV3>(createInitialGameState);
  const gameRef = useRef(game);
  const [hydrated, setHydrated] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [startAssetsReady, setStartAssetsReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [testProgressInfo, setTestProgressInfo] = useState<TestProgressInfo | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [allowPortraitPlay, setAllowPortraitPlay] = useState(false);
  const [pageHidden, setPageHidden] = useState(() => typeof document !== "undefined" && document.hidden);
  const [windowFocused, setWindowFocused] = useState(() => typeof document === "undefined" || document.hasFocus());
  const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQuality>(readGraphicsQuality);
  const resolvedGraphicsQuality = useMemo(() => resolveGraphicsQuality(graphicsQuality), [graphicsQuality]);
  const vfxBudget = VFX_BUDGETS[resolvedGraphicsQuality];
  const [musicVolume, setMusicVolume] = useState(() => readAudioVolume("music"));
  const [effectsVolume, setEffectsVolume] = useState(() => readAudioVolume("effects"));
  const [ftueShown, setFtueShown] = useState(false);
  const [ftueStep, setFtueStep] = useState<FtueStep>("idle");
  const [ftueInteractionStarted, setFtueInteractionStarted] = useState(false);
  const [ftueGuidePosition, setFtueGuidePosition] = useState<FtueGuidePosition | null>(null);
  const [newDungeonGuidePosition, setNewDungeonGuidePosition] = useState<FtueGuidePosition | null>(null);
  const [platformPaused, setPlatformPaused] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedMapRegionId, setSelectedMapRegionId] = useState<number | null>(null);
  const [mapBossInfo, setMapBossInfo] = useState<MapBossInfoState | null>(null);
  const [newDungeonGuide, setNewDungeonGuide] = useState<NewDungeonGuideState | null>(null);
  const [dungeonAttempt, setDungeonAttempt] = useState<DungeonAttempt | null>(null);
  const dungeonAttemptRef = useRef<DungeonAttempt | null>(null);
  const [dungeonRewardAdPending, setDungeonRewardAdPending] = useState(false);
  const [abilityRewardAdPending, setAbilityRewardAdPending] = useState(false);
  const [abilityAd, setAbilityAd] = useState<AbilityAdState | null>(null);
  const [bossRewardAd, setBossRewardAd] = useState<BossRewardAdState | null>(null);
  const [rewardedAdCloseTarget, setRewardedAdCloseTarget] = useState<RewardedAdCloseTarget | null>(null);
  const bossRewardAdRef = useRef<BossRewardAdState | null>(null);
  const [bossRewardBoostActive, setBossRewardBoostActive] = useState(false);
  const bossRewardBoostActiveRef = useRef(false);
  const [testBossActive, setTestBossActive] = useState(false);
  const testBossActiveRef = useRef(false);
  const testBossReturnStateRef = useRef<GameStateV3 | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [iceRainShots, setIceRainShots] = useState<IceRainShot[]>([]);
  const [abilityStrikes, setAbilityStrikes] = useState<AbilityStrike[]>([]);
  const [abilityImpacts, setAbilityImpacts] = useState<AbilityImpact[]>([]);
  const [wolfImpact, setWolfImpact] = useState<{ id: number; x: number; y: number; angle: number } | null>(null);
  const enemyBodyPointsRef = useRef<BodyPoint[]>([{ x: 50, y: 50 }]);
  const prepareEnemyPresentation = useCallback((image: HTMLImageElement) => {
    image.closest<HTMLElement>(".enemy-presentation")?.style.setProperty("--enemy-aspect", String(image.naturalWidth / image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context) {
      context.drawImage(image, 0, 0, 64, 64);
      enemyBodyPointsRef.current = getOpaqueBodyPoints(context.getImageData(0, 0, 64, 64).data, 64, 64);
    }
    setWolfImpact(null);
  }, []);
  const [lootCoins, setLootCoins] = useState<LootCoin[]>([]);
  const [walletPulseTick, setWalletPulseTick] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [weaponLevelPulse, setWeaponLevelPulse] = useState<WeaponLevelPulse | null>(null);
  const [abilityUnlockPresentation, setAbilityUnlockPresentation] = useState<AbilityUnlockPresentation | null>(null);
  const [enemyDying, setEnemyDying] = useState(false);
  const [lockedUpgradePulseId, setLockedUpgradePulseId] = useState<string | null>(null);
  const [upgradeTooltip, setUpgradeTooltip] = useState<UpgradeTooltipState | null>(null);
  const [manualUpgradeTooltip, setManualUpgradeTooltip] = useState<ManualUpgradeTooltipState | null>(null);
  const [weaponUnlockTooltip, setWeaponUnlockTooltip] = useState<WeaponUnlockTooltipState | null>(null);
  const [abilityTooltip, setAbilityTooltip] = useState<AbilityTooltipState | null>(null);
  const lastTickAt = useRef(Date.now());
  const resumeAfkCatchUpRef = useRef(false);
  const lastPublishedAt = useRef(Date.now());
  const playTimeRemainderRef = useRef(0);
  const lastIceRainShotAtRef = useRef(0);
  const bossFailureLock = useRef(false);
  const enemyDyingRef = useRef(false);
  const enemySpawnedAtRef = useRef(Date.now());
  const deathTimerRef = useRef<number | null>(null);
  const dungeonVictoryReturnTimerRef = useRef<number | null>(null);
  const upgradePulseTimerRef = useRef<number | null>(null);
  const weaponLevelPulseTimerRef = useRef<number | null>(null);
  const abilityUnlockHoldTimerRef = useRef<number | null>(null);
  const abilityUnlockFlightTimerRef = useRef<number | null>(null);
  const abilityTooltipTimerRef = useRef<number | null>(null);
  const vfxTimersRef = useRef<Set<number>>(new Set());
  const vfxPoolCursorRef = useRef({ shot: 0, damage: 0, coin: 0, iceRain: 0, abyss: 0 });
  const collectingCoinIdsRef = useRef<Set<number>>(new Set());
  const enemyTargetRef = useRef<HTMLButtonElement | null>(null);
  const walletRef = useRef<HTMLDivElement | null>(null);
  const clickLevelButtonRef = useRef<HTMLButtonElement | null>(null);
  const weaponLevelButtonRef = useRef<HTMLButtonElement | null>(null);
  const nextZoneButtonRef = useRef<HTMLButtonElement | null>(null);
  const mapButtonRef = useRef<HTMLButtonElement | null>(null);
  const abilityDockRef = useRef<HTMLElement | null>(null);
  const abilityUnlockCardRef = useRef<HTMLElement | null>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const ftueZoneGoalKillsRef = useRef(ENEMIES_PER_ZONE);
  const visitedZonesRef = useRef<Set<number>>(new Set());
  const dungeonLastTickAt = useRef(Date.now());

  const commit = useCallback((next: GameStateV3) => {
    gameRef.current = next;
    setGame(next);
  }, []);

  const selectLanguage = useCallback((nextLanguage: GameLanguage) => {
    writeGameLanguage(nextLanguage);
    setLanguage(nextLanguage);
    setLanguageOpen(false);
  }, []);

  const commitProgress = useCallback((next: GameStateV3) => {
    gameRef.current = next;
    setGame(next);
    if (!testBossActiveRef.current) gameServices.saves.scheduleSave(next);
  }, []);

  const commitDungeon = useCallback((next: DungeonAttempt | null) => {
    dungeonAttemptRef.current = next;
    setDungeonAttempt(next);
  }, []);

  const commitBossRewardAd = useCallback((next: BossRewardAdState | null) => {
    bossRewardAdRef.current = next;
    setBossRewardAd(next);
  }, []);

  const commitBossRewardBoost = useCallback((active: boolean) => {
    bossRewardBoostActiveRef.current = active;
    setBossRewardBoostActive(active);
  }, []);

  const commitTestBossActive = useCallback((active: boolean) => {
    testBossActiveRef.current = active;
    setTestBossActive(active);
  }, []);

  const showToast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const item = { id: Date.now() + Math.random(), text, tone };
    setToasts((current) => [...current.slice(-2), item]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== item.id)), 2200);
  }, []);

  const pulseWeaponLevel = useCallback((weaponId: WeaponId) => {
    if (weaponLevelPulseTimerRef.current !== null) window.clearTimeout(weaponLevelPulseTimerRef.current);
    setWeaponLevelPulse((current) => ({ weaponId, tick: (current?.tick ?? 0) + 1 }));
    weaponLevelPulseTimerRef.current = window.setTimeout(() => {
      setWeaponLevelPulse(null);
      weaponLevelPulseTimerRef.current = null;
    }, WEAPON_LEVEL_PULSE_MS);
  }, []);

  const presentWeaponAbilityUnlock = useCallback((weaponId: WeaponId) => {
    if (abilityUnlockHoldTimerRef.current !== null) window.clearTimeout(abilityUnlockHoldTimerRef.current);
    if (abilityUnlockFlightTimerRef.current !== null) window.clearTimeout(abilityUnlockFlightTimerRef.current);
    if (abilityTooltipTimerRef.current !== null) window.clearTimeout(abilityTooltipTimerRef.current);
    abilityTooltipTimerRef.current = null;
    setAbilityTooltip(null);
    const ability = getWeaponAbility(weaponId);
    setAbilityUnlockPresentation({ ability, phase: "showing", flightX: 0, flightY: 0 });

    abilityUnlockHoldTimerRef.current = window.setTimeout(() => {
      abilityUnlockHoldTimerRef.current = null;
      const cardRect = abilityUnlockCardRef.current?.getBoundingClientRect();
      const destination = abilityDockRef.current?.querySelector<HTMLElement>(`[data-weapon-ability="${weaponId}"]`)
        ?? abilityDockRef.current;
      const destinationRect = destination?.getBoundingClientRect();
      const flightX = cardRect && destinationRect
        ? destinationRect.left + destinationRect.width / 2 - (cardRect.left + cardRect.width / 2)
        : 0;
      const flightY = cardRect && destinationRect
        ? destinationRect.top + destinationRect.height / 2 - (cardRect.top + cardRect.height / 2)
        : 0;
      setAbilityUnlockPresentation((current) => current?.ability.weaponId === weaponId
        ? { ...current, phase: "flying", flightX, flightY }
        : current);
      abilityUnlockFlightTimerRef.current = window.setTimeout(() => {
        setAbilityUnlockPresentation((current) => current?.ability.weaponId === weaponId ? null : current);
        abilityUnlockFlightTimerRef.current = null;
      }, ABILITY_UNLOCK_FLIGHT_MS);
    }, ABILITY_UNLOCK_HOLD_MS);
  }, []);

  const finishTestBossAttempt = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const returnState = testBossReturnStateRef.current;
    if (!returnState) return;
    if (deathTimerRef.current !== null) window.clearTimeout(deathTimerRef.current);
    deathTimerRef.current = null;
    enemyDyingRef.current = false;
    setEnemyDying(false);
    testBossReturnStateRef.current = null;
    commitBossRewardAd(null);
    commitBossRewardBoost(false);
    commitTestBossActive(false);
    bossFailureLock.current = false;
    clearPendingVfx();
    commit(returnState);
    enemySpawnedAtRef.current = Date.now();
    lastTickAt.current = Date.now();
    setMapOpen(true);
    showToast(message, tone);
  }, [commit, commitBossRewardAd, commitBossRewardBoost, commitTestBossActive, showToast]);

  const playCoinSound = useCallback((kind: "drop" | "collect") => {
    audioRef.current?.playEffect(kind === "drop" ? "coin-drop.mp3" : "coin-collect.mp3");
  }, []);

  const playBossJackpotSound = useCallback(() => {
    audioRef.current?.playEffect("boss-jackpot.mp3", 1, BOSS_JACKPOT_SOUND_MS / 1000);
  }, []);

  const finishLootCoinCollection = useCallback((id: number) => {
    if (!collectingCoinIdsRef.current.delete(id)) return;
    setLootCoins((items) => items.filter((coin) => coin.id !== id));
    setWalletPulseTick((tick) => tick + 1);
    playCoinSound("collect");
  }, [playCoinSound]);

  const collectLootCoin = useCallback((id: number, element?: HTMLElement | null) => {
    if (collectingCoinIdsRef.current.has(id)) return;
    collectingCoinIdsRef.current.add(id);

    const coinRect = element?.getBoundingClientRect();
    const walletRect = walletRef.current?.getBoundingClientRect();
    const targetX = walletRect ? walletRect.left + walletRect.width / 2 : 120;
    const targetY = walletRect ? walletRect.top + walletRect.height / 2 : 38;

    setLootCoins((items) => items.map((coin) => coin.id === id ? {
      ...coin,
      phase: "collecting",
      collectStartX: coinRect ? coinRect.left + coinRect.width / 2 : coin.landX,
      collectStartY: coinRect ? coinRect.top + coinRect.height / 2 : coin.landY,
      targetX,
      targetY,
    } : coin));

    const arrivalTimer = window.setTimeout(() => {
      vfxTimersRef.current.delete(arrivalTimer);
      finishLootCoinCollection(id);
    }, COIN_COLLECT_FALLBACK_MS);
    vfxTimersRef.current.add(arrivalTimer);
  }, [finishLootCoinCollection]);

  const spawnLootCoins = useCallback((variant: "normal" | "boss" = "normal") => {
    const enemyRect = enemyTargetRef.current?.getBoundingClientRect();
    if (!enemyRect) return;

    const bossFountain = variant === "boss";
    const count = bossFountain ? 4 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 3);
    const originX = enemyRect.left + enemyRect.width / 2;
    const originY = enemyRect.top + enemyRect.height * (bossFountain ? .42 : .48);
    const floorY = enemyRect.top + enemyRect.height * .88;
    const seed = Date.now();
    if (!bossFountain) playCoinSound("drop");
    const coins = Array.from({ length: count }, (_, index): LootCoin => {
      const fallMs = (bossFountain ? 760 : 650) + Math.round(Math.random() * (bossFountain ? 260 : 190));
      const delayMs = index * 52 + Math.round(Math.random() * 45);
      return {
        id: seed + index + Math.random(),
        slot: vfxPoolCursorRef.current.coin++ % vfxBudget.coins,
        phase: "falling",
        startX: originX + (Math.random() - .5) * 18,
        startY: originY + (Math.random() - .5) * 12,
        landX: originX + (Math.random() - .5) * enemyRect.width * (bossFountain ? 1.62 : 1.08),
        landY: floorY - Math.random() * 9,
        collectStartX: 0,
        collectStartY: 0,
        targetX: 0,
        targetY: 0,
        arcHeight: bossFountain ? 105 + Math.random() * 125 : 58 + Math.random() * 72,
        delayMs,
        fallMs,
        groundLifetimeMs: bossFountain ? BOSS_COIN_GROUND_LIFETIME_MS : COIN_GROUND_LIFETIME_MS,
        spinDelayMs: -Math.round(Math.random() * 580),
        scale: (bossFountain ? .88 : .78) + Math.random() * (bossFountain ? .42 : .34),
      };
    });

    const visibleLimit = Math.min(bossFountain ? BOSS_COIN_VISIBLE_LIMIT : 24, vfxBudget.coins);
    setLootCoins((items) => {
      const occupiedSlots = new Set(coins.map((coin) => coin.slot));
      const reusableItems = items.filter((coin) => !occupiedSlots.has(coin.slot));
      return [...reusableItems.slice(-Math.max(0, visibleLimit - coins.length)), ...coins];
    });
    coins.forEach((coin) => {
      const landingTimer = window.setTimeout(() => {
        vfxTimersRef.current.delete(landingTimer);
        setLootCoins((items) => items.map((item) => item.id === coin.id && item.phase === "falling" ? { ...item, phase: "resting" } : item));
      }, coin.delayMs + coin.fallMs);
      const collectTimer = window.setTimeout(() => {
        vfxTimersRef.current.delete(collectTimer);
        collectLootCoin(coin.id);
      }, coin.delayMs + coin.fallMs + coin.groundLifetimeMs);
      vfxTimersRef.current.add(landingTimer);
      vfxTimersRef.current.add(collectTimer);
    });
  }, [collectLootCoin, playCoinSound, vfxBudget.coins]);

  const playBossCoinFountain = useCallback(() => {
    playBossJackpotSound();
    for (let wave = 0; wave < BOSS_COIN_FOUNTAIN_WAVES; wave += 1) {
      if (wave === 0) {
        spawnLootCoins("boss");
        continue;
      }
      const waveTimer = window.setTimeout(() => {
        vfxTimersRef.current.delete(waveTimer);
        spawnLootCoins("boss");
      }, wave * BOSS_COIN_WAVE_INTERVAL_MS);
      vfxTimersRef.current.add(waveTimer);
    }
  }, [playBossJackpotSound, spawnLootCoins]);

  const resolveCampaignBossVictory = useCallback((defeated: GameStateV3): GameStateV3 => {
    const defeatedZone = defeated.zone;
    const next = defeatCurrentEnemy(defeated);
    commit(next);
    enemySpawnedAtRef.current = Date.now();
    bossFailureLock.current = false;
    commitBossRewardAd(null);
    commitBossRewardBoost(false);
    showToast(`Босс побеждён! Открыт уровень ${defeatedZone + 1}`, "gold");
    void gameServices.analytics.track("boss_defeated", { zone: defeatedZone, time_left: defeated.bossTimeLeft });
    return next;
  }, [commit, commitBossRewardAd, commitBossRewardBoost, showToast]);

  const beginEnemyDeath = useCallback((lethalState: GameStateV3) => {
    if (enemyDyingRef.current) return;
    const campaignBossDefeated = isBossZone(lethalState.zone) && !testBossActiveRef.current;
    const newlyUnlockedDungeon = campaignBossDefeated
      && lethalState.combatAnnouncedDungeonIds.length < MAX_DUNGEON_GUIDE_SHOWS
      ? DUNGEON_CHALLENGES.find((dungeon) =>
          dungeon.bossZone === lethalState.zone
          && !lethalState.combatAnnouncedDungeonIds.includes(dungeon.id)) ?? null
      : null;
    enemyDyingRef.current = true;
    setEnemyDying(true);
    if (!testBossActiveRef.current) {
      if (campaignBossDefeated) {
        playBossCoinFountain();
      } else {
        spawnLootCoins();
      }
    }
    commit({
      ...lethalState,
      enemyHp: 0,
      combatAnnouncedDungeonIds: newlyUnlockedDungeon
        ? [...lethalState.combatAnnouncedDungeonIds, newlyUnlockedDungeon.id]
        : lethalState.combatAnnouncedDungeonIds,
    });
    if (newlyUnlockedDungeon) setNewDungeonGuide({ dungeonId: newlyUnlockedDungeon.id });

    deathTimerRef.current = window.setTimeout(() => {
      const defeated = gameRef.current;
      const defeatedZone = defeated.zone;
      const defeatedBoss = isBossZone(defeatedZone);
      enemyDyingRef.current = false;
      setEnemyDying(false);
      deathTimerRef.current = null;
      if (testBossActiveRef.current) {
        finishTestBossAttempt("TestBoss побеждён — проверка завершена", "gold");
        void gameServices.analytics.track("test_boss_defeated", { time_left: defeated.bossTimeLeft });
        return;
      }
      if (defeatedBoss) {
        resolveCampaignBossVictory(defeated);
        return;
      }
      const next = defeatCurrentEnemy(defeated);
      commit(next);
      enemySpawnedAtRef.current = Date.now();
    }, campaignBossDefeated ? BOSS_VICTORY_FREEZE_MS : NORMAL_DEATH_STATE_MS);
  }, [commit, finishTestBossAttempt, playBossCoinFountain, resolveCampaignBossVictory, spawnLootCoins]);

  const finishDungeonVictory = useCallback((attempt: DungeonAttempt) => {
    const dungeon = getDungeonDefinition(attempt.dungeonId);
    const current = gameRef.current;
    const reward = getGoldRewardWithBonuses(current, dungeon.reward);
    const cooldownUntil = Date.now() + DUNGEON_COOLDOWN_SEC * 1000;
    commit({
      ...current,
      gold: current.gold + reward,
      totalGoldEarned: current.totalGoldEarned + reward,
      dungeonCooldowns: { ...current.dungeonCooldowns, [dungeon.id]: cooldownUntil },
    });
    playBossCoinFountain();
    showToast(`${dungeon.name} побеждён — награда ${formatNumber(reward)} монет`, "gold");
    commitDungeon({ ...attempt, hp: 0, status: "won" });
    if (dungeonVictoryReturnTimerRef.current !== null) window.clearTimeout(dungeonVictoryReturnTimerRef.current);
    dungeonVictoryReturnTimerRef.current = window.setTimeout(() => {
      dungeonVictoryReturnTimerRef.current = null;
      const latestAttempt = dungeonAttemptRef.current;
      if (!latestAttempt || latestAttempt.dungeonId !== attempt.dungeonId || latestAttempt.status !== "won") return;
      clearPendingVfx();
      commitDungeon(null);
      setDungeonRewardAdPending(false);
      setSelectedMapRegionId(null);
      setMapOpen(false);
      lastTickAt.current = Date.now();
      enemySpawnedAtRef.current = Date.now();
    }, DUNGEON_VICTORY_RETURN_MS);
    void gameServices.analytics.track("dungeon_completed", {
      dungeon_id: dungeon.id,
      rewarded_boost: attempt.rewardedBoost,
      reward,
      cooldown_seconds: DUNGEON_COOLDOWN_SEC,
    });
  }, [commit, commitDungeon, playBossCoinFountain, showToast]);

  const getRandomAbilityTarget = useCallback(() => {
    const points = enemyBodyPointsRef.current;
    const body = points[Math.floor(Math.random() * points.length)] ?? { x: 50, y: 50 };
    const enemyRect = enemyTargetRef.current?.getBoundingClientRect();
    const arenaRect = enemyTargetRef.current?.closest<HTMLElement>(".arena")?.getBoundingClientRect();
    if (!enemyRect || !arenaRect || arenaRect.width <= 0 || arenaRect.height <= 0) {
      return { bodyX: body.x, bodyY: body.y, arenaX: 50, arenaY: 50 };
    }
    return {
      bodyX: body.x,
      bodyY: body.y,
      arenaX: (enemyRect.left + enemyRect.width * body.x / 100 - arenaRect.left) / arenaRect.width * 100,
      arenaY: (enemyRect.top + enemyRect.height * body.y / 100 - arenaRect.top) / arenaRect.height * 100,
    };
  }, []);

  const launchIceRainProjectile = useCallback(() => {
    const currentGame = gameRef.current;
    if (currentGame.iceRainActiveUntil <= Date.now() || bossRewardAdRef.current || enemyDyingRef.current) return;
    const currentAttempt = dungeonAttemptRef.current;
    if (currentAttempt && currentAttempt.status !== "fighting") return;

    const id = Date.now() + Math.random();
    const slot = vfxPoolCursorRef.current.iceRain++ % vfxBudget.iceRainShots;
    const target = getRandomAbilityTarget();
    const startX = target.arenaX - 14 + Math.random() * 28;
    const targetX = target.arenaX;
    const targetY = target.arenaY;
    const impactX = target.bodyX;
    const impactY = target.bodyY;
    const arenaRect = enemyTargetRef.current?.closest<HTMLElement>(".arena")?.getBoundingClientRect();
    const angle = Math.atan2((targetY + 7) * (arenaRect?.height ?? 1), (targetX - startX) * (arenaRect?.width ?? 1)) * 180 / Math.PI;
    const targetZone = currentGame.zone;
    const targetEnemySerial = currentGame.enemySerial;
    const targetDungeonId = currentAttempt?.dungeonId ?? null;

    setIceRainShots((items) => [...items.filter((shot) => shot.slot !== slot).slice(-(vfxBudget.iceRainShots - 1)), { id, slot, startX, targetX, targetY, angle }]);
    const hitTimer = window.setTimeout(() => {
      vfxTimersRef.current.delete(hitTimer);
      setIceRainShots((items) => items.filter((shot) => shot.id !== id));
      const latestGame = gameRef.current;
      const amount = getGlobalClickDamage(latestGame);
      const damageSlot = vfxPoolCursorRef.current.damage++ % vfxBudget.damageNumbers;
      const damageNumber: DamageNumber = {
        id,
        slot: damageSlot,
        amount,
        x: impactX,
        y: impactY,
        weaponId: "blue_weapon",
        color: WEAPONS.blue_weapon.color,
      };
      if (targetDungeonId) {
        const latestAttempt = dungeonAttemptRef.current;
        if (!latestAttempt || latestAttempt.dungeonId !== targetDungeonId || latestAttempt.status !== "fighting") return;
        setDamageNumbers((items) => [...items.filter((number) => number.slot !== damageSlot).slice(-(vfxBudget.damageNumbers - 1)), damageNumber]);
        const next = damageDungeon(latestAttempt, amount);
        if (next.status === "won") finishDungeonVictory(next);
        else commitDungeon(next);
      } else {
        if (dungeonAttemptRef.current || enemyDyingRef.current || bossRewardAdRef.current
          || latestGame.zone !== targetZone || latestGame.enemySerial !== targetEnemySerial) return;
        setDamageNumbers((items) => [...items.filter((number) => number.slot !== damageSlot).slice(-(vfxBudget.damageNumbers - 1)), damageNumber]);
        if (amount >= latestGame.enemyHp) beginEnemyDeath(latestGame);
        else commit(damageEnemy(latestGame, amount));
      }
      audioRef.current?.playImpact("blue_weapon");

      const impactTimer = window.setTimeout(() => {
        vfxTimersRef.current.delete(impactTimer);
        setDamageNumbers((items) => items.filter((number) => number.id !== id));
      }, DAMAGE_NUMBER_LIFE_MS);
      vfxTimersRef.current.add(impactTimer);
    }, ICE_RAIN_PROJECTILE_TRAVEL_MS);
    vfxTimersRef.current.add(hitTimer);
  }, [beginEnemyDeath, commit, commitDungeon, finishDungeonVictory, getRandomAbilityTarget, vfxBudget.damageNumbers, vfxBudget.iceRainShots]);

  const strikeWithCombatAbility = useCallback((kind: CombatAbilityId, volleys: number) => {
    const current = gameRef.current;
    const attempt = dungeonAttemptRef.current;
    if (enemyDyingRef.current || bossRewardAdRef.current || (attempt && attempt.status !== "fighting")) return;
    const spec = COMBAT_ABILITIES[kind];
    const boostedDps = getTotalArsenalDps(current) * (current.dpsBoostUntil > Date.now() ? 2 : 1);
    const amount = boostedDps * spec.dpsPerHit * spec.hitsPerVolley * volleys;
    if (amount <= 0) return;
    const now = Date.now();
    const id = now + Math.random();
    const damageSlot = vfxPoolCursorRef.current.damage++ % vfxBudget.damageNumbers;
    setDamageNumbers((items) => [...items.filter((item) => item.slot !== damageSlot).slice(-(vfxBudget.damageNumbers - 1)), {
      id, slot: damageSlot, amount, x: 30 + Math.random() * 40, y: 20 + Math.random() * 45,
      ability: kind, weaponId: spec.weaponId, color: kind === "abyss" ? "#ce7bff" : "#87e6ff",
    }]);
    if (kind === "abyss") {
      const visibleShots = resolvedGraphicsQuality === "economy" ? 3 : resolvedGraphicsQuality === "medium" ? 6 : 10;
      const shuffledEyes = [...ABYSS_EYE_POSITIONS];
      for (let index = shuffledEyes.length - 1; index > 0; index -= 1) {
        const other = Math.floor(Math.random() * (index + 1));
        [shuffledEyes[index], shuffledEyes[other]] = [shuffledEyes[other], shuffledEyes[index]];
      }
      const arenaRect = enemyTargetRef.current?.closest<HTMLElement>(".arena")?.getBoundingClientRect();
      const strikes = Array.from({ length: visibleShots }, (_, index): AbilityStrike => {
        const eye = shuffledEyes[index];
        const target = getRandomAbilityTarget();
        const startX = eye.x;
        const startY = eye.y;
        const targetX = target.arenaX;
        const targetY = target.arenaY;
        return {
          id: id + index, kind, startX, startY, targetX, targetY,
          impactX: target.bodyX, impactY: target.bodyY, delayMs: Math.round(Math.random() * 150),
          angle: Math.atan2((targetY - startY) * (arenaRect?.height ?? 1), (targetX - startX) * (arenaRect?.width ?? 1)) * 180 / Math.PI,
        };
      });
      setAbilityStrikes((items) => [...items, ...strikes].slice(-30));
      strikes.forEach((strike) => {
        const arrivalTimer = window.setTimeout(() => {
          vfxTimersRef.current.delete(arrivalTimer);
          const latest = gameRef.current;
          const latestAttempt = dungeonAttemptRef.current;
          if (document.hidden || latest.zone !== current.zone || latest.enemySerial !== current.enemySerial
            || latestAttempt?.dungeonId !== attempt?.dungeonId) return;
          const impact: AbilityImpact = {
            id: strike.id,
            weaponId: "void_weapon",
            color: WEAPONS.void_weapon.color,
            x: strike.impactX,
            y: strike.impactY,
          };
          audioRef.current?.playImpact("void_weapon");
          setAbilityImpacts((items) => [...items, impact].slice(-24));
          const impactTimer = window.setTimeout(() => {
            vfxTimersRef.current.delete(impactTimer);
            setAbilityImpacts((items) => items.filter((item) => item.id !== impact.id));
          }, 620);
          vfxTimersRef.current.add(impactTimer);
        }, 200 + strike.delayMs);
        vfxTimersRef.current.add(arrivalTimer);
      });
      const visualTimer = window.setTimeout(() => {
        vfxTimersRef.current.delete(visualTimer);
        setAbilityStrikes((items) => items.filter((item) => !strikes.some((strike) => strike.id === item.id)));
      }, 380);
      vfxTimersRef.current.add(visualTimer);
    }
    const numberTimer = window.setTimeout(() => {
      vfxTimersRef.current.delete(numberTimer);
      setDamageNumbers((items) => items.filter((item) => item.id !== id));
    }, DAMAGE_NUMBER_LIFE_MS);
    vfxTimersRef.current.add(numberTimer);
    if (attempt) {
      const next = damageDungeon(attempt, amount);
      if (next.status === "won") finishDungeonVictory(next);
      else commitDungeon(next);
    } else if (amount >= current.enemyHp) beginEnemyDeath(current);
    else commit(damageEnemy(current, amount));
  }, [beginEnemyDeath, commit, commitDungeon, finishDungeonVictory, getRandomAbilityTarget, resolvedGraphicsQuality, vfxBudget.damageNumbers]);

  // Visual cadence is independent of the wolf's unchanged 200 ms damage timer.
  useEffect(() => {
    if (!gameStarted || mapOpen || pageHidden || platformPaused || game.combatAbilities.wolf.activeUntil <= Date.now()) return;
    let nextTimer: number | undefined;
    let fadeTimer: number | undefined;
    const showClaws = () => {
      const now = Date.now();
      const current = gameRef.current;
      const attempt = dungeonAttemptRef.current;
      if (current.combatAbilities.wolf.activeUntil <= now) return;
      const canShow = !enemyDyingRef.current && !bossRewardAdRef.current
        && current.weapons.relic_weapon.purchasedUpgradeIds.includes("relic_150")
        && (!attempt || attempt.status === "fighting");
      if (!canShow) {
        nextTimer = window.setTimeout(showClaws, 100);
        return;
      }
      const points = enemyBodyPointsRef.current;
      const point = points[Math.floor(Math.random() * points.length)];
      const id = now + Math.random();
      setWolfImpact({ id, ...point, angle: -55 + Math.random() * 110 });
      fadeTimer = window.setTimeout(() => setWolfImpact((impact) => impact?.id === id ? null : impact), WOLF_IMPACT_LIFE_MS);
      nextTimer = window.setTimeout(showClaws, nextWolfImpactDelay());
    };
    nextTimer = window.setTimeout(showClaws, COMBAT_ABILITIES.wolf.intervalMs);
    return () => {
      window.clearTimeout(nextTimer);
      window.clearTimeout(fadeTimer);
      setWolfImpact(null);
    };
  }, [gameStarted, game.combatAbilities.wolf.activeUntil, mapOpen, pageHidden, platformPaused]);

  useEffect(() => () => {
    if (deathTimerRef.current !== null) window.clearTimeout(deathTimerRef.current);
    if (dungeonVictoryReturnTimerRef.current !== null) window.clearTimeout(dungeonVictoryReturnTimerRef.current);
    if (upgradePulseTimerRef.current !== null) window.clearTimeout(upgradePulseTimerRef.current);
    if (weaponLevelPulseTimerRef.current !== null) window.clearTimeout(weaponLevelPulseTimerRef.current);
    if (abilityUnlockHoldTimerRef.current !== null) window.clearTimeout(abilityUnlockHoldTimerRef.current);
    if (abilityUnlockFlightTimerRef.current !== null) window.clearTimeout(abilityUnlockFlightTimerRef.current);
    if (abilityTooltipTimerRef.current !== null) window.clearTimeout(abilityTooltipTimerRef.current);
    vfxTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    vfxTimersRef.current.clear();
  }, []);

  useEffect(() => {
    let audio: GameAudio | null = null;
    try { audio = new GameAudio(publicAssetUrl); } catch { /* Audio is optional. */ }
    audioRef.current = audio;
    return () => { audio?.dispose(); audioRef.current = null; };
  }, []);

  useEffect(() => {
    audioRef.current?.setVolumes(musicVolume, effectsVolume);
    writeLocalStorage(AUDIO_VOLUME_KEYS.music, String(musicVolume));
    writeLocalStorage(AUDIO_VOLUME_KEYS.effects, String(effectsVolume));
  }, [musicVolume, effectsVolume]);

  useEffect(() => {
    const running = gameStarted && soundEnabled && !pageHidden && windowFocused && !platformPaused;
    audioRef.current?.setRunning(running);
    const unlock = () => { if (running) audioRef.current?.setRunning(true); };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, [gameStarted, soundEnabled, pageHidden, platformPaused, windowFocused]);

  useEffect(() => {
    writeGraphicsQuality(graphicsQuality);
  }, [graphicsQuality]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      setPageHidden(hidden);
      if (hidden) {
        audioRef.current?.setRunning(false);
        if (!testBossActiveRef.current) {
          const current = gameRef.current;
          const safeState = enemyDyingRef.current && current.enemyHp <= 0
            ? defeatCurrentEnemy(current)
            : current;
          gameServices.saves.scheduleSave(safeState);
          void gameServices.saves.flush();
        }
      } else {
        resumeAfkCatchUpRef.current = true;
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    const handleBlur = () => {
      setWindowFocused(false);
      audioRef.current?.setRunning(false);
      if (!testBossActiveRef.current) {
        gameServices.saves.scheduleSave(gameRef.current);
        void gameServices.saves.flush();
      }
    };
    const handleFocus = () => {
      resumeAfkCatchUpRef.current = true;
      lastTickAt.current = Date.now();
      setWindowFocused(true);
    };
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    if (!settingsOpen && !shopOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSettingsOpen(false);
      setShopOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [settingsOpen, shopOpen]);

  useEffect(() => {
    const pause = () => setPlatformPaused(true);
    const resume = () => { lastTickAt.current = Date.now(); setPlatformPaused(false); };
    window.addEventListener("mage:platform-pause", pause);
    window.addEventListener("mage:platform-resume", resume);
    return () => {
      window.removeEventListener("mage:platform-pause", pause);
      window.removeEventListener("mage:platform-resume", resume);
    };
  }, []);

  useEffect(() => {
    if (hydrated && startAssetsReady) platformBridge.loadingFinished();
  }, [hydrated, startAssetsReady]);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      try {
        const saved = await gameServices.saves.load<unknown>();
        if (!active) return;
        const restored = normalizeGameState(saved);
        gameRef.current = restored;
        setGame(restored);
        if (saved && typeof saved === "object") {
          const previous = saved as { version?: unknown; highestZone?: unknown; gold?: unknown };
          const balanceWasCompressed = Number(previous.version) === 3 && (
            restored.highestZone < Number(previous.highestZone)
            || restored.gold < Number(previous.gold)
          );
          if (balanceWasCompressed) showToast("Баланс замедлен: завышенный прогресс мягко пересчитан", "info");
        }
      } catch {
        if (!active) return;
        await gameServices.saves.clear();
        const fresh = createInitialGameState();
        gameRef.current = fresh;
        setGame(fresh);
        showToast("Сохранение восстановлено: начато новое очищение", "danger");
      } finally {
        if (active) { lastTickAt.current = Date.now(); enemySpawnedAtRef.current = Date.now(); setHydrated(true); }
      }
    };
    void hydrate();
    return () => { active = false; };
  }, [showToast]);

  useEffect(() => {
    setFtueShown(readLocalStorage(FTUE_STORAGE_KEY) === "1");
  }, []);

  useEffect(() => {
    if (__POKI_PRODUCTION__) return;
    const cartridge = gameServices.testProgress.load<unknown>();
    if (!cartridge) {
      setTestProgressInfo(null);
      return;
    }
    const saved = normalizeGameState(cartridge.data);
    setTestProgressInfo({ savedAt: cartridge.savedAt, zone: saved.zone, highestZone: saved.highestZone });
  }, []);

  useEffect(() => {
    if (!hydrated || gameStarted) return;
    let active = true;
    setStartAssetsReady(false);
    const timeout = window.setTimeout(() => {
      if (active) setStartAssetsReady(true);
    }, 6_000);

    void Promise.allSettled(getCriticalCombatArt(gameRef.current).map(preloadImage)).then(() => {
      if (!active) return;
      window.clearTimeout(timeout);
      setStartAssetsReady(true);
      void Promise.allSettled(getNextCombatArt(gameRef.current).map(preloadImage));
    });

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [gameStarted, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const currentArt = getCriticalCombatArt(game);
    void Promise.allSettled([...currentArt, ...getNextCombatArt(game)].map(preloadImage));
  }, [game.killsInZone, game.selectedWeaponId, game.zone, hydrated]);

  useEffect(() => {
    if (!gameStarted || !ftueInteractionStarted) return;
    const nextStep = ftueStep === "enemy"
      ? "gold"
      : ftueStep === "gold"
        ? "auto-upgrade"
        : ftueStep === "auto-upgrade"
          ? "manual-upgrade"
          : ftueStep === "manual-upgrade"
            ? "await-zone"
            : null;
    if (!nextStep) return;
    const timer = window.setTimeout(() => setFtueStep(nextStep), FTUE_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [ftueInteractionStarted, ftueStep, gameStarted]);

  useEffect(() => {
    if (gameStarted && ftueStep === "await-zone" && game.totalKills >= ftueZoneGoalKillsRef.current) {
      setFtueStep("next-zone");
    }
  }, [ftueStep, game.totalKills, gameStarted]);

  const updateFtueGuidePosition = useCallback(() => {
    const target = ftueStep === "enemy"
      ? enemyTargetRef.current
      : ftueStep === "gold"
        ? walletRef.current
        : ftueStep === "auto-upgrade"
          ? weaponLevelButtonRef.current
          : ftueStep === "manual-upgrade"
            ? clickLevelButtonRef.current
          : ftueStep === "next-zone"
            ? nextZoneButtonRef.current
            : null;
    if (!target) {
      setFtueGuidePosition(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    if (ftueStep === "enemy") {
      setFtueGuidePosition({ left: rect.left + 12, top: rect.top + rect.height * .46, direction: "right" });
    } else if (ftueStep === "auto-upgrade" || ftueStep === "manual-upgrade") {
      setFtueGuidePosition({ left: rect.right + 18, top: rect.top + rect.height / 2, direction: "left" });
    } else {
      setFtueGuidePosition({ left: rect.left + rect.width / 2, top: rect.bottom + 18, direction: "up" });
    }
  }, [ftueStep]);

  useEffect(() => {
    const visible = gameStarted && !mapOpen && !shopOpen && (ftueStep === "enemy" || ftueStep === "gold" || ftueStep === "auto-upgrade" || ftueStep === "manual-upgrade" || ftueStep === "next-zone");
    if (!visible) {
      setFtueGuidePosition(null);
      return;
    }
    const frame = window.requestAnimationFrame(updateFtueGuidePosition);
    window.addEventListener("resize", updateFtueGuidePosition);
    window.visualViewport?.addEventListener("resize", updateFtueGuidePosition);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateFtueGuidePosition);
      window.visualViewport?.removeEventListener("resize", updateFtueGuidePosition);
    };
  }, [ftueStep, game.highestZone, game.zone, gameStarted, mapOpen, shopOpen, updateFtueGuidePosition]);

  useEffect(() => {
    if (!newDungeonGuide || !gameStarted || mapOpen) {
      setNewDungeonGuidePosition(null);
      return;
    }
    const updatePosition = () => {
      const target = mapButtonRef.current;
      if (!target) {
        setNewDungeonGuidePosition(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      setNewDungeonGuidePosition({
        left: rect.left + rect.width / 2,
        top: rect.bottom + 18,
        direction: "up",
      });
    };
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("resize", updatePosition);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("resize", updatePosition);
    };
  }, [gameStarted, mapOpen, newDungeonGuide]);

  useEffect(() => {
    if (!newDungeonGuide) return;
    const announcedDungeon = getDungeonDefinition(newDungeonGuide.dungeonId);
    const remainsInUnlockContext = announcedDungeon
      && (game.zone === announcedDungeon.bossZone || game.zone === announcedDungeon.bossZone - 1);
    if (!announcedDungeon
      || announcedDungeon.regionId !== getMapRegionForZone(game.zone).id
      || !remainsInUnlockContext) {
      setNewDungeonGuide(null);
    }
  }, [game.zone, newDungeonGuide]);

  useEffect(() => {
    if (!newDungeonGuide) return;
    const timer = window.setTimeout(() => setNewDungeonGuide(null), NEW_DUNGEON_GUIDE_MS);
    return () => window.clearTimeout(timer);
  }, [newDungeonGuide]);

  useEffect(() => {
    if (!hydrated) return;
    const saveCurrentGame = () => {
      if (!testBossActiveRef.current && !enemyDyingRef.current) gameServices.saves.scheduleSave(gameRef.current);
    };
    saveCurrentGame();
    const timer = window.setInterval(saveCurrentGame, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [hydrated]);

  useEffect(() => {
    const flush = () => {
      if (!testBossActiveRef.current) {
        const current = gameRef.current;
        const safeState = enemyDyingRef.current && current.enemyHp <= 0
          ? defeatCurrentEnemy(current)
          : current;
        gameServices.saves.scheduleSave(safeState);
      }
      void gameServices.saves.flush();
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  useEffect(() => {
    if (!hydrated || !gameStarted || platformPaused || !windowFocused) return;
    const startedAt = Date.now();
    lastTickAt.current = startedAt;
    lastPublishedAt.current = startedAt;
    dungeonLastTickAt.current = startedAt;

    const heartbeat = () => {
      const now = Date.now();
      const realElapsed = Math.max(0, (now - lastTickAt.current) / 1000);
      const afkTick = document.hidden || resumeAfkCatchUpRef.current || realElapsed > 1;
      const elapsed = afkTick ? realElapsed : Math.min(.25, realElapsed);
      resumeAfkCatchUpRef.current = false;
      lastTickAt.current = now;
      dungeonLastTickAt.current = now;

      playTimeRemainderRef.current += elapsed;
      const wholePlaySeconds = Math.floor(playTimeRemainderRef.current);
      if (wholePlaySeconds > 0) {
        playTimeRemainderRef.current -= wholePlaySeconds;
        gameRef.current = { ...gameRef.current, playSeconds: gameRef.current.playSeconds + wholePlaySeconds };
      }

      // A throttled death animation must not hold up the whole background farm.
      if (afkTick && enemyDyingRef.current && !testBossActiveRef.current) {
        if (deathTimerRef.current !== null) window.clearTimeout(deathTimerRef.current);
        deathTimerRef.current = null;
        enemyDyingRef.current = false;
        setEnemyDying(false);
        const defeated = gameRef.current;
        gameRef.current = defeatCurrentEnemy(defeated);
        if (isBossZone(defeated.zone)) commitBossRewardBoost(false);
      }

      const currentAttempt = dungeonAttemptRef.current;
      if (currentAttempt?.status === "fighting") {
        const currentGame = gameRef.current;
        const globalBoostMultiplier = currentGame.dpsBoostUntil > now && !currentAttempt.rewardedBoost ? 2 : 1;
        const next = advanceDungeon(currentAttempt, getTotalArsenalDps(currentGame) * globalBoostMultiplier, elapsed);
        dungeonAttemptRef.current = next;
        if (next.status === "won") {
          finishDungeonVictory(next);
        } else if (next.status === "failed") {
          commitDungeon(next);
          showToast("Время вышло. Усильте DPS рекламой или вернитесь позже", "danger");
          void gameServices.analytics.track("dungeon_failed", { dungeon_id: next.dungeonId });
        }
      } else if (!currentAttempt && !mapOpen && !bossRewardAdRef.current && !enemyDyingRef.current) {
        const current = gameRef.current;
        if (afkTick || isBossZone(current.zone) || now - enemySpawnedAtRef.current >= MIN_ENEMY_VISIBLE_MS) {
          const bossBoostMultiplier = isBossZone(current.zone) && bossRewardBoostActiveRef.current
            ? getBossBoostDamageMultiplier(current.bossTimeLeft)
            : 1;
          const autoDps = getTotalArsenalDps(current) * (current.dpsBoostUntil > now ? 2 : 1) * bossBoostMultiplier;
          const autoDamage = autoDps * elapsed;

          if (afkTick && !testBossActiveRef.current) {
            const afkDps = getAfkDamage(current, now - elapsed * 1000, now) / Math.max(elapsed, Number.EPSILON);
            gameRef.current = advanceAfkCombat(current, afkDps * bossBoostMultiplier, elapsed);
            if (gameRef.current.enemySerial !== current.enemySerial) enemySpawnedAtRef.current = now;
            if (gameRef.current.zone !== current.zone) commitBossRewardBoost(false);
            bossFailureLock.current = false;
          } else if (isBossZone(current.zone)) {
            if (current.bossTimeLeft <= elapsed && autoDamage < current.enemyHp) {
              if (!bossFailureLock.current) {
                bossFailureLock.current = true;
                if (bossRewardBoostActiveRef.current) {
                  if (testBossActiveRef.current) {
                    finishTestBossAttempt(`Дополнительные ${BOSS_BOOST_DURATION_SEC} секунд закончились — проверка завершена`, "danger");
                    void gameServices.analytics.track("test_boss_failed", { reason: "rewarded_time_expired" });
                  } else {
                    commitBossRewardBoost(false);
                    const failed = failBoss(current);
                    commit(failed);
                    enemySpawnedAtRef.current = now;
                    showToast(`Дополнительные ${BOSS_BOOST_DURATION_SEC} секунд закончились — возвращение в зону ${failed.zone}`, "danger");
                    void gameServices.analytics.track("boss_failed", { zone: current.zone, reason: "rewarded_time_expired" });
                  }
                } else {
                  commit({ ...current, bossTimeLeft: 0 });
                  clearPendingVfx();
                  setAbilityAd(null);
                  commitBossRewardAd({ zone: current.zone, started: false, readyAt: 0, sdkFinished: false, sdkFailed: false });
                  void gameServices.analytics.track("boss_rewarded_offer", { zone: current.zone });
                }
              }
              return;
            } else {
              const timed = { ...current, bossTimeLeft: Math.max(0, current.bossTimeLeft - elapsed) };
              if (autoDamage >= timed.enemyHp) beginEnemyDeath(timed);
              else gameRef.current = damageEnemy(timed, autoDamage);
            }
          } else {
            bossFailureLock.current = false;
            if (autoDamage >= current.enemyHp) beginEnemyDeath(current);
            else gameRef.current = damageEnemy(current, autoDamage);
          }
        }
      }

      const latestGame = gameRef.current;
      const iceRainCanFire = latestGame.iceRainActiveUntil > now
        && !afkTick
        && !mapOpen
        && !bossRewardAdRef.current
        && !enemyDyingRef.current
        && (!dungeonAttemptRef.current || dungeonAttemptRef.current.status === "fighting");
      if (iceRainCanFire && now - lastIceRainShotAtRef.current >= ICE_RAIN_INTERVAL_MS) {
        // Preserve the fractional interval so the slower mobile heartbeat does not halve the volley rate.
        lastIceRainShotAtRef.current = now - (now - lastIceRainShotAtRef.current) % ICE_RAIN_INTERVAL_MS;
        for (let projectile = 0; projectile < ICE_RAIN_PROJECTILES_PER_VOLLEY; projectile += 1) {
          launchIceRainProjectile();
        }
      }

      for (const id of ["abyss", "wolf"] as const) {
        const current = gameRef.current;
        const spec = COMBAT_ABILITIES[id];
        const canAttack = !afkTick && !mapOpen && !bossRewardAdRef.current && !enemyDyingRef.current
          && (!dungeonAttemptRef.current || dungeonAttemptRef.current.status === "fighting")
          && current.weapons[spec.weaponId].purchasedUpgradeIds.includes(spec.upgradeId)
          && (Boolean(dungeonAttemptRef.current) || isBossZone(current.zone) || now - enemySpawnedAtRef.current >= MIN_ENEMY_VISIBLE_MS);
        const result = consumeCombatAbilityHits(id, current.combatAbilities[id], now, canAttack);
        if (result.timer !== current.combatAbilities[id]) {
          gameRef.current = { ...current, combatAbilities: { ...current.combatAbilities, [id]: result.timer } };
        }
        if (result.hits > 0) strikeWithCombatAbility(id, result.hits);
      }

      if (now - lastPublishedAt.current >= CLOCK_TICK_MS) {
        lastPublishedAt.current = now;
        setClock(now);
        setGame(gameRef.current);
        setDungeonAttempt(dungeonAttemptRef.current);
      }
    };

    const timer = window.setInterval(heartbeat, COMBAT_TICK_MS);
    return () => window.clearInterval(timer);
  }, [beginEnemyDeath, commit, commitBossRewardAd, commitBossRewardBoost, commitDungeon, finishDungeonVictory, finishTestBossAttempt, gameStarted, hydrated, launchIceRainProjectile, strikeWithCombatAbility, mapOpen, platformPaused, showToast, windowFocused]);

  useEffect(() => {
    if (hydrated) visitedZonesRef.current.add(game.zone);
  }, [game.zone, hydrated]);

  const totalDps = getTotalArsenalDps(game);
  const clickDamage = getGlobalClickDamage(game);
  const selectedWeapon = WEAPONS[game.selectedWeaponId];
  const biome = getMapRegionForZone(game.zone);
  const boss = isBossZone(game.zone);
  const abilityAdRemaining = abilityAd ? Math.max(0, (abilityAd.readyAt - clock) / 1000) : 0;
  const abilityAdReady = Boolean(abilityAd && abilityAdRemaining <= 0 && abilityAd.sdkFinished);
  const bossRewardAdRemaining = bossRewardAd ? Math.max(0, (bossRewardAd.readyAt - clock) / 1000) : 0;
  const bossRewardAdReady = Boolean(bossRewardAd?.started && bossRewardAdRemaining <= 0 && bossRewardAd.sdkFinished && !bossRewardAd.sdkFailed);
  const boostActive = game.dpsBoostUntil > clock;
  const boostRemaining = Math.max(0, (game.dpsBoostUntil - clock) / 1000);
  const abilityCooldown = Math.max(0, (game.abilityCooldownUntil - clock) / 1000);
  const unlockedWeaponAbilities = useMemo(() => WEAPON_LEVEL_150_ABILITIES.filter((ability) => (
    game.weapons[ability.weaponId].purchasedUpgradeIds.includes(ability.upgradeId)
  )), [game.weapons]);
  const iceRainUnlocked = isIceRainUnlocked(game.weapons.blue_weapon.purchasedUpgradeIds);
  const iceRainActive = iceRainUnlocked && game.iceRainActiveUntil > clock;
  const iceRainRemaining = Math.max(0, (game.iceRainActiveUntil - clock) / 1000);
  const iceRainCooldown = Math.max(0, (game.iceRainCooldownUntil - clock) / 1000);
  const manualCriticalUnlocked = game.clickPurchasedUpgradeIds.includes("manual_150");
  const manualCriticalActive = manualCriticalUnlocked && game.manualCriticalActiveUntil > clock;
  const manualCriticalRemaining = Math.max(0, (game.manualCriticalActiveUntil - clock) / 1000);
  const manualCriticalCooldown = Math.max(0, (game.manualCriticalCooldownUntil - clock) / 1000);
  const lockedAbilitySlotCount = Math.max(0, ABILITY_DOCK_SLOT_COUNT - 1 - unlockedWeaponAbilities.length - (manualCriticalUnlocked ? 1 : 0));
  const bossRewardBoostMultiplier = boss && bossRewardBoostActive
    ? getBossBoostDamageMultiplier(game.bossTimeLeft)
    : 1;
  const bossTimerLimit = bossRewardBoostActive
    ? BOSS_BOOST_DURATION_SEC
    : testBossActive ? TEST_BOSS_TIME_LIMIT_SEC : BOSS_TIME_LIMIT_SEC;
  const displayedDps = totalDps * (boostActive ? 2 : 1) * bossRewardBoostMultiplier;
  const enemyData = testBossActive ? TEST_BOSS_ENEMY : getEnemyForZone(game.zone, game.killsInZone);
  const enemyName = enemyData.name;
  const arenaBackground = getArenaBackground(game.zone);
  const currentZoneCompleted = !boss && game.zone < game.highestZone;
  const displayedZoneKills = currentZoneCompleted ? ENEMIES_PER_ZONE : Math.min(ENEMIES_PER_ZONE, game.killsInZone + 1);
  const hpPercent = Math.max(0, Math.min(100, game.enemyHp / game.enemyMaxHp * 100));
  const ftueNextZone = Math.min(game.highestZone, game.zone + 1);

  const zoneStrip = useMemo(() => {
    const start = Math.max(1, Math.min(game.zone - 3, Math.max(1, game.highestZone - 6)));
    return Array.from({ length: Math.min(7, game.highestZone) }, (_, index) => start + index)
      .filter((zone) => zone <= game.highestZone);
  }, [game.highestZone, game.zone]);

  const currentMapRegion = getMapRegionForZone(game.zone);
  const selectedMapRegion = selectedMapRegionId === null
    ? null
    : MAP_REGIONS.find((region) => region.id === selectedMapRegionId) ?? null;
  const selectedMapRegionIndex = selectedMapRegion
    ? ORDERED_MAP_REGIONS.findIndex((region) => region.id === selectedMapRegion.id)
    : -1;
  const previousMapRegion = selectedMapRegionIndex > 0
    ? ORDERED_MAP_REGIONS[selectedMapRegionIndex - 1]
    : null;
  const nextMapRegionCandidate = selectedMapRegionIndex >= 0 && selectedMapRegionIndex < ORDERED_MAP_REGIONS.length - 1
    ? ORDERED_MAP_REGIONS[selectedMapRegionIndex + 1]
    : null;
  const nextMapRegion = nextMapRegionCandidate && game.highestZone >= nextMapRegionCandidate.startZone
    ? nextMapRegionCandidate
    : null;
  const regionMapNodes = useMemo(() => {
    if (!selectedMapRegion) return [];
    const count = selectedMapRegion.endZone - selectedMapRegion.startZone + 1;
    return Array.from({ length: count }, (_, index) => {
      const point = mapPoint(selectedMapRegion.id, REGION_LAYOUTS[selectedMapRegion.id].route[index]);
      return {
        zone: selectedMapRegion.startZone + index,
        x: point.x,
        y: point.y,
      };
    });
  }, [selectedMapRegion]);
  const regionDungeons = selectedMapRegion
    ? DUNGEON_CHALLENGES
        .filter((dungeon) => dungeon.regionId === selectedMapRegion.id)
        .map((dungeon) => ({
          ...dungeon,
          ...mapPoint(selectedMapRegion.id, REGION_LAYOUTS[selectedMapRegion.id].dungeons[dungeon.slot - 1]),
        }))
    : [];
  const regionRoadPoints = regionMapNodes;
  const campaignBossInfoNode = mapBossInfo?.kind === "campaign"
    ? regionMapNodes.find((node) => node.zone === mapBossInfo.zone) ?? null
    : null;
  const dungeonBossInfo = mapBossInfo?.kind === "dungeon"
    ? regionDungeons.find((dungeon) => dungeon.id === mapBossInfo.dungeonId) ?? null
    : null;

  useEffect(() => {
    if ((rewardedAdCloseTarget === "ability" && !abilityAd) || (rewardedAdCloseTarget === "boss" && !bossRewardAd)) {
      setRewardedAdCloseTarget(null);
    }
  }, [abilityAd, bossRewardAd, rewardedAdCloseTarget]);

  useEffect(() => {
    const dungeonIsPlaying = !dungeonAttempt || dungeonAttempt.status === "fighting";
    const bossDeathSequence = isBossZone(game.zone) && enemyDying;
    const shouldPlay = hydrated && gameStarted && !mapOpen && !pageHidden && windowFocused && !platformPaused
      && !bossRewardAd && dungeonIsPlaying && !bossDeathSequence;
    if (shouldPlay) platformBridge.gameplayStart();
    else platformBridge.gameplayStop();
  }, [bossRewardAd, dungeonAttempt, enemyDying, game.zone, gameStarted, hydrated, mapOpen, pageHidden, platformPaused, windowFocused]);

  function clearPendingVfx() {
    vfxTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    vfxTimersRef.current.clear();
    collectingCoinIdsRef.current.clear();
    setShots([]);
    setIceRainShots([]);
    setAbilityStrikes([]);
    setAbilityImpacts([]);
    setWolfImpact(null);
    setDamageNumbers([]);
    setLootCoins([]);
  }

  function stopActiveGameSounds() {
    audioRef.current?.stopEffects();
  }

  function interruptEnemyDeath(resolveNormalKill: boolean): GameStateV3 {
    const current = gameRef.current;
    const wasDying = enemyDyingRef.current;
    if (deathTimerRef.current !== null) window.clearTimeout(deathTimerRef.current);
    deathTimerRef.current = null;
    enemyDyingRef.current = false;
    setEnemyDying(false);
    if (wasDying && resolveNormalKill && current.enemyHp <= 0 && !isBossZone(current.zone)) {
      return defeatCurrentEnemy(current);
    }
    return current;
  }

  function attack(event: MouseEvent<HTMLButtonElement>) {
    if (enemyDyingRef.current || bossRewardAdRef.current) return;
    if (ftueStep === "enemy" && !ftueInteractionStarted) {
      setFtueInteractionStarted(true);
      writeLocalStorage(FTUE_STORAGE_KEY, "1");
    }
    const current = gameRef.current;
    const targetRect = event.currentTarget.getBoundingClientRect();
    const stage = event.currentTarget.closest<HTMLElement>(".combat-stage");
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();
    const x = (event.clientX - targetRect.left) / targetRect.width * 100;
    const y = (event.clientY - targetRect.top) / targetRect.height * 100;
    const startX = 12;
    const startY = 52;
    const targetX = (event.clientX - stageRect.left) / stageRect.width * 100;
    const targetY = (event.clientY - stageRect.top) / stageRect.height * 100;
    const angle = Math.atan2(
      (targetY - startY) * stageRect.height,
      (targetX - startX) * stageRect.width,
    ) * 180 / Math.PI;
    const manualAttack = resolveManualAttack(getGlobalClickDamage(current), current, Date.now());
    const { amount } = manualAttack;
    const id = Date.now() + Math.random();
    const shotSlot = vfxPoolCursorRef.current.shot++ % vfxBudget.shots;
    commit({ ...current, totalClicks: current.totalClicks + 1 });
    setShots((items) => [...items.filter((item) => item.slot !== shotSlot).slice(-(vfxBudget.shots - 1)), {
      id,
      slot: shotSlot,
      color: WEAPONS[current.selectedWeaponId].color,
      weaponId: current.selectedWeaponId,
      startX,
      startY,
      targetX,
      targetY,
      angle,
    }]);

    const flightTimer = window.setTimeout(() => {
      vfxTimersRef.current.delete(flightTimer);
      setShots((items) => items.filter((item) => item.id !== id));
      const latest = gameRef.current;
      if (enemyDyingRef.current || bossRewardAdRef.current || latest.zone !== current.zone || latest.enemySerial !== current.enemySerial) return;
      audioRef.current?.playImpact(current.selectedWeaponId);

      const damageSlot = vfxPoolCursorRef.current.damage++ % vfxBudget.damageNumbers;
      setDamageNumbers((items) => [...items.filter((item) => item.slot !== damageSlot).slice(-(vfxBudget.damageNumbers - 1)), {
        id,
        slot: damageSlot,
        amount,
        x,
        y,
        weaponId: current.selectedWeaponId,
        color: WEAPONS[current.selectedWeaponId].color,
        critical: manualAttack.critical,
        doubleDamage: manualAttack.doubleDamage,
      }]);
      if (amount >= latest.enemyHp) beginEnemyDeath(latest);
      else commit(damageEnemy(latest, amount));

      const impactTimer = window.setTimeout(() => {
        vfxTimersRef.current.delete(impactTimer);
        setDamageNumbers((items) => items.filter((item) => item.id !== id));
      }, DAMAGE_NUMBER_LIFE_MS);
      vfxTimersRef.current.add(impactTimer);
    }, PROJECTILE_TRAVEL_MS);
    vfxTimersRef.current.add(flightTimer);
  }

  function purchaseWeapon(weaponId: WeaponId) {
    const current = gameRef.current;
    const wasOwned = current.weapons[weaponId].owned;
    const next = buyWeaponOrLevels(current, weaponId);
    if (next === current) return;
    commitProgress(next);
    const weapon = WEAPONS[weaponId];
    if (wasOwned) pulseWeaponLevel(weaponId);
    else showToast(`${weapon.name} добавлен в арсенал`, "gold");
    void gameServices.analytics.track(wasOwned ? "weapon_leveled" : "weapon_purchased", { weapon_id: weaponId, level: next.weapons[weaponId].level });
  }

  function purchaseUpgrade(weaponId: WeaponId, upgradeId: string) {
    const current = gameRef.current;
    const upgrade = WEAPONS[weaponId].upgrades.find((item) => item.id === upgradeId);
    const next = buyWeaponUpgrade(current, weaponId, upgradeId);
    if (next === current || !upgrade) return;
    commitProgress(next);
    if (upgrade.threshold === WEAPON_SPECIALIZATION_LEVEL) presentWeaponAbilityUnlock(weaponId);
    else showToast(`${upgrade.name}: DPS ×${upgrade.multiplier}`, "gold");
  }

  function purchaseManualWeaponUpgrade(upgradeId: string) {
    const current = gameRef.current;
    const upgrade = MANUAL_UPGRADES.find((item) => item.id === upgradeId);
    const next = buyManualUpgrade(current, upgradeId);
    if (next === current || !upgrade) return;
    commitProgress(next);
    setManualUpgradeTooltip(null);
    showToast(`${upgrade.name} открыто`, "gold");
    void gameServices.analytics.track("manual_upgrade_purchased", { upgrade_id: upgradeId, level: current.clickLevel });
  }

  function pulseLockedUpgrade(upgradeId: string) {
    if (upgradePulseTimerRef.current !== null) window.clearTimeout(upgradePulseTimerRef.current);
    setLockedUpgradePulseId(upgradeId);
    upgradePulseTimerRef.current = window.setTimeout(() => {
      setLockedUpgradePulseId(null);
      upgradePulseTimerRef.current = null;
    }, 500);
  }

  function showUpgradeTooltip(anchor: HTMLButtonElement, weaponId: WeaponId, upgradeId: string) {
    const rect = anchor.getBoundingClientRect();
    setUpgradeTooltip({ weaponId, upgradeId, left: rect.right + 7, top: rect.top + rect.height / 2 });
  }

  function showManualUpgradeTooltip(anchor: HTMLButtonElement, upgradeId: string) {
    const rect = anchor.getBoundingClientRect();
    setManualUpgradeTooltip({ upgradeId, left: rect.right + 7, top: rect.top + rect.height / 2 });
  }

  function showWeaponUnlockTooltip(anchor: HTMLElement, weaponId: WeaponId) {
    const rect = anchor.getBoundingClientRect();
    setWeaponUnlockTooltip({ weaponId, left: rect.right + 7, top: rect.top + rect.height / 2 });
  }

  function hideAbilityTooltip() {
    if (abilityTooltipTimerRef.current !== null) window.clearTimeout(abilityTooltipTimerRef.current);
    abilityTooltipTimerRef.current = null;
    setAbilityTooltip(null);
  }

  function showAbilityTooltip(anchor: HTMLElement, abilityId: AbilityTooltipId, touch: boolean) {
    if (abilityTooltipTimerRef.current !== null) window.clearTimeout(abilityTooltipTimerRef.current);
    abilityTooltipTimerRef.current = null;
    const rect = anchor.getBoundingClientRect();
    const placeAbove = touch || rect.bottom > window.innerHeight * .72;
    const tooltipHalfWidth = 116;
    if (placeAbove) {
      setAbilityTooltip({
        abilityId,
        left: Math.max(tooltipHalfWidth, Math.min(window.innerWidth - tooltipHalfWidth, rect.left + rect.width / 2)),
        top: Math.max(8, rect.top - 8),
        placement: "above",
      });
    } else {
      const preferredLeft = rect.right + 8;
      const left = preferredLeft + tooltipHalfWidth * 2 <= window.innerWidth - 8
        ? preferredLeft
        : Math.max(8, rect.left - tooltipHalfWidth * 2 - 8);
      setAbilityTooltip({
        abilityId,
        left,
        top: Math.max(82, Math.min(window.innerHeight - 82, rect.top + rect.height / 2)),
        placement: "side",
      });
    }
    if (touch) {
      abilityTooltipTimerRef.current = window.setTimeout(() => {
        setAbilityTooltip(null);
        abilityTooltipTimerRef.current = null;
      }, 4_000);
    }
  }

  function purchaseClickLevel() {
    const current = gameRef.current;
    const next = buyClickLevel(current);
    if (next === current) return;
    commitProgress(next);
    showToast(`Урон клика повышен до ${getGlobalClickDamage(next)}`, "info");
  }

  function selectWeaponVisual(weaponId: WeaponId) {
    const current = gameRef.current;
    if (!current.weapons[weaponId].owned) return;
    commitProgress({ ...current, selectedWeaponId: weaponId });
  }

  function setBulkAmount(bulkAmount: BulkAmount) {
    const current = gameRef.current;
    commitProgress({ ...current, bulkAmount });
  }

  function navigateToZone(zone: number) {
    hideAbilityTooltip();
    if (enemyDyingRef.current && isBossZone(gameRef.current.zone) && gameRef.current.enemyHp <= 0) return;
    if (isBossZone(zone) && zone < gameRef.current.highestZone) {
      showToast(`Босс уровня ${zone} уже повержен`, "info");
      return;
    }
    commitBossRewardAd(null);
    commitBossRewardBoost(false);
    let current = interruptEnemyDeath(true);
    if (isBossZone(current.zone) && zone !== current.zone) {
      const abandonedZone = current.zone;
      current = failBoss(current);
      showToast(`Испытание прервано — уровень ${abandonedZone} покинут`, "danger");
      void gameServices.analytics.track("boss_failed", { zone: abandonedZone, reason: "zone_exit" });
    }
    clearPendingVfx();
    if (zone === current.zone) {
      commit(current.enemyHp <= 0 ? enterZone(current, zone) : current);
      enemySpawnedAtRef.current = Date.now();
      return;
    }
    commit(enterZone(current, zone));
    enemySpawnedAtRef.current = Date.now();
    bossFailureLock.current = false;
    if (ftueStep === "next-zone") setFtueStep("done");
  }

  function openWorldMap() {
    hideAbilityTooltip();
    if (enemyDyingRef.current && isBossZone(gameRef.current.zone) && gameRef.current.enemyHp <= 0 && !testBossActiveRef.current) {
      if (deathTimerRef.current !== null) window.clearTimeout(deathTimerRef.current);
      deathTimerRef.current = null;
      enemyDyingRef.current = false;
      setEnemyDying(false);
      const completed = resolveCampaignBossVictory(gameRef.current);
      clearPendingVfx();
      stopActiveGameSounds();
      lastTickAt.current = Date.now();
      clearMapBossOverlays();
      setSelectedMapRegionId(getMapRegionForZone(completed.zone).id);
      setMapOpen(true);
      return;
    }
    if (testBossActiveRef.current) {
      finishTestBossAttempt("Проверка TestBoss прервана");
      return;
    }
    commitBossRewardAd(null);
    commitBossRewardBoost(false);
    let current = interruptEnemyDeath(true);
    clearPendingVfx();
    if (isBossZone(current.zone)) {
      const failed = failBoss(current);
      current = failed;
      commit(current);
      bossFailureLock.current = false;
      showToast(`Испытание прервано — возвращение в зону ${failed.zone}`, "danger");
      void gameServices.analytics.track("boss_failed", { zone: current.zone, reason: "map_exit" });
    } else {
      commit(current);
    }
    enemySpawnedAtRef.current = Date.now();
    lastTickAt.current = Date.now();
    clearMapBossOverlays();
    setSelectedMapRegionId(getMapRegionForZone(current.zone).id);
    setMapOpen(true);
  }

  function closeWorldMap() {
    lastTickAt.current = Date.now();
    clearMapBossOverlays();
    setSelectedMapRegionId(null);
    setMapOpen(false);
  }

  function showWholeWorldMap() {
    clearMapBossOverlays();
    setSelectedMapRegionId(null);
  }

  function clearMapBossOverlays() {
    setMapBossInfo(null);
    clearNewDungeonGuide();
  }

  function clearNewDungeonGuide() {
    setNewDungeonGuide(null);
  }

  function openMapRegion(regionId: number) {
    const region = MAP_REGIONS.find((candidate) => candidate.id === regionId);
    if (!region) return;
    if (gameRef.current.highestZone < region.startZone) {
      showToast(`Откроется после победы над боссом уровня ${region.unlockBossZone}`, "info");
      return;
    }
    clearMapBossOverlays();
    setSelectedMapRegionId(region.id);
    void gameServices.analytics.track("map_region_opened", {
      region_id: region.id,
      region_name: region.name,
      current_level: gameRef.current.zone,
    });
  }

  function selectZoneFromMap(zone: number) {
    if (zone > gameRef.current.highestZone) return;
    navigateToZone(zone);
    closeWorldMap();
  }

  function enterTestBoss() {
    const current = interruptEnemyDeath(true);
    clearPendingVfx();
    testBossReturnStateRef.current = current;
    commitTestBossActive(true);
    commitBossRewardAd(null);
    commitBossRewardBoost(false);
    bossFailureLock.current = false;
    commit({
      ...current,
      zone: TEST_BOSS_ZONE,
      killsInZone: 0,
      enemyHp: TEST_BOSS_HP,
      enemyMaxHp: TEST_BOSS_HP,
      enemySerial: current.enemySerial + 1,
      bossTimeLeft: TEST_BOSS_TIME_LIMIT_SEC,
    });
    setSelectedMapRegionId(null);
    setMapOpen(false);
    enemySpawnedAtRef.current = Date.now();
    lastTickAt.current = Date.now();
    showToast("TestBoss: 15 секунд до рекламного предложения", "danger");
    void gameServices.analytics.track("test_boss_started", { hp: TEST_BOSS_HP, time_limit: TEST_BOSS_TIME_LIMIT_SEC });
  }

  function grantAbilityReward() {
    const activation = createSuperclickActivation(Date.now());
    commit({
      ...gameRef.current,
      dpsBoostUntil: activation.activeUntil,
      abilityCooldownUntil: activation.cooldownUntil,
    });
    setAbilityAd(null);
    showToast("×2 DPS активно 3 минуты", "gold");
    void gameServices.analytics.track("ability_rewarded", {
      ability_id: "arsenal_overload",
      active_seconds: SUPERCLICK_DURATION_SEC,
      cooldown_seconds: SUPERCLICK_COOLDOWN_SEC,
    });
  }

  async function activateAbility() {
    const now = Date.now();
    const current = gameRef.current;
    if (abilityAd || abilityRewardAdPending || current.dpsBoostUntil > now || current.abilityCooldownUntil > now) return;
    void gameServices.analytics.track("ability_ad_started", { ability_id: "arsenal_overload" });

    if (!platformConfig.isLocal) {
      setAbilityRewardAdPending(true);
      const rewarded = await platformBridge.rewardedBreak();
      setAbilityRewardAdPending(false);
      if (rewarded) grantAbilityReward();
      else showToast("Реклама не завершена — способность не активирована", "danger");
      return;
    }

    const readyAt = now + SUPERCLICK_AD_DURATION_SEC * 1000;
    setAbilityAd({ readyAt, sdkFinished: true });
  }

  function confirmAbilityActivation() {
    if (!abilityAd || !abilityAdReady) return;
    grantAbilityReward();
  }

  function confirmRewardedAdClose() {
    const target = rewardedAdCloseTarget;
    setRewardedAdCloseTarget(null);
    if (target === "ability") {
      setAbilityAd(null);
      showToast("Реклама закрыта — награда не получена", "danger");
      void gameServices.analytics.track("ability_ad_cancelled", { ability_id: "arsenal_overload" });
      return;
    }
    if (target === "boss") {
      leaveExpiredBoss();
      void gameServices.analytics.track("boss_rewarded_ad_cancelled", { zone: gameRef.current.zone });
    }
  }

  function activateIceRain() {
    const now = Date.now();
    const current = gameRef.current;
    const unlocked = isIceRainUnlocked(current.weapons.blue_weapon.purchasedUpgradeIds);
    if (!canActivateIceRain(unlocked, current.iceRainActiveUntil, current.iceRainCooldownUntil, now)) return;
    const activation = createIceRainActivation(now);
    commit({
      ...current,
      iceRainActiveUntil: activation.activeUntil,
      iceRainCooldownUntil: activation.cooldownUntil,
    });
    setClock(now);
    showToast(`Ледяной дождь активен ${ICE_RAIN_DURATION_SEC} секунд`, "gold");
    void gameServices.analytics.track("weapon_ability_activated", {
      ability_id: "ice_rain",
      weapon_id: "blue_weapon",
      active_seconds: ICE_RAIN_DURATION_SEC,
      cooldown_seconds: ICE_RAIN_COOLDOWN_SEC,
    });
  }

  function activateManualCriticalAbility() {
    const now = Date.now();
    const current = gameRef.current;
    const next = activateManualCritical(current, now);
    if (next === current) return;
    commitProgress(next);
    setClock(now);
    showToast(`Крит: +20% к шансу на ${MANUAL_CRIT_DURATION_SEC} секунд`, "gold");
    void gameServices.analytics.track("manual_ability_activated", {
      ability_id: "manual_critical",
      active_seconds: MANUAL_CRIT_DURATION_SEC,
      cooldown_seconds: MANUAL_CRIT_COOLDOWN_SEC,
    });
  }

  function activateAdditionalAbility(id: CombatAbilityId) {
    const now = Date.now();
    const current = gameRef.current;
    const spec = COMBAT_ABILITIES[id];
    const unlocked = current.weapons[spec.weaponId].purchasedUpgradeIds.includes(spec.upgradeId);
    const timer = activateCombatAbility(id, current.combatAbilities[id], unlocked, now);
    if (timer === current.combatAbilities[id]) return;
    commitProgress({ ...current, combatAbilities: { ...current.combatAbilities, [id]: timer } });
    setClock(now);
    showToast(`${spec.name}: ${spec.durationSec} секунд`, "gold");
    void gameServices.analytics.track("weapon_ability_activated", { ability_id: id, weapon_id: spec.weaponId });
  }

  async function startBossRewardedAd(zone: number) {
    const readyAt = Date.now() + TEST_REWARDED_AD_DURATION_MS;
    commitBossRewardAd({ zone, started: true, readyAt, sdkFinished: platformConfig.isLocal, sdkFailed: false });
    if (platformConfig.isLocal) return;

    const rewarded = await platformBridge.rewardedBreak();
    const currentAd = bossRewardAdRef.current;
    if (!currentAd || currentAd.zone !== zone || currentAd.readyAt !== readyAt) return;
    if (!rewarded) {
      commitBossRewardAd({ ...currentAd, sdkFailed: true });
      showToast("Реклама не завершена — усиление не активировано", "danger");
      return;
    }
    applyBossRewardedBoost(zone);
  }

  function applyBossRewardedBoost(zone: number) {
    const current = gameRef.current;
    if (current.zone !== zone || !isBossZone(current.zone)) return;
    commit({ ...current, bossTimeLeft: BOSS_BOOST_DURATION_SEC });
    commitBossRewardBoost(true);
    commitBossRewardAd(null);
    bossFailureLock.current = false;
    lastTickAt.current = Date.now();
    showToast(`×2 к общему DPS активно ${BOSS_BOOST_DURATION_SEC} секунд`, "gold");
    void gameServices.analytics.track("boss_rewarded_boost", {
      zone: current.zone,
      active_seconds: BOSS_BOOST_DURATION_SEC,
    });
  }

  function confirmBossRewardedBoost() {
    const currentAd = bossRewardAdRef.current;
    if (!currentAd || !bossRewardAdReady) return;
    applyBossRewardedBoost(currentAd.zone);
  }

  function leaveExpiredBoss() {
    const current = gameRef.current;
    if (testBossActiveRef.current) {
      finishTestBossAttempt("Проверка TestBoss завершена");
      void gameServices.analytics.track("test_boss_failed", { reason: "rewarded_offer_declined" });
      return;
    }
    commitBossRewardAd(null);
    commitBossRewardBoost(false);
    clearPendingVfx();
    if (!isBossZone(current.zone)) return;
    const failed = failBoss(current);
    commit(failed);
    bossFailureLock.current = false;
    enemySpawnedAtRef.current = Date.now();
    lastTickAt.current = Date.now();
    showToast(`Босс устоял — возвращение в зону ${failed.zone}`, "danger");
    void gameServices.analytics.track("boss_failed", { zone: current.zone, reason: "rewarded_offer_declined" });
  }

  function enterDungeon(dungeonId: DungeonId) {
    const dungeon = getDungeonDefinition(dungeonId);
    if (!isDungeonUnlocked(dungeon, gameRef.current.highestZone)) {
      showToast(`Данж откроется после победы над боссом уровня ${dungeon.bossZone}`, "info");
      return;
    }
    const cooldown = Math.max(0, (gameRef.current.dungeonCooldowns[dungeonId] ?? 0) - Date.now());
    if (cooldown > 0) {
      showToast(`Данж перезаряжается: ${formatDuration(cooldown / 1000)}`, "info");
      return;
    }
    interruptEnemyDeath(true);
    clearPendingVfx();
    resetDungeonVictoryReturn();
    clearMapBossOverlays();
    setMapOpen(false);
    setDungeonRewardAdPending(false);
    dungeonLastTickAt.current = Date.now();
    commitDungeon(createDungeonAttempt(dungeonId));
    void gameServices.analytics.track("dungeon_started", { dungeon_id: dungeonId, rewarded_boost: false });
  }

  function leaveDungeonToMap() {
    const skipVictory = dungeonAttemptRef.current?.status === "won";
    clearPendingVfx();
    if (skipVictory) stopActiveGameSounds();
    resetDungeonVictoryReturn();
    commitDungeon(null);
    setDungeonRewardAdPending(false);
    hideAbilityTooltip();
    lastTickAt.current = Date.now();
    setSelectedMapRegionId(getMapRegionForZone(gameRef.current.zone).id);
    setMapOpen(true);
  }

  function attackDungeon(event: MouseEvent<HTMLButtonElement>) {
    const currentAttempt = dungeonAttemptRef.current;
    if (!currentAttempt || currentAttempt.status !== "fighting") return;
    const currentGame = gameRef.current;
    const targetRect = event.currentTarget.getBoundingClientRect();
    const stage = event.currentTarget.closest<HTMLElement>(".combat-stage");
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();
    const x = (event.clientX - targetRect.left) / targetRect.width * 100;
    const y = (event.clientY - targetRect.top) / targetRect.height * 100;
    const startX = 12;
    const startY = 52;
    const targetX = (event.clientX - stageRect.left) / stageRect.width * 100;
    const targetY = (event.clientY - stageRect.top) / stageRect.height * 100;
    const angle = Math.atan2(
      (targetY - startY) * stageRect.height,
      (targetX - startX) * stageRect.width,
    ) * 180 / Math.PI;
    const manualAttack = resolveManualAttack(getGlobalClickDamage(currentGame), currentGame, Date.now());
    const { amount } = manualAttack;
    const weaponId = currentGame.selectedWeaponId;
    const color = WEAPONS[weaponId].color;
    const id = Date.now() + Math.random();
    const shotSlot = vfxPoolCursorRef.current.shot++ % vfxBudget.shots;
    commit({ ...currentGame, totalClicks: currentGame.totalClicks + 1 });
    setShots((items) => [...items.filter((item) => item.slot !== shotSlot).slice(-(vfxBudget.shots - 1)), { id, slot: shotSlot, color, weaponId, startX, startY, targetX, targetY, angle }]);

    const flightTimer = window.setTimeout(() => {
      vfxTimersRef.current.delete(flightTimer);
      setShots((items) => items.filter((item) => item.id !== id));
      const latestAttempt = dungeonAttemptRef.current;
      if (!latestAttempt || latestAttempt.dungeonId !== currentAttempt.dungeonId || latestAttempt.status !== "fighting") return;
      audioRef.current?.playImpact(weaponId);

      const damageSlot = vfxPoolCursorRef.current.damage++ % vfxBudget.damageNumbers;
      setDamageNumbers((items) => [...items.filter((item) => item.slot !== damageSlot).slice(-(vfxBudget.damageNumbers - 1)), { id, slot: damageSlot, amount, x, y, weaponId, color, critical: manualAttack.critical, doubleDamage: manualAttack.doubleDamage }]);
      const next = damageDungeon(latestAttempt, amount);
      if (next.status === "won") finishDungeonVictory(next);
      else commitDungeon(next);

      const impactTimer = window.setTimeout(() => {
        vfxTimersRef.current.delete(impactTimer);
        setDamageNumbers((items) => items.filter((item) => item.id !== id));
      }, DAMAGE_NUMBER_LIFE_MS);
      vfxTimersRef.current.add(impactTimer);
    }, PROJECTILE_TRAVEL_MS);
    vfxTimersRef.current.add(flightTimer);
  }

  async function retryDungeonWithRewardedBoost() {
    const currentAttempt = dungeonAttemptRef.current;
    if (!currentAttempt || currentAttempt.status !== "failed" || dungeonRewardAdPending) return;
    setDungeonRewardAdPending(true);
    const shown = platformConfig.isLocal || await platformBridge.rewardedBreak();
    if (!shown) {
      setDungeonRewardAdPending(false);
      showToast("Досмотрите рекламу, чтобы получить ×2 DPS", "danger");
      return;
    }
    const retry = createDungeonAttempt(currentAttempt.dungeonId, true);
    resetDungeonVictoryReturn();
    dungeonLastTickAt.current = Date.now();
    commitDungeon(retry);
    setDungeonRewardAdPending(false);
    showToast("Рекламное усиление активно — DPS данжа ×2", "gold");
    void gameServices.analytics.track("dungeon_rewarded_retry", { dungeon_id: currentAttempt.dungeonId });
  }

  function startGame() {
    if (!startAssetsReady) return;
    platformBridge.loadingFinished();
    platformBridge.gameplayStart();
    const now = Date.now();
    lastTickAt.current = now;
    enemySpawnedAtRef.current = now;
    setGameStarted(true);
    audioRef.current?.setRunning(soundEnabled && !document.hidden && document.hasFocus() && !platformPaused);
    if (!ftueShown) {
      const current = gameRef.current;
      const remainingEnemies = isBossZone(current.zone) ? 1 : ENEMIES_PER_ZONE - current.killsInZone;
      ftueZoneGoalKillsRef.current = current.totalKills + remainingEnemies;
      setFtueShown(true);
      setFtueStep("enemy");
      setFtueInteractionStarted(false);
    } else {
      setFtueStep("done");
    }
  }

  function toggleSounds() {
    const next = !soundEnabled;
    audioRef.current?.setRunning(next && gameStarted && !document.hidden && document.hasFocus() && !platformPaused);
    setSoundEnabled(next);
  }

  function clearWeaponProgressPresentation() {
    if (weaponLevelPulseTimerRef.current !== null) window.clearTimeout(weaponLevelPulseTimerRef.current);
    if (abilityUnlockHoldTimerRef.current !== null) window.clearTimeout(abilityUnlockHoldTimerRef.current);
    if (abilityUnlockFlightTimerRef.current !== null) window.clearTimeout(abilityUnlockFlightTimerRef.current);
    if (abilityTooltipTimerRef.current !== null) window.clearTimeout(abilityTooltipTimerRef.current);
    weaponLevelPulseTimerRef.current = null;
    abilityUnlockHoldTimerRef.current = null;
    abilityUnlockFlightTimerRef.current = null;
    abilityTooltipTimerRef.current = null;
    setWeaponLevelPulse(null);
    setAbilityUnlockPresentation(null);
    setAbilityTooltip(null);
  }

  function resetGame() {
    if (!window.confirm("Сбросить золото, оружие и прогресс зон?")) return;
    setSettingsOpen(false);
    resetDungeonVictoryReturn();
    commitDungeon(null);
    setDungeonRewardAdPending(false);
    setAbilityAd(null);
    commitBossRewardAd(null);
    commitBossRewardBoost(false);
    commitTestBossActive(false);
    testBossReturnStateRef.current = null;
    bossFailureLock.current = false;
    if (deathTimerRef.current !== null) window.clearTimeout(deathTimerRef.current);
    deathTimerRef.current = null;
    enemyDyingRef.current = false;
    setEnemyDying(false);
    enemySpawnedAtRef.current = Date.now();
    clearWeaponProgressPresentation();
    clearPendingVfx();
    const fresh = createInitialGameState();
    visitedZonesRef.current.clear();
    visitedZonesRef.current.add(fresh.zone);
    commit(fresh);
    void gameServices.saves.clear();
    setGameStarted(false);
    setFtueShown(false);
    setFtueStep("idle");
    setFtueInteractionStarted(false);
    removeLocalStorage(FTUE_STORAGE_KEY);
    showToast("Новое очищение началось", "info");
  }

  function saveTestProgress() {
    const source = testBossActiveRef.current && testBossReturnStateRef.current
      ? testBossReturnStateRef.current
      : gameRef.current;
    const snapshot = enemyDyingRef.current && source.enemyHp <= 0
      ? defeatCurrentEnemy(source)
      : source;
    try {
      const cartridge = gameServices.testProgress.save(snapshot);
      setTestProgressInfo({
        savedAt: cartridge.savedAt,
        zone: snapshot.zone,
        highestZone: snapshot.highestZone,
      });
      showToast(`Тестовый прогресс сохранён: уровень ${snapshot.zone}`, "gold");
      void gameServices.analytics.track("test_progress_saved", {
        current_level: snapshot.zone,
        highest_level: snapshot.highestZone,
      });
    } catch {
      showToast("Не удалось сохранить тестовый прогресс", "danger");
    }
  }

  async function loadTestProgress() {
    const cartridge = gameServices.testProgress.load<unknown>();
    if (!cartridge) {
      setTestProgressInfo(null);
      showToast("Тестовое сохранение не найдено", "danger");
      return;
    }
    const restored = normalizeGameState(cartridge.data);
    if (!window.confirm(`Загрузить тестовый прогресс с уровня ${restored.zone}? Текущий прогресс будет заменён.`)) return;

    setSettingsOpen(false);
    setShopOpen(false);
    resetDungeonVictoryReturn();
    commitDungeon(null);
    setDungeonRewardAdPending(false);
    setAbilityAd(null);
    commitBossRewardAd(null);
    commitBossRewardBoost(false);
    commitTestBossActive(false);
    testBossReturnStateRef.current = null;
    setRewardedAdCloseTarget(null);
    bossFailureLock.current = false;
    if (deathTimerRef.current !== null) window.clearTimeout(deathTimerRef.current);
    deathTimerRef.current = null;
    enemyDyingRef.current = false;
    setEnemyDying(false);
    clearWeaponProgressPresentation();
    clearPendingVfx();
    audioRef.current?.stopEffects();
    setMapOpen(false);
    setSelectedMapRegionId(null);
    setMapBossInfo(null);
    setNewDungeonGuide(null);
    setLockedUpgradePulseId(null);
    setUpgradeTooltip(null);
    setWeaponUnlockTooltip(null);
    visitedZonesRef.current.clear();
    visitedZonesRef.current.add(restored.zone);
    commit(restored);
    setFtueStep("done");
    setFtueInteractionStarted(false);
    const now = Date.now();
    lastTickAt.current = now;
    dungeonLastTickAt.current = now;
    enemySpawnedAtRef.current = now;
    await gameServices.saves.save(restored);
    showToast(`Тестовый прогресс загружен: уровень ${restored.zone}`, "gold");
    void gameServices.analytics.track("test_progress_loaded", {
      current_level: restored.zone,
      highest_level: restored.highestZone,
    });
  }

  function resetDungeonVictoryReturn() {
    if (dungeonVictoryReturnTimerRef.current !== null) {
      window.clearTimeout(dungeonVictoryReturnTimerRef.current);
      dungeonVictoryReturnTimerRef.current = null;
    }
  }

  if (!hydrated) return <LocalizationBoundary language={language}><main className="loading-screen"><span>✦</span><strong>ПРОБУЖДЕНИЕ АРСЕНАЛА</strong><small>Загрузка очищенного мира…</small></main></LocalizationBoundary>;

  if (!gameStarted) return (
    <LocalizationBoundary language={language}>
      <main className="start-screen" style={{ "--start-background": `url("${START_SCREEN_ART}")` } as CSSProperties}>
        <section className="start-card" aria-label="Начало игры">
          <button type="button" className="start-game-button" disabled={!startAssetsReady} aria-busy={!startAssetsReady} onClick={startGame}>
            <strong>НАЧАТЬ</strong>
          </button>
          <button type="button" className="start-language-button" onClick={() => setLanguageOpen(true)}><span>◎</span><strong>ВЫБОР ЯЗЫКА</strong></button>
        </section>
      </main>
      {languageOpen && <LanguageModal language={language} onSelect={selectLanguage} onClose={() => setLanguageOpen(false)} />}
    </LocalizationBoundary>
  );

  const shellStyle = { "--biome-color": biome.color, "--weapon-color": selectedWeapon.color } as CSSProperties;
  const shellQualityClass = `quality-${resolvedGraphicsQuality}${pageHidden || platformPaused ? " is-paused" : ""}`;
  const lootCoinLayer = <div className="loot-coin-layer" aria-label="Монеты с поверженных врагов">
    {lootCoins.map((coin) => <button
      type="button"
      key={coin.id}
      className={`loot-coin ${coin.phase}`}
      aria-label="Собрать монету"
      onClick={(event) => collectLootCoin(coin.id, event.currentTarget)}
      onAnimationEnd={(event) => {
        if (event.animationName === "coin-wallet-flight") finishLootCoinCollection(coin.id);
      }}
      style={{
        "--coin-start-x": `${coin.startX}px`,
        "--coin-start-y": `${coin.startY}px`,
        "--coin-land-x": `${coin.landX}px`,
        "--coin-land-y": `${coin.landY}px`,
        "--coin-collect-x": `${coin.collectStartX}px`,
        "--coin-collect-y": `${coin.collectStartY}px`,
        "--coin-target-x": `${coin.targetX}px`,
        "--coin-target-y": `${coin.targetY}px`,
        "--coin-arc-height": `${coin.arcHeight}px`,
        "--coin-delay": `${coin.delayMs}ms`,
        "--coin-fall-time": `${coin.fallMs}ms`,
        "--coin-spin-delay": `${coin.spinDelayMs}ms`,
        "--coin-scale": coin.scale,
      } as CSSProperties}
    ><span className="loot-coin-sprite" style={{ backgroundImage: `url(${COIN_ART})` }} aria-hidden="true" /></button>)}
  </div>;
  const iceRainLayer = iceRainShots.map((shot) => <span
    key={`ice-rain-${shot.id}`}
    className="ice-rain-projectile"
    style={{
      "--ice-rain-start-x": `${shot.startX}%`,
      "--ice-rain-target-x": `${shot.targetX}%`,
      "--ice-rain-target-y": `${shot.targetY}%`,
      "--ice-rain-angle": `${shot.angle}deg`,
    } as CSSProperties}
    aria-hidden="true"
  ><img src={PROJECTILE_BY_WEAPON.blue_weapon} alt="" draggable={false} decoding="async" /></span>);
  const activeAbilityEntries = [
    { id: "boost", name: "Двойной DPS", icon: "leadership", remaining: boostActive ? boostRemaining : 0 },
    { id: "critical", name: "Крит", icon: "critical", remaining: manualCriticalActive ? manualCriticalRemaining : 0 },
    { id: "ice", name: "Ледяной дождь", icon: "ice-rain", remaining: iceRainActive ? iceRainRemaining : 0 },
    ...(["abyss", "wolf"] as const).map((id) => {
      const ability = unlockedWeaponAbilities.find((entry) => entry.weaponId === COMBAT_ABILITIES[id].weaponId);
      return { id, name: ability?.name ?? "", icon: ability?.icon ?? "", remaining: ability ? (game.combatAbilities[id].activeUntil - clock) / 1000 : 0 };
    }),
  ].filter((ability) => ability.remaining > 0);
  const activeAbilityIndicators = activeAbilityEntries.length > 0 && <div className="arena-active-abilities" role="group" aria-label="Активные умения">
    {activeAbilityEntries.map((ability) => <span key={ability.id}
      className={`arena-active-ability${ability.remaining <= 2 ? " expiring" : ""}`}
      data-active-ability={ability.id} role="img" aria-label={ability.name}
      title={`${ability.name} · ${formatDuration(ability.remaining)}`}
    ><AbilityIcon name={ability.icon} /></span>)}
  </div>;
  const weaponAbilityImpactLayer = abilityImpacts.map((impact) => <span
    className={`impact-effect impact-${impact.weaponId}`}
    key={`ability-impact-${impact.id}`}
    style={{ left: `${impact.x}%`, top: `${impact.y}%`, "--impact-color": impact.color } as CSSProperties}
    aria-hidden="true"
  ><i /><b /><em /></span>);

  const wolfImpactLayer = wolfImpact && <span className="wolf-claw-impact" key={wolfImpact.id} aria-hidden="true" style={{
    left: `${wolfImpact.x}%`, top: `${wolfImpact.y}%`, "--claw-angle": `${wolfImpact.angle}deg`,
    "--claw-duration": `${WOLF_IMPACT_LIFE_MS}ms`,
  } as CSSProperties}><i /><i /><i /></span>;
  const combatAbilityLayer = <div className="combat-ability-layer" aria-hidden="true">
    {game.combatAbilities.abyss.activeUntil > clock && ABYSS_EYE_POSITIONS.map((position, index) => <span
      className="abyss-eye"
      key={`abyss-eye-${index}`}
      style={{ "--eye-x": `${position.x}%`, "--eye-y": `${position.y}%`, "--eye-delay": `${index * -90}ms` } as CSSProperties}
    ><AbilityIcon name="abyss" /></span>)}
    {abilityStrikes.map((strike) => <span key={strike.id} className={`ability-strike ${strike.kind}`} style={{
      "--strike-start-x": `${strike.startX}%`, "--strike-start-y": `${strike.startY}%`,
      "--strike-end-x": `${strike.targetX}%`, "--strike-end-y": `${strike.targetY}%`,
      "--strike-angle": `${strike.angle ?? 0}deg`,
      "--strike-delay": `${strike.delayMs}ms`,
    } as CSSProperties}><img src={PROJECTILE_BY_WEAPON.void_weapon} alt="" /></span>)}
  </div>;
  const abilityAdLayer = abilityAd && <div className="rewarded-ad-backdrop">
    <section className="rewarded-ad-banner" role="dialog" aria-modal="true" aria-labelledby="rewarded-ad-title">
      <button type="button" className="rewarded-ad-close" aria-label="Закрыть рекламу" onClick={() => setRewardedAdCloseTarget("ability")}>×</button>
      <small>ТЕСТОВЫЙ РЕКЛАМНЫЙ БАННЕР</small>
      <h2 id="rewarded-ad-title">×2 DPS</h2>
      <div className="rewarded-ad-placeholder"><span>▶</span><strong>РЕКЛАМА</strong></div>
      {!abilityAdReady
        ? <div className="rewarded-ad-countdown"><span>Активация станет доступна через</span><strong>{formatDuration(abilityAdRemaining)}</strong></div>
        : <button type="button" className="rewarded-ad-activate" onClick={confirmAbilityActivation}>АКТИВИРОВАТЬ ×2 DPS</button>}
      {rewardedAdCloseTarget === "ability" && <div className="rewarded-ad-close-warning" role="alertdialog" aria-modal="true" aria-labelledby="ability-ad-close-title">
        <h3 id="ability-ad-close-title">ЗАКРЫТЬ РЕКЛАМУ?</h3>
        <p>Если закрыть окно раньше времени, награда не будет получена.</p>
        <div><button type="button" className="rewarded-ad-continue" onClick={() => setRewardedAdCloseTarget(null)}>ПРОДОЛЖИТЬ ПРОСМОТР</button><button type="button" className="rewarded-ad-confirm-close" onClick={confirmRewardedAdClose}>ЗАКРЫТЬ БЕЗ НАГРАДЫ</button></div>
      </div>}
    </section>
  </div>;
  const bossRewardAdLayer = bossRewardAd && <div className="rewarded-ad-backdrop boss-rewarded-ad-backdrop">
    <section className="rewarded-ad-banner boss-rewarded-ad-banner" role="dialog" aria-modal="true" aria-labelledby="boss-rewarded-ad-title">
      <button type="button" className="rewarded-ad-close" aria-label="Закрыть рекламу" onClick={() => setRewardedAdCloseTarget("boss")}>×</button>
      <small>ПОСЛЕДНИЙ ШАНС</small>
      <h2 id="boss-rewarded-ad-title">×2 DPS · 15 СЕКУНД</h2>
      <p>Посмотрите рекламу, чтобы продолжить бой с текущим здоровьем босса и удвоить общий DPS.</p>
      <div className="rewarded-ad-placeholder"><span>▶</span><strong>РЕКЛАМА</strong></div>
      {!bossRewardAd.started
        ? <div className="boss-rewarded-ad-actions">
          <button type="button" className="rewarded-ad-activate" onClick={() => startBossRewardedAd(bossRewardAd.zone)}>СМОТРЕТЬ РЕКЛАМУ · ×2 DPS</button>
          <button type="button" className="boss-rewarded-ad-exit" onClick={leaveExpiredBoss}>ВЕРНУТЬСЯ НА ПРОШЛЫЙ УРОВЕНЬ</button>
        </div>
        : bossRewardAd.sdkFailed
        ? <div className="boss-rewarded-ad-actions">
          <button type="button" className="rewarded-ad-activate" onClick={() => startBossRewardedAd(bossRewardAd.zone)}>ПОВТОРИТЬ РЕКЛАМУ</button>
          <button type="button" className="boss-rewarded-ad-exit" onClick={leaveExpiredBoss}>ВЕРНУТЬСЯ НА ПРОШЛЫЙ УРОВЕНЬ</button>
        </div>
        : !bossRewardAdReady
          ? platformConfig.isLocal
            ? <div className="rewarded-ad-countdown"><span>Усиление станет доступно через</span><strong>{formatDuration(bossRewardAdRemaining)}</strong></div>
            : <div className="rewarded-ad-countdown"><span>Ожидание результата рекламы…</span></div>
          : <div className="boss-rewarded-ad-actions">
            <button type="button" className="rewarded-ad-activate" onClick={confirmBossRewardedBoost}>ПРОДОЛЖИТЬ С ×2 DPS</button>
            <button type="button" className="boss-rewarded-ad-exit" onClick={leaveExpiredBoss}>ВЕРНУТЬСЯ НА ПРОШЛЫЙ УРОВЕНЬ</button>
          </div>}
      {rewardedAdCloseTarget === "boss" && <div className="rewarded-ad-close-warning" role="alertdialog" aria-modal="true" aria-labelledby="boss-ad-close-title">
        <h3 id="boss-ad-close-title">ЗАКРЫТЬ РЕКЛАМУ?</h3>
        <p>Если закрыть окно раньше времени, награда не будет получена.</p>
        <div><button type="button" className="rewarded-ad-continue" onClick={() => setRewardedAdCloseTarget(null)}>ПРОДОЛЖИТЬ ПРОСМОТР</button><button type="button" className="rewarded-ad-confirm-close" onClick={confirmRewardedAdClose}>ЗАКРЫТЬ БЕЗ НАГРАДЫ</button></div>
      </div>}
    </section>
  </div>;
  const mobileOrientationGate = <section
    className={`mobile-orientation-gate ${allowPortraitPlay ? "dismissed" : ""}`}
    role="dialog"
    aria-modal="true"
    aria-labelledby="mobile-orientation-title"
  >
    <span className="mobile-rotate-icon" aria-hidden="true">↻</span>
    <strong id="mobile-orientation-title">ПОВЕРНИТЕ ТЕЛЕФОН</strong>
    <small>Для полного интерфейса игры используйте горизонтальный режим.</small>
    <button type="button" onClick={() => setAllowPortraitPlay(true)}>ПРОДОЛЖИТЬ ВЕРТИКАЛЬНО</button>
  </section>;

  const activeDungeon = dungeonAttempt ? getDungeonDefinition(dungeonAttempt.dungeonId) : null;
  const dungeonEnemy = activeDungeon ? BOSS_ENEMIES[(activeDungeon.enemyArtNumber - 1) % BOSS_ENEMIES.length] : null;
  const dungeonBackground = activeDungeon ? getDungeonArenaBackground(activeDungeon.regionId, activeDungeon.slot) : null;
  const dungeonHpPercent = dungeonAttempt ? Math.max(0, Math.min(100, dungeonAttempt.hp / dungeonAttempt.maxHp * 100)) : 0;
  const dungeonTimePercent = dungeonAttempt ? Math.max(0, Math.min(100, dungeonAttempt.timeLeft / DUNGEON_TIME_LIMIT_SEC * 100)) : 0;

  if (mapOpen) return (
    <LocalizationBoundary language={language}><main className={`game-shell map-view-shell ${shellQualityClass}`} style={shellStyle}>
      <section className={`world-map-screen ${selectedMapRegion ? "region-map-screen" : "world-overview-screen"}`}>
        <header className="world-map-header">
          <div className="map-brand">
            <span className="brand-rune">✦</span>
            <div>
              {selectedMapRegion && <small>КАРТА РЕГИОНА</small>}
              <strong>{selectedMapRegion ? selectedMapRegion.name.toUpperCase() : "КАРТА МИРА"}</strong>
            </div>
          </div>
          <div className="map-progress-summary"><span>ОТКРЫТО УРОВНЕЙ</span><strong>{Math.min(105, game.highestZone)}</strong><small>ТЕКУЩИЙ УРОВЕНЬ · {Math.min(105, game.zone)}</small></div>
          <div className="map-economy"><span><small>ЗОЛОТО</small><strong><CostCoin compact />{formatNumber(game.gold)}</strong></span><span><small>ОБЩИЙ УРОН</small><strong>{formatNumber(displayedDps)} DPS</strong></span></div>
          {selectedMapRegion
            ? <div className="region-map-actions">
                <button type="button" className="whole-world-button" onClick={showWholeWorldMap}>МИР</button>
              </div>
            : null}
        </header>

        <div className="world-map-viewport">
          {!selectedMapRegion ? <section className="world-map-canvas world-overview-canvas" aria-label="Глобальная карта регионов">
            <svg className="world-map-art" viewBox="0 0 1280 720" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                {Object.entries(MAP_STATE_COLORS).map(([state, color]) => <filter key={state} id={`world-inner-${state}`} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="soft-alpha" />
                  <feComposite in="SourceAlpha" in2="soft-alpha" operator="out" result="inner-edge" />
                  <feFlood floodColor={color} />
                  <feComposite in2="inner-edge" operator="in" />
                </filter>)}
              </defs>
              <image href={WORLD_MAP_ART} x="0" y="0" width="1280" height="720" />
              {game.highestZone <= 105 && <rect className="world-map-fog" width="1280" height="720" />}
              {MAP_REGIONS.map((region) => {
                const art = REGION_MAP_ART[region.id - 1];
                const state = getMapRegionState(region, game.highestZone, game.zone);
                const src = publicAssetUrl(`art/maps/zone-${region.id}.webp`);
                return <g key={region.id}>
                  {state !== "locked" && <image href={src} x={art.x} y={art.y} width={art.width} height={art.height} />}
                  <image className={`map-inner-glow ${state}`} href={src} x={art.x} y={art.y} width={art.width} height={art.height} filter={`url(#world-inner-${state})`} />
                </g>;
              })}
            </svg>
            <svg className="map-regions" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Регионы мира">
              {MAP_REGIONS.map((region) => {
                const unlocked = game.highestZone >= region.startZone;
                const current = region.id === currentMapRegion.id;
                const stateClass = getMapRegionState(region, game.highestZone, game.zone);
                return <g
                  key={region.id}
                  className={`map-region ${stateClass}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${region.name}${current ? ", здесь находится игрок" : unlocked ? ", открыта" : ", закрыта"}`}
                  style={{ "--region-color": MAP_STATE_COLORS[stateClass] } as CSSProperties}
                  onClick={() => openMapRegion(region.id)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openMapRegion(region.id); } }}
                ><path className="map-region-shape" d={region.path} /></g>;
              })}
            </svg>
            {MAP_REGIONS.map((region) => {
              return <span
                key={`region-label-${region.id}`}
                className={`map-region-label ${getMapRegionState(region, game.highestZone, game.zone)}`}
                style={{ left: `${region.labelX}%`, top: `${region.labelY}%`, "--region-color": MAP_STATE_COLORS[getMapRegionState(region, game.highestZone, game.zone)] } as CSSProperties}
              ><small>{region.name}</small></span>;
            })}
            <span
              className="world-player-marker"
              style={{ left: `${currentMapRegion.markerX}%`, top: `${currentMapRegion.markerY}%`, "--region-color": MAP_STATE_COLORS.current } as CSSProperties}
              role="img"
              aria-label={`Игрок находится в регионе ${currentMapRegion.name}`}
            ><i /></span>
            <div className="map-compass" aria-hidden="true"><span>✦</span><b data-no-localize>{language === "ru" ? "С" : "N"}</b></div>
          </section> : <section className="world-map-canvas region-map-canvas" aria-label={`Карта региона ${selectedMapRegion.name}`}>
            <div className="region-map-content" data-region={selectedMapRegion.id} style={{ "--map-ratio": REGION_LAYOUTS[selectedMapRegion.id].viewBox[2] / REGION_LAYOUTS[selectedMapRegion.id].viewBox[3], "--node-width": `${REGION_LAYOUTS[selectedMapRegion.id].nodeWidth}cqw` } as CSSProperties}>
            <svg className="region-map-art" viewBox={REGION_LAYOUTS[selectedMapRegion.id].viewBox.join(" ")} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <image
                href={publicAssetUrl(`art/maps/zone-${selectedMapRegion.id}.webp`)}
                x={REGION_LAYOUTS[selectedMapRegion.id].image[0]} y={REGION_LAYOUTS[selectedMapRegion.id].image[1]}
                width={REGION_LAYOUTS[selectedMapRegion.id].image[2]}
                height={REGION_LAYOUTS[selectedMapRegion.id].image[3]}
              />
            </svg>
            <nav className="region-map-pagination" aria-label="Переключение регионов">
              <button
                type="button"
                className="region-map-arrow previous"
                disabled={!previousMapRegion}
                onClick={() => { if (previousMapRegion) openMapRegion(previousMapRegion.id); }}
                aria-label={previousMapRegion ? `Предыдущий регион: ${previousMapRegion.name}` : "Предыдущего региона нет"}
                title={previousMapRegion?.name}
              ><span aria-hidden="true">‹</span><small>ПРЕД.</small></button>
              <button
                type="button"
                className="region-map-arrow next"
                disabled={!nextMapRegion}
                onClick={() => { if (nextMapRegion) openMapRegion(nextMapRegion.id); }}
                aria-label={nextMapRegion ? `Следующий регион: ${nextMapRegion.name}` : nextMapRegionCandidate ? `Регион ${nextMapRegionCandidate.name} ещё закрыт` : "Следующего региона нет"}
                title={nextMapRegion?.name ?? nextMapRegionCandidate?.name}
              ><span aria-hidden="true">›</span><small>СЛЕД.</small></button>
            </nav>
            <svg className="map-roads region-map-roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {regionRoadPoints.slice(1).map((node, index) => {
                const previous = regionRoadPoints[index];
                const openRoad = node.zone <= game.highestZone;
                const route = mapRoadCurve(previous, node, index + selectedMapRegion.startZone);
                return <g key={`region-road-${previous.zone}-${node.zone}`}>
                  <path d={route} className="road-shadow" />
                  <path d={route} className={openRoad ? "road-active" : "road-locked"} />
                </g>;
              })}
            </svg>
            {regionMapNodes.map((node) => {
              const accessible = node.zone <= game.highestZone;
              const bossNode = isBossZone(node.zone);
              const defeatedBoss = bossNode && node.zone < game.highestZone;
              const current = node.zone === game.zone;
              return <button
                type="button"
                key={node.zone}
                className={`world-zone-node ${accessible ? "accessible" : "locked"} ${bossNode ? "boss" : ""} ${defeatedBoss ? "defeated" : ""} ${current ? "current" : ""}`}
                style={{ left: `${node.x}%`, top: `${node.y}%` } as CSSProperties}
                disabled={!accessible}
                onClick={() => {
                  if (defeatedBoss) {
                    clearNewDungeonGuide();
                    setMapBossInfo((currentInfo) => currentInfo?.kind === "campaign" && currentInfo.zone === node.zone
                      ? null
                      : { kind: "campaign", zone: node.zone });
                    return;
                  }
                  setMapBossInfo(null);
                  selectZoneFromMap(node.zone);
                }}
                aria-label={`Уровень ${node.zone}${bossNode ? ", босс" : ""}${defeatedBoss ? ", побеждён" : accessible ? ", открыт" : ", закрыт"}`}
              >
                <img src={publicAssetUrl(`art/map-points/${bossNode ? defeatedBoss ? "boss-defeated" : "boss" : current ? "level-current" : "level"}.webp`)} alt="" draggable={false} />
                <span>{node.zone}</span>
                <b>{defeatedBoss ? `БОСС ${node.zone} · ПОБЕЖДЁН` : bossNode ? `БОСС ${node.zone}` : `УРОВЕНЬ ${node.zone}`}</b>
              </button>;
            })}
            {regionDungeons.map((dungeon) => {
              const unlocked = isDungeonUnlocked(dungeon, game.highestZone);
              const cooldownRemaining = Math.max(0, (game.dungeonCooldowns[dungeon.id] ?? 0) - clock);
              const available = unlocked && cooldownRemaining <= 0;
              const stateClass = available ? "available" : unlocked ? "cooldown" : "locked";
              return <button
                type="button"
                key={dungeon.id}
                className={`world-dungeon-node ${stateClass}`}
                style={{ left: `${dungeon.x}%`, top: `${dungeon.y}%` } as CSSProperties}
                disabled={!unlocked}
                onClick={() => {
                  clearNewDungeonGuide();
                  if (available) {
                    setMapBossInfo(null);
                    enterDungeon(dungeon.id);
                    return;
                  }
                  setMapBossInfo((currentInfo) => currentInfo?.kind === "dungeon" && currentInfo.dungeonId === dungeon.id
                    ? null
                    : { kind: "dungeon", dungeonId: dungeon.id });
                }}
                aria-label={`${dungeon.name}, данж региона ${ORDERED_MAP_REGIONS.findIndex((region) => region.id === dungeon.regionId) + 1}${available ? ", доступен" : unlocked ? `, перезарядка ${formatDuration(cooldownRemaining / 1000)}` : `, откроется после босса уровня ${dungeon.bossZone}`}`}
              >
                <img src={publicAssetUrl(`art/map-points/${available ? "dungeon-boss" : "dungeon-locked"}.webp`)} alt="" draggable={false} />
                <b>{dungeon.shortName}</b>
                <em>{available ? `×2 HP · ${formatNumber(getGoldRewardWithBonuses(game, dungeon.reward))} МОНЕТ` : unlocked ? `ЧЕРЕЗ ${formatDuration(cooldownRemaining / 1000)}` : `ПОСЛЕ БОССА ${dungeon.bossZone}`}</em>
              </button>;
            })}
            <MapComingSoonPoints key={selectedMapRegion.id} regionId={selectedMapRegion.id} assetUrl={publicAssetUrl} />
            {campaignBossInfoNode && <aside
              className="map-boss-info"
              style={{ "--map-node-x": `${campaignBossInfoNode.x}%`, top: `${campaignBossInfoNode.y}%` } as CSSProperties}
              role="tooltip"
            >
              <small>БОСС УРОВНЯ {campaignBossInfoNode.zone}</small>
              <strong className="map-boss-info-danger">БОСС ПОВЕРЖЕН</strong>
            </aside>}
            {dungeonBossInfo && Math.max(0, (game.dungeonCooldowns[dungeonBossInfo.id] ?? 0) - clock) > 0 && <aside
              className="map-boss-info"
              style={{ "--map-node-x": `${dungeonBossInfo.x}%`, top: `${dungeonBossInfo.y}%` } as CSSProperties}
              role="tooltip"
            >
              <small>{dungeonBossInfo.name}</small>
              <span>ДАНЖ-БОСС МОЖНО БУДЕТ АТАКОВАТЬ ЧЕРЕЗ</span>
              <strong className="map-boss-info-danger">{formatDuration(((game.dungeonCooldowns[dungeonBossInfo.id] ?? 0) - clock) / 1000)}</strong>
            </aside>}
            {regionMapNodes.map((node) => node.zone === game.zone ? <span
              key="region-player-marker"
              className="region-player-marker"
              style={{ left: `${node.x}%`, top: `${node.y}%`, "--region-color": selectedMapRegion.color } as CSSProperties}
              aria-hidden="true"
            ><i /></span> : null)}
            </div>
            <div className="region-map-nameplate" style={{ "--region-color": selectedMapRegion.color } as CSSProperties}>{selectedMapRegion.name}</div>
          </section>}
        </div>

        <footer className="world-map-footer">
          <span>{selectedMapRegion ? "Выберите открытый уровень или данж. Данжи перезаряжаются 10 минут после победы." : "Выберите открытую территорию. Точка показывает, в какой части мира находится игрок."}</span>
          <strong>{selectedMapRegion ? `УРОВНИ ${selectedMapRegion.startZone}–${selectedMapRegion.endZone}` : "ОБЗОР ВСЕГО МИРА"}</strong>
        </footer>
      </section>
      {lootCoinLayer}
      <div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className={`toast ${toast.tone}`}>{toast.text}</div>)}</div>
      {mobileOrientationGate}
    </main></LocalizationBoundary>
  );

  return (
    <LocalizationBoundary language={language}><main className={`game-shell ${shellQualityClass}`} style={shellStyle}>
      <section className="game-frame">
        <TopBar
          gold={game.gold}
          title={activeDungeon ? activeDungeon.shortName : testBossActive ? "TestBoss" : biome.name}
          subtitle={activeDungeon ? `ДАНЖ ${activeDungeon.regionId}-${activeDungeon.slot} · ×2 HP БОССА ${activeDungeon.bossZone}` : testBossActive ? "ТЕСТОВЫЙ БОСС" : `УРОВЕНЬ ${game.zone}`}
          displayedDps={activeDungeon && dungeonAttempt?.rewardedBoost ? totalDps * 2 : displayedDps}
          clickDamage={clickDamage}
          soundEnabled={soundEnabled}
          walletPulseTick={walletPulseTick}
          walletHighlighted={ftueStep === "gold"}
          walletRef={walletRef}
          onToggleSounds={toggleSounds}
        />

        <div className="clicker-layout">
          <WeaponRosterPanel
            gold={game.gold}
            clickLevel={game.clickLevel}
            clickPurchasedUpgradeIds={game.clickPurchasedUpgradeIds}
            bulkAmount={game.bulkAmount}
            highestZone={game.highestZone}
            selectedWeaponId={game.selectedWeaponId}
            weapons={game.weapons}
            clickDamage={clickDamage}
            ftueStep={ftueStep}
            weaponLevelPulse={weaponLevelPulse}
            clickLevelButtonRef={clickLevelButtonRef}
            weaponLevelButtonRef={weaponLevelButtonRef}
            onPurchaseClickLevel={purchaseClickLevel}
            onPurchaseManualUpgrade={purchaseManualWeaponUpgrade}
            onSetBulkAmount={setBulkAmount}
            onSelectWeapon={selectWeaponVisual}
            onPurchaseWeapon={purchaseWeapon}
            onPurchaseUpgrade={purchaseUpgrade}
            onPulseLockedUpgrade={pulseLockedUpgrade}
            onShowUpgradeTooltip={showUpgradeTooltip}
            onShowManualUpgradeTooltip={showManualUpgradeTooltip}
            onShowWeaponUnlockTooltip={showWeaponUnlockTooltip}
            onHideTooltips={() => { setUpgradeTooltip(null); setManualUpgradeTooltip(null); setWeaponUnlockTooltip(null); }}
          />

          <AbilityDock
            boostActive={boostActive}
            boostRemaining={boostRemaining}
            abilityCooldown={abilityCooldown}
            manualCriticalUnlocked={manualCriticalUnlocked}
            manualCriticalActive={manualCriticalActive}
            manualCriticalRemaining={manualCriticalRemaining}
            manualCriticalCooldown={manualCriticalCooldown}
            iceRainUnlocked={iceRainUnlocked}
            iceRainActive={iceRainActive}
            iceRainRemaining={iceRainRemaining}
            iceRainCooldown={iceRainCooldown}
            combatTimers={game.combatAbilities}
            clock={clock}
            unlockedWeaponAbilities={unlockedWeaponAbilities}
            lockedAbilitySlotCount={lockedAbilitySlotCount}
            dockRef={abilityDockRef}
            onActivateAbility={activateAbility}
            onActivateManualCritical={activateManualCriticalAbility}
            onActivateIceRain={activateIceRain}
            onActivateCombatAbility={activateAdditionalAbility}
            onShowTooltip={showAbilityTooltip}
            onHideTooltip={hideAbilityTooltip}
          />

          <section className="battlefield-panel">
            {activeDungeon ? <header className="zone-navigation dungeon-zone-navigation">
              <button className="open-map-button" onClick={leaveDungeonToMap}><span>⌖</span><strong>КАРТА</strong></button>
              <button className="zone-arrow" disabled>‹</button>
              <div className="zone-track dungeon-zone-track"><button type="button" className="current boss"><small>ДАНЖ</small><strong>{activeDungeon.regionId}-{activeDungeon.slot}</strong><span>×2 HP</span></button></div>
              <button className="zone-arrow" disabled>›</button>
            </header> : testBossActive ? <header className="zone-navigation dungeon-zone-navigation">
              <button className="open-map-button" onClick={openWorldMap}><span>⌖</span><strong>КАРТА</strong></button>
              <button className="zone-arrow" disabled>‹</button>
              <div className="zone-track dungeon-zone-track"><button type="button" className="current boss"><small>ТЕСТ</small><strong>!</strong><span>БОСС</span></button></div>
              <button className="zone-arrow" disabled>›</button>
            </header> : <header className="zone-navigation">
              <button ref={mapButtonRef} className="open-map-button" onClick={openWorldMap}><span>⌖</span><strong>КАРТА</strong></button>
              <button className="zone-arrow" disabled={game.zone <= 1 || (isBossZone(game.zone - 1) && game.zone - 1 < game.highestZone)} onClick={() => navigateToZone(game.zone - 1)}>‹</button>
              <div className="zone-track">
                {zoneStrip.map((zone) => {
                  const bossZone = isBossZone(zone);
                  const defeatedBoss = bossZone && zone < game.highestZone;
                  const completed = zone < game.highestZone && !bossZone;
                  const current = zone === game.zone;
                  const newlyUnlocked = zone === game.highestZone && !current && !visitedZonesRef.current.has(zone);
                  const ftueNext = ftueStep === "next-zone" && zone === ftueNextZone;
                  return <button ref={ftueNext ? nextZoneButtonRef : undefined} key={zone} className={`${completed ? "completed" : ""} ${defeatedBoss ? "defeated" : ""} ${current ? "current" : ""} ${newlyUnlocked ? "new-zone" : ""} ${ftueNext ? "ftue-target" : ""} ${bossZone ? "boss" : ""}`} disabled={defeatedBoss} onClick={() => navigateToZone(zone)}><small>{bossZone ? "БОСС" : "УРОВЕНЬ"}</small><strong>{zone}</strong><span>{defeatedBoss ? "ПОБЕЖДЁН" : newlyUnlocked ? "НОВЫЙ" : completed ? "✓" : zone === game.highestZone ? "МАКС" : ""}</span></button>;
                })}
              </div>
              <button className="zone-arrow" disabled={game.zone >= game.highestZone || (isBossZone(game.zone + 1) && game.zone + 1 < game.highestZone)} onClick={() => navigateToZone(game.zone + 1)}>›</button>
            </header>}

            {activeDungeon && dungeonAttempt && dungeonEnemy && dungeonBackground ? <section className="arena boss-arena dungeon-arena-main" style={{ "--arena-background": `url(${dungeonBackground})` } as CSSProperties}>
              <div className="arena-glow dungeon-vignette" />
              {iceRainLayer}
              {combatAbilityLayer}
              <div className="encounter-heading"><small>ДАНЖ · БОСС</small></div>
              <div className="dungeon-time" role="timer">
                <span>ОСТАЛОСЬ</span><strong>{dungeonAttempt.timeLeft.toFixed(1)} сек</strong><div><i style={{ width: `${dungeonTimePercent}%` }} /></div>
              </div>
              {dungeonAttempt.rewardedBoost && <div className="dungeon-boost-badge">РЕКЛАМНОЕ УСИЛЕНИЕ · ×2 DPS</div>}
              <div className="combat-stage">
                {shots.map((shot) => <span
                  key={shot.slot}
                  className={`projectile projectile-${shot.weaponId}`}
                  style={{
                    "--shot-color": shot.color,
                    "--shot-start-x": `${shot.startX}%`,
                    "--shot-start-y": `${shot.startY}%`,
                    "--shot-target-x": `${shot.targetX}%`,
                    "--shot-target-y": `${shot.targetY}%`,
                    "--shot-angle": `${shot.angle}deg`,
                  } as CSSProperties}
                ><img className="projectile-sprite" src={PROJECTILE_BY_WEAPON[shot.weaponId]} alt="" draggable={false} decoding="async" /></span>)}
                <div className="enemy-presentation">
                  <button
                    type="button"
                    ref={enemyTargetRef}
                    className={`dungeon-enemy-target ${dungeonAttempt.status} ${dungeonAttempt.status === "won" ? "victory-celebration" : ""}`}
                    disabled={dungeonAttempt.status !== "fighting"}
                    onClick={attackDungeon}
                    onContextMenu={(event) => event.preventDefault()}
                    aria-label={`Атаковать данжевого босса: ${activeDungeon.name}`}
                  >
                    <img className="dungeon-enemy-image" src={dungeonEnemy.src} alt="" draggable={false} decoding="async" fetchPriority="high" onLoad={(event) => prepareEnemyPresentation(event.currentTarget)} />
                    {wolfImpactLayer}
                    {weaponAbilityImpactLayer}
                    {damageNumbers.filter((number) => !number.ability).map((number) => <span
                      className={`impact-effect impact-${number.weaponId}`}
                      key={`dungeon-impact-${number.id}`}
                      style={{ left: `${number.x}%`, top: `${number.y}%`, "--impact-color": number.color } as CSSProperties}
                      aria-hidden="true"
                    ><i /><b /><em /></span>)}
                    {damageNumbers.map((number) => <b className={`damage-number ${number.critical ? "critical" : ""} ${number.doubleDamage ? "double-damage" : ""}`} key={`dungeon-damage-${number.slot}`} style={{ left: `${number.x}%`, top: `${number.y}%`, "--impact-color": number.color } as CSSProperties}>{number.critical ? "КРИТ! " : ""}−{formatNumber(number.amount)}</b>)}
                  </button>
                </div>
              </div>
              {activeAbilityIndicators}
              <div className="enemy-nameplate dungeon-enemy-name"><span>{activeDungeon.name}</span><b> — 1 ур.</b></div>
              <section className="health-panel dungeon-health-panel">
                <div className="health-copy"><strong>{formatNumber(dungeonAttempt.hp)} / {formatNumber(dungeonAttempt.maxHp)}</strong></div>
                <div className="health-track dungeon-health-track"><i style={{ width: `${dungeonHpPercent}%` }} /></div>
                <div className="enemy-reward"><span>Награда:</span> <b>{formatNumber(getGoldRewardWithBonuses(game, activeDungeon.reward))} монет</b></div>
              </section>

              {dungeonAttempt.status === "failed" && <section className="dungeon-result failed" role="dialog" aria-label="Испытание провалено">
                <small>ВРЕМЯ ВЫШЛО</small><h2>БОСС УСТОЯЛ</h2>
                <p>Посмотрите рекламу и повторите попытку с двойным DPS либо вернитесь позже.</p>
                <div>
                  <button type="button" className="dungeon-rewarded-retry" disabled={dungeonRewardAdPending} onClick={retryDungeonWithRewardedBoost}>{dungeonRewardAdPending ? "РЕКЛАМА…" : "СМОТРЕТЬ РЕКЛАМУ · ×2 DPS"}</button>
                  <button type="button" onClick={leaveDungeonToMap}>ВЫЙТИ НА КАРТУ</button>
                </div>
              </section>}
            </section> : <section className={`arena ${boss ? "boss-arena" : ""}`} style={{ "--arena-background": `url(${arenaBackground})` } as CSSProperties}>
              <div className="arena-glow" />
              {iceRainLayer}
              {combatAbilityLayer}
              <div className="encounter-heading">
                <small>{testBossActive ? "ТЕСТОВЫЙ БОСС · 15 СЕКУНД" : boss ? `БОСС · УРОВЕНЬ ${game.zone}` : `УРОВЕНЬ ${game.zone} · ${displayedZoneKills}/${ENEMIES_PER_ZONE}`}</small>
              </div>

              {boss && <div className="boss-timer" role="timer"><span>ОСТАЛОСЬ</span><strong>{game.bossTimeLeft.toFixed(1)} сек</strong><div><i style={{ width: `${game.bossTimeLeft / bossTimerLimit * 100}%` }} /></div></div>}
              {boss && bossRewardBoostActive && <div className="boss-reward-boost-badge">×2 ОБЩИЙ DPS · {formatDuration(game.bossTimeLeft)}</div>}

              <div className="combat-stage">
                {shots.map((shot) => <span
                  key={shot.slot}
                  className={`projectile projectile-${shot.weaponId}`}
                  style={{
                    "--shot-color": shot.color,
                    "--shot-start-x": `${shot.startX}%`,
                    "--shot-start-y": `${shot.startY}%`,
                    "--shot-target-x": `${shot.targetX}%`,
                    "--shot-target-y": `${shot.targetY}%`,
                    "--shot-angle": `${shot.angle}deg`,
                  } as CSSProperties}
                ><img className="projectile-sprite" src={PROJECTILE_BY_WEAPON[shot.weaponId]} alt="" draggable={false} decoding="async" /></span>)}
                <div className="enemy-presentation">
                  <button
                    type="button"
                    ref={enemyTargetRef}
                    className={`enemy-target ${ftueStep === "enemy" ? "ftue-target" : ""} ${enemyDying ? boss && !testBossActive ? "boss-victory-freeze" : "dying" : ""}`}
                    disabled={enemyDying}
                    onClick={attack}
                    onContextMenu={(event) => event.preventDefault()}
                    aria-label={`Атаковать: ${enemyName}, уровень ${game.zone}`}
                  >
                    <img className="enemy-image" src={enemyData.src} alt="" draggable={false} decoding="async" fetchPriority="high" onLoad={(event) => prepareEnemyPresentation(event.currentTarget)} />
                    {wolfImpactLayer}
                    {weaponAbilityImpactLayer}
                    {damageNumbers.filter((number) => !number.ability).map((number) => <span
                      className={`impact-effect impact-${number.weaponId}`}
                      key={`impact-${number.id}`}
                      style={{ left: `${number.x}%`, top: `${number.y}%`, "--impact-color": number.color } as CSSProperties}
                      aria-hidden="true"
                    ><i /><b /><em /></span>)}
                    {damageNumbers.map((number) => <b className={`damage-number ${number.critical ? "critical" : ""} ${number.doubleDamage ? "double-damage" : ""}`} key={number.slot} style={{ left: `${number.x}%`, top: `${number.y}%`, "--impact-color": number.color } as CSSProperties}>{number.critical ? "КРИТ! " : ""}−{formatNumber(number.amount)}</b>)}
                  </button>
                </div>
              </div>

              {activeAbilityIndicators}
              <div className="enemy-nameplate"><span>{enemyName}</span><b> — {game.zone} ур.</b></div>

              <section className="health-panel">
                <div className="health-copy"><strong>{formatNumber(game.enemyHp)} / {formatNumber(game.enemyMaxHp)}</strong></div>
                <div className="health-track"><i style={{ width: `${hpPercent}%` }} /></div>
                <div className="enemy-reward"><span>Награда:</span> <b>{testBossActive ? "тестовая цель" : `${formatNumber(getGoldRewardWithBonuses(game, getEnemyGold(game.zone)))} монет`}</b></div>
              </section>
            </section>}

            <footer className="system-nav">
              <button className="active"><strong>Арсенал</strong></button>
              <button type="button" className={`shop-button ${shopOpen ? "active" : ""}`} aria-pressed={shopOpen} onClick={() => { hideAbilityTooltip(); setSettingsOpen(false); setShopOpen(true); }}><strong>Магазин</strong></button>
              <button disabled><strong>Очищение</strong></button>
              <button disabled><strong>Достижения</strong></button>
              <button type="button" className="settings-button" onClick={() => { hideAbilityTooltip(); setShopOpen(false); setSettingsOpen(true); }}><strong>Настройки</strong></button>
            </footer>
          </section>
        </div>
      </section>

      {shopOpen && <div className="shop-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setShopOpen(false); }}>
        <section className="shop-modal" role="dialog" aria-modal="true" aria-labelledby="shop-title">
          <header className="shop-modal-header">
            <div><small>СНАБЖЕНИЕ</small><h2 id="shop-title">МАГАЗИН ОРУЖИЯ</h2></div>
            <div className="shop-wallet"><span>ЗОЛОТО</span><strong><CostCoin compact />{formatNumber(game.gold)}</strong></div>
            <button type="button" className="shop-close" onClick={() => setShopOpen(false)} aria-label="Закрыть магазин">×</button>
          </header>
          <ShopWeaponCards assetUrl={publicAssetUrl} />
          <footer>Будущее оружие появится в следующих обновлениях. Автоматический DPS продолжает работать, пока магазин открыт.</footer>
        </section>
      </div>}

      {abilityUnlockPresentation && <aside
        ref={abilityUnlockCardRef}
        className={`weapon-ability-unlock ${abilityUnlockPresentation.phase}`}
        style={{
          "--ability-color": WEAPONS[abilityUnlockPresentation.ability.weaponId].color,
          "--ability-flight-x": `${abilityUnlockPresentation.flightX}px`,
          "--ability-flight-y": `${abilityUnlockPresentation.flightY}px`,
        } as CSSProperties}
        role="status"
        aria-live="assertive"
      >
        <small>ОТКРЫТО НОВОЕ УМЕНИЕ</small>
        <span className="ability-unlock-icon" aria-hidden="true"><AbilityIcon name={abilityUnlockPresentation.ability.icon} /></span>
        <strong>{abilityUnlockPresentation.ability.name}</strong>
        <b>{WEAPONS[abilityUnlockPresentation.ability.weaponId].name}</b>
        <em>{abilityUnlockPresentation.ability.kind === "active" ? "АКТИВНОЕ" : "ПАССИВНОЕ"}</em>
        <p>{abilityUnlockPresentation.ability.description}</p>
      </aside>}
      {lootCoinLayer}
      {abilityAdLayer}
      {bossRewardAdLayer}
      {settingsOpen && <div className="settings-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
        <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <header className="settings-modal-header">
            <div><small>НАСТРОЙКИ</small><h2 id="settings-title">ИГРА</h2></div>
            <button type="button" className="settings-close" onClick={() => setSettingsOpen(false)} aria-label="Закрыть настройки">×</button>
          </header>
          <label className="settings-volume-label" htmlFor="music-volume">
            <span>ГРОМКОСТЬ МУЗЫКИ</span><strong>{Math.round(musicVolume * 100)}%</strong>
          </label>
          <input id="music-volume" className="settings-volume-slider" type="range" min="0" max="100" step="1"
            value={Math.round(musicVolume * 100)} onChange={(event) => setMusicVolume(Number(event.currentTarget.value) / 100)}
            aria-label="Громкость музыки" />
          <div className="settings-volume-scale" aria-hidden="true"><span>ТИШЕ</span><span>ГРОМЧЕ</span></div>
          <label className="settings-volume-label" htmlFor="effects-volume">
            <span>ГРОМКОСТЬ ЭФФЕКТОВ</span><strong>{Math.round(effectsVolume * 100)}%</strong>
          </label>
          <input id="effects-volume" className="settings-volume-slider" type="range" min="0" max="100" step="1"
            value={Math.round(effectsVolume * 100)} onChange={(event) => setEffectsVolume(Number(event.currentTarget.value) / 100)}
            aria-label="Громкость эффектов" />
          <div className="settings-volume-scale" aria-hidden="true"><span>ТИШЕ</span><span>ГРОМЧЕ</span></div>
          <section className="settings-quality" aria-label="Качество графики">
            <header><span>КАЧЕСТВО ГРАФИКИ</span><strong>{graphicsQuality === "auto" ? `АВТО · ${resolvedGraphicsQuality === "high" ? "ВЫСОКОЕ" : resolvedGraphicsQuality === "medium" ? "СРЕДНЕЕ" : "ЭКОНОМНОЕ"}` : graphicsQuality === "high" ? "ВЫСОКОЕ" : graphicsQuality === "medium" ? "СРЕДНЕЕ" : "ЭКОНОМНОЕ"}</strong></header>
            <div>
              {(["auto", "high", "medium", "economy"] as const).map((quality) => <button
                type="button"
                key={quality}
                className={graphicsQuality === quality ? "active" : ""}
                aria-pressed={graphicsQuality === quality}
                onClick={() => setGraphicsQuality(quality)}
              >{quality === "auto" ? "АВТО" : quality === "high" ? "ВЫСОКОЕ" : quality === "medium" ? "СРЕДНЕЕ" : "ЭКОНОМНОЕ"}</button>)}
            </div>
            <small>Экономный режим уменьшает количество эффектов и отключает тяжёлые свечения.</small>
          </section>
          {!__POKI_PRODUCTION__ && <section className="settings-test-progress" aria-label="Тестовый прогресс">
            <header><strong>ТЕСТОВЫЙ ПРОГРЕСС</strong><small>ВРЕМЕННО</small></header>
            <p>Отдельный слот для быстрого возвращения к нужному уровню. Обычный сброс его не удаляет.</p>
            <div className="settings-test-progress-actions">
              <button type="button" className="save" onClick={saveTestProgress}><span>▣</span><strong>СОХРАНИТЬ ПРОГРЕСС</strong></button>
              <button type="button" className="load" disabled={!testProgressInfo} onClick={() => { void loadTestProgress(); }}><span>↥</span><strong>ЗАГРУЗИТЬ ПРОГРЕСС</strong></button>
            </div>
            <small className={`settings-test-progress-status ${testProgressInfo ? "ready" : "empty"}`}>
              {testProgressInfo
                ? `СЛОТ: УРОВЕНЬ ${testProgressInfo.zone} · ОТКРЫТО ДО ${testProgressInfo.highestZone} · ${formatTestProgressDate(testProgressInfo.savedAt)}`
                : "ТЕСТОВЫЙ СЛОТ ПОКА ПУСТ"}
            </small>
          </section>}
          <button type="button" className="settings-reset-progress" onClick={resetGame}><span>↻</span><strong>СБРОСИТЬ ПРОГРЕСС</strong><small>Золото, оружие и открытые зоны</small></button>
          <button type="button" className="settings-language-button" onClick={() => setLanguageOpen(true)}><span>◎</span><strong>ЯЗЫКИ</strong><small>Язык интерфейса</small></button>
        </section>
      </div>}
      {ftueGuidePosition && <div
        className={`ftue-guide direction-${ftueGuidePosition.direction}`}
        style={{ left: ftueGuidePosition.left, top: ftueGuidePosition.top } as CSSProperties}
        role="status"
      >
        <i aria-hidden="true">➤</i>
        <strong>{ftueStep === "enemy" ? "Кликайте по врагу" : ftueStep === "gold" ? "Собирайте золото" : ftueStep === "auto-upgrade" ? "Улучшай оружие автоматическое" : ftueStep === "manual-upgrade" ? "Улучшай оружие ручное" : "Очищайте новый уровень"}</strong>
      </div>}
      {newDungeonGuide && newDungeonGuidePosition && <div
        className={`ftue-guide dungeon-unlock-ftue direction-${newDungeonGuidePosition.direction}`}
        style={{ left: newDungeonGuidePosition.left, top: newDungeonGuidePosition.top } as CSSProperties}
        role="status"
      >
        <i aria-hidden="true">➤</i>
        <strong>ПОЯВИЛСЯ НОВЫЙ ДАНЖ-БОСС</strong>
      </div>}
      {abilityTooltip && (() => {
        const isDoubleDps = abilityTooltip.abilityId === "double_dps";
        const isManualCritical = abilityTooltip.abilityId === "manual_crit";
        const ability = isDoubleDps || isManualCritical ? null : getWeaponAbility(abilityTooltip.abilityId as WeaponId);
        const kind: WeaponAbilityKind = isDoubleDps || isManualCritical ? "active" : ability!.kind;
        const name = isDoubleDps ? "Лидерство · Двойной DPS" : isManualCritical ? "Крит" : ability!.name;
        const icon = isDoubleDps ? "leadership" : isManualCritical ? "critical" : ability!.icon;
        const description = isDoubleDps
          ? "После просмотра рекламы удваивает общий DPS на 3 минуты. Перезарядка 10 минут."
          : isManualCritical ? "На 1 минуту добавляет 20% к шансу критического ручного выстрела. Перезарядка 5 минут после окончания действия."
          : ability!.description;
        const color = isDoubleDps ? "#f4cf62" : isManualCritical ? "#ffe061" : WEAPONS[ability!.weaponId].color;
        let timerLabel = "";
        let timerValue = 0;
        if (isDoubleDps) {
          timerLabel = boostActive ? "ДЕЙСТВУЕТ" : abilityCooldown > 0 ? "ДО ГОТОВНОСТИ" : "ГОТОВО";
          timerValue = boostActive ? boostRemaining : abilityCooldown;
        } else if (isManualCritical) {
          timerLabel = manualCriticalActive ? "ДЕЙСТВУЕТ" : manualCriticalCooldown > 0 ? "ДО ГОТОВНОСТИ" : "ГОТОВО";
          timerValue = manualCriticalActive ? manualCriticalRemaining : manualCriticalCooldown;
        } else if (ability!.weaponId === "blue_weapon") {
          timerLabel = iceRainActive ? "ДЕЙСТВУЕТ" : iceRainCooldown > 0 ? "ДО ГОТОВНОСТИ" : "ГОТОВО";
          timerValue = iceRainActive ? iceRainRemaining : iceRainCooldown;
        } else if (ability!.kind === "active") {
          const id = ability!.weaponId === "void_weapon" ? "abyss" : "wolf";
          const timer = game.combatAbilities[id];
          const active = timer.activeUntil > clock;
          timerValue = Math.max(0, ((active ? timer.activeUntil : timer.cooldownUntil) - clock) / 1000);
          timerLabel = active ? "ДЕЙСТВУЕТ" : timerValue > 0 ? "ДО ГОТОВНОСТИ" : "ГОТОВО";
        }
        return <span
          className={`ability-tooltip ${abilityTooltip.placement}`}
          role="tooltip"
          style={{ left: abilityTooltip.left, top: abilityTooltip.top, "--ability-color": color } as CSSProperties}
        >
          <span className={`ability-kind-badge ${kind}`}>{kind === "active" ? "АКТИВНОЕ УМЕНИЕ" : "ПАССИВНОЕ УМЕНИЕ"}</span>
          <span className="ability-tooltip-heading"><b aria-hidden="true"><AbilityIcon name={icon} /></b><strong>{name}</strong></span>
          <p>{description}</p>
          {kind === "active" && <span className="ability-tooltip-timer"><small>{timerLabel}</small><strong>{formatDuration(timerValue)}</strong></span>}
        </span>;
      })()}
      {manualUpgradeTooltip && (() => {
        const item = MANUAL_UPGRADES.find((upgrade) => upgrade.id === manualUpgradeTooltip.upgradeId);
        if (!item) return null;
        const purchased = game.clickPurchasedUpgradeIds.includes(item.id);
        const levelReady = game.clickLevel >= item.threshold;
        return <span
          className="weapon-upgrade-tooltip manual-upgrade-tooltip"
          role="tooltip"
          style={{ left: manualUpgradeTooltip.left, top: manualUpgradeTooltip.top, "--card-color": "#ffe061" } as CSSProperties}
        >
          <span className="upgrade-ability-icon"><AbilityIcon name={item.icon} /></span>
          <strong>{item.name}</strong>
          <span className={`ability-kind-badge ${item.kind}`}>{item.kind === "active" ? "АКТИВНОЕ УМЕНИЕ" : "ПАССИВНОЕ УМЕНИЕ"}</span>
          <small className={`upgrade-requirement ${levelReady ? "met" : "unmet"} ${lockedUpgradePulseId === item.id ? "pulse" : ""}`}>ТРЕБУЕТСЯ УРОВЕНЬ {item.threshold}</small>
          <p>{item.description}</p>
          <em className={purchased ? "active" : ""}>{purchased ? "✓ АКТИВНО" : <><CostCoin compact /><span>{formatNumber(item.cost)}</span></>}</em>
        </span>;
      })()}
      {upgradeTooltip && (() => {
        const weapon = WEAPONS[upgradeTooltip.weaponId];
        const state = game.weapons[upgradeTooltip.weaponId];
        const item = weapon.upgrades.find((upgrade) => upgrade.id === upgradeTooltip.upgradeId);
        if (!item) return null;
        const ability = WEAPON_LEVEL_150_ABILITIES.find((candidate) => candidate.upgradeId === item.id);
        const purchased = state.purchasedUpgradeIds.includes(item.id);
        const levelReady = state.owned && state.level >= item.threshold;
        return <span
          className="weapon-upgrade-tooltip"
          id={`${upgradeTooltip.weaponId}-${item.id}-tooltip`}
          role="tooltip"
          style={{ left: upgradeTooltip.left, top: upgradeTooltip.top, "--card-color": weapon.color } as CSSProperties}
        >
          {ability && <span className="upgrade-ability-icon"><AbilityIcon name={ability.icon} /></span>}
          <strong>{item.name}</strong>
          {ability && <span className={`ability-kind-badge ${ability.kind}`}>{ability.kind === "active" ? "АКТИВНОЕ УМЕНИЕ" : "ПАССИВНОЕ УМЕНИЕ"}</span>}
          <small className={`upgrade-requirement ${levelReady ? "met" : "unmet"} ${lockedUpgradePulseId === item.id ? "pulse" : ""}`}>ТРЕБУЕТСЯ УРОВЕНЬ {item.threshold}</small>
          <p>{item.description}</p>
          <b>УРОН ОРУЖИЯ ×{item.multiplier}</b>
          <em className={purchased ? "active" : ""}>{purchased ? "✓ АКТИВНО" : <><CostCoin compact /><span>{formatNumber(item.cost)}</span></>}</em>
        </span>;
      })()}
      {weaponUnlockTooltip && (() => {
        const weapon = WEAPONS[weaponUnlockTooltip.weaponId];
        const state = game.weapons[weaponUnlockTooltip.weaponId];
        if (state.owned) return null;
        const zoneReady = game.highestZone >= weapon.unlockZone;
        return <span
          className="weapon-unlock-tooltip"
          role="tooltip"
          style={{ left: weaponUnlockTooltip.left, top: weaponUnlockTooltip.top } as CSSProperties}
        >
          <strong>УСЛОВИЕ ОТКРЫТИЯ</strong>
          <b><span>УРОВЕНЬ {weapon.unlockZone}</span><span><CostCoin compact />{formatNumber(weapon.purchaseCost)}</span></b>
          <small>{zoneReady ? "УРОВЕНЬ ОТКРЫТ — НАКОПИТЕ ЗОЛОТО" : `СНАЧАЛА ОТКРОЙТЕ УРОВЕНЬ ${weapon.unlockZone}`}</small>
        </span>;
      })()}
      <div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className={`toast ${toast.tone}`}>{toast.text}</div>)}</div>
      {mobileOrientationGate}
    </main>
    {languageOpen && <LanguageModal language={language} onSelect={selectLanguage} onClose={() => setLanguageOpen(false)} />}
    </LocalizationBoundary>
  );
}
