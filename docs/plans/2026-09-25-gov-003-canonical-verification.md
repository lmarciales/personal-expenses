# GOV-003 Canonical Verification Implementation Plan

> **For the task owner:** Use the executing-plans and test-driven-development workflows in this session. Work sequentially on local `main`; repository policy overrides skill defaults for worktrees, intermediate commits, and separate status ledgers. Review the complete candidate before one focused local commit. Push requires separate authorization.

**Goal:** Make `pnpm verify` the reproducible, source-preserving verification entry point and configure future Vercel builds to run the same gate.

**Architecture:** Compose existing package scripts with shell `&&`, adding formatting validation, explicit type checking, and scoped Node test discovery. Preserve the standalone production build. Use `vercel.json`'s `buildCommand` to select the aggregate without recursion. Keep the staged public-safety scan separate because deployment verification must work without a mutable Git index.

**Tech stack:** Existing Node.js, pnpm 10.31.0, Biome 1.8.3, TypeScript, Node test runner, and Vite. No dependency or lockfile change.

**Spec:** `docs/specs/2026-08-16-agent-governance-and-qa-design.md`, Decisions 5–7, and ROADMAP GOV-003. The maintainer requested continuation after GOV-002.

## Scope and constraints

- Exact file allowlist: `package.json`, `vercel.json`, `AGENTS.md`, `ROADMAP.md`, `docs/standards/definition-of-done.md`, `docs/runbooks/verification.md`, this plan, and `tests/verification.test.mjs`, and `scripts/run-tests.mjs`.
- Base: `5e98767eaf235c2dd8a92d04c6544c26a059736f` on local `main`. Three pre-existing untracked planning/design documents remain excluded. The preserved local tooling configuration and ignored credentials remain untouched.
- Verification order: `format:check`, `lint`, `typecheck`, `check:i18n`, `test`, `build`. Stop on the first nonzero result. No successful final stage can hide an earlier failure.
- `format:check` uses `biome format .`; `typecheck` uses `tsc -b`; `test` uses `node scripts/run-tests.mjs`, which enumerates regular `*.test.mjs` files recursively below `tests/`, passes explicit paths to Node without a shell, and rejects empty/unreadable discovery; `verify` invokes the six scripts with `pnpm run` and `&&`.
- Source-preserving means no formatter fixes, source rewrites, staging, commits, or external effects. Existing generated `dist/` output and TypeScript caches under ignored directories are expected build products.
- Retain `pnpm build` as `tsc -b && vite build`. It remains independently safe to run; the inexpensive cached TypeScript recheck avoids weakening that command.
- Future Vercel deployments use `buildCommand: "pnpm run verify"`. Preserve existing rewrites. No dashboard mutation, install command, Node-version change, push, or deployment is authorized.
- Do not absorb GOV-004–GOV-007, update dependencies, normalize unrelated files, change runtime behavior, or weaken GOV-002. The initial formatting baseline passes without edits.
- Validate on available Node 22 and 24 LTS runtimes as well as the active local runtime. Actual Vercel execution is a release check, not a claim inferred from local success.

## Review focus and risks

1. A failing component must stop the aggregate, including its final build; test each failure and a successful recovery using disposable fixtures and the actual package command.
2. Formatting validation must leave a deliberately misformatted source unchanged; test the real Biome command with a synthetic fixture.
3. Tests must discover future nested test files and fail when no tests exist; test explicit file discovery without relying on shell expansion.
4. Actual format, lint, type, translation, test, and build commands must reject representative bad inputs; exercise them in fixtures, never by breaking application source.
5. Vercel must invoke the same aggregate without build recursion or rewrite changes; assert configuration and verify the produced app with a fresh local browser.

The candidate source of truth is the frozen index tree. Fixtures are invented local files in disposable directories. They contain no live backend, credentials, user data, or remote operations. Tests may create local Git fixtures through the existing suite but cannot push.

## Task 1: Define the command contract and prove failures

**Files:** `tests/verification.test.mjs`, `scripts/run-tests.mjs`, `package.json`, `vercel.json`.

**Interfaces:** The package scripts are the public command API. Tests consume the actual script definitions; no new application API or dependency is introduced.

- [x] Add tests for aggregate order/success, each failing stage stopping subsequent stages, successful retry, real component negative cases, source immutability, scoped nested/empty test discovery, and Vercel equivalence.
- [x] Run the new suite and confirm intended failures because the commands/configuration are missing.
- [x] Add the four package scripts, the small fail-closed test launcher, and the Vercel build-command property, preserving existing standalone commands and rewrites.
- [x] Run the focused suite and the complete aggregate; fix only in-scope failures. Validate on Node 22 and 24 using the already installed runtimes.

