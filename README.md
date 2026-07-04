# superkit

Meta-infrastructure skills for Claude Code heavy users. Where packs like
[superpowers](https://github.com/obra/superpowers) teach the agent *how to build*,
superkit keeps the **surrounding machinery honest**: your automations, your context
budget, your LLM-ops discipline, and the risky edges (releases, trust boundaries,
irreversible operations) that generic packs ignore.

This repo is also the **single source of truth** for the maintainer's personal
skills — deployed copies under `~/.claude/skills/` are build artifacts, not sources
(see `dotclaude-sync`).

## Install

As a plugin (recommended):

```
/plugin marketplace add Kota-Ohno/skills-lib
/plugin install superkit@skills-lib
```

Or manually:

```bash
cp -R skills/* ~/.claude/skills/          # global
cp -R skills/* your-project/.claude/skills/  # per-project
```

> **After a plugin install:** if `sample-select-polish` or `fresh-eyes-review`
> already exist as loose copies under `~/.claude/skills/`, delete those copies —
> otherwise two skills with identical descriptions compete for every routing
> decision. Pick ONE install channel (plugin or manual copy), never both.

## Skills

### ops — automation & config integrity

| Skill | Use it for |
|---|---|
| `automation-doctor` | Audit declared automations (hooks, binaries, MCP servers, plugins) against what actually works. A hook that silently no-ops on every call is worse than no hook. |
| `dotclaude-sync` | Diff, reconcile, and deploy personal skills/config between this repo (source of truth) and `~/.claude/` (deployment target). |
| `context-economy` | Inventory always-loaded context (CLAUDE.md, includes, hook output, memory files) and move what's conditional into on-demand skills. |

### llm — LLM engineering discipline

| Skill | Use it for |
|---|---|
| `judged-comparison-gate` | Pre-flight and post-hoc gate for LLM-as-judge comparisons: blinding, order counterbalancing, length confound, bootstrap CI over 30+ items. |
| `llm-call-triage` | Empty/truncated/anomalous LLM responses: reasoning-token starvation, HTTP-200 error bodies, silently ignored parameters. |
| `subagent-model-routing` | Pick the model tier per subagent role and name it explicitly on every dispatch. |

### ship — risky-edge guards

| Skill | Use it for |
|---|---|
| `release-readiness` | Go/no-go audit before publishing a repo: secrets in history, license, README claims vs measured reality. |
| `sensitive-path-rituals` | Declare trust-boundary paths in CLAUDE.md; enforce the project's test+verify ritual when a diff touches them. |
| `irreversible-ops` | Plan-validate-execute for migrations, bulk rewrites, deletions, history rewrites — with tested backups and pre-written rollback. |

### flow — daily workflow

| Skill | Use it for |
|---|---|
| `memory-digest` | Consolidate `.remember/`-style session memory into weekly digests; promote durable facts, prune noise. |
| `deps-upgrade` | Routine dependency upgrades with changelog reading, lockfile review, and staged verification. |
| `perf-triage` | Measure-before-optimize: baseline, profile, one change at a time, prove the win or revert. |

### orchestration — sampling & review (adopted, benchmark-grounded)

| Skill | Use it for |
|---|---|
| `sample-select-polish` | Hard artifacts: N parallel drafts from different stances → knockout selection → exactly one review round. |
| `fresh-eyes-review` | Multi-perspective review by fresh-context agents with skeptic verification of every finding. |

Routing policy for the orchestration tier lives in [docs/SSP-POLICY.md](docs/SSP-POLICY.md).
Composition with superpowers: requirements exploration (brainstorming) comes first;
`sample-select-polish` is the draft-production stage that follows it.

## Design principles

1. **Descriptions are routing rules.** They state *when* to trigger, never summarize
   the workflow (agents shortcut the body otherwise).
2. **Hard rules are prohibitions with stop conditions**, not "consider" advice.
3. **Output contracts.** Skills that produce reports ship a copyable template, so
   compliance is inspectable.
4. **No duplication of installed packs.** Nothing here re-teaches TDD, debugging,
   or planning — superpowers already does that. superkit covers what those ignore.
5. **Runnable validation.** `scripts/validate.sh` lints structure, frontmatter,
   and README/dir consistency. CI-able.

## Validation

```bash
bash scripts/validate.sh
```

## Status & known limits

- v0.1.0. Structural validation and a trigger-routing review round are done;
  per-skill pressure-scenario evals (RED/GREEN baselines) are future work —
  see CHANGELOG for what has actually been tested.

## License

MIT
