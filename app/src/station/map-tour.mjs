// SPDX-License-Identifier: AGPL-3.0-or-later
export const mapTourSteps = [
  ["scan", "scan.scan"],
  ["floors", "map.floorGroup"],
  ["layers", "map.layers"],
  ["locate", "map.locate"],
  ["facilities", "tour.facilitiesTitle"],
  ["marker", "tour.markerTitle"],
  ["language", "lang.label"],
  ["theme", "tour.themeTitle"],
  ["contrast", "display.contrast"],
  ["mode", "display.mode"],
  ["helper", "chat.launcher"],
  ["reopen", "tour.replay"],
];

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
