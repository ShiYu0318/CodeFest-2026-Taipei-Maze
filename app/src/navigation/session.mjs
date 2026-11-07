// SPDX-License-Identifier: AGPL-3.0-or-later
import { validateGraph } from "./graph.mjs";
import { planRoute } from "./route.mjs";
import { parseAnchor } from "./qr.mjs";
function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function buildInstructions(graph, route, anchor) {
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const text = (key) => graph.messages[key];
  const edges = route.edgeIds.map((id) => graph.edges.find((e) => e.id === id));
  if (!edges.length) return [];
  const departure = graph.orientation_guides.find(
    (g) =>
      g.context_type === "anchor_departure" &&
      g.anchor_id === anchor.id &&
      g.node_id === anchor.node_id &&
      g.outgoing_edge_id === edges[0].id
  );
  if (!departure) return null;
  const instructions = [
    {
      kind: "orientation",
      floorId: nodes.get(anchor.node_id).floor_id,
      text: text(departure.text_key),
      edgeId: null,
    },
  ];
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i],
      from = nodes.get(edge.from_node_id),
      to = nodes.get(edge.to_node_id);
    instructions.push({
      kind: edge.connector_id ? "floor_change" : "walk",
      edgeId: edge.id,
      floorId: from.floor_id,
      targetFloorId: to.floor_id,
      text: edge.connector_id
        ? `使用「${text(
            graph.connectors.find((c) => c.id === edge.connector_id).label_key
          )}」前往 ${text(
            graph.floors.find((f) => f.id === to.floor_id).label_key
          )}，到層後再按確認。`
        : `沿測試走道前往「${text(to.label_key)}」。`,
    });
    if (edge.connector_id && edges[i + 1]) {
      const guide = graph.orientation_guides.find(
        (g) =>
          g.context_type === "connector_exit" &&
          g.incoming_connector_id === edge.connector_id &&
          g.node_id === to.id &&
          g.outgoing_edge_id === edges[i + 1].id
      );
      if (!guide) return null;
      instructions.push({
        kind: "orientation",
        edgeId: null,
        floorId: to.floor_id,
        text: text(guide.text_key),
      });
    }
  }
  return instructions;
}

