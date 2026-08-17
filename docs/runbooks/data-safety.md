# Public Repository Data-Safety Runbook

Lumina's code and public documentation may be shared; the maintainer's identity details, credentials, financial data, exports, receipts, database contents, and local QA evidence may not.

## Allowed public content

- Application source and generic database migrations.
- Empty or obviously fake placeholder configuration examples.
- Synthetic test fixtures with invented names and values.
- Generic product documentation, plans, and sanitized verification summaries.
- Deliberately public UI assets that contain no personal or production information.

## Forbidden tracked content

- `.env`, `.env.*`, local credential files, tokens, passwords, private keys, service-role keys, or authenticated session material.
- Real names, email addresses, account identifiers, balances, transactions, debts, notes, categories containing personal context, or financial institution exports.
- Production database dumps, backups, copied table rows, storage exports, or Supabase diagnostic output containing user records.
- Receipts, statements, identity documents, downloaded reports, or attachments.
- Logs, browser profiles, traces, videos, or screenshots that expose credentials, routes with private parameters, account data, notifications, or desktop information.
- Machine-specific paths or configuration that unnecessarily reveals the maintainer's local username or private directory structure.
- Temporary agent state, commit markers, tool caches, or locally installed skill libraries.

## Local credentials and authenticated QA

- Test login values live only in `.env.test.local` using `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`.
- An authorized local QA process may load these values internally and send them directly to the login fields only when neither the values nor the input payload can appear in tool arguments, process output, logs, traces, screenshots, or artifacts.
- Permitted entry methods are non-logging direct typing/set-value inside that local process or an operating-system secure credential facility.
- Do not place credentials in a prompt, model-visible tool call, command argument, URL, clipboard, temporary script, plan, test fixture, log, trace, screenshot, or commit.
- If the available browser driver requires a model-visible value or clipboard-backed entry, authenticated QA is Blocked until a safe entry path is available.
- If credentials appear in output or an artifact, stop, keep the artifact out of Git, and treat credential rotation as a separate security decision.

## Test records and error-path safety

- Before any browser write, identify only the backend class (`local`, `dedicated test`, `preview`, or `production`) without recording its URL, project identifier, or credentials.
- Default to a dedicated non-personal test project or tenant with synthetic identities.
- If the only available target is production, browser mutation requires explicit production-mutation authorization and an isolated synthetic or non-destructive path. Otherwise stop.
- Prefer existing disposable test data or create records with clearly synthetic labels.
- Use the smallest number of temporary records necessary.
- Do not alter unrelated real financial records to prove validation or error behavior.
- Record temporary identifiers privately when cleanup requires them; do not add them to public evidence.
- Clean up temporary records when deletion is safe, then verify the cleanup.
- Record cleanup as a sanitized case result, or explain why an intentionally retained synthetic fixture is safe.
- If cleanup could be destructive or ambiguous, stop and ask rather than deleting broadly.

## Screenshots, videos, traces, and exports

- Store real-data QA artifacts outside the repository in an explicitly private location.
- Do not move them into `docs/`, GitHub Issues, commit messages, or public task evidence.
- A visual fixture may be tracked only when all content is synthetic, its public purpose is explicit, and the staged review confirms no desktop or account metadata is visible.
- Financial exports and backups remain private even if encrypted; encryption does not make them appropriate source artifacts.

## Before editing ignore rules

1. Inventory ignored files that could become visible.
2. Prefer narrow allowlists over unignoring an entire directory containing local tools or legacy artifacts.
3. Re-run `git status --short --untracked-files=all` immediately after the change.
4. Confirm only expected public files became visible.

## Before a local commit

1. Confirm the active task's explicit file allowlist.
2. Inspect `git status --short --untracked-files=all`.
3. Inspect the staged file names individually; never rely on a broad add operation.
4. Review the staged diff and any binary file metadata.
5. Search candidate text for common secret markers, private keys, credential assignments, service-role references, real emails, machine-specific user paths, and copied financial data.
6. Run the repository public-safety check when GOV-002 provides it.
7. If uncertain whether content is public-safe, do not commit it; request review.

## Secret-scanning response

- Never bypass a finding that may be a real secret.
- Remove the value from the commit candidate and determine whether it exists in earlier Git history.
- Rotate or revoke exposed credentials before treating the repository cleanup as complete.
- A false-positive dismissal requires evidence that the value is synthetic or non-secret; record only a sanitized reason.

## Public evidence

Completion evidence may name routes, generic workflows, viewports, languages, commands, pass/fail results, finding counts, commit IDs, and public deployment status.

It must not include credentials, raw environment values, real financial values, private record identifiers, private URLs, exported rows, or unsanitized media.
