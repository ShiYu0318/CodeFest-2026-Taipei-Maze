import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseAnchor } from "../src/navigation/qr.mjs";
import { createSession } from "../src/navigation/session.mjs";
const fixture = () =>
  JSON.parse(
    readFileSync(new URL("../src/navigation/demo-graph.json", import.meta.url))
  );
const payload = (anchor = "qr_a", extra = {}) =>
  JSON.stringify({
    type: "taipei_maze_anchor",
    v: 1,
    site_id: "synthetic_lab",
    graph_major: 1,
    anchor_id: anchor,
    ...extra,
  });
function ready(graph = fixture()) {
  const s = createSession(graph);
  assert.equal(s.acceptQr(payload()).type, "success");
  s.confirmLocation();
  s.selectDestination("poi_restroom");
  return s;
}

test("QR validates byte limit, exact fields, version/site and enabled anchors", () => {
  const g = fixture();
  assert.equal(parseAnchor(payload(), g).type, "success");
  for (const p of [
    "https://example.com",
    payload("missing"),
    payload("qr_a", { v: 2 }),
    payload("qr_a", { site_id: "real_station" }),
    payload("qr_a", { graph_major: 2 }),
    payload("qr_a", { x: 123 }),
    JSON.stringify("x"),
    "🙂".repeat(300),
    null,
  ])
    assert.notEqual(parseAnchor(p, g).type, "success");
  g.qr_anchors[0].enabled = false;
  assert.notEqual(parseAnchor(payload(), g).type, "success");
});
test("position requires explicit confirmation; no fabricated current location", () => {
  const s = createSession(fixture());
  s.acceptQr(payload());
  assert.equal(s.state.position, null);
  assert.equal(s.state.phase, "confirm_location");
  s.confirmLocation();
  assert.equal(s.state.position.nodeId, "b1_a");
  assert.equal(s.state.phase, "located");
});
test("confirmed orientation starts a plan; arrival requires a separate confirmation", () => {
  const s = ready();
  assert.equal(s.state.phase, "ready");
  assert.ok(s.state.plan.instructions[0].text.includes("面向"));
  s.start();
  assert.equal(s.state.phase, "navigating");
  for (let i = 0; i < s.state.plan.instructions.length; i++) s.next();
  assert.equal(s.state.phase, "arrival_confirmation");
  assert.equal(s.state.position.nodeId, "b1_a");
  s.confirmArrival();
  assert.equal(s.state.phase, "arrived");
});
test("missing departure or connector-exit orientation prevents navigation", () => {
  for (const context of ["anchor_departure", "connector_exit"]) {
    const g = fixture();
    g.orientation_guides = g.orientation_guides.filter(
      (x) => x.context_type !== context
    );
    const s = ready(g);
    assert.equal(s.state.phase, "guidance_unavailable");
    assert.equal(s.state.plan, null);
    s.start();
    assert.equal(s.state.phase, "guidance_unavailable");
  }
});
test("invalid/cancelled rescan preserves plan; confirmed new unreachable position invalidates it", () => {
  const s = ready();
  s.start();
  const old = s.state.plan;
  s.beginRelocation();
  assert.notEqual(s.acceptQr("bad").type, "success");
  assert.equal(s.state.plan, old);
  s.cancelRelocation();
  assert.equal(s.state.phase, "navigating");
  s.beginRelocation();
  s.acceptQr(payload("qr_island"));
  assert.equal(s.state.position.nodeId, "b1_a");
  s.confirmLocation();
  assert.equal(s.state.position.nodeId, "b1_island");
  assert.equal(s.state.phase, "no_route");
  assert.equal(s.state.plan, null);
  assert.equal(s.state.stepIndex, 0);
});
test("mobility changes require location reconfirmation and recompute, never reuse old steps", () => {
  const s = ready();
  s.start();
  s.setMobility("stepFree");
  assert.equal(s.state.phase, "confirm_location");
  assert.equal(s.state.plan, null);
  s.confirmLocation();
  assert.equal(s.state.phase, "ready");
  assert.ok(s.state.plan.route.edgeIds.includes("e_lift_up"));
  s.markConnectorUnavailable("lift_1");
  assert.equal(s.state.phase, "confirm_location");
  s.confirmLocation();
  assert.equal(s.state.phase, "no_route");
  assert.equal(s.state.plan, null);
});
test("zero-edge destination goes to arrival confirmation without orientation", () => {
  const s = createSession(fixture());
  s.acceptQr(payload());
  s.confirmLocation();
  s.selectDestination("poi_entry");
  assert.equal(s.state.phase, "arrival_confirmation");
});
test("new scan at B2 rebuilds from anchor, and end clears session position", () => {
  const s = ready();
  s.beginRelocation();
  s.acceptQr(payload("qr_b2_lift"));
  s.confirmLocation();
  assert.deepEqual(s.state.plan.route.nodeIds, ["b2_lift", "b2_dest"]);
  assert.equal(s.state.plan.instructions[0].floorId, "b2");
  s.end();
  assert.equal(s.state.position, null);
  assert.equal(s.state.plan, null);
  assert.equal(s.state.phase, "unlocated");
});

test("cancelling required reconfirmation cannot silently reuse a stale position via destination selection", () => {
  const s = ready();
  s.start();
  s.setMobility("stepFree");
  s.cancelRelocation();
  s.selectDestination("poi_entry");
  assert.equal(s.state.phase, "confirm_location");
  assert.equal(s.state.plan, null);
  s.confirmLocation();
  assert.equal(s.state.phase, "arrival_confirmation");
});

test("explicit search selection adds restrictions, preserves stronger current requirements and never starts walking", () => {
  const s = ready();
  s.start();
  s.applySearchSelection({
    poiId: "poi_restroom",
    proposedOptions: {
      mobilityProfile: "standard",
      excludedEdgeTypes: ["stairs"],
      unavailableConnectorIds: [],
    },
  });
  assert.equal(s.state.phase, "confirm_location");
  assert.equal(s.state.plan, null);
  assert.deepEqual(s.state.excludedEdgeTypes, ["stairs"]);
  s.confirmLocation();
  assert.equal(s.state.phase, "ready");
  assert.ok(s.state.plan.route.edgeIds.includes("e_lift_up"));
  s.setMobility("stepFree");
  s.confirmLocation();
  s.applySearchSelection({
    poiId: "poi_restroom",
    proposedOptions: {
      mobilityProfile: "standard",
      excludedEdgeTypes: [],
      unavailableConnectorIds: [],
    },
  });
  assert.equal(s.state.mobilityProfile, "stepFree");
  assert.deepEqual(s.state.excludedEdgeTypes, ["stairs"]);
});
test("invalid search choices do not replace an active destination or plan", () => {
  const s = ready();
  s.start();
  const old = s.state.plan;
  for (const selection of [
    null,
    { poiId: "missing", proposedOptions: {} },
    {
      poiId: "poi_restroom",
      proposedOptions: { excludedEdgeTypes: ["teleport"] },
    },
  ]) {
    s.applySearchSelection(selection);
    assert.equal(s.state.plan, old);
    assert.equal(s.state.destinationId, "poi_restroom");
    assert.equal(s.state.phase, "navigating");
  }
});