/** A synthetic workbench session. Position is last confirmed anchor, never inferred from Next. */
export function createSession(input) {
  const errors = validateGraph(input);
  const graph = errors.length
    ? input
    : freeze(JSON.parse(JSON.stringify(input)));
  const state = {
    phase: errors.length ? "data_error" : "unlocated",
    position: null,
    needsLocationConfirmation: false,
    pendingAnchorId: null,
    destinationId: null,
    mobilityProfile: "standard",
    unavailableConnectorIds: [],
    excludedEdgeTypes: [],
    plan: null,
    stepIndex: 0,
    revision: 0,
    error: errors.length ? "InvalidGraph" : null,
  };
  let previousPhase = null;
  function invalidate() {
    state.plan = null;
    state.stepIndex = 0;
    state.revision++;
    state.error = null;
  }
  function recompute() {
    invalidate();
    if (errors.length) {
      state.phase = "data_error";
      state.error = "InvalidGraph";
      return;
    }
    if (!state.position) {
      state.phase = "unlocated";
      return;
    }
    if (state.needsLocationConfirmation) {
      state.pendingAnchorId = state.position.anchorId;
      state.phase = "confirm_location";
      return;
    }
    if (!state.destinationId) {
      state.phase = "located";
      return;
    }
    const poi = graph.pois.find(
      (p) => p.id === state.destinationId && p.enabled
    );
    if (!poi) {
      state.phase = "no_route";
      state.error = "UnknownDestination";
      return;
    }
    const result = planRoute(graph, {
      startId: state.position.nodeId,
      destinationId: poi.node_id,
      mobilityProfile: state.mobilityProfile,
      unavailableConnectorIds: state.unavailableConnectorIds,
      excludedEdgeTypes: state.excludedEdgeTypes,
    });
    if (result.type !== "success") {
      state.phase = result.type === "InvalidGraph" ? "data_error" : "no_route";
      state.error = result.type;
      return;
    }
    if (!result.route.edgeIds.length) {
      state.phase = "arrival_confirmation";
      state.plan = freeze({
        revision: state.revision,
        route: result.route,
        instructions: [],
      });
      return;
    }
    const anchor = graph.qr_anchors.find(
      (a) => a.id === state.position.anchorId
    );
    const instructions = buildInstructions(graph, result.route, anchor);
    if (!instructions) {
      state.phase = "guidance_unavailable";
      state.error = "OrientationUnavailable";
      return;
    }
    state.plan = freeze({
      revision: state.revision,
      route: result.route,
      instructions,
    });
    state.phase = "ready";
  }
  function reconfirm() {
    invalidate();
    if (state.position) {
      state.needsLocationConfirmation = true;
      state.pendingAnchorId = state.position.anchorId;
      state.phase = "confirm_location";
      previousPhase = null;
    } else state.phase = "unlocated";
  }
  function selectDestination(id) {
    if (errors.length) return;
    if (!graph.pois.some((p) => p.id === id && p.enabled)) {
      state.error = "UnknownDestination";
      return;
    }
    const moving = [
      "navigating",
      "arrival_confirmation",
      "arrived",
      "relocating",
      "confirm_location",
    ].includes(state.phase);
    state.destinationId = id;
    if (moving && state.position) reconfirm();
    else recompute();
  }
  return {
    state,
    acceptQr(payload) {
      if (errors.length) return { type: "InvalidGraph" };
      const parsed = parseAnchor(payload, graph);
      if (parsed.type === "success") {
        if (previousPhase === null) previousPhase = state.phase;
        state.pendingAnchorId = parsed.anchor.id;
        state.phase = "confirm_location";
      }
      return parsed;
    },
    confirmLocation() {
      const anchor = graph.qr_anchors?.find(
        (a) => a.id === state.pendingAnchorId && a.enabled
      );
      if (!anchor || state.phase !== "confirm_location") return;
      state.position = {
        anchorId: anchor.id,
        nodeId: anchor.node_id,
        confirmedAt: new Date().toISOString(),
      };
      state.pendingAnchorId = null;
      state.needsLocationConfirmation = false;
      previousPhase = null;
      recompute();
    },
    selectDestination,
    prepareMeetingDestination(poiId) {
      if (
        errors.length ||
        !graph.pois.some(
          (p) => p.id === poiId && p.enabled && p.category === "meeting_point"
        )
      )
        return { type: "UnknownDestination" };
      invalidate();
      state.destinationId = poiId;
      state.position = null;
      state.pendingAnchorId = null;
      state.needsLocationConfirmation = false;
      state.phase = "unlocated";
      previousPhase = null;
      return { type: "success" };
    },
    applySearchSelection(selection) {
      const proposal = selection?.proposedOptions;
      if (
        errors.length ||
        !proposal ||
        !["standard", "stepFree"].includes(proposal.mobilityProfile) ||
        !Array.isArray(proposal.excludedEdgeTypes) ||
        proposal.excludedEdgeTypes.some(
          (type) =>
            !["walkway", "stairs", "elevator", "escalator", "gate"].includes(
              type
            )
        ) ||
        !Array.isArray(proposal.unavailableConnectorIds) ||
        proposal.unavailableConnectorIds.some(
          (id) => !graph.connectors.some((c) => c.id === id)
        )
      ) {
        state.error = "UnsupportedOptions";
        return;
      }
      if (!graph.pois.some((p) => p.id === selection.poiId && p.enabled)) {
        state.error = "UnknownDestination";
        return;
      }
      const profile =
        state.mobilityProfile === "stepFree" ||
        proposal.mobilityProfile === "stepFree"
          ? "stepFree"
          : "standard";
      const excluded = [
        ...new Set([...state.excludedEdgeTypes, ...proposal.excludedEdgeTypes]),
      ];
      const unavailable = [
        ...new Set([
          ...state.unavailableConnectorIds,
          ...proposal.unavailableConnectorIds,
        ]),
      ];
      const changed =
        profile !== state.mobilityProfile ||
        excluded.length !== state.excludedEdgeTypes.length ||
        unavailable.length !== state.unavailableConnectorIds.length;
      state.mobilityProfile = profile;
      state.excludedEdgeTypes = excluded;
      state.unavailableConnectorIds = unavailable;
      if (changed) {
        state.destinationId = selection.poiId;
        reconfirm();
      } else selectDestination(selection.poiId);
    },
    setMobility(profile) {
      if (
        !["standard", "stepFree"].includes(profile) ||
        profile === state.mobilityProfile
      )
        return;
      state.mobilityProfile = profile;
      reconfirm();
    },
    markConnectorUnavailable(id) {
      if (
        errors.length ||
        !graph.connectors.some((c) => c.id === id) ||
        state.unavailableConnectorIds.includes(id)
      )
        return;
      state.unavailableConnectorIds = [...state.unavailableConnectorIds, id];
      reconfirm();
    },
    start() {
      if (state.phase === "ready" && state.plan) state.phase = "navigating";
    },
    next() {
      if (state.phase !== "navigating" || !state.plan) return;
      if (state.stepIndex < state.plan.instructions.length - 1)
        state.stepIndex++;
      else state.phase = "arrival_confirmation";
    },
    confirmArrival() {
      if (state.phase === "arrival_confirmation") state.phase = "arrived";
    },
    beginRelocation() {
      if (errors.length) return;
      if (!["relocating", "confirm_location"].includes(state.phase))
        previousPhase = state.phase;
      state.pendingAnchorId = null;
      state.phase = "relocating";
    },
    cancelRelocation() {
      if (!["relocating", "confirm_location"].includes(state.phase)) return;
      state.pendingAnchorId = null;
      state.phase = state.needsLocationConfirmation
        ? "relocating"
        : previousPhase ?? (state.position ? "located" : "unlocated");
      previousPhase = null;
    },
    end() {
      invalidate();
      state.position = null;
      state.needsLocationConfirmation = false;
      state.pendingAnchorId = null;
      state.destinationId = null;
      state.unavailableConnectorIds = [];
      state.excludedEdgeTypes = [];
      state.phase = errors.length ? "data_error" : "unlocated";
      previousPhase = null;
    },
  };
}
