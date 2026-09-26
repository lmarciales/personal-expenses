# GOV-002 Public Repository Safety Baseline Implementation Plan

> **For the task owner:** Execute this plan sequentially on local `main`. Do not create a branch, worktree, or pull request. The task owner owns implementation, independent review, validation, the focused local commit, and the final evidence. This reviewed plan does not itself authorize implementation, a remote settings change, push, or deployment.

**Planning status:** Substantive implementation reviewed and validated on local `main`. Final freeze and commit results are recorded in the task handoff under the execution boundary below. Push remains unauthorized.

**Goal:** Prevent credentials, personal financial artifacts, local project linkage, and unsanitized QA output from entering a new Git commit through narrow ignore rules, an exact staged-candidate scanner, and candidate-bound commit authorization, while preserving the repository's existing native secret scanning and push protection.

**Architecture:** `.gitignore` is the first local barrier. A reusable policy module classifies repository-relative paths, Git entry modes, blob size/type, and high-confidence private-content patterns. A CLI snapshots the staged index as a Git tree and scans every non-deletion entry relative to `HEAD`, including type changes, while never reading ignored or unstaged working-tree content. The existing commit-authorization script calls the same scanner and refuses to create an authorization artifact for an unsafe or uninspectable tree. GitHub secret scanning and repository push protection remain an independent provider-native layer, verified read-only at completion.

**Tech stack:** Node.js ESM, built-in `node:test`, Git plumbing invoked without a shell, pnpm scripts, Markdown, and existing GitHub repository security controls. No dependency is added.

## Finished behavior

- Known local credential, export, receipt, statement, backup, database, browser/test-output, and environment-linkage paths are ignored narrowly.
- The environment-specific `.codex/config.toml` file is removed from the tracked tree while the maintainer's local copy remains intact and ignored. Its value is never printed or copied into evidence.
- `pnpm check:public-safety` scans the exact staged candidate rather than the working tree and returns a deterministic pass, policy-finding failure, or inspection failure.
- A force-added ignored file, risky rename destination, unsafe text blob, unapproved binary/media artifact, symlink, submodule entry, or oversized blob is rejected.
- Allowed source, generic migrations, reviewed placeholder configuration, synthetic fixtures, and deliberate public UI assets continue to pass.
- Diagnostics contain only a stable rule code, a candidate ordinal such as `candidate-003`, and an optional line number; they never include the actual path, filename, matched value, blob contents, raw command, environment value, or unsanitized Git error. The maintainer correlates the ordinal with a private local staged-path review.
- Candidate-bound commit authorization cannot be created until the same exact staged tree passes the public-safety scanner. A failed scan leaves no authorization artifact.
- The current public repository's native secret scanning, repository push protection, and open-alert count are verified by read-back without pushing a fake secret or changing a remote setting.
- Manual staged-path and diff review remains mandatory. The scanner is defense in depth, not a claim of complete semantic personal-data detection.

## Non-goals

- No application, authentication, financial calculation, UI, routing, translation, Supabase schema, RLS, Vercel configuration, or production behavior changes.
- No Git history rewrite for the non-secret environment-specific project reference. If implementation discovers a real credential or private record in history, stop and use the incident process rather than expanding this item silently.
- No credential rotation unless an actual exposure is confirmed and separately authorized.
- No `pnpm verify` aggregate command or Vercel build-gate work; that belongs to GOV-003.
- No branch ruleset, force-push/deletion rule, PR requirement, required status check, release workflow, or deploy authorization; those belong to GOV-005 and GOV-006.
- No general cleanup of legacy provider adapters, skills, workflows, root schema snapshots, or onboarding material; that belongs to GOV-007.
- No CI job described as prevention. With the approved direct-to-`main` workflow, a post-push job detects content only after publication.
- No promise that pattern matching can identify every meaningful name, note, screenshot, or financial fact. Human review remains authoritative for semantic privacy.

## Global constraints

- Work only on the real local `main`; detached HEAD, a divergent branch, or inseparable unrelated changes are stop conditions.
- Preserve unrelated and ignored local files. Never open, scan, print, hash into evidence, or otherwise reproduce `.env.test.local` or other ignored credentials.
- Use only synthetic fixtures created in disposable temporary repositories. Do not connect tests to Supabase, Vercel, GitHub mutations, or production data.
- Never weaken a rule or add a suppression switch merely to make a candidate pass. A possible real secret or personal artifact is material and blocks completion.
- Do not change GitHub security settings under this plan. If read-back shows secret scanning or repository push protection disabled, stop and request separate external-change authorization and release-risk review.
- Do not push the eventual GOV-002 commit without a later explicit push authorization. Application deployment and browser QA are not applicable to this non-runtime item.

