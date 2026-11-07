// SPDX-License-Identifier: AGPL-3.0-or-later
// Structural and safety checks for the station map data. Returns readable
// issues; an empty list means the data can ship. Run via `npm run validate:assets`.

const SCHEMA_VERSION = 2;
const CONNECTOR_TYPES = new Set([
  "elevator",
  "escalator",
  "stairs",
  "stairs-escalator",
  "stairway",
]);
const DIRECTIONS = new Set(["bidirectional", "up", "down", "unverified"]);
const STATUSES = new Set(["verified", "inferred", "unverified"]);
const ID = /^[a-z0-9][a-z0-9-]*$/;

export function validateStationData(pointData, connectionData) {
  const issues = [];
  const zones = new Map();
  for (const zone of connectionData?.zones ?? []) {
    if (zones.has(zone.id)) issues.push(`duplicate zone id ${zone.id}`);
    zones.set(zone.id, zone);
  }
  if (connectionData?.schemaVersion !== SCHEMA_VERSION)
    issues.push(
      `connections schemaVersion ${connectionData?.schemaVersion} is not ${SCHEMA_VERSION}`
    );

  const knownTypes = new Set([
    ...Object.keys(pointData?.categories ?? {}),
    ...CONNECTOR_TYPES,
  ]);
  const byId = new Map();
  for (const [floor, list] of Object.entries(pointData?.points ?? {})) {
    for (const point of Array.isArray(list) ? list : []) {
      const where = `${floor}/${point.id}`;
      if (typeof point.id !== "string" || !ID.test(point.id))
        issues.push(`${where}: invalid point id`);
      else if (byId.has(point.id)) issues.push(`${where}: duplicate point id`);
      byId.set(point.id, { ...point, floor });
      if (typeof point.name !== "string" || !point.name.trim())
        issues.push(`${where}: missing name`);
      for (const type of [point.type].flat())
        if (!knownTypes.has(type))
          issues.push(`${where}: unknown type ${type}`);
      if (![point.x, point.y].every((n) => Number.isFinite(n) && n >= 0))
        issues.push(`${where}: invalid coordinates`);
      const zone = zones.get(point.zone);
      if (!zone) issues.push(`${where}: unknown zone ${point.zone}`);
      else if (zone.floor !== floor)
        issues.push(`${where}: zone ${zone.id} belongs to floor ${zone.floor}`);
    }
  }

  const connectionIds = new Set();
  for (const link of connectionData?.connections ?? []) {
    const where = `connection ${link.id}`;
    if (connectionIds.has(link.id))
      issues.push(`duplicate connection id ${link.id}`);
    connectionIds.add(link.id);
    if (!CONNECTOR_TYPES.has(link.type))
      issues.push(`${where}: unknown type ${link.type}`);
    if (!DIRECTIONS.has(link.direction))
      issues.push(`${where}: unknown direction ${link.direction}`);
    if ("typeStatus" in link && !STATUSES.has(link.typeStatus))
      issues.push(`${where}: unknown typeStatus ${link.typeStatus}`);
    // Step-free routing trusts this flag, so stairs must never carry it.
    if (link.wheelchairAccessible === true && link.type !== "elevator")
      issues.push(`${where}: only elevators may be wheelchair accessible`);
    for (const end of [link.from, link.to]) {
      const point = byId.get(end?.pointId);
      if (!point) {
        issues.push(`${where}: unknown point ${end?.pointId}`);
        continue;
      }
      if (point.floor !== end.floor)
        issues.push(`${where}: ${end.pointId} is not on ${end.floor}`);
      if (point.zone !== end.zone)
        issues.push(`${where}: zone mismatch for ${end.pointId}`);
    }
  }
  return issues;
}
