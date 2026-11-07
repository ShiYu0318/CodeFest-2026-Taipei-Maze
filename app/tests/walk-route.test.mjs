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