## Risks, source of truth, test data, and rollback

- **Primary risks:** a false negative publishes private material; a false positive blocks legitimate code or migrations; a diagnostic echoes the sensitive match; broad ignore rules hide useful source; a force-added ignored file bypasses the first layer; a mutable worktree is mistaken for the candidate; a staged binary or special Git entry is not inspected; or native repository protection is overclaimed.
- **Candidate source of truth:** the Git tree ID produced from the index is authoritative. The scanner compares `HEAD` with that immutable candidate tree and reads blobs by object ID. The working tree and ignored files are outside its input. Commit authorization must bind to the same tree ID, and `HEAD^{tree}` must equal it after commit.
- **Policy source of truth:** `scripts/public-safety-policy.mjs` owns the reusable classifications. `.gitignore` reduces accidental staging but never replaces the policy. `docs/runbooks/data-safety.md` owns human handling and incident procedure.
- **Remote source of truth:** sanitized read-back from the authenticated GitHub security UI or API of secret scanning, repository push protection, and open secret-scanning alert count. A successful push alone is not proof that either protection is enabled.
- **Test-data strategy:** tests create disposable Git repositories, invented filenames, small deterministic files, the reserved `example.invalid` domain, and secret-shaped or machine-path strings assembled from harmless fragments at runtime. No test source contains a realistic complete credential, personal email, local username, project reference, or financial record.
- **Rollback before commit:** remove temporary authorization state, leave the reviewable working tree intact, and fix or explicitly defer the item. Never bypass a finding.
- **Rollback after the local commit:** use a normal reviewed revert or fix commit on `main`. Removing the tracked environment-link file is recovered by reverting the tracked deletion only if it is later proven necessary; the preserved ignored local copy is not deleted. There is no database or application rollback.
- **Incident response:** a real credential or private artifact stops GOV-002. Remove it from the candidate, assess existing Git history without reproducing the value, rotate or revoke if required, and obtain explicit authority for any history rewrite or remote remediation.

## Current reviewed baseline

- GOV-001 is Done and its dependency is satisfied.
- Local `main` is synchronized with `origin/main` at the GOV-001 completion commit before these planning edits.
- The repository is public. Native secret scanning and repository push protection are currently enabled, and the current read-only audit found no open secret-scanning alerts.
- There is no repository ruleset or `main` branch-protection rule. That is not a GOV-002 blocker and remains a GOV-005 decision.
- Existing ignore rules cover logs, `.env*` except `.env.example`, build output, local agent directories, and non-allowlisted documentation, but they do not cover all representative exports, receipts, backups, browser reports, local platform state, or QA media.
- There is no executable public-safety command or staged-content regression suite.
- One tracked local tooling file contains an environment-specific project reference. It is not a credential, but it should no longer be tracked.

## Exact file and external-effect allowlist

The implementation candidate may contain only these paths:

```text
.gitignore
.codex/config.toml                       # tracked deletion only; preserve the local file
AGENTS.md
ROADMAP.md
package.json
docs/plans/2026-08-16-gov-002-public-repository-safety-baseline.md
docs/runbooks/data-safety.md
docs/standards/definition-of-done.md
scripts/public-safety-policy.mjs
scripts/check-public-safety.mjs
scripts/git-operation-authorization.mjs
tests/publicSafety.test.mjs
```

`pnpm-lock.yaml` must remain unchanged because no package is added. Existing Git-operation guard tests are required validation but are not expected to change.

Allowed external effects are read-only GitHub security-setting and alert-count queries. No GitHub setting mutation, Supabase operation, Vercel operation, production write, push, or deployment is authorized. If implementation requires another file or effect, return GOV-002 to plan review before changing it.

## Scanner contract

### Shared policy API

`scripts/public-safety-policy.mjs` exports deterministic functions with no filesystem, process, network, or Git access:

```js
inspectCandidatePath({ path, mode, status, size })
inspectCandidateBlob({ path, bytes })
inspectText({ path, text })
isApprovedPublicAssetPath(path)
```

