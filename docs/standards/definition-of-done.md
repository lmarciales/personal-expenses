# Definition of Done

This standard defines the minimum evidence required before a Lumina change can be called complete. The task owner selects every applicable change class; mixed changes satisfy the union of their requirements.

Passing a build is not proof of user behavior. Browser success is not proof of database isolation. Reviewer opinion is not a substitute for executable checks.

## Universal requirements

Every change must have:

- a clear roadmap item or explicitly bounded maintenance purpose;
- documented finished behavior and non-goals;
- an accountable task owner;
- focused validation for affected behavior;
- the current repository-wide command gate;
- an inspected file list and public-safe diff;
- resolved material reviewer findings;
- updated documentation and roadmap evidence;
- explicit authorization before production push.

## Reviewer workflows and blocking materiality

The task owner applies every matching row. A triggered workflow is mandatory. Use a compatible fresh reviewer when the runtime provides one; otherwise the task owner performs the same workflow and records `not independent` in the evidence. Delegation does not transfer task ownership.

| Change trigger | Required reviewer workflow |
| --- | --- |
| Any user-visible behavior | Behavior QA |
| Layout, styling, navigation, component interaction, copy hierarchy, responsive behavior, focus, keyboard behavior, announcements, or motion | UI and accessibility |
| Authentication, authorization, personal-data handling, secrets, exports, attachments, or destructive operations | Security and data integrity |
| Supabase query, migration, RLS policy, function, grant, storage, or generated database type | Security and data integrity, including the database checklist and current advisors |
| Financial calculation or write, reconciliation, transfer, debt movement, import, fee/tax, sign, date, or rounding behavior | Security and data integrity, emphasizing financial invariants and duplicate/partial-write risk |
| Deployment configuration, externally applied change, or recovery/rollback behavior | Release risk |

Every finding records severity, reproduction, disposition (`fixed`, `not applicable`, or `rejected with evidence`), and rerun result. The following are always material and block completion:

- incorrect financial results or unreconciled source data;
- data loss, corruption, or unintended partial/duplicate writes;
- access-control, privacy, credential, or personal-data exposure;
- unsafe or unrecoverable schema/deployment behavior;
- a crash or failed primary acceptance criterion;
- keyboard blockage, inaccessible critical feedback, or a critical workflow unusable in a supported viewport or language.

After a fix, rerun the finding's original reproduction and affected regression cases. Material security or accessibility fixes receive fresh re-review when a compatible independent reviewer exists. A task owner cannot downgrade a material result merely because the tool labels it differently.

Until `pnpm verify` exists, the repository-wide gate is:

```text
pnpm lint
pnpm check:i18n
pnpm build
```

## Documentation or non-runtime configuration

Required:

- validate syntax or configuration parsing when applicable;
- check links, paths, commands, and contradictions against the repository;
- run `git diff --check` and the repository-wide gate;
- record why browser QA is not applicable when rendered behavior cannot change.

Browser QA becomes required if configuration affects routing, runtime environment, rendering, build output, or deployment behavior.

## Logic and financial calculations

Required:

- add or update focused automated tests before relying on manual QA;
- cover sign, date, rounding, transfer, fee/tax, empty-input, and boundary behavior affected by the change;
- reconcile derived results to deterministic source fixtures;
- prove errors are surfaced rather than silently adjusted;
- run the repository-wide gate.

If the calculation is shown or edited through the UI, also apply the behavior and UI requirements.

## User-visible behavior

Run the app and use a real browser driver. Source inspection, a selected tab, a toast, or automated tests alone cannot pass this gate.

Before browser actions, record a sanitized preflight:

- deterministic candidate provenance: stage only the explicit task allowlist and record the Git index tree ID from `git write-tree`, or record the full tested commit ID for a post-commit rerun;
- impact map: changed routes, consumers, states, side effects, and shared dependencies;
- highest-impact plausible failure introduced by the candidate;
- source-of-truth boundary for every persisted value;
- backend class: local, dedicated test, preview, or production—never the private URL;
- synthetic fixture label and required identities, without credentials or record identifiers;
- browser name/version, execution mode (interactive or automated), and capability for console and relevant network evidence;
- cleanup intent and explicit production-mutation authority when production is the only backend.

