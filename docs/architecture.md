# Architecture and threat boundaries

One Node.js 24 service, no production package dependencies, no database. Static browser modules share deterministic domain functions with the server. The browser never contacts Backboard directly. Only the server reads `BACKBOARD_API_KEY`. Publishing credentials are excluded from the deployment.

## Trust boundaries

1. Agreement and request strings are untrusted. Validate type, length and count on both client and server. JSON encoding keeps them separate from the fixed system instructions. The model has no application tools.
2. Provider results are untrusted. Bound the response stream, require exact one-based IDs with no duplicates/missing items, allow only three classifications, limit field lengths, and ignore model-supplied request text. Confirm the returned model identity. HTTP 200 with `FAILED` is a failure.
3. Accept a quote only if it is an exact, contiguous, case-sensitive substring of the supplied agreement. Remove invented/paraphrased quotes. A non-clarification decision without verified quotation becomes clarification. Textual matching does not establish whether the quote actually supports the interpretation.
4. Render all user/model text with `textContent` or textarea `value`, never HTML injection. Serve only four explicitly mapped public files. CSP disallows external scripts, frames, inline JavaScript and connections to other origins.
5. Money is deterministic: parse decimal strings to integer minor units, multiply by hundredths of an hour, round each line, sum. Select currency minor units with `Intl`. Incomplete estimates never appear as complete quotes. Hours/rate are not model-generated.
6. Copy/export/print use the current decisions and edited reply. Changing source inputs clears the old result and increments a generation ID, so stale in-flight results are not displayed. Custom replies survive estimate edits with a warning.

## Provider lifecycle

Backboard's documented `POST /api/threads/messages` supports a per-turn `system_prompt`, explicit `llm_provider=openrouter`, explicit `model_name`, `json_output=true`, `stream=false`, `memory=off` and `web_search=off`. No shared `thread_id` or `assistant_id` is passed. After a response, attempt `DELETE /api/threads/{thread_id}` with a separate five-second timeout. This does not guarantee provider deletion, prevent retained assistant metadata, or recover a thread ID from a timed-out request. No memory, RAG, embeddings, fine-tuning, client messaging or background agent activity is used or claimed.

## Operational safeguards

Input body ≤20 KB, provider output ≤100 KB, request-body/header timeouts, bounded input fields, 45-second provider timeout, no automatic paid retries, single-flight concurrency and process/IP attempt limits. Cleanup errors log only a fixed message. Application errors do not expose raw provider bodies or keys. Agreements are not logged. In-memory quotas reset and are not spending caps. Multiple replicas, redeploys, proxy-IP grouping, host resource limits, account token credit and provider outages remain operational concerns.

Cookie-free socket-IP limits deliberately avoid trusting spoofable forwarded headers, but behind Render this can group visitors. This is an inexpensive limited public demonstration, not an abuse-resistant paid product. A commercial version would need persistent quotas, authenticated access and explicit retention policies; those are intentionally outside this entry.