`inspectCandidateBlob` performs pure byte-level binary/media classification, including extensionless blobs, before any UTF-8 text inspection. Each policy inspection returns only rule details; the candidate scanner attaches a path-free ordinal before a finding can reach a caller or formatter:

```js
{ code, candidateId, line }
```

`line` is optional. Findings never contain the path, filename, matched substring, or candidate contents. The scanner keeps paths only in its private in-process inspection map and never serializes or logs that map.

### Candidate and CLI API

`scripts/check-public-safety.mjs` exports:

```js
scanStagedCandidate({ cwd })
formatPublicSafetyFinding(finding)
```

`scanStagedCandidate`:

1. verifies that `cwd` is inside one non-bare Git worktree;
2. records the `HEAD` tree and creates an immutable candidate tree with `git write-tree`;
3. recursively enumerates full-object `A`, `C`, `M`, `R`, and `T` records between those trees with NUL-delimited raw Git output and rename/copy detection, inspects each destination, skips only `D`, and fails closed on every other status;
4. treats staged deletions as cleanup and does not inspect deleted content;
5. obtains destination path, status, mode, object ID, and declared object size without reading blob bytes;
6. applies path, mode, and size rules first, rejecting definitive forbidden paths, symlinks, submodules, unknown modes, and oversized blobs without opening their objects;
7. reads only policy-eligible regular-file blobs by object ID, never from a filesystem path, then applies binary/media and text rules;
8. returns the candidate tree ID, inspected count, and redacted findings; and
9. fails closed whenever Git output, an entry mode, an eligible object, byte-level classification, or required UTF-8 text cannot be inspected safely.

The CLI is non-mutating except for the ordinary Git tree objects created by `git write-tree`. It exposes no suppression or allow-on-error flag.

Exit codes:

- `0` — no staged policy finding; an empty staged diff is reported explicitly as zero inspected files;
- `1` — one or more policy findings; and
- `2` — usage, repository, Git, parsing, or inspection failure.

### Initial policy matrix

Path and Git-entry classifications are case-insensitive while retaining the original path only inside the private inspection process. They block:

- every case-insensitive `.env*` match except the case-sensitive exact root path `.env.example`;
- local platform/project linkage such as `.codex/config.toml`, `.vercel/`, `.supabase/`, and Supabase temporary state;
- export, receipt, statement, backup, dump, log, browser-profile, trace, coverage, test-result, and browser-report directories or filenames;
- private-key, certificate-container, raw database, archive, HAR, and trace artifacts;
- media or binary files outside the approved public asset roots `public/`, `src/assets/`, and `docs/assets/public/`;
- any new candidate blob larger than 5 MiB;
- symlinks, submodules, and unknown Git entry modes.

Text rules block high-confidence occurrences of:

- private-key material;
- high-confidence literal credential assignments or credential-bearing URLs, while allowing ordinary variable/property references used by authentication code;
- recognized secret/token shapes;
- email addresses outside the documented synthetic allowlist;
- absolute personal home-directory paths; and
- copied export/dump signatures when the file context makes them unambiguously private.

The exact `.env.example`, reserved synthetic examples, generic migrations, normal source that discusses security terms, sanitized documentation, and approved public assets remain allowed. Do not add generic entropy scoring or blanket `.sql`, `.csv`, image, or email bans without a reviewed false-positive model.

## Task 1: Freeze and test the intended behavior first

- [x] **Step 1: Confirm implementation authority and preflight Git state**

Obtain explicit implementation authorization. Confirm local `main`, synchronization with `origin/main`, the exact planned file list, and the absence of unrelated changes. Record only sanitized repository state.

- [x] **Step 2: Move GOV-002 from Ready to In progress**

Verify no other item is In progress, Blocked, or Awaiting deployment. Change only GOV-002's roadmap status to In progress and preserve the reviewed plan link. This lifecycle edit is part of the implementation candidate and does not authorize any external effect.

- [x] **Step 3: Safely inventory the baseline**

Review tracked paths, ignore behavior, and the current staged set without printing ignored-file contents. Reverify GitHub secret scanning, repository push protection, and the open-alert count read-only. If a real alert exists or required protection is disabled, move GOV-002 to Blocked and record the safe resumption condition.

- [x] **Step 4: Add failing scanner contract tests**

Create `tests/publicSafety.test.mjs` using `node:test` and disposable repositories. Before implementation, run:

```powershell
node --test tests/publicSafety.test.mjs
```