Default to a dedicated non-personal test backend, synthetic identities, and disposable data. If browser writes would reach production and explicit mutation authority is absent, the item is Blocked.

Run browser QA against the identified candidate by using one of these modes:

1. **Isolated materialization:** materialize the recorded index tree outside the working checkout, install from the locked dependency manifest, apply allowed ignored configuration without logging it, build there, and test that exact build.
2. **Verified in place:** before and after QA, prove all tracked runtime-relevant files match the index; no non-ignored untracked runtime input exists; dependencies match the lockfile; and allowed ignored configuration remained byte-for-byte stable. After the initial parity check, terminate or exclude any older app process, create a fresh build or start a fresh server from the verified inputs, and record the candidate tree ID associated with that startup. Exercise it with a fresh browser context or a hard reload that excludes stale app output. Record only `stable` or `changed` for private configuration, never its value or fingerprint. Stop on unrelated runtime inputs that cannot be separated or explained. If a fresh candidate-bound process cannot be guaranteed, use isolated materialization instead.

Immediately before commit, regenerate the index tree ID and require it to equal the tested candidate ID. Any candidate edit requires a new tree ID and impact review. Rerun every affected automated or browser case when the edit changes or may change runtime inputs, dependencies, build/configuration, fixture setup, or behavior; editorial evidence-only changes still require the new ID and a recorded N/A rationale for browser rerun.

Immediately after commit and before any push, require the committed tree from `HEAD^{tree}` to equal the tested index tree ID. A mismatch means a hook, staging change, or omitted input altered the candidate: browser evidence is no longer attached to the commit, the task is incomplete, and affected checks must be rerun against a new candidate before release.

Minimum cases:

1. **Happy path:** Complete the primary intended workflow and verify its acceptance criteria.
2. **Risk-matched error and recovery:** Deterministically trigger the highest-impact plausible failure that can be tested safely. Verify understandable, accessible feedback; retain safe input when appropriate; prove there was no partial or duplicate side effect; then complete the intended retry or recovery successfully.
3. **Impact-based regression:** Exercise a justified representative from every materially different consumer or risk group in the impact map. One adjacent case is enough only for a bounded single-consumer change.
4. **Authoritative persistence:** For a server write, hard-reload or use a fresh browser context, then verify the exact synthetic result, affected derived totals, and absence of duplicates against the declared source of truth. For client-local persistence, read it from a fresh context. For deletion, verify authoritative absence.
5. **Triggered authorization boundaries:** Run every scenario selected by the auth table below.

| Change or surface | Required browser scenario |
| --- | --- |
| Protected route or protected read | Logged-out access is denied or redirected without private-data flash |
| Session lifecycle or refresh handling | Expired/invalid session fails safely and reaches the intended recovery path |
| Ownership-scoped read or write | Synthetic owner succeeds and a second synthetic identity is denied without cross-owner disclosure or mutation |
| Authentication redirect | Destination is correct, return behavior is correct when applicable, and no redirect loop occurs |
| Logout or session clearing | Private/cached data is no longer visible, including after back navigation and reload |

Do not damage real financial data to create an error case. Record verified cleanup or the reason an intentionally retained synthetic fixture is safe.

For affected paths, require no new unexpected console errors, uncaught exceptions, content-security-policy failures, or relevant failed network requests. Identify expected negative-case responses as expected. If the driver cannot expose this evidence, supplement it; a JavaScript- or network-sensitive change fails closed when the evidence remains unavailable.

If a browser is unavailable, the task is incomplete; do not substitute DOM/source inspection and call it passed.

## UI, responsive behavior, and accessibility

In addition to user-visible behavior requirements, verify all affected dimensions:

