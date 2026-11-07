// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  walkingRouter,
  planWalk,
  routeLines,
  nearestPlace,
  nextArrow,
  routeSteps,
} from "../src/station/walk-route.mjs";

const compact = JSON.parse(
  readFileSync(
    new URL("../src/station/walking-network.json", import.meta.url),
    "utf8"
  )
);
const router = walkingRouter(compact);

test("a route is planned between two covered points with diagram units only", () => {
  const result = planWalk(router, {
    startId: "b1-e4",
    destinationId: "b1-wc-m5",
  });
  assert.equal(result.type, "success");
  assert.equal(result.route.distanceM, null);
  assert.equal(result.route.unit, "relative");
});

test("missing endpoints and uncovered points explain why there is no route", () => {
  assert.equal(planWalk(router, { destinationId: "b1-wc-m5" }).type, "NoStart");
  assert.equal(
    planWalk(router, { startId: "b1-qr-01", destinationId: "b1-wc-m5" }).type,
    "UnknownStart"
  );
});

test("route lines for a floor are continuous polylines on that floor only", () => {
  const { route } = planWalk(router, {
    startId: "b1-e4",
    destinationId: "b1-wc-m5",
  });
  const lines = routeLines(route, "B1");
  assert.ok(lines.length >= 1);
  for (const line of lines) {
    assert.ok(line.length >= 2);
    for (let i = 1; i < line.length; i++)
      assert.ok(
        Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]) > 0
      );
  }
  assert.deepEqual(routeLines(route, "B4"), []);
});

test("nearest restroom uses the network and reports reasons", () => {
  const found = nearestPlace(router, {
    startId: "b1-e4",
    category: "restroom",
  });
  assert.equal(found.type, "success");
  assert.ok(found.pointId.startsWith("b1-wc"));
  assert.equal(nearestPlace(router, { category: "restroom" }).type, "NoStart");
  assert.equal(
    nearestPlace(router, { startId: "b1-e4", category: "nosuchthing" }).type,
    "NoFacilities"
  );
});

test("the arrow uses map bearings and never claims left or right", () => {
  const { route } = planWalk(router, {
    startId: "b1-e4",
    destinationId: "b1-wc-m5",
  });
  const arrow = nextArrow(route);
  assert.equal(arrow.kind, "map");
  assert.ok(
    Number.isFinite(arrow.angle) && arrow.angle >= 0 && arrow.angle < 360
  );
  assert.ok(!("turn" in arrow));
  assert.equal(nextArrow(null).kind, "none");
});

test("a route that starts with a floor change shows up or down", () => {
  const lift = router.route({ startPointId: "b1-e4", destinationId: "b2-e4" });
  if (lift.type !== "success") return;
  const arrow = nextArrow(lift.route, { startFloorFirst: true });
  assert.ok(["map", "up", "down"].includes(arrow.kind));
});

test("a cross-floor route becomes walk / floor / arrive steps with checkpoints", () => {
  const { route } = planWalk(router, {
    startId: "b1-qr-02",
    destinationId: "b4-qr-03",
  });
  const steps = routeSteps(route);
  assert.equal(steps.at(-1).kind, "arrive");
  assert.equal(steps.at(-1).toId, "b4-qr-03");
  assert.ok(steps.some((step) => step.kind === "floor"));
  for (const [i, step] of steps.entries()) {
    assert.equal(step.index, i);
    if (step.kind === "walk") {
      assert.ok(step.line.length >= 2, `step ${i} line`);
      assert.ok(Number.isFinite(step.angle));
      // Checkpoints are named places, never helper corner or entrance nodes.
      for (const id of [step.fromId, step.toId, ...step.viaIds])
        assert.ok(!/-corner-\d+$|-entrance$/.test(id), id);
    }
    if (step.kind === "floor") {
      assert.ok(["up", "down"].includes(step.direction));
      assert.notEqual(step.floor, step.toFloor);
      assert.ok(["elevator", "stairs", "escalator"].includes(step.via));
    }
  }
  // Floors line up: each step starts where the previous one ended.
  for (let i = 1; i < steps.length; i++)
    assert.equal(steps[i].floor, steps[i - 1].toFloor ?? steps[i - 1].floor);
});

test("no route means no steps", () => {
  assert.deepEqual(routeSteps(null), []);
});

test("planning and nearest lookup preserve hard route restrictions", () => {
  const requests = [];
  const stub = {
    route: (request) => {
      requests.push(request);
      return { type: "NoRoute" };
    },
    nearest: (request) => {
      requests.push(request);
      return { type: "NoRoute" };
    },
  };
  const constraints = {
    startId: "b1-e4",
    destinationId: "b1-wc-m5",
    category: "restroom",
    excludedEdgeTypes: ["stairs"],
    allowFareGates: false,
  };
  planWalk(stub, constraints);
  nearestPlace(stub, constraints);
  for (const request of requests) {
    assert.deepEqual(request.excludedEdgeTypes, ["stairs"]);
    assert.equal(request.allowFareGates, false);
  }
});

test("each diagram turn has its own arrow while labels remain named landmarks", () => {
  const nodes = [
    { id: "start", floor: "B1", x: 0, y: 0 },
    { id: "b1-corner-1", floor: "B1", x: 10, y: 0 },
    { id: "b1-corner-2", floor: "B1", x: 10, y: 10 },
    { id: "restroom", floor: "B1", x: 20, y: 10 },
  ];
  const edges = nodes.slice(1).map((to, index) => ({
    from: nodes[index].id,
    to: to.id,
    type: "walkway",
  }));
  const steps = routeSteps({
    nodes,
    edges,
    nodeIds: nodes.map((node) => node.id),
  });
  const walking = steps.filter((step) => step.kind === "walk");
  assert.equal(walking.length, 3);
  assert.deepEqual(
    walking.map((step) => step.angle),
    [90, 180, 90]
  );
  for (const step of walking) {
    assert.equal(step.fromId, "start");
    assert.equal(step.toId, "restroom");
  }
  for (let i = 1; i < walking.length; i++)
    assert.deepEqual(walking[i - 1].line.at(-1), walking[i].line[0]);
});
test("named facilities and QR points on the route become distinct checkpoints", () => {
  const nodes = ["start", "b1-qr-02", "water", "end"].map((id, index) => ({
    id,
    floor: "B1",
    x: index * 10,
    y: 0,
  }));
  const edges = nodes.slice(1).map((to, index) => ({
    from: nodes[index].id,
    to: to.id,
    type: "walkway",
  }));
  const steps = routeSteps({
    nodes,
    edges,
    nodeIds: nodes.map((node) => node.id),
  });
  assert.deepEqual(
    steps.filter((step) => step.kind === "walk").map((step) => step.toId),
    ["b1-qr-02", "water", "end"]
  );
});
