export const RULE = Object.freeze({
  ENV_PATH: "ENV_PATH",
  PLATFORM_PATH: "PLATFORM_PATH",
  ARTIFACT_PATH: "ARTIFACT_PATH",
  SYMLINK: "SYMLINK",
  SUBMODULE: "SUBMODULE",
  UNKNOWN_MODE: "UNKNOWN_MODE",
  UNKNOWN_STATUS: "UNKNOWN_STATUS",
  OVERSIZED_BLOB: "OVERSIZED_BLOB",
  UNSAFE_PATH: "UNSAFE_PATH",
  UNAPPROVED_BINARY: "UNAPPROVED_BINARY",
  PRIVATE_KEY: ["PRIVATE", "KEY"].join("_"),
  CREDENTIAL_LITERAL: "CREDENTIAL_LITERAL",
  CREDENTIAL_URL: "CREDENTIAL_URL",
  SECRET_SHAPE: ["SECRET", "SHAPE"].join("_"),
  EMAIL: "EMAIL",
  HOME_PATH: "HOME_PATH",
  EXPORT_SIGNATURE: "EXPORT_SIGNATURE",
});

export const MAX_BLOB_BYTES = 5 * 1024 * 1024;
export const APPROVED_ASSET_PREFIXES = Object.freeze(["public/", "src/assets/", "docs/assets/public/"]);
export const SYNTHETIC_EMAIL_DOMAINS = Object.freeze(["example.invalid", "example.com", "example.org", "localhost"]);

const INSPECTED_STATUSES = new Set(["A", "C", "M", "R", "T"]);
const REGULAR_FILE_MODES = new Set(["100644", "100755"]);
const ARTIFACT_SEGMENTS = new Set([
  "export",
  "exports",
  "receipt",
  "receipts",
  "statement",
  "statements",
  "backup",
  "backups",
  "dump",
  "dumps",
  "logs",
  "log",
  "coverage",
  "test-results",
  "playwright-report",
  "blob-report",
  ".nyc_output",
  "browser-profile",
  "chrome-profile",
  "test-output",
]);
const ARTIFACT_FILENAMES = new Set(["id_rsa", "id_ed25519", "id_dsa", "id_ecdsa"]);
const ARTIFACT_EXTENSIONS = new Set([
  "har",
  "trace",
  "pem",
  "p12",
  "pfx",
  "jks",
  "keystore",
  "sqlite",
  "sqlite3",
  "dump",
  "bak",
  "backup",
  "zip",
  "tar",
  "tgz",
  "7z",
  "rar",
  "log",
  "key",
]);
const ARTIFACT_STEM = /^(?:.+-)?(?:receipt|statement|export|backup|dump)s?$/i;
const CREDENTIAL_NAME =
  /(?:password|secret|api[_-]?key|private[_-]?key|access[_-]?token|service[_-]?role|auth[_-]?token|aws_secret_access_key|supabase_service_role)/i;
const PLACEHOLDER_VALUE =
  /^(?:<.*>|your[_-].*|changeme|placeholder|example|xxx+|todo|replace[_-]?me|insert[_-]?.*|dummy)$/i;
