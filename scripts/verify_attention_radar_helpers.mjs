import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const helperPath = path.resolve("src/lib/dashboardAttention.ts");
const source = fs.readFileSync(helperPath, "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
});

const module = { exports: {} };
vm.runInNewContext(outputText, { module, exports: module.exports }, { filename: helperPath });

const { buildAttentionRadarViewModel, getRecurringBillTone, getRecurringBillToneStyles } = module.exports;

const recurringLater = {
  id: "recurring-later",
  type: "recurring_bill",
  status: "upcoming",
  title: "ETB",
  description: "",
  amount: 155460,
  color: "#60a5fa",
  icon: "clock",
  group: "recurring",
  daysUntil: 6,
  dueDate: "2026-06-07",
};

const recurringSoon = {
  ...recurringLater,
  id: "recurring-soon",
  title: "Spotify",
  amount: 30500,
  daysUntil: 3,
  dueDate: "2026-06-04",
};

const debt = {
  id: "debt-i-owe",
  type: "debt_pending",
  title: "",
  titleKey: "alerts.debts.iOweTitle",
  description: "",
  amount: 3456800,
  color: "#ef4444",
  icon: "arrow-up",
  group: "debt_owed",
  link: "/debts",
};

const receivable = {
  id: "debt-owed-to-me",
  type: "debt_pending",
  title: "",
  titleKey: "alerts.debts.owedToMeTitle",
  description: "",
  amount: 1000000,
  color: "#2dd4bf",
  icon: "arrow-down",
  group: "debt_receivable",
  link: "/debts",
};

const cdt = {
  id: "cdt-1",
  type: "cdt_maturing",
  title: "CDT NU Jun",
  description: "",
  amount: 35785011,
  color: "#a855f7",
  icon: "landmark",
  group: "cdt",
  daysUntil: 27,
  dueDate: "2026-06-28",
  link: "/accounts",
};

const view = buildAttentionRadarViewModel([recurringLater, debt, cdt, recurringSoon, receivable]);

assert.equal(view.totalCount, 5);
assertJsonEqual(
  view.recurringBills.map((item) => item.alert.id),
  ["recurring-soon", "recurring-later"],
);
assert.equal(view.debtOwed?.id, "debt-i-owe");
assert.equal(view.debtReceivable?.id, "debt-owed-to-me");
assertJsonEqual(
  view.cdts.map((item) => item.id),
  ["cdt-1"],
);
assertJsonEqual(
  view.pinnedItems.map((item) => item.id),
  ["debt-i-owe", "debt-owed-to-me", "cdt-1"],
);
assertJsonEqual(
  view.summaryTiles.map((tile) => tile.group),
  ["recurring", "debt_owed", "debt_receivable", "cdt"],
);
assert.equal(getRecurringBillTone(-1), "overdue");
assert.equal(getRecurringBillTone(1), "dueSoon");
assert.equal(getRecurringBillTone(3), "near");
assert.equal(getRecurringBillTone(5), "medium");
assert.equal(getRecurringBillTone(8), "far");
assert.match(getRecurringBillToneStyles("near").accent, /^#/);

const onlyRecurring = buildAttentionRadarViewModel([recurringLater]);
assert.equal(onlyRecurring.hasRecurringBills, true);
assert.equal(onlyRecurring.hasPinnedItems, false);
assertJsonEqual(
  onlyRecurring.summaryTiles.map((tile) => tile.group),
  ["recurring"],
);

const onlyPinned = buildAttentionRadarViewModel([debt, cdt]);
assert.equal(onlyPinned.hasRecurringBills, false);
assert.equal(onlyPinned.hasPinnedItems, true);
assertJsonEqual(
  onlyPinned.summaryTiles.map((tile) => tile.group),
  ["debt_owed", "cdt"],
);

console.log("attention radar helper checks passed");

function assertJsonEqual(actual, expected) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
}
