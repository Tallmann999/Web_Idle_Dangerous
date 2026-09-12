export const BOSS_NAMES = [
  "Морана Гнилых Рощ", "Лазурный Жнец", "Нокт Гробоносец",
  "Архилич Малефар", "Горгулья Серого Собора", "Фонарник Бездонной Ночи",
  "Гракс Железнокожий", "Сапфировый Паладин", "Банши Изумрудного Плача",
  "Аметистовая Охотница", "Костерогий Разрушитель", "Хранитель Мёртвых Рун",
  "Багряный Палач", "Мортис Призрачный Скакун", "Шут Последнего Смеха",
  "Безмолвный Монах", "Могильный Стрелок", "Капитан Утонувших Душ",
] as const;

// A shuffled roster is stable across reloads: names, previews and combat agree.
export const CAMPAIGN_BOSS_ORDER = [7, 1, 10, 5, 17, 3, 9, 14, 2, 8, 6, 11, 4, 16, 12, 15, 13, 18] as const;

export function getBossName(artNumber: number): string {
  return BOSS_NAMES[(Math.max(1, Math.floor(artNumber)) - 1) % BOSS_NAMES.length];
}
