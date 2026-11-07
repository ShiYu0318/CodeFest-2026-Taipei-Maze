import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createMeetingLink,
  parseMeetingLink,
  resolveMeetingPoint,
  timeNotice,
  PUBLIC_ORIGIN,
} from "../src/meeting/meeting.mjs";
import { parseAnchor } from "../src/navigation/qr.mjs";
const graph = JSON.parse(
  readFileSync(new URL("../src/navigation/demo-graph.json", import.meta.url))
);
const points = JSON.parse(
  readFileSync(new URL("../src/meeting/meeting-points.json", import.meta.url))
);
const stamp = "2026-11-07T08:00:00Z";
const position = { anchorId: "qr_a", nodeId: "b1_a", confirmedAt: stamp };
const build = (extra = {}) =>
  createMeetingLink(graph, points, {
    pointId: "mp_a",
    position,
    confirmedStillHere: true,
    ...extra,
  });

test("meeting whitelist requires same enabled anchor/POI node and synthetic/field distinction", () => {
  assert.equal(resolveMeetingPoint(graph, points, "mp_a").type, "success");
  for (const mutate of [
    (p) => (p[0].shareable = false),
    (p) => (p[0].enabled = false),
    (p) => (p[0].waiting_area_status = "unknown"),
    (p) => (p[0].destination_poi_id = "poi_restroom"),
    (p) => (p[0].site_id = "other"),
    (p) => (p[0].source_ids = ["missing"]),
  ]) {
    const bad = structuredClone(points);
    mutate(bad);
    assert.notEqual(resolveMeetingPoint(graph, bad, "mp_a").type, "success");
  }
  assert.notEqual(
    resolveMeetingPoint(graph, points, "missing").type,
    "success"
  );
});
test("sharing preserves original scan time and requires explicit waiting acknowledgement", () => {
  const r = build();
  assert.equal(r.type, "success");
  const url = new URL(r.url);
  assert.equal(url.origin, PUBLIC_ORIGIN);
  assert.equal(url.pathname, "/meet");
  assert.equal(url.searchParams.get("confirmed_at"), stamp);
  assert.equal(url.searchParams.has("name"), false);
  for (const extra of [
    { confirmedStillHere: false },
    { position: null },
    { position: { ...position, anchorId: "qr_b2_lift" } },
    { position: { ...position, nodeId: "b2_lift" } },
  ])
    assert.notEqual(build(extra).type, "success");
});
test("strict meeting link round-trips without assigning recipient location", () => {
  const r = parseMeetingLink(build().url, graph, points);
  assert.equal(r.type, "success");
  assert.equal(r.point.id, "mp_a");
  assert.equal(r.confirmedAt, stamp);
  assert.equal("position" in r, false);
  assert.notEqual(parseAnchor(build().url, graph).type, "success");
});
test("rejects duplicate/unknown parameters, unsupported versions/site/point and unsafe origins", () => {
  const original = build().url;
  for (const change of [
    (u) => u.searchParams.append("point", "mp_b"),
    (u) => u.searchParams.set("x", "1"),
    (u) => u.searchParams.set("v", "2"),
    (u) => u.searchParams.set("site", "other"),
    (u) => u.searchParams.set("point", "missing"),
    (u) => u.searchParams.set("graph_major", "9"),
    (u) => (u.hostname = "example.com"),
    (u) => (u.username = "someone"),
    (u) => (u.hash = "other"),
    (u) => (u.pathname = "/other"),
  ]) {
    const u = new URL(original);
    change(u);
    assert.notEqual(
      parseMeetingLink(u.href, graph, points).type,
      "success",
      u.href
    );
  }
  for (const raw of ["javascript:alert(1)", null, "x".repeat(2049)])
    assert.notEqual(parseMeetingLink(raw, graph, points).type, "success");
});
test("strict calendar timestamps reject rollover and missing timezone", () => {
  for (const value of [
    "2026-02-30T08:00:00Z",
    "2026-11-07T25:00:00Z",
    "2026-11-07T08:00:00",
    "2026-11-07T08:00:00+99:00",
    "bad",
  ]) {
    const u = new URL(build().url);
    u.searchParams.set("confirmed_at", value);
    assert.notEqual(parseMeetingLink(u.href, graph, points).type, "success");
  }
});
test("stale/future timestamps are advisory; they do not expire static links or prove presence", () => {
  assert.equal(
    timeNotice(stamp, Date.parse("2026-11-07T08:10:00Z")),
    "unverified"
  );
  assert.equal(timeNotice(stamp, Date.parse("2026-11-07T09:00:00Z")), "stale");
  assert.equal(timeNotice(stamp, Date.parse("2026-11-07T07:00:00Z")), "future");
});
