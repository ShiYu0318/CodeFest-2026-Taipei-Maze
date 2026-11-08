// SPDX-License-Identifier: AGPL-3.0-or-later
/** Reserve real content below the map; allow normal page scrolling if crowded. */
export function availableMapHeight({ height, top, below = 0, bottom = 24 }) {
  return Math.max(
    180,
    Math.floor(height - Math.max(0, top) - Math.max(0, below) - bottom)
  );
}
