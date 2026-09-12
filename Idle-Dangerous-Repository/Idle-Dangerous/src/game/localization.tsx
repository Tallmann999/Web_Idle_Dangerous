import { type ReactNode, useLayoutEffect, useRef } from "react";
import { readLocalStorage, writeLocalStorage } from "../../Modules/storage/safeLocalStorage";

export type GameLanguage = "en" | "ru";

const LANGUAGE_STORAGE_KEY = "clicker-weapon-adventure-language-v1";

export function readGameLanguage(): GameLanguage {
  if (typeof window === "undefined") return "en";
  return readLocalStorage(LANGUAGE_STORAGE_KEY) === "ru" ? "ru" : "en";
}

export function writeGameLanguage(language: GameLanguage): void {
  writeLocalStorage(LANGUAGE_STORAGE_KEY, language);
}

const EXACT_ENGLISH: Record<string, string> = {
  "Активные умения": "Active abilities",
  "Двойной DPS": "Double DPS",
  "Пока в разработке": "In development",
  "Подземелье": "Dungeon",
  "Золотая жила": "Gold Mine",
  "Фокусирует энергию океана в сияющей жемчужине. Урон этого оружия дополнительно увеличивается в 2 раза.": "Focuses ocean energy in a radiant pearl. This weapon’s damage is doubled again.",
  "Жемчужина бездны": "Abyssal Pearl",
  "Сжимает мощь прилива в герметичной камере. Урон этого оружия дополнительно увеличивается в 2 раза.": "Compresses tidal power in a sealed chamber. This weapon’s damage is doubled again.",
  "Камера прилива": "Tidal Chamber",
  "Усиливает заряд в резонаторе из древних кораллов. Урон этого оружия дополнительно увеличивается в 2 раза.": "Amplifies the charge in an ancient coral resonator. This weapon’s damage is doubled again.",
  "Коралловый резонатор": "Coral Resonator",
  "Сгущает потустороннее пламя в сердце орудия. Урон этого оружия дополнительно увеличивается в 2 раза.": "Condenses otherworldly fire in the weapon’s heart. This weapon’s damage is doubled again.",
  "Ядро вечной ночи": "Eternal Night Core",
  "Удерживает силу душ внутри костяной камеры. Урон этого оружия дополнительно увеличивается в 2 раза.": "Binds soul energy inside the bone chamber. This weapon’s damage is doubled again.",
  "Печать забвения": "Oblivion Seal",
  "Расширяет канал для потока призрачной энергии. Урон этого оружия дополнительно увеличивается в 2 раза.": "Widens the channel for spectral energy. This weapon’s damage is doubled again.",
  "Призрачный канал": "Spectral Channel",
  "Собирает голос древних деревьев в единый заряд. Урон этого оружия дополнительно увеличивается в 2 раза.": "Gathers the voices of ancient trees into a single charge. This weapon’s damage is doubled again.",
  "Песнь древолесья": "Song of the Elderwood",
  "Насыщает сердцевину оружия соком древней рощи. Урон этого оружия дополнительно увеличивается в 2 раза.": "Infuses the weapon’s core with the sap of an ancient grove. This weapon’s damage is doubled again.",
  "Изумрудная жила": "Emerald Vein",
  "Направляет силу леса вдоль золотых перьев. Урон этого оружия дополнительно увеличивается в 2 раза.": "Channels forest power along the golden feathers. This weapon’s damage is doubled again.",
  "Золотое оперение": "Golden Plumage",
  "Усиливает наконечники костью первородного хищника. Урон этого оружия дополнительно увеличивается в 2 раза.": "Reinforces the spearheads with a primordial predator’s bone. This weapon’s damage is doubled again.",
  "Клык прародителя": "Primordial Fang",
  "Натягивает спусковой механизм сухожилиями левиафана. Урон этого оружия дополнительно увеличивается в 2 раза.": "Tensions the firing mechanism with leviathan sinews. This weapon’s damage is doubled again.",
  "Сухожилия исполина": "Giant Sinews",
  "Заостряет древние кости до бритвенной кромки. Урон этого оружия дополнительно увеличивается в 2 раза.": "Hones ancient bones to a razor edge. This weapon’s damage is doubled again.",
  "Костяная заточка": "Bone Honing",
  "Запирает силу извержения внутри каждого заряда. Урон этого оружия дополнительно увеличивается в 2 раза.": "Seals the force of an eruption inside every charge. This weapon’s damage is doubled again.",
  "Печать катаклизма": "Cataclysm Seal",
  "Повышает давление в раскалённом ядре. Урон этого оружия дополнительно увеличивается в 2 раза.": "Raises the pressure inside the molten core. This weapon’s damage is doubled again.",
  "Магматический пресс": "Magma Press",
  "Укрепляет затвор плитами вулканического камня. Урон этого оружия дополнительно увеличивается в 2 раза.": "Reinforces the breech with volcanic stone plates. This weapon’s damage is doubled again.",
  "Базальтовый затвор": "Basalt Breech",
  "Очищает заряд до концентрированной ядовитой эссенции. Урон этого оружия дополнительно увеличивается в 2 раза.": "Refines the charge into concentrated venom essence. This weapon’s damage is doubled again.",
  "Изумрудная эссенция": "Emerald Essence",
  "Усиливает реакцию живой отравы. Урон этого оружия дополнительно увеличивается в 2 раза.": "Intensifies the reaction of the living toxin. This weapon’s damage is doubled again.",
  "Чумной катализатор": "Plague Catalyst",
  "Сгущает яд в алхимической колбе. Урон этого оружия дополнительно увеличивается в 2 раза.": "Thickens the venom in the alchemical flask. This weapon’s damage is doubled again.",
  "Змеиный дистиллят": "Serpent Distillate",
  "Стягивает силу водоворота в единый снаряд. Урон этого оружия дополнительно увеличивается в 2 раза.": "Channels the force of a whirlpool into a single projectile. This weapon’s damage is doubled again.",
  "Сердце водоворота": "Whirlpool Heart",
  "Уплотняет заряд давлением океанских глубин. Урон этого оружия дополнительно увеличивается в 2 раза.": "Compresses the charge with deep-ocean pressure. This weapon’s damage is doubled again.",
  "Камера глубин": "Deepsea Chamber",
  "Наполняет жилы кракена штормовой энергией. Урон этого оружия дополнительно увеличивается в 2 раза.": "Fills the kraken’s veins with storm energy. This weapon’s damage is doubled again.",
  "Жила шторма": "Storm Vein",
  "Сжимает жар до плотности звёздного ядра. Урон этого оружия дополнительно увеличивается в 2 раза.": "Compresses heat to the density of a stellar core. This weapon’s damage is doubled again.",
  "Солнечное ядро": "Solar Core",
  "Укрепляет раскалённые клыки орудия. Урон этого оружия дополнительно увеличивается в 2 раза.": "Reinforces the weapon’s searing fangs. This weapon’s damage is doubled again.",
  "Клыки горнила": "Furnace Fangs",
  "Раздувает пламя в драконьей пасти. Урон этого оружия дополнительно увеличивается в 2 раза.": "Fans the flames inside the dragon’s maw. This weapon’s damage is doubled again.",
  "Драконья камера": "Dragon Chamber",
  "Оружие скоро появится в магазине.": "This weapon is coming to the shop soon.",
  "АКТ.": "ACT.",
  "ПАСС.": "PASS.",
  "УЛУЧШЕНИЕ": "UPGRADE",
  "ПРЕДПРОСМОТР": "PREVIEW",
  "Ещё в 2 раза увеличивает урон этого оружия.": "Doubles this weapon’s damage again.",
  "Увеличивает урон этого оружия в 2 раза.": "Doubles this weapon’s damage.",
  "Предел мощности": "Power Unleashed",
  "Разгон заряда": "Charge Overdrive",
  "Усиленный сердечник": "Reinforced Core",
  "На 15 секунд открывает бездну: каждую секунду выпускает 2 залпа со всех сторон. Перезарядка 10 минут.": "Opens the abyss for 15 seconds, firing 2 volleys every second from all directions. Cooldown: 10 minutes.",
  "Око Бездны": "Eye of the Abyss",
  "+20% к урону по боссам и +30% к золоту с элитных целей.": "+20% damage against bosses and +30% gold from elite targets.",
  "Трезубец Прибоя": "Surf Trident",
  "Сокровища глубин и воля океана.": "Treasures of the deep and the will of the ocean.",
  "Владыка Приливов": "Tide Sovereign",
  "15 секунд черепа кружат вокруг цели и стреляют сами. Особенно быстро плавят полоску босса.": "Skulls circle the target and fire on their own for 15 seconds. They melt boss health especially quickly.",
  "Парад Мёртвых": "Parade of the Dead",
  "После убийства врага есть 25% шанс выпустить призрачный заряд в следующую цель.": "After killing an enemy, there is a 25% chance to fire a spectral charge at the next target.",
  "Духовный Поток": "Spirit Stream",
  "Призрачный залп из-за границы жизни.": "A spectral barrage from beyond the veil of life.",
  "Жнец Заблудших Душ": "Reaper of Lost Souls",
  "20 секунд дух рощи стреляет вместе с вами и усиливает общий DPS на 25%.": "A grove spirit fires alongside you for 20 seconds and increases total DPS by 25%.",
  "Тотем Рощи": "Grove Totem",
  "+15% к скорости атаки и +12% к шансу выпустить вторую пулю.": "+15% attack speed and +12% chance to fire a second bullet.",
  "Перо Ветра": "Wind Feather",
  "Древний дух леса в золотом оперении.": "An ancient forest spirit in golden plumage.",
  "Глас Изумрудной Рощи": "Voice of the Emerald Grove",
  "15 секунд над целью идёт дождь из ледяных пуль. Они очень часто попадают и замедляют босса.": "Ice bullets rain over the target for 15 seconds. They hit very frequently and slow the boss.",
  "Ледяной Дождь": "Ice Rain",
  "Каждая атака выпускает ещё 2 костяных копья. По одиночной цели они почти всегда критуют.": "Every attack fires 2 extra bone spears. Against a single target, they almost always critically hit.",
  "Клык Охотника": "Hunter Fang",
  "Костяные копья для охоты на исполинов.": "Bone spears forged to hunt giants.",
  "Костолом Левиафана": "Leviathan Bonebreaker",
  "7 секунд сверху падают огненные осколки, поражая случайных врагов по всей арене.": "Fiery fragments rain down for 7 seconds, striking random enemies across the arena.",
  "Метеоритный Ливень": "Meteor Shower",
  "Попадания могут раскрыть под целью разлом: 3 удара магмой, оглушение на 2 секунды и огромный взрывной урон.": "Hits can open a rift beneath the target: 3 magma strikes, a 2-second stun and massive blast damage.",
  "Сердце Разлома": "Rift Heart",
  "Раскалённое ядро под бронёй из базальта.": "A molten core beneath basalt armor.",
  "Сердце Катаклизма": "Heart of Cataclysm",
  "15 секунд яд обволакивает цель: каждую секунду наносит урон и снижает броню.": "Poison envelops the target for 15 seconds, dealing damage every second and reducing armor.",
  "Ядовитый Выплеск": "Venom Surge",
  "Каждое убийство имеет 18% шанс дать двойную награду. Боссы дополнительно дают +25% золота.": "Each kill has an 18% chance to grant double rewards. Bosses also grant +25% gold.",
  "Колба Алчности": "Flask of Greed",
  "Живая отрава из запретных лабораторий.": "Living venom from forbidden laboratories.",
  "Чумной алхимик": "Plague Alchemist",
  "10 секунд штормовые щупальца бьют текущую цель 6 раз в секунду. Каждый удар усиливает следующий.": "Storm tentacles strike the current target 6 times per second for 10 seconds. Each hit strengthens the next.",
  "Щупальца Бури": "Storm Tentacles",
  "Таймер босса тикает вдвое медленнее, оставляя автопушкам больше времени для стрельбы.": "The boss timer runs at half speed, giving automatic weapons more time to fire.",
  "Часы Прилива": "Tide Clock",
  "Шторм, скованный щупальцами древнего чудовища.": "A storm bound by the tentacles of an ancient beast.",
  "Кракен Буреглот": "Stormgorger Kraken",
  "12 секунд драконье пламя жжёт текущую цель. Урон растёт каждую секунду, а по боссам действует вдвое сильнее.": "Dragon fire burns the current target for 12 seconds. Damage grows every second and is twice as strong against bosses.",
  "Пасть Пепла": "Ashen Maw",
  "Попадания накапливают заряд. Полный заряд выпускает 8 взрывных черепов, обрушивающихся на цель в течение 10 секунд.": "Hits build a charge. A full charge releases 8 explosive skulls that rain on the target over 10 seconds.",
  "Черепной залп": "Skull Barrage",
  "Драконья ярость в стальных челюстях.": "Dragon fury locked in steel jaws.",
  "Пожиратель солнц": "Sun Devourer",
  "Сумрачный лес": "Twilight Forest", "Одинокие равнины": "Lonely Plains", "Скованные хребты": "Shackled Ridges",
  "Заснеженные пики": "Snowbound Peaks", "Проклятая земля": "Cursed Land", "Разлом Хаоса": "Chaos Rift",
  "СУМРАЧНЫЙ ЛЕС": "TWILIGHT FOREST", "ОДИНОКИЕ РАВНИНЫ": "LONELY PLAINS", "СКОВАННЫЕ ХРЕБТЫ": "SHACKLED RIDGES",
  "ЗАСНЕЖЕННЫЕ ПИКИ": "SNOWBOUND PEAKS", "ПРОКЛЯТАЯ ЗЕМЛЯ": "CURSED LAND", "РАЗЛОМ ХАОСА": "CHAOS RIFT",
  "Заражённый лес": "Corrupted Forest", "Кристальные высоты": "Crystal Heights", "Пепельная пустошь": "Ashen Wasteland",
  "Серый импульсник": "Gray Pulser", "Биоплазменный жезл": "Bioplasma Staff", "Кристальная винтовка": "Crystal Rifle",
  "Пушка Бездны": "Void Cannon", "Солнечный очиститель": "Solar Purifier", "Реликтовый разлом": "Relic Rift",
  "Стабилизатор": "Stabilizer", "Импульсная камера": "Pulse Chamber", "Боевой резонатор": "Combat Resonator", "Протокол Омега": "Omega Protocol",
  "Живая мембрана": "Living Membrane", "Плазменный кокон": "Plasma Cocoon", "Споровый резонанс": "Spore Resonance", "Сердце биоплазмы": "Bioplasma Heart",
  "Ледяная линза": "Ice Lens", "Глубокая заморозка": "Deep Freeze", "Осколочный резонанс": "Shard Resonance", "Абсолютный ноль": "Absolute Zero",
  "Магматическая трещина": "Magma Fissure", "Давление Бездны": "Void Pressure", "Фиолетовое извержение": "Violet Eruption", "Сингулярность": "Singularity",
  "Солнечная катушка": "Solar Coil", "Высокое напряжение": "High Voltage", "Цепная дуга": "Chain Arc", "Корона звезды": "Star Crown",
  "Гелевая оболочка": "Gel Shell", "Живой полимер": "Living Polymer", "Реликтовая реакция": "Relic Reaction", "Память эпохи": "Memory of Ages",
  "Ловкость": "Agility", "Скорость": "Speed", "Ледяной дождь": "Ice Rain", "Бездна": "Abyss", "Мешок золота": "Bag of Gold", "Призыв волка": "Summon Wolf",
  "Точный импульс": "Precise Pulse", "Золотая хватка": "Golden Grip", "Острое зрение": "Keen Eye", "Двойной разряд": "Double Discharge", "Крит": "Critical Surge",
  "Астральная пушка": "Astral Cannon", "Драконий реактор": "Dragon Reactor", "Хроновинтовка": "Chrono Rifle", "Излучатель Серафима": "Seraph Emitter",
  "Пожиратель порчи": "Corruption Devourer", "Корона Бури": "Storm Crown", "Звёздный залп": "Star Volley", "Сердце дракона": "Dragon Heart",
  "Остановка времени": "Time Stop", "Свет возмездия": "Light of Vengeance", "Жатва глубин": "Harvest of the Depths", "Вечный шторм": "Eternal Storm",
  "Морана Гнилых Рощ": "Morana of the Rotten Groves", "Лазурный Жнец": "Azure Reaper", "Нокт Гробоносец": "Noct the Coffin Bearer",
  "Архилич Малефар": "Archlich Malefar", "Горгулья Серого Собора": "Gargoyle of the Gray Cathedral", "Фонарник Бездонной Ночи": "Lantern Wraith of the Bottomless Night",
  "Гракс Железнокожий": "Grax Ironhide", "Сапфировый Паладин": "Sapphire Paladin", "Банши Изумрудного Плача": "Banshee of the Emerald Lament",
  "Аметистовая Охотница": "Amethyst Huntress", "Костерогий Разрушитель": "Bonehorn Destroyer", "Хранитель Мёртвых Рун": "Keeper of Dead Runes",
  "Багряный Палач": "Crimson Executioner", "Мортис Призрачный Скакун": "Mortis the Phantom Steed", "Шут Последнего Смеха": "Jester of the Last Laugh",
  "Безмолвный Монах": "Silent Monk", "Могильный Стрелок": "Grave Marksman", "Капитан Утонувших Душ": "Captain of Drowned Souls",
  "Шиполистый налётчик": "Thornleaf Raider", "Терновый потрошитель": "Briar Ripper", "Споровый пророк": "Spore Prophet", "Корнекоготь": "Rootclaw",
  "Жабий копейщик": "Toad Spearman", "Болотный громила": "Marsh Brute", "Грибной часовой": "Mushroom Sentinel", "Паутинный жрец": "Web Priest",
  "Мшистый древень": "Moss Treant", "Серый лунозверь": "Gray Moonbeast", "Клыкастый ловчий": "Fanged Trapper", "Хранительница чащи": "Grove Keeper",
  "Моховой исполин": "Moss Colossus", "Багряный мухомор": "Crimson Toadstool", "Костяной пауколаз": "Bone Webcrawler", "Вороний оракул": "Raven Oracle",
  "Седогривый рубака": "Graymane Cleaver", "Костеклыкий вепрь": "Bonefang Boar", "Чернокрылый дозорный": "Blackwing Sentinel", "Крысолов пустошей": "Wasteland Ratcatcher",
  "Камышовый жабр": "Reed Toadkin", "Рогатый тотемщик": "Horned Totemist", "Степной гиенар": "Steppe Hyenakin", "Красночешуйчатый резак": "Redscale Carver",
  "Ночной ушан": "Night Batling", "Вороний костевед": "Raven Bonesage", "Бараний громила": "Ram Brute", "Панцирный болотник": "Shellback Mireling",
  "Белошкурый крушитель": "Whitehide Crusher", "Кристальный медвежрец": "Crystal Bearpriest", "Снежная рысь-охотница": "Snow Lynx Huntress", "Ледокоготь": "Iceclaw",
  "Дух синей метели": "Spirit of the Blue Blizzard", "Осколочный берсерк": "Shard Berserker", "Лютый ледовед": "Dire Icemancer", "Резчик снегов": "Snow Carver",
  "Полярный фантом": "Polar Phantom", "Морозный лич": "Frost Lich", "Кристальный титан": "Crystal Titan", "Клыкастый владыка": "Fanged Overlord",
  "Гранитный ледолом": "Granite Icebreaker", "Кристальный шаман": "Crystal Shaman", "Зеркальный бастион": "Mirror Bastion", "Снеговик-людоед": "Ogre Snowman",
  "Хрустальный паук": "Crystal Spider", "Ледяная пряха": "Ice Weaver", "Матка белых пещер": "Broodmother of the White Caves", "Полярный костолом": "Polar Bonebreaker",
  "Пятнистый морозник": "Spotted Frostbeast", "Странник инея": "Rime Wanderer", "Ледяной колосс": "Ice Colossus", "Плакальщица вьюги": "Blizzard Mourner",
  "Белогривый оборотень": "Whitemane Werewolf", "Сова ледяных копий": "Ice-Spear Owl", "Рогатый ледозверь": "Horned Icebeast", "Призрачный олень": "Phantom Stag",
  "Споровый гоблин": "Spore Goblin", "Око гнилого корня": "Eye of the Rotten Root", "Чумная крыса": "Plague Rat", "Порченый голем": "Corrupted Golem",
  "Багряная паучиха": "Crimson Spider", "Многоногий пожиратель": "Many-Legged Devourer", "Кровавый древень": "Blood Treant", "Дух алой скверны": "Spirit of Scarlet Blight",
  "Гнойный студень": "Festering Slime", "Пузырчатый паук": "Blister Spider", "Дупляной душегуб": "Hollow Soulreaver", "Гнилокрыс": "Rotrat",
  "Живая язва": "Living Blight", "Моровой камнелом": "Plague Stonebreaker", "Шёпот разложения": "Whisper of Decay", "Костяной древесник": "Bonewood Horror",
  "Магмовый громила": "Magma Brute", "Обсидиановая виверна": "Obsidian Wyvern", "Танцовщица пламени": "Flame Dancer", "Дымный провидец": "Smoke Seer",
  "Огнегривый ящер": "Firemane Lizard", "Лавовый волколак": "Lava Werewolf", "Цепной инфернал": "Chained Infernal", "Панцирь вулкана": "Volcanic Shell",
  "Око базальта": "Eye of Basalt", "Пламенный разрушитель": "Flame Destroyer", "Дух жерла": "Spirit of the Crater", "Владыка раскола": "Lord of the Rift",
  "Адская гончая": "Hellhound", "Рогатый огневед": "Horned Pyromancer", "Пепельный вепрь": "Ash Boar", "Хранитель часа пепла": "Keeper of the Ashen Hour",
  "ЛОГОВО КОРНЕЙ": "ROOT DEN", "ЗАТОПЛЕННАЯ ЧАЩА": "FLOODED GROVE", "КАМЕННЫЙ КУРГАН": "STONE BARROW", "ЗАБЫТЫЙ КУРГАН": "FORGOTTEN BARROW",
  "КРИСТАЛЬНАЯ ШАХТА": "CRYSTAL MINE", "ЛЕДЯНОЙ РАЗЛОМ": "ICE RIFT", "СНЕЖНАЯ БЕЗДНА": "SNOW ABYSS", "СЕРДЦЕ МЕТЕЛИ": "HEART OF THE BLIZZARD",
  "МЁРТВАЯ РОЩА": "DEAD GROVE", "АЛТАРЬ ПОРЧИ": "ALTAR OF CORRUPTION", "ОГНЕННЫЙ КРАТЕР": "FIRE CRATER", "СЕРДЦЕ ХАОСА": "HEART OF CHAOS",
  "Надёжное оружие очищающего корпуса": "Reliable weapon of the cleansing corps", "Живая энергия заражённого леса": "Living energy of the corrupted forest",
  "Сжатый луч ледяных высот": "A focused beam from the frozen heights", "Разрывает саму ткань порчи": "Tears through the fabric of corruption",
  "Сжигает тьму концентрированным светом": "Burns darkness with concentrated light", "Орудие забытой эпохи магов": "A weapon from a forgotten age of mages",
  "Орудие, собранное из осколков звёздного ядра.": "A weapon forged from fragments of a stellar core.", "Тяжёлое оружие с живым огненным сердцем.": "A heavy weapon with a living fiery heart.",
  "Экспериментальная винтовка хранителей времени.": "An experimental rifle of the timekeepers.", "Чистый свет, заключённый в боевой механизм.": "Pure light sealed inside a war machine.",
  "Древняя пушка, питающаяся энергией заражения.": "An ancient cannon fed by corrupted energy.", "Реликтовая установка повелителей грозы.": "A relic device built by the lords of storms.",
  "Хранитель сумрачных корней": "Guardian of Twilight Roots", "Страж затонувшей чащи": "Warden of the Flooded Grove",
  "Каменный исполин равнин": "Stone Colossus of the Plains", "Одинокий владыка степей": "Lone Lord of the Steppes",
  "Осколочный колосс": "Shard Colossus", "Скованный древний": "The Shackled Ancient", "Белый пожиратель": "White Devourer",
  "Владыка вечной метели": "Lord of the Eternal Blizzard", "Проклятый древень": "Cursed Treant", "Архонт багровой порчи": "Archon of Crimson Corruption",
  "Лавовый левиафан": "Lava Leviathan", "Пожиратель разлома": "Rift Devourer",
  "Даёт ручным выстрелам 2% шанс нанести критический урон ×2.": "Gives manual shots a 2% chance to deal ×2 critical damage.",
  "+10% золота за победу над любым монстром, включая боссов и данжи.": "+10% gold for defeating any monster, including bosses and dungeons.",
  "Повышает базовый шанс критического ручного выстрела с 2% до 5%.": "Raises the base manual critical-hit chance from 2% to 5%.",
  "Даёт каждому ручному выстрелу отдельный 5% шанс нанести двойной урон.": "Gives every manual shot an independent 5% chance to deal double damage.",
  "На 1 минуту добавляет 20% к шансу критического ручного выстрела. Перезарядка начинается после действия и длится 5 минут.": "Adds 20 percentage points to manual critical chance for 1 minute. A 5-minute cooldown begins when the effect ends.",
  "+10% к DPS Серого импульсника за каждый уровень после 150-го. Бонусы складываются.": "+10% Gray Pulser DPS for every level after 150. Bonuses stack.",
  "+1% к скорости автоматических атак жезла за каждый уровень после 150-го. Увеличивает DPS этого оружия.": "+1% Bioplasma Staff attack speed for every level after 150, increasing this weapon's DPS.",
  "15 секунд выпускает 5–6 залпов в секунду, по 3 ледяных снаряда в каждом. Перезарядка 10 минут.": "Fires 5–6 volleys per second for 15 seconds, with 3 ice projectiles per volley. Cooldown: 10 minutes.",
  "10 глаз атакуют со всех сторон 12 секунд. Каждый стреляет 4 раза в секунду с уроном ×1 общего DPS за попадание. Перезарядка 10 минут.": "Ten eyes attack from every direction for 12 seconds. Each fires 4 times per second and every hit deals ×1 total DPS. Cooldown: 10 minutes.",
  "+30% золота за победу над любым монстром, включая боссов и данжи.": "+30% gold for defeating any monster, including bosses and dungeons.",
  "Волк атакует 20 секунд: 5 ударов в секунду, каждый с уроном ×2 общего DPS. Перезарядка 3 минуты.": "The wolf attacks for 20 seconds: 5 strikes per second, each dealing ×2 total DPS. Cooldown: 3 minutes.",
  "Урон Серого импульсника увеличивается в 2 раза. Ловкость: каждый уровень после 150-го дополнительно даёт +10% к DPS этого оружия. Бонусы складываются.": "Gray Pulser damage is doubled. Agility: every level after 150 adds another +10% to this weapon's DPS. Bonuses stack.",
  "Урон жезла увеличивается в 2 раза. Каждый уровень после 150-го дополнительно повышает скорость его автоматических атак на 1%, увеличивая DPS жезла. Бонусы складываются.": "Staff damage is doubled. Every level after 150 adds 1% automatic attack speed, increasing the staff's DPS. Bonuses stack.",
  "Урон Кристальной винтовки увеличивается в 2 раза. Открывает умение «Ледяной дождь»: град ледяных снарядов наносит урон ручной атаки.": "Crystal Rifle damage is doubled. Unlocks Ice Rain: a hail of ice projectiles deals manual-attack damage.",
  "Урон пушки увеличивается в 2 раза. Бездна: 10 глаз стреляют со всех сторон, каждый по 4 раза в секунду. Попадание наносит ×1 общего DPS. Длительность 12 секунд, затем перезарядка 10 минут.": "Void Cannon damage is doubled. Abyss: ten eyes fire from every direction, each 4 times per second. Every hit deals ×1 total DPS. Duration: 12 seconds; cooldown: 10 minutes.",
  "Урон очистителя увеличивается в 2 раза. Мешок золота: +30% золота за победу над любым монстром, включая боссов и данжи.": "Solar Purifier damage is doubled. Bag of Gold: +30% gold for defeating any monster, including bosses and dungeons.",
  "Урон разлома увеличивается в 2 раза. Призывает волка на 20 секунд: 5 ударов в секунду, каждый с уроном ×2 общего DPS. Затем перезарядка 3 минуты.": "Relic Rift damage is doubled. Summons a wolf for 20 seconds: 5 strikes per second, each dealing ×2 total DPS. Cooldown: 3 minutes.",
  "Вызывает серию мощных звёздных ударов по текущему врагу.": "Calls down a series of powerful star strikes on the current enemy.",
  "Постоянно усиливает урон, наносимый всем боссам.": "Permanently increases damage dealt to all bosses.",
  "На короткое время останавливает таймер испытания босса.": "Briefly stops the boss challenge timer.",
  "Периодически превращает обычную атаку в сокрушительный удар.": "Periodically turns a normal attack into a crushing strike.",
  "Увеличивает награды, получаемые за победы в данжах.": "Increases rewards earned from dungeon victories.",
  "Обрушивает на врага непрерывную цепь молний.": "Unleashes a continuous chain of lightning on the enemy.",
  "ПОПЫТКА ПРЕРВАНА — БОСС ВОССТАНОВИЛ ЗДОРОВЬЕ": "ATTEMPT ABANDONED — BOSS HEALTH RESTORED",
  "НЕЗАВЕРШЁННАЯ ПОПЫТКА СБРОШЕНА — БОСС ВОССТАНОВИЛ ЗДОРОВЬЕ": "INTERRUPTED ATTEMPT RESET — BOSS HEALTH RESTORED",
  "ВРЕМЯ ВЫШЛО — БОСС ВОССТАНОВИЛ ЗДОРОВЬЕ": "TIME EXPIRED — BOSS HEALTH RESTORED",
  "ИМПУЛЬСНИК": "PULSER", "БИОПЛАЗМА": "BIOPLASMA", "КРИСТАЛЛ": "CRYSTAL", "БЕЗДНА": "ABYSS", "СОЛНЦЕ": "SUN", "РЕЛИКТ": "RELIC",
  "импульсный сердечник": "the pulse core", "живую биоплазму": "living bioplasma", "ледяной кристалл": "the ice crystal",
  "магму Бездны": "Void magma", "солнечный разряд": "the solar discharge", "реликтовый гель": "relic gel",
  "ВЫСОТЫ": "HEIGHTS", "ПУСТОШЬ": "WASTELAND", "ЛЕС": "FOREST",
  "КРИТ +20%": "CRIT +20%", "ЛЕДЯНОЙ ДОЖДЬ": "ICE RAIN", "СЕКУНД": "SECONDS", "РЕКЛАМА": "AD",
  "Глобальная карта регионов": "Global region map", "Регион": "Region", "ТЕСТ": "TEST", "ПАССИВНОЕ": "PASSIVE",
  "СЕРАЯ ПУШКА": "GRAY GUN", "СЕРАЯ": "GRAY", "ДОСТУПНА СО СТАРТА": "AVAILABLE FROM START",
  "ФИОЛЕТОВАЯ ПУШКА": "VIOLET GUN", "ФИОЛЕТОВАЯ": "VIOLET", "ПОБЕДИТЕ БОССА ЛЕСА": "DEFEAT THE FOREST BOSS",
  "ГОЛУБАЯ ПУШКА": "BLUE GUN", "ГОЛУБАЯ": "BLUE", "ПОБЕДИТЕ БОССА ВЫСОТ": "DEFEAT THE HEIGHTS BOSS",
  "БОСС ЛЕСА": "FOREST BOSS", "БОСС ВЫСОТ": "HEIGHTS BOSS", "ТОЧКА 1": "POINT 1", "ТОЧКА 2": "POINT 2",
  "ЗАРАЖЁННЫЙ ЛЕС": "CORRUPTED FOREST", "КРИСТАЛЬНЫЕ ВЫСОТЫ": "CRYSTAL HEIGHTS",
  "Лесная опушка": "Forest Edge", "Сердце леса": "Heart of the Forest", "Подножие высот": "Foot of the Heights", "Кристальный престол": "Crystal Throne",
  "Хранитель заражённого леса": "Guardian of the Corrupted Forest", "Владыка кристальных высот": "Lord of the Crystal Heights",
  "АКТИВНОЕ": "ACTIVE", "МОНЕТ": "COINS", "ЧЕРЕЗ": "IN", "открыто": "unlocked", "скоро": "soon",
};

