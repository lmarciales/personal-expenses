import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { defaultRunGit, formatPublicSafetyFinding, scanStagedCandidate } from "../scripts/check-public-safety.mjs";
import { authorizeCommit } from "../scripts/git-operation-authorization.mjs";
import {
  RULE,
  inspectCandidateBlob,
  inspectCandidatePath,
  inspectText,
  isApprovedPublicAssetPath,
} from "../scripts/public-safety-policy.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scannerScript = path.join(repositoryRoot, "scripts", "check-public-safety.mjs");
const authorizationScript = path.join(repositoryRoot, "scripts", "git-operation-authorization.mjs");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 3]);

function run(command, args, cwd, options = {}) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    ...options,
  });
}

function git(cwd, args, options = {}) {
  const result = run("git", args, cwd, options);
  assert.equal(result.status, 0, result.stderr);
  return (result.stdout ?? "").trim();
}

function createRepository(t) {
  const directory = mkdtempSync(path.join(tmpdir(), "lumina-public-safety-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  git(directory, ["init", "-b", "main"]);
  git(directory, ["config", "user.name", "Lumina Test"]);
  git(directory, ["config", "user.email", "lumina-test@example.invalid"]);
  writeFileSync(path.join(directory, "README.md"), "initial\n");
  git(directory, ["add", "README.md"]);
  git(directory, ["commit", "-m", "initial"]);
  return directory;
}

function stageFile(directory, relativePath, content, { force = false } = {}) {
  const fullPath = path.join(directory, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
  git(directory, force ? ["add", "-f", "--", relativePath] : ["add", "--", relativePath]);
}

function stageSymlink(directory, relativePath, target) {
  const hashed = run("git", ["hash-object", "-w", "--stdin"], directory, { input: target });
  assert.equal(hashed.status, 0, hashed.stderr);
  const oid = hashed.stdout.trim();
  git(directory, ["update-index", "--add", "--cacheinfo", `120000,${oid},${relativePath}`]);
}

function stageGitlink(directory, relativePath) {
  const oid = git(directory, ["rev-parse", "HEAD"]);
  git(directory, ["update-index", "--add", "--cacheinfo", `160000,${oid},${relativePath}`]);
}

function authPath(directory) {
  const gitDirectory = git(directory, ["rev-parse", "--absolute-git-dir"]);
  return path.join(gitDirectory, "agent-commit-authorization.json");
}

function recordingGit() {
  const calls = [];
  const runGit = (cwd, args, options) => {
    calls.push([...args]);
    return defaultRunGit(cwd, args, options);
  };
  return { runGit, calls };
}

function readBlobContent(calls) {
  return calls.some((args) => args[0] === "cat-file" && (args.includes("-p") || args.includes("--batch")));
}

function ignoreStatus(repoPath) {
  return run("git", ["check-ignore", "-q", "--no-index", "--", repoPath], repositoryRoot).status;
}

test("allowed placeholder env example, source, migration, fixture, and public assets pass path rules", () => {
  assert.equal(inspectCandidatePath({ path: ".env.example", mode: "100644", status: "A", size: 20 }), null);
  assert.equal(inspectCandidatePath({ path: "src/lib/currency.ts", mode: "100644", status: "A" }), null);
  assert.equal(
    inspectCandidatePath({ path: "supabase/migrations/20260101_example.sql", mode: "100644", status: "A" }),
    null,
  );
  assert.equal(inspectCandidatePath({ path: "tests/fixtures/synthetic.json", mode: "100644", status: "A" }), null);
  for (const asset of ["public/vite.svg", "src/assets/react.svg", "docs/assets/public/logo.png"]) {
    assert.equal(isApprovedPublicAssetPath(asset), true, asset);
    assert.equal(inspectCandidateBlob({ path: asset, bytes: PNG }), null, asset);
  }
});

test("forbidden env, platform, artifact, symlink, submodule, and oversized paths are classified", () => {
  assert.equal(inspectCandidatePath({ path: ".env.test.local", mode: "100644", status: "A" }).code, RULE.ENV_PATH);
  assert.equal(inspectCandidatePath({ path: ".ENV.test.local", mode: "100644", status: "A" }).code, RULE.ENV_PATH);
  assert.equal(inspectCandidatePath({ path: "src/.env.local", mode: "100644", status: "A" }).code, RULE.ENV_PATH);
  assert.equal(inspectCandidatePath({ path: ".env/config", mode: "100644", status: "A" }).code, RULE.ENV_PATH);
  assert.equal(
    inspectCandidatePath({ path: ".codex/config.toml", mode: "100644", status: "M" }).code,
    RULE.PLATFORM_PATH,
  );
  assert.equal(
    inspectCandidatePath({ path: ".vercel/project.json", mode: "100644", status: "A" }).code,
    RULE.PLATFORM_PATH,
  );
  assert.equal(
    inspectCandidatePath({ path: "receipts/item.png", mode: "100644", status: "A" }).code,
    RULE.ARTIFACT_PATH,
  );
  assert.equal(
    inspectCandidatePath({ path: "exports/data.csv", mode: "100644", status: "A" }).code,
    RULE.ARTIFACT_PATH,
  );
  assert.equal(
    inspectCandidatePath({ path: "bank-statement.pdf", mode: "100644", status: "A" }).code,
    RULE.ARTIFACT_PATH,
  );
  assert.equal(
    inspectCandidatePath({ path: "coverage/lcov.info", mode: "100644", status: "A" }).code,
    RULE.ARTIFACT_PATH,
  );
  assert.equal(inspectCandidatePath({ path: "trace.har", mode: "100644", status: "A" }).code, RULE.ARTIFACT_PATH);
  assert.equal(inspectCandidatePath({ path: "id_rsa", mode: "100644", status: "A" }).code, RULE.ARTIFACT_PATH);
  assert.equal(inspectCandidatePath({ path: "link", mode: "120000", status: "A" }).code, RULE.SYMLINK);
  assert.equal(inspectCandidatePath({ path: "vendor/lib", mode: "160000", status: "A" }).code, RULE.SUBMODULE);
  assert.equal(inspectCandidatePath({ path: "odd", mode: "100000", status: "A" }).code, RULE.UNKNOWN_MODE);
  assert.equal(inspectCandidatePath({ path: "odd.txt", mode: "100644", status: "X" }).code, RULE.UNKNOWN_STATUS);
  assert.equal(
    inspectCandidatePath({ path: "large.bin", mode: "100644", status: "A", size: 5 * 1024 * 1024 + 1 }).code,
    RULE.OVERSIZED_BLOB,
  );
  assert.equal(inspectCandidateBlob({ path: "docs/screenshot.png", bytes: PNG }).code, RULE.UNAPPROVED_BINARY);
});

test("text rules allow references and synthetic examples while blocking assembled secrets", () => {
  const allowed = inspectText({
    path: "src/supabase/auth.ts",
    text: `
export async function signIn(email, password) {
  const token = config.token;
  return client.auth.signInWithPassword({ email, password });
}
export function describePush() {
  return "git push origin main and export the token later";
}
contact: lumina-test@example.invalid
`,
  });
  assert.equal(allowed, null);

  const privateKey = inspectText({
    path: "key.txt",
    text: `${["-----BEGIN ", "RSA PRIVATE ", "KEY-----"].join("")}\n`,
  });
  assert.equal(privateKey.code, RULE.PRIVATE_KEY);

  const assignment = inspectText({
    path: "config.env",
    text: "API_KEY=not-a-placeholder-value\n",
  });
  assert.equal(assignment.code, RULE.CREDENTIAL_LITERAL);
  assert.equal(assignment.line, 1);

  const url = inspectText({
    path: "notes.txt",
    text: `url=${["postgres://", "user", ":", "secret", "@", "localhost", "/", "db"].join("")}\n`,
  });
  assert.equal(url.code, RULE.CREDENTIAL_URL);

  const token = ["ghp", "_", "A".repeat(36)].join("");
  const shape = inspectText({ path: "notes.txt", text: `issued ${token}\n` });
  assert.equal(shape.code, RULE.SECRET_SHAPE);

  const email = inspectText({
    path: "notes.txt",
    text: `owner ${["person", "@", "gmail", ".", "com"].join("")}\n`,
  });
  assert.equal(email.code, RULE.EMAIL);

  const home = inspectText({
    path: "notes.txt",
    text: `path ${["/home/", "person", "/projects"].join("")}\n`,
  });
  assert.equal(home.code, RULE.HOME_PATH);

  const dump = inspectText({
    path: "backup.sql",
    text: `-- ${["PostgreSQL", " database ", "dump"].join("")}\nCREATE TABLE accounts ();\n`,
  });
  assert.equal(dump.code, RULE.EXPORT_SIGNATURE);
});

test("real ignore policy hides private artifact paths and keeps allowed paths visible", () => {
  const ignored = [
    "receipts/synthetic-receipt.png",
    "exports/data.csv",
    "statements/bank.csv",
    "backups/db.dump",
    "dumps/copy.sql.gz",
    ".codex/config.toml",
    ".vercel/project.json",
    ".supabase/.temp/cli",
    "supabase/.temp/project-ref",
    "coverage/lcov.info",
    "playwright-report/index.html",
    "test-results/result.xml",
    "sample.har",
    "id_rsa",
    "capture.trace",
    "docs/assets/private/notes.txt",
  ];
  for (const repoPath of ignored) {
    assert.equal(ignoreStatus(repoPath), 0, repoPath);
  }

  const visible = [
    "supabase/migrations/20260101_example.sql",
    "src/lib/currency.ts",
    ".env.example",
    "public/vite.svg",
    "src/assets/react.svg",
    "tests/fixtures/synthetic.json",
    "docs/plans/example.md",
    "docs/assets/public/logo.png",
    "scripts/check-public-safety.mjs",
  ];
  for (const repoPath of visible) {
    assert.equal(ignoreStatus(repoPath), 1, repoPath);
  }
});

test("credential literals cannot hide as identifiers or behind another property", () => {
  const value = ["synthetic", "Credential", "42"].join("");
  for (const [candidatePath, text] of [
    [".env.example", ["PASSWORD", "=", value].join("")],
    ["config.txt", ["API_KEY", "=", value].join("")],
    ["src/auth.js", `const credentials = { password: "${value}" };`],
    ["fixture.json", JSON.stringify({ label: "sample", password: value })],
  ]) {
    assert.equal(inspectText({ path: candidatePath, text })?.code, RULE.CREDENTIAL_LITERAL, candidatePath);
  }
  for (const text of [
    "PASSWORD=\n",
    "PASSWORD=<placeholder>\n",
    "PASSWORD=${SYNTHETIC_PASSWORD}\n",
    "const credentials = { password: values.password, apiKey: config.apiKey };",
    "const credentials = { password };",
  ]) {
    assert.equal(inspectText({ path: "src/auth.js", text }), null);
  }
});

test("scanner allows empty staged diffs and safe placeholders", (t) => {
  const directory = createRepository(t);
  const empty = scanStagedCandidate({ cwd: directory });
  assert.equal(empty.inspectedCount, 0);
  assert.deepEqual(empty.findings, []);

  stageFile(directory, ".env.example", "VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n");
  stageFile(
    directory,
    "src/auth.js",
    'export async function signIn(email, password) { return client.auth.signInWithPassword({ email, password }); }\nexport const token = config.token;\nconsole.log("git push");\n',
  );
  stageFile(directory, "supabase/migrations/0001.sql", "create table accounts (id uuid);\n");
  stageFile(directory, "tests/fixtures/synthetic.json", '{"name":"fixture@example.invalid"}\n');
  stageFile(directory, "public/dot.png", PNG);
  stageFile(directory, "src/assets/mark.png", PNG);
  stageFile(directory, "docs/assets/public/logo.png", PNG);
  const allowed = scanStagedCandidate({ cwd: directory });
  assert.equal(allowed.findings.length, 0, JSON.stringify(allowed.findings));
  assert.ok(allowed.inspectedCount >= 7);
});

test("force-added env files are blocked without reading blob content", (t) => {
  const directory = createRepository(t);
  writeFileSync(path.join(directory, ".gitignore"), ".env*\n");
  const privateName = [".env", ".test", ".local"].join("");
  const privateBody = ["TEST_USER", "_PASSWORD", "=x"].join("");
  stageFile(directory, privateName, `${privateBody}\n`, { force: true });
  const { runGit, calls } = recordingGit();
  const result = scanStagedCandidate({ cwd: directory, runGit });
  assert.equal(result.findings[0]?.code, RULE.ENV_PATH);
  assert.equal(readBlobContent(calls), false);
});

test("force-added browser sessions, backups, and nested platform state never read blobs or authorize", (t) => {
  const directory = createRepository(t);
  writeFileSync(path.join(directory, ".gitignore"), readFileSync(path.join(repositoryRoot, ".gitignore")));
  for (const relativePath of [
    "playwright/.auth/synthetic.json",
    "snapshot.backup",
    "supabase/.temp/project-ref",
    "nested/.vercel/project.json",
    "nested/.supabase/project.json",
  ]) {
    stageFile(directory, relativePath, "synthetic local state\n", { force: true });
  }
  const { runGit, calls } = recordingGit();
  const result = scanStagedCandidate({ cwd: directory, runGit });
  assert.equal(result.findings.length, 5);
  assert.equal(
    calls.some((args) => args[0] === "cat-file"),
    false,
  );
  const authorization = run(
    process.execPath,
    [authorizationScript, "authorize-commit", "--task", "GOV-002"],
    directory,
  );
  assert.equal(authorization.status, 2);
  assert.equal(existsSync(authPath(directory)), false);
});

test("typed, member, and multiline credential literals are blocked without rejecting source references", () => {
  const value = ["synthetic", "Credential", "42"].join("");
  for (const text of [
    `const apiKey: string = "${value}";`,
    `config.password = "${value}";`,
    `const credentials = { password:\n"${value}" };`,
    `password = "${value}";`,
  ]) {
    assert.equal(inspectText({ path: "src/auth.ts", text })?.code, RULE.CREDENTIAL_LITERAL);
  }
  for (const text of [
    "password = values.password;",
    "password = suppliedPassword;",
    "config.password = values.password;",
    "password = values.password; // form field",
    'password = values["password"];',
    'password = "placeholder";',
  ]) {
    assert.equal(inspectText({ path: "src/auth.ts", text }), null);
  }
  const envAssignment = ["PASSWORD", "=", "suppliedPassword"].join("");
  assert.equal(inspectText({ path: ".env.example", text: envAssignment })?.code, RULE.CREDENTIAL_LITERAL);
});

test("rename or copy into a forbidden destination is blocked and deletions of forbidden paths pass", (t) => {
  const directory = createRepository(t);
  stageFile(directory, "ok.txt", "safe\n");
  git(directory, ["commit", "-m", "safe"]);
  mkdirSync(path.join(directory, "receipts"));
  git(directory, ["mv", "--", "ok.txt", "receipts/moved.txt"]);
  const renamed = scanStagedCandidate({ cwd: directory });
  assert.equal(renamed.findings[0]?.code, RULE.ARTIFACT_PATH);

  const cleanup = createRepository(t);
  stageFile(cleanup, "legacy.dump", "not-a-dump-signature\n");
  git(cleanup, ["commit", "-m", "legacy"]);
  git(cleanup, ["rm", "--", "legacy.dump"]);
  const deleted = scanStagedCandidate({ cwd: cleanup });
  assert.equal(deleted.findings.length, 0);
  assert.equal(deleted.inspectedCount, 0);
});

test("symlink, submodule, type changes, oversized blobs, and unapproved binaries are blocked", (t) => {
  const linked = createRepository(t);
  stageSymlink(linked, "shortcut", "target");
  assert.equal(scanStagedCandidate({ cwd: linked }).findings[0]?.code, RULE.SYMLINK);

  const gitlink = createRepository(t);
  stageGitlink(gitlink, "vendor/lib");
  assert.equal(scanStagedCandidate({ cwd: gitlink }).findings[0]?.code, RULE.SUBMODULE);

  const typed = createRepository(t);
  stageFile(typed, "was-file", "hello\n");
  git(typed, ["commit", "-m", "file"]);
  git(typed, ["rm", "--cached", "--", "was-file"]);
  stageSymlink(typed, "was-file", "elsewhere");
  const typeChange = scanStagedCandidate({ cwd: typed });
  assert.equal(typeChange.findings[0]?.code, RULE.SYMLINK);

  const typedLink = createRepository(t);
  stageFile(typedLink, "was-file", "hello\n");
  git(typedLink, ["commit", "-m", "file"]);
  git(typedLink, ["rm", "--cached", "--", "was-file"]);
  stageGitlink(typedLink, "was-file");
  assert.equal(scanStagedCandidate({ cwd: typedLink }).findings[0]?.code, RULE.SUBMODULE);

  const huge = createRepository(t);
  stageFile(huge, "large.bin", Buffer.alloc(5 * 1024 * 1024 + 1, 1));
  const oversized = scanStagedCandidate({ cwd: huge });
  assert.equal(oversized.findings[0]?.code, RULE.OVERSIZED_BLOB);

  const media = createRepository(t);
  stageFile(media, "docs/screenshot.png", PNG);
  assert.equal(scanStagedCandidate({ cwd: media }).findings[0]?.code, RULE.UNAPPROVED_BINARY);
});

test("scanner inspects spaces, unicode, tabs, and newlines and ignores unstaged worktree edits", (t) => {
  const directory = createRepository(t);
  stageFile(directory, "a b.txt", "ok\n");
  stageFile(directory, "tab\tname.txt", "ok\n");
  stageFile(directory, "ñandú.txt", "ok\n");
  stageFile(directory, "line\nbreak.txt", "ok\n");
  const safe = scanStagedCandidate({ cwd: directory });
  assert.equal(safe.findings.length, 0);
  assert.equal(safe.inspectedCount, 4);

  const email = ["person", "@", "gmail", ".", "com"].join("");
  writeFileSync(path.join(directory, "a b.txt"), `owner ${email}\n`);
  const stillSafe = scanStagedCandidate({ cwd: directory });
  assert.equal(stillSafe.findings.length, 0);

  git(directory, ["add", "--", "a b.txt"]);
  const unsafe = scanStagedCandidate({ cwd: directory });
  assert.equal(unsafe.findings[0]?.code, RULE.EMAIL);
});

test("unknown git status is blocked and malformed diff output fails closed", (t) => {
  const directory = createRepository(t);
  const unknown = scanStagedCandidate({
    cwd: directory,
    runGit(cwd, args, options) {
      if (args[0] === "diff-tree") {
        const oid = "a".repeat(40);
        return Buffer.from(`:100644 100644 ${oid} ${oid} X\0odd.txt\0`);
      }
      return defaultRunGit(cwd, args, options);
    },
  });
  assert.equal(unknown.findings[0]?.code, RULE.UNKNOWN_STATUS);

  assert.throws(
    () =>
      scanStagedCandidate({
        cwd: directory,
        runGit(cwd, args, options) {
          if (args[0] === "diff-tree") {
            return Buffer.from("not-a-diff");
          }
          return defaultRunGit(cwd, args, options);
        },
      }),
    (error) => error instanceof Error && error.name === "PublicSafetyInspectionError",
  );

  const cli = run(process.execPath, [scannerScript, "--unexpected"], directory);
  assert.equal(cli.status, 2);
  assert.match(cli.stderr, /inspection failed/i);
});

test("copy records inspect the destination and malformed rename records fail closed", (t) => {
  const directory = createRepository(t);
  const oid = git(directory, ["rev-parse", "HEAD:README.md"]);
  const result = scanStagedCandidate({
    cwd: directory,
    runGit(cwd, args, options) {
      if (args[0] === "diff-tree") {
        return Buffer.from(`:100644 100644 ${oid} ${oid} C100\0README.md\0receipts/copied.txt\0`);
      }
      return defaultRunGit(cwd, args, options);
    },
  });
  assert.equal(result.findings[0]?.code, RULE.ARTIFACT_PATH);
  assert.throws(
    () =>
      scanStagedCandidate({
        cwd: directory,
        runGit(cwd, args, options) {
          if (args[0] === "diff-tree") {
            return Buffer.from(`:100644 100644 ${oid} ${oid} R100\0README.md\0`);
          }
          return defaultRunGit(cwd, args, options);
        },
      }),
    { name: "PublicSafetyInspectionError" },
  );
});

test("truncated or empty NUL records cannot pass as a successful inspection", (t) => {
  const directory = createRepository(t);
  const oid = git(directory, ["rev-parse", "HEAD:README.md"]);
  for (const raw of [`:100644 100644 ${oid} ${oid} M\0README.md`, "\0"]) {
    assert.throws(
      () =>
        scanStagedCandidate({
          cwd: directory,
          runGit(cwd, args, options) {
            return args[0] === "diff-tree" ? Buffer.from(raw) : defaultRunGit(cwd, args, options);
          },
        }),
      { name: "PublicSafetyInspectionError" },
    );
  }
});

test("CLI redacts forbidden filenames and contents", (t) => {
  const directory = createRepository(t);
  const filename = ["secret", "-", "receipt", ".csv"].join("");
  const body = ["owner ", "person", "@", "gmail", ".", "com"].join("");
  stageFile(directory, filename, `${body}\n`);
  const cli = run(process.execPath, [scannerScript], directory);
  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /public-safety candidate-001 ARTIFACT_PATH/);
  assert.doesNotMatch(`${cli.stdout}${cli.stderr}`, /secret-receipt/);
  assert.doesNotMatch(`${cli.stdout}${cli.stderr}`, /gmail/);
  assert.doesNotMatch(
    formatPublicSafetyFinding({ candidateId: "candidate-001", code: RULE.ARTIFACT_PATH, path: filename }),
    /secret/,
  );
});

test("empty staged CLI reports zero inspected files", (t) => {
  const directory = createRepository(t);
  const cli = run(process.execPath, [scannerScript], directory);
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /inspected=0/);
});

test("commit authorization requires a passing public-safety scan of the exact tree", (t) => {
  const directory = createRepository(t);
  stageFile(directory, "candidate.txt", "candidate\n");
  const allowed = run(process.execPath, [authorizationScript, "authorize-commit", "--task", "GOV-002"], directory);
  assert.equal(allowed.status, 0, allowed.stderr);
  assert.equal(existsSync(authPath(directory)), true);

  stageFile(directory, ".env.test.local", "x=1\n", { force: true });
  const blocked = run(process.execPath, [authorizationScript, "authorize-commit", "--task", "GOV-002"], directory);
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /public-safety/i);
  assert.equal(existsSync(authPath(directory)), false);

  const failed = createRepository(t);
  stageFile(failed, "candidate.txt", "candidate\n");
  assert.throws(
    () =>
      authorizeCommit(["--task", "GOV-002"], {
        cwd: failed,
        scan: () => {
          throw new Error("boom");
        },
      }),
    /could not be inspected/i,
  );
  assert.equal(existsSync(authPath(failed)), false);

  const changed = createRepository(t);
  stageFile(changed, "candidate.txt", "candidate\n");
  const first = run(process.execPath, [authorizationScript, "authorize-commit", "--task", "GOV-002"], changed);
  assert.equal(first.status, 0, first.stderr);
  const firstTree = JSON.parse(readFileSync(authPath(changed), "utf8")).tree;
  stageFile(changed, "candidate.txt", "changed after authorization\n");
  const second = run(process.execPath, [authorizationScript, "authorize-commit", "--task", "GOV-002"], changed);
  assert.equal(second.status, 0, second.stderr);
  const stored = JSON.parse(readFileSync(authPath(changed), "utf8"));
  assert.equal(stored.tree, git(changed, ["write-tree"]));
  assert.notEqual(stored.tree, firstTree);
});

