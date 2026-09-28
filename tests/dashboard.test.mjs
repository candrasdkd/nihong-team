import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardHarness, nodes, textOf } from './helpers/dashboard-harness.mjs';

const order = (id, tanggal, extra = {}) => ({ id, tanggal, namaPelanggan: id, namaBarang: 'Barang', status: 'Selesai', tipeNominal: 'IDR', hargaJastip: 0, hargaOngkir: 0, hargaJastipMarkup: 100, hargaOngkirMarkup: 0, ...extra });
const card = (tree, label) => nodes(tree, n => n.type === 'StatCard' && n.props.label === label)[0]?.props;
async function loaded(h, period) { h.render(period); await new Promise(resolve=>setImmediate(resolve)); h.flush(); return h.render(); }

test('30 days includes today and its preceding 29 dates, excludes older and future orders', async () => {
 const h=dashboardHarness({orders:[order('old','2026-08-01'),order('edge','2026-08-20'),order('today','2026-09-18'),order('future','2026-09-19')]});
 const tree=await loaded(h,'30d');
 assert.match(card(tree,'Total Pelanggan').sub,/2 total transaksi/);
});

test('3 and 12 month windows include exactly their calendar months through today', async () => {
 const orders=[order('year-old','2025-09-20'),order('oct','2025-10-01'),order('june','2026-06-30'),order('july','2026-07-01'),order('today','2026-09-18'),order('future','2026-09-30')];
 const h=dashboardHarness({orders});
 assert.match(card(await loaded(h,'3m'),'Total Pelanggan').sub,/2 total transaksi/);
 assert.match(card(await loaded(h,'12m'),'Total Pelanggan').sub,/4 total transaksi/);
});

test('status totals share the selected period and separate DP from unpaid', async () => {
 const h=dashboardHarness({orders:[order('outside','2025-01-01',{status:'Belum Membayar'}),order('unpaid','2026-09-01',{status:'Belum Membayar'}),order('dp','2026-09-02',{status:'DP Terbayar'}),order('done','2026-09-03')]});
 const tree=await loaded(h,'30d');
 assert.equal(card(tree,'Pesanan Aktif').value,2);
 assert.match(textOf(tree),/DP Terbayar/);
 assert.match(textOf(tree),/33\s*% selesai/);
});

test('profit card preserves a loss in IDR alongside positive profit in JPY', async () => {
 const h=dashboardHarness({orders:[order('idr','2026-09-01',{hargaJastip:200100}),order('jpy','2026-09-01',{tipeNominal:'JPY',hargaJastipMarkup:1000})]});
 const tree=await loaded(h,'30d');const value=card(tree,'Total Profit');
 assert.match(value.value,/-.*200\.000/);
 assert.match(value.sub,/1[.,]000/);
});

test('currency control switches the actual chart series to JPY', async () => {
 const h=dashboardHarness({orders:[order('yen','2026-09-01',{tipeNominal:'JPY'})]});
 let tree=await loaded(h,'30d');
 const yen=nodes(tree,n=>n.type==='button'&&textOf(n).includes('JPY'))[0];
 assert.ok(yen,'chart must offer a yen view');yen.props.onClick();tree=h.render();
 assert.deepEqual(nodes(tree,n=>n.type==='Area').map(n=>n.props.dataKey),['revJpy','profJpy']);
});

test('recent order status follows a remote payment update without refreshing monthly summaries', async () => {
 const unpaid=order('PAYMENT','2026-09-18',{status:'Belum Membayar'});
 const h=dashboardHarness({orders:[unpaid]});
 let tree=await loaded(h,'30d');
 h.update([{...unpaid,status:'Selesai',pelunasanNominal:100}]);tree=h.render();
 const badges=nodes(tree,n=>n.type==='Badge').map(textOf);
 assert.ok(badges.includes('Selesai'),JSON.stringify(badges));
});

test('loading and read failure never masquerade as an empty database; retry can recover', async () => {
 const h=dashboardHarness({orders:[order('found','2026-09-18')]});
 let tree=h.render('30d');
 assert.doesNotMatch(textOf(tree),/Belum ada pesanan/);
 h.fail();tree=h.render();assert.match(textOf(tree),/Gagal memuat/);
 assert.doesNotMatch(textOf(tree),/Belum ada pesanan/);
 const retry=nodes(tree,n=>n.type==='button'&&textOf(n).includes('Coba lagi'))[0];
 assert.ok(retry);retry.props.onClick();h.render();h.flush();tree=h.render();
 assert.doesNotMatch(textOf(tree),/Gagal memuat/);
 assert.match(card(tree,'Total Pelanggan').sub,/1 total transaksi/);
 h.unmount();assert.ok(h.subscriptions.every(s=>s.closed));
});

test('changing period clears stale metrics, rejects late callbacks, and reuses recent/customer listeners', async () => {
 const h=dashboardHarness({orders:[order('older','2026-01-01'),order('current','2026-09-18')]});
 await loaded(h,'12m');
 const previous=h.subscriptions.find(s=>s.ref.constraints?.some(c=>c.kind==='where'));
 const tree=h.render('30d');
 assert.equal(card(tree,'Total Transaksi').value,'—');
 assert.equal(previous.closed,true);
 assert.equal(h.subscriptions.filter(s=>!s.closed).length,3);
 previous.next({docs:[{id:'late',data:()=>order('late','2026-09-18',{hargaJastipMarkup:9999})}]});
 assert.equal(card(h.render(),'Total Transaksi').value,'—');
 h.flush();
 assert.match(card(h.render(),'Total Pelanggan').sub,/1 total transaksi/);
});

test('empty snapshots show a true empty state and calendar month boundaries do not overflow', async () => {
 const empty=dashboardHarness();const emptyTree=await loaded(empty,'3m');
 assert.match(textOf(emptyTree),/Belum ada pesanan/);
 assert.equal(card(emptyTree,'Pesanan Aktif').value,0);
 const march=dashboardHarness({now:'2026-03-31T12:00:00+07:00',orders:[order('dec','2025-12-31'),order('jan','2026-01-01'),order('mar','2026-03-31')]});
 assert.match(card(await loaded(march,'3m'),'Total Pelanggan').sub,/2 total transaksi/);
 const leap=dashboardHarness({now:'2024-03-29T12:00:00+07:00',orders:[order('too-old','2024-02-28'),order('leap','2024-02-29'),order('today','2024-03-29')]});
 assert.match(card(await loaded(leap,'30d'),'Total Pelanggan').sub,/2 total transaksi/);
});

test('negative JPY profit remains visible next to positive IDR profit, including after a failed refresh', async () => {
 const h=dashboardHarness({orders:[order('idr','2026-09-01'),order('jpy','2026-09-01',{tipeNominal:'JPY',hargaJastip:1000})]});
 const tree=await loaded(h,'30d');
 assert.match(card(tree,'Total Profit').sub,/-.*900/);
 h.fail();const failed=h.render();
 assert.equal(card(failed,'Total Profit').value,'—');
 assert.match(textOf(failed),/Gagal memuat/);
});
