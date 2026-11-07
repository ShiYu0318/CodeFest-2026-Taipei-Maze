// SPDX-License-Identifier: AGPL-3.0-or-later
import { stationPoints } from "./scan.mjs";

/** Query values are untrusted; coordinates and floor always come from local data. */
export function parseStationLocationQuery(query, data) {
  if (!Object.hasOwn(query, "point")) return { type: "Browsing" };
  if (
    typeof query.point !== "string" ||
    !query.point ||
    (query.v !== undefined && query.v !== "1")
  )
    return { type: "InvalidLocation" };
  const point = stationPoints(data).find(
    (p) => p.id === query.point && p.enabled !== false
  );
  return point ? { type: "success", point } : { type: "UnknownPoint" };
}

export function stationLocationQuery(pointId, data, query = {}) {
  const next = { ...query };
  delete next.point;
  delete next.v;
  if (pointId === null) return next;
  if (
    parseStationLocationQuery({ point: pointId, v: "1" }, data).type !==
    "success"
  )
    throw new RangeError("Unknown station point");
  return { ...next, point: pointId, v: "1" };
}
