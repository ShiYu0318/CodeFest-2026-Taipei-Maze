# Navigation Core Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution. Follow test-first development and a fresh final review.

**Goal:** Build a clearly synthetic navigation workbench with validated directed graph routing, step-free constraints, QR parsing and restartable navigation sessions.

**Architecture:** Keep the existing B1–B4 station browser intact. A separate /navigation-demo uses a bundled synthetic fixture and pure domain modules, so unverified station points never become walkable edges implicitly. A bridge adapter accepts only the TownPass qr_code_scan reply and validates the payload against the fixture.

**Tech Stack:** Existing Vue CLI/Vue 3; native JavaScript ES modules (.mjs), JSDoc and Node built-in test runner. No new dependencies. JavaScript follows the imported app's current toolchain; a TypeScript migration is deferred rather than adding an unreviewed compiler toolchain.

**Spec:** docs/SPEC.md sections 7–11, 18, 20, 22–23; docs/作品五大面向評估與發展建議.md.

## Global Constraints

- Synthetic coordinates, sources and orientation instructions must never be presented as verified Taipei Main Station routes.
- Directed positive finite edge costs; step-free routes exclude stairs/escalators and unknown accessibility, status and unavailable connectors.
- A new valid location invalidates the old plan even when rerouting fails; cancelled/invalid QR preserves current plan.
- QR UTF-8 JSON <=1024 bytes; exact allowed fields, site, major version and enabled anchor; never execute URLs.
- No GPS, account, runtime LLM/TTS, new third-party resources or China-related services.
- Seven-language/voice/offline/real-site completion remains pending; this milestone does not declare full P0 complete.
- Do not touch teammates' station JSON or convert unverified transfer data into field-checked graph.

## Review Focus

- Invalid graphs must return InvalidGraph rather than crash or appear as NoRoute.
- No-route and zero-edge already-at-destination must be distinct.
- Rescanning must not preserve obsolete route steps after accepting a different valid location.
- Uncorrelated late native replies must not be reused after timeout or component disposal.
- Floor transitions must use explicit connectors and orientation, never coordinates across floors.

## Task 1: Fixture, graph validation and routing

Files: app/src/navigation/{demo-graph.json,graph.mjs,route.mjs}; app/tests/navigation.test.mjs; app/package.json.
Interfaces: validateGraph(graph) -> string[]; planRoute(graph,{startId,destinationId,mobilityProfile,unavailableConnectorIds}) -> discriminated result.

- [x] Write failing tests for cheaper multi-edge path, one-way restrictions, step-free detour, unknown/closed edges, unavailable connector, unreachable/unknown destination and same node.
- [x] Write failing tests for duplicate IDs, dangling references, invalid costs and connector/floor/geometry mismatches.
- [x] Implement synthetic fixture, validators and Dijkstra with adjacency list, min-heap and deterministic edge-ID tie break.
- [x] Run node test suite, confirm green; commit core and tests.

## Task 2: QR, orientation and session state

Files: app/src/navigation/{qr.mjs,session.mjs,bridge.mjs}; app/tests/{session,bridge}.test.mjs.
Interfaces: parseAnchor(payload,graph) -> success/failure; createSession(graph) -> state, confirmLocation, selectDestination, setMobility, start, next, confirmArrival, restart, end; createQrBridge(bridge, timeoutMs) -> scan, available, dispose.

- [x] Write failing tests for QR limits/unknown keys/site/version/enabled anchor and retained state on invalid QR.
- [x] Write failing tests for orientation gaps, step progression, arrival confirmation, changed-location NoRoute and conservative mobility changes.
- [x] Write failing adapter tests at the actual postMessage/message event boundary for success, cancel, busy, malformed reply, timeout/drain and disposal.
- [x] Implement strict parser, derived instructions and explicit session transitions; require anchor-specific orientation before start and connector-exit orientation after floor changes.
- [x] Implement serialized bridge, discard late reply and avoid unsafe retry after timeout.
- [x] Run full tests and commit.

## Task 3: Vue navigation workbench and integration

Files: app/src/views/NavigationDemoView.vue; app/src/components/NavigationDemoMap.vue; app/src/router/index.js; app/src/views/{HomeView,StationMapView}.vue; README.md; docs/導航核心測試指南.md.

- [x] Add an explicitly synthetic route UI, floor-local map/route overlay, destination/mobility controls, position confirmation, native scan and labeled manual fixture controls.
- [x] Bind all steps/maps to the same session plan; lost/re-scan pauses the active route, cancellation does not invent a location; arrival requires confirmation.
- [x] Add entry links without replacing the teammate map or native host destination.
- [x] Document fixture vs real graph contract, test commands, manual scenarios and unfinished P0 gates.
- [x] Run full tests, lint changed files, production build and browser-like HTTP/asset checks; report any warnings and UI verification restrictions.
- [x] Fresh final review and material fixes with regression tests; commit UI and documentation.
- [x] Push feature branch and open Draft PR; keep main unchanged for teammate integration.

## Execution ledger

- Ruling: use a branch in the existing workspace, no worktree, following the user's preference against unnecessary worktrees.
- Ruling: user approved continuing the previously described core; proceed with implementation without another approval round.
- Tasks 1–3 implementation complete. Final delivery tracking follows below.

## Verification record

- 24 Node tests passed after rebasing latest origin/main; full source/test ESLint and production build passed.
- Dev /navigation-demo and /station-map HTML, entry JS and navigation lazy chunk return valid responses.
- Fresh reviewer found no remaining Critical/Important issues after regression fixes.
- Browser computer-use permission was denied; browser clicks, layout QA and native camera remain not_run.
- Ruling: origin/main received a map UI simplification during implementation. Rebased and preserved it; placed navigation link outside the hidden header.
- Ruling: use authenticated local gh for PR because GitHub connector cannot access this private repository (404).

- Delivery: feature branch feat/navigation-core pushed; Draft PR https://github.com/yoyo899843/Taipei-Codefest-2026-Big-Dumb/pull/1. Main was not merged.