Expected: the new acceptance cases fail for the intended missing behavior, without printing any synthetic match value.

The suite must include:

- allowed empty or placeholder-only `.env.example`;
- allowed ordinary source mentioning words such as `token`, `export`, or `git push` without a credential value, plus authentication code whose credential-named fields reference variables or object properties rather than string literals;
- allowed generic migration SQL, sanitized documentation, reserved-domain synthetic fixture, and public asset under each approved root;
- blocked force-added `.env.test.local` without reading its staged blob or any ignored unstaged credential file, including mixed-case path, directory, and extension variants; a controlled Git-call probe must prove no blob-content read occurs after the definitive path finding;
- blocked private-key marker, runtime-assembled secret-shaped assignment, non-synthetic-looking email, credential-bearing URL, and runtime-assembled personal machine path;
- blocked export, receipt, statement, dump/backup, log, HAR, trace, coverage, browser report, test result, and QA screenshot outside approved roots;
- blocked binary outside approved roots, blob above 5 MiB, new symlink, new submodule entry, regular-file-to-symlink type change, regular-file-to-submodule type change, and unknown entry mode or status;
- blocked rename or copy into a forbidden destination and allowed deletion of a forbidden legacy path;
- safe parsing of spaces, Unicode, tabs, and newlines in Git paths;
- staged safe content followed by an unsafe unstaged worktree edit still passing, then failing only after the unsafe content is staged;
- an inspection failure returning exit `2` with redacted output;
- a forbidden synthetic filename assembled at runtime and containing private-looking text, proving stdout and stderr include neither the filename nor the content; and
- empty staged diff returning `0` with an explicit zero-file result.

## Task 2: Close the ignore and tracked-linkage gaps

- [x] **Step 1: Add narrow ignore rules**

Modify `.gitignore` for the exact local linkage, export/receipt/statement, backup/dump, log, browser/test-output, trace, private-key/container, and temporary platform classes covered by the policy. Do not ignore all SQL, CSV, images, documentation, migrations, or fixtures.

- [x] **Step 2: Stop tracking the environment-specific tooling link safely**

Remove `.codex/config.toml` from the Git index only, keep the local file intact, and make its exact path ignored. Do not print, copy, delete, or rewrite the contained value. Recheck that no unrelated ignored file became visible.

- [x] **Step 3: Prove ignore behavior**

Add controlled tests that query the real ignore policy with invented paths. Representative private artifact paths must be ignored; allowed migrations, source, placeholder configuration, synthetic fixtures, and public assets must remain visible.

## Task 3: Implement the policy and exact staged-tree scanner

- [x] **Step 1: Implement the pure policy minimally**

Create `scripts/public-safety-policy.mjs` with named rule constants, normalized POSIX-style repository paths, the 5 MiB limit, approved asset roots, placeholder handling, and deterministic findings. Keep matching logic independent from Git and CLI formatting.

- [x] **Step 2: Implement immutable candidate inspection**

Create `scripts/check-public-safety.mjs`. Invoke Git directly with argument arrays and no shell. Parse NUL-delimited records, bind inspection to object IDs from the candidate tree, cap all reads, and replace raw subprocess errors with fixed redacted messages.

- [x] **Step 3: Add the focused command**

Add this non-mutating package script:

```json
\"check:public-safety\": \"node scripts/check-public-safety.mjs\"
```

Do not create `pnpm verify` or modify the Vercel build command.

- [x] **Step 4: Make the focused suite pass**

Run:

```powershell
node --test tests/publicSafety.test.mjs
pnpm check:public-safety
```

Expected: every controlled allowed/forbidden case passes, and the real staged candidate produces only a sanitized result.

## Task 4: Bind commit authorization to the safety result

- [x] **Step 1: Integrate the shared scanner**

Modify `scripts/git-operation-authorization.mjs` so authorization is created only after a non-empty candidate passes `scanStagedCandidate`. Require the returned candidate tree to equal a fresh `git write-tree` result immediately before writing authorization. On a policy finding, inspection error, or tree mismatch, return a fixed redacted error and ensure both authorization artifacts are absent.

- [x] **Step 2: Add integration regressions**

In `tests/publicSafety.test.mjs`, prove:

- a safe staged candidate can receive authorization;
- a force-added forbidden or secret-shaped candidate cannot;
- a scan failure cannot;
- changing the index after a successful scan cannot reuse authorization; and
- neither failed path creates or leaves an authorization artifact.

