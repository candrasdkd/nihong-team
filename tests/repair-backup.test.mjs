import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, terminate, Timestamp, GeoPoint, Bytes, doc, vector, writeBatch } from 'firebase/firestore';
import {
  encodeValue, decodeValue, captureRepairBackup, validateBackup, assertBackupCurrent,
  planRestore, applyRestore, sealBackup, backupCounts,
} from '../scripts/lib/repair-backup.mjs';

const projectId = 'demo-backup-test';
function harness(initial) {
  const db = {};
  const records = new Map(Object.entries(initial));
  let writes = 0;
  const snapshot = path => ({ exists: () => records.has(path), data: () => records.get(path) });
  const io = {
    doc: (_db, path) => path,
    collection: (_db, path) => path,
    getDocFromServer: async path => snapshot(path),
    getDocsFromServer: async name => ({ docs: [...records].filter(([path]) => path.startsWith(`${name}/`)).map(([path, data]) => ({ id: path.split('/')[1], data: () => data })) }),
    runTransaction: async (_db, callback) => {
      const pending = [];
      await callback({
        get: async path => snapshot(path),
        set: (path, value) => pending.push(() => records.set(path, value)),
        delete: path => pending.push(() => records.delete(path)),
      });
      for (const write of pending) { write(); writes++; }
    },
  };
  return { db, records, io, writes: () => writes };
}
const initial = () => ({
  'orders/o1': { tanggal: '2026-09-01', totalPembayaran: 50, dpNominal: 20, createdAt: new Timestamp(100, 987654321) },
  'customer/c1': { nama: 'Pelanggan', totalSpendIdr: 50 },
  'customers/legacy': { orderCount: 0 },
  'ledger/l1': { nominal: 300 },
});

test('typed backup survives JSON and remains valid for actual SDK writes without making network calls', async () => {
  const app = initializeApp({ projectId, apiKey: 'demo' }, 'backup-codec-test');
  const db = getFirestore(app);
  try {
    const data = {
      time: new Timestamp(1720000000, 123456789), point: new GeoPoint(-6.2, 106.8),
      bytes: Bytes.fromUint8Array(new Uint8Array([0, 255, 4])), ref: doc(db, 'customer/c1'),
      vector: vector([1.5, 2.5]), nested: [null, true, { type: 'timestamp', seconds: 3 }],
      nan: NaN, infinity: Infinity, negativeInfinity: -Infinity, negativeZero: -0,
    };
    const encoded = encodeValue(data, db);
    const decoded = decodeValue(JSON.parse(JSON.stringify(encoded)), db);
    assert.deepEqual(encodeValue(decoded, db), encoded);
    assert.ok(decoded.time.isEqual(data.time));
    assert.ok(decoded.point.isEqual(data.point));
    assert.ok(decoded.bytes.isEqual(data.bytes));
    assert.equal(decoded.ref.path, 'customer/c1');
    assert.ok(Object.is(decoded.negativeZero, -0));
    const batch = writeBatch(db);
    // SDK serializer validates restored values here; do not commit to a database.
    assert.doesNotThrow(() => batch.set(doc(db, 'orders/test'), decoded));
    assert.throws(() => encodeValue(new Date(), db), /Tipe data/);
  } finally { await terminate(db); await deleteApp(app); }
});

test('backup reads full repair scope twice, preserves missing revision, and never writes', async () => {
  const h = harness(initial());
  const backup = await captureRepairBackup(h.db, projectId, h.io);
  assert.deepEqual(backupCounts(backup), { orders: 1, customer: 1, orders_monthly_summaries: 0, metadata: 0 });
  assert.equal(h.writes(), 0);
  assert.ok(backup.documents.some(row => row.path === 'metadata/orders_revision' && row.data === null));
  assert.ok(!backup.documents.some(row => row.path.startsWith('ledger/') || row.path.startsWith('customers/')));
  validateBackup(JSON.parse(JSON.stringify(backup)), projectId, h.db);
  await assertBackupCurrent(backup, h.db, projectId, h.io);
  h.records.get('orders/o1').dpNominal = 30;
  await assert.rejects(assertBackupCurrent(backup, h.db, projectId, h.io), /Data berubah sejak backup/);
});

test('changing data or permission-denied reads fail the backup, never produce partial success', async () => {
  const h = harness(initial());
  const read = h.io.getDocsFromServer;
  let reads = 0;
  h.io.getDocsFromServer = async name => {
    if (++reads === 4) h.records.get('orders/o1').dpNominal = 999;
    return read(name);
  };
  await assert.rejects(captureRepairBackup(h.db, projectId, h.io), /Data berubah saat backup/);
  h.io.getDocsFromServer = async () => { throw new Error('permission-denied'); };
  await assert.rejects(captureRepairBackup(h.db, projectId, h.io), /permission-denied/);
  assert.equal(h.writes(), 0);
});

