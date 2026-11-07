// SPDX-License-Identifier: AGPL-3.0-or-later
const idPattern = /^[a-z][a-z0-9_]{0,63}$/;
const finite = (n) => typeof n === "number" && Number.isFinite(n);
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Validate an assembled graph snapshot. Returns errors instead of throwing on external data. */
export function validateGraph(graph) {
  const errors = [];
  const fail = (message) => errors.push(message);
  if (!object(graph)) return ["Graph must be an object"];
  const groups = [
    "floors",
    "nodes",
    "edges",
    "connectors",
    "pois",
    "qr_anchors",
    "landmarks",
    "orientation_guides",
    "sources",
  ];
  for (const name of groups)
    if (!Array.isArray(graph[name])) fail(`${name}: expected array`);
  if (errors.length) return errors;
  if (!/^1\.\d+\.\d+$/.test(graph.schema_version ?? ""))
    fail("Unsupported schema major");
  if (
    !/^\d+\.\d+\.\d+$/.test(graph.graph_version ?? "") ||
    !idPattern.test(graph.site_id ?? "")
  )
    fail("Invalid graph identity");
  if (
    !["synthetic_demo", "field_verified_demo"].includes(graph.validation_mode)
  )
    fail("Unknown validation mode");
  if (!["relative", "meters"].includes(graph.routing_unit))
    fail("Unknown routing unit");
  if (!object(graph.messages)) return [...errors, "messages: expected catalog"];
  const maps = {};
  for (const group of groups) {
    maps[group] = new Map();
    for (const item of graph[group]) {
      if (!object(item) || !idPattern.test(item.id ?? "")) {
        fail(`${group}: invalid item ID`);
        continue;
      }
      if (maps[group].has(item.id)) fail(`${group}: duplicate ${item.id}`);
      maps[group].set(item.id, item);
    }
  }
  if (errors.length) return errors;
  const key = (value, context) => {
    if (
      typeof value !== "string" ||
      typeof graph.messages[value] !== "string" ||
      !graph.messages[value].trim()
    )
      fail(`${context}: missing message`);
  };
  const ref = (group, value, context) => {
    if (!maps[group].has(value)) fail(`${context}: missing ${group} ${value}`);
  };
  const refs = (group, values, context) => {
    if (!Array.isArray(values)) fail(`${context}: expected references`);
    else values.forEach((v) => ref(group, v, context));
  };
  const verified = (item) => {
    if (
      !["synthetic", "desk_checked", "field_checked"].includes(
        item.verification_status
      )
    )
      fail(`${item.id}: unknown verification`);
    if (
      graph.validation_mode === "field_verified_demo" &&
      item.verification_status !== "field_checked"
    )
      fail(`${item.id}: requires field verification`);
  };
  for (const group of groups.filter((g) => g !== "sources"))
    for (const item of graph[group]) {
      refs("sources", item.source_ids, item.id);
      if (!item.source_ids?.length) fail(`${item.id}: source required`);
    }
  for (const floor of graph.floors) {
    key(floor.label_key, floor.id);
    key(floor.coverage_key, floor.id);
    const box = floor.view_box;
    if (
      !object(box) ||
      ![box.x, box.y, box.width, box.height].every(finite) ||
      box.width <= 0 ||
      box.height <= 0
    )
      fail(`${floor.id}: invalid viewBox`);
  }
  for (const node of graph.nodes) {
    ref("floors", node.floor_id, node.id);
    key(node.label_key, node.id);
    verified(node);
    refs("landmarks", node.landmark_ids, node.id);
    if (
      ![
        "junction",
        "qr_anchor",
        "exit",
        "facility",
        "connector_landing",
      ].includes(node.type) ||
      node.zone_id !== "public_demo"
    )
      fail(`${node.id}: invalid type or zone`);
    const box = maps.floors.get(node.floor_id)?.view_box;
    if (
      !finite(node.x) ||
      !finite(node.y) ||
      !box ||
      node.x < box.x ||
      node.x > box.x + box.width ||
      node.y < box.y ||
      node.y > box.y + box.height
    )
      fail(`${node.id}: coordinates outside floor`);
  }
  for (const connector of graph.connectors) {
    verified(connector);
    key(connector.label_key, connector.id);
    refs("nodes", connector.landing_node_ids, connector.id);
    if (!["stairs", "elevator", "escalator"].includes(connector.type))
      fail(`${connector.id}: invalid connector type`);
  }
  if (errors.length) return errors;
  for (const edge of graph.edges) {
    const from = maps.nodes.get(edge.from_node_id),
      to = maps.nodes.get(edge.to_node_id);
    ref("nodes", edge.from_node_id, edge.id);
    ref("nodes", edge.to_node_id, edge.id);
    verified(edge);
    if (
      edge.from_node_id === edge.to_node_id ||
      !finite(edge.routing_cost) ||
      edge.routing_cost <= 0
    )
      fail(`${edge.id}: positive cost and distinct nodes required`);
    if (
      !["walkway", "stairs", "elevator", "escalator", "gate"].includes(
        edge.type
      ) ||
      !["open", "closed", "unknown"].includes(edge.status) ||
      edge.zone_id !== "public_demo"
    )
      fail(`${edge.id}: invalid type/status/zone`);
    for (const field of ["step_free", "wheelchair_passable"])
      if (!["yes", "no", "unknown"].includes(edge[field]))
        fail(`${edge.id}: invalid ${field}`);
    if (
      edge.distance_m !== null &&
      (!finite(edge.distance_m) || edge.distance_m <= 0)
    )
      fail(`${edge.id}: invalid distance`);
    if (
      graph.routing_unit === "meters" &&
      (edge.distance_m === null || edge.routing_cost !== edge.distance_m)
    )
      fail(`${edge.id}: meter costs require measured distance`);
    if (!Array.isArray(edge.geometry)) {
      fail(`${edge.id}: invalid geometry`);
      continue;
    }
    if (!from || !to) continue;
    if (from.floor_id !== to.floor_id) {
      const connector = maps.connectors.get(edge.connector_id);
      if (
        !connector ||
        connector.type !== edge.type ||
        !connector.landing_node_ids?.includes(from.id) ||
        !connector.landing_node_ids?.includes(to.id) ||
        edge.geometry.length
      )
        fail(`${edge.id}: invalid cross-floor connector`);
    } else {
      if (edge.connector_id !== null)
        fail(`${edge.id}: same-floor connector unsupported`);
      const geometry = edge.geometry;
      if (
        geometry.length < 2 ||
        geometry.some(
          (p) => !Array.isArray(p) || p.length !== 2 || !p.every(finite)
        )
      ) {
        fail(`${edge.id}: invalid geometry`);
        continue;
      }
      const box = maps.floors.get(from.floor_id)?.view_box;
      if (
        !box ||
        geometry.some(
          ([x, y]) =>
            x < box.x ||
            x > box.x + box.width ||
            y < box.y ||
            y > box.y + box.height
        )
      )
        fail(`${edge.id}: geometry outside floor`);
      if (
        Math.hypot(geometry[0][0] - from.x, geometry[0][1] - from.y) > 0.5 ||
        Math.hypot(geometry.at(-1)[0] - to.x, geometry.at(-1)[1] - to.y) > 0.5
      )
        fail(`${edge.id}: geometry endpoints mismatch`);
    }
  }
  for (const poi of graph.pois) {
    ref("nodes", poi.node_id, poi.id);
    key(poi.name_key, poi.id);
    if (
      typeof poi.enabled !== "boolean" ||
      typeof poi.original_signage !== "string"
    )
      fail(`${poi.id}: invalid POI`);
  }
  for (const lm of graph.landmarks) {
    ref("nodes", lm.node_id, lm.id);
    key(lm.name_key, lm.id);
    verified(lm);
    if (!object(lm.visibility_context))
      fail(`${lm.id}: missing visibility context`);
  }
  for (const anchor of graph.qr_anchors) {
    ref("nodes", anchor.node_id, anchor.id);
    ref("landmarks", anchor.face_landmark_id, anchor.id);
    verified(anchor);
    refs("edges", anchor.departure_edge_ids, anchor.id);
    if (typeof anchor.enabled !== "boolean")
      fail(`${anchor.id}: invalid enabled`);
    if (!Array.isArray(anchor.departure_edge_ids)) continue;
    for (const id of anchor.departure_edge_ids ?? [])
      if (maps.edges.get(id)?.from_node_id !== anchor.node_id)
        fail(`${anchor.id}: departure mismatch`);
  }
  if (errors.length) return errors;
  const contexts = new Set();
  for (const guide of graph.orientation_guides) {
    verified(guide);
    key(guide.text_key, guide.id);
    ref("nodes", guide.node_id, guide.id);
    ref("edges", guide.outgoing_edge_id, guide.id);
    ref("landmarks", guide.face_landmark_id, guide.id);
    const edge = maps.edges.get(guide.outgoing_edge_id);
    if (edge?.from_node_id !== guide.node_id)
      fail(`${guide.id}: outgoing mismatch`);
    if (guide.context_type === "anchor_departure") {
      const a = maps.qr_anchors.get(guide.anchor_id);
      if (
        !a ||
        a.node_id !== guide.node_id ||
        !a.departure_edge_ids.includes(guide.outgoing_edge_id) ||
        guide.incoming_connector_id !== null
      )
        fail(`${guide.id}: anchor context mismatch`);
    } else if (guide.context_type === "connector_exit") {
      if (
        guide.anchor_id !== null ||
        !maps.connectors
          .get(guide.incoming_connector_id)
          ?.landing_node_ids?.includes(guide.node_id)
      )
        fail(`${guide.id}: connector context mismatch`);
    } else fail(`${guide.id}: unknown context`);
    const context = JSON.stringify([
      guide.context_type,
      guide.anchor_id,
      guide.incoming_connector_id,
      guide.node_id,
      guide.outgoing_edge_id,
    ]);
    if (contexts.has(context))
      fail(`${guide.id}: duplicate orientation context`);
    contexts.add(context);
  }
  return errors;
}
