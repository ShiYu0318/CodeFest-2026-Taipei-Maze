// SPDX-License-Identifier: AGPL-3.0-or-later
// Map-facing helpers over the diagram walking network: plan a route, draw
// it per floor, find the nearest reachable facility and describe the first
// step. Directions are map bearings (north up) because QR codes carry no
// facing; this module never claims "turn left/right".
import { createWalkingRouter } from "./walking.mjs";
import { expandWalkingNetwork } from "./walking-data.mjs";

const FLOORS = ["1F", "B1", "B2", "B3", "B4"];
const helper = (id) => /-corner-\d+$|-entrance$/.test(id);

export function walkingRouter(compact) {
  return createWalkingRouter(expandWalkingNetwork(compact));
}

const options = ({
  stepFree,
  unavailableConnectorIds,
  excludedEdgeTypes,
  allowFareGates,
} = {}) => ({
  stepFree: stepFree === true,
  excludedEdgeTypes: excludedEdgeTypes ?? [],
  allowFareGates: allowFareGates === true,
  unavailableConnectorIds: unavailableConnectorIds ?? [],
});

export function planWalk(router, request = {}) {
  if (!request.startId) return { type: "NoStart" };
  if (!request.destinationId) return { type: "NoDestination" };
  if (request.startId === request.destinationId) return { type: "Arrived" };
  return router.route({
    startPointId: request.startId,
    destinationId: request.destinationId,
    ...options(request),
  });
}

/** Continuous polylines of the route that lie on one floor. */
export function routeLines(route, floor) {
  if (!route) return [];
  const lines = [];
  let current = null;
  for (const edge of route.edges) {
    const from = route.nodes.find((node) => node.id === edge.from);
    if (edge.type !== "walkway" || from?.floor !== floor) {
      current = null;
      continue;
    }
    const [a, b] = edge.geometry;
    if (!current) {
      current = [a];
      lines.push(current);
    }
    current.push(b);
  }
  return lines.filter((line) => line.length >= 2);
}

export function nearestPlace(router, request = {}) {
  if (!request.startId) return { type: "NoStart" };
  const result = router.nearest({
    startPointId: request.startId,
    category: request.category,
    limit: 1,
    ...options(request),
  });
  return result.type === "success"
    ? {
        type: "success",
        pointId: result.matches[0].pointId,
        route: result.matches[0].route,
      }
    : result;
}

/** The first visible step: a map bearing, or up/down for a floor change. */
export function nextArrow(route) {
  if (!route?.edges?.length) return { kind: "none" };
  const nodes = new Map(route.nodes.map((node) => [node.id, node]));
  const toward =
    route.nodeIds.slice(1).find((id) => !helper(id)) ?? route.nodeIds.at(-1);
  for (const edge of route.edges) {
    const from = nodes.get(edge.from),
      to = nodes.get(edge.to);
    if (from.floor !== to.floor)
      return {
        kind:
          FLOORS.indexOf(to.floor) > FLOORS.indexOf(from.floor) ? "down" : "up",
        floor: to.floor,
        via: edge.type,
        toward: edge.from,
      };
    const dx = to.x - from.x,
      dy = to.y - from.y;
    if (Math.hypot(dx, dy) < 2) continue;
    // 0° is map north (up), clockwise like a compass.
    const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    return { kind: "map", angle: Math.round(angle), toward };
  }
  return { kind: "none" };
}

const bearing = (from, to) =>
  Math.round(
    ((Math.atan2(to.x - from.x, -(to.y - from.y)) * 180) / Math.PI + 360) % 360
  );

/**
 * Split a route into steps a visitor can page through:
 *   walk   — one diagram turn or named landmark at a time, on one floor;
 *            instructions refer to the next real named checkpoint
 *   floor  — change floors by elevator, stairs or escalator
 *   arrive — the destination
 * Directions remain map bearings; nothing here claims left or right.
 */
export function routeSteps(route) {
  if (!route?.edges?.length) return [];
  const nodes = new Map(route.nodes.map((node) => [node.id, node]));
  const steps = [];
  let walk = null;
  const named = (id) => !helper(id);
  const closeWalk = () => {
    if (!walk) return;
    const ids = walk.ids;
    const boundaries = [0];
    for (let i = 1; i < ids.length - 1; i++) {
      const before = nodes.get(ids[i - 1]),
        here = nodes.get(ids[i]),
        after = nodes.get(ids[i + 1]);
      const delta = Math.abs(bearing(before, here) - bearing(here, after));
      const turn = Math.min(delta, 360 - delta);
      const longEnough =
        Math.hypot(here.x - before.x, here.y - before.y) >= 2 &&
        Math.hypot(after.x - here.x, after.y - here.y) >= 2;
      if (named(ids[i]) || (longEnough && turn >= 35)) boundaries.push(i);
    }
    boundaries.push(ids.length - 1);
    for (let part = 1; part < boundaries.length; part++) {
      const start = boundaries[part - 1],
        end = boundaries[part];
      const section = ids.slice(start, end + 1);
      const first = nodes.get(section[0]);
      let angle = null;
      for (let i = 1; i < section.length && angle === null; i++) {
        const to = nodes.get(section[i]);
        if (Math.hypot(to.x - first.x, to.y - first.y) >= 2)
          angle = bearing(first, to);
      }
      // Display real named landmarks, while the highlighted geometry ends at
      // the actual diagram turn. Never expose helper IDs as public QR points.
      const fromId =
        ids
          .slice(0, start + 1)
          .reverse()
          .find(named) ?? ids.find(named);
      const toId = ids.slice(end).find(named) ?? [...ids].reverse().find(named);
      if (angle !== null && fromId && toId)
        steps.push({
          kind: "walk",
          floor: walk.floor,
          fromId,
          toId,
          viaIds: section.slice(1, -1).filter(named),
          line: section.map((id) => [nodes.get(id).x, nodes.get(id).y]),
          angle,
        });
    }
    walk = null;
  };
  for (const edge of route.edges) {
    const from = nodes.get(edge.from),
      to = nodes.get(edge.to);
    if (from.floor !== to.floor) {
      closeWalk();
      steps.push({
        kind: "floor",
        floor: from.floor,
        toFloor: to.floor,
        fromId: edge.from,
        toId: edge.to,
        via: edge.type,
        direction:
          FLOORS.indexOf(to.floor) > FLOORS.indexOf(from.floor) ? "down" : "up",
      });
      continue;
    }
    if (!walk) walk = { floor: from.floor, ids: [edge.from] };
    walk.ids.push(edge.to);
  }
  closeWalk();
  const end = nodes.get(route.nodeIds.at(-1));
  steps.push({ kind: "arrive", floor: end.floor, toId: end.id });
  return steps.map((step, index) => ({ ...step, index }));
}