const PHRASE_ENGLISH: readonly [string, string][] = [
  ["Фокусирует ", "Focuses "], ["Уплотняет ", "Condenses "], ["Вводит ", "Drives "], ["Пробуждает ", "Awakens "],
  ["Завершает специализацию: ", "Completes specialization: "],
  [". Урон этого оружия дополнительно увеличивается в 2 раза.", ". This weapon's damage is doubled again."],
  [". Урон этого оружия увеличивается в 2 раза.", ". This weapon's damage is doubled."],
  [" в боевой резонанс. Урон этого оружия увеличивается в 2 раза.", " into combat resonance. This weapon's damage is doubled."],
  [" достигает предельной формы. Урон этого оружия увеличивается в 2 раза. После этого каждый уровень даёт линейное усиление без новых способностей.", " reaches its ultimate form. This weapon's damage is doubled. Every later level grants linear growth without new abilities."],
  ["Босс побеждён! Открыт уровень", "Boss defeated! Level unlocked:"], ["побеждён — награда", "defeated — reward:"],
  ["Дополнительные", "Extra"], ["Босс уровня", "Level boss"], ["Испытание прервано — уровень", "Challenge interrupted — level"],
  ["Загрузить тестовый прогресс с уровня", "Load test progress from level"],
  ["секунд закончились — проверка завершена", "seconds ended — test complete"], ["секунд закончились — возвращение в зону", "seconds ended — returning to level"],
  ["добавлен в арсенал", "added to the arsenal"], ["Урон клика повышен до", "Click damage raised to"], ["уже повержен", "already defeated"], ["покинут", "abandoned"],
  ["Испытание прервано — возвращение в зону", "Challenge interrupted — returning to level"],
  ["Откроется после победы над боссом уровня", "Unlocks after defeating the level boss"], ["Ледяной дождь активен", "Ice Rain active for"],
  ["Крит: +20% к шансу на", "Critical Surge: +20% chance for"], ["×2 к общему DPS активно", "×2 total DPS active for"],
  ["Босс устоял — возвращение в зону", "Boss survived — returning to level"],
  ["Данж откроется после победы над боссом уровня", "Dungeon unlocks after defeating the level boss"], ["Данж перезаряжается:", "Dungeon cooldown:"],
  ["Тестовый прогресс сохранён: уровень", "Test progress saved: level"], ["Текущий прогресс будет заменён.", "Current progress will be replaced."],
  ["Тестовый прогресс загружен: уровень", "Test progress loaded: level"], ["АКТИВИРОВАТЬ ×2 DPS", "ACTIVATE ×2 DPS"],
  ["×2 DPS · 15 СЕКУНД", "×2 DPS · 15 SECONDS"],
  ["Посмотрите рекламу, чтобы продолжить бой с текущим здоровьем босса и удвоить общий DPS.", "Watch an ad to continue with the boss's current health and double total DPS."],
  ["Игрок находится в регионе", "Player is in region"], [", босс", ", boss"], ["ПОСЛЕ БОССА", "AFTER BOSS"], ["БОСС УРОВНЯ", "LEVEL BOSS"],
  ["×2 HP БОССА", "×2 BOSS HP"], ["РЕКЛАМА…", "AD…"], ["×2 ОБЩИЙ DPS", "×2 TOTAL DPS"], ["ОТКРЫТО ДО", "UNLOCKED THROUGH"],
  [", готово", ", ready"], [", пассивное умение.", ", passive ability."],
  ["На 1 минуту добавляет 20% к шансу критического ручного выстрела. Перезарядка 5 минут после окончания действия.", "Adds 20 percentage points to manual critical chance for 1 minute. Cooldown: 5 minutes after the effect ends."],
  ["Очистите:", "Cleanse:"], ["Победите:", "Defeat:"], ["Прототип завершён — можно вернуться к фарму", "Prototype complete — you can return to farming"],
  ["ПРОБУЖДЕНИЕ АРСЕНАЛА", "ARSENAL AWAKENING"], ["Загрузка очищенного мира…", "Loading the cleansed world…"],
  ["ОТКРЫТО НОВОЕ УМЕНИЕ", "NEW ABILITY UNLOCKED"], ["АКТИВНОЕ УМЕНИЕ", "ACTIVE ABILITY"], ["ПАССИВНОЕ УМЕНИЕ", "PASSIVE ABILITY"],
  ["ТЕСТОВЫЙ РЕКЛАМНЫЙ БАННЕР", "TEST REWARDED AD"], ["Активация станет доступна через", "Activation available in"],
  ["Если закрыть окно раньше времени, награда не будет получена.", "Closing early will forfeit the reward."],
  ["ПРОДОЛЖИТЬ ПРОСМОТР", "CONTINUE WATCHING"], ["ЗАКРЫТЬ БЕЗ НАГРАДЫ", "CLOSE WITHOUT REWARD"], ["ЗАКРЫТЬ РЕКЛАМУ?", "CLOSE THE AD?"],
  ["ПОСЛЕДНИЙ ШАНС", "LAST CHANCE"], ["Усиление станет доступно через", "Boost available in"], ["Ожидание результата рекламы…", "Waiting for the ad result…"], ["ПРОДОЛЖИТЬ С ×2 DPS", "CONTINUE WITH ×2 DPS"],
  ["СМОТРЕТЬ РЕКЛАМУ · ×2 DPS", "WATCH AD · ×2 DPS"], ["ВЕРНУТЬСЯ НА ПРОШЛЫЙ УРОВЕНЬ", "RETURN TO PREVIOUS LEVEL"], ["ПОВТОРИТЬ РЕКЛАМУ", "RETRY AD"],
  ["ПОВЕРНИТЕ ТЕЛЕФОН", "ROTATE YOUR PHONE"], ["Для полного интерфейса игры используйте горизонтальный режим.", "Use landscape mode for the full game interface."],
  ["ПРОДОЛЖИТЬ ВЕРТИКАЛЬНО", "CONTINUE IN PORTRAIT"], ["ГЛОБАЛЬНАЯ КАРТА РЕГИОНОВ", "GLOBAL REGION MAP"], ["ОБЗОР ВСЕГО МИРА", "WHOLE WORLD OVERVIEW"],
  ["Выберите открытый уровень или данж. Данжи перезаряжаются 10 минут после победы.", "Choose an unlocked level or dungeon. Dungeons recharge for 10 minutes after victory."],
  ["Выберите открытую территорию. Точка показывает, в какой части мира находится игрок.", "Choose an unlocked territory. The marker shows the player's current region."],
  ["ДАНЖ-БОСС МОЖНО БУДЕТ АТАКОВАТЬ ЧЕРЕЗ", "DUNGEON BOSS AVAILABLE IN"], ["ПОЯВИЛСЯ НОВЫЙ ДАНЖ-БОСС", "NEW DUNGEON BOSS AVAILABLE"],
  ["ГРОМКОСТЬ МУЗЫКИ", "MUSIC VOLUME"], ["ГРОМКОСТЬ ЭФФЕКТОВ", "EFFECTS VOLUME"],
  ["Громкость музыки", "Music volume"], ["Громкость эффектов", "Effects volume"],
  ["ОБЩАЯ ГРОМКОСТЬ", "MASTER VOLUME"], ["КАЧЕСТВО ГРАФИКИ", "GRAPHICS QUALITY"], ["ТЕСТОВЫЙ ПРОГРЕСС", "TEST PROGRESS"],
  ["Отдельный слот для быстрого возвращения к нужному уровню. Обычный сброс его не удаляет.", "A separate slot for quickly returning to a chosen level. A normal reset does not remove it."],
  ["Экономный режим уменьшает количество эффектов и отключает тяжёлые свечения.", "Economy mode reduces effects and disables costly glows."],
  ["СОХРАНИТЬ ПРОГРЕСС", "SAVE PROGRESS"], ["ЗАГРУЗИТЬ ПРОГРЕСС", "LOAD PROGRESS"], ["ТЕСТОВЫЙ СЛОТ ПОКА ПУСТ", "TEST SLOT IS EMPTY"],
  ["СБРОСИТЬ ПРОГРЕСС", "RESET PROGRESS"], ["Золото, оружие и открытые зоны", "Gold, weapons and unlocked levels"],
  ["Кликайте по врагу", "Click the enemy"], ["Собирайте золото", "Collect gold"], ["Улучшай оружие автоматическое", "Upgrade your automatic weapon"],
  ["Улучшай оружие ручное", "Upgrade your manual weapon"], ["Очищайте новый уровень", "Cleanse the new level"],
  ["Урон любого визуального оружия", "Damage of any selected weapon"], ["РУЧНАЯ МАГИЯ", "MANUAL MAGIC"], ["КОЛИЧЕСТВО ПОКУПАЕМЫХ УРОВНЕЙ", "NUMBER OF LEVELS TO BUY"],
  ["ВЫБРАТЬ ВИЗУАЛ", "SELECT APPEARANCE"], ["ВИЗУАЛ АКТИВЕН", "APPEARANCE ACTIVE"], ["НЕ КУПЛЕНО", "NOT OWNED"], ["НОВОЕ ОРУЖИЕ", "NEW WEAPON"],
  ["ПОСЛЕ ПОКУПКИ", "AFTER PURCHASE"], ["МАКС. УРОВЕНЬ", "MAX LEVEL"], ["НЕДОСТАТОЧНО", "NOT ENOUGH"], ["УСЛОВИЕ ОТКРЫТИЯ", "UNLOCK REQUIREMENT"],
  ["УРОВЕНЬ ОТКРЫТ — НАКОПИТЕ ЗОЛОТО", "LEVEL UNLOCKED — SAVE MORE GOLD"], ["СНАЧАЛА ОТКРОЙТЕ УРОВЕНЬ", "UNLOCK LEVEL FIRST"],
  ["ТРЕБУЕТСЯ УРОВЕНЬ", "REQUIRES LEVEL"], ["УРОН ОРУЖИЯ", "WEAPON DAMAGE"], ["УРОН ЗА КЛИК", "DAMAGE PER CLICK"], ["ОБЩИЙ УРОН", "TOTAL DAMAGE"],
  ["АКТИВНЫЕ И ПАССИВНЫЕ СПОСОБНОСТИ", "ACTIVE AND PASSIVE ABILITIES"], ["Умение закрыто", "Ability locked"], ["ДО ГОТОВНОСТИ", "UNTIL READY"],
  ["ПЕРЕЗАРЯДКА", "COOLDOWN"], ["ДЕЙСТВУЕТ", "ACTIVE"], ["ПАССИВНО", "PASSIVE"], ["АКТИВНО", "ACTIVE"], ["активно", "active"], ["ГОТОВО", "READY"],
  ["Лидерство · Двойной DPS", "Leadership · Double DPS"], ["После просмотра рекламы удваивает общий DPS на 3 минуты. Перезарядка 10 минут.", "After an ad, doubles total DPS for 3 minutes. Cooldown: 10 minutes."],
  ["КАРТА РЕГИОНА", "REGION MAP"], ["КАРТА МИРА", "WORLD MAP"], ["ОТКРЫТО УРОВНЕЙ", "LEVELS UNLOCKED"], ["ТЕКУЩИЙ УРОВЕНЬ", "CURRENT LEVEL"],
  ["МИР", "WORLD"], ["ПРЕДЫДУЩИЙ РЕГИОН", "PREVIOUS REGION"], ["СЛЕДУЮЩИЙ РЕГИОН", "NEXT REGION"], ["БОСС ПОВЕРЖЕН", "BOSS DEFEATED"],
  ["ДАНЖ · БОСС", "DUNGEON · BOSS"], ["ВРЕМЯ ВЫШЛО", "TIME EXPIRED"], ["БОСС УСТОЯЛ", "BOSS SURVIVED"], ["ВЫЙТИ НА КАРТУ", "EXIT TO MAP"],
  ["Посмотрите рекламу и повторите попытку с двойным DPS либо вернитесь позже.", "Watch an ad and retry with double DPS, or return later."],
  ["РЕКЛАМНОЕ УСИЛЕНИЕ", "AD BOOST"], ["ТЕСТОВЫЙ БОСС", "TEST BOSS"], ["ТЕСТОВАЯ ЦЕЛЬ", "TEST TARGET"], ["ОСТАЛОСЬ", "REMAINING"],
  ["Арсенал", "Arsenal"], ["Магазин", "Shop"], ["Очищение", "Cleansing"], ["Достижения", "Achievements"], ["Настройки", "Settings"],
  ["СНАБЖЕНИЕ", "SUPPLIES"], ["МАГАЗИН ОРУЖИЯ", "WEAPON SHOP"], ["СПРАЙТ ОРУЖИЯ", "WEAPON SPRITE"], ["Будущее оружие появится в следующих обновлениях. Автоматический DPS продолжает работать, пока магазин открыт.", "Future weapons will arrive in later updates. Automatic DPS continues while the shop is open."],
  ["НАСТРОЙКИ", "SETTINGS"], ["ВЫБОР ЯЗЫКА", "CHOOSE LANGUAGE"], ["ЯЗЫКИ", "LANGUAGES"], ["ВЫБЕРИТЕ ЯЗЫК", "CHOOSE LANGUAGE"], ["Язык интерфейса", "Interface language"],
  ["Интерфейс готов для добавления новых языков.", "The interface is ready for additional languages."],
  ["Место для будущего спрайта оружия", "Future weapon sprite placeholder"], ["Испытание провалено", "Challenge failed"],
  ["Монеты с поверженных врагов", "Coins from defeated enemies"], ["Активные и пассивные способности", "Active and passive abilities"],
  ["Улучшения ручного оружия", "Manual weapon upgrades"], ["Общая громкость", "Master volume"], ["Качество графики", "Graphics quality"],
  ["Отключить звуки", "Disable sound"], ["Включить звуки", "Enable sound"], ["Активировать двойной DPS за рекламу", "Activate double DPS by watching an ad"],
  ["Активировать Ледяной дождь", "Activate Ice Rain"], ["Активировать Крит", "Activate Critical Surge"],
  ["Крит активен, осталось", "Critical Surge active, remaining"], ["Крит перезаряжается, осталось", "Critical Surge cooldown, remaining"],
  ["Ледяной дождь активен, осталось", "Ice Rain active, remaining"], ["Ледяной дождь перезаряжается, осталось", "Ice Rain cooldown, remaining"],
  ["Двойной DPS, осталось", "Double DPS, remaining"], ["Перезагрузка, осталось", "Cooldown, remaining"],
  ["Количество покупаемых уровней", "Number of levels to buy"], ["Выбрать визуал", "Select appearance"], ["доступно для покупки", "available to buy"], ["закрыто", "locked"],
  ["Тестовый прогресс", "Test progress"], ["Карта региона", "Region map"], ["УРОВНИ", "LEVELS"], ["Уровень", "Level"], ["уровень", "level"],
  ["здесь находится игрок", "player is here"], ["Переключение регионов", "Region navigation"], ["Предыдущего региона нет", "No previous region"], ["Следующего региона нет", "No next region"],
  ["Предыдущий регион:", "Previous region:"], ["Следующий регион:", "Next region:"], ["ещё закрыт", "is still locked"], ["закрыта", "locked"], ["открыта", "unlocked"],
  ["доступен", "available"], ["откроется после босса уровня", "unlocks after the level boss"], ["данж региона", "region dungeon"], ["перезарядка", "cooldown"],
  ["побеждён", "defeated"], ["открыт", "unlocked"], ["закрыт", "locked"], ["Регионы мира", "World regions"],
  ["Награда:", "Reward:"], ["тестовая цель", "test target"], ["КРИТ!", "CRIT!"], ["дата неизвестна", "unknown date"],
  ["Сбросить золото, оружие и прогресс зон?", "Reset gold, weapons, and level progress?"],
  ["Баланс замедлен: завышенный прогресс мягко пересчитан", "Balance updated: excessive progress was recalculated safely"],
  ["Сохранение восстановлено: начато новое очищение", "Save recovered: a new cleansing has begun"], ["Время вышло. Усильте DPS рекламой или вернитесь позже", "Time expired. Boost DPS with an ad or return later"],
  ["Реклама не завершена — способность не активирована", "Ad not completed — ability was not activated"], ["Реклама закрыта — награда не получена", "Ad closed — reward not granted"],
  ["Реклама не завершена — усиление не активировано", "Ad not completed — boost was not activated"], ["Досмотрите рекламу, чтобы получить ×2 DPS", "Finish the ad to receive ×2 DPS"],
  ["Рекламное усиление активно — DPS данжа ×2", "Ad boost active — dungeon DPS ×2"], ["Новое очищение началось", "A new cleansing has begun"],
  ["Не удалось сохранить тестовый прогресс", "Could not save test progress"], ["Тестовое сохранение не найдено", "Test save not found"],
  ["проверка завершена", "test complete"], ["Проверка TestBoss прервана", "TestBoss check interrupted"], ["Проверка TestBoss завершена", "TestBoss check complete"],
  ["секунд до рекламного предложения", "seconds until the ad offer"], ["активно 3 минуты", "active for 3 minutes"],
  ["ВЫСОКОЕ", "HIGH"], ["СРЕДНЕЕ", "MEDIUM"], ["ЭКОНОМНОЕ", "ECONOMY"], ["ВРЕМЕННО", "TEMPORARY"], ["ГРОМЧЕ", "LOUDER"], ["ТИШЕ", "QUIETER"],
  ["Начало игры", "Start game"], ["НАЧАТЬ", "START"], ["Оружие", "Weapons"], ["Золото", "Gold"], ["Награда", "Reward"], ["монет", "coins"],
  ["Закрыть настройки", "Close settings"], ["Закрыть магазин", "Close shop"], ["Закрыть рекламу", "Close ad"], ["Закрыть выбор языка", "Close language selection"],
  ["Собрать монету", "Collect coin"], ["Атаковать данжевого босса", "Attack dungeon boss"], ["Атаковать", "Attack"], ["Улучшения", "Upgrades"],
  ["ПРЕД.", "PREV."], ["СЛЕД.", "NEXT"], ["ПОБЕЖДЁН", "DEFEATED"], ["НОВЫЙ", "NEW"], ["КУПИТЬ", "BUY"], ["СКОРО", "SOON"],
  ["ЗОЛОТО", "GOLD"], ["УРОВЕНЬ", "LEVEL"], ["БОСС", "BOSS"], ["ДАНЖ", "DUNGEON"], ["КАРТА", "MAP"], ["ИГРА", "GAME"],
  ["АВТО", "AUTO"], ["ЗВУК", "SOUND"], ["ВКЛ", "ON"], ["ВЫКЛ", "OFF"], ["ОТКРЫТО", "UNLOCKED"], ["СЛОТ", "SLOT"], ["МАКС", "MAX"],
  ["секунд", "seconds"], ["сек", "sec"], ["ур.", "lvl"], ["УР.", "LVL"], ["тыс.", "K"], ["млрд", "B"], ["млн", "M"], ["трлн", "T"],
];

