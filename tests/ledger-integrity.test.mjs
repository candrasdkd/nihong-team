import assert from "node:assert/strict";
import test from "node:test";
import { ledgerHarness, entry } from "./helpers/ledger-harness.mjs";

test("editing a capital expense updates the amount returned to cash", async () => {
  const h = ledgerHarness();
  await h.ledger.createLedgerEntry(entry(), { trackAsCapital: true });
  const outgoing = h.entries("ledger")[0];
  await h.ledger.updateLedgerEntry(outgoing.id, { jumlah: 500000 });
  const advance = h.entries("capitalAdvances")[0];
  assert.equal(advance.jumlah, 500000);
  await h.capital.returnCapitalAdvance(advance.id);
  assert.equal(h.records.get("metadata/ledger_summary").totalSaldo, 0);
});

test("cancelling an expense preserves history and prevents returning cancelled capital", async () => {
  const h = ledgerHarness();
  await h.ledger.createLedgerEntry(entry(), { trackAsCapital: true });
  const outgoing = h.entries("ledger")[0];
  await h.ledger.deleteLedgerEntry(outgoing.id);
  assert.ok(h.records.get(`ledger/${outgoing.id}`)?.voidedAt);
  const advance = h.entries("capitalAdvances")[0];
  await assert.rejects(h.capital.returnCapitalAdvance(advance.id));
  assert.equal(h.records.get("metadata/ledger_summary").totalSaldo, 0);
});

test("recalculation does not overwrite an entry created during the scan", async () => {
  const h = ledgerHarness();
  await h.ledger.createLedgerEntry(entry(1000000, "Masuk"));
  h.afterNextQuery(async () => h.ledger.createLedgerEntry(entry(100000, "Masuk")));
  await h.ledger.recalculateLedgerSummary();
  assert.equal(h.records.get("metadata/ledger_summary").totalSaldo, 1100000);
});

test("a partial capital return records only the paid amount", async () => {
  const h = ledgerHarness();
  await h.ledger.createLedgerEntry(entry(), { trackAsCapital: true });
  const advance = h.entries("capitalAdvances")[0];
  await h.capital.returnCapitalAdvance(advance.id, { jumlah: 300000, tanggal: "2026-09-17", metode: "Cash" });
  assert.equal(h.entries("ledger").find(row => row.tipe === "Masuk").jumlah, 300000);
  assert.equal(h.records.get(`capitalAdvances/${advance.id}`).returnedAmount, 300000);
  assert.equal(h.records.get(`capitalAdvances/${advance.id}`).status, "belum_kembali");
});

test("legacy capital reverse links are synchronized without a manual migration", async () => {
  const h = ledgerHarness();
  h.seed("ledger/legacy", entry());
  h.seed("capitalAdvances/old", { ledgerEntryIdKeluar: "legacy", jumlah: 1000000, status: "belum_kembali", tanggalKeluar: "2026-09-17", createdAt: 1 });
  await h.ledger.updateLedgerEntry("legacy", { jumlah: 600000 });
  assert.equal(h.records.get("capitalAdvances/old").jumlah, 600000);
  assert.equal(h.records.get("ledger/legacy").capitalAdvanceId, "old");
  await h.capital.returnCapitalAdvance("old");
  assert.equal(h.records.get("metadata/ledger_summary").totalSaldo, 0);
});

