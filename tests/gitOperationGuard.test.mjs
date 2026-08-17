import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const guardScript = path.join(repositoryRoot, "scripts", "git-operation-guard.mjs");
const authorizationScript = path.join(repositoryRoot, "scripts", "git-operation-authorization.mjs");
const adapterScripts = [
  guardScript,
  path.join(repositoryRoot, ".codex", "hooks", "git-commit-guard.js"),
  path.join(repositoryRoot, ".claude", "hooks", "git-commit-guard.js"),
];

function run(command, args, cwd, options = {}) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    ...options,
  });
}

function git(cwd, ...args) {
  const result = run("git", args, cwd);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function createRepository(t) {
  const directory = mkdtempSync(path.join(tmpdir(), "lumina-git-gate-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));

  git(directory, "init", "-b", "main");
  git(directory, "config", "user.name", "Lumina Test");
  git(directory, "config", "user.email", "lumina-test@example.invalid");
  writeFileSync(path.join(directory, "README.md"), "initial\n");
  git(directory, "add", "README.md");
  git(directory, "commit", "-m", "initial");

  return directory;
}

function stageCandidate(directory, content = "candidate\n") {
  writeFileSync(path.join(directory, "candidate.txt"), content);
  git(directory, "add", "candidate.txt");
}

function runGuard(directory, command, { script = guardScript, inputOverride } = {}) {
  const input = inputOverride ?? JSON.stringify({ cwd: directory, tool_input: { command } });
  return run(process.execPath, [script], repositoryRoot, { input });
}

function authorizeCommit(directory) {
  return run(process.execPath, [authorizationScript, "authorize-commit", "--task", "GOV-001"], directory);
}

function gitMetadata(directory, argument) {
  return git(directory, "rev-parse", argument);
}

function writePushAuthorization(directory, overrides = {}) {
  const gitDirectory = path.resolve(directory, gitMetadata(directory, "--git-dir"));
  const authorization = {
    version: 1,
    operation: "push",
    task: "GOV-001",
    branch: "main",
    head: gitMetadata(directory, "HEAD"),
    tree: gitMetadata(directory, "HEAD^{tree}"),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    ...overrides,
  };
  writeFileSync(path.join(gitDirectory, "agent-push-authorization.json"), `${JSON.stringify(authorization)}\n`);
}

function commitAuthorizationPath(directory) {
  const gitDirectory = path.resolve(directory, gitMetadata(directory, "--git-dir"));
  return path.join(gitDirectory, "agent-commit-authorization.json");
}

test("commit authorization permits only the exact staged candidate", (t) => {
  const directory = createRepository(t);
  stageCandidate(directory);

  const blocked = runGuard(directory, 'git commit -m "GOV-001: candidate"');
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /commit authorization/i);

  const authorization = authorizeCommit(directory);
  assert.equal(authorization.status, 0, authorization.stderr);
  assert.equal(runGuard(directory, 'git commit -m "GOV-001: candidate"').status, 0);

  stageCandidate(directory, "changed after authorization\n");
  const changedCandidate = runGuard(directory, 'git commit -m "GOV-001: candidate"');
  assert.equal(changedCandidate.status, 2);
  assert.match(changedCandidate.stderr, /candidate|tree/i);
});

test("commit authorization never authorizes push", (t) => {
  const directory = createRepository(t);
  stageCandidate(directory);
  assert.equal(authorizeCommit(directory).status, 0);

  const push = runGuard(directory, "git push origin main");
  assert.equal(push.status, 2);
  assert.match(push.stderr, /push authorization/i);
});

test("a writable push authorization file cannot enable push", (t) => {
  const directory = createRepository(t);
  writePushAuthorization(directory);
  const result = runGuard(directory, "git.exe --no-pager push origin main");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /release|push authorization|disabled/i);
});

test("wrong branch and compound commit-push commands fail closed", (t) => {
  const directory = createRepository(t);
  stageCandidate(directory);
  assert.equal(authorizeCommit(directory).status, 0);

  const compound = runGuard(directory, 'git commit -m "GOV-001: candidate" && git push origin main');
  assert.equal(compound.status, 2);
  assert.match(compound.stderr, /separate command/i);

  git(directory, "switch", "-c", "other");
  const wrongBranch = runGuard(directory, 'git commit -m "GOV-001: candidate"');
  assert.equal(wrongBranch.status, 2);
  assert.match(wrongBranch.stderr, /branch|main/i);
});

test("command parsing handles Git options without reading message text as an operation", (t) => {
  const directory = createRepository(t);
  stageCandidate(directory);
  assert.equal(authorizeCommit(directory).status, 0);

  const result = runGuard(directory, 'git commit -m "GOV-001: describe push policy without pushing"');
  assert.equal(result.status, 0, result.stderr);

  const retargeted = runGuard(directory, 'git -C . commit -m "GOV-001: candidate"');
  assert.equal(retargeted.status, 2);
  assert.match(retargeted.stderr, /target|repository/i);
});

test("nested shell commands and protected Git aliases cannot bypass the gate", (t) => {
  const directory = createRepository(t);
  stageCandidate(directory);
  git(directory, "config", "alias.sm", "submodule foreach");
  git(directory, "config", "alias.smr", "submodule foreach --recursive");
  git(directory, "config", "alias.s", "shell -c git-receive-pack .");
  git(directory, "config", "alias.f", "for-each-repo --config=maintenance.repo");

  const nestedPush = runGuard(directory, 'powershell -Command "git push origin main"');
  assert.equal(nestedPush.status, 2);
  assert.match(nestedPush.stderr, /push|release/i);

  const nestedCommit = runGuard(directory, 'cmd /c "git commit -m GOV-001: candidate"');
  assert.equal(nestedCommit.status, 2);
  assert.match(nestedCommit.stderr, /nested|wrapper|commit authorization/i);

  const aliasPush = runGuard(directory, "git -c alias.p=push p origin main");
  assert.equal(aliasPush.status, 2);
  assert.match(aliasPush.stderr, /alias|configuration|push|release/i);

  for (const command of [
    'git -c "alias.publish=-c color.ui=always push" publish origin main',
    "git -c alias.a=b -c alias.b=push a origin main",
    "git -c alias.b=branch b review HEAD",
    "git -c alias.t=tag t review HEAD",
    "git -c alias.a=b -c alias.b=branch a review HEAD",
    'git -c "alias.publish=--namespace review push" publish origin main',
    "git --config-env=alias.publish=PUBLISH_ALIAS publish origin main",
  ]) {
    const result = runGuard(directory, command);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /alias|configuration|indirect|push|release/i);
  }

  const fullPathPush = runGuard(directory, '"C:/Program Files/Git/cmd/git.exe" push origin main');
  assert.equal(fullPathPush.status, 2);
  assert.match(fullPathPush.stderr, /push|release/i);

  for (const command of [
    "git sm git push origin main",
    "git smr git push origin main",
    "git s",
    "git f push origin main",
  ]) {
    const result = runGuard(directory, command);
    assert.equal(result.status, 2, `${command}: ${result.stderr}`);
    assert.match(result.stderr, /alias|indirect|nested|push|release/i);
  }
});

