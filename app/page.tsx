"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Die = 0 | 4 | 6 | 8 | 10 | 12;
type AttributeKey = "agility" | "smarts" | "spirit" | "strength" | "vigor";
type RulesMode = "swade" | "setting";

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

type Weapon = {
  id: string;
  name: string;
  range: string;
  damage: string;
  ap: string;
  ammo: string;
};

type Character = {
  rulesMode: RulesMode;
  name: string;
  player: string;
  archetype: string;
  rank: string;
  advances: string;
  origin: string;
  age: string;
  purity: "Чистый" | "Нечистый";
  appearance: string;
  attributes: Record<AttributeKey, Die>;
  armor: number;
  size: number;
  pace: number;
  runningDie: Die;
  bennies: number;
  charisma: number;
  languages: string;
  edges: TraitEntry[];
  hindrances: TraitEntry[];
  weapons: Weapon[];
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
};

const ATTRIBUTE_META: { key: AttributeKey; label: string; abbr: string }[] = [
  { key: "agility", label: "Ловкость", abbr: "ЛВК" },
  { key: "smarts", label: "Смекалка", abbr: "СМК" },
  { key: "spirit", label: "Характер", abbr: "ХАР" },
  { key: "strength", label: "Сила", abbr: "СИЛ" },
  { key: "vigor", label: "Выносливость", abbr: "ВЫН" },
];

const DIE_OPTIONS: Die[] = [0, 4, 6, 8, 10, 12];

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

const BASE_SKILLS: Omit<Skill, "level">[] = [
  { id: "athletics", name: "Атлетика", attribute: "agility", core: true },
  { id: "notice", name: "Внимание", attribute: "smarts", core: true },
  { id: "common", name: "Осведомлённость", attribute: "smarts", core: true },
  { id: "stealth", name: "Скрытность", attribute: "agility", core: true },
  { id: "persuasion", name: "Убеждение", attribute: "spirit", core: true },
  { id: "academics", name: "Академические знания", attribute: "smarts" },
  { id: "alchemy", name: "Алхимия", attribute: "smarts" },
  { id: "riding", name: "Верховая езда", attribute: "agility" },
  { id: "faith", name: "Вера", attribute: "spirit" },
  { id: "battle", name: "Военное дело", attribute: "smarts" },
  { id: "thievery", name: "Воровство", attribute: "agility" },
  { id: "witchcraft", name: "Ведьмовство", attribute: "smarts" },
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
});

const createInitialSkills = (): Skill[] =>
  BASE_SKILLS.map((skill) => ({ ...skill, level: skill.core ? 4 : 0 }));

const createInitialCharacter = (): Character => ({
  rulesMode: "swade",
  name: "",
  player: "",
  archetype: "",
  rank: "Новичок",
  advances: "0",
  origin: "",
  age: "",
  purity: "Чистый",
  appearance: "",
  attributes: { agility: 4, smarts: 4, spirit: 4, strength: 4, vigor: 4 },
  armor: 0,
  size: 0,
  pace: 6,
  runningDie: 6,
  bennies: 3,
  charisma: 0,
  languages: "",
  edges: [blankEdge(), blankEdge(), blankEdge()],
  hindrances: [blankHindrance(), blankHindrance(), blankHindrance()],
  weapons: [blankWeapon(), blankWeapon(), blankWeapon()],
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
});

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

