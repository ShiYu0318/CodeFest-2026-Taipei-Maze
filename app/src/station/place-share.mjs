// SPDX-License-Identifier: AGPL-3.0-or-later
// Share a fixed station place with a friend. The link only names the place
// (as the friend's destination); it never carries the sharer's position,
// time or route, so it is not live location sharing.
import { stationPoints } from "./scan.mjs";

export const SHARE_ORIGIN =
  (typeof process !== "undefined" && process.env?.VUE_APP_SHARE_ORIGIN) ||
  "https://home.yoyo899843.com";

function findPlace(id, data) {
  if (typeof id !== "string" || !id) return null;
  const point = stationPoints(data).find((item) => item.id === id);
  return point && point.enabled !== false ? point : null;
}

export function createPlaceLink(pointId, data, origin = SHARE_ORIGIN) {
  if (!findPlace(pointId, data)) return null;
  const url = new URL("/station-map", origin);
  url.searchParams.set("destination", pointId);
  url.searchParams.set("shared", "1");
  return url.href;
}

/** The shared place in a route query, or null when it is not a valid share. */
export function readSharedPlace(query, data) {
  if (query?.shared !== "1" || typeof query.destination !== "string")
    return null;
  return findPlace(query.destination, data);
}
