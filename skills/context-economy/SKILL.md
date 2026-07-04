---
name: context-economy
description: Use when the user wants to shrink, audit, or budget always-loaded context — "my CLAUDE.md is too big", "reduce token overhead", "what is eating my context window", "context budget", "slim down my rules/memory files", complaints that every turn feels expensive or the window fills too fast, or after adding many plugins/MCP servers/rules files. Trigger phrases also include "コンテキスト削減", "CLAUDE.mdを痩せさせて". NOT for checking whether automations work (automation-doctor). NOT for content-quality or accuracy audits of CLAUDE.md (claude-md-improver) — this skill only budgets token cost.
---

# Context Economy

## Overview

Always-loaded text is a tax on every single turn: 2k tokens of dead rules × hundreds of turns/day compounds into real money and diluted attention. Anything conditional belongs in an on-demand skill; anything mechanical belongs in a hook or script; only what is needed on literally every turn earns a place in always-loaded context.

## When to use

- Auditing global/project CLAUDE.md, their `@include`s, MEMORY.md, rules files.
- Measuring overhead from hook stdout injection, MCP tool schemas, plugin skill descriptions.
- Deciding whether a rule should stay inline, become a skill, or become a hook.

## When NOT to use

- Verifying automations function (`automation-doctor`) or syncing config (`dotclaude-sync`).
- Compressing conversation history or a single session — scope is persistent, always-loaded sources only.
- Authoring the replacement skills themselves (use skill-writing skills after this audit decides what moves).

## Hard rules

1. NEVER delete or rewrite user content without explicit approval. Propose every change as a diff (before/after) and wait.
2. NEVER classify a block SKILL-IFY/AUTOMATE/DELETE without stating the observable reason (e.g. "only applies when doing X", "mechanical check a hook can enforce", "references a tool no longer installed").
3. NEVER report token estimates without showing the measurement (`wc -c` output and the divisor used).
4. A block earns KEEP only if it changes behavior on essentially every turn. "Might be useful sometime" is SKILL-IFY, not KEEP.

## Process

1. **Inventory sources with sizes.** For each always-loaded source run `wc -c` and estimate tokens (chars/4 for English; chars/3.5 for mixed EN/JA):
   - `~/.claude/CLAUDE.md` + every `@include`d file; project `CLAUDE.md`/`.claude/CLAUDE.md` + includes.
   - `MEMORY.md` / auto-loaded memory files.
   - Hook stdout injected per event: run each stdout-producing hook once, `wc -c` its output, multiply by events/turn.
   - MCP tool schemas: count connected servers and their tools (each tool schema loads every session); flag servers unused in recent history.
   - Plugin skill descriptions: number of skills × average description length; flag packs never invoked.
   - Rules files (`.cursorrules`-style, hookify rules, etc.) that inject text.
2. **Classify every block** (section-level, not whole-file):
   - **KEEP** — needed on every turn (identity, hard safety rules, project build commands used constantly).
   - **SKILL-IFY** — conditional guidance ("when doing X, do Y"): move body into an on-demand skill whose description carries the trigger; always-loaded cost drops to the description line or zero.
   - **AUTOMATE** — mechanical, deterministic enforcement (formatting, forbidden commands): move to a hook/script; prose reminder deleted.
   - **DELETE** — stale: references removed tools, finished projects, superseded policies.
3. **Quantify.** Sum current always-loaded tokens; compute projected total after proposed moves; state per-turn and per-day savings (tokens/turn × user's rough turns/day).
4. **Propose.** Present the Context Budget Report plus a concrete diff for each SKILL-IFY/AUTOMATE/DELETE item. Apply only what the user approves; skill/hook creation happens after approval as follow-up work.

## Output contract

```markdown
## Context Budget Report

| Source | Bytes | ~Tokens | Verdict | Rationale |
|---|---|---|---|---|
| <file or block> | <wc -c> | <bytes/4 or /3.5> | KEEP / SKILL-IFY / AUTOMATE / DELETE | <observable reason> |

**Current always-loaded total:** ~N tokens/turn
**Projected after moves:** ~M tokens/turn (−X%, ≈Y tokens/day at Z turns/day)
**Proposed diffs:** <one before/after diff per non-KEEP item>
**Awaiting approval:** all non-KEEP items
```

## Common mistakes

- Auditing only CLAUDE.md while ignoring hook stdout, MCP schemas, and plugin descriptions — often the larger tax.
- Keeping a rule inline "because it's important": importance is not frequency; a critical-but-conditional rule is exactly what skill descriptions route to on demand.
- Deleting instead of moving — conditional guidance that gets deleted is lost; SKILL-IFY preserves it at near-zero standing cost.
- Estimating tokens by eyeball instead of `wc -c` with a stated divisor.
- Forgetting that a skill's description is itself always-loaded: a bloated description trades one tax for another — descriptions stay trigger-only and short.
- Editing files before the user approves the report.
