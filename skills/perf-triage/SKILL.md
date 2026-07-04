---
name: perf-triage
description: Use when something is slow and the user wants it faster — "this is slow", "optimize this", "reduce latency/startup time/memory", a perf regression report, or before accepting any optimization change. Also on trigger phrases like "perf triage", "profile this", "遅いので直して", "遅くなった", "パフォーマンス改善". Not for capacity planning or for optimizations already backed by fresh before/after measurements. For functional bugs (wrong output, crashes) use systematic-debugging instead.
---

# Perf Triage

## Overview

Optimization without measurement is guessing with extra steps. Reproduce, baseline, profile to the real hotspot, change one thing, re-measure — and stop at the target.

## When to use

- A reported slowness (command, endpoint, build, UI action) needs fixing.
- Someone proposes an optimization and it needs validation.
- A perf regression appeared and needs isolation.

## When NOT to use

- No one has observed or required a performance problem — don't optimize speculatively.
- The "fix" is already known to be an algorithmic necessity confirmed by profile data from this session.
- Micro-benchmarking library internals for curiosity.

## Hard rules

1. **No code change before a numeric baseline exists** for a repeatable scenario. If you cannot reproduce and measure it, stop and build the reproduction first.
2. **No optimization commit without before/after numbers from the same scenario** on the same build type and cache state. Numbers from different scenarios don't count.
3. **A change that doesn't move the number gets reverted** — even if it "should be faster" or looks cleaner. Cleanups go in a separate non-perf change.
4. **Never compare debug builds against release builds, or cold caches against warm ones.** Fix build type and warm-up policy once, in the scenario definition, and keep them constant.
5. **Never pick the optimization target by reading code or intuition.** The profile chooses the hotspot. If the profile contradicts the hunch, the profile wins.
6. **Stop when the target is met.** Further micro-optimization is scope creep — record remaining ideas and end.

## Process

1. **Define the scenario.** An exact, repeatable command/interaction, its input data, build type (release), warm-up runs, and how it's timed. Write it down — every later measurement uses this verbatim.
2. **Baseline.** Run the scenario several times (≥3), record wall time (and any relevant metric: memory, TTFB), note variance. Agree a numeric target ("under 800ms p50") — no target, no finish line.
3. **Profile** with a real profiler (sampling profiler, `--prof`, `perf`, flamegraph, browser performance panel). Identify the top hotspot(s) by measured share of time.
4. **One change at a time.** State the hypothesis ("N+1 query in X accounts for ~60%"), make the single change, re-run the identical scenario, record the delta in the log. Keep or revert per rule 3.
5. **Iterate** hypothesis → change → measure until the target is met or the profile shows no dominant hotspot remains (then report honestly that the target needs a design change, not tweaks).
6. **Verify no functional regression:** run the test suite and a functional smoke of the affected path after the final state.
7. Emit the Perf Log.

## Output contract

```markdown
# Perf Log — <what> — <date>

Scenario: <exact command/steps, input, build type, warm-up, timing method>
Target: <numeric goal>
Baseline: <value ± variance, n runs>

| # | hypothesis | change | measured after | delta | kept? |
|---|---|---|---|---|---|
| 1 | <hotspot & why> | <one change> | <value> | -42% | yes |
| 2 | <...> | <...> | <no change> | ~0% | reverted |

Final: <value> vs target <value> — met / not met (<why, next design-level option>)
Regression check: tests ✓ / smoke ✓
```

## Common mistakes

- "While I'm here" optimizations bundled into the measured change — you can no longer attribute the delta.
- Measuring once; single runs are noise. Use repeated runs and compare like with like.
- Optimizing the function that *looks* expensive while the profiler shows 80% elsewhere (I/O, serialization, N+1).
- Declaring victory on a different machine, dataset, or build configuration than the baseline.
- Keeping a no-op change because it feels like progress — rule 3 exists precisely for this.
