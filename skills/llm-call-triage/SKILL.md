---
name: llm-call-triage
description: Use when an LLM API call misbehaves — empty or blank completion, truncated/cut-off output, schema-invalid JSON, a judge/verifier "returning nothing", surprise costs for no output, a retry loop not converging, or an HTTP 200 that still failed. Also use when a pipeline's downstream logic starts treating silence as an answer ("judge says tie", "skeptic converged") or when picking a retry policy. Trigger phrases: "empty response", "output cut off", "空レスポンス", "途中で切れた".
---

# LLM Call Triage

## Overview

Most "weird" LLM responses are one of a handful of known failure modes, and the deadliest ones are silent: an empty-but-billed answer that downstream code reads as a verdict. Triage by ordered hypotheses with a cheap probe each — never by blind retry.

## When to use

- Empty, blank, or whitespace-only completions (especially from reasoning models).
- Truncated output, schema-invalid output, anomalous cost or latency.
- Loops/pipelines that mysteriously "converge", "tie", or degrade.
- Choosing retry/repair policy or comparing model cost for a pipeline role.

## When NOT to use

- Auth/network/permission errors with clear error codes — read the error, fix the config.
- Bad answer quality from a syntactically fine response — that is prompting/model choice, not call triage.

## Hard rules

1. **Never retry a deterministic call unchanged.** temperature 0 / fixed seed returning the same failure twice proves the failure is deterministic; change the call (cap, prompt, model) or stop.
2. **Never treat an empty response as an explicit answer.** Not "NONE", not a refusal, not a tie, not a verdict. A starved skeptic call reads as "converged"; a starved judge reads as "tie" — both silently corrupt the loop. Empty = distinct failure state, logged and counted separately.
3. **On empty output from a reasoning model, suspect token starvation FIRST.** Hidden thinking tokens are spent INSIDE max_tokens; a small cap yields an empty answer that is still billed. Raise the cap 2–6x before touching anything else.
4. **Never trust HTTP 200 alone.** APIs report upstream errors as 200 with an error body; check the body for error fields before parsing it as a completion, or failures become $0-looking empty answers.
5. **Never retry schema-invalid output unchanged.** Re-send WITH the invalid output and a corrective repair prompt, or don't re-send.
6. **Retry only transient failures** (provider overload/429/5xx, truncated response bodies from the transport). Everything else needs a changed call.
7. **Never accept provider reasoning-budget params on faith.** Controls like `reasoning.max_tokens` are often silently ignored; verify with a small probe before building on them.
8. **Judge model cost by measured cost per COMPLETED task, not catalog token price.** Hidden reasoning multiplies billed tokens and latency; a "cheap" model that starves or loops is expensive.

## Process — decision tree

For the observed symptom, walk its hypotheses IN ORDER; each has a probe. Stop at the first confirmed cause, apply its fix, and only then re-run.

### Symptom: empty / whitespace-only completion

1. **Token starvation (reasoning model)** — most likely. Probe: check usage in the response — output/reasoning tokens ≈ max_tokens with no visible text confirms it. Fix: raise max_tokens 2–6x. Do NOT retry unchanged.
2. **200-with-error-body.** Probe: dump the raw response body; look for `error`, `message`, empty `choices`/`content`. Fix: handle as an API error (retry only if transient).
3. **Content filter / refusal channel.** Probe: check finish/stop reason and moderation fields. Fix: prompt or policy change, not retry.
4. **Genuine empty answer.** Only after 1–3 are excluded may "model chose to say nothing" be considered — and even then log it as anomalous, never as "NONE".

### Symptom: truncated / cut-off output

1. **max_tokens hit.** Probe: finish reason = length/max_tokens. Fix: raise cap (2–6x if a reasoning model — thinking eats the budget) or continue-from-truncation.
2. **Transport truncation (broken stream/body).** Probe: invalid JSON tail, missing stop reason, connection reset. Fix: this is transient — retry is allowed.
3. **Stop-sequence collision.** Probe: does the tail end exactly where a configured stop sequence would fire? Fix: adjust stop sequences.

### Symptom: schema-invalid / unparseable output

1. Probe: is it truncated (see above) or well-formed-but-wrong-shape?
2. Wrong shape → one repair attempt: re-send with the invalid output quoted and a corrective instruction. If the repair also fails, escalate model tier or tighten the prompt — do not loop repairs.

### Symptom: anomalous cost or latency

1. **Hidden reasoning inflation.** Probe: compare billed output tokens to visible text length. Fix: cap reasoning if the provider honors it — verify with a probe call (send a tiny task with a tiny reasoning budget; if billed reasoning tokens blow past it, the param is ignored) — else switch model.
2. **Silent retry storm.** Probe: count actual requests in logs vs intended calls.
3. Recompute the role's cost as measured $ per completed task before concluding a model is "cheap" or "expensive".

### Symptom: loop that "converges"/"ties" suspiciously

1. Probe: grep the loop's transcripts for empty responses being consumed as answers. Fix: add the empty-is-not-an-answer guard (rule 2), then re-run the loop. If a refinement loop is not converging, stop iterating: in the 48-task benchmark, parallel width + selection + one review round matched the review-to-convergence loop (mean 1.85 rounds on that run) at 0.58x cost — switch to that shape (see sample-select-polish). This does not cap a standalone fresh-eyes-review audit, which loops to convergence by design.

## Common mistakes

- Retrying an empty response unchanged N times — N billed empties, same cause.
- `if not response: verdict = "NONE"` anywhere in pipeline code.
- Parsing `response.json()` without checking for an error body first.
- Setting a provider reasoning budget once and assuming it works forever.
- Ranking models by price-per-token tables instead of measured per-task cost.
