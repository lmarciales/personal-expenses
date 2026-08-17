import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const COMMIT_AUTHORIZATION_FILE = "agent-commit-authorization.json";
export const MAX_AUTHORIZATION_LIFETIME_MS = 10 * 60 * 1000;

const remoteWriteOperations = new Set(["http-fetch", "http-push", "push", "receive-pack", "send-pack"]);
const historyWriteOperations = new Set([
  "am",
  "cherry-pick",
  "checkout",
  "commit",
  "commit-tree",
  "fast-import",
  "fetch",
  "filter-branch",
  "merge",
  "pull",
  "rebase",
  "reset",
  "revert",
  "switch",
  "update-ref",
]);
const protectedOperations = new Set([...remoteWriteOperations, ...historyWriteOperations]);
const conditionalWriteOperations = new Set([
  "bisect",
  "branch",
  "config",
  "hash-object",
  "notes",
  "reflog",
  "remote",
  "replace",
  "shell",
  "stash",
  "submodule",
  "subtree",
  "symbolic-ref",
  "tag",
  "worktree",
]);
const protectedCommandNames = new Set([...protectedOperations, ...conditionalWriteOperations]);
const protectedOperationPattern = [...protectedCommandNames]
  .sort((first, second) => second.length - first.length)
  .join("|");
const shellOperators = new Set(["&&", "||", ";", "|", "&", "\n"]);
const wrapperFlags = new Map([
  ["powershell", new Set(["-command", "-c", "/c"])],
  ["powershell.exe", new Set(["-command", "-c", "/c"])],
  ["pwsh", new Set(["-command", "-c", "/c"])],
  ["pwsh.exe", new Set(["-command", "-c", "/c"])],
  ["cmd", new Set(["/c", "/k"])],
  ["cmd.exe", new Set(["/c", "/k"])],
  ["bash", new Set(["-c", "-lc", "-ic"])],
  ["bash.exe", new Set(["-c", "-lc", "-ic"])],
  ["sh", new Set(["-c", "-lc", "-ic"])],
  ["sh.exe", new Set(["-c", "-lc", "-ic"])],
  ["zsh", new Set(["-c", "-lc", "-ic"])],
]);
const knownGitGlobalFlags = new Set([
  "--bare",
  "--glob-pathspecs",
  "--help",
  "--icase-pathspecs",
  "--literal-pathspecs",
  "--no-advice",
  "--no-lazy-fetch",
  "--no-optional-locks",
  "--no-pager",
  "--no-replace-objects",
  "--noglob-pathspecs",
  "--paginate",
  "--version",
  "-P",
  "-h",
  "-p",
  "-v",
]);

function normalizedCommandName(token) {
  if (typeof token !== "string") {
    return null;
  }
  return token.replace(/\\(?=[A-Za-z0-9_.-])/g, "").toLowerCase();
}

function protectedOperationName(token) {
  const normalized = normalizedCommandName(token);
  return normalized && protectedCommandNames.has(normalized) ? normalized : null;
}

function runGit(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function getRepositoryState(cwd) {
  const root = runGit(cwd, ["rev-parse", "--show-toplevel"]);
  const gitDirectory = runGit(root, ["rev-parse", "--absolute-git-dir"]);
  const branch = runGit(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const head = runGit(root, ["rev-parse", "HEAD"]);
  const indexTree = runGit(root, ["write-tree"]);
  return { root, gitDirectory, branch, head, indexTree };
}

export function getAuthorizationPath(state, operation) {
  if (operation !== "commit") {
    throw new Error("Only local commit authorization is supported.");
  }
  return path.join(state.gitDirectory, COMMIT_AUTHORIZATION_FILE);
}

function executableName(token) {
  return token.replaceAll("\\", "/").split("/").at(-1)?.toLowerCase() ?? "";
}

function isGitExecutable(token) {
  const names = [executableName(token), executableName(token.replace(/\\(?=[A-Za-z0-9_.-])/g, ""))];
  return names.some((name) => ["git", "git.exe", "git.cmd", "git.bat"].includes(name));
}

function standaloneGitCommand(token) {
  const name = executableName(token);
  for (const operation of protectedCommandNames) {
    if (
      name === `git-${operation}` ||
      name === `git-${operation}.exe` ||
      name === `git-${operation}.cmd` ||
      name === `git-${operation}.bat`
    ) {
      return operation;
    }
  }
  return null;
}

function tokenizeShell(command) {
  const tokens = [];
  let current = "";
  let quote = null;

  const flush = () => {
    if (current) {
      tokens.push(current);
      current = "";
    }
  };

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (quote) {
      if (character === quote) {
        quote = null;
      } else if (character === "\\" && quote === '"' && ["\\", '"'].includes(command[index + 1])) {
        current += command[index + 1];
        index += 1;
      } else {
        current += character;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "\r") {
    } else if (character === "\n") {
      flush();
      tokens.push("\n");
    } else if (/\s/.test(character)) {
      flush();
    } else {
      const pair = command.slice(index, index + 2);
      if (pair === "&&" || pair === "||") {
        flush();
        tokens.push(pair);
        index += 1;
      } else if ([";", "|", "&"].includes(character)) {
        flush();
        tokens.push(character);
      } else {
        current += character;
      }
    }
  }

  if (quote) {
    throw new Error("The command contains an unterminated quote.");
  }
  flush();
  return tokens;
}

function splitSegments(tokens) {
  const segments = [];
  let current = [];
  let hasCompoundSyntax = false;

  for (const token of tokens) {
    if (shellOperators.has(token)) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      hasCompoundSyntax = true;
    } else {
      current.push(token);
    }
  }
  if (current.length > 0) {
    segments.push(current);
  }
  return { segments, hasCompoundSyntax };
}

function commandIndex(tokens) {
  let index = 0;
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[index])) {
    index += 1;
  }
  return index;
}

function readInlineAlias(value) {
  const match = /^alias\.([^=]+)=(.*)$/i.exec(value);
  if (!match) {
    return null;
  }
  return { name: match[1].toLowerCase(), expansion: match[2] };
}

function readConfigEnvironmentAlias(value) {
  const match = /^alias\.([^=]+)=/i.exec(value);
  return match?.[1]?.toLowerCase() ?? null;
}

