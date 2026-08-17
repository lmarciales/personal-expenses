# Lumina Roadmap

Last updated: 2026-08-16

Lumina is a private-use personal-finance application whose source repository is public. This roadmap is the canonical inventory of planned, active, deferred, and completed product work. It contains product behavior and engineering decisions only—never real account names, balances, credentials, exports, receipts, database dumps, or unsanitized screenshots.

## Operating model

- One maintainer, one task owner, and one active roadmap item at a time.
- Work happens sequentially on local `main`; branches, worktrees, and pull requests are not part of the normal workflow.
- A task owner owns the complete outcome: planning, implementation, relevant automated tests, browser QA, remediation, documentation, and completion evidence.
- Triggered specialist workflows are mandatory. Use an independent reviewer when the runtime provides one; otherwise the task owner performs the same workflow and discloses that the review was not independent. Review never transfers ownership.
- A local commit is not a production release. Pushing to remote `main` requires explicit deploy authorization.
- Phase ordering is dependency-based rather than date-based. An item moves forward only when its exit criteria are satisfied.

## Status model

- **Inbox** — captured but not yet placed in a phase.
- **Planned** — accepted and sequenced, but not ready to implement.
- **Ready** — dependencies and finished behavior are clear; the implementation plan is being prepared and reviewed.
- **In progress** — the single item currently being executed.
- **Blocked** — work cannot safely continue; the blocker, evidence, and exact resumption condition are recorded. It retains the active delivery slot until the maintainer explicitly parks it as Deferred.
- **Awaiting deployment** — local implementation, QA, review, and commit are complete, but a required production push is not yet authorized. It retains the active delivery slot so later commits cannot be bundled accidentally.
- **Done** — locally complete and, when production behavior is affected, deployed and smoke-tested; linked to sanitized evidence.
- **Deferred** — intentionally postponed, with the reason preserved.
- **Superseded** — replaced by another item, with the replacement linked.

Only one item may be In progress, Blocked, or Awaiting deployment. An item may enter In progress only after its public-safe plan defines scope, risks, file allowlist, verification, browser cases, and rollback, and that plan has been reviewed. Items are never silently deleted. New findings go to the Inbox and must be triaged before the active phase closes.

If the maintainer explicitly requests an uncommitted handoff, the item remains In progress with sanitized review-ready evidence until commit is authorized. It may instead become Deferred only through an explicit maintainer decision. Uncommitted implementation is never Done or Awaiting deployment.

## Universal definition of done

An item is Done only when all applicable conditions are met:

1. The finished behavior and explicit non-goals are documented in a reviewed plan.
2. The task owner implements the complete scoped behavior and updates affected documentation.
3. Relevant automated tests pass, followed by the repository-wide verification command.
4. Behavior or UI changes are exercised in a real browser using the project QA matrix: happy path, safe error/recovery path, adjacent regression risks, and visual/responsive checks.
5. UI changes are visually inspected against their intended behavior in desktop and mobile layouts; keyboard, accessibility, and both supported languages are checked when affected.
6. Database, authentication, or financial changes receive their additional specialist checks.
7. The staged file list and diff contain no secret, credential, personal data, private artifact, or unrelated change.
8. Any material QA finding is fixed and the affected cases are rerun. Unresolved material findings block completion.
9. If production behavior is affected, the locally committed item becomes Awaiting deployment until push is explicitly authorized; production is smoke-tested afterward.
10. This roadmap links to concise, sanitized completion evidence. The final handoff reports the resulting commit ID; do not create a self-referential metadata commit merely to write its own hash.

Documentation-only changes record browser QA as not applicable with a reason; they do not manufacture browser evidence.

## Phase 0 — Safe delivery foundation

Exit condition: future changes have one concise source of instructions, one durable status ledger, machine-readable verification, mandatory behavior QA, a public-safety gate, and a reversible production release procedure.

### GOV-001 — Canonical roadmap and agent contract

- **Status:** Done
- **Outcome:** `ROADMAP.md` is the single work ledger and `AGENTS.md` is a concise, vendor-neutral operating contract with no duplicated skill catalogue or model-specific instructions.
- **Dependencies:** None.
- **Done when:** The roadmap, approved governance design, concise rules, thin compatibility adapters, and documentation tracking policy are reviewed and validated.
- **Completion evidence:** The reviewed governance design, canonical contract, roadmap, definition of done, data-safety runbook, thin provider adapters, and candidate-bound commit guard are included in the GOV-001 completion commit. The exact 16-file candidate passed lint, i18n parity, production build, 26 Node subtests, diff and public-safety inspection, and independent quality, security, and guard-design reviews. Browser QA was not applicable because no application runtime or rendered UI changed. The final handoff reports the local commit ID; nothing was pushed or deployed. INBOX-001 records the host-owned hook lifecycle limitation without treating it as authorization.