test("commit authorization rejects history-rewrite and hook-bypass flags", (t) => {
  const directory = createRepository(t);
  stageCandidate(directory);
  assert.equal(authorizeCommit(directory).status, 0);

  for (const command of [
    'git commit --amend -m "GOV-001: candidate"',
    'git commit --no-verify -m "GOV-001: candidate"',
    'git commit -n -m "GOV-001: candidate"',
    'git commit -a -m "GOV-001: candidate"',
    'git commit --include candidate.txt -m "GOV-001: candidate"',
    'git commit --only candidate.txt -m "GOV-001: candidate"',
    'git commit -m "GOV-001: candidate" candidate.txt',
  ]) {
    const result = runGuard(directory, command);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /amend|verify|flag|unsupported/i);
  }
});

test("commit authorization is bound to the task message and maximum lifetime", (t) => {
  const directory = createRepository(t);
  stageCandidate(directory);
  assert.equal(authorizeCommit(directory).status, 0);

  const wrongTask = runGuard(directory, 'git commit -m "OTHER-001: candidate"');
  assert.equal(wrongTask.status, 2);
  assert.match(wrongTask.stderr, /task|message/i);

  const authorizationPath = commitAuthorizationPath(directory);
  const authorization = JSON.parse(readFileSync(authorizationPath, "utf8"));
  authorization.issuedAt = new Date().toISOString();
  authorization.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  writeFileSync(authorizationPath, `${JSON.stringify(authorization)}\n`);

  const excessiveLifetime = runGuard(directory, 'git commit -m "GOV-001: candidate"');
  assert.equal(excessiveLifetime.status, 2);
  assert.match(excessiveLifetime.stderr, /lifetime|expiry|expires/i);
});