function readConfiguredAlias(cwd, name) {
  const result = spawnSync("git", ["config", "--get", `alias.${name}`], {
    cwd,
    encoding: "utf8",
  });
  if (result.status === 0) {
    return result.stdout.trim();
  }
  if (result.status === 1) {
    return null;
  }
  throw new Error(`Git alias ${name} could not be inspected.`);
}

function parseGitGlobalOptions(tokens, startIndex) {
  const aliases = new Map();
  const environmentAliases = new Set();
  let retargeted = false;
  let unsupportedConfiguration = false;
  let cursor = startIndex;

  const requireValue = (option) => {
    const value = tokens[cursor + 1];
    if (!value) {
      throw new Error(`Git ${option} is missing its value.`);
    }
    cursor += 2;
    return value;
  };

  while (cursor < tokens.length) {
    const token = tokens[cursor];
    const lower = token.toLowerCase();

    if (token === "--") {
      cursor += 1;
      break;
    }
    if (token === "-c") {
      const value = requireValue("-c");
      const alias = readInlineAlias(value);
      if (alias) {
        aliases.set(alias.name, alias.expansion);
      }
      unsupportedConfiguration = true;
      continue;
    }
    if (token.startsWith("-c") && token.length > 2) {
      const alias = readInlineAlias(token.slice(2));
      if (alias) {
        aliases.set(alias.name, alias.expansion);
      }
      unsupportedConfiguration = true;
      cursor += 1;
      continue;
    }
    if (["-C", "--git-dir", "--namespace", "--work-tree"].includes(token) || lower === "--super-prefix") {
      requireValue(token);
      retargeted = true;
      continue;
    }
    if (
      (token.startsWith("-C") && token.length > 2) ||
      lower.startsWith("--git-dir=") ||
      lower.startsWith("--namespace=") ||
      lower.startsWith("--super-prefix=") ||
      lower.startsWith("--work-tree=")
    ) {
      retargeted = true;
      cursor += 1;
      continue;
    }
    if (lower === "--config-env") {
      const value = requireValue("--config-env");
      const aliasName = readConfigEnvironmentAlias(value);
      if (aliasName) {
        environmentAliases.add(aliasName);
      }
      unsupportedConfiguration = true;
      continue;
    }
    if (lower.startsWith("--config-env=")) {
      const aliasName = readConfigEnvironmentAlias(token.slice("--config-env=".length));
      if (aliasName) {
        environmentAliases.add(aliasName);
      }
      unsupportedConfiguration = true;
      cursor += 1;
      continue;
    }
    if (lower === "--exec-path") {
      requireValue("--exec-path");
      unsupportedConfiguration = true;
      continue;
    }
    if (lower.startsWith("--exec-path=")) {
      unsupportedConfiguration = true;
      cursor += 1;
      continue;
    }
    if (knownGitGlobalFlags.has(token)) {
      cursor += 1;
      continue;
    }
    if (token.startsWith("-")) {
      unsupportedConfiguration = true;
      cursor += 1;
      continue;
    }
    break;
  }

  return {
    aliases,
    cursor,
    environmentAliases,
    retargeted,
    unsupportedConfiguration,
  };
}

function firstNonOptionArgument(args) {
  return args.find((argument) => argument !== "--" && !argument.startsWith("-"))?.toLowerCase() ?? null;
}

function optionName(argument) {
  return argument.toLowerCase().split("=")[0];
}

function matchesLongOption(argument, fullOption) {
  const name = optionName(argument);
  return name === fullOption || (name.startsWith("--") && name.length >= 3 && fullOption.startsWith(name));
}

function matchesOption(argument, options) {
  const name = optionName(argument);
  if (options.has(name)) {
    return true;
  }
  return (
    name.startsWith("--") && [...options].some((option) => option.startsWith("--") && matchesLongOption(name, option))
  );
}

function hasShortOption(argument, option) {
  return argument.startsWith("-") && !argument.startsWith("--") && argument.slice(1).includes(option);
}

function hashObjectWritesCommit(args) {
  let writesObject = false;
  let objectType = null;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index].toLowerCase();
    if (argument === "--") {
      break;
    }
    if (argument === "--type" || argument === "-t") {
      objectType = args[index + 1]?.toLowerCase() ?? null;
      index += 1;
      continue;
    }
    if (matchesLongOption(argument, "--type")) {
      const equalsIndex = argument.indexOf("=");
      if (equalsIndex >= 0) {
        objectType = argument.slice(equalsIndex + 1);
      } else {
        objectType = args[index + 1]?.toLowerCase() ?? null;
        index += 1;
      }
      continue;
    }
    if (argument === "-w") {
      writesObject = true;
      continue;
    }
    if (!argument.startsWith("-") || argument.startsWith("--")) {
      continue;
    }

    const shortOptions = argument.slice(1);
    for (let cursor = 0; cursor < shortOptions.length; cursor += 1) {
      const option = shortOptions[cursor];
      if (option === "w") {
        writesObject = true;
        continue;
      }
      if (option === "t") {
        const attachedType = shortOptions.slice(cursor + 1);
        if (attachedType) {
          objectType = attachedType;
        } else {
          objectType = args[index + 1]?.toLowerCase() ?? null;
          index += 1;
        }
        break;
      }
    }
  }

  return writesObject && objectType === "commit";
}

function configWrites(args) {
  const writeOptions = new Set([
    "--add",
    "--edit",
    "--remove-section",
    "--rename-section",
    "--replace-all",
    "--unset",
    "--unset-all",
    "-e",
  ]);
  const readOperations = new Set([
    "--get",
    "--get-all",
    "--get-color",
    "--get-colorbool",
    "--get-regexp",
    "--get-urlmatch",
    "--list",
    "-l",
  ]);
  const optionsWithValues = new Set(["--blob", "--comment", "--default", "--file", "--type", "-f"]);
  let explicitRead = false;
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index].toLowerCase();
    if (argument === "--") {
      positional.push(...args.slice(index + 1).map((value) => value.toLowerCase()));
      break;
    }
    if (matchesOption(argument, optionsWithValues)) {
      if (!argument.includes("=")) {
        index += 1;
      }
      continue;
    }
    if (hasShortOption(argument, "e")) {
      return true;
    }
    if (matchesOption(argument, writeOptions)) {
      return true;
    }
    if (matchesOption(argument, readOperations)) {
      explicitRead = true;
      continue;
    }
    if (argument.startsWith("-")) {
      continue;
    }
    positional.push(argument);
  }
  if (["edit", "remove-section", "rename-section", "set", "unset"].includes(positional[0])) {
    return true;
  }
  if (["get", "list"].includes(positional[0])) {
    return false;
  }
  return explicitRead ? false : positional.length >= 2;
}