test("authorization rejects an incomplete scan result and clears stale artifacts", (t) => {
  const directory = createRepository(t);
  stageFile(directory, "candidate.txt", "candidate\n");
  const commitPath = authPath(directory);
  const pushPath = path.join(path.dirname(commitPath), "agent-push-authorization.json");
  writeFileSync(commitPath, "stale");
  writeFileSync(pushPath, "stale");
  assert.throws(
    () =>
      authorizeCommit(["--task", "GOV-002"], {
        cwd: directory,
        scan: () => ({ tree: git(directory, ["write-tree"]), inspectedCount: 1 }),
      }),
    /public-safety check/,
  );
  assert.equal(existsSync(commitPath), false);
  assert.equal(existsSync(pushPath), false);
});

test("post-scan Git failure is redacted and clears both stale authorization artifacts", (t) => {
  const directory = createRepository(t);
  stageFile(directory, "candidate.txt", "candidate\n");
  const commitPath = authPath(directory);
  const pushPath = path.join(path.dirname(commitPath), "agent-push-authorization.json");
  writeFileSync(commitPath, "stale");
  writeFileSync(pushPath, "stale");
  assert.throws(
    () =>
      authorizeCommit(["--task", "GOV-002"], {
        cwd: directory,
        scan: (options) => {
          const result = scanStagedCandidate(options);
          // Corrupt only this disposable fixture after the successful real scan.
          writeFileSync(path.join(directory, ".git", "index"), "invalid index");
          return result;
        },
      }),
    (error) => error.message === "The staged candidate could not be inspected.",
  );
  assert.equal(existsSync(commitPath), false);
  assert.equal(existsSync(pushPath), false);
});

