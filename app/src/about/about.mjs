// SPDX-License-Identifier: AGPL-3.0-or-later

/** Facts shown on the 原始碼與授權 page, derived from shipped data. */
export function summarizeStationData(pointData = {}, connectionData = {}) {
  const byFloor = pointData.points ?? {};
  const connections = Array.isArray(connectionData.connections)
    ? connectionData.connections
    : [];
  return {
    points: Object.values(byFloor).reduce(
      (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
      0
    ),
    floors: Object.keys(byFloor),
    connections: connections.length,
    // Only an explicit "verified" clears a flagged connection.
    unverifiedConnections: connections.filter(
      (item) => "typeStatus" in item && item.typeStatus !== "verified"
    ).length,
    // Zones and floor links only: no surveyed corridor graph ships yet.
    walkingNetwork: false,
  };
}

export function describeBuild({ commit = "", date = "" } = {}) {
  const known = /^[0-9a-f]{40}$/.test(commit);
  return {
    commit: known ? commit : "",
    short: known ? commit.slice(0, 7) : "未知版本",
    date: known ? date : "",
    known,
  };
}

export const buildInfo = describeBuild({
  commit: process.env.VUE_APP_COMMIT,
  date: process.env.VUE_APP_BUILD_DATE,
});
