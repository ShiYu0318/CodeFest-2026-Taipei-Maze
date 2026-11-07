// SPDX-License-Identifier: AGPL-3.0-or-later
import { parseAnchor } from "../navigation/qr.mjs";
export const STATION_QR_SITE = "taipei-main-map-preview";
export function stationPoints(data) {
  return Object.entries(data.points).flatMap(([floor, list]) =>
    list.map((point) => ({ ...point, floor }))
  );
}
export function stationQrPayload(pointId, data) {
  if (!stationPoints(data).some((p) => p.id === pointId && p.enabled !== false))
    throw new RangeError("Unknown station point");
  return JSON.stringify({
    type: "taipei_maze_anchor",
    v: 1,
    site_id: STATION_QR_SITE,
    graph_major: 1,
    anchor_id: `station_${pointId}`,
  });
}
/** Region/connector overview only. Never creates a fictitious same-floor walking edge. */
export function createStationScanSession(data, graph) {
  const points = stationPoints(data),
    byId = new Map(points.map((p) => [p.id, p]));
  if (byId.size !== points.length)
    throw new Error("Duplicate station point ID");
  const anchors = {
    site_id: STATION_QR_SITE,
    graph_version: "1.0.0",
    qr_anchors: points.map((p) => ({
      id: `station_${p.id}`,
      enabled: p.enabled !== false,
      pointId: p.id,
    })),
  };
  let revision = 0;
  const state = {
    destinationId: null,
    position: null,
    stepFree: false,
    excludedEdgeTypes: [],
    unavailableConnectorIds: [],
    arrived: false,
  };
  function overview() {
    const origin = byId.get(state.position?.pointId),
      target = byId.get(state.destinationId);
    if (!target || !origin) return { status: "waiting", steps: [] };
    if (origin.id === target.id) return { status: "at_destination", steps: [] };
    if (!origin.zone || !target.zone)
      return { status: "unavailable", steps: [] };
    if (origin.zone === target.zone) return { status: "same_zone", steps: [] };
    const valid = graph.connections.filter((edge) => {
      const from = byId.get(edge.from?.pointId),
        to = byId.get(edge.to?.pointId);
      return (
        from &&
        to &&
        from.floor === edge.from.floor &&
        to.floor === edge.to.floor &&
        from.zone === edge.from.zone &&
        to.zone === edge.to.zone &&
        edge.direction === "bidirectional" &&
        !["unverified", "inferred"].includes(edge.typeStatus) &&
        !state.unavailableConnectorIds.includes(edge.id) &&
        !state.excludedEdgeTypes.includes(edge.type) &&
        !(
          (state.excludedEdgeTypes.includes("stairs") ||
            state.excludedEdgeTypes.includes("escalator")) &&
          ["stairs-escalator", "stairway"].includes(edge.type)
        ) &&
        (!state.stepFree ||
          (edge.type === "elevator" && edge.wheelchairAccessible === true))
      );
    });
    const queue = [{ zone: origin.zone, steps: [] }],
      visited = new Set([origin.zone]);
    for (const entry of queue) {
      if (entry.zone === target.zone)
        return { status: "connections", steps: entry.steps };
      for (const edge of valid)
        for (const oriented of [
          edge,
          { ...edge, from: edge.to, to: edge.from },
        ]) {
          if (
            oriented.from.zone !== entry.zone ||
            visited.has(oriented.to.zone)
          )
            continue;
          visited.add(oriented.to.zone);
          queue.push({
            zone: oriented.to.zone,
            steps: [...entry.steps, oriented],
          });
        }
    }
    return { status: "unavailable", steps: [] };
  }
  return {
    snapshot() {
      return JSON.parse(
        JSON.stringify({
          ...state,
          token: `station:${revision}`,
          relation: overview(),
        })
      );
    },
    setDestination(pointId) {
      if (!byId.has(pointId) || byId.get(pointId).enabled === false)
        return false;
      state.destinationId = pointId;
      state.arrived = false;
      revision++;
      return true;
    },
    setStepFree(value) {
      state.stepFree = value === true;
      state.arrived = false;
      revision++;
    },
    applySearchSelection({ poiId, proposedOptions } = {}) {
      if (!byId.has(poiId) || byId.get(poiId).enabled === false) return false;
      // Search may only add restrictive preferences; never remove current restrictions.
      if (proposedOptions?.mobilityProfile === "stepFree")
        state.stepFree = true;
      const known = ["walkway", "stairs", "elevator", "escalator", "gate"];
      for (const type of proposedOptions?.excludedEdgeTypes ?? [])
        if (known.includes(type) && !state.excludedEdgeTypes.includes(type))
          state.excludedEdgeTypes.push(type);
      return this.setDestination(poiId);
    },
    markUnavailable(id) {
      if (!graph.connections.some((e) => e.id === id)) return false;
      if (!state.unavailableConnectorIds.includes(id))
        state.unavailableConnectorIds.push(id);
      state.arrived = false;
      revision++;
      return true;
    },
    scan(payload) {
      const parsed = parseAnchor(payload, anchors);
      if (parsed.type !== "success") return parsed;
      return this.locatePoint(parsed.anchor.pointId, "qr");
    },
    locatePoint(pointId, source = "url") {
      const point = byId.get(pointId);
      if (!point || point.enabled === false) return { type: "UnknownPoint" };
      if (!["qr", "url"].includes(source)) return { type: "InvalidSource" };
      state.position = {
        pointId: point.id,
        floor: point.floor,
        source,
        confirmedAt: source === "qr" ? new Date().toISOString() : null,
      };
      state.arrived = false;
      revision++;
      return { type: "success", point };
    },
    confirmArrival(token) {
      if (
        token !== `station:${revision}` ||
        !state.destinationId ||
        state.position?.pointId !== state.destinationId ||
        state.arrived
      )
        return false;
      state.arrived = true;
      revision++;
      return true;
    },
    reset() {
      state.destinationId = null;
      state.position = null;
      state.arrived = false;
      state.unavailableConnectorIds = [];
      state.excludedEdgeTypes = [];
      revision++;
    },
  };
}