test("malformed hook input fails closed", (t) => {
  const directory = createRepository(t);
  const result = runGuard(directory, "", { inputOverride: "not-json" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /inspect|parse|input/i);

  const nullInput = runGuard(directory, "", { inputOverride: "null" });
  assert.equal(nullInput.status, 2);
  assert.match(nullInput.stderr, /inspect|parse|input/i);
});

test("Codex exec-command input is inspected through its cmd field", (t) => {
  const directory = createRepository(t);
  stageCandidate(directory);
  assert.equal(authorizeCommit(directory).status, 0);

  const inputOverride = JSON.stringify({
    cwd: directory,
    tool_input: { cmd: 'git commit -m "GOV-001: candidate"' },
  });
  const result = runGuard(directory, "", { inputOverride });
  assert.equal(result.status, 0, result.stderr);
});

test("hook repository state honors supported workdir fields", (t) => {
  const directory = createRepository(t);
  const otherDirectory = createRepository(t);
  stageCandidate(directory);
  stageCandidate(otherDirectory);
  assert.equal(authorizeCommit(directory).status, 0);

  for (const inputOverride of [
    JSON.stringify({
      tool_input: {
        cmd: 'git commit -m "GOV-001: candidate"',
        workdir: directory,
      },
    }),
    JSON.stringify({
      cwd: otherDirectory,
      tool_cwd: directory,
      tool_input: { command: 'git commit -m "GOV-001: candidate"' },
    }),
    JSON.stringify({
      cwd: otherDirectory,
      tool_input: {
        command: 'git commit -m "GOV-001: candidate"',
        workdir: directory,
      },
    }),
    JSON.stringify({
      workdir: directory,
      tool_input: { command: 'git commit -m "GOV-001: candidate"' },
    }),
  ]) {
    const result = runGuard(directory, "", { inputOverride });
    assert.equal(result.status, 0, result.stderr);
  }

  const wrongRepository = runGuard(directory, "", {
    inputOverride: JSON.stringify({
      cwd: directory,
      tool_input: {
        command: 'git commit -m "GOV-001: candidate"',
        workdir: otherDirectory,
      },
    }),
  });
  assert.equal(wrongRepository.status, 2);
  assert.match(wrongRepository.stderr, /authorization|candidate|tree/i);
});

test("Codex and Claude hook adapters return the canonical decision", (t) => {
  const directory = createRepository(t);
  stageCandidate(directory);

  const blockedStatuses = adapterScripts.map(
    (script) => runGuard(directory, 'git commit -m "GOV-001: candidate"', { script }).status,
  );
  assert.deepEqual(blockedStatuses, [2, 2, 2]);

  assert.equal(authorizeCommit(directory).status, 0);
  const allowedStatuses = adapterScripts.map(
    (script) => runGuard(directory, 'git commit -m "GOV-001: candidate"', { script }).status,
  );
  assert.deepEqual(allowedStatuses, [0, 0, 0]);
});

test("clearing commit authorization removes the temporary capability", (t) => {
  const directory = createRepository(t);
  stageCandidate(directory);
  assert.equal(authorizeCommit(directory).status, 0);

  const clear = run(process.execPath, [authorizationScript, "clear-commit"], directory);
  assert.equal(clear.status, 0, clear.stderr);

  const blocked = runGuard(directory, 'git commit -m "GOV-001: candidate"');
  assert.equal(blocked.status, 2);
});

test("commit authorization rejects Git environment and configuration bypasses", (t) => {
  const directory = createRepository(t);
  const otherDirectory = createRepository(t);
  stageCandidate(directory);
  assert.equal(authorizeCommit(directory).status, 0);
  git(directory, "config", "alias.p", "status");
  git(otherDirectory, "config", "alias.p", "push");

  for (const command of [
    'GIT_DIR=.git git commit -m "GOV-001: candidate"',
    "GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=alias.p GIT_CONFIG_VALUE_0=push git p origin main",
    "env -u GIT_DIR git push origin main",
    'cmd /d /c "set GIT_CONFIG_COUNT=1&&set GIT_CONFIG_KEY_0=alias.p&&set GIT_CONFIG_VALUE_0=push&&git p origin main"',
    'git -c core.hooksPath=NUL commit -m "GOV-001: candidate"',
    "git -c help.autocorrect=immediate psuh origin main",
    'git --config-env=core.hooksPath=HOOK commit -m "GOV-001: candidate"',
    "git -C . unknown-dispatch origin main",
    `git -C "${otherDirectory}" p origin main`,
  ]) {
    const result = runGuard(directory, command);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /environment|configuration|unsupported|push|release/i);
  }
});

