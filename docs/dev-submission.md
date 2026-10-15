*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12).*

## What I Built

“Could we add customer login? It should be a quick change.”

The difficult part is often not estimating the code. It is explaining, calmly and specifically, why the request changes the agreement.

**ScopeProof turns that moment into a reviewable scope conversation.** Paste the original agreement and the client's new requests. An explicitly selected open-weight model suggests **Included**, **Extra work**, or **Needs clarification** for each request, with a short reason and a supporting scope quote where available.

Then the freelancer takes over: change any decision, enter their own hours and rate, edit a client reply, and export the review. Nothing is sent to the client automatically.

The potential buyer is a freelance developer or small studio that regularly negotiates changes. The paid value would be a consistent review and communication workflow, not another chatbot subscription. A modest paid version could offer reusable agreement templates and persistent change histories. Those are future ideas: this entry has **no paying customers, revenue or claimed user feedback**. I kept the actual product small enough to demonstrate and inspect.

## Demo

**[Try ScopeProof on Render](https://scopeproof.onrender.com)** · **[View the source](https://github.com/tanzilamd/scopeproof)**

The service uses Render's free compute plan, so a cold start can take a little time. Live AI is deliberately limited; the labelled sample remains usable without a paid inference call.

For a quick walkthrough:

1. Select **Load illustrative sample**. This is explicitly prewritten output; it does not claim to be a model response and sends nothing.
2. The fictional agreement includes a five-page website, a contact form and two revision rounds. It excludes customer accounts and online payments.
3. Compare “Build the contact enquiry form” with “Add customer login” and “Make a third revision round.” Read the agreement quotes beside the suggestions.
4. Change a decision. Enter your own hours and hourly rate for the extra work. The quote updates in code; the model never invents a price.
5. Edit the reply and export a report. It includes the original scope, evidence, your overrides, estimates and edited reply. Use print to save a PDF.

To make a **real** inference call, acknowledge the hosted-AI disclosure and choose **Analyze with AI**. Do not paste confidential client information into a public demo.

## Code

{% github tanzilamd/scopeproof %}

The application is MIT licensed. The repository includes [setup instructions](https://github.com/tanzilamd/scopeproof#quick-start), the [architecture](https://github.com/tanzilamd/scopeproof/blob/main/docs/architecture.md), [test notes](https://github.com/tanzilamd/scopeproof/blob/main/docs/testing.md), and [actual evaluation records](https://github.com/tanzilamd/scopeproof/tree/main/docs/evidence).

## How I Built It

The connected repository initially held only a README and MIT license. I built the application from scratch with **OpenAI Codex assistance**, including implementation, tests and this write-up. No missing source archive or previous “syntax check” was treated as existing work.

The stack is intentionally plain: **one Node.js 24 web service on Render**, static HTML/CSS/JavaScript, and **no production package dependencies**. There is no login, database, payment system or autonomous client messaging. Backboard credentials are used only by the server. Render and DEV publishing credentials are not deployed with the application.

Backboard routes the live review to **Qwen3-32B**, explicitly selected as `qwen/qwen3-32b` through OpenRouter. The model's weights are published by the Qwen team under **Apache 2.0**. Every analysis starts a separate conversation, with memory and web search off; the application attempts to delete the temporary thread afterward. That is not a zero-retention promise: Backboard and downstream providers can retain data under their policies.

### The model suggests. The application checks. The freelancer decides.

I did not want a confident-looking label to become fake contractual evidence.

The server accepts only a complete structured result containing each request ID exactly once. A supporting quote must be an **exact, contiguous substring** of the supplied agreement. Invented or paraphrased evidence is removed. A definitive suggestion without a verified quote is downgraded to **Needs clarification**.

This check proves that words appear in the agreement. It does **not** prove that the model interpreted those words correctly. That distinction is why every suggestion remains editable, uncertainty stays visible, and the reply asks for written approval before extra work begins.

Hours, rates and currency are user inputs. The quote calculation uses integer currency minor units and rounds each line before summing. Missing estimates stay incomplete. Editing the original text invalidates the old review; a response arriving after an edit is discarded. Editing an estimate preserves a custom reply and asks the user to review or refresh it.

### What I actually tested

The deterministic suite has **49 passing tests** covering malformed results, missing/duplicate IDs, invented quotes, quote arithmetic, overrides, input limits, credentials, provider failures, timeouts, quotas and model-identity checks. Those provider integrations are mocked; they are not model-quality evidence.

Separately, **16 real Chromium checks** exercised the desktop/mobile workflow, report consistency, edited replies, reset, stale responses, literal rendering of hostile text, print and keyboard skip navigation. The AI success/error cases in that browser suite are mocked. Automated axe-core scans reported **zero WCAG 2.1 A/AA violations** in the populated desktop and mobile views after fixes. That is useful coverage, not a claim of full accessibility certification.

I also clicked through a separate **unmocked browser → local application → Backboard** test. It returned all five expected sample labels from Qwen3-32B, with verified quote text and 11.96-second provider latency. That result and a clearly distinguished live-inference screenshot are in the repository; it is not counted as another five independent evaluation examples.

For live evidence I wrote a small, fixed set of **eight synthetic requests**, with expected labels recorded before inference: ordinary included work, explicit exclusions, a page-count overrun, a third revision, ambiguity, unknown revision consumption, and hostile instructions embedded in the agreement and request.

Using the same prompt and conservative validator through one Backboard key:

| Open-weight model | Six-request ordinary/limits case | Two-request hostile/uncertain case |
| --- | --- | --- |
| Qwen3-32B | 6/6 expected labels; 27.2 seconds | 2/2 expected labels; 16.8 seconds |
| Qwen3.5-9B | Timed out at the configured 45-second limit; no result accepted | 2/2 expected labels; 40.7 seconds |

The smaller model's timeout is an operational outcome, **not six wrong answers**. Eight hand-written requests are far too few for a general accuracy benchmark or a guarantee against prompt injection. These are the application's accepted decisions after validation, not an isolated raw-model benchmark. A second run of the same Qwen3-32B fixtures also matched the expected labels; it is retained as a repeat, not described as eight additional independent examples.

One finding changed the plan: **catalogue availability is not inference availability**. Qwen3-8B appeared in Backboard's catalogue, but its provider returned a deprecation error. Qwen3-14B and an older Qwen3-235B candidate also failed to run. I kept those failures in the evidence and never silently fell back to a closed model.

The first successful five-request Qwen3-32B smoke test was billed at **$0.000145**. Recorded model calls cost fractions of a cent; exact billing events and observed balance changes are in the evidence. These are observed test costs, not a promise about future pricing or the total cost of running a public service. Auto-reload was verified off. The reported $50 Render promotional credit could not be independently verified through its public API, so I chose free compute instead of relying on it.

## Why Does Open Innovation Matter?

A scope-review tool should not require its rules, evidence checks and commercial future to depend on one model vendor.

Here the practical benefit is **an inspectable path to changing the inference layer**. Qwen publishes weights and a permissive license. Another developer can adapt the integration to a different host, evaluate a quantized version, or investigate a local deployment while keeping the same request fixtures, quote checks and human-approval workflow. Model access and weights are not owned by ScopeProof.

That matters for a freelance tool because clients can have different confidentiality constraints and a small business can have very different unit economics. The two-model Backboard comparison let me test an alternative without acquiring another provider account. Its timeout also prevented me from choosing a smaller model merely because its catalogue price looked attractive.

I have **not** implemented local inference, measured a closed-model baseline, or proved a privacy or cost advantage over closed APIs. Today's demo sends text to hosted services. The open advantage demonstrated here is a reproducible evaluation and a credible ability to change the model or host, with the application logic available under MIT.

## Prize Categories

- **Best Use of Render:** Render hosts the complete Node application, including the server-side AI integration, static interface and health endpoint.
- **Best Use of Backboard:** I compared two explicitly selected, Apache-2.0 open-weight models through one Backboard key, publishing the fixed cases, accepted classifications, latency, billing evidence and timeout. I also documented catalogue entries that could not actually run.

### Boundaries I kept visible

ScopeProof is a review aid, not legal advice, an invoice, or proof that a client approved a change. Quotes can be real yet misinterpreted. User input can contain hostile instructions. The app has timeouts, bounded inputs, concurrency and request limits, but those **in-memory limits reset and are not guaranteed account spending caps**. A commercial version would need persistent quotas and stronger abuse controls. The public service is a limited demo.

No customers, screenshots, feedback or benchmarks were invented. Screenshots accompanying the repository are captures of the actual application, with sample and live views distinguished. Credits: the **Qwen team** for the models; **Backboard, OpenRouter and Render** for hosted services; **Playwright** (Apache 2.0) and **axe-core** (MPL 2.0) for test tooling; and **OpenAI Codex** for AI-assisted development and writing.

The goal is small: make “one more thing” easier to discuss with evidence, a proposed price, and room for a human to disagree.