- canonical desktop viewport at 1440 × 900 CSS pixels;
- canonical mobile viewport at 390 × 844 CSS pixels;
- one CSS pixel below and above every breakpoint whose component behavior is affected, plus the exact boundary when query inclusivity matters;
- visual hierarchy, density, alignment, clipping, overflow, and consistency;
- pointer operation and completion of the affected workflow keyboard-only;
- logical, visible, and unobscured focus order; for dialogs, verify entry focus, containment, Escape behavior, and focus return;
- correct accessible name, role, value/state, and disabled/expanded/selected semantics for affected controls;
- affected loading, empty, error, disabled, validation, success, and destructive-confirmation states;
- Spanish and English whenever user-facing copy, validation, dates, currency, numbers, or copy-bearing layout changes; otherwise record a concrete N/A reason;
- expected locale formatting, not merely translated text presence;
- accessible error/success/status announcements for affected forms or asynchronous updates;
- changed color contrast and interactive target size;
- zoom/reflow for changed layouts, including 200% desktop zoom and a 320-CSS-pixel-wide reflow check where the affected workflow is expected to support it;
- reduced motion when animation or transition behavior changes;
- an automated accessibility scan after entering every materially affected dynamic state, including opened dialogs and affected validation, error, loading, and success states;
- accessibility-tree verification for changed name/role/state semantics;
- observed screen-reader or accessibility-event output, including timing and order, when live announcements change.

The UI/accessibility reviewer workflow is mandatory when triggered by the matrix. Record whether it was independent. Automated scans assist but do not replace keyboard, visual, or semantic verification.

## Authentication, security, and privacy

Required:

- run every scenario selected by the authorization trigger table, not merely the easiest case;
- validate inputs at the appropriate boundary;
- verify no service-role credential or private value reaches client code, logs, fixtures, screenshots, or commits;
- inspect redirects and ownership assumptions;
- execute the security/data-integrity reviewer workflow and disclose whether it was independent;
- run current platform security advisors when the affected system provides them.

Unresolved access-control or personal-data exposure is always material and blocks completion.

## Supabase schema, query, RLS, or function changes

Required:

- use a versioned migration as the schema source of truth;
- review grants, RLS coverage, policy logic, function execution privileges, ownership, and `search_path`;
- verify allowed ownership and denied cross-user behavior with safe fixtures;
- regenerate and type-check `src/supabase/database.types.ts`;
- inspect current security and performance advisors;
- document forward and recovery sequencing;
- obtain explicit approval before destructive or externally applied operations.

For financial writes, also apply calculation/reconciliation requirements.

## Deployment and production completion

Before a local commit:

- all applicable requirements above pass;
- active Git branch is exactly local `main`;
- staged paths are allowlisted for the task;
- staged public-content review passes;
- no material finding remains.

If the maintainer explicitly requests no commit, record a sanitized review-ready handoff and keep the item In progress. It becomes Deferred only by explicit maintainer decision and cannot be marked Done while implementation remains uncommitted.

Before push:

- deployment was explicitly authorized;
- the release gate passes against the final commit candidate;
- the rollback path is known for the affected layer.

When production behavior is affected and push is not authorized, the locally committed item moves to Awaiting deployment and is not Done. It retains the active delivery slot so a later push cannot accidentally bundle unrelated work. Documentation-only work may record deployment as not applicable when it cannot alter runtime or production configuration.

After push:

- identify the Vercel deployment for the intended commit;
- confirm the production build completed successfully;
- smoke-test the changed production behavior;
- for JavaScript- or network-sensitive changes, apply the same affected-path console/network criterion used in local QA: no new unexpected console errors, uncaught exceptions, content-security-policy failures, or relevant failed requests, with expected negative responses identified;
- update the roadmap with the commit and sanitized evidence.

A failed smoke test blocks completion and triggers the documented recovery decision.

## Evidence format

Use a concise sanitized summary plus one required record per browser case. Missing required fields fail the browser gate.

```text
Scope: <roadmap ID and finished behavior>
Automated: <commands and pass/fail>
Candidate: <tested Git index tree ID, or full tested commit ID>
Preflight: <impact map reference, source of truth, backend class, fixture label, browser evidence capability>
Browser case: <case ID | browser name/version and execution mode | route | preconditions | viewport/language | actions | expected | observed | pass/fail | console/network | cleanup | safe local artifact ref or none>
Reviewers: <workflow | independent/not independent | findings and dispositions | rerun/re-review>
Public safety: <staged paths and scan/review result>
Deployment: <not applicable | awaiting authorization | commit/deployment and smoke result>
Limitations: <remaining untested area or none>
```

Actions, expected results, and observed results must be specific enough for another reviewer to reproduce the case. A private artifact reference may use a sanitized local label; never include an absolute machine path, private URL, credential, record identifier, or real financial value.

Never include credentials, real balances, account names, private URLs, raw exports, or unsanitized screenshots in evidence.
