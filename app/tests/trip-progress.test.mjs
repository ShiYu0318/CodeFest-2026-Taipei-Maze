// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  tripIdentity,
  confirmManualArrival,
  isCurrentArrival,
  positionDetails,
} from "../src/station/trip-progress.mjs";
const trip = {
  startId: "b1-e4",
  destinationId: "b1-wc-m5",
  positionToken: "station:1",
  stepFree: false,
  excludedEdgeTypes: [],
  unavailableConnectorIds: [],
};
const now = () => "2026-11-08T00:30:00.000Z";
test("manual arrival is an explicit receipt, never a position update", () => {
  const before = JSON.stringify(trip),
    key = tripIdentity(trip);
  const result = confirmManualArrival({
    trip,
    expectedIdentity: key,
    routeType: "success",
    stepKind: "arrive",
    now,
  });
  assert.equal(result.type, "success");
  assert.equal(result.receipt.source, "manual");
  assert.equal(result.receipt.destinationId, trip.destinationId);
  assert.equal(result.receipt.confirmedAt, now());
  assert.equal(JSON.stringify(trip), before);
  assert.ok(isCurrentArrival(result.receipt, key));
  assert.equal(result.receipt.position, undefined);
});
test("changed endpoints, QR revision or restrictions reject old confirmation", () => {
  const key = tripIdentity(trip);
  for (const changed of [
    { startId: "other" },
    { destinationId: "other" },
    { positionToken: "station:2" },
    { stepFree: true },
    { excludedEdgeTypes: ["stairs"] },
    { unavailableConnectorIds: ["lift-closed"] },
  ]) {
    const result = confirmManualArrival({
      trip: { ...trip, ...changed },
      expectedIdentity: key,
      routeType: "success",
      stepKind: "arrive",
      now,
    });
    assert.equal(result.type, "Stale");
  }
  assert.equal(tripIdentity({ destinationId: "target" }), null);
});
test("only final valid guidance or a same-point trip can be confirmed", () => {
  const key = tripIdentity(trip);
  for (const [routeType, stepKind] of [
    ["NoRoute", "arrive"],
    ["UnknownStart", "arrive"],
    ["Arrived", "arrive"],
    ["success", "walk"],
    ["success", "floor"],
  ])
    assert.equal(
      confirmManualArrival({
        trip,
        expectedIdentity: key,
        routeType,
        stepKind,
        now,
      }).type,
      "NotAtFinalStep"
    );
  assert.equal(
    confirmManualArrival({
      trip: { ...trip, startId: trip.destinationId },
      expectedIdentity: tripIdentity({ ...trip, startId: trip.destinationId }),
      routeType: "Arrived",
      now,
    }).type,
    "success"
  );
});
test("only a matching real QR position carries its actual scan timestamp", () => {
  const position = { pointId: "b1-e4", source: "qr", confirmedAt: now() };
  assert.deepEqual(positionDetails({ startId: "b1-e4", position }), {
    kind: "qr",
    confirmedAt: now(),
  });
  assert.deepEqual(positionDetails({ startId: "b1-other", position }), {
    kind: "manual",
    confirmedAt: null,
  });
  assert.deepEqual(
    positionDetails({ startId: "b1-e4", position, demo: true }),
    { kind: "demo", confirmedAt: null }
  );
  assert.deepEqual(
    positionDetails({
      startId: "b1-e4",
      position: { ...position, source: "url" },
    }),
    { kind: "link", confirmedAt: null }
  );
  assert.deepEqual(
    positionDetails({
      startId: "b1-e4",
      position: { ...position, confirmedAt: "invalid" },
    }),
    { kind: "qr", confirmedAt: null }
  );
  assert.deepEqual(positionDetails({}), { kind: "none", confirmedAt: null });
});
