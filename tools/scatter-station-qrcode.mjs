#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync, writeFileSync } from "node:fs";
import {
  plans,
  b2RailPlatforms,
} from "../app/src/views/station-floor-plans.mjs";
import {
  scatterBoundary,
  boundarySegments,
} from "../app/src/station/boundary.mjs";

const file = new URL("../app/src/views/station-points.json", import.meta.url);
const original = readFileSync(file, "utf8");
const data = JSON.parse(original);
// B3 also has a concourse outline. B4 consists of its platform outline.
const platformOutline = { B3: 1, B4: 0 };
data.categories.qrcode = {
  name: "QR 定位點",
  colorToken: "primary-900",
  iconColor: "#244e57",
};
for (const [floor, points] of Object.entries(data.points)) {
  const existing = points.filter(
    (point) =>
      !(
        [point.type].flat().includes("qrcode") &&
        point.placement === "boundary-demo"
      )
  );
  // Keep the original eight B2 anchors stable when adding railway outlines.
  const basePlan =
    floor === "B2"
      ? { ...plans.B2, outlines: plans.B2.outlines.slice(0, 1) }
      : plans[floor];
  const positions = scatterBoundary(basePlan, {
    seed: 20261108 + Number(floor.slice(1)),
    obstacles: existing,
  });
  const generated = positions.map((position, index) => {
    const number = String(index + 1).padStart(2, "0");
    const id = `${floor.toLowerCase()}-qr-${number}`;
    if (existing.some((point) => point.id === id))
      throw new Error(`Point ID already exists: ${id}`);
    return {
      id,
      type: "qrcode",
      name: `QR ${number} 號示意定位點`,
      x: position.x,
      y: position.y,
      description: "站圖邊界上的示意定位點，尚未現地設置。",
      zone: null,
      placement: "boundary-demo",
      boundary: position.boundary,
    };
  });
  if (floor === "B2") {
    const edges = boundarySegments(plans.B2);
    b2RailPlatforms.forEach((platform, index) => {
      let number = 0;
      for (const edgeIndex of [0, 2]) {
        const edge = edges.find(
          (e) => e.outline === index + 1 && e.edge === edgeIndex
        );
        for (const fraction of [0.25, 0.75]) {
          number++;
          const operator = platform.operator === "tra" ? "臺鐵" : "高鐵";
          const side = edgeIndex === 0 ? "北側" : "南側";
          generated.push({
            id: `b2-${platform.id}-qr-${String(number).padStart(2, "0")}`,
            type: ["qrcode", "platform"],
            name: `${operator} ${platform.number} 號月台${side} QR ${number} 號示意定位點`,
            x:
              Math.round(
                (edge.from[0] + fraction * (edge.to[0] - edge.from[0])) * 100
              ) / 100,
            y:
              Math.round(
                (edge.from[1] + fraction * (edge.to[1] - edge.from[1])) * 100
              ) / 100,
            description:
              "月台邊界上的示意定位點，尚未現地設置；位置與通行關係待現場核對。",
            zone: null,
            placement: "boundary-demo",
            platformId: platform.id,
            boundary: { outline: index + 1, edge: edgeIndex, fraction },
          });
        }
      }
    });
  }
  data.points[floor] = [
    ...existing,
    ...generated.filter(
      (point) =>
        floor === "B2" || point.boundary.outline !== platformOutline[floor]
    ),
  ];
}
const output = JSON.stringify(data, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (original !== output)
    throw new Error(
      "Regenerate boundary QR points with node tools/scatter-station-qrcode.mjs"
    );
} else writeFileSync(file, output);
console.log("20 non-platform QR points plus 16 B2 railway platform points.");
