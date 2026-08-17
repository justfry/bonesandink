"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Die = 0 | 4 | 6 | 8 | 10 | 12;
type AttributeKey = "agility" | "smarts" | "spirit" | "strength" | "vigor";
type Rank = "Новичок" | "Закалённый" | "Ветеран" | "Герой" | "Легенда";
type AdvanceType = "edge" | "skills" | "attribute" | "hindrance";
type ArcaneTradition = "alchemy" | "witchcraft" | "weird-science";

type Skill = {
  id: string;
  name: string;
  attribute: AttributeKey;
  level: Die;
  core?: boolean;
};

type TraitEntry = {
  id: string;
  name: string;
  note: string;
  severity?: "minor" | "major";
};

type TraitGuide = {
  name: string;
  detail: string;
  minorDetail?: string;
  majorDetail?: string;
  requirements?: string;
  severity?: "minor" | "major" | "either";
  source: "SWADE" | "Ultima Forsan";
  caution?: string;
};

type Weapon = {
  id: string;
  name: string;
  range: string;
  damage: string;
  ap: string;
  ammo: string;
  price?: number;
  weight?: number;
  purchased?: boolean;
};

type WeaponGuide = Omit<Weapon, "id"> & {
  category: "Стрелковое" | "Метательное" | "Тычковое" | "Древковое" | "Топоры" | "Клинки" | "Булавы";
  detail: string;
};

type KnownPower = {
  id: string;
  guideId: string;
  tradition: ArcaneTradition;
  name: string;
  trapping: string;
  recipeCost: number;
  prepared: number;
  active: boolean;
  broken: boolean;
};

type PowerGuide = {
  id: string;
  name: string;
  legacyName?: string;
  rank: Rank;
  cost: number | null;
  range: string;
  duration: string;
  detail: string;
  manifestations: Partial<Record<ArcaneTradition, string>>;
};

type PowerRollResult = {
  trait: string;
  wild: string;
  total: number;
  modifier: number;
  outcome: string;
  backlash: boolean;
};

type ArmorArea = "head" | "torso" | "arms" | "legs";

type EquipmentGuide = {
  id: string;
  name: string;
  category: "Доспех" | "Щит" | "Припасы" | "Инструмент";
  price: number;
  weight: number;
  armor?: number;
  parry?: number;
  areas?: ArmorArea[];
  headCoverage?: 50 | 100;
  rangedArmor?: number;
  detail: string;
};

type InventoryItem = EquipmentGuide & { quantity: number; equipped: boolean };

type Character = {
  name: string;
  player: string;
  archetype: string;
  advances: string;
  edgeAdvances: string;
  skillAdvancePoints: number;
  attributeAdvancePoints: number;
  attributeRaiseRanks: Rank[];
  retiredHindrancePoints: number;
  origin: string;
  age: string;
  purity: "Чистый" | "Нечистый";
  appearance: string;
  portrait: string;
  portraitX: number;
  portraitY: number;
  portraitZoom: number;
  creationLocked: boolean;
  attributes: Record<AttributeKey, Die>;
  armor: number;
  size: number;
  pace: number;
  runningDie: Die;
  bennies: number;
  languages: string;
  edges: TraitEntry[];
  hindrances: TraitEntry[];
  powers: KnownPower[];
  weapons: Weapon[];
  inventory: InventoryItem[];
  gear: string;
  florins: string;
  homeland: string;
  belief: string;
  goal: string;
  fear: string;
  plague: string;
  bonds: string;
  notes: string;
  wildArcana: string;
  wounds: number;
  fatigue: number;
  shaken: boolean;
  infected: boolean;
  witchcraftBacklash: boolean;
  sessionBennies: number;
  plagueExposure: number;
  ammoSpent: Record<string, number>;
  printPortrait: boolean;
  printDiceValues: boolean;
  printExtraNotesPage: boolean;
};

type AdvanceSnapshot = Pick<Character,
  "advances" | "edgeAdvances" | "skillAdvancePoints" | "attributeAdvancePoints" |
  "attributeRaiseRanks" | "retiredHindrancePoints" | "attributes" | "edges" | "hindrances" | "powers"
> & { skills: Skill[] };

type AdvanceRecord = {
  id: string;
  number: number;
  rank: Rank;
  type: AdvanceType;
  summary: string;
  createdAt: string;
  before: AdvanceSnapshot;
};

type SavedHero = {
  id: string;
  character: Character;
  skills: Skill[];
  advanceHistory: AdvanceRecord[];
  createdAt: string;
  updatedAt: string;
};

type HeroLibrary = {
  version: 2;
  activeHeroId: string;
  heroes: SavedHero[];
};

const ATTRIBUTE_META: { key: AttributeKey; label: string; abbr: string }[] = [
  { key: "agility", label: "Ловкость", abbr: "ЛВК" },
  { key: "smarts", label: "Смекалка", abbr: "СМК" },
  { key: "spirit", label: "Характер", abbr: "ХАР" },
  { key: "strength", label: "Сила", abbr: "СИЛ" },
  { key: "vigor", label: "Выносливость", abbr: "ВЫН" },
];

const DIE_OPTIONS: Die[] = [0, 4, 6, 8, 10, 12];
const ATTRIBUTE_DICE: Die[] = [4, 6, 8, 10, 12];
const RANKS: Rank[] = ["Новичок", "Закалённый", "Ветеран", "Герой", "Легенда"];
const LIBRARY_STORAGE_KEY = "ultima-forsan-heroes-v2";
const LEGACY_STORAGE_KEY = "ultima-forsan-character-v1";
const SWADE_ADAPTATIONS = [
  ["Маскировка", "Скрытность"],
  ["Лазание · Метание · Плавание", "Атлетика"],
  ["Выслеживание", "Выживание"],
  ["Расследование", "Поиск информации"],
  ["Уличное чутьё (навык)", "«Уличное чутьё»; при требовании — черта"],
  ["Знание (военное дело)", "Военное дело"],
  ["Харизма", "Убеждение / Выступление по ситуации"],
  ["Ночное зрение (сила)", "Совиное чутьё"],
  ["Кукла (сила)", "Марионетка"],
  ["Волна (сила)", "Смерч"],
  ["Проворство (сила)", "модификатор «Ускорения»"],
] as const;
const LEGACY_SKILL_TARGETS = new Map([
  ["маскировка", "stealth"],
  ["лазание", "athletics"],
  ["метание", "athletics"],
  ["плавание", "athletics"],
  ["выслеживание", "survival"],
  ["расследование", "research"],
  ["анализ текста", "research"],
  ["знание (военное дело)", "battle"],
  ["уличное чутьё", "common"],
]);

const ARCANE_TRADITIONS: Record<ArcaneTradition, {
  label: string;
  edgeName: string;
  skillId: string;
  initialPowers: number;
  rules: string;
}> = {
  alchemy: {
    label: "Алхимия",
    edgeName: "Мистический дар (алхимия)",
    skillId: "alchemy",
    initialPowers: 3,
    rules: "Зелье готовится по часу за ранг силы и стоит 1 флорин за каждый базовый ПС. При активации штраф за стоимость и поддержание не применяется.",
  },
  witchcraft: {
    label: "Ведьмовство",
    edgeName: "Мистический дар (ведьмовство)",
    skillId: "witchcraft",
    initialPowers: 2,
    rules: "Активация получает штраф, равный половине стоимости силы (округление вниз), и ещё −1 за каждую поддерживаемую силу.",
  },
  "weird-science": {
    label: "Безумная наука",
    edgeName: "Мистический дар (безумная наука)",
    skillId: "weird-science",
    initialPowers: 2,
    rules: "Каждая сила — отдельное устройство. Штраф равен половине стоимости силы, но штрафа за поддержание нет; единица на кости навыка ломает устройство и наносит 2d6 урона.",
  },
};

const ARCANE_TRADITION_ORDER: ArcaneTradition[] = ["alchemy", "witchcraft", "weird-science"];

const POWER_GUIDES: PowerGuide[] = [
  { id: "armor", name: "Доспех", rank: "Новичок", cost: 1, range: "СМК", duration: "5 раундов", detail: "+2 брони; при подъёме вместо этого +2 к Стойкости.", manifestations: { alchemy: "Мазь или зелье, делающее кожу жёсткой.", "weird-science": "Складная кираса из тонкой фольги." } },
  { id: "healing", name: "Исцеление", rank: "Новичок", cost: 3, range: "Касание", duration: "Мгновенно", detail: "Лечит одну свежую рану, а при подъёме — две.", manifestations: { alchemy: "Панацея, которая не способна вылечить Чуму.", witchcraft: "Народная медицина и травничество; применение занимает 10 минут." } },
  { id: "low-light-vision", name: "Совиное чутьё", legacyName: "Ночное зрение", rank: "Новичок", cost: 1, range: "СМК", duration: "1 час", detail: "Игнорирует до 4 пунктов штрафа за темноту, до 6 при подъёме.", manifestations: { alchemy: "Зелье для зрения; действует на одну цель.", "weird-science": "Линзы, усиливающие доступный свет." } },
  { id: "blind", name: "Ослепление", rank: "Новичок", cost: 2, range: "СМК", duration: "Мгновенно", detail: "Налагает −2/−4 на проверки, связанные со зрением.", manifestations: { alchemy: "Фосфорная смесь, вспыхивающая при контакте с воздухом.", witchcraft: "Ослепляющий свет или жгучий порошок; дистанция 3/6/12.", "weird-science": "Пиротехника или устройство из призматических линз." } },
  { id: "relief", name: "Поддержка", rank: "Новичок", cost: 1, range: "СМК", duration: "Мгновенно", detail: "Снимает отдельные состояния либо помогает игнорировать ранения и усталость.", manifestations: { alchemy: "Лекарство и стимулирующий препарат.", witchcraft: "Настойки и отвары из трав." } },
  { id: "burst", name: "Поток", rank: "Новичок", cost: 2, range: "Конус", duration: "Мгновенно", detail: "Наносит 2d6 урона всем целям в конусном шаблоне.", manifestations: { alchemy: "Меха, выдувающие воспламеняющуюся смесь.", witchcraft: "Трюк уличных артистов с языком пламени." } },
  { id: "light-darkness", name: "Свет / тьма", rank: "Новичок", cost: 2, range: "СМК", duration: "10 минут", detail: "Создаёт или убирает освещение.", manifestations: { alchemy: "Светящаяся смесь или дым; источником служит сосуд.", witchcraft: "Порошки и пары бродячих артистов.", "weird-science": "Особый фонарь или генератор дыма." } },
  { id: "confusion", name: "Смятение", rank: "Новичок", cost: 1, range: "СМК", duration: "Особая", detail: "Делает цель отвлечённой и уязвимой.", manifestations: { alchemy: "Эфирные пары, вызывающие галлюцинации; одна цель.", witchcraft: "Наркотики и ядовитый порошок; дистанция 3/6/12." } },
  { id: "fear", name: "Ужас", rank: "Новичок", cost: 2, range: "СМК", duration: "Мгновенно", detail: "Заставляет цель пройти проверку Храбрости.", manifestations: { alchemy: "Пары, вызывающие галлюцинации и панику.", witchcraft: "Чревовещание и пугающие жесты." } },
  { id: "boost-lower-trait", name: "Усилить / ослабить параметр", rank: "Новичок", cost: 3, range: "СМК", duration: "5 раундов / мгновенно", detail: "Повышает или понижает выбранный навык или характеристику.", manifestations: { alchemy: "Отвар, лекарство, наркотик или яд; эффект выбирается при приготовлении.", witchcraft: "Внушение, подстрекательство или угроза." } },
  { id: "speed", name: "Замедление / ускорение", legacyName: "Ускорение / Проворство", rank: "Закалённый", cost: 2, range: "СМК", duration: "Мгновенно / 5 раундов", detail: "Меняет скорость передвижения и координацию; прежняя «Проворство» стала модификатором ускорения.", manifestations: { alchemy: "Стимулятор, учащающий сердцебиение и обостряющий рефлексы.", "weird-science": "Пневматические сапоги и гетры на пружинах." } },
  { id: "blast", name: "Взрыв", rank: "Закалённый", cost: 3, range: "СМК ×2", duration: "Мгновенно", detail: "Наносит 2d6 урона в среднем шаблоне.", manifestations: { alchemy: "Крайне нестабильная взрывчатая смесь." } },
  { id: "invisibility", name: "Невидимость", rank: "Закалённый", cost: 5, range: "СМК", duration: "5 раундов", detail: "Делает цель невидимой: −4/−6 на действия против неё.", manifestations: { alchemy: "Преломляющий порошок; действует лишь на одну цель." } },
  { id: "stun", name: "Оглушение", rank: "Новичок", cost: 2, range: "СМК", duration: "Мгновенно", detail: "Оглушает цель.", manifestations: { alchemy: "Взрывчатая смесь, поражающая всех поблизости.", witchcraft: "Большая хлопушка из бумаги и пороха; дистанция 3/6/12.", "weird-science": "Фейерверки и хлопушки со вспышками и взрывами." } },
  { id: "slumber", name: "Сон", rank: "Закалённый", cost: 2, range: "СМК", duration: "1 час", detail: "Усыпляет цель.", manifestations: { alchemy: "Хрустальный шарик со снотворными парами; не действует на мертвецов.", witchcraft: "Испарения или ткань, пропитанная снотворным." } },
  { id: "puppet", name: "Марионетка", legacyName: "Кукла", rank: "Ветеран", cost: 3, range: "СМК", duration: "5 раундов", detail: "При встречной проверке против Характера позволяет управлять целью.", manifestations: { alchemy: "Сильный эфирный пар, воздействующий на разум.", witchcraft: "Гипноз, внушение и симпатическая кукла." } },
  { id: "beast-friend", name: "Друг зверей", rank: "Новичок", cost: null, range: "4 клетки", duration: "10 минут", detail: "Позволяет управлять обычными животными; не действует на чудовищных зверей.", manifestations: { witchcraft: "Дрессировка, лакомства с добавками и стимуляторы." } },
  { id: "bolt", name: "Стрела", rank: "Новичок", cost: 1, range: "СМК ×2", duration: "Мгновенно", detail: "Дистанционная атака на 2d6 урона, 3d6 при подъёме.", manifestations: { witchcraft: "Воспламеняющиеся узелки; дистанция 3/6/12.", "weird-science": "Высокоточный многозарядный арбалет; используется Стрельба." } },
  { id: "detect-conceal-arcana", name: "Увидеть / скрыть сверхъестественное", rank: "Новичок", cost: 2, range: "СМК", duration: "Особая", detail: "Позволяет замечать магию 5 раундов либо скрывает её на час.", manifestations: { witchcraft: "Шестое чувство и оккультный опыт, раскрывающие свойства реликвий." } },
  { id: "mind-reading", name: "Чтение мыслей", rank: "Новичок", cost: 2, range: "СМК", duration: "Мгновенно", detail: "После успешной проверки против Смекалки цели позволяет читать её мысли.", manifestations: { witchcraft: "Проницательность и талант гипнотизёра." } },
  { id: "deflection", name: "Щит", rank: "Новичок", cost: 2, range: "СМК", duration: "5 раундов", detail: "−2 к атакам дальнего либо ближнего боя по цели; при подъёме — к обоим видам.", manifestations: { witchcraft: "Плащ фокусника, скрывающий настоящее положение носителя.", "weird-science": "Жилет из призматических линз." } },
  { id: "disguise", name: "Маска", rank: "Закалённый", cost: 2, range: "СМК", duration: "10 минут", detail: "Придаёт цели чужой облик.", manifestations: { witchcraft: "Грим, наряд-хамелеон и актёрский талант." } },
  { id: "dispel", name: "Рассеивание", rank: "Новичок", cost: 1, range: "СМК", duration: "Мгновенно", detail: "Отменяет действие мистической силы.", manifestations: { witchcraft: "Оккультные знания, отвлекающие жесты, кислоты и соли." } },
  { id: "divination", name: "Прорицание", rank: "Закалённый", cost: 5, range: "На себя", duration: "5 минут", detail: "Позволяет задавать вопросы потусторонним сущностям.", manifestations: { witchcraft: "Астрология, гадание, хиромантия и толкование знамений." } },
  { id: "environmental-protection", name: "Защита от окружающей среды", rank: "Новичок", cost: 2, range: "СМК", duration: "1 час", detail: "Защищает цель от опасной окружающей среды.", manifestations: { "weird-science": "Невероятный защитный костюм." } },
  { id: "wall-walker", name: "Паучьи лапы", rank: "Новичок", cost: 2, range: "СМК", duration: "5 раундов", detail: "Позволяет ходить по стенам и потолку на половину Шага, при подъёме — на полный.", manifestations: { "weird-science": "Крюки, арбалеты-кошки или особый клей." } },
  { id: "entangle", name: "Путы", rank: "Новичок", cost: 2, range: "СМК", duration: "Мгновенно", detail: "Схватывает и обездвиживает противников.", manifestations: { "weird-science": "Цепи с защёлкивающимися звеньями." } },
  { id: "smite", name: "Сокрушение", rank: "Новичок", cost: 2, range: "СМК", duration: "5 раундов", detail: "Увеличивает урон оружия цели на +2/+4.", manifestations: { "weird-science": "Механизированное оружие, зубчатые клинки или раскаляющиеся болты." } },
  { id: "havoc", name: "Смерч", legacyName: "Волна", rank: "Новичок", cost: 2, range: "СМК", duration: "Мгновенно", detail: "Отвлекает и может отбросить цели в среднем или конусном шаблоне.", manifestations: { "weird-science": "Пневматическая пушка, выпускающая сильный порыв воздуха." } },
  { id: "fly", name: "Полёт", rank: "Ветеран", cost: 3, range: "СМК", duration: "5 раундов", detail: "Позволяет цели летать с Шагом 12.", manifestations: { "weird-science": "Легендарная летающая машина." } },
];

const ARCHETYPES = [
  "Алхимик",
  "Аль-барсарк",
  "Бонза",
  "Брат милосердия / сестра чёток",
  "Ведьма",
  "Госпитальер",
  "Изобретатель",
  "Искариот",
  "Командир наёмников",
  "Красная одалиска",
  "Могильщик",
  "Охотник на мертвецов",
  "Паладин Священной Римской империи",
  "Преступник",
  "Придворный",
  "Рыцарь",
  "Служитель церкви",
  "Солдат",
  "Тевтонский инквизитор",
  "Тевтонский рыцарь",
  "Чумный доктор",
  "Шарлатан",
  "Свободный архетип",
];

const WEAPON_GUIDES: WeaponGuide[] = [
  { name: "Лук", category: "Стрелковое", range: "12/24/48", damage: "2d6", ap: "-", ammo: "стрелы", detail: "Мин. Сила d6; цена 200 флоринов." },
  { name: "Длинный лук", category: "Стрелковое", range: "14/28/56", damage: "2d6", ap: "-", ammo: "стрелы", detail: "Мин. Сила d8; цена 250 флоринов." },
  { name: "Арбалет", category: "Стрелковое", range: "15/30/60", damage: "2d6", ap: "2", ammo: "болты", detail: "Мин. Сила d6; перезарядка 2 действия; цена 500 флоринов." },
  { name: "Лёгкий арбалет", category: "Стрелковое", range: "6/12/24", damage: "2d4", ap: "1", ammo: "болты", detail: "Не требует минимальной Силы; цена 200 флоринов." },
  { name: "Аркебуза", category: "Стрелковое", range: "4/8/16", damage: "1-3d6", ap: "-", ammo: "1", detail: "Мин. Сила d6; перезарядка 2. +2 к Стрельбе, урон зависит от дистанции." },
  { name: "Бомбарда", category: "Стрелковое", range: "14/28/56", damage: "особый", ap: "2", ammo: "1", detail: "Мин. Сила d12; тяжёлое оружие, перезарядка 2. Ядро наносит 2d10, возможна картечь." },
  { name: "Двуствольный пистоль", category: "Стрелковое", range: "5/10/20", damage: "2d6+1", ap: "-", ammo: "2", detail: "Перезарядка 2; можно сделать двойной выстрел. Цена 450 флоринов." },
  { name: "Дробовой пистоль", category: "Стрелковое", range: "3/6/12", damage: "1-3d4", ap: "-", ammo: "1", detail: "Перезарядка 2. +2 к Стрельбе, урон зависит от дистанции." },
  { name: "Кремнёвый пистоль", category: "Стрелковое", range: "5/10/20", damage: "2d6+1", ap: "-", ammo: "1", detail: "Перезарядка 2; цена 150 флоринов." },
  { name: "Мушкет", category: "Стрелковое", range: "10/20/40", damage: "2d8", ap: "-", ammo: "1", detail: "Мин. Сила d6; перезарядка 2; цена 300 флоринов." },
  { name: "Петриналь", category: "Стрелковое", range: "8/16/32", damage: "2d6+1", ap: "-", ammo: "1", detail: "Перезарядка 2; лёгкое ружьё с упором в грудь." },
  { name: "Копьё (метательное)", category: "Метательное", range: "3/6/12", damage: "Сил+d6", ap: "-", ammo: "-", detail: "Мин. Сила d6; можно использовать и в ближнем бою." },
  { name: "Нож (метательный)", category: "Метательное", range: "3/6/12", damage: "Сил+d4", ap: "-", ammo: "-", detail: "Лёгкое скрываемое оружие; цена 25 флоринов." },
  { name: "Праща", category: "Метательное", range: "4/8/16", damage: "Сил+d4", ap: "-", ammo: "камни", detail: "Дешёвое и доступное оружие; цена 10 флоринов." },
  { name: "Топор (метательный)", category: "Метательное", range: "3/6/12", damage: "Сил+d6", ap: "-", ammo: "-", detail: "Цена 50 флоринов." },
  { name: "Выкидной катар", category: "Тычковое", range: "Ближняя", damage: "Сил+d4", ap: "-", ammo: "-", detail: "Скрытый клинок на предплечье; высвобождается свободным действием." },
  { name: "Катар", category: "Тычковое", range: "Ближняя", damage: "Сил+d6", ap: "-", ammo: "-", detail: "Тычковый клинок; цена 250 флоринов." },
  { name: "Пуддха", category: "Тычковое", range: "Ближняя", damage: "Сил+d8", ap: "-", ammo: "-", detail: "Тяжёлое тычковое оружие; цена 350 флоринов." },
  { name: "Алебарда", category: "Древковое", range: "Ближняя (1)", damage: "Сил+d8", ap: "-", ammo: "-", detail: "Двуручное; дальность 1; цена 250 флоринов." },
  { name: "Боевой заступ", category: "Древковое", range: "Ближняя (1)", damage: "Сил+d6", ap: "-", ammo: "-", detail: "Двуручное; дальность 1; создано для борьбы с мертвецами." },
  { name: "Копьё", category: "Древковое", range: "Ближняя (1)", damage: "Сил+d6", ap: "-", ammo: "-", detail: "Двуручное; Защита +1; дальность 1." },
  { name: "Коса", category: "Древковое", range: "Ближняя (1)", damage: "Сил+d6", ap: "-", ammo: "-", detail: "Двуручное; Защита -1; дальность 1." },
  { name: "Пика", category: "Древковое", range: "Ближняя (2)", damage: "Сил+d8", ap: "-", ammo: "-", detail: "Двуручное; дальность 2; цена 400 флоринов." },
  { name: "Посох", category: "Древковое", range: "Ближняя (1)", damage: "Сил+d4", ap: "-", ammo: "-", detail: "Двуручное; Защита +1; дальность 1." },
  { name: "Рыцарское копьё", category: "Древковое", range: "Ближняя (2)", damage: "Сил+d8", ap: "2*", ammo: "-", detail: "Только для всадника; дальность 2; ББ 2 при атаке верхом." },
  { name: "Строевой заступ", category: "Древковое", range: "Ближняя (2)", damage: "Сил+d6", ap: "-", ammo: "-", detail: "Двуручное; дальность 2; создано для борьбы с мертвецами." },
  { name: "Бродэкс", category: "Топоры", range: "Ближняя", damage: "Сил+d8", ap: "-", ammo: "-", detail: "Защита -1; при использовании двумя руками урон +1." },
  { name: "Двуручный топор", category: "Топоры", range: "Ближняя", damage: "Сил+d10", ap: "1", ammo: "-", detail: "Двуручное; ББ 1; Защита -1." },
  { name: "Секира", category: "Топоры", range: "Ближняя", damage: "Сил+d8", ap: "-", ammo: "-", detail: "Тяжёлый боевой топор; цена 300 флоринов." },
  { name: "Топор", category: "Топоры", range: "Ближняя", damage: "Сил+d6", ap: "-", ammo: "-", detail: "Одноручный топор; цена 200 флоринов." },
  { name: "Двуручный меч", category: "Клинки", range: "Ближняя", damage: "Сил+d10", ap: "-", ammo: "-", detail: "Двуручное; Защита -1." },
  { name: "Двуручная сабля", category: "Клинки", range: "Ближняя", damage: "Сил+d10", ap: "-", ammo: "-", detail: "Двуручное; Защита -1." },
  { name: "Длинный меч", category: "Клинки", range: "Ближняя", damage: "Сил+d8", ap: "-", ammo: "-", detail: "Надёжный одноручный клинок; цена 300 флоринов." },
  { name: "Кинжал", category: "Клинки", range: "Ближняя", damage: "Сил+d4", ap: "-", ammo: "-", detail: "Лёгкий и скрываемый клинок; цена 25 флоринов." },
  { name: "Короткий меч", category: "Клинки", range: "Ближняя", damage: "Сил+d6", ap: "-", ammo: "-", detail: "Одноручный клинок; цена 200 флоринов." },
  { name: "Полуторный меч", category: "Клинки", range: "Ближняя", damage: "Сил+d8", ap: "-", ammo: "-", detail: "Защита -1; при использовании двумя руками урон +1." },
  { name: "Сабля", category: "Клинки", range: "Ближняя", damage: "Сил+d8", ap: "-", ammo: "-", detail: "Одноручный клинок; цена 350 флоринов." },
  { name: "Скимитар", category: "Клинки", range: "Ближняя", damage: "Сил+d6", ap: "-", ammo: "-", detail: "Лёгкий изогнутый клинок; цена 250 флоринов." },
  { name: "Шпага", category: "Клинки", range: "Ближняя", damage: "Сил+d4", ap: "-", ammo: "-", detail: "Защита +1; цена 150 флоринов." },
  { name: "Боевой молот", category: "Булавы", range: "Ближняя", damage: "Сил+d6", ap: "1*", ammo: "-", detail: "ББ 1 только против жёстких доспехов." },
  { name: "Боевой цеп", category: "Булавы", range: "Ближняя", damage: "Сил+d8", ap: "-", ammo: "-", detail: "Двуручное; Защита -1; игнорирует щит и укрытие." },
  { name: "Булава", category: "Булавы", range: "Ближняя", damage: "Сил+d6", ap: "-", ammo: "-", detail: "Простое ударное оружие; цена 150 флоринов." },
  { name: "Дубина", category: "Булавы", range: "Ближняя", damage: "Сил+d4", ap: "-", ammo: "-", detail: "Дешёвое ударное оружие; цена 10 флоринов." },
  { name: "Кистень", category: "Булавы", range: "Ближняя", damage: "Сил+d6", ap: "-", ammo: "-", detail: "Игнорирует щит и укрытие." },
  { name: "Кувалда", category: "Булавы", range: "Ближняя", damage: "Сил+d8", ap: "2*", ammo: "-", detail: "Двуручное; Защита -1; ББ 2 только против жёстких доспехов." },
  { name: "Лёгкий кистень", category: "Булавы", range: "Ближняя", damage: "Сил+d4", ap: "-", ammo: "-", detail: "Игнорирует щит и укрытие; цена 150 флоринов." },
];

