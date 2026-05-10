import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const localesDir = path.join(root, "src", "i18n", "locales");
const languages = ["en", "es"];

function flatten(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      return flatten(child, next);
    }
    return [next];
  });
}

function readNamespace(language, namespace) {
  const file = path.join(localesDir, language, `${namespace}.json`);
  return JSON.parse(readFileSync(file, "utf8"));
}

const namespaces = readdirSync(path.join(localesDir, languages[0]))
  .filter((file) => file.endsWith(".json"))
  .map((file) => path.basename(file, ".json"))
  .sort();

const failures = [];

for (const namespace of namespaces) {
  const [firstLanguage, secondLanguage] = languages;
  const firstKeys = new Set(flatten(readNamespace(firstLanguage, namespace)));
  const secondKeys = new Set(flatten(readNamespace(secondLanguage, namespace)));

  const missingInSecond = [...firstKeys].filter((key) => !secondKeys.has(key));
  const missingInFirst = [...secondKeys].filter((key) => !firstKeys.has(key));

  if (missingInSecond.length > 0) {
    failures.push(`${namespace}: missing in ${secondLanguage}: ${missingInSecond.join(", ")}`);
  }
  if (missingInFirst.length > 0) {
    failures.push(`${namespace}: missing in ${firstLanguage}: ${missingInFirst.join(", ")}`);
  }
}

if (failures.length > 0) {
  console.error(`i18n parity failed:\n${failures.map((line) => `- ${line}`).join("\n")}`);
  process.exit(1);
}

console.log("i18n parity passed");
