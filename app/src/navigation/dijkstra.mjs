// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared queue and directed shortest-path search. Callers validate/filter edges.
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

export function shortestPath(nodeIds, edges, startId, destinationId) {
  const adjacency = new Map(nodeIds.map((id) => [id, []]));
  if (!adjacency.has(startId)) return { type: "UnknownStart" };
  if (!adjacency.has(destinationId)) return { type: "UnknownDestination" };
  for (const edge of edges) adjacency.get(edge.from).push(edge);
  const queue = new MinHeap(),
    best = new Map(),
    settled = new Set();
  const first = {
    id: startId,
    cost: 0,
    key: "",
    nodeIds: [startId],
    edgeIds: [],
  };
  best.set(startId, first);
  queue.push(first);
  while (queue.values.length) {
    const current = queue.pop();
    if (best.get(current.id) !== current || settled.has(current.id)) continue;
    settled.add(current.id);
    if (current.id === destinationId)
      return { type: "success", route: current };
    for (const edge of adjacency.get(current.id)) {
      if (settled.has(edge.to)) continue;
      const edgeIds = [...current.edgeIds, edge.id],
        key = edgeIds.join("/"),
        cost = current.cost + edge.cost;
      if (!Number.isFinite(cost))
        return {
          type: "InvalidGraph",
          errors: ["Accumulated routing cost overflow"],
        };
      const prior = best.get(edge.to);
      if (
        !prior ||
        cost < prior.cost - epsilon ||
        (Math.abs(cost - prior.cost) <= epsilon && key < prior.key)
      ) {
        const next = {
          id: edge.to,
          cost,
          key,
          nodeIds: [...current.nodeIds, edge.to],
          edgeIds,
        };
        best.set(next.id, next);
        queue.push(next);
      }
    }
  }
  return { type: "NoRoute" };
}
