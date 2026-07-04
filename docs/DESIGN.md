# superkit — Design Document

Date: 2026-07-04
Status: approved-by-delegation (user delegated full process; this doc records the design decisions)

## Goal

A general-purpose, superpowers-grade skills pack for a Claude Code heavy user, packaged
as a proper Claude Code plugin (installable via `/plugin marketplace add`) AND usable by
plain `cp -R` into `~/.claude/skills/`. This repo (`skills-lib`) becomes the single
source of truth for the user's personal skills, replacing the current dual management
(a project repo’s `skills/` dir ↔ `~/.claude/skills/`).

## Research inputs (summarized)

1. **Reference repo** (`agent-skills-superuseful-repo`): strong per-skill skeleton
   (Goal → When/When not → Hard rules → Process → Output contract → Completion criteria
   → Anti-patterns); weaknesses to avoid: broken English, no plugin packaging, no
   runnable validation, 5/10 skills being meta-skills about skills.
2. **User profile**: TS/Node + Rust/Tauri + LLM-ops stacks; superpowers + ~30 plugins
   installed; SSP policy and LLM-OPS rules live in always-loaded CLAUDE.md; at design
   time a dead `rtk` hook fired on every Bash call (binary missing) — live evidence
   that declared automations drift from reality (historical snapshot: rtk has since
   been installed and works); `.remember/` accumulates without consolidation.
3. **Prior art**: process skills with hard gates win; descriptions are routing rules
   (trigger conditions ONLY, never workflow summaries); SKILL.md < 500 lines;
   progressive disclosure via references/ and scripts/; eval-first culture.

## Positioning (the breakthrough)

Do NOT duplicate what the user already runs (superpowers TDD/debugging/planning/
verification, hookify, remember, code-review packs). The uncovered high-value space is
**"the meta-infrastructure of a heavy user"**: keeping automations honest, keeping
context lean, encoding hard-won LLM-ops discipline as on-demand skills instead of
always-loaded CLAUDE.md text, and guarding the risky edges (releases, boundaries,
irreversible ops) that generic packs ignore.

A second-order benefit: several skills (LLM cluster) let the user MOVE rules out of
always-loaded `LLM-OPS.md` into on-demand skills — the pack pays for itself in context.

## Skill lineup (14)

### ops — automation & config integrity
| skill | one-line |
|---|---|
| `automation-doctor` | Audit declared automations (hooks, binaries, MCP, plugins, CLAUDE.md claims) vs what actually works; Drift Report. |
| `dotclaude-sync` | Repo-as-source-of-truth management of personal skills/config; diff/deploy/validate against `~/.claude`. |
| `context-economy` | Audit and shrink always-loaded context (CLAUDE.md, hooks output, memory files, plugin bloat); token budget report. |

### llm — LLM engineering discipline (from LLM-OPS.md, made on-demand)
| skill | one-line |
|---|---|
| `judged-comparison-gate` | Pre-flight/post-hoc gate for LLM-as-judge comparisons: blinding, counterbalancing, length confound, n≥30 bootstrap CI. |
| `llm-call-triage` | Debug empty/truncated/weird LLM responses: reasoning-token starvation, 200-with-error-body, silently ignored params. |
| `subagent-model-routing` | Pick model tier per subagent role; explicit model on every dispatch; turn count beats token price. |

### ship — risky-edge guards
| skill | one-line |
|---|---|
| `release-readiness` | Public-release audit: secrets scan, history scrub, license, README claims vs measured reality. |
| `sensitive-path-rituals` | Declare trust-boundary paths in CLAUDE.md; when a diff touches them, enforce the project's test+verify ritual. |
| `irreversible-ops` | Plan-validate-execute for destructive/irreversible operations (migrations, bulk rewrites, deletions). |

### flow — daily workflow gaps
| skill | one-line |
|---|---|
| `memory-digest` | Consolidate `.remember/` daily files into a weekly digest; prune noise; cross-project view. |
| `deps-upgrade` | Routine dependency upgrades: changelog reading, lockfile discipline, staged verification. |
| `perf-triage` | Measure-before-optimize: profile, baseline, one change at a time, prove the win. |

### orchestration — adopted (source-of-truth migration, benchmarked elsewhere)
| skill | one-line |
|---|---|
| `sample-select-polish` | (adopted verbatim from ~/.claude/skills) N parallel drafts → knockout selection → ONE review round. |
| `fresh-eyes-review` | (adopted verbatim) multi-perspective fresh-context review with skeptic verification. |

## Packaging

- Root `.claude-plugin/plugin.json` (plugin name `superkit`, semver 0.1.0) +
  `.claude-plugin/marketplace.json` so the repo doubles as its own marketplace.
- `skills/<name>/SKILL.md` (+ `references/`, `scripts/` only where earned).
- `scripts/validate.sh` — runnable structural lint (fixes reference repo's gap):
  frontmatter fields present, name rules, description length/format ("Use when"),
  line-count ceiling, manifest/dir consistency.
- README (EN, concise, honest), CHANGELOG, LICENSE (MIT).

## Authoring rules (binding for every skill)

1. Frontmatter: `name` (kebab, ≤64), `description` third person, trigger
   conditions first and foremost — lead with when to use ("Use when" phrasing
   preferred) and include at least one NOT-trigger for expensive skills; never
   let a workflow summary displace the trigger conditions. Hard length limit
   ≤1024 chars (validate.sh-enforced); aim for ≤500. May include a couple of
   Japanese trigger phrases. Carve-out: the two adopted orchestration skills
   (sample-select-polish, fresh-eyes-review) open with a one-sentence workflow
   summary before their triggers — accepted as-is at adoption, within 1024.
2. Body < 300 lines, target < 150. Skeleton: Overview (core principle in ≤2
   sentences) → When to use / When NOT to use → Hard rules → Process (numbered)
   → Output contract (copyable markdown template) where a report is produced →
   Common mistakes / red flags.
3. Every hard rule phrased as a prohibition with a stop condition or an
   observable predicate — no "consider/prefer" softness, no nuance clauses.
4. One excellent example max; no multi-language dilution; no narrative war stories
   (distill them into rules — e.g. rtk becomes "a hook that fires and no-ops on
   every call", not a story about rtk).
5. Scripts only where determinism is needed; scripts handle their own errors.

## Verification plan (SSP-compliant: ONE review round)

1. `scripts/validate.sh` must pass (structural).
2. Trigger-routing spot test: scenario prompts vs the 14 descriptions — right skill
   fires, wrong ones stay silent (tests the highest-risk failure: routing).
3. One fresh-eyes-style review round over the pack (parallel reviewer agents with
   distinct lenses: over-triggering, token bloat, overlap with installed packs,
   actionability), fix survivors, ship. No second round; leftovers documented.
