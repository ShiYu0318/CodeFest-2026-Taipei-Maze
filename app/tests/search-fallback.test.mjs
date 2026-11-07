// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stationCatalog } from "../src/search/catalog.mjs";
import { searchCatalog } from "../src/search/search.mjs";
import { withLocalizedFallback } from "../src/search/fallback.mjs";

const read = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const data = read("../src/views/station-points.json");
const dictionary = read("../src/search/dictionary.json");
const catalog = stationCatalog(data);
const search = (query) =>
  withLocalizedFallback(
    searchCatalog(query, catalog, dictionary, { prototype: true }),
    query,
    catalog
  );

test("Vietnamese, Thai, Korean and Japanese facility words now find places", () => {
  for (const query of ["nhà vệ sinh", "ห้องน้ำ", "화장실", "トイレ"]) {
    const result = search(query);
    assert.equal(result.status, "matched", query);
    assert.ok(result.matches.length > 0, query);
    assert.ok(
      result.matches.every((m) => m.category === "restroom"),
      query
    );
    assert.ok(result.matches.every((m) => typeof m.poiId === "string"));
  }
});

test("dictionary results are left untouched", () => {
  const direct = searchCatalog("廁所", catalog, dictionary, {
    prototype: true,
  });
  assert.deepEqual(search("廁所"), direct);
});

test("unknown words still report no match", () => {
  assert.equal(search("spaceship").status, "noMatch");
});
