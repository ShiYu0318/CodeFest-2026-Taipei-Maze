// SPDX-License-Identifier: AGPL-3.0-or-later
// Chinese copy follows the project's typography guide: a space between
// Chinese and Latin letters or numbers, full-width punctuation in Chinese.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import zh from "../src/i18n/messages/zh-TW.mjs";

const han = String.raw`\p{Script=Han}`;
const rules = [
  [new RegExp(`${han}[A-Za-z0-9]|[A-Za-z0-9%]${han}`, "u"), "needs a space"],
  [new RegExp(`${han}[,;:!?()]|[,;:!?(]${han}`, "u"), "half-width punctuation"],
];
const check = (text) =>
  rules
    .filter(([pattern]) => pattern.test(text.replace(/\{\w+\}/g, " ")))
    .map(([, why]) => why);

test("Traditional Chinese UI messages follow the typography guide", () => {
  const bad = Object.entries(zh)
    .map(([key, text]) => [key, text, check(text)])
    .filter(([, , why]) => why.length);
  assert.deepEqual(bad, []);
});

test("station names, descriptions and floor-plan labels follow the guide", () => {
  const strings = [];
  const collect = (value) => {
    if (typeof value === "string") strings.push(value);
    else if (value && typeof value === "object")
      Object.values(value).forEach(collect);
  };
  collect(
    JSON.parse(
      readFileSync(
        new URL("../src/views/station-points.json", import.meta.url),
        "utf8"
      )
    )
  );
  const plans = readFileSync(
    new URL("../src/views/station-floor-plans.mjs", import.meta.url),
    "utf8"
  );
  for (const [, text] of plans.matchAll(/"([^"\n]*)"/g)) strings.push(text);
  const bad = strings.filter(
    (text) => /\p{Script=Han}/u.test(text) && check(text).length
  );
  assert.deepEqual(bad, []);
});
