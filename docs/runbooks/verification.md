# Repository Verification

From the project root in a Git checkout, with Git available and dependencies installed from the committed lockfile, run:

```sh
pnpm verify
```

Use pnpm 10.31.0 as declared in `package.json`. Node 22 and 24 LTS are the compatibility targets checked for this gate. Existing safety tests inspect checkout ignore rules and create disposable Git repositories, so a source archive without Git metadata is not a supported verification environment. Do not change a machine-wide runtime or deployment setting to run verification; use an already available compatible runtime or report the missing prerequisite.

## Command contract

The aggregate runs these commands sequentially and returns nonzero as soon as one fails:

| Command | What it proves |
| --- | --- |
| `pnpm format:check` | Files satisfy the existing Biome formatting configuration, without applying fixes. |
| `pnpm lint` | Existing Biome lint rules pass. |
| `pnpm typecheck` | TypeScript project references pass their checks. |
| `pnpm check:i18n` | The existing Spanish/English translation-key parity check passes. |
| `pnpm test` | All regular `*.test.mjs` files recursively under `tests/` pass. Empty or unreadable discovery, child-process failure, and extra launcher arguments fail. Symlink targets are not followed. |
| `pnpm build` | The standalone TypeScript and Vite production build passes. |

The repeated TypeScript check inside `build` intentionally preserves that command's standalone contract; normal incremental caches make it inexpensive. The test launcher passes explicit file arguments to the current Node executable without shell glob expansion. Its test scope excludes unrelated tooling outside `tests/`.

“Source-preserving” means verification does not format/fix source, stage files, write history, contact a data backend, or deploy. It produces normal ignored `dist/` output and TypeScript caches in `node_modules/.tmp/`. Tests create and clean up disposable local fixtures. Never use `pnpm format` or `pnpm check` as validation-only commands: those apply edits.

## Failure and recovery

1. Read the first failing component and fix the relevant source or configuration within the active task. Do not skip or suppress the component.
2. Run its focused command to prove the correction, then run the full aggregate.
3. Review the working-tree diff to ensure validation did not introduce unexpected source changes.
4. Stage the explicit task allowlist. Run `pnpm check:public-safety`, inspect staged paths and content, and check whitespace before candidate-bound commit authorization.

The staged public-safety scan is deliberately separate: verification evaluates working source, while public-safety evaluates the exact index tree. A clean verification result does not authorize commit, push, or deployment and does not replace browser QA or triggered reviewer workflows.

## Vercel build and activation

The committed `vercel.json` selects `pnpm run verify` as `buildCommand`; the aggregate ends in the existing standalone build and never invokes itself recursively. The existing SPA rewrite remains unchanged. Vercel documents that this property overrides the deployment's dashboard/package build command. [Configuration reference](https://vercel.com/docs/project-configuration/vercel-json#buildcommand).

No dashboard change is needed. The configuration takes effect only when Vercel builds the corresponding commit. Before an authorized push, confirm the intended local commits and current runtime compatibility, rerun the full gate, and retain the prior production deployment as the recovery target. If a connector needs reauthentication, restore access or use another authorized read-only interface; never infer remote success from local results.

After the authorized push:

1. Identify the Vercel deployment for the exact pushed commit.
2. Inspect sanitized build evidence for all six verification stages and successful production output. Check the actual Node/pnpm versions and dependency installation; no stage may be skipped.
3. Verify the deployment reaches success and serves the production login route `/` and a protected deep link while logged out, including a reload and asset/console checks. Avoid login and data mutation unless separately required and safely authorized.
4. Record the exact-commit deployment and smoke result in ROADMAP. Until this evidence exists, GOV-003 remains Awaiting deployment and occupies the active delivery slot.

A build failure must not trigger a bypass. Confirm the prior deployment still serves, fix the candidate, and repeat verification. If an authorized deployment serves broken output, stop and use an explicitly authorized rollback to the prior deployment or a reviewed normal revert/fix commit. Never force-push or change a database as part of this gate.

## Local output smoke test

For a build-only change, freeze the candidate tree and build with explicitly synthetic local backend values. Start a fresh loopback preview process and use a fresh browser context. Confirm login renders, required assets load, a protected deep link redirects without private content, and reload preserves the expected public surface. Record expected fixture-specific failures separately; this does not establish production backend or deployment health.

No financial or authenticated writes are needed. Compare build artifacts under identical synthetic inputs when claiming output equivalence. Preserve ignored credentials without reading or printing them, and stop preview processes after QA.
