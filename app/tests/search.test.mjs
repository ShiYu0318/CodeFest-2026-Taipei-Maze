import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  searchCatalog,
  normalizeQuery,
  osaDistance,
} from "../src/search/search.mjs";
import { stationCatalog, navigationCatalog } from "../src/search/catalog.mjs";
const dictionary = JSON.parse(
  readFileSync(new URL("../src/search/dictionary.json", import.meta.url))
);
const graph = JSON.parse(
  readFileSync(new URL("../src/navigation/demo-graph.json", import.meta.url))
);
const catalog = [
  {
    id: "wc",
    name: "測試廁所",
    category: "restroom",
    floorId: "b2",
    enabled: true,
    accessibleFacility: true,
  },
  {
    id: "lift",
    name: "測試電梯",
    category: "elevator",
    floorId: "b1",
    enabled: true,
    accessibleFacility: true,
  },
  {
    id: "wc_unknown",
    name: "一般廁所",
    category: "restroom",
    floorId: "b1",
    enabled: true,
    accessibleFacility: null,
  },
  {
    id: "hidden",
    name: "停用廁所",
    category: "restroom",
    floorId: "b1",
    enabled: false,
  },
];
const search = (query, extra = {}) =>
  searchCatalog(query, catalog, dictionary, {
    prototype: true,
    uiLocale: "zh-TW",
    currentOptions: {
      mobilityProfile: "standard",
      excludedEdgeTypes: [],
      unavailableConnectorIds: [],
    },
    ...extra,
  });

test("seven language aliases point to the same existing POIs, not fabricated facilities", () => {
  for (const q of [
    "洗手間",
    "toilet",
    "nhà vệ sinh",
    "kamar kecil",
    "ห้องน้ำ",
    "화장실",
    "トイレ",
  ]) {
    const r = search(q);
    assert.equal(r.status, "matched", q);
    assert.deepEqual(
      r.matches.map((m) => m.poiId),
      ["wc", "wc_unknown"]
    );
    assert.equal(r.matches[0].conceptId, "facility.restroom");
  }
  assert.equal(search("我要去高鐵").status, "noMatch");
  assert.deepEqual(search("我要去高鐵").matches, []);
});
test("normalization preserves Vietnamese diacritics and bounds raw and expanded code points", () => {
  assert.equal(normalizeQuery("  ＴＯＩＬＥＴ  "), "toilet");
  assert.equal(search(" ＴＯＩＬＥＴ ").status, "matched");
  assert.equal(normalizeQuery("NHÀ VỆ SINH"), "nhà vệ sinh");
  for (const q of ["a".repeat(81), "㍿".repeat(21), null, ""])
    assert.equal(search(q).status, "invalidInput");
});
test("OSA recognizes deletion and adjacent swap only as explicit suggestions", () => {
  assert.equal(osaDistance("toielt", "toilet"), 1);
  assert.equal(osaDistance("restrom", "restroom"), 1);
  for (const q of ["restrom", "toielt"]) {
    const r = search(q);
    assert.equal(r.status, "suggestionsOnly");
    assert.equal(r.matches[0].matchType, "fuzzy");
    assert.equal(r.requiresConfirmation, true);
  }
  for (const q of ["wc", "M9", "B8", "qr_a"])
    assert.equal(search(q).status, "noMatch");
});
test("unknown conditions, negation and multiple concepts require clarification", () => {
  for (const q of [
    "不是廁所",
    "不要無障礙廁所",
    "不要電梯",
    "toilet not accessible",
    "便宜的廁所",
    "toilet elevator",
    "toiletry",
  ]) {
    const r = search(q);
    assert.ok(["needsClarification", "noMatch"].includes(r.status), q);
    assert.equal(r.matches.length, 0, q);
  }
});
test("avoid-stairs is additive and distinct from wheelchair requirements", () => {
  const r = search("不要樓梯 我要去廁所");
  assert.equal(r.status, "matched");
  assert.deepEqual(r.proposedOptions.excludedEdgeTypes, ["stairs"]);
  assert.equal(r.proposedOptions.mobilityProfile, "standard");
  const stronger = search("toilet", {
    currentOptions: {
      mobilityProfile: "stepFree",
      excludedEdgeTypes: ["elevator"],
      unavailableConnectorIds: ["lift_1"],
    },
  });
  assert.equal(stronger.proposedOptions.mobilityProfile, "stepFree");
  assert.deepEqual(stronger.proposedOptions.excludedEdgeTypes, ["elevator"]);
  assert.deepEqual(stronger.proposedOptions.unavailableConnectorIds, [
    "lift_1",
  ]);
});
test("accessible restroom requires facility evidence and proposes step-free routing", () => {
  const r = search("accessible toilet");
  assert.equal(r.status, "matched");
  assert.deepEqual(
    r.matches.map((m) => m.poiId),
    ["wc"]
  );
  assert.equal(r.proposedOptions.mobilityProfile, "stepFree");
  assert.equal(r.recognizedIntents.includes("accessible"), true);
});
test("nearest is recognized but never fakes ranking without origin/graph support", () => {
  const r = search("nearest restroom");
  assert.equal(r.status, "needsClarification");
  assert.equal(r.reason, "nearestUnavailable");
  assert.deepEqual(r.matches, []);
});
test("release search excludes unreviewed seed aliases and rejects invalid dictionaries", () => {
  assert.equal(search("toilet", { prototype: false }).status, "noMatch");
  const d = structuredClone(dictionary);
  d.aliases.find((a) => a.text === "toilet").review_status = "approved";
  assert.equal(searchCatalog("toilet", catalog, d).status, "matched");
  d.aliases[0].concept_id = "missing";
  assert.equal(searchCatalog("廁所", catalog, d).status, "invalidDictionary");
});
test("fuzzy budget exhaustion reports incomplete instead of certain no-match", () => {
  assert.equal(search("restrom", { workBudget: 1 }).status, "incomplete");
});
test("catalog adapters keep source IDs; do not infer facility accessibility from names", () => {
  const entries = stationCatalog({
    points: {
      B1: [
        { id: "x", type: "restroom", name: "無障礙廁所", description: "示意" },
      ],
    },
  });
  assert.equal(entries[0].id, "x");
  assert.equal(entries[0].accessibleFacility, null);
  assert.equal(entries[0].floorId, "B1");
  const nav = navigationCatalog(graph);
  assert.ok(nav.some((p) => p.id === "poi_restroom"));
  assert.equal(nav.find((p) => p.id === "poi_restroom").name, "測試廁所");
});

