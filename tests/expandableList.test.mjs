import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/expandableList.ts", import.meta.url), "utf8");
const { outputText: code } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const { getExpandableListState } = await import(moduleUrl);

const groups = ["Transporte", "Financiero", "Suscripciones", "Software", "Hogar", "Salud"];

assert.deepEqual(
  getExpandableListState(groups, 5, false),
  {
    visibleItems: ["Transporte", "Financiero", "Suscripciones", "Software", "Hogar"],
    hiddenCount: 1,
    isExpandable: true,
  },
  "collapsed lists should expose only the first five items and report the hidden count",
);

assert.deepEqual(
  getExpandableListState(groups, 5, true),
  {
    visibleItems: groups,
    hiddenCount: 0,
    isExpandable: true,
  },
  "expanded lists should expose every item and clear the hidden count",
);

assert.deepEqual(
  getExpandableListState(groups.slice(0, 5), 5, false),
  {
    visibleItems: groups.slice(0, 5),
    hiddenCount: 0,
    isExpandable: false,
  },
  "lists that fit within the collapsed limit should not be expandable",
);