test("push-equivalent and commit-creating Git operations are blocked", (t) => {
  const directory = createRepository(t);

  for (const command of [
    "git send-pack origin main",
    "git http-fetch -w refs/heads/review 0000000000000000000000000000000000000000 https://example.invalid/repository.git",
    "git-http-fetch -w refs/heads/review 0000000000000000000000000000000000000000 https://example.invalid/repository.git",
    "git http-push https://example.invalid/repository.git refs/heads/main",
    "git-http-push https://example.invalid/repository.git refs/heads/main",
    "git receive-pack .",
    "git --namespace review push origin main",
    "git merge --no-ff other",
    "git cherry-pick HEAD",
    "git revert HEAD",
    "git am patch.mbox",
    "git rebase main",
    "git pull origin main",
    "git commit-tree HEAD^{tree}",
    "git update-ref refs/heads/main HEAD",
  ]) {
    const result = runGuard(directory, command);
    assert.equal(result.status, 2, `${command}: ${result.stderr}`);
    assert.match(result.stderr, /authorization|protected|release|direct|push/i);
  }
});

test("reported PowerShell launchers and dynamic Git executables are blocked", (t) => {
  const directory = createRepository(t);
  stageCandidate(directory);
  assert.equal(authorizeCommit(directory).status, 0);

  for (const command of [
    'Start-Process git -ArgumentList "push origin main"',
    'start git -ArgumentList "push origin main"',
    '$g="git"; Start-Process $g -ArgumentList "push origin main"',
    '$g="git"; & $g push origin main',
    '$g="g"+"it"; & $g push origin main',
    '$env:git="git"; & $env:git commit -m "GOV-001: candidate"',
    "& $(Get-Command git) push origin main",
    "Set-Alias g git; g push origin main",
    "function g { git @args }; g push origin main",
    "& @('git')[0] push origin main",
    'cmd /c "g^it push origin main"',
    'wsl bash -lc "git push origin main"',
    'Invoke-Expression "git push origin main"',
    "powershell -EncodedCommand ZwBpAHQAIABwAHUAcwBoAA==",
    "powershell -en ZwBpAHQAIABwAHUAcwBoAA==",
    "powershell -enco ZwBpAHQAIABwAHUAcwBoAA==",
    "powershell /en ZwBpAHQAIABwAHUAcwBoAA==",
    "pwsh --encodedcommand ZwBpAHQAIABwAHUAcwBoAA==",
    'powershell -co "git push origin main"',
    'powershell /co "git push origin main"',
    'pwsh --command "git push origin main"',
    "git $(printf push) origin main",
    "$o=push; git $o origin main",
    '$t="commit"; git hash-object -w -t $t candidate.txt',
    '$a="update"; git remote $a',
    '$a="update"; git submodule $a',
    '$a="split"; git subtree $a --prefix src -b review',
    'a=commit; git hash-object -w -t "$a" candidate.txt',
    'a=update; git remote "$a"',
    "git remote `printf update`",
    "git hash-object -w -t `printf commit` candidate.txt",
    'cmd /v:on /c "set a=update&git remote !a!"',
    'cmd /v:on /c "set t=commit&git hash-object -w -t !t! candidate.txt"',
    String.raw`bash -lc "g\it push origin main"`,
    String.raw`"C:/Program Files/Git/bin/bash.exe" -lc "git p\ush origin main"`,
    String.raw`bash -lc "git com\mit -m GOV-001:candidate"`,
  ]) {
    const result = runGuard(directory, command);
    assert.equal(result.status, 2, `${command}: ${result.stderr}`);
    assert.match(result.stderr, /configuration|dynamic|indirect|launcher|push|commit/i);
  }
});

