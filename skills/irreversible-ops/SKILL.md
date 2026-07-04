---
name: irreversible-ops
description: Use when about to run a destructive or hard-to-undo operation - DB schema migrations, bulk data rewrites/backfills, mass file deletion or renames, git force-push or history rewrite, production config changes, key/credential rotation, dropping tables or buckets - or when the user asks "is it safe to run this?". Trigger phrases include "破壊的操作", "取り返しのつかない操作".
---

# Irreversible Ops

## Overview

Destructive operations get a plan-validate-execute discipline: prove you can restore before you destroy, rehearse on a copy, and execute in small verified increments. The plan is written and shown BEFORE the first mutating command runs.

## When to use

- Schema migrations, bulk UPDATE/DELETE/backfills, mass file deletes/renames, `git push --force` / history rewrites, prod config or infra changes, key rotation, dropping tables/buckets/indexes.

## When NOT to use

- Operations that are trivially reversible in seconds (editing a tracked file, a normal commit, a dev-only scratch DB you can recreate from a script).
- Read-only analysis.

## Hard rules

1. **No mutating command before the plan exists and the backup's restore path has been TESTED.** An untested backup is a hope, not a backup — you must have restored from it (to a scratch target) and verified the restored data before proceeding.
2. **Classify reversibility honestly**: *truly irreversible* (data destroyed, secrets exposed, history published), *expensive-to-reverse* (restore possible but costs hours/downtime), *reversible*. "We could probably recover it" is expensive-to-reverse at best; when unsure, classify one level worse.
3. **Write the rollback procedure BEFORE executing** — concrete commands, not "restore from backup". A rollback invented after failure is improvisation under pressure.
4. **Dry-run or shadow-run on a copy first.** If the tool has no `--dry-run`, run the real operation against a restored copy of the data. If neither is possible, say so explicitly and get user confirmation for that specific gap.
5. **Execute in the smallest independent increments** (one table, one batch, one directory, one key), verifying a checkable postcondition after each. Never run the whole operation as one shot when it can be split.
6. **STOP on any unexpected state.** Wrong row count, unexpected error, postcondition mismatch → halt, do NOT improvise recovery mid-operation. Reassess against the written rollback; only proceed or roll back deliberately, with the user informed.
7. **Truly-irreversible operations require explicit user confirmation of the plan** before execution. Never infer consent from the original request.

## Process

1. **Classify** the operation's reversibility (Hard rule 2) and blast radius: what data/systems/users are affected if it goes maximally wrong.
2. **Backup + tested restore.** Snapshot the affected state; restore it to a scratch target; verify the restored copy (counts, checksums, spot queries). Record the evidence.
3. **Rollback procedure.** Write exact commands to return to the pre-op state, and the point of no return after which rollback changes meaning (e.g., writes accepted on the new schema).
4. **Dry-run / shadow-run** on the restored copy; compare outcome against expectations (rows affected, files matched, diff of resulting state).
5. **Slice into increments** with a postcondition per increment — a command whose output proves the increment succeeded (count, checksum, health check, query).
6. **Present the plan** (template below); obtain confirmation if truly irreversible.
7. **Execute increment-by-increment**: run → check postcondition → record → next. Apply Hard rule 6 on any surprise.
8. **Final verification**: overall postcondition, application-level smoke check, and note when the backup can be retired.

## Output contract

```markdown
# Irreversible Op Plan — <operation>

- **Operation:** <exact commands / migration ids>
- **Reversibility class:** truly irreversible / expensive-to-reverse / reversible — <why>
- **Blast radius:** <data, systems, users affected in worst case>
- **Backup:** <what, where, when taken>
- **Restore test evidence:** <restore target + verification output> ← must be non-empty
- **Dry-run / shadow-run result:** <expected vs observed>
- **Point of no return:** <step after which rollback changes meaning>
- **Rollback procedure:** <exact commands>
- **Increments & postconditions:**
  | # | Increment | Command | Postcondition check | Result |
  |---|-----------|---------|---------------------|--------|
- **Stop condition:** any postcondition mismatch or unexpected output → halt, no improvised recovery.
```

## Common mistakes

- A backup that was taken but never restored — discovered corrupt exactly when needed.
- Rollback written as "restore from backup" with no commands, no timing, no point-of-no-return analysis.
- Running the whole migration in one transaction "for atomicity" when it can be sliced — one failure now poisons everything at once.
- Improvising a "quick fix" mid-operation when step 3 of 7 looks weird — the second improvised command is the one that destroys data.
- Treating `--dry-run` output as verified success without actually reading the counts it reports.
- Rotating a key before confirming every consumer can pick up the new one — rotation is a distributed migration, not a config edit.
