// SPDX-License-Identifier: AGPL-3.0-or-later
/** Parse a locator only; QR content never overrides local coordinates or opens a URL. */
export function parseAnchor(payload, graph) {
  if (
    typeof payload !== "string" ||
    new TextEncoder().encode(payload).length > 1024
  )
    return { type: "InvalidQr" };
  let data;
  try {
    data = JSON.parse(payload);
  } catch {
    return { type: "InvalidQr" };
  }
  const fields = ["type", "v", "site_id", "graph_major", "anchor_id"];
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.keys(data).length !== fields.length ||
    Object.keys(data).some((k) => !fields.includes(k))
  )
    return { type: "InvalidQr" };
  if (
    data.type !== "taipei_maze_anchor" ||
    data.v !== 1 ||
    data.site_id !== graph.site_id ||
    data.graph_major !== Number(graph.graph_version.split(".")[0])
  )
    return { type: "UnsupportedQr" };
  if (typeof data.anchor_id !== "string") return { type: "InvalidQr" };
  const anchor = graph.qr_anchors.find(
    (a) => a.id === data.anchor_id && a.enabled
  );
  return anchor ? { type: "success", anchor } : { type: "UnknownAnchor" };
}
