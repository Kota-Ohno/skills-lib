# Changelog

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
