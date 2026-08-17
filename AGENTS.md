# Lumina Personal Finance

## Product and boundaries

- Lumina is a private-use personal-finance app focused on trustworthy daily money management.
- The source repository is public. User data, credentials, financial records, exports, receipts, database dumps, and unsanitized QA artifacts are private.
- The UI supports Spanish and English. Preserve translation parity and locale-correct dates and currency.
- Optimize for calculation correctness, privacy, convenience, accessibility, and low-maintenance reliability rather than enterprise scale.

## Stack and structure

- Vite, React, and TypeScript.
- Supabase Auth and Postgres with Row Level Security.
- Tailwind CSS and Radix/shadcn components under `src/components/ui/`.
- React Router, React Hook Form, Zod, i18next, and Recharts.
- Pages: `src/pages/`; feature/shared components: `src/components/`; data hooks: `src/hooks/`.
- Auth/sidebar contexts: `src/store/`; Supabase client and generated types: `src/supabase/`.
- Database changes: `supabase/migrations/`. Migrations are the schema source of truth.

## Current commands

- `pnpm dev` — start the app on port 5173.
- `pnpm lint` — non-mutating Biome lint.
- `pnpm check:i18n` — verify translation-key parity.
- `pnpm build` — TypeScript project build and production Vite build.
- `pnpm format` and `pnpm check` modify files; never use them as validation-only commands.

Until roadmap item GOV-003 adds `pnpm verify`, run `pnpm lint`, `pnpm check:i18n`, and `pnpm build` as the repository-wide gate.

## Task ownership

- The agent/session accepting an implementation task is its task owner from scope through final evidence.
- The task owner may delegate independent QA, UI/accessibility, security, or data-integrity reviews; delegation itself does not transfer ownership.
- The owner must resolve every material reviewer finding, rerun affected checks, and disclose any limitation.
- Planning, review, explanation, or diagnosis requests do not authorize implementation.
- Implementation requests authorize in-scope local edits, non-destructive validation, and a focused local commit after every applicable gate passes, unless the maintainer says not to commit. An intentionally uncommitted item remains In progress with review-ready evidence until commit is authorized, or becomes Deferred by explicit maintainer decision; it is not Done.
- Destructive actions, production database mutations, and material scope expansion require explicit approval.
- Push/deployment requires explicit authorization such as “deploy,” “push,” or equivalent wording. Authorization may be given at task start.
- Delegated QA retains the original task owner. Ownership changes only through an explicit handoff that the new owner accepts with the scope, diff, evidence, findings, and limitations.

## Roadmap and planning

- `ROADMAP.md` is the only status ledger. Preserve stable IDs; never silently delete work.
- Work on one active delivery item at a time. Put newly discovered work in the Inbox instead of expanding scope silently.
- Create and review a public-safe plan under `docs/plans/` before moving a Ready item to In progress.
- A completed task updates its roadmap status and adds sanitized commit/verification evidence.

## Git and release workflow

- Normal work is sequential on local `main`. Do not create branches, worktrees, or pull requests unless the maintainer explicitly changes this policy.
- Before editing, understand existing changes. Never overwrite, reset, or include unrelated user work.
- Before committing, require the active branch to be exactly `main`; detached HEAD is a stop condition.
- Keep commits focused and reversible. Never force-push or rewrite published history.
- A local commit and a production push are separate boundaries. If the available commit mechanism cannot commit without pushing, stop and leave the change uncommitted.
- Authorization applies to effects, not command names: alternate history-writing or remote-ref commands never bypass the commit or push boundary.
- Tracked command guards are defense-in-depth for supported agent tool surfaces, not a hostile-code sandbox. A missing, opaque, or bypassable hook never grants commit, push, or deployment authorization.
- Never bypass a failed quality, safety, or secret-scanning gate.
- After an authorized push, verify the Vercel deployment and smoke-test the affected production behavior.

## Public repository safety

- Follow `docs/runbooks/data-safety.md` for the complete boundary and staged-content review.
- Never commit `.env*` files other than reviewed placeholder examples.
- Never print or reproduce values from `.env.test.local`. It may be read locally only for authenticated QA.
- Use synthetic fixtures and disposable test records. Never put real account names, balances, emails, exports, receipts, logs, database dumps, or unsanitized screenshots in Git.
- Migration files contain schema and generic transformations only—never copied production rows or personal values.
- Treat a real secret alert as a blocker; do not bypass it.

## Financial, auth, and database invariants

- Financial totals must be traceable to source records and use deterministic, tested rules.
- Do not hide reconciliation differences with silent adjustments or presentation-only fixes.
- Transfers, debt movements, taxes/fees, dates, signs, and currency rounding need regression coverage when changed.
- Sensitive routes and data operations require authenticated ownership checks; client filtering does not replace RLS.
- Every new or changed table/view/function must receive an explicit privilege and RLS review.
- Use backward-compatible migrations and regenerate `src/supabase/database.types.ts` after schema changes.
- Destructive or irreversible migrations require explicit approval, a private backup/recovery plan, and current Supabase advisor review.

## UI and behavior QA

- Follow `docs/standards/definition-of-done.md` for applicability and evidence.
- User-visible behavior changes require a real browser; source inspection and automated tests alone are insufficient.
- Before browser testing, record the affected routes/consumers, highest-impact plausible failure, source-of-truth boundary, safe backend class, and required reviewer workflows.
- Browser cases must cover the primary path, risk-matched failure and successful recovery, impact-based regressions, authoritative persistence, and triggered auth boundaries.
- UI changes also require deterministic desktop/mobile viewports, visual inspection, keyboard and accessibility checks, affected states, and both languages when triggered.
- Use any capable browser driver available in the current environment. Do not encode one product as the only valid browser.
- If browser access or safe test data is unavailable, do not claim behavior/UI QA passed; report the task blocked or incomplete.
- Documentation-only changes may mark browser QA not applicable with a concrete reason.

## Change-specific gates

Every change satisfies every matching row in the reviewer trigger matrix in `docs/standards/definition-of-done.md`, in addition to these gates:

- Logic/financial change: focused regression tests, repository-wide gate, and the security/data-integrity reviewer workflow for financial behavior.
- UI/behavior change: focused tests, repository-wide gate, browser QA, and the mandatory reviewer workflows selected by the definition-of-done trigger matrix.
- Auth/security change: triggered auth scenarios plus the security/data-integrity reviewer workflow.
- Supabase change: migration review, generated types, RLS/privilege checks, relevant tests, current advisors, and the security/data-integrity reviewer workflow.
- Deployment configuration change: local production-equivalent build, documented smoke/rollback path, and the release-risk reviewer workflow.

## Stop conditions

Stop and report rather than guessing when:

- Git is detached, not on intended `main`, or contains inseparable unrelated changes.
- Required automated validation fails.
- Browser validation is required but cannot be performed or reproduced safely.
- A material QA, accessibility, security, or data-integrity finding remains unresolved.
- A staged file may contain a secret, personal data, or a private artifact.
- An external/destructive action lacks authorization or recovery preparation.
- Production smoke testing fails after deployment.

## Instruction architecture

- This file is the canonical repository contract. State each durable rule once.
- Detailed procedures belong in standards, runbooks, plans, or portable `SKILL.md` workflows.
- Tool-specific files are optional thin adapters and must not duplicate or override this policy.
- Legacy tracked provider automation remains non-authoritative until roadmap item GOV-007 removes or reduces it.
- Keep generic installed skills local. Track only project-specific workflows that are safe and useful in a public clone.
