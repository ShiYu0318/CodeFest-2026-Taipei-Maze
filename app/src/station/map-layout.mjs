// SPDX-License-Identifier: AGPL-3.0-or-later
/** Keep the map dominant; crowded controls remain in normal page scroll. */
export function availableMapHeight({ height, top, below = 0, bottom = 24 }) {
  const available = Math.max(0, height - Math.max(0, top) - bottom);
  const controls = Math.max(0, below);
  return Math.floor(
    Math.max(
      180,
      available - Math.min(controls, available * 0.4),
      // Prefer a map taller than the route panel, bounded on very long panels.
      controls ? Math.min(controls + 24, height * 0.7) : 0
    )
  );
}
