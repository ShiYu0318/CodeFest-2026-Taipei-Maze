#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync, writeFileSync } from "node:fs";
import { plans } from "../app/src/views/station-floor-plans.mjs";
import { scatterBoundary } from "../app/src/station/boundary.mjs";

const file = new URL("../app/src/views/station-points.json", import.meta.url);
const original = readFileSync(file, "utf8");
const data = JSON.parse(original);
// Platform demo QRs were removed. Keep the other samples' existing IDs/positions.
// B3 also has a concourse outline. B4 consists of its platform outline.
const platformOutline = { B3: 1, B4: 0 };
data.categories.qrcode = {
  name: "QR 定位點",
  colorToken: "primary-900",
  iconColor: "#244e57",
};
for (const floor of ["B1", "B2", "B3", "B4"]) {
  const points = data.points[floor];
  const existing = points.filter(
    (point) =>
      !(
        [point.type].flat().includes("qrcode") &&
        point.placement === "boundary-demo"
      )
  );
  const positions = scatterBoundary(plans[floor], {
    seed: 20261108 + Number(floor.slice(1)),
    // Exit annotations added later do not move existing QR anchors.
    obstacles: existing.filter((point) => point.type !== "exit"),
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
  data.points[floor] = [
    ...existing,
    ...generated.filter(
      (point) => point.boundary.outline !== platformOutline[floor]
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
console.log(
  "20 stable QR navigation points outside platform boundaries (B1–B3)."
);
