// SPDX-License-Identifier: AGPL-3.0-or-later
// Draws the shipped walking network over each floor's walkable area as SVG
// for the README:  node scripts/render-walking-maps.mjs
//   solid teal  corridor from the metro station plan
//   orange dash corridor from a schematic redraw (1F hall, B2 platforms)
//   thin dots   inferred entrance (accessibility unknown)
//   red ring    point not bound to the network
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { walkAreas, parsePath } from "../src/station/walk-areas.mjs";
import { plans } from "../src/views/station-floor-plans.mjs";

const root = new URL("../src/", import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const network = read("station/walking-network.json");
const points = read("views/station-points.json").points;
const outDir = new URL("../../assets/maps/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const nodes = new Map(
  network.nodes.map(([id, floor, x, y]) => [id, { id, floor, x, y }])
);
const bound = new Set(network.bound);
const r1 = (n) => Math.round(n * 10) / 10;
const ring = (points) =>
  "M" + points.map(([x, y]) => `${r1(x)} ${r1(y)}`).join("L") + "Z";

for (const floor of network.floors) {
  const areas = walkAreas(floor);
  const all = areas.flat(2);
  const xs = all.map((p) => p[0]),
    ys = all.map((p) => p[1]);
  const pad = 30,
    minX = Math.min(...xs) - pad,
    minY = Math.min(...ys) - pad,
    width = Math.max(...xs) - minX + pad,
    height = Math.max(...ys) - minY + pad;
  const lines = { metro: [], schematic: [], entrance: [] };
  for (const [a, b, , flags = 0] of network.walkways) {
    const from = nodes.get(a),
      to = nodes.get(b);
    if (from.floor !== floor) continue;
    const kind = flags & 2 ? "entrance" : flags & 4 ? "schematic" : "metro";
    lines[kind].push(`M${r1(from.x)} ${r1(from.y)}L${r1(to.x)} ${r1(to.y)}`);
  }
  const stroke = Math.max(width, height) / 900;
  // Non-metro blocks (car parks, other operators) are not walkable.
  const plan = plans[floor],
    scale = plan.scale ?? 1,
    [ox, oy] = plan.offset ?? [0, 0];
  const blocked = (plan.regions ?? [])
    .filter(([kind]) => kind === "context")
    .flatMap(([, d]) =>
      parsePath(d).map((r) =>
        r.map(([x, y]) => [ox + x * scale, oy + y * scale])
      )
    )
    .map(ring)
    .join("");
  const dots = (points[floor] ?? [])
    .map((p) =>
      bound.has(p.id)
        ? `<circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="${r1(
            stroke * 3
          )}" fill="#1c3f45"/>`
        : `<circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="${r1(
            stroke * 9
          )}" fill="none" stroke="#d12d33" stroke-width="${r1(stroke * 2.5)}"/>`
    )
    .join("");
  const covered = (points[floor] ?? []).filter((p) => bound.has(p.id)).length;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r1(
    minX
  )} ${r1(minY)} ${r1(width)} ${r1(height)}" width="${Math.round(
    width
  )}" height="${Math.round(height)}">
<title>${floor} walking network: ${covered}/${
    (points[floor] ?? []).length
  } points bound</title>
<rect x="${r1(minX)}" y="${r1(minY)}" width="${r1(width)}" height="${r1(
    height
  )}" fill="#f7fafa"/>
${areas
  .map(
    (area) =>
      `<path d="${area
        .map(ring)
        .join(
          ""
        )}" fill="#dceff2" fill-rule="evenodd" stroke="#4f7f87" stroke-width="${r1(
        stroke * 1.5
      )}"/>`
  )
  .join("\n")}
<path d="${blocked}" fill="#e6eaeb" stroke="#9aa9ad" stroke-width="${r1(
    stroke
  )}"/>
<path d="${lines.metro.join(
    ""
  )}" fill="none" stroke="#2f8f9d" stroke-width="${r1(
    stroke
  )}" stroke-opacity=".55"/>
<path d="${lines.schematic.join(
    ""
  )}" fill="none" stroke="#e08a1e" stroke-width="${r1(
    stroke
  )}" stroke-opacity=".6" stroke-dasharray="${r1(stroke * 4)} ${r1(
    stroke * 3
  )}"/>
<path d="${lines.entrance.join(
    ""
  )}" fill="none" stroke="#5b6b70" stroke-width="${r1(
    stroke * 1.2
  )}" stroke-dasharray="${r1(stroke)} ${r1(stroke * 2)}"/>
${dots}
</svg>
`;
  writeFileSync(new URL(`walk-${floor.toLowerCase()}.svg`, outDir), svg);
  console.log(
    `✔ walk-${floor.toLowerCase()}.svg ${covered}/${
      (points[floor] ?? []).length
    } bound, ${Math.round(svg.length / 1024)} KB`
  );
}
