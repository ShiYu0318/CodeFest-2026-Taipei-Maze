// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateStationData } from "../src/station/validate.mjs";

const read = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const points = read("../src/views/station-points.json");
const connections = read("../src/views/station-connections.json");
const clone = (value) => JSON.parse(JSON.stringify(value));

test("the shipped station map data passes every rule", () => {
  assert.deepEqual(validateStationData(points, connections), []);
});

test("1F contains only the facilities represented on its reference plan", () => {
  const counts = {};
  for (const point of points.points["1F"]) {
    counts[point.type] = (counts[point.type] ?? 0) + 1;
    assert.equal(point.zone, "1f-hall");
  }
  assert.deepEqual(counts, {
    elevator: 4,
    restroom: 4,
    nursing: 1,
    info: 4,
    ticket: 4,
    stairs: 7,
    escalator: 12,
  });
  assert.ok(
    connections.connections.every(
      ({ from, to }) => from.floor !== "1F" && to.floor !== "1F"
    )
  );
});

test("duplicate ids, unknown zones and broken coordinates are reported", () => {
  const p = clone(points);
  p.points.B1.push({ ...p.points.B1[0] });
  p.points.B2[0].zone = "nowhere";
  p.points.B3[0].x = "12";
  p.points.B4[0].type = "spaceship";
  const issues = validateStationData(p, connections);
  assert.ok(issues.some((i) => i.includes("duplicate point id")));
  assert.ok(issues.some((i) => i.includes("unknown zone")));
  assert.ok(issues.some((i) => i.includes("coordinates")));
  assert.ok(issues.some((i) => i.includes("unknown type spaceship")));
});

test("a point must sit in a zone of its own floor", () => {
  const p = clone(points);
  p.points.B1[0].zone = "b4-platform";
  assert.ok(
    validateStationData(p, connections).some((i) => i.includes("floor B4"))
  );
});

test("connections must link existing points on the stated floors and zones", () => {
  const c = clone(connections);
  c.connections[0].to.pointId = "ghost";
  c.connections[1].from.floor = "B4";
  c.connections[2].from.zone = "b3-red";
  c.connections.push({ ...c.connections[3] });
  const issues = validateStationData(points, c);
  assert.ok(issues.some((i) => i.includes("ghost")));
  assert.ok(issues.some((i) => i.includes("not on B4")));
  assert.ok(issues.some((i) => i.includes("zone mismatch")));
  assert.ok(issues.some((i) => i.includes("duplicate connection id")));
});

test("only elevators may be marked wheelchair accessible", () => {
  const c = clone(connections);
  const stairs = c.connections.find((item) => item.type !== "elevator");
  stairs.wheelchairAccessible = true;
  assert.ok(
    validateStationData(points, c).some((i) => i.includes("wheelchair"))
  );
});

test("unknown status values and schema versions are rejected", () => {
  const c = clone(connections);
  c.schemaVersion = 99;
  c.connections[0].typeStatus = "probably";
  c.connections[1].direction = "sideways";
  const issues = validateStationData(points, c);
  assert.ok(issues.some((i) => i.includes("schemaVersion")));
  assert.ok(issues.some((i) => i.includes("typeStatus probably")));
  assert.ok(issues.some((i) => i.includes("direction sideways")));
});
