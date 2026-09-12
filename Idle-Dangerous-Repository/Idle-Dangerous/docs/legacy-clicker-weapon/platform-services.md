# Платформенные сервисы

Дата: 2026-09-02  
Статус: `module_ready_integration_partial`

## Цель

Одна игровая логика использует переносимые модули, а конкретная сборка выбирает Local, GamePush или Poki. Игрок может продолжить игру на компьютере и телефоне, если на обоих устройствах использует тот же авторизованный аккаунт той же площадки.

Это не означает автоматический перенос прогресса между разными экосистемами, например между аккаунтом Poki и аккаунтом Яндекса через GamePush.

## Состав `Modules/`

| Модуль | Local | GamePush | Poki |
|---|---|---|---|
| Аналитика | локальный журнал | `analytics.goal` | `PokiSDK.measure` |
| Идентификация | анонимный installation id | GamePush player/login | Poki User Accounts |
| Сохранение | localStorage | localStorage + поле `save_data`/sync | localStorage, автоматически синхронизируемый Poki |
| Лидерборд | локальный результат | нативный GamePush leaderboard | инъекция одобренного backend-клиента, иначе local fallback |

## Сохранения

- Формат: `portable_save_v1`.
- Обязательные поля: `schemaVersion`, `revision`, `updatedAt`, `data`.
- При старте выбирается наиболее новая корректная копия.
- Структурные изменения сопровождаются миграцией версии.
- Ошибка одного адаптера не должна ломать локальную игру.
- Запись выполняется с debounce и принудительным `flush` при `pagehide`.
- Все обращения к localStorage безопасны для incognito/запрещённого storage.

Для Poki основной save-key не должен начинаться с `poki_ignore`. Аналитика и кэши, наоборот, должны использовать этот префикс. Официальный лимит Poki cloud gamesave — 1 МБ после gzip.

## Идентификация

- Вход вызывается только явным действием игрока.
- Имя и аватар используются только для UI.
- Poki JWT живёт около минуты, не сохраняется и передаётся только backend для проверки.
- Устойчивый Poki `user_id` определяется сервером после проверки токена; клиент не декодирует токен как доказательство личности.
- Гостевой игрок всегда может играть локально.

## Лидерборды

Основные таблицы:

- `total_arsenal_dps` — постоянный DPS без временных рекламных усилений;
- `highest_zone_reached` — максимальная открытая зона.

Результат отправляется только при улучшении и по значимому событию. GamePush использует нативный leaderboard. Для Poki внешний сервис требует согласования CSP/приватности, поэтому конкретный endpoint не зашит в клиентский модуль.

## Аналитика

Не отправлять событие на каждый клик. Основные агрегированные события:

- `session_started`;
- `ftue_step_completed`;
- `zone_started`, `zone_completed`;
- `boss_started`, `boss_failed`, `boss_defeated`;
- `weapon_purchased`, `weapon_leveled`, `weapon_upgrade_purchased`;
- `shop_opened`, `shop_item_purchased`;
- `rewarded_offer_visible`, `rewarded_offer_interacted`, `reward_granted`;
- `save_loaded`, `save_conflict`, `save_failed`;
- `leaderboard_opened`, `leaderboard_score_submitted`.

Poki-реклама отслеживается самим SDK; не нужно дублировать impression/completion собственными событиями.

## Критерии приёмки кросс-девайс

1. Игрок входит на компьютере, делает покупку и закрывает игру.
2. На телефоне входит в тот же аккаунт той же площадки.
3. Восстанавливаются золото, оружие, уровни, улучшения, зоны, данжи и cooldown.
4. Offline-награда не начисляется повторно.
5. Более старая вкладка не перезаписывает молча новое облачное состояние.
6. При отсутствии сети остаётся последняя исправная локальная копия.

Официальные источники: [Poki User Accounts](https://developers.poki.com/guide/accounts), [Poki Game Events](https://developers.poki.com/guide/game-events), [GamePush SDK](https://gamepush.com/sdk/docs/).
