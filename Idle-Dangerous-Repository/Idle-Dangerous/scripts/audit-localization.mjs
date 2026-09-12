import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "../node_modules/typescript/lib/typescript.js";

const projectRoot = join(import.meta.dirname, "..");
const sourceRoot = join(projectRoot, "src");
const localePath = join(sourceRoot, "game", "localization.tsx");
const cyrillic = /[А-Яа-яЁё]/;
// Native locale names stay in their own language by design. The compact
// Russian seconds suffix is intentionally transliterated to the standard "s",
// and the compass letter is rendered directly as С/N from Game.tsx.
const deliberateLocaleLiterals = new Set(["Русский", "с", "С"]);

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function variableInitializer(sourceFile, name) {
  let result = null;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) result = node.initializer ?? null;
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return result;
}

const localeSource = readFileSync(localePath, "utf8");
const localeFile = ts.createSourceFile(localePath, localeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const exact = new Map();
const phrases = [];
const exactInitializer = variableInitializer(localeFile, "EXACT_ENGLISH");
const phraseInitializer = variableInitializer(localeFile, "PHRASE_ENGLISH");

if (exactInitializer && ts.isObjectLiteralExpression(exactInitializer)) {
  for (const property of exactInitializer.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isStringLiteralLike(property.name) || !ts.isStringLiteralLike(property.initializer)) continue;
    exact.set(property.name.text, property.initializer.text);
  }
}
if (phraseInitializer && ts.isArrayLiteralExpression(phraseInitializer)) {
  for (const item of phraseInitializer.elements) {
    if (!ts.isArrayLiteralExpression(item) || item.elements.length < 2) continue;
    const [russian, english] = item.elements;
    if (ts.isStringLiteralLike(russian) && ts.isStringLiteralLike(english)) phrases.push([russian.text, english.text]);
  }
}

const replacements = [...phrases, ...exact.entries()].sort((first, second) => second[0].length - first[0].length);

function untranslatedFragments(value) {
  if (!cyrillic.test(value)) return [];
  const trimmed = value.trim();
  let translated = exact.has(trimmed) ? value.replace(trimmed, exact.get(trimmed)) : value;
  for (const [russian, english] of replacements) translated = translated.replaceAll(russian, english);
  return translated.match(/[А-Яа-яЁё]+/g) ?? [];
}

const missing = new Map();
for (const path of sourceFiles(sourceRoot)) {
  if (path === localePath) continue;
  const source = readFileSync(path, "utf8");
  const kind = path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind);
  function visit(node) {
    const isText = ts.isStringLiteralLike(node)
      || node.kind === ts.SyntaxKind.TemplateHead
      || node.kind === ts.SyntaxKind.TemplateMiddle
      || node.kind === ts.SyntaxKind.TemplateTail
      || node.kind === ts.SyntaxKind.JsxText;
    if (isText && typeof node.text === "string") {
      if (deliberateLocaleLiterals.has(node.text.trim())) {
        ts.forEachChild(node, visit);
        return;
      }
      const fragments = untranslatedFragments(node.text);
      if (fragments.length) {
        const location = file.getLineAndCharacterOfPosition(node.getStart(file));
        const key = `${relative(projectRoot, path)}:${location.line + 1}:${location.character + 1}`;
        missing.set(key, { text: node.text.trim().replace(/\s+/g, " "), fragments: [...new Set(fragments)] });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
}

if (missing.size) {
  console.error("Missing explicit English localization:\n");
  for (const [location, item] of missing) console.error(`${location}  ${item.fragments.join(", ")}  ←  ${item.text}`);
  process.exitCode = 1;
} else {
  console.log("Localization audit passed: every Cyrillic source fragment has an explicit English mapping.");
}
