// SPDX-License-Identifier: AGPL-3.0-or-later
// Diagram geometry only: these predicates do not certify a surveyed walkway.
const epsilon = 1e-8;
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const subtract = (a, b) => [a[0] - b[0], a[1] - b[1]];
const point = (p) =>
  Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
function inRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j],
      b = ring[i],
      ab = subtract(b, a),
      ap = subtract(p, a);
    if (
      Math.abs(cross(ab, ap)) <= epsilon &&
      p[0] >= Math.min(a[0], b[0]) - epsilon &&
      p[0] <= Math.max(a[0], b[0]) + epsilon &&
      p[1] >= Math.min(a[1], b[1]) - epsilon &&
      p[1] <= Math.max(a[1], b[1]) + epsilon
    )
      return 0;
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside ? 1 : -1;
}
/** Each area has one outer ring followed by zero or more excluded holes. */
export function pointInWalkAreas(p, areas) {
  if (!point(p) || !Array.isArray(areas)) return false;
  return areas.some(
    (rings) =>
      rings.length &&
      inRing(p, rings[0]) >= 0 &&
      rings.slice(1).every((ring) => inRing(p, ring) < 0)
  );
}
function segmentInUnion(from, to, areas) {
  if (!pointInWalkAreas(from, areas) || !pointInWalkAreas(to, areas))
    return false;
  const delta = subtract(to, from),
    length2 = delta[0] ** 2 + delta[1] ** 2;
  if (length2 < epsilon) return true;
  const cuts = [0, 1];
  for (const rings of areas)
    for (const ring of rings)
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i],
          b = ring[(i + 1) % ring.length],
          edge = subtract(b, a),
          offset = subtract(a, from);
        const denominator = cross(delta, edge);
        if (Math.abs(denominator) < epsilon) {
          if (Math.abs(cross(offset, delta)) < epsilon)
            for (const p of [a, b]) {
              const t =
                ((p[0] - from[0]) * delta[0] + (p[1] - from[1]) * delta[1]) /
                length2;
              if (t > 0 && t < 1) cuts.push(t);
            }
          continue;
        }
        const t = cross(offset, edge) / denominator,
          u = cross(offset, delta) / denominator;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) cuts.push(t);
      }
  cuts.sort((a, b) => a - b);
  for (let i = 1; i < cuts.length; i++) {
    if (cuts[i] - cuts[i - 1] < epsilon) continue;
    const t = (cuts[i] + cuts[i - 1]) / 2;
    if (
      !pointInWalkAreas([from[0] + delta[0] * t, from[1] + delta[1] * t], areas)
    )
      return false;
  }
  return true;
}
/** Check exact boundary intervals, including parallel clearance offsets. */
export function segmentInWalkAreas(from, to, areas, clearance = 1) {
  if (
    !point(from) ||
    !point(to) ||
    !Number.isFinite(clearance) ||
    clearance < 0
  )
    return false;
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (length < epsilon) return pointInWalkAreas(from, areas);
  const normal = [-(to[1] - from[1]) / length, (to[0] - from[0]) / length];
  return [0, clearance, -clearance].every((offset) =>
    segmentInUnion(
      [from[0] + normal[0] * offset, from[1] + normal[1] * offset],
      [to[0] + normal[0] * offset, to[1] + normal[1] * offset],
      areas
    )
  );
}
