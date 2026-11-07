// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { createWalkingRouter } from "../src/station/walking.mjs";
function fixture() {
  const nodes = [
    ["a", "B1", 0, 0],
    ["b", "B1", 10, 0],
    ["near", "B1", 2, 0],
    ["far", "B1", 20, 0],
    ["lift1", "B1", 10, 10],
    ["lift2", "B2", 10, 10],
    ["upper", "B2", 20, 10],
    ["paid", "B1", 1, 0],
  ].map(([id, floor, x, y]) => ({ id, floor, x, y }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edge = (id, from, to, cost, extra = {}) => ({
    id,
    from,
    to,
    cost,
    type: "walkway",
    status: "open",
    stepFree: true,
    wheelchairPassable: true,
    requiresTicket: false,
    sourceId: "fixture",
    page: 1,
    verification: "desk_checked",
    geometry: [from, to].map((id) => [byId.get(id).x, byId.get(id).y]),
    ...extra,
  });
  return {
    schemaVersion: 1,
    version: "1.0.0",
    routingUnit: "relative",
    sources: [
      { id: "fixture", url: "https://example.org/test-fixture", pages: 2 },
    ],
    floors: ["B1", "B2"],
    nodes,
    edges: [
      edge("a_b", "a", "b", 10),
      edge("b_far", "b", "far", 10, { wheelchairPassable: null }),
      edge("expensive", "a", "far", 50, { wheelchairPassable: null }),
      edge("wrong_way", "near", "a", 1),
      edge("a_lift", "a", "lift1", 15),
      edge("lift", "lift1", "lift2", 20, {
        type: "elevator",
        connectorId: "lift",
        geometry: [],
      }),
      edge("upper_wc", "lift2", "upper", 5),
      edge("gate", "a", "paid", 1, { type: "gate", requiresTicket: true }),
    ],
    bindings: {
      start: "a",
      near: "near",
      far: "far",
      upper: "upper",
      paid: "paid",
    },
    facilities: ["near", "far", "upper", "paid"].map((pointId) => ({
      pointId,
      types: ["restroom"],
      enabled: true,
      accessibleFacility: true,
    })),
  };
}

test("walking chooses the lowest connected route cost rather than a straight-line shortcut", () => {
  const router = createWalkingRouter(fixture());
  assert.deepEqual(router.errors, []);
  const result = router.route({ startPointId: "start", destinationId: "far" });
  assert.equal(result.type, "success");
  assert.equal(result.route.cost, 20);
  assert.deepEqual(result.route.edgeIds, ["a_b", "b_far"]);
  assert.equal(result.route.distanceM, null);
  assert.equal(
    router.route({ startPointId: "start", destinationId: "near" }).type,
    "NoRoute"
  );
});

test("nearest skips one-way and ticketed shortcuts and uses the same mobility constraints", () => {
  const router = createWalkingRouter(fixture());
  const request = { startPointId: "start", category: "restroom" };
  assert.equal(router.nearest(request).matches[0].pointId, "far");
  assert.equal(
    router.nearest({ ...request, stepFree: true }).matches[0].pointId,
    "upper"
  );
  assert.equal(
    router.nearest({ ...request, allowFareGates: true }).matches[0].pointId,
    "paid"
  );
  assert.equal(
    router.nearest({
      ...request,
      stepFree: true,
      unavailableConnectorIds: ["lift"],
    }).type,
    "NoRoute"
  );
});

test("unknown origin, disabled destination and closed or unverified edges fail closed", () => {
  const graph = fixture();
  graph.facilities.find((p) => p.pointId === "upper").enabled = false;
  for (const edge of graph.edges.filter((e) => e.to === "far"))
    edge.status = "closed";
  const router = createWalkingRouter(graph);
  assert.equal(
    router.route({ startPointId: "missing", destinationId: "far" }).type,
    "UnknownStart"
  );
  assert.equal(
    router.route({ startPointId: "start", destinationId: "upper" }).type,
    "UnknownDestination"
  );
  assert.equal(
    router.nearest({ startPointId: "start", category: "restroom" }).type,
    "NoRoute"
  );
  const unverified = fixture();
  unverified.edges.forEach((e) => (e.verification = "unverified"));
  assert.equal(
    createWalkingRouter(unverified).route({
      startPointId: "start",
      destinationId: "far",
    }).type,
    "NoRoute"
  );
});

test("bad references, geometry and costs invalidate the graph instead of inventing connections", () => {
  for (const mutate of [
    (g) => (g.edges[0].to = "missing"),
    (g) => (g.edges[0].geometry[0] = [999, 999]),
    (g) => (g.edges[0].cost = -1),
    (g) => (g.edges[0].cost = Number.NaN),
    (g) => (g.edges[0].sourceId = "missing"),
    (g) => (g.edges[0].page = 99),
  ]) {
    const graph = fixture();
    mutate(graph);
    const router = createWalkingRouter(graph);
    assert.ok(router.errors.length > 0);
    assert.equal(
      router.route({ startPointId: "start", destinationId: "far" }).type,
      "InvalidGraph"
    );
  }
});

test("a disabled origin is not reused as an apparently valid walking start", () => {
  const graph = fixture();
  graph.facilities.push({
    pointId: "start",
    types: ["info"],
    enabled: false,
    accessibleFacility: true,
  });
  const router = createWalkingRouter(graph);
  assert.equal(
    router.route({ startPointId: "start", destinationId: "far" }).type,
    "UnknownStart"
  );
  assert.equal(
    router.nearest({ startPointId: "start", category: "restroom" }).type,
    "UnknownStart"
  );
});

test("invalid mobility options are rejected and later input mutation cannot alter a routing snapshot", () => {
  const graph = fixture(),
    router = createWalkingRouter(graph);
  assert.equal(
    router.route({
      startPointId: "start",
      destinationId: "far",
      stepFree: "false",
    }).type,
    "UnsupportedOptions"
  );
  assert.equal(
    router.nearest({
      startPointId: "start",
      category: "restroom",
      unavailableConnectorIds: null,
    }).type,
    "UnsupportedOptions"
  );
  graph.edges[0].cost = 999;
  graph.bindings.start = "near";
  assert.equal(
    router.route({ startPointId: "start", destinationId: "far" }).route.cost,
    20
  );
});
