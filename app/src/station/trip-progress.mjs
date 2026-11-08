// SPDX-License-Identifier: AGPL-3.0-or-later
// User confirmation is a receipt for this trip, never a location update.
export function tripIdentity({
  startId,
  destinationId,
  positionToken = "",
  stepFree = false,
  excludedEdgeTypes = [],
  unavailableConnectorIds = [],
} = {}) {
  if (!startId || !destinationId) return null;
  return JSON.stringify([
    startId,
    destinationId,
    positionToken,
    stepFree === true,
    [...new Set(excludedEdgeTypes)].sort(),
    [...new Set(unavailableConnectorIds)].sort(),
  ]);
}
export function confirmManualArrival({
  trip,
  expectedIdentity,
  routeType,
  stepKind,
  now = () => new Date().toISOString(),
}) {
  const identity = tripIdentity(trip);
  if (!identity || identity !== expectedIdentity) return { type: "Stale" };
  if (
    !(routeType === "Arrived" && trip.startId === trip.destinationId) &&
    !(routeType === "success" && stepKind === "arrive")
  )
    return { type: "NotAtFinalStep" };
  return {
    type: "success",
    receipt: {
      identity,
      destinationId: trip.destinationId,
      source: "manual",
      confirmedAt: now(),
    },
  };
}
export function isCurrentArrival(receipt, identity) {
  return (
    !!identity && receipt?.identity === identity && receipt?.source === "manual"
  );
}
export function positionDetails({ startId, position, demo = false } = {}) {
  if (demo) return { kind: "demo", confirmedAt: null };
  if (!startId && !position) return { kind: "none", confirmedAt: null };
  if (startId && startId !== position?.pointId)
    return { kind: "manual", confirmedAt: null };
  if (position?.source === "qr")
    return {
      kind: "qr",
      confirmedAt:
        typeof position.confirmedAt === "string" &&
        Number.isFinite(Date.parse(position.confirmedAt))
          ? position.confirmedAt
          : null,
    };
  if (position?.source === "url") return { kind: "link", confirmedAt: null };
  return { kind: "manual", confirmedAt: null };
}