const PRIVATE_KEY_MARK = new RegExp(`-----BEGIN [A-Z0-9 ]*${["PRIVATE", " KEY-----"].join("")}`);
const CREDENTIAL_URL = /[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]+@/i;
const SECRET_SHAPES = [
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /\bgho_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  /\bsk_live_[A-Za-z0-9]{16,}\b/,
  /\bAIza[A-Za-z0-9_-]{20,}\b/,
];
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b(?!:)/gi;
const HOME_PATH = /(?:^|[\s"'`=(])(?:\/Users\/|\/home\/|C:\\Users\\)[A-Za-z_][A-Za-z0-9._-]*/;
const EXPORT_SIGNATURES = [
  new RegExp(["PostgreSQL", " database ", "dump"].join(""), "i"),
  new RegExp(`^-- ${["MySQL", " dump"].join("")}`, "m"),
  new RegExp(`^-- ${["Dump", " completed"].join("")}`, "m"),
  new RegExp(`^${["SQLite", " format 3"].join("")}`),
];
const MAGIC_PREFIXES = [
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from([0xff, 0xd8, 0xff]),
  Buffer.from("GIF87a"),
  Buffer.from("GIF89a"),
  Buffer.from("%PDF"),
  Buffer.from("PK"),
  Buffer.from([0x1f, 0x8b]),
  Buffer.from("7z\xbc\xaf'\x1c"),
  Buffer.from("Rar!"),
];

export function normalizeRepoPath(input) {
  if (typeof input !== "string" || input.length === 0) {
    return null;
  }
  if (/^[A-Za-z]:/.test(input) || input.startsWith("/") || input.includes("\0")) {
    return null;
  }
  const parts = [];
  for (const part of input.replaceAll("\\", "/").split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      if (parts.length === 0) {
        return null;
      }
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

export function isApprovedPublicAssetPath(input) {
  const normalized = normalizeRepoPath(input);
  if (!normalized) {
    return false;
  }
  return APPROVED_ASSET_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function isBinaryMedia(bytes) {
  const buffer = Buffer.from(bytes ?? []);
  if (buffer.length === 0) {
    return false;
  }
  if (buffer.includes(0)) {
    return true;
  }
  for (const magic of MAGIC_PREFIXES) {
    if (buffer.length >= magic.length && buffer.subarray(0, magic.length).equals(magic)) {
      return true;
    }
  }
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

export function decodeUtf8Strict(bytes) {
  const buffer = Buffer.from(bytes ?? []);
  const decoded = buffer.toString("utf8");
  return Buffer.from(decoded, "utf8").equals(buffer) ? decoded : null;
}

function finding(code, line) {
  return Number.isInteger(line) ? { code, line } : { code };
}

function basename(normalized) {
  const segments = normalized.split("/");
  return segments[segments.length - 1] ?? "";
}

function extensionOf(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".tar.gz")) {
    return "tar.gz";
  }
  if (lower.endsWith(".sql.gz")) {
    return "sql.gz";
  }
  const dot = lower.lastIndexOf(".");
  return dot <= 0 ? "" : lower.slice(dot + 1);
}

function stemOf(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".tar.gz")) {
    return filename.slice(0, -7);
  }
  const dot = filename.lastIndexOf(".");
  return dot <= 0 ? filename : filename.slice(0, dot);
}

function isEnvPath(normalized) {
  if (normalized === ".env.example") {
    return false;
  }
  return normalized.split("/").some((segment) => /^\.env/i.test(segment));
}

function isPlatformPath(normalized) {
  const lower = normalized.toLowerCase();
  const segments = lower.split("/");
  return (
    lower === ".codex/config.toml" ||
    segments.some((segment) => segment === ".vercel" || segment === ".supabase") ||
    segments.some((segment, index) => segment === "supabase" && segments[index + 1] === ".temp")
  );
}

function isArtifactPath(normalized) {
  const segments = normalized.split("/");
  const filename = basename(normalized);
  const lowerName = filename.toLowerCase();
  if (ARTIFACT_FILENAMES.has(lowerName)) {
    return true;
  }
  const extension = extensionOf(filename);
  if (ARTIFACT_EXTENSIONS.has(extension) || extension === "tar.gz" || extension === "sql.gz") {
    return true;
  }
  if (ARTIFACT_STEM.test(stemOf(filename))) {
    return true;
  }
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index].toLowerCase();
    if (ARTIFACT_SEGMENTS.has(segment)) {
      return true;
    }
    if (segment === "playwright" && segments[index + 1]?.toLowerCase() === ".auth") {
      return true;
    }
    if (segment === "screenshots" || segment === "videos") {
      if (segments.some((part) => part.toLowerCase() === "cypress")) {
        return true;
      }
    }
  }
  return false;
}

