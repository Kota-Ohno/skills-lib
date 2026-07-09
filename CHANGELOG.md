# Changelog

## 0.1.2 — 2026-07-09

Subagent model routing for the SSP workflows.

- ssp_workflow.js: new `model` (run-wide) plus `draft_model` / `judge_model`
  (per-role) args, passed through to every `agent()` call's `opts.model`.
  Unknown tiers fail loudly at parse time instead of silently at dispatch.
- review_workflow.js: same mechanism with `model` plus `review_model` /
  `verify_model` / `synthesize_model` per-stage overrides.
- Both SKILL.md usage blocks document the new args. Omitting them keeps the
  previous behavior (inherit the session model).

## 0.1.1 — 2026-07-05

Hardening release: a 4-round fresh-eyes audit (6 lanes + adversarial skeptics,
108 subagents) over the pack and the maintainer's always-loaded policy files;
48 confirmed findings fixed.

- Workflow scripts: every agent-call failure path now fails loud instead of
  silent. review_workflow.js gains `failed_roles`, `[unverified]` passthrough
  (a dead skeptic no longer deletes its finding), a `synthesize_failed`
  degraded report, and an empty-round synthesize skip. ssp_workflow.js gains
  judge retry + `empty_judgments` (an empty verdict no longer counts as an
  A-side win), draft-failure containment, and args.n validation.
- Policy (claude-md-policy.md + mirrors, kept byte-identical): one-review-round
  rule scoped to SSP-winner polish; Tier-1 hardness-signal test; operational
  "fails review" escalation test; reviewer-skill precedence and gate-composition
  rules; re-sample = one review round per sampling cycle; skills referenced by
  their plugin-namespaced names.
- Evidence hygiene: benchmark citations re-pointed at the real corpus
  (frugal-fusion, Round 7) and recalibrated to what it measured (quality parity
  at 0.58x cost, no latency win, the single review round is load-bearing);
  untraceable anecdotes replaced with corpus-backed ones (n=17 → n=48).
- Routing surfaces: NOT-triggers added to the two expensive fan-out skills and
  judged-comparison-gate; When-NOT-to-use sections; routing-evals scenario #11
  (Tier-1 hardness boundary).
- validate.sh: SSP-copy drift check, dead-reference scan (SKILL.md +
  references/ + repo docs), node --check parse gate for bundled workflow
  scripts, "Use when" phrasing variants.
- Docs: DESIGN.md description rule aligned with the validator (≤1024 hard,
  adopted-skill carve-out), rtk snapshot marked historical; README loose-copy
  warning generalized to all skills.

Verification: scripts/validate.sh — 0 errors, 0 warnings. Honest debt: round 4
still surfaced 2 medium wording issues (fixed, but those fixes themselves are
unreviewed); per-skill pressure-scenario baselines remain undone.

## 0.1.0 — 2026-07-04

Initial release: 14 skills (12 new, 2 adopted).

- ops: automation-doctor, dotclaude-sync, context-economy
- llm: judged-comparison-gate, llm-call-triage, subagent-model-routing
  (skill-ified from the maintainer's LLM-OPS rules)
- ship: release-readiness, sensitive-path-rituals, irreversible-ops
- flow: memory-digest, deps-upgrade, perf-triage
- orchestration: sample-select-polish, fresh-eyes-review (adopted verbatim from
  `~/.claude/skills`; this repo is now their source of truth)

Verification actually performed for this release:
- `scripts/validate.sh` structural lint: pass
- Trigger-routing spot test over all 14 descriptions (right skill fires, others stay silent)
- One fresh-eyes review round (over-triggering / token bloat / overlap / actionability lenses), findings fixed

Not yet performed (honest debt): per-skill pressure-scenario baselines (RED/GREEN).
