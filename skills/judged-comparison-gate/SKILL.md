---
name: judged-comparison-gate
description: Use when designing, running, or interpreting an LLM-as-judge comparison — pairwise A/B, tournament, win-rate eval, model shootout, or prompt-variant bake-off — or when someone presents judged results ("X beats Y", "significant win") and asks whether to believe them. Also use before spending money on a judged eval run. Trigger phrases: "LLM judge", "win rate", "pairwise eval", "A/Bテスト判定", "LLM審査". Fires on reported judged results even as bare statements ("Aの勝ち") with no question attached.
---

# Judged Comparison Gate

## Overview

An LLM-as-judge comparison is a measurement instrument, and an uncalibrated instrument produces confident garbage: a real experiment flipped from a significant WIN to a significant LOSS once length bias alone was removed. This gate runs a pre-flight checklist before money is spent and a post-hoc audit before any result is believed.

## When to use

- Before launching any pairwise/tournament/win-rate eval judged by an LLM.
- When auditing judged results someone already produced (yours or others').
- When a pilot run "shows" one side winning and someone wants to conclude.

## When NOT to use

- Evals with deterministic ground truth (exact match, unit tests, execution accuracy) — no judge, no gate.
- Single-output quality rubric scoring with no comparison claim (still watch length bias, but this gate's pairwise machinery does not apply).

## Hard rules

1. **No blind, no verdict.** If judges can see which system produced which answer (names, formatting tells, model-specific boilerplate left in), STOP: the run is invalid, not merely weaker.
2. **A side wins an item only if it wins BOTH presentation orders.** One-order runs are position-bias measurements, not quality measurements. Split orders count as ties.
3. **The judge prompt MUST contain an explicit "do not reward length or verbosity" instruction.** Absent that line, do not launch.
4. **Every judge model's family MUST be disjoint from every system under test.** A judge from the same family as a contestant is self-preference bias; STOP and swap the judge. Use a majority panel, not a single judge.
5. **Always record answer lengths per item.** If the sides show a large systematic length gap (rule of thumb: median lengths differing by >30%), the comparison is INVALID until length is controlled — truncate, length-match, or regress it out. This is the default confound, not an edge case.
6. **No quality conclusion from n=1–2.** Tiny pilots detect plumbing errors only; the identical setup has produced opposite conclusions at n=1 and n=48. A quality claim requires ~30+ items and a bootstrap confidence interval over item-level outcomes.
7. **An empty judge response is NOT a tie.** It is usually a starved or failed call (see `llm-call-triage`). Count empties in a separate bucket; if empties exceed ~5% of judgments, STOP and fix the calls before interpreting anything.

## Process

### Pre-flight (before spending money)

1. Strip identifying metadata and formatting tells from both sides; verify by eyeballing 3 random pairs yourself — can YOU tell which is which?
2. Build the run plan: every item judged in both orders (A-first and B-first).
3. Write the judge prompt: criteria, explicit do-not-reward-length line, required output schema.
4. Select a judge panel of ≥3 (odd count) from model families disjoint from all contestants.
5. Confirm item count ≥30 for any quality claim; if fewer, relabel the run "plumbing pilot" in the plan.
6. Wire logging: per item record both raw judgments, both answer lengths, and empty/error status separately from verdicts.
7. Run a 2-item smoke test to catch schema/parse failures, then launch.

### Post-hoc audit (before believing results)

1. Empty/error rate: count empties separately. >5%? Fix and rerun those calls first.
2. Length check: compare median answer lengths per side. Gap >30%? Mark INVALID-until-controlled; control for length and re-judge or reanalyze.
3. Counterbalancing: recompute wins as both-orders-won only; report split-order items as ties. Compare against the naive tally — a big shift means position bias dominated.
4. Panel agreement: report per-judge win rates; a lone dissenting judge family is a flag, not a veto.
5. Statistics: bootstrap CI over item-level outcomes. If the CI on the win-rate difference includes zero, the honest verdict is "no detected difference".
6. Fill the gate checklist below and issue the overall verdict.

## Output contract

```markdown
## Judged Comparison Gate — <comparison name>, <date>

| # | Gate item                                             | Status | Evidence |
|---|-------------------------------------------------------|--------|----------|
| 1 | Sources blinded (spot-checked)                        | PASS/FAIL | ... |
| 2 | Both orders judged; win = wins both orders            | PASS/FAIL | ... |
| 3 | Judge prompt forbids rewarding length                 | PASS/FAIL | ... |
| 4 | Judge panel families disjoint from all contestants    | PASS/FAIL | panel: ... |
| 5 | Lengths tracked; median gap ≤30% or controlled        | PASS/FAIL | A: ... B: ... |
| 6 | n ≥ 30 with bootstrap CI                              | PASS/FAIL | n=..., CI=... |
| 7 | Empty judgments counted separately, ≤5%               | PASS/FAIL | empties: ... |

**Verdict:** CONCLUSIONS PERMITTED / PLUMBING-ONLY (pilot; no quality claim) / INVALID (state failing gates)
**One-line result (only if permitted):** ...
```

## Common mistakes

- Treating a lopsided n=2 pilot as directional evidence ("it's 2-0, looks promising").
- Counterbalancing "on average" (randomized order) instead of judging every item both ways.
- Controlling length by asking the judge harder instead of measuring and controlling it in the data.
- Letting the strongest available model judge its own family "because it's the smartest".
- Parsing an empty judge response into the "tie" branch of the tally code — silent corruption.
