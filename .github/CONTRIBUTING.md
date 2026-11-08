# Contributing

Thank you for improving 北車不迷路 / Taipei Main Station Wayfinding.

## Start here

Read [README.md](../README.md), [README.en.md](../README.en.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [AGPL_NOTICE.md](../AGPL_NOTICE.md) and [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). The ignored `docs/` directory contains local competition notes and is not required for a fresh clone.

Use Node.js 20 and npm. Keep `app/package-lock.json`; use `npm ci` for reproducible installs.

```bash
cd app
npm ci
npm run serve -- --host 127.0.0.1 --port 8082
```

## Before submitting

```bash
cd app
npm test
npm run lint
npm run validate:assets
npm run build
cd ..
python3 -m unittest discover -s tools -p 'test_*.py'
git diff --check
```

Tests run with Node's built-in runner; renderer tests exercise Vue output without claiming browser/device validation. Include a focused regression for behavior changes. Do not add tests that only repeat trivial text replacements.

Use English Conventional Commits (`fix:`, `feat:`, `refactor:`, `docs:`). Describe the problem, behavior, validation and remaining limitations in pull requests using the repository template. Maintainers may push reviewed fixes directly to main according to project policy. Do not force-push shared history or delete another contributor's unmerged work.

## Data and accessibility

- Update the graph generator/source inputs, regenerate with `npm run build:walking`, and run `npm run validate:assets`.
- Verify floor endpoints, geometry, route restrictions and provenance; never add a straight line across unknown space just to make routing succeed.
- Unknown accessibility is not passable in step-free mode. An entrance, a facility and an exit-to-street segment need separate evidence.
- Keep all seven catalogs in sync: Traditional Chinese, English, Vietnamese, Indonesian, Thai, Korean and Japanese.
- Use Taiwanese Traditional Chinese, consistent spacing, and mode labels 預設／兒童／長輩. Preserve text alternatives, keyboard focus and reduced-motion behavior.

## Privacy, provenance and scope

Do not commit credentials, `.env` files, model weights, private personal data, raw user recordings or local reference documents. Every new dependency/asset needs source and license review in THIRD_PARTY_NOTICES. Original code is AGPL-3.0-or-later; third-party content keeps its own terms. Do not modify the separate TownPass host checkout. Existing integration patches are historical references, not approval to extend the host.

## Report a problem

Give the app revision, browser/device, language/display mode, point IDs, route options, expected result and reproduction steps. Avoid posting real personal locations, secrets or camera recordings. For sensitive issues, follow [SECURITY.md](./SECURITY.md).