function notesAction(args) {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index].toLowerCase();
    if (matchesLongOption(argument, "--ref")) {
      if (!argument.includes("=")) {
        index += 1;
      }
      continue;
    }
    if (argument === "--") {
      return args[index + 1]?.toLowerCase() ?? null;
    }
    if (!argument.startsWith("-")) {
      return argument;
    }
  }
  return null;
}

function submoduleForeachCommand(args) {
  if (firstNonOptionArgument(args) !== "foreach") {
    return "";
  }
  const actionIndex = args.findIndex((argument) => argument.toLowerCase() === "foreach");
  let commandIndex = actionIndex + 1;
  while (commandIndex < args.length && args[commandIndex].startsWith("-")) {
    commandIndex += 1;
  }
  return args.slice(commandIndex).join(" ");
}

function classifyGitCommand(subcommand, args) {
  if (protectedOperations.has(subcommand)) {
    return subcommand;
  }

  const lowerArgs = args.map((argument) => argument.toLowerCase());
  switch (subcommand) {
    case "branch": {
      const mutatingLongOptions = new Set([
        "--copy",
        "--delete",
        "--edit-description",
        "--force",
        "--move",
        "--set-upstream-to",
        "--unset-upstream",
      ]);
      const mutatingOption = lowerArgs.some(
        (argument) =>
          matchesOption(argument, mutatingLongOptions) ||
          (argument.startsWith("-") && !argument.startsWith("--") && /[dDmMcCfu]/.test(argument.slice(1))),
      );
      if (mutatingOption) {
        return "branch";
      }
      const readOnlyOptions = new Set([
        "--abbrev",
        "--all",
        "--color",
        "--column",
        "--contains",
        "--format",
        "--ignore-case",
        "--list",
        "--merged",
        "--no-abbrev",
        "--no-contains",
        "--no-merged",
        "--points-at",
        "--remotes",
        "--show-current",
        "--sort",
        "--verbose",
      ]);
      if (
        lowerArgs.some(
          (argument) =>
            matchesOption(argument, readOnlyOptions) ||
            (argument.startsWith("-") && !argument.startsWith("--") && /^-[arlv]+$/.test(argument)),
        ) ||
        lowerArgs.every((argument) => argument.startsWith("-"))
      ) {
        return null;
      }
      return lowerArgs.length === 0 ? null : "branch";
    }
    case "hash-object":
      return hashObjectWritesCommit(args) ? "hash-object" : null;
    case "config":
      return configWrites(args) ? "config" : null;
    case "notes": {
      const action = notesAction(args);
      return !action || ["get-ref", "list", "show"].includes(action) ? null : "notes";
    }
    case "replace":
      return lowerArgs.length === 0 || lowerArgs.includes("--list") || lowerArgs.includes("-l") ? null : "replace";
    case "stash": {
      const action = lowerArgs[0];
      return ["list", "show"].includes(action) ? null : "stash";
    }
    case "symbolic-ref": {
      if (lowerArgs.some((argument) => matchesLongOption(argument, "--delete") || hasShortOption(argument, "d"))) {
        return "symbolic-ref";
      }
      const positional = args.filter((argument) => argument !== "--" && !argument.startsWith("-"));
      return positional.length <= 1 ? null : "symbolic-ref";
    }
    case "tag": {
      const mutatingLongOptions = new Set([
        "--annotate",
        "--cleanup",
        "--create-reflog",
        "--delete",
        "--file",
        "--force",
        "--local-user",
        "--message",
        "--sign",
      ]);
      const mutatingOption = lowerArgs.some(
        (argument) =>
          matchesOption(argument, mutatingLongOptions) ||
          (argument.startsWith("-") && !argument.startsWith("--") && /^-[asufdm]/.test(argument)),
      );
      if (mutatingOption) {
        return "tag";
      }
      const readOnlyOptions = new Set([
        "--color",
        "--column",
        "--contains",
        "--format",
        "--ignore-case",
        "--list",
        "--merged",
        "--no-contains",
        "--no-merged",
        "--points-at",
        "--sort",
        "--verify",
      ]);
      const readOnlyQuery = lowerArgs.some(
        (argument) =>
          matchesOption(argument, readOnlyOptions) ||
          argument === "-l" ||
          argument === "-v" ||
          /^-n\d*$/.test(argument),
      );
      return lowerArgs.length === 0 || readOnlyQuery ? null : "tag";
    }
    case "worktree":
      return firstNonOptionArgument(args) === "list" ? null : "worktree";
    case "subtree": {
      const action = lowerArgs.find((argument) => ["add", "merge", "pull", "push", "split"].includes(argument));
      if (action === "push") {
        return "push";
      }
      return action ? "commit-tree" : null;
    }
    case "submodule":
      return firstNonOptionArgument(args) === "update" ? "fetch" : null;
    case "remote": {
      const action = firstNonOptionArgument(args);
      if (
        action === "update" ||
        (action === "add" &&
          lowerArgs.some((argument) => hasShortOption(argument, "f") || matchesLongOption(argument, "--fetch")))
      ) {
        return "fetch";
      }
      if (
        action === "add" &&
        lowerArgs.some((argument) => hasShortOption(argument, "m") || matchesLongOption(argument, "--master"))
      ) {
        return "update-ref";
      }
      return ["prune", "remove", "rename", "rm", "set-head"].includes(action) ? "update-ref" : null;
    }
    case "reflog": {
      const action = firstNonOptionArgument(args);
      return ["delete", "drop", "expire", "write"].includes(action) ? "reflog" : null;
    }
    case "bisect": {
      const action = firstNonOptionArgument(args);
      return ["log", "terms", "view", "visualize"].includes(action) ? null : "bisect";
    }
    default:
      return null;
  }
}

