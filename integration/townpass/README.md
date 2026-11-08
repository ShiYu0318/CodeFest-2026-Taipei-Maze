# Historical TownPass integration

This directory preserves earlier integration experiments and upstream notices. The current product is the web microservice in [`app/`](../../app/). **Do not modify the adjacent TownPass host or automatically apply/extend these patches for new features.**

## Contents

- `test-env.patch`: historical experiments against TownPass commit `c8e5d4d3f8f699f3d9d6cd68e129ed4da12037b3`, including native scanning/AI/voice/web-bundle work. This is not an accepted upstream integration or a guarantee of current host capability.
- `smoke/`: opt-in bridge diagnostic page; not the production navigation UI.
- `licenses/`: original upstream/runtime/model notices; these must not be removed during cleanup.
- `gemma-release.json`: model delivery manifest. Model terms, approved hosting and device validation are separate from the web release.

The current station page uses the existing `flutterObject` JSON `{name, data}` protocol and `qr_code_scan` for single scans. GPS is not an indoor position. A browser without the bridge must retain manual endpoints. Optional continuous-camera or native AI protocols in historical patches are not available merely by changing a QR code.

## Web development

Follow the [quick start](../../README.en.md#quick-start). The local Vue server at `127.0.0.1:8082` is reachable from the development computer or its simulator, not another physical phone's loopback interface. Use a trusted HTTPS service for physical-device checks.

For the historical diagnostic server only:

```bash
node tools/townpass-smoke-server.mjs
```

It listens on loopback port 8765 and does not expose the project to the LAN. `scripts/townpass-env.sh` and the Android workflow retain opt-in historical helpers; some commands write bundles or resolve dependencies in a host checkout and are not part of routine web setup. Do not run those host-mutating commands under the current no-host-change constraint.

Device validation remains separate: QR success/cancel, return/background lifecycle, origin allowlists, audio/microphone, model download/hash/terms, inference performance and offline startup need actual Android/iPhone evidence. Local competition notes under ignored `docs/` may describe old workflows and are not required by a fresh clone.