test('wrong project, corruption, duplicate paths and out-of-scope paths are rejected', async () => {
  const h = harness(initial());
  const backup = await captureRepairBackup(h.db, projectId, h.io);
  assert.throws(() => validateBackup(backup, 'other-project', h.db), /tidak cocok/);
  assert.throws(() => validateBackup({ ...backup, capturedAt: 'modified' }, projectId, h.db), /checksum/);
  const { sha256, ...payload } = backup;
  const duplicate = sealBackup({ ...payload, documents: [...payload.documents, payload.documents[0]] });
  assert.throws(() => validateBackup(duplicate, projectId, h.db), /ganda/);
  const outside = sealBackup({ ...payload, documents: [...payload.documents, { path: 'ledger/l1', data: ['map', []] }] });
  assert.throws(() => validateBackup(outside, projectId, h.db), /Path backup/);
});

test('recovery preview is read-only; restore exactly recovers typed originals and removes only repair-created summaries/revision', async () => {
  const h = harness(initial());
  const target = await captureRepairBackup(h.db, projectId, h.io);
  h.records.set('orders/o1', { ...h.records.get('orders/o1'), totalPembayaran: 80, revision: 1 });
  h.records.set('customer/c1', { nama: 'Pelanggan', totalSpendIdr: 80, calculationVersion: 2 });
  h.records.set('orders_monthly_summaries/2026-09', { revenueIdr: 80 });
  h.records.set('metadata/orders_revision', { revision: 1 });
  const current = await captureRepairBackup(h.db, projectId, h.io);
  const operations = planRestore(target, current, h.db, projectId);
  const plan = JSON.parse(JSON.stringify({ kind: 'nihong-order-repair-restore', projectId, target, current, operations }));
  assert.equal(h.writes(), 0);
  assert.equal(operations.length, 4);
  assert.deepEqual(await applyRestore(plan, h.db, projectId, h.io), { restored: 4, verified: true });
  assert.ok(h.records.get('orders/o1').createdAt.isEqual(initial()['orders/o1'].createdAt));
  assert.deepEqual(h.records.get('customer/c1'), initial()['customer/c1']);
  assert.equal(h.records.has('metadata/orders_revision'), false);
  assert.equal(h.records.has('orders_monthly_summaries/2026-09'), false);
  assert.deepEqual(h.records.get('customers/legacy'), { orderCount: 0 });
  assert.deepEqual(h.records.get('ledger/l1'), { nominal: 300 });
});

test('recovery rejects new normal-work documents and stale/tampered restore plans', async () => {
  const h = harness(initial());
  const target = await captureRepairBackup(h.db, projectId, h.io);
  h.records.set('orders/new', { tanggal: '2026-09-18' });
  const extra = await captureRepairBackup(h.db, projectId, h.io);
  assert.throws(() => planRestore(target, extra, h.db, projectId), /dokumen baru/);
  h.records.delete('orders/new');
  h.records.set('orders/o1', { ...h.records.get('orders/o1'), totalPembayaran: 80 });
  const current = await captureRepairBackup(h.db, projectId, h.io);
  const plan = { kind: 'nihong-order-repair-restore', projectId, target, current, operations: planRestore(target, current, h.db, projectId) };
  await assert.rejects(applyRestore({ ...plan, operations: [] }, h.db, projectId, h.io), /telah diubah/);
  h.records.get('orders/o1').dpNominal = 44;
  await assert.rejects(applyRestore(plan, h.db, projectId, h.io), /Data berubah sejak backup/);
  assert.equal(h.writes(), 0);
});

test('transaction precondition catches a payment edit after recovery preflight', async () => {
  const h = harness(initial());
  const target = await captureRepairBackup(h.db, projectId, h.io);
  h.records.get('orders/o1').totalPembayaran = 80;
  const current = await captureRepairBackup(h.db, projectId, h.io);
  const plan = { kind: 'nihong-order-repair-restore', projectId, target, current, operations: planRestore(target, current, h.db, projectId) };
  const transaction = h.io.runTransaction;
  h.io.runTransaction = async (...args) => {
    h.records.get('orders/o1').dpNominal = 99;
    return transaction(...args);
  };
  await assert.rejects(applyRestore(plan, h.db, projectId, h.io), /Data berubah pada orders/);
  assert.equal(h.records.get('orders/o1').dpNominal, 99);
  assert.equal(h.writes(), 0);
});
