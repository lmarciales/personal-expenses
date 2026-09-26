import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  decodeUtf8Strict,
  inspectCandidateBlob,
  inspectCandidatePath,
  inspectText,
  isBinaryMedia,
} from "./public-safety-policy.mjs";

export class PublicSafetyInspectionError extends Error {
  constructor() {
    super("The staged candidate could not be inspected.");
    this.name = "PublicSafetyInspectionError";
  }
}

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

export function defaultRunGit(cwd, args, options = {}) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: options.encoding === "buffer" ? undefined : options.encoding ?? "utf8",
      input: options.input,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    throw new PublicSafetyInspectionError();
  }
}

function gitText(runGit, cwd, args) {
  const output = runGit(cwd, args, { encoding: "utf8" });
  if (typeof output !== "string") {
    throw new PublicSafetyInspectionError();
  }
  return output.replace(/\r?\n$/, "");
}

function gitBuffer(runGit, cwd, args) {
  const output = runGit(cwd, args, { encoding: "buffer" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output);
}

function splitNul(buffer) {
  if (buffer.length > 0 && buffer[buffer.length - 1] !== 0) {
    throw new PublicSafetyInspectionError();
  }
  const parts = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] === 0) {
      if (index === start) {
        throw new PublicSafetyInspectionError();
      }
      parts.push(buffer.subarray(start, index).toString("utf8"));
      start = index + 1;
    }
  }
  return parts;
}

function parseRawDiff(buffer) {
  const parts = splitNul(buffer);
  const entries = [];
  let index = 0;
  while (index < parts.length) {
    const header = parts[index];
    const match = /^:([0-7]{6}) ([0-7]{6}) ([0-9a-f]+) ([0-9a-f]+) ([A-Z][0-9]*)$/.exec(header);
    if (!match) {
      throw new PublicSafetyInspectionError();
    }
    const [, srcMode, dstMode, srcOid, dstOid, status] = match;
    const statusKind = status[0];
    if (statusKind === "R" || statusKind === "C") {
      const srcPath = parts[index + 1];
      const dstPath = parts[index + 2];
      if (!srcPath || !dstPath) {
        throw new PublicSafetyInspectionError();
      }
      entries.push({ srcMode, dstMode, srcOid, dstOid, status, statusKind, path: dstPath });
      index += 3;
      continue;
    }
    const destination = parts[index + 1];
    if (destination == null) {
      throw new PublicSafetyInspectionError();
    }
    entries.push({ srcMode, dstMode, srcOid, dstOid, status, statusKind, path: destination });
    index += 2;
  }
  return entries;
}

function candidateId(ordinal) {
  return `candidate-${String(ordinal).padStart(3, "0")}`;
}

function attachFinding(entryFinding, ordinal) {
  return {
    code: entryFinding.code,
    candidateId: candidateId(ordinal),
    ...(Number.isInteger(entryFinding.line) ? { line: entryFinding.line } : {}),
  };
}

export function formatPublicSafetyFinding(finding) {
  const linePart = Number.isInteger(finding?.line) ? ` line=${finding.line}` : "";
  return `public-safety ${finding.candidateId} ${finding.code}${linePart}`;
}

function assertWorktree(runGit, cwd) {
  const inside = gitText(runGit, cwd, ["rev-parse", "--is-inside-work-tree"]);
  const bare = gitText(runGit, cwd, ["rev-parse", "--is-bare-repository"]);
  if (inside !== "true" || bare !== "false") {
    throw new PublicSafetyInspectionError();
  }
}

export function scanStagedCandidate({ cwd, runGit = defaultRunGit } = {}) {
  if (!cwd) {
    throw new PublicSafetyInspectionError();
  }
  assertWorktree(runGit, cwd);
  const headTree = gitText(runGit, cwd, ["rev-parse", "HEAD^{tree}"]);
  const tree = gitText(runGit, cwd, ["write-tree"]);
  const raw = gitBuffer(runGit, cwd, [
    "diff-tree",
    "-r",
    "-z",
    "--find-renames",
    "--find-copies",
    "--raw",
    headTree,
    tree,
  ]);
  const entries = parseRawDiff(raw);
  const findings = [];
  let inspectedCount = 0;

  for (const entry of entries) {
    if (entry.statusKind === "D") {
      continue;
    }
    inspectedCount += 1;
    const ordinal = inspectedCount;
    const pathFinding = inspectCandidatePath({
      path: entry.path,
      mode: entry.dstMode,
      status: entry.statusKind,
      size: undefined,
    });
    if (pathFinding) {
      findings.push(attachFinding(pathFinding, ordinal));
      continue;
    }

    const sizeText = gitText(runGit, cwd, ["cat-file", "-s", entry.dstOid]);
    const size = Number.parseInt(sizeText, 10);
    if (!Number.isInteger(size) || size < 0) {
      throw new PublicSafetyInspectionError();
    }
    const sizeFinding = inspectCandidatePath({
      path: entry.path,
      mode: entry.dstMode,
      status: entry.statusKind,
      size,
    });
    if (sizeFinding) {
      findings.push(attachFinding(sizeFinding, ordinal));
      continue;
    }

    const bytes = gitBuffer(runGit, cwd, ["cat-file", "-p", entry.dstOid]);
    if (bytes.length !== size) {
      throw new PublicSafetyInspectionError();
    }
    const blobFinding = inspectCandidateBlob({ path: entry.path, bytes });
    if (blobFinding) {
      findings.push(attachFinding(blobFinding, ordinal));
      continue;
    }
    if (isBinaryMedia(bytes)) {
      continue;
    }
    const text = decodeUtf8Strict(bytes);
    if (text === null) {
      throw new PublicSafetyInspectionError();
    }
    const textFinding = inspectText({ path: entry.path, text });
    if (textFinding) {
      findings.push(attachFinding(textFinding, ordinal));
    }
  }

  return { tree, inspectedCount, findings };
}

function printUsageAndFail() {
  process.stderr.write("public-safety inspection failed\n");
  process.exitCode = 2;
}

export function runPublicSafetyCli(argv = process.argv.slice(2), cwd = process.cwd(), io = process) {
  if (argv.length > 0) {
    io.stderr.write("public-safety inspection failed\n");
    io.exitCode = 2;
    return 2;
  }
  try {
    const result = scanStagedCandidate({ cwd });
    if (result.findings.length > 0) {
      for (const item of result.findings) {
        io.stderr.write(`${formatPublicSafetyFinding(item)}\n`);
      }
      io.exitCode = 1;
      return 1;
    }
    io.stdout.write(`public-safety pass inspected=${result.inspectedCount}\n`);
    io.exitCode = 0;
    return 0;
  } catch {
    io.stderr.write("public-safety inspection failed\n");
    io.exitCode = 2;
    return 2;
  }
}

if (launchedAsCli()) {
  if (process.argv.length > 2) {
    printUsageAndFail();
  } else {
    runPublicSafetyCli();
  }
}