test("an exact supplied POI name wins over alias fragments within its name", () => {
  const entries = [
    ...catalog,
    {
      id: "wc_north",
      name: "廁所（北側東段）",
      category: "restroom",
      floorId: "B1",
      enabled: true,
      accessibleFacility: null,
    },
  ];
  const r = searchCatalog("廁所（北側東段）", entries, dictionary, {
    prototype: true,
  });
  assert.equal(r.status, "matched");
  assert.deepEqual(
    r.matches.map((m) => m.poiId),
    ["wc_north"]
  );
  assert.equal(r.matches[0].matchType, "exact");
});

test("conflicting normalized aliases are rejected rather than picking the first array entry", () => {
  const d = structuredClone(dictionary);
  d.aliases.push({
    ...d.aliases.find((a) => a.text === "toilet"),
    concept_id: "facility.elevator",
  });
  assert.equal(
    searchCatalog("toilet", catalog, d, { prototype: true }).status,
    "invalidDictionary"
  );
});
test("fuzzy ties across concepts require clarification", () => {
  const d = structuredClone(dictionary);
  d.aliases = [
    {
      locale: "en",
      text: "ramp",
      concept_id: "facility.exit",
      review_status: "approved",
      source_ids: ["team_seed"],
    },
    {
      locale: "en",
      text: "lamp",
      concept_id: "facility.elevator",
      review_status: "approved",
      source_ids: ["team_seed"],
    },
  ];
  const r = searchCatalog("camp", catalog, d);
  assert.equal(r.status, "needsClarification");
  assert.equal(r.matches.length, 0);
});

test("accessible search selection feeds the same synthetic session planner and uses the elevator", async () => {
  const { createSession } = await import("../src/navigation/session.mjs");
  const s = createSession(graph);
  s.acceptQr(
    JSON.stringify({
      type: "taipei_maze_anchor",
      v: 1,
      site_id: graph.site_id,
      graph_major: 1,
      anchor_id: "qr_a",
    })
  );
  s.confirmLocation();
  const r = searchCatalog(
    "accessible toilet",
    navigationCatalog(graph),
    dictionary,
    { prototype: true }
  );
  assert.equal(r.status, "matched");
  assert.deepEqual(
    r.matches.map((m) => m.poiId),
    ["poi_restroom"]
  );
  s.applySearchSelection({
    poiId: r.matches[0].poiId,
    proposedOptions: r.proposedOptions,
  });
  assert.equal(s.state.phase, "confirm_location");
  s.confirmLocation();
  assert.equal(s.state.phase, "ready");
  assert.ok(s.state.plan.route.edgeIds.includes("e_lift_up"));
  assert.ok(!s.state.plan.route.edgeIds.includes("e_stairs_up"));
});

test("unknown numbered and lettered facility identifiers never degrade to generic fuzzy facilities", () => {
  for (const q of [
    "toilet1",
    "restroom0",
    "elevator2",
    "exitA",
    "elevatorB",
    "gate12",
  ]) {
    const r = search(q);
    assert.equal(r.status, "noMatch", q);
    assert.equal(r.matches.length, 0);
  }
  const exact = searchCatalog(
    "exitA",
    [
      {
        id: "exita",
        name: "exitA",
        category: "exit",
        floorId: "B1",
        enabled: true,
        accessibleFacility: null,
      },
    ],
    dictionary,
    { prototype: true }
  );
  assert.equal(exact.status, "matched");
  assert.equal(exact.matches[0].matchType, "exact");
});
test("joined recognizable English negation is not repaired into a positive fuzzy destination", () => {
  for (const q of ["norestroom", "noelevator", "notoilet"]) {
    const r = search(q);
    assert.equal(r.status, "needsClarification", q);
    assert.equal(r.matches.length, 0);
  }
});