const EQUIPMENT_GUIDES: EquipmentGuide[] = [
  { id: "leather-arms", name: "Кожаные наручи", category: "Доспех", armor: 1, areas: ["arms"], price: 10, weight: 2, detail: "Закрывают руки." },
  { id: "leather-torso", name: "Кожаный панцирь", category: "Доспех", armor: 1, areas: ["torso"], price: 20, weight: 3, detail: "Закрывает торс." },
  { id: "leather-legs", name: "Кожаные поножи", category: "Доспех", armor: 1, areas: ["legs"], price: 20, weight: 3, detail: "Закрывают ноги." },
  { id: "catcher-suit", name: "Костюм ловца мертвецов", category: "Доспех", armor: 1, areas: ["head", "torso", "arms", "legs"], headCoverage: 50, price: 60, weight: 8, detail: "Торс, руки и ноги; 50% защиты головы." },
  { id: "chain-arms", name: "Кольчужные рукава", category: "Доспех", armor: 2, areas: ["arms"], price: 80, weight: 3, detail: "Закрывают руки." },
  { id: "chain-torso", name: "Кольчуга", category: "Доспех", armor: 2, areas: ["torso"], price: 100, weight: 4, detail: "Закрывает торс." },
  { id: "chain-legs", name: "Кольчужные шоссы", category: "Доспех", armor: 2, areas: ["legs"], price: 120, weight: 5, detail: "Закрывают ноги." },
  { id: "plate-arms", name: "Латные наручи", category: "Доспех", armor: 3, areas: ["arms"], price: 200, weight: 5, detail: "Закрывают руки." },
  { id: "plate-torso", name: "Латная кираса", category: "Доспех", armor: 3, areas: ["torso"], price: 400, weight: 12.5, detail: "Закрывает торс." },
  { id: "plate-legs", name: "Латные поножи", category: "Доспех", armor: 3, areas: ["legs"], price: 300, weight: 7.5, detail: "Закрывают ноги." },
  { id: "open-helmet", name: "Открытый шлем", category: "Доспех", armor: 3, areas: ["head"], headCoverage: 50, price: 75, weight: 2, detail: "50% защиты головы." },
  { id: "closed-helmet", name: "Закрытый шлем", category: "Доспех", armor: 3, areas: ["head"], headCoverage: 100, price: 150, weight: 4, detail: "Закрывает голову." },
  { id: "buckler", name: "Малый щит (баклер)", category: "Щит", parry: 1, price: 25, weight: 4, detail: "Защита +1 от фронтальных атак и атак слева." },
  { id: "medium-shield", name: "Средний щит", category: "Щит", parry: 1, rangedArmor: 2, price: 50, weight: 6, detail: "Защита +1; броня +2 против дистанционных атак." },
  { id: "large-shield", name: "Большой щит (ростовой)", category: "Щит", parry: 2, rangedArmor: 2, price: 200, weight: 10, detail: "Защита +2; броня +2 против дистанционных атак." },
  { id: "plague-mask", name: "Маска чумного доктора", category: "Инструмент", price: 10, weight: 0, detail: "+1 к Выносливости против миазм; −1 к Убеждению и Выступлению, когда внешний вид имеет значение." },
  { id: "alchemist-bag", name: "Сумка алхимика", category: "Инструмент", price: 300, weight: 3, detail: "Инструменты для изготовления алхимических препаратов." },
  { id: "witch-bag", name: "Сумка ведьмы", category: "Инструмент", price: 150, weight: 2, detail: "Компоненты и предметы для ведьмовских фокусов." },
  { id: "lockpicks", name: "Отмычки", category: "Инструмент", price: 200, weight: 0.5, detail: "Набор для вскрытия замков." },
  { id: "rope", name: "Верёвка, 20 м", category: "Припасы", price: 10, weight: 7.5, detail: "Прочная дорожная верёвка." },
  { id: "lantern", name: "Фонарь", category: "Припасы", price: 25, weight: 1.5, detail: "Освещает радиус 4 клетки." },
  { id: "rations", name: "Дорожный паёк", category: "Припасы", price: 25, weight: 5, detail: "Запас еды на одну неделю." },
  { id: "last-hope", name: "Топор Последней Надежды", category: "Инструмент", price: 5, weight: 1, detail: "Для экстренной ампутации заражённой конечности." },
  { id: "cautery", name: "Пузырёк прижигателя", category: "Припасы", price: 5, weight: 0.5, detail: "Останавливает наружное кровотечение и прижигает рану." },
];

const WEAPON_PURCHASE_DATA: Record<string, { price: number; weight: number }> = {
  "Лук": { price: 200, weight: 1.5 }, "Длинный лук": { price: 250, weight: 2.5 }, "Арбалет": { price: 500, weight: 5 }, "Лёгкий арбалет": { price: 200, weight: 1.5 },
  "Аркебуза": { price: 300, weight: 6 }, "Бомбарда": { price: 700, weight: 15 }, "Двуствольный пистоль": { price: 450, weight: 2 }, "Дробовой пистоль": { price: 250, weight: 1.5 },
  "Кремнёвый пистоль": { price: 150, weight: 1.5 }, "Мушкет": { price: 300, weight: 8 }, "Петриналь": { price: 300, weight: 2 }, "Копьё (метательное)": { price: 25, weight: 2.5 },
  "Нож (метательный)": { price: 25, weight: .5 }, "Праща": { price: 10, weight: .5 }, "Топор (метательный)": { price: 50, weight: 1 }, "Выкидной катар": { price: 100, weight: 1 },
  "Катар": { price: 250, weight: 1.5 }, "Пуддха": { price: 350, weight: 4 }, "Алебарда": { price: 250, weight: 7.5 }, "Боевой заступ": { price: 50, weight: 5 },
  "Копьё": { price: 200, weight: 2.5 }, "Коса": { price: 50, weight: 6.5 }, "Пика": { price: 400, weight: 12.5 }, "Посох": { price: 10, weight: 4 },
  "Рыцарское копьё": { price: 300, weight: 5 }, "Строевой заступ": { price: 100, weight: 8 }, "Бродэкс": { price: 350, weight: 7 }, "Двуручный топор": { price: 500, weight: 7.5 },
  "Секира": { price: 300, weight: 5 }, "Топор": { price: 200, weight: 1 }, "Двуручный меч": { price: 400, weight: 6 }, "Двуручная сабля": { price: 450, weight: 5 },
  "Длинный меч": { price: 300, weight: 4 }, "Кинжал": { price: 25, weight: .5 }, "Короткий меч": { price: 200, weight: 2 }, "Полуторный меч": { price: 350, weight: 5 },
  "Сабля": { price: 350, weight: 3 }, "Скимитар": { price: 250, weight: 1.5 }, "Шпага": { price: 150, weight: 1.5 }, "Боевой молот": { price: 250, weight: 4 },
  "Боевой цеп": { price: 350, weight: 5.5 }, "Булава": { price: 150, weight: 4 }, "Дубина": { price: 10, weight: 4 }, "Кистень": { price: 200, weight: 4 },
  "Кувалда": { price: 400, weight: 10 }, "Лёгкий кистень": { price: 150, weight: 3.5 },
};

