// SPDX-License-Identifier: AGPL-3.0-or-later
import { validateGraph } from "./graph.mjs";
const epsilon = 1e-9;
const compare = (a, b) =>
  a.cost - b.cost || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
class MinHeap {
  values = [];
  push(value) {
    const a = this.values;
    a.push(value);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (compare(a[p], a[i]) <= 0) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.values,
      first = a[0],
      last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      while (i < a.length) {
        const l = i * 2 + 1,
          r = l + 1;
        let next = i;
        if (l < a.length && compare(a[l], a[next]) < 0) next = l;
        if (r < a.length && compare(a[r], a[next]) < 0) next = r;
        if (next === i) break;
        [a[i], a[next]] = [a[next], a[i]];
        i = next;
      }
    }
    return first;
  }
}

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
  const adjacency = new Map(graph.nodes.map((n) => [n.id, []]));
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
    else adjacency.get(edge.from_node_id).push(edge);
  }
  const queue = new MinHeap(),
    best = new Map(),
    settled = new Set();
  const initial = {
    id: startId,
    cost: 0,
    key: "",
    nodeIds: [startId],
    edgeIds: [],
  };
  best.set(startId, initial);
  queue.push(initial);
  while (queue.values.length) {
    const current = queue.pop();
    if (best.get(current.id) !== current || settled.has(current.id)) continue;
    settled.add(current.id);
    if (current.id === destinationId) {
      const selected = current.edgeIds.map((id) =>
        graph.edges.find((e) => e.id === id)
      );
      return {
        type: "success",
        route: {
          graphVersion: graph.graph_version,
          nodeIds: current.nodeIds,
          edgeIds: current.edgeIds,
          totalRoutingCost: current.cost,
          totalDistanceM: selected.some((e) => e.distance_m === null)
            ? null
            : selected.reduce((sum, e) => sum + e.distance_m, 0),
          floorSequence: current.nodeIds
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
    for (const edge of adjacency.get(current.id)) {
      if (settled.has(edge.to_node_id)) continue;
      const edgeIds = [...current.edgeIds, edge.id],
        key = edgeIds.join("/"),
        cost = current.cost + edge.routing_cost;
      if (!Number.isFinite(cost))
        return {
          type: "InvalidGraph",
          errors: ["Accumulated routing cost overflow"],
        };
      const old = best.get(edge.to_node_id);
      if (
        !old ||
        cost < old.cost - epsilon ||
        (Math.abs(cost - old.cost) <= epsilon && key < old.key)
      ) {
        const next = {
          id: edge.to_node_id,
          cost,
          key,
          nodeIds: [...current.nodeIds, edge.to_node_id],
          edgeIds,
        };
        best.set(next.id, next);
        queue.push(next);
      }
    }
  }
  return { type: "NoRoute", excludedCategories: [...excluded] };
}
