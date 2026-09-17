import assert from "node:assert/strict";
import test from "node:test";
import { ledgerHarness, entry } from "./helpers/ledger-harness.mjs";

const settle = () => new Promise(resolve => setImmediate(resolve));

test("public reports are immutable scoped snapshots with opaque tokens and no private fields", async () => {
  const h = ledgerHarness();
  const service = h.load("src/services/ledgerReportsFirebase.ts");
  h.seed("ledger/one", { ...entry(1000, "Masuk"), catatan: "Private note", rekening: "Secret bank", kategori: "Lainnya" });
  h.seed("ledger/two", { ...entry(2000, "Masuk"), tanggal: "2026-08-01" });
  const token = await service.createLedgerReport({ from: "2026-09-01", q: "modal" }, "September", 7);
  assert.match(token, /^[a-f0-9]{48}$/);
  const report = h.records.get(`ledger_reports/${token}`);
  assert.equal(report.rows.length, 1);
  assert.deepEqual(Object.keys(report.rows[0]).sort(), ["jumlah", "kategori", "keterangan", "tanggal", "tipe"]);
  assert.equal(report.title, "September");
  assert.equal(report.expiresAt - report.capturedAt, 7 * 86400000);
  h.seed("ledger/one", { ...entry(9999, "Masuk") });
  assert.equal(h.records.get(`ledger_reports/${token}`).rows[0].jumlah, 1000);
});

test("invalid and legacy share URLs do not read Firestore", () => {
  const h = ledgerHarness();
  const service = h.load("src/services/ledgerReportsFirebase.ts");
  for (const token of ["true", "1", "", "a".repeat(47), "A".repeat(48), "../ledger"]) {
    let value = "not called";
    service.subscribePublicLedgerReport(token, report => { value = report; }, assert.fail);
    assert.equal(value, null);
  }
  assert.equal(h.reads.length, 0);
});

test("public access reads one report and hides it on revocation or cached/offline updates", async () => {
  const h = ledgerHarness();
  const service = h.load("src/services/ledgerReportsFirebase.ts");
  const token = "a".repeat(48);
  h.seed(`ledger_reports/${token}`, { title: "September", rows: [], capturedAt: Date.now(), expiresAt: Date.now() + 60000, revoked: false });
  let value;
  const unsubscribe = service.subscribePublicLedgerReport(token, report => { value = report; }, assert.fail);
  await settle();
  assert.equal(value.title, "September");
  assert.deepEqual(h.reads, [`ledger_reports/${token}`]);
  h.emitCached(`ledger_reports/${token}`);
  assert.equal(value, null);
  await service.revokeLedgerReport(token);
  assert.equal(value, null);
  unsubscribe();
});

test("expired and revoked snapshots never become visible", async () => {
  for (const flags of [{ expiresAt: Date.now() - 1, revoked: false }, { expiresAt: Date.now() + 60000, revoked: true }]) {
    const h = ledgerHarness();
    const service = h.load("src/services/ledgerReportsFirebase.ts");
    const token = "b".repeat(48);
    h.seed(`ledger_reports/${token}`, { rows: [], ...flags });
    let value = "not called";
    service.subscribePublicLedgerReport(token, report => { value = report; }, assert.fail);
    await settle();
    assert.equal(value, null);
  }
});

test("public reports remain disabled until rules are configured, and creation requires a session", async () => {
  const disabled = ledgerHarness({ publicReportsEnabled: false });
  const service = disabled.load("src/services/ledgerReportsFirebase.ts");
  await assert.rejects(service.createLedgerReport({}, "Report", 7), /belum tersedia/);
  service.subscribePublicLedgerReport("c".repeat(48), value => assert.equal(value, null), assert.fail);
  assert.equal(disabled.reads.length, 0);
  const anonymous = ledgerHarness({ authenticated: false });
  await assert.rejects(anonymous.load("src/services/ledgerReportsFirebase.ts").createLedgerReport({}, "Report", 7), /masuk kembali/);
});
