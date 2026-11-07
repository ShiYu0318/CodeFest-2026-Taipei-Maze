// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createI18n } from "../src/i18n/index.mjs";
import { placeCodes, placeLabel, placeName } from "../src/i18n/places.mjs";

const data = JSON.parse(
  readFileSync(new URL("../src/views/station-points.json", import.meta.url))
);
const point = (name, type) => ({ name, type });
const i18n = (code) => {
  const value = createI18n({ storage: () => undefined, languages: [] });
  value.setLocale(code);
  return value;
};

test("codes keep sign identifiers: numbers, exit and area letters", () => {
  assert.deepEqual(placeCodes("4 號無障礙電梯"), ["4"]);
  assert.deepEqual(placeCodes("M4 出入口電扶梯"), ["M4"]);
  assert.deepEqual(placeCodes("M3／M8 方向梯口"), ["M3", "M8"]);
  assert.deepEqual(placeCodes("K 區入口梯口（中）"), ["K"]);
  assert.deepEqual(placeCodes("淡水信義線電扶梯（往 B3）"), ["B3"]);
  assert.deepEqual(placeCodes("哺集乳室"), []);
});

test("Traditional Chinese keeps the original station name", () => {
  const zh = i18n("zh-TW");
  assert.equal(
    placeName(point("4 號無障礙電梯", "elevator"), zh),
    "4 號無障礙電梯"
  );
  assert.equal(
    placeLabel(point("4 號無障礙電梯", "elevator"), zh),
    "4 號無障礙電梯"
  );
});

test("other languages show the translated type, sign codes and the on-site name", () => {
  const en = i18n("en");
  const lift = point("4 號無障礙電梯", "elevator");
  assert.equal(placeName(lift, en), "Elevator 4");
  assert.equal(placeLabel(lift, en), "Elevator 4 (4 號無障礙電梯)");
  assert.equal(
    placeName(point("M3／M8 方向梯口", "stairway"), en),
    "Floor access M3/M8"
  );
  assert.equal(placeName(point("哺集乳室", "nursing"), i18n("ja")), "授乳室");
  assert.equal(
    placeName(point("x", ["restroom", "accessible"]), en),
    "Restroom"
  );
  assert.equal(placeName(point("神秘點", "unknown"), en), "神秘點");
});

test("every shipped point gets a non-empty name in every language", () => {
  const all = Object.values(data.points).flat();
  for (const code of ["en", "vi", "id", "th", "ko", "ja"]) {
    const value = i18n(code);
    for (const item of all) {
      const name = placeName(item, value);
      assert.ok(name && !name.includes("type."), `${code} ${item.id}`);
    }
  }
});
