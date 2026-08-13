import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("character generator contains the printable flow and SWADE safeguards", async () => {
  const [page, css, layout] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);

  assert.match(layout, /lang="ru"/);
  assert.match(layout, /Лист персонажа Ultima Forsan/);
  assert.match(page, /window\.print\(\)/);
  assert.match(page, /localStorage/);
  assert.match(page, /Книга Ultima Forsan/);
  assert.match(page, /SWADE для кампании/);
  assert.match(page, /skillBudget = character\.rulesMode === "swade" \? 12 : 15/);
  assert.match(css, /@page \{ size: A4 portrait; margin: 0; \}/);
  assert.match(css, /@media print/);
  assert.doesNotMatch(page, /_sites-preview|react-loading-skeleton|codex-preview/);
});
