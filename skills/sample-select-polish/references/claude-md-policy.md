<!-- SSP.md — ssp-first operating policy (imported by CLAUDE.md).
     Canonical source: skills-lib/skills/sample-select-polish/references/claude-md-policy.md
     Edit there first, then sync the copies (skills-lib/docs/SSP-POLICY.md, ~/.claude/SSP.md).
     skills-lib/scripts/validate.sh checks the repo copies stay identical. -->

# SSP-First Policy

Route every task through the tiers below before starting work. Default to the matching skill; do not wait to be asked.

## Routing

**Tier 1 — invoke `superkit:sample-select-polish`** when CREATING a new hard artifact:

- Design docs, architecture proposals, implementation plans
- Tricky or high-stakes implementations (concurrency, migrations, security-sensitive code, irreversible changes)
- API specs and public interfaces
- Publication-grade writing (blog posts, READMEs for release, reports)

A Tier-1 bullet match alone is NOT sufficient. Sample immediately only if the task also carries an explicit hardness signal: a high-stakes domain (security, payments, concurrency, irreversibility), multi-component scope, a publication/ship destination, or the user asking for it "done well" / alternatives explored. A Tier-1-shaped task with none of these has ambiguous stakes — take the Escalation path below.

**Tier 2 — invoke `superkit:fresh-eyes-review`** when REVIEWING or auditing an artifact that already exists:

- Code, diffs, PRs, designs, specs, configs, or infra about to ship
- Any request phrased as "review", "audit", "check this", "what did I miss"
- Precedence: any skill that is itself a reviewer/auditor and matches the task more specifically wins — `fresh-eyes-review` is the general-purpose reviewer only. Non-exhaustive examples: automation audits → `automation-doctor`, release audits → `release-readiness`, context audits → `context-economy`, performance → `perf-triage`, dependency upgrades → `deps-upgrade`, judged-results audits → `judged-comparison-gate`.
- Gate-style skills COMPOSE, they never substitute: `sensitive-path-rituals` and `irreversible-ops` add a completion gate on top of whatever review runs — a security-touching diff that warrants review under these tiers still gets its `fresh-eyes-review`; the ritual/gate runs in addition, and runs even when no review does (a trivial edit under a sensitive path gets the ritual but no fan-out review).
- Exception: an artifact that already had its review round this session (e.g. a `superkit:sample-select-polish` winner) does not get another one

**Tier 3 — use NEITHER** for routine edits, small fixes, Q&A, and exploratory chat.
Both skills fan out multiple subagents — spend that cost only where the artifact is hard or the failure is expensive.

## Escalation

When stakes are ambiguous, write ONE normal draft first. Escalate to `superkit:sample-select-polish` only if that draft fails review or the user signals high stakes. Never pre-emptively sample for a task you could plausibly one-shot.

Operational test for "fails review": run ONE single-round `fresh-eyes-review` (no loop) on the draft; the draft fails if any confirmed critical or high finding survives your fix. No surviving critical/high findings → ship the draft, no escalation.

## Polish discipline

Scope: these rules govern POLISHING a `sample-select-polish` winner. A standalone Tier-2 `fresh-eyes-review` runs either its own review→fix→re-review loop to convergence (4-round cap) or a single round for low-stakes work and the Escalation test — neither is "polish" and these limits do not restrict them.

- After selection, run exactly ONE fresh-eyes review round, fix survivors, ship. Never loop polish.
- If critical issues survive the fix, do NOT keep polishing: re-sample once, folding the findings into the task statement. The one-review-round limit is per sampling cycle — the re-sampled winner gets its own single review round. If critical findings still survive that second cycle's fix, ship the best candidate and state what remains unresolved — do not start a third cycle.
- Grounding: on a 48-task benchmark (frugal-fusion repo, Round 7 of its docs/EXPERIMENT_RESULTS.md), the no-review ablation lost 1W-26L-21T to the review-to-convergence loop (mean 1.85 rounds on that run), while select + one review TIED that loop at 0.58x cost. That is a quality-parity result (equal quality at 0.58x cost) — evidence that one round + re-sampling is cheaper at equal quality, not that extra rounds fail. Buy a second polish round only when re-sampling is impossible.

## Composition

Inside larger workflows (plan mode, subagent-driven development), apply `superkit:sample-select-polish` to the single riskiest artifact of the plan only. Every other task gets a normal draft, gated by the escalation rule above.

## Anti-patterns

- Sampling for trivial output (rename, config tweak, one-liner answer) — Tier 3 exists for a reason.
- Running `superkit:fresh-eyes-review` on a `superkit:sample-select-polish` winner that already had its review round.
- Chaining polish rounds on an SSP winner until "clean" — in the polish stage, convergence-by-loop is what re-sampling replaces. (A standalone fresh-eyes-review legitimately loops to convergence.)
- Applying `superkit:sample-select-polish` to every task in a plan instead of the riskiest one.