const knownGitBuiltinCommands = new Set([
  ...protectedCommandNames,
  "add",
  "apply",
  "bisect",
  "blame",
  "bugreport",
  "bundle",
  "cat-file",
  "check-ignore",
  "clean",
  "clone",
  "config",
  "describe",
  "diff",
  "diff-tree",
  "for-each-ref",
  "format-patch",
  "grep",
  "help",
  "init",
  "log",
  "ls-files",
  "ls-remote",
  "ls-tree",
  "merge-base",
  "mv",
  "name-rev",
  "remote",
  "restore",
  "rev-list",
  "rev-parse",
  "rm",
  "shortlog",
  "shell",
  "show",
  "show-ref",
  "sparse-checkout",
  "status",
  "submodule",
  "subtree",
  "verify-commit",
  "verify-tag",
  "version",
  "write-tree",
]);

function isDynamicCommandToken(token) {
  return (
    typeof token === "string" &&
    (token.includes("$") ||
      token.includes("%") ||
      token.includes(String.fromCharCode(96)) ||
      /![A-Za-z_][A-Za-z0-9_]*!/.test(token) ||
      token.startsWith("@(") ||
      token.startsWith("("))
  );
}

function operationFromAlias(
  expansion,
  cwd,
  inheritedAliases = new Map(),
  inheritedArgs = [],
  depth = 0,
  visited = new Set(),
) {
  const normalized = expansion.trim();
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith("!") || depth > 8) {
    return "alias-shell";
  }

  const tokens = tokenizeShell(normalized);
  const options = parseGitGlobalOptions(tokens, 0);
  const aliases = new Map([...inheritedAliases, ...options.aliases]);
  const rawSubcommand = tokens[options.cursor];
  const protectedSubcommand = protectedOperationName(rawSubcommand);
  const subcommand = protectedSubcommand ?? normalizedCommandName(rawSubcommand);
  if (!subcommand || isDynamicCommandToken(rawSubcommand)) {
    return "alias-shell";
  }
  const args = [...tokens.slice(options.cursor + 1), ...inheritedArgs];
  const nestedSubmoduleCommand = subcommand === "submodule" ? submoduleForeachCommand(args) : "";
  if (nestedSubmoduleCommand) {
    const child = inspectCommand(nestedSubmoduleCommand, cwd, true, depth + 1);
    const childInvocation = child.invocations[0];
    if (childInvocation || child.hasOpaqueShell) {
      return childInvocation?.operation ?? "alias-shell";
    }
  }
  if (subcommand === "shell") {
    const commandIndex = args.findIndex((argument) => argument.toLowerCase() === "-c");
    const nestedCommand = commandIndex >= 0 ? args.slice(commandIndex + 1).join(" ") : "";
    if (nestedCommand) {
      const child = inspectCommand(nestedCommand, cwd, true, depth + 1);
      const childInvocation = child.invocations[0];
      if (childInvocation || child.hasOpaqueShell) {
        return childInvocation?.operation ?? "alias-shell";
      }
    }
  }
  const operation = classifyGitCommand(subcommand, args);
  if (operation) {
    return operation;
  }
  if (conditionalWriteOperations.has(subcommand) && args.some(isDynamicCommandToken)) {
    return "alias-shell";
  }

  const nestedAlias = aliases.get(subcommand);
  if (nestedAlias) {
    if (visited.has(subcommand)) {
      return "alias-shell";
    }
    const nextVisited = new Set(visited);
    nextVisited.add(subcommand);
    return operationFromAlias(nestedAlias, cwd, aliases, args, depth + 1, nextVisited);
  }
  if (options.environmentAliases.has(subcommand)) {
    return "alias-shell";
  }

  if (!knownGitBuiltinCommands.has(subcommand)) {
    const configuredAlias = readConfiguredAlias(cwd, subcommand);
    if (configuredAlias) {
      if (visited.has(subcommand)) {
        return "alias-shell";
      }
      const nextVisited = new Set(visited);
      nextVisited.add(subcommand);
      return operationFromAlias(configuredAlias, cwd, aliases, args, depth + 1, nextVisited);
    }
    return "alias-shell";
  }

  return options.retargeted || options.unsupportedConfiguration ? "alias-shell" : null;
}

