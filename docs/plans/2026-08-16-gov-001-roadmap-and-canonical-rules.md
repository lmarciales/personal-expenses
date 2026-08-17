# GOV-001 Roadmap and Canonical Rules Implementation Plan

> **For task owners:** Execute this plan sequentially on local `main`. Do not create a branch, worktree, or pull request. The task owner remains accountable for implementation, review findings, validation, and final evidence. Steps use checkbox syntax for durable progress tracking.

**Goal:** Establish the reviewed roadmap and one concise, vendor-neutral repository instruction contract without changing application behavior.

**Architecture:** `ROADMAP.md` owns work status; `AGENTS.md` owns durable instructions; detailed standards and runbooks are linked rather than duplicated. Tool-specific instruction files become thin compatibility adapters. Public documentation is allowlisted while legacy ignored plans remain local.

**Tech stack:** Markdown, Git ignore rules, existing repository scripts and package commands.

## Global constraints

- Work only on the real local `main` branch; detached HEAD is a stop condition.
- Do not push without explicit deploy authorization.
- Do not expose local credentials, personal financial data, private QA artifacts, or machine-specific personal paths.
- Do not modify runtime application behavior in this item.
- Preserve unrelated user changes and ignored legacy documents.
- Browser QA is not applicable to this governance and local-tooling item; record that reason instead of manufacturing UI evidence.

## Risk, source of truth, test data, and rollback

- **Primary risks:** contradictory agent instructions, an unsafe or overclaimed command guard, accidental inclusion of private repository artifacts, and treating a local commit as deploy authorization.
- **Source of truth:** the resulting tracked repository tree is authoritative for this item: `ROADMAP.md` owns status, `AGENTS.md` owns durable policy, and the canonical scripts own supported command decisions. No application database, production service, or user-facing runtime state changes.
- **Test-data strategy:** command-guard tests create disposable temporary Git repositories with synthetic files, the reserved `example.invalid` email domain, and no Supabase connection or personal financial records. Browser and authenticated application fixtures are not applicable because no application behavior changes.
- **Rollback and recovery:** before commit, clear any temporary authorization and leave the reviewed working tree intact if a gate fails. After the local completion commit, recovery is a normal authorized revert/fix commit on `main`; no database, Vercel, or production rollback is required because push and deployment are outside this item.

## Files

- Create: `ROADMAP.md` — canonical status ledger and phase inventory.
- Create: `docs/specs/2026-08-16-agent-governance-and-qa-design.md` — approved design and ownership/QA contract.
- Create: `docs/plans/2026-08-16-gov-001-roadmap-and-canonical-rules.md` — this execution plan.
- Modify: `.gitignore` — track only reviewed public documentation directories while legacy/private docs stay ignored.
- Modify: `AGENTS.md` — concise canonical repository contract.
- Modify: `CLAUDE.md` — thin `@AGENTS.md` compatibility adapter only.
- Create: `docs/standards/definition-of-done.md` — change-type validation and evidence matrix.
- Create: `docs/runbooks/data-safety.md` — public repository and test-data boundary.
- Create: `scripts/git-operation-guard.mjs` — canonical operation-specific Git authorization guard.
- Create: `scripts/git-operation-authorization.mjs` — creates and clears candidate-bound local-commit authorization.
- Create: `tests/gitOperationGuard.test.mjs` — executable commit/push boundary regression coverage.
- Modify: `.codex/hooks/git-commit-guard.js` and `.claude/hooks/git-commit-guard.js` — thin adapters to the canonical guard.
- Modify: `.codex/agents/commit-agent.toml` and `.claude/agents/commit-agent.md` — commit-only compatibility adapters.
- Modify: `.codex/hooks.json` — portable hook command without a machine-specific path.

## Task 1: Validate documentation scope and Git state

- [x] **Step 1: Confirm all newly public documents are generic and sanitized**

Review `ROADMAP.md`, the governance design, and this plan. Search for credentials, real emails, account names, balances, local test values, private URLs, exports, and screenshots. The only allowed environment-variable examples are names with empty or obviously fake placeholder values.

- [x] **Step 2: Verify ignore behavior**

Run:

```powershell
git check-ignore -v docs/superpowers/plans/2026-06-01-dashboard-attention-radar.md
git check-ignore -v docs/specs/2026-08-16-agent-governance-and-qa-design.md
git check-ignore -v docs/plans/2026-08-16-gov-001-roadmap-and-canonical-rules.md
```

