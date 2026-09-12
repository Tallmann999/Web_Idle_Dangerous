import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const gameSource = await readFile(new URL("../src/game/Game.tsx", import.meta.url), "utf8");
const localeSource = await readFile(new URL("../src/game/localization.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../src/styles/game.css", import.meta.url), "utf8");

test("English is the default language while an explicit Russian choice persists", () => {
  assert.match(localeSource, /if \(typeof window === "undefined"\) return "en"/);
  assert.match(localeSource, /readLocalStorage\(LANGUAGE_STORAGE_KEY\) === "ru" \? "ru" : "en"/);
  assert.match(localeSource, /writeLocalStorage\(LANGUAGE_STORAGE_KEY, language\)/);
});

test("start screen and settings open the same reusable language dialog", () => {
  assert.match(gameSource, /function LanguageModal/);
  assert.match(gameSource, /className="start-language-button"/);
  assert.match(gameSource, /className="settings-language-button"/);
  assert.equal((gameSource.match(/<LanguageModal language=\{language\}/g) ?? []).length, 2);
  assert.match(cssSource, /\.language-modal \{[^}]*width:\s*min\(50vw, 620px\)/);
  assert.match(gameSource, /className="start-language-button"[^>]*>[\s\S]*?<strong>ВЫБОР ЯЗЫКА<\/strong>/);
  assert.ok(localeSource.includes('["ВЫБОР ЯЗЫКА", "CHOOSE LANGUAGE"]'));
});

test("new navigation copy exists in both supported languages", () => {
  assert.match(gameSource, /className="whole-world-button"[^>]*>МИР<\/button>/);
  assert.ok(localeSource.includes('["МИР", "WORLD"]'));
  assert.ok(localeSource.includes("Ten eyes attack from every direction for 12 seconds."));
  assert.match(localeSource, /key=\{language\}/);
});

test("language list uses round country flags and keeps native language names", async () => {
  await access(new URL("../public/art/flags/en.svg", import.meta.url));
  await access(new URL("../public/art/flags/ru.svg", import.meta.url));
  assert.match(gameSource, /data-no-localize>/);
  assert.match(gameSource, /name: "English"/);
  assert.match(gameSource, /name: "Русский"/);
  assert.match(cssSource, /\.language-list img \{[^}]*border-radius:\s*50%/);
});

test("the English catalog covers gameplay names, abilities and player-facing descriptions", () => {
  for (const pair of [
    '"Сумрачный лес": "Twilight Forest"',
    '"Пушка Бездны": "Void Cannon"',
    '"Крит": "Critical Surge"',
    '"Морана Гнилых Рощ": "Morana of the Rotten Groves"',
    '"Хранитель сумрачных корней": "Guardian of Twilight Roots"',
    '"Даёт ручным выстрелам 2% шанс нанести критический урон ×2.": "Gives manual shots a 2% chance to deal ×2 critical damage."',
  ]) assert.ok(localeSource.includes(pair), `missing localization: ${pair}`);
  assert.match(localeSource, /MutationObserver/);
  assert.match(localeSource, /LOCALIZED_ATTRIBUTES = \["aria-label", "title", "placeholder"\]/);
  assert.match(localeSource, /SORTED_PHRASE_ENGLISH = \[\.\.\.PHRASE_ENGLISH\]\.sort/);
  assert.match(localeSource, /for \(const \[russian, english\] of SORTED_PHRASE_ENGLISH\)/);
});
