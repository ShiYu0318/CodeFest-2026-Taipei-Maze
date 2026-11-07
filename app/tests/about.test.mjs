// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describeBuild, summarizeStationData } from "../src/about/about.mjs";

const read = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

test("station data summary is derived from the shipped data, not hardcoded", () => {
  const summary = summarizeStationData(
    read("../src/views/station-points.json"),
    read("../src/views/station-connections.json")
  );
  assert.equal(summary.points, 137);
  assert.deepEqual(summary.floors, ["B1", "B2", "B3", "B4"]);
  assert.equal(summary.connections, 19);
  assert.equal(summary.unverifiedConnections, 8);
  assert.equal(summary.walkingNetwork, false);
});

test("summary counts unknown statuses as unverified and tolerates empty data", () => {
  const summary = summarizeStationData(
    { points: { B1: [{ id: "a" }] } },
    {
      connections: [
        { id: "x" },
        { id: "y", typeStatus: "verified" },
        { id: "z", typeStatus: "surprise" },
      ],
    }
  );
  assert.equal(summary.unverifiedConnections, 1);
  assert.deepEqual(summarizeStationData({}, {}), {
    points: 0,
    floors: [],
    connections: 0,
    unverifiedConnections: 0,
    walkingNetwork: false,
  });
});

test("build description shortens a commit and never invents a version", () => {
  assert.deepEqual(
    describeBuild({
      commit: "0e2d7d01e6f1656e3ff2b2c27b56636db6859c10",
      date: "2026-11-07",
    }),
    {
      commit: "0e2d7d01e6f1656e3ff2b2c27b56636db6859c10",
      short: "0e2d7d0",
      date: "2026-11-07",
      known: true,
    }
  );
  assert.deepEqual(describeBuild({ commit: "not-a-sha", date: "" }), {
    commit: "",
    short: "未知版本",
    date: "",
    known: false,
  });
  assert.equal(describeBuild().known, false);
});