### GOV-002 — Public-repository safety baseline

- **Status:** Planned
- **Outcome:** Secrets, local credentials, financial exports, database dumps, receipts, logs, test artifacts, and unsanitized QA evidence are prevented from entering Git through explicit ignore rules, staged-content checks, and repository push protection.
- **Dependencies:** GOV-001.
- **Done when:** A controlled safety test proves allowed examples pass and representative forbidden artifacts fail without exposing real data.

### GOV-003 — Canonical verification command

- **Status:** Planned
- **Outcome:** One non-mutating `pnpm verify` command runs formatting validation, lint, type checking, i18n parity, unit tests, and the production build.
- **Dependencies:** GOV-001.
- **Done when:** Each component can fail the aggregate command, the successful command is reproducible locally, and Vercel uses an equivalent gate.

### GOV-004 — Task ownership and browser QA system

- **Status:** Planned
- **Outcome:** Every behavior-changing task has an accountable owner, reproducible risk-based QA evidence from a real browser, and the reviewer workflows required by a single trigger matrix; delegation never silently transfers task ownership.
- **Dependencies:** GOV-001, GOV-003.
- **Done when:** The definition of done, QA matrix, portable QA workflow, evidence format, reviewer triggers, and blocked-state behavior are forward-tested on representative UI and non-UI changes.

### GOV-005 — Direct-main release gate

- **Status:** Planned
- **Outcome:** A portable release workflow refuses detached HEAD, non-`main` branches, failed verification, unsafe staged content, unresolved QA, or missing deploy authorization.
- **Dependencies:** GOV-002, GOV-003, GOV-004.
- **Done when:** Safe dry-run scenarios pass; wrong-branch, dirty-scope, failed-check, and missing-authorization scenarios stop before commit or push.

### GOV-006 — Deployment, smoke test, and recovery runbook

- **Status:** Planned
- **Outcome:** Vercel production behavior, post-deploy smoke checks, database sequencing, normal Git reverts, and Vercel rollback are documented and testable without force-pushing.
- **Dependencies:** GOV-005.
- **Done when:** A non-destructive rehearsal proves the maintainer can identify the deployed commit, verify production, and select the correct recovery path.

### GOV-007 — Repository onboarding and automation cleanup

- **Status:** Planned
- **Outcome:** The generic README, broad tracked provider toolkits, and unused PR/provider automation are replaced by accurate, minimal, vendor-neutral project documentation and validation automation. Optional provider integration is reduced to thin adapters. Database migrations are established as the sole schema source of truth.
- **Dependencies:** GOV-001 through GOV-006.
- **Done when:** A clean clone can understand setup and validation without private files, and no tracked instruction or workflow contradicts the direct-main policy.

## Phase 1 — Data trust and recoverability

Exit condition: financial records reconcile to their source data, recovery is proven, and current high-risk database and authentication findings are resolved or explicitly accepted.

### TRUST-001 — Supabase privilege and RLS hardening

- **Status:** Planned
- **Outcome:** Table, function, GraphQL, RLS, and `SECURITY DEFINER` exposure follows least privilege; function search paths and ownership are explicit.
- **Dependencies:** Phase 0.
- **Done when:** Migrations, generated types, policy tests, and current Supabase security advisors pass the agreed risk threshold.

### TRUST-002 — Authentication protection

- **Status:** Planned
- **Outcome:** Session handling, protected routes, sign-out, password protection, recovery, and appropriate account hardening behave safely for the private single-user product.
- **Dependencies:** TRUST-001.
- **Done when:** Authenticated, expired-session, unauthenticated, and recovery paths are tested without leaking credentials.

### TRUST-003 — Financial invariants and reconciliation

- **Status:** Planned
- **Outcome:** Balances, transfers, debt movements, taxes/fees, dates, and derived totals have explicit invariants and explainable reconciliation behavior.
- **Dependencies:** TRUST-001.
- **Done when:** Deterministic fixtures reconcile, regression tests cover known calculation risks, and mismatches are visible rather than silently hidden.

### TRUST-004 — Migration and schema source of truth

- **Status:** Planned
- **Outcome:** Versioned migrations are authoritative; stale destructive root snapshots are safely retired or clearly isolated; generated TypeScript types match production schema.
- **Dependencies:** TRUST-001.
- **Done when:** A clean schema can be reconstructed from the documented source without ambiguous destructive scripts.

### TRUST-005 — Query, RLS, and data-fetching reliability

- **Status:** Planned
- **Outcome:** Missing indexes, repeated RLS evaluation, duplicate policies, query fan-out, stale loading, and inconsistent error handling are corrected proportionally to personal-tool scale.
- **Dependencies:** TRUST-001, TRUST-003.
- **Done when:** Current performance advisors and representative route queries show no unaddressed material issue.

