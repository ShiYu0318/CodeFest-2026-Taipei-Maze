# On-device Chat Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, test-first and fresh review.

**Goal:** A floating chat panel backed by Google Gemma 3 1B on iPhone and Android, with explicit on-device voice input.
**Architecture:** Vue panel and request-correlated WebView bridge; Flutter origin gate forwards to native Swift/Kotlin method channels. Google LiteRT-LM runs a pinned Gemma model locally. Voice uses only Apple on-device recognition or verified Google on-device Android recognition, never cloud fallback. Model provisioning is separate from inference and gated on user model-license acceptance.
**Tech Stack:** Existing Vue/Flutter, official Google LiteRT-LM, Apple Speech, Android SpeechRecognizer. No third-party chat UI or remote LLM.
**Spec:** User's explicit floating ChatBot + Gemma 3 + voice + both-platform instructions; AGENTS.md.

## Tasks

- [x] Implement and test correlated web bridge (timeouts, late results, cancellation, bounded input), bounded in-memory chat state and accessible floating panel with truthful native/model status.
- [x] Add native origin-gated bridge; official LiteRT-LM iOS/Android integration with bounded local generation and explicit model setup/import, no network inference.
- [x] Add user-initiated, local-only speech recognition on both platforms; draft-only transcript, stop/cancel/background cleanup and text fallback.
- [x] Verify web tests/lint/build and native analysis/build/tests available locally; obtain review, fix issues, update provenance and docs, segmented commits/push/merge. (Done in PR #3/#7; real-device inference, latency and microphone remain not_run.)

## Acceptance / limitations

- Panel open/close/reset/stop; keyboard focus and mobile safe areas. Text is plain text, not model-controlled HTML.
- Explicit user tap for model setup and microphone; model/recognizer unavailable is visible. No fake Gemma replies.
- Chat input and recordings never sent to server or logged. No model tools capable of changing routing/location.
- Imported model must match approved Google artifact; no arbitrary models or mirrors. No model weights/tokens committed.
- Real-device latency, quality, memory and microphone/camera UI cannot be certified by a simulator build. Keep evidence honest.
- Android SDK license acceptance and Gemma gated model acceptance remain external user actions if required.
