---
name: subagent-model-routing
description: Use when dispatching subagents/Task agents and a model tier must be chosen — planning a multi-agent workflow, writing agent briefs, reviewing why a subagent run was slow or expensive, or when someone asks "which model should this agent use" or proposes cheap models everywhere to save money. Also use when auditing existing dispatch code/prompts for missing model fields. Trigger phrases: "subagent", "dispatch", "which tier", "model routing", "モデル選定", "サブエージェント".
---

# Subagent Model Routing

## Overview

Route each subagent to the least capable model that can do the role — and say so explicitly, because an omitted model silently inherits the session's most expensive one. Cheapness is measured per completed task: turn count beats token price.

## When to use

- Every subagent dispatch (Task/Agent calls, SDK `agents` definitions, agent frontmatter).
- Designing or reviewing multi-agent pipelines and their cost.
- Diagnosing an agent run that was slower or pricier than expected.

## When NOT to use

- Single-session work with no delegation.
- Roles pinned by an agent definition's frontmatter you don't control.

## Hard rules

1. **Name the model explicitly on EVERY dispatch.** An omitted model silently inherits the parent session's model — usually the most expensive one. A dispatch prompt without a model field does not ship.
2. **Mid tier is the FLOOR for implementers working from prose.** Cheapest tier is permitted only when the complete code/text to apply is already in the brief (transcription/mechanical work).
3. **Review gates get mid tier minimum; whole-branch/final review and architecture get the strongest available.** Never downgrade the last gate to save money — that is where expensive failures pass through.
4. **Judge routing by measured cost per completed task, not catalog token price.** A cheap model taking 3x the turns costs more AND is slower. If a cheap-tier agent exceeds ~2x the expected turns, STOP and redispatch one tier up instead of letting it grind.
5. **Match the brief to the tier.** Cheapest tier requires a fully self-contained brief (exact files, exact content, no judgment calls). If writing that brief requires solving the problem yourself, the role is not cheapest-tier work.

## Routing table

| Role | Tier | Why |
|---|---|---|
| Transcription/mechanical edits — complete code already in the brief | Cheapest | Zero judgment; brief is the spec |
| Search/exploration with a narrow, concrete target | Cheapest–mid | Escalate if it needs synthesis |
| Implementer working from prose spec | Mid (floor) | Cheap tiers multiply turns on prose |
| Multi-file integration | Mid | Cross-file reasoning |
| Review gate (per-task, per-PR-chunk) | Mid minimum | Gate quality bounds pipeline quality |
| Whole-branch/final review | Strongest | Last line of defense |
| Architecture / design decisions | Strongest | Errors here are the costliest to unwind |

## Process

1. Classify the role using the routing table; when between rows, take the higher tier.
2. Write the brief, then check brief-vs-tier fit (rule 5); either enrich the brief or raise the tier.
3. Put the model name explicitly in the dispatch (parameter, frontmatter, or SDK config) — run the checklist below.
4. Dispatch; watch turn count. >~2x expected turns on a cheap tier → kill and redispatch one tier up.
5. After the run, record measured cost per completed task; adjust future routing from measurements, not price tables.

## Dispatch-prompt checklist

Before every dispatch, all boxes checked:

- [ ] Model named explicitly (not inherited)?
- [ ] Tier matches the routing-table row for this role?
- [ ] Brief self-contained enough for that tier (cheapest = complete code included; mid = unambiguous prose spec; strongest = full context and constraints)?
- [ ] Expected turn count stated, so overrun is detectable?
- [ ] Review/gate roles at mid tier or above; final review/architecture at strongest?

## Common mistakes

- Omitting the model "to use the default" — the default is the most expensive model, silently.
- Sending a cheapest-tier agent a prose spec and blaming the model for thrashing.
- Uniform-cheap pipelines that look frugal per token and lose on turns and rework.
- Downgrading the final review gate — the one role where the strongest model pays for itself.
- Routing by price-per-token tables instead of last week's measured per-task costs.
