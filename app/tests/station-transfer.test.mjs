// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createStationScanSession,
  stationQrPayload,
} from "../src/station/scan.mjs";
import { navigationMapState } from "../src/station/navigation-view.mjs";

const data = JSON.parse(
  readFileSync(new URL("../src/views/station-points.json", import.meta.url))
);
const graph = JSON.parse(
  readFileSync(
    new URL("../src/views/station-connections.json", import.meta.url)
  )
);
function trip(start = "b1-e4", target = "b4-e1", connections = graph) {
  const session = createStationScanSession(data, connections);
  session.scan(stationQrPayload(start, data));
  session.setDestination(target);
  return session;
}

test("floor confirmation advances one connector, preserves the last QR, and requires a separate arrival confirmation", () => {
  const session = trip();
  session.setStepFree(true);
  const original = session.snapshot();
  assert.equal(original.transfer.to.floor, "B2");
  assert.equal(original.transfer.movement, "down");
  const token = original.transfer.token;
  assert.equal(session.confirmTransfer(token).type, "success");
  const middle = session.snapshot();
  assert.deepEqual(middle.position, original.position);
  assert.equal(middle.navigationPosition.pointId, "m-e4");
  assert.equal(middle.navigationPosition.source, "manual_transfer");
  assert.equal(middle.transfer.to.floor, "B4");
  assert.equal(middle.transfer.movement, "down");
  assert.deepEqual(
    new Set(navigationMapState(middle).pointIds),
    new Set(["m-e4", "m-e1", "b4-e1"])
  );
  assert.equal(session.confirmTransfer(token), false);
  assert.deepEqual(session.snapshot(), middle);
  session.confirmTransfer(middle.transfer.token);
  const final = session.snapshot();
  assert.equal(final.navigationPosition.pointId, "b4-e1");
  assert.equal(final.relation.status, "at_destination");
  assert.equal(final.transfer, null);
  assert.equal(final.arrived, false);
  assert.equal(final.stepFree, true);
  assert.deepEqual(final.position, original.position);
  assert.equal(session.confirmArrival(middle.token), false);
  assert.equal(session.confirmArrival(final.token), true);
  session.reset();
  assert.equal(session.snapshot().manualPosition, null);
});

test("upward basement transfers use oriented target floors, not the stored edge direction", () => {
  const session = trip("b4-e1", "b1-e4");
  const first = session.snapshot().transfer;
  assert.equal(first.from.floor, "B4");
  assert.equal(first.to.floor, "B2");
  assert.equal(first.movement, "up");
  session.confirmTransfer(first.token);
  const second = session.snapshot().transfer;
  assert.equal(second.to.floor, "B1");
  assert.equal(second.movement, "up");
});

test("new QR overrides manual progress and invalidates the old action while invalid QR leaves it intact", () => {
  const session = trip();
  session.confirmTransfer(session.snapshot().transfer.token);
  const middle = session.snapshot();
  session.scan("wrong QR");
  assert.deepEqual(session.snapshot(), middle);
  session.scan(stationQrPayload("b1-e7", data));
  const located = session.snapshot();
  assert.equal(located.manualPosition, null);
  assert.equal(located.navigationPosition.pointId, "b1-e7");
  assert.equal(located.destinationId, "b4-e1");
  assert.equal(located.transfer.to.floor, "B2");
  assert.equal(session.confirmTransfer(middle.transfer.token), false);
});

test("destination, preference and device changes invalidate the displayed confirmation", () => {
  for (const change of [
    (s) => s.setDestination("m-e7"),
    (s) => s.setStepFree(true),
    (s) => s.markUnavailable("metro-e4"),
  ]) {
    const session = trip();
    const token = session.snapshot().transfer.token;
    change(session);
    const before = session.snapshot();
    assert.equal(session.confirmTransfer(token), false);
    assert.deepEqual(session.snapshot(), before);
  }
});

test("same-floor, unknown-zone and blocked connections never allow a floor jump", () => {
  for (const [origin, target] of [
    ["b1-e4", "b1-e7"],
    ["b2-qr-01", "b4-e1"],
    ["b1-e4", "b1-e4"],
  ]) {
    const session = trip(origin, target);
    assert.equal(session.snapshot().transfer, null);
    assert.equal(session.confirmTransfer("anything"), false);
  }
  const unverified = structuredClone(graph);
  unverified.connections.forEach((edge) => {
    edge.direction = "unverified";
  });
  const session = trip("b1-e4", "b4-e1", unverified);
  assert.equal(session.snapshot().relation.status, "unavailable");
  assert.equal(session.snapshot().transfer, null);
});

test("escalators respect validated directions and step-free exclusions; mixed stairs retain direction warnings", () => {
  // Synthetic escalator exercises the behavior without changing real station data.
  const synthetic = structuredClone(graph);
  synthetic.connections = [
    synthetic.connections.find((edge) => edge.id === "metro-e4"),
  ];
  Object.assign(synthetic.connections[0], {
    type: "escalator",
    wheelchairAccessible: false,
  });
  const session = trip("b1-e4", "m-e4", synthetic);
  assert.equal(session.snapshot().transfer.type, "escalator");
  assert.equal(session.snapshot().transfer.movement, "down");
  session.confirmTransfer(session.snapshot().transfer.token);
  assert.equal(session.snapshot().navigationPosition.floor, "B2");
  session.setDestination("b1-e4");
  assert.equal(session.snapshot().transfer.movement, "up");
  session.setStepFree(true);
  assert.equal(session.snapshot().transfer, null);
  const mixed = trip("m-bl-west", "b3-bl-west");
  assert.equal(mixed.snapshot().transfer.type, "stairs-escalator");
  assert.equal(mixed.snapshot().transfer.escalatorDirection, "unverified");
  mixed.setStepFree(true);
  assert.equal(mixed.snapshot().transfer?.type === "stairs-escalator", false);
});