Run the existing Git-operation guard suite unchanged to prove normal safe authorization and commit decisions remain compatible.

## Task 5: Update the durable contract and runbook

- [x] **Step 1: Update concise repository instructions**

Add `pnpm check:public-safety` to `AGENTS.md` as the staged-candidate command and require it before commit authorization. Keep the detailed rule matrix out of the canonical contract.

- [x] **Step 2: Complete the data-safety procedure**

Replace the GOV-002 placeholder in `docs/runbooks/data-safety.md` with the command contract, staged-tree source-of-truth explanation, safe diagnostic format, remediation steps, native GitHub layer, and known limitations. State that deleting a forbidden tracked file is permitted cleanup and that a real finding is never bypassed.

- [x] **Step 3: Update the definition of done**

Add the focused public-safety check to the universal pre-commit evidence and clarify that it runs after the explicit task allowlist is staged. Keep the current repository-wide lint/i18n/build gate unchanged until GOV-003.

- [x] **Step 4: Reverify native repository protection**

Read back native secret scanning, repository push protection, and the open-alert count. Do not push a test credential. If settings still match the reviewed baseline and no alerts are open, record a sanitized pass. If they do not, stop; do not mutate settings under this plan.

## Task 6: Independently review and validate the substantive candidate

- [x] **Step 1: Stage and freeze the complete substantive candidate**

Keep GOV-002 In progress while mandatory review is pending. Stage only the exact 12-path allowlist, including the tracked deletion and all implementation/documentation changes except the final Done status and completion-evidence wording. Require no unstaged difference in any planned file, no unplanned staged path, and no lockfile change. Record substantive tree A, run the scanner against it, inspect the full staged diff and binary metadata, and use `git diff --cached --check`. Every substantive edit invalidates tree A and requires restaging, a new tree ID, affected gates, and both substantive reviews again.

- [x] **Step 2: Request a fresh security and data-integrity review**

Provide substantive tree A and ask the reviewer to test force-added ignored files, index/worktree divergence, every non-deletion status including type changes, rename/copy handling, metadata-first rejection without blob reads, binary and special entries, oversized blobs, path/content redaction, safe placeholders, authorization failure cleanup, and false-positive controls. Resolve every material finding, restage the complete substantive candidate, and rerun its reproduction before fresh re-review.

- [x] **Step 3: Request a focused code-quality review**

Ask a separate reviewer to inspect NUL parsing, Git mode/status handling, metadata-first and object-bound reads, size limits, exit semantics, platform portability, deterministic output, and maintainability against the same substantive tree A. A release-risk review is required only if the scope changes to include an external setting mutation.

- [x] **Step 4: Run all gates against substantive tree A**

Run:

```powershell
node --test tests/publicSafety.test.mjs
node --test tests/*.test.mjs
pnpm check:public-safety
pnpm lint
pnpm check:i18n
pnpm build
pnpm exec biome check scripts/public-safety-policy.mjs scripts/check-public-safety.mjs scripts/git-operation-authorization.mjs tests/publicSafety.test.mjs
git diff --cached --check
```

Expected: all commands pass without modifying source files; a fresh `git write-tree` result still equals substantive tree A; and the complete staged set and both substantive reviewers still refer to that tree. If Biome reports formatting differences, apply a scoped formatter only to the planned files, restage, record a new tree, and rerun every affected check and substantive review.

- [x] **Step 5: Record QA applicability and limitations**

Record exactly: “Application browser QA not applicable: GOV-002 changes repository hygiene, local staged-content checks, and read-only repository security verification; it does not alter application runtime, routing, rendering, Vercel build output, or user-visible behavior.”

Also record that ignore rules, pattern matching, native secret scanning, and manual review are complementary layers rather than a guarantee that all semantic personal information is detectable.

## Task 7: Finalize evidence and create the focused local commit

- [x] **Step 1: Add the evidence-only completion delta**

Only after substantive tree A passes both reviews and all gates, update GOV-002 from In progress to Done and add the actual sanitized outcomes: focused/full test results, repository-wide gates, substantive candidate tree, public-safety result, reviewer dispositions, GitHub read-back, browser/deployment N/A, and limitations. Update this plan's execution checkboxes and evidence without changing implementation claims. Do not place the completion commit's own hash inside itself and do not report the item as Done until the final candidate is committed.

- [ ] **Step 2: Freeze and validate final tree B**

