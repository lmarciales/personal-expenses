/**
 * Blocks tool writes to local environment files.
 *
 * This script accepts hook JSON on stdin and intentionally supports several
 * possible file path shapes so it works across agent runtimes.
 */

import path from "node:path";

let data = "";

process.stdin.on("data", (chunk) => {
  data += chunk;
});

function collectStrings(value, output = []) {
  if (typeof value === "string") {
    output.push(value);
    return output;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, output);
    }
    return output;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      collectStrings(item, output);
    }
  }

  return output;
}

function isEnvFile(candidate) {
  const normalized = candidate.replaceAll("\\", "/");
  const base = path.posix.basename(normalized);

  if (base === ".env" || base.startsWith(".env.")) {
    return true;
  }

  return /(?:^|\n)\*\*\* (?:Add|Update|Delete) File: .*\/?\.env(?:\.|\s|$)/.test(normalized);
}

process.stdin.on("end", () => {
  try {
    const input = data ? JSON.parse(data) : {};
    const candidates = [process.env.CLAUDE_FILE_PATH, process.env.CODEX_FILE_PATH, ...collectStrings(input)].filter(
      Boolean,
    );

    if (candidates.some(isEnvFile)) {
      process.stderr.write("BLOCKED: .env files are protected from edits");
      process.exit(2);
    }
  } catch {
    // Fail open if the hook payload is unavailable or malformed.
  }

  process.exit(0);
});