export function inspectCandidatePath({ path, mode, status, size }) {
  const statusKind = typeof status === "string" && status.length > 0 ? status[0] : "";
  if (statusKind === "D") {
    return null;
  }
  if (!INSPECTED_STATUSES.has(statusKind)) {
    return finding(RULE.UNKNOWN_STATUS);
  }

  const normalized = normalizeRepoPath(path);
  if (!normalized) {
    return finding(RULE.UNSAFE_PATH);
  }

  if (mode === "120000") {
    return finding(RULE.SYMLINK);
  }
  if (mode === "160000") {
    return finding(RULE.SUBMODULE);
  }
  if (!REGULAR_FILE_MODES.has(mode)) {
    return finding(RULE.UNKNOWN_MODE);
  }

  if (isEnvPath(normalized)) {
    return finding(RULE.ENV_PATH);
  }
  if (isPlatformPath(normalized)) {
    return finding(RULE.PLATFORM_PATH);
  }
  if (isArtifactPath(normalized)) {
    return finding(RULE.ARTIFACT_PATH);
  }
  if (typeof size === "number" && size > MAX_BLOB_BYTES) {
    return finding(RULE.OVERSIZED_BLOB);
  }
  return null;
}

export function inspectCandidateBlob({ path, bytes }) {
  if (!isBinaryMedia(bytes)) {
    return null;
  }
  return isApprovedPublicAssetPath(path) ? null : finding(RULE.UNAPPROVED_BINARY);
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith("`") && value.endsWith("`"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function isLiteralSecretValue(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (PLACEHOLDER_VALUE.test(trimmed)) {
    return false;
  }
  if (/^\$\{?[A-Za-z_][A-Za-z0-9_]*\}?$/.test(trimmed) || /^%[A-Za-z_][A-Za-z0-9_]*%$/.test(trimmed)) {
    return false;
  }
  if (/^process\.env\./.test(trimmed) || /^import\.meta\.env\./.test(trimmed)) {
    return false;
  }
  return trimmed.length >= 4;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function inspectCredentialLiterals(path, text) {
  const isSource = /\.[cm]?[jt]sx?$/i.test(path);
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const envMatch = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!isSource && envMatch && CREDENTIAL_NAME.test(envMatch[1]) && isLiteralSecretValue(stripQuotes(envMatch[2]))) {
      return finding(RULE.CREDENTIAL_LITERAL, index + 1);
    }
  }
  const properties = /(?:^|[\s,{.;])(['"]?)([A-Za-z_][A-Za-z0-9_-]*)\1(?:\s*:\s*string)?\s*[:=]\s*(['"`])([^'"`]*)\3/g;
  for (const kvMatch of text.matchAll(properties)) {
    if (CREDENTIAL_NAME.test(kvMatch[2]) && isLiteralSecretValue(kvMatch[4])) {
      return finding(RULE.CREDENTIAL_LITERAL, lineOf(text, kvMatch.index));
    }
  }
  return null;
}

function firstMatchFinding(text, pattern, code) {
  const flags = typeof pattern.flags === "string" && pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const global = new RegExp(pattern.source, flags);
  const match = global.exec(text);
  if (!match) {
    return null;
  }
  return finding(code, lineOf(text, match.index));
}

function inspectEmails(text) {
  const allowed = new Set(SYNTHETIC_EMAIL_DOMAINS);
  for (const match of text.matchAll(EMAIL)) {
    const domain = match[0].split("@")[1]?.toLowerCase();
    if (domain && !allowed.has(domain)) {
      return finding(RULE.EMAIL, lineOf(text, match.index));
    }
  }
  return null;
}

export function inspectText({ path, text }) {
  if (typeof text !== "string") {
    return finding(RULE.UNSAFE_PATH);
  }
  return (
    firstMatchFinding(text, PRIVATE_KEY_MARK, RULE.PRIVATE_KEY) ??
    firstMatchFinding(text, CREDENTIAL_URL, RULE.CREDENTIAL_URL) ??
    inspectCredentialLiterals(path, text) ??
    SECRET_SHAPES.reduce((found, pattern) => found ?? firstMatchFinding(text, pattern, RULE.SECRET_SHAPE), null) ??
    inspectEmails(text) ??
    firstMatchFinding(text, HOME_PATH, RULE.HOME_PATH) ??
    EXPORT_SIGNATURES.reduce((found, pattern) => found ?? firstMatchFinding(text, pattern, RULE.EXPORT_SIGNATURE), null)
  );
}
