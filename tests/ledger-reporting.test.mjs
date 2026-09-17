import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as XLSX from "xlsx";
import { ledgerHarness, entry } from "./helpers/ledger-harness.mjs";

const h = ledgerHarness();
const utils = h.load("src/utils/ledger.ts");
const rows = Array.from({ length: 75 }, (_, i) => ({ ...entry(1000, "Masuk"), id: String(i), metode: i < 50 ? "Transfer" : "Cash", createdAt: i }));

test("the full report and totals include transactions beyond the first 50 rendered rows", () => {
  const report = utils.filterLedger(rows, {});
  assert.equal(report.length, 75);
  assert.equal(utils.summarizeLedger(report).totalMasuk, 75000);
});

test("search and date filters exclude cancelled entries and hidden selections", () => {
  const data = [...rows, { ...entry(5000, "Masuk"), id: "cancelled", metode: "Cash", voidedAt: 1 }];
  const filtered = utils.filterLedger(data, { from: "2026-09-17", to: "2026-09-17", q: "Cash" });
  assert.equal(filtered.length, 25);
  assert.deepEqual([...utils.visibleSelectedIds(filtered, new Set(["0", "60", "cancelled"]))], ["60"]);
  assert.equal(utils.filterLedger(data, { from: "2026-09-18" }).length, 0);
});

test("calendar dates stay local before 07:00 WIB and format with the full Indonesian month", () => {
  const originalTZ = process.env.TZ;
  process.env.TZ = "Asia/Jakarta";
  try {
    assert.equal(utils.localDateInput(new Date("2026-09-17T00:30:00+07:00")), "2026-09-17");
    assert.equal(utils.formatLedgerDate("2026-09-17"), "17 September 2026");
  } finally { if (originalTZ) process.env.TZ = originalTZ; else delete process.env.TZ; }
});

test("Excel exports every active report row, full dates and payment methods", () => {
  let workbook;
  const exports = {};
  const source = ts.transpileModule(readFileSync("src/utils/exportExcel.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { exports, require: name => name === "xlsx" ? { ...XLSX, writeFile: value => { workbook = value; } } : name === "./ledger" ? utils : {} });
  exports.exportLedgerToExcel([...rows, { ...entry(), id: "cancelled", voidedAt: 1 }]);
  const output = XLSX.utils.sheet_to_json(workbook.Sheets["Buku Kas"]);
  assert.equal(output.length, 75);
  assert.equal(output[0].Tanggal, "17 September 2026");
  assert.equal(output[74].Metode, "Cash");
  assert.equal(Object.hasOwn(output[74], "Rekening"), false);
  assert.equal(output.reduce((sum, row) => sum + row["Nominal Masuk (Rp)"], 0), 75000);
});
