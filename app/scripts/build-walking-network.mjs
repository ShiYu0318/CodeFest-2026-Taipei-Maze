// SPDX-License-Identifier: AGPL-3.0-or-later
// Builds src/station/walking-network.json from the redrawn floor plans.
//   node scripts/build-walking-network.mjs          write the network
//   node scripts/build-walking-network.mjs --check  fail if it is stale
//
// Walkways come from a visibility graph inside each floor's walkable
// outline (non-metro "context" blocks are holes). Every same-floor segment
// is checked with segmentInWalkAreas, so no edge crosses a wall in the
// diagram. Costs are diagram units, never metres. Facilities drawn just off
// a corridor get a short inferred entrance whose accessibility is unknown;
// vertical links come only from station-connections.json.
import { readFileSync, writeFileSync } from "node:fs";
import { walkAreas } from "../src/station/walk-areas.mjs";
import {
  pointInWalkAreas,
  segmentInWalkAreas,
} from "../src/station/walk-geometry.mjs";
import { validateWalkingNetwork } from "../src/station/walking.mjs";
import { expandWalkingNetwork } from "../src/station/walking-data.mjs";

const root = new URL("../src/", import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const stationData = read("views/station-points.json");
const connections = read("views/station-connections.json");
const output = new URL("station/walking-network.json", root);

const FLOORS = ["1F", "B1", "B2", "B3", "B4"];
const PAGE = { B1: 1, B2: 2, B3: 3, B4: 4 };
const SOURCE = {
  id: "metro-051",
  url: "https://web.metro.taipei/img/ALL/INFOPDF/051.pdf",
  pages: 4,
};
// Areas redrawn from other references (see THIRD_PARTY_NOTICES.md). Their
// corridors are routable within the area but flagged as schematic.
const SCHEMATIC_SOURCES = [
  {
    id: "taipei-1f-photo",
    citation:
      "使用者提供的「台北車站 1F 平面圖」照片（萬俊廷攝），獨立北向示意座標，未經現地驗證",
    pages: 1,
  },
  {
    id: "tra-taipei-b2",
    url: "https://tip.railway.gov.tw/tra-tip-web/tip/img/0a00114c-3667-4e2f-a897-78b2864d8eba/1140x900",
    pages: 1,
  },
];
const SCHEMATIC_BY_FLOOR = { "1F": "taipei-1f-photo", B2: "tra-taipei-b2" };
const ENTRANCE_MAX = 25; // diagram units from an icon to its corridor
// 1F rooms (restrooms, ticket offices) sit deeper off the hall.
const ENTRANCE_MAX_BY_FLOOR = { "1F": 50 };
const CORNER_INSET = 6;
const NEIGHBOURS = 8;
const SHORT_STAIR_RADIUS = 18;
const CLEARANCE = 1;
const VERTICAL_COST = { elevator: 120, stairs: 90, escalator: 90 };

const round = (n) => Math.round(n * 10) / 10;
const types = (point) => [point.type].flat();
function nearestBoundaryPoint(p, areas) {
  let best = null;
  for (const rings of areas)
    for (const ring of rings)
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i],
          b = ring[(i + 1) % ring.length],
          dx = b[0] - a[0],
          dy = b[1] - a[1],
          l = dx * dx + dy * dy,
          t = l
            ? Math.max(
                0,
                Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)
              )
            : 0,
          q = [a[0] + t * dx, a[1] + t * dy],
          d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (!best || d < best.d) best = { q, d };
      }
  return best;
}
const EDGE_MARGIN = 2; // points closer than this to a wall get an entrance
/** Step a boundary point far enough into the walkable area to route from. */
function inside(q, areas) {
  for (const r of [3, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40])
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2,
        p = [round(q[0] + Math.cos(a) * r), round(q[1] + Math.sin(a) * r)];
      if (
        pointInWalkAreas(p, areas) &&
        nearestBoundaryPoint(p, areas).d >= EDGE_MARGIN &&
        // q sits on a wall; check the short entrance from one unit inside.
        segmentInWalkAreas(
          [q[0] + (p[0] - q[0]) / r, q[1] + (p[1] - q[1]) / r],
          p,
          areas,
          0
        )
      )
        return p;
    }
  return null;
}

/** Fallback: the nearest roomy walkable spot within max, by grid search. */
function nearestInterior(p, areas, max) {
  let best = null;
  for (let dx = -max; dx <= max; dx += 1)
    for (let dy = -max; dy <= max; dy += 1) {
      const d = Math.hypot(dx, dy);
      if (d > max || (best && d >= best.d)) continue;
      const q = [round(p[0] + dx), round(p[1] + dy)];
      if (
        pointInWalkAreas(q, areas) &&
        nearestBoundaryPoint(q, areas).d >= EDGE_MARGIN
      )
        best = { d, q };
    }
  return best?.q ?? null;
}

