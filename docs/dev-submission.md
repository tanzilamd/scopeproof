*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12).*

## What I Built

“Could we add customer login? It should be a quick change.”

For a freelancer, that request can change the agreement, the price and the working relationship.

I wanted ScopeProof to make that conversation easier. It compares an agreement with new client requests and suggests **Included**, **Extra work**, or **Needs clarification**, alongside a short reason and a supporting quote when available. The freelancer can change every decision, enter estimates, edit a reply and export the review. Nothing is sent automatically.

Freelance developers and small studios are the potential buyers. They might pay for a repeatable way to review changes and prepare a clear response. I have not validated that willingness to pay or claimed customers, revenue or feedback. My goal for this entry was a small, usable workflow with evidence behind its suggestions.

## Demo

**[Open ScopeProof on Render](https://scopeproof.onrender.com)** · **[Public repository](https://github.com/tanzilamd/scopeproof)**

The free Render service may need time to wake up. Start with **Load illustrative sample**: it is labelled prewritten output, makes no model call and sends nothing. For real inference, acknowledge the hosted-AI disclosure and select **Analyze with AI**.

Here is the fictional before-and-after example:

- **Agreement:** a five-page website, a contact form and two revision rounds. “Customer accounts and online payments are excluded.”
- **New requests:** build the contact form, add login and make a third revision round.
- **Review:** the form is included; login conflicts with an exclusion; the third revision exceeds the stated limit. Each definitive suggestion has a scope quote to inspect.
- **Next step:** choose the final decisions, enter your own hours and rate, then edit the proposed reply. For illustration, two extra hours at $50/hour produce a proposed $100 estimate, still requiring client approval.

Export the scope, quotes, overrides, estimates and edited reply as text, or print to PDF.

![The actual ScopeProof interface before loading a sample or live result](https://raw.githubusercontent.com/tanzilamd/scopeproof/main/docs/screenshots/overview.png)

A [live-analysis screenshot](https://github.com/tanzilamd/scopeproof/blob/main/docs/screenshots/live-review-local.png) records the local app using real Backboard inference, separately from the illustrative sample.

## Code

{% github tanzilamd/scopeproof %}

The code is MIT licensed, with [setup instructions](https://github.com/tanzilamd/scopeproof#quick-start), [architecture notes](https://github.com/tanzilamd/scopeproof/blob/main/docs/architecture.md) and [recorded test evidence](https://github.com/tanzilamd/scopeproof/tree/main/docs/evidence).

## How I Built It

I built ScopeProof with OpenAI Codex assistance for implementation and testing.

I kept the architecture to one Node.js 24 application on Render, with static HTML, CSS and JavaScript and no production package dependencies. No login or database is needed for the workflow. Only the server uses the Backboard key; deployment and publishing credentials stay out of the application.

Live analysis explicitly selects **Qwen3-32B** as `qwen/qwen3-32b` through Backboard's OpenRouter integration. Its weights are published by the Qwen team under **Apache 2.0**. Each analysis starts a separate conversation with memory and web search off, followed by an attempt to delete the temporary thread. There is no silent fallback to a closed model.

I wanted evidence people could inspect. The server requires each request ID exactly once. A quote must be an exact substring of the supplied agreement. An invented quote is removed; a definitive suggestion without verified supporting text becomes **Needs clarification**.

A matching quote proves wording, not interpretation. That is why the person reviewing the request keeps the final decision. Money is calculated in code from user-entered hours, rate and currency, with each line rounded before summing. Missing hours show “Estimate incomplete” with the number of estimates still needed; explicitly entered zero hours are valid. Changing the agreement invalidates old results.

### What the recorded checks show

- **49 automated tests passed:** validation, quotation checks, arithmetic, overrides, provider failures, timeouts and limits. Provider integrations in this suite are mocked.
- **18 Chromium checks passed:** desktop/mobile workflow, edited replies, exports, stale results, reset, safe text rendering, print and keyboard navigation. AI responses in this suite are mocked. Populated desktop/mobile axe scans reported zero WCAG 2.1 A/AA violations; this is not a full accessibility audit.
- **One separate unmocked browser-to-local-app-to-Backboard check** returned the five expected sample labels, verified quotes and 11.96-second model-response latency. It is a repeat of the sample, not five new evaluation examples.

The live comparison used eight fixed synthetic requests: included work, exclusions, limits, ambiguity and hostile instructions. Expected labels preceded inference. Both models used the same prompt and validator through one Backboard key:

| Model | Six-request scope/limits case | Two-request hostile/uncertain case |
| --- | --- | --- |
| Qwen3-32B | 6/6 expected labels; 27.2 s | 2/2 expected labels; 16.8 s |
| Qwen3.5-9B | Timed out at the 45 s limit; no result accepted | 2/2 expected labels; 40.7 s |

The timeout is not six wrong answers. These accepted, post-validation results are a small diagnostic set, not a general benchmark or injection-resistance guarantee. The [raw comparison](https://github.com/tanzilamd/scopeproof/blob/main/docs/evidence/comparison.json) preserves the outcomes. It supported keeping Qwen3-32B for this demo. A catalogue-listed Qwen3-8B candidate also returned a provider deprecation error, reinforcing the need to verify actual inference.

The first successful five-request smoke call was billed at **$0.000145**. The recorded Backboard account balance change through the local live-browser check was **$0.001505**, with auto-reload off. [Billing evidence](https://github.com/tanzilamd/scopeproof/blob/main/docs/evidence/costs.json) records the observation; it is not a forecast of public-service costs. Render uses free compute because the reported promotional credit could not be independently verified through its public API.

## Why Does Open Innovation Matter?

Qwen's published weights and permissive license make a different host, quantization or future local deployment possible while retaining the same scope fixtures, quote checks and review workflow. The MIT application code makes those checks inspectable too.

That flexibility matters for freelancers serving clients with different confidentiality requirements and for a small business watching its costs. Backboard made the two-model comparison possible through one key. The slower model's outcome showed why catalogue pricing alone was insufficient for my choice.

The current app still uses hosted inference. I have not implemented offline operation or measured an advantage over a closed-model baseline.

## Prize Categories

- **Best Use of Render:** the single Render service hosts the interface and server-side AI integration.
- **Best Use of Backboard:** the project compares two open-weight models through one Backboard key, with reproducible fixtures, classifications, latency and a recorded timeout. This goes beyond an API-use claim.

### Practical boundaries

Live input goes to Backboard and its model provider; memory off and attempted thread deletion do not guarantee zero retention. Avoid confidential client material. Models can misread a real quote or follow hostile text. ScopeProof is not legal advice, an invoice or proof of approval.

The demo has bounded inputs, timeouts and request limits. Its in-memory quotas reset on restart and are not guaranteed account spending caps. Human review and written client approval remain part of the workflow.

Credits: the **Qwen team** for Apache-2.0 models; **Backboard, OpenRouter and Render** for hosted services; **Playwright** (Apache 2.0) and **axe-core** (MPL 2.0) for test tooling; and **OpenAI Codex** for implementation and testing assistance.
