// SPDX-License-Identifier: AGPL-3.0-or-later
import { nearestPlace } from "./walk-route.mjs";

/** One user action: optionally locate, then search the reachable walking graph. */
export async function findNearestFacility(
  location,
  router,
  { startId, category }
) {
  if (location.view.value.active) return { type: "Busy" };
  if (!startId) {
    if (!location.view.value.available) return { type: "NoStart" };
    const located = await location.scan();
    if (located.type !== "success") return located;
    startId = located.point.id;
  }
  const view = location.view.value;
  return {
    ...nearestPlace(router, {
      startId,
      category,
      stepFree: view.stepFree,
      excludedEdgeTypes: view.excludedEdgeTypes,
      unavailableConnectorIds: view.unavailableConnectorIds,
    }),
    startId,
  };
}
