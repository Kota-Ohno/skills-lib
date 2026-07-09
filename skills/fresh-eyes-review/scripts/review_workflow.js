// fresh-eyes-review: one review round.
// Fan out one fresh-context agent per role (each in its own lane) →
// an independent skeptic refutes each finding →
// synthesize survivors into a prioritized report.
//
// Run once per round. The CALLING (main) agent applies fixes between rounds,
// then re-runs with titles of fixed findings in `alreadyAddressed`.
//
// args = {
//   target:           string — paths / diff command + one-line description
//   scope:            string — optional focus or exclusions
//   roles:            [{ key, name, lens }] — omit for the built-in default set
//   alreadyAddressed: [string] — finding titles fixed in prior rounds
//   model:            string — optional model tier for ALL subagents in this
//                     run ('sonnet' | 'opus' | 'haiku' | 'fable'); omit to
//                     inherit the session model. Per LLM-OPS routing, name
//                     the tier explicitly — review gates are mid tier minimum.
//   review_model:     string — optional override for the role reviewers
//   verify_model:     string — optional override for the skeptic verifiers
//   synthesize_model: string — optional override for the final merge agent
//                     (whole-report synthesis: strongest available preferred)
// }
// returns { summary, findings: [...], false_positives: [...], failed_roles: [...] }
// (+ synthesize_failed: true when the final merge agent died and the report
//  was built directly from the raw survivors — convergence must not be
//  declared from such a round)

export const meta = {
  name: 'fresh-eyes-review',
  description: 'One round of fresh-eyes, multi-perspective review: each role reviews from a fresh context with no dev bias, an independent skeptic refutes each finding to kill false positives, then findings are merged and prioritized.',
  phases: [
    { title: 'Review', detail: 'one fresh-context agent per review role, each in its own lane' },
    { title: 'Verify', detail: 'independent skeptic tries to refute each finding' },
    { title: 'Synthesize', detail: 'dedup + prioritize confirmed findings into a report' },
  ],
}

const DEFAULT_ROLES = [
  { key: 'correctness', name: 'Correctness', lens: 'Logic errors, off-by-one, inverted/wrong conditions, wrong types, race conditions, shared-state bugs, edge cases. Ask: does this actually do what it claims, for every input and every code path?' },
  { key: 'robustness', name: 'Robustness', lens: 'Error and exception handling, input validation, failure modes, resource cleanup (files/connections/locks), graceful degradation. Ask: what happens when things go wrong or inputs are hostile?' },
  { key: 'security', name: 'Security', lens: 'Injection, authn/authz flaws, hardcoded secrets, unsafe deserialization, SSRF, path traversal, OWASP-style issues. Ask: how could this be abused, bypassed, or broken into?' },
  { key: 'performance', name: 'Performance', lens: 'Algorithmic complexity, N+1 queries, redundant work, unbounded loops, memory growth, scaling cliffs. Ask: where does this get slow or fat as the input grows?' },
  { key: 'maintainability', name: 'Maintainability', lens: 'Clarity, naming, coupling, dead code, duplication, cyclomatic complexity, testability. Ask: will the next reader understand this and safely change it?' },
  { key: 'design', name: 'Design', lens: 'Abstraction boundaries, separation of concerns, where it sits in the larger system, leaky abstractions, misplaced responsibilities. Ask: is this in the right place and shaped the right way?' },
  { key: 'completeness', name: 'Completeness', lens: 'Missing cases, TODO/FIXME, unhandled requirements, missing or weak tests, gaps versus the apparent intent. Ask: what is unfinished, untested, or assumed-but-not-enforced?' },
]

const SEV = ['critical', 'high', 'medium', 'low', 'nit']

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'short imperative label' },
          severity: { type: 'string', enum: SEV },
          location: { type: 'string', description: 'file:line, function, or section' },
          problem: { type: 'string', description: 'what is wrong, concretely' },
          recommendation: { type: 'string', description: 'the concrete fix' },
          rationale: { type: 'string', description: 'why it matters' },
        },
        required: ['title', 'severity', 'location', 'problem', 'recommendation'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['confirmed', 'refuted', 'uncertain'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reasoning: { type: 'string', description: 'cite exactly what you read in the artifact' },
    corrected_severity: { type: 'string', enum: SEV },
  },
  required: ['verdict', 'reasoning'],
}

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '1-3 sentence overview of this round' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: SEV },
          location: { type: 'string' },
          problem: { type: 'string' },
          recommendation: { type: 'string' },
          rationale: { type: 'string' },
          roles: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'severity', 'location', 'problem', 'recommendation'],
      },
    },
    false_positives: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, why: { type: 'string' } },
        required: ['title', 'why'],
      },
    },
  },
  required: ['summary', 'findings'],
}

