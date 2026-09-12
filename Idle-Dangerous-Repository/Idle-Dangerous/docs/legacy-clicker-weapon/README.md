# Актуальная документация Clicker Weapon Adventure

Дата очистки комплекта: 2026-09-02<br>
Статус: `active_only`

В каталоге оставлены только документы, которые нужны для дальнейшей реализации игры и платформенных сборок.

| Документ | Назначение |
|---|---|
| [project-architecture.md](project-architecture.md) | Основной стек, структура исходников и архитектурные границы |
| [concept-v3-migration.md](concept-v3-migration.md) | Актуальный core loop и инварианты V3 |
| [balance-v3.md](balance-v3.md) | Формулы роста и контроль темпа |
| [poki-implementation-and-optimization-rules.md](poki-implementation-and-optimization-rules.md) | Обязательные правила Poki: responsive, ассеты, загрузка, SDK и реклама |
| [poki-release.md](poki-release.md) | Порядок подготовки и создания Poki ZIP |
| [gamepush-release.md](gamepush-release.md) | Порядок настройки и создания GamePush ZIP |
| [platform-services.md](platform-services.md) | Аналитика, аккаунты, лидерборды и кросс-девайс сохранение |

Документация переносимых TypeScript-модулей находится в [Modules/README.md](../Modules/README.md).

## Приоритет документов

1. Для игровой логики — `concept-v3-migration.md` и текущий код.
2. Для Poki — `poki-implementation-and-optimization-rules.md` и `poki-release.md`.
3. Для GamePush — `gamepush-release.md`.
4. Для общих платформенных функций — `platform-services.md` и `Modules/README.md`.

Если требования площадки изменились, перед публикацией нужно проверить официальную документацию и обновить соответствующий платформенный документ.
