import assert from 'node:assert/strict';
import test from 'node:test';
import { ledgerHarness } from './helpers/ledger-harness.mjs';

const order = (extra = {}) => ({ no: 'ORD-1', tanggal: '2026-09-17', idPelanggan: 'customer-1', namaPelanggan: 'HUSIN', namaBarang: 'Barang', jumlahKg: 1, hargaJastip: 1490000, hargaJastipMarkup: 1593000, hargaOngkir: 0, hargaOngkirMarkup: 955000, status: 'Belum Membayar', tipeNominal: 'IDR', ...extra });
const setup = () => { const h = ledgerHarness(); return { ...h, orders: h.load('src/services/ordersFirebase.ts') }; };

test('saving an order uses both marked-up prices for its bill and aggregates', async () => {
  const h = setup();
  const id = await h.orders.createOrder(order(), 100000);
  assert.equal(h.records.get(`orders/${id}`).totalPembayaran, 2548000);
  assert.equal(h.records.get('orders_monthly_summaries/2026-09').revenueIdr, 2548000);
  assert.equal(h.records.get('customer/customer-1').totalSpendIdr, 2548000);
});

test('editing order details cannot replace a newer payment with a stale form snapshot', async () => {
  const h = setup();
  const id = await h.orders.createOrder(order(), 100000);
  const stale = h.records.get(`orders/${id}`);
  await h.orders.updateOrderPayment(id, { dpNominal: 300000, status: 'DP Terbayar' });
  await h.orders.updateOrder(id, { ...stale, namaBarang: 'Nama baru' }, 100000);
  assert.equal(h.records.get(`orders/${id}`).dpNominal, 300000);
  assert.equal(h.records.get(`orders/${id}`).status, 'DP Terbayar');
});

test('concurrent payments from the same revision cannot silently overwrite each other', async () => {
  const h = setup();
  const id = await h.orders.createOrder(order(), 100000);
  const revision = h.records.get(`orders/${id}`).revision || 0;
  const results = await Promise.allSettled([
    h.orders.updateOrderPayment(id, { dpNominal: 300000, status: 'DP Terbayar' }, revision),
    h.orders.updateOrderPayment(id, { dpNominal: 500000, status: 'DP Terbayar' }, revision),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
});

test('payment updates reject missing orders and invalid amounts', async () => {
  const h = setup();
  await assert.rejects(h.orders.updateOrderPayment('missing', { dpNominal: 1, status: 'Selesai' }));
  const id = await h.orders.createOrder(order(), 100000);
  await assert.rejects(h.orders.updateOrderPayment(id, { dpNominal: -1, status: 'Selesai' }));
});

test('general edits reject a stale revision and changing currency after payment', async () => {
  const h = setup();
  const id = await h.orders.createOrder(order(),100000);
  const stale = h.records.get(`orders/${id}`);
  await h.orders.updateOrderPayment(id,{dpNominal:300000});
  await assert.rejects(h.orders.updateOrder(id,stale,100000,{expectedRevision:stale.revision}),/berubah/);
  await assert.rejects(h.orders.updateOrder(id,{...stale,tipeNominal:'JPY'},100000),/Mata uang/);
});

test('payment status is calculated on the latest saved price, never accepted from the client', async () => {
  const h = setup();
  const id = await h.orders.createOrder(order(),100000);
  await h.orders.updateOrderPayment(id,{dpNominal:300000,status:'Selesai'});
  assert.equal(h.records.get(`orders/${id}`).status,'DP Terbayar');
  await h.orders.updateOrderPayment(id,{pelunasanNominal:2248000,status:'Belum Membayar'});
  assert.equal(h.records.get(`orders/${id}`).status,'Selesai');
});

test('moving an order updates both actual customer records and both monthly totals', async () => {
  const h = setup();
  const id=await h.orders.createOrder(order(),100000);
  await h.orders.updateOrder(id,order({idPelanggan:'customer-2',tanggal:'2026-10-01'}),100000);
  assert.equal(h.records.get('customer/customer-1').orderCount,0);
  assert.equal(h.records.get('customer/customer-2').totalSpendIdr,2548000);
  assert.equal(h.records.get('orders_monthly_summaries/2026-09').revenueIdr,0);
  assert.equal(h.records.get('orders_monthly_summaries/2026-10').revenueIdr,2548000);
  assert.equal(h.entries('customers').length,0);
});
