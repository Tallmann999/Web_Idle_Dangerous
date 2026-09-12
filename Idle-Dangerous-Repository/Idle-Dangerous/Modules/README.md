# Portable Game Modules

Переносимые TypeScript-модули для HTML5/Vite-игр. Они не импортируют React и не знают структуру игрового состояния.

## Состав

- `analytics/` — локальный журнал, JSON/CSV, GamePush goals и Poki `measure()`;
- `identity/` — локальная личность, GamePush player и Poki User Accounts;
- `leaderboards/` — локальный fallback, GamePush leaderboard и контракт одобренного Poki backend;
- `saves/` — версионированное локальное/облачное сохранение с миграциями;
- `test-progress/` — отдельный локальный тестовый слот, который не очищается вместе с основным прогрессом;
- `storage/` — безопасная работа с localStorage, включая incognito;
- `gamepush/`, `poki/` — минимальные SDK-контракты без зависимости от глобальных типов площадки.

## Local

```ts
const services = createGameModules({
  namespace: "clicker_weapon_adventure",
  schemaVersion: 6,
});
```

## GamePush

```ts
const services = createGameModules({
  namespace: "clicker_weapon_adventure",
  schemaVersion: 6,
  getGamePushSdk: () => window.gamePushSdk ?? null,
  gamePushSaveField: "save_data",
});
```

GamePush-вариант добавляет облачный save adapter, платформенную аналитику, аккаунт и leaderboard.

## Poki

```ts
const services = createGameModules({
  namespace: "clicker_weapon_adventure",
  schemaVersion: 6,
  getPokiSdk: () => window.PokiSDK ?? null,
  localAnalyticsKey: "poki_ignore:clicker_weapon_adventure:analytics",
});
```

Poki автоматически синхронизирует обычные localStorage/IndexedDB-данные авторизованного игрока. Поэтому save остаётся локальным адаптером, но восстанавливается между устройствами средствами Poki. Кэши и аналитику нужно хранить с префиксом `poki_ignore`.

`getGamePushSdk` и `getPokiSdk` нельзя задавать одновременно: каждая публикационная сборка содержит только одну платформенную интеграцию.

## Сохранения

```ts
const state = await services.saves.load<MyGameState>();
services.saves.scheduleSave(nextState);
await services.saves.flush();
await services.saves.clear();
```

Временный тестовый картридж хранится отдельно от основного save и не попадает в облачную синхронизацию:

```ts
services.testProgress.save(currentState);
const cartridge = services.testProgress.load<MyGameState>();
```

Envelope содержит `schemaVersion`, `revision`, `updatedAt` и `data`. Старый raw JSON принимается как версия 1. При изменении структуры прогресса обязательна миграция.

## Аналитика

```ts
await services.analytics.track("boss_defeated", {
  zone: 10,
  attempt_number: 3,
});
```

Не отправлять отдельное событие на каждый клик. Для Poki при необходимости передать собственный `PokiEventMapper`, чтобы сопоставить внутреннее событие тройке `category/what/action`.

## Идентификация

```ts
const player = await services.identity.getCurrent();
const afterLogin = await services.identity.login();
```

Poki `login()` вызывается только по явному действию игрока. Полученный Poki token нельзя хранить; его проверяет backend, который получает устойчивый `user_id`.

## Лидерборды

```ts
await services.leaderboards.submitIfHigher("total_arsenal_dps", totalDps);
const rating = await services.leaderboards.getEntries("total_arsenal_dps", { limit: 10 });
```

GamePush работает через нативный API. Для Poki глобальный рейтинг подключается через `PokiLeaderboardClient` только после согласования backend/AUDS; без него используется локальный fallback.

## Правила переноса

В новой игре меняются только:

1. `namespace`;
2. `schemaVersion` и миграции;
3. облачное поле GamePush;
4. схема аналитических событий;
5. технические имена рейтингов;
6. platform adapter конкретной сборки.
