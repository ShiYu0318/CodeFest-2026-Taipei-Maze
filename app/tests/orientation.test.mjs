// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeCompassHeading,
  findStationPoint,
  headingError,
  HEADING_TOLERANCE,
  MAP_NORTH_DEGREES,
  previewBearing,
} from "../src/navigation/orientation.mjs";

test("heading differences take the shortest turn across north", () => {
  assert.equal(headingError(355, 10), HEADING_TOLERANCE);
  assert.equal(headingError(5, 350), -HEADING_TOLERANCE);
  assert.equal(headingError(355, 11), HEADING_TOLERANCE + 1);
  assert.equal(headingError(5, 349), -HEADING_TOLERANCE - 1);
});

test("preview bearing uses same-floor points and the map north reference", () => {
  const points = {
    B1: [
      { id: "start", x: 10, y: 20 },
      { id: "destination", x: 10, y: 10 },
    ],
    B2: [{ id: "other-floor", x: 10, y: 10 }],
  };
  const start = findStationPoint(points, "start");
  const destination = findStationPoint(points, "destination");
  assert.equal(previewBearing(start, destination), -MAP_NORTH_DEGREES);
  assert.equal(previewBearing(start, start), null);
  assert.equal(
    previewBearing(start, findStationPoint(points, "other-floor")),
    null
  );
  assert.equal(findStationPoint(points, ["start"]), null);
});

test("the compass bridge accepts only numeric readings for the active subscription", () => {
  const reply = (data, name = "compass_heading") =>
    JSON.stringify({ name, data: { subscriptionId: 3, ...data } });
  assert.deepEqual(
    decodeCompassHeading(reply({ headingDegrees: -5, accuracyDegrees: 8 }), 3),
    { degrees: 355, accuracyDegrees: 8 }
  );
  assert.equal(decodeCompassHeading(reply({ headingDegrees: null }), 3), null);
  assert.equal(
    decodeCompassHeading(reply({ headingDegrees: 0 }), 2),
    undefined
  );
  assert.equal(
    decodeCompassHeading(reply({ headingDegrees: "0" }), 3),
    undefined
  );
  assert.equal(
    decodeCompassHeading(reply({ headingDegrees: 0, accuracyDegrees: -1 }), 3),
    undefined
  );
  assert.equal(decodeCompassHeading(reply({}, "qr_code_scan"), 3), undefined);
  assert.equal(decodeCompassHeading("{", 3), undefined);
});
