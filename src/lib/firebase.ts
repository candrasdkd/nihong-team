// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging } from "firebase/messaging";

// ---- helpers ENV ----
function must(key: string): string {
  const v = (import.meta as any).env?.[key];
  if (!v) throw new Error(`[ENV] Missing ${key}`);
  return String(v);
}

const firebaseConfig = {
  apiKey: must("VITE_FIREBASE_API_KEY"),
  authDomain: must("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: must("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: must("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: must("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: must("VITE_FIREBASE_APP_ID"),
};

// Optional: lihat project yang terpakai (jangan log apiKey di prod)
// console.table({
//     projectId: firebaseConfig.projectId,
//     authDomain: firebaseConfig.authDomain,
// });

// Reuse app jika sudah ada (hindari duplikasi init di HMR)
const app: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;
// Log detail untuk debug network/rules
// setLogLevel('debug');

// ✅ Firestore dengan fallback transport & cache yang stabil di browser
export const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Dipaksa agar stabil di Safari
  localCache: persistentLocalCache(), // Stable cache that doesn't crash on multiple tabs or Vite HMR
});

// (Opsional) Emulator lokal: set VITE_FB_EMULATOR=true di .env.local
if ((import.meta as any).env?.VITE_FB_EMULATOR) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export { app };
