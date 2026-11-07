# Offline Destination Search Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, test-first, and a fresh final review.

**Goal:** Implement the feasible dictionary/rule-based search and easy-read UI from docs/Taipei_Maze_AI_Features.md without models or external runtime services.

**Architecture:** Pure normalization/OSA matching/intent parsing searches only supplied POIs. Shared search UI finds real-map facilities (display only) and synthetic navigation destinations (explicit selection/confirmation). Draft seven-language seed aliases are enabled only in explicitly labeled prototype mode; release defaults exclude them. New restrictions are additive and passed to routing, not silently discarded.

**Tech Stack:** Existing JS ES modules / Vue 3 / Node built-in tests; no new packages, models, fonts, APIs or analytics.

**Spec:** docs/SPEC.md 21.5–21.9, existing QR/session contracts; AI Features file is a candidate plan, not proof that all P0 is complete.

## Constraints and review focus

- Preserve imported map UI, pinch handling and private visibility; stay on existing Draft PR branch.
- Search does not invent POIs, routes or user location; station search only selects an existing point.
- <=80 Unicode code points before and after NFKC; diacritics retained; scripts and raw queries never executed/logged/uploaded.
- Only whitelisted phrases are understood; negation, conflicting goals and unparsed conditions require clarification.
- OSA <4 exact only; lengths 4–7 allow 1, >=8 allow 2, ratio <=0.30; IDs/floors/exit codes never fuzzy.
- Requests for nearest remain explicitly unsupported until fresh-origin-token and verified walking graph work is done.
- Avoid-stairs adds an exclusion, not a claim that the user uses a wheelchair. Accessible restroom separately requires facility evidence and stepFree routes.
- Seven-language search != seven-language interface/voice; seed translations remain draft and require review.
- Late/stale selection must not relax current restrictions; options changes still require location reconfirmation.

## Task 1: Search core

Files: app/src/search/{dictionary.json,search.mjs,catalog.mjs}; app/tests/search.test.mjs.
- [x] Write failing tests for seven-language alias identity, NFKC, OSA, short/number tokens, unknown destinations, ambiguity, negation and unknown conditions.
- [x] Write tests for additive step-free/stair conditions, draft gating, enabled/category/accessibility filters and budget exhaustion.
- [x] Implement analyze/search against supplied catalog; result includes matching evidence, proposedOptions and limitations.
- [x] Run full tests and commit.

## Task 2: Restriction integration and easy-read content

Files: app/src/navigation/{route,session}.mjs; fixture; app/tests/navigation.test.mjs / session.test.mjs.
- [x] Write failing tests for explicit edge-type exclusions, preserving stronger restrictions, explicit search selection and position reconfirmation.
- [x] Implement exclusions and atomic search-destination selection; no automatic navigation.
- [x] Use existing structured plan instructions; simple mode changes presentation, never route/position/session.
- [x] Run full tests and commit.

## Task 3: Prototype UI, docs and delivery

Files: app/src/components/DestinationSearch.vue; NavigationDemoView.vue; StationMapView.vue; navigation/search docs; AI source document appendix.
- [x] Add shared, labeled prototype search; real-map matches select actual existing point after floor switch, not a navigation route.
- [x] Synthetic search explicitly confirms a POI and additive restrictions through session; simple mode hides optional controls/map while navigating, retaining recovery and an expanded-map action.
- [x] Preserve the original AI document and append feasibility/status/remaining work; update README and source records.
- [x] Run full tests, lint, production build and local HTTP checks; fresh review and regressions for material findings.
- [ ] Push branch, rewrite PR in the new open-source format and merge after checks (latest user authorization). Keep private; preserve feature branch.

## Execution ledger

- User asked to implement feasible items; later pull request is steering, not cancellation. Synced origin/main by merge (already-pushed branch, no force push).
- No model-related current claims or licenses relied upon; model evaluation deferred, no model downloaded.

- User specified official deployment URL: http://home.yoyo899843.com:8000/ (homepage HTTP 200 verified).
- User authorized automatic merge after push/tests/build/review pass; PR format must follow the new open-source template, not coursework.
- User added Gemma 3 chatbot + voice on both iPhone and Android. This is the next independent native integration milestone; current search milestone remains model-free.
- Review findings fixed with regressions: numbered/lettered identifiers exact-only, joined negation, alias collisions. Reviewer reports no remaining material blockers; 43 core tests pass. Browser/native/translation QA remains not_run.
