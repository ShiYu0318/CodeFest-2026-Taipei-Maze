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
 *   walk   — one floor, from a place to the next floor change or the end,
 *            with the named checkpoints passed on the way
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
    const last = walk.ids.at(-1);
    const first = nodes.get(walk.ids[0]);
    // The first move long enough to show a direction.
    let angle = null;
    for (let i = 1; i < walk.ids.length && angle === null; i++) {
      const to = nodes.get(walk.ids[i]);
      if (Math.hypot(to.x - first.x, to.y - first.y) >= 2)
        angle = bearing(first, to);
    }
    if (walk.ids.length >= 2 && angle !== null)
      steps.push({
        kind: "walk",
        floor: walk.floor,
        fromId: walk.ids.find(named) ?? walk.ids[0],
        toId: [...walk.ids].reverse().find(named) ?? last,
        viaIds: walk.ids.slice(1, -1).filter(named),
        line: walk.ids.map((id) => [nodes.get(id).x, nodes.get(id).y]),
        angle,
      });
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