test("guard errors do not echo private command fragments", (t) => {
  const directory = createRepository(t);
  stageCandidate(directory);
  assert.equal(authorizeCommit(directory).status, 0);
  const privateFragment = "PRIVATE_ACCOUNT_DO_NOT_ECHO";

  const unsupported = runGuard(directory, `git commit --${privateFragment} -m "GOV-001: candidate"`);
  assert.equal(unsupported.status, 2);
  assert.doesNotMatch(unsupported.stderr, new RegExp(privateFragment));

  const malformed = runGuard(directory, "", {
    inputOverride: `{"tool_input":{"command":"${privateFragment}"`,
  });
  assert.equal(malformed.status, 2);
  assert.doesNotMatch(malformed.stderr, new RegExp(privateFragment));
});

test("unknown protected targets fail closed without blocking static non-Git commands", (t) => {
  const directory = createRepository(t);

  for (const command of [
    "& ([string]::Concat('g','it')) push origin main",
    '$tool="docker"; & $tool push example/image:latest',
    "tool=git; $tool push origin main",
    "set tool=git & %tool% push origin main",
  ]) {
    const result = runGuard(directory, command);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /dynamic|indirect|launcher|push|commit/i);
  }

  for (const command of [
    "docker push example/image:latest",
    'hg commit -m "candidate"',
    'Write-Output "git push"',
    '$message="git push"; Write-Output $message',
    "Set-Alias g git",
    "function g { git @args }",
    '$tool="docker"; & $tool inspect example/image:latest',
    `node -e "console.log('git push')"`,
  ]) {
    const result = runGuard(directory, command);
    assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  }
});

test("transparent wrappers and split-string launchers cannot authorize protected Git effects", (t) => {
  const directory = createRepository(t);
  const otherDirectory = createRepository(t);
  stageCandidate(directory);
  assert.equal(authorizeCommit(directory).status, 0);

  for (const command of [
    'env git commit -m "GOV-001: candidate"',
    'command git commit -m "GOV-001: candidate"',
    "exec git push origin main",
    'sudo git commit -m "GOV-001: candidate"',
    "env command git push origin main",
    "command env git push origin main",
    "sudo env git push origin main",
    "time git push origin main",
    "if true; then git push origin main; fi",
    "1 | ForEach-Object { git push origin main }",
    "{ git push origin main; }",
    "& { git push origin main }",
    'env -S "git push origin main"',
    'env --split-string="git push origin main"',
    `env -C "${otherDirectory}" git commit -m "GOV-001: candidate"`,
  ]) {
    const result = runGuard(directory, command);
    assert.equal(result.status, 2, `${command}: ${result.stderr}`);
    assert.match(result.stderr, /compound|dynamic|nested|wrapper|target|push|commit|release/i);
  }

  const readOnlyWrapper = runGuard(directory, "time git status --short");
  assert.equal(readOnlyWrapper.status, 0, readOnlyWrapper.stderr);
});

