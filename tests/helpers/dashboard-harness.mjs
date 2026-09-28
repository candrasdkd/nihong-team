import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Render the real dashboard/hook modules with deterministic hook lifecycles and
// Firestore snapshots. UI primitives remain nodes so assertions inspect props.
export function dashboardHarness({ orders = [], customers = [], now = '2026-09-18T12:00:00+07:00' } = {}) {
  const state = [], effects = [], memos = [], modules = new Map(), subscriptions = [];
  let cursor = 0, pending = [], dirty = false, requestedPeriod;
  let rows = orders;
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial;
      return [i === 0 && requestedPeriod ? requestedPeriod : state[i], value => {
        state[i] = typeof value === 'function' ? value(state[i]) : value; dirty = true;
      }];
    },
    useMemo(fn, deps) {
      const i = cursor++;
      if (!memos[i] || deps.some((v, j) => !Object.is(v, memos[i].deps[j]))) memos[i] = { deps, value: fn() };
      return memos[i].value;
    },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!effects[i] || deps.some((v, j) => !Object.is(v, effects[i].deps[j]))) {
        pending.push(() => { effects[i]?.cleanup?.(); effects[i] = { deps, cleanup: fn() }; });
      }
    },
  };
  const snapshot = ref => {
    let selected = ref.path === 'customer' ? customers : rows;
    for (const c of ref.constraints || []) {
      if (c.kind === 'where') selected = selected.filter(r => c.op === '>=' ? r[c.field] >= c.value : c.op === '<=' ? r[c.field] <= c.value : r[c.field] === c.value);
      if (c.kind === 'order') selected = [...selected].sort((a,b) => String(a[c.field]).localeCompare(String(b[c.field])) * (c.dir === 'desc' ? -1 : 1));
      if (c.kind === 'limit') selected = selected.slice(0, c.count);
    }
    return { docs: selected.map(r => ({ id: r.id, data: () => ({ ...r }) })), empty: !selected.length, metadata: { fromCache: false } };
  };
  const firestore = {
    collection: (_db, path) => ({ path }),
    where: (field, op, value) => ({ kind: 'where', field, op, value }),
    orderBy: (field, dir) => ({ kind: 'order', field, dir }),
    limit: count => ({ kind: 'limit', count }),
    query: (ref, ...constraints) => ({ ...ref, constraints }),
    getDocs: async ref => snapshot(ref),
    onSnapshot: (ref, next, error) => {
      const entry = { ref, next, error, closed: false };
      subscriptions.push(entry);
      return () => { entry.closed = true; };
    },
  };
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
  const element = (type, props, key) => ({ type, props: props || {}, key });
  const dummy = new Proxy({}, { get: (_target, key) => String(key) });
  function load(file) {
    file = resolve(file);
    if (modules.has(file)) return modules.get(file);
    const exports = {}; modules.set(file, exports);
    let source = readFileSync(file, 'utf8');
    if (file.endsWith('/Dashboard.tsx')) source += '\nexport { DashboardView, StatusPills };';
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { exports, Date: FixedDate, console, setTimeout: () => 1, clearTimeout() {}, window: { addEventListener() {}, removeEventListener() {} }, require: name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
      if (name === 'firebase/firestore') return firestore;
      if (name === 'framer-motion') return { motion: dummy };
      if (name === 'recharts' || name === 'lucide-react') return dummy;
      if (name.endsWith('/lib/firebase')) return { db: {} };
      if (name.includes('/components/') || name.includes('/context/') || name.endsWith('/notificationService')) return dummy;
      if (name.startsWith('.')) {
        const base = resolve(dirname(file), name);
        return load(existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
      }
      throw new Error(`Unexpected import ${name}`);
    } }, { filename: file });
    return exports;
  }
  const module = load('src/pages/Dashboard.tsx');
  const summaries = new Map();
  for (const row of orders) {
    const id = row.tanggal.slice(0,7), m = summaries.get(id) || { id, orderCount: 0, revenueIdr: 0, revenueJpy: 0, profitIdr: 0, profitJpy: 0 };
    m.orderCount++; const c = row.tipeNominal === 'JPY' ? 'Jpy' : 'Idr';
    m['revenue' + c] += row.hargaJastipMarkup + row.hargaOngkirMarkup;
    m['profit' + c] += row.hargaJastipMarkup + row.hargaOngkirMarkup - row.hargaJastip - row.hargaOngkir;
    summaries.set(id,m);
  }
  const monthlySummaries = [...summaries.values()];
  function render(period) {
    if (period) requestedPeriod = period;
    let tree;
    for (let attempt = 0; attempt < 10; attempt++) {
      cursor = 0; dirty = false; pending = [];
      tree = module.DashboardView({ activeOrders: rows.filter(r => r.status !== 'Selesai'), monthlySummaries, customers, unitPrice: 0, globalJastipYen: 0, userName: 'Test', onSeeAllOrders() {}, onRecalculate() {}, onOpenFeature() {} });
      pending.forEach(fn => fn());
      if (!dirty) return tree;
    }
    throw new Error('Render loop did not settle');
  }
  return {
    render, subscriptions,
    flush() { subscriptions.filter(s => !s.closed).forEach(s => s.next(snapshot(s.ref))); },
    update(next) { rows = next; this.flush(); },
    fail() { subscriptions.filter(s => !s.closed).forEach(s => s.error?.(new Error('permission-denied'))); },
    unmount() { effects.forEach(e => e?.cleanup?.()); },
  };
}

export function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
export function textOf(tree) {
  if (Array.isArray(tree)) return tree.map(textOf).join(' ');
  if (tree === null || tree === undefined || typeof tree === 'boolean') return '';
  if (typeof tree !== 'object') return String(tree);
  if (typeof tree.type === 'function') return textOf(tree.type(tree.props));
  return textOf(tree.props?.children);
}
