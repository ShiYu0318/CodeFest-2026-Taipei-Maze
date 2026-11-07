// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared wording for route steps (route card and full-screen guide).
export function describeStep(step, t, name) {
  if (!step) return "";
  if (step.kind === "arrive")
    return t("route.arrive", { name: name(step.toId) });
  if (step.kind === "floor")
    return t(step.direction === "up" ? "walk.arrowUp" : "walk.arrowDown", {
      via: t(`type.${step.via}`),
      floor: step.toFloor,
    });
  return t("route.walk", { floor: step.floor, name: name(step.toId) });
}
