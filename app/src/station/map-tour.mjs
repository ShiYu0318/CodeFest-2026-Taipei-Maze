// SPDX-License-Identifier: AGPL-3.0-or-later
export const mapTourSteps = [
  ["locate", "endpoint.roles"],
  ["facilities", "tour.facilitiesTitle"],
  ["route-options", "tour.optionsTitle"],
  ["go", "map.goHere"],
  ["floors", "map.floorGroup"],
  ["marker", "tour.markerTitle"],
  ["route", "route.title"],
  ["route-actions", "scan.actions"],
  ["language", "lang.label"],
  ["mode", "display.mode"],
  ["helper", "chat.launcher"],
  ["information", "map.information"],
];

export function availableMapTourSteps(root, helperRoot = root) {
  return mapTourSteps.filter(
    ([id]) =>
      !!(id === "helper" ? helperRoot : root)?.querySelector(
        `[data-tour-target="${id}"]`
      )
  );
}

const storageKey = "taipei-maze.map-tour.v1";
let seenInDocument = false;

export function hasSeenMapTour() {
  if (seenInDocument) return true;
  try {
    return window.localStorage.getItem(storageKey) === "seen";
  } catch {
    return false;
  }
}

export function rememberMapTour() {
  seenInDocument = true;
  try {
    window.localStorage.setItem(storageKey, "seen");
  } catch {
    // Keep the choice for this document when storage is unavailable.
  }
}
