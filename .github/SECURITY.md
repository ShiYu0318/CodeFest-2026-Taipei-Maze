# Security policy

This is a prototype, not an emergency service or a field-certified accessibility system. No supported-version security SLA is currently offered.

Do not post tokens, model download credentials, personal location records or exploitable details in a public issue. Where available, use the repository's private vulnerability reporting channel; otherwise contact a maintainer privately through an already established channel. This repository does not claim an enabled private-reporting feature or publish an unverified contact address.

Useful reports include revision, affected component, impact and a minimal reproduction without real personal data. Do not test against other people's accounts, devices or production sessions.

Before operating a deployment, check HTTPS, host bridge origin controls, dependency provenance, ignored secrets and the model download allowlist. Published QR content is untrusted input; checking a point ID does not prove that the physical label is in the right place.

## Dependency audit snapshot

The clean-install full npm audit reported 18 findings (8 high, 10 moderate, 0 critical), associated with the existing Vue CLI development/build toolchain. `npm audit --omit=dev` reported 0 findings. Neither result certifies safety. Do not expose the development server publicly; production serves built files through nginx. The competition snapshot retains this legacy development toolchain and is not an audited production distribution. No `npm audit fix --force` or unreviewed major upgrades were applied.
