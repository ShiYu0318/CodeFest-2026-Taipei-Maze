// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  pointInWalkAreas,
  segmentInWalkAreas,
} from "../src/station/walk-geometry.mjs";
const rectangle = (x1, y1, x2, y2) => [
  [x1, y1],
  [x2, y1],
  [x2, y2],
  [x1, y2],
];
const hall = [[rectangle(0, 0, 100, 100), rectangle(40, 20, 60, 80)]];

test("walk geometry retains concave boundaries and holes instead of the floor bounding box", () => {
  assert.equal(pointInWalkAreas([10, 50], hall), true);
  assert.equal(pointInWalkAreas([50, 50], hall), false);
  assert.equal(pointInWalkAreas([101, 50], hall), false);
  assert.equal(segmentInWalkAreas([10, 50], [90, 50], hall), false);
  assert.equal(segmentInWalkAreas([10, 10], [90, 10], hall), true);
});

test("a narrow missing corridor cannot be skipped between two diagram areas", () => {
  const areas = [[rectangle(0, 0, 10, 10)], [rectangle(11, 0, 20, 10)]];
  assert.equal(segmentInWalkAreas([5, 5], [15, 5], areas), false);
});

test("zero-width corner contacts and obstacle-grazing shortcuts are excluded by clearance", () => {
  const corners = [[rectangle(0, 0, 10, 10)], [rectangle(10, 10, 20, 20)]];
  assert.equal(segmentInWalkAreas([5, 5], [15, 15], corners, 1), false);
  assert.equal(segmentInWalkAreas([39, 19], [61, 19], hall, 2), false);
  assert.equal(segmentInWalkAreas([10, 10], [90, 10], hall, 1), true);
});
