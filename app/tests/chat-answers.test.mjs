// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createI18n } from "../src/i18n/index.mjs";
import { stationPoints } from "../src/station/scan.mjs";
import {
  answerLocally,
  detectTopic,
  detectType,
} from "../src/chat/answers.mjs";

const data = JSON.parse(
  readFileSync(new URL("../src/views/station-points.json", import.meta.url))
);
const points = stationPoints(data);
const i18n = (code) => {
  const value = createI18n({ storage: () => undefined, languages: [] });
  value.setLocale(code);
  return value;
};

test("facility questions are recognised in all seven languages", () => {
  for (const question of [
    "廁所在哪裡？",
    "洗手間",
    "Where is the toilet?",
    "Nhà vệ sinh ở đâu?",
    "Di mana toilet?",
    "ห้องน้ำอยู่ที่ไหน",
    "화장실 어디예요?",
    "トイレはどこですか",
  ])
    assert.equal(detectType(question), "restroom", question);
  assert.equal(detectType("I need an elevator"), "elevator");
  assert.equal(detectType("エレベーターはどこ"), "elevator");
  assert.equal(detectType("哪裡可以買票"), "ticket");
  assert.equal(detectType("今天天氣如何"), null);
});

test("facility answers list real places with the floor and a map action", () => {
  const answer = answerLocally(
    "Where is the toilet on B2?",
    points,
    i18n("en")
  );
  assert.equal(answer.kind, "places");
  assert.ok(answer.places.length >= 1);
  assert.ok(answer.places.every((place) => place.floor === "B2"));
  const ids = new Set(points.map((point) => point.id));
  assert.ok(answer.places.every((place) => ids.has(place.id)));
  assert.match(answer.text, /Restroom/);
  assert.match(answer.places[0].label, /\(廁所/);
});

test("answers are capped and sorted by floor", () => {
  const answer = answerLocally("電梯", points, i18n("zh-TW"));
  assert.ok(answer.places.length <= 5);
  const floors = answer.places.map((place) => place.floor);
  assert.deepEqual(floors, [...floors].sort());
  assert.ok(answer.total >= answer.places.length);
});

test("a known type with nothing on that floor says so honestly", () => {
  const answer = answerLocally("B4 nursing room", points, i18n("en"));
  assert.equal(answer.kind, "places");
  assert.equal(answer.places.length, 0);
  assert.match(answer.text, /No|no/);
});

test("how-to questions get a fixed answer in the visitor's language", () => {
  assert.equal(detectTopic("怎麼掃描 QR 定位？"), "scan");
  assert.equal(detectTopic("I use a wheelchair"), "stepFree");
  assert.equal(detectTopic("我迷路了"), "lost");
  assert.equal(detectTopic("Where is the exit?"), "exit");
  assert.equal(detectTopic("Can someone help me?"), "staff");
  assert.equal(detectTopic("how do I change the language"), "language");
  assert.equal(detectTopic("字太小看不清楚"), "display");
  assert.equal(detectTopic("Is my data sent online?"), "privacy");
  const vi = answerLocally("Tôi bị lạc", points, i18n("vi"));
  assert.equal(vi.kind, "faq");
  assert.equal(vi.text, i18n("vi").t("chat.answer.lost"));
});

test("greetings and thanks are answered; unknown questions are left to the model", () => {
  assert.equal(answerLocally("你好", points, i18n("zh-TW")).kind, "greeting");
  assert.equal(answerLocally("Thank you!", points, i18n("en")).kind, "thanks");
  assert.equal(
    answerLocally("Tell me a joke about cats", points, i18n("en")),
    null
  );
});

test("facility words win over topic words so 'wheelchair elevator' lists elevators", () => {
  assert.equal(
    answerLocally("wheelchair elevator", points, i18n("en")).kind,
    "places"
  );
});

test("places on the visitor's current floor come first", () => {
  const answer = answerLocally("toilet", points, i18n("en"), {
    nearFloor: "B3",
  });
  const floors = answer.places.map((place) => place.floor);
  const firstOther = floors.findIndex((floor) => floor !== "B3");
  assert.ok(floors.includes("B3"));
  assert.ok(floors.slice(firstOther).every((floor) => floor !== "B3"));
});
