---
name: dotclaude-sync
description: Use when the user wants to sync, deploy, diff, or reconcile personal Claude Code assets between a git repo (source of truth) and the live `~/.claude/` directory — skills, CLAUDE.md include files, hooks. Triggers include "deploy my skills", "sync ~/.claude", "is my deployed config up to date", "I edited a live skill, get it back into the repo", after editing skills in either location, or "スキルを同期して". NOT for auditing whether automations work (that is automation-doctor).
---

# Dotclaude Sync

## Overview

Personal skills and config live in a git repo (source of truth) and are deployed by copy into `~/.claude/` (deployment target). Drift between the two is inevitable; this skill detects it, classifies its direction, and reconciles it without losing hot-fixes made on either side.

## When to use

- Deploying repo skills/config to `~/.claude/`.
- Checking whether deployed state matches the repo.
- Someone edited `~/.claude/skills/*` or a live hook directly and the change must be preserved.

## When NOT to use

- Verifying that deployed automations actually function (`automation-doctor`).
- Shrinking context size (`context-economy`).
- Managing plugin-marketplace-installed skills — only repo-managed personal assets are in scope.

## Hard rules

1. NEVER edit `~/.claude/skills/*` (or any deployed file with a repo source) directly. Edit the repo copy, then deploy. If asked to hot-fix live, stop and redirect the edit to the repo.
2. NEVER deploy a skill whose frontmatter fails validation (missing/blank `name` or `description`, name ≠ dir name, non-kebab name). Validation failure is a stop condition for that file.
3. NEVER overwrite a DIVERGED file in either direction without showing the user the diff and getting an explicit choice.
4. NEVER resolve deployed-ahead drift by overwriting from the repo. Deployed-ahead means someone hot-fixed live: pull that change back into the repo FIRST, commit, then deploy.
5. Deploy is copy-only (repo → `~/.claude`). No transformations, merges, or "improvements" during the copy.
6. Never deploy a skill to `~/.claude/skills/` that an installed plugin already provides — plugin-shipped skills are excluded from deployment; duplicates make routing nondeterministic. This includes the case where the providing plugin is built from this same repo: do not deploy those skills either — the plugin channel already serves them; report the overlap instead of copying.

## Process

1. **Map pairs.** List each managed item and its two locations, e.g. `<repo>/skills/<name>/` ↔ `~/.claude/skills/<name>/`, repo CLAUDE.md includes ↔ `~/.claude/<file>.md`, repo hook scripts ↔ deployed hook paths.
2. **Diff.** `diff -ru <repo-path> <deployed-path>` per pair. Record: identical / repo-only / deployed-only / differs.
3. **Classify drift direction** for each differing pair:
   - *repo-ahead*: repo has commits/edits newer than deployment (deployed matches an older repo version, or file is repo-only). Action: deploy.
   - *deployed-ahead*: deployed copy was edited live and repo unchanged since last deploy (deployed differs, repo matches last deployed/committed state). Action: copy deployed → repo, review, commit; then it becomes clean.
   - *diverged*: both sides changed since they last matched. Action: show the diff, ask the user which side wins or how to merge (Hard rule 3).
   - Use `git log -p` on the repo side and file mtimes as evidence when direction is unclear; if still unclear, treat as diverged.
4. **Reconcile** in order: pull deployed-ahead changes back to repo → resolve diverged with the user → deploy repo → `~/.claude` (copy).
5. **Validate** every deployed skill's frontmatter (Hard rule 2) — run the repo's validator if present (e.g. `scripts/validate.sh`), else check name/description fields manually. A file that fails is not deployed and is reported.
6. **Report** using the output contract.

## Output contract

```markdown
## Sync Report

| Item | State | Action taken |
|---|---|---|
| skills/<name> | identical / repo-ahead / deployed-ahead / diverged / repo-only / deployed-only | deployed / pulled back to repo / diff shown, awaiting choice / skipped (validation failed) / none |

**Repo commits created:** <hashes or none>
**Validation failures:** <file: reason, or none>
**Unresolved (needs user):** <diverged items or none>
```

## Common mistakes

- Blind `cp -R` repo → `~/.claude` that silently destroys a live hot-fix — the exact failure Hard rule 4 exists for.
- Editing the deployed copy "just this once" — the next deploy erases it.
- Assuming deployed-only files are junk; they may be new skills authored live that belong in the repo.
- Deploying a skill directory but forgetting its `references/` or `scripts/` subdirs — diff and copy whole directories, not just SKILL.md.
- Declaring sync done without a final `diff -ru` pass showing zero differences.
