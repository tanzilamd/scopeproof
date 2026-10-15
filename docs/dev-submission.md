*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12).*

## What I Built

“Could we add customer login? It should be a quick change.”

A contact form and a login system can both sound like ordinary website work. But if the agreed price covers one and excludes the other, someone has to explain that difference before the work starts.

That is the problem I chose for **ScopeProof**: help a freelancer check a new request against the agreement and prepare a clear response.

The app reviews up to eight requests and suggests **Included**, **Extra work**, or **Needs clarification**. Each suggestion comes with a short reason and a scope quote when one is available. You can change any decision, estimate the extra work, edit a client reply and export the review. Nothing is sent automatically.

Freelance developers and small web studios might pay for that convenience. I have not tested the business assumption with paying users yet.

## Demo

**[Try ScopeProof](https://scopeproof.onrender.com)** · **[View the repository](https://github.com/tanzilamd/scopeproof)**

The free Render service may need a moment to wake up. Start with **Load illustrative sample**: a fictional agreement for five pages, a contact form and two revision rounds, excluding accounts and online payments.

The contact form belongs in the original work. Login and payments need a separate discussion. A third revision goes beyond the stated limit. “Make the website more engaging” needs a clearer definition before anyone can sensibly estimate it.

Enter two extra hours at $50/hour, for example, and the app calculates a proposed $100 quote for the editable reply. The client still needs to approve it.

The sample is labelled prewritten output and sends nothing. For real inference, acknowledge the hosted-AI disclosure and click **Analyze with AI**. Copy the reply, download the text report, or print to PDF.

![ScopeProof's actual interface before loading any results](https://raw.githubusercontent.com/tanzilamd/scopeproof/main/docs/screenshots/overview.png)

There is also a [live-analysis screenshot from the local app](https://github.com/tanzilamd/scopeproof/blob/main/docs/screenshots/live-review-local.png), captured with real Backboard inference.

## Code

{% github tanzilamd/scopeproof %}

The application is MIT licensed. The repository includes [setup instructions](https://github.com/tanzilamd/scopeproof#quick-start), [architecture notes](https://github.com/tanzilamd/scopeproof/blob/main/docs/architecture.md) and [test evidence](https://github.com/tanzilamd/scopeproof/tree/main/docs/evidence).

## How I Built It

I built ScopeProof with OpenAI Codex assistance for implementation and testing.

I kept it to one Node.js 24 app on Render with plain HTML, CSS and JavaScript. There are no production package dependencies, login or database. The Backboard key stays on the server.

The live model is **[Qwen3-32B](https://huggingface.co/Qwen/Qwen3-32B)**, selected explicitly as `qwen/qwen3-32b` through Backboard's OpenRouter integration. Qwen publishes its weights under **Apache 2.0**. Each analysis gets a separate conversation, with memory and web search off, followed by an attempt to delete the temporary thread.

My main rule for the app was simple: a suggestion should point to something the person can check.

The server checks every quotation against the agreement and requires a result for every request. Invented quotes are removed; unsupported definitive suggestions become **Needs clarification**. A real quote can still be misinterpreted, so the user keeps the final decision.

Prices come from user-entered hours, rate and currency. The calculation runs in code, rounding each line before adding the total. Blank hours show **Estimate incomplete**, with a count of the estimates still needed. An explicitly entered zero is valid. Editing the agreement clears the old review.

### Checking that it works

There are **51 passing automated tests** and **19 passing Chromium checks** for validation, quotes, arithmetic, overrides, errors, exports and desktop/mobile use. Provider calls in these suites are mocked. Desktop/mobile axe scans found zero WCAG 2.1 A/AA violations; a full accessibility audit remains outside that coverage.

A separate local browser check used real Backboard inference: five expected sample labels, matching quotes and **11.96 seconds** of model-response latency.

The first public call exposed a deployment mistake: a cloud credential reference was unusable on Render. Setting the Backboard key directly in Render fixed it. My manual public walkthrough then covered decisions, estimates, replies and export.

For the model choice, eight fixed synthetic requests covered exclusions, limits, ambiguity and hostile instructions. Expected labels preceded inference. Both models used the same prompt and validator through one Backboard key.

| Model | Six-request scope/limits case | Two-request hostile/uncertain case |
| --- | --- | --- |
| Qwen3-32B | 6/6 expected labels; 27.2 s | 2/2 expected labels; 16.8 s |
| Qwen3.5-9B | Timed out at the 45 s limit; no result accepted | 2/2 expected labels; 40.7 s |

These are accepted results after validation. The timeout is not six incorrect answers, and eight examples are too few for a general accuracy claim. The [full comparison](https://github.com/tanzilamd/scopeproof/blob/main/docs/evidence/comparison.json) supported keeping Qwen3-32B for this demo.

A catalogue-listed Qwen3-8B candidate returned a provider deprecation error. Actual inference matters; the app never silently switches to a closed model.

The first successful five-request call cost **$0.000145**. Through the local live-browser check, the observed balance change was **$0.001505**, with auto-reload off. The [billing evidence](https://github.com/tanzilamd/scopeproof/blob/main/docs/evidence/costs.json) records that testing checkpoint, not future public-service costs.

## Why Does Open Innovation Matter?

Open weights give this project somewhere to go if the current hosting arrangement stops fitting. Qwen's published weights and permissive license allow another host, quantization or a future local deployment to be explored with the same workflow and test cases. The MIT code makes the quote checks inspectable too.

Clients can have different confidentiality requirements, and small businesses need predictable costs. Backboard made a two-model comparison possible through one key. The smaller model's timeout showed why catalogue price alone was insufficient.

Today's app still sends input to hosted services. I have not implemented offline inference or measured an advantage over a closed-model baseline.

## Prize Categories

- **Best Use of Render:** the single Render service hosts the interface and server-side AI integration.
- **Best Use of Backboard:** two open-weight models were compared through one Backboard key, with published cases, classifications, latency and a recorded timeout.

### A few boundaries

Avoid confidential client material in the public demo. Live input goes to Backboard and its model provider; memory off and attempted thread deletion do not guarantee zero retention.

A model can misread a real quote or follow hostile instructions. ScopeProof is a review aid, not legal advice or proof of client approval. The demo has input limits, timeouts and request quotas, but those in-memory quotas reset on restart and are not guaranteed account spending caps. Extra work still needs human review and written approval.

Credits: the **Qwen team** for the Apache-2.0 models; **Backboard, OpenRouter and Render** for hosted services; **Playwright** (Apache 2.0) and **axe-core** (MPL 2.0) for test tooling. The application code is MIT licensed.
