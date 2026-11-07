// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseStationLocationQuery,
  stationLocationQuery,
} from "../src/station/location-link.mjs";
import { stationPoints } from "../src/station/scan.mjs";
const data = JSON.parse(
  readFileSync(new URL("../src/views/station-points.json", import.meta.url))
);

test("all station links resolve the exact locally stored floor and coordinates", () => {
  for (const point of stationPoints(data)) {
    const query = stationLocationQuery(point.id, data, { display: "easy" });
    assert.equal(query.display, "easy");
    assert.deepEqual(parseStationLocationQuery(query, data), {
      type: "success",
      point,
    });
  }
  assert.equal(parseStationLocationQuery({}, data).type, "Browsing");
  assert.equal(
    parseStationLocationQuery({ point: "b1-e4" }, data).type,
    "success"
  );
});

test("malformed, repeated, unknown, disabled and incompatible point parameters are rejected", () => {
  for (const query of [
    { point: null },
    { point: "" },
    { point: ["b1-e4", "m-e4"] },
    { point: "b1-e4", v: ["1", "1"] },
    { point: "b1-e4", v: "2" },
    { point: " b1-e4" },
    { point: "missing" },
    { point: "../../file" },
  ])
    assert.notEqual(parseStationLocationQuery(query, data).type, "success");
  const disabled = structuredClone(data);
  disabled.points.B1[0].enabled = false;
  assert.equal(
    parseStationLocationQuery({ point: "b1-e4" }, disabled).type,
    "UnknownPoint"
  );
  assert.throws(() => stationLocationQuery("missing", data), RangeError);
});

test("query updates preserve other settings without mutating them or trusting supplied coordinates", () => {
  const query = {
    point: "old",
    v: "2",
    display: "easy",
    x: "999",
    floor: "B4",
  };
  const next = stationLocationQuery("b1-e4", data, query);
  assert.equal(query.point, "old");
  assert.equal(parseStationLocationQuery(next, data).point.x, 612);
  assert.equal(parseStationLocationQuery(next, data).point.floor, "B1");
  assert.deepEqual(stationLocationQuery(null, data, next), {
    display: "easy",
    x: "999",
    floor: "B4",
  });
});
