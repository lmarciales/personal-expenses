import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/accountOptions.ts", import.meta.url), "utf8");
const { outputText: code } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const { getMoneyMovementAccountOptions } = await import(moduleUrl);

const accounts = [
  { id: "savings", name: "Ahorros", type: "Savings", balance: 200 },
  { id: "cdt", name: "CDT 180 dias", type: "CDT", balance: 1000 },
  { id: "credit", name: "Visa", type: "Credit Card", balance: 500 },
  { id: "cash", name: "Efectivo", type: "Cash", balance: 50 },
];

assert.deepEqual(
  getMoneyMovementAccountOptions(accounts).map((account) => account.id),
  ["savings", "credit", "cash"],
  "money movement account options should exclude CDTs and keep every other account in order",
);

assert.deepEqual(
  getMoneyMovementAccountOptions(accounts, { excludeAccountId: "cash" }).map((account) => account.id),
  ["savings", "credit"],
  "money movement account options should support excluding the current target account without adding a limit",
);

assert.deepEqual(
  getMoneyMovementAccountOptions(accounts, { excludeCreditCards: true }).map((account) => account.id),
  ["savings", "cash"],
  "credit card filtering should be opt-in and independent from CDT filtering",
);
