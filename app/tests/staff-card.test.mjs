// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { createI18n } from "../src/i18n/index.mjs";
import { staffCard } from "../src/staff/staff-card.mjs";

const lift = {
  id: "b1-e4",
  floor: "B1",
  name: "4 號無障礙電梯",
  type: "elevator",
};
const i18n = (code) => {
  const value = createI18n({ storage: () => undefined, languages: [] });
  value.setLocale(code);
  return value;
};

test("the staff side is always Traditional Chinese with the on-site name", () => {
  const card = staffCard(lift, { stepFree: false }, i18n("vi"));
  assert.equal(card.floor, "B1 地下一樓");
  assert.deepEqual(card.chinese, [
    "請問「4 號無障礙電梯」怎麼走？",
    "我不太會說中文，謝謝您！",
  ]);
  assert.equal(card.icon, "elevator");
});

test("the visitor sees the same request in their own language", () => {
  const card = staffCard(lift, { stepFree: true }, i18n("en"));
  assert.equal(card.chinese[1], "我需要無障礙路線，不能走樓梯。");
  assert.deepEqual(card.visitor, [
    "How do I get to Elevator 4?",
    "I need a step-free route — I can't use stairs.",
    "I don't speak Chinese well. Thank you!",
  ]);
  assert.equal(card.visitorLang, "en");
});

test("Chinese readers get no duplicate translation", () => {
  const card = staffCard(lift, { stepFree: true }, i18n("zh-TW"));
  assert.deepEqual(card.visitor, []);
  assert.deepEqual(card.chinese, [
    "請問「4 號無障礙電梯」怎麼走？",
    "我需要無障礙路線，不能走樓梯。",
    "謝謝您！",
  ]);
});

test("array types use the first type for the pictogram", () => {
  const card = staffCard(
    { ...lift, type: ["restroom", "accessible"] },
    {},
    i18n("ja")
  );
  assert.equal(card.icon, "restroom");
});