test("porcelain and plumbing aliases cannot bypass history and ref authorization", (t) => {
  const directory = createRepository(t);

  for (const command of [
    "git reset --soft HEAD~1",
    "git branch review HEAD",
    "git checkout -B review HEAD",
    "git switch -C review HEAD",
    "git symbolic-ref HEAD refs/heads/review",
    'git notes add -m "review" HEAD',
    'git notes --ref list add -m "review" HEAD',
    "git replace HEAD HEAD^",
    "git stash push",
    "git stash -m list",
    "git fast-import",
    "git filter-branch -- --all",
    "git worktree add -b review ../review",
    "git tag review HEAD",
    "git tag -m --list review HEAD",
    "git tag --message --list review HEAD",
    "git branch -Dreview",
    "git branch -Mreview",
    "git symbolic-ref -d refs/remotes/origin/HEAD",
    "git fetch origin main:refs/heads/review",
    "git submodule update --remote",
    "git submodule update",
    "git remote update",
    "git remote rename origin upstream",
    "git remote remove origin",
    "git remote rm origin",
    "git remote add -f review https://example.invalid/repository.git",
    "git remote add -ft main review https://example.invalid/repository.git",
    "git remote add -fm main review https://example.invalid/repository.git",
    "git remote add review https://example.invalid/repository.git --fetch",
    "git remote add -m main review https://example.invalid/repository.git",
    "git remote add --master=main review https://example.invalid/repository.git",
    "git hash-object -t commit -w candidate.txt",
    "git hash-object -tcommit -w candidate.txt",
    "git hash-object -wtcommit candidate.txt",
    "git hash-object -wt commit candidate.txt",
    "git config help.autocorrect immediate",
    "git config edit",
    "git config edit --local",
    "git config -ze",
    "git config -ez",
    "git config set help.autocorrect immediate",
    "git config --unset-a help.autocorrect",
    "git config --comment --get help.autocorrect immediate",
    "git hash-object --typ=commit -w candidate.txt",
    "git hash-object --typ commit -w candidate.txt",
    'git notes --re list add -m "review" HEAD',
    "git symbolic-ref --dele refs/remotes/origin/HEAD",
    "git symbolic-ref -qd refs/remotes/origin/HEAD",
    "git branch --set-upst=x/y",
    "git branch -u=x/y",
    "git tag --mess --list review HEAD",
    "git psuh origin main",
    "git bisect start HEAD~1 HEAD",
    "git bisect run git push origin main",
    "git reflog expire --expire=now --all",
    "git reflog drop refs/heads/main",
    "git reflog drop --all",
  ]) {
    const result = runGuard(directory, command);
    assert.equal(result.status, 2, `${command}: ${result.stderr}`);
    assert.match(result.stderr, /authorization|protected|direct|history|reference|commit/i);
  }

  for (const command of [
    "git status --short",
    "git branch --show-current",
    "git branch --list",
    "git branch --contains HEAD",
    "git branch --merged HEAD",
    "git tag --list",
    "git tag -n",
    "git tag --contains HEAD",
    "git tag -v v1.0.0",
    "git tag --verify v1.0.0",
    "git notes list",
    "git stash list",
    "git replace --list",
    "git symbolic-ref HEAD",
    "git hash-object -w candidate.txt",
    "git hash-object -wtblob candidate.txt",
    "git hash-object -wt blob candidate.txt",
    "git worktree list",
    "git submodule status",
    "git config --get help.autocorrect",
    "git config help.autocorrect",
    "git config get user.name",
    "git config get --all user.name",
    "git reflog show",
    "git remote get-url origin",
    "git remote -v",
    "git remote add review https://example.invalid/repository.git",
    "git remote set-url origin https://example.invalid/repository.git",
    "git write-tree",
    "git check-ignore -v .env.test.local",
    "git help status",
    "git bisect log",
  ]) {
    const result = runGuard(directory, command);
    assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  }
});

test("Git command dispatchers cannot hide nested remote writes", (t) => {
  const directory = createRepository(t);

  for (const command of [
    "git submodule foreach git push origin main",
    "git submodule foreach --recursive git push origin main",
    "git subtree push --prefix src origin main",
    "git subtree --prefix src push origin main",
    "git subtree add --prefix src origin main",
    "git subtree --prefix src add origin main",
    "git subtree merge --prefix src HEAD",
    "git subtree pull --prefix src origin main",
    "git subtree split --prefix src -b review",
    "git shell -c git-receive-pack .",
  ]) {
    const result = runGuard(directory, command);
    assert.equal(result.status, 2, `${command}: ${result.stderr}`);
    assert.match(result.stderr, /authorization|commit|direct|history|indirect|nested|push|release/i);
  }
});

test("sudo environment assignments cannot hide protected Git operations", (t) => {
  const directory = createRepository(t);
  stageCandidate(directory);
  assert.equal(authorizeCommit(directory).status, 0);

  const result = runGuard(directory, 'sudo GIT_DIR=.git git commit -m "GOV-001: candidate"');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /environment|repository|target/i);
});
