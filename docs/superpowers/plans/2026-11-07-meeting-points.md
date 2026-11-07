# Fixed Meeting Points Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, test-first and fresh final review.

**Goal:** Implement feasible static meeting-point sharing/viewing and recipient-owned navigation on the existing synthetic graph; no tracking backend.
**Architecture:** A whitelist maps meeting IDs to enabled anchors and POIs on the same node. Strict links use an explicit approved origin and /meet route. Sender confirmation time remains unchanged; recipient views without location and explicitly selects a destination before scanning their own anchor.
**Tech Stack:** Existing Vue/ES modules/Node tests; no new packages or models.
**Spec:** docs/掃碼分享集合點功能提案.md; existing SPEC QR, privacy and mobility invariants.

## Constraints / review focus

- No real station waiting area has been approved: both points are labeled synthetic; no automatic mapping from 89 map markers.
- A shared destination never becomes B's location; current B mobility/exclusions/unavailable connectors remain.
- Links <=2048 UTF-8 bytes, exact unique parameters, approved origin/path, no userinfo/hash, strict IDs/version/calendar timestamp.
- User's currently designated HTTP origin is explicitly allowlisted for the prototype; HTTPS remains the production migration target. Share/clipboard can be unavailable and must offer manual copy.
- Old/future time is advisory (30 minutes / 5-minute skew engineering defaults), never authentication, expiry or proof A is present.
- Share only after fresh user acknowledgement at a whitelisted confirmed anchor; never automatically message anyone.

## Tasks

- [x] Tests first: whitelist/mapping, invalid point/state, preserved timestamp, exact URL/parser, duplicate/unknown params, bad origin/version/date/size and advisory time.
- [x] Implement pure meeting module and two synthetic points/POIs, retain source/verification metadata; run tests and commit.
- [x] Tests first: confirmed meeting selection requires B's new location and preserves restrictive preferences; zero-edge/NoRoute; sharing URL rejected as anchor.
- [x] Implement session meeting-destination transition and recipient staged confirmation; no implicit overwrite on link arrival.
- [x] Add share card with explicit waiting acknowledgement, user-triggered share/copy and manual fallback, /meet read-only receiver, navigation import and route-leave confirmation.
- [x] Docs: implementation vs proposal, origin/time choices, synthetic/field limits, manual two-device cases and not_run evidence.
- [x] Full tests/lint/build/HTTP checks, fresh review, commits/push/PR and merge after material issues fixed (user authorized); preserve feature branch/private visibility and sync main.

## Active work queue

- Navigation + search milestone merged as PR #1 at 8004849; deployment workflow succeeded and deployed entry JS was verified.
- Meeting sharing: this plan.
- Gemma 3 chatbot + on-device voice for iPhone and Android: separate native integration milestone remains active after this dependency-light feature; no fake chatbot/model/ASR success claims.

## Latest user steering and implementation

- User explicitly requires destination-first persistent camera, valid QR automatically updates origin/reroutes without reopening. Implemented a new versioned native bridge and single scanner view (no new dependency).
- New web/session and native state tests cover streamed scans, dedup/explicit same-code rescan, stale IDs/sequence, heading identity and single-use native advancement.
- Review identified stale native Next race; fixed using semantic guidanceToken plus monotonic guidanceVersion and native consume-on-click/QR gate. Reviewer recheck reports no remaining material issue.
- iOS build and native tests executed; final verification and Android/physical camera limitations recorded in delivery guide.