### TRUST-006 — Backup, export, and restore

- **Status:** Planned
- **Outcome:** The maintainer can produce a private export, verify it, and restore or reconstruct critical data without committing any artifact.
- **Dependencies:** TRUST-003, TRUST-004.
- **Done when:** A sanitized rehearsal proves the runbook and private storage boundary.

## Phase 2 — Correct and polished foundation

Exit condition: every core route behaves predictably across supported languages, viewports, keyboard use, and loading/error/empty states.

- **UX-001 — Locale correctness:** Normalize language variants and make dates, currency, and translated copy consistent.
- **UX-002 — Loading, empty, error, and retry states:** Give every data surface an intentional, accessible state model.
- **UX-003 — Accessibility baseline:** Correct names, labels, focus, keyboard operation, contrast, announcements, and reduced-motion behavior.
- **UX-004 — Responsive/mobile baseline:** Make primary workflows comfortable on the phone sizes used for daily entry.
- **UX-005 — Form and interaction consistency:** Standardize validation, destructive confirmations, feedback, and recoverability.
- **UX-006 — Admin simplification:** Remove or simplify private-tool administration that does not create meaningful value.

All items are **Planned** and depend on Phase 1 where their behavior touches trusted financial data.

## Phase 3 — Fast daily money management

Exit condition: routine entry, correction, review, and reconciliation can be completed quickly without external calculations.

- **FLOW-001 — Quick transaction entry:** Fast, keyboard/mobile-friendly entry with sensible defaults and validation.
- **FLOW-002 — Transaction management:** Useful filtering, searching, editing, safe deletion, and traceable detail.
- **FLOW-003 — Account detail and reconciliation:** Statement comparison, discrepancy visibility, and explicit adjustments.
- **FLOW-004 — Recurring bills and income:** Recurrence management and a practical near-term cash-flow view.

All items are **Planned** and depend on Phases 1–2.

## Phase 4 — Decisions and planning

Exit condition: every insight is traceable to source records and leads to a clear personal decision.

- **PLAN-001 — Decision-focused dashboard:** Prioritize exceptions, upcoming obligations, and useful actions over decorative totals.
- **PLAN-002 — Explainable analytics:** Make categories, trends, comparisons, and net-worth changes inspectable and filterable.
- **PLAN-003 — Debt workflows:** Clarify people, obligations, payments, settlement state, and cash-flow impact.
- **PLAN-004 — Budgets:** Lightweight category or period limits with progress and non-judgmental feedback.
- **PLAN-005 — Savings goals:** Goal targets, contributions, projections, and progress connected to real accounts.

All items are **Planned** and depend on Phase 3 where indicated by their data sources.

## Phase 5 — Automation and reporting

Exit condition: automated changes are previewable, reversible, idempotent where necessary, and auditable.

- **AUTO-001 — CSV import:** Mapping preview, validation, duplicate detection, atomic import, and rollback guidance.
- **AUTO-002 — Categorization rules:** Explainable rules with preview, conflict handling, and manual override.
- **AUTO-003 — Monthly close:** A repeatable review/reconciliation workflow that preserves corrections and open questions.
- **AUTO-004 — Monthly and annual reports:** Private, reproducible summaries without placing generated financial artifacts in Git.
- **AUTO-005 — Forecasting:** Explainable projections based on current balances, recurring items, budgets, and explicit assumptions.

All items are **Planned** and depend on trusted data and the relevant Phase 3–4 workflows.

## Phase 6 — Convenience capabilities

Exit condition: each capability improves personal use without materially increasing privacy, stale-data, or maintenance risk.

- **CONV-001 — Global search:** Fast navigation across accounts, transactions, debts, and relevant metadata.
- **CONV-002 — Receipt attachments:** Private storage, clear retention, safe access controls, and no repository artifacts.
- **CONV-003 — PWA/offline support:** Read/write behavior designed explicitly around synchronization, conflicts, and financial-data privacy.

All items are **Planned**. Offline writes remain conditional on a proven conflict and recovery model.

## Inbox

### INBOX-001 — Orchestrated command-hook coverage

- **Status:** Inbox
- **Finding:** Some host runtimes can execute nested shell commands through a free-form orchestration tool without emitting a matching shell-command hook event, and some direct command events omit the command's effective working directory. The tracked command guard cannot enforce context the host never sends, and interactive session writes need the same explicit coverage decision.
- **Triage:** During GOV-005 or GOV-007, prove the current hook envelope and lifecycle for every supported command surface, add a safe adapter only where the host provides a stable contract, and remove any adapter claim that cannot be reproduced. Until then, `AGENTS.md` remains authoritative and a missing hook never grants commit, push, or deployment authorization.

## Completed, deferred, and superseded items

GOV-001 is Done; its sanitized completion evidence remains with the Phase 0 entry above. No items are Deferred or Superseded.