// Translate complete, specific phrases before their shorter fragments. This
// prevents dynamic labels such as «Собрать монету» from becoming mixed text
// after the shorter word «монет» has already been replaced.
const SORTED_PHRASE_ENGLISH = [...PHRASE_ENGLISH].sort((first, second) => second[0].length - first[0].length);

const CYRILLIC = /[А-Яа-яЁё]/;

function transliterate(value: string): string {
  const table: Record<string, string> = {
    А:"A",Б:"B",В:"V",Г:"G",Д:"D",Е:"E",Ё:"Yo",Ж:"Zh",З:"Z",И:"I",Й:"Y",К:"K",Л:"L",М:"M",Н:"N",О:"O",П:"P",Р:"R",С:"S",Т:"T",У:"U",Ф:"F",Х:"Kh",Ц:"Ts",Ч:"Ch",Ш:"Sh",Щ:"Sch",Ъ:"",Ы:"Y",Ь:"",Э:"E",Ю:"Yu",Я:"Ya",
  };
  for (const [upper, latin] of Object.entries({ ...table })) table[upper.toLowerCase()] = latin.toLowerCase();
  return [...value].map((character) => table[character] ?? character).join("");
}

export function localizeText(value: string, language: GameLanguage): string {
  if (language === "ru" || !CYRILLIC.test(value)) return value;
  const trimmed = value.trim();
  if (EXACT_ENGLISH[trimmed]) return value.replace(trimmed, EXACT_ENGLISH[trimmed]);
  let translated = value;
  for (const [russian, english] of SORTED_PHRASE_ENGLISH) translated = translated.replaceAll(russian, english);
  for (const [russian, english] of Object.entries(EXACT_ENGLISH)) translated = translated.replaceAll(russian, english);
  return CYRILLIC.test(translated) ? transliterate(translated) : translated;
}

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const LOCALIZED_ATTRIBUTES = ["aria-label", "title", "placeholder"] as const;

