// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  mapTourSteps,
  availableMapTourSteps,
} from "../src/station/map-tour.mjs";
import { catalogs } from "../src/i18n/index.mjs";
test("tour follows endpoints, filters, options, go, map and route actions, skipping missing trip UI", () => {
  const ids = mapTourSteps.map(([id]) => id);
  assert.deepEqual(ids.slice(0, 4), [
    "locate",
    "facilities",
    "route-options",
    "go",
  ]);
  assert.ok(ids.indexOf("marker") < ids.indexOf("route"));
  assert.ok(ids.indexOf("route") < ids.indexOf("route-actions"));
  const root = {
    querySelector: (selector) =>
      selector.includes('route"') ||
      selector.includes("route-actions") ||
      selector.includes("helper")
        ? null
        : {},
  };
  const helper = { querySelector: () => ({}) };
  const available = availableMapTourSteps(root, helper).map(([id]) => id);
  assert.ok(!available.includes("route"));
  assert.ok(!available.includes("route-actions"));
  assert.ok(available.includes("helper"));
  assert.deepEqual(availableMapTourSteps({ querySelector: () => null }), []);
  for (const [id, title] of mapTourSteps)
    for (const [locale, catalog] of Object.entries(catalogs)) {
      assert.equal(typeof catalog[title], "string", locale + " " + title);
      assert.equal(typeof catalog["tour." + id], "string", locale + " " + id);
    }
});