## Task 2: Establish the durable verification procedure

**Files:** `AGENTS.md`, `docs/standards/definition-of-done.md`, `docs/runbooks/verification.md`, `ROADMAP.md`, this plan.

**Interfaces:** The contract points to `pnpm verify`; the runbook owns component details, expected generated output, recovery, and Vercel activation evidence.

- [x] Replace the temporary lint/i18n/build gate with `pnpm verify` and document individual commands. Preserve the separate staged public-safety requirement.
- [x] Document prerequisites, non-mutating semantics, failure/recovery, local browser preflight, activation/rollback, and the deployment boundary.
- [x] Keep GOV-003 In progress until validation/review and local commit; use Awaiting deployment after local completion because Vercel enforcement is not live until the authorized push and exact-commit deployment pass.

## Task 3: Validate the final candidate and commit locally

- [x] Stage only the allowlist and freeze candidate A; verify no unstaged tracked changes or unrelated staged paths.
- [x] Run `pnpm verify`, focused negative tests, staged public-safety, whitespace checks, manual staged-content review, and the browser cases below. Prove source/index stability and unchanged production assets under identical synthetic build inputs.
- [x] Obtain independent code-quality and release-risk review of the exact candidate. Resolve material findings and rerun affected checks; record dispositions.
- [ ] Add sanitized evidence only to ROADMAP and this plan, freeze final B, review the evidence delta, and rerun affected gates. Documentation-only evidence does not change the tested runtime inputs.
- [ ] Confirm branch/index/allowlist, authorize only GOV-003's exact passing staged tree, and commit `GOV-003: add canonical verification gate`. Clear authorization and require committed-tree equality. Report the commit and tree in the final handoff.

## Browser and release verification

**Impact map:** Build acceptance changes; application routes, rendering, data operations, translations, and rewrite configuration do not. The highest-impact plausible regression is deploying missing/broken assets or losing SPA deep-link fallback. The browser checks the generated local production build at `/` (login) and one protected deep link while logged out, then hard-reloads. No login or data mutation is needed.

**Preflight:** Freeze a candidate tree, prove runtime inputs match it, build with explicitly synthetic local backend configuration, start a fresh preview process on loopback, and use a fresh browser context. Backend class is local with no reachable data service. Use desktop 1440×900; responsive/translation/a11y change matrices are not triggered because no UI changes. Record browser/version, console and relevant network outcomes, reload/fallback behavior, and cleanup. Existing fixture-induced unavailable network requests must be identified rather than treated as production evidence.

**Error and recovery:** Automated component failures prove the deployment gate stops before later stages; replacing the synthetic bad input proves retry success. Do not manufacture an application error or touch production records for a build-only change. Browser persistence/auth writes are N/A; logged-out protected-route behavior is the affected-output regression.

**Release:** Local changes can be completed and committed now. GOV-003 stays Awaiting deployment until explicitly authorized push, verification that Vercel runs all six checks for the exact commit, successful deployment, and a read-only production `/` (login)/deep-link smoke test. The push will also publish the preceding local GOV-002 commit; disclose that boundary. Connector reauthentication may be needed for read-only deployment evidence; do not bypass it.

**Rollback:** Before push, fix or normally revert the focused local change after review. After authorized deployment, retain the prior production deployment as the recovery target; on failure stop, inspect sanitized logs, and use an explicitly authorized Vercel rollback or a normal reviewed revert/fix. Never force-push or bypass the gate. A failed build should leave the previous production deployment serving.

## Plan review

Self-review checked the approved governance design and GOV-003 exit criteria against the tasks above: every component has a negative control, the aggregate has propagation/recovery controls, the local/public boundary is explicit, and Vercel activation cannot be overclaimed. No change to product behavior or dependencies is required. Implementation proceeds within the maintainer's continuation request; no additional external authorization is inferred.