Restage the exact 12-path allowlist. Require the delta from substantive tree A to final tree B to be evidence-only changes in `ROADMAP.md` and this plan; any other change returns to Task 6. Require no unstaged planned-file difference, no unplanned staged path, and no lockfile change. Run the public-safety scanner, the complete command gate from Task 6, `git diff --cached --check`, and a targeted independent review of the evidence-only delta for accuracy, contradictions, and public safety. A correction to that delta requires a new tree B and a repeat of this step; a substantive correction returns to Task 6. Do not edit any file after tree B passes.

- [ ] **Step 3: Reconfirm the reviewed candidate without editing it**

Immediately before authorization, require the staged paths and `git write-tree` result to equal final tree B, require no unstaged planned-file difference, and confirm both authorization artifacts are absent. Any mismatch returns to Step 2 or Task 6 according to its scope.

- [ ] **Step 4: Create one reversible local commit**

Use the candidate-bound commit-only mechanism with the message:

```text
GOV-002: add public repository safety baseline
```

Immediately remove authorization state and prove `HEAD^{tree}` equals the reviewed index tree. Report the full local commit ID in the final handoff.

- [x] **Step 5: Do not push or deploy**

The implementation authorization for this plan does not imply push authorization. GOV-002 has no application deployment requirement. Push only after a separate explicit maintainer request. After any authorized push, verify that `origin/main` contains the intended commit, identify the Vercel deployment mapped to that exact commit, and confirm its build completed successfully. Application smoke testing remains not applicable because this candidate cannot alter runtime behavior; if the scope ever changes, return to plan review and apply the normal affected-production smoke requirement.

## Required completion evidence

```text
Scope: GOV-002 finished behavior and exact 12-path allowlist
Automated: focused scanner tests, all Node tests, public-safety command, lint, i18n, build, scoped Biome, diff check
Candidate: substantive tree A, evidence-only final tree B, their bounded delta, and post-commit tree equality
Security baseline: tracked-path review and sanitized incident status
Native protection: secret scanning, push protection, and open-alert read-back
Reviewers: independent security/data-integrity and code-quality findings, dispositions, reruns, and re-review
Public safety: staged paths, finding count, redaction result, and manual diff result
Browser: not applicable with the exact non-runtime reason
Deployment: not applicable unless scope changes
Limitations: layered safeguards do not provide complete semantic DLP
Delivery: local commit ID; push state reported separately
```

## Plan review evidence — 2026-08-16

- A read-only local audit mapped current ignore coverage, tracked artifact classes, executable gaps, and the environment-specific tracked tooling link without reproducing its value.
- A separate governance audit checked lifecycle status, plan prerequisites, reviewer triggers, browser applicability, rollback, evidence, and GOV-001 release recording.
- A separate read-only GitHub audit confirmed the current native protection state and documented why PR requirements, post-push CI as prevention, path-based push rulesets, and branch-history protection are outside GOV-002.
- Implementation was authorized in the earlier continuation session. Its native GitHub secret-scanning / push-protection re-read returned unauthenticated HTTP 401; no settings were changed. At that time the 2026-08-16 audit remained the last successful observation; the current read-back below supersedes that limitation.

## Plan self-review checklist

- [x] Finished behavior and non-goals map to GOV-002 without absorbing GOV-003, GOV-005, GOV-006, or GOV-007.
- [x] Risks, immutable candidate source of truth, safe test data, rollback, and incident response are explicit.
- [x] The file and external-effect allowlists are exact.
- [x] Tests precede implementation and cover allowed controls, representative forbidden cases, redaction, and authorization integration.
- [x] Required reviewers, complete gates, browser applicability, commit boundary, and push boundary are explicit.
- [x] No private value, credential, local username, private URL, or real financial record appears in this plan.

## Continuation review — 2026-09-25

