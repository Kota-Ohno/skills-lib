---
name: fresh-eyes-review
description: Run an iterative, multi-perspective review where independent fresh-context agents each scrutinize the artifact from one assigned role — security, correctness, performance, robustness, etc. — then an independent skeptic tries to refute each finding to kill false positives, you apply the fixes yourself, and the cycle repeats until a round surfaces no new notable issues. Use whenever the user wants a thorough, unbiased review of code, a git diff, a design doc, API spec, config, infra, or any work product — especially on "review", "audit", "find issues/bugs", "check this", "what did I miss", "rip this apart", or a review→fix→re-review loop to convergence. Lean toward triggering it for real review requests. NOT for trivial edits, artifacts already reviewed this session, or polishing a sample-select-polish winner (exactly one round there, per the SSP policy).
---

# Fresh-Eyes Multi-Perspective Review

## The idea

A reviewer who watched the work get built carries the author's blind spots. They know *why* each decision was made, so they tend to confirm it. A reviewer seeing the artifact cold — no conversation history, no design rationale — judges only what is actually there, and catches what the author rationalized away.

This skill exploits exactly that. Each review round fans out several **fresh-context agents**, each given a single role (one lens, one lane). Concentrating each agent on one domain makes its attention deeper than one generalist trying to cover everything. Every finding is then checked by an **independent skeptic** whose only job is to refute it — because fresh-context reviewers, lacking context, also produce false positives, and those must be filtered before anyone acts on them.

Then **you** (the main agent, who *does* hold the full context) apply the fixes, and the cycle repeats until a round surfaces no new notable issues.

## The division of labor (this is the whole skill — understand it)

- **Fresh agents FIND issues.** They have no context — that is the feature, not a limitation.
- **The independent skeptic FILTERS false positives.** It also has no stake; it defaults to refutation.
- **YOU apply the fixes.** You have the context needed to fix coherently without breaking the author's intent.

Never blur these roles. Do not "just review it myself" during the review phase — the whole point is to get eyes that don't share your assumptions. And do not delegate fixing to the fresh agents — fixing *needs* context, and context is exactly what biases *finding*. Keep finding context-free and fixing context-rich.

## When to use

Trigger whenever a thorough, unbiased review is wanted — code, a git diff, a design doc, API spec, config, infra, or any artifact. Especially when the user wants the review→fix→re-review loop run to convergence ("keep going until it's clean", "fix what you find and re-check").

## When NOT to use

- Routine edits and trivial changes — skip entirely (SSP policy Tier 3). The single-round option in the cost section is for low-stakes but *nontrivial* work, not for trivial edits.
- An artifact that already had its review round this session.
- Polishing a `sample-select-polish` winner: run exactly ONE round there — the SSP policy's bounded re-sample rule replaces the convergence loop for that case. The loop below applies to standalone reviews.
- A domain-specific audit another skill owns — the SSP policy's precedence rule applies: any reviewer/auditor skill that matches the task more specifically wins (non-exhaustive examples: `automation-doctor`, `release-readiness`, `context-economy`, `perf-triage`, `deps-upgrade`, `judged-comparison-gate`). Gate-style skills (`sensitive-path-rituals`, `irreversible-ops`) COMPOSE with this review — they add a completion gate on top of it, they never replace it.

## Cost, and when the full loop is worth it

This skill is expensive by design. Each round fans out one fresh-context agent per role plus an independent skeptic per finding, and the loop runs multiple rounds — a thoroughly-reviewed artifact can take many minutes and spawn dozens of sub-agents. That cost is the price of depth and false-positive filtering; it is worth paying for **high-stakes** work: security-sensitive code, payment or auth paths, anything about to ship, or a design doc before committing to build. For low-stakes but nontrivial work, run a **single round** (one fan-out, no fix-loop) and report — skip the iteration (trivial edits get no review at all: SSP Tier 3). Matching rigour to stakes is part of using the skill well.

## How to run the loop

### 0. Frame the target

Identify what to review and capture it as a `target` string: the file paths (or a diff command like `git diff --staged`, or a directory), plus a one-line description of what the artifact is and does. The reviewers read the files themselves — you do **not** paste contents into the prompt (pasting risks leaking your own framing and biasing them).

### 1. Assemble the roles