const EDGE_GUIDES: TraitGuide[] = [
  { name: "Амбидекстр", requirements: "Новичок, Ловкость d8+", detail: "Убирает штраф за действия непривычной рукой.", source: "SWADE" },
  { name: "Аристократ", requirements: "Новичок", detail: "+2 к Осведомлённости и социальным связям в высших кругах.", source: "SWADE" },
  { name: "Бдительность", requirements: "Новичок", detail: "+2 к проверкам Внимания.", source: "SWADE" },
  { name: "Берсерк", requirements: "Новичок", detail: "В ярости повышает Силу и Стойкость и частично игнорирует ранения, но теряет контроль.", source: "SWADE" },
  { name: "Богатство", requirements: "Новичок", detail: "Тройной стартовый капитал и постоянный высокий доход.", source: "SWADE" },
  { name: "Бугай", requirements: "Новичок, Сила d6+, Выносливость d6+", detail: "+1 к Размеру и Стойкости; Сила выше для нагрузки и требований снаряжения.", source: "SWADE" },
  { name: "Быстроногость", requirements: "Новичок, Ловкость d6+", detail: "+2 к Шагу, кость бега увеличивается на ступень.", source: "SWADE" },
  { name: "Везение", requirements: "Новичок", detail: "+1 фишка в начале каждой встречи.", source: "SWADE" },
  { name: "Везение+", requirements: "Новичок, Везение", detail: "+2 фишки в начале каждой встречи вместо одной.", source: "SWADE" },
  { name: "Как на собаке", requirements: "Новичок, Выносливость d8+", detail: "+2 к естественному выздоровлению; проверки проходят реже.", source: "SWADE" },
  { name: "Обаяние", requirements: "Новичок, Характер d8+", detail: "Бесплатный переброс проверок Убеждения.", source: "SWADE" },
  { name: "Полиглот", requirements: "Новичок, Смекалка d6+", detail: "Даёт несколько языков на уровне d6 по Смекалке персонажа.", source: "SWADE" },
  { name: "Привлекательность", requirements: "Новичок, Выносливость d6+", detail: "+1 к Выступлению и Убеждению, когда внешность имеет значение.", source: "SWADE" },
  { name: "Силач", requirements: "Новичок, Сила d6+, Выносливость d6+", detail: "Связывает Атлетику с Силой и на 1 увеличивает дистанцию Атлетики (метание).", source: "SWADE" },
  { name: "Слава", requirements: "Новичок", detail: "+1 к Убеждению, если героя узнали; выступления оплачиваются лучше.", source: "SWADE" },
  { name: "Смелость", requirements: "Новичок, Характер d6+", detail: "+2 к сопротивлению страху и -2 к броскам по таблице ужаса.", source: "SWADE" },
  { name: "Стремительность", requirements: "Новичок, Ловкость d8+", detail: "Позволяет перетянуть низкую карту действия.", source: "SWADE" },
  { name: "Упорство", requirements: "Новичок, Характер d8+", detail: "+2 к результату проверки параметра, переброшенной за фишку.", source: "SWADE" },
  { name: "Беглый огонь", requirements: "Закалённый, Стрельба d6+", detail: "Для одной дистанционной атаки в ход Скорострельность оружия увеличивается на 1.", source: "SWADE" },
  { name: "Беспощадность", requirements: "Закалённый", detail: "+2 к урону, если потратить фишку на его переброс.", source: "SWADE", caution: "Недоступна в Ultima Forsan." },
  { name: "Блок", requirements: "Закалённый, Драка d8+", detail: "+1 к Защите и ослабляет бонус врагов за объединение сил.", source: "SWADE" },
  { name: "Боевая закалка", requirements: "Закалённый", detail: "+2 к попыткам выйти из шока и оправиться от оглушения.", source: "SWADE" },
  { name: "Боевая ярость", requirements: "Закалённый, Драка d8+", detail: "Исключительным действием добавляет вторую кость Драки к одной атаке в ход.", source: "SWADE" },
  { name: "Боец-импровизатор", requirements: "Закалённый, Смекалка d6+", detail: "Игнорирует штраф -2 при атаке импровизированным оружием.", source: "SWADE" },
  { name: "Воля к победе", requirements: "Закалённый", detail: "Бесплатный переброс любой уловки, начатой персонажем.", source: "SWADE" },
  { name: "Два клинка", requirements: "Новичок, Ловкость d8+", detail: "Одна атака оружием во второй руке без штрафа за несколько действий.", source: "SWADE" },
  { name: "Два ствола", requirements: "Новичок, Ловкость d8+", detail: "Один выстрел или бросок второй рукой без штрафа за несколько действий.", source: "SWADE" },
  { name: "Двойной выстрел", requirements: "Закалённый, Стрельба d6+", detail: "+1 к атаке и урону одиночным оружием за дополнительный патрон.", source: "SWADE" },
  { name: "Именное оружие", requirements: "Новичок, соответствующий навык d8+", detail: "+1 к атаке выбранным оружием; в ближнем бою также +1 к Защите.", source: "SWADE" },
  { name: "Контратака", requirements: "Закалённый, Драка d8+", detail: "Свободная атака по противнику, провалившему Драку против героя.", source: "SWADE" },
  { name: "Крепкий орешек", requirements: "Новичок, Характер d8+", detail: "Штрафы за ранения не мешают проверкам Выносливости при смерти.", source: "SWADE" },
  { name: "Круговой удар", requirements: "Новичок, Сила d8+, Драка d8+", detail: "Одна атака по всем целям в пределах оружия; обычно со штрафом.", source: "SWADE" },
  { name: "Мастер боевых искусств", requirements: "Новичок, Драка d6+", detail: "+1 к безоружной Драке и дополнительная кость урона d4.", source: "SWADE" },
  { name: "Меткий стрелок", requirements: "Закалённый, Атлетика или Стрельба d8+", detail: "Снижает дистанционные штрафы или даёт +1 к атаке, если герой не двигался.", source: "SWADE" },
  { name: "Паркур", requirements: "Новичок, Ловкость d8+, Атлетика d6+", detail: "Игнорирует труднопроходимую местность и помогает в пеших погонях.", source: "SWADE" },
  { name: "Разрыв дистанции", requirements: "Новичок, Ловкость d8+", detail: "Один противник не получает свободную атаку при выходе героя из ближнего боя.", source: "SWADE" },
  { name: "Расчётливость", requirements: "Новичок, Смекалка d8+", detail: "На низкой карте действия игнорирует до 2 пунктов штрафа одного действия.", source: "SWADE" },
  { name: "Стальная челюсть", requirements: "Новичок, Выносливость d8+", detail: "+2 к проверкам на прочность и против нокаута.", source: "SWADE" },
  { name: "Стальные нервы", requirements: "Новичок, Выносливость d8+", detail: "Игнорирует 1 пункт штрафа за ранения.", source: "SWADE" },
  { name: "Твёрдая рука", requirements: "Новичок, Ловкость d8+", detail: "Игнорирует штраф за ненадёжную опору; штраф за бег уменьшается.", source: "SWADE" },
  { name: "Тяжеловес", requirements: "Новичок, Сила d8+, Выносливость d8+", detail: "+1 к Стойкости и дополнительная кость безоружного урона d4.", source: "SWADE" },
  { name: "Увёртливость", requirements: "Закалённый, Ловкость d8+", detail: "Враги получают -2 к дистанционным атакам по герою.", source: "SWADE" },
  { name: "Упреждающий удар", requirements: "Новичок, Ловкость d8+", detail: "Раз в раунд свободная атака по врагу, подошедшему на дистанцию удара.", source: "SWADE" },
  { name: "Финт", requirements: "Новичок, Драка d8+", detail: "Герой выбирает, Ловкостью или Смекалкой враг сопротивляется уловке Дракой.", source: "SWADE" },
  { name: "Хладнокровие", requirements: "Закалённый, Смекалка d8+", detail: "Тянет две карты действия и выбирает одну.", source: "SWADE" },
  { name: "Боевой пыл", requirements: "Ветеран, Характер d8+, Командный голос", detail: "+1 к урону Дракой союзных статистов в командном радиусе.", source: "SWADE" },
  { name: "Воодушевление", requirements: "Закалённый, Командный голос", detail: "Проверка Военного дела помогает одному параметру всех союзников в командном радиусе.", source: "SWADE" },
  { name: "Держать строй!", requirements: "Закалённый, Смекалка d8+, Командный голос", detail: "+1 к Стойкости союзных статистов в командном радиусе.", source: "SWADE" },
  { name: "Командный голос", requirements: "Новичок, Смекалка d6+", detail: "+1 союзным статистам на выход из шока и восстановление от оглушения.", source: "SWADE" },
  { name: "Командный голос+", requirements: "Закалённый, Командный голос", detail: "Удваивает командный радиус.", source: "SWADE" },
  { name: "Прирождённый лидер", requirements: "Закалённый, Характер d8+, Командный голос", detail: "Лидерские черты могут действовать на союзные дикие карты.", source: "SWADE" },
  { name: "Тактик", requirements: "Закалённый, Командный голос, Военное дело d6+", detail: "Получает дополнительную карту действия и может передать её союзнику.", source: "SWADE" },
  { name: "Глоток мужества", requirements: "Новичок, Выносливость d8+", detail: "Алкоголь повышает Выносливость и ослабляет штраф за ранения, но мешает Ловкости и Смекалке.", source: "SWADE" },
  { name: "Запасливость", requirements: "Новичок, Везение", detail: "Раз за сцену герой внезапно находит при себе необходимый предмет.", source: "SWADE" },
  { name: "Связь с животными", requirements: "Новичок", detail: "Герой может тратить свои фишки на действия подчинённого животного.", source: "SWADE" },
  { name: "Укротитель", requirements: "Новичок, Характер d8+", detail: "Животные относятся к герою лучше; он получает питомца.", source: "SWADE" },
  { name: "Целитель", requirements: "Новичок, Характер d8+", detail: "+2 к обычным и мистическим проверкам Лечения.", source: "SWADE" },
  { name: "Шестое чувство", requirements: "Новичок", detail: "+2 к Вниманию для обнаружения засад и подобных опасностей.", source: "SWADE" },
  { name: "Акробат", requirements: "Новичок, Ловкость d8+, Атлетика d8+", detail: "Бесплатный переброс Атлетики при акробатических действиях.", source: "SWADE" },
  { name: "Вор", requirements: "Новичок, Ловкость d8+, Скрытность d6+, Воровство d6+", detail: "+1 к Воровству, Атлетике (лазание) и Скрытности в городе.", source: "SWADE" },
  { name: "Егерь", requirements: "Новичок, Характер d6+, Выживание d8+", detail: "+2 к Выживанию и Скрытности в дикой местности.", source: "SWADE" },
  { name: "Золотые руки", requirements: "Новичок, Ремонт d8+", detail: "+2 к Ремонту; с подъёмом работа занимает вдвое меньше времени.", source: "SWADE" },
  { name: "Мастер на все руки", requirements: "Новичок, Смекалка d10+", detail: "Проверка Смекалки временно даёт незнакомый навык d4 или d6.", source: "SWADE" },
  { name: "Солдат", requirements: "Новичок, Сила d6+, Выносливость d6+", detail: "Лучше переносит нагрузку и природные опасности.", source: "SWADE" },
  { name: "Сыщик", requirements: "Новичок, Смекалка d8+, Поиск информации d8+", detail: "+2 к Поиску информации и Вниманию при поиске улик.", source: "SWADE" },
  { name: "Убийца", requirements: "Новичок, Ловкость d8+, Драка d6+, Скрытность d8+", detail: "+2 к урону против уязвимого или застигнутого врасплох противника.", source: "SWADE" },
  { name: "Умелец", requirements: "Новичок, Смекалка d6+, Внимание d8+, Ремонт d6+", detail: "Быстро собирает импровизированные устройства из подручных материалов.", source: "SWADE" },
  { name: "Учёный", requirements: "Новичок, Поиск информации d8+", detail: "+2 к одному выбранному навыку знаний.", source: "SWADE" },
  { name: "Вдохновитель", requirements: "Новичок, Характер d8+", detail: "Успешная уловка снимает Отвлечён или Уязвим с союзника.", source: "SWADE" },
  { name: "Железная воля", requirements: "Новичок, Характер d8+", detail: "+2 к Смекалке и Характеру при сопротивлении уловкам.", source: "SWADE" },
  { name: "Заводила", requirements: "Новичок, Характер d8+", detail: "Помощь Выступлением или Убеждением может одновременно помочь второму союзнику.", source: "SWADE" },
  { name: "Мы - команда!", requirements: "Новичок, дикая карта, Характер d8+", detail: "Герой может передавать фишки другим диким картам.", source: "SWADE" },
  { name: "Надёжный", requirements: "Новичок, Характер d8+", detail: "Бесплатный переброс проверок Помощи.", source: "SWADE" },
  { name: "Острослов", requirements: "Новичок, Насмешка d8+", detail: "Бесплатный переброс проверок Насмешки.", source: "SWADE" },
  { name: "Ответная колкость", requirements: "Новичок, Насмешка d6+", detail: "Подъём при сопротивлении Насмешке или Запугиванию делает противника Отвлечённым.", source: "SWADE" },
  { name: "Полезные связи", requirements: "Новичок", detail: "Раз за встречу знакомые помогают или дают информацию.", source: "SWADE" },
  { name: "Провокация", requirements: "Новичок, Насмешка d6+", detail: "Подъём в Насмешке заставляет противника сосредоточиться на герое.", source: "SWADE" },
  { name: "Смутьян", requirements: "Закалённый, Характер d8+", detail: "Одна уловка Запугиванием или Насмешкой действует по области.", source: "SWADE" },
  { name: "Уличное чутьё", requirements: "Новичок, Смекалка d6+", detail: "+2 к Осведомлённости о преступном мире и к Убеждению или Запугиванию при социальных связях с криминалитетом.", source: "SWADE" },
  { name: "Верные спутники", requirements: "Легенда, дикая карта", detail: "У героя появляются пять верных спутников.", source: "SWADE" },
  { name: "Искусный воин", requirements: "Легенда, Драка d12+", detail: "+1 к Защите; дополнительная кость урона Дракой становится d8.", source: "SWADE" },
  { name: "Несгибаемый", requirements: "Легенда, Выносливость d8+", detail: "Герой выдерживает четвёртое ранение перед состоянием при смерти.", source: "SWADE" },
  { name: "Помощник", requirements: "Легенда, дикая карта", detail: "Герой получает помощника - дикую карту.", source: "SWADE" },
  { name: "Профессионал", requirements: "Легенда, максимальный уровень выбранного параметра", detail: "Текущий и максимальный уровень параметра повышаются на ступень.", source: "SWADE" },
  { name: "Богатство+", requirements: "Новичок, Богатство", detail: "Пятикратный стартовый капитал и значительно более высокий постоянный доход.", source: "SWADE" },
  { name: "Привлекательность+", requirements: "Новичок, Привлекательность", detail: "+2 к Выступлению и Убеждению, когда внешность имеет значение.", source: "SWADE" },
  { name: "Слава+", requirements: "Закалённый, Слава", detail: "Узнаваемость приносит герою больший социальный бонус и доход.", source: "SWADE" },
  { name: "Устойчивость к мистическим силам", requirements: "Новичок, Характер d8+", detail: "Вражеские проверки мистических навыков по герою получают -2, а урон от мистических сил снижается на 2.", source: "SWADE", caution: "В Ultima Forsan доступ к мистическим силам ограничен сеттингом; согласуйте применимость с ведущим." },
  { name: "Устойчивость к мистическим силам+", requirements: "Новичок, Устойчивость к мистическим силам", detail: "Штраф к мистическим проверкам по герою и снижение урона увеличиваются до 4.", source: "SWADE", caution: "В Ultima Forsan доступ к мистическим силам ограничен сеттингом; согласуйте применимость с ведущим." },
  { name: "Беглый огонь+", requirements: "Ветеран, Беглый огонь", detail: "Улучшает Беглый огонь и позволяет поддерживать высокий темп стрельбы эффективнее.", source: "SWADE" },
  { name: "Блок+", requirements: "Ветеран, Блок", detail: "Бонус к Защите увеличивается до +2, а преимущество противников за объединение сил снижается сильнее.", source: "SWADE" },
  { name: "Боевая ярость+", requirements: "Ветеран, Боевая ярость", detail: "При Боевой ярости герой добавляет третью кость Драки для одной атаки в ход.", source: "SWADE" },
  { name: "Именное оружие+", requirements: "Закалённый, Именное оружие", detail: "Модификаторы именного оружия к атаке и Защите увеличиваются до +2.", source: "SWADE" },
  { name: "Контратака+", requirements: "Ветеран, Контратака", detail: "Позволяет проводить Контратаку чаще одного раза за раунд.", source: "SWADE" },
  { name: "Крепкий орешек+", requirements: "Ветеран, Крепкий орешек", detail: "Когда герой должен погибнуть, карта действия может оставить его при смерти и позволить выжить.", source: "SWADE" },
  { name: "Круговой удар+", requirements: "Ветеран, Круговой удар", detail: "Круговой удар больше не задевает союзников.", source: "SWADE" },
  { name: "Мастер боевых искусств+", requirements: "Закалённый, Мастер боевых искусств", detail: "+2 к безоружной Драке; дополнительная кость урона увеличивается на ступень.", source: "SWADE" },
  { name: "Могучий удар", requirements: "Новичок, дикая карта, Драка d8+", detail: "С джокером первая успешная атака Дракой наносит двойной урон.", source: "SWADE" },
  { name: "Разрыв дистанции+", requirements: "Закалённый, Разрыв дистанции", detail: "До трёх противников не получают свободную атаку, когда герой выходит из ближнего боя.", source: "SWADE" },
  { name: "Рок-н-ролл!", requirements: "Закалённый, Стрельба d8+", detail: "Игнорирует штрафы за отдачу оружия со Скорострельностью 2+, если стрелок не двигался.", source: "SWADE", caution: "Автоматическое оружие не соответствует обычной кампании Ultima Forsan; черта приведена для полноты справочника." },
  { name: "Смертельный выстрел", requirements: "Новичок, дикая карта, Атлетика или Стрельба d8+", detail: "С джокером первая успешная атака Атлетикой (метание) или Стрельбой наносит двойной урон.", source: "SWADE" },
  { name: "Стальные нервы+", requirements: "Новичок, Стальные нервы", detail: "Герой игнорирует до 2 пунктов штрафа за ранения.", source: "SWADE" },
  { name: "Тяжеловес+", requirements: "Закалённый, Тяжеловес", detail: "+2 к Стойкости; дополнительная кость безоружного урона увеличивается на ступень.", source: "SWADE" },
  { name: "Убийца великанов", requirements: "Ветеран", detail: "+1d6 к урону по существу, которое больше героя как минимум на 3 пункта Размера.", source: "SWADE", caution: "Недоступна в Ultima Forsan." },
  { name: "Увёртливость+", requirements: "Закалённый, Увёртливость", detail: "+2 к проверкам уклонения.", source: "SWADE" },
  { name: "Упреждающий удар+", requirements: "Герой, Упреждающий удар", detail: "Позволяет применять Упреждающий удар по нескольким подходящим целям за раунд.", source: "SWADE" },
  { name: "Хладнокровие+", requirements: "Закалённый, Хладнокровие", detail: "Герой тянет три карты действия и выбирает лучшую.", source: "SWADE" },
  { name: "Тактик+", requirements: "Ветеран, Тактик", detail: "Герой получает две дополнительные карты действия для распределения между союзниками.", source: "SWADE" },
  { name: "Акробат+", requirements: "Закалённый, Акробат", detail: "Все атаки по герою получают -1, если не являются для него неожиданными.", source: "SWADE" },
  { name: "Ас", requirements: "Новичок, Ловкость d8+", detail: "Игнорирует до 2 пунктов штрафа к управлению транспортом и может тратить фишки на его проверки на прочность.", source: "SWADE" },
  { name: "Грозный вид", requirements: "Новичок, см. описание", detail: "+2 к проверкам Запугивания.", source: "SWADE" },
  { name: "Железная воля+", requirements: "Закалённый, Железная воля, Смелость", detail: "Бонус +2 также действует при сопротивлении мистическим силам и избавлении от их эффектов.", source: "SWADE" },
  { name: "Заводила+", requirements: "Закалённый, Заводила", detail: "Помощь социальными навыками может поддержать больше союзников.", source: "SWADE" },
  { name: "Артефактор", requirements: "Закалённый, Мистический дар", detail: "Позволяет создавать магические предметы.", source: "SWADE", caution: "Применимость зависит от разрешённых в Ultima Forsan мистических даров." },
  { name: "Воин света / тьмы", requirements: "Закалённый, Мистический дар (чудеса), Вера d6+", detail: "За пункты силы добавляет от +1 до +4 к проверкам на прочность.", source: "SWADE", caution: "В Ultima Forsan эта черта помечена как недоступная; приведена для полноты справочника." },
  { name: "Восстановление силы", requirements: "Закалённый, Характер d6+, Мистический дар", detail: "Герой восстанавливает 10 пунктов силы в час.", source: "SWADE", caution: "В Ultima Forsan эта черта помечена как недоступная; приведена для полноты справочника." },
  { name: "Восстановление силы+", requirements: "Ветеран, Восстановление силы", detail: "Ещё сильнее ускоряет восстановление пунктов силы.", source: "SWADE", caution: "В Ultima Forsan эта черта помечена как недоступная; приведена для полноты справочника." },
  { name: "Дополнительное усилие", requirements: "Закалённый, Мистический дар (феномен), Талант d6+", detail: "Улучшает результат проверки Таланта на +1 за 1 пункт силы или на +2 за 3 пункта.", source: "SWADE" },
  { name: "Изобретатель", requirements: "Закалённый, Мистический дар (безумная наука), Безумная наука d6+", detail: "За 3 пункта силы создаёт устройство, имитирующее другую силу.", source: "SWADE", caution: "В Ultima Forsan эта черта помечена как недоступная; вместо неё используйте сеттинговые изобретения." },
  { name: "Иссушение духа", requirements: "Закалённый, Мистический дар, мистический навык d10+", detail: "Восстанавливает 5 пунктов силы ценой уровня Усталости.", source: "SWADE", caution: "В Ultima Forsan эта черта помечена как недоступная; приведена для полноты справочника." },
  { name: "Концентрация", requirements: "Закалённый, Мистический дар", detail: "Удваивает длительность всех немгновенных эффектов сил.", source: "SWADE" },
  { name: "Менталист", requirements: "Закалённый, Мистический дар (псионика), Псионика d6+", detail: "+2 к встречным проверкам Псионики.", source: "SWADE", caution: "В Ultima Forsan эта черта помечена как недоступная; приведена для полноты справочника." },
  { name: "Новые силы", requirements: "Новичок, Мистический дар", detail: "Герой осваивает две новые силы.", source: "SWADE" },
  { name: "Прилив силы", requirements: "Новичок, дикая карта, Мистический дар, мистический навык d8+", detail: "С джокером герой восстанавливает 10 пунктов силы.", source: "SWADE", caution: "В Ultima Forsan эта черта помечена как недоступная; приведена для полноты справочника." },
  { name: "Пункты силы", requirements: "Новичок, Мистический дар", detail: "+5 пунктов силы; черту можно брать не более одного раза за ранг.", source: "SWADE", caution: "В Ultima Forsan эта черта помечена как недоступная; приведена для полноты справочника." },
  { name: "Управление потоком", requirements: "Закалённый, Мистический дар", detail: "При подъёме на проверке активации стоимость силы снижается на 1 пункт.", source: "SWADE" },
  { name: "Чародей", requirements: "Закалённый, Мистический дар (магия), Колдовство d6+", detail: "За 1 пункт силы позволяет менять проявление активируемой силы.", source: "SWADE", caution: "Применимость зависит от конкретного мистического дара и правил Ultima Forsan." },
  { name: "Искусный воин+", requirements: "Легенда, Искусный воин", detail: "+2 к Защите; дополнительная кость урона Дракой становится d10.", source: "SWADE" },
  { name: "Несгибаемый+", requirements: "Легенда, Несгибаемый, Выносливость d12+", detail: "Герой выдерживает пять ранений перед состоянием при смерти.", source: "SWADE" },
  { name: "Профессионал+", requirements: "Легенда, Профессионал в выбранном параметре", detail: "Текущий и максимальный уровень выбранного параметра увеличиваются ещё на ступень.", source: "SWADE" },
  { name: "Профессионал++", requirements: "Легенда, дикая карта, Профессионал+ в выбранном параметре", detail: "При проверках выбранного параметра герой использует d10 как дикий кубик.", source: "SWADE" },
  { name: "Избранный", requirements: "Новичок, Характер d8+, Драка d6+", detail: "+2 к урону против сверхъестественных существ противоположной природы.", source: "SWADE" },
  { name: "Ци", requirements: "Ветеран, Мастер боевых искусств+", detail: "Раз за бой позволяет перебросить атаку, заставить врага перебросить удачную атаку или добавить d6 к безоружной Драке.", source: "SWADE" },
  { name: "Мистический дар (алхимия)", requirements: "Новичок", detail: "Открывает Алхимию и 3 начальные силы. В Ultima Forsan пункты силы не тратятся.", source: "Ultima Forsan" },
  { name: "Мистический дар (ведьмовство)", requirements: "Новичок", detail: "Открывает Ведьмовство и 2 начальные силы. В Ultima Forsan пункты силы не тратятся.", source: "Ultima Forsan" },
  { name: "Мистический дар (безумная наука)", requirements: "Новичок", detail: "Открывает Безумную науку d4 и 2 начальные силы; каждая сила проявляется через отдельное устройство, без запаса ПС.", source: "Ultima Forsan" },
  { name: "Аль-барсарк", requirements: "Новичок, обычно сицилийский норманн, Сила d8+, Характер d6+", detail: "Священная ярость против чумных отродий усиливает ближний бой и Стойкость, но снижает Защиту.", source: "Ultima Forsan" },
  { name: "Выстрел в голову", requirements: "Новичок, Стрельба d8+, Твёрдая рука", detail: "Вдвое уменьшает штраф за прицельный выстрел в голову мертвецу.", source: "Ultima Forsan" },
  { name: "Удар в голову", requirements: "Новичок, Сила d6+, Драка d8+, Хладнокровие", detail: "Вдвое уменьшает штраф за прицельный удар в голову мертвеца.", source: "Ultima Forsan" },
  { name: "Охота за крупной дичью", requirements: "Ветеран, Драка d8+, Знание (Чума) d4+, Смелость, Хладнокровие", detail: "Добавляет модификатор размера крупного чумного отродья и к атаке, и к урону.", source: "Ultima Forsan" },
  { name: "Путь Ада", requirements: "Закалённый, брат/сестра милосердия, Драка d8+", detail: "Улучшает быструю безоружную атаку: меньшие штрафы к Защите и ударам.", source: "Ultima Forsan" },
  { name: "Путь Небес", requirements: "Закалённый, брат/сестра милосердия, Драка d8+", detail: "+2 к безоружной Драке для нанесения несмертельного урона.", source: "Ultima Forsan" },
  { name: "Путь Чистилища", requirements: "Закалённый, брат/сестра милосердия, Драка d8+", detail: "+2 к проверкам толчка.", source: "Ultima Forsan" },
  { name: "Путь Лимба", requirements: "Герой, Путь Ада, Путь Небес, Путь Чистилища, Ловкость d8+, Характер d10+", detail: "Позволяет становиться незаметным для слабейших мертвецов, пока герой не бежит и не действует активно.", source: "Ultima Forsan" },
  { name: "Всадник", requirements: "Новичок, Ловкость d6+, Верховая езда d8+", detail: "+2 к Верховой езде и ловкостным уловкам верхом без штрафа за нагрузку.", source: "Ultima Forsan" },
  { name: "Брат милосердия / сестра чёток", requirements: "Новичок, Характер d6+, Драка d6+", detail: "Даёт Мастера боевых искусств, особое оружие, броню и приют; налагает крупный Пацифизм.", source: "Ultima Forsan" },
  { name: "Искариот", requirements: "Новичок, Ловкость d8+, Характер d6+, Драка d8+, Скрытность d8+", detail: "Мастер двух кинжалов; использует Ловкость для урона и получает фирменное снаряжение.", source: "Ultima Forsan", caution: "Адаптация SWADE: требование «Маскировка d8+» заменено на «Скрытность d8+»." },
  { name: "Красная одалиска", requirements: "Новичок, Ловкость d8+, Характер d6+, Драка d6+, Убеждение d6+, Привлекательность", detail: "Сражается двумя саблями и использует Ловкость для урона без штрафа за нагрузку; красная вуаль даёт +1 к Убеждению и Выступлению, когда важен статус.", source: "Ultima Forsan", caution: "Адаптация SWADE: старый бонус +1 к Харизме действует как ситуативный +1 к Убеждению и Выступлению." },
  { name: "Ловец мертвецов", requirements: "Новичок, Ловкость d6+, Знание (Чума) d4+", detail: "Снаряжение ловца; без штрафа против мелких целей и +2 против стай и роёв.", source: "Ultima Forsan" },
  { name: "Могильщик", requirements: "Новичок, Сила d6+, Знание (Чума) d4+", detail: "Стартовое снаряжение; +2 к Знанию (Чума) и Вниманию при поиске Чернил или признаков заражения.", source: "Ultima Forsan" },
  { name: "Рыцарь", requirements: "Новичок, Сила d8+, Характер d6+, Выносливость d6+, Верховая езда d8+, Драка d8+", detail: "Обет службы, полное рыцарское снаряжение и приют; специализация зависит от ордена.", source: "Ultima Forsan" },
  { name: "Тевтонский инквизитор", requirements: "Новичок, Смекалка d6+, Уличное чутьё, Знание (Чума) d6+, Поиск информации d6+, Внимание d6+", detail: "Бесплатно даёт черту «Сыщик», пистоль и полномочия ордена; требует подчинения начальству.", source: "Ultima Forsan", caution: "Адаптация SWADE: старые навыки «Уличное чутьё» и «Расследование» заменены на черту «Уличное чутьё» и навык «Поиск информации». «Следователь» переименован в «Сыщика»." },
  { name: "Чумный доктор", requirements: "Новичок, Знание (Чума) d6+, Лечение d6+", detail: "+2 к Знанию (Чума), медицинское снаряжение и возможность быстро удалить заражённую ткань.", source: "Ultima Forsan" },
  { name: "Механический протез", requirements: "Новичок, дикая карта, отсутствует часть тела", detail: "Протез отменяет изъян, вызванный утратой соответствующей части тела.", source: "Ultima Forsan" },
  { name: "Отвлечь мертвеца", requirements: "Новичок, нечистый, Смекалка d6+, Характер d8+", detail: "Встречной проверкой Характера вводит некоторых мертвецов в шок и может отвести их.", source: "Ultima Forsan" },
  { name: "Полные закрома", requirements: "Новичок, Верховая езда или Судовождение d6+", detail: "Даёт транспорт до 10 000 флоринов и позволяет доставать из него нужные припасы.", source: "Ultima Forsan" },
  { name: "Сардоническая усмешка", requirements: "Только заражённый Чумой чистый герой", detail: "Дополнительная фишка, бонус против чумных отродий и стойкость перед близкой смертью.", source: "Ultima Forsan", caution: "Получается только после заражения в игре, не покупается при создании." },
  { name: "Силовая броня", requirements: "Новичок", detail: "Герой начинает с одного элемента комплекта силовой брони.", source: "Ultima Forsan" },
  { name: "Шут мертвецов", requirements: "Новичок, Смекалка d8+, Характер d6+, Убеждение d6+", detail: "Позволяет применять смекалочную уловку к мертвецам; +2 к таким уловкам против живых.", source: "Ultima Forsan" },
  { name: "Скверна", requirements: "Герой, человек, Выносливость d8+", detail: "После мучительной болезни герой превращается в нечистого и получает все его особенности.", source: "Ultima Forsan" },
  { name: "За гранью", requirements: "Легенда, дикая карта, нечистый, Характер d12+", detail: "Нечистый превращается в разумную стрыгу и получает особенности мертвеца без потери разума.", source: "Ultima Forsan" },
  { name: "Судный день", requirements: "Легенда, Именное оружие, Драка d10+ или Атлетика d10+ или Стрельба d10+", detail: "Именное оружие становится священным и наносит мертвецам дополнительную кость урона.", source: "Ultima Forsan" },
  { name: "Усовершенствованное устройство", requirements: "Легенда, Мистический дар (безумная наука), Безумная наука d10+", detail: "Выберите одну силу устройства: +1 к её активации, а каждое продление не требует обычного 1 ПС.", source: "Ultima Forsan", caution: "Адаптация SWADE: старые пункты о штрафе за несколько активных сил, ранении/шоке и обычной отдаче убраны — в SWADE таких ограничений нет, а силы прекращаются при критическом провале." },
];

const CAMPAIGN_UNAVAILABLE_EDGE_NAMES = new Set([
  "Беспощадность",
  "Воин света / тьмы",
  "Восстановление силы",
  "Восстановление силы+",
  "Избранный",
  "Изобретатель",
  "Иссушение духа",
  "Менталист",
  "Прилив силы",
  "Пункты силы",
  "Рок-н-ролл!",
  "Убийца великанов",
  "Устойчивость к мистическим силам",
  "Устойчивость к мистическим силам+",
  "Чародей",
]);

const HINDRANCE_GUIDES: TraitGuide[] = [
  { name: "Болезненность", severity: "minor", detail: "-2 к Выносливости при сопротивлении Усталости.", source: "SWADE" },
  { name: "В розыске", severity: "either", detail: "Персонажа разыскивают представители закона; масштаб зависит от тяжести.", minorDetail: "Разыскивается за сравнительно небольшое преступление или далеко от места основных событий.", majorDetail: "Разыскивается за тяжкое преступление; преследование активно и представляет постоянную угрозу.", source: "SWADE" },
  { name: "Верный друг", severity: "minor", detail: "У героя есть невероятно надёжный друг или союзник, за которого приходится отвечать.", source: "SWADE" },
  { name: "Враг", severity: "either", detail: "Героя преследует недоброжелатель; крупный враг опаснее и влиятельнее.", minorDetail: "Героя преследует одиночка или опасная группа, которая появляется лишь время от времени.", majorDetail: "Героя преследует могущественный соперник, представитель власти или целая организация.", source: "SWADE" },
  { name: "Героизм", severity: "major", detail: "Герой обязан помогать нуждающимся, даже когда это опасно.", source: "SWADE" },
  { name: "Длинный язык", severity: "minor", detail: "Часто выдаёт важные сведения не тем людям.", source: "SWADE" },
  { name: "Дурная привычка", severity: "either", detail: "Зависимость или навязчивая привычка; без неё герой получает Усталость.", minorDetail: "Раздражающая, но безопасная привычка: она отталкивает окружающих и создаёт социальные неудобства.", majorDetail: "Опасная зависимость: без дозы в течение 24 часов герой проверяет Выносливость и при провале получает Усталость.", source: "SWADE" },
  { name: "Дурной характер", severity: "minor", detail: "-1 к проверкам Убеждения.", source: "SWADE" },
  { name: "Жадность", severity: "either", detail: "Слишком озабочен деньгами и собственностью.", minorDetail: "Яростно спорит о своей доле добычи и всегда старается получить побольше.", majorDetail: "Не успокоится, пока не получит всё, что считает своим; способен на крайности ради добычи.", source: "SWADE" },
  { name: "Жажда крови", severity: "major", detail: "Не упускает возможности добить поверженного противника.", source: "SWADE" },
  { name: "Жестокость", severity: "either", detail: "Готов идти по головам; тяжесть определяет предел бесчеловечности.", minorDetail: "Не станет по-настоящему вредить другим, пока они намеренно не мешают достижению его целей.", majorDetail: "Без колебаний расправится с любым, кто встанет на пути к его цели.", source: "SWADE" },
  { name: "Заблуждение", severity: "either", detail: "Искренне верит в то, что расходится с реальностью.", minorDetail: "Заблуждение безвредно или герой обычно держит его при себе.", majorDetail: "Открыто и часто действует согласно опасному заблуждению, что приводит к серьёзным последствиям.", source: "SWADE" },
  { name: "Зависть", severity: "either", detail: "Стремится отнять или превзойти то, чем обладают другие.", minorDetail: "Ревностно оберегает или присваивает себе одно конкретное достижение или положение.", majorDetail: "Завидует всему чужому успеху, строит козни и не прощает тех, кто его затмевает.", source: "SWADE" },
  { name: "Заносчивость", severity: "major", detail: "Всегда доказывает своё превосходство и ищет достойнейшего противника.", source: "SWADE" },
  { name: "Импульсивность", severity: "major", detail: "Сначала действует, потом думает.", source: "SWADE" },
  { name: "Клятва", severity: "either", detail: "Принёс клятву и должен следовать ей; крупная клятва определяет жизнь героя.", minorDetail: "Клятва требует постоянного, но не слишком активного служения и лишь изредка мешает группе.", majorDetail: "Исполнение клятвы регулярно требует времени и сил, а иногда заставляет рисковать жизнью.", source: "SWADE" },
  { name: "Кодекс чести", severity: "major", detail: "Держит слово и ведёт себя достойно даже себе во вред.", source: "SWADE" },
  { name: "Коротышка", severity: "minor", detail: "Размер и Стойкость уменьшаются на 1.", source: "SWADE" },
  { name: "Косноязычие", severity: "major", detail: "-1 к Запугиванию, Убеждению и Насмешке.", source: "SWADE" },
  { name: "Кривые руки", severity: "minor", detail: "-2 при использовании механических устройств.", source: "SWADE" },
  { name: "Любопытство", severity: "major", detail: "Не может пройти мимо тайны или неизвестности.", source: "SWADE" },
  { name: "Медлительность", severity: "minor", detail: "В бою тянет две карты действия и обычно оставляет худшую.", source: "SWADE" },
  { name: "Мстительность", severity: "either", detail: "Не забывает обид; крупная версия толкает на серьёзное возмездие.", minorDetail: "Добивается справедливости законными или сравнительно умеренными средствами.", majorDetail: "Ради мести пойдёт на всё и не отступится, пока обидчик не заплатит сполна.", source: "SWADE" },
  { name: "Мягкость", severity: "minor", detail: "-2 к проверкам Запугивания.", source: "SWADE" },
  { name: "Невезение", severity: "major", detail: "На 1 фишку меньше в начале каждой встречи.", source: "SWADE" },
  { name: "Неграмотность", severity: "minor", detail: "Не умеет читать и писать.", source: "SWADE", caution: "В Ultima Forsan герои по умолчанию грамотны; этот изъян отменяет правило мира." },
  { name: "Немота", severity: "major", detail: "Не способен разговаривать.", source: "SWADE" },
  { name: "Неуклюжесть", severity: "major", detail: "-2 к Атлетике и Скрытности.", source: "SWADE" },
  { name: "Неумение плавать", severity: "minor", detail: "−2 к Атлетике (плавание); каждая клетка в воде стоит 3 клетки движения.", source: "SWADE" },
  { name: "Обидчивость", severity: "either", detail: "Хуже сопротивляется Насмешкам: -2 или -4 по тяжести.", minorDetail: "−2 на встречные проверки против Насмешки.", majorDetail: "−4 на встречные проверки против Насмешки.", source: "SWADE" },
  { name: "Обязательства", severity: "either", detail: "Должен посвящать обязанностям значительную часть недели.", minorDetail: "Обязанности отнимают около 20 часов в неделю.", majorDetail: "Обязанности отнимают около 40 часов в неделю или больше.", source: "SWADE" },
  { name: "Одержимость идеей", severity: "either", detail: "Подчиняет решения великой цели; крупная версия почти всепоглощающая.", minorDetail: "Цель изредка толкает героя к активным действиям и обычно не влечёт серьёзных последствий.", majorDetail: "Стремление регулярно захватывает все мысли и действия героя, создавая проблемы ему и группе.", source: "SWADE" },
  { name: "Отсутствие глаза", severity: "major", detail: "-2 к действиям, зависящим от зрения, на средней и дальней дистанции.", source: "SWADE" },
  { name: "Отсутствие руки", severity: "major", detail: "-4 к задачам, для которых нужны обе руки.", source: "SWADE" },
  { name: "Паранойя", severity: "either", detail: "Никому не доверяет; при крупной версии помощь герою затруднена.", minorDetail: "С трудом доверяет людям, требует гарантий и порой подозревает даже союзников.", majorDetail: "Крайне недоверчив; все попытки оказать ему Помощь получают штраф −2.", source: "SWADE" },
  { name: "Пацифизм", severity: "either", detail: "Мелкий: дерётся лишь для самозащиты; крупный: не дерётся вовсе.", minorDetail: "Прибегает к насилию, только когда нет иного выхода, и не допускает убийства беззащитных.", majorDetail: "Не нападает на живых разумных существ; применяет нелетальные методы только для защиты себя или других.", source: "SWADE" },
  { name: "Перестраховщик", severity: "minor", detail: "Излишне осторожен и склонен слишком долго планировать.", source: "SWADE" },
  { name: "Плохое зрение", severity: "either", detail: "-1 или -2 к зрительным проверкам; очки обычно отменяют штраф.", minorDetail: "−1 к проверкам параметров, связанным со зрением; подходящие очки обычно отменяют штраф.", majorDetail: "−2 к проверкам параметров, связанным со зрением; подходящие очки обычно отменяют штраф.", source: "SWADE" },
  { name: "Позор", severity: "either", detail: "В прошлом героя есть постыдный поступок или пятно на репутации.", minorDetail: "О постыдном прошлом знают сам герой и лишь несколько других людей.", majorDetail: "О позоре знают многие, включая людей, чьё мнение особенно важно для героя.", source: "SWADE" },
  { name: "Полнота", severity: "minor", detail: "+1 к Размеру, -1 к Шагу, бег d4; Сила ниже для требований нагрузки.", source: "SWADE" },
  { name: "Причуда", severity: "minor", detail: "Безобидная или неприятная странность поведения.", source: "SWADE" },
  { name: "Рассеянность", severity: "major", detail: "-1 к Осведомлённости и Вниманию.", source: "SWADE" },
  { name: "Самопожертвование", severity: "minor", detail: "Готов рисковать собой ради великой цели.", source: "SWADE" },
  { name: "Самоуверенность", severity: "major", detail: "Уверен, что способен справиться с любой угрозой.", source: "SWADE" },
  { name: "Секрет", severity: "either", detail: "Скрывает опасную правду; тяжесть определяет последствия разоблачения.", minorDetail: "Разоблачение грозит серьёзными потерями, но не ставит на кон жизнь героя или другого человека.", majorDetail: "Разоблачение ведёт к крайне серьёзным, возможно смертельным последствиям.", source: "SWADE" },
  { name: "Слепота", severity: "major", detail: "-6 к действиям, требующим зрения; взамен даётся дополнительная черта.", source: "SWADE" },
  { name: "Старость", severity: "major", detail: "Медленнее и слабее физически, но получает дополнительные умственные навыки.", source: "SWADE" },
  { name: "Транжира", severity: "minor", detail: "Половина стартовых средств и постоянная склонность тратить деньги.", source: "SWADE" },
  { name: "Трусость", severity: "major", detail: "-2 к сопротивлению страху и Запугиванию.", source: "SWADE" },
  { name: "Тугоухость", severity: "either", detail: "-4 к слуховому Вниманию; при крупной версии герой полностью глух.", minorDetail: "−4 ко всем проверкам Внимания, связанным со слухом, включая попытки проснуться от шума.", majorDetail: "Полностью глух и автоматически проваливает проверки Внимания, связанные со слухом.", source: "SWADE" },
  { name: "Упрямство", severity: "minor", detail: "Не признаёт ошибок и до последнего стоит на своём.", source: "SWADE" },
  { name: "Уродство", severity: "either", detail: "-1 или -2 к Убеждению, когда внешность имеет значение.", minorDetail: "−1 к проверкам Убеждения, когда внешность имеет значение.", majorDetail: "−2 к проверкам Убеждения, когда внешность имеет значение.", source: "SWADE" },
  { name: "Фобия", severity: "either", detail: "-1 или -2 ко всем проверкам рядом с объектом страха.", minorDetail: "−1 ко всем проверкам параметров рядом с объектом фобии.", majorDetail: "−2 ко всем проверкам параметров рядом с объектом фобии.", source: "SWADE" },
  { name: "Фома неверующий", severity: "minor", detail: "Не верит в сверхъестественное и потому опасно недооценивает его.", source: "SWADE" },
  { name: "Хромота", severity: "either", detail: "Снижает Шаг и бег; крупная версия также даёт -2 к Атлетике.", minorDetail: "Шаг −1, кость бега уменьшается на ступень; недоступна черта «Быстроногость».", majorDetail: "Шаг −2, кость бега уменьшается на ступень; −2 к Атлетике и встречным проверкам против неё; недоступна «Быстроногость».", source: "SWADE" },
  { name: "Чужак", severity: "either", detail: "-2 к Убеждению; при крупной версии нет гражданских прав.", minorDetail: "−2 к Убеждению с теми, кто считает героя чужаком; его воспринимают как человека второго сорта.", majorDetail: "Как в мелкой версии, а также герой почти или совсем лишён прав в обществе, где происходят события.", source: "SWADE" },
  { name: "Юность", severity: "either", detail: "Меньше пунктов характеристик и навыков, но больше фишек.", minorDetail: "Возраст 12–15 лет: 4 пункта характеристик, 10 пунктов навыков и +1 фишка в начале встречи.", majorDetail: "Возраст 8–11 лет: 3 пункта характеристик, 10 пунктов навыков, обязательный изъян «Коротышка» и +2 фишки в начале встречи.", source: "SWADE" },
  { name: "Слабое нутро", severity: "major", detail: "При каждом столкновении с ужасами Чумы проходит проверку Храбрости (Характера).", source: "Ultima Forsan" },
];

