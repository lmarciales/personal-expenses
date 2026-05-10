import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadTsModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText: code } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  return import(moduleUrl);
}

const { getAccountSummary } = await loadTsModule("../src/lib/accountSummary.ts");

const accounts = [
  {
    id: "checking",
    type: "Debit Card",
    balance: 1_000,
    credit_limit: null,
    interest_rate: null,
    interest_reference_balance: null,
    interest_reference_date: null,
    is_archived: false,
  },
  {
    id: "visa",
    type: "Credit Card",
    balance: 200,
    credit_limit: 500,
    interest_rate: null,
    interest_reference_balance: null,
    interest_reference_date: null,
    is_archived: false,
  },
  {
    id: "closed-debit",
    type: "Debit Card",
    balance: 9_999,
    credit_limit: null,
    interest_rate: null,
    interest_reference_balance: null,
    interest_reference_date: null,
    is_archived: true,
  },
  {
    id: "closed-credit",
    type: "Credit Card",
    balance: 100,
    credit_limit: 2_000,
    interest_rate: null,
    interest_reference_balance: null,
    interest_reference_date: null,
    is_archived: true,
  },
];

const summary = getAccountSummary(accounts);

assert.deepEqual(
  summary.activeAccounts.map((account) => account.id),
  ["checking", "visa"],
  "archived accounts should not be returned as active accounts",
);
assert.equal(summary.liquidBalance, 1_000, "archived debit balances should not inflate liquid balance");
assert.equal(summary.creditDebt, 300, "archived credit cards should not inflate credit card debt");
assert.equal(summary.netWorth, 700, "net worth should be active liquid balance minus active credit card debt");
assert.equal(summary.totalBalance, 1_000, "legacy total balance should remain active liquid balance");
assert.deepEqual(
  summary.countByType,
  { "Debit Card": 1, "Credit Card": 1 },
  "account type counts should only include active accounts",
);
