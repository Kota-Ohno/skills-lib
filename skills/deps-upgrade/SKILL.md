---
name: deps-upgrade
description: Use when upgrading project dependencies — npm/pnpm/yarn, cargo, pip/uv, or similar — including "update deps", "bump packages", "npm outdated cleanup", responding to a security advisory or dependabot/renovate alert, or a lockfile refresh. Also on trigger phrases like "dependency upgrade", "依存関係の更新", "パッケージ更新". Not for adding a brand-new dependency or debugging unrelated build failures. NOT for platform/runtime major-version uplifts (.NET, Java — use modernize-uplift); this is package-manager-level bumps.
---

# Deps Upgrade

## Overview

Dependency upgrades fail when done in bulk on version numbers alone. Upgrade in classified batches, read the notes for anything that can break you, and verify each batch before the next.

## When to use

- Routine periodic upgrades of an existing project's dependencies.
- Responding to a security advisory affecting a dependency.
- Reviewing/landing an automated upgrade PR (dependabot, renovate).

## When NOT to use

- Adding a new dependency (that is a design decision, not an upgrade).
- A framework migration big enough to be its own project (major React/framework rewrites) — plan that separately.
- Fixing a build broken by something other than dependency versions.

## Hard rules

1. **Never mix a dependency upgrade with feature or refactor changes in one commit.** If the working tree is dirty with unrelated work, stop and get it committed or stashed first.
2. **Never upgrade a major — or a minor of a direct dependency — on version number alone.** Read the changelog/release notes first. No notes findable → treat it as higher risk: isolate it in its own batch and test explicitly.
3. **Never bypass a failing postinstall/build by blind pinning or `--force`/`--legacy-peer-deps` without understanding the failure.** Read the error; a pin or hold requires a documented reason in the report.
4. **Security advisories upgrade first, in their own separate batch/commit** — never bundled with routine bumps.
5. **A batch that fails verification does not proceed.** Revert or hold the offender with a reason; continue with the rest.

## Process

1. **Snapshot.** Confirm the lockfile is committed and the tree is clean (`git status`). Record current versions (`npm outdated`, `cargo update --dry-run`, etc.).
2. **Classify** every available update: patch / minor / major, direct vs transitive, security-relevant.
3. **Batch:** security fixes first (own commit); then patches (one batch); then minors (small groups, direct deps get their notes read); then **majors strictly one at a time**, each with changelog read and its breaking-changes list written down before touching anything.
4. **Per batch: upgrade → build → typecheck → test → runtime smoke** (start the app / run the CLI on a real input). Same verification set every batch.
5. **Review the lockfile diff** per batch for surprises: newly introduced packages, packages with unexpected huge version jumps, license changes, swapped resolutions. A surprise you can't explain blocks the batch.
6. **Pin or hold failures** with a written reason (what broke, link to issue if found) rather than fighting them mid-run.
7. **Commit per batch** with a message listing the bumps. Emit the upgrade report.

## Output contract

```markdown
# Upgrade Report — <project> — <date>

| package | from → to | class | notes read? | verify result |
|---|---|---|---|---|
| <pkg> | <from> → <to> | patch/minor/major (security?) | <advisory/changelog or n/a> | <build+test+smoke result, or FAILED: reason> |
| vite | 5.x → 6.0.1 | major | changelog ✓ (breaking: X, Y) | ✓ |

Lockfile surprises: <none | list>
Held/pinned: <package — reason>
```

## Common mistakes

- `npm update` / `cargo update` everything at once, then bisecting the wreckage — batching exists to avoid this.
- Trusting a green typecheck as full verification; runtime smoke catches what types don't (ESM/CJS swaps, peer-dep runtime errors).
- Skipping the lockfile diff because "only one package changed" — transitive churn is where supply-chain surprises hide.
- Reading only the latest release's notes for a multi-version major jump; read the whole span.
