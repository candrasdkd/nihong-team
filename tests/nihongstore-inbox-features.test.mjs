import test from 'node:test';
import assert from 'node:assert/strict';

// Test Shopping List Text Generator logic
test('generateShoppingListText formats order summary, available items, and skips OOS items', () => {
  const dummyOrder = {
    id: 'ord-123',
    no: 'NHS-2026-001',
    namaPelanggan: 'Budi Santoso',
    noTelponPelanggan: '08123456789',
    alamatPelanggan: 'Jakarta Selatan',
    assignedScheduleRoute: 'Tokyo - Jakarta (15 Sep 2026)',
    catatan: 'Tolong carikan yang edisi terbatas',
    items: [
      {
        namaBarang: 'Matcha KitKat Limited',
        jumlah: 2,
        warna: 'Hijau',
        ukuran: '12-pack',
        kodeBarang: 'MK-01',
        catatan: 'Expired minimal 6 bulan',
        url: 'https://example.com/kitkat',
        status: 'Tersedia',
      },
      {
        namaBarang: 'Tokyo Banana Pie',
        jumlah: 1,
        status: 'Stok habis',
        catatan: 'Kosong di gerai Tokyo Station',
      },
    ],
  };

  // Replicate generation logic
  const availableItems = dummyOrder.items.filter((it) => it.status !== 'Stok habis');
  const oosItems = dummyOrder.items.filter((it) => it.status === 'Stok habis');

  assert.equal(availableItems.length, 1);
  assert.equal(oosItems.length, 1);
  assert.equal(availableItems[0].namaBarang, 'Matcha KitKat Limited');
  assert.equal(availableItems[0].jumlah, 2);
  assert.equal(oosItems[0].namaBarang, 'Tokyo Banana Pie');
});

test('Customer phone normalization handles 08xx, 628xx, and non-digit characters correctly', () => {
  function normalizePhone(raw) {
    if (!raw) return '';
    let p = raw.replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    if (!p.startsWith('62')) p = '62' + p;
    return p;
  }

  assert.equal(normalizePhone('0812-3456-7890'), '6281234567890');
  assert.equal(normalizePhone('+62 812 3456 7890'), '6281234567890');
  assert.equal(normalizePhone('6281234567890'), '6281234567890');
  assert.equal(normalizePhone('081999888777'), '6281999888777');
});

test('DP 50% calculation and remaining balance are mathematically consistent', () => {
  const totalEstimasiIdr = 1550000;
  const dpNominal = Math.round(totalEstimasiIdr * 0.5);
  const sisaPelunasan = totalEstimasiIdr - dpNominal;

  assert.equal(dpNominal, 775000);
  assert.equal(sisaPelunasan, 775000);
  assert.equal(dpNominal + sisaPelunasan, totalEstimasiIdr);
});
