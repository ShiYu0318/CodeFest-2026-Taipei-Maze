// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  navigationMapState,
  navigationPointVisible,
} from "../src/station/navigation-view.mjs";
import {
  createStationScanSession,
  stationPoints,
  stationQrPayload,
} from "../src/station/scan.mjs";
const data = JSON.parse(
  readFileSync(new URL("../src/views/station-points.json", import.meta.url))
);
const connections = JSON.parse(
  readFileSync(
    new URL("../src/views/station-connections.json", import.meta.url)
  )
);
const points = stationPoints(data);
const isQrPoint = (point) => [point.type].flat().includes("qrcode");

test("browsing and destination picking keep the normal facility filter", () => {
  const session = createStationScanSession(data, connections);
  let view = navigationMapState(session.snapshot());
  assert.equal(view.active, false);
  assert.equal(
    navigationPointVisible({ id: "x", type: "restroom" }, view),
    true
  );
  assert.equal(
    navigationPointVisible({ id: "qr", type: "qrcode" }, view, false),
    false
  );
  session.scan(stationQrPayload("b1-e4", data));
  assert.equal(navigationMapState(session.snapshot()).active, false);
  session.setDestination("b4-e1");
  view = navigationMapState(session.snapshot(), { picking: true });
  assert.equal(view.active, false);
  assert.equal(
    navigationPointVisible({ id: "x", type: "restroom" }, view),
    true
  );
});

test("navigation keeps endpoints and only its validated transfer points, plus every QR regardless of theme", () => {
  const session = createStationScanSession(data, connections);
  session.scan(stationQrPayload("b1-e4", data));
  session.setDestination("b4-e1");
  session.setStepFree(true);
  const view = navigationMapState(session.snapshot());
  assert.equal(view.active, true);
  assert.deepEqual(
    new Set(view.pointIds),
    new Set(["b1-e4", "m-e4", "m-e1", "b4-e1"])
  );
  const visible = points.filter((point) =>
    navigationPointVisible(point, view, false)
  );
  assert.equal(visible.length, 52);
  assert.equal(visible.filter(isQrPoint).length, 48);
  assert.equal(
    navigationPointVisible(
      points.find((point) => point.id === "b1-e7"),
      view
    ),
    false
  );
  assert.ok(
    visible
      .filter((point) => !isQrPoint(point))
      .every((point) => view.pointIds.includes(point.id))
  );
  // Hidden facility icons are still valid scan anchors when someone is lost.
  assert.equal(session.scan(stationQrPayload("b1-e7", data)).type, "success");
  assert.equal(
    navigationPointVisible(
      points.find((point) => point.id === "b1-e7"),
      navigationMapState(session.snapshot())
    ),
    true
  );
  assert.equal(session.snapshot().destinationId, "b4-e1");
});

test("rescanning a boundary QR preserves the target and removes the superseded route; exit restores browsing", () => {
  const session = createStationScanSession(data, connections);
  session.scan(stationQrPayload("b1-e4", data));
  session.setDestination("b4-e1");
  session.scan(stationQrPayload("b2-qr-01", data));
  const view = navigationMapState(session.snapshot(), {
    // useStationLocation.onLocated replaces query.start before publishing completion.
    startId: "b2-qr-01",
    targetId: "b4-e1",
  });
  assert.equal(view.active, true);
  assert.deepEqual(new Set(view.pointIds), new Set(["b2-qr-01", "b4-e1"]));
  assert.equal(
    navigationPointVisible({ id: "m-e4", type: "elevator" }, view),
    false
  );
  assert.equal(session.snapshot().destinationId, "b4-e1");
  session.reset();
  assert.equal(navigationMapState(session.snapshot()).active, false);
});

test("a manually selected trip focuses its endpoints without inventing connectors", () => {
  const session = createStationScanSession(data, connections);
  const view = navigationMapState(session.snapshot(), {
    startId: "b1-e4",
    targetId: "m-e4",
  });
  assert.equal(view.active, true);
  assert.deepEqual(view.pointIds, ["b1-e4", "m-e4"]);
});

test("an explicit facility category stays visible alongside navigation endpoints and QR markers", () => {
  const view = { active: true, pointIds: ["start", "target"] };
  assert.equal(
    navigationPointVisible({ id: "wc", type: "restroom" }, view, true, true),
    true
  );
  assert.equal(
    navigationPointVisible({ id: "other", type: "phone" }, view, false, true),
    false
  );
  assert.equal(
    navigationPointVisible({ id: "start", type: "exit" }, view, false, true),
    true
  );
  assert.equal(
    navigationPointVisible({ id: "qr", type: "qrcode" }, view, false, true),
    true
  );
});

test("a manually chosen origin replaces an older QR origin and its stale transfer stops", () => {
  const session = {
    position: { pointId: "old-qr" },
    destinationId: "target",
    relation: {
      status: "connections",
      steps: [
        {
          from: { pointId: "old-transfer" },
          to: { pointId: "other-transfer" },
        },
      ],
    },
  };
  const view = navigationMapState(session, { startId: "new-manual-start" });
  assert.deepEqual(view.pointIds, ["new-manual-start", "target"]);
  assert.equal(
    navigationPointVisible({ id: "new-manual-start", type: "exit" }, view),
    true
  );
});
