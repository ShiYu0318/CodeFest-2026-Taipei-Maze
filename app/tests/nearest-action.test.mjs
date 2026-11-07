// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { findNearestFacility } from "../src/station/nearest-action.mjs";

test("a nearest request locates once, then uses the fresh QR rather than an old start", async () => {
  let scans = 0;
  const requests = [];
  const location = {
    view: {
      value: {
        available: true,
        active: false,
        stepFree: true,
        excludedEdgeTypes: ["stairs"],
        unavailableConnectorIds: ["lift-closed"],
      },
    },
    scan: async () => {
      scans++;
      return { type: "success", point: { id: "fresh-qr" } };
    },
  };
  const router = {
    nearest: (request) => {
      requests.push(request);
      return { type: "success", matches: [{ pointId: "wc", route: {} }] };
    },
  };
  const found = await findNearestFacility(location, router, {
    category: "restroom",
  });
  assert.equal(scans, 1);
  assert.equal(found.startId, "fresh-qr");
  assert.equal(found.pointId, "wc");
  assert.equal(requests[0].startPointId, "fresh-qr");
  assert.equal(requests[0].stepFree, true);
  assert.deepEqual(requests[0].excludedEdgeTypes, ["stairs"]);
  assert.deepEqual(requests[0].unavailableConnectorIds, ["lift-closed"]);
});
test("cancel, unavailable browser and busy scanning never select a facility", async () => {
  let finds = 0,
    scans = 0;
  const router = {
    nearest: () => {
      finds++;
    },
  };
  const location = {
    view: { value: { available: true } },
    scan: async () => {
      scans++;
      return { type: "Cancelled" };
    },
  };
  assert.equal(
    (await findNearestFacility(location, router, {})).type,
    "Cancelled"
  );
  location.view.value.available = false;
  assert.equal(
    (await findNearestFacility(location, router, {})).type,
    "NoStart"
  );
  location.view.value.active = true;
  assert.equal(
    (await findNearestFacility(location, router, { startId: "known" })).type,
    "Busy"
  );
  assert.equal(scans, 1);
  assert.equal(finds, 0);
});
test("a manually chosen start can find a facility in a browser without scanning", async () => {
  const location = {
    view: { value: { available: false } },
    scan: () => assert.fail("unexpected camera"),
  };
  const router = {
    nearest: (request) => {
      assert.equal(request.startPointId, "manual");
      return { type: "NoRoute" };
    },
  };
  assert.equal(
    (
      await findNearestFacility(location, router, {
        startId: "manual",
        category: "restroom",
      })
    ).type,
    "NoRoute"
  );
});

test("late-reply draining and malformed native replies remain scan failures, not missing facilities", async () => {
  for (const type of [
    "WaitingForDrain",
    "SendFailed",
    "InvalidReply",
    "Timeout",
    "Stale",
  ]) {
    const location = {
      view: { value: { available: true } },
      scan: async () => ({ type }),
    };
    const router = {
      nearest: () =>
        assert.fail("must not query facilities after a failed scan"),
    };
    const result = await findNearestFacility(location, router, {
      category: "restroom",
    });
    assert.equal(result.type, type);
    assert.equal(result.startId, undefined);
  }
});
