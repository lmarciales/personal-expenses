import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/displayLabels.ts", import.meta.url), "utf8");
const { outputText: code } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const { formatSystemLabel, getSystemLabelKey } = await import(moduleUrl);

const translations = {
  "labels.accountTypes.creditCard": "Tarjeta de credito",
  "labels.accountTypes.debitCard": "Tarjeta debito",
  "labels.accountTypes.external": "Externo",
  "labels.transactionTypes.income": "Ingreso",
  "labels.splitStatuses.pendingPayment": "Por pagar",
};
const t = (key) => translations[key] ?? key;

assert.equal(getSystemLabelKey("Credit Card"), "labels.accountTypes.creditCard");
assert.equal(getSystemLabelKey("Debit Card"), "labels.accountTypes.debitCard");
assert.equal(getSystemLabelKey("External"), "labels.accountTypes.external");
assert.equal(getSystemLabelKey("income"), "labels.transactionTypes.income");
assert.equal(getSystemLabelKey("Pending Payment"), "labels.splitStatuses.pendingPayment");
assert.equal(getSystemLabelKey("Main Checking"), null);

assert.equal(formatSystemLabel("Credit Card", t), "Tarjeta de credito");
assert.equal(formatSystemLabel("Main Checking", t), "Main Checking");
