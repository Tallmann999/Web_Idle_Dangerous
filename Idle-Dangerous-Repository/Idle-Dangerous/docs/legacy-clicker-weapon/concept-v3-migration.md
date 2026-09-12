# CONCEPT_V3 — карта миграции проекта

**Статус:** ACTIVE / PRIMARY  
**Архитектурная формула:** Clicker Heroes-like + Weapons instead of Heroes + отдельный Global Click Damage + Selected Gun Visual only.

Этот документ фиксирует реализованную миграцию. Старые GD-спеки полезны как история прототипа, но не определяют актуальный core loop, если противоречат V3.

## KEEP

- React/Vite SPA и текущий pipeline статической сборки.
- GamePush bootstrap, аналитика, локальные/облачные сохранения.
- 35 нарезанных 2D enemy-карточек.
- Центральная кликабельная карточка врага, HP, hit flash и damage numbers.
- Идея общего автоматического урона арсенала.
- Карточки оружия, уровни, milestones/upgrades и активный skill slot.
- Тёмный мир, заражённые биомы и fantasy очищения как presentation/meta layer.

## REFINE

- `Auto damage` заменён математически точным `Total Arsenal DPS = sum(owned weapon DPS)`.
- Открытие оружия заменено покупкой за Gold.
- Milestones оформлены как отдельные покупки после достижения порогов `10/25/50/100/150`; каждый даёт `×2`, после 150-го уровня остаётся только линейное усиление.
- Старый двухбиомный маршрут заменён общей responsive-картой зон; компактная лента остаётся внутри combat screen для быстрых переходов.
- Выбранная пушка сохранена только как visual projectile / color / label selection.
- Platform save schema и актуальное V3-состояние подняты до версии 6; старые coins, power level и признанные weapons мигрируют безопасно.
- Баланс уровня оружия переведён на линейный DPS; завышенные сохранения первой V3-сборки пересчитываются один раз.

## REMOVE / DEPRECATE

- Обязательная фаза снятия corruption перед уроном по телу.
- Color matching, штраф неправильного оружия и affinity-множители в core combat.
- Selected weapon damage как часть числовой формулы клика.
- Выдача новых пушек за региональных боссов.
- Отдельный map/combat/victory маршрут старого двухбиомного прототипа.
- Boss boost через рекламную тестовую заглушку как часть основного flow.
- 45-секундный региональный boss flow.

Исторические документы и неиспользуемые runtime-ассеты удалены при очистке репозитория 2026-09-02. Git сохраняет предыдущие версии при необходимости восстановления.

## ADD

- Чистый V3 engine в `src/game/clickerV3.ts`.
- Шесть покупаемых экономических единиц-оружий.
- Bulk purchase `×1 / ×10 / ×25 / ×100 / MAX`.
- Отдельная прокачка Global Click Damage.
- Строгая структура: 10 enemies per zone.
- Boss every 5 zones, timer 30 sec.
- Boss fail → previous farming zone при сохранении доступа к retry.
- Переходы полностью ручные: обычная зачистка открывает следующую зону, но не уводит игрока с текущего фарма; карта и открытые зоны доступны даже во время death state.
- Верхняя zone navigation, левая weapon economy, вертикальный skill dock и правый battlefield.
- Статичная масштабируемая карта мира: открытые зоны доступны для фарма, закрытые видны, но недоступны.
- Зарезервированные точки расширения под skills, achievements и Purification/Rebirth.
- Активные оружейные умения как награда за покупку отдельных milestone-улучшений. Не каждое оружие обязано иметь умение; первая утверждённая связка — Кристальная винтовка, уровень 150, «Ледяной дождь». Числовые параметры и правила расширения зафиксированы в `balance-v3.md`.

## Инварианты реализации

```text
Monster → Gold → Buy/Level Weapon → Weapon joins Total DPS

Player clicks monster
→ Apply Global Click Damage
→ Play Selected Gun Visual

Zone 1..4: 10 enemies each
→ Zone 5: boss / 30 seconds
→ win: Zone 6
→ fail: Zone 4 farm
→ retry remains available
```

## Следующий слой

Rebirth/Purification пока представлен архитектурной точкой входа в нижней навигации и не начисляет permanent currency. Перед его реализацией нужно отдельно утвердить формулу Souls, reset scope и permanent upgrade catalog.