Start from the default role set below, or pick a curated set from `references/role-sets.md` matching the artifact type (code / frontend / docs / API / infra). Confirm or adjust with the user — they may want a domain-specific role added or an irrelevant one dropped. Each role is `{ key, name, lens }`. **Scale the count to the artifact**: 4–5 roles for a single small file or a focused diff; reserve the full set (up to 7) for a large module or a cross-cutting change. More roles on a small target buys nothing and costs sub-agent time — attention is concentrated by the lane, not by headcount, so four sharp lanes beat seven overlapping ones.

**Default role set:** `correctness · robustness · security · performance · maintainability · design · completeness`. Full lens text and curated variants live in `references/role-sets.md`.

### 2. Run review rounds until convergence

Run the bundled workflow **once per round**:

```
Workflow({
  scriptPath: "<this skill's directory>/scripts/review_workflow.js",
  args: {
    target: "<paths or diff command + one-line description of the artifact>",
    scope:  "<optional: what to focus on or explicitly exclude>",
    roles:  [ { key, name, lens }, ... ],   // omit to use the built-in default set
    alreadyAddressed: [ "<title of each finding fixed so far>", ... ]
  }
})
```

The workflow returns `{ summary, findings: [...], false_positives: [...], failed_roles: [...] }` (plus `synthesize_failed: true` when the final merge agent died and the report is the raw survivors). Each finding has `severity` (critical/high/medium/low/nit), `location`, `problem`, `recommendation`, `rationale`. (`references/finding-schema.md` has the full shapes.)

**Each round:**
1. Read the returned `findings`.
2. **Apply the fixes yourself** for confirmed findings using your normal edit tools. Make real changes to the real files — this is where your context pays off. Skip pure nits unless the user wants them.
3. Add each fixed finding's `title` to `alreadyAddressed` so the next round does not re-report it.
   If `failed_roles` is non-empty, re-invoke the workflow with `roles` set to just the failed lanes — a targeted re-run completes the same round (it does not count against the 4-round cap), and the round converges if the re-run lanes come back clean.
4. Decide convergence: **stop when a round produces no new confirmed findings at severity medium or above, no `[unverified]` medium+ findings, no failed lanes, and no `synthesize_failed` flag** (`failed_roles` in the result — a lane whose reviewer died was not reviewed; unverified findings need your own adjudication or a skeptic re-run; a synthesize-failed round returned raw survivors and cannot be judged converged). Low/nits are collected but do not block convergence. Don't manufacture work to fill rounds — if a round comes back clean (or only nits), stop immediately. The loop exists to catch real issues and real regressions, not to justify its own runtime.
5. Hard cap: stop after **4 rounds** even if issues remain, and say so plainly.
6. Exception: when the artifact is a fresh `sample-select-polish` winner, run ONE round only — surviving critical issues signal re-sampling, not another review round (see the SSP policy).

### 3. Report

When converged (or capped), summarize: rounds run, what was fixed, any residual issues, and notable false positives the skeptic caught. **Also state what the loop cost** — rounds run, roles used, and roughly how many findings the skeptic filtered — so the user sees the review was rigorous (not noisy) and can judge whether that rigour was worth it for this artifact.

## Why each piece matters (so you can adapt intelligently)

- **One role per agent.** A generalist scanning everything does each surface shallowly; a specialist working one lane goes deep. The lane boundary is the skill's main lever — protect it. Tell reviewers to stay strictly in their role and to return an empty list if their lane is clean.
- **Fresh context.** The workflow subagents inherit no conversation history, so they cannot be swayed by the author's rationale. Do not summarize the "why" for them — let them read cold. That cold read is the entire source of their power.
- **Adversarial verify.** The price of fresh eyes is false positives (a reviewer lacking context flags something already handled). A skeptic that defaults to refutation is what keeps the signal clean. Never skip it for speed.
- **You fix, they find.** The asymmetry is deliberate. It is tempting to short-circuit either side; resist both.

## If the Workflow tool is unavailable

Fall back to the Agent tool with the same shape: in one message, spawn one subagent per role (parallel `Agent` calls), each told to read the files cold and return the finding shape; then spawn one skeptic subagent per finding to refute; then dedup and prioritize the survivors yourself. A skeptic that fails or returns nothing does NOT kill its finding — keep it marked `[unverified]` (see `references/finding-schema.md`); unverified medium+ findings block convergence. Same loop, same convergence rule, same 4-round cap. The shapes to ask for are in `references/finding-schema.md`.

## References
- `references/role-sets.md` — curated role sets by artifact type, plus how to write a strong lens and build a custom role.
- `references/finding-schema.md` — the finding / verdict / report JSON shapes (also encoded in the workflow).
