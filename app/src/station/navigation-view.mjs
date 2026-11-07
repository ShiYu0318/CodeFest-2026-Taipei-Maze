// SPDX-License-Identifier: AGPL-3.0-or-later
/** Navigation shows only its endpoints, validated transfer stops and QR points. */
export function navigationMapState(
  session,
  { startId = null, targetId = null, picking = false } = {}
) {
  const origin =
    (session.navigationPosition ?? session.position)?.pointId ?? startId;
  const destination = session.destinationId ?? targetId;
  const active = !!origin && !!destination && !picking;
  const ids = new Set([origin, destination].filter(Boolean));
  if (active && session.relation?.status === "connections")
    for (const edge of session.relation.steps) {
      if (edge.from?.pointId) ids.add(edge.from.pointId);
      if (edge.to?.pointId) ids.add(edge.to.pointId);
    }
  return { active, pointIds: [...ids] };
}

export function navigationPointVisible(point, navigation, matchesTheme = true) {
  if (!navigation.active) return matchesTheme;
  return (
    [point.type].flat().includes("qrcode") ||
    navigation.pointIds.includes(point.id)
  );
}
