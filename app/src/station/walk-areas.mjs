// SPDX-License-Identifier: AGPL-3.0-or-later
// Walkable areas of each floor, derived from the redrawn plan outlines.
// Non-metro "context" blocks (parking, other operators) are holes.
import { plans, b2Outline } from "../views/station-floor-plans.mjs";

/** Minimal parser for the M/L/H/V/Z path commands used by the plans. */
export function parsePath(d) {
  const rings = [],
    tokens = d.match(/[MLHVZmlhvz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  let ring = null,
    x = 0,
    y = 0,
    sx = 0,
    sy = 0,
    cmd = null,
    i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    if (cmd === "M" || cmd === "m") {
      x = cmd === "M" ? num() : x + num();
      y = cmd === "M" ? num() : y + num();
      ring = [[x, y]];
      rings.push(ring);
      [sx, sy] = [x, y];
      cmd = cmd === "M" ? "L" : "l";
    } else if (cmd === "L") ring.push([(x = num()), (y = num())]);
    else if (cmd === "l") ring.push([(x += num()), (y += num())]);
    else if (cmd === "H") ring.push([(x = num()), y]);
    else if (cmd === "h") ring.push([(x += num()), y]);
    else if (cmd === "V") ring.push([x, (y = num())]);
    else if (cmd === "v") ring.push([x, (y += num())]);
    else if (cmd === "Z" || cmd === "z") [x, y] = [sx, sy];
    else throw new Error(`Unsupported path command ${cmd}`);
  }
  return rings;
}

export function walkAreas(floor) {
  const plan = plans[floor],
    scale = plan.scale ?? 1,
    [ox, oy] = plan.offset ?? [0, 0],
    move = ([px, py]) => [ox + px * scale, oy + py * scale];
  const outlines = floor === "B2" ? [b2Outline] : plan.outlines;
  const holes = (plan.regions ?? [])
    .filter(([kind]) => kind === "context")
    .flatMap(([, d]) => parsePath(d).map((ring) => ring.map(move)));
  return outlines.map((d) => [
    ...parsePath(d).map((ring) => ring.map(move)),
    ...holes,
  ]);
}
