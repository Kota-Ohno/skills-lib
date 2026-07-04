---
name: release-readiness
description: Use when a repo is about to be made public, a release/tag is about to be published, a package is about to be pushed to a registry (npm/crates/PyPI), or the user asks "is this safe to open-source / publish / ship?". Also use before announcing a project publicly or transferring it to an org. Trigger phrases include "公開前チェック", "リリース監査".
---

# Release Readiness

## Overview

Publishing is irreversible: once a secret, a name, or a false claim is public, it has been public forever. Audit the repo as a hostile stranger would read it — including its full git history — and gate the release on evidence, not vibes.

## When to use

- Flipping a private repo public.
- Cutting a release, tag, or registry publish.
- Sharing a repo/tarball outside the trust circle for the first time.

## When NOT to use

- Routine commits or PRs into an already-public repo (use normal review).
- Internal-only deploys where the artifact never leaves your infrastructure.

## Hard rules

1. **A secret found anywhere in git history blocks publish.** Rotate the credential AND scrub history (`git filter-repo`) before publishing. "It's already revoked, ship it" is prohibited — revoked keys still leak account IDs, naming schemes, and infrastructure layout, and scrapers archive pushes within minutes.
2. **Never soften a failing README claim by rewording.** If a quantitative or capability claim cannot be reproduced right now, either reproduce it (and link the artifact) or delete the claim. "Up to", "roughly", "in our tests" rewrites are prohibited.
3. **No GO verdict with any FAIL row open.** Partial passes are NO-GO.
4. **Do not fix findings silently mid-audit.** Record every finding in the report first; remediation is a separate pass, then re-audit the touched checks.

## Process

1. **Secrets — working tree.** Run `gitleaks detect --no-git` or `trufflehog filesystem .` if installed; otherwise run these greps: `AKIA[0-9A-Z]{16}`, `sk-[A-Za-z0-9_-]{20,}`, `ghp_[A-Za-z0-9]{36}`, `-----BEGIN [A-Z ]*PRIVATE KEY`, `password\s*[:=]`, `Bearer [A-Za-z0-9._-]+`, plus personal emails and absolute home paths (`/Users/<name>`, `/home/<name>`).
2. **Secrets — full history.** `gitleaks detect` (git mode) or `trufflehog git file://.`; fallback `git log -p --all | grep -E <patterns>`. History hits trigger Hard rule 1.
3. **License.** LICENSE file exists and matches the manifest field; spot-check direct dependency licenses for compatibility (no GPL dep inside a permissive-licensed library, etc.).
4. **README claims vs reality.** List every quantitative claim (perf numbers, coverage, "handles X"), every capability claim, and every install/quickstart command. Each must trace to a reproducible artifact: run the benchmark/test/quickstart now, or apply Hard rule 2.
5. **PII / internal leakage in docs, fixtures, example configs.** Internal hostnames, VPN/intranet URLs, real customer or personal data in test fixtures, screenshots with private info, real IPs.
6. **CI / badge honesty.** Every badge resolves and is green for the current default branch; CI actually runs the checks the README says it runs.
7. **.gitignore hygiene.** Local artifacts (`.env*`, build output, editor dirs, OS junk, local DBs, `node_modules`) are ignored AND not already tracked (`git ls-files` check).
8. Emit the report, give the verdict, then remediate and re-audit failing checks only.

## Output contract

```markdown
# Release Readiness Report — <repo> @ <commit>

| # | Check | Status | Evidence | Required action |
|---|-------|--------|----------|-----------------|
| 1 | Secrets: working tree | PASS/FAIL/N.A. | <tool + result> | |
| 2 | Secrets: git history  | PASS/FAIL/N.A. | <tool + result> | rotate + filter-repo if FAIL |
| 3 | License & dep compat  | PASS/FAIL/N.A. | | |
| 4 | README claims traced  | PASS/FAIL/N.A. | <claim → artifact map> | reproduce or delete |
| 5 | PII / internal names  | PASS/FAIL/N.A. | | |
| 6 | CI & badge honesty    | PASS/FAIL/N.A. | | |
| 7 | .gitignore coverage   | PASS/FAIL/N.A. | | |

**Verdict: GO / NO-GO** — <one-line justification>
```

## Common mistakes

- Scanning only the working tree; the leak is almost always in an old commit.
- Trusting `.gitignore` to mean "not tracked" — files added before the ignore rule are still in the repo.
- Treating an example config with a "fake-looking" internal hostname as harmless — real infrastructure names read as fake to their author.
- Declaring GO because the only FAILs are "just docs" — false claims are the most public defect a release can have.
