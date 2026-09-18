#!/usr/bin/env node
// Maintenance only. Preview never writes to Firestore; apply uses the saved preview.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { promptRepairLogin } from './lib/repair-login.mjs';
import { createRepairModuleLoader } from './lib/repair-services.mjs';
import { captureRepairBackup, validateBackup, assertBackupCurrent, backupCounts, planRestore, applyRestore } from './lib/repair-backup.mjs';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, terminate } from 'firebase/firestore';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Backup:  node scripts/repair-orders.mjs --backup /absolute/path/backup.json\nPreview: node scripts/repair-orders.mjs --preview /absolute/path/order-repair.json\nApply:   node scripts/repair-orders.mjs --apply /absolute/path/order-repair.json --backup-file /absolute/path/backup.json\nRecovery preview (read only): --restore-preview /absolute/path/backup.json\nRecovery apply: --restore-apply /absolute/path/backup.json.restore-plan.json\nBackup covers orders, customer, orders_monthly_summaries and metadata/orders_revision only (no subcollections).\nProject is read from .env/.env.local; optionally add --project PROJECT_ID to verify it explicitly.\nEnter the email/password used by the Nihong app when prompted. Password input is hidden and is not saved. Existing FIREBASE_REPAIR_CUSTOM_TOKEN or FIREBASE_REPAIR_EMAIL + FIREBASE_REPAIR_PASSWORD environment credentials are also supported.');
  process.exit(0);
}
const modes = ['--preview', '--apply', '--backup', '--restore-preview', '--restore-apply'];
const options = new Map();
for (let index = 0; index < args.length; index += 2) {
  const flag = args[index], value = args[index + 1];
  if (![...modes, '--project', '--backup-file'].includes(flag) || options.has(flag) || !value || value.startsWith('--')) throw new Error('Argumen tidak valid. Gunakan --help.');
  options.set(flag, value);
}
const selected = modes.filter(mode => options.has(mode));
if (selected.length !== 1) throw new Error('Pilih satu mode. Gunakan --help.');
const mode = selected[0];
if (mode === '--apply' && !options.has('--backup-file')) throw new Error('Buat backup lokal dulu dengan --backup, lalu sertakan --backup-file saat apply.');
if (mode !== '--apply' && options.has('--backup-file')) throw new Error('--backup-file hanya untuk mode --apply.');
const requestedProject = options.get('--project');
const path = resolve(options.get(mode));
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fileEnv = {};
for (const name of ['.env', '.env.local']) {
  const file = resolve(root, name);
  if (existsSync(file)) Object.assign(fileEnv, parseEnv(readFileSync(file, 'utf8')));
}
const env = { ...fileEnv, ...process.env };
const project = requestedProject || env.VITE_FIREBASE_PROJECT_ID;
if (!project || env.VITE_FIREBASE_PROJECT_ID !== project) throw new Error('Project does not match the local Firebase configuration.');
const saved = ['--preview', '--backup'].includes(mode) ? null : JSON.parse(readFileSync(path, 'utf8'));
if (mode === '--apply' && (saved.projectId !== project || saved.schemaVersion !== 1 || !Array.isArray(saved.plan?.orders))) throw new Error('The preview file belongs to a different project or format.');
const backup = options.has('--backup-file') ? JSON.parse(readFileSync(resolve(options.get('--backup-file')), 'utf8')) : null;
const output = ['--preview', '--backup'].includes(mode) ? path : mode === '--restore-preview' ? `${path}.restore-plan.json` : `${path}.result.json`;
if (existsSync(output)) throw new Error('Output file already exists. Use a new filename to preserve the earlier backup/result.');
const save = data => writeFileSync(output, JSON.stringify(data, null, 2), { mode: 0o600, flag: 'wx' });

console.log(`Proyek Firebase: ${project}`);
console.log(['--preview', '--backup', '--restore-preview'].includes(mode) ? `Mode ${mode.slice(2)}: tidak ada perubahan database.` : `Mode ${mode.slice(2)}: memperbarui database menggunakan rencana tersimpan.`);
if (!env.FIREBASE_REPAIR_CUSTOM_TOKEN && !(env.FIREBASE_REPAIR_EMAIL && env.FIREBASE_REPAIR_PASSWORD)) {
  const credentials = await promptRepairLogin({ email: env.FIREBASE_REPAIR_EMAIL });
  env.FIREBASE_REPAIR_EMAIL = credentials.email;
  env.FIREBASE_REPAIR_PASSWORD = credentials.password;
}

const app = initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: project });
const auth = getAuth(app);
const db = getFirestore(app);
let stage = 'login';
try {
  // Reject a corrupt/wrong-project archive before even asking Firebase to sign in.
  if (backup) validateBackup(backup, project, db);
  if (mode === '--restore-preview') validateBackup(saved, project, db);
  if (mode === '--restore-apply') {
    validateBackup(saved.target, project, db);
    validateBackup(saved.current, project, db);
  }
  if (env.FIREBASE_REPAIR_CUSTOM_TOKEN) await signInWithCustomToken(auth, env.FIREBASE_REPAIR_CUSTOM_TOKEN);
  else await signInWithEmailAndPassword(auth, env.FIREBASE_REPAIR_EMAIL, env.FIREBASE_REPAIR_PASSWORD);
  if (mode === '--backup') {
    stage = 'backup lokal (baca dua kali dan verifikasi tipe data)';
    const snapshot = await captureRepairBackup(db, project);
    save(snapshot);
    validateBackup(JSON.parse(readFileSync(output, 'utf8')), project, db);
    console.log(JSON.stringify({ backupFile: output, documents: backupCounts(snapshot), verified: true, firestoreWrites: 0 }));
  } else if (mode === '--restore-preview') {
    stage = 'pratinjau pemulihan';
    const current = await captureRepairBackup(db, project);
    const operations = planRestore(saved, current, db, project);
    save({ kind: 'nihong-order-repair-restore', projectId: project, target: saved, current, operations });
    console.log(JSON.stringify({ restorePlan: output, toRestore: operations.length, toDelete: operations.filter(item => item.after === null).length, firestoreWrites: 0 }));
  } else if (mode === '--restore-apply') {
    stage = 'pemulihan dari backup lokal';
    const result = await applyRestore(saved, db, project);
    save(result);
    console.log(JSON.stringify(result));
  } else {
    stage = 'memuat layanan';
    const load = createRepairModuleLoader({ db, auth });
    const repair = load(resolve(root, 'src/services/orderRepairsFirebase.ts'));
    if (mode === '--preview') {
      stage = 'membaca pratinjau';
      const plan = await repair.previewOrderRepairs();
      save({ schemaVersion: 1, projectId: project, plan });
      console.log(JSON.stringify({ scanned: plan.orders.length, toRepair: plan.orders.filter(row => Object.keys(row.patch).length).length, needsReview: plan.orders.filter(row => row.warnings.length).length, firestoreWrites: 0 }));
    } else {
      stage = 'memeriksa backup sebelum perubahan';
      await assertBackupCurrent(backup, db, project);
      stage = 'menerapkan perbaikan';
      const result = await repair.applyOrderRepairs(saved.plan);
      save(result);
      console.log(JSON.stringify({ applied: result.applied, skipped: result.skipped.length, aggregatesRecalculated: result.aggregatesRecalculated }));
      if (result.skipped.length) process.exitCode = 2;
    }
  }
} catch (error) {
  console.error(`Gagal pada tahap ${stage}: ${error.code || error.message || 'Order repair failed.'}`);
  process.exitCode = 1;
} finally {
  await terminate(db);
  await deleteApp(app);
}
