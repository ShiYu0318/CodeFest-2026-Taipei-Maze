// SPDX-License-Identifier: AGPL-3.0-or-later
import { shortestPath } from "../navigation/dijkstra.mjs";
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const id = (value) =>
  typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,95}$/i.test(value);
const types = ["walkway", "stairs", "elevator", "escalator", "gate"];
const finitePoint = (value) =>
  Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);

export function validateWalkingNetwork(network) {
  const errors = [];
  if (!object(network)) return ["network: expected object"];
  if (
    network.schemaVersion !== 1 ||
    network.routingUnit !== "relative" ||
    typeof network.version !== "string"
  )
    errors.push("network: unsupported schema, version or units");
  for (const field of ["nodes", "edges", "sources", "floors", "facilities"])
    if (!Array.isArray(network[field])) errors.push(`${field}: expected array`);
  if (!object(network.bindings)) errors.push("bindings: expected object");
  if (errors.length) return errors;
  const sources = new Map(),
    nodes = new Map(),
    edgeIds = new Set(),
    poiIds = new Set();
  for (const source of network.sources) {
    if (!object(source) || !id(source.id)) {
      errors.push("source: invalid ID");
      continue;
    }
    let url;
    try {
      url = new URL(source.url);
    } catch {
      /* reported below */
    }
    if (
      sources.has(source.id) ||
      url?.protocol !== "https:" ||
      !Number.isInteger(source.pages) ||
      source.pages < 1
    )
      errors.push(`${source.id}: invalid source`);
    sources.set(source.id, source);
  }
  if (
    !network.floors.length ||
    new Set(network.floors).size !== network.floors.length ||
    network.floors.some((floor) => typeof floor !== "string" || !floor)
  )
    errors.push("floors: invalid or duplicate floors");
  for (const node of network.nodes) {
    if (!object(node) || !id(node.id)) {
      errors.push("node: invalid ID");
      continue;
    }
    if (
      nodes.has(node.id) ||
      !network.floors.includes(node.floor) ||
      ![node.x, node.y].every(Number.isFinite)
    )
      errors.push(`${node.id}: invalid node`);
    nodes.set(node.id, node);
  }
  for (const edge of network.edges) {
    if (!object(edge) || !id(edge.id)) {
      errors.push("edge: invalid ID");
      continue;
    }
    const from = nodes.get(edge.from),
      to = nodes.get(edge.to),
      source = sources.get(edge.sourceId);
    if (
      edgeIds.has(edge.id) ||
      !from ||
      !to ||
      edge.from === edge.to ||
      !Number.isFinite(edge.cost) ||
      edge.cost <= 0
    )
      errors.push(`${edge.id}: invalid endpoints, ID or cost`);
    edgeIds.add(edge.id);
    if (
      !types.includes(edge.type) ||
      !["open", "closed", "unknown"].includes(edge.status) ||
      ![true, false, null].includes(edge.stepFree) ||
      ![true, false, null].includes(edge.wheelchairPassable) ||
      typeof edge.requiresTicket !== "boolean"
    )
      errors.push(`${edge.id}: invalid access metadata`);
    if (
      !["desk_checked", "field_checked", "unverified"].includes(
        edge.verification
      ) ||
      !source ||
      !Number.isInteger(edge.page) ||
      edge.page < 1 ||
      edge.page > source.pages
    )
      errors.push(`${edge.id}: missing source or verification`);
    if (!Array.isArray(edge.geometry)) {
      errors.push(`${edge.id}: missing geometry`);
      continue;
    }
    if (!from || !to) continue;
    if (from.floor !== to.floor) {
      if (
        !["stairs", "elevator", "escalator"].includes(edge.type) ||
        !id(edge.connectorId) ||
        edge.geometry.length
      )
        errors.push(`${edge.id}: invalid vertical connector`);
    } else if (
      edge.geometry.length < 2 ||
      !edge.geometry.every(finitePoint) ||
      Math.hypot(
        edge.geometry[0]?.[0] - from.x,
        edge.geometry[0]?.[1] - from.y
      ) > 0.5 ||
      Math.hypot(
        edge.geometry.at(-1)?.[0] - to.x,
        edge.geometry.at(-1)?.[1] - to.y
      ) > 0.5
    )
      errors.push(`${edge.id}: geometry does not join endpoints`);
  }
  for (const [pointId, nodeId] of Object.entries(network.bindings))
    if (!id(pointId) || !nodes.has(nodeId))
      errors.push(`${pointId}: invalid binding`);
  for (const poi of network.facilities) {
    if (!object(poi) || !id(poi.pointId)) {
      errors.push("facility: invalid point ID");
      continue;
    }
    if (
      poiIds.has(poi.pointId) ||
      !network.bindings[poi.pointId] ||
      !Array.isArray(poi.types) ||
      !poi.types.length ||
      poi.types.some((type) => typeof type !== "string") ||
      typeof poi.enabled !== "boolean" ||
      ![true, false, null].includes(poi.accessibleFacility)
    )
      errors.push(`${poi.pointId}: invalid facility`);
    poiIds.add(poi.pointId);
  }
  return errors;
}

