import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateGraph } from "../src/navigation/graph.mjs";
import { planRoute } from "../src/navigation/route.mjs";
const fixture = () =>
  JSON.parse(
    readFileSync(new URL("../src/navigation/demo-graph.json", import.meta.url))
  );
const request = (extra = {}) => ({
  startId: "b1_a",
  destinationId: "b2_dest",
  mobilityProfile: "standard",
  unavailableConnectorIds: [],
  ...extra,
});

test("fixture is valid; weighted routing chooses cheaper stairs, not fewer edges", () => {
  const graph = fixture();
  assert.deepEqual(validateGraph(graph), []);
  const result = planRoute(graph, request());
  assert.equal(result.type, "success");
  assert.deepEqual(result.route.nodeIds, [
    "b1_a",
    "b1_j",
    "b1_stairs",
    "b2_stairs",
    "b2_dest",
  ]);
  assert.equal(result.route.totalRoutingCost, 9);
  assert.equal(result.route.totalDistanceM, null);
});
test("step-free route uses elevator and never falls back to stairs", () => {
  const graph = fixture();
  const result = planRoute(graph, request({ mobilityProfile: "stepFree" }));
  assert.equal(result.type, "success");
  assert.deepEqual(result.route.nodeIds, [
    "b1_a",
    "b1_j",
    "b1_lift",
    "b2_lift",
    "b2_dest",
  ]);
  assert.equal(result.route.totalRoutingCost, 15);
  assert.equal(
    planRoute(
      graph,
      request({
        mobilityProfile: "stepFree",
        unavailableConnectorIds: ["lift_1"],
      })
    ).type,
    "NoRoute"
  );
});
test("closed and unknown status/accessibility edges are excluded", () => {
  for (const mutate of [
    (e) => (e.status = "closed"),
    (e) => (e.status = "unknown"),
    (e) => (e.wheelchair_passable = "unknown"),
    (e) => (e.step_free = "unknown"),
  ]) {
    const graph = fixture();
    mutate(graph.edges.find((e) => e.id === "e_lift_up"));
    assert.equal(
      planRoute(graph, request({ mobilityProfile: "stepFree" })).type,
      "NoRoute"
    );
  }
});
test("one-way graph does not invent a reverse edge", () => {
  const graph = fixture();
  graph.edges = graph.edges.filter((e) => e.id !== "e_j_a");
  assert.equal(
    planRoute(graph, request({ startId: "b1_j", destinationId: "b1_a" })).type,
    "NoRoute"
  );
});
test("same-node success differs from unknown and unreachable destinations", () => {
  const graph = fixture();
  const same = planRoute(graph, request({ destinationId: "b1_a" }));
  assert.equal(same.type, "success");
  assert.deepEqual(same.route.edgeIds, []);
  assert.equal(same.route.totalRoutingCost, 0);
  assert.equal(
    planRoute(graph, request({ destinationId: "b1_island" })).type,
    "NoRoute"
  );
  assert.equal(
    planRoute(graph, request({ destinationId: "missing" })).type,
    "UnknownDestination"
  );
  assert.equal(
    planRoute(graph, request({ startId: "missing" })).type,
    "UnknownStart"
  );
  assert.equal(
    planRoute(graph, request({ mobilityProfile: "flying" })).type,
    "UnsupportedOptions"
  );
});
test("deterministic equal-cost tie break does not depend on input edge order", () => {
  const graph = fixture();
  graph.edges.find((e) => e.id === "e_j_lift").routing_cost = 2;
  graph.edges.find((e) => e.id === "e_lift_up").routing_cost = 2;
  graph.edges.find((e) => e.id === "e_lift_dest").routing_cost = 2;
  const a = planRoute(graph, request());
  graph.edges.reverse();
  const b = planRoute(graph, request());
  assert.deepEqual(a.route.edgeIds, b.route.edgeIds);
});
test("rejects malformed graphs before routing, including finite values and floor connections", () => {
  const mutations = [
    (g) => g.nodes.push({ ...g.nodes[0] }),
    (g) => (g.edges[0].to_node_id = "missing"),
    (g) => (g.edges[0].routing_cost = 0),
    (g) => (g.edges[0].routing_cost = Infinity),
    (g) =>
      (g.edges[0].geometry = [
        [999, 999],
        [220, 100],
      ]),
    (g) => (g.edges.find((e) => e.id === "e_lift_up").connector_id = null),
    (g) =>
      (g.connectors.find((c) => c.id === "lift_1").landing_node_ids = [
        "b1_lift",
      ]),
    (g) => (g.nodes[0].x = -1),
    (g) => (g.edges[0].status = "maybe"),
    (g) => (g.edges[0].source_ids = ["missing"]),
    (g) => (g.validation_mode = "field_verified_demo"),
  ];
  for (const mutate of mutations) {
    const graph = fixture();
    mutate(graph);
    assert.ok(validateGraph(graph).length);
    assert.equal(planRoute(graph, request()).type, "InvalidGraph");
  }
  for (const graph of [null, {}, { nodes: null }])
    assert.equal(planRoute(graph, request()).type, "InvalidGraph");
});

test("malformed nested arrays never throw at the graph boundary", () => {
  for (const mutate of [
    (g) => (g.connectors[0].landing_node_ids = 42),
    (g) => (g.qr_anchors[0].departure_edge_ids = 42),
    (g) => (g.nodes[0].landmark_ids = null),
    (g) => (g.floors[0].view_box = null),
  ]) {
    const graph = fixture();
    mutate(graph);
    assert.doesNotThrow(() => validateGraph(graph));
    assert.equal(planRoute(graph, request()).type, "InvalidGraph");
  }
});
