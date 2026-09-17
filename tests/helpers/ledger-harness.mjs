import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import vm from "node:vm";
import ts from "typescript";

// Execute the real service modules against a deterministic, transactional store.
// No Firebase project or network is used.
export function ledgerHarness({ publicReportsEnabled = true, authenticated = true } = {}) {
  const records = new Map();
  const versions = new Map();
  const modules = new Map();
  let sequence = 0;
  let afterQuery;
  const reads = [];
  const listeners = new Set();
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const snapshot = (path, fromCache = false) => { const exists = records.has(path); const value = clone(records.get(path)); return { id: path.split("/").at(-1), exists: () => exists, data: () => value, metadata: { fromCache } }; };
  const write = (path, value, merge = false) => {
    const old = records.get(path) || {};
    const next = merge ? { ...old } : {};
    for (const [key, field] of Object.entries(value)) {
      next[key] = field && field.__increment !== undefined ? (old[key] || 0) + field.__increment : clone(field);
    }
    records.set(path, next);
    versions.set(path, (versions.get(path) || 0) + 1);
    for (const listener of listeners) if (listener.path === path) listener.callback(snapshot(path));
  };
  const firestore = {
    collection: (parent, ...parts) => ({ path: [parent.path, ...parts].filter(Boolean).join("/") }),
    doc: (parent, ...parts) => {
      const path = [parent.path, ...(parts.length ? parts : [String(++sequence)])].filter(Boolean).join("/");
      return { path, id: path.split("/").at(-1) };
    },
    where: (field, operator, value) => ({ field, operator, value }),
    orderBy: (field, direction = "asc") => ({ sort: field, direction }),
    limit: count => ({ count }),
    query: (ref, ...constraints) => ({ ...ref, constraints }),
    increment: value => ({ __increment: value }),
    getDoc: async ref => { reads.push(ref.path); return snapshot(ref.path); },
    getDocs: async ref => {
      reads.push(ref.path);
      let docs = [...records.keys()].filter(path => path.startsWith(ref.path + "/") && path.split("/").length === ref.path.split("/").length + 1).map(path => {
        const value = clone(records.get(path));
        return { id: path.split("/").at(-1), data: () => value };
      });
      for (const c of ref.constraints || []) {
        if (c.field) docs = docs.filter(d => c.operator === "==" ? d.data()[c.field] === c.value : c.operator === ">=" ? d.data()[c.field] >= c.value : d.data()[c.field] <= c.value);
        if (c.sort) docs.sort((a, b) => (a.data()[c.sort] < b.data()[c.sort] ? -1 : 1) * (c.direction === "desc" ? -1 : 1));
        if (c.count) docs = docs.slice(0, c.count);
      }
      if (afterQuery) { const callback = afterQuery; afterQuery = undefined; await callback(ref); }
      return { docs, size: docs.length, empty: !docs.length, forEach: callback => docs.forEach(callback) };
    },
    setDoc: async (ref, value, options) => write(ref.path, value, options?.merge),
    updateDoc: async (ref, value) => write(ref.path, value, true),
    runTransaction: async (_, callback) => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const reads = new Map();
        const writes = [];
        const result = await callback({
          get: async ref => {
            if (writes.length) throw new Error("Firestore transactions require reads before writes");
            reads.set(ref.path, versions.get(ref.path) || 0);
            const exists = records.has(ref.path);
            const value = clone(records.get(ref.path));
            return { id: ref.id, exists: () => exists, data: () => value };
          },
          set: (ref, value, options) => writes.push(() => write(ref.path, value, options?.merge)),
          update: (ref, value) => writes.push(() => write(ref.path, value, true)),
          delete: ref => writes.push(() => { records.delete(ref.path); versions.set(ref.path, (versions.get(ref.path) || 0) + 1); }),
        });
        if ([...reads].some(([path, version]) => version !== (versions.get(path) || 0))) continue;
        writes.forEach(apply => apply());
        return result;
      }
      throw new Error("Transaction contention");
    },
    onSnapshot: (ref, optionsOrCallback, next) => {
      const callback = typeof optionsOrCallback === "function" ? optionsOrCallback : next;
      const listener = { path: ref.path, callback };
      listeners.add(listener);
      if (ref.constraints) firestore.getDocs(ref).then(callback);
      else callback(snapshot(ref.path));
      return () => listeners.delete(listener);
    },
  };
  firestore.getDocFromServer = firestore.getDoc;
  firestore.getDocsFromServer = firestore.getDocs;
  function load(file) {
    file = resolve(file);
    if (modules.has(file)) return modules.get(file);
    const exports = {};
    modules.set(file, exports);
    const source = ts.transpileModule(readFileSync(file, "utf8").replaceAll("import.meta.env", "globalThis.testEnv"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(source, {
      exports, console, Date, testEnv: { VITE_ENABLE_PUBLIC_LEDGER_REPORTS: publicReportsEnabled ? "true" : "false" }, crypto: globalThis.crypto, TextEncoder, setTimeout, clearTimeout,
      require: name => {
        if (name === "firebase/firestore") return firestore;
        if (name.endsWith("/lib/firebase")) return { db: {}, auth: { currentUser: authenticated ? { uid: "tester", email: "tester@example.test" } : null } };
        if (name.startsWith(".")) return load(resolve(dirname(file), name + ".ts"));
        throw new Error(`Unexpected module ${name}`);
      },
    }, { filename: file });
    return exports;
  }
  return {
    ledger: load("src/services/ledgerFirebase.ts"),
    capital: load("src/services/capitalAdvanceFirebase.ts"),
    records, reads, load,
    emitCached: path => { for (const listener of listeners) if (listener.path === path) listener.callback(snapshot(path, true)); },
    seed: write,
    afterNextQuery: callback => { afterQuery = callback; },
    entries: collection => [...records].filter(([path]) => path.startsWith(collection + "/")).map(([path, data]) => ({ id: path.split("/").at(-1), ...data })),
  };
}

export const entry = (jumlah = 1000000, tipe = "Keluar") => ({
  tanggal: "2026-09-17", tipe, jumlah, kategori: "Belanja", keterangan: "Modal belanja",
  metode: "Transfer", rekening: "BCA Operasional", catatan: null,
});
