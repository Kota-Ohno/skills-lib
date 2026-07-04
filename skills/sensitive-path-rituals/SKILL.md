---
name: sensitive-path-rituals
description: Use when a task will modify — or a diff already touches — security-critical or trust-boundary code (crypto, auth/authn/authz, storage encryption, IPC/MCP surface, payments, permission policy), when a project's CLAUDE.md declares sensitive paths or a boundary ritual, or when setting up such declarations. Trigger phrases include "auth周りを触る", "信頼境界", "センシティブパス".
---

# Sensitive Path Rituals

## Overview

Some paths in a codebase ARE the product's security promise. A project declares those paths in CLAUDE.md together with a ritual — which tests to extend, which command to run, which runtime to verify in — and any change touching them is unfinished until the ritual has run. Green unit tests do not substitute for the ritual.

## When to use

- A diff (yours or reviewed) touches a declared sensitive path, or an obviously boundary-relevant area even if undeclared (crypto, auth, key handling, IPC/MCP tool surface, payment flows, permission/sensitivity policy).
- Setting up or improving boundary declarations for a project.

This skill COMPOSES with review skills — it adds a completion gate on top of whatever review runs (e.g. `fresh-eyes-review` on the same diff) and never replaces the review itself.

## When NOT to use

- Changes entirely outside declared paths that don't alter how declared code is called.
- Projects with no security-relevant surface at all.

## Hard rules

1. **Touching a declared path without completing its ritual means the work is NOT done** — regardless of green unit tests, clean typecheck, or reviewer approval. Do not report completion, commit as final, or open a PR until every ritual step has run and passed.
2. **Never weaken, narrow, or delete a boundary declaration in the same change that trips it.** If the declaration seems wrong, finish the ritual as declared, then propose the declaration change separately with justification.
3. **Verify in the declared runtime, not a stand-in.** If the ritual names the real app runtime, a browser preview or mock harness that stubs the native layer does not count — stubs are silently green precisely where the boundary lives.
4. **An undeclared but obviously boundary-relevant path gets the same treatment**: stop, tell the user, propose a declaration, and run the closest available ritual. "It wasn't declared" is not an exemption.

## Process

### A. Declaring boundaries (project setup)

1. Identify trust-boundary surfaces: crypto/key handling, auth/session, storage encryption, IPC/MCP/extension tool surface, payment code, data-egress policy.
2. For each, write a declaration with all four parts: **path globs**, **why it is a boundary** (one sentence — what breaks if it's wrong), **ritual steps** (which named test files/suites to EXTEND, not just run), and **verify command + runtime**.
3. Put it in CLAUDE.md under a heading the whole team recognizes. Keep globs tight — over-broad globs train people to ignore the ritual.

Copyable template:

```markdown
## Sensitive paths (trust boundary)

Changes touching any glob below are NOT done until that row's ritual has run.

| Paths | Why it's a boundary | Ritual (tests to extend) | Verify command | Runtime |
|---|---|---|---|---|
| `src/crypto/**`, `src-native/src/vault_*.rs` | Key handling; a bug leaks the vault | extend `vault.test.ts` + native `mod tests` with a case for the new behavior | `npm run product:check` | real app (`npm run app:dev`), not browser preview |
| `src/ipc/**`, `src/mcp/**` | External tool surface; every export crosses the boundary | extend `access.test.ts` | `npm run product:check` | real app + connected MCP client |

Never edit this table in the same change that touches a listed path.
```

### B. When a diff trips a boundary

1. **Stop.** Before continuing implementation, read the matching declaration row in full.
2. **Extend the named tests** with cases covering the new/changed behavior — adding an assertion to an existing case does not count as extending if the new behavior has no dedicated case.
3. **Run the named verify command** and get it green.
4. **Verify in the named runtime** — exercise the changed boundary end-to-end (e.g., real desktop app with the real encrypted store and real IPC, not a web preview whose native shim returns null).
5. Report ritual completion explicitly: declaration row, tests added, command output, runtime observation.

## Output contract

Append to the change summary / PR description:

```markdown
### Boundary ritual — <declaration row>
- Paths touched: <files>
- Tests extended: <file → new case names>
- Verify command: `<cmd>` → PASS (<summary line>)
- Runtime verification: <runtime> — <what was exercised, what was observed>
```

## Common mistakes

- "All existing tests pass" presented as ritual completion — the ritual demands *extending* the named tests.
- Verifying in a preview/mock environment where the native layer is stubbed and everything is trivially green.
- Widening a change's scope so the sensitive file is "only touched incidentally" and skipping the ritual — incidental touches trip it too.
- Softening the declaration ("this glob is too broad") inside the very PR it inconvenienced.
- Declarations without a verify command or runtime — a ritual you can't execute is a comment, not a gate.
