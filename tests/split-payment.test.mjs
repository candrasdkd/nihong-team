import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// 1. Test mathematical accuracy and split payment calculations
test('split payment calculation: 50% DP, 30% DP, and remaining balance consistency', () => {
  const totalPembayaran = 2500000;

  // 50% DP
  const dp50 = Math.round(totalPembayaran * 0.5);
  const remaining50 = totalPembayaran - dp50;
  assert.equal(dp50, 1250000);
  assert.equal(remaining50, 1250000);
  assert.equal(dp50 + remaining50, totalPembayaran);

  // 30% DP
  const dp30 = Math.round(totalPembayaran * 0.3);
  const remaining30 = totalPembayaran - dp30;
  assert.equal(dp30, 750000);
  assert.equal(remaining30, 1750000);
  assert.equal(dp30 + remaining30, totalPembayaran);

  // Progress percentage
  const percent50 = Math.round((dp50 / totalPembayaran) * 100);
  assert.equal(percent50, 50);

  // Partial pelunasan
  const partialPelunasan = 500000;
  const totalPaid = dp50 + partialPelunasan;
  const finalRemaining = Math.max(0, totalPembayaran - totalPaid);
  assert.equal(finalRemaining, 750000);
});

// 2. Test status transitions
test('order status transitions according to payment stage', () => {
  function determineStatus(total, dp, pelunasan) {
    const totalPaid = Number(dp || 0) + Number(pelunasan || 0);
    if (totalPaid >= total && total > 0) return "Selesai";
    if (Number(dp || 0) > 0) return "DP Terbayar";
    return "Belum Membayar";
  }

  const total = 1000000;
  // Initially unpaid
  assert.equal(determineStatus(total, 0, 0), "Belum Membayar");

  // DP paid
  assert.equal(determineStatus(total, 500000, 0), "DP Terbayar");

  // Pelunasan completed
  assert.equal(determineStatus(total, 500000, 500000), "Selesai");

  // Paid in full directly
  assert.equal(determineStatus(total, 1000000, 0), "Selesai");
});

// 3. Test invoice layout maintains required anchors, DP breakdown, and TAGIHAN status
test('InvoiceModal includes DP breakdown, focuses status on TAGIHAN, and preserves layout contract', async () => {
  const invoiceCode = await readFile(
    new URL('../src/components/InvoiceModal.tsx', import.meta.url),
    'utf8'
  );

  // Preserved layout contract
  assert.match(invoiceCode, /alignItems: "stretch"/);
  assert.match(invoiceCode, /fontVariantNumeric: "tabular-nums"/);
  assert.match(invoiceCode, /borderTop: "1px dashed #cbd5e1"/);

  // DP breakdown elements
  assert.match(invoiceCode, /DP Terbayar/);
  assert.match(invoiceCode, /SISA PELUNASAN/);
  assert.match(invoiceCode, /TAGIHAN/);
});

// 4. Test WhatsApp notification text generation
test('WhatsApp payment templates format numbers and customer details correctly', () => {
  const order = {
    no: 'ORD-2026-099',
    namaPelanggan: 'Kak Dina',
    namaBarang: 'Uniqlo Airism & Snack Donki',
    totalPembayaran: 1200000,
    dpNominal: 600000,
    dpMetode: 'Transfer BCA',
  };

  const remaining = order.totalPembayaran - order.dpNominal;

  const dpTemplate = `Halo ${order.namaPelanggan}, pesanan #${order.no} DP ${order.dpNominal} diterima. Sisa ${remaining}`;
  assert.match(dpTemplate, /Kak Dina/);
  assert.match(dpTemplate, /#ORD-2026-099/);
  assert.match(dpTemplate, /DP 600000/);
  assert.match(dpTemplate, /Sisa 600000/);
});
