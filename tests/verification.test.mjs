import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const stages = ["format:check", "lint", "typecheck", "check:i18n", "test", "build"];

function put(directory, name, content) {
  const target = path.join(directory, name);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function fixture(t, scripts = manifest.scripts) {
  const directory = mkdtempSync(path.join(tmpdir(), "lumina verification "));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  put(
    directory,
    "package.json",
    `${JSON.stringify({ private: true, type: "module", packageManager: manifest.packageManager, scripts }, null, 2)}\n`,
  );
  const launcher = path.join(root, "scripts/run-tests.mjs");
  if (existsSync(launcher)) put(directory, "scripts/run-tests.mjs", readFileSync(launcher));
  return directory;
}

function runScript(directory, name) {
  assert.equal(typeof manifest.scripts[name], "string", `Missing ${name} command`);
  const env = {
    ...process.env,
    PATH: `${path.join(root, "node_modules", ".bin")}${path.delimiter}${process.env.PATH}`,
  };
  env.NODE_TEST_CONTEXT = undefined;
  // Use the launcher: npm_execpath may point to either JavaScript or a standalone binary.
  return spawnSync("pnpm", ["run", name], {
    cwd: directory,
    env,
    encoding: "utf8",
    timeout: 60_000,
    shell: process.platform === "win32",
  });
}

function succeeds(result) {
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

function fails(result) {
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.notEqual(result.status, null);
}

test("verify runs every stage in order, stops at each failure, and recovers", (t) => {
  assert.equal(typeof manifest.scripts.verify, "string", "Missing verify command");
  const scripts = { verify: manifest.scripts.verify };
  for (const stage of stages) scripts[stage] = `node stage.mjs ${stage}`;
  const directory = fixture(t, scripts);
  put(
    directory,
    "stage.mjs",
    `import { appendFileSync, readFileSync } from "node:fs";
const stage = process.argv[2];
appendFileSync("observed.txt", stage + "\\n");
if (readFileSync("failure.txt", "utf8") === stage) process.exit(23);
`,
  );
  for (const [index, stage] of stages.entries()) {
    put(directory, "observed.txt", "");
    put(directory, "failure.txt", stage);
    fails(runScript(directory, "verify"));
    assert.deepEqual(
      readFileSync(path.join(directory, "observed.txt"), "utf8").trim().split("\n"),
      stages.slice(0, index + 1),
    );
  }
  put(directory, "observed.txt", "");
  put(directory, "failure.txt", "");
  succeeds(runScript(directory, "verify"));
  assert.deepEqual(readFileSync(path.join(directory, "observed.txt"), "utf8").trim().split("\n"), stages);
});

test("format validation rejects bad formatting without changing source", (t) => {
  const directory = fixture(t);
  put(directory, "biome.json", readFileSync(path.join(root, "biome.json")));
  const source = 'export const value={label:"synthetic"}\n';
  put(directory, "fixture.js", source);
  const packageBefore = readFileSync(path.join(directory, "package.json"), "utf8");
  fails(runScript(directory, "format:check"));
  assert.equal(readFileSync(path.join(directory, "fixture.js"), "utf8"), source);
  assert.equal(readFileSync(path.join(directory, "package.json"), "utf8"), packageBefore);
  put(directory, "fixture.js", 'export const value = { label: "synthetic" };\n');
  succeeds(runScript(directory, "format:check"));
});

test("lint rejects a semantic error without fixing source", (t) => {
  const directory = fixture(t);
  put(directory, "biome.json", readFileSync(path.join(root, "biome.json")));
  const source = "const value = 1;\nvalue = 2;\nconsole.log(value);\n";
  put(directory, "fixture.js", source);
  fails(runScript(directory, "lint"));
  assert.equal(readFileSync(path.join(directory, "fixture.js"), "utf8"), source);
  put(directory, "fixture.js", "const value = 1;\nconsole.log(value);\n");
  succeeds(runScript(directory, "lint"));
});

test("typecheck rejects invalid types and succeeds after correction", (t) => {
  const directory = fixture(t);
  put(
    directory,
    "tsconfig.json",
    JSON.stringify({ compilerOptions: { strict: true, noEmit: true }, include: ["fixture.ts"] }),
  );
  put(directory, "fixture.ts", 'export const value: number = "invalid";\n');
  fails(runScript(directory, "typecheck"));
  assert.equal(readFileSync(path.join(directory, "fixture.ts"), "utf8"), 'export const value: number = "invalid";\n');
  put(directory, "fixture.ts", "export const value: number = 1;\n");
  succeeds(runScript(directory, "typecheck"));
});

test("translation check rejects mismatched keys and succeeds after correction", (t) => {
  const directory = fixture(t);
  put(directory, "scripts/check_i18n_parity.mjs", readFileSync(path.join(root, "scripts/check_i18n_parity.mjs")));
  put(directory, "src/i18n/locales/en/example.json", '{"label":"Synthetic"}');
  put(directory, "src/i18n/locales/es/example.json", "{}");
  fails(runScript(directory, "check:i18n"));
  put(directory, "src/i18n/locales/es/example.json", '{"label":"Sintetico"}');
  succeeds(runScript(directory, "check:i18n"));
});

test("test command discovers nested files, propagates assertions, and rejects an empty suite", (t) => {
  const directory = fixture(t);
  fails(runScript(directory, "test"));
  put(directory, "tests/nested/fixture.test.mjs", 'import assert from "node:assert/strict";\nassert.equal(1, 2);\n');
  fails(runScript(directory, "test"));
  put(directory, "tests/nested/fixture.test.mjs", 'import assert from "node:assert/strict";\nassert.equal(1, 1);\n');
  // Unrelated scripts outside tests must never be picked up by default discovery.
  put(directory, "tools/unrelated.test.mjs", 'throw new Error("must not run");\n');
  succeeds(runScript(directory, "test"));
});

test("production build rejects missing entry and succeeds after recovery", (t) => {
  const directory = fixture(t);
  put(directory, "tsconfig.json", JSON.stringify({ compilerOptions: { noEmit: true }, include: ["fixture.ts"] }));
  put(directory, "fixture.ts", "export const value = 1;\n");
  fails(runScript(directory, "build"));
  put(directory, "index.html", "<!doctype html><html><body><h1>Synthetic</h1></body></html>");
  succeeds(runScript(directory, "build"));
  assert.match(readFileSync(path.join(directory, "dist/index.html"), "utf8"), /Synthetic/);
});

test("Vercel selects the complete gate and preserves SPA fallback", () => {
  const configuration = JSON.parse(readFileSync(path.join(root, "vercel.json"), "utf8"));
  assert.equal(configuration.buildCommand, "pnpm run verify");
  assert.deepEqual(configuration.rewrites, [{ source: "/(.*)", destination: "/" }]);
  assert.equal(manifest.scripts.build, "tsc -b && vite build");
  assert.doesNotMatch(manifest.scripts.build, /verify/);
});
