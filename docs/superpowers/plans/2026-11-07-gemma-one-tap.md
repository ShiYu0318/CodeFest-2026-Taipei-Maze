# Gemma One-Tap Installation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, test-first and fresh review.

**Goal:** End users accept the bundled Gemma agreement and download once without a HF account/token.
**Architecture:** A developer-only tool obtains the fixed official artifact after team entitlement, validates its digest, and prepares a redistribution directory (weights, agreement, prohibited-use policy, Notice). A trusted manifest compiled into the App pins official origin/revision, hash, size and approved HTTPS download URL. The native installer never asks for HF credentials. Without a prepared release manifest, it truthfully reports not yet published; no mirror or alternate model fallback.
**Spec:** User explicitly chose first-use one-tap download; retain no-China and local-inference requirements.

- [ ] Test manifest schema, hash/size/source/revision/approved HTTPS restrictions and unavailable-release state.
- [ ] Replace native end-user token/pointer fetching with bundled manifest + agreement acceptance + progress download / digest verification; keep developer provisioning token out of mobile runtime.
- [ ] Add developer release packaging tool and exact copies of agreement/policy/Notice; document hosting and approval prerequisites.
- [ ] Verify, review, update host patch, build/install, push/merge after relevant checks. Team model acceptance and actual HTTPS publication remain external prerequisites, never fake them.
