// SPDX-License-Identifier: AGPL-3.0-or-later
/** Point browsing never infers accessibility, reachability or a walking route from a label. */
export function stationCatalog(data) {
  return Object.entries(data.points).flatMap(([floorId, points]) =>
    points.map((point) => ({
      id: point.id,
      name: point.name,
      category: Array.isArray(point.type) ? point.type[0] : point.type,
      floorId,
      enabled: point.enabled !== false,
      accessibleFacility: null,
    }))
  );
}
export function navigationCatalog(graph) {
  return graph.pois.map((poi) => ({
    id: poi.id,
    name: graph.messages[poi.name_key],
    category: poi.category,
    floorId: graph.nodes.find((n) => n.id === poi.node_id)?.floor_id ?? "",
    enabled: poi.enabled,
    accessibleFacility:
      poi.accessible_facility === true
        ? true
        : poi.accessible_facility === false
        ? false
        : null,
  }));
}