const roles = (args && args.roles && args.roles.length ? args.roles : DEFAULT_ROLES)
const target = (args && args.target) || 'No target specified.'
const scope = (args && args.scope) || 'Review everything relevant to your role.'
const alreadyAddressed = (args && args.alreadyAddressed) || []

// Model routing: per-stage override > run-wide default > session inherit.
// Values pass straight through to agent()'s opts.model; unknown strings
// fail loudly here rather than silently at dispatch time.
const KNOWN_MODELS = ['sonnet', 'opus', 'haiku', 'fable']
function pickModel(specific, fallback, argName) {
  const value = specific !== undefined && specific !== null ? specific : fallback
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || KNOWN_MODELS.indexOf(value) === -1)
    throw new Error('args.' + argName + ' must be one of ' + KNOWN_MODELS.join('|') + ', got: ' + JSON.stringify(value))
  return value
}
const reviewModel = pickModel(args && args.review_model, args && args.model, 'review_model/model')
const verifyModel = pickModel(args && args.verify_model, args && args.model, 'verify_model/model')
const synthesizeModel = pickModel(args && args.synthesize_model, args && args.model, 'synthesize_model/model')

function reviewPrompt(role) {
  return [
    'You are a FRESH-EYES reviewer. You have NO knowledge of how or why this artifact was written — no design docs, no conversation history, no statement of intent. Read it cold and judge only what is actually there. This lack of context is the point: it strips out the author\'s assumptions and lets you see problems the author is blind to.',
    '',
    '## Your role — stay strictly in this lane (concentrating on one domain is what makes you effective)',
    '**' + role.name + '**',
    role.lens,
    '',
    '## What to review',
    target,
    '',
    '## Scope hints',
    scope,
    '',
    '## Already addressed in prior rounds (do NOT re-report these unless the problem genuinely still remains)',
    alreadyAddressed.length ? alreadyAddressed.join('\n') : '(none yet)',
    '',
    'Read the artifact yourself. Report ONLY issues that fall within your role\'s domain. For each finding give: a clear title, severity (critical/high/medium/low/nit), a precise location, the concrete problem, a concrete recommendation, and why it matters. Prefer a few high-signal findings over many weak ones. If your lane is genuinely clean, return an empty findings list — never invent issues just to seem thorough.',
  ].join('\n')
}

function verifyPrompt(f) {
  return [
    'You are an independent SKEPTIC. A fresh-eyes reviewer flagged the issue below. Your job is to REFUTE it.',
    '',
    'Fresh-eyes reviewers are powerful but they lack context, so they sometimes flag things that are already handled, intentionally correct, or not actually problems. Read the real artifact and try to prove this finding is wrong. If you cannot concretely confirm the problem from what is actually there, default to "refuted" or "uncertain". Only mark "confirmed" when you can see the problem yourself in the artifact.',
    '',
    '## What to review',
    target,
    '',
    '## Finding under scrutiny',
    'Title: ' + f.title,
    'Severity: ' + f.severity,
    'Location: ' + f.location,
    'Problem: ' + f.problem,
    'Recommendation: ' + f.recommendation,
    (f.rationale ? 'Rationale: ' + f.rationale : ''),
    '',
    'Verdict: confirmed / refuted / uncertain. In your reasoning, cite exactly what you read (file:line or a short quote). If the severity is clearly wrong, give a corrected_severity.',
  ].join('\n')
}

phase('Review')
log('Reviewing across ' + roles.length + ' roles: ' + roles.map(function (r) { return r.key }).join(', '))

// Pipeline: each role's findings get verified as soon as that role finishes —
// no barrier waiting on slower roles.
// An errored/empty reviewer is NOT a clean lane (LLM-OPS: never treat an
// empty response as an explicit NONE) — track failed lanes so the caller
// knows those domains were never actually reviewed.
var failedRoles = []
const perRole = await pipeline(
  roles,
  function (role) {
    return agent(reviewPrompt(role), { label: 'review:' + role.key, phase: 'Review', schema: FINDINGS_SCHEMA, model: reviewModel })
      .catch(function () { return null })
  },
  function (result, role) {
    if (!result || !Array.isArray(result.findings)) {
      failedRoles.push(role.key)
      log('Role ' + role.key + ' errored or returned nothing — lane NOT reviewed (recorded in failed_roles)')
      return []
    }
    var findings = result.findings
    if (!findings.length) return []
    return parallel(findings.map(function (f) {
      return function () {
        // A failed/empty skeptic must NOT erase the finding it was verifying
        // (an empty verdict is not a refutation — see LLM-OPS "starved skeptic
        // reads as converged"). Keep the finding with verdict: null instead.
        return agent(verifyPrompt(f), { label: 'verify:' + role.key + ':' + String(f.title || '').slice(0, 24), phase: 'Verify', schema: VERDICT_SCHEMA, model: verifyModel })
          .then(function (v) { return { finding: f, role: role.key, verdict: v || null } })
          .catch(function () { return { finding: f, role: role.key, verdict: null } })
      }
    }))
  }
)