function requiredRank(guide: TraitGuide): Rank {
  const rankClause = (guide.requirements || "")
    .split(",", 1)[0]
    .trim()
    .toLocaleLowerCase("ru");
  if (rankClause.startsWith("легенд")) return "Легенда";
  if (rankClause.startsWith("герой")) return "Герой";
  if (rankClause.startsWith("ветеран")) return "Ветеран";
  if (rankClause.startsWith("закалён")) return "Закалённый";
  return "Новичок";
}

function rankAllows(currentRank: string, guide: TraitGuide) {
  const current = Math.max(0, RANKS.indexOf(currentRank as Rank));
  return current >= RANKS.indexOf(requiredRank(guide));
}

function edgeAvailableInCampaign(guide: TraitGuide) {
  return !CAMPAIGN_UNAVAILABLE_EDGE_NAMES.has(guide.name);
}

function campaignEdgeIssue(guide: TraitGuide) {
  if (!edgeAvailableInCampaign(guide)) return "Черта недоступна в кампании Ultima Forsan";
  if (guide.name === "Сардоническая усмешка") return "Черта выдаётся только после заражения в игре";
  return "";
}

const ATTRIBUTE_REQUIREMENTS: Record<string, AttributeKey> = {
  "ловкость": "agility",
  "смекалка": "smarts",
  "характер": "spirit",
  "сила": "strength",
  "выносливость": "vigor",
};

function edgeRequirementIssues(guide: TraitGuide, rank: Rank, character: Character, skills: Skill[]): string[] {
  const requirements = guide.requirements || "";
  const normalized = requirements.toLocaleLowerCase("ru");
  const issues: string[] = [];
  const campaignIssue = campaignEdgeIssue(guide);
  if (campaignIssue) issues.push(campaignIssue);
  if (!rankAllows(rank, guide)) issues.push(`Нужен ранг «${requiredRank(guide)}»`);

  for (const match of normalized.matchAll(/(ловкость|смекалка|характер|сила|выносливость) d(4|6|8|10|12)\+/g)) {
    const key = ATTRIBUTE_REQUIREMENTS[match[1]];
    const needed = Number(match[2]);
    if (character.attributes[key] < needed) issues.push(`${match[1][0].toUpperCase()}${match[1].slice(1)} должна быть d${needed}+`);
  }

  const skillByName = new Map(skills.map((skill) => [skill.name.toLocaleLowerCase("ru"), skill]));
  const alternativeRequirementSegments = new Set<string>();
  for (const segment of requirements.split(",").map((item) => item.trim())) {
    const lowerSegment = segment.toLocaleLowerCase("ru");
    if (lowerSegment.includes(" или ")) {
      alternativeRequirementSegments.add(lowerSegment);
      const defaultDie = Number(lowerSegment.match(/d(4|6|8|10|12)\+/)?.[1] || 0);
      const options = lowerSegment.split(/\s+или\s+/).map((option) => {
        const needed = Number(option.match(/d(4|6|8|10|12)\+/)?.[1] || defaultDie);
        const name = option.replace(/d(4|6|8|10|12)\+/g, "").trim();
        return { skill: skillByName.get(name), needed };
      }).filter((option) => option.skill && option.needed);
      if (options.length >= 2 && !options.some((option) => (option.skill?.level || 0) >= option.needed)) {
        issues.push(`${options.map((option) => option.skill?.name).join(" или ")} должны быть d${defaultDie}+`);
      }
      continue;
    }
    for (const skill of skills) {
      const escaped = skill.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = lowerSegment.match(new RegExp(`^${escaped.toLocaleLowerCase("ru")} d(4|6|8|10|12)\\+`));
      if (match && skill.level < Number(match[1])) issues.push(`${skill.name} должен быть d${match[1]}+`);
    }
  }

  const owned = character.edges.map((edge) => edge.name.trim().toLocaleLowerCase("ru"));
  const segments = requirements.split(",").map((segment) => segment.trim()).slice(1);
  for (const segment of segments) {
    const lower = segment.toLocaleLowerCase("ru");
    if (alternativeRequirementSegments.has(lower)) continue;
    if (/d(4|6|8|10|12)\+/.test(lower) || lower.includes("или") || lower.includes("дикая карта") || lower.includes("человек") || lower.includes("нечист") || lower.includes("см. описание") || lower.includes("отсутствует") || lower.includes("навык") || lower.includes("параметр") || lower.includes("сицилий")) continue;
    if (lower === "мистический дар") {
      if (!owned.some((name) => name.startsWith("мистический дар"))) issues.push("Нужна черта «Мистический дар»");
      continue;
    }
    const prerequisite = EDGE_GUIDES
      .filter((candidate) => candidate.name !== guide.name)
      .sort((a, b) => b.name.length - a.name.length)
      .find((candidate) => lower.startsWith(candidate.name.toLocaleLowerCase("ru")));
    if (prerequisite && !owned.includes(prerequisite.name.toLocaleLowerCase("ru"))) issues.push(`Нужна черта «${prerequisite.name}»`);
  }

  if (normalized.includes("нечист") && character.purity !== "Нечистый") issues.push("Герой должен быть нечистым");
  if (normalized.includes("чистый герой") && character.purity !== "Чистый") issues.push("Герой должен быть чистым");
  if (normalized.includes("заражён") && !character.infected) issues.push("Герой должен быть заражён Чумой");
  return [...new Set(issues)];
}

const BASE_SKILLS: Omit<Skill, "level">[] = [
  { id: "athletics", name: "Атлетика", attribute: "agility", core: true },
  { id: "notice", name: "Внимание", attribute: "smarts", core: true },
  { id: "common", name: "Осведомлённость", attribute: "smarts", core: true },
  { id: "stealth", name: "Скрытность", attribute: "agility", core: true },
  { id: "persuasion", name: "Убеждение", attribute: "spirit", core: true },
  { id: "academics", name: "Академические знания", attribute: "smarts" },
  { id: "alchemy", name: "Алхимия", attribute: "smarts" },
  { id: "weird-science", name: "Безумная наука", attribute: "smarts" },
  { id: "riding", name: "Верховая езда", attribute: "agility" },
  { id: "faith", name: "Вера", attribute: "spirit" },
  { id: "battle", name: "Военное дело", attribute: "smarts" },
  { id: "thievery", name: "Воровство", attribute: "agility" },
  { id: "witchcraft", name: "Ведьмовство", attribute: "spirit" },
  { id: "survival", name: "Выживание", attribute: "smarts" },
  { id: "performance", name: "Выступление", attribute: "spirit" },
  { id: "fighting", name: "Драка", attribute: "agility" },
  { id: "intimidation", name: "Запугивание", attribute: "spirit" },
  { id: "plague", name: "Знание (Чума)", attribute: "smarts" },
  { id: "healing", name: "Лечение", attribute: "smarts" },
  { id: "taunt", name: "Насмешка", attribute: "smarts" },
  { id: "science", name: "Наука", attribute: "smarts" },
  { id: "occult", name: "Оккультизм", attribute: "smarts" },
  { id: "research", name: "Поиск информации", attribute: "smarts" },
  { id: "repair", name: "Ремонт", attribute: "smarts" },
  { id: "shooting", name: "Стрельба", attribute: "agility" },
  { id: "boating", name: "Судовождение", attribute: "agility" },
];

const makeId = () => Math.random().toString(36).slice(2, 9);

const blankEdge = (): TraitEntry => ({ id: makeId(), name: "", note: "" });
const blankHindrance = (): TraitEntry => ({
  id: makeId(),
  name: "",
  note: "",
  severity: "minor",
});
const blankWeapon = (): Weapon => ({
  id: makeId(),
  name: "",
  range: "",
  damage: "",
  ap: "",
  ammo: "",
  price: 0,
  weight: 0,
  purchased: false,
});

const createInitialSkills = (): Skill[] =>
  BASE_SKILLS.map((skill) => ({ ...skill, level: skill.core ? 4 : 0 }));

const createInitialCharacter = (): Character => ({
  name: "",
  player: "",
  archetype: "",
  advances: "0",
  edgeAdvances: "0",
  skillAdvancePoints: 0,
  attributeAdvancePoints: 0,
  attributeRaiseRanks: [],
  retiredHindrancePoints: 0,
  origin: "",
  age: "",
  purity: "Чистый",
  appearance: "",
  portrait: "",
  portraitX: 50,
  portraitY: 50,
  portraitZoom: 100,
  creationLocked: false,
  attributes: { agility: 4, smarts: 4, spirit: 4, strength: 4, vigor: 4 },
  armor: 0,
  size: 0,
  pace: 6,
  runningDie: 6,
  bennies: 3,
  languages: "",
  edges: [blankEdge()],
  hindrances: [blankHindrance(), blankHindrance(), blankHindrance()],
  powers: [],
  weapons: [blankWeapon(), blankWeapon(), blankWeapon()],
  inventory: [],
  gear: "",
  florins: "500",
  homeland: "",
  belief: "",
  goal: "",
  fear: "",
  plague: "",
  bonds: "",
  notes: "",
  wildArcana: "",
  wounds: 0,
  fatigue: 0,
  shaken: false,
  infected: false,
  witchcraftBacklash: false,
  sessionBennies: 3,
  plagueExposure: 0,
  ammoSpent: {},
  printPortrait: true,
  printDiceValues: true,
  printExtraNotesPage: false,
});

function restoreCharacter(value?: Partial<Character>): Character {
  const initial = createInitialCharacter();
  const rest = { ...(value || {}) } as Partial<Character> & {
    rank?: unknown;
    rulesMode?: unknown;
    charisma?: unknown;
  };
  delete rest.rank;
  delete rest.rulesMode;
  delete rest.charisma;
  const restoredEdges = rest.edges?.map((entry) => (
    entry.name.trim().toLocaleLowerCase("ru") === "следователь"
      ? { ...entry, name: "Сыщик", note: "+2 к Поиску информации и Вниманию при поиске улик." }
      : entry
  ));
  const restoredHindrances = rest.hindrances?.map((entry) => {
    const guide = HINDRANCE_GUIDES.find(
      (item) => item.name.toLocaleLowerCase("ru") === entry.name.trim().toLocaleLowerCase("ru"),
    );
    return guide && guide.severity !== "either" ? { ...entry, severity: guide.severity } : entry;
  });
  const restoredInventory = Array.isArray(rest.inventory)
    ? rest.inventory.map((item) => {
        const guide = EQUIPMENT_GUIDES.find((entry) => entry.id === item.id);
        return guide ? { ...item, ...guide } : item;
      })
    : [];
  return {
    ...initial,
    ...rest,
    attributes: { ...initial.attributes, ...(rest.attributes || {}) },
    skillAdvancePoints: Math.max(0, safeNumber(rest.skillAdvancePoints)),
    attributeAdvancePoints: Math.max(0, safeNumber(rest.attributeAdvancePoints)),
    attributeRaiseRanks: Array.isArray(rest.attributeRaiseRanks) ? rest.attributeRaiseRanks : [],
    retiredHindrancePoints: Math.max(0, safeNumber(rest.retiredHindrancePoints)),
    inventory: restoredInventory,
    powers: Array.isArray(rest.powers)
      ? rest.powers
          .filter((power) => power && ARCANE_TRADITION_ORDER.includes(power.tradition) && POWER_GUIDES.some((guide) => guide.id === power.guideId && guide.manifestations[power.tradition]))
          .map((power) => {
            const guide = POWER_GUIDES.find((item) => item.id === power.guideId)!;
            return {
              ...power,
              id: power.id || `power-${makeId()}`,
              name: guide.name,
              trapping: typeof power.trapping === "string" ? power.trapping : guide.manifestations[power.tradition] || "",
              recipeCost: Math.max(guide.cost || 0, Math.floor(safeNumber(power.recipeCost, guide.cost || 0))),
              prepared: Math.max(0, safeNumber(power.prepared)),
              active: Boolean(power.active),
              broken: Boolean(power.broken),
            };
          })
      : [],
    portraitX: Math.min(100, Math.max(0, safeNumber(rest.portraitX, 50))),
    portraitY: Math.min(100, Math.max(0, safeNumber(rest.portraitY, 50))),
    portraitZoom: Math.min(180, Math.max(100, safeNumber(rest.portraitZoom, 100))),
    ammoSpent: rest.ammoSpent && typeof rest.ammoSpent === "object" ? rest.ammoSpent : {},
    edges: restoredEdges?.length
      ? [
          ...restoredEdges.filter((entry) => entry.name.trim() || entry.note.trim()),
          ...(restoredEdges.some((entry) => !entry.name.trim() && !entry.note.trim()) ? [blankEdge()] : []),
        ]
      : initial.edges,
    hindrances: restoredHindrances?.length ? restoredHindrances : initial.hindrances,
    weapons: rest.weapons?.length ? rest.weapons : initial.weapons,
  };
}

function restoreSkills(value?: Skill[]): Skill[] {
  if (!value?.length) return createInitialSkills();
  const savedById = new Map(value.map((skill) => [skill.id, skill]));
  const migratedLevels = new Map<string, Die>();
  for (const skill of value) {
    const targetId = LEGACY_SKILL_TARGETS.get(skill.name.trim().toLocaleLowerCase("ru"));
    if (targetId) migratedLevels.set(targetId, Math.max(migratedLevels.get(targetId) || 0, skill.level) as Die);
  }
  const standard = createInitialSkills().map((skill) => {
    const saved = savedById.get(skill.id);
    const migratedLevel = migratedLevels.get(skill.id) || 0;
    return {
      ...skill,
      ...(saved || {}),
      name: skill.name,
      attribute: skill.attribute,
      level: Math.max(saved?.level || 0, migratedLevel, skill.core ? 4 : 0) as Die,
      core: skill.core,
    };
  });
  const custom = value.filter((skill) => skill.id.startsWith("custom-") && !LEGACY_SKILL_TARGETS.has(skill.name.trim().toLocaleLowerCase("ru")));
  return [...standard, ...custom];
}

function copyData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function captureAdvanceState(character: Character, skills: Skill[]): AdvanceSnapshot {
  return copyData({
    advances: character.advances,
    edgeAdvances: character.edgeAdvances,
    skillAdvancePoints: character.skillAdvancePoints,
    attributeAdvancePoints: character.attributeAdvancePoints,
    attributeRaiseRanks: character.attributeRaiseRanks,
    retiredHindrancePoints: character.retiredHindrancePoints,
    attributes: character.attributes,
    edges: character.edges,
    hindrances: character.hindrances,
    powers: character.powers,
    skills,
  });
}

function restoreAdvanceHistory(value: unknown): AdvanceRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is AdvanceRecord => {
    if (!item || typeof item !== "object") return false;
    const record = item as Partial<AdvanceRecord>;
    const before = record.before as Partial<AdvanceSnapshot> | undefined;
    return Boolean(
      record.id && Number.isFinite(record.number) && record.rank && record.type && record.summary &&
      record.createdAt && before && typeof before.advances === "string" &&
      Array.isArray(before.attributeRaiseRanks) && Array.isArray(before.edges) &&
      Array.isArray(before.hindrances) && Array.isArray(before.skills) && before.attributes,
    );
  });
}

function preparePortrait(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) return Promise.reject(new Error("Выберите файл изображения."));
  if (file.size > 12 * 1024 * 1024) return Promise.reject(new Error("Файл слишком большой. Максимальный размер — 12 МБ."));

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const maxWidth = 640;
        const maxHeight = 900;
        const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Браузер не смог обработать изображение.");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        let quality = .82;
        let result = canvas.toDataURL("image/jpeg", quality);
        while (result.length > 420_000 && quality > .5) {
          quality -= .08;
          result = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Не удалось прочитать изображение. Попробуйте JPG, PNG или WebP."));
    };
    image.src = objectUrl;
  });
}

