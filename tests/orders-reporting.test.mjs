import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { ledgerHarness } from './helpers/ledger-harness.mjs';

const h = ledgerHarness();
const utils = h.load('src/utils/orders.ts');
const order = (extra = {}) => ({ id: '1', no: 'ORD-1', idPelanggan: 'c1', namaPelanggan: 'SAMA', tanggal: '2026-09-17', namaBarang: 'Barang', jumlahKg: 1, hargaJastipMarkup: 1000000, hargaOngkirMarkup: 0, dpNominal: 300000, status: 'DP Terbayar', ...extra });

test('a combined invoice sums every DP and settlement, including settlement without DP', () => {
  const result = utils.summarizeInvoice([order(), order({id:'2'})], 0);
  assert.equal(result.subtotal, 2000000);
  assert.equal(result.dp, 600000);
  assert.equal(result.remaining, 1400000);
  const paid = utils.summarizeInvoice([order({dpNominal:0,pelunasanNominal:1000000})],0);
  assert.equal(paid.settlement,1000000);
  assert.equal(paid.remaining,0);
});

test('invoice selection rejects different currencies and different IDs with identical names', () => {
  assert.match(utils.invoiceSelectionError([order(), order({id:'2',tipeNominal:'JPY'})]), /mata uang/i);
  assert.throws(() => utils.summarizeInvoice([order(),order({tipeNominal:'JPY'})],0));
  assert.match(utils.invoiceSelectionError([order(), order({id:'2',idPelanggan:'c2'})]), /pelanggan/i);
  assert.equal(utils.invoiceSelectionError([order(),order({id:'2',namaPelanggan:'Nama diganti'})]),null);
});

test('legacy customer names resolve only when unique; a supplied ID always takes precedence', () => {
  const customers = [{id:'c1',nama:'SAMA'},{id:'c2',nama:'SAMA'}];
  assert.equal(utils.resolveOrderCustomer(order(),customers).id,'c1');
  assert.equal(utils.resolveOrderCustomer(order({idPelanggan:''}),customers),undefined);
  assert.equal(utils.resolveOrderCustomer(order({idPelanggan:'gone'}),customers),undefined);
  assert.equal(utils.resolveOrderCustomer(order({idPelanggan:'',namaPelanggan:' sama '}),customers.slice(0,1)).id,'c1');
});

test('recap keeps rupiah and yen separate and subtracts both payment fields', () => {
  const recap = utils.buildUnpaidRecap([order({dpNominal:300000,pelunasanNominal:200000}),order({id:'2',tipeNominal:'JPY',hargaJastipMarkup:10000,dpNominal:2000})],0,new Date(2026,8,17));
  assert.match(recap,/IDR:.*500\.000/);
  assert.match(recap,/JPY:.*8,000/);
  assert.doesNotMatch(recap,/508\.000/);
});

test('overpayment on one order does not silently settle another order in a combined invoice', () => {
  const invoice = utils.summarizeInvoice([order({dpNominal:1500000}),order({id:'2',dpNominal:0})],0);
  assert.equal(invoice.remaining,1000000);
});

test('orders hook loads beyond 250 rows while rendering only 50 and searching the full dataset', async () => {
  const db = ledgerHarness();
  for(let i=0;i<320;i++) db.seed(`orders/${i}`,order({id:String(i),no:`ORD-${i}`,namaBarang:i===300?'Barang langka':'Barang'}));
  const service = db.load('src/services/ordersFirebase.ts');
  const states = []; let cursor = 0; const effects = []; const exports = {};
  const react = { useState: initial => {const index=cursor++;if(!(index in states)) states[index]=typeof initial==='function'?initial():initial;return [states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value;}];},useMemo: fn=>fn(),useEffect: fn=>effects.push(fn) };
  const source = ts.transpileModule(readFileSync('src/hooks/useOrdersQuery.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(source,{exports,window:{addEventListener(){},removeEventListener(){}},require:name=>name==='react'?react:name==='react-router-dom'?{useSearchParams:()=>[new URLSearchParams(),()=>{}]}:name.endsWith('ordersFirebase')?service:name.endsWith('/orders')?utils:db.load('src/utils/helpers.ts')});
  const render=()=>{cursor=0;effects.length=0;return exports.useOrdersQuery({unitPrice:0});};
  render();for(const effect of [...effects]) effect();
  await new Promise(resolve=>setImmediate(resolve));
  let state=render();
  assert.equal(state.sortedOrders.length,320);
  assert.equal(state.metrics.totalOrders,320);
  assert.equal(state.displayedOrders.length,50);
  state.setQ('Barang langka');state=render();
  assert.equal(state.sortedOrders.length,1);
  assert.equal(state.sortedOrders[0].no,'ORD-300');
});