var verified = perRole.flat().filter(Boolean)
var survivors = verified.filter(function (x) { return x.verdict && x.verdict.verdict === 'confirmed' })
var refuted = verified.filter(function (x) { return x.verdict && x.verdict.verdict && x.verdict.verdict !== 'confirmed' })
// Skeptic errored or returned nothing: verification is UNKNOWN, not refuted.
// These flow into the report as unverified findings so they cannot silently
// vanish and fake convergence.
var unverified = verified.filter(function (x) { return !(x.verdict && x.verdict.verdict) })

log('Reviewers raised ' + verified.length + ' findings — ' + survivors.length + ' confirmed, ' + refuted.length + ' refuted/uncertain'
  + (unverified.length ? ', ' + unverified.length + ' UNVERIFIED (skeptic call failed — passed through, not dropped)' : '')
  + (failedRoles.length ? '; FAILED lanes (not reviewed): ' + failedRoles.join(', ') : ''))

phase('Synthesize')
// Nothing to merge → skip the synthesize agent entirely (so a dead merge
// agent can never block convergence on an actually-clean round).
if (!survivors.length && !unverified.length) {
  log('No confirmed or unverified findings — skipping synthesize; round is clean')
  return {
    summary: 'No confirmed findings survived verification this round.',
    findings: [],
    false_positives: refuted.slice(0, 8).map(function (x) {
      return { title: x.finding.title, why: (x.verdict && x.verdict.reasoning) || '' }
    }),
    failed_roles: failedRoles,
  }
}
var report = await agent(
  [
    'You are the LEAD reviewer. Merge and prioritize these findings from multiple fresh-eyes reviewers. CONFIRMED findings survived adversarial verification; UNVERIFIED findings could not be verified because the skeptic call failed — include them too, marked "[unverified]" at the start of their problem field, so the caller can double-check them (they must not be silently dropped).',
    '',
    'Deduplicate overlaps across roles (the same issue flagged by several roles becomes ONE finding — list the roles that raised it). Order findings by severity (critical first). Apply the verifier\'s corrected_severity where one was given. Produce a tight, actionable report. If there are no confirmed or unverified findings, return an empty findings array and say so in the summary — that empty list signals convergence to the caller.',
    '',
    '## Confirmed findings',
    JSON.stringify(survivors.map(function (x) {
      return {
        role: x.role,
        title: x.finding.title,
        severity: (x.verdict && x.verdict.corrected_severity) || x.finding.severity,
        location: x.finding.location,
        problem: x.finding.problem,
        recommendation: x.finding.recommendation,
        rationale: x.finding.rationale,
      }
    }), null, 2),
    '',
    '## Unverified findings (skeptic failed — verification unknown)',
    JSON.stringify(unverified.map(function (x) {
      return {
        role: x.role,
        title: x.finding.title,
        severity: x.finding.severity,
        location: x.finding.location,
        problem: x.finding.problem,
        recommendation: x.finding.recommendation,
        rationale: x.finding.rationale,
      }
    }), null, 2),
    '',
    '## Notable false positives (refuted/uncertain) — list a few so the caller can see what was filtered out',
    JSON.stringify(refuted.slice(0, 8).map(function (x) {
      return { title: x.finding.title, why: x.verdict && x.verdict.reasoning }
    }), null, 2),
  ].join('\n'),
  { label: 'synthesize', phase: 'Synthesize', schema: REPORT_SCHEMA, model: synthesizeModel }
).catch(function () { return null })

// A dead/empty synthesizer must not eat the round: the raw survivors are in
// hand, so return them directly as a degraded (undeduplicated) report with
// synthesize_failed: true — which blocks convergence for the caller.
if (!report || !Array.isArray(report.findings)) {
  log('Synthesize agent failed — returning degraded report built from raw survivors (synthesize_failed: true)')
  report = {
    summary: 'SYNTHESIZE FAILED — degraded report: raw confirmed + unverified findings, not deduplicated or re-prioritized. Do not treat this round as converged.',
    findings: survivors.concat(unverified).map(function (x) {
      return {
        title: x.finding.title,
        severity: (x.verdict && x.verdict.corrected_severity) || x.finding.severity,
        location: x.finding.location,
        problem: ((x.verdict && x.verdict.verdict) ? '' : '[unverified] ') + x.finding.problem,
        recommendation: x.finding.recommendation,
        rationale: x.finding.rationale,
        roles: [x.role],
      }
    }),
    false_positives: [],
    synthesize_failed: true,
  }
}

// failed_roles: lanes whose reviewer errored/returned nothing. Those domains
// were NOT reviewed — the caller must not declare convergence for them.
return Object.assign({}, report, { failed_roles: failedRoles })
