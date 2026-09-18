// A local, typed backup of the exact Firestore scope touched by order repair.
// This is not a managed export or a backup of Firebase Auth/Storage/subcollections.
import { createHash } from 'node:crypto';
import {
  Timestamp, GeoPoint, Bytes, DocumentReference, VectorValue, vector,
  collection, doc, getDocsFromServer, getDocFromServer, runTransaction,
} from 'firebase/firestore';

export const REPAIR_COLLECTIONS = ['orders', 'customer', 'orders_monthly_summaries'];
const REVISION_PATH = 'metadata/orders_revision';
const sdk = { collection, doc, getDocsFromServer, getDocFromServer, runTransaction };
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Every value has a tag; ordinary map fields cannot collide with type markers.
export function encodeValue(value, db) {
  if (value === null) return ['null'];
  if (typeof value === 'string' || typeof value === 'boolean') return [typeof value, value];
  if (typeof value === 'number') return ['number', Number.isNaN(value) ? 'NaN' : value === Infinity ? 'Infinity' : value === -Infinity ? '-Infinity' : Object.is(value, -0) ? '-0' : value];
  if (value instanceof Timestamp) return ['timestamp', value.seconds, value.nanoseconds];
  if (value instanceof GeoPoint) return ['geopoint', value.latitude, value.longitude];
  if (value instanceof Bytes) return ['bytes', value.toBase64()];
  if (value instanceof DocumentReference) {
    if (value.firestore !== db) throw new Error('Referensi lintas database tidak didukung; backup dihentikan.');
    return ['reference', value.path];
  }
  if (value instanceof VectorValue) return ['vector', value.toArray()];
  if (Array.isArray(value)) return ['array', value.map(item => encodeValue(item, db))];
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return ['map', Object.keys(value).sort().map(key => [key, encodeValue(value[key], db)])];
  }
  throw new Error('Tipe data tidak dikenal; backup dihentikan agar tidak kehilangan data.');
}

export function decodeValue(value, db) {
  if (!Array.isArray(value)) throw new Error('Format nilai backup tidak valid.');
  const [type, data, extra] = value;
  switch (type) {
    case 'null': return null;
    case 'string': if (typeof data === 'string') return data; break;
    case 'boolean': if (typeof data === 'boolean') return data; break;
    case 'number':
      if (typeof data === 'number' && Number.isFinite(data)) return data;
      if (data === 'NaN') return NaN;
      if (data === 'Infinity') return Infinity;
      if (data === '-Infinity') return -Infinity;
      if (data === '-0') return -0;
      break;
    case 'timestamp': return new Timestamp(data, extra);
    case 'geopoint': return new GeoPoint(data, extra);
    case 'bytes': return Bytes.fromBase64String(data);
    case 'reference': return doc(db, data);
    case 'vector': return vector(data);
    case 'array': return data.map(item => decodeValue(item, db));
    case 'map': return Object.fromEntries(data.map(([key, item]) => [key, decodeValue(item, db)]));
  }
  throw new Error('Format nilai backup tidak valid.');
}

function allowedPath(path) {
  const parts = path.split('/');
  return path === REVISION_PATH || (parts.length === 2 && parts[1] && REPAIR_COLLECTIONS.includes(parts[0]));
}

export function sealBackup(payload) { return { ...payload, sha256: digest(payload) }; }

export function validateBackup(backup, projectId, db) {
  const { sha256, ...payload } = backup;
  if (backup.kind !== 'nihong-order-repair-backup' || backup.schemaVersion !== 1 || backup.projectId !== projectId || backup.databaseId !== '(default)' || sha256 !== digest(payload)) {
    throw new Error('Backup tidak cocok dengan proyek/format atau checksum rusak.');
  }
  if (JSON.stringify(backup.collections) !== JSON.stringify(REPAIR_COLLECTIONS) || !Array.isArray(backup.documents)) throw new Error('Cakupan backup tidak lengkap.');
  const paths = new Set();
  for (const row of backup.documents) {
    if (typeof row.path !== 'string' || !allowedPath(row.path) || paths.has(row.path)) throw new Error('Path backup tidak valid atau ganda.');
    paths.add(row.path);
    if (row.data === null) {
      if (row.path !== REVISION_PATH) throw new Error('Dokumen backup kosong tidak valid.');
    } else {
      const decoded = decodeValue(row.data, db);
      if (row.data[0] !== 'map' || JSON.stringify(encodeValue(decoded, db)) !== JSON.stringify(row.data)) throw new Error('Tipe data backup tidak dapat dipulihkan persis.');
    }
  }
  if (!paths.has(REVISION_PATH)) throw new Error('Metadata revisi belum dicadangkan.');
  return backup;
}

