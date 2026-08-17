# Agent Governance and End-to-End QA Design

Status: Approved direction; incorporates maintainer feedback from 2026-08-16.

## Purpose

Create a durable, vendor-neutral operating system for agent-assisted changes to Lumina. The system must preserve a single accountable task owner, require meaningful behavior validation before completion, keep the public repository free of private material, and support a sequential local-`main` workflow whose push triggers production deployment.

This design governs future implementation. It does not assume a particular subscription, model, agent runtime, browser product, or vendor-specific subagent format.

## Constraints

- The repository is public; product data is private.
- The maintainer works alone and intentionally does not use pull requests, feature branches, or worktrees for normal changes.
- Work is sequential. Only one roadmap item may be In progress.
- Remote `main` is connected to Vercel production.
- A task may use specialist reviewers, but the initiating task owner remains responsible for the complete result.
- UI and behavior changes cannot be considered complete from source inspection or automated unit tests alone.
- Real credentials may exist only in ignored local files and must never be echoed into logs, prompts, plans, screenshots, or commits.

## Decision 1: One canonical instruction contract

`AGENTS.md` is the repository-wide source of durable agent instructions. It contains only project facts, authorization boundaries, invariants, change gates, and authoritative commands.

It must not contain:

- model or subscription requirements;
- a generated list of every installed skill;
- procedures that are relevant only to one change type;
- duplicated material that already exists in a standard or runbook;
- a requirement to use a named vendor-specific agent;
- runtime-specific automatic commit/push hooks or co-author branding behavior. The repository may still define authorization for a deliberate, gated local commit after completion checks pass.

Tool-specific instruction files are optional compatibility adapters. They may import or point to `AGENTS.md`, but cannot redefine project policy. Optional runtime hooks may call repository scripts, but the scripts remain authoritative.

## Decision 2: The task owner owns the outcome end to end

The agent or session accepting a roadmap item is the **task owner**. Ownership includes:

1. Confirming scope, finished behavior, risks, and non-goals.
2. Inspecting the current application and relevant code before editing.
3. Writing or updating the implementation plan.
4. Implementing the complete scoped change.
5. Adding and running risk-appropriate automated tests.
6. Starting the application and validating changed behavior in a real browser when applicable.
7. Reviewing visual quality when UI is affected.
8. Invoking independent specialist review when triggered by the change risk.
9. Resolving every material finding and rerunning affected checks.
10. Producing a concise evidence summary and updating the roadmap.
11. Stopping before push unless deployment was explicitly authorized.

Delegation does not transfer accountability. Sending browser QA or specialist review to another session leaves the original owner responsible for integrating the evidence and resolving findings. Ownership changes only through an explicit handoff: the current owner identifies the scope, diff, evidence, unresolved findings, and limitations; the recipient explicitly accepts ownership; and the plan records the change. A task owner may accept, reject, or clarify reviewer findings based on evidence, but may not simply report a review and leave material issues unresolved.

## Decision 3: Specialist roles are independent reviewers, not replacement owners

`docs/standards/definition-of-done.md` contains the single normative reviewer trigger matrix. Portable workflows implement those responsibilities. Every triggered workflow is mandatory. A runtime that supports a compatible fresh reviewer uses one; a runtime without that capability has the task owner execute the same workflow and disclose that it was not independent.

### Behavior QA reviewer

Responsibilities:

- inspect the plan and changed diff without being coached toward the expected verdict;
- run or observe the application in a real browser;
- challenge the impact map and cover the changed happy path, risk-matched error/recovery path, authoritative persistence, triggered auth boundaries, and impact-based regressions;
- inspect unexpected console errors, uncaught exceptions, policy failures, and relevant failed network requests;
- return one reproducible evidence record per case plus findings and severity;
- avoid committing, pushing, or silently fixing the change.

### UI and accessibility reviewer

Responsibilities:

- compare the rendered result with the plan's intended behavior;
- review the canonical desktop/mobile viewports and both sides of every breakpoint whose behavior is affected;
- complete affected workflows keyboard-only and inspect focus order, visibility, dialog lifecycle, and name/role/state;
- inspect loading, empty, error, disabled, validation, and success states that the change touches;
- check both supported languages whenever copy, validation, locale formatting, or copy-bearing layout changes;
- verify relevant announcements, zoom/reflow, changed contrast, target size, and reduced motion;
- run automated accessibility scans in every materially affected dynamic state, use the accessibility tree for name/role/state, and observe screen-reader or accessibility-event output for changed live announcements;
- report visual hierarchy, clipping, overflow, density, consistency, and interaction problems.