function parseGitInvocation(tokens, cwd, nested, depth = 0, context = {}) {
  const executableIndex = commandIndex(tokens);
  const executable = tokens[executableIndex] ?? "";
  const unsafeEnvironment =
    Boolean(context.unsafeEnvironment) ||
    tokens.slice(0, executableIndex).some((token) => /^GIT_[A-Za-z0-9_]*=/i.test(token));
  const inheritedRetargeting = Boolean(context.retargeted);
  const standaloneCommand = standaloneGitCommand(executable);
  if (standaloneCommand) {
    const args = tokens.slice(executableIndex + 1);
    const operation = classifyGitCommand(standaloneCommand, args);
    if (!operation) {
      if (
        conditionalWriteOperations.has(standaloneCommand) &&
        (Boolean(context.dynamicShell) || args.some(isDynamicCommandToken))
      ) {
        return indirectInvocation(standaloneCommand);
      }
      return null;
    }
    return {
      operation,
      args,
      nested,
      retargeted: inheritedRetargeting,
      viaAlias: true,
      unsafeEnvironment,
      unsupportedConfiguration: false,
    };
  }
  if (!isGitExecutable(executable)) {
    return null;
  }

  const options = parseGitGlobalOptions(tokens, executableIndex + 1);
  const rawSubcommand = tokens[options.cursor];
  if (!rawSubcommand) {
    return null;
  }
  const subcommand = protectedOperationName(rawSubcommand) ?? normalizedCommandName(rawSubcommand);
  const args = tokens.slice(options.cursor + 1);
  const retargeted = inheritedRetargeting || options.retargeted;
  const operation = classifyGitCommand(subcommand, args);
  if (operation) {
    return {
      operation,
      args,
      nested,
      retargeted,
      viaAlias: false,
      unsafeEnvironment,
      unsupportedConfiguration: options.unsupportedConfiguration,
    };
  }
  if (
    conditionalWriteOperations.has(subcommand) &&
    (Boolean(context.dynamicShell) || args.some(isDynamicCommandToken))
  ) {
    return indirectInvocation(subcommand);
  }

  if (subcommand === "submodule") {
    const nestedCommand = submoduleForeachCommand(args);
    if (nestedCommand) {
      const child = inspectCommand(nestedCommand, cwd, true, depth + 1, {
        retargeted,
        unsafeEnvironment,
      });
      const childInvocation = child.invocations[0];
      if (childInvocation || child.hasOpaqueShell) {
        return {
          ...(childInvocation ?? indirectInvocation("unknown-dispatch")),
          indirect: true,
          nested: true,
        };
      }
    }
  }

  if (subcommand === "shell") {
    const commandIndex = args.findIndex((argument) => argument.toLowerCase() === "-c");
    const nestedCommand = commandIndex >= 0 ? args.slice(commandIndex + 1).join(" ") : "";
    if (nestedCommand) {
      const child = inspectCommand(nestedCommand, cwd, true, depth + 1, {
        retargeted,
        unsafeEnvironment,
      });
      const childInvocation = child.invocations[0];
      if (childInvocation || child.hasOpaqueShell) {
        return {
          ...(childInvocation ?? indirectInvocation("unknown-dispatch")),
          indirect: true,
          nested: true,
        };
      }
    }
  }

  const dynamicDispatch = isDynamicCommandToken(rawSubcommand);
  if (dynamicDispatch) {
    return indirectInvocation("unknown-dispatch");
  }

  if (unsafeEnvironment || options.unsupportedConfiguration || retargeted) {
    return {
      operation: "unknown-dispatch",
      args,
      nested,
      retargeted,
      viaAlias: false,
      unsafeEnvironment,
      unsupportedConfiguration: options.unsupportedConfiguration,
    };
  }

  const inlineExpansion = options.aliases.get(subcommand);
  const configuredExpansion = knownGitBuiltinCommands.has(subcommand) ? null : readConfiguredAlias(cwd, subcommand);
  const expansion = inlineExpansion ?? configuredExpansion;
  if (!expansion) {
    if (options.environmentAliases.has(subcommand)) {
      return {
        operation: "alias-shell",
        args,
        nested,
        retargeted,
        viaAlias: true,
        unsafeEnvironment,
        unsupportedConfiguration: options.unsupportedConfiguration,
      };
    }
    if (knownGitBuiltinCommands.has(subcommand)) {
      return null;
    }
    return {
      operation: "unknown-dispatch",
      args,
      nested,
      retargeted,
      viaAlias: false,
      unsafeEnvironment,
      unsupportedConfiguration: options.unsupportedConfiguration,
    };
  }
  const aliasOperation = operationFromAlias(expansion, cwd, options.aliases, args);
  if (!aliasOperation) {
    return null;
  }
  return {
    operation: aliasOperation,
    args,
    nested,
    retargeted,
    viaAlias: true,
    unsafeEnvironment,
    unsupportedConfiguration: options.unsupportedConfiguration,
  };
}

function indirectInvocation(operation) {
  return {
    operation,
    args: [],
    nested: true,
    retargeted: false,
    viaAlias: false,
    indirect: true,
  };
}

function foldConstantStringConcatenations(command) {
  let folded = command;
  const adjacentStrings = /(?:"([^"\\]*)"|'([^'\\]*)')\s*\+\s*(?:"([^"\\]*)"|'([^'\\]*)')/g;

  for (let pass = 0; pass < 8; pass += 1) {
    const next = folded.replace(adjacentStrings, (_match, firstDouble, firstSingle, secondDouble, secondSingle) => {
      const first = firstDouble ?? firstSingle ?? "";
      const second = secondDouble ?? secondSingle ?? "";
      return `"${first}${second}"`;
    });
    if (next === folded) {
      break;
    }
    folded = next;
  }

  return folded;
}

function detectIndirectPowerShellInvocation(command) {
  const foldedCommand = foldConstantStringConcatenations(command);
  const launcherMatch = new RegExp(
    `(?:Start-Process|saps|Start-Job|start)\\b[\\s\\S]{0,200}\\bgit(?:\\.exe|\\.cmd|\\.bat)?\\b[\\s\\S]{0,200}\\b(${protectedOperationPattern})\\b`,
    "i",
  ).exec(foldedCommand);
  if (launcherMatch) {
    return indirectInvocation(launcherMatch[1].toLowerCase());
  }

  const expressionMatch = new RegExp(
    `(?:Invoke-Expression|iex|Get-Command)\\b[\\s\\S]{0,200}\\bgit(?:\\.exe|\\.cmd|\\.bat)?\\b[\\s\\S]{0,200}\\b(${protectedOperationPattern})\\b`,
    "i",
  ).exec(foldedCommand);
  if (expressionMatch) {
    return indirectInvocation(expressionMatch[1].toLowerCase());
  }

  const assignments = new Map();
  const assignmentPattern = /\$(?:(env):)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s;]+))/gi;
  for (const match of foldedCommand.matchAll(assignmentPattern)) {
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    if (isGitExecutable(value)) {
      const scope = match[1] ? "env" : "local";
      assignments.set(`${scope}:${match[2].toLowerCase()}`, true);
    }
  }

  const dynamicLauncherPattern = new RegExp(
    `(?:Start-Process|saps|Start-Job|start)\\b[\\s\\S]{0,120}?\\$(?:(env):)?([A-Za-z_][A-Za-z0-9_]*)[\\s\\S]{0,200}?\\b(${protectedOperationPattern})\\b`,
    "gi",
  );
  for (const match of foldedCommand.matchAll(dynamicLauncherPattern)) {
    const scope = match[1] ? "env" : "local";
    if (assignments.has(`${scope}:${match[2].toLowerCase()}`)) {
      return indirectInvocation(match[3].toLowerCase());
    }
  }

  const invocationPattern = new RegExp(
    `&?\\s*\\$(?:(env):)?([A-Za-z_][A-Za-z0-9_]*)\\s+(${protectedOperationPattern})\\b`,
    "gi",
  );
  for (const match of foldedCommand.matchAll(invocationPattern)) {
    const scope = match[1] ? "env" : "local";
    if (assignments.has(`${scope}:${match[2].toLowerCase()}`)) {
      return indirectInvocation(match[3].toLowerCase());
    }
  }
  return null;
}