test("a changed candidate cannot reuse the successful earlier scan for authorization", (t) => {
  const directory = createRepository(t);
  stageFile(directory, "candidate.txt", "candidate\n");
  const commitPath = authPath(directory);
  const pushPath = path.join(path.dirname(commitPath), "agent-push-authorization.json");
  writeFileSync(commitPath, "stale");
  writeFileSync(pushPath, "stale");
  assert.throws(
    () =>
      authorizeCommit(["--task", "GOV-002"], {
        cwd: directory,
        scan: (options) => {
          const result = scanStagedCandidate(options);
          stageFile(directory, "candidate.txt", "changed during inspection\n");
          return result;
        },
      }),
    /changed during inspection/,
  );
  assert.equal(existsSync(commitPath), false);
  assert.equal(existsSync(pushPath), false);
});

test("initial corrupt or unmerged index failures clear stale artifacts and redact Git errors", (t) => {
  for (const failure of ["corrupt", "unmerged"]) {
    const directory = createRepository(t);
    stageFile(directory, "candidate.txt", "candidate\n");
    const commitPath = authPath(directory);
    const pushPath = path.join(path.dirname(commitPath), "agent-push-authorization.json");
    writeFileSync(commitPath, "stale");
    writeFileSync(pushPath, "stale");
    if (failure === "corrupt") {
      writeFileSync(path.join(directory, ".git", "index"), "invalid index");
    } else {
      const oid = git(directory, ["rev-parse", "HEAD:README.md"]);
      git(directory, ["update-index", "--index-info"], { input: `100644 ${oid} 1\tprivate-fixture.txt\n` });
    }
    const cli = run(process.execPath, [authorizationScript, "authorize-commit", "--task", "GOV-002"], directory);
    assert.equal(cli.status, 2);
    assert.equal(cli.stderr, "BLOCKED: The staged candidate could not be inspected.\n");
    assert.equal(existsSync(commitPath), false);
    assert.equal(existsSync(pushPath), false);
  }
});