### Security and data-integrity reviewer

Responsibilities:

- assess access control, RLS, least privilege, input validation, data exposure, financial invariants, reversibility, and auditability;
- require targeted tests and current advisor output where applicable;
- block unsafe destructive or externally applied changes without explicit authorization and recovery evidence.

### Release reviewer

The release workflow is deterministic and normally executed by the task owner. A separate reviewer may audit the staged diff and evidence for high-risk changes, but it cannot bypass the explicit deploy boundary.

## Decision 4: Browser QA is risk-based but mandatory when behavior changes

The canonical requirement is capability-based: use an available real browser driver. This may be an in-app browser, browser automation library, connected browser, or equivalent facility. Project policy does not name one vendor.

If no usable browser capability is available, the task owner must not claim UI or behavior QA passed. The task becomes Blocked. Another session may return delegated QA evidence while the original owner remains accountable, or it may explicitly accept a complete ownership handoff; no handoff is implicit.

### Operational QA contract

The detailed, normative matrices live in `docs/standards/definition-of-done.md`. Before opening the browser, the task owner records an impact map covering changed routes, consumers, states, side effects, shared dependencies, the highest-impact plausible failure, and the source-of-truth boundary. Shared changes require a justified representative from every materially different consumer or risk group; a single adjacent case is sufficient only for a bounded single-consumer change.

The required browser cases prove the primary workflow, the highest-impact safely reproducible failure and complete recovery, authoritative persistence from a fresh read, every triggered authorization boundary, and the regressions selected by the impact map. A failure case is incomplete unless it proves understandable accessible feedback, retained safe input when appropriate, no partial or duplicate side effect, and a successful retry or other intended recovery.

For server writes, UI state, a toast, or same-session navigation is not persistence proof. The owner verifies the exact synthetic result and affected derived totals after a hard reload or fresh browser context and confirms that no duplicate exists. Client-local persistence is likewise read from a fresh context. The plan names the source of truth before execution.

UI QA uses deterministic viewports, explicit language triggers, keyboard-only operation, affected-state coverage, accessibility checks, and console/network inspection. If a driver cannot expose console or network evidence, the task owner supplements it with another capability; a JavaScript- or network-sensitive change fails closed when that evidence remains unavailable locally or during the production smoke test.

### Test data safety

Before any browser write, record only the backend class—local, dedicated test, preview, or production—without exposing its URL or credentials. Default to a dedicated non-personal test project or tenant, synthetic identities, and disposable records. If only production is available, stop for explicit production-mutation authority and define an isolated synthetic or non-destructive path before continuing.

Follow `docs/runbooks/data-safety.md` for credentials and artifacts. Do not alter unrelated real financial records. Record whether temporary data was removed and verified or why a retained synthetic fixture is intentional.

### QA evidence

The completion report uses the required per-case schema in `docs/standards/definition-of-done.md`. Every case records the deterministic tested-candidate identifier, browser name/version and execution mode, sanitized backend class, route, preconditions and synthetic fixture label, viewport/language, actions, expected result, observed result, pass/fail, console/network outcome, cleanup, and a safe local artifact reference when one exists. Missing required fields fail the gate.

For an uncommitted candidate, stage the explicit task allowlist and use the Git index tree ID from `git write-tree`; for an already committed rerun, use the full commit ID. Browser QA must run either from an isolated materialization of that tree or from an in-place runtime whose tracked files, non-ignored untracked inputs, installed dependencies, and allowed ignored configuration are proven equivalent and unchanged before and after QA. In-place testing starts a fresh build/server only after the initial parity check, records the candidate ID associated with startup, and uses a fresh browser context or hard reload so an older process or cache cannot masquerade as the candidate. Record only sanitized stability results for private configuration—never its value or fingerprint.

Before commit, regenerate the index tree ID and require an exact match. After commit, require `HEAD^{tree}` to equal the tested tree ID so a hook or staging change cannot silently alter the candidate. Any mismatch or later candidate edit invalidates the mapping, requires a new identifier and impact review, and reruns every affected automated or browser case whenever runtime inputs, dependencies, configuration, fixture setup, or behavior may have changed.

Evidence must be concise and sanitized. A selected tab, click success, screenshot capture, toast, cached UI state, or source inspection alone is not proof that the intended behavior worked.

## Decision 5: Verification layers

Verification is additive:

