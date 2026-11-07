#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync, writeFileSync } from "node:fs";
import { plans } from "../app/src/views/station-floor-plans.mjs";
import { scatterBoundary } from "../app/src/station/boundary.mjs";

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
  const positions = scatterBoundary(plans[floor], {
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
      type:
        platformOutline[floor] === position.boundary.outline
          ? ["qrcode", "platform"]
          : "qrcode",
      name: `QR ${number} 號示意定位點`,
      x: position.x,
      y: position.y,
      description: "站圖邊界上的示意定位點，尚未現地設置。",
      zone: null,
      placement: "boundary-demo",
      boundary: position.boundary,
    };
  });
  data.points[floor] = [...existing, ...generated];
}
const output = JSON.stringify(data, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (original !== output)
    throw new Error(
      "Regenerate boundary QR points with node tools/scatter-station-qrcode.mjs"
    );
} else writeFileSync(file, output);
console.log("32 stable QR navigation points along the B1–B4 outer boundaries.");