References checked for configuration semantics: [Vercel buildCommand](https://vercel.com/docs/project-configuration/vercel-json#buildcommand) overrides a deployment's dashboard/package build command; [build configuration](https://vercel.com/docs/builds/configure-a-build) describes the build pipeline. These do not establish the live project's current settings.

Implementation review adjustment: the negative empty-suite test demonstrated that the native glob command exits successfully with zero matches. A small dependency-free launcher is therefore added to the reviewed allowlist; the finished behavior is unchanged. Source inspection also confirmed that login is served at `/`, so browser cases use the actual route.


## Accepted local implementation evidence — 2026-09-25

- **Candidate:** Reviewed substantive tree A `9680104cd3e452c63e50f60a4652f83e9d4a35b6`; exact nine-path allowlist, unchanged dependency manifest dependencies/lockfile, no application source changes. Manual staged-path/content review, scoped Biome, whitespace, and public-safety scan passed; nine non-deletion entries, zero findings.
- **Automated:** The full `pnpm verify` command passed on Node 22.23.2, 24.21.0, and 26.8.2 with pnpm 10.31.0: 57/57 tests on each, including eight new verification tests. Each component's bad-input control fails, each aggregate failure stops subsequent stages, and recovery succeeds. Formatting validation preserves the bad source. Nested tests are discovered; empty suites fail. Source bytes and index tree remained unchanged across all runs.
- **Build equivalence:** Under identical explicitly synthetic local backend inputs, generated production files matched the original standalone-build baseline byte for byte on all three runtimes. Expected generated files stayed ignored. Existing Browserslist data-age warnings were non-blocking.
- **Findings and dispositions:** The empty native test glob incorrectly succeeded; the new launcher fixes it, with red-to-green coverage. The first test helper assumed `npm_execpath` was JavaScript; actual `pnpm verify` exposed failure with standalone pnpm, and invoking the launcher through PATH corrected it. Both independent reviewers re-reviewed the resulting tree and independently ran actual `pnpm test` in disposable Git fixtures, each passing 57/57. No material finding remains in local implementation. Normal Git checkouts are supported; metadata-free source archives are outside the documented verification contract.
- **Independent workflows:** Code-quality and release-risk reviews passed tree A. Neither review claims live deployment, installed Vercel toolchain, or production smoke success. Owner evidence supplies the full aggregate, multi-runtime, source stability, and browser checks.

### Browser cases

Preflight: tree A verified in place, fresh production build/preview with a new loopback origin and synthetic local backend configuration; no reachable data service or personal session. Brave through the browser extension, Chromium 153.0.0.0 as reported by the browser, 1440×900 CSS pixels, English. Source/index parity and asset equivalence were confirmed after QA. Console evidence came from the browser; request status evidence came from temporary preview-server instrumentation. No authenticated or financial write occurred.

| Case | Actions and expected outcome | Observed result |
| --- | --- | --- |
| QA-001 | Open `/`; login and required assets render without an error overlay. | Pass: sign-in controls rendered and were visually inspected; document and application assets returned 200/304; captured console had no warning/error entries. |
| QA-002 | Load `/dashboard` directly while logged out; SPA fallback serves the app and protected content is denied. | Pass: document returned 200 and the app redirected to `/`, showing the login form with no protected content in the inspected state. |
| QA-003 | Reload the public login surface; required assets and controls remain available. | Pass: login persisted across reload; document/assets returned 200/304 and captured console remained clear. |

Expected local-preview responses were limited to missing Vercel Speed Insights script and fallback favicon requests (404). All application assets succeeded; the generated files were identical to the baseline, so this is a local-hosting limitation, not evidence of a newly introduced runtime failure. The first request observer recorded Vite's rewritten path; it was corrected to capture the original request before middleware and the cases were repeated. Temporary servers stopped, the tab closed, and the viewport override was reset. Private evidence remains ignored; no screenshots, logs, credentials, or fixture data enter the candidate.

Error/recovery is covered at the changed build-gate boundary by synthetic component failure/retry tests. Server persistence and authenticated writes are N/A because the change performs neither; UI, translation, and accessibility change matrices are not triggered. The read-only logged-out route check covers the build-output regression.

### Final freeze and release boundary

The completion delta is limited to this plan and ROADMAP. Final evidence review, the repeated complete gate/public-safety/diff checks, candidate-bound local commit, authorization cleanup, and committed-tree equality occur after this document is frozen and are attested in the final task handoff; their last two execution checkboxes remain unchecked here to avoid claiming future results. The Awaiting deployment entry becomes effective when the exact local candidate is committed.

GOV-003 is not Done until an explicitly authorized push is followed by exact-commit Vercel build evidence (all six stages and actual Node/pnpm versions) and production login/deep-link smoke. That push would also publish the preceding GOV-002 commit. No remote setting, push, deployment, or production write was performed. Vercel connector access requested reauthentication; this does not change authorization or constitute remote verification.
