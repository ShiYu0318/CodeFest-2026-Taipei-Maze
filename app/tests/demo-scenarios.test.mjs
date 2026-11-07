// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEMO_SCENARIOS,
  demoScenarioQuery,
  demoPositionQuery,
  leaveDemoQuery,
  demoNextPoint,
} from "../src/station/demo-scenarios.mjs";
import {
  walkingRouter,
  planWalk,
  routeSteps,
} from "../src/station/walk-route.mjs";
import { createStationLocation } from "../src/station/location.mjs";
const data = JSON.parse(
  readFileSync(new URL("../src/views/station-points.json", import.meta.url))
);
const connections = JSON.parse(
  readFileSync(
    new URL("../src/views/station-connections.json", import.meta.url)
  )
);
const router = walkingRouter(
  JSON.parse(
    readFileSync(
      new URL("../src/station/walking-network.json", import.meta.url)
    )
  )
);

test("every rehearsal uses the production graph and its declared safe outcome", () => {
  for (const scenario of DEMO_SCENARIOS) {
    const query = demoScenarioQuery(
      { demo: "1", shared: "1", destination: "old" },
      scenario.id
    );
    assert.equal(query.shared, undefined);
    const result = planWalk(router, {
      startId: query.start,
      destinationId: query.destination,
      stepFree: scenario.stepFree,
    });
    assert.equal(result.type, scenario.expected, scenario.id);
    if (scenario.id === "crossFloor")
      assert.ok(routeSteps(result.route).some((step) => step.kind === "floor"));
    if (scenario.stepFree && result.type === "success")
      for (const edge of result.route.edges) {
        assert.equal(edge.stepFree, true);
        assert.ok(!["stairs", "escalator"].includes(edge.type));
      }
  }
  assert.equal(demoScenarioQuery({}, "restroom"), null);
  assert.equal(demoScenarioQuery({ demo: "1" }, "not-a-scenario"), null);
});
test("simulated relocation keeps the destination and never claims a QR confirmation", () => {
  const initial = demoScenarioQuery({ demo: "1" }, "crossFloor");
  const query = demoPositionQuery(initial, "b4-e2", data);
  assert.equal(query.start, "b4-e2");
  assert.equal(query.destination, initial.destination);
  const controller = createStationLocation({ data, connections });
  try {
    controller.applyQuery(query);
    const view = controller.snapshot();
    assert.equal(view.position.source, "url");
    assert.equal(view.position.confirmedAt, null);
  } finally {
    controller.dispose();
  }
  assert.equal(demoPositionQuery({}, "b4-e2", data), null);
  assert.equal(demoPositionQuery(initial, "not-a-point", data), null);
  assert.equal(demoPositionQuery(initial, null, data), null);
});
test("leaving rehearsal removes simulated trip data and preserves unrelated settings", () => {
  assert.deepEqual(
    leaveDemoQuery({
      demo: "1",
      point: "b4-e2",
      v: "1",
      start: "b4-e2",
      destination: "b4-e2",
      shared: "1",
      other: "keep",
    }),
    { other: "keep" }
  );
});
test("only a real route step can supply the next simulated checkpoint", () => {
  assert.equal(demoNextPoint([], 0), null);
  assert.equal(demoNextPoint([{ kind: "arrive", toId: "target" }], 0), null);
  assert.equal(demoNextPoint([{ kind: "floor", toId: "target" }], 0), "target");
  assert.equal(demoNextPoint([{ kind: "walk", toId: "target" }], -1), null);
});