function makeHeroRecord(
  character = createInitialCharacter(),
  skills = createInitialSkills(),
  advanceHistory: AdvanceRecord[] = [],
): SavedHero {
  const timestamp = new Date().toISOString();
  return {
    id: `hero-${makeId()}`,
    character: copyData(character),
    skills: copyData(skills),
    advanceHistory: copyData(advanceHistory),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const DEMO_CHARACTER: Partial<Character> = {
  name: "Беатриче Маласпина",
  player: "Игрок",
  archetype: "Чумный доктор",
  origin: "Лукка",
  age: "32",
  appearance:
    "Чёрный дорожный плащ, медная маска с коротким клювом, руки навсегда пахнут уксусом.",
  attributes: { agility: 6, smarts: 8, spirit: 6, strength: 4, vigor: 6 },
  armor: 1,
  languages: "Флорентийский, латынь, арабский, французский, греческий",
  florins: "84",
  homeland: "Дочь аптекаря из Лукки; училась при госпитале Святой Анны.",
  belief: "Знание без милосердия становится ещё одной разновидностью Чумы.",
  goal: "Найти способ остановить Чернила до того, как понадобится ампутация.",
  fear: "Ошибиться в диагнозе и обречь здорового человека.",
  plague: "Мертвецов не ненавидит: ненавидит небрежность живых.",
  bonds: "Должна жизнью старому могильщику Андреа.",
  wildArcana: "IX - Отшельник",
};

function dieLabel(value: Die) {
  return value === 0 ? "-" : `d${value}`;
}

function halfDie(value: Die) {
  return value === 0 ? 0 : value / 2;
}

function safeNumber(value: unknown, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function rankFromAdvances(value: unknown): Rank {
  const advances = Math.max(0, Math.floor(safeNumber(value)));
  if (advances >= 16) return "Легенда";
  if (advances >= 12) return "Герой";
  if (advances >= 8) return "Ветеран";
  if (advances >= 4) return "Закалённый";
  return "Новичок";
}

function nextRankAt(rank: Rank) {
  return ({ Новичок: 4, Закалённый: 8, Ветеран: 12, Герой: 16, Легенда: null } as const)[rank];
}

function rankAllowsPower(rank: Rank, power: PowerGuide) {
  return RANKS.indexOf(rank) >= RANKS.indexOf(power.rank);
}

function rollExplodingDie(sides: number) {
  const rolls: number[] = [];
  let total = 0;
  let roll = 0;
  do {
    roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    total += roll;
  } while (roll === sides);
  return { rolls, total };
}

function formatDieRoll(rolls: number[]) {
  return rolls.join("+");
}

function nextDie(value: Die): Die | null {
  const index = DIE_OPTIONS.indexOf(value);
  return index >= 0 && index < DIE_OPTIONS.length - 1 ? DIE_OPTIONS[index + 1] : null;
}

function skillCost(skill: Skill, attributes: Character["attributes"]) {
  const targetIndex = DIE_OPTIONS.indexOf(skill.level);
  if (targetIndex <= 0) return 0;
  const freeIndex = skill.core ? 1 : 0;
  let cost = 0;
  for (let index = freeIndex + 1; index <= targetIndex; index += 1) {
    const targetDie = DIE_OPTIONS[index];
    cost += targetDie <= attributes[skill.attribute] ? 1 : 2;
  }
  return cost;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: "text" | "number";
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function PlayNumberStepper({
  label,
  value,
  min = 0,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const clamp = (nextValue: number) => Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, Math.floor(nextValue)));
  return (
    <div className="play-number-field">
      <span>{label}</span>
      <div className="play-number-stepper">
        <input
          aria-label={label}
          type="number"
          min={min}
          max={max}
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => { if (Number.isFinite(event.currentTarget.valueAsNumber)) onChange(clamp(event.currentTarget.valueAsNumber)); }}
        />
        <div className="play-number-controls">
          <button type="button" className="stepper-up" aria-label={`Увеличить: ${label}`} disabled={max !== undefined && value >= max} onClick={() => onChange(clamp(value + 1))} />
          <button type="button" className="stepper-down" aria-label={`Уменьшить: ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - 1))} />
        </div>
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 380,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="field field-textarea">
      <span>{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
      <small>{value.length}/{maxLength}</small>
    </label>
  );
}

function DieSelect({
  value,
  onChange,
  allowUntrained = true,
  label,
}: {
  value: Die;
  onChange: (value: Die) => void;
  allowUntrained?: boolean;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(Number(event.target.value) as Die)}
    >
      {DIE_OPTIONS.filter((die) => allowUntrained || die > 0).map((die) => (
        <option key={die} value={die}>
          {dieLabel(die)}
        </option>
      ))}
    </select>
  );
}

function PrintLine({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="print-line">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function PipTrack({ count, label }: { count: number; label: string }) {
  return (
    <div className="pip-track">
      <span>{label}</span>
      <div>
        {Array.from({ length: count }).map((_, index) => (
          <i key={index} />
        ))}
      </div>
    </div>
  );
}

function AttributeDie({ die, current }: { die: Die; current: boolean }) {
  const title = `${dieLabel(die)}${current ? ", текущая характеристика" : ""}`;
  return (
    <span
      className={`attribute-die die-d${die}${current ? " is-current" : ""}`}
      aria-label={title}
    >
      <svg viewBox="0 0 32 32" role="img" aria-hidden="true" focusable="false">
        {die === 4 && <><polygon className="die-svg-face" points="16,2 30,29 2,29" /><path className="die-svg-facet" d="M16 2 16 20M2 29l14-9 14 9" /></>}
        {die === 6 && <><rect className="die-svg-face" x="2.5" y="2.5" width="27" height="27" rx="3" /><path className="die-svg-facet" d="M7 7h4M7 7v4M25 25h-4M25 25v-4" /></>}
        {die === 8 && <><polygon className="die-svg-face" points="16,1.5 30,16 16,30.5 2,16" /><path className="die-svg-facet" d="M16 1.5 10.5 16 16 30.5M30 16H10.5L2 16" /></>}
        {die === 10 && <><polygon className="die-svg-face" points="16,1.5 25,5.5 30,15 25.5,26 16,30.5 6.5,26 2,15 7,5.5" /><path className="die-svg-facet" d="M16 1.5 10 15 16 30.5M2 15h8l6-13.5M30 15H10l15.5 11" /></>}
        {die === 12 && <><polygon className="die-svg-face" points="16,1 23.5,3 29,8.5 31,16 29,23.5 23.5,29 16,31 8.5,29 3,23.5 1,16 3,8.5 8.5,3" /><path className="die-svg-facet" d="m16 6 8.7 6.3-3.3 10.2H10.6L7.3 12.3 16 6ZM3 8.5l4.3 3.8M29 8.5l-4.3 3.8M23.5 29l-2.1-6.5M8.5 29l2.1-6.5" /></>}
        <text className="die-svg-value" x="16" y={die === 4 ? "23.5" : "19.4"} textAnchor="middle">{die}</text>
      </svg>
    </span>
  );
}

function SheetOrnaments() {
  return (
    <div className="renaissance-frame" aria-hidden="true">
      <span className="frame-fleuron corner top-left">❧</span>
      <span className="frame-fleuron corner top-right">❦</span>
      <span className="frame-fleuron corner bottom-left">❦</span>
      <span className="frame-fleuron corner bottom-right">❧</span>
      <span className="frame-fleuron midpoint top">❦</span>
      <span className="frame-fleuron midpoint bottom">❦</span>
    </div>
  );
}

function traitGuideDetail(guide: TraitGuide, severity?: TraitEntry["severity"]) {
  if (severity === "major" && guide.majorDetail) return guide.majorDetail;
  if (severity === "minor" && guide.minorDetail) return guide.minorDetail;
  return guide.detail;
}

function TraitGuideInput({
  kind,
  entry,
  rank,
  onChange,
  excludeNames = [],
  disableFutureRank = false,
  requirementIssues,
}: {
  kind: "edge" | "hindrance";
  entry: TraitEntry;
  rank: string;
  onChange: (patch: Partial<TraitEntry>) => void;
  excludeNames?: string[];
  disableFutureRank?: boolean;
  requirementIssues?: (guide: TraitGuide) => string[];
}) {
  const [open, setOpen] = useState(false);
  const excluded = new Set(excludeNames.map((name) => name.trim().toLocaleLowerCase("ru")));
  const guides = (kind === "edge" ? EDGE_GUIDES : HINDRANCE_GUIDES).filter(
    (guide) => !excluded.has(guide.name.toLocaleLowerCase("ru")),
  );
  const normalized = entry.name.trim().toLocaleLowerCase("ru");
  const exact = guides.find((guide) => guide.name.toLocaleLowerCase("ru") === normalized);
  const exactSeverity = exact?.severity === "either" ? entry.severity || "minor" : exact?.severity;
  const exactDetail = exact ? traitGuideDetail(exact, exactSeverity) : "";
  const suggestions = (normalized
    ? guides.filter((guide) => guide.name.toLocaleLowerCase("ru").includes(normalized))
    : guides
  ).sort((left, right) => {
    if (kind === "hindrance") return left.name.localeCompare(right.name, "ru");
    const availability = Number(rankAllows(rank, right)) - Number(rankAllows(rank, left));
    if (availability) return availability;
    const rankDifference = RANKS.indexOf(requiredRank(left)) - RANKS.indexOf(requiredRank(right));
    return rankDifference || left.name.localeCompare(right.name, "ru");
  });
  const exactRankAllowed = kind === "hindrance" || !exact || rankAllows(rank, exact);

  const choose = (guide: TraitGuide) => {
    const severity = kind === "hindrance"
      ? guide.severity === "either" ? entry.severity || "minor" : guide.severity
      : undefined;
    onChange({
      name: guide.name,
      note: traitGuideDetail(guide, severity),
      ...(kind === "hindrance" && guide.severity !== "either"
        ? { severity: guide.severity }
        : {}),
    });
    setOpen(false);
  };

  return (
    <div className="guide-field">
      <input
        aria-label={kind === "edge" ? "Черта" : "Изъян"}
        value={entry.name}
        placeholder={kind === "edge" ? "Начните вводить черту" : "Начните вводить изъян"}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          onChange({ name: event.target.value });
          setOpen(true);
        }}
      />
      {open && suggestions.length > 0 && (
        <div className="guide-menu" role="listbox" aria-label="Подсказки справочника">
          <div className="guide-menu-summary">
            <span>{normalized ? `Найдено: ${suggestions.length}` : `В справочнике: ${suggestions.length}`}</span>
            {kind === "edge" && <b>Ранг героя: {rank}</b>}
          </div>
          {suggestions.map((guide) => {
            const unavailable = kind === "edge" && !rankAllows(rank, guide);
            const campaignUnavailable = kind === "edge" && Boolean(campaignEdgeIssue(guide));
            const issues = requirementIssues?.(guide) || [];
            const blocked = campaignUnavailable || (disableFutureRank && (unavailable || issues.length > 0));
            return (
            <button className={unavailable || campaignUnavailable || issues.length ? "future-rank" : ""} disabled={blocked} key={guide.name} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(guide)}>
              <span>
                <strong>{guide.name}</strong>
                <em>{guide.source}</em>
                {unavailable && <i>с ранга «{requiredRank(guide)}»</i>}
                {campaignUnavailable && <i>недоступна в кампании</i>}
              </span>
              <small>{guide.requirements || (guide.severity === "major" ? "Крупный" : guide.severity === "minor" ? "Мелкий" : "Мелкий или крупный")}</small>
              <p>{guide.detail}</p>
              {issues.length > 0 && <small className="guide-issues">Не выполнено: {issues.join("; ")}</small>}
            </button>
          );})}
        </div>
      )}
      {exact && (
        <div className={`guide-hint ${!exactRankAllowed ? "rank-mismatch" : ""}`}>
          <span><b>{exact.source}{kind === "hindrance" && <> · {exactSeverity === "major" ? "Крупный" : "Мелкий"}</>}</b>{exact.requirements && <>Требования: {exact.requirements}</>}</span>
          <p>{exactDetail}</p>
          {!exactRankAllowed && <small className="rank-warning">Текущий ранг «{rank}» недостаточен. Черта доступна с ранга «{requiredRank(exact)}».</small>}
          {exact.caution && <small>{exact.caution}</small>}
        </div>
      )}
    </div>
  );
}

function WeaponGuideInput({ weapon, onChange }: { weapon: Weapon; onChange: (patch: Partial<Weapon>) => void }) {
  const [open, setOpen] = useState(false);
  const normalized = weapon.name.trim().toLocaleLowerCase("ru");
  const suggestions = (normalized
    ? WEAPON_GUIDES.filter((guide) => guide.name.toLocaleLowerCase("ru").includes(normalized))
    : WEAPON_GUIDES
  ).sort((left, right) => left.category.localeCompare(right.category, "ru") || left.name.localeCompare(right.name, "ru"));

  const choose = (guide: WeaponGuide) => {
    const purchase = WEAPON_PURCHASE_DATA[guide.name];
    onChange({ name: guide.name, range: guide.range, damage: guide.damage, ap: guide.ap, ammo: guide.ammo, price: purchase?.price || 0, weight: purchase?.weight || 0, purchased: false });
    setOpen(false);
  };

  return (
    <div className="guide-field weapon-guide-field">
      <input
        aria-label="Название оружия"
        value={weapon.name}
        placeholder="Начните вводить"
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          onChange({ name: event.target.value });
          setOpen(true);
        }}
      />
      {open && suggestions.length > 0 && (
        <div className="guide-menu weapon-guide-menu" role="listbox" aria-label="Варианты оружия Ultima Forsan">
          <div className="guide-menu-summary"><span>{normalized ? `Найдено: ${suggestions.length}` : `В справочнике: ${suggestions.length}`}</span><b>Ultima Forsan</b></div>
          {suggestions.map((guide) => (
            <button key={guide.name} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(guide)}>
              <span><strong>{guide.name}</strong><em>{guide.category}</em></span>
              <small>{guide.range} · {guide.damage}{guide.ap !== "-" ? ` · ББ ${guide.ap}` : ""}</small>
              <p>{guide.detail}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PowerGuideInput({
  tradition,
  rank,
  excludeGuideIds,
  disabled,
  onChoose,
}: {
  tradition: ArcaneTradition;
  rank: Rank;
  excludeGuideIds: string[];
  disabled?: boolean;
  onChoose: (guide: PowerGuide) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("ru");
  const excluded = new Set(excludeGuideIds);
  const suggestions = POWER_GUIDES
    .filter((guide) => guide.manifestations[tradition] && !excluded.has(guide.id))
    .filter((guide) => !normalized || `${guide.name} ${guide.legacyName || ""}`.toLocaleLowerCase("ru").includes(normalized))
    .sort((left, right) => RANKS.indexOf(left.rank) - RANKS.indexOf(right.rank) || left.name.localeCompare(right.name, "ru"));

  return (
    <div className="guide-field power-guide-field">
      <input
        aria-label={`Добавить силу: ${ARCANE_TRADITIONS[tradition].label}`}
        value={query}
        disabled={disabled}
        placeholder={disabled ? "Все доступные места заполнены" : "Найдите силу по названию"}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
      />
      {open && suggestions.length > 0 && (
        <div className="guide-menu power-guide-menu" role="listbox" aria-label="Силы Ultima Forsan, адаптированные к SWADE">
          <div className="guide-menu-summary"><span>{normalized ? `Найдено: ${suggestions.length}` : `Для традиции: ${suggestions.length}`}</span><b>Ранг: {rank}</b></div>
          {suggestions.map((guide) => {
            const unavailable = !rankAllowsPower(rank, guide);
            return (
              <button className={unavailable ? "future-rank" : ""} disabled={unavailable} key={guide.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChoose(guide); setQuery(""); setOpen(false); }}>
                <span><strong>{guide.name}</strong><em>{guide.rank}</em>{guide.legacyName && <i>ранее: {guide.legacyName}</i>}</span>
                <small>{guide.cost === null ? "особая стоимость" : `${guide.cost} ПС → штраф −${Math.floor(guide.cost / 2)}`} · {guide.range} · {guide.duration}</small>
                <p>{guide.detail}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [character, setCharacter] = useState<Character>(() => createInitialCharacter());
  const [skills, setSkills] = useState<Skill[]>(() => createInitialSkills());
  const [advanceHistory, setAdvanceHistory] = useState<AdvanceRecord[]>([]);
  const [library, setLibrary] = useState<HeroLibrary | null>(null);
  const [activeHeroId, setActiveHeroId] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [mobileView, setMobileView] = useState<"form" | "preview">("form");
  const [editingLockedHero, setEditingLockedHero] = useState(false);
  const [printRequested, setPrintRequested] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceType, setAdvanceType] = useState<AdvanceType>("edge");
  const [advancePrimary, setAdvancePrimary] = useState("");
  const [advanceSecondary, setAdvanceSecondary] = useState("");
  const [advanceError, setAdvanceError] = useState("");
  const [portraitError, setPortraitError] = useState("");
  const [powerCosts, setPowerCosts] = useState<Record<string, number>>({});
  const [powerRolls, setPowerRolls] = useState<Record<string, PowerRollResult>>({});
  const hydrated = useRef(false);
  const portraitInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const storedLibrary = localStorage.getItem(LIBRARY_STORAGE_KEY);
      let restoredLibrary: HeroLibrary | null = null;

      if (storedLibrary) {
        const parsed = JSON.parse(storedLibrary) as Partial<HeroLibrary>;
        if (Array.isArray(parsed.heroes) && parsed.heroes.length > 0) {
          const heroes = parsed.heroes.map((hero) => ({
            ...hero,
            id: hero.id || `hero-${makeId()}`,
            character: restoreCharacter(hero.character),
            skills: restoreSkills(hero.skills),
            advanceHistory: restoreAdvanceHistory(hero.advanceHistory),
            createdAt: hero.createdAt || new Date().toISOString(),
            updatedAt: hero.updatedAt || new Date().toISOString(),
          }));
          const activeHeroId = heroes.some((hero) => hero.id === parsed.activeHeroId)
            ? String(parsed.activeHeroId)
            : heroes[0].id;
          restoredLibrary = { version: 2, activeHeroId, heroes };
        }
      }

      if (!restoredLibrary) {
        const legacyDraft = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyDraft) {
          const parsed = JSON.parse(legacyDraft) as { character?: Character; skills?: Skill[] };
          const migrated = makeHeroRecord(
            restoreCharacter(parsed.character),
            restoreSkills(parsed.skills),
          );
          restoredLibrary = { version: 2, activeHeroId: migrated.id, heroes: [migrated] };
        }
      }

      if (!restoredLibrary) {
        const firstHero = makeHeroRecord();
        restoredLibrary = { version: 2, activeHeroId: firstHero.id, heroes: [firstHero] };
      }

      const active = restoredLibrary.heroes.find(
        (hero) => hero.id === restoredLibrary?.activeHeroId,
      ) || restoredLibrary.heroes[0];
      // Hydration intentionally restores persisted state after the client mounts.
      /* eslint-disable react-hooks/set-state-in-effect */
      setLibrary(restoredLibrary);
      setActiveHeroId(active.id);
      setCharacter(copyData(active.character));
      setSkills(copyData(active.skills));
      setAdvanceHistory(copyData(active.advanceHistory));
      /* eslint-enable react-hooks/set-state-in-effect */
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(restoredLibrary));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      const firstHero = makeHeroRecord();
      const fallback: HeroLibrary = { version: 2, activeHeroId: firstHero.id, heroes: [firstHero] };
      setLibrary(fallback);
      setActiveHeroId(firstHero.id);
    } finally {
      hydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current || !activeHeroId) return;
    const timestamp = new Date().toISOString();
    setLibrary((current) => {
      if (!current) return current;
      const next: HeroLibrary = {
        ...current,
        activeHeroId,
        heroes: current.heroes.map((hero) =>
          hero.id === activeHeroId
            ? {
                ...hero,
                character: copyData(character),
                skills: copyData(skills),
                advanceHistory: copyData(advanceHistory),
                updatedAt: timestamp,
              }
            : hero,
        ),
      };
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setSavedAt(timestamp);
  }, [character, skills, advanceHistory, activeHeroId]);

  useEffect(() => {
    if (!printRequested) return;
    const oldTitle = document.title;
    const filename = (character.name || "Новый персонаж").replace(/[\\/:*?"<>|]/g, " ");
    document.title = `${filename} - Ultima Forsan`;
    const timer = window.setTimeout(() => {
      window.print();
      document.title = oldTitle;
      setPrintRequested(false);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [printRequested, character.name]);

  useEffect(() => {
    if (!advanceOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAdvanceOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [advanceOpen]);

  const update = <K extends keyof Character>(key: K, value: Character[K]) => {
    setCharacter((current) => ({ ...current, [key]: value }));
  };

  const uploadPortrait = async (file?: File) => {
    if (!file) return;
    setPortraitError("");
    try {
      update("portrait", await preparePortrait(file));
    } catch (error) {
      setPortraitError(error instanceof Error ? error.message : "Не удалось загрузить портрет.");
    } finally {
      if (portraitInput.current) portraitInput.current.value = "";
    }
  };

  const purchaseEquipment = (guideId: string) => {
    const guide = EQUIPMENT_GUIDES.find((item) => item.id === guideId);
    if (!guide) return;
    const florins = safeNumber(character.florins);
    if (florins < guide.price) return window.alert(`Не хватает ${guide.price - florins} флоринов.`);
    setCharacter((current) => {
      const existing = current.inventory.find((item) => item.id === guide.id);
      return {
        ...current,
        florins: String(Math.max(0, safeNumber(current.florins) - guide.price)),
        inventory: existing
          ? current.inventory.map((item) => item.id === guide.id ? { ...item, quantity: item.quantity + 1 } : item)
          : [...current.inventory, { ...guide, quantity: 1, equipped: guide.category === "Доспех" || guide.category === "Щит" }],
      };
    });
  };

  const sellEquipment = (id: string) => {
    setCharacter((current) => {
      const item = current.inventory.find((entry) => entry.id === id);
      if (!item) return current;
      return {
        ...current,
        florins: String(safeNumber(current.florins) + item.price),
        inventory: item.quantity > 1
          ? current.inventory.map((entry) => entry.id === id ? { ...entry, quantity: entry.quantity - 1 } : entry)
          : current.inventory.filter((entry) => entry.id !== id),
      };
    });
  };

  const setEquipmentQuantity = (guideId: string, requestedQuantity: number) => {
    const guide = EQUIPMENT_GUIDES.find((item) => item.id === guideId);
    if (!guide) return;
    setCharacter((current) => {
      const existing = current.inventory.find((item) => item.id === guide.id);
      const currentQuantity = existing?.quantity || 0;
      const florins = safeNumber(current.florins);
      const affordableMaximum = currentQuantity + Math.floor(florins / guide.price);
      const quantity = Math.min(Math.max(0, Math.floor(requestedQuantity)), affordableMaximum);
      const difference = quantity - currentQuantity;
      if (quantity === currentQuantity) return current;
      return {
        ...current,
        florins: String(florins - difference * guide.price),
        inventory: quantity === 0
          ? current.inventory.filter((item) => item.id !== guide.id)
          : existing
            ? current.inventory.map((item) => item.id === guide.id ? { ...item, quantity } : item)
            : [...current.inventory, { ...guide, quantity, equipped: guide.category === "Доспех" || guide.category === "Щит" }],
      };
    });
  };

  const setEquipmentWorn = (id: string, equipped: boolean) => {
    setCharacter((current) => ({
      ...current,
      inventory: current.inventory.map((item) => item.id === id ? { ...item, equipped } : item),
    }));
  };

  const purchaseWeapon = (id: string) => {
    setCharacter((current) => {
      const weapon = current.weapons.find((item) => item.id === id);
      const price = weapon?.price || 0;
      if (!weapon || !price || weapon.purchased || safeNumber(current.florins) < price) return current;
      return { ...current, florins: String(safeNumber(current.florins) - price), weapons: current.weapons.map((item) => item.id === id ? { ...item, purchased: true } : item) };
    });
  };

  const returnWeapon = (id: string) => {
    setCharacter((current) => {
      const weapon = current.weapons.find((item) => item.id === id);
      if (!weapon?.purchased) return current;
      return { ...current, florins: String(safeNumber(current.florins) + (weapon.price || 0)), weapons: current.weapons.map((item) => item.id === id ? { ...item, purchased: false } : item) };
    });
  };

  const lockCreation = () => {
    if (!creationReady) return window.alert("Сначала исправьте превышение пунктов характеристик, навыков или черт.");
    if (!window.confirm("Завершить создание? Характеристики, навыки, черты и изъяны дальше будут изменяться через повышения.")) return;
    update("creationLocked", true);
    setEditingLockedHero(false);
  };

  const attributePoints = useMemo(
    () =>
      ATTRIBUTE_META.reduce((total, { key }) => {
        const raises = Math.max(0, DIE_OPTIONS.indexOf(character.attributes[key]) - 1);
        return total + raises * (character.purity === "Нечистый" && key === "vigor" ? 2 : 1);
      }, 0),
    [character.attributes, character.purity],
  );
  const creationAttributePoints = Math.max(0, attributePoints - character.attributeAdvancePoints);

  const skillPoints = useMemo(
    () =>
      skills.reduce(
        (total, skill) => total + skillCost(skill, character.attributes),
        0,
      ),
    [skills, character.attributes],
  );
  const creationSkillPoints = Math.max(0, skillPoints - character.skillAdvancePoints);

  const skillBudget = 12;
  const hindrancePoints = character.hindrances.reduce(
    (total, item) => total + (item.name ? (item.severity === "major" ? 2 : 1) : 0),
    0,
  );
  const creditedHindrancePoints = Math.min(4, hindrancePoints + character.retiredHindrancePoints);
  const hindranceEdgeSlots = Math.floor(creditedHindrancePoints / 2);
  const advances = Math.max(0, safeNumber(character.advances));
  const currentRank = rankFromAdvances(advances);
  const nextRankThreshold = nextRankAt(currentRank);
  const ownedEdgeNames = character.edges.map((edge) => edge.name.trim().toLocaleLowerCase("ru"));
  const arcaneTraditions = ARCANE_TRADITION_ORDER.filter((tradition) =>
    ownedEdgeNames.includes(ARCANE_TRADITIONS[tradition].edgeName.toLocaleLowerCase("ru")),
  );
  const displayedArcaneTraditions = ARCANE_TRADITION_ORDER.filter((tradition) =>
    arcaneTraditions.includes(tradition) || character.powers.some((power) => power.tradition === tradition),
  );
  const bonusPowerSlots = character.edges.filter((edge) => edge.name.trim() === "Новые силы").length * 2;
  const powerLimit = arcaneTraditions.reduce((total, tradition) => total + ARCANE_TRADITIONS[tradition].initialPowers, 0) + bonusPowerSlots;
  const activeWitchcraftPowers = character.powers.filter((power) => power.tradition === "witchcraft" && power.active).length;
  const edgeAdvances = Math.min(advances, Math.max(0, safeNumber(character.edgeAdvances)));
  const baseEdgeSlots = 1;
  const edgeLimit = baseEdgeSlots + hindranceEdgeSlots + edgeAdvances;
  const chosenEdgeCount = character.edges.filter((item) => item.name.trim()).length;
  const addableEdgeRows = Math.max(0, edgeLimit - character.edges.length);
  const fighting = skills.find((skill) => skill.id === "fighting")?.level ?? 0;
  const equippedArmor = character.inventory.filter((item) => item.equipped && item.category === "Доспех");
  const equippedShield = character.inventory
    .filter((item) => item.equipped && item.category === "Щит")
    .sort((a, b) => (b.parry || 0) - (a.parry || 0) || (b.rangedArmor || 0) - (a.rangedArmor || 0))[0];
  const armorAt = (area: ArmorArea) => Math.max(
    0,
    ...equippedArmor.filter((item) => item.areas?.includes(area)).map((item) => item.armor || 0),
  );
  const headArmor = armorAt("head");
  const torsoArmor = armorAt("torso");
  const armsArmor = armorAt("arms");
  const legsArmor = armorAt("legs");
  const headCoverage = headArmor
    ? Math.max(0, ...equippedArmor.filter((item) => item.areas?.includes("head") && (item.armor || 0) === headArmor).map((item) => item.headCoverage || 100))
    : 0;
  const manualTorsoArmor = Math.max(0, safeNumber(character.armor));
  const effectiveArmor = Math.max(torsoArmor, manualTorsoArmor);
  const parry = (fighting === 0 ? 2 : 2 + halfDie(fighting)) + (equippedShield?.parry || 0);
  const toughness =
    2 + halfDie(character.attributes.vigor) + effectiveArmor + safeNumber(character.size);
  const inventoryWeight = character.inventory.reduce((total, item) => total + item.weight * item.quantity, 0) + character.weapons.reduce((total, weapon) => total + (weapon.purchased ? weapon.weight || 0 : 0), 0);
  const loadLimit = Math.max(10, (character.attributes.strength / 2 - 1) * 10);
  const encumbered = inventoryWeight > loadLimit;
  const languageAllowance = 1 + Math.floor(character.attributes.smarts / 2);
  const languageCount = character.languages
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean).length;
  const printSkills = skills.filter((skill) => skill.level > 0).slice(0, 24);
  const playSkills = skills.filter((skill) => skill.level > 0);
  const playWeapons = character.weapons.filter((weapon) => weapon.name.trim());
  const availableEdgeCount = EDGE_GUIDES.filter((guide) => rankAllows(currentRank, guide) && edgeAvailableInCampaign(guide)).length;
  const creationReady = creationAttributePoints <= 5 && creationSkillPoints <= skillBudget && chosenEdgeCount <= edgeLimit;

  const completion = [
    character.name,
    character.archetype,
    character.origin,
    character.languages,
    character.goal,
    character.fear,
    creationAttributePoints <= 5 ? "ok" : "",
    creationSkillPoints <= skillBudget ? "ok" : "",
  ].filter(Boolean).length;

  const updateSkill = (id: string, patch: Partial<Skill>) => {
    setSkills((current) =>
      current.map((skill) => (skill.id === id ? { ...skill, ...patch } : skill)),
    );
  };

  const addPower = (tradition: ArcaneTradition, guide: PowerGuide) => {
    if (!arcaneTraditions.includes(tradition) || character.powers.length >= powerLimit) return;
    if (character.powers.some((power) => power.tradition === tradition && power.guideId === guide.id)) return;
    update("powers", [...character.powers, {
      id: `power-${makeId()}`,
      guideId: guide.id,
      tradition,
      name: guide.name,
      trapping: guide.manifestations[tradition] || "",
      recipeCost: guide.cost || 0,
      prepared: 0,
      active: false,
      broken: false,
    }]);
  };

  const updatePower = (id: string, patch: Partial<KnownPower>) => {
    setCharacter((current) => ({ ...current, powers: current.powers.map((power) => power.id === id ? { ...power, ...patch } : power) }));
  };

  const removePower = (id: string) => {
    setCharacter((current) => {
      const power = current.powers.find((item) => item.id === id);
      const refund = power?.tradition === "alchemy" ? power.prepared * Math.max(0, Math.floor(power.recipeCost)) : 0;
      return { ...current, florins: String(safeNumber(current.florins) + refund), powers: current.powers.filter((item) => item.id !== id) };
    });
    setPowerCosts((current) => { const next = { ...current }; delete next[id]; return next; });
    setPowerRolls((current) => { const next = { ...current }; delete next[id]; return next; });
  };

  const setPreparedPowerQuantity = (id: string, requestedQuantity: number) => {
    setCharacter((current) => {
      const power = current.powers.find((item) => item.id === id && item.tradition === "alchemy");
      const guide = power ? POWER_GUIDES.find((item) => item.id === power.guideId) : undefined;
      if (!power || !guide) return current;
      const recipeCost = Math.max(guide.cost || 0, Math.floor(power.recipeCost));
      const florins = Math.max(0, safeNumber(current.florins));
      const affordableMaximum = power.prepared + Math.floor(florins / Math.max(1, recipeCost));
      const quantity = Math.min(Math.max(0, Math.floor(requestedQuantity)), affordableMaximum);
      const difference = quantity - power.prepared;
      if (!difference) return current;
      return {
        ...current,
        florins: String(florins - difference * recipeCost),
        powers: current.powers.map((item) => item.id === id ? { ...item, prepared: quantity } : item),
      };
    });
  };

  const activatePower = (power: KnownPower) => {
    const guide = POWER_GUIDES.find((item) => item.id === power.guideId);
    const tradition = ARCANE_TRADITIONS[power.tradition];
    const skill = skills.find((item) => item.id === tradition.skillId);
    if (!guide || power.broken || (power.tradition === "alchemy" && power.prepared <= 0)) return;

    const selectedCost = power.tradition === "alchemy"
      ? Math.max(guide.cost || 0, Math.floor(power.recipeCost))
      : Math.max(guide.cost || 0, Math.floor(powerCosts[power.id] ?? guide.cost ?? 0));
    const maintainedPenalty = power.tradition === "witchcraft"
      ? Math.max(0, activeWitchcraftPowers - (power.active ? 1 : 0))
      : 0;
    const modifier = power.tradition === "alchemy" ? 0 : -Math.floor(selectedCost / 2) - maintainedPenalty;
    const listedDie = skill?.level || 0;
    const strainedIndex = Math.max(1, DIE_OPTIONS.indexOf(listedDie) - (power.tradition === "witchcraft" && character.witchcraftBacklash ? 1 : 0));
    const rolledDie = listedDie === 0 ? 4 : DIE_OPTIONS[strainedIndex];
    const untrainedPenalty = listedDie === 0 ? -2 : 0;
    const traitRoll = rollExplodingDie(rolledDie);
    const wildRoll = rollExplodingDie(6);
    const backlash = traitRoll.rolls[0] === 1;
    const total = Math.max(traitRoll.total, wildRoll.total) + modifier + untrainedPenalty;
    const success = total >= 4 && !backlash;
    const raises = success ? Math.max(0, Math.floor((total - 4) / 4)) : 0;
    let outcome = success ? (raises ? `Подъём ×${raises}` : "Успех") : "Провал";
    if (backlash && power.tradition === "alchemy") outcome = "Субстанция не сработала";
    if (backlash && power.tradition === "witchcraft") outcome = "Отдача: шок и Ведьмовство −1 ступень";
    if (backlash && power.tradition === "weird-science") outcome = "Отдача: устройство сломано, 2d6 урона";

    setPowerRolls((current) => ({
      ...current,
      [power.id]: {
        trait: formatDieRoll(traitRoll.rolls),
        wild: formatDieRoll(wildRoll.rolls),
        total,
        modifier: modifier + untrainedPenalty,
        outcome,
        backlash,
      },
    }));
    setCharacter((current) => ({
      ...current,
      shaken: power.tradition !== "alchemy" && !success ? true : current.shaken,
      witchcraftBacklash: power.tradition === "witchcraft" ? (success ? false : backlash || current.witchcraftBacklash) : current.witchcraftBacklash,
      powers: current.powers.map((entry) => {
        if (entry.id === power.id) return {
          ...entry,
          prepared: power.tradition === "alchemy" ? Math.max(0, entry.prepared - 1) : entry.prepared,
          broken: power.tradition === "weird-science" && backlash ? true : entry.broken,
          active: success && guide.duration !== "Мгновенно" && guide.duration !== "Особая" ? true : entry.active,
        };
        if (power.tradition !== "alchemy" && !success) return { ...entry, active: false };
        return entry;
      }),
    }));
  };

  const openAdvance = () => {
    setAdvanceType("edge");
    setAdvancePrimary("");
    setAdvanceSecondary("");
    setAdvanceError("");
    setAdvanceOpen(true);
  };

  const applyAdvance = () => {
    const newAdvanceCount = Math.floor(advances) + 1;
    const newRank = rankFromAdvances(newAdvanceCount);
    const before = captureAdvanceState(character, skills);
    setAdvanceError("");

    const recordAdvance = (summary: string) => {
      setAdvanceHistory((current) => [...current, {
        id: `advance-${makeId()}`,
        number: newAdvanceCount,
        rank: newRank,
        type: advanceType,
        summary,
        createdAt: new Date().toISOString(),
        before,
      }]);
    };

    if (advanceType === "edge") {
      const guide = EDGE_GUIDES.find((item) => item.name === advancePrimary);
      if (!guide) return setAdvanceError("Выберите черту.");
      const issues = edgeRequirementIssues(guide, newRank, character, skills);
      if (issues.length) return setAdvanceError(`Не выполнены требования: ${issues.join("; ")}.`);
      if (guide.name !== "Новые силы" && character.edges.some((item) => item.name === guide.name)) return setAdvanceError("Эта черта уже записана у героя.");
      setCharacter((current) => ({
        ...current,
        advances: String(newAdvanceCount),
        edgeAdvances: String(Math.max(0, safeNumber(current.edgeAdvances)) + 1),
        edges: [...current.edges.filter((item) => item.name.trim() || item.note.trim()), { id: makeId(), name: guide.name, note: guide.detail }],
      }));
      recordAdvance(`Новая черта: ${guide.name}`);
    } else if (advanceType === "skills") {
      const first = skills.find((skill) => skill.id === advancePrimary);
      const second = skills.find((skill) => skill.id === advanceSecondary);
      if (!first) return setAdvanceError("Выберите навык.");
      const firstDie = nextDie(first.level);
      if (!firstDie) return setAdvanceError("Выбранный навык уже достиг d12.");
      const firstBelowAttribute = first.level < character.attributes[first.attribute];
      if (advanceSecondary) {
        if (!second || second.id === first.id) return setAdvanceError("Выберите два разных навыка.");
        const secondDie = nextDie(second.level);
        if (!secondDie) return setAdvanceError("Один из выбранных навыков уже достиг d12.");
        const secondBelowAttribute = second.level < character.attributes[second.attribute];
        if (!firstBelowAttribute || !secondBelowAttribute) return setAdvanceError("Два навыка можно повысить вместе, только если оба ниже связанных характеристик.");
        const firstAdvanceCost = skillCost({ ...first, level: firstDie }, character.attributes) - skillCost(first, character.attributes);
        const secondAdvanceCost = skillCost({ ...second, level: secondDie }, character.attributes) - skillCost(second, character.attributes);
        setSkills((current) => current.map((skill) => skill.id === first.id ? { ...skill, level: firstDie } : skill.id === second.id ? { ...skill, level: secondDie } : skill));
        setCharacter((current) => ({ ...current, advances: String(newAdvanceCount), skillAdvancePoints: current.skillAdvancePoints + firstAdvanceCost + secondAdvanceCost }));
        recordAdvance(`${first.name}: ${dieLabel(first.level)} → ${dieLabel(firstDie)}; ${second.name}: ${dieLabel(second.level)} → ${dieLabel(secondDie)}`);
      } else {
        if (firstBelowAttribute) return setAdvanceError("Этот навык ниже характеристики: выберите второй навык или повысьте его до уровня характеристики через несколько повышений.");
        const firstAdvanceCost = skillCost({ ...first, level: firstDie }, character.attributes) - skillCost(first, character.attributes);
        setSkills((current) => current.map((skill) => skill.id === first.id ? { ...skill, level: firstDie } : skill));
        setCharacter((current) => ({ ...current, advances: String(newAdvanceCount), skillAdvancePoints: current.skillAdvancePoints + firstAdvanceCost }));
        recordAdvance(`${first.name}: ${dieLabel(first.level)} → ${dieLabel(firstDie)}`);
      }
    } else if (advanceType === "attribute") {
      const key = advancePrimary as AttributeKey;
      if (!ATTRIBUTE_META.some((item) => item.key === key)) return setAdvanceError("Выберите характеристику.");
      const raised = nextDie(character.attributes[key]);
      if (!raised) return setAdvanceError("Эта характеристика уже достигла d12.");
      const attributeAdvanceCost = character.purity === "Нечистый" && key === "vigor" ? 2 : 1;
      if (newRank !== "Легенда" && character.attributeRaiseRanks.includes(newRank)) return setAdvanceError(`На ранге «${newRank}» характеристика уже повышалась.`);
      if (newRank === "Легенда" && character.attributeRaiseRanks.filter((rank) => rank === "Легенда").length >= Math.ceil(Math.max(0, newAdvanceCount - 15) / 2)) return setAdvanceError("На ранге Легенды характеристику можно повышать каждым вторым повышением.");
      setCharacter((current) => ({
        ...current,
        advances: String(newAdvanceCount),
        attributes: { ...current.attributes, [key]: raised },
        attributeAdvancePoints: current.attributeAdvancePoints + attributeAdvanceCost,
        attributeRaiseRanks: [...current.attributeRaiseRanks, newRank],
      }));
      recordAdvance(`${ATTRIBUTE_META.find((item) => item.key === key)?.label}: ${dieLabel(character.attributes[key])} → ${dieLabel(raised)}`);
    } else {
      const hindrance = character.hindrances.find((item) => item.id === advancePrimary);
      if (!hindrance || !hindrance.name) return setAdvanceError("Выберите изъян.");
      if (hindrance.severity === "major") {
        setCharacter((current) => ({
          ...current,
          advances: String(newAdvanceCount),
          retiredHindrancePoints: current.retiredHindrancePoints + 1,
          hindrances: current.hindrances.map((item) => item.id === hindrance.id ? { ...item, severity: "minor" } : item),
        }));
        recordAdvance(`Изъян «${hindrance.name}» уменьшен до мелкого`);
      } else {
        setCharacter((current) => ({
          ...current,
          advances: String(newAdvanceCount),
          retiredHindrancePoints: current.retiredHindrancePoints + 1,
          hindrances: current.hindrances.filter((item) => item.id !== hindrance.id),
        }));
        recordAdvance(`Изъян «${hindrance.name}» устранён`);
      }
    }

    setAdvanceOpen(false);
  };

  const undoLastAdvance = () => {
    const last = advanceHistory.at(-1);
    if (!last) return;
    if (!window.confirm(`Отменить повышение №${last.number}: ${last.summary}?`)) return;
    const { skills: previousSkills, ...previousCharacter } = copyData(last.before);
    setCharacter((current) => ({ ...current, ...previousCharacter }));
    setSkills(previousSkills);
    setAdvanceHistory((current) => current.slice(0, -1));
  };

  const updateEntry = <T extends TraitEntry | Weapon>(
    key: "edges" | "hindrances" | "weapons",
    id: string,
    patch: Partial<T>,
  ) => {
    setCharacter((current) => ({
      ...current,
      [key]: (current[key] as T[]).map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    }));
  };

  const removeEntry = (key: "edges" | "hindrances" | "weapons", id: string) => {
    setCharacter((current) => ({
      ...current,
      [key]: current[key].filter((entry) => entry.id !== id),
    }));
  };

  const fillDemo = () => {
    const base = createInitialCharacter();
    setAdvanceHistory([]);
    setCharacter({
      ...base,
      ...DEMO_CHARACTER,
      edges: [
        { id: makeId(), name: "Чумный доктор", note: "+2 к Знанию (Чума)" },
        { id: makeId(), name: "Бдительность", note: "+2 к Вниманию" },
        { id: makeId(), name: "Бесплатная черта человека", note: "" },
      ],
      hindrances: [
        { id: makeId(), name: "Клятва", note: "Не отказать заражённому", severity: "major" },
        { id: makeId(), name: "Любопытство", note: "", severity: "major" },
      ],
      weapons: [
        { id: makeId(), name: "Мизерикорд", range: "Ближняя", damage: "Сил+d4", ap: "1", ammo: "-" },
        { id: makeId(), name: "Арбалет", range: "15/30/60", damage: "2d6", ap: "2", ammo: "8" },
      ],
      gear: "Маска чумного доктора, медицинская сумка, уксус, бинты, фонарь, дорожный плащ.",
    });
    setSkills(
      createInitialSkills().map((skill) => ({
        ...skill,
        level:
          ({ notice: 8, plague: 8, healing: 8, research: 6, persuasion: 6, fighting: 4 } as Record<string, Die>)[skill.id] ??
          skill.level,
      })),
    );
  };

  const switchHero = (heroId: string) => {
    const hero = library?.heroes.find((item) => item.id === heroId);
    if (!hero) return;
    setActiveHeroId(hero.id);
    setCharacter(copyData(hero.character));
    setSkills(copyData(hero.skills));
    setAdvanceHistory(copyData(hero.advanceHistory));
    setEditingLockedHero(false);
  };

  const createHero = () => {
    const hero = makeHeroRecord();
    setLibrary((current) => {
      const next: HeroLibrary = {
        version: 2,
        activeHeroId: hero.id,
        heroes: [...(current?.heroes || []), hero],
      };
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setActiveHeroId(hero.id);
    setCharacter(copyData(hero.character));
    setSkills(copyData(hero.skills));
    setAdvanceHistory([]);
    setEditingLockedHero(false);
  };

  const duplicateHero = () => {
    const duplicatedCharacter = copyData(character);
    duplicatedCharacter.name = `${character.name || "Новый персонаж"} - копия`;
    duplicatedCharacter.creationLocked = false;
    const hero = makeHeroRecord(duplicatedCharacter, skills, advanceHistory);
    setLibrary((current) => {
      const next: HeroLibrary = {
        version: 2,
        activeHeroId: hero.id,
        heroes: [...(current?.heroes || []), hero],
      };
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setActiveHeroId(hero.id);
    setCharacter(copyData(hero.character));
    setSkills(copyData(hero.skills));
    setAdvanceHistory(copyData(hero.advanceHistory));
    setEditingLockedHero(false);
  };

  const deleteHero = () => {
    if (!library || library.heroes.length <= 1) return;
    if (!window.confirm(`Удалить героя «${character.name || "Без имени"}» из этого браузера?`)) return;
    const remaining = library.heroes.filter((hero) => hero.id !== activeHeroId);
    const nextActive = remaining[0];
    const next: HeroLibrary = { version: 2, activeHeroId: nextActive.id, heroes: remaining };
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(next));
    setLibrary(next);
    setActiveHeroId(nextActive.id);
    setCharacter(copyData(nextActive.character));
    setSkills(copyData(nextActive.skills));
    setAdvanceHistory(copyData(nextActive.advanceHistory));
    setEditingLockedHero(false);
  };

  const resetAll = () => {
    if (!window.confirm("Очистить данные текущего героя? Остальные герои сохранятся.")) return;
    setCharacter(createInitialCharacter());
    setSkills(createInitialSkills());
    setAdvanceHistory([]);
  };

  const exportHero = () => {
    const payload = {
      format: "ultima-forsan-hero",
      version: 1,
      exportedAt: new Date().toISOString(),
      character: copyData(character),
      skills: copyData(skills),
      advanceHistory: copyData(advanceHistory),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const name = (character.name || "герой").replace(/[\\/:*?"<>|]/g, " ").trim();
    anchor.href = url;
    anchor.download = `${name} - Ultima Forsan.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importHero = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 3 * 1024 * 1024) throw new Error("Файл слишком большой.");
      const parsed = JSON.parse(await file.text()) as {
        format?: string;
        character?: Partial<Character>;
        skills?: Skill[];
        advanceHistory?: unknown;
      };
      if (parsed.format !== "ultima-forsan-hero" || !parsed.character || !Array.isArray(parsed.skills)) {
        throw new Error("Это не файл героя Ultima Forsan.");
      }
      const importedCharacter = restoreCharacter(parsed.character);
      const importedSkills = restoreSkills(parsed.skills);
      const importedHistory = restoreAdvanceHistory(parsed.advanceHistory);
      const hero = makeHeroRecord(importedCharacter, importedSkills, importedHistory);
      setLibrary((current) => {
        const next: HeroLibrary = { version: 2, activeHeroId: hero.id, heroes: [...(current?.heroes || []), hero] };
        localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      setActiveHeroId(hero.id);
      setCharacter(copyData(hero.character));
      setSkills(copyData(hero.skills));
      setAdvanceHistory(copyData(hero.advanceHistory));
      setEditingLockedHero(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Не удалось импортировать героя.");
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="site-logo" aria-hidden="true"><img src="./hydra-logo-full-black.svg" alt="" /></span>
          <div>
            <p>Ultima Forsan</p>
            <h1>Лист персонажа</h1>
          </div>
        </div>
        <div className="topbar-progress" aria-label={`Заполнено ${completion} из 8 ключевых пунктов`}>
          <span>Готовность досье</span>
          <div><i style={{ width: `${(completion / 8) * 100}%` }} /></div>
          <strong>{completion}/8</strong>
        </div>
        <div className="topbar-actions">
          {!character.creationLocked && <button className="button ghost" onClick={fillDemo}>Заполнить пример</button>}
          <button className="button primary" onClick={() => setPrintRequested(true)}>
            Сохранить PDF
          </button>
        </div>
      </header>

      <section className="hero-library" aria-label="Сохранённые герои">
        <label>
          <span>Мои герои</span>
          <select value={activeHeroId} onChange={(event) => switchHero(event.target.value)}>
            {(library?.heroes || []).map((hero, index) => (
              <option key={hero.id} value={hero.id}>
                {hero.character.name || `Безымянный герой ${index + 1}`} · {rankFromAdvances(hero.character.advances)}
              </option>
            ))}
          </select>
        </label>
        <div className="library-actions">
          <button onClick={createHero}>+ Новый</button>
          <button onClick={duplicateHero} disabled={!activeHeroId}>Создать копию</button>
          <button onClick={exportHero} disabled={!activeHeroId}>Экспорт</button>
          <button onClick={() => importInput.current?.click()}>Импорт</button>
          <button className="delete-hero" onClick={deleteHero} disabled={!library || library.heroes.length <= 1}>Удалить</button>
        </div>
        <input className="hero-import-input" ref={importInput} type="file" accept="application/json,.json" onChange={(event) => void importHero(event.target.files?.[0])} />
        <p><i /> {savedAt ? `Сохранено автоматически в ${new Date(savedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : "Локальное сохранение готово"}</p>
      </section>

      <div className="mobile-switch" role="tablist" aria-label="Режим просмотра">
        <button
          className={mobileView === "form" ? "active" : ""}
          onClick={() => setMobileView("form")}
        >
          Анкета
        </button>
        <button
          className={mobileView === "preview" ? "active" : ""}
          onClick={() => setMobileView("preview")}
        >
          Лист
        </button>
      </div>

      <div className={`workspace ${character.creationLocked && !editingLockedHero ? "play-workspace" : ""}`}>
        <section className={`form-panel ${mobileView === "form" ? "mobile-active" : ""}`}>
          {character.creationLocked && !editingLockedHero && (
            <div className="play-dashboard">
              <header className="play-hero-header">
                {character.portrait && <figure><img style={{ objectPosition: `${character.portraitX}% ${character.portraitY}%`, transform: `scale(${character.portraitZoom / 100})` }} src={character.portrait} alt={`Портрет: ${character.name || "персонаж"}`} /></figure>}
                <div className="play-hero-title">
                  <span>Игровой режим · {currentRank}</span>
                  <h2>{character.name || "Безымянный герой"}</h2>
                  <p>{[character.archetype, character.origin].filter(Boolean).join(" · ") || "Досье зафиксировано"}</p>
                </div>
                <div className="play-actions">
                  <button className="button primary" type="button" onClick={openAdvance}>+ Повышение</button>
                  <button className="button play-button" type="button" onClick={() => setPrintRequested(true)}>PDF</button>
                  <button className="button play-button" type="button" onClick={() => setEditingLockedHero(true)}>Изменить досье</button>
                </div>
              </header>

              <section className="play-card play-vitals">
                <div className="play-card-title"><span>Главное</span><small>{advances} повышений</small></div>
                <div className="play-derived-grid">
                  <div><span>Защита</span><strong>{parry}</strong></div>
                  <div><span>Стойкость</span><strong>{toughness}</strong><small>броня торса {effectiveArmor}</small></div>
                  <div><span>Шаг</span><strong>{encumbered ? Math.max(0, character.pace - 2) : character.pace}</strong>{encumbered && <small>перегрузка</small>}</div>
                  <div><span>Бег</span><strong>{dieLabel(character.runningDie)}</strong></div>
                  <div><span>Фишки</span><strong>{character.sessionBennies}</strong><small>из {character.bennies}</small></div>
                  <div><span>Флорины</span><strong>{character.florins || 0}</strong><small>наличные</small></div>
                </div>
                <div className="play-attributes">
                  {ATTRIBUTE_META.map(({ key, label, abbr }) => <div key={key}><span>{abbr}</span><b>{label}</b><strong>{dieLabel(character.attributes[key])}</strong></div>)}
                </div>
              </section>

              <section className="play-card play-session">
                <div className="play-card-title"><span>Состояние сейчас</span><small>Сохраняется автоматически</small></div>
                <div className="play-state-grid">
                  <PlayNumberStepper label="Ранения" value={character.wounds} max={3} onChange={(value) => update("wounds", value)} />
                  <PlayNumberStepper label="Усталость" value={character.fatigue} max={2} onChange={(value) => update("fatigue", value)} />
                  <PlayNumberStepper label="Фишки" value={character.sessionBennies} onChange={(value) => update("sessionBennies", value)} />
                  <PlayNumberStepper label="Контакт с Чумой" value={character.plagueExposure} onChange={(value) => update("plagueExposure", value)} />
                </div>
                <div className="play-toggles"><label><input type="checkbox" checked={character.shaken} onChange={(event) => update("shaken", event.target.checked)} /> В шоке</label><label><input type="checkbox" checked={character.infected} onChange={(event) => update("infected", event.target.checked)} /> Заражён Чумой</label></div>
              </section>

              {(displayedArcaneTraditions.length > 0 || character.powers.length > 0) && (
                <section className="play-card play-magic">
                  <div className="play-card-title"><span>Мистика и силы</span><small>Без пунктов силы · {character.florins || 0} фл.</small></div>
                  {character.witchcraftBacklash && <label className="magic-strain"><input type="checkbox" checked={character.witchcraftBacklash} onChange={(event) => update("witchcraftBacklash", event.target.checked)} /> Ведьмовство временно снижено на ступень</label>}
                  {character.powers.length ? <div className="play-power-list">{character.powers.map((power) => {
                    const guide = POWER_GUIDES.find((item) => item.id === power.guideId);
                    if (!guide) return null;
                    const tradition = ARCANE_TRADITIONS[power.tradition];
                    const skill = skills.find((item) => item.id === tradition.skillId);
                    const currentCost = power.tradition === "alchemy"
                      ? Math.max(guide.cost || 0, power.recipeCost)
                      : Math.max(guide.cost || 0, powerCosts[power.id] ?? guide.cost ?? 0);
                    const maintainedPenalty = power.tradition === "witchcraft" ? Math.max(0, activeWitchcraftPowers - (power.active ? 1 : 0)) : 0;
                    const activationPenalty = power.tradition === "alchemy" ? 0 : -Math.floor(currentCost / 2) - maintainedPenalty;
                    const result = powerRolls[power.id];
                    return (
                      <article className={`play-power ${power.active ? "is-active" : ""} ${power.broken ? "is-broken" : ""}`} key={power.id}>
                        <header><div><small>{tradition.label} · {guide.rank}</small><b>{power.name}</b></div><strong>{activationPenalty ? `${activationPenalty}` : "±0"}</strong></header>
                        <p>{power.trapping}</p>
                        <div className="play-power-meta"><span>{guide.range}</span><span>{guide.duration}</span><span>{guide.detail}</span></div>
                        <div className="play-power-controls">
                          <label><span>{power.tradition === "alchemy" ? "Цена рецепта" : "Стоимость сейчас"}</span><input type="number" min={guide.cost || 0} value={currentCost} disabled={power.tradition === "alchemy" && power.prepared > 0} title={power.tradition === "alchemy" && power.prepared > 0 ? "Сначала используйте или верните готовые дозы" : undefined} onChange={(event) => { if (!Number.isFinite(event.currentTarget.valueAsNumber)) return; if (power.tradition === "alchemy") updatePower(power.id, { recipeCost: Math.max(guide.cost || 0, Math.floor(event.currentTarget.valueAsNumber)) }); else setPowerCosts((current) => ({ ...current, [power.id]: Math.max(guide.cost || 0, Math.floor(event.currentTarget.valueAsNumber)) })); }} /></label>
                          {power.tradition === "alchemy" && <div className="alchemy-dose-field"><span>Дозы · {currentCost} фл.</span><div><button type="button" aria-label={`Вернуть ингредиенты: ${power.name}`} title={`Вернуть ингредиенты и ${currentCost} флоринов`} disabled={power.prepared <= 0} onClick={() => setPreparedPowerQuantity(power.id, power.prepared - 1)}>−</button><strong>{power.prepared}</strong><button type="button" aria-label={`Приготовить дозу: ${power.name}`} title={`Приготовить дозу за ${currentCost} флоринов`} disabled={safeNumber(character.florins) < currentCost} onClick={() => setPreparedPowerQuantity(power.id, power.prepared + 1)}>+</button></div></div>}
                          <button type="button" disabled={power.broken || (power.tradition === "alchemy" && power.prepared <= 0)} onClick={() => activatePower(power)}>Бросить {skill?.name || tradition.label} {dieLabel(skill?.level || 0)}</button>
                        </div>
                        <div className="play-power-status">
                          <label><input type="checkbox" checked={power.active} onChange={(event) => updatePower(power.id, { active: event.target.checked })} /> {power.tradition === "alchemy" ? "Эффект действует" : "Поддерживается"}</label>
                          {power.tradition === "weird-science" && <label><input type="checkbox" checked={power.broken} onChange={(event) => updatePower(power.id, { broken: event.target.checked })} /> Устройство сломано</label>}
                        </div>
                        {result && <div className={`power-roll-result ${result.backlash ? "is-backlash" : ""}`}><b>{result.outcome}</b><span>Навык: {result.trait} · дикий: {result.wild} · модификатор {result.modifier >= 0 ? "+" : ""}{result.modifier} · итог {result.total}</span></div>}
                      </article>
                    );
                  })}</div> : <p className="play-empty">Силы ещё не выбраны. Откройте досье, чтобы добавить их из справочника.</p>}
                </section>
              )}

              <section className="play-card">
                <div className="play-card-title"><span>Черты и изъяны</span></div>
                <div className="play-traits-grid">
                  <div><h3>Черты</h3>{character.edges.filter((entry) => entry.name.trim()).map((entry) => <p key={entry.id}><b>{entry.name}</b>{entry.note && <span>{entry.note}</span>}</p>)}</div>
                  <div><h3>Изъяны</h3>{character.hindrances.filter((entry) => entry.name.trim()).map((entry) => <p key={entry.id}><b>{entry.name}</b>{entry.note && <span>{entry.note}</span>}</p>)}</div>
                </div>
              </section>

              <section className="play-card">
                <div className="play-card-title"><span>Навыки</span><small>Только изученные</small></div>
                <div className="play-skills-grid">
                  {playSkills.map((skill) => <div key={skill.id}><span>{skill.name}</span><small>{ATTRIBUTE_META.find((attribute) => attribute.key === skill.attribute)?.abbr}</small><strong>{dieLabel(skill.level)}</strong></div>)}
                </div>
              </section>

              <section className="play-card play-equipment">
                <div className="play-card-title"><span>Оружие и снаряжение</span><small>{inventoryWeight.toLocaleString("ru-RU")} / {loadLimit} кг · {character.florins || 0} фл.</small></div>
                {playWeapons.length > 0 ? <div className="play-weapons">{playWeapons.map((weapon) => <article key={weapon.id}><div><b>{weapon.name}</b><span>{weapon.range || "Ближний бой"} · урон {weapon.damage || "-"}{weapon.ap && weapon.ap !== "-" ? ` · ББ ${weapon.ap}` : ""}</span></div>{weapon.ammo && weapon.ammo !== "-" && <label><span>Потрачено / {weapon.ammo}</span><input type="number" min="0" value={character.ammoSpent[weapon.id] || 0} onChange={(event) => update("ammoSpent", { ...character.ammoSpent, [weapon.id]: Math.max(0, safeNumber(event.target.value)) })} /></label>}</article>)}</div> : <p className="play-empty">Оружие не записано.</p>}
                {character.inventory.length > 0 && <div className="play-inventory">{character.inventory.map((item) => <div key={item.id}><label>{(item.category === "Доспех" || item.category === "Щит") && <input type="checkbox" checked={item.equipped} onChange={(event) => setEquipmentWorn(item.id, event.target.checked)} />}<b>{item.name}</b></label><span>{item.quantity} шт. · {(item.weight * item.quantity).toLocaleString("ru-RU")} кг</span></div>)}</div>}
                {character.gear && <p className="play-gear-note">{character.gear}</p>}
                <button className="play-manage-equipment" type="button" onClick={() => setEditingLockedHero(true)}>Управлять снаряжением</button>
              </section>
            </div>
          )}

          <div className="character-editor" hidden={character.creationLocked && !editingLockedHero}>
          {character.creationLocked && editingLockedHero && <div className="edit-mode-banner"><div><b>Редактирование досье</b><span>Параметры создания меняются через повышения; остальные записи можно исправлять свободно.</span></div><button type="button" onClick={() => setEditingLockedHero(false)}>Вернуться к игре</button></div>}
          <div className="intro-card">
            <span className="eyebrow">Без писарской муки</span>
            <h2>Расскажите о герое.<br />Вёрстку сделаем мы.</h2>
            <p>
              Анкета сохраняется только в этом браузере. Справа сразу собираются две страницы A4,
              готовые к печати или сохранению в PDF.
            </p>
          </div>

          <details open>
            <summary><span>01</span> Основа персонажа</summary>
            <div className="section-body">
              <div className="campaign-rules">
                <strong>SWADE для кампании</strong>
                <span>12 пунктов навыков · 5 базовых навыков d4 · особенности Ultima Forsan адаптированы</span>
              </div>
              <p className="rules-note">
                Генератор использует базовую механику SWADE. Термины и требования из книги сеттинга
                автоматически переведены с предыдущей редакции; недоступные в кампании черты выбрать нельзя.
              </p>
              <details className="adaptation-guide">
                <summary>Что изменено при переводе на SWADE</summary>
                <div>
                  {SWADE_ADAPTATIONS.map(([oldTerm, newTerm]) => (
                    <span key={oldTerm}><s>{oldTerm}</s><i aria-hidden="true">→</i><b>{newTerm}</b></span>
                  ))}
                </div>
                <p>Бонусы к старой Харизме применяются только там, где важны статус, внешность или наряд. Проверки Храбрости проходят Характером.</p>
              </details>
              <div className="field-grid two">
                <Field label="Имя героя" value={character.name} maxLength={48} onChange={(value) => update("name", value)} placeholder="Как его зовут?" />
                <Field label="Имя игрока" value={character.player} maxLength={36} onChange={(value) => update("player", value)} />
                <label className="field">
                  <span>Архетип</span>
                  <select value={character.archetype} onChange={(event) => update("archetype", event.target.value)}>
                    <option value="">Выберите или впишите ниже</option>
                    {ARCHETYPES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <Field label="Происхождение / феод" value={character.origin} maxLength={44} onChange={(value) => update("origin", value)} placeholder="Например, Лукка" />
                <div className="rank-display" aria-live="polite">
                  <span>Развитие</span>
                  <strong>{currentRank}</strong>
                  <small>{advances} повышений · {nextRankThreshold === null ? "высший ранг" : `следующий ранг с ${nextRankThreshold}`}</small>
                </div>
                <button className="advance-trigger" type="button" onClick={openAdvance}><span>+</span><b>Получить повышение</b><small>Выбрать улучшение героя</small></button>
                <Field label="Возраст" value={character.age} maxLength={16} onChange={(value) => update("age", value)} />
                <label className="field">
                  <span>Состояние крови</span>
                  <select value={character.purity} onChange={(event) => update("purity", event.target.value as Character["purity"])}>
                    <option>Чистый</option>
                    <option>Нечистый</option>
                  </select>
                </label>
              </div>
              <div className="advance-history">
                <div className="advance-history-title">
                  <div><span>Журнал развития</span><small>{advanceHistory.length ? `${advanceHistory.length} записей` : "Новые повышения появятся здесь"}</small></div>
                  <button type="button" disabled={!advanceHistory.length} onClick={undoLastAdvance}>Отменить последнее</button>
                </div>
                {advanceHistory.length > 0 && (
                  <ol>
                    {advanceHistory.slice().reverse().map((record) => (
                      <li key={record.id}><b>№{record.number}</b><div><strong>{record.summary}</strong><small>{record.rank} · {new Date(record.createdAt).toLocaleDateString("ru-RU")}</small></div></li>
                    ))}
                  </ol>
                )}
              </div>
              {character.purity === "Нечистый" && (
                <div className="warning-box">
                  Нечистый невосприимчив к Чуме, заразен и обречён восстать после смерти.
                  Повышение Выносливости стоит 2 пункта за ступень. Как человек, он тоже получает 1 бесплатную черту.
                </div>
              )}
              <TextAreaField
                label="Внешность и приметы"
                value={character.appearance}
                onChange={(value) => update("appearance", value)}
                placeholder="Что запомнит свидетель? Одежда, шрамы, голос, запах, привычный жест..."
                maxLength={220}
              />
              <div className="portrait-uploader">
                <div className="portrait-preview">
                  {character.portrait ? <img style={{ objectPosition: `${character.portraitX}% ${character.portraitY}%`, transform: `scale(${character.portraitZoom / 100})` }} src={character.portrait} alt={`Портрет: ${character.name || "персонаж"}`} /> : <span aria-hidden="true">Θ</span>}
                </div>
                <div>
                  <b>Портрет персонажа</b>
                  <p>JPG, PNG или WebP до 12 МБ. Изображение уменьшится и сохранится вместе с героем только в этом браузере.</p>
                  <input ref={portraitInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadPortrait(event.target.files?.[0])} />
                  <div className="portrait-actions">
                    <button className="button ghost" type="button" onClick={() => portraitInput.current?.click()}>{character.portrait ? "Заменить портрет" : "Загрузить портрет"}</button>
                    {character.portrait && <button className="portrait-remove" type="button" onClick={() => { update("portrait", ""); setPortraitError(""); }}>Удалить</button>}
                  </div>
                  {portraitError && <small role="alert">{portraitError}</small>}
                </div>
              </div>
              {character.portrait && <div className="portrait-crop-controls"><label><span>Горизонталь</span><input type="range" min="0" max="100" value={character.portraitX} onChange={(event) => update("portraitX", safeNumber(event.target.value, 50))} /></label><label><span>Вертикаль</span><input type="range" min="0" max="100" value={character.portraitY} onChange={(event) => update("portraitY", safeNumber(event.target.value, 50))} /></label><label><span>Масштаб</span><input type="range" min="100" max="180" value={character.portraitZoom} onChange={(event) => update("portraitZoom", safeNumber(event.target.value, 100))} /></label></div>}
            </div>
          </details>

          <details open>
            <summary><span>02</span> Характеристики</summary>
            <div className="section-body">
              <div className={`budget ${creationAttributePoints > 5 ? "over" : ""}`}>
                <div><span>Создание</span><strong>{creationAttributePoints}</strong></div>
                <div className="budget-track"><i style={{ width: `${Math.min(100, (creationAttributePoints / 5) * 100)}%` }} /></div>
                <b>из 5{character.attributeAdvancePoints ? ` · +${character.attributeAdvancePoints} за повышения` : ""}</b>
              </div>
              <fieldset className="creation-fields" disabled={character.creationLocked}>
              <div className="attribute-grid">
                {ATTRIBUTE_META.map(({ key, label, abbr }) => (
                  <label className="attribute-card" key={key}>
                    <span>{abbr}</span>
                    <strong>{label}</strong>
                    <DieSelect
                      label={label}
                      value={character.attributes[key]}
                      allowUntrained={false}
                      onChange={(value) => update("attributes", { ...character.attributes, [key]: value })}
                    />
                  </label>
                ))}
              </div>
              </fieldset>
              <div className="derived-grid">
                <div><span>Защита</span><strong>{parry}</strong><small>2 + 1/2 Драки</small></div>
                <div><span>Стойкость</span><strong>{toughness}</strong><small>с бронёй</small></div>
                <label title="Запасное значение для нестандартной брони. С выбранным доспехом не складывается — используется большее."><span>Броня торса вручную</span><input type="number" min="0" value={character.armor} onChange={(event) => update("armor", Math.max(0, safeNumber(event.target.value)))} /></label>
                <label><span>Размер</span><input type="number" value={character.size} onChange={(event) => update("size", safeNumber(event.target.value))} /></label>
                <label><span>Шаг</span><input type="number" value={character.pace} onChange={(event) => update("pace", safeNumber(event.target.value, 6))} /></label>
                <div className="derived-control"><span>Бег</span><DieSelect label="Кость бега" value={character.runningDie} allowUntrained={false} onChange={(value) => update("runningDie", value)} /></div>
                <label><span>Фишки</span><input type="number" value={character.bennies} onChange={(event) => update("bennies", safeNumber(event.target.value, 3))} /></label>
              </div>
            </div>
          </details>

          <details open>
            <summary><span>03</span> Навыки</summary>
            <div className="section-body">
              <div className={`budget ${creationSkillPoints > skillBudget ? "over" : ""}`}>
                <div><span>Создание</span><strong>{creationSkillPoints}</strong></div>
                <div className="budget-track"><i style={{ width: `${Math.min(100, (creationSkillPoints / skillBudget) * 100)}%` }} /></div>
                <b>из {skillBudget}{character.skillAdvancePoints ? ` · +${character.skillAdvancePoints} ступ. за повышения` : ""}</b>
              </div>
              <div className="skills-head"><span>Навык</span><span>Связан с</span><span>Кость</span><span>Цена</span></div>
              <fieldset className="creation-fields" disabled={character.creationLocked}>
              <div className="skills-list">
                {skills.map((skill) => (
                  <div className="skill-row" key={skill.id}>
                    {skill.id.startsWith("custom-") ? (
                      <input aria-label="Название навыка" value={skill.name} onChange={(event) => updateSkill(skill.id, { name: event.target.value })} />
                    ) : (
                      <strong>{skill.name}{skill.core ? <em>базовый</em> : null}</strong>
                    )}
                    {skill.id.startsWith("custom-") ? (
                      <select aria-label={`Характеристика для ${skill.name}`} value={skill.attribute} onChange={(event) => updateSkill(skill.id, { attribute: event.target.value as AttributeKey })}>
                        {ATTRIBUTE_META.map((attribute) => <option key={attribute.key} value={attribute.key}>{attribute.abbr}</option>)}
                      </select>
                    ) : (
                      <span className="skill-attribute" title={`Связан с характеристикой «${ATTRIBUTE_META.find((attribute) => attribute.key === skill.attribute)?.label}»`}>
                        {ATTRIBUTE_META.find((attribute) => attribute.key === skill.attribute)?.abbr}
                      </span>
                    )}
                    <DieSelect label={`Уровень навыка ${skill.name}`} value={skill.level} onChange={(level) => updateSkill(skill.id, { level })} />
                    <span className="skill-cost">{skillCost(skill, character.attributes)}</span>
                    {skill.id.startsWith("custom-") && <button className="remove" aria-label="Удалить навык" onClick={() => setSkills((current) => current.filter((item) => item.id !== skill.id))}>×</button>}
                  </div>
                ))}
              </div>
              </fieldset>
              <button
                className="add-row"
                disabled={skills.filter((skill) => skill.id.startsWith("custom-")).length >= 4}
                onClick={() => setSkills((current) => [...current, { id: `custom-${makeId()}`, name: "Новый навык", attribute: "smarts", level: 0 }])}
              >
                + Добавить особый навык
              </button>
              <div className="language-row">
                <label className="field">
                  <span>Языки <b className={languageCount > languageAllowance ? "bad" : ""}>{languageCount}/{languageAllowance}</b></span>
                  <input value={character.languages} onChange={(event) => update("languages", event.target.value)} placeholder="Через запятую: родной и дополнительные" />
                </label>
                <p>Герой знает родной язык и дополнительные языки в количестве половины Смекалки.</p>
              </div>
            </div>
          </details>

          <details open>
            <summary><span>04</span> Черты и изъяны</summary>
            <div className="section-body">
            <fieldset className="split-entries creation-fields" disabled={character.creationLocked}>
              <div>
                <div className="entry-title">
                  <h3>Черты</h3>
                  <small className={chosenEdgeCount > edgeLimit ? "bad" : ""}>{chosenEdgeCount}/{edgeLimit} доступных мест</small>
                </div>
                <div className="edge-budget-note">
                  <span>База: {baseEdgeSlots}</span>
                  <span>За изъяны: {hindranceEdgeSlots}</span>
                  <span>За повышения: {edgeAdvances}</span>
                  <span>По рангу «{currentRank}»: {availableEdgeCount} вариантов</span>
                </div>
                {safeNumber(character.edgeAdvances) > advances && <p className="entry-warning">На черты нельзя потратить больше повышений, чем получено.</p>}
                {chosenEdgeCount > edgeLimit && <p className="entry-warning">Уберите лишние черты или получите для них очки изъянов / повышения.</p>}
                {character.edges.map((entry) => (
                  <div className="entry-row guided" key={entry.id}>
                    <TraitGuideInput kind="edge" rank={currentRank} entry={entry} onChange={(patch) => updateEntry<TraitEntry>("edges", entry.id, patch)} />
                    <input aria-label="Эффект черты" value={entry.note} placeholder="Краткий эффект" onChange={(event) => updateEntry<TraitEntry>("edges", entry.id, { note: event.target.value })} />
                    <button className="remove" aria-label="Удалить черту" onClick={() => removeEntry("edges", entry.id)}>×</button>
                  </div>
                ))}
                <button className="add-row" disabled={character.edges.length >= 20 || addableEdgeRows === 0} onClick={() => update("edges", [...character.edges, blankEdge()])}>+ Добавить черту{addableEdgeRows > 0 ? ` (ещё ${addableEdgeRows})` : ""}</button>
              </div>
              <div>
                <div className="entry-title"><h3>Изъяны</h3><small className={hindrancePoints + character.retiredHindrancePoints > 4 ? "bad" : ""}>{hindrancePoints} сейчас{character.retiredHindrancePoints ? ` · ${character.retiredHindrancePoints} устранено повышениями` : ""}, выгода максимум за 4</small></div>
                {character.hindrances.map((entry) => {
                  const guide = HINDRANCE_GUIDES.find((item) => item.name.toLocaleLowerCase("ru") === entry.name.trim().toLocaleLowerCase("ru"));
                  const fixedSeverity = guide && guide.severity !== "either" ? guide.severity : undefined;
                  return (
                  <div className="entry-row hindrance guided" key={entry.id}>
                    <TraitGuideInput kind="hindrance" rank={currentRank} entry={entry} onChange={(patch) => {
                      const namedGuide = patch.name === undefined ? undefined : HINDRANCE_GUIDES.find(
                        (item) => item.name.toLocaleLowerCase("ru") === patch.name?.trim().toLocaleLowerCase("ru"),
                      );
                      updateEntry<TraitEntry>("hindrances", entry.id, {
                        ...patch,
                        ...(namedGuide && namedGuide.severity !== "either" ? { severity: namedGuide.severity } : {}),
                      });
                    }} />
                    <select
                      aria-label={fixedSeverity ? "Тяжесть изъяна задана правилами" : "Тяжесть изъяна"}
                      disabled={Boolean(fixedSeverity)}
                      title={fixedSeverity ? `По правилам этот изъян только ${fixedSeverity === "major" ? "крупный" : "мелкий"}` : "Выберите тяжесть изъяна"}
                      value={fixedSeverity || entry.severity}
                      onChange={(event) => {
                      const severity = event.target.value as TraitEntry["severity"];
                      const generatedNotes = guide ? [guide.detail, guide.minorDetail, guide.majorDetail].filter(Boolean) : [];
                      const canRefreshNote = !entry.note.trim() || generatedNotes.includes(entry.note);
                      updateEntry<TraitEntry>("hindrances", entry.id, {
                        severity,
                        ...(guide && canRefreshNote ? { note: traitGuideDetail(guide, severity) } : {}),
                      });
                    }}>
                      <option value="minor">Мелкий</option>
                      <option value="major">Крупный</option>
                    </select>
                    <input aria-label="Проявление изъяна" value={entry.note} placeholder="Как проявляется" onChange={(event) => updateEntry<TraitEntry>("hindrances", entry.id, { note: event.target.value })} />
                    <button className="remove" aria-label="Удалить изъян" onClick={() => removeEntry("hindrances", entry.id)}>×</button>
                  </div>
                );})}
                <button className="add-row" disabled={character.hindrances.length >= 8} onClick={() => update("hindrances", [...character.hindrances, blankHindrance()])}>+ Добавить изъян</button>
              </div>
            </fieldset>
            </div>
          </details>

          <details open>
            <summary><span>05</span> Оружие и снаряжение</summary>
            <div className="section-body">
              <p className="weapon-guide-intro"><b>Справочник вооружения.</b> Начните вводить название и выберите вариант — характеристики заполнятся автоматически. Именное или необычное оружие можно вписать вручную.</p>
              <div className="weapon-head"><span>Оружие</span><span>Дистанция</span><span>Урон</span><span>ББ</span><span>Боезапас</span></div>
              {character.weapons.map((weapon) => {
                const guide = WEAPON_GUIDES.find((item) => item.name.toLocaleLowerCase("ru") === weapon.name.trim().toLocaleLowerCase("ru"));
                return (
                  <div className="weapon-block" key={weapon.id}>
                    <div className="weapon-row">
                      <WeaponGuideInput weapon={weapon} onChange={(patch) => updateEntry<Weapon>("weapons", weapon.id, patch)} />
                      {(["range", "damage", "ap", "ammo"] as const).map((key) => (
                        <input key={key} aria-label={`${key} оружия`} value={weapon[key]} onChange={(event) => updateEntry<Weapon>("weapons", weapon.id, { [key]: event.target.value })} />
                      ))}
                      <button className="remove" aria-label="Удалить оружие" onClick={() => removeEntry("weapons", weapon.id)}>×</button>
                    </div>
                    {guide && <div className="weapon-guide-hint"><b>{guide.category}</b><span>{guide.detail}</span></div>}
                    {guide && weapon.price ? <div className="weapon-purchase"><span>{weapon.price} фл. · {weapon.weight} кг</span>{weapon.purchased ? <button type="button" onClick={() => returnWeapon(weapon.id)}>Вернуть</button> : <button type="button" disabled={safeNumber(character.florins) < weapon.price} onClick={() => purchaseWeapon(weapon.id)}>Купить оружие</button>}</div> : null}
                  </div>
                );
              })}
              <button className="add-row" disabled={character.weapons.length >= 5} onClick={() => update("weapons", [...character.weapons, blankWeapon()])}>+ Добавить оружие</button>
              <div className="equipment-summary">
                <div><span>Флорины</span><strong>{character.florins || 0}</strong></div>
                <div className={encumbered ? "bad" : ""}><span>Нагрузка</span><strong>{inventoryWeight.toLocaleString("ru-RU")} / {loadLimit} кг</strong><small>{encumbered ? "Перегрузка: -2 к Шагу, бегу и Ловкости" : "Комфортная нагрузка"}</small></div>
                <div className="armor-zone-summary">
                  <span>Броня по зонам</span>
                  <strong>Торс +{effectiveArmor} · Голова +{headArmor}{headCoverage === 50 ? " (50%)" : ""}</strong>
                  <small>Руки +{armsArmor} · Ноги +{legsArmor}. В Стойкость входит броня торса.</small>
                </div>
                <div>
                  <span>Щит</span>
                  <strong>Защита +{equippedShield?.parry || 0}</strong>
                  <small>{equippedShield?.rangedArmor ? `Броня +${equippedShield.rangedArmor} только против дистанционных атак спереди и слева.` : equippedShield ? "Работает против атак спереди и слева." : "Щит не экипирован."}</small>
                </div>
              </div>
              <div className="equipment-store">
                <h3>Броня, щиты и припасы</h3>
                <p className="equipment-rules-note"><b>Как считается броня.</b> Каждый элемент защищает указанную зону. Бонусы разных зон и несколько доспехов на одной зоне не складываются: действует лучший. Обычная атака попадает в торс, поэтому именно его броня входит в Стойкость.</p>
                <div className="equipment-catalog">
                  {EQUIPMENT_GUIDES.map((guide) => {
                    const selectedItem = character.inventory.find((item) => item.id === guide.id);
                    const cannotAfford = !selectedItem && safeNumber(character.florins) < guide.price;
                    return (
                      <article className={`equipment-card${selectedItem ? " is-selected" : ""}${cannotAfford ? " is-unaffordable" : ""}`} key={guide.id}>
                        <span>{guide.category}</span><b>{guide.name}</b><p>{guide.detail}</p>
                        <small>{guide.price} фл. · {guide.weight} кг{guide.armor ? ` · броня +${guide.armor}` : ""}{guide.parry ? ` · Защита +${guide.parry}` : ""}</small>
                        {selectedItem ? (
                          <div className="equipment-quantity" aria-label={`Количество: ${guide.name}`}>
                            <span>Количество</span>
                            <button type="button" aria-label={`Уменьшить количество: ${guide.name}`} onClick={() => setEquipmentQuantity(guide.id, selectedItem.quantity - 1)}>−</button>
                            <input aria-label={`Количество: ${guide.name}`} type="number" min="1" value={selectedItem.quantity} onFocus={(event) => event.currentTarget.select()} onChange={(event) => { if (Number.isFinite(event.currentTarget.valueAsNumber)) setEquipmentQuantity(guide.id, event.currentTarget.valueAsNumber); }} />
                            <button type="button" aria-label={`Увеличить количество: ${guide.name}`} disabled={safeNumber(character.florins) < guide.price} onClick={() => setEquipmentQuantity(guide.id, selectedItem.quantity + 1)}>+</button>
                          </div>
                        ) : (
                          <>
                            <button className="equipment-card-select" type="button" aria-label={`Выбрать: ${guide.name}`} disabled={cannotAfford} onClick={() => purchaseEquipment(guide.id)} />
                            <span className="equipment-card-action">{cannotAfford ? "Не хватает флоринов" : "Выбрать"}</span>
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
              {character.inventory.length > 0 && <div className="inventory-list"><h3>В рюкзаке и на герое</h3>{character.inventory.map((item) => <div key={item.id}><label>{(item.category === "Доспех" || item.category === "Щит") && <input type="checkbox" checked={item.equipped} onChange={(event) => setEquipmentWorn(item.id, event.target.checked)} />}<b>{item.name}</b></label><span>{item.quantity} шт. · {(item.weight * item.quantity).toLocaleString("ru-RU")} кг</span><button type="button" onClick={() => sellEquipment(item.id)}>Вернуть</button></div>)}</div>}
              <div className="field-grid money-grid"><Field label="Исправить остаток флоринов вручную" value={character.florins} maxLength={16} onChange={(value) => update("florins", value)} /></div>
              <TextAreaField label="Снаряжение, броня и припасы" value={character.gear} onChange={(value) => update("gear", value)} maxLength={520} placeholder="Маска, инструменты, броня, лекарства, реликвии..." />
            </div>
          </details>

          <details open>
            <summary><span>06</span> Мистика и силы</summary>
            <div className="section-body magic-editor">
              <div className="magic-rules-intro"><b>Ultima Forsan играет без пунктов силы.</b><span>Стоимость из SWADE нужна для штрафа к активации и алхимических ингредиентов, но запас ПС вести не нужно. Старые названия и ранги ниже уже адаптированы к SWADE.</span></div>
              {arcaneTraditions.length === 0 ? (
                <p className="magic-empty">Добавьте в разделе «Черты и изъяны» один из мистических даров: алхимию, ведьмовство или безумную науку. После этого здесь появится подходящий справочник сил.</p>
              ) : (
                <>
                  <div className="magic-capacity"><span>Известные силы</span><strong>{character.powers.length} / {powerLimit}</strong><small>{bonusPowerSlots ? `В том числе +${bonusPowerSlots} за черту «Новые силы».` : "Начальный предел задаётся мистическим даром; черта «Новые силы» добавляет ещё две."}</small></div>
                  {arcaneTraditions.map((traditionId) => {
                    const tradition = ARCANE_TRADITIONS[traditionId];
                    const arcaneSkill = skills.find((skill) => skill.id === tradition.skillId);
                    const traditionPowers = character.powers.filter((power) => power.tradition === traditionId);
                    return (
                      <section className="magic-tradition" key={traditionId}>
                        <header><div><span>Мистический дар</span><h3>{tradition.label}</h3></div><strong>{arcaneSkill?.name || tradition.label} {dieLabel(arcaneSkill?.level || 0)}</strong></header>
                        <p>{tradition.rules}</p>
                        {(!arcaneSkill || arcaneSkill.level === 0) && <small className="magic-skill-warning">Навык не изучен: проверки будут выполняться как d4−2.</small>}
                        <PowerGuideInput tradition={traditionId} rank={currentRank} excludeGuideIds={traditionPowers.map((power) => power.guideId)} disabled={character.powers.length >= powerLimit} onChoose={(guide) => addPower(traditionId, guide)} />
                      </section>
                    );
                  })}
                </>
              )}
              {character.powers.length > 0 && <div className="known-power-list">{character.powers.map((power) => {
                const guide = POWER_GUIDES.find((item) => item.id === power.guideId);
                if (!guide) return null;
                return (
                  <article key={power.id}>
                    <header><div><small>{ARCANE_TRADITIONS[power.tradition].label} · {guide.rank}{guide.legacyName ? ` · ранее «${guide.legacyName}»` : ""}</small><b>{power.name}</b></div><button className="remove" type="button" aria-label={`Удалить силу ${power.name}`} onClick={() => removePower(power.id)}>×</button></header>
                    <div className="power-rules-line"><span>{guide.cost === null ? "ПС: особ." : `ПС: ${guide.cost}`}</span><span>{guide.range}</span><span>{guide.duration}</span></div>
                    <p>{guide.detail}</p>
                    <label><span>Проявление силы</span><textarea value={power.trapping} maxLength={240} onChange={(event) => updatePower(power.id, { trapping: event.target.value })} /></label>
                    {power.tradition === "alchemy" && <div className="alchemy-prep-editor"><label><span>Цена рецепта за дозу</span><input type="number" min={guide.cost || 0} value={Math.max(guide.cost || 0, power.recipeCost)} disabled={power.prepared > 0} title={power.prepared > 0 ? "Сначала используйте или верните готовые дозы" : undefined} onChange={(event) => { if (Number.isFinite(event.currentTarget.valueAsNumber)) updatePower(power.id, { recipeCost: Math.max(guide.cost || 0, Math.floor(event.currentTarget.valueAsNumber)) }); }} /></label><div><span>Готово: <b>{power.prepared}</b></span><button type="button" disabled={power.prepared <= 0} onClick={() => setPreparedPowerQuantity(power.id, power.prepared - 1)}>− вернуть {power.recipeCost} фл.</button><button type="button" disabled={safeNumber(character.florins) < power.recipeCost} onClick={() => setPreparedPowerQuantity(power.id, power.prepared + 1)}>+ приготовить за {power.recipeCost} фл.</button></div><small>Приготовление сразу меняет остаток флоринов. Использованная доза денег не возвращает.</small></div>}
                  </article>
                );
              })}</div>}
            </div>
          </details>

          <details open>
            <summary><span>07</span> Состояние в игре</summary>
            <div className="section-body session-state">
              <p>Временные отметки сохраняются с героем, но не изменяют постоянные параметры.</p>
              <div className="state-grid">
                <label><span>Ранения</span><input type="number" min="0" max="3" value={character.wounds} onChange={(event) => update("wounds", Math.min(3, Math.max(0, safeNumber(event.target.value))))} /></label>
                <label><span>Усталость</span><input type="number" min="0" max="2" value={character.fatigue} onChange={(event) => update("fatigue", Math.min(2, Math.max(0, safeNumber(event.target.value))))} /></label>
                <label><span>Фишки сейчас</span><input type="number" min="0" value={character.sessionBennies} onChange={(event) => update("sessionBennies", Math.max(0, safeNumber(event.target.value)))} /></label>
                <label><span>Контакт с Чумой</span><input type="number" min="0" value={character.plagueExposure} onChange={(event) => update("plagueExposure", Math.max(0, safeNumber(event.target.value)))} /></label>
              </div>
              <div className="state-toggles"><label><input type="checkbox" checked={character.shaken} onChange={(event) => update("shaken", event.target.checked)} /> В шоке</label><label><input type="checkbox" checked={character.infected} onChange={(event) => update("infected", event.target.checked)} /> Заражён Чумой</label></div>
              <div className="ammo-tracker"><h3>Потраченный боезапас</h3>{character.weapons.filter((weapon) => weapon.name && weapon.ammo !== "-").map((weapon) => <label key={weapon.id}><span>{weapon.name}</span><input type="number" min="0" value={character.ammoSpent[weapon.id] || 0} onChange={(event) => update("ammoSpent", { ...character.ammoSpent, [weapon.id]: Math.max(0, safeNumber(event.target.value)) })} /></label>)}</div>
            </div>
          </details>

          <details>
            <summary><span>08</span> Настройки PDF</summary>
            <div className="section-body print-settings">
              <label><input type="checkbox" checked={character.printPortrait} onChange={(event) => update("printPortrait", event.target.checked)} /> Печатать портрет</label>
              <label><input type="checkbox" checked={character.printDiceValues} onChange={(event) => update("printDiceValues", event.target.checked)} /> Показывать цифры внутри контуров дайсов</label>
              <label><input type="checkbox" checked={character.printExtraNotesPage} onChange={(event) => update("printExtraNotesPage", event.target.checked)} /> Добавить третью страницу для заметок</label>
              <p>Фон листа при печати всегда отключён для экономии чернил.</p>
            </div>
          </details>

          <details open>
            <summary><span>09</span> Человек под маской</summary>
            <div className="section-body">
              <div className="field-grid two narrative-grid">
                <TextAreaField label="Родина и прошлое" value={character.homeland} onChange={(value) => update("homeland", value)} placeholder="Откуда вы и что оставили позади?" />
                <TextAreaField label="Вера или убеждение" value={character.belief} onChange={(value) => update("belief", value)} placeholder="Во что вы верите, когда молитвы не помогают?" />
                <TextAreaField label="Цель" value={character.goal} onChange={(value) => update("goal", value)} placeholder="Чего вы добиваетесь сейчас?" />
                <TextAreaField label="Страх или вина" value={character.fear} onChange={(value) => update("fear", value)} placeholder="Какую цену вы боитесь заплатить?" />
                <TextAreaField label="Отношение к Чуме" value={character.plague} onChange={(value) => update("plague", value)} placeholder="Болезнь, кара, оружие, загадка?" />
                <TextAreaField label="Связи и долги" value={character.bonds} onChange={(value) => update("bonds", value)} placeholder="Кому вы должны? Кто должен вам?" />
              </div>
              <Field label="Дикий аркан Таро (если используется)" value={character.wildArcana} maxLength={48} onChange={(value) => update("wildArcana", value)} />
              <TextAreaField label="Свободные заметки" value={character.notes} onChange={(value) => update("notes", value)} maxLength={520} />
            </div>
          </details>

          <div className="form-footer">
            <button className="button danger" onClick={resetAll}>Очистить анкету</button>
            <p>Правила сверены с локальными PDF SWADE и Ultima Forsan. Итоговые черты и снаряжение всё равно согласуйте с ведущим.</p>
          </div>
          <div className={`creation-lock creation-lock-final ${character.creationLocked ? "is-locked" : ""}`}>
            <div><b>{character.creationLocked ? "Создание завершено" : "Завершение создания"}</b><span>{character.creationLocked ? "Развитие параметров теперь проходит через кнопку повышения." : "Зафиксируйте стартового героя, когда распределите пункты и выберете черты."}</span></div>
            {!character.creationLocked && <button type="button" disabled={!creationReady} onClick={lockCreation}>Зафиксировать героя</button>}
          </div>
          </div>
        </section>

        <section className={`preview-panel ${mobileView === "preview" ? "mobile-active" : ""}`}>
          <div className="preview-toolbar">
            <div><span className="live-dot" /> Живой предпросмотр</div>
            <p>2 страницы A4</p>
            <button onClick={() => setPrintRequested(true)}>PDF / печать</button>
          </div>

          <div className="sheet-stack">
            <article className="character-sheet sheet-one">
              <SheetOrnaments />
              <header className="sheet-header sheet-header-primary">
                <div className="sheet-header-portrait">
                  {character.portrait && character.printPortrait && <img style={{ objectPosition: `${character.portraitX}% ${character.portraitY}%`, transform: `scale(${character.portraitZoom / 100})` }} src={character.portrait} alt="" />}
                </div>
                <div className="sheet-title">
                  <small>ДОСЬЕ РЕКОНКИСТЫ / I</small>
                  <h2>{character.name || "ИМЯ ПЕРСОНАЖА"}</h2>
                  <p>{character.archetype || "Архетип не выбран"}</p>
                </div>
                <div className="sheet-brand"><b>Θ</b><span>ULTIMA<br />FORSAN</span></div>
              </header>

              <div className="sheet-rule"><span>REGNUM HOMINUM</span><i /><span>POST PLAGAM</span></div>

              <section className="identity-grid">
                <PrintLine label="Игрок" value={character.player} />
                <PrintLine label="Происхождение" value={character.origin} />
                <PrintLine label="Ранг / повышения" value={`${currentRank} / ${advances}`} />
                <PrintLine label="Возраст" value={character.age} />
              </section>

              <section className="sheet-section attributes-section">
                <h3><span>I</span> Характеристики</h3>
                <div className="print-attributes">
                  {ATTRIBUTE_META.map(({ key, label, abbr }) => (
                    <div key={key}>
                      <small>{abbr}</small>
                      <b>{label}</b>
                      <div className={`attribute-dice ${character.printDiceValues ? "" : "hide-die-values"}`} aria-label={`${label}: ${dieLabel(character.attributes[key])}`}>
                        {ATTRIBUTE_DICE.map((die) => (
                          <AttributeDie die={die} current={character.attributes[key] === die} key={die} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="combat-grid">
                <div className="combat-values">
                  <h3><span>II</span> Боевая готовность</h3>
                  <div className="big-stat-row">
                    <div><small>Защита</small><b>{parry}</b></div>
                    <div><small>Стойкость</small><b>{toughness}</b><em>({effectiveArmor})</em></div>
                    <div><small>Шаг</small><b>{character.pace}</b></div>
                    <div><small>Бег</small><b>{dieLabel(character.runningDie)}</b></div>
                    <div><small>Фишки</small><b>{character.bennies}</b></div>
                    <div className="blood-stat">
                      <small>Кровь</small>
                      <b>{character.purity === "Нечистый" ? "Нечистая" : "Норма"}</b>
                      <p>{character.purity === "Нечистый" ? "Иммунитет к Чуме · заразная кровь · 1 бесплатная черта" : "Обычный человек · 1 бесплатная черта при создании"}</p>
                    </div>
                  </div>
                  <div className="tracks">
                    <PipTrack count={3} label={`Ранения${character.wounds ? `: ${character.wounds}` : ""}`} />
                    <PipTrack count={3} label={`Усталость${character.fatigue ? `: ${character.fatigue}` : ""}`} />
                  </div>
                </div>
              </section>

              <section className="sheet-section skills-print first-page-skills">
                <h3><span>III</span> Навыки <small>{skillPoints}/{skillBudget} пунктов</small></h3>
                <div className="skills-print-grid">
                  {printSkills.map((skill) => (
                    <div key={skill.id}><span>{skill.name}</span><small>{ATTRIBUTE_META.find((item) => item.key === skill.attribute)?.abbr}</small><b>{dieLabel(skill.level)}</b></div>
                  ))}
                  {Array.from({ length: Math.max(0, 24 - printSkills.length) }).map((_, index) => <div className="blank-skill" key={`blank-${index}`}><span /><small /><b /></div>)}
                </div>
              </section>

              <div className="traits-print-grid">
                <section className={`sheet-section trait-list ${chosenEdgeCount > 8 ? "dense-list" : ""}`}>
                  <h3><span>IV</span> Черты</h3>
                  {character.edges.filter((item) => item.name).slice(0, 20).map((item) => <div key={item.id}><b>{item.name}</b><span>{item.note}</span></div>)}
                  {!character.edges.some((item) => item.name) && <p className="empty-print">Черты ещё не записаны</p>}
                </section>
                <section className="sheet-section trait-list hindrance-list">
                  <h3><span>V</span> Изъяны</h3>
                  {character.hindrances.filter((item) => item.name).slice(0, 8).map((item) => <div key={item.id}><b>{item.name} <em>{item.severity === "major" ? "К" : "М"}</em></b><span>{item.note}</span></div>)}
                  {!character.hindrances.some((item) => item.name) && <p className="empty-print">Изъяны ещё не записаны</p>}
                </section>
              </div>

              <footer className="sheet-footer"><span>Кости и Чернила</span><b>Θ</b><span>Лист I / {character.printExtraNotesPage ? "III" : "II"}</span></footer>
            </article>

            <article className="character-sheet sheet-two">
              <SheetOrnaments />
              <header className="sheet-header compact">
                <div className="folio">II</div>
                <div className="sheet-title"><small>ДОСЬЕ РЕКОНКИСТЫ / II</small><h2>{character.name || "ИМЯ ПЕРСОНАЖА"}</h2></div>
                <div className="sheet-brand"><b>Θ</b><span>ULTIMA<br />FORSAN</span></div>
              </header>

              <section className="sheet-section weapons-section second-page-weapons">
                <h3><span>VI</span> Оружие</h3>
                <table>
                  <thead><tr><th>Наименование</th><th>Дистанция</th><th>Урон</th><th>ББ</th><th>Боезапас</th></tr></thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, index) => {
                      const weapon = character.weapons[index];
                      return <tr key={index}><td>{weapon?.name || ""}</td><td>{weapon?.range || ""}</td><td>{weapon?.damage || ""}</td><td>{weapon?.ap || ""}</td><td>{weapon?.ammo || ""}</td></tr>;
                    })}
                  </tbody>
                </table>
              </section>

              <div className="language-gear-grid">
                <section className="sheet-section languages-print">
                  <h3><span>VII</span> Языки</h3>
                  <p>{character.languages || "-"}</p>
                  <small>Грамотность: есть, если не указан изъян</small>
                </section>
                <section className="sheet-section funds-print">
                  <h3><span>VIII</span> Средства</h3>
                  <strong>{character.florins || 0}</strong><p>флоринов</p>
                </section>
              </div>

              <section className="sheet-section gear-print">
                <h3><span>IX</span> Снаряжение, броня и припасы</h3>
                <p>{[...character.inventory.map((item) => `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`), character.gear].filter(Boolean).join("; ") || "-"}</p>
              </section>

              <section className="sheet-section magic-print">
                <h3><span>X</span> Мистика, рецепты и устройства <small>{character.powers.length}/8 записей · без ПС</small></h3>
                <div className="magic-tradition-strip">
                  {displayedArcaneTraditions.length ? displayedArcaneTraditions.map((tradition) => {
                    const traditionSkill = skills.find((skill) => skill.id === ARCANE_TRADITIONS[tradition].skillId);
                    return <span key={tradition}><b>{ARCANE_TRADITIONS[tradition].label}</b> · {traditionSkill?.name || "Навык"} {dieLabel(traditionSkill?.level || 0)}</span>;
                  }) : <span><b>Мистический дар не выбран</b> · место для будущих сил</span>}
                </div>
                <div className="magic-print-grid">
                  {Array.from({ length: 8 }).map((_, index) => {
                    const power = character.powers[index];
                    if (!power) return <article className="magic-print-empty" key={`magic-blank-${index}`}><b>Сила / рецепт / устройство</b><small>Традиция · активация · дистанция · длительность</small><p /></article>;
                    const guide = POWER_GUIDES.find((item) => item.id === power.guideId);
                    if (!guide) return null;
                    const activation = power.tradition === "alchemy"
                      ? `смесь ${power.recipeCost} фл. · готово ${power.prepared}`
                      : `${guide.cost === null ? "особая активация" : `проверка -${Math.floor(guide.cost / 2)}`}${power.tradition === "witchcraft" && power.active ? " · поддерживается" : ""}${power.tradition === "weird-science" && power.broken ? " · сломано" : ""}`;
                    return <article key={power.id}><header><b>{power.name}</b><em>{ARCANE_TRADITIONS[power.tradition].label}</em></header><small>{activation} · {guide.range} · {guide.duration}</small><p>{guide.detail}{power.trapping ? ` - ${power.trapping}` : ""}</p></article>;
                  })}
                </div>
              </section>

              <section className="appearance-print second-page-appearance">
                <h3><span>XI</span> Описание и приметы</h3>
                <div><p>{character.appearance || "Место для примет и слов очевидцев."}</p></div>
              </section>

              <section className="sheet-section biography-print">
                <h3><span>XII</span> Человек под маской</h3>
                <div>
                  <article><small>Родина и прошлое</small><p>{character.homeland || "-"}</p></article>
                  <article><small>Вера или убеждение</small><p>{character.belief || "-"}</p></article>
                  <article><small>Цель</small><p>{character.goal || "-"}</p></article>
                  <article><small>Страх или вина</small><p>{character.fear || "-"}</p></article>
                  <article><small>Отношение к Чуме</small><p>{character.plague || "-"}</p></article>
                  <article><small>Связи и долги</small><p>{character.bonds || "-"}</p></article>
                </div>
              </section>

              <div className="arcana-note-grid">
                <section className="sheet-section arcana-print"><h3>Дикий аркан</h3><p>{character.wildArcana || "-"}</p></section>
                <section className="sheet-section notes-print"><h3>Заметки</h3><p>{character.notes || ""}</p></section>
              </div>

              <section className="wound-log">
                <h3>Ранения, укусы и последствия</h3>
                <div>{Array.from({ length: 4 }).map((_, index) => <span key={index} />)}</div>
              </section>

              <footer className="sheet-footer"><span>SWADE - адаптация кампании</span><b>Θ</b><span>Лист II / {character.printExtraNotesPage ? "III" : "II"}</span></footer>
            </article>
            {character.printExtraNotesPage && <article className="character-sheet notes-page"><SheetOrnaments /><header className="sheet-header compact"><div className="folio">III</div><div className="sheet-title"><small>ПОЛЕВОЙ ЖУРНАЛ / III</small><h2>{character.name || "ИМЯ ПЕРСОНАЖА"}</h2></div><div className="sheet-brand"><b>Θ</b><span>ULTIMA<br />FORSAN</span></div></header><section><h3>Заметки, улики и долги</h3>{Array.from({ length: 28 }).map((_, index) => <i key={index} />)}</section><footer className="sheet-footer"><span>Кости и Чернила</span><b>Θ</b><span>Лист III / III</span></footer></article>}
          </div>
        </section>
      </div>

      {advanceOpen && (
        <div className="advance-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setAdvanceOpen(false)}>
          <section className="advance-modal" role="dialog" aria-modal="true" aria-labelledby="advance-title">
            <header>
              <div><small>ПОВЫШЕНИЕ №{Math.floor(advances) + 1}</small><h2 id="advance-title">Как изменился герой?</h2></div>
              <button type="button" aria-label="Закрыть окно повышения" onClick={() => setAdvanceOpen(false)}>×</button>
            </header>
            <p className="advance-rank-note">После повышения: <b>{rankFromAdvances(advances + 1)}</b>{rankFromAdvances(advances + 1) !== currentRank && <em> · новый ранг</em>}</p>
            <div className="advance-types" role="radiogroup" aria-label="Вид улучшения">
              {([
                ["edge", "Новая черта", "Выберите доступную черту нового ранга"],
                ["skills", "Повысить навыки", "Один навык не ниже характеристики или два ниже неё"],
                ["attribute", "Характеристика", "Одна ступень, обычно один раз за ранг"],
                ["hindrance", "Устранить изъян", "Уменьшить крупный или убрать мелкий"],
              ] as [AdvanceType, string, string][]).map(([type, title, description]) => (
                <button key={type} type="button" role="radio" aria-checked={advanceType === type} className={advanceType === type ? "active" : ""} onClick={() => { setAdvanceType(type); setAdvancePrimary(""); setAdvanceSecondary(""); setAdvanceError(""); }}>
                  <b>{title}</b><small>{description}</small>
                </button>
              ))}
            </div>

            <div className="advance-choice">
              {advanceType === "edge" && (
                <div className="advance-edge-picker">
                  <span>Черта</span>
                  <TraitGuideInput
                    kind="edge"
                    entry={{ id: "advance-edge", name: advancePrimary, note: "" }}
                    rank={rankFromAdvances(advances + 1)}
                    excludeNames={character.edges.filter((edge) => edge.name !== "Новые силы").map((edge) => edge.name)}
                    disableFutureRank
                    requirementIssues={(guide) => edgeRequirementIssues(guide, rankFromAdvances(advances + 1), character, skills)}
                    onChange={(patch) => {
                      setAdvancePrimary(patch.name ?? "");
                      setAdvanceError("");
                    }}
                  />
                </div>
              )}
              {advanceType === "skills" && (
                <>
                  <label><span>Первый навык</span><select value={advancePrimary} onChange={(event) => setAdvancePrimary(event.target.value)}><option value="">Выберите навык</option>{skills.filter((skill) => nextDie(skill.level)).map((skill) => <option value={skill.id} key={skill.id}>{skill.name}: {dieLabel(skill.level)} → {dieLabel(nextDie(skill.level) || skill.level)}</option>)}</select></label>
                  <label><span>Второй навык, если оба ниже характеристик</span><select value={advanceSecondary} onChange={(event) => setAdvanceSecondary(event.target.value)}><option value="">Не выбран</option>{skills.filter((skill) => skill.id !== advancePrimary && nextDie(skill.level) && skill.level < character.attributes[skill.attribute]).map((skill) => <option value={skill.id} key={skill.id}>{skill.name}: {dieLabel(skill.level)} → {dieLabel(nextDie(skill.level) || skill.level)}</option>)}</select></label>
                </>
              )}
              {advanceType === "attribute" && (
                <label><span>Характеристика</span><select value={advancePrimary} onChange={(event) => setAdvancePrimary(event.target.value)}><option value="">Выберите характеристику</option>{ATTRIBUTE_META.filter(({ key }) => nextDie(character.attributes[key])).map(({ key, label }) => <option value={key} key={key}>{label}: {dieLabel(character.attributes[key])} → {dieLabel(nextDie(character.attributes[key]) || character.attributes[key])}</option>)}</select></label>
              )}
              {advanceType === "hindrance" && (
                <label><span>Изъян</span><select value={advancePrimary} onChange={(event) => setAdvancePrimary(event.target.value)}><option value="">Выберите изъян</option>{character.hindrances.filter((item) => item.name).map((item) => <option value={item.id} key={item.id}>{item.name} — {item.severity === "major" ? "крупный → мелкий" : "устранить"}</option>)}</select></label>
              )}
            </div>

            {advanceError && <p className="advance-error" role="alert">{advanceError}</p>}
            <footer><button className="button ghost" type="button" onClick={() => setAdvanceOpen(false)}>Отмена</button><button className="button primary" type="button" onClick={applyAdvance}>Применить повышение</button></footer>
          </section>
        </div>
      )}
    </main>
  );
}
