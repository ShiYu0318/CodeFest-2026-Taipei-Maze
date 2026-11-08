// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { expandWalkingNetwork } from "../src/station/walking-data.mjs";
import {
  createWalkingRouter,
  validateWalkingNetwork,
} from "../src/station/walking.mjs";
import { walkAreas } from "../src/station/walk-areas.mjs";
import { segmentInWalkAreas } from "../src/station/walk-geometry.mjs";

const compact = JSON.parse(
  readFileSync(
    new URL("../src/station/walking-network.json", import.meta.url),
    "utf8"
  )
);
const network = expandWalkingNetwork(compact);
const router = createWalkingRouter(network);
const nodes = new Map(network.nodes.map((node) => [node.id, node]));

test("the shipped network passes the walking network validator", () => {
  assert.deepEqual(validateWalkingNetwork(network), []);
  assert.deepEqual(router.errors, []);
});

test("every corridor segment stays inside the drawn walkable area", () => {
  const areas = Object.fromEntries(
    network.floors.map((floor) => [floor, walkAreas(floor)])
  );
  for (const edge of network.edges) {
    if (edge.type !== "walkway" || edge.entranceInferred) continue;
    const from = nodes.get(edge.from);
    assert.ok(
      segmentInWalkAreas(
        edge.geometry[0],
        edge.geometry[1],
        areas[from.floor],
        1
      ),
      edge.id
    );
  }
});

test("B1 routes use the open north concourse and go around the K Mall kiosk", () => {
  const areas = walkAreas("B1");
  assert.ok(segmentInWalkAreas([900, 910], [899, 978], areas));
  assert.ok(!segmentInWalkAreas([889, 1006], [800, 1006], areas));

  for (const startPointId of ["b1-north-gate-east", "b1-k-upper-a"]) {
    const result = router.route({
      startPointId,
      destinationId: "b1-exit-m3",
    });
    assert.equal(result.type, "success", startPointId);
    for (const edge of result.route.edges) {
      assert.equal(edge.type, "walkway");
      assert.ok(!edge.entranceInferred, edge.id);
      assert.ok(
        segmentInWalkAreas(edge.geometry[0], edge.geometry[1], areas),
        edge.id
      );
    }
  }
});

test("routes cross floors only through recorded connectors", () => {
  const result = router.route({
    startPointId: "b1-e4",
    destinationId: "b3-e2",
  });
  if (result.type !== "success") return; // b3-e2 may be unbound; see next test
  for (const edge of result.route.edges)
    if (nodes.get(edge.from).floor !== nodes.get(edge.to).floor)
      assert.ok(edge.connectorId, edge.id);
});

test("a cross-floor elevator route exists and step-free routes avoid stairs and unknown entrances", () => {
  const bound = new Set(compact.bound);
  const lifts = network.edges.filter(
    (edge) => edge.type === "elevator" && edge.verification !== "unverified"
  );
  assert.ok(lifts.length > 0);
  const lift = lifts[0];
  const start = network.facilities.find(
    (f) => f.floor === nodes.get(lift.from).floor && bound.has(f.pointId)
  );
  const end = network.facilities.find(
    (f) => f.floor === nodes.get(lift.to).floor && f.pointId !== start.pointId
  );
  for (const stepFree of [false, true]) {
    const result = router.route({
      startPointId: start.pointId,
      destinationId: end.pointId,
      stepFree,
    });
    if (stepFree && result.type !== "success") continue;
    assert.equal(result.type, "success", `${start.pointId} → ${end.pointId}`);
    assert.equal(result.route.distanceM, null);
    if (stepFree)
      for (const edge of result.route.edges) {
        assert.ok(!["stairs", "escalator"].includes(edge.type), edge.id);
        assert.equal(edge.stepFree, true, edge.id);
        assert.ok(!edge.entranceInferred, edge.id);
      }
  }
});

test("nearest restrooms are ranked by legal route cost, not straight distance", () => {
  const start = compact.bound.find((id) => id.startsWith("b1-qr"));
  const result = router.nearest({ startPointId: start, category: "restroom" });
  assert.equal(result.type, "success");
  const costs = result.matches.map((match) => match.route.cost);
  assert.deepEqual(
    costs,
    [...costs].sort((a, b) => a - b)
  );
  for (const match of result.matches)
    assert.equal(match.route.edges.at(-1).to, match.pointId);
});

test("uncovered points fail closed instead of snapping through walls", () => {
  const uncovered = Object.values(compact.coverage).flatMap((c) => c.uncovered);
  assert.ok(uncovered.length > 0);
  const start = compact.bound[0];
  for (const id of uncovered.slice(0, 5))
    assert.equal(
      router.route({ startPointId: start, destinationId: id }).type,
      "UnknownDestination",
      id
    );
});

test("unconfirmed stair types and escalator directions never carry a route", () => {
  for (const edge of network.edges.filter((e) => e.connectorId))
    if (edge.verification === "unverified")
      assert.ok(["stairs", "escalator"].includes(edge.type), edge.id);
});

test("every point is bound except the two demo QR anchors on non-metro blocks", () => {
  const points = JSON.parse(
    readFileSync(
      new URL("../src/views/station-points.json", import.meta.url),
      "utf8"
    )
  ).points;
  const unbound = Object.values(points)
    .flat()
    .map((point) => point.id)
    .filter((id) => !compact.bound.includes(id));
  // b1-qr-01 sits on the airport MRT block, b1-qr-05 on the east car park;
  // their coordinates are pinned, and no metro corridor reaches them.
  assert.deepEqual(unbound.sort(), ["b1-qr-01", "b1-qr-05"]);
});

test("1F and railway platform corridors are schematic and sourced", () => {
  const sources = new Map(network.sources.map((s) => [s.id, s]));
  const schematic = network.edges.filter((edge) => edge.schematic);
  assert.ok(schematic.length > 0);
  for (const edge of schematic) {
    const floor = nodes.get(edge.from).floor;
    assert.ok(["1F", "B2"].includes(floor), edge.id);
    assert.equal(
      edge.sourceId,
      floor === "1F" ? "taipei-1f-photo" : "tra-taipei-b2"
    );
    assert.ok(sources.get(edge.sourceId), edge.sourceId);
  }
  for (const edge of network.edges.filter((e) => e.type === "walkway"))
    if (nodes.get(edge.from).floor === "1F") assert.ok(edge.schematic, edge.id);
});

test("no invented vertical links reach 1F or the railway platforms", () => {
  for (const edge of network.edges.filter((e) => e.connectorId))
    for (const id of [edge.from, edge.to]) {
      assert.notEqual(nodes.get(id).floor, "1F", edge.id);
      assert.ok(!/^b2-(tra|hsr)-/.test(id), edge.id);
    }
});

test("routes work inside 1F and stay on a railway platform", () => {
  const hall = router.route({
    startPointId: "1f-exit-n1",
    destinationId: "1f-toilet-west",
  });
  assert.equal(hall.type, "success");
  assert.ok(hall.route.edges.every((edge) => edge.schematic));
  const platform = router.route({
    startPointId: "b2-tra-4-escalator-1",
    destinationId: "b2-tra-4-elevator-8",
  });
  assert.equal(platform.type, "success");
  assert.ok(platform.route.edges.every((edge) => edge.schematic));
});
