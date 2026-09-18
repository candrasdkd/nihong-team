import assert from 'node:assert/strict';
import test from 'node:test';
import { ledgerHarness } from './helpers/ledger-harness.mjs';

const legacy = { no:'ORD-1',tanggal:'2026-09-17',namaPelanggan:'HUSIN',idPelanggan:'',namaBarang:'Barang',hargaJastip:1490000,hargaJastipMarkup:1593000,hargaOngkir:0,hargaOngkirMarkup:955000,totalPembayaran:1490000,totalKeuntungan:1058000,status:'DP Terbayar',dpNominal:300000 };
const setup = () => { const h=ledgerHarness();return {...h,repair:h.load('src/services/orderRepairsFirebase.ts'),orders:h.load('src/services/ordersFirebase.ts')}; };

test('saved preview accepts unchanged documents returned with a different field order', async () => {
 const h=setup();
 const before={...legacy,details:{first:'one',second:'two'},items:[{first:1,second:2}]};
 h.seed('orders/old',before);
 const plan=JSON.parse(JSON.stringify(await h.repair.previewOrderRepairs()));
 // Previously saved files used raw JSON in their fingerprint; keep supporting them.
 plan.orders[0].fingerprint=JSON.stringify(before);
 const reorder=value=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reorder(item)])):value;
 h.seed('orders/old',reorder(before));
 const result=await h.repair.applyOrderRepairs(plan);
 assert.equal(result.applied,1);
 assert.equal(result.skipped.length,0);
 assert.equal(h.records.get('orders/old').dpNominal,legacy.dpNominal);
});

test('canonical comparison still rejects changed nested values, array order and timestamp nanoseconds', async () => {
 const before={...legacy,details:{value:'a'},items:['one','two'],createdAt:{seconds:100,nanoseconds:123,type:'firestore/timestamp/1.0'}};
 for (const changed of [
  {...before,details:{value:'b'}},
  {...before,items:['two','one']},
  {...before,createdAt:{...before.createdAt,nanoseconds:124}},
  {...before,dpNominal:String(before.dpNominal)},
 ]) {
  const h=setup();h.seed('orders/old',before);
  const plan=JSON.parse(JSON.stringify(await h.repair.previewOrderRepairs()));
  h.seed('orders/old',changed);
  const result=await h.repair.applyOrderRepairs(plan);
  assert.equal(result.applied,0);
  assert.equal(result.skipped.length,1);
  assert.equal(result.aggregatesRecalculated,false);
 }
});

test('failed repair does not recalculate aggregates or mutate customers', async () => {
 const h=setup();h.seed('orders/old',legacy);
 h.seed('customer/c1',{nama:'HUSIN',totalSpendIdr:1490000});
 h.seed('orders_monthly_summaries/2026-09',{revenueIdr:1490000});
 const plan=await h.repair.previewOrderRepairs();
 h.seed('orders/old',{...legacy,dpNominal:500000});
 const result=await h.repair.applyOrderRepairs(plan);
 assert.equal(result.applied,0);
 assert.equal(result.aggregatesRecalculated,false);
 assert.equal(h.records.get('customer/c1').totalSpendIdr,1490000);
 assert.equal(h.records.get('orders_monthly_summaries/2026-09').revenueIdr,1490000);
});

test('repair preview is read-only and applying it corrects totals, links and aggregates without changing prices or payments',async()=>{
 const h=setup();h.seed('orders/old',legacy);h.seed('customer/c1',{nama:'HUSIN',telpon:'0812'});h.seed('orders_monthly_summaries/2026-08',{revenueIdr:99,orderCount:1});
 const plan=await h.repair.previewOrderRepairs();
 assert.equal(h.records.get('orders/old').totalPembayaran,1490000);
 assert.equal(plan.orders[0].patch.totalPembayaran,2548000);
 assert.equal(plan.orders[0].patch.idPelanggan,'c1');
 const result=await h.repair.applyOrderRepairs(plan);
 assert.equal(result.applied,1);
 const saved=h.records.get('orders/old');
 assert.equal(saved.totalPembayaran,2548000);assert.equal(saved.dpNominal,300000);assert.equal(saved.hargaJastip,1490000);assert.equal(saved.status,'DP Terbayar');
 assert.equal(h.records.get('customer/c1').totalSpendIdr,2548000);assert.equal(h.records.get('customer/c1').telpon,'0812');
 assert.equal(h.records.get('orders_monthly_summaries/2026-09').revenueIdr,2548000);
 assert.equal(h.records.get('orders_monthly_summaries/2026-08').orderCount,0);
 const again=await h.repair.previewOrderRepairs();assert.equal(Object.keys(again.orders[0].patch).length,0);
});

test('repair never guesses duplicate customer names and preserves incomplete legacy price data',async()=>{
 const h=setup();h.seed('customer/c1',{nama:'HUSIN'});h.seed('customer/c2',{nama:'HUSIN'});h.seed('orders/old',{...legacy,hargaJastipMarkup:undefined});
 const plan=await h.repair.previewOrderRepairs();assert.equal(Object.keys(plan.orders[0].patch).length,0);assert.equal(plan.orders[0].warnings.length,2);
});

test('repair skips changed records and rejects a modified plan',async()=>{
 const h=setup();h.seed('orders/old',legacy);const plan=await h.repair.previewOrderRepairs();
 h.seed('orders/old',{...legacy,dpNominal:500000});
 let result=await h.repair.applyOrderRepairs(plan);assert.equal(result.applied,0);assert.equal(result.skipped.length,1);assert.equal(h.records.get('orders/old').dpNominal,500000);
 const modified=await h.repair.previewOrderRepairs();modified.orders[0].patch.dpNominal=1;
 result=await h.repair.applyOrderRepairs(modified);assert.equal(result.applied,0);assert.equal(h.records.get('orders/old').dpNominal,500000);
});

test('recalculation retries when an order is created while the snapshot is being scanned',async()=>{
 const h=setup();h.seed('orders/old',legacy);
 h.afterNextQuery(async ref=>{if(ref.path==='orders') await h.orders.createOrder({...legacy,idPelanggan:''},0);});
 await h.orders.recalculateAllStats();
 assert.equal(h.records.get('orders_monthly_summaries/2026-09').orderCount,2);
 assert.equal(h.records.get('orders_monthly_summaries/2026-09').revenueIdr,5096000);
});

test('editing or deleting a legacy row after recalculation does not double-count the old cost-based total',async()=>{
 const h=setup();h.seed('orders/old',{...legacy,idPelanggan:'c1'});h.seed('customer/c1',{nama:'HUSIN'});
 await h.orders.recalculateAllStats();
 await h.orders.updateOrder('old',{namaBarang:'Nama baru'},0);
 assert.equal(h.records.get('orders_monthly_summaries/2026-09').revenueIdr,2548000);
 assert.equal(h.records.get('customer/c1').totalSpendIdr,2548000);
 await h.orders.deleteOrder('old');
 assert.equal(h.records.get('orders_monthly_summaries/2026-09').revenueIdr,0);
 assert.equal(h.records.get('customer/c1').totalSpendIdr,0);
});