/** Immutable, validated routing snapshot; all distances remain diagram units. */
export function createWalkingRouter(input) {
  let errors = validateWalkingNetwork(input),
    graph;
  try {
    if (!errors.length) graph = JSON.parse(JSON.stringify(input));
  } catch {
    errors = ["network: cannot snapshot data"];
  }
  const invalid = () => ({ type: "InvalidGraph", errors: [...errors] });
  if (errors.length) return { errors, route: invalid, nearest: invalid };
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const edgeById = new Map(graph.edges.map((edge) => [edge.id, edge]));
  const facilities = new Map(graph.facilities.map((poi) => [poi.pointId, poi]));
  const optionsValid = (request) =>
    object(request) &&
    (request.stepFree === undefined || typeof request.stepFree === "boolean") &&
    (request.allowFareGates === undefined ||
      typeof request.allowFareGates === "boolean") &&
    (request.excludedEdgeTypes === undefined ||
      (Array.isArray(request.excludedEdgeTypes) &&
        request.excludedEdgeTypes.every((type) => types.includes(type)))) &&
    (request.unavailableConnectorIds === undefined ||
      (Array.isArray(request.unavailableConnectorIds) &&
        request.unavailableConnectorIds.every(id)));
  function route(request = {}) {
    if (!optionsValid(request)) return { type: "UnsupportedOptions" };
    const startId = graph.bindings[request.startPointId],
      destinationId = graph.bindings[request.destinationId];
    if (
      !nodes.has(startId) ||
      facilities.get(request.startPointId)?.enabled === false
    )
      return { type: "UnknownStart" };
    if (
      !nodes.has(destinationId) ||
      facilities.get(request.destinationId)?.enabled === false
    )
      return { type: "UnknownDestination" };
    const allowed = graph.edges.filter(
      (edge) =>
        edge.status === "open" &&
        edge.verification !== "unverified" &&
        (!edge.requiresTicket || request.allowFareGates === true) &&
        !(request.excludedEdgeTypes ?? []).includes(edge.type) &&
        !(request.unavailableConnectorIds ?? []).includes(edge.connectorId) &&
        (!request.stepFree ||
          (!["stairs", "escalator"].includes(edge.type) &&
            edge.stepFree === true &&
            edge.wheelchairPassable === true))
    );
    const result = shortestPath(
      [...nodes.keys()],
      allowed.map((edge) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        cost: edge.cost,
      })),
      startId,
      destinationId
    );
    if (result.type !== "success") return result;
    const edges = result.route.edgeIds.map((id) => edgeById.get(id));
    return {
      type: "success",
      route: {
        version: graph.version,
        cost: result.route.cost,
        distanceM: null,
        unit: "relative",
        nodeIds: result.route.nodeIds,
        edgeIds: result.route.edgeIds,
        nodes: result.route.nodeIds.map((id) => ({ ...nodes.get(id) })),
        edges: JSON.parse(JSON.stringify(edges)),
        requiresTicket: edges.some((edge) => edge.requiresTicket),
        options: {
          stepFree: request.stepFree === true,
          allowFareGates: request.allowFareGates === true,
          excludedEdgeTypes: [...(request.excludedEdgeTypes ?? [])],
          unavailableConnectorIds: [...(request.unavailableConnectorIds ?? [])],
        },
      },
    };
  }
  function nearest(request = {}) {
    if (
      !optionsValid(request) ||
      typeof request.category !== "string" ||
      !request.category ||
      (request.limit !== undefined &&
        (!Number.isInteger(request.limit) ||
          request.limit < 1 ||
          request.limit > 10))
    )
      return { type: "UnsupportedOptions" };
    if (
      !nodes.has(graph.bindings[request.startPointId]) ||
      facilities.get(request.startPointId)?.enabled === false
    )
      return { type: "UnknownStart" };
    const candidates = graph.facilities.filter(
      (poi) =>
        poi.enabled &&
        poi.types.includes(request.category) &&
        (!request.stepFree || poi.accessibleFacility === true)
    );
    if (!candidates.length) return { type: "NoFacilities" };
    const matches = [];
    for (const poi of candidates) {
      const result = route({ ...request, destinationId: poi.pointId });
      if (result.type === "success")
        matches.push({ pointId: poi.pointId, route: result.route });
    }
    matches.sort(
      (a, b) =>
        a.route.cost - b.route.cost || a.pointId.localeCompare(b.pointId, "en")
    );
    return matches.length
      ? { type: "success", matches: matches.slice(0, request.limit ?? 5) }
      : { type: "NoRoute" };
  }
  return { errors, route, nearest };
}
