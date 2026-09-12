# Подготовка билда для Poki

Дата: 2026-09-02  
Статус: `packaging_ready_sdk_integration_pending`

Главные обязательные правила находятся в [poki-implementation-and-optimization-rules.md](poki-implementation-and-optimization-rules.md).

## Что уже подготовлено

- отдельная команда сборки с отключённым GamePush;
- ZIP с `index.html` в корне;
- локальный Roboto variable font без Google Fonts;
- безопасные localStorage-адаптеры;
- Poki-контракты для аккаунта, аналитики и backend-лидерборда;
- ключ аналитического журнала может использовать префикс `poki_ignore`;
- GamePush и Poki нельзя одновременно передать в `createGameModules`.

## Что нужно закончить перед публикацией

1. Добавить официальный Poki SDK в Poki-оболочку.
2. Реализовать общий platform facade вместо прямых вызовов GamePush из `Game.tsx`.
3. Подключить `gameLoadingFinished`, `gameplayStart`, `gameplayStop`, `commercialBreak` и `rewardedBreak` без повторов.
4. Добавить вход через Poki User Accounts по явному действию игрока.
5. Проверить автоматическое cloud gamesave для авторизованного пользователя.
6. Реализовать отдельную portrait-компоновку.
7. Разделить ассеты по биомам и включить progressive loading.
8. Пройти Poki Inspector на desktop, tablet и mobile.

## Сохранение Poki

Poki автоматически синхронизирует `localStorage` и IndexedDB авторизованного игрока между устройствами. Поэтому основное сохранение остаётся в обычном localStorage-ключе. Временные данные и локальный журнал аналитики должны начинаться с `poki_ignore`, чтобы не попадать в cloud gamesave. Сжатое сохранение должно быть меньше 1 МБ.

## Сборка

После установки зависимостей:

```bash
npm run release:poki
```

Результат: версионированный `Poki production build/Clicker-Weapon-Adventure-Poki-*.zip`.

Команда принудительно отключает GamePush, выполняет TypeScript-проверку, собирает Vite production и проверяет структуру архива.

## Лидерборды Poki

В базовом Poki SDK нет зафиксированного в проекте production-лидерборда. Подготовленный `PokiLeaderboardAdapter` принимает внешний клиент, но URL и секреты в нём намеренно отсутствуют. Публичный рейтинг подключается только после выбора и одобрения backend/AUDS со стороны Poki. До этого используется локальный fallback.

## Официальные источники

- [Poki HTML5 SDK](https://developers.poki.com/guide/sdk-html5)
- [Poki User Accounts и cloud gamesaves](https://developers.poki.com/guide/accounts)
- [Poki Game Events](https://developers.poki.com/guide/game-events)
- [Poki Inspector](https://developers.poki.com/guide/inspector)
