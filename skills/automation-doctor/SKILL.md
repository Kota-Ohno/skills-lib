---
name: automation-doctor
description: Use when the user suspects their Claude Code automations are broken or stale, asks to "audit my hooks/setup", "check my MCP servers", "why isn't my hook firing", "is my automation actually working", after a machine migration or reinstall, when a declared tool/binary seems missing, or on any request to verify that hooks, CLAUDE.md-referenced commands, MCP servers, plugins, or cron jobs match reality. Trigger phrases also include "自動化の点検", "フックが効いてない". NOT for recommending new automations (claude-automation-recommender).
---

# Automation Doctor

## Overview

A declared automation that silently no-ops is worse than none: it costs trust and context on every call while doing nothing. This skill audits every declared automation against observable reality and produces a Drift Report.

Known failure shape: a PreToolUse hook that rewrites commands through a missing binary fires on 100% of shell calls and silently passes through — zero errors, zero effect, permanent overhead.

## When to use

- User asks to audit/verify hooks, MCP servers, plugins, or setup health.
- An automation "should have" fired and didn't, or fires but has no visible effect.
- After environment changes: new machine, reinstalled tools, changed PATH, dotfile sync.

## When NOT to use

- Designing NEW automations (use hook/plugin authoring skills).
- Debugging application code — this skill audits the harness config layer only.
- Shrinking always-loaded context size (that is `context-economy`).

## Hard rules

1. NEVER mark an automation WORKING without executing or probing it in this session. Reading its config is not evidence — if you cannot probe it, mark it UNVERIFIED.
2. NEVER delete or disable an automation without first showing the user the evidence line that proves it is dead. Stop and ask before any removal.
3. NEVER skip a scope area silently. If a scope (e.g. cron) cannot be checked, report it as UNVERIFIED with the reason.
4. Every DEAD/DEGRADED verdict MUST cite a concrete command and its output as evidence.

## Process

1. **Inventory declarations.** Collect every declared automation:
   - Hooks: read the `hooks` arrays in `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, plus hookify/plugin-provided hooks. Note every command/script each hook invokes.
   - CLAUDE.md claims: grep global and project CLAUDE.md (and `@include`d files) for referenced CLIs, scripts, and workflows the model is told to rely on.
   - MCP servers: `~/.claude.json` / project `.mcp.json` server entries.
   - Plugins: `claude plugin list` if available; otherwise the plugin config files.
   - Scheduled: `crontab -l`, `launchctl list` (macOS) / `systemctl list-timers` (Linux) for entries invoking claude or project scripts.
2. **Probe each item** with concrete checks:
   - Binary exists: `command -v <bin>` (per binary the hook/doc references).
   - Script runnable: `test -x <script>` and `test -f <script>`; run it with representative stdin (hooks receive JSON on stdin) and inspect exit code + output.
   - Silent no-op check: does the hook produce a different outcome than not running it? A hook that exits 0 with passthrough output on every input is DEAD or DEGRADED, not WORKING.
   - MCP: is the server process connectable (does its command start, does `claude mcp list` show it healthy)?
   - Plugins: installed AND enabled are different states — verify both.
   - Cron: does the target script exist and run? When did it last succeed (logs)?
3. **Classify** each item: WORKING (probed, observed effect) / DEAD (probed, no effect or hard failure) / DEGRADED (works partially or errors on some inputs) / UNVERIFIED (could not probe — say why).
4. **Report** using the output contract. For each DEAD/DEGRADED item propose a fix (install binary, chmod +x, correct path, remove declaration) — but apply removals only after user confirms per Hard rule 2.

## Output contract

```markdown
## Automation Drift Report

| Automation | Declared where | Status | Evidence | Fix |
|---|---|---|---|---|
| <hook/server/plugin/claim> | <file:line or config path> | WORKING/DEAD/DEGRADED/UNVERIFIED | <command run + result> | <concrete fix or "none needed"> |

**Summary:** X working, Y dead, Z degraded, W unverified.
**Per-call tax of dead items:** <which hooks fire on every event while doing nothing>
**Proposed removals (awaiting approval):** <list with evidence>
```

## Common mistakes

- Trusting configuration as proof of function — config declares intent, only a probe proves behavior.
- Checking that a hook script exists but not that it is executable or that its interpreter/dependency binaries are on PATH.
- Testing a hook by reading its code instead of feeding it real event JSON and observing output.
- Marking an MCP server WORKING because it is listed, without a connect attempt.
- Fixing symptoms (re-adding a hook) when the root cause is a missing binary the fix does not install.
- Deleting a "dead" automation the user actually wants fixed — always present evidence and options first.