Expected:

- The legacy `docs/superpowers/...` file remains ignored.
- The new `docs/specs/...` and `docs/plans/...` files are not ignored.

- [x] **Step 3: Attach the checkout to local main before later commit work**

First verify `HEAD`, local `main`, and `origin/main` still identify the same commit and that no unexpected remote or working-tree state exists. If they differ, stop and report the divergence. If they match, switch to the existing local `main` without resetting or discarding files.

Expected: `git branch --show-current` returns exactly `main` and all current changes remain present.

## Task 2: Replace duplicated instructions with the canonical contract

- [x] **Step 1: Rewrite `AGENTS.md` around durable rules only**

Include concise sections for:

- purpose and public-code/private-data boundary;
- authoritative commands and architecture pointers;
- task-owner end-to-end responsibility;
- roadmap and one-item work-in-progress policy;
- local-main/no-PR/no-worktree workflow;
- explicit commit versus deploy authorization;
- financial, auth, Supabase, UI, accessibility, and browser-QA gates;
- stop conditions;
- links to the roadmap, definition of done, data-safety runbook, and portable workflows.

Remove the generated skill catalogue and any named model, provider subscription, automatic push, or vendor-specific co-author requirement.

- [x] **Step 2: Reduce `CLAUDE.md` to the compatibility import**

Use exactly:

```markdown
@AGENTS.md
```

Do not add duplicate policy below the import.

- [x] **Step 3: Check concision and contradictions**

Run searches that confirm:

- `AGENTS.md` contains each rule once;
- no model names or subscription requirements remain;
- no instruction requires PRs or worktrees;
- push requires explicit deploy authorization;
- task ownership and browser QA are both present;
- `CLAUDE.md` contains no independent policy.

## Task 3: Add the definition of done and data-safety runbook

- [x] **Step 1: Create `docs/standards/definition-of-done.md`**

Define applicability and evidence for:

- documentation/configuration-only changes;
- logic and financial-calculation changes;
- UI and user-visible behavior changes;
- authentication/security changes;
- Supabase schema/query/RLS changes;
- deployment and production verification.

For behavior/UI work, make the operational standard reproducible: pre-QA impact map and backend preflight; primary path; highest-impact safely testable failure and successful recovery; authoritative persistence; triggered auth scenarios; impact-based regressions; deterministic viewports/languages; console/network evidence; accessibility depth; cleanup; and one complete evidence record per case.

- [x] **Step 2: Create `docs/runbooks/data-safety.md`**

Define:

- forbidden tracked artifacts and explicit safe examples;
- local test credential handling without echoing values;
- synthetic fixture and screenshot requirements;
- safe temporary record creation and cleanup;
- staged-path and diff review;
- secret-warning behavior: never bypass a real finding;
- escalation when an artifact's public safety is uncertain.

- [x] **Step 3: Cross-link without duplicating**

Ensure `AGENTS.md` contains short invariants and links, while the detailed matrices live only in the standard and runbook.

## Task 4: Independent governance and QA review

- [x] **Step 1: Request a policy review from a fresh reviewer**

Provide the raw changed files and ask whether a future task owner can determine:

- what it owns end to end;
- when browser QA is mandatory;
- what happy, error, and regression cases mean;
- when specialist review triggers;
- what blocks commit or deploy;
- where work status lives;
- how the policy stays provider-neutral.

Do not provide the intended verdict or a summary of suspected gaps.

- [x] **Step 2: Request a public-safety review from a separate reviewer**

Ask the reviewer to inspect only the staged candidate files and identify secrets, personal data, machine-specific paths, unsafe example data, ignored-directory mistakes, or instructions that could publish QA artifacts.

- [x] **Step 3: Resolve findings as task owner**

Classify each finding as material, minor, or not applicable. Fix every material finding, document any evidence-based rejection, and rerun the affected review/check.

## Task 5: Validate the governance and commit-tooling change

- [x] **Step 1: Run repository-safe validation**

Run:

```powershell
git diff --check
pnpm lint
pnpm check:i18n
pnpm build
```

Expected: all commands exit successfully without modifying source files.

- [x] **Step 2: Inspect scope and public content**

Review the exact changed and untracked file list. Inspect the complete diff for the files in this plan. Confirm no existing ignored `.agents/`, `.codex/skills/`, legacy `docs/superpowers/`, environment files, logs, or private artifacts would be included.

