// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { availableMapHeight } from "../src/station/map-layout.mjs";

test("uses spare viewport space and reserves the route controls", () => {
  assert.equal(availableMapHeight({ height: 900, top: 100, below: 0 }), 776);
  assert.equal(availableMapHeight({ height: 900, top: 100, below: 300 }), 476);
});
test("keeps a usable map on crowded screens and accounts for the keyboard", () => {
  assert.equal(availableMapHeight({ height: 400, top: 300, below: 300 }), 280);
  assert.equal(availableMapHeight({ height: 600, top: -100, below: 100 }), 476);
  assert.equal(
    availableMapHeight({ height: 900, top: 100, below: 0, bottom: 40 }),
    760
  );
});

test("keeps the map larger than a typical route panel", () => {
  const map = availableMapHeight({ height: 900, top: 100, below: 500 });
  assert.equal(map, 524);
  assert.ok(map > 500);
});
