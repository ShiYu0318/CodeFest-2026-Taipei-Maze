// SPDX-License-Identifier: AGPL-3.0-or-later
import { validateGraph } from "../navigation/graph.mjs";
export const PUBLIC_ORIGIN = "http://home.yoyo899843.com:8000";
const approvedOrigins = [
  PUBLIC_ORIGIN,
  "http://127.0.0.1:8082",
  "http://localhost:8082",
];
const idPattern = /^[a-z][a-z0-9_]{0,63}$/;
const fields = ["type", "v", "site", "point", "graph_major", "confirmed_at"];
const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
function timestamp(value) {
  if (typeof value !== "string") return null;
  const m =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(
      value
    );
  if (!m) return null;
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  d.setUTCHours(hour, minute, second, 0);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  )
    return null;
  if (m[8] !== "Z") {
    const [h, min] = m[8].slice(1).split(":").map(Number);
    if (h > 14 || min > 59 || (h === 14 && min !== 0)) return null;
  }
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}
export function resolveMeetingPoint(graph, points, id) {
  if (
    validateGraph(graph).length ||
    !Array.isArray(points) ||
    typeof id !== "string" ||
    !idPattern.test(id)
  )
    return { type: "InvalidData" };
  const matches = points.filter((p) => record(p) && p.id === id);
  if (matches.length !== 1) return { type: "UnknownPoint" };
  const point = matches[0];
  if (
    point.site_id !== graph.site_id ||
    point.enabled !== true ||
    point.shareable !== true ||
    point.waiting_area_status !== "approved"
  )
    return { type: "PointUnavailable" };
  const required =
    graph.validation_mode === "field_verified_demo"
      ? "field_checked"
      : "synthetic";
  if (
    point.verification_status !== required ||
    !Array.isArray(point.source_ids) ||
    !point.source_ids.length ||
    point.source_ids.some((id) => !graph.sources.some((s) => s.id === id))
  )
    return { type: "InvalidData" };
  const anchor = graph.qr_anchors.find(
      (a) => a.id === point.anchor_id && a.enabled
    ),
    poi = graph.pois.find(
      (p) =>
        p.id === point.destination_poi_id &&
        p.enabled &&
        p.category === "meeting_point"
    );
  if (
    !anchor ||
    !poi ||
    anchor.node_id !== poi.node_id ||
    !graph.messages[point.name_key] ||
    !graph.messages[point.waiting_guidance_key] ||
    typeof point.original_signage !== "string"
  )
    return { type: "InvalidData" };
  const node = graph.nodes.find((n) => n.id === anchor.node_id);
  return { type: "success", point, anchor, poi, node };
}
export function createMeetingLink(graph, points, request = {}) {
  if (!record(request)) return { type: "InvalidInput" };
  const resolved = resolveMeetingPoint(graph, points, request.pointId);
  if (resolved.type !== "success") return resolved;
  const { position } = request;
  if (
    request.confirmedStillHere !== true ||
    !record(position) ||
    position.anchorId !== resolved.anchor.id ||
    position.nodeId !== resolved.node.id ||
    timestamp(position.confirmedAt) === null
  )
    return { type: "LocationConfirmationRequired" };
  const origin = request.origin ?? PUBLIC_ORIGIN;
  if (!approvedOrigins.includes(origin)) return { type: "UnsupportedOrigin" };
  const url = new URL("/meet", origin);
  for (const [key, value] of Object.entries({
    type: "taipei_maze_meeting",
    v: "1",
    site: graph.site_id,
    point: resolved.point.id,
    graph_major: graph.graph_version.split(".")[0],
    confirmed_at: position.confirmedAt,
  }))
    url.searchParams.set(key, value);
  return { ...resolved, url: url.href, confirmedAt: position.confirmedAt };
}
export function parseMeetingLink(raw, graph, points) {
  if (typeof raw !== "string" || new TextEncoder().encode(raw).length > 2048)
    return { type: "InvalidLink" };
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { type: "InvalidLink" };
  }
  if (
    !approvedOrigins.includes(url.origin) ||
    url.pathname !== "/meet" ||
    url.username ||
    url.password ||
    url.hash
  )
    return { type: "UnsupportedOrigin" };
  const keys = [...url.searchParams.keys()];
  if (
    keys.length !== fields.length ||
    new Set(keys).size !== fields.length ||
    keys.some((k) => !fields.includes(k))
  )
    return { type: "InvalidLink" };
  const data = Object.fromEntries(url.searchParams);
  if (
    data.type !== "taipei_maze_meeting" ||
    data.v !== "1" ||
    data.site !== graph.site_id ||
    data.graph_major !== graph.graph_version.split(".")[0]
  )
    return { type: "UnsupportedVersion" };
  if (timestamp(data.confirmed_at) === null) return { type: "InvalidTime" };
  const resolved = resolveMeetingPoint(graph, points, data.point);
  return resolved.type === "success"
    ? { ...resolved, confirmedAt: data.confirmed_at }
    : resolved;
}
export function timeNotice(confirmedAt, now = Date.now()) {
  const time = timestamp(confirmedAt);
  if (time === null || !Number.isFinite(now)) return "invalid";
  if (time - now > 5 * 60_000) return "future";
  if (now - time > 30 * 60_000) return "stale";
  return "unverified";
}
