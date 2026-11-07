import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createStationScanSession,
  stationQrPayload,
} from "../src/station/scan.mjs";
const points = JSON.parse(
  readFileSync(new URL("../src/views/station-points.json", import.meta.url))
);
const connections = JSON.parse(
  readFileSync(
    new URL("../src/views/station-connections.json", import.meta.url)
  )
);
const setup = () => createStationScanSession(points, connections);
test("requires destination; accepts only exact namespace and known point without trusting coordinates", () => {
  const session = setup(),
    valid = stationQrPayload("b1-e4", points);
  assert.equal(session.scan(valid).type, "DestinationRequired");
  session.setDestination("m-e4");
  for (const input of [
    "https://example.com/meet",
    "{}",
    JSON.stringify({ ...JSON.parse(valid), x: 42 }),
    JSON.stringify({ ...JSON.parse(valid), site_id: "synthetic" }),
    JSON.stringify({ ...JSON.parse(valid), anchor_id: "station_missing" }),
  ])
    assert.notEqual(session.scan(input).type, "success");
  assert.equal(session.snapshot().position, null);
  assert.equal(session.scan(valid).type, "success");
  assert.equal(session.snapshot().position.pointId, "b1-e4");
});
test("successive scans update origin while destination and step-free preference persist; invalid scan preserves plan", () => {
  const session = setup();
  session.setDestination("m-e4");
  session.setStepFree(true);
  session.scan(stationQrPayload("b1-e4", points));
  assert.equal(session.snapshot().relation.status, "connections");
  assert.ok(
    session
      .snapshot()
      .relation.steps.every(
        (e) => e.type === "elevator" && e.wheelchairAccessible === true
      )
  );
  session.scan(stationQrPayload("b1-e7", points));
  const previous = session.snapshot();
  assert.equal(previous.destinationId, "m-e4");
  assert.equal(previous.stepFree, true);
  assert.equal(previous.position.pointId, "b1-e7");
  session.scan("wrong");
  assert.deepEqual(session.snapshot(), previous);
});
test("only exact destination scan permits explicit arrival; stale token cannot advance a new scan", () => {
  const session = setup();
  session.setDestination("m-e4");
  session.scan(stationQrPayload("m-e4", points));
  const token = session.snapshot().token;
  assert.equal(session.snapshot().arrived, false);
  session.scan(stationQrPayload("b1-e4", points));
  assert.equal(session.confirmArrival(token), false);
  assert.equal(session.snapshot().arrived, false);
  session.scan(stationQrPayload("m-e4", points));
  assert.equal(session.confirmArrival(session.snapshot().token), true);
  assert.equal(session.snapshot().arrived, true);
});
test("same zone is not arrival or walking route; unverified and stairs are never step-free substitutes", () => {
  const session = setup();
  session.setDestination("b1-e4");
  session.scan(stationQrPayload("b1-e7", points));
  assert.equal(session.snapshot().relation.status, "same_zone");
  assert.equal(session.snapshot().arrived, false);
  const disconnected = createStationScanSession(points, {
    ...connections,
    connections: connections.connections.map((e) => ({
      ...e,
      wheelchairAccessible: false,
    })),
  });
  disconnected.setDestination("m-e4");
  disconnected.setStepFree(true);
  disconnected.scan(stationQrPayload("b1-e4", points));
  assert.equal(disconnected.snapshot().relation.status, "unavailable");
  assert.equal(disconnected.snapshot().destinationId, "m-e4");
});

test("search restrictions and unavailable devices survive later destination choices and scans", () => {
  const session = setup();
  session.applySearchSelection({
    poiId: "m-e4",
    proposedOptions: {
      mobilityProfile: "stepFree",
      excludedEdgeTypes: ["stairs"],
    },
  });
  session.markUnavailable("metro-e4");
  session.scan(stationQrPayload("b1-e4", points));
  assert.ok(
    session
      .snapshot()
      .relation.steps.every((e) => e.id !== "metro-e4" && e.type === "elevator")
  );
  session.applySearchSelection({
    poiId: "m-e4",
    proposedOptions: { mobilityProfile: "standard", excludedEdgeTypes: [] },
  });
  assert.equal(session.snapshot().stepFree, true);
  assert.deepEqual(session.snapshot().excludedEdgeTypes, ["stairs"]);
  assert.deepEqual(session.snapshot().unavailableConnectorIds, ["metro-e4"]);
  assert.equal(session.snapshot().arrived, false);
});