- [x] **Step 3: Record QA applicability**

Record: “Browser QA not applicable: GOV-001 changes only repository governance, local agent adapters, and commit-safety tooling; no application runtime behavior or rendered UI changed.”

- [x] **Step 4: Update roadmap evidence**

After all review and validation passes, change GOV-001 to Done and link its sanitized completion-evidence section. Report the resulting local commit identifier in the final handoff rather than attempting to place a commit's own hash inside itself. Move GOV-002 to Ready only if the maintainer approves continuing Phase 0.

## Task 6: Local commit boundary

- [x] **Step 1: Prepare an explicit file allowlist**

The candidate commit may contain only:

```text
.gitignore
AGENTS.md
CLAUDE.md
ROADMAP.md
docs/specs/2026-08-16-agent-governance-and-qa-design.md
docs/plans/2026-08-16-gov-001-roadmap-and-canonical-rules.md
docs/standards/definition-of-done.md
docs/runbooks/data-safety.md
scripts/git-operation-guard.mjs
scripts/git-operation-authorization.mjs
tests/gitOperationGuard.test.mjs
.codex/hooks/git-commit-guard.js
.codex/hooks.json
.codex/agents/commit-agent.toml
.claude/hooks/git-commit-guard.js
.claude/agents/commit-agent.md
```

- [x] **Step 2: Separate commit and push authorization**

Add a tested canonical guard with short-lived, candidate-bound local-commit authorization. Commit authorization never permits push, and the tracked workflow exposes no push-authorization capability until GOV-005 supplies an explicit release gate. For supported command events, direct and representative compound, retargeted, nested-shell, alias, dynamic-launcher, environment-wrapper, unsupported-flag, configuration-override, malformed-input, remote-write-equivalent, and history/ref-writing Git cases fail closed; both provider adapters make identical decisions when given the same envelope. Rejections redact raw command fragments. The guard is defense in depth rather than an adversarial shell sandbox, so the repository contract remains authoritative for opaque or unrecognized execution paths. Rewrite legacy commit agents as thin commit-only adapters with no model, co-author, fallback-on-failure, pull, or push instruction.

- [x] **Step 3: Create the transactional completion commit through the authorized commit-only mechanism**

Stage only the allowlisted files, run the complete pre-commit gate, bind authorization to the staged tree on local `main`, create the commit, remove authorization state, and prove the committed tree equals the tested staged tree.

- [x] **Step 4: Do not deploy**

Report the local commit and validation evidence. Do not push or deploy; repository policy prohibits both and the tracked workflow provides no push authorization until GOV-005 implements and validates the separate explicit release mechanism.

## Completion evidence recorded by the completion commit — 2026-08-16

- **Git state:** Local `main`; base `aa4a1a5`; the explicit allowlist above is the complete candidate scope.
- **Automated:** `pnpm lint`, `pnpm check:i18n`, `pnpm build`, and all 26 subtests across five Node test files passed. Biome formatting/import checks for the new scripts and tests and `git diff --check` also passed.
- **Browser:** Not applicable. GOV-001 changes repository governance and local agent tooling only; no application runtime behavior or rendered UI changed.
- **Independent reviews:** Governance consistency, public-repository safety, browser-QA enforceability, commit-gate quality, security, and guard design all passed after their material findings were resolved and re-reviewed.
- **Public safety:** No secret-like value, personal data, private URL, absolute machine path, or unintended local skill/tool file is in the candidate set.
- **Host-hook limitation:** The current free-form orchestration surface does not emit the nested direct-command hook event in this runtime, and the direct command event can omit the effective tool working directory. GOV-001 does not claim enforcement for context the host does not provide. INBOX-001 preserves the follow-up for GOV-005/GOV-007; the repository contract and explicit candidate-bound commit workflow remain authoritative.
- **Delivery:** The commit containing this record is the validated local completion commit; its ID is reported in the final handoff. Push and production deployment remain unauthorized and were not performed.

## Self-review checklist

- [x] Every approved ownership and QA requirement maps to a plan step.
- [x] No unfinished placeholder marker or deferred verification instruction remains.
- [x] All named files have one responsibility and consistent paths.
- [x] The plan does not introduce PRs, branches, worktrees, provider requirements, runtime behavior, or automatic push.
- [x] Governance/tooling browser-QA applicability is explicit.