1. **Focused automated checks** for the changed behavior.
2. **Repository verification** through a non-mutating `pnpm verify` command.
3. **Browser QA** for behavior/UI changes.
4. **Risk specialist review** when triggered.
5. **Public-content review** of staged paths and diff.
6. **Production smoke test** after authorized deployment.

No single layer substitutes for all others. A passing build does not prove behavior; browser QA does not prove database isolation; a specialist opinion does not replace executable checks.

## Decision 6: Direct-main release boundary

Normal flow:

1. Verify the active branch is exactly local `main` and understand existing changes.
2. Implement and validate one roadmap item.
3. Inspect the staged file set and public-safety results.
4. Create a local commit only after all applicable QA passes. Accepting an implementation request authorizes this gated local commit unless the maintainer explicitly says not to commit. In that case the item remains In progress with review-ready evidence, or becomes Deferred by explicit maintainer decision; it cannot be Done.
5. Push only when the maintainer has explicitly authorized deployment, either in the task request or afterward.
6. Let Vercel run the production build gate.
7. Smoke-test production and update roadmap evidence.
8. On failure, restore service through the documented Vercel rollback path and follow with a normal revert/fix commit. Never force-push production history.

Tracked command hooks add regression-tested defense in depth for supported agent tool payloads. They are not an adversarial shell or operating-system sandbox, so they never replace the repository contract or turn an unrecognized command path into authorization. Adapter coverage is claimed only after the host is proven to emit a stable matching event; absent or opaque lifecycle coverage is recorded in the roadmap and handled through the explicit owner/reviewer workflow.

Database changes use a separately approved, backward-compatible sequence and recovery plan. A Git push cannot automatically make an unsafe destructive database operation acceptable.

## Decision 7: Roadmap and plan lifecycle

`ROADMAP.md` is the only status ledger. It contains stable IDs, finished behavior, dependencies, status, and completion evidence. Blocked and Awaiting deployment are explicit active-delivery states; each records its exit condition, and neither permits another delivery item to begin unless the maintainer explicitly defers the current one.

Detailed plans are created while an item is Ready. Plans live under `docs/plans/`, are public-safe, use checkboxes for execution progress, and record scope, risks, file allowlist, QA cases, source-of-truth boundary, safe test-data strategy, and rollback decisions. A plan review is required before the item enters In progress. Plans do not duplicate the full roadmap.

One item may be In progress. New findings enter the roadmap Inbox instead of silently expanding scope.

## Portable workflow architecture

Initial project skills will use the open `SKILL.md` format under an allowlisted portion of `.agents/skills/`:

- `plan-roadmap-item`
- `verify-change`
- `qa-browser-change`
- `release-main`
- `review-database-change`

Only project-specific workflows belong in the repository. Generic installed skill libraries remain local and ignored. Skills call plain repository scripts when deterministic enforcement is needed.

The repository ignore policy allowlists only these named workflow folders. Adding another project skill requires a reviewed allowlist change; the complete local `.agents/skills/` library must never be made public by default.

Optional runtime-specific agent profiles may route a fresh reviewer to these skills. They are adapters only: the reviewer contract and workflow remain portable Markdown.

## Failure and stop conditions

The task owner stops and reports the blocker when any of the following remains true:

- active Git state is detached or not the intended branch;
- unrelated user changes cannot be safely separated;
- required verification fails;
- browser access is unavailable for a behavior/UI change;
- the changed behavior cannot be reproduced or safely tested;
- a material QA, security, data-integrity, or accessibility finding is unresolved;
- staged content may contain secrets or personal data;
- a destructive/external action lacks explicit authorization or recovery preparation;
- production smoke testing fails after deployment.

## Non-goals

- Introducing pull requests, worktrees, parallel feature implementation, or an external issue tracker.
- Making every task spawn many agents regardless of risk.
- Treating reviewers as authorities that can push or deploy independently.
- Adding browser end-to-end tests for every historical feature during Phase 0.
- Encoding one provider's tool names as the only valid way to perform QA.

## Acceptance criteria for this design

- The roadmap captures every previously approved improvement and the new ownership/QA requirement.
- The task owner remains accountable after delegation.
- Browser QA has concrete happy-path, error-path, risk, visual, responsive, and evidence requirements.
- Missing browser capability fails closed for UI/behavior completion claims.
- Specialist roles have clear triggers and cannot commit or deploy.
- The rules remain usable by an agent that ignores all optional provider-specific adapters.
- Public/private data boundaries and explicit deploy authorization remain intact.