function detectDynamicInvocationFromSegments(segments) {
  const definedCommands = new Set();

  for (const segment of segments) {
    const executableIndex = commandIndex(segment);
    const executable = segment[executableIndex] ?? "";
    const executableLower = executable.toLowerCase();
    const executableBase = executableName(executable);
    const remaining = segment.slice(executableIndex + 1);
    const operation = remaining.map((token) => protectedOperationName(token)).find(Boolean);

    const dynamicExecutable =
      executable.startsWith("$") ||
      executable.startsWith("@(") ||
      executable.startsWith("(") ||
      executable.startsWith("[") ||
      /^%[A-Za-z_][A-Za-z0-9_]*%$/.test(executable);
    if (dynamicExecutable && operation) {
      return indirectInvocation(operation);
    }

    if (["set-alias", "new-alias", "sal", "nal"].includes(executableBase)) {
      const nameIndex = remaining.findIndex((token) => !token.startsWith("-"));
      if (nameIndex >= 0) {
        definedCommands.add(remaining[nameIndex].toLowerCase());
      }
      continue;
    }

    if (executableBase === "function" && remaining[0]) {
      definedCommands.add(remaining[0].toLowerCase());
      continue;
    }

    if (executableBase === "alias") {
      for (const token of remaining) {
        const aliasName = /^([A-Za-z_][A-Za-z0-9_-]*)=/.exec(token)?.[1];
        if (aliasName) {
          definedCommands.add(aliasName.toLowerCase());
        }
      }
      continue;
    }

    if (definedCommands.has(executableLower) && operation) {
      return indirectInvocation(operation);
    }
  }

  return null;
}

function normalizeShellEscapes(command) {
  return command
    .replace(/\^([A-Za-z0-9_-])/g, "$1")
    .split(String.fromCharCode(96))
    .join("");
}

function isPowerShellEncodedFlag(token) {
  const lower = token.toLowerCase();
  let parameter = null;
  if (lower.startsWith("--")) {
    parameter = lower.slice(2);
  } else if (lower.startsWith("-") || lower.startsWith("/")) {
    parameter = lower.slice(1);
  }
  return Boolean(parameter) && "encodedcommand".startsWith(parameter);
}

function isPowerShellCommandFlag(token) {
  const lower = token.toLowerCase();
  let parameter = null;
  if (lower.startsWith("--")) {
    parameter = lower.slice(2);
  } else if (lower.startsWith("-") || lower.startsWith("/")) {
    parameter = lower.slice(1);
  }
  return Boolean(parameter) && "command".startsWith(parameter);
}

const envOptionsWithValues = new Set(["-a", "-u", "--argv0", "--unset"]);
const sudoOptionsWithValues = new Set([
  "-C",
  "-D",
  "-g",
  "-h",
  "-p",
  "-R",
  "-r",
  "-T",
  "-t",
  "-U",
  "-u",
  "--chdir",
  "--close-from",
  "--group",
  "--host",
  "--prompt",
  "--role",
  "--type",
  "--user",
]);

function readOptionValue(tokens, cursor, option) {
  const value = tokens[cursor + 1];
  if (!value) {
    throw new Error(`${option} is missing its value.`);
  }
  return value;
}

function parseTransparentWrapper(tokens, executableIndex, wrapperName) {
  if (!["command", "env", "exec", "sudo"].includes(wrapperName)) {
    return null;
  }

  let cursor = executableIndex + 1;
  let retargeted = false;
  let unsafeEnvironment = tokens.slice(0, executableIndex).some((token) => /^GIT_[A-Za-z0-9_]*=/i.test(token));

  if (wrapperName === "command") {
    while (cursor < tokens.length && tokens[cursor].startsWith("-")) {
      cursor += 1;
    }
  } else if (wrapperName === "exec") {
    while (cursor < tokens.length) {
      const token = tokens[cursor];
      if (token === "--") {
        cursor += 1;
        break;
      }
      if (token === "-a") {
        readOptionValue(tokens, cursor, token);
        cursor += 2;
        continue;
      }
      if (token.startsWith("-")) {
        cursor += 1;
        continue;
      }
      break;
    }
  } else if (wrapperName === "sudo") {
    while (cursor < tokens.length) {
      const token = tokens[cursor];
      const lower = token.toLowerCase();
      if (token === "--") {
        cursor += 1;
        break;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) {
        unsafeEnvironment ||= /^GIT_[A-Za-z0-9_]*=/i.test(token);
        cursor += 1;
        continue;
      }
      if (sudoOptionsWithValues.has(token) || sudoOptionsWithValues.has(lower)) {
        readOptionValue(tokens, cursor, token);
        cursor += 2;
        continue;
      }
      if (token.startsWith("-")) {
        cursor += 1;
        continue;
      }
      break;
    }
  } else {
    while (cursor < tokens.length) {
      const token = tokens[cursor];
      const lower = token.toLowerCase();
      if (token === "--") {
        cursor += 1;
        break;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) {
        unsafeEnvironment ||= /^GIT_[A-Za-z0-9_]*=/i.test(token);
        cursor += 1;
        continue;
      }
      if (["-C", "--chdir"].includes(token) || lower === "--chdir") {
        readOptionValue(tokens, cursor, token);
        retargeted = true;
        cursor += 2;
        continue;
      }
      if ((token.startsWith("-C") && token.length > 2) || lower.startsWith("--chdir=")) {
        retargeted = true;
        cursor += 1;
        continue;
      }
      if (["-S", "--split-string"].includes(token) || lower === "--split-string") {
        const splitCommand = readOptionValue(tokens, cursor, token);
        return {
          command: [splitCommand, ...tokens.slice(cursor + 2)].join(" "),
          retargeted,
          unsafeEnvironment,
        };
      }
      if (token.startsWith("-S") && token.length > 2) {
        return {
          command: [token.slice(2), ...tokens.slice(cursor + 1)].join(" "),
          retargeted,
          unsafeEnvironment,
        };
      }
      if (lower.startsWith("--split-string=")) {
        return {
          command: [token.slice(token.indexOf("=") + 1), ...tokens.slice(cursor + 1)].join(" "),
          retargeted,
          unsafeEnvironment,
        };
      }
      if (envOptionsWithValues.has(token) || envOptionsWithValues.has(lower)) {
        readOptionValue(tokens, cursor, token);
        cursor += 2;
        continue;
      }
      if (token.startsWith("-")) {
        cursor += 1;
        continue;
      }
      break;
    }
  }

  return {
    command: tokens.slice(cursor).join(" "),
    retargeted,
    unsafeEnvironment,
  };
}

