// SPDX-License-Identifier: AGPL-3.0-or-later
/** Read the closed linear SVG outlines used by the station plans, not a bbox. */
export function outlineRings(path) {
  const tokens =
    path.match(/[MLHVZmlhvz]|-?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/gi) ?? [];
  if (
    path
      .replace(/[MLHVZmlhvz]|-?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/gi, "")
      .replace(/[\s,]/g, "")
  )
    throw new Error("Only linear station outlines are supported");
  const rings = [];
  let i = 0,
    command,
    x = 0,
    y = 0,
    ring = null;
  const number = () => {
    const value = Number(tokens[i++]);
    if (!Number.isFinite(value)) throw new Error("Invalid outline coordinates");
    return value;
  };
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++];
    if (!command) throw new Error("Missing outline command");
    const relative = command === command.toLowerCase();
    switch (command.toUpperCase()) {
      case "M": {
        if (ring)
          throw new Error("Station outline must close before a new ring");
        x = number() + (relative ? x : 0);
        y = number() + (relative ? y : 0);
        ring = [[x, y]];
        command = relative ? "l" : "L";
        break;
      }
      case "L":
        x = number() + (relative ? x : 0);
        y = number() + (relative ? y : 0);
        break;
      case "H":
        x = number() + (relative ? x : 0);
        break;
      case "V":
        y = number() + (relative ? y : 0);
        break;
      case "Z":
        if (!ring || ring.length < 3) throw new Error("Invalid closed outline");
        [x, y] = ring[0];
        rings.push(ring);
        ring = null;
        command = null;
        continue;
      default:
        throw new Error("Unsupported outline command");
    }
    if (!ring) throw new Error("Outline must start with M");
    if (ring.at(-1)[0] !== x || ring.at(-1)[1] !== y) ring.push([x, y]);
  }
  if (ring) throw new Error("Unclosed station outline");
  return rings;
}

export function boundarySegments(plan) {
  const scale = plan.scale ?? 1,
    offset = plan.offset ?? [0, 0];
  const transform = ([x, y]) => [x * scale + offset[0], y * scale + offset[1]];
  return plan.outlines.flatMap((path, outline) => {
    // Further subpaths are holes, not the outer perimeter.
    const ring = outlineRings(path)[0].map(transform);
    return ring.flatMap((from, edge) => {
      const to = ring[(edge + 1) % ring.length];
      const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
      return length ? [{ from, to, length, outline, edge }] : [];
    });
  });
}

function circleFitsOutline(x, y, clearance, edges) {
  let inside = false;
  for (const {
    from: [left, top],
    to: [right, bottom],
    length,
  } of edges) {
    const dx = right - left;
    const dy = bottom - top;
    if (top > y !== bottom > y && x < left + ((y - top) * dx) / dy)
      inside = !inside;

    const projection = ((x - left) * dx + (y - top) * dy) / (length * length);
    const along = Math.min(1, Math.max(0, projection));
    if (Math.hypot(x - left - along * dx, y - top - along * dy) < clearance)
      return false;
  }
  return inside;
}

/** Find a nearby offset that keeps a circular badge inside the anchor's outline. */
export function insetBoundaryMarker(point, segments, separation, clearance) {
  const edges = segments.filter(
    ({ outline }) => outline === point.boundary.outline
  );
  const anchor = edges.find(({ edge }) => edge === point.boundary.edge);
  if (!anchor) return null;
  const normal = Math.atan2(
    anchor.to[0] - anchor.from[0],
    anchor.from[1] - anchor.to[1]
  );
  const direction = point.boundary.fraction < 0.5 ? -1 : 1;
  function offsetAt(angle, distance) {
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    return circleFitsOutline(point.x + x, point.y + y, clearance, edges)
      ? [x, y]
      : null;
  }
  for (const distance of [
    separation,
    separation + clearance,
    separation + 2 * clearance,
  ]) {
    // Try a tangent offset with just enough inward clearance for the badge.
    const tangent = Math.acos(Math.min(1, (clearance * 1.05) / distance));
    const along =
      offsetAt(normal + tangent * direction, distance) ??
      offsetAt(normal - tangent * direction, distance);
    if (along) return along;
    // Try the inward normal and nearby angles when the edge runs into a corner.
    for (let step = 0; step < 24; step++) {
      const turn = Math.ceil(step / 2) * (step % 2 ? 1 : -1);
      const angle = normal + (turn * Math.PI) / 12;
      const offset = offsetAt(angle, distance);
      if (offset) return offset;
    }
  }
  return null;
}

/** Stratified random samples are generated once and saved with stable IDs. */
export function scatterBoundary(
  plan,
  { count = 8, seed, obstacles = [], clearance = 36 } = {}
) {
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(seed))
    throw new Error("A positive count and integer seed are required");
  const segments = boundarySegments(plan);
  const perimeter = segments.reduce((sum, edge) => sum + edge.length, 0);
  if (!perimeter) throw new Error("Empty station boundary");
  let state = seed >>> 0;
  const random = () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const placed = [];
  for (let index = 0; index < count; index++) {
    let candidate;
    for (let attempt = 0; attempt < 300; attempt++) {
      let distance = ((index + 0.1 + random() * 0.8) / count) * perimeter;
      const edge = segments.find((item) => {
        if (distance <= item.length) return true;
        distance -= item.length;
        return false;
      });
      const fraction = distance / edge.length;
      const x = +(
        edge.from[0] +
        fraction * (edge.to[0] - edge.from[0])
      ).toFixed(2);
      const y = +(
        edge.from[1] +
        fraction * (edge.to[1] - edge.from[1])
      ).toFixed(2);
      if (
        [...obstacles, ...placed].some(
          (point) => Math.hypot(point.x - x, point.y - y) < clearance
        )
      )
        continue;
      candidate = {
        x,
        y,
        boundary: { outline: edge.outline, edge: edge.edge, fraction },
      };
      break;
    }
    if (!candidate)
      throw new Error(`No clear boundary position for point ${index + 1}`);
    placed.push(candidate);
  }
  return placed;
}