async function readScope(db, io) {
  const snapshots = await Promise.all(REPAIR_COLLECTIONS.map(name => io.getDocsFromServer(io.collection(db, name))));
  const revision = await io.getDocFromServer(io.doc(db, REVISION_PATH));
  return [
    ...snapshots.flatMap((snapshot, index) => snapshot.docs.map(item => ({ path: `${REPAIR_COLLECTIONS[index]}/${item.id}`, data: encodeValue(item.data(), db) }))),
    { path: REVISION_PATH, data: revision.exists() ? encodeValue(revision.data(), db) : null },
  ].sort((a, b) => a.path.localeCompare(b.path));
}

export async function captureRepairBackup(db, projectId, io = sdk) {
  const first = await readScope(db, io);
  const second = await readScope(db, io);
  if (digest(first) !== digest(second)) throw new Error('Data berubah saat backup. Hentikan input/edit di semua perangkat lalu ulangi.');
  return validateBackup(sealBackup({
    kind: 'nihong-order-repair-backup', schemaVersion: 1, projectId, databaseId: '(default)',
    capturedAt: new Date().toISOString(), collections: REPAIR_COLLECTIONS, documents: second,
  }), projectId, db);
}

export async function assertBackupCurrent(backup, db, projectId, io = sdk) {
  validateBackup(backup, projectId, db);
  if (digest(await readScope(db, io)) !== digest(backup.documents)) throw new Error('Data berubah sejak backup. Buat backup dan preview baru sebelum apply.');
}

export function backupCounts(backup) {
  return Object.fromEntries([...REPAIR_COLLECTIONS, 'metadata'].map(name => [name, backup.documents.filter(row => row.path.startsWith(`${name}/`) && row.data !== null).length]));
}

export function planRestore(target, current, db, projectId) {
  validateBackup(target, projectId, db);
  validateBackup(current, projectId, db);
  const originals = new Map(target.documents.map(row => [row.path, row.data]));
  const latest = new Map(current.documents.map(row => [row.path, row.data]));
  // Repair may create monthly summary documents, but never new orders/customers.
  // Refuse rollback if normal work has resumed; never delete those new records.
  const months = new Set(target.documents.filter(row => row.path.startsWith('orders/')).map(row => String(decodeValue(row.data, db).tanggal || '').slice(0, 7)));
  for (const path of latest.keys()) {
    if (!originals.has(path) && !(path.startsWith('orders_monthly_summaries/') && months.has(path.split('/')[1]))) {
      throw new Error('Ada dokumen baru di luar hasil repair. Pemulihan otomatis dihentikan; perlu tinjau manual.');
    }
  }
  return [...new Set([...originals.keys(), ...latest.keys()])].sort().flatMap(path => {
    const before = latest.get(path) ?? null;
    const after = originals.get(path) ?? null;
    return digest(before) === digest(after) ? [] : [{ path, before, after }];
  });
}

export async function applyRestore(plan, db, projectId, io = sdk) {
  if (plan.kind !== 'nihong-order-repair-restore' || plan.projectId !== projectId) throw new Error('Rencana pemulihan tidak valid.');
  const operations = planRestore(plan.target, plan.current, db, projectId);
  if (digest(operations) !== digest(plan.operations)) throw new Error('Rencana pemulihan telah diubah.');
  await assertBackupCurrent(plan.current, db, projectId, io);
  let restored = 0;
  for (const item of operations) {
    await io.runTransaction(db, async transaction => {
      const ref = io.doc(db, item.path);
      const snap = await transaction.get(ref);
      const live = snap.exists() ? encodeValue(snap.data(), db) : null;
      if (digest(live) !== digest(item.before)) throw new Error(`Data berubah pada ${item.path}; pemulihan dihentikan. Sebagian dokumen mungkin sudah dipulihkan.`);
      if (item.after === null) transaction.delete(ref);
      else transaction.set(ref, decodeValue(item.after, db));
    });
    restored++;
  }
  const verified = await readScope(db, io);
  if (digest(verified) !== digest(plan.target.documents)) throw new Error('Verifikasi pemulihan gagal; jangan buka kembali input data.');
  return { restored, verified: true };
}
