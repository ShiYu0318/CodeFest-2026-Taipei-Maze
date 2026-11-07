# Station Map Scanning Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline and fresh review.

**Goal:** Destination-first persistent QR positioning in the formal station-map page, preserving teammates' map/zoom/icons and the user's decision not to restore the deleted synthetic demo.
**Architecture:** A pure station-point scan session validates a separate preview QR namespace against bundled stable point IDs. A dedicated Vue panel uses the existing continuous native scanner and emits confirmed point changes to the existing map. The actual map only has region/connector relationships, so previews are labeled and never presented as a verified walking route.
**Tech Stack:** Existing Vue, local JSON, native qr_scan_session protocol; no new dependencies.
**Spec:** User explicitly says integrate into formal map; scans keep destination and update location without reopening camera.

- [ ] Tests first: strict QR namespace/unknown/malformed rejection, destination required, persistence over successive scans, invalid scans preserve state, accessibility filters, disconnected/same-zone/same-point cases, stale arrival token rejection.
- [ ] Implement station scan module and production-map panel, persistent native guidance, latest confirmed map marker/floor focus, manual arrival confirmation and clear task.
- [ ] Document QR format, generate deterministic printable-test payload catalog, clearly mark no installed real-world tags / missing walking graph.
- [ ] Run full web checks, review, package/install updated simulator and push/merge after checks; keep chat PR separate until Android CI passes.
