---
name: sample-select-polish
description: Produce a hard artifact (design doc, plan, tricky implementation, API spec) by generating N candidate drafts IN PARALLEL from fresh-context subagents with different engineering stances, selecting the best via a pairwise knockout tournament judged by fresh-context subagents, then running ONE fresh-eyes review round on the winner and fixing what survives. Use this when the task is to CREATE something hard and you want review-loop-grade output at ~0.6x its cost (cheaper, not faster) — the generation-side complement to fresh-eyes-review (which reviews an existing artifact). Trigger when the user asks for a hard design/implementation "done well", wants alternatives explored, or when a single-pass draft on a hard problem would likely embed your own blind spots. NOT for routine edits, small fixes, or artifacts you could plausibly one-shot — draft normally first and escalate only on failure or an explicit high-stakes signal.
---

# Sample-Select-Polish

## Why width + one round of depth beats a long serial loop

Most of the quality of a long serial critique/revise chain can be had
cheaper: parallel diverse drafts, a reliable pairwise selector, and then
ONE round of review depth on the best candidate. Width alone is NOT
enough — selection without the review round loses badly, so the single
review round is where the depth pays. A 48-task benchmark in the
frugal-fusion repo (Round 7 of its docs/EXPERIMENT_RESULTS.md; harness
src/sampleSelect.ts) measured exactly this: the `ssp` arm tied the
review-to-convergence loop's quality (mean 1.85 rounds on that run) at
0.58x cost, while the no-review ablation (drafts + tournament only) lost
1W-26L-21T to that loop — a result the source notes "cleanly kills" the
claim that it is all just ensembling. One honest caveat from the same run:
there was no wall-clock win (0.95x vs the loop; reasoning-heavy models
draft slowly) — it was cost, not time, that improved.

## The pipeline

1. **Sample (parallel).** Spawn N fresh-context subagents (N=4-6
   recommended; 2-3 permitted for cheap tasks — the script clamps to 2..6),
   each
   drafting the artifact with a different stance: correctness-obsessed,
   failure-modes-first, requirements-as-contract, security-minded, neutral,
   simplicity-minded. One stance per agent, no shared context, same task
   statement. Cap all drafts at a similar length so the selector compares
   substance, not volume.
2. **Select (tournament).** Run a single-elimination bracket: each match is a
   fresh-context subagent given the task + two drafts, forced to pick A or B
   ("do not favor length"). Alternate which draft is shown first match to
   match. N=6 needs 5 matches in 3 short serial rounds. (This lighter
   protocol — single-order judging, same-family judges — is deliberate:
   the output is a working selection among own drafts, not a published
   quality claim, so `judged-comparison-gate` does not apply here.)
3. **Polish (once).** Run ONE round of fresh-eyes-review on the winner (the
   role fan-out + skeptic from that skill), then fix the surviving findings
   yourself. Do not loop — the benchmark showed select + one review
   reaches the review-to-convergence loop's quality at 0.58x cost, so prefer re-sampling
   over a second polish round (a second round is the fallback for when
   re-sampling is impossible); if the review still surfaces critical
   issues after the fix, that is a signal to re-sample with the findings
   folded into the task statement, not to keep polishing. The
   one-round limit is per sampling cycle: the re-sampled winner gets its
   own single review round, and if critical findings survive that second
   cycle's fix, ship the best candidate and list what remains unresolved.

## Division of labor

- Fresh subagents draft (stances make their blind spots differ).
- Fresh subagents judge matches (no authorship attachment).
- YOU fix the winner after review — you hold the full context.

## How to run it

### 1. Sample + Select via the bundled workflow

```
Workflow({
  scriptPath: "<this skill's directory>/scripts/ssp_workflow.js",
  args: {
    task: "<the full task statement — fresh agents see ONLY this, so spell
           out every requirement and acceptance criterion>",
    guidance: "<optional style/length/format constraints for every draft>",
    n: 6,  // optional, 2..6 (default 6, one per persona)
    model: "sonnet",       // optional: model tier for ALL subagents
                           // ('sonnet' | 'opus' | 'haiku' | 'fable');
                           // omit to inherit the session model
    draft_model: "sonnet", // optional: override for drafting agents only
    judge_model: "opus"    // optional: override for tournament judges only
  }
})
```

Returns `{ winner, persona, candidates, matches, empty_drafts,
empty_judgments }` — `winner` is the selected draft text. The persona bank
and tournament bracket are built into the script. If `empty_judgments` > 0,
some matches were decided by default after a failed judge call (logged
during the run) — treat the selection as degraded and consider re-running.
If `empty_drafts` is a large fraction of n, suspect token starvation (see
LLM-OPS: raise caps / shorten the task) and re-sample rather than accepting
a thin tournament.

### 2. Polish (you drive this stage)

Run ONE round of fresh-eyes-review on `winner` (that skill's workflow with
the artifact written to a file, or its Agent-tool fallback), then apply the
surviving findings yourself. Stop after one round. If critical issues
remain after your fix, re-run stage 1 with the findings folded into
`args.task` instead of polishing again — the re-sampled winner then gets
its own single review round (the limit is per sampling cycle). If critical
findings survive that second cycle too, ship the best candidate and state
what remains unresolved.

### If the Workflow tool is unavailable

Same shape with the Agent tool: spawn N parallel draft subagents in one
message (one stance persona each, task statement only, "return only the
artifact"); then run the bracket yourself — each match is one subagent
given the task + two drafts with a forced A/B choice and a "do not favor
length" instruction, alternating which draft is shown as A; matches within
a round go in one parallel message. Then polish as above.

## When NOT to use

- Routine edits, renames, config tweaks, one-liner answers — a single
  normal draft is enough (SSP policy Tier 3).
- An artifact that already exists and needs review, not creation — that is
  `fresh-eyes-review`'s job.
- Ambiguous stakes — write ONE normal draft first; escalate to sampling
  only if that draft fails review or the user signals high stakes.

## Cost and when to use

~2N-1 subagent calls (N drafts + N-1 tournament matches, plus any judge
retries) across ~log2(N) serial selection rounds, plus one review round:
heavier than a single
draft, materially cheaper than iterated review loops at the same quality
(0.58x in the benchmark), and faster when per-call latency is low (the
drafts and tournament parallelize; slow reasoning-heavy models can eat the
time win). Worth it for high-stakes artifacts; skip it for routine edits — a single
normal draft with no fan-out review is enough there (SSP policy Tier 3).

## Making it the default (CLAUDE.md policy)

To make an agent reach for this skill (and fresh-eyes-review) by default,
import `references/claude-md-policy.md` from your global or project
CLAUDE.md — copy it next to CLAUDE.md as `SSP.md` and add a line `@SSP.md`.
It defines the three routing tiers, an escalation rule for ambiguous
stakes, the one-review-round discipline (with a bounded re-sample rule),
and the anti-patterns.
