// SPDX-License-Identifier: AGPL-3.0-or-later

export const HEADING_TOLERANCE = 15;
export const MAP_NORTH_DEGREES = -12;
export const COMPASS_MESSAGE = "compass_heading";

export function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

export function headingError(heading, target) {
  const difference = normalizeDegrees(target - heading + 180) - 180;
  return Math.round(difference * 1e6) / 1e6;
}

export function findStationPoint(pointsByFloor, id) {
  if (typeof id !== "string" || !id) return null;
  for (const [floorId, points] of Object.entries(pointsByFloor)) {
    const point = points.find((candidate) => candidate.id === id);
    if (point) return { ...point, floorId };
  }
  return null;
}

// The station drawing gives a straight-line preview within a floor.
export function previewBearing(start, destination) {
  if (!start || !destination || start.floorId !== destination.floorId)
    return null;
  const dx = destination.x - start.x;
  const dy = destination.y - start.y;
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (!dx && !dy)) return null;
  return normalizeDegrees(
    (Math.atan2(dx, -dy) * 180) / Math.PI - MAP_NORTH_DEGREES
  );
}

export function decodeCompassHeading(message, subscriptionId) {
  if (typeof message !== "string") return undefined;
  let reply;
  try {
    reply = JSON.parse(message);
  } catch {
    return undefined;
  }
  if (
    reply?.name !== COMPASS_MESSAGE ||
    reply.data?.subscriptionId !== subscriptionId
  )
    return undefined;

  const { headingDegrees, accuracyDegrees = null } = reply.data ?? {};
  if (headingDegrees === null) return null;
  if (!Number.isFinite(headingDegrees)) return undefined;
  if (
    accuracyDegrees !== null &&
    (!Number.isFinite(accuracyDegrees) || accuracyDegrees < 0)
  )
    return undefined;
  return { degrees: normalizeDegrees(headingDegrees), accuracyDegrees };
}