function segmentsMutateGitEnvironment(segments) {
  return segments.some((segment) => {
    const executableIndex = commandIndex(segment);
    if (segment.slice(0, executableIndex).some((token) => /^GIT_[A-Za-z0-9_]*=/i.test(token))) {
      return true;
    }

    const executable = executableName(segment[executableIndex] ?? "");
    const remaining = segment.slice(executableIndex + 1);
    if (["declare", "export", "set", "setenv", "setx", "typeset"].includes(executable)) {
      return remaining.some((token) => /^GIT_[A-Za-z0-9_]*=/i.test(token));
    }

    return segment.some((token) => /^\$env:GIT_[A-Za-z0-9_]*=/i.test(token));
  });
}

function inspectCommand(command, cwd, nested = false, depth = 0, context = {}) {
  if (depth > 8) {
    throw new Error("Nested shell depth exceeds the guard limit.");
  }

  const normalizedCommand = normalizeShellEscapes(command);
  const escapedCommand = normalizedCommand !== command;
  const dynamicShell = escapedCommand || command.includes("$(") || command.includes(String.fromCharCode(96));
  const tokens = tokenizeShell(normalizedCommand);
  const { segments, hasCompoundSyntax } = splitSegments(tokens);
  const effectiveContext = {
    ...context,
    dynamicShell: Boolean(context.dynamicShell) || dynamicShell,
    unsafeEnvironment: Boolean(context.unsafeEnvironment) || segmentsMutateGitEnvironment(segments),
  };
  const invocations = [];
  let compound = hasCompoundSyntax;
  let hasOpaqueShell = false;

  for (const segment of segments) {
    const executableIndex = commandIndex(segment);
    const wrapperName = executableName(segment[executableIndex] ?? "");
    if (["{", "("].includes(wrapperName)) {
      const closingToken = wrapperName === "{" ? "}" : ")";
      const nestedTokens = segment.slice(executableIndex + 1);
      if (nestedTokens.at(-1) === closingToken) {
        nestedTokens.pop();
      }
      const nestedCommand = nestedTokens.join(" ");
      if (nestedCommand) {
        const child = inspectCommand(nestedCommand, cwd, true, depth + 1, effectiveContext);
        invocations.push(...child.invocations);
        compound = true;
        hasOpaqueShell ||= child.hasOpaqueShell;
      }
      continue;
    }
    if (["}", ")"].includes(wrapperName)) {
      compound = true;
      continue;
    }
    if (
      ["powershell", "powershell.exe", "pwsh", "pwsh.exe"].includes(wrapperName) &&
      segment.some((token, index) => index > executableIndex && isPowerShellEncodedFlag(token))
    ) {
      hasOpaqueShell = true;
      continue;
    }

    const transparentWrapper = parseTransparentWrapper(segment, executableIndex, wrapperName);
    if (transparentWrapper) {
      if (transparentWrapper.command) {
        const child = inspectCommand(transparentWrapper.command, cwd, true, depth + 1, {
          retargeted: Boolean(effectiveContext.retargeted) || transparentWrapper.retargeted,
          unsafeEnvironment: Boolean(effectiveContext.unsafeEnvironment) || transparentWrapper.unsafeEnvironment,
        });
        invocations.push(...child.invocations);
        compound ||= child.hasCompoundSyntax;
        hasOpaqueShell ||= child.hasOpaqueShell;
      }
      continue;
    }

    const flags = wrapperFlags.get(wrapperName);
    if (flags) {
      const powerShellWrapper = ["powershell", "powershell.exe", "pwsh", "pwsh.exe"].includes(wrapperName);
      const flagIndex = segment.findIndex(
        (token, index) =>
          index > executableIndex &&
          (powerShellWrapper ? isPowerShellCommandFlag(token) : flags.has(token.toLowerCase())),
      );
      if (flagIndex >= 0) {
        const nestedCommand = segment.slice(flagIndex + 1).join(" ");
        if (!nestedCommand) {
          throw new Error("A shell wrapper command is missing.");
        }
        const child = inspectCommand(nestedCommand, cwd, true, depth + 1, effectiveContext);
        invocations.push(...child.invocations);
        compound ||= child.hasCompoundSyntax;
        hasOpaqueShell ||= child.hasOpaqueShell;
        continue;
      }
    }

    if (wrapperName === "wsl" || wrapperName === "wsl.exe") {
      const nestedCommand = segment.slice(executableIndex + 1).join(" ");
      if (nestedCommand) {
        const child = inspectCommand(nestedCommand, cwd, true, depth + 1, effectiveContext);
        invocations.push(...child.invocations);
        compound ||= child.hasCompoundSyntax;
        hasOpaqueShell ||= child.hasOpaqueShell;
      }
      continue;
    }
    if (wrapperName === "invoke-expression" || wrapperName === "iex") {
      const nestedCommand = segment.slice(executableIndex + 1).join(" ");
      if (nestedCommand) {
        const child = inspectCommand(nestedCommand, cwd, true, depth + 1, effectiveContext);
        invocations.push(...child.invocations);
        compound ||= child.hasCompoundSyntax;
        hasOpaqueShell ||= child.hasOpaqueShell;
      }
      continue;
    }

    const invocation = parseGitInvocation(segment, cwd, nested || escapedCommand, depth, effectiveContext);
    if (invocation) {
      invocations.push(invocation);
      continue;
    }

    if (!["alias", "function", "nal", "new-alias", "sal", "set-alias"].includes(wrapperName)) {
      for (let index = executableIndex + 1; index < segment.length; index += 1) {
        if (!isGitExecutable(segment[index]) && !standaloneGitCommand(segment[index])) {
          continue;
        }
        const embeddedInvocation = parseGitInvocation(segment.slice(index), cwd, true, depth, effectiveContext);
        if (embeddedInvocation) {
          invocations.push(embeddedInvocation);
        }
      }
    }
  }

  if (invocations.length === 0) {
    const dynamic = detectDynamicInvocationFromSegments(segments);
    if (dynamic) {
      invocations.push(dynamic);
    }
  }

  if (invocations.length === 0) {
    const indirect = detectIndirectPowerShellInvocation(normalizedCommand);
    if (indirect) {
      invocations.push(indirect);
    }
  }

  return {
    invocations,
    hasCompoundSyntax: compound,
    hasOpaqueShell,
    hasDynamicShell: Boolean(effectiveContext.dynamicShell),
  };
}

export function detectGitOperations(command, cwd = process.cwd()) {
  return inspectCommand(command, cwd).invocations;
}

