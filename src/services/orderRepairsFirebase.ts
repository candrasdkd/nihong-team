import { collection, doc, getDocsFromServer, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Customer } from "../types";
import { planOrderRepair } from "../utils/orderRepairs";
import { recalculateAllStats } from "./ordersFirebase";

export type OrderRepairPlan = {
  capturedAt: string;
  orders: { id: string; before: Record<string, any>; fingerprint: string; patch: Record<string, any>; warnings: string[] }[];
};

// Firestore query snapshots and transaction reads can enumerate the same map
// fields in different orders. Compare their JSON values, preserving array order
// and SDK toJSON representations (e.g. Timestamp), rather than raw JSON text.
function fingerprint(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]));
    }
    return item;
  });
}

/** Read-only preview; use the typed maintenance backup for restoration. */
export async function previewOrderRepairs(): Promise<OrderRepairPlan> {
  const [orders, customerDocs] = await Promise.all([
    getDocsFromServer(collection(db, "orders")), getDocsFromServer(collection(db, "customer")),
  ]);
  const customers = customerDocs.docs.map(item => ({ ...item.data(), id: item.id } as Customer));
  return { capturedAt: new Date().toISOString(), orders: orders.docs.map(item => {
    const before = item.data();
    return { id: item.id, before, fingerprint: fingerprint(before), ...planOrderRepair(before, customers) };
  }) };
}

/** Only the three reviewed derived fields are eligible. Prices/payments stay intact. */
export async function applyOrderRepairs(plan: OrderRepairPlan) {
  const customerDocs = await getDocsFromServer(collection(db, "customer"));
  const customers = customerDocs.docs.map(item => ({ ...item.data(), id: item.id } as Customer));
  let applied = 0;
  const skipped: { id: string; reason: string }[] = [];
  for (const item of plan.orders) {
    if (!Object.keys(item.patch).length) continue;
    const ref = doc(db, "orders", item.id);
    try {
      await runTransaction(db, async transaction => {
        const snap = await transaction.get(ref);
        // Canonicalize saved fingerprints too, so already-reviewed previews
        // created by the earlier script remain usable without losing checks.
        const expected = fingerprint(JSON.parse(item.fingerprint));
        if (fingerprint(item.before) !== expected) throw new Error("File pratinjau tidak konsisten; buat pratinjau ulang.");
        if (!snap.exists() || fingerprint(snap.data()) !== expected) throw new Error("Pesanan berubah sejak pratinjau.");
        const current = snap.data();
        const approved = planOrderRepair(current, customers).patch;
        if (fingerprint(approved) !== fingerprint(item.patch)) throw new Error("Hasil perbaikan berubah; buat pratinjau ulang.");
        transaction.update(ref, { ...approved, revision: (current.revision || 0) + 1, updatedAt: serverTimestamp() });
        transaction.set(doc(db, "metadata", "orders_revision"), { revision: increment(1) }, { merge: true });
      });
      applied++;
    } catch (error) {
      skipped.push({ id: item.id, reason: error instanceof Error ? error.message : "Gagal memperbarui pesanan." });
    }
  }
  // A rejected/partial repair must not publish aggregates from incomplete links.
  const aggregatesRecalculated = skipped.length === 0;
  if (aggregatesRecalculated) await recalculateAllStats();
  return { applied, skipped, aggregatesRecalculated };
}
