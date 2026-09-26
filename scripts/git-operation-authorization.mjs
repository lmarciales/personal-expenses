import { execFileSync } from "node:child_process";
import { renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PublicSafetyInspectionError, defaultRunGit, scanStagedCandidate } from "./check-public-safety.mjs";
import { getAuthorizationPath } from "./git-operation-guard.mjs";

const authorizationLifetimeMs = 10 * 60 * 1000;

class AuthorizationError extends Error {}

function launchedAsCli() {
  if (!process.argv[1]) {
    return false;
  }
  try {
    return pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
  } catch {
    return false;
  }
}

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
    throw new AuthorizationError("The staged candidate could not be inspected.");
  }
}

function readTask(args) {
  const taskIndex = args.indexOf("--task");
  const task = taskIndex >= 0 ? args[taskIndex + 1] : null;
  if (!task || !/^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/.test(task)) {
    throw new AuthorizationError("A safe task identifier is required with --task.");
  }
  return task;
}

function clearAuthorizationArtifacts(state) {
  let failed = false;
  for (const filename of ["agent-commit-authorization.json", "agent-push-authorization.json"]) {
    try {
      rmSync(path.join(state.gitDirectory, filename), { force: true });
    } catch {
      failed = true;
    }
  }
  if (failed) {
    throw new AuthorizationError("Authorization state could not be cleared.");
  }
}

function repositoryLocation(cwd) {
  const root = defaultRunGit(cwd, ["rev-parse", "--show-toplevel"]).trim();
  const gitDirectory = defaultRunGit(root, ["rev-parse", "--absolute-git-dir"]).trim();
  return { root, gitDirectory };
}

export function authorizeCommit(args, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const scan = options.scan ?? scanStagedCandidate;
  const task = readTask(args);
  // Locate and revoke earlier authorizations before any index-dependent command.
  const state = repositoryLocation(cwd);
  clearAuthorizationArtifacts(state);
  state.branch = defaultRunGit(state.root, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
  state.head = defaultRunGit(state.root, ["rev-parse", "HEAD"]).trim();

  if (state.branch !== "main") {
    clearAuthorizationArtifacts(state);
    throw new AuthorizationError("Local commits are authorized only on main.");
  }
  if (!hasStagedChanges(state.root)) {
    clearAuthorizationArtifacts(state);
    throw new AuthorizationError("The staged candidate is empty.");
  }

  let scanResult;
  try {
    scanResult = scan({ cwd: state.root });
  } catch {
    clearAuthorizationArtifacts(state);
    throw new AuthorizationError("The staged candidate could not be inspected.");
  }
  if (!Array.isArray(scanResult?.findings) || scanResult.findings.length > 0) {
    clearAuthorizationArtifacts(state);
    throw new AuthorizationError("The staged candidate failed the public-safety check.");
  }

  let freshTree;
  try {
    freshTree = execFileSync("git", ["write-tree"], {
      cwd: state.root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    clearAuthorizationArtifacts(state);
    throw new AuthorizationError("The staged candidate could not be inspected.");
  }
  if (freshTree !== scanResult.tree) {
    clearAuthorizationArtifacts(state);
    throw new AuthorizationError("The staged candidate changed during inspection.");
  }

  const issuedAt = new Date();
  const authorization = {
    version: 1,
    operation: "commit",
    task,
    branch: state.branch,
    head: state.head,
    tree: freshTree,
    issuedAt: issuedAt.toISOString(),
    expiresAt: new Date(issuedAt.getTime() + authorizationLifetimeMs).toISOString(),
  };
  const destination = getAuthorizationPath(state, "commit");
  const temporary = `${destination}.${process.pid}.tmp`;

  let temporaryCreated = false;
  try {
    writeFileSync(temporary, `${JSON.stringify(authorization)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    temporaryCreated = true;
    renameSync(temporary, destination);
  } catch {
    if (temporaryCreated) {
      try {
        rmSync(temporary, { force: true });
      } catch {
        // Cleanup is best effort; never expose a filesystem path in diagnostics.
      }
    }
    throw new AuthorizationError("Authorization state could not be written.");
  }
  process.stdout.write(`Commit authorization created for main tree ${freshTree.slice(0, 12)}.\n`);
}

export function clearCommit(cwd = process.cwd()) {
  const state = repositoryLocation(cwd);
  clearAuthorizationArtifacts(state);
  process.stdout.write("Commit authorization cleared.\n");
}

if (launchedAsCli()) {
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
    fail(
      error instanceof AuthorizationError || error instanceof PublicSafetyInspectionError
        ? error.message
        : "Authorization failed.",
    );
  }
}
