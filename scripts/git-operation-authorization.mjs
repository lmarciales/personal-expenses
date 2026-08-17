import { execFileSync } from "node:child_process";
import { renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getAuthorizationPath, getRepositoryState } from "./git-operation-guard.mjs";

const authorizationLifetimeMs = 10 * 60 * 1000;

function fail(message) {
  process.stderr.write(`BLOCKED: ${message}\n`);
  process.exitCode = 2;
}

function hasStagedChanges(root) {
  try {
    execFileSync("git", ["diff", "--cached", "--quiet"], {
      cwd: root,
      stdio: "ignore",
    });
    return false;
  } catch (error) {
    if (error.status === 1) {
      return true;
    }
    throw new Error("The staged candidate could not be inspected.");
  }
}

function readTask(args) {
  const taskIndex = args.indexOf("--task");
  const task = taskIndex >= 0 ? args[taskIndex + 1] : null;
  if (!task || !/^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/.test(task)) {
    throw new Error("A safe task identifier is required with --task.");
  }
  return task;
}

function authorizeCommit(args) {
  const task = readTask(args);
  const state = getRepositoryState(process.cwd());

  if (state.branch !== "main") {
    throw new Error("Local commits are authorized only on main.");
  }
  if (!hasStagedChanges(state.root)) {
    throw new Error("The staged candidate is empty.");
  }

  const issuedAt = new Date();
  const authorization = {
    version: 1,
    operation: "commit",
    task,
    branch: state.branch,
    head: state.head,
    tree: state.indexTree,
    issuedAt: issuedAt.toISOString(),
    expiresAt: new Date(issuedAt.getTime() + authorizationLifetimeMs).toISOString(),
  };
  const destination = getAuthorizationPath(state, "commit");
  const temporary = `${destination}.${process.pid}.tmp`;

  writeFileSync(temporary, `${JSON.stringify(authorization)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  renameSync(temporary, destination);
  process.stdout.write(`Commit authorization created for main tree ${state.indexTree.slice(0, 12)}.\n`);
}

function clearCommit() {
  const state = getRepositoryState(process.cwd());
  rmSync(getAuthorizationPath(state, "commit"), { force: true });
  process.stdout.write("Commit authorization cleared.\n");
}

const [action, ...args] = process.argv.slice(2);

try {
  if (action === "authorize-commit") {
    authorizeCommit(args);
  } else if (action === "clear-commit") {
    clearCommit();
  } else {
    fail("Use authorize-commit --task <id> or clear-commit.");
  }
} catch (error) {
  fail(error instanceof Error ? error.message : "Authorization failed.");
}
