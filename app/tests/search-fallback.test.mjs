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

test("gate names match with or without the spaces typography adds", () => {
  for (const query of ["北1門", "北 1 門", "北1 門"]) {
    const result = search(query);
    assert.equal(result.status, "matched", query);
    assert.ok(
      result.matches.some((m) => /北 1 門/.test(m.name)),
      `${query} → ${result.matches.map((m) => m.name).join(", ")}`
    );
  }
});

test("loaded names support operator words, floor filters, exit codes and numbered facilities", () => {
  for (const [query, expected] of [
    ["台鐵", "b2-tra-3-qr-01"],
    ["高鐵", "b2-hsr-1-qr-01"],
    ["M5", "b1-exit-m5"],
    ["高鐵1號月台", "b2-hsr-1-qr-01"],
    ["電梯4", "b1-e4"],
    ["廁所M5方向", "b1-wc-m5"],
  ]) {
    const result = search(query);
    assert.equal(result.status, "matched", query);
    assert.ok(
      result.matches.some((match) => match.poiId === expected),
      query
    );
  }
  for (const query of ["B1 廁所", "地下一樓 廁所"]) {
    const result = search(query);
    assert.equal(result.status, "matched", query);
    assert.ok(result.matches.length > 0);
    assert.ok(
      result.matches.every(
        (match) => match.floorId === "B1" && match.category === "restroom"
      ),
      query
    );
  }
  const floor = search("B2");
  assert.equal(floor.status, "matched");
  assert.ok(floor.matches.every((match) => match.floorId === "B2"));
});
test("structured name search keeps accessibility restrictions and does not silently ignore unknown modifiers", () => {
  assert.equal(search("廁所xyz").status, "needsClarification");
  assert.equal(search("B1 B2 廁所").status, "needsClarification");
  const result = search("無障礙 M5");
  assert.equal(result.proposedOptions.mobilityProfile, "stepFree");
  assert.equal(
    result.matches.length,
    0,
    "names do not prove facility accessibility"
  );
});

test("name retrieval does not confuse numbered codes or include disabled points", () => {
  const entries = [
    {
      id: "m50",
      name: "M50 出口",
      floorId: "B1",
      category: "exit",
      enabled: true,
      accessibleFacility: null,
    },
  ];
  assert.equal(
    searchCatalog("M5", entries, dictionary, { prototype: true }).matches
      .length,
    0
  );
  const disabled = stationCatalog({
    points: {
      B1: [{ id: "closed", name: "封閉設施", type: "exit", enabled: false }],
    },
  });
  assert.equal(disabled[0].enabled, false);
  assert.equal(
    searchCatalog("封閉設施", disabled, dictionary, { prototype: true }).matches
      .length,
    0
  );
});

test("facility numbers do not match platform numbers or carriage numbers", () => {
  for (const query of ["電梯1", "電梯4", "4號電梯"]) {
    const result = search(query);
    assert.equal(result.status, "matched", query);
    assert.ok(result.matches.length > 0);
    assert.ok(
      result.matches.every((match) => !/^b2-(?:tra|hsr)-/.test(match.poiId)),
      query + " must not use a platform/carriage number as a lift number"
    );
  }
});
test("recognized route restrictions compose with named destinations", () => {
  for (const query of ["不要樓梯 M5", "不要樓梯 台鐵", "不要樓梯 高鐵"]) {
    const result = search(query);
    assert.equal(result.status, "matched", query);
    assert.ok(result.matches.length > 0, query);
    assert.ok(
      result.proposedOptions.excludedEdgeTypes.includes("stairs"),
      query
    );
  }
});