test("concurrent partial returns cannot exceed the remaining capital", async () => {
  const h = ledgerHarness();
  await h.ledger.createLedgerEntry(entry(), { trackAsCapital: true });
  const advance = h.entries("capitalAdvances")[0];
  const payment = { jumlah: 700000, tanggal: "2026-09-17", metode: "Cash" };
  const outcomes = await Promise.allSettled([
    h.capital.returnCapitalAdvance(advance.id, { ...payment, requestId: "request-a" }),
    h.capital.returnCapitalAdvance(advance.id, { ...payment, requestId: "request-b" }),
  ]);
  assert.equal(outcomes.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(h.records.get(`capitalAdvances/${advance.id}`).returnedAmount, 700000);
  assert.equal(h.entries("ledger").filter(row => row.tipe === "Masuk").length, 1);
});

test("retrying the same return request does not duplicate a receipt", async () => {
  const h = ledgerHarness();
  await h.ledger.createLedgerEntry(entry(), { trackAsCapital: true });
  const advance = h.entries("capitalAdvances")[0];
  const payment = { jumlah: 300000, tanggal: "2026-09-17", metode: "Cash", requestId: "same-request" };
  await Promise.all([h.capital.returnCapitalAdvance(advance.id, payment), h.capital.returnCapitalAdvance(advance.id, payment)]);
  assert.equal(h.records.get(`capitalAdvances/${advance.id}`).returnedAmount, 300000);
  assert.equal(h.entries("ledger").filter(row => row.tipe === "Masuk").length, 1);
});

test("cancelling and restoring partial returns adjusts the outstanding amount and audit trail", async () => {
  const h = ledgerHarness();
  await h.ledger.createLedgerEntry(entry(), { trackAsCapital: true });
  const advance = h.entries("capitalAdvances")[0];
  await h.capital.returnCapitalAdvance(advance.id, { jumlah: 300000, tanggal: "2026-09-17", metode: "Cash" });
  const incoming = h.entries("ledger").find(row => row.tipe === "Masuk");
  await h.ledger.deleteLedgerEntry(incoming.id);
  assert.equal(h.records.get(`capitalAdvances/${advance.id}`).returnedAmount, 0);
  assert.equal(h.records.get("metadata/ledger_summary").totalSaldo, -1000000);
  await h.ledger.restoreLedgerEntry(incoming.id);
  assert.equal(h.records.get(`capitalAdvances/${advance.id}`).returnedAmount, 300000);
  assert.equal(h.records.get("metadata/ledger_summary").totalSaldo, -700000);
  assert.deepEqual(h.entries("ledger_audit").filter(event => event.entryId === incoming.id).map(event => event.action), ["create", "void", "restore"]);
});

test("capital with receipts cannot be reduced below returned cash or cancelled alone", async () => {
  const h = ledgerHarness();
  const outgoing = await h.ledger.createLedgerEntry(entry(), { trackAsCapital: true });
  const advance = h.entries("capitalAdvances")[0];
  await h.capital.returnCapitalAdvance(advance.id, { jumlah: 300000, tanggal: "2026-09-17", metode: "Cash" });
  await assert.rejects(h.ledger.updateLedgerEntry(outgoing, { jumlah: 200000 }), /sudah kembali/);
  await assert.rejects(h.ledger.deleteLedgerEntry(outgoing), /terlebih dahulu/);
  assert.equal(h.records.get(`ledger/${outgoing}`).jumlah, 1000000);
  assert.equal(h.records.get("metadata/ledger_summary").totalSaldo, -700000);
});

test("batch cancellation is atomic and can cancel an expense together with its returns", async () => {
  const h = ledgerHarness();
  const outgoing = await h.ledger.createLedgerEntry(entry(), { trackAsCapital: true });
  const ordinary = await h.ledger.createLedgerEntry(entry(200000, "Masuk"));
  const advance = h.entries("capitalAdvances")[0];
  await h.capital.returnCapitalAdvance(advance.id, { jumlah: 300000, tanggal: "2026-09-17", metode: "Cash" });
  await assert.rejects(h.ledger.voidLedgerEntries([ordinary, outgoing]));
  assert.equal(h.records.get(`ledger/${ordinary}`).voidedAt, null);
  const incoming = h.entries("ledger").find(row => row.capitalRole === "return");
  await h.ledger.voidLedgerEntries([outgoing, incoming.id]);
  assert.equal(h.records.get(`capitalAdvances/${advance.id}`).status, "dibatalkan");
  assert.equal(h.records.get("metadata/ledger_summary").totalSaldo, 200000);
  await assert.rejects(h.ledger.restoreLedgerEntry(incoming.id), /asal terlebih dahulu/);
  await h.ledger.restoreLedgerEntry(outgoing);
  await h.ledger.restoreLedgerEntry(incoming.id);
  assert.equal(h.records.get("metadata/ledger_summary").totalSaldo, -500000);
});

test("stale edits and invalid cash amounts are rejected without writes", async () => {
  const h = ledgerHarness();
  const id = await h.ledger.createLedgerEntry(entry());
  await h.ledger.updateLedgerEntry(id, { jumlah: 500000 }, { expectedRevision: 1 });
  await assert.rejects(h.ledger.updateLedgerEntry(id, { jumlah: 900000 }, { expectedRevision: 1 }), /perangkat lain/);
  for (const amount of [0, -1, NaN, Infinity, 1.5]) await assert.rejects(h.ledger.createLedgerEntry(entry(amount)));
  await assert.rejects(h.ledger.createLedgerEntry({ ...entry(), tanggal: "2026-02-31" }));
  assert.equal(h.entries("ledger").length, 1);
  assert.equal(h.records.get("metadata/ledger_summary").totalSaldo, -500000);
});

test("repeated cancellation or restore is idempotent and recalculation excludes cancelled entries", async () => {
  const h = ledgerHarness();
  const id = await h.ledger.createLedgerEntry(entry());
  await Promise.all([h.ledger.deleteLedgerEntry(id), h.ledger.deleteLedgerEntry(id)]);
  await h.ledger.recalculateLedgerSummary();
  assert.equal(h.records.get("metadata/ledger_summary").totalSaldo, 0);
  await Promise.all([h.ledger.restoreLedgerEntry(id), h.ledger.restoreLedgerEntry(id)]);
  assert.equal(h.records.get("metadata/ledger_summary").totalSaldo, -1000000);
});

test("returning an orphaned legacy advance cannot create phantom cash", async () => {
  const h = ledgerHarness();
  h.seed("capitalAdvances/orphan", { jumlah: 1000000, ledgerEntryIdKeluar: "missing", status: "belum_kembali" });
  await assert.rejects(h.capital.returnCapitalAdvance("orphan"), /asal tidak aktif/);
  assert.equal(h.entries("ledger").length, 0);
});
