// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SHARE_ORIGIN,
  createPlaceLink,
  readSharedPlace,
} from "../src/station/place-share.mjs";

const data = JSON.parse(
  readFileSync(new URL("../src/views/station-points.json", import.meta.url))
);

test("a shared link names a fixed place on the public HTTPS site", () => {
  const link = createPlaceLink("b1-e4", data);
  const url = new URL(link);
  assert.equal(url.origin, SHARE_ORIGIN);
  assert.ok(SHARE_ORIGIN.startsWith("https://"));
  assert.equal(url.pathname, "/station-map");
  assert.equal(url.searchParams.get("destination"), "b1-e4");
  assert.equal(url.searchParams.get("shared"), "1");
  // A shared place never carries the sharer's own position.
  assert.equal(url.searchParams.get("start"), null);
  assert.equal(url.searchParams.get("point"), null);
});

test("unknown or disabled places cannot be shared", () => {
  assert.equal(createPlaceLink("nope", data), null);
  assert.equal(createPlaceLink("", data), null);
});

test("the recipient sees the place only for a valid shared query", () => {
  const place = readSharedPlace({ destination: "b1-e4", shared: "1" }, data);
  assert.equal(place.id, "b1-e4");
  assert.equal(place.floor, "B1");
  assert.equal(readSharedPlace({ destination: "b1-e4" }, data), null);
  assert.equal(
    readSharedPlace({ destination: "nope", shared: "1" }, data),
    null
  );
  assert.equal(
    readSharedPlace({ destination: ["b1-e4", "b1-e7"], shared: "1" }, data),
    null
  );
});
