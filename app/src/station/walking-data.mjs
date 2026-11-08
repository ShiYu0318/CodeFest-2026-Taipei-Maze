// SPDX-License-Identifier: AGPL-3.0-or-later
// The shipped walking network is stored compactly (each corridor pair once,
// geometry rebuilt from node coordinates) and expanded here into the full,
// validated format that createWalkingRouter expects.
const FLAG_STEPPED = 1,
  FLAG_ENTRANCE = 2,
  // Drawn from a schematic redraw (1F hall, railway platforms), not the
  // metro station plan; kept routable but labelled as such.
  FLAG_SCHEMATIC = 4;

export function expandWalkingNetwork(compact) {
  const nodes = compact.nodes.map(([id, floor, x, y]) => ({ id, floor, x, y }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges = [];
  for (const [a, b, cost, flags = 0] of compact.walkways) {
    const from = byId.get(a),
      to = byId.get(b);
    const stepped = (flags & FLAG_STEPPED) !== 0,
      entrance = (flags & FLAG_ENTRANCE) !== 0,
      schematic = (flags & FLAG_SCHEMATIC) !== 0;
    for (const [x, y] of [
      [from, to],
      [to, from],
    ])
      if (x && y)
        edges.push({
          id: `${x.id}__${y.id}`,
          from: x.id,
          to: y.id,
          cost,
          type: "walkway",
          status: "open",
          // Inferred entrances: accessibility unknown, never step-free.
          stepFree: entrance ? null : !stepped,
          wheelchairPassable: entrance ? null : !stepped,
          requiresTicket: false,
          sourceId: schematic
            ? compact.schematicSources[x.floor]
            : compact.sourceId,
          page: schematic ? 1 : compact.pages[x.floor],
          verification: "desk_checked",
          geometry: [
            [x.x, x.y],
            [y.x, y.y],
          ],
          ...(entrance ? { entranceInferred: true } : {}),
          ...(schematic ? { schematic: true } : {}),
        });
  }
  return {
    schemaVersion: compact.schemaVersion,
    version: compact.version,
    routingUnit: compact.routingUnit,
    note: compact.note,
    sources: compact.sources,
    floors: compact.floors,
    nodes,
    edges: [...edges, ...compact.vertical],
    bindings: Object.fromEntries(compact.bound.map((id) => [id, id])),
    facilities: compact.facilities.map(
      ([pointId, floor, types, enabled, accessibleFacility]) => ({
        pointId,
        floor,
        types,
        enabled,
        accessibleFacility,
      })
    ),
    coverage: compact.coverage,
  };
}
