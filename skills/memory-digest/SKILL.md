---
name: memory-digest
description: Use when session-memory directories (.remember/ or similar per-project daily logs, rolling windows, archives) have accumulated and need consolidation — the user asks to digest, summarize, prune, or clean up memory files, asks "what happened this week across projects", or a memory dir has more than ~7 stale daily files. Also on trigger phrases like "memory digest", "consolidate memory", "メモリ整理", "記憶の棚卸し". NOT for end-of-session state saving (that is the remember skill's job).
---

# Memory Digest

## Overview

Session-memory files are append-only exhaust; their value decays unless periodically distilled. This skill turns raw dailies into a cross-project digest, compacts stale files into the archive, and surfaces facts that deserve promotion to durable memory (CLAUDE.md etc.).

## When to use

- A `.remember/`-style directory has accumulated daily files beyond its rolling window.
- The user wants a weekly/periodic summary across one or more projects.
- Before starting a new work cycle, to carry forward unresolved threads.

## When NOT to use

- Saving state at end of a session (that is the `remember` skill's job, not digestion).
- A single fresh daily file — there is nothing to consolidate yet.
- Editing CLAUDE.md directly for an unrelated reason.

## Hard rules

1. **Never delete or truncate an original memory file without explicit user approval.** Digesting produces new text; compaction proposals are presented first, applied only after a yes. Stop and ask if approval is ambiguous.
2. **Every digest entry cites its source file** (e.g. `today-2026-07-02.md`). An entry you cannot attribute to a file does not go in the digest.
3. **Unresolved threads are never silently dropped.** Anything marked in-progress, failed, "investigating", or planned-but-not-done must appear under Open Threads or be explicitly closed with evidence.
4. **Do not invent conclusions.** If a daily ends mid-investigation, record it as open — do not infer the outcome.

## Process

1. **Gather sources.** Locate memory directories across the projects in scope (typically `<project>/.remember/`). Expected layout (generalize; layouts vary): a current-session buffer (`now.md`), daily logs (`today-YYYY-MM-DD*.md`), a rolling window (`recent.md`), a long-term `archive.md`, and durable files like `core-memories.md`. List what exists; note the digest period (default: last 7 days).
2. **Read and classify each entry** as signal or noise:
   - **Signal:** decisions made (and why), gotchas/bugs discovered, measured results, identity/preference candidates, unresolved threads, commitments.
   - **Noise:** hook logs, cooldown/skip notices, routine command narration ("ran tests, passed"), duplicate restatements of earlier entries.
3. **Build the cross-project digest** using the Output contract below, one section per project, every bullet with a source citation.
4. **Propose archive compaction.** For each daily older than the rolling window: a one-line summary destined for `archive.md`, and the file it replaces. Present the full plan (summary lines + files to remove/mark done) and wait for approval before touching anything.
5. **Surface promotion candidates.** Facts that recur, are marked as identity/preference candidates, or changed how work is done (e.g. "model X unusable for role Y", tool conventions) — propose the destination (CLAUDE.md, core-memories.md, a project doc). Promotion is also approval-gated.
6. **Carry forward open threads** into the current buffer or the digest's Open Threads list so the next session sees them.

## Output contract

```markdown
# Weekly Digest — <date range>

## <project>
### Decisions
- <decision + rationale> (src: today-YYYY-MM-DD.md)
### Gotchas
- <gotcha discovered> (src: ...)
### Open threads
- <unresolved item, current state> (src: ...)
### Promotion candidates
- <fact> → proposed destination: <CLAUDE.md | core-memories.md | ...> (src: ...)

## Proposed compaction (awaiting approval)
- today-YYYY-MM-DD.md → archive line: "<one-line summary>"
```

## Common mistakes

- Summarizing noise as if it were signal (a digest full of "ran validate.sh" lines is worthless).
- Compacting first and asking later — approval comes before any file is modified or removed.
- Dropping a failed experiment because it "didn't lead anywhere": negative results are gotchas, keep them.
- Promoting one-off observations; a promotion candidate should recur or be explicitly flagged in the source.
