# Architecture

[繁體中文 overview](../README.md#技術架構) · [English overview](../README.en.md#architecture)

## Boundaries

The product is a Vue WebView microservice, not a standalone Flutter application. `app/src/views/StationMapView.vue` orchestrates the screen; components render controls. Feature modules own deterministic logic independently of browser UI. The TownPass checkout is external and must not be modified as part of routine web development.

| Directory | Responsibility |
| --- | --- |
| `app/src/station/` | Diagram graph, floor/point state, route presentation, nearest facilities, share links, trip receipts and camera layout |
| `app/src/navigation/` | Graph validation, Dijkstra, bridge/session primitives and synthetic test fixture |
| `app/src/search/` | Unicode normalization, synonym/intent dictionary, bounded fuzzy matching and clarification |
| `app/src/chat/` | Local facility answers, stream events and optional native AI adapter |
| `app/src/display/`, `i18n/` | Reading preferences, Zhuyin and seven local catalogs |
| `app/src/meeting/`, `staff/` | Fixed meeting links and staff-facing assistance data |
| `app/src/components/`, `views/` | Vue presentation and route-level composition |
| `app/tests/`, `scripts/` | Regression tests and reproducible asset validation/generation |
| `data/`, `tools/data/` | Attributed research snapshots and processing; not automatically routable geometry |
| `integration/townpass/` | Historical pinned integration patch, diagnostic page and upstream notices |
| `tools/`, `scripts/` | Developer utilities; historical host helpers are opt-in and not the web quick start |
| `assets/screenshots/` | README screenshot and provenance |
| `docs/` | Ignored local competition materials, absent from fresh clones |

## Routing pipeline

1. Load and validate the compact diagram graph.
2. Expand corridor pairs and explicit vertical edges.
3. Resolve selected point IDs through the graph bindings.
4. Remove closed/unverified edges, disallowed gates, excluded types and unavailable connectors.
5. For step-free requests, require explicit step-free and wheelchair-passable metadata and exclude stairs/escalators.
6. Run Dijkstra over the remaining directed edges.
7. Produce floor polylines and steps from turns, named places, floor changes and arrival.

Costs are relative diagram units, not meters or estimated seconds. Missing bindings must remain an explicit failure; do not bridge walls, tracks or unknown entrances to inflate coverage. Point markers and graph bindings are distinct. Preserve all red/purple platform markers.

## State and bridge contracts

- A chosen start, a QR-confirmed position, a shared point and Demo movement are different sources.
- QR confirms only the scan instant; advancing a guide step is not a position update.
- Manual arrival is a receipt tied to the current trip identity. Changing endpoints, restrictions or position invalidates it; finishing clears the destination without fabricating a new scan.
- Existing TownPass scanning uses `flutterObject` with JSON `{name, data}` and `qr_code_scan`. Indoor position must not be replaced by GPS.
- The legacy scan protocol has no request ID: serialize same-name requests and quarantine late replies after timeouts.
- Local chat streaming uses internal `thinking`, `delta`, `done` events, not a network EventSource. Native model/voice capability requires separate validation.

## Dependency policy

Use existing libraries and standard platform APIs before adding dependencies. Keep SPDX/copyright and safety explanations; remove dead commented-out implementations. Inspect provenance, licenses and redistribution rights before introducing code, models, maps, fonts, audio or services. Follow the project restriction on China-related providers and unapproved sources.

## Verification

Run the commands in [CONTRIBUTING.md](./CONTRIBUTING.md). Unit/renderer tests do not verify native camera, device orientation, screen-reader behavior or physical wheelchair access. Record Android/iPhone WebView and field checks separately.