test("authorization filesystem failures stay redacted and attempt both cleanup targets", (t) => {
  const directory = createRepository(t);
  stageFile(directory, "candidate.txt", "candidate\n");
  const commitPath = authPath(directory);
  const pushPath = path.join(path.dirname(commitPath), "agent-push-authorization.json");
  mkdirSync(commitPath);
  writeFileSync(pushPath, "stale");
  const cli = run(process.execPath, [authorizationScript, "authorize-commit", "--task", "GOV-002"], directory);
  assert.equal(cli.status, 2);
  assert.equal(cli.stderr, "BLOCKED: Authorization state could not be cleared.\n");
  assert.equal(existsSync(pushPath), false);

  for (const failure of ["write", "rename"]) {
    const fixture = createRepository(t);
    stageFile(fixture, "candidate.txt", "candidate\n");
    const destination = authPath(fixture);
    const temporary = `${destination}.${process.pid}.tmp`;
    assert.throws(
      () =>
        authorizeCommit(["--task", "GOV-002"], {
          cwd: fixture,
          scan: (options) => {
            const result = scanStagedCandidate(options);
            mkdirSync(failure === "write" ? temporary : destination);
            return result;
          },
        }),
      (error) => error.message === "Authorization state could not be written.",
    );
    if (failure === "rename") {
      assert.equal(existsSync(temporary), false);
    }
  }
});
