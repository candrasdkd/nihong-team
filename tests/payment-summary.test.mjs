import assert from "node:assert/strict";
import test from "node:test";
import { getPaymentSummary } from "../src/utils/payment.ts";

test("unrecorded payments leave the full invoice outstanding", () => {
  assert.deepEqual(getPaymentSummary({}, 1000000), {
    dp: 0, settlement: 0, paid: 0, remaining: 1000000,
    percent: 0, status: "Belum Membayar",
  });
});

test("partial settlement keeps the order unpaid until the combined amount covers it", () => {
  const partial = getPaymentSummary({ dpNominal: 300000, pelunasanNominal: 200000 }, 1000000);
  assert.equal(partial.remaining, 500000);
  assert.equal(partial.percent, 50);
  assert.equal(partial.status, "DP Terbayar");

  const complete = getPaymentSummary({ dpNominal: 300000, pelunasanNominal: 700000 }, 1000000);
  assert.equal(complete.remaining, 0);
  assert.equal(complete.status, "Selesai");
});

test("editing DP accounts for the settlement already saved", () => {
  const order = { dpNominal: 300000, pelunasanNominal: 500000 };
  const saved = getPaymentSummary(order, 1000000);
  const draft = getPaymentSummary({ ...order, dpNominal: 500000 }, 1000000);
  assert.equal(draft.status, "Selesai");
  assert.equal(saved.remaining, 200000);
  assert.equal(order.dpNominal, 300000);
});

test("progress never rounds an outstanding balance up to 100 percent", () => {
  const payment = getPaymentSummary({ dpNominal: 999999 }, 1000000);
  assert.equal(payment.percent, 99);
  assert.equal(payment.remaining, 1);
  assert.equal(payment.status, "DP Terbayar");
});

test("full DP and overpayment keep the progress and remaining balance bounded", () => {
  for (const dpNominal of [1000000, 1200000]) {
    const payment = getPaymentSummary({ dpNominal }, 1000000);
    assert.equal(payment.status, "Selesai");
    assert.equal(payment.percent, 100);
    assert.equal(payment.remaining, 0);
    assert.equal(payment.paid, dpNominal);
  }
  assert.equal(getPaymentSummary({}, 0).status, "Belum Membayar");
});
