// SPDX-License-Identifier: AGPL-3.0-or-later
import { validateGraph } from "./graph.mjs";
import { shortestPath } from "./dijkstra.mjs";

/** Pure directed weighted routing; never relax mobility constraints to manufacture a result. */
export function planRoute(graph, request = {}) {
  const errors = validateGraph(graph);
  if (errors.length) return { type: "InvalidGraph", errors };
  const {
    startId,
    destinationId,
    mobilityProfile = "standard",
    unavailableConnectorIds = [],
    excludedEdgeTypes = [],
  } = request;
  if (
    !["standard", "stepFree"].includes(mobilityProfile) ||
    !Array.isArray(excludedEdgeTypes) ||
    excludedEdgeTypes.some(
      (type) =>
        !["walkway", "stairs", "elevator", "escalator", "gate"].includes(type)
    ) ||
    !Array.isArray(unavailableConnectorIds) ||
    unavailableConnectorIds.some((id) => typeof id !== "string")
  )
    return { type: "UnsupportedOptions" };
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  if (!nodes.has(startId)) return { type: "UnknownStart" };
  if (!nodes.has(destinationId)) return { type: "UnknownDestination" };
  const available = [];
  const excluded = new Set();
  for (const edge of graph.edges) {
    let reason = null;
    if (edge.status !== "open") reason = "status";
    else if (excludedEdgeTypes.includes(edge.type)) reason = "excludedEdgeType";
    else if (unavailableConnectorIds.includes(edge.connector_id))
      reason = "unavailableConnector";
    else if (
      mobilityProfile === "stepFree" &&
      (["stairs", "escalator"].includes(edge.type) ||
        edge.step_free !== "yes" ||
        edge.wheelchair_passable !== "yes")
    )
      reason = "mobility";
    if (reason) excluded.add(reason);
    else
      available.push({
        id: edge.id,
        from: edge.from_node_id,
        to: edge.to_node_id,
        cost: edge.routing_cost,
      });
  }
  const result = shortestPath(
    [...nodes.keys()],
    available,
    startId,
    destinationId
  );
  if (result.type !== "success")
    return result.type === "NoRoute"
      ? { ...result, excludedCategories: [...excluded] }
      : result;
  const selected = result.route.edgeIds.map((id) =>
    graph.edges.find((e) => e.id === id)
  );
  return {
    type: "success",
    route: {
      graphVersion: graph.graph_version,
      nodeIds: result.route.nodeIds,
      edgeIds: result.route.edgeIds,
      totalRoutingCost: result.route.cost,
      totalDistanceM: selected.some((e) => e.distance_m === null)
        ? null
        : selected.reduce((sum, e) => sum + e.distance_m, 0),
      floorSequence: result.route.nodeIds
        .map((id) => nodes.get(id).floor_id)
        .filter((f, i, a) => i === 0 || a[i - 1] !== f),
      connectorIds: [
        ...new Set(selected.map((e) => e.connector_id).filter(Boolean)),
      ],
      optionsSnapshot: {
        mobilityProfile,
        excludedEdgeTypes: [...excludedEdgeTypes],
        unavailableConnectorIds: [...unavailableConnectorIds],
      },
    },
  };
}
