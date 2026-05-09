/**
 * Runs lightweight checks for edited source/config files.
 *
 * The script is tolerant of different hook payloads and exits 0 so it reports
 * useful diagnostics without blocking the editing tool after a successful edit.
 */

import { execFileSync } from "node:child_process";
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

function extractPatchPaths(value) {
  const matches = value.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm);

  return Array.from(matches, (match) => match[1].trim());
}

function uniqueFiles(candidates) {
  const files = new Set();

  for (const candidate of candidates) {
    for (const patchPath of extractPatchPaths(candidate)) {
      files.add(patchPath);
    }

    if (/^[\w./\\: -]+\.[\w]+$/.test(candidate)) {
      files.add(candidate);
    }
  }

  return [...files];
}

function run(command, args) {
  try {
    execFileSync(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
  } catch {
    // Keep hook non-blocking. The next explicit build/check should fail loudly.
  }
}

process.stdin.on("end", () => {
  let input = {};

  try {
    input = data ? JSON.parse(data) : {};
  } catch {
    input = {};
  }

  const candidates = [process.env.CLAUDE_FILE_PATH, process.env.CODEX_FILE_PATH, ...collectStrings(input)].filter(
    Boolean,
  );

  const files = uniqueFiles(candidates);
  const checkable = files.filter((file) => /\.(ts|tsx|js|jsx|css|json)$/.test(file));
  const typecheckable = files.some((file) => /\.(ts|tsx)$/.test(file));

  for (const file of checkable) {
    run("npx", ["@biomejs/biome", "check", "--write", file]);
  }

  if (typecheckable) {
    run("npx", ["tsc", "--noEmit"]);
  }

  process.exit(0);
});
