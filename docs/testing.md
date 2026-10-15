# Verification record

This repository began with only README and LICENSE. No previous implementation or validation was assumed. All fixtures use fictional projects, not customer material.

## Deterministic / mocked checks

`npm test`: **49 tests passed**, 0 failed/skipped/cancelled in the current run. Covers input bounds, missing/duplicate results, exact/paraphrased/invented quotes, unsupported decisions, integer quote arithmetic, currency precision, overrides, incomplete estimates, edited report content, credential/configuration failure, HTTP validation/security headers, unsafe file access, quotas, concurrent requests, provider errors, timeout, model confirmation, failed provider status and prompt/data separation.

These tests mock inference. They verify application behavior, not semantic model quality. The first run had a mistaken expected rounding total in a test: per-line rounding produces $74.97, not $74.96. The expectation was corrected to the independently calculated total; application arithmetic was unchanged.

## Browser checks

Real system Chromium with Python Playwright 1.62.0: **16 checks passed**. Desktop 1440px and mobile 390px; sample identification; overrides; quote arithmetic; edited replies; export consistency; clipboard behavior/fallback; invalid quote inputs; source-edit invalidation; visible provider failure; literal malicious-text rendering; discarded in-flight stale results; reset; print; keyboard skip navigation; no JavaScript errors. AI success/error cases in this suite are explicitly network-mocked and make no paid calls.

Pinned axe-core 4.14.0 found **zero WCAG 2.1 A/AA violations** in populated desktop/mobile scans after contrast and accessible-name fixes. Scans use reduced motion so transient row fade opacity does not distort contrast measurements. This is automated coverage, not a claim of full WCAG conformance or a screen-reader audit. Actual browser screenshots are captured by the suite in ignored `test-results/`; publication screenshots are labelled separately.

## Live AI evidence

`scripts/live-eval.mjs` sends the fixed synthetic fixtures in `test/live-fixtures.mjs` to an explicitly selected open-weight model through Backboard. Expected labels were written before the calls. It records full inputs, classifications, quotes, model identity, latency, tokens, account balance observations and billing events in `docs/evidence/`. It checks model-token balance and auto-reload before making calls and never buys credit or retries automatically.

The first Qwen3-32B smoke test returned all five expected sample classifications, with exact matching quotes for the four definitive decisions. Provider billing reported $0.000145, 356 input tokens and 415 output tokens. On the eight-request fixture set, Qwen3-32B returned **8/8 expected labels**, including quantity overrun, unknown revision consumption, and hostile text embedded in scope/request. Two runs of that frozen set were retained while diagnosing unavailable comparison candidates; neither is represented as a larger independent dataset.

Catalogue checks listed Qwen3-8B, Qwen3-14B and Qwen3-235B-A22B-Instruct-2507. All three failed at inference. A diagnostic Qwen3-8B response reported provider deprecation on October 9, 2026. The application rejected the failures rather than choosing a fallback. Their failed attempts remain in the evidence. Do not treat listed models as necessarily runnable.

The final comparison used Qwen3.5-9B (Apache 2.0, official model card and Backboard catalogue checked): the six-request fixture timed out at 45 seconds, while the two-request adversarial/uncertain fixture completed with **2/2 expected labels in 40.671 seconds**. The corresponding first Qwen3-32B run completed the six-request fixture **6/6 in 27.225 seconds**, and the adversarial fixture **2/2 in 16.819 seconds**. The timeout is not counted as six incorrect classifications. Evidence is in `comparison.json`, with original runs retained separately. This is a comparison of observed behavior under a fixed application deadline, not a model-ranking benchmark.

## Important limits

Eight hand-authored requests are not a benchmark, guarantee against injection, contract interpretation validation, or evidence of universal accuracy. Matching expected labels after conservative validation does not isolate raw-model accuracy. No claims of customers, feedback, revenue or superiority over a closed model are made.