function skillCost(skill: Skill, attributes: Character["attributes"], mode: RulesMode) {
  const targetIndex = DIE_OPTIONS.indexOf(skill.level);
  if (targetIndex <= 0) return 0;
  const freeIndex = mode === "swade" && skill.core ? 1 : 0;
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

export default function Home() {
  const [character, setCharacter] = useState<Character>(() => createInitialCharacter());
  const [skills, setSkills] = useState<Skill[]>(() => createInitialSkills());
  const [mobileView, setMobileView] = useState<"form" | "preview">("form");
  const [printRequested, setPrintRequested] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ultima-forsan-character-v1");
      if (saved) {
        const parsed = JSON.parse(saved) as { character?: Character; skills?: Skill[] };
        if (parsed.character) setCharacter(parsed.character);
        if (parsed.skills) setSkills(parsed.skills);
      }
    } catch {
      // A damaged draft should never prevent the generator from opening.
    } finally {
      hydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(
      "ultima-forsan-character-v1",
      JSON.stringify({ character, skills }),
    );
  }, [character, skills]);

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

  const update = <K extends keyof Character>(key: K, value: Character[K]) => {
    setCharacter((current) => ({ ...current, [key]: value }));
  };

  const attributePoints = useMemo(
    () =>
      ATTRIBUTE_META.reduce((total, { key }) => {
        const raises = Math.max(0, DIE_OPTIONS.indexOf(character.attributes[key]) - 1);
        return total + raises * (character.purity === "Нечистый" && key === "vigor" ? 2 : 1);
      }, 0),
    [character.attributes, character.purity],
  );

  const skillPoints = useMemo(
    () =>
      skills.reduce(
        (total, skill) => total + skillCost(skill, character.attributes, character.rulesMode),
        0,
      ),
    [skills, character.attributes, character.rulesMode],
  );

  const skillBudget = character.rulesMode === "swade" ? 12 : 15;
  const hindrancePoints = character.hindrances.reduce(
    (total, item) => total + (item.name ? (item.severity === "major" ? 2 : 1) : 0),
    0,
  );
  const fighting = skills.find((skill) => skill.id === "fighting")?.level ?? 0;
  const parry = fighting === 0 ? 2 : 2 + halfDie(fighting);
  const toughness =
    2 + halfDie(character.attributes.vigor) + safeNumber(character.armor) + safeNumber(character.size);
  const languageAllowance = 1 + Math.floor(character.attributes.smarts / 2);
  const languageCount = character.languages
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean).length;
  const printSkills = skills.filter((skill) => skill.level > 0).slice(0, 24);

  const completion = [
    character.name,
    character.archetype,
    character.origin,
    character.languages,
    character.goal,
    character.fear,
    attributePoints <= 5 ? "ok" : "",
    skillPoints <= skillBudget ? "ok" : "",
  ].filter(Boolean).length;

  const updateSkill = (id: string, patch: Partial<Skill>) => {
    setSkills((current) =>
      current.map((skill) => (skill.id === id ? { ...skill, ...patch } : skill)),
    );
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
          ({ notice: 8, plague: 8, healing: 8, research: 6, persuasion: 6, fighting: 4, shooting: 6 } as Record<string, Die>)[skill.id] ??
          skill.level,
      })),
    );
  };

  const resetAll = () => {
    if (!window.confirm("Очистить анкету и начать заново?")) return;
    setCharacter(createInitialCharacter());
    setSkills(createInitialSkills());
    localStorage.removeItem("ultima-forsan-character-v1");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="theta" aria-hidden="true">Θ</span>
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
          <button className="button ghost" onClick={fillDemo}>Заполнить пример</button>
          <button className="button primary" onClick={() => setPrintRequested(true)}>
            Сохранить PDF
          </button>
        </div>
      </header>

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

      <div className="workspace">
        <section className={`form-panel ${mobileView === "form" ? "mobile-active" : ""}`}>
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
              <div className="rules-toggle">
                <button
                  className={character.rulesMode === "swade" ? "active" : ""}
                  onClick={() => update("rulesMode", "swade")}
                >
                  <strong>SWADE для кампании</strong>
                  <small>12 пунктов, 5 базовых навыков d4</small>
                </button>
                <button
                  className={character.rulesMode === "setting" ? "active" : ""}
                  onClick={() => update("rulesMode", "setting")}
                >
                  <strong>Книга Ultima Forsan</strong>
                  <small>15 пунктов, Харизма</small>
                </button>
              </div>
              <p className="rules-note">
                Книга сеттинга написана для предыдущей редакции. Режим SWADE аккуратно сохраняет
                особенности мира, но считает навыки по актуальной базе.
              </p>
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
                <label className="field">
                  <span>Ранг</span>
                  <select value={character.rank} onChange={(event) => update("rank", event.target.value)}>
                    {[
                      "Новичок", "Закалённый", "Ветеран", "Герой", "Легенда",
                    ].map((rank) => <option key={rank}>{rank}</option>)}
                  </select>
                </label>
                <Field label="Повышения" type="number" value={character.advances} onChange={(value) => update("advances", value)} />
                <Field label="Возраст" value={character.age} maxLength={16} onChange={(value) => update("age", value)} />
                <label className="field">
                  <span>Состояние крови</span>
                  <select value={character.purity} onChange={(event) => update("purity", event.target.value as Character["purity"])}>
                    <option>Чистый</option>
                    <option>Нечистый</option>
                  </select>
                </label>
              </div>
              {character.purity === "Нечистый" && (
                <div className="warning-box">
                  Нечистый невосприимчив к Чуме, заразен и обречён восстать после смерти.
                  Повышение Выносливости стоит 2 пункта за ступень.
                </div>
              )}
              <TextAreaField
                label="Внешность и приметы"
                value={character.appearance}
                onChange={(value) => update("appearance", value)}
                placeholder="Что запомнит свидетель? Одежда, шрамы, голос, запах, привычный жест..."
                maxLength={220}
              />
            </div>
          </details>

          <details open>
            <summary><span>02</span> Характеристики</summary>
            <div className="section-body">
              <div className={`budget ${attributePoints > 5 ? "over" : ""}`}>
                <div><span>Потрачено</span><strong>{attributePoints}</strong></div>
                <div className="budget-track"><i style={{ width: `${Math.min(100, (attributePoints / 5) * 100)}%` }} /></div>
                <b>из 5</b>
              </div>
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
              <div className="derived-grid">
                <div><span>Защита</span><strong>{parry}</strong><small>2 + 1/2 Драки</small></div>
                <div><span>Стойкость</span><strong>{toughness}</strong><small>с бронёй</small></div>
                <label><span>Броня</span><input type="number" value={character.armor} onChange={(event) => update("armor", safeNumber(event.target.value))} /></label>
                <label><span>Размер</span><input type="number" value={character.size} onChange={(event) => update("size", safeNumber(event.target.value))} /></label>
                <label><span>Шаг</span><input type="number" value={character.pace} onChange={(event) => update("pace", safeNumber(event.target.value, 6))} /></label>
                <label><span>Бег</span><DieSelect label="Кость бега" value={character.runningDie} allowUntrained={false} onChange={(value) => update("runningDie", value)} /></label>
                <label><span>Фишки</span><input type="number" value={character.bennies} onChange={(event) => update("bennies", safeNumber(event.target.value, 3))} /></label>
                {character.rulesMode === "setting" && (
                  <label><span>Харизма</span><input type="number" value={character.charisma} onChange={(event) => update("charisma", safeNumber(event.target.value))} /></label>
                )}
              </div>
            </div>
          </details>

          <details open>
            <summary><span>03</span> Навыки</summary>
            <div className="section-body">
              <div className={`budget ${skillPoints > skillBudget ? "over" : ""}`}>
                <div><span>Потрачено</span><strong>{skillPoints}</strong></div>
                <div className="budget-track"><i style={{ width: `${Math.min(100, (skillPoints / skillBudget) * 100)}%` }} /></div>
                <b>из {skillBudget}</b>
              </div>
              <div className="skills-head"><span>Навык</span><span>Связан с</span><span>Кость</span><span>Цена</span></div>
              <div className="skills-list">
                {skills.map((skill) => (
                  <div className="skill-row" key={skill.id}>
                    {skill.id.startsWith("custom-") ? (
                      <input aria-label="Название навыка" value={skill.name} onChange={(event) => updateSkill(skill.id, { name: event.target.value })} />
                    ) : (
                      <strong>{skill.name}{skill.core && character.rulesMode === "swade" ? <em>базовый</em> : null}</strong>
                    )}
                    <select aria-label={`Характеристика для ${skill.name}`} value={skill.attribute} onChange={(event) => updateSkill(skill.id, { attribute: event.target.value as AttributeKey })}>
                      {ATTRIBUTE_META.map((attribute) => <option key={attribute.key} value={attribute.key}>{attribute.abbr}</option>)}
                    </select>
                    <DieSelect label={`Уровень навыка ${skill.name}`} value={skill.level} onChange={(level) => updateSkill(skill.id, { level })} />
                    <span className="skill-cost">{skillCost(skill, character.attributes, character.rulesMode)}</span>
                    {skill.id.startsWith("custom-") && <button className="remove" aria-label="Удалить навык" onClick={() => setSkills((current) => current.filter((item) => item.id !== skill.id))}>×</button>}
                  </div>
                ))}
              </div>
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
            <div className="section-body split-entries">
              <div>
                <div className="entry-title"><h3>Черты</h3><small>обычно 1 бесплатная у человека</small></div>
                {character.edges.map((entry) => (
                  <div className="entry-row" key={entry.id}>
                    <input aria-label="Черта" value={entry.name} placeholder="Название" onChange={(event) => updateEntry<TraitEntry>("edges", entry.id, { name: event.target.value })} />
                    <input aria-label="Эффект черты" value={entry.note} placeholder="Краткий эффект" onChange={(event) => updateEntry<TraitEntry>("edges", entry.id, { note: event.target.value })} />
                    <button className="remove" aria-label="Удалить черту" onClick={() => removeEntry("edges", entry.id)}>×</button>
                  </div>
                ))}
                <button className="add-row" disabled={character.edges.length >= 6} onClick={() => update("edges", [...character.edges, blankEdge()])}>+ Добавить черту</button>
              </div>
              <div>
                <div className="entry-title"><h3>Изъяны</h3><small className={hindrancePoints > 4 ? "bad" : ""}>{hindrancePoints} пунктов, выгода максимум за 4</small></div>
                {character.hindrances.map((entry) => (
                  <div className="entry-row hindrance" key={entry.id}>
                    <input aria-label="Изъян" value={entry.name} placeholder="Название" onChange={(event) => updateEntry<TraitEntry>("hindrances", entry.id, { name: event.target.value })} />
                    <select aria-label="Тяжесть изъяна" value={entry.severity} onChange={(event) => updateEntry<TraitEntry>("hindrances", entry.id, { severity: event.target.value as TraitEntry["severity"] })}>
                      <option value="minor">Мелкий</option>
                      <option value="major">Крупный</option>
                    </select>
                    <input aria-label="Проявление изъяна" value={entry.note} placeholder="Как проявляется" onChange={(event) => updateEntry<TraitEntry>("hindrances", entry.id, { note: event.target.value })} />
                    <button className="remove" aria-label="Удалить изъян" onClick={() => removeEntry("hindrances", entry.id)}>×</button>
                  </div>
                ))}
                <button className="add-row" disabled={character.hindrances.length >= 6} onClick={() => update("hindrances", [...character.hindrances, blankHindrance()])}>+ Добавить изъян</button>
              </div>
            </div>
          </details>

          <details open>
            <summary><span>05</span> Оружие и снаряжение</summary>
            <div className="section-body">
              <div className="weapon-head"><span>Оружие</span><span>Дистанция</span><span>Урон</span><span>ББ</span><span>Боезапас</span></div>
              {character.weapons.map((weapon) => (
                <div className="weapon-row" key={weapon.id}>
                  {(["name", "range", "damage", "ap", "ammo"] as (keyof Weapon)[]).map((key) => (
                    <input key={key} aria-label={`${key} оружия`} value={weapon[key]} onChange={(event) => updateEntry<Weapon>("weapons", weapon.id, { [key]: event.target.value })} />
                  ))}
                  <button className="remove" aria-label="Удалить оружие" onClick={() => removeEntry("weapons", weapon.id)}>×</button>
                </div>
              ))}
              <button className="add-row" disabled={character.weapons.length >= 5} onClick={() => update("weapons", [...character.weapons, blankWeapon()])}>+ Добавить оружие</button>
              <div className="field-grid money-grid">
                <Field label="Осталось флоринов" value={character.florins} maxLength={16} onChange={(value) => update("florins", value)} />
              </div>
              <TextAreaField label="Снаряжение, броня и припасы" value={character.gear} onChange={(value) => update("gear", value)} maxLength={520} placeholder="Маска, инструменты, броня, лекарства, реликвии..." />
            </div>
          </details>

          <details open>
            <summary><span>06</span> Человек под маской</summary>
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
        </section>

        <section className={`preview-panel ${mobileView === "preview" ? "mobile-active" : ""}`}>
          <div className="preview-toolbar">
            <div><span className="live-dot" /> Живой предпросмотр</div>
            <p>2 страницы A4</p>
            <button onClick={() => setPrintRequested(true)}>PDF / печать</button>
          </div>

          <div className="sheet-stack">
            <article className="character-sheet sheet-one">
              <div className="sheet-crop top-left" /><div className="sheet-crop top-right" />
              <header className="sheet-header">
                <div className="sheet-brand"><b>Θ</b><span>ULTIMA<br />FORSAN</span></div>
                <div className="sheet-title">
                  <small>ДОСЬЕ РЕКОНКИСТЫ / I</small>
                  <h2>{character.name || "ИМЯ ПЕРСОНАЖА"}</h2>
                  <p>{character.archetype || "Архетип не выбран"}</p>
                </div>
                <div className="sheet-seal"><span>{character.purity === "Чистый" ? "C" : "N"}</span><small>{character.purity}</small></div>
              </header>

              <div className="sheet-rule"><span>REGNUM HOMINUM</span><i /><span>POST PLAGAM</span></div>

              <section className="identity-grid">
                <PrintLine label="Игрок" value={character.player} />
                <PrintLine label="Происхождение" value={character.origin} />
                <PrintLine label="Ранг" value={`${character.rank} / ${character.advances || 0}`} />
                <PrintLine label="Возраст" value={character.age} />
              </section>

              <section className="sheet-section attributes-section">
                <h3><span>I</span> Характеристики</h3>
                <div className="print-attributes">
                  {ATTRIBUTE_META.map(({ key, label, abbr }) => (
                    <div key={key}><small>{abbr}</small><b>{dieLabel(character.attributes[key])}</b><span>{label}</span></div>
                  ))}
                </div>
              </section>

              <section className="combat-grid">
                <div className="combat-values">
                  <h3><span>II</span> Боевая готовность</h3>
                  <div className="big-stat-row">
                    <div><small>Защита</small><b>{parry}</b></div>
                    <div><small>Стойкость</small><b>{toughness}</b><em>({character.armor})</em></div>
                    <div><small>Шаг</small><b>{character.pace}</b></div>
                    <div><small>Бег</small><b>{dieLabel(character.runningDie)}</b></div>
                    <div><small>Фишки</small><b>{character.bennies}</b></div>
                    {character.rulesMode === "setting" && <div><small>Харизма</small><b>{character.charisma >= 0 ? `+${character.charisma}` : character.charisma}</b></div>}
                  </div>
                  <div className="tracks">
                    <PipTrack count={3} label="Ранения" />
                    <PipTrack count={3} label="Усталость" />
                  </div>
                </div>
                <div className="blood-note">
                  <small>СОСТОЯНИЕ КРОВИ</small>
                  <strong>{character.purity}</strong>
                  <p>{character.purity === "Нечистый" ? "Иммунитет к Чуме. Заразная кровь. После смерти восстанет." : "Обычный человек. Одна бесплатная черта при создании."}</p>
                </div>
              </section>

              <section className="sheet-section weapons-section">
                <h3><span>III</span> Оружие</h3>
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

              <div className="traits-print-grid">
                <section className="sheet-section trait-list">
                  <h3><span>IV</span> Черты</h3>
                  {character.edges.filter((item) => item.name).slice(0, 6).map((item) => <div key={item.id}><b>{item.name}</b><span>{item.note}</span></div>)}
                  {!character.edges.some((item) => item.name) && <p className="empty-print">Черты ещё не записаны</p>}
                </section>
                <section className="sheet-section trait-list hindrance-list">
                  <h3><span>V</span> Изъяны</h3>
                  {character.hindrances.filter((item) => item.name).slice(0, 6).map((item) => <div key={item.id}><b>{item.name} <em>{item.severity === "major" ? "К" : "М"}</em></b><span>{item.note}</span></div>)}
                  {!character.hindrances.some((item) => item.name) && <p className="empty-print">Изъяны ещё не записаны</p>}
                </section>
              </div>

              <section className="appearance-print">
                <h3>ОПИСАНИЕ И ПРИМЕТЫ</h3>
                <p>{character.appearance || "Место для портрета, примет и слов очевидцев."}</p>
              </section>

              <footer className="sheet-footer"><span>Кости и Чернила</span><b>Θ</b><span>Лист I / II</span></footer>
            </article>

            <article className="character-sheet sheet-two">
              <div className="sheet-crop top-left" /><div className="sheet-crop top-right" />
              <header className="sheet-header compact">
                <div className="sheet-brand"><b>Θ</b><span>ULTIMA<br />FORSAN</span></div>
                <div className="sheet-title"><small>ДОСЬЕ РЕКОНКИСТЫ / II</small><h2>{character.name || "ИМЯ ПЕРСОНАЖА"}</h2></div>
                <div className="folio">II</div>
              </header>

              <section className="sheet-section skills-print">
                <h3><span>VI</span> Навыки <small>{skillPoints}/{skillBudget} пунктов</small></h3>
                <div className="skills-print-grid">
                  {printSkills.map((skill) => (
                    <div key={skill.id}><span>{skill.name}</span><small>{ATTRIBUTE_META.find((item) => item.key === skill.attribute)?.abbr}</small><b>{dieLabel(skill.level)}</b></div>
                  ))}
                  {Array.from({ length: Math.max(0, 12 - printSkills.length) }).map((_, index) => <div className="blank-skill" key={`blank-${index}`}><span /><small /><b /></div>)}
                </div>
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
                <p>{character.gear || "-"}</p>
              </section>

              <section className="sheet-section biography-print">
                <h3><span>X</span> Человек под маской</h3>
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

              <footer className="sheet-footer"><span>{character.rulesMode === "swade" ? "SWADE - адаптация" : "Правила книги сеттинга"}</span><b>Θ</b><span>Лист II / II</span></footer>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
