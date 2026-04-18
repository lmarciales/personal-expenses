/**
 * PreToolUse hook that blocks git commit/push unless a marker file exists.
 *
 * The commit-agent workflow creates .claude/.commit-in-progress before
 * committing and removes it after. This hook checks for that marker.
 *
 * Exit 0 = allow, Exit 2 = block.
 */

const fs = require("node:fs");
const path = require("node:path");

let data = "";

process.stdin.on("data", (chunk) => {
  data += chunk;
});

process.stdin.on("end", () => {
  try {
    const input = JSON.parse(data);
    const command = input.tool_input?.command || "";
    const cwd = input.cwd || process.cwd();

    const isGitCommitOrPush = /git\s+(commit|push)\b/.test(command);

    if (isGitCommitOrPush) {
      const markerPath = path.join(cwd, ".claude", ".commit-in-progress");
      if (!fs.existsSync(markerPath)) {
        process.stderr.write(
          "BLOCKED: git commit/push must go through the commit-agent workflow. " +
            "Spawn a general-purpose Agent with model 'sonnet' and the commit-agent instructions.",
        );
        process.exit(2);
      }
    }
  } catch {
    // If we can't parse the input, allow the command (fail-open)
  }

  process.exit(0);
});
