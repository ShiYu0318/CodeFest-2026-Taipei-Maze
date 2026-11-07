// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createI18n } from "../src/i18n/index.mjs";
import { stationPoints } from "../src/station/scan.mjs";
import { answerLocally } from "../src/chat/answers.mjs";
import { chunkText, streamLocalAnswer } from "../src/chat/stream.mjs";

const data = JSON.parse(
  readFileSync(new URL("../src/views/station-points.json", import.meta.url))
);
const points = stationPoints(data);
const i18n = (code) => {
  const value = createI18n({ storage: () => undefined, languages: [] });
  value.setLocale(code);
  return value;
};
const collect = async (iterable) => {
  const events = [];
  for await (const event of iterable) events.push(event);
  return events;
};
const instant = { wait: async () => {} };

test("chunks never split a Thai or emoji grapheme and rejoin exactly", () => {
  for (const text of [
    "ที่นี่มีห้องน้ำ ไปทางซ้ายแล้วเลี้ยวขวา",
    "找到 8 處廁所，點一下就能在地圖上看到：",
    "👩‍👩‍👧 family room 😀",
  ]) {
    const chunks = chunkText(text, 3);
    assert.equal(chunks.join(""), text);
    for (const chunk of chunks) assert.ok(!/^[ัิ-ฺ็-๎‍]/u.test(chunk));
  }
});

test("a facility answer streams real steps, then text, then the places", async () => {
  const value = i18n("en");
  const answer = answerLocally("Where is the toilet?", points, value);
  const events = await collect(streamLocalAnswer(answer, value, instant));
  const kinds = events.map((event) => event.type);
  assert.equal(kinds[0], "thinking");
  assert.equal(kinds.at(-1), "done");
  const firstDelta = kinds.indexOf("delta");
  assert.ok(firstDelta > 0);
  assert.ok(kinds.slice(firstDelta, -1).every((kind) => kind === "delta"));
  const steps = events.filter((event) => event.type === "thinking");
  const restroomCount = points.filter((point) =>
    [point.type].flat().includes("restroom")
  ).length;
  assert.ok(
    steps.some((event) =>
      event.step.label.includes(`${restroomCount} Restroom`)
    )
  );
  assert.ok(
    steps.every((event) => ["active", "done"].includes(event.step.state))
  );
  const text = events
    .filter((event) => event.type === "delta")
    .map((event) => event.text)
    .join("");
  assert.equal(text, answer.text);
  assert.deepEqual(events.at(-1).places, answer.places);
});

test("every step that starts also finishes before the answer text", async () => {
  const value = i18n("vi");
  const answer = answerLocally("Tôi bị lạc", points, value);
  const events = await collect(streamLocalAnswer(answer, value, instant));
  const firstDelta = events.findIndex((event) => event.type === "delta");
  const before = events
    .slice(0, firstDelta)
    .filter((e) => e.type === "thinking");
  const ids = new Set(before.map((event) => event.step.id));
  for (const id of ids)
    assert.ok(
      before.some((e) => e.step.id === id && e.step.state === "done"),
      id
    );
});

test("streaming stops quietly when aborted", async () => {
  const value = i18n("zh-TW");
  const answer = answerLocally("廁所", points, value);
  const controller = new AbortController();
  const events = [];
  for await (const event of streamLocalAnswer(answer, value, {
    ...instant,
    signal: controller.signal,
  })) {
    events.push(event);
    if (event.type === "delta") controller.abort();
  }
  assert.equal(events.filter((event) => event.type === "delta").length, 1);
  assert.ok(!events.some((event) => event.type === "done"));
});
