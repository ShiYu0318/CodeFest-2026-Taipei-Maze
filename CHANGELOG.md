# Changelog

## v0.1.0 — Competition snapshot

- Corrected the Chinese host name from 城市通 to 台北通 in current documentation, UI, diagnostics and QR tooling; historical source titles and integration patches are preserved.

- Replaced the old desktop/simulator gallery with 14 direct Playwright captures of production UI, including search, routing, sharing, helper and reading modes.
- Fixed child-mode endpoint labels, full-width primary action, compact mode labels and shared multilingual endpoint columns.
- Reframed both README editions in the authors' voice as a completed competition artifact, with technical implementation details and explicit version scope rather than future-development promises.
- Removed capture/audit dates and internal working notes from the README presentation.
- Validated 260 web tests and 84 viewport/language/mode combinations, including horizontal overflow and aligned endpoint columns.

## v0.1.0-rc.1

First repository readiness prerelease of 北車不迷路 / Taipei Main Station Wayfinding.

### Features

- Five-floor diagram map, seven local UI languages and standard/child/elder reading preferences.
- Searchable endpoints, facility categories, nearest reachable destinations and step-free routing filters.
- Inline map/arrow/step guidance, QR rescan recovery, fixed-point sharing, staff card and explicit manual trip completion.
- Local facility assistant with progressive text and cancellable internal stream events.
- Diagram graph binds 125 of 228 displayed points; no field-survey or street-level wheelchair-access certification.

### Repository and maintenance

- Traditional Chinese README with matching English edition, real screenshot, Mermaid architecture and contributor guides.
- Local `docs/` is ignored and removed from the current index while preserving files locally and Git history.
- Removed unused Vuex state scaffold, API client, Flask sample backend and obsolete commented search implementation.
- Added frontend CI, source-version build arguments and revision-aware source links. Historical Android-host integration now requires manual dispatch.
- Updated source/provenance notes; historical TownPass patches and model draft release remain separate.

### Known limitations

- 1F and most B2 railway platform points are not bound to the walking graph. QR labels are demonstration points, not installed infrastructure.
- The accepted results do not include Android/iPhone WebView, field geometry, translation quality, assistive technology, native model/voice performance or fresh-install offline verification.
- B4 to M8 routing ends at the B1 diagram exit point; it does not certify a wheelchair route to street level.
- Imported prototype/map derivatives and historical reference materials retain outstanding rights review. A prerelease label does not resolve these obligations.

- Full npm audit retains 18 development-toolchain findings (8 high, 10 moderate); runtime-only audit reported 0. The competition snapshot retains the existing development toolchain.
