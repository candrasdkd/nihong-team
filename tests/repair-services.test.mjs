import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, terminate, doc, writeBatch } from 'firebase/firestore';
import { createRepairModuleLoader } from '../scripts/lib/repair-services.mjs';

test('maintenance loader shares the real SDK and creates Firestore-serializable repair objects without network access', async () => {
  const app = initializeApp({ projectId: 'demo-order-repair' }, 'maintenance-loader-test');
  const db = getFirestore(app);
  try {
    const load = createRepairModuleLoader({ db, auth: null });
    // Loading the actual service executes collection(db, "orders"). Mixing
    // require(firebase/firestore) with the ESM db used to fail here.
    const service = load('src/services/orderRepairsFirebase.ts');
    assert.equal(typeof service.previewOrderRepairs, 'function');
    assert.equal(typeof service.applyOrderRepairs, 'function');
    const utils = load('src/utils/orderRepairs.ts');
    const result = utils.planOrderRepair({
      namaPelanggan: 'CUSTOMER', hargaJastip: 100, hargaJastipMarkup: 150,
      hargaOngkir: 20, hargaOngkirMarkup: 30, totalPembayaran: 120,
    }, [{ id: 'c1', nama: 'CUSTOMER' }]);
    assert.equal(result.patch.totalPembayaran, 180);
    assert.equal(Object.getPrototypeOf(result.patch), Object.prototype);
    // Validate with the real SDK serializer, but never commit or touch a server.
    const batch = writeBatch(db);
    assert.doesNotThrow(() => batch.update(doc(db, 'orders', 'test'), result.patch));
  } finally {
    await terminate(db);
    await deleteApp(app);
  }
});
