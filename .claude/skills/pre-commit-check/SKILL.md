---
name: pre-commit-check
description: Pre-commit quality gate — validates build output (catches warnings and errors, not just exit codes), scans for security issues (leaked credentials, hardcoded secrets, vulnerable patterns), and checks for other common commit pitfalls. Use this skill before committing changes, when the user says "commit", "ready to commit", "pre-commit check", "validate before commit", "check before I commit", "is this ready to commit", or anything suggesting they want to verify code quality before a git commit.
---

# Pre-Commit Check

Run a series of validations on the current changes before they get committed. The goal is to catch problems that are easy to miss — build warnings buried in output, credentials left in code, debug leftovers, and other things that shouldn't land in git history.

## Step 1: Determine What Changed

Figure out what code is being committed by checking the git state:

1. Run `git diff --cached --name-only` to see staged files
2. If nothing is staged, run `git diff --name-only` to see unstaged changes
3. If the branch has no local changes at all, fall back to `git diff main...HEAD --name-only` to get all files changed on this branch
4. If there are truly no changes anywhere, tell the user there's nothing to check

Save this file list — you'll reference it in later steps. Also save the full diff content (`git diff --cached` or equivalent) for the security review.

## Step 2: Validate the Build

The point here is not just "did the build command exit 0" — it's "is the build output clean?" A build can succeed while spitting out TypeScript errors, deprecation warnings, or other signals that something is off.

1. Detect the build command from `package.json` scripts (look for `build`, `tsc`, or similar)
2. Run the build command and capture ALL output (stdout and stderr)
3. Parse the output for:
   - **Errors**: TypeScript errors, compilation failures, module resolution issues
   - **Warnings**: deprecation notices, unused imports/variables flagged by the compiler, type coercion warnings, any line containing "warning" or "warn" in a diagnostic context
   - **Suspicious patterns**: "TODO" or "FIXME" in build output, missing dependencies
4. If the build exit code is non-zero, that's an obvious failure — report it
5. If the build exits 0 but has warnings or errors in the output, flag each one with the relevant log line

Report format:
```
BUILD: [PASS|FAIL]
  - [ERROR] <description with file:line if available>
  - [WARNING] <description with context>
```

If the build is completely clean (exit 0, no warnings, no errors), report `BUILD: PASS (clean)`.

## Step 3: Security Review

Spawn the `security-reviewer` subagent and pass it the diff content from Step 1. The subagent already knows how to check for RLS gaps, exposed credentials, input validation issues, and other security concerns specific to this project.

In addition to the subagent, do your own pass on the diff looking for things the subagent might not catch:

- **Hardcoded secrets**: API keys, passwords, tokens, connection strings in source files (not just `.env`)
- **Sensitive files being committed**: `.env`, `.env.local`, credentials files, private keys — check if any are in the staged changes
- **Console.log with sensitive data**: logging of tokens, passwords, user data
- **Commented-out code with secrets**: sometimes people comment out a line with a real key instead of deleting it
- **Hardcoded URLs pointing to production**: database URLs, API endpoints that should come from env vars

Report format (same as the security-reviewer subagent):
```
SECURITY: [PASS|ISSUES FOUND]
  [CRITICAL|HIGH|MEDIUM|LOW] file:line — description
```

## Step 4: Code Hygiene Check

Scan the changed files for common pre-commit issues:

- **Debug leftovers**: `console.log`, `debugger` statements, `alert()` calls that look like debugging (not intentional UI)
- **Conflict markers**: `<<<<<<<`, `=======`, `>>>>>>>` — sometimes these slip through
- **Large files**: any changed file over 500KB that probably shouldn't be in the repo (images, data dumps, compiled assets)
- **TODO/FIXME in new code**: not a blocker, but worth flagging so the user is aware they're committing unfinished work

Report format:
```
HYGIENE: [CLEAN|ISSUES FOUND]
  - [INFO|WARNING] file:line — description
```

## Step 5: Summary Report

Combine all findings into a single report. Lead with the overall verdict, then the details.

```
## Pre-Commit Report

**Verdict: [READY TO COMMIT | ISSUES FOUND — review before committing]**

### Build
<build results>

### Security
<security results>

### Code Hygiene
<hygiene results>
```

If everything is clean, keep it short: "All checks passed. Ready to commit."

If there are issues, list them clearly so the user can ask you to fix them. Prioritize by severity — CRITICAL and HIGH first, then warnings, then info.
