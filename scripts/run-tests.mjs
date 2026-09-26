import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

function discover(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return discover(file);
    return entry.isFile() && entry.name.endsWith(".test.mjs") ? [file] : [];
  });
}

try {
  if (process.argv.length !== 2) throw new Error();
  const files = discover("tests").sort();
  if (files.length === 0) throw new Error();
  const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
  if (result.error || result.signal) throw new Error();
  process.exitCode = result.status ?? 1;
} catch {
  process.stderr.write("Unit tests could not run: expected readable tests and no extra arguments.\n");
  process.exitCode = 1;
}