- The recovered candidate was uncommitted. The prior working-copy Done wording was premature and has been corrected to In progress. Historical review evidence is preserved privately; completion will use a fresh substantive candidate.
- The task owner is continuing the existing approved plan on local main. No branch, worktree, additional roadmap item, dependency, or external mutation is introduced. ROADMAP remains the only status ledger.
- Native GitHub read-back is now current: the authenticated security overview showed secret scanning enabled, the alert list showed zero open alerts, and repository settings showed push protection enabled. This supersedes the earlier HTTP 401 limitation without changing any setting.
- Review corrections remain inside the existing file allowlist and finished behavior: reject ordinary alphanumeric credential literals (including later properties on a line), require a complete scanner result, and clear stale authorization with redacted diagnostics if the post-scan Git snapshot fails. Synthetic regression tests first reproduced all three failures. The former minor grading is not retained for these credential/failure-boundary defects.
- Because implementation changed, the former substantive tree and its approvals are historical only. Task 6 will be repeated for the revised candidate before Task 7 finalization.
- The approved public asset root is now visible to normal staging while adjacent private documentation remains ignored. Its ignore-policy regression failed before the narrow correction and passed afterward. Coverage also now exercises newline paths, copy records, strict type-change classification, malformed rename records, and an actual candidate change during authorization.
- Both fresh reviewers rejected the first resumed candidate. Added synthetic regressions reproduced missing browser-session, backup, nested platform-state, and Supabase temporary-state classifications; typed, member, and multiline credential literals; incorrect rejection of source references; malformed NUL records; and stale authorization/raw diagnostics after an initially corrupt or unmerged index. Corrections now classify those paths before object reads, inspect the additional literal forms while preserving source references, reject incomplete/empty NUL records, and revoke previous authorization before index-dependent commands. The temporary-state ignore regression also failed before its narrow ignore rule was added. At that point all 22 focused tests passed; the revised candidate required both reviews again.
- The next security review verified those corrections but reproduced two remaining issues: source references with comments/bracket notation and quoted placeholders were rejected, and filesystem cleanup failures could disclose a path and skip the second cleanup target. New regressions failed first. JS/TS now uses the quoted-literal matcher instead of dotenv-value parsing; both authorization cleanup targets are attempted, filesystem diagnostics are fixed messages, and a failed rename removes the temporary file when possible. The 23 focused tests pass, including write/rename failures; the candidate is again subject to both independent reviews.


## Accepted substantive evidence — 2026-09-25

- **Scope and candidate:** Exact 12-path allowlist, substantive tree A `d1f503032f0aa6f68965addbc270a760253983af`, based on GOV-001 commit `2a2ae1c2c0a0c57b76e782e17ea113768ceab815`. All non-deletion entries are ordinary text files. No application source, migration, lockfile, dependency, or deployment configuration changed.
- **Automated checks:** 23/23 public-safety tests and 49/49 full Node tests passed. Lint, translation parity, production build, scoped Biome checks, and staged whitespace checks passed. The staged public-safety command passed with 11 inspected non-deletion entries and zero findings. Manual staged-path and diff review passed without exposing deleted configuration or ignored credentials.
- **Independent review:** Security/data-integrity re-review passed against tree A after rerunning every original reproduction, the full 49-test suite, and 12 independent boundary probes. Code-quality re-review passed against the same tree with 45/45 scanner and guard tests from an exact-tree disposable materialization. Every material finding described above is fixed; neither reviewer reported an unresolved material finding.
- **Native protection:** Authenticated, read-only GitHub UI verification on 2026-09-25 showed secret scanning enabled, repository push protection enabled, and zero open secret-scanning alerts. No setting was changed and no credential was pushed. No secret incident was identified in this candidate; the deleted linkage file is the previously reviewed non-secret project reference and its local copy remains ignored and intact.
- **Browser applicability:** Application browser QA not applicable: GOV-002 changes repository hygiene, local staged-content checks, and read-only repository security verification; it does not alter application runtime, routing, rendering, Vercel build output, or user-visible behavior.
- **Deployment:** Not applicable to this non-runtime item. No push or deployment is authorized or performed.
- **Limitations:** Ignore rules, deterministic pattern matching, native secret scanning, and manual review are complementary safeguards, not complete semantic personal-data detection. A filesystem obstruction can prevent artifact removal; authorization then fails with redacted diagnostics. The build emitted the existing non-blocking Browserslist data-age warning.

### Final execution boundary

Only `ROADMAP.md` and this plan differ from accepted substantive tree A in the completion candidate. Task 7 steps 2–4 run after this evidence is frozen: repeat all gates, independently review the evidence-only delta, reconfirm the candidate, create one local commit, clear authorization, and verify committed-tree equality. Their checkboxes intentionally remain unchecked in this frozen document; the final task handoff records those observed results, final tree B, and the resulting commit ID. The staged Done entry takes effect only when that exact candidate is successfully committed. A failure leaves the task incomplete and must be reported; it never permits bypassing a gate or claiming completion.