function localizeElement(root: HTMLElement, language: GameLanguage): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current: Node | null = root;
  while (current) {
    const noLocalize = current instanceof Element
      ? current.closest("[data-no-localize]")
      : current.parentElement?.closest("[data-no-localize]");
    if (noLocalize) {
      current = walker.nextNode();
      continue;
    }
    if (current.nodeType === Node.TEXT_NODE) {
      const node = current as Text;
      if (language === "ru") {
        const source = originalText.get(node);
        if (source !== undefined && node.nodeValue !== source) node.nodeValue = source;
      } else if (node.nodeValue && CYRILLIC.test(node.nodeValue)) {
        originalText.set(node, node.nodeValue);
        const translated = localizeText(node.nodeValue, language);
        if (translated !== node.nodeValue) node.nodeValue = translated;
      }
    } else if (current instanceof Element) {
      for (const name of LOCALIZED_ATTRIBUTES) {
        const value = current.getAttribute(name);
        if (language === "ru") {
          const source = originalAttributes.get(current)?.get(name);
          if (source !== undefined && value !== source) current.setAttribute(name, source);
        } else if (value && CYRILLIC.test(value)) {
          let sources = originalAttributes.get(current);
          if (!sources) { sources = new Map(); originalAttributes.set(current, sources); }
          sources.set(name, value);
          current.setAttribute(name, localizeText(value, language));
        }
      }
    }
    current = walker.nextNode();
  }
}

export function LocalizationBoundary({ language, children }: { language: GameLanguage; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    localizeElement(root, language);
    const observer = new MutationObserver(() => localizeElement(root, language));
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...LOCALIZED_ATTRIBUTES] });
    return () => observer.disconnect();
  }, [language]);
  // Remount the localized subtree when the language changes. React then gives
  // the translator fresh Russian source nodes, so switching back from English
  // cannot depend on DOM nodes previously remembered by a WeakMap.
  return <div key={language} ref={rootRef} className="localization-root" lang={language}>{children}</div>;
}