function parseCommitArguments(args) {
  const messages = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "-q" || argument === "--quiet") {
      continue;
    }
    if (argument === "-m" || argument === "--message") {
      const message = args[index + 1];
      if (!message) {
        throw new Error("The commit message flag requires a value.");
      }
      messages.push(message);
      index += 1;
      continue;
    }
    if (argument.startsWith("--message=") && argument.length > 10) {
      messages.push(argument.slice(10));
      continue;
    }
    throw new Error(
      "Direct commit accepts only a task-prefixed message and optional quiet flag; staging flags, pathspecs, and other commit options are unsupported.",
    );
  }
  if (messages.length === 0) {
    throw new Error("A commit message supplied with -m is required.");
  }
  return messages;
}

function readAuthorization(state) {
  const authorizationPath = getAuthorizationPath(state, "commit");
  let authorization;
  try {
    authorization = JSON.parse(readFileSync(authorizationPath, "utf8"));
  } catch {
    throw new Error("Commit authorization is missing or malformed.");
  }
  if (!authorization || typeof authorization !== "object" || Array.isArray(authorization)) {
    throw new Error("Commit authorization is malformed.");
  }
  return authorization;
}

function validateCommitAuthorization(state, messages) {
  const authorization = readAuthorization(state);
  const now = Date.now();
  const issuedAt = Date.parse(authorization.issuedAt);
  const expiresAt = Date.parse(authorization.expiresAt);

  if (
    authorization.version !== 1 ||
    authorization.operation !== "commit" ||
    typeof authorization.task !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/.test(authorization.task)
  ) {
    throw new Error("Commit authorization fields are invalid.");
  }
  if (Number.isNaN(issuedAt) || Number.isNaN(expiresAt) || issuedAt > now + 30_000 || expiresAt <= now) {
    throw new Error("Commit authorization expiry is invalid.");
  }
  const lifetime = expiresAt - issuedAt;
  if (lifetime <= 0 || lifetime > MAX_AUTHORIZATION_LIFETIME_MS) {
    throw new Error("Commit authorization lifetime exceeds the maximum.");
  }
  if (state.branch !== "main" || authorization.branch !== "main" || authorization.branch !== state.branch) {
    throw new Error("The active branch and authorization must both be main.");
  }
  if (authorization.head !== state.head) {
    throw new Error("HEAD changed after commit authorization.");
  }
  if (authorization.tree !== state.indexTree) {
    throw new Error("The staged candidate tree changed after authorization.");
  }
  if (!messages[0].startsWith(`${authorization.task}:`)) {
    throw new Error("The commit message must begin with the authorized task identifier.");
  }
}

export function evaluateHookInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Hook input must be a JSON object.");
  }
  const toolInput = input.tool_input;
  if (!toolInput || typeof toolInput !== "object" || Array.isArray(toolInput)) {
    throw new Error("Hook tool input is missing.");
  }

  const command = toolInput.command ?? toolInput.cmd;
  if (typeof command !== "string") {
    throw new Error("Hook command input is missing.");
  }
  if (!command.trim()) {
    return { allowed: true };
  }

  const cwd = input.tool_cwd ?? toolInput.workdir ?? toolInput.cwd ?? input.workdir ?? input.cwd ?? process.cwd();
  if (typeof cwd !== "string" || !cwd) {
    throw new Error("Hook working directory is invalid.");
  }

  const inspection = inspectCommand(command, cwd);
  const invocations = inspection.invocations;
  if (inspection.hasOpaqueShell) {
    return {
      allowed: false,
      reason: "Encoded or dynamic shell launchers are opaque to the Git operation guard and are not allowed.",
    };
  }
  if (invocations.length === 0) {
    return { allowed: true };
  }
  if (invocations.some((invocation) => invocation.indirect)) {
    return {
      allowed: false,
      reason: "Indirect or dynamic launchers cannot run protected Git operations.",
    };
  }
  if (invocations.length > 1 || inspection.hasCompoundSyntax) {
    return {
      allowed: false,
      reason: "Run each protected Git operation as a separate command; compound dispatch is unsupported.",
    };
  }

  const invocation = invocations[0];
  if (remoteWriteOperations.has(invocation.operation)) {
    return {
      allowed: false,
      reason:
        "Push authorization and equivalent remote Git writes are disabled until GOV-005 provides the explicit release workflow.",
    };
  }
  if (invocation.unsafeEnvironment) {
    return {
      allowed: false,
      reason: "Protected Git operations cannot use repository-altering Git environment assignments.",
    };
  }
  if (invocation.unsupportedConfiguration) {
    return {
      allowed: false,
      reason: "Protected Git operations cannot use inline or environment-backed Git configuration.",
    };
  }
  if (invocation.nested || inspection.hasDynamicShell) {
    return {
      allowed: false,
      reason: "Protected Git operations cannot run through a nested shell, wrapper, or dynamic expansion.",
    };
  }
  if (invocation.retargeted) {
    return {
      allowed: false,
      reason: "Protected Git operations cannot retarget another repository; retargeted dispatch is unsupported.",
    };
  }
  if (invocation.viaAlias || invocation.operation === "alias-shell") {
    return {
      allowed: false,
      reason: "Protected Git aliases and standalone helpers are not allowed.",
    };
  }
  if (invocation.operation !== "commit") {
    return {
      allowed: false,
      reason:
        "Only a direct, candidate-bound Git commit is supported; other history-writing Git operations are not authorized.",
    };
  }

  try {
    const messages = parseCommitArguments(invocation.args);
    const state = getRepositoryState(cwd);
    validateCommitAuthorization(state, messages);
    return { allowed: true };
  } catch (error) {
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : "Commit authorization failed.",
    };
  }
}

export async function runGitOperationGuard() {
  let rawInput = "";
  for await (const chunk of process.stdin) {
    rawInput += chunk;
  }

  try {
    let input;
    try {
      input = JSON.parse(rawInput);
    } catch {
      throw new Error("Hook input is not valid JSON.");
    }
    const result = evaluateHookInput(input);
    if (!result.allowed) {
      process.stderr.write(`BLOCKED: ${result.reason}\n`);
      process.exitCode = 2;
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown hook input error.";
    process.stderr.write(`BLOCKED: Unable to inspect hook input: ${detail}\n`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await runGitOperationGuard();
}
