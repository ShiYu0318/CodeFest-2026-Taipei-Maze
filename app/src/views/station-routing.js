import stationData from "./station-points.json";
import graph from "./station-connections.json";

export const zones = graph.zones;

function resolveStop(stop) {
  return {
    ...stop,
    point: stationData.points[stop.floor].find(
      (point) => point.id === stop.pointId
    ),
  };
}

const transfers = graph.connections.flatMap((edge) => {
  const from = resolveStop(edge.from);
  const to = resolveStop(edge.to);
  const { id, type, direction, typeStatus, escalatorDirection } = edge;
  return [
    { id, type, direction, typeStatus, escalatorDirection, from, to },
    { id, type, direction, typeStatus, escalatorDirection, from: to, to: from },
  ];
});

export function transferFromPoint(pointId) {
  return transfers.find((transfer) => transfer.from.pointId === pointId);
}

export function planFloorTransfer(startZone, targetZone) {
  const queue = [{ zone: startZone, steps: [] }];
  const visited = new Set([startZone]);
  for (const { zone, steps } of queue) {
    if (zone === targetZone) return steps;
    for (const transfer of transfers) {
      if (
        transfer.from.zone !== zone ||
        transfer.direction !== "bidirectional" ||
        visited.has(transfer.to.zone)
      )
        continue;
      visited.add(transfer.to.zone);
      queue.push({ zone: transfer.to.zone, steps: [...steps, transfer] });
    }
  }
  return [];
}