export function buildWalkingNetwork() {
  const nodes = [],
    edges = [],
    bindings = {},
    facilities = [],
    coverage = {};
  const walkways = [];
  // Each corridor pair is stored once; flags: 1 = passes short stairs,
  // 2 = inferred entrance with unknown accessibility, 4 = schematic area.
  // Area index per node: 0 is the main outline; on B2, 1-4 are platforms.
  const areaOf = new Map();
  const walkway = (from, to, flags = 0) => {
    if (schematicNode(from) || schematicNode(to)) flags |= 4;
    const cost = round(Math.hypot(to.x - from.x, to.y - from.y)) || 0.1;
    walkways.push(
      flags ? [from.id, to.id, cost, flags] : [from.id, to.id, cost]
    );
  };
  const schematicNode = (node) =>
    node.floor === "1F" ||
    (node.floor === "B2" && (areaOf.get(node.id) ?? 0) > 0);
  for (const floor of FLOORS) {
    const areas = walkAreas(floor),
      areaIndex = (p) => areas.findIndex((area) => pointInWalkAreas(p, [area])),
      points = stationData.points[floor] ?? [],
      shortStairs = points.filter((p) => /短梯/.test(p.name)),
      floorNodes = [],
      covered = [],
      uncovered = [];
    // Facility and location points.
    for (const point of points) {
      const p = [point.x, point.y];
      if (
        pointInWalkAreas(p, areas) &&
        nearestBoundaryPoint(p, areas).d >= EDGE_MARGIN
      ) {
        const node = { id: point.id, floor, x: point.x, y: point.y };
        areaOf.set(node.id, areaIndex(p));
        nodes.push(node);
        floorNodes.push(node);
        bindings[point.id] = point.id;
        covered.push(point.id);
        continue;
      }
      const near = nearestBoundaryPoint(p, areas);
      const reach = ENTRANCE_MAX_BY_FLOOR[floor] ?? ENTRANCE_MAX;
      const door =
        (near && near.d <= reach ? inside(near.q, areas) : null) ??
        // Points drawn exactly on a shared edge: step to the nearest
        // walkable spot instead (still an inferred, unknown-access entrance).
        nearestInterior(p, areas, 8);
      if (!door) {
        uncovered.push(point.id);
        continue;
      }
      // A short inferred entrance from the corridor to the drawn icon.
      const node = { id: point.id, floor, x: point.x, y: point.y };
      const entry = {
        id: `${point.id}-entrance`,
        floor,
        x: door[0],
        y: door[1],
      };
      areaOf.set(entry.id, areaIndex(door));
      areaOf.set(node.id, areaIndex(door));
      nodes.push(node, entry);
      floorNodes.push(entry);
      bindings[point.id] = point.id;
      covered.push(point.id);
      walkway(node, entry, 2);
    }
    // Corner nodes let routes bend around walls.
    const corners = [];
    for (const rings of areas)
      for (const ring of rings)
        for (let i = 0; i < ring.length; i++) {
          const v = ring[i],
            prev = ring[(i - 1 + ring.length) % ring.length],
            next = ring[(i + 1) % ring.length],
            a = Math.atan2(prev[1] - v[1], prev[0] - v[0]),
            b = Math.atan2(next[1] - v[1], next[0] - v[0]);
          for (const angle of [(a + b) / 2, (a + b) / 2 + Math.PI]) {
            const c = [
              round(v[0] + Math.cos(angle) * CORNER_INSET),
              round(v[1] + Math.sin(angle) * CORNER_INSET),
            ];
            if (
              pointInWalkAreas(c, areas) &&
              !corners.some((o) => Math.hypot(o[0] - c[0], o[1] - c[1]) < 4)
            )
              corners.push(c);
          }
        }
    corners.forEach((c, i) => {
      const node = {
        id: `${floor.toLowerCase()}-corner-${i}`,
        floor,
        x: c[0],
        y: c[1],
      };
      areaOf.set(node.id, areaIndex(c));
      nodes.push(node);
      floorNodes.push(node);
    });
    // Visibility edges: each node keeps its nearest clear neighbours.
    const linked = new Set();
    for (const a of floorNodes) {
      const visible = floorNodes
        .filter((b) => b !== a)
        .map((b) => ({ b, d: Math.hypot(b.x - a.x, b.y - a.y) }))
        .sort((x, y) => x.d - y.d)
        .filter(({ b }) =>
          segmentInWalkAreas([a.x, a.y], [b.x, b.y], areas, CLEARANCE)
        )
        .slice(0, NEIGHBOURS);
      for (const { b } of visible) {
        const key = [a.id, b.id].sort().join("|");
        if (linked.has(key)) continue;
        linked.add(key);
        // A corridor passing a short flight of stairs is not step-free.
        const stepped = shortStairs.some((s) => {
          const dx = b.x - a.x,
            dy = b.y - a.y,
            l = dx * dx + dy * dy || 1,
            t = Math.max(
              0,
              Math.min(1, ((s.x - a.x) * dx + (s.y - a.y) * dy) / l)
            );
          return (
            Math.hypot(a.x + t * dx - s.x, a.y + t * dy - s.y) <
            SHORT_STAIR_RADIUS
          );
        });
        walkway(a, b, stepped ? 1 : 0);
      }
    }
    coverage[floor] = {
      points: points.length,
      covered: covered.length,
      uncovered,
    };
  }
  // Vertical links from the shared connection data only.
  for (const link of connections.connections) {
    const from = link.from.pointId,
      to = link.to.pointId;
    if (!bindings[from] || !bindings[to]) continue;
    const type =
      link.type === "elevator"
        ? "elevator"
        : link.type === "escalator"
        ? "escalator"
        : "stairs";
    // Unconfirmed stair types or escalator directions never carry a route.
    const unverified =
      link.typeStatus === "unverified" ||
      (type === "escalator" && link.direction !== "bidirectional");
    for (const [a, b] of [
      [from, to],
      [to, from],
    ])
      edges.push({
        id: `${link.id}__${a}`,
        from: a,
        to: b,
        cost: VERTICAL_COST[type],
        type,
        connectorId: link.id,
        status: "open",
        stepFree: type === "elevator",
        wheelchairPassable:
          type === "elevator" ? link.wheelchairAccessible === true : false,
        requiresTicket: false,
        sourceId: SOURCE.id,
        page: PAGE[link.from.floor] ?? 1,
        verification: unverified ? "unverified" : "desk_checked",
        geometry: [],
      });
  }
  for (const [floor, list] of Object.entries(stationData.points))
    for (const point of list)
      if (bindings[point.id])
        facilities.push({
          pointId: point.id,
          floor,
          types: types(point),
          enabled: point.enabled !== false,
          // Only signage that says so; ordinary restrooms stay unknown.
          accessibleFacility:
            types(point).includes("accessible") || /無障礙/.test(point.name)
              ? true
              : null,
        });
  return {
    schemaVersion: 1,
    version: "2026.11.08-diagram",
    routingUnit: "relative",
    note: "Diagram-derived from the redrawn Taipei Metro station plans; 1F and the B2 railway platforms come from schematic redraws (flag 4). Not a field survey. Costs are relative diagram units. Fare gates are not modelled. No vertical links exist yet between the metro area and 1F or the railway platforms.",
    sources: [SOURCE, ...SCHEMATIC_SOURCES],
    sourceId: SOURCE.id,
    schematicSources: SCHEMATIC_BY_FLOOR,
    pages: PAGE,
    floors: FLOORS,
    nodes: nodes.map((n) => [n.id, n.floor, n.x, n.y]),
    walkways,
    vertical: edges,
    bound: Object.keys(bindings),
    facilities: facilities.map((f) => [
      f.pointId,
      f.floor,
      f.types,
      f.enabled,
      f.accessibleFacility,
    ]),
    coverage,
  };
}

const network = buildWalkingNetwork();
const errors = validateWalkingNetwork(expandWalkingNetwork(network));
if (errors.length) {
  console.error(
    `✖ walking network invalid:\n- ${errors.slice(0, 20).join("\n- ")}`
  );
  process.exit(1);
}
const text = JSON.stringify(network) + "\n";
const summary = FLOORS.map(
  (f) => `${f} ${network.coverage[f].covered}/${network.coverage[f].points}`
).join(", ");
if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(output, "utf8");
  } catch {
    /* missing file */
  }
  if (current !== text) {
    console.error("✖ walking-network.json is stale; run npm run build:walking");
    process.exit(1);
  }
  console.log(`✔ walking network up to date (${summary})`);
} else {
  writeFileSync(output, text);
  console.log(
    `✔ wrote ${network.nodes.length} nodes, ${
      network.walkways.length
    } corridor pairs, ${
      network.vertical.length
    } vertical edges (${summary}), ${Math.round(text.length / 1024)} KB`
  );
}
