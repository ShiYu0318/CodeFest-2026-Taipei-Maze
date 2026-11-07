// SPDX-License-Identifier: AGPL-3.0-or-later
import { stationLocationQuery } from "./location-link.mjs";
export const DEMO_SCENARIOS = Object.freeze(
  [
    {
      id: "restroom",
      start: "b1-e4",
      destination: "b1-wc-m5",
      stepFree: false,
      expected: "success",
    },
    {
      id: "crossFloor",
      start: "b3-info",
      destination: "b4-e2",
      stepFree: false,
      expected: "success",
    },
    {
      id: "accessible",
      start: "b3-e2",
      destination: "b4-e2",
      stepFree: true,
      expected: "success",
    },
    {
      id: "blocked",
      start: "b1-e4",
      destination: "b1-wc-m5",
      stepFree: true,
      expected: "NoRoute",
    },
  ].map(Object.freeze)
);
export function demoScenarioQuery(query, id) {
  if (query.demo !== "1") return null;
  const scenario = DEMO_SCENARIOS.find((item) => item.id === id);
  if (!scenario) return null;
  const next = {
    ...query,
    start: scenario.start,
    destination: scenario.destination,
    point: scenario.start,
    v: "1",
  };
  delete next.shared;
  return next;
}
export function demoPositionQuery(query, pointId, data) {
  if (query.demo !== "1" || typeof pointId !== "string" || !pointId)
    return null;
  try {
    return { ...stationLocationQuery(pointId, data, query), start: pointId };
  } catch {
    return null;
  }
}
export function leaveDemoQuery(query) {
  const next = { ...query };
  for (const key of ["demo", "point", "v", "start", "destination", "shared"])
    delete next[key];
  return next;
}
export function demoNextPoint(steps, index) {
  const step = steps[index];
  return step && ["walk", "floor"].includes(step.kind) ? step.toId : null;
}
